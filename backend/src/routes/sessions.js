// src/routes/sessions.js
import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../../db/init.js';

const router = Router();

//  helpers 
function nowMs() { return Date.now(); }

async function getOpenPause(db, sessionId) {
  return db.get(
    `SELECT * FROM pause_events WHERE session_id = ? AND resumed_at IS NULL LIMIT 1`,
    sessionId
  );
}


//  start a new build session

router.post('/', async (req, res) => {
  const { loginId, buildNumber, numberOfParts, timePerPart } = req.body ?? {};

  if (!loginId || !buildNumber || !numberOfParts || !timePerPart) {
    res.status(400).json({ error: 'loginId, buildNumber, numberOfParts, timePerPart are required' });
    return;
  }

  const db = await getDb();

  const existing = await db.get(
    `SELECT id FROM sessions WHERE login_id = ? AND status = 'active' LIMIT 1`,
    loginId
  );

  if (existing) {
    res.status(409).json({ error: 'Active session already exists', sessionId: existing.id });
    return;
  }

  const id = crypto.randomUUID();
  const startTime = nowMs();

  await db.run(
    `INSERT INTO sessions (id, login_id, build_number, num_parts, time_per_part, start_time)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id, loginId, buildNumber, numberOfParts, timePerPart, startTime
  );

  res.status(201).json({ sessionId: id, startTime });
});


// fetch active session to restore on page refresh

router.get('/active/:loginId', async (req, res) => {
  const db = await getDb();

  const session = await db.get(
    `SELECT * FROM sessions WHERE login_id = ? AND status = 'active' LIMIT 1`,
    req.params.loginId
  );

  if (!session) {
    res.status(404).json({ error: 'No active session' });
    return;
  }

  const openPause = await getOpenPause(db, session.id);

  res.json({
    sessionId:     session.id,
    loginId:       session.login_id,
    buildNumber:   session.build_number,
    numberOfParts: session.num_parts,
    timePerPart:   session.time_per_part,
    startTime:     session.start_time,
    totalPausedMs: session.total_paused_ms,
    defects:       session.defects,
    isPaused:      openPause != null,
    pausedAt:      openPause?.paused_at ?? null,
  });
});


// Pause timer

router.patch('/:id/pause', async (req, res) => {
  const db = await getDb();
  const pausedAt = nowMs();

  if (await getOpenPause(db, req.params.id)) {
    res.status(409).json({ error: 'Session is already paused' });
    return;
  }

  await db.run(
    `INSERT INTO pause_events (session_id, paused_at) VALUES (?, ?)`,
    req.params.id, pausedAt
  );

  res.json({ pausedAt });
});


// Resume timer

router.patch('/:id/resume', async (req, res) => {
  const db = await getDb();
  const resumedAt = nowMs();
  const openPause = await getOpenPause(db, req.params.id);

  if (!openPause) {
    res.status(404).json({ error: 'No open pause found' });
    return;
  }

  const durationMs = resumedAt - openPause.paused_at;

  // update pause_events
  await db.run(
    `UPDATE pause_events SET resumed_at = ?, duration_ms = ? WHERE id = ?`,
    resumedAt, durationMs, openPause.id
  );

  // Update sessions
  await db.run(
    `UPDATE sessions
       SET total_paused_ms = total_paused_ms + ?,
           updated_at      = ?
     WHERE id = ?`,
    durationMs, resumedAt, req.params.id
  );

  res.json({ resumedAt, durationMs });
});


// Update defect count

router.patch('/:id/defects', async (req, res) => {
  const { defects } = req.body ?? {};

  if (defects == null || !Number.isInteger(defects) || defects < 0) {
    res.status(400).json({ error: 'defects must be a non-negative integer' });
    return;
  }

  const db = await getDb();
  await db.run(
    `UPDATE sessions SET defects = ?, updated_at = ? WHERE id = ?`,
    defects, nowMs(), req.params.id
  );

  res.json({ defects });
});


// to track "Time Exceeded" modal popup interactions

router.post('/:id/popup', async (req, res) => {
  const { action } = req.body ?? {};

  if (!['yes', 'no', 'timeout'].includes(action)) {
    res.status(400).json({ error: 'action must be "yes", "no", or "timeout"' });
    return;
  }

  const now = nowMs();
  const db = await getDb();

  await db.run(
    `INSERT INTO popup_events (session_id, shown_at, action, actioned_at)
     VALUES (?, ?, ?, ?)`,
    req.params.id, now, action, now
  );

  res.json({ logged: true });
});


// Final submission of Defects & session.

router.post('/:id/submit', async (req, res) => {
  const { totalParts, defects, autoSubmitted = false } = req.body ?? {};
  const db = await getDb();
  const now = nowMs();

  const session = await db.get(`SELECT * FROM sessions WHERE id = ?`, req.params.id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (session.status === 'completed') {
    res.status(409).json({ error: 'Session already completed' });
    return;
  }

  const openPause = await getOpenPause(db, req.params.id);

  let extraPausedMs = 0;
  if (openPause) {
    extraPausedMs = now - openPause.paused_at;
    await db.run(
      `UPDATE pause_events SET resumed_at = ?, duration_ms = ? WHERE id = ?`,
      now, extraPausedMs, openPause.id
    );
  }

  const totalPausedMs = session.total_paused_ms + extraPausedMs;
  const totalActiveMs = now - session.start_time - totalPausedMs;

  await db.run(
    `UPDATE sessions SET
       end_time        = ?,
       total_paused_ms = ?,
       total_active_ms = ?,
       defects         = COALESCE(?, defects),
       total_parts     = ?,
       auto_submitted  = ?,
       status          = 'completed',
       updated_at      = ?
     WHERE id = ?`,
    now,
    totalPausedMs,
    defects ?? null,
    totalParts ?? null,
    autoSubmitted ? 1 : 0,
    now,
    req.params.id
  );

  res.json({
    sessionId: req.params.id,
    endTime: now,
    totalActiveMs,
    totalPausedMs,
  });
});

export default router;
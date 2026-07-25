import { useReducer, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../api/client.js';
import { useTimer, formatMs } from '../hooks/useTimer.js';
import InfoBar            from '../components/InfoBar.jsx';
import PauseOverlay       from '../components/PauseOverlay.jsx';
import TimeExceededModal  from '../components/TimeExceededModal.jsx';
import ConfirmNextModal   from '../components/ConfirmNextModal.jsx';
import './TimerPage.css';
import { FaPlus, FaMinus, FaArrowRight, FaPause } from "react-icons/fa";

const POPUP_MS = 10 * 60 * 1000; // 10 minutes

// Local page state 
function init(session) {
  return {
    isPaused:         session?.isPaused    ?? false,
    pausedAt:         session?.pausedAt    ?? null,
    defects:          session?.defects     ?? 0,
    defectDraft:      String(session?.defects ?? 0),
    showTimeExceeded: false,
    showConfirmNext:  false,
  };
}

function pageReducer(state, action) {
  switch (action.type) {
    case 'PAUSED':
      return { ...state, isPaused: true, pausedAt: action.pausedAt };

    case 'RESUMED':
      return { ...state, isPaused: false, pausedAt: null };

    case 'DEFECT_DRAFT':
      return { ...state, defectDraft: action.value };

    case 'DEFECT_COMMIT':
      return { ...state, defects: action.defects, defectDraft: String(action.defects) };

    case 'SHOW_EXCEEDED':
      return { ...state, showTimeExceeded: true };

    case 'HIDE_EXCEEDED':
      return { ...state, showTimeExceeded: false };

    case 'SHOW_CONFIRM_NEXT':
      return { ...state, showConfirmNext: true };

    case 'HIDE_CONFIRM_NEXT':
      return { ...state, showConfirmNext: false };

    default: return state;
  }
}

export default function TimerPage() {
  const navigate = useNavigate();
  const { session, patchSession, clearSession } = useSession();
  const [local, dispatch] = useReducer(pageReducer, session, init);

  // Timers stored in refs so they never cause re-renders
  const autoSubmitTimerRef  = useRef(null);
  const repeatPopupTimerRef = useRef(null);
  const overtimeFiredRef    = useRef(false); 

  const defectsRef = useRef(local.defects);
  defectsRef.current = local.defects;

  const timeLeftMs = useTimer({
    session,
    isPaused: local.isPaused,
    pausedAt: local.pausedAt,
  });

  //  Redirect if session was cleared 
  useEffect(() => {
    if (!session) navigate('/', { replace: true });
  }, [session, navigate]);

  //  Trigger time-exceeded popup when timer hits zero 
  useEffect(() => {
    if (timeLeftMs <= 0 && !overtimeFiredRef.current && !local.isPaused && !local.showTimeExceeded) {
      overtimeFiredRef.current = true;
      dispatch({ type: 'SHOW_EXCEEDED' });
      scheduleAutoSubmit();
    }
  }, [timeLeftMs, local.isPaused, local.showTimeExceeded]);

  //  Cleanup all timers on unmount 
  useEffect(() => () => {
    clearTimeout(autoSubmitTimerRef.current);
    clearTimeout(repeatPopupTimerRef.current);
  }, []);


  function scheduleAutoSubmit() {
    clearTimeout(autoSubmitTimerRef.current);
    autoSubmitTimerRef.current = setTimeout(doAutoSubmit, POPUP_MS);
  }

  // Handlers 
  async function handlePause() {
    try {
      const { pausedAt } = await api.pause(session.sessionId);
      dispatch({ type: 'PAUSED', pausedAt });
      patchSession({ isPaused: true, pausedAt });
    } catch (err) { console.error('Pause failed', err); }
  }

  async function handleResume() {
    try {
      const { durationMs } = await api.resume(session.sessionId);
      dispatch({ type: 'RESUMED' });
      patchSession({
        isPaused: false,
        pausedAt: null,
        totalPausedMs: (session.totalPausedMs ?? 0) + durationMs,
      });
    } catch (err) { console.error('Resume failed', err); }
  }

  async function commitDefects(raw) {
    const defects = Math.max(0, parseInt(raw, 10) || 0);
    dispatch({ type: 'DEFECT_COMMIT', defects });
    patchSession({ defects });
    await api.updateDefects(session.sessionId, defects).catch(console.error);
  }

  // "Yes — keep working": dismiss popup, schedule next one in 10 min
  async function handlePopupYes() {
    clearTimeout(autoSubmitTimerRef.current);
    dispatch({ type: 'HIDE_EXCEEDED' });
    await api.logPopup(session.sessionId, 'yes').catch(console.error);

    repeatPopupTimerRef.current = setTimeout(() => {
      overtimeFiredRef.current = false;   // briefly unlock so SHOW_EXCEEDED
      dispatch({ type: 'SHOW_EXCEEDED' }); // can legitimately show the modal
      overtimeFiredRef.current = true;    // immediately re-lock until next repeat
      scheduleAutoSubmit();
    }, POPUP_MS);
  }

  // "No — finish now": go to page 3
  async function handlePopupNo() {
    clearTimeout(autoSubmitTimerRef.current);
    clearTimeout(repeatPopupTimerRef.current);
    dispatch({ type: 'HIDE_EXCEEDED' });
    await api.logPopup(session.sessionId, 'no').catch(console.error);
    navigate('/submit');
  }

  // Timeout: auto-submit and return to login.
  async function doAutoSubmit() {
    clearTimeout(repeatPopupTimerRef.current);
    dispatch({ type: 'HIDE_EXCEEDED' });
    await api.logPopup(session.sessionId, 'timeout').catch(console.error);
    await api.submit(session.sessionId, {
      defects: defectsRef.current,   // always the latest value
      autoSubmitted: true,
    }).catch(console.error);
    clearSession();
    navigate('/', { replace: true });
  }

  if (!session) return null;

  const isOvertime = timeLeftMs < 0;

  return (
    <div className="timer-page">
      <InfoBar session={session} />

      <main className="timer-main">
        {/*  Status strip  */}
        <div className={`status-strip ${isOvertime ? 'status-strip--overtime' : 'status-strip--active'}`}>
          {isOvertime ? 'OVERTIME — SUBMIT WHEN READY' : 'BUILD IN PROGRESS'}
        </div>

        {/*  Countdown  */}
        <div className={`clock-wrap ${isOvertime ? 'clock-wrap--overtime' : ''}`}>
          <span className="clock-label">
            {isOvertime ? 'Over by' : 'Time Remaining'}
          </span>
          <div className="clock-digits" aria-live="polite" aria-atomic="true">
            {formatMs(timeLeftMs)}
          </div>
          {isOvertime && (
            <div className="overtime-bar">
              <span>Overtime active — timer shown as negative</span>
            </div>
          )}
        </div>

        {/*  Controls  */}
        <div className="controls-row">
          <button
            className="btn btn-amber control-btn"
            onClick={handlePause}
            disabled={local.isPaused}
            aria-label="Pause session"
          >
            <FaPause /> 
            <span>Pause</span>
          </button>

          <div className="defect-control">
            <label htmlFor="defects" className="defect-control__label">
              Defects
            </label>
            <div className="defect-control__row">
              <button
                className="stepper-btn"
                aria-label="Decrease defects"
                onClick={() => commitDefects(local.defects - 1)}
                disabled={local.defects === 0}
              ><FaMinus /></button>
              <input
                id="defects"
                className="defect-control__input"
                type="number"
                min="0"
                value={local.defectDraft}
                onChange={(e) => dispatch({ type: 'DEFECT_DRAFT', value: e.target.value })}
                onBlur={() => commitDefects(local.defectDraft)}
                aria-label="Defect count"
              />
              <button
                className="stepper-btn"
                aria-label="Increase defects"
                onClick={() => commitDefects(local.defects + 1)}
              ><FaPlus /></button>
            </div>
          </div>

          <button
            className="btn btn-primary control-btn"
            onClick={() => dispatch({ type: 'SHOW_CONFIRM_NEXT' })}
            aria-label="Proceed to submission"
          >
            <span>Next</span>
            <FaArrowRight />
          </button>
        </div>
      </main>

      {/*  Overlays  */}
      {local.isPaused && <PauseOverlay onResume={handleResume} />}

      {local.showTimeExceeded && (
        <TimeExceededModal onYes={handlePopupYes} onNo={handlePopupNo} />
      )}

      {local.showConfirmNext && (
        <ConfirmNextModal
          onConfirm={() => navigate('/submit')}
          onCancel={() => dispatch({ type: 'HIDE_CONFIRM_NEXT' })}
        />
      )}
    </div>
  );
}

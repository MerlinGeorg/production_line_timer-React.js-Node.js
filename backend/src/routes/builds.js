// src/routes/builds.js
import { Router } from 'express';
import { getDb } from '../../db/init.js';

const router = Router();

// fetch buildData

router.get('/:buildNumber', async (req, res) => {
  const db = await getDb();  

  const build = await db.get(
    'SELECT * FROM builds WHERE build_number = ?',
    req.params.buildNumber
  );

  if (!build) {
    res.status(404).json({ error: `Build "${req.params.buildNumber}" not found` });
    return;
  }

  res.json({
    buildNumber:   build.build_number,
    numberOfParts: build.num_parts,
    timePerPart:   build.time_per_part,
  });
});

export default router;
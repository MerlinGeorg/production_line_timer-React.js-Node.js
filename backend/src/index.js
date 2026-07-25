// src/index.js  (ESM, Express 5)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from '../db/init.js';
import buildsRouter   from './routes/builds.js';
import sessionsRouter from './routes/sessions.js';


getDb();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes 
app.use('/api/builds',   buildsRouter);
app.use('/api/sessions', sessionsRouter);
app.get('/api/', (_req, res) => res.json({ ok: true, ts: Date.now() }));


app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? 'Internal Server Error' });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => console.log(`API ready → http://localhost:${PORT}`));

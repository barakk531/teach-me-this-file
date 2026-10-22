import express from 'express';
import { fileURLToPath } from 'node:url';
import { errorHandler } from './http/errors.js';
import { planRouter } from './routes/plan.js';

const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // Also used by the client to wake the server up: free hosting sleeps when idle.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, serverKey: Boolean(process.env.GEMINI_API_KEY) });
  });
  app.use('/api/plan', planRouter);
  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Unknown API route.' } });
  });

  app.use(express.static(clientDist));
  app.use(errorHandler);
  return app;
}

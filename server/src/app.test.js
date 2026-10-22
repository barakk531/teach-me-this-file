import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

let server;
let baseUrl;

beforeAll(async () => {
  delete process.env.GEMINI_API_KEY;
  server = createApp().listen(0);
  await once(server, 'listening');
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(() => server.close());

describe('app', () => {
  it('reports health and whether the host has its own key', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, serverKey: false });
  });

  it('answers unknown API routes with a JSON 404', async () => {
    const res = await fetch(`${baseUrl}/api/unknown`, { method: 'POST' });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_found');
  });
});

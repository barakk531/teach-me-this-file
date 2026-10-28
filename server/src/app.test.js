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

  it('asks for an API key before reading an upload', async () => {
    const body = new FormData();
    body.append('prompt', 'Teach this to 7th graders.');
    body.append('file', new Blob(['Water evaporates.']), 'water.txt');
    const res = await fetch(`${baseUrl}/api/plan`, { method: 'POST', body });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('missing_key');
  });

  it('sends a strict content security policy with every response', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const policy = res.headers.get('content-security-policy');
    expect(policy).toContain("img-src 'self' data:");
    expect(policy).toContain("connect-src 'self'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('answers malformed JSON with a 400, not a server error', async () => {
    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Gemini-Key': 'test' },
      body: '{"plan": ',
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_request');
  });

  it('answers a broken upload form with a 400, not a server error', async () => {
    const headers = { 'X-Gemini-Key': 'test' };
    const cutOff = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'multipart/form-data; boundary=B' },
      body: '--B\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\n\r\nhal',
    });
    expect(cutOff.status).toBe(400);
    expect((await cutOff.json()).error.code).toBe('invalid_request');

    const noBoundary = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      body: 'abc',
    });
    expect(noBoundary.status).toBe(400);
  });

  it('answers unknown API routes with a JSON 404', async () => {
    const res = await fetch(`${baseUrl}/api/unknown`, { method: 'POST' });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_found');
  });
});

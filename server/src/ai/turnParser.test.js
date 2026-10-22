import { describe, expect, it } from 'vitest';
import { parseTurn } from './turnParser.js';

async function* fromChunks(chunks) {
  yield* chunks;
}

async function collect(chunks) {
  const events = [];
  for await (const event of parseTurn(fromChunks(chunks))) events.push(event);
  const meta = events.find((e) => e.type === 'meta')?.meta;
  const text = events
    .filter((e) => e.type === 'text')
    .map((e) => e.text)
    .join('');
  return { events, meta, text };
}

const STATUS = '<turn>{"assessment":"incorrect","stepComplete":false,"sources":["P2"]}</turn>';

describe('parseTurn', () => {
  it('separates the hidden status line from the visible message', async () => {
    const { meta, text } = await collect([`${STATUS}\n\nNot quite. What happens to the heat?`]);
    expect(meta).toEqual({ assessment: 'incorrect', stepComplete: false, sources: ['P2'] });
    expect(text).toBe('Not quite. What happens to the heat?');
  });

  it('handles a status line split across many stream chunks', async () => {
    const chunks = [...`${STATUS}\nGood try!`];
    const { events, meta, text } = await collect(chunks);
    expect(events[0].type).toBe('meta');
    expect(meta.sources).toEqual(['P2']);
    expect(text).toBe('Good try!');
  });

  it('streams the whole reply when the model forgets the status line', async () => {
    const { meta, text } = await collect(['Bonjour ! ', 'On commence ?']);
    expect(meta).toBeNull();
    expect(text).toBe('Bonjour ! On commence ?');
  });

  it('never shows a broken status line to the student', async () => {
    const { meta, text } = await collect(['<turn>{"assessment": oops</turn>\nHello']);
    expect(meta).toBeNull();
    expect(text).toBe('Hello');
  });

  it('sanitises unexpected values in the status line', async () => {
    const { meta } = await collect([
      '<turn>{"assessment":"genius","stepComplete":"yes","sources":["P1",7]}</turn>Hi',
    ]);
    expect(meta).toEqual({ assessment: 'none', stepComplete: false, sources: ['P1'] });
  });

  it('handles a reply that is only a status line', async () => {
    const { meta, text } = await collect([STATUS]);
    expect(meta.assessment).toBe('incorrect');
    expect(text).toBe('');
  });
});

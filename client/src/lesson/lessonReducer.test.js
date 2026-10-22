import { describe, expect, it } from 'vitest';
import { emptyLesson, IDLE_CAP_MS, lessonReducer } from './lessonReducer.js';
import { failedTurn, minutesElapsed, retryRequest, turnRequest } from './selectors.js';

const plan = {
  title: 'Photosynthesis',
  durationMinutes: 10,
  passages: [{ id: 'P1', location: 'Page 1', text: 'Plants make sugar.' }],
  steps: [
    { title: 'Inputs', passageIds: ['P1'] },
    { title: 'Outputs', passageIds: ['P1'] },
  ],
};

const run = (actions, state = emptyLesson) => actions.reduce(lessonReducer, state);
const created = { type: 'lessonCreated', plan, teacherPrompt: 'Be Socratic', fileName: 'a.pdf' };

/** One full tutor turn, as the network layer would dispatch it. */
function tutorTurn(id, meta, { text = 'Reply', end = 'finished' } = {}) {
  const actions = [
    { type: 'tutorTurnStarted', id, at: 0 },
    { type: 'tutorMetaReceived', id, meta },
    { type: 'tutorTextReceived', id, text },
  ];
  if (end === 'finished') actions.push({ type: 'tutorTurnFinished', id, stopped: false });
  if (end === 'stopped') actions.push({ type: 'tutorTurnFinished', id, stopped: true });
  if (end === 'failed') actions.push({ type: 'tutorTurnFailed', id, error: { message: 'Busy' } });
  return actions;
}

const meta = (assessment, stepComplete = false) => ({ assessment, stepComplete, sources: ['P1'] });
const say = (id, text, at = 0) => ({ type: 'studentMessageSent', id, text, at });

describe('lessonReducer', () => {
  it('stores the plan and starts progress at step 1', () => {
    const lesson = run([created]);
    expect(lesson.status).toBe('ready');
    expect(lesson.progress).toMatchObject({ stepIndex: 0, attempts: [0, 0] });
  });

  it('counts weak answers on the current step without advancing', () => {
    const lesson = run([
      created,
      ...tutorTurn('t1', meta('none')),
      say('s1', 'Water?'),
      ...tutorTurn('t2', meta('partial')),
      say('s2', 'Sand?'),
      ...tutorTurn('t3', meta('incorrect')),
    ]);
    expect(lesson.progress.stepIndex).toBe(0);
    expect(lesson.progress.attempts).toEqual([2, 0]);
  });

  it('advances when the tutor completes a step, and completes the lesson after the last one', () => {
    const afterFirst = run([created, ...tutorTurn('t1', meta('correct', true))]);
    expect(afterFirst.progress.stepIndex).toBe(1);
    expect(afterFirst.status).toBe('active');

    const done = run(tutorTurn('t2', meta('correct', true)), afterFirst);
    expect(done.status).toBe('complete');
  });

  it('streams text into the tutor message', () => {
    const lesson = run([
      created,
      { type: 'tutorTurnStarted', id: 't1', at: 0 },
      { type: 'tutorTextReceived', id: 't1', text: 'Hel' },
      { type: 'tutorTextReceived', id: 't1', text: 'lo' },
    ]);
    expect(lesson.messages[0]).toMatchObject({ text: 'Hello', status: 'streaming' });
  });

  it('does not change progress when a turn fails, so a retry is safe', () => {
    const lesson = run([created, ...tutorTurn('t1', meta('correct', true), { end: 'failed' })]);
    expect(lesson.progress.stepIndex).toBe(0);
    expect(failedTurn(lesson).id).toBe('t1');
  });

  it('keeps a stopped reply and its judgment, but drops one stopped before any text', () => {
    const stopped = run([created, ...tutorTurn('t1', meta('incorrect'), { end: 'stopped' })]);
    expect(stopped.messages[0].status).toBe('stopped');
    expect(stopped.progress.attempts[0]).toBe(1);

    const empty = run([created, ...tutorTurn('t1', meta('none'), { text: '', end: 'stopped' })]);
    expect(empty.messages).toHaveLength(0);
  });

  it('replaces a failed reply when the student writes again', () => {
    const lesson = run([
      created,
      ...tutorTurn('t1', meta('none'), { end: 'failed' }),
      say('s1', 'Hello?'),
    ]);
    expect(lesson.messages.map((m) => m.id)).toEqual(['s1']);
  });

  it('counts lesson time but not long breaks', () => {
    const lesson = run([
      created,
      { type: 'tutorTurnStarted', id: 't1', at: 1_000 },
      say('s1', 'a', 1_000 + 60_000),
      say('s2', 'b', 1_000 + 60_000 + IDLE_CAP_MS * 10),
    ]);
    expect(minutesElapsed(lesson.progress)).toBe(1 + IDLE_CAP_MS / 60_000);
  });
});

describe('turn requests', () => {
  it('sends progress from app state and only finished messages as history', () => {
    const lesson = run([
      created,
      ...tutorTurn('t1', meta('none')),
      say('s1', 'Light'),
      ...tutorTurn('t2', meta('partial')),
    ]);
    const request = turnRequest(lesson, 'Light and water');
    expect(request.progress).toEqual({ stepIndex: 0, attempts: 1, minutesElapsed: 0 });
    expect(request.history.map((m) => m.role)).toEqual(['tutor', 'student', 'tutor']);
    expect(request.studentMessage).toBe('Light and water');
  });

  it('retries a failed turn with the same student message and history', () => {
    const lesson = run([
      created,
      ...tutorTurn('t1', meta('none')),
      say('s1', 'Light'),
      ...tutorTurn('t2', meta('correct', true), { end: 'failed' }),
    ]);
    const request = retryRequest(lesson);
    expect(request.studentMessage).toBe('Light');
    expect(request.history.map((m) => m.text)).toEqual(['Reply']);
  });

  it('retries a failed first message as a fresh lesson start', () => {
    const lesson = run([created, ...tutorTurn('t1', meta('none'), { end: 'failed' })]);
    const request = retryRequest(lesson);
    expect(request.studentMessage).toBeNull();
    expect(request.history).toEqual([]);
  });
});

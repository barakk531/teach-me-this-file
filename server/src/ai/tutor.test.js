import { describe, expect, it, vi } from 'vitest';
import { streamText } from './gemini.js';
import { buildContents, runTutorTurn } from './tutor.js';
import { buildTutorInstructions, STRUGGLE_ATTEMPTS } from './prompts/tutorPrompt.js';

vi.mock('./gemini.js', () => ({ streamText: vi.fn() }));

const plan = {
  title: 'Photosynthesis',
  language: 'English',
  audience: '7th graders',
  durationMinutes: 10,
  passages: [{ id: 'P1', location: 'Page 1', text: 'Plants make sugar from light.' }],
  steps: [
    {
      title: 'Inputs',
      objective: 'Name what a plant needs.',
      keyPoints: ['Light', 'Water'],
      passageIds: ['P1'],
      checkQuestion: 'What would happen to a plant kept in the dark?',
    },
    {
      title: 'Outputs',
      objective: 'Name what a plant makes.',
      keyPoints: ['Sugar', 'Oxygen'],
      passageIds: ['P1'],
      checkQuestion: 'Where does the oxygen we breathe come from?',
    },
  ],
};

describe('buildContents', () => {
  it('starts with a user turn and keeps the tutor’s status lines in history', () => {
    const contents = buildContents(
      [
        {
          role: 'tutor',
          text: 'What do plants need?',
          meta: { assessment: 'none', stepComplete: false, sources: ['P1'] },
        },
      ],
      'Light?',
    );
    expect(contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(contents[1].parts[0].text).toMatch(/^<turn>\{.*\}<\/turn>\n\nWhat do plants need\?$/);
  });

  it('merges neighbouring turns from the same side, as Gemini requires', () => {
    const contents = buildContents([{ role: 'student', text: 'Hello?' }], 'Are you there?');
    expect(contents).toHaveLength(1);
    expect(contents[0].parts.map((p) => p.text)).toEqual([
      '[The student opened the lesson.]',
      'Hello?',
      'Are you there?',
    ]);
  });

  it('tells the model when the student stopped a message', () => {
    const contents = buildContents(
      [{ role: 'tutor', text: 'Plants are', meta: null, stopped: true }],
      'Wait, go back',
    );
    expect(contents[1].parts[0].text).toContain('[The student stopped this message here.]');
  });
});

describe('buildTutorInstructions', () => {
  const build = (progress, isStart = false) =>
    buildTutorInstructions({ teacherPrompt: 'Be Socratic.', plan, progress, isStart });

  it('includes the teacher prompt, the current step and the passages', () => {
    const text = build({ stepIndex: 0, attempts: 0, minutesElapsed: 0 }, true);
    expect(text).toContain('<teacher_instructions>\nBe Socratic.');
    expect(text).toContain('1. [current] Inputs');
    expect(text).toContain('<passage id="P1" location="Page 1">');
    expect(text).toContain('The lesson is starting now.');
  });

  it('asks for a new strategy after repeated weak answers', () => {
    const calm = build({ stepIndex: 0, attempts: STRUGGLE_ATTEMPTS - 1, minutesElapsed: 3 });
    const stuck = build({ stepIndex: 0, attempts: STRUGGLE_ATTEMPTS, minutesElapsed: 3 });
    expect(calm).not.toContain('The student is struggling');
    expect(stuck).toContain('The student is struggling');
  });

  it('tells the tutor to close the lesson on the last step', () => {
    const text = build({ stepIndex: 1, attempts: 0, minutesElapsed: 8 });
    expect(text).toContain('1. [done] Inputs');
    expect(text).toContain('This is the last step.');
  });
});

describe('runTutorTurn', () => {
  const turn = () =>
    runTutorTurn({
      apiKey: 'test',
      teacherPrompt: 'Be Socratic.',
      plan,
      progress: { stepIndex: 0, attempts: 0, minutesElapsed: 1 },
      history: [{ role: 'tutor', text: 'What do plants need?' }],
      studentMessage: 'Soil?',
    });
  const replyWith = (...chunks) =>
    streamText.mockImplementation(async function* () {
      yield* chunks;
    });

  it('streams the checked status line first, then the text', async () => {
    replyWith(
      '<turn>{"assessment":"incorrect","stepComplete":false,"sources":["P1"]}</turn>',
      'Not quite.',
    );
    const events = [];
    for await (const event of turn()) events.push(event);
    expect(events.map((e) => e.type)).toEqual(['meta', 'text']);
    expect(events[0].data).toEqual({
      assessment: 'incorrect',
      stepComplete: false,
      sources: ['P1'],
    });
  });

  it('turns an empty answer into a retryable failure, not an empty message', async () => {
    replyWith('<turn>{"assessment":"none","stepComplete":false,"sources":["P1"]}</turn>');
    const events = [];
    const drain = async () => {
      for await (const event of turn()) events.push(event);
    };
    await expect(drain()).rejects.toMatchObject({ code: 'empty_reply', retryable: true });
    // Nothing reaches the browser, so the failed message shows no source link.
    expect(events).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { normalizePlan } from './planner.js';

const rawPlan = (overrides = {}) => ({
  teachable: true,
  problem: '',
  title: 'Le cycle de l’eau',
  language: 'French',
  languageCode: 'fr',
  audience: '7th graders',
  durationMinutes: 15,
  scope: 'Covers evaporation and condensation.',
  passages: [
    { id: 'P1', location: 'Page 1', text: 'Water evaporates when heated.' },
    { id: 'P2', location: 'Page 2', text: '  ' },
  ],
  steps: [
    {
      title: 'Évaporation',
      objective: 'Explain evaporation.',
      keyPoints: ['Heat turns water into vapour', ''],
      passageIds: ['P1', 'P2', 'P9'],
      checkQuestion: 'Why does a puddle disappear on a sunny day?',
    },
  ],
  ...overrides,
});

describe('normalizePlan', () => {
  it('drops empty passages and links to passages that do not exist', () => {
    const plan = normalizePlan(rawPlan());
    expect(plan.passages.map((p) => p.id)).toEqual(['P1']);
    expect(plan.steps[0].passageIds).toEqual(['P1']);
    expect(plan.steps[0].keyPoints).toEqual(['Heat turns water into vapour']);
  });

  it('uses the objective as the key point of a step that lists none', () => {
    const steps = [{ title: 'Évaporation', objective: 'Explain evaporation.', keyPoints: [' '] }];
    expect(normalizePlan(rawPlan({ steps })).steps[0].keyPoints).toEqual(['Explain evaporation.']);
  });

  it('marks right-to-left lesson languages', () => {
    expect(normalizePlan(rawPlan({ languageCode: 'he' })).dir).toBe('rtl');
    expect(normalizePlan(rawPlan({ languageCode: 'ar-EG' })).dir).toBe('rtl');
    expect(normalizePlan(rawPlan()).dir).toBe('ltr');
  });

  it('keeps the lesson length within sensible bounds', () => {
    expect(normalizePlan(rawPlan({ durationMinutes: 500 })).durationMinutes).toBe(90);
    expect(normalizePlan(rawPlan({ durationMinutes: 0 })).durationMinutes).toBe(10);
  });

  it('turns an unteachable file into a clear error with the model’s reason', () => {
    expect(() =>
      normalizePlan(rawPlan({ teachable: false, problem: 'This is a grocery receipt.' })),
    ).toThrow('This is a grocery receipt.');
  });

  it('rejects a plan without usable steps', () => {
    expect(() => normalizePlan(rawPlan({ steps: [{ title: '', objective: '' }] }))).toThrow(
      /does not seem to contain/,
    );
  });
});

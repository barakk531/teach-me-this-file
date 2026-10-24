import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLesson } from './storage.js';

const plan = { steps: [{ title: 'Inputs' }, { title: 'Outputs' }], passages: [] };

const saved = (lesson) => vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(lesson) });

afterEach(() => vi.unstubAllGlobals());

describe('loadLesson', () => {
  it('starts counting key points for a lesson saved before they were tracked', () => {
    saved({ status: 'active', plan, progress: { stepIndex: 1, attempts: [0, 2] }, messages: [] });
    expect(loadLesson().progress).toEqual({ stepIndex: 1, attempts: [0, 2], taught: [0, 0] });
  });

  it('offers a retry for a reply that was still streaming when the page closed', () => {
    const progress = { stepIndex: 0, attempts: [0, 0], taught: [1, 0] };
    const messages = [{ id: 't1', role: 'tutor', text: 'Plants', status: 'streaming' }];
    saved({ status: 'active', plan, progress, messages });
    expect(loadLesson().messages[0]).toMatchObject({ status: 'error', error: { retryable: true } });
  });
});

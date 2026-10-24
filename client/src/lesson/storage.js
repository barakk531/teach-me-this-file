import { emptyLesson } from './lessonReducer.js';

const STORAGE_KEY = 'teach-me-this-file.lesson.v1';

/** Restores the last lesson so a refresh or a closed tab does not lose it. */
export function loadLesson() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.plan) return emptyLesson;
    return {
      ...saved,
      // Lessons saved before key points were tracked start counting from here.
      progress: {
        ...saved.progress,
        taught: saved.progress.taught ?? saved.plan.steps.map(() => 0),
      },
      // A reply that was streaming when the page closed never finished: offer a retry.
      messages: saved.messages.map((m) =>
        m.status === 'streaming'
          ? {
              ...m,
              status: 'error',
              error: { message: 'This reply was interrupted.', retryable: true },
            }
          : m,
      ),
    };
  } catch {
    return emptyLesson;
  }
}

export function saveLesson(lesson) {
  try {
    if (lesson.status === 'setup') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(lesson));
  } catch {
    // Storage can be full or blocked (private mode); the lesson still works without it.
  }
}

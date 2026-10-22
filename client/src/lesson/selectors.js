// Read-only views of the lesson state, used by the UI and to build AI requests.

// A step the student needed this many tries for is worth reviewing.
const REVIEW_AFTER_TRIES = 3;

/** Tries on a step: each weak answer plus the one that succeeded. */
export function triesOn(progress, stepIndex) {
  return progress.attempts[stepIndex] + 1;
}

export function needsReview(progress, stepIndex) {
  return triesOn(progress, stepIndex) >= REVIEW_AFTER_TRIES;
}

export function isStreaming(lesson) {
  return lesson.messages.at(-1)?.status === 'streaming';
}

export function minutesElapsed(progress) {
  return Math.round(progress.activeMs / 60_000);
}

export function minutesLeft(lesson) {
  return Math.max(0, lesson.plan.durationMinutes - minutesElapsed(lesson.progress));
}

/** The failed reply that "Retry" would replace, if the last message failed. */
export function failedTurn(lesson) {
  const last = lesson.messages.at(-1);
  return last?.status === 'error' ? last : null;
}

/**
 * Everything the server needs for one tutor turn. The server is stateless, so
 * the plan and progress travel with every request; history is trimmed there.
 */
export function turnRequest(lesson, studentMessage) {
  const { plan, progress, teacherPrompt } = lesson;
  return {
    teacherPrompt,
    plan,
    progress: {
      stepIndex: progress.stepIndex,
      attempts: progress.attempts[progress.stepIndex],
      minutesElapsed: minutesElapsed(progress),
    },
    history: lesson.messages
      .filter((m) => m.status !== 'error' && m.status !== 'streaming')
      .map(({ role, text, meta, status }) => ({ role, text, meta, stopped: status === 'stopped' })),
    studentMessage,
  };
}

/** Rebuilds the request of a failed turn: the same student message, the same state. */
export function retryRequest(lesson) {
  const withoutFailed = { ...lesson, messages: lesson.messages.slice(0, -1) };
  const lastStudent = withoutFailed.messages.findLastIndex((m) => m.role === 'student');
  if (lastStudent === -1) return turnRequest(withoutFailed, null);
  return turnRequest(
    { ...withoutFailed, messages: withoutFailed.messages.slice(0, lastStudent) },
    withoutFailed.messages[lastStudent].text,
  );
}

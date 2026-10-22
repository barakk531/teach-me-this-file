// The lesson state: the plan, the student's progress and the messages.
// Pure functions only, so the teaching logic is testable without React or the network.

// A pause longer than this (the student left) does not count as lesson time.
export const IDLE_CAP_MS = 3 * 60_000;

export const emptyLesson = {
  status: 'setup', // setup → ready → active → complete
  teacherPrompt: '',
  fileName: '',
  plan: null,
  progress: null,
  messages: [],
};

export function lessonReducer(state, action) {
  switch (action.type) {
    case 'lessonCreated':
      return {
        status: 'ready',
        teacherPrompt: action.teacherPrompt,
        fileName: action.fileName,
        plan: action.plan,
        progress: {
          stepIndex: 0,
          attempts: action.plan.steps.map(() => 0),
          activeMs: 0,
          lastActiveAt: null,
        },
        messages: [],
      };

    case 'studentMessageSent':
      return {
        ...state,
        progress: trackTime(state.progress, action.at),
        // A new message replaces any reply that failed before it.
        messages: [
          ...state.messages.filter((m) => m.status !== 'error'),
          { id: action.id, role: 'student', text: action.text },
        ],
      };

    case 'tutorTurnStarted':
      return {
        ...state,
        status: 'active',
        progress: { ...state.progress, lastActiveAt: state.progress.lastActiveAt ?? action.at },
        messages: [
          ...state.messages,
          {
            id: action.id,
            role: 'tutor',
            text: '',
            status: 'streaming',
            stepIndex: state.progress.stepIndex,
            meta: null,
          },
        ],
      };

    case 'tutorMetaReceived':
      return updateMessage(state, action.id, () => ({ meta: action.meta }));

    case 'tutorTextReceived':
      return updateMessage(state, action.id, (m) => ({ text: m.text + action.text }));

    case 'tutorTurnFinished':
      return finishTurn(state, action.id, action.stopped);

    case 'tutorTurnFailed':
      return updateMessage(state, action.id, () => ({ status: 'error', error: action.error }));

    case 'tutorMessageRemoved':
      return { ...state, messages: state.messages.filter((m) => m.id !== action.id) };

    case 'lessonReset':
      return emptyLesson;

    default:
      throw new Error(`Unknown lesson action: ${action.type}`);
  }
}

/**
 * Progress only moves when a turn ends (or the student stops it). A failed
 * turn changes nothing, so retrying it can never count an answer twice.
 */
function finishTurn(state, id, stopped) {
  const message = state.messages.find((m) => m.id === id);
  if (!message) return state;
  if (stopped && !message.text) return lessonReducer(state, { type: 'tutorMessageRemoved', id });

  const finished = updateMessage(state, id, () => ({ status: stopped ? 'stopped' : 'done' }));
  return message.meta ? applyAssessment(finished, message.meta) : finished;
}

function applyAssessment(state, meta) {
  const { plan, progress } = state;
  const weakAnswer = meta.assessment === 'incorrect' || meta.assessment === 'partial';
  const attempts = progress.attempts.map((count, i) =>
    i === progress.stepIndex && weakAnswer ? count + 1 : count,
  );
  if (!meta.stepComplete) return { ...state, progress: { ...progress, attempts } };

  const stepIndex = progress.stepIndex + 1;
  return {
    ...state,
    status: stepIndex >= plan.steps.length ? 'complete' : state.status,
    progress: { ...progress, attempts, stepIndex },
  };
}

function trackTime(progress, at) {
  const since = progress.lastActiveAt === null ? 0 : at - progress.lastActiveAt;
  return {
    ...progress,
    activeMs: progress.activeMs + Math.min(Math.max(since, 0), IDLE_CAP_MS),
    lastActiveAt: at,
  };
}

function updateMessage(state, id, change) {
  return {
    ...state,
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...change(m) } : m)),
  };
}

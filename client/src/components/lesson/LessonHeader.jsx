import { minutesLeft } from '../../lesson/selectors.js';
import { KeyButton } from '../KeyButton.jsx';
import { Icon } from '../ui/Icon.jsx';

export function LessonHeader({ lesson, hasKey, onNewLesson, onOpenSettings, stepsOpen, onToggleSteps }) {
  const { plan, progress, status } = lesson;
  return (
    <header className="shrink-0 border-b border-line bg-white">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={onNewLesson}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-muted hover:bg-pen-soft hover:text-ink"
        >
          <Icon name="back" className="size-4" />
          <span className="hidden sm:inline">New lesson</span>
          <span className="sr-only sm:hidden">New lesson</span>
        </button>
        <h1 dir="auto" className="min-w-0 flex-1 truncate text-center text-[17px] font-bold">
          {plan.title}
        </h1>
        <KeyButton hasKey={hasKey} onClick={onOpenSettings} />
      </div>

      <button
        type="button"
        onClick={onToggleSteps}
        aria-expanded={stepsOpen}
        aria-controls="step-list-mobile"
        className="flex w-full items-center gap-3 border-t border-line px-4 py-2 text-start lg:pointer-events-none"
      >
        <span className="shrink-0 text-[15px] font-bold tabular-nums">
          <ProgressLabel lesson={lesson} />
        </span>
        <ProgressBar
          total={plan.steps.length}
          done={progress.stepIndex}
          current={status === 'active' ? progress.stepIndex : -1}
        />
        <span className="hidden shrink-0 text-sm text-muted sm:inline">
          {status === 'complete'
            ? 'Done'
            : status === 'ready'
              ? `About ${plan.durationMinutes} min`
              : `About ${minutesLeft(lesson)} min left`}
        </span>
        <Icon
          name="chevron"
          className={`size-4 shrink-0 text-muted transition-transform lg:hidden ${stepsOpen ? 'rotate-180' : ''}`}
        />
      </button>
    </header>
  );
}

function ProgressLabel({ lesson }) {
  const total = lesson.plan.steps.length;
  if (lesson.status === 'complete') return `All ${total} steps done`;
  if (lesson.status === 'ready') return `${total} steps`;
  return `Step ${lesson.progress.stepIndex + 1} of ${total}`;
}

/** One segment per step: done steps are filled, the current one is half filled. */
function ProgressBar({ total, done, current }) {
  return (
    <span
      className="flex min-w-0 flex-1 gap-1"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label="Lesson progress"
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-grid">
          <span
            className={`block h-full rounded-full transition-[width] duration-500 ${
              i < done ? 'w-full bg-tick' : i === current ? 'w-1/2 bg-pen' : 'w-0'
            }`}
          />
        </span>
      ))}
    </span>
  );
}

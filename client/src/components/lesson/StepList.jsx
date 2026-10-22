import { needsReview, triesOn } from '../../lesson/selectors.js';
import { Icon } from '../ui/Icon.jsx';

export function StepList({ lesson }) {
  const { plan, progress, status } = lesson;
  return (
    <ol className="space-y-1">
      {plan.steps.map((step, index) => {
        const state =
          index < progress.stepIndex
            ? 'done'
            : index === progress.stepIndex && status !== 'ready'
              ? 'current'
              : 'upcoming';
        return (
          <li
            key={index}
            aria-current={state === 'current' ? 'step' : undefined}
            className={`flex gap-3 rounded-lg px-2 py-2 ${state === 'current' ? 'bg-pen-soft' : ''}`}
          >
            <StepMark state={state} number={index + 1} />
            <div className="min-w-0" dir={plan.dir}>
              <p className={`leading-snug ${state === 'upcoming' ? 'text-muted' : 'font-medium'}`}>
                {step.title}
              </p>
              {state === 'current' && (
                <p className="mt-0.5 text-sm leading-snug text-muted">{step.objective}</p>
              )}
              {state === 'done' && needsReview(progress, index) && (
                <p className="mt-0.5 text-sm text-muted" dir="ltr">
                  Took {triesOn(progress, index)} tries
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepMark({ state, number }) {
  if (state === 'done') {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-tick text-white">
        <Icon name="check" className="size-4" />
        <span className="sr-only">Done:</span>
      </span>
    );
  }
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
        state === 'current' ? 'bg-pen text-white' : 'border border-line text-muted'
      }`}
    >
      {number}
    </span>
  );
}

import { minutesElapsed, needsReview, triesOn } from '../../lesson/selectors.js';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';

/** The end of the lesson, with what is worth reviewing (from progress, not from the chat). */
export function LessonComplete({ lesson, onNewLesson }) {
  const { plan, progress } = lesson;
  const minutes = Math.max(1, minutesElapsed(progress));
  const toReview = plan.steps
    .map((step, index) => ({ step, index, tries: triesOn(progress, index) }))
    .filter(({ index }) => needsReview(progress, index));

  return (
    <section className="rounded-2xl border border-tick/30 bg-white p-5 sm:p-6" aria-labelledby="done-title">
      <h2 id="done-title" className="flex items-center gap-2.5 text-xl font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-tick text-white">
          <Icon name="check" className="size-4" />
        </span>
        Lesson complete
      </h2>
      <p className="mt-2 text-[17px]">
        All {plan.steps.length} steps done in about {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
      </p>
      {toReview.length > 0 && (
        <div className="mt-4">
          <p className="font-medium">Worth reviewing</p>
          <ul className="mt-1 space-y-1 text-[15px] text-muted">
            {toReview.map(({ step, tries }) => (
              <li key={step.title}>
                <span dir={plan.dir} className="text-ink">
                  {step.title}
                </span>{' '}
                took {tries} tries
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button onClick={onNewLesson} className="mt-5">
        Start a new lesson
      </Button>
    </section>
  );
}

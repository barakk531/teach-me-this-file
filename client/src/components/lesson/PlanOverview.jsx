import { Button } from '../ui/Button.jsx';

/** Shown before the first message: the teacher can check the plan the AI made. */
export function PlanOverview({ lesson, onStart }) {
  const { plan, fileName } = lesson;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-[15px] text-muted">
        Lesson plan for <span dir="auto" className="font-medium text-ink">{fileName}</span>
      </p>
      <h2 dir={plan.dir} className="mt-1 text-3xl leading-tight font-bold tracking-tight">
        {plan.title}
      </h2>
      <p className="mt-3 text-[17px]">
        {plan.audience ? `For ${plan.audience}, in` : 'In'} {plan.language}, about{' '}
        {plan.durationMinutes} minutes, in {plan.steps.length} steps.
      </p>
      {plan.scope && (
        <p dir={plan.dir} className="mt-2 text-[15px] text-muted">
          {plan.scope}
        </p>
      )}

      <ol className="mt-6 space-y-4 border-s-2 border-line ps-5" dir={plan.dir}>
        {plan.steps.map((step, index) => (
          <li key={index}>
            <p className="font-bold">
              {index + 1}. {step.title}
            </p>
            <p className="mt-0.5 text-[15px] text-muted">{step.objective}</p>
          </li>
        ))}
      </ol>

      <Button onClick={onStart} className="mt-8 w-full text-[17px] sm:w-auto sm:px-6">
        Start the lesson
      </Button>
    </div>
  );
}

import { useCallback, useState } from 'react';
import { useTutor } from '../../hooks/useTutor.js';
import { isStreaming } from '../../lesson/selectors.js';
import { ChatThread } from './ChatThread.jsx';
import { Composer } from './Composer.jsx';
import { LessonHeader } from './LessonHeader.jsx';
import { PlanOverview } from './PlanOverview.jsx';
import { SourcePanel } from './SourcePanel.jsx';
import { StepList } from './StepList.jsx';

export function LessonScreen({ lesson, dispatch, apiKey, hasKey, onOpenSettings }) {
  const tutor = useTutor({ lesson, dispatch, apiKey });
  const [openSources, setOpenSources] = useState(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const closeSources = useCallback(() => setOpenSources(null), []);

  function handleNewLesson() {
    const inProgress = lesson.status === 'active';
    if (inProgress && !window.confirm('Leave this lesson and start a new one?')) return;
    tutor.stop();
    dispatch({ type: 'lessonReset' });
  }

  return (
    <div className="flex h-dvh flex-col">
      <LessonHeader
        lesson={lesson}
        hasKey={hasKey}
        onNewLesson={handleNewLesson}
        onOpenSettings={onOpenSettings}
        stepsOpen={stepsOpen}
        onToggleSteps={() => setStepsOpen((open) => !open)}
      />
      {stepsOpen && (
        <div
          id="step-list-mobile"
          className="max-h-[50dvh] shrink-0 overflow-y-auto border-b border-line bg-white px-2 py-2 lg:hidden"
        >
          <StepList lesson={lesson} />
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Lesson steps"
          className="hidden w-72 shrink-0 overflow-y-auto border-e border-line bg-white px-3 py-4 lg:block"
        >
          <StepList lesson={lesson} />
          {lesson.plan.scope && (
            <p
              dir={lesson.plan.dir}
              className="mt-4 border-t border-line px-2 pt-4 text-sm text-muted"
            >
              {lesson.plan.scope}
            </p>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {lesson.status === 'ready' ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PlanOverview lesson={lesson} onStart={tutor.start} />
            </div>
          ) : (
            <>
              <ChatThread
                lesson={lesson}
                onShowSources={setOpenSources}
                onRetry={tutor.retry}
                onOpenSettings={onOpenSettings}
                onNewLesson={handleNewLesson}
              />
              {lesson.status === 'active' && (
                <Composer
                  streaming={isStreaming(lesson)}
                  onSend={tutor.send}
                  onStop={tutor.stop}
                  dir="auto"
                />
              )}
            </>
          )}
        </main>

        {openSources && <SourcePanel passages={openSources} onClose={closeSources} />}
      </div>
    </div>
  );
}

import { useLayoutEffect, useRef } from 'react';
import { LessonComplete } from './LessonComplete.jsx';
import { TutorMessage } from './TutorMessage.jsx';

// Within this distance from the bottom, new text keeps the view scrolled down.
const STICK_THRESHOLD_PX = 80;

export function ChatThread({ lesson, onShowSources, onRetry, onOpenSettings, onNewLesson }) {
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const { messages, plan } = lesson;
  const lastStudentId = messages.findLast((m) => m.role === 'student')?.id;
  const seenStudentId = useRef(lastStudentId);

  // Follow the reply while it streams and when it ends (sources, errors), unless the
  // student scrolled up to read. A new message from the student always brings it back.
  useLayoutEffect(() => {
    if (lastStudentId !== seenStudentId.current) {
      seenStudentId.current = lastStudentId;
      stickToBottom.current = true;
    }
    const el = scrollRef.current;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, lastStudentId, lesson.status]);

  function handleScroll() {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
      <div
        role="log"
        aria-label="Lesson chat"
        className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6"
      >
        {messages.map((message, index) =>
          message.role === 'tutor' ? (
            <TutorMessage
              key={message.id}
              message={message}
              plan={plan}
              isLast={index === messages.length - 1}
              onShowSources={onShowSources}
              onRetry={onRetry}
              onOpenSettings={onOpenSettings}
            />
          ) : (
            <div key={message.id} className="flex justify-end">
              {/* Outside the bubble, so its English letters do not set the bubble's direction. */}
              <span className="sr-only">You:</span>
              <p
                dir="auto"
                className="max-w-[85%] rounded-2xl rounded-ee-md bg-pen-soft px-4 py-2.5 text-[17px] leading-relaxed whitespace-pre-wrap"
              >
                {message.text}
              </p>
            </div>
          ),
        )}
        {lesson.status === 'complete' && (
          <LessonComplete lesson={lesson} onNewLesson={onNewLesson} />
        )}
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef } from 'react';
import { LessonComplete } from './LessonComplete.jsx';
import { TutorMessage } from './TutorMessage.jsx';

// Within this distance from the bottom, new text keeps the view scrolled down.
const STICK_THRESHOLD_PX = 80;

export function ChatThread({ lesson, onShowSources, onRetry, onOpenSettings, onNewLesson }) {
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const { messages, plan } = lesson;
  const lastText = messages.at(-1)?.text;

  // Follow the streaming reply, unless the student scrolled up to read.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastText, lesson.status]);

  // A new message from the student always brings the view back down.
  useEffect(() => {
    if (messages.at(-1)?.role === 'student') stickToBottom.current = true;
  }, [messages]);

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
              <p
                dir="auto"
                className="max-w-[85%] rounded-2xl rounded-ee-md bg-pen-soft px-4 py-2.5 text-[17px] leading-relaxed whitespace-pre-wrap"
              >
                <span className="sr-only">You: </span>
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

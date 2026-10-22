import { useEffect, useReducer } from 'react';
import { lessonReducer } from './lessonReducer.js';
import { isStreaming } from './selectors.js';
import { loadLesson, saveLesson } from './storage.js';

export function useLesson() {
  const [lesson, dispatch] = useReducer(lessonReducer, undefined, loadLesson);

  // Saving on every streamed chunk would be wasteful; save once a reply is complete.
  const streaming = isStreaming(lesson);
  useEffect(() => {
    if (!streaming) saveLesson(lesson);
  }, [lesson, streaming]);

  return [lesson, dispatch];
}

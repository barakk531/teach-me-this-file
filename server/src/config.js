// Free keys get about 20 requests per day for each model, so every model in the chain adds
// its own quota. 3.6 Flash first (the stable release; 3.8 Flash was overloaded on most free
// calls in testing), Flash-Lite last (weaker, but a separate quota).
const DEFAULT_MODELS = 'gemini-3.6-flash,gemini-3.8-flash,gemini-3.5-flash-lite';

export const config = {
  port: Number(process.env.PORT) || 3001,
  models: (process.env.GEMINI_MODELS || DEFAULT_MODELS)
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean),
  limits: {
    uploadBytes: 20 * 1024 * 1024,
    teacherPromptChars: 2000,
    studentMessageChars: 2000,
    // The tutor sees the plan + progress from app state, so it only needs recent messages.
    historyMessages: 12,
  },
};

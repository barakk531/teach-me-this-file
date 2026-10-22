export const config = {
  port: Number(process.env.PORT) || 3001,
  models: {
    // 3.6 Flash is the stable release; 3.8 Flash was overloaded on most free-tier calls
    // in testing. Rate limits are per model, so the fallback also adds a second quota.
    primary: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    fallback: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.8-flash',
  },
  limits: {
    uploadBytes: 20 * 1024 * 1024,
    teacherPromptChars: 2000,
    studentMessageChars: 2000,
    // The tutor sees the plan + progress from app state, so it only needs recent messages.
    historyMessages: 12,
  },
};

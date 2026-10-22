export const config = {
  port: Number(process.env.PORT) || 3001,
  models: {
    // Rate limits are per model, so the fallback also gives a second free-tier quota.
    primary: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    fallback: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash',
  },
  limits: {
    uploadBytes: 20 * 1024 * 1024,
    teacherPromptChars: 2000,
    studentMessageChars: 2000,
    // The tutor sees the plan + progress from app state, so it only needs recent messages.
    historyMessages: 12,
  },
};

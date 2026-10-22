import { ThinkingLevel } from '@google/genai';
import { streamText } from '../src/ai/gemini.js';

const JUDGE_INSTRUCTIONS = `You review replies written by an AI tutor for a school lesson.
You get the lesson material, the conversation and a rubric. Decide whether the tutor's LAST reply passes the rubric.
Be strict: when the reply only partly meets the rubric, it fails. Explain your decision in one or two sentences.`;

// A different model from the tutor's: less bias toward its own style, and its own quota.
export const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || 'gemini-3.8-flash';

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['pass', 'reason'],
};

/** Asks a second model call to grade a tutor reply against a rubric. */
export async function judge({ apiKey, rubric, plan, teacherPrompt, transcript }) {
  const material = plan.passages.map((p) => `[${p.id}, ${p.location}] ${p.text}`).join('\n');
  const conversation = transcript
    .map((m, i) => {
      const speaker = m.role === 'student' ? 'Student' : 'Tutor';
      return i === transcript.length - 1
        ? `${speaker} (REPLY UNDER REVIEW): ${m.text}`
        : `${speaker}: ${m.text}`;
    })
    .join('\n\n');

  let json = '';
  const chunks = streamText({
    apiKey,
    models: [JUDGE_MODEL],
    systemInstruction: JUDGE_INSTRUCTIONS,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `<teacher_instructions>\n${teacherPrompt}\n</teacher_instructions>\n\n<material>\n${material}\n</material>\n\n<conversation>\n${conversation}\n</conversation>\n\n<rubric>\n${rubric}\n</rubric>`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: VERDICT_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    },
  });
  for await (const chunk of chunks) json += chunk;
  return JSON.parse(json);
}

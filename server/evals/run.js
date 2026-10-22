// Behaviour evals against the real Gemini API.
// Usage: npm run eval [-- tutor|planner] [--runs N] [--only id]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createLessonPlan } from '../src/ai/planner.js';
import { runTutorTurn } from '../src/ai/tutor.js';
import { readUpload } from '../src/files/readUpload.js';
import { judge } from './judge.js';
import { plannerScenarios } from './plannerScenarios.js';
import { tutorScenarios } from './tutorScenarios.js';

const SAMPLES = new URL('../../samples/', import.meta.url);
const RESULTS = new URL('./results/', import.meta.url);
// Free keys allow only a few requests per minute.
const PAUSE_MS = Number(process.env.EVAL_PAUSE_MS ?? 6000);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Set GEMINI_API_KEY in .env to run the evals.');
  process.exit(1);
}

const args = process.argv.slice(2);
const suite = args.find((a) => a === 'tutor' || a === 'planner');
const runs = Number(args[args.indexOf('--runs') + 1]) || 1;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const selected = (list) => list.filter((s) => !only || s.id === only);

const results = [];
if (suite !== 'planner') {
  for (const scenario of selected(tutorScenarios)) await repeat(scenario, runTutorScenario);
}
if (suite !== 'tutor') {
  for (const scenario of selected(plannerScenarios)) await repeat(scenario, runPlannerScenario);
}
await report(results);

async function repeat(scenario, runner) {
  for (let run = 1; run <= runs; run++) {
    process.stdout.write(`${scenario.id} (run ${run}/${runs})… `);
    let outcome;
    let verdict;
    try {
      outcome = await runner(scenario);
      verdict = outcome.problems.length === 0 ? 'PASS' : 'FAIL';
    } catch (err) {
      // The AI could not be reached (overload, quota): no verdict on its behaviour.
      outcome = { problems: [`${err.code ?? 'error'}: ${err.message}`], transcript: [] };
      verdict = 'ERROR';
    }
    console.log(
      verdict === 'PASS' ? verdict : `${verdict}\n   - ${outcome.problems.join('\n   - ')}`,
    );
    results.push({ scenario, run, verdict, ...outcome });
  }
}

async function runTutorScenario({ input, expect, rubric }) {
  const { meta, raw, text } = await tutorTurn(input);
  const problems = [];
  if (!raw) problems.push('the reply had no valid status line');
  if (expect.assessment && !expect.assessment.includes(meta.assessment)) {
    problems.push(
      `assessment was "${meta.assessment}", expected ${expect.assessment.join(' or ')}`,
    );
  }
  if (expect.stepComplete !== undefined && meta.stepComplete !== expect.stepComplete) {
    problems.push(`stepComplete was ${meta.stepComplete}, expected ${expect.stepComplete}`);
  }
  const transcript = [
    ...input.history,
    ...(input.studentMessage ? [{ role: 'student', text: input.studentMessage }] : []),
    { role: 'tutor', text },
  ];
  const verdict = await judgeReply({
    rubric,
    plan: input.plan,
    teacherPrompt: input.teacherPrompt,
    transcript,
  });
  if (!verdict.pass) problems.push(`judge: ${verdict.reason}`);
  return { problems, meta, transcript, verdict };
}

async function runPlannerScenario({ file, prompt, check, expectError, followUp }) {
  const buffer = await readFile(new URL(file, SAMPLES));
  let plan;
  try {
    plan = await createLessonPlan({
      apiKey,
      fileParts: await readUpload({ buffer, originalname: file }),
      fileName: file,
      teacherPrompt: prompt,
    });
  } catch (err) {
    if (expectError && err.code === expectError) {
      return { problems: [], transcript: [], note: `Refused as expected: "${err.message}"` };
    }
    throw err;
  } finally {
    await pause();
  }
  if (expectError)
    return { problems: [`expected ${expectError}, got a plan`], plan, transcript: [] };

  const problems = check(plan).filter(Boolean);
  if (!followUp) return { problems, plan, transcript: [] };

  // Teach two turns from the generated plan and judge them.
  const input = {
    teacherPrompt: prompt,
    plan,
    progress: { stepIndex: 0, attempts: 0, minutesElapsed: 0 },
  };
  const start = await tutorTurn({ ...input, history: [], studentMessage: null });
  const opening = { role: 'tutor', text: start.text, meta: start.meta };
  const answer = await tutorTurn({
    ...input,
    history: [opening],
    studentMessage: followUp.studentMessage,
  });
  const transcript = [
    opening,
    { role: 'student', text: followUp.studentMessage },
    { role: 'tutor', text: answer.text },
  ];
  const verdict = await judgeReply({
    rubric: followUp.rubric,
    plan,
    teacherPrompt: prompt,
    transcript,
  });
  if (!verdict.pass) problems.push(`judge: ${verdict.reason}`);
  return { problems, plan, transcript, verdict };
}

async function tutorTurn(input) {
  let meta;
  let raw;
  let text = '';
  for await (const event of runTutorTurn({ ...input, apiKey })) {
    if (event.type === 'meta') ({ data: meta, raw } = event);
    else text += event.data.text;
  }
  await pause();
  return { meta, raw, text };
}

async function judgeReply(options) {
  const verdict = await judge({ apiKey, ...options });
  await pause();
  return verdict;
}

function pause() {
  return new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
}

async function report(all) {
  const count = (verdict) => all.filter((r) => r.verdict === verdict).length;
  const summary = `${count('PASS')} passed, ${count('FAIL')} failed, ${count('ERROR')} could not run (AI unavailable)`;
  console.log(`\n${summary}`);
  const ids = [...new Set(all.map((r) => r.scenario.id))];
  for (const id of ids) {
    const runsOf = all.filter((r) => r.scenario.id === id);
    console.log(`  ${id}: ${runsOf.filter((r) => r.verdict === 'PASS').length}/${runsOf.length}`);
  }

  const lines = [`# Eval results`, '', `${new Date().toISOString()}: ${summary}`, ''];
  for (const r of all) {
    lines.push(`## ${r.verdict}: ${r.scenario.title} (\`${r.scenario.id}\`, run ${r.run})`, '');
    r.problems.forEach((p) => lines.push(`- ${p}`));
    if (r.note) lines.push(r.note);
    if (r.verdict) lines.push(`Judge: ${r.verdict.reason}`);
    if (r.meta) lines.push('', `Status line: \`${JSON.stringify(r.meta)}\``);
    if (r.plan) {
      lines.push(
        '',
        `Plan: ${r.plan.title} (${r.plan.language}, ${r.plan.dir}, ${r.plan.steps.length} steps)`,
      );
      r.plan.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s.title}`));
    }
    for (const m of r.transcript)
      lines.push('', `> **${m.role}:** ${m.text.replace(/\n/g, '\n> ')}`);
    lines.push('');
  }
  await mkdir(RESULTS, { recursive: true });
  const file = new URL(`${new Date().toISOString().replace(/[:.]/g, '-')}.md`, RESULTS);
  await writeFile(file, lines.join('\n'));
  console.log(`Report: ${fileURLToPath(file)}`);
  process.exitCode = count('PASS') === all.length ? 0 : 1;
}

import { useState } from 'react';
import { usePlanner } from '../../hooks/usePlanner.js';
import { KeyButton } from '../KeyButton.jsx';
import { Logo } from '../Logo.jsx';
import { ServerNotice } from '../ServerNotice.jsx';
import { Button } from '../ui/Button.jsx';
import { ErrorNotice } from '../ui/ErrorNotice.jsx';
import { FilePicker } from './FilePicker.jsx';
import { PlanningProgress } from './PlanningProgress.jsx';

const PROMPT_LIMIT = 2000;
const EXAMPLE_PROMPTS = [
  'Teach this to 7th graders, in French. Be Socratic. Keep it under 15 minutes.',
  'Explain it simply to a 10-year-old, with everyday examples.',
  'Prepare a student for a test on this. Ask hard questions and insist on precise vocabulary.',
];

export function SetupScreen({ apiKey, hasKey, server, onOpenSettings, onPlanned }) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [fileError, setFileError] = useState(null);
  const [promptError, setPromptError] = useState(null);
  const planner = usePlanner();

  async function handleSubmit(event) {
    event.preventDefault();
    const missingFile = !file && 'Choose a file to teach from.';
    const missingPrompt = !prompt.trim() && 'Write how the lesson should be taught.';
    setFileError(missingFile || fileError);
    setPromptError(missingPrompt || null);
    if (missingFile || missingPrompt) return;
    if (!hasKey) return onOpenSettings();

    const teacherPrompt = prompt.trim();
    const plan = await planner.createPlan({ file, prompt: teacherPrompt, apiKey });
    if (plan) onPlanned({ plan, teacherPrompt, fileName: file.name });
  }

  return (
    <div className="ruled-paper min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo />
        <KeyButton hasKey={hasKey} onClick={onOpenSettings} />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <ServerNotice status={server} />

        <h1 className="mt-8 text-[2.15rem] leading-[1.15] font-bold tracking-tight sm:text-5xl">
          <span className="marker animate-highlight">Turn a file into a lesson.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Upload the material and say how to teach it. A tutor then teaches it in a chat, one
          step at a time, checking understanding as it goes.
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_0_var(--color-line),0_12px_32px_-20px_rgb(24_35_61/0.35)]"
        >
          {planner.isWorking ? (
            <PlanningProgress
              fileName={file.name}
              phase={planner.phase}
              passages={planner.passages}
              steps={planner.steps}
              onCancel={planner.cancel}
            />
          ) : (
            <>
              <section className="p-5 sm:p-6">
                <SectionTitle number={1} id="material-title">
                  The material
                </SectionTitle>
                <FilePicker
                  file={file}
                  onChange={setFile}
                  error={fileError}
                  onError={setFileError}
                />
              </section>

              <section className="border-t border-line p-5 sm:p-6">
                <SectionTitle number={2} id="prompt-title">
                  How to teach it
                </SectionTitle>
                <textarea
                  id="teacher-prompt"
                  aria-labelledby="prompt-title"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_LIMIT))}
                  rows={4}
                  dir="auto"
                  placeholder="Who is the student, in which language, in what style, for how long?"
                  aria-invalid={Boolean(promptError)}
                  className="block w-full resize-y rounded-xl border border-line bg-paper px-3.5 py-3 text-[17px] leading-relaxed placeholder:text-muted/80 focus:border-pen focus:bg-white focus:outline-none"
                />
                {promptError && <p className="mt-2 text-[15px] text-danger">{promptError}</p>}
                <p className="mt-4 text-sm font-medium text-muted">Examples</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setPrompt(example);
                        setPromptError(null);
                      }}
                      className="rounded-lg border border-line bg-white px-3 py-1.5 text-start text-sm hover:border-pen/50 hover:bg-pen-soft/60"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </section>

              <div className="border-t border-line bg-paper p-5 sm:p-6">
                {planner.error && (
                  <ErrorNotice
                    error={planner.error}
                    onRetry={handleSubmit}
                    onOpenSettings={onOpenSettings}
                    className="mb-4"
                  />
                )}
                <Button
                  type="submit"
                  className="w-full text-[17px] sm:w-auto sm:px-6"
                  disabled={server.state !== 'ready'}
                >
                  Create the lesson
                </Button>
                {server.state !== 'ready' && (
                  <p className="mt-2 text-sm text-muted">Waiting for the server…</p>
                )}
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}

function SectionTitle({ number, id, children }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-3 text-lg font-bold">
      <span className="grid size-7 place-items-center rounded-full bg-ink text-sm text-white">
        {number}
      </span>
      {children}
    </h2>
  );
}

# Teach Me This File

A teacher uploads a file and writes how it should be taught. The app turns it into a chat lesson: an AI tutor teaches the content one step at a time, checks that the student understood, adapts when they did not, and shows the passage of the file behind each message.

Live app: https://teach-me-this-file-23o7.onrender.com. You need a free Gemini key (step 1 below). After a quiet period the free server takes up to a minute to wake up.

[DECISIONS.md](DECISIONS.md) explains the design choices, the weaknesses I know about and how I tested the AI's behaviour.

## Using the app

1. Add a Gemini API key. Each user brings their own free key:
   1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with a Google account.
   2. Click **Create API key** and copy the key. The free tier needs no credit card.
   3. In the app, click **API key** at the top right, paste the key and click **Save key**. If you create a lesson without a key, the app opens this dialog by itself.

   By default the key is kept only for the current tab. Tick "Remember on this device" to keep it after the tab closes. It is sent to the server with each request and never stored there.

2. Upload the material: a PDF (scanned pages work too), a photo (PNG, JPG, WEBP, HEIC), a Word document (.docx) or a text file (.txt, .md, .csv), up to 20 MB. On a phone you can take a photo of a page.
3. Write how to teach it, for example _"Teach this to 7th graders, in French. Be Socratic. Keep it under 15 minutes."_
4. Check the lesson plan and press **Start the lesson**.
5. Learn in the chat by answering the tutor's questions. **Stop** interrupts a reply, **Source** under a message shows the passages of the file it is based on, and the progress bar ("Step 3 of 7") shows where you are. On a phone, tap the progress bar to see all the steps.

The lesson is saved in the browser, so a refresh does not lose it. **New lesson** starts over.

The [samples](samples/) folder has files to try: a textbook chapter, a 332-page textbook, a Hebrew (right-to-left) document, a Word document with a table, a scanned worksheet, a photo of a worksheet, a file with hidden instructions aimed at the AI, and a receipt with nothing to teach.

## Running it locally

You need Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on port 3001 and Vite forwards `/api` to it.

You can also give the server its own key with a `.env` file at the project root. The key field in the app then becomes optional:

```bash
# A free key from https://aistudio.google.com/apikey ("Create API key")
GEMINI_API_KEY=your-key
# Models tried in order (each has its own free daily quota)
# GEMINI_MODELS=gemini-3.6-flash,gemini-3.8-flash,gemini-3.5-flash-lite
```

Leave `GEMINI_API_KEY` unset on a public deployment, because anyone who opens the app could spend that key's quota. The live app expects each user to bring their own key.

| Command         | What it does                                                        |
| --------------- | ------------------------------------------------------------------- |
| `npm run dev`   | Client (Vite, hot reload) and server (Node, restarts on change)     |
| `npm test`      | Unit tests (Vitest): parsing, lesson state, validation, file types  |
| `npm run eval`  | Behaviour evals against the real Gemini API (needs a key in `.env`) |
| `npm run lint`  | ESLint                                                              |
| `npm run build` | Builds the client into `client/dist`                                |
| `npm start`     | Production server: API + built client on one port                   |

`npm run eval -- tutor`, `npm run eval -- planner`, `--only <id>` and `--runs 3` narrow or repeat the evals. Reports go to `server/evals/results/`, and the reports behind DECISIONS.md are in [docs/evals](docs/evals/).

Free Gemini keys allow about 20 requests per model per day, and one full eval run uses about 19 for the tutor model and 12 for the judge. To measure a single model, pin it: `GEMINI_MODELS=gemini-3.6-flash EVAL_JUDGE_MODEL=gemini-3.8-flash npm run eval`.

## How it is built

```
client/src/
  api/          talks to the server (fetch + Server-Sent Events)
  lesson/       lesson state: reducer, selectors, saving to localStorage
  hooks/        connect state and network: planning, tutor turns, server wake-up
  settings/     the user's API key (browser storage only)
  components/   UI: setup screen, lesson chat, sources, settings
server/src/
  ai/           the only code that talks to Gemini: planner, tutor, prompts, status-line parser
  files/        turns an upload into model input (PDF/image as is, Word to HTML, text)
  http/         errors, SSE streaming, API key header
  routes/       POST /api/plan, POST /api/turn
server/evals/   behaviour scenarios, an AI judge, and the runner
samples/        files for trying the app
```

- The planner (`POST /api/plan`) reads the whole file once and returns a lesson plan as JSON: steps (objective, key points, check question) and short passages copied word for word from the file, which each step links to. It streams its progress while it works.
- The tutor (`POST /api/turn`) streams one reply per turn. Its instructions are rebuilt from app state each time (plan, current step, key points taught, weak answers so far, time used), so the file and the full chat history are never sent again. Each reply starts with a hidden status line (`assessment`, `stepComplete`, `keyPoint`, `sources`) that the app uses to update progress and show sources.
- The lesson state lives in the browser, in a reducer. The server stores nothing.

## Deployment

The app runs as a single [Render](https://render.com) web service on the free plan ([render.yaml](render.yaml)): `npm ci --include=dev && npm run build`, then `npm start`. Express serves the API and the built client from the same origin. The free plan sleeps after 15 minutes without traffic, and the app shows a "waking up" notice while it starts again.

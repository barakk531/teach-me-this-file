# Teach Me This File

A teacher uploads a file and writes how to teach it. The app turns it into a chat lesson: an AI tutor teaches the content one step at a time, checks understanding, adapts, and shows the passage of the file behind each message.

**Live app:** _added after deployment_

The reasoning behind the design, its known weaknesses and how the AI's behaviour was tested are in [DECISIONS.md](DECISIONS.md).

## Using the app

1. **Add a Gemini API key.** Click **API key** (top right) and paste a free key from [Google AI Studio](https://aistudio.google.com/apikey). By default the key is kept only for the current tab; tick "Remember on this device" to keep it. It is sent to the server with each request and never stored there.
2. **Upload the material.** PDF (including scanned pages), a photo (PNG, JPG, WEBP, HEIC), a Word document (.docx) or a text file (.txt, .md, .csv), up to 20 MB. On a phone you can take a photo of a page.
3. **Say how to teach it**, for example: _"Teach this to 7th graders, in French. Be Socratic. Keep it under 15 minutes."_
4. **Check the lesson plan** and press **Start the lesson**.
5. **Learn in the chat.** Answer the tutor's questions. Use **Stop** to interrupt a reply, **Source** under a message to see the passages of the file it is based on, and the progress bar (**Step 3 of 7**) to see where you are. Tap the progress bar on a phone to see all the steps.

The lesson is saved in the browser, so a refresh does not lose it. **New lesson** starts over.

The [samples](samples/) folder has files to try: a textbook chapter, a Hebrew (right-to-left) document, a scanned worksheet, a photo, a file with hidden instructions aimed at the AI, and a receipt with nothing to teach.

## Running it locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on port 3001 and Vite forwards `/api` to it.

Optionally, create a `.env` file at the project root to give the server its own key (then the key field in the app becomes optional):

```bash
GEMINI_API_KEY=your-key
# Models tried in order (each has its own free daily quota)
# GEMINI_MODELS=gemini-3.6-flash,gemini-3.8-flash,gemini-3.5-flash-lite
```

| Command         | What it does                                                        |
| --------------- | ------------------------------------------------------------------- |
| `npm run dev`   | Client (Vite, hot reload) and server (Node, restarts on change)     |
| `npm test`      | Unit tests (Vitest): parsing, lesson state, validation, file types  |
| `npm run eval`  | Behaviour evals against the real Gemini API (needs a key in `.env`) |
| `npm run lint`  | ESLint                                                              |
| `npm run build` | Builds the client into `client/dist`                                |
| `npm start`     | Production server: API + built client on one port                   |

`npm run eval -- tutor`, `npm run eval -- planner`, `--only <id>` and `--runs 3` narrow or repeat the evals. Reports are written to `server/evals/results/`.

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

- **Planner** (`POST /api/plan`): reads the whole file once and returns a lesson plan as JSON: steps (objective, key points, check question) and short word-for-word passages from the file that each step is linked to. Progress is streamed while it works.
- **Tutor** (`POST /api/turn`): one streamed reply per turn. Its instructions are rebuilt from app state each time (plan, current step, weak answers so far, time used), so the full file and the full chat history are never re-sent. Each reply starts with a hidden status line (`assessment`, `stepComplete`, `sources`) that the app uses to update progress and show sources.
- **Lesson state** lives in the browser in a reducer. The server stores nothing.

## Deployment

The app runs as a single [Render](https://render.com) web service on the free plan ([render.yaml](render.yaml)): `npm ci --include=dev && npm run build`, then `npm start`. Express serves the API and the built client from the same origin. The free plan sleeps after 15 minutes without traffic; the app shows a "waking up" notice while it starts again.

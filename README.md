# Skill Revival (MRUHacks)

AI-assisted skill coach: learn practical life skills step by step, preserve family methods as lessons, and get webcam feedback as you practice. Built for MRUHacks.

## What it does

- **Learn** seeded lessons (sewing, cooking, repairs, gardening, household skills)
- **Create skills** with a LangGraph chat flow (`POST /create-skill`) — ask for a skill and the AI builds a webcam-checkable lesson
- **Preserve** handwritten notes or typed recipes as lessons (`POST /generate-lesson`)
- **Coach** via webcam frames (`POST /check`) — the backend owns progression (two consecutive passes to advance)

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + Vite (`frontend/`) |
| Backend | Node.js + Express (`server/`) |
| AI | OpenAI (`gpt-4o`) preferred, or Anthropic; `MOCK_MODE` for offline demo |
| Skill creation | LangGraph (`server/createSkillGraph.js`) |
| Lessons | In-memory Map persisted to `server/lessons.json` |

## Project layout

```
MRUHacks/
├── frontend/          # Vite React app
├── server/
│   ├── index.js       # Express API
│   ├── curriculum.json
│   ├── lessons.js     # Lesson library
│   ├── createSkillGraph.js
│   ├── generateLesson.js
│   ├── llm.js         # OpenAI / Anthropic / mock
│   └── sessions.js
├── .env.example
└── package.json       # Backend root
```

## Prerequisites

- Node.js 18+
- An OpenAI API key (recommended) **or** Anthropic API key, unless you use mock mode

## Setup

### 1. Backend env

```powershell
cd C:\Users\m2404\Desktop\Hackathons\MRUHacks
Copy-Item .env.example server\.env
```

Edit `server\.env`:

```
MOCK_MODE=false
PORT=3001
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
ANTHROPIC_API_KEY=
```

| Variable | Purpose |
| --- | --- |
| `MOCK_MODE=true` | No API calls; fake checks and generated lessons |
| `OPENAI_API_KEY` | Used first if set (vision-capable model required for photos) |
| `ANTHROPIC_API_KEY` | Fallback if OpenAI is empty |
| `PORT` | Default `3001` |

Do not commit `server\.env`.

### 2. Install dependencies

```powershell
# Backend (repo root)
npm install

# Frontend
cd frontend
npm install
cd ..
```

## Run locally

Use **two terminals**.

**Terminal 1 — API**

```powershell
cd C:\Users\m2404\Desktop\Hackathons\MRUHacks
npm start
```

You should see: `Skill coach server listening on port 3001`

Check: [http://localhost:3001/health](http://localhost:3001/health) → `{"ok":true,"provider":"openai"}` (or `mock` / `anthropic`)

**Terminal 2 — UI**

```powershell
cd C:\Users\m2404\Desktop\Hackathons\MRUHacks\frontend
npm run dev
```

Open the Vite URL (usually [http://localhost:5173](http://localhost:5173)).

## API overview

Base URL: `http://localhost:3001`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness + which LLM provider is active |
| `GET` | `/skills` | Legacy category catalog from `curriculum.json` |
| `GET` | `/lessons` | Lesson summaries (library) |
| `GET` | `/lessons/:id` | Full lesson |
| `POST` | `/create-skill` | LangGraph: chat → new lesson |
| `POST` | `/generate-lesson` | Lesson from typed text and/or JPEG base64 |
| `POST` | `/session/start` | Start coaching (`lessonId`, default `sew-button`) |
| `POST` | `/session/reset` | Reset / switch lesson |
| `POST` | `/session/confirm` | Advance a non-camera step (`verifiable: false`) |
| `POST` | `/check` | Assess a webcam JPEG for the current step |

Sessions are **in memory** — restarting the server clears active sessions. Generated lessons persist in `server/lessons.json`.

### Coaching rules (`/check`)

- Rate limit: one request per session every **2 seconds** (`429` if faster)
- Need **2 consecutive passes** to advance a step
- After **4** failures, a hint is added
- If `verifiable` is `false`, the response includes `needsSelfConfirm: true` — use `/session/confirm` instead of the model

### Quick curl examples

```powershell
# Health
curl.exe http://localhost:3001/health

# List lessons
curl.exe http://localhost:3001/lessons

# Create a skill from a sentence
curl.exe -X POST http://localhost:3001/create-skill `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Teach me how to braid hair\"}"

# Generate from typed instructions
curl.exe -X POST http://localhost:3001/generate-lesson `
  -H "Content-Type: application/json" `
  -d "{\"text\":\"Mix flour and water, rest 20 minutes, roll flat, cook in a dry pan.\",\"preservedBy\":{\"name\":\"Grandma\",\"story\":\"Sunday flatbread\"}}"

# Start a lesson
curl.exe -X POST http://localhost:3001/session/start `
  -H "Content-Type: application/json" `
  -d "{\"lessonId\":\"sew-button\"}"

# Confirm a non-visual step
curl.exe -X POST http://localhost:3001/session/confirm `
  -H "Content-Type: application/json" `
  -d "{\"sessionId\":\"SESSION_ID\"}"

# Check a frame (raw base64 JPEG, no data: prefix)
curl.exe -X POST http://localhost:3001/check `
  -H "Content-Type: application/json" `
  -d "{\"sessionId\":\"SESSION_ID\",\"image\":\"BASE64_JPEG\"}"
```

If `/create-skill` returns `"status":"needs_input"`, send another message with the same `conversationId`.

## Seeded lessons

The library is seeded from `server/curriculum.json` (e.g. sew a button, knot a tie, bake bread, grow herbs) plus **Fold a fitted sheet**. Default session lesson: **`sew-button`** (`skillId` / `sew-a-button` still work as aliases).

## Demo without an API key

```
MOCK_MODE=true
PORT=3001
```

- `/check` alternates fail / pass (~1.5s)
- `/generate-lesson` and `/create-skill` still produce real lessons in the library without calling OpenAI

## Notes for the frontend team

- Point API calls at `http://localhost:3001` in local dev
- CORS is open for local clients
- Body size limit is **15mb** for note photos on `/generate-lesson`
- Prefer `lessonId` from `/lessons` or `/create-skill` when calling `/session/start`

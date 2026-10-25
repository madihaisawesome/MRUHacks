# Skill Revival

AI webcam coach for practical life skills. Learn step by step, preserve family methods as lessons, and get feedback on your work.

**Stack:** React + Vite (`frontend/`) · Node + Express (`server/`) · OpenAI `gpt-4o` (or mock)

## Run

**1. Backend env** — copy and edit `server/.env`:

```
MOCK_MODE=false
PORT=3001
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o
```

Use `MOCK_MODE=true` to demo without an API key.

**2. Install**

```powershell
npm install
cd frontend
npm install
cd ..
```

**3. Two terminals**

```powershell
# Terminal 1 — API (port 3001)
npm start

# Terminal 2 — UI
cd frontend
npm run dev
```

Open the Vite URL (usually http://localhost:5173). Check the API: http://localhost:3001/health

## Main API routes

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/health` | Status + AI provider |
| `GET` | `/lessons` | Lesson list |
| `POST` | `/session/start` | Start a lesson (`lessonId`) |
| `POST` | `/check` | Check a webcam JPEG for the current step |
| `POST` | `/session/advance` | Next / skip step |
| `POST` | `/verify-final` | Score the finished result photo |
| `POST` | `/generate-lesson` | Build a lesson from text/notes |
| `POST` | `/create-skill` | Chat → new lesson (LangGraph) |

API base: `http://localhost:3001`

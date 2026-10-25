# MRUHacks Skill Coach

Small Express backend for an AI-assisted webcam skill coach. The backend owns
lesson progression and keeps sessions in memory.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
# Set ANTHROPIC_API_KEY in .env, then:
npm start
```

The server listens on port `3001`. Clients can use `http://localhost:3001`.

Set `MOCK_MODE=true` in `.env` to test without API calls. Mock `/check` results
alternate between failure and success (1.5s). Mock `/generate-lesson` returns
a hardcoded **Grandma's flatbread** lesson after 2 seconds.

Put `.env` next to `package.json` or in `server/`. The JSON body limit is 15mb
so a photo of a handwritten note can be sent with `/generate-lesson`.

## API examples

List skills (legacy catalog):

```powershell
curl.exe http://localhost:3001/skills
```

List saved lessons:

```powershell
curl.exe http://localhost:3001/lessons
```

Generate a lesson from typed instructions (or send `"image"` as raw JPEG base64):

```powershell
curl.exe -X POST http://localhost:3001/generate-lesson `
  -H "Content-Type: application/json" `
  -d "{\"text\":\"Mix flour and water, rest 20 minutes, roll flat, cook in a dry pan.\",\"preservedBy\":{\"name\":\"Grandma\",\"story\":\"Sunday flatbread\"}}"
```

Start a session (default lesson is `sew-button`, or pass a `lessonId`):

```powershell
curl.exe -X POST http://localhost:3001/session/start `
  -H "Content-Type: application/json" `
  -d "{\"lessonId\":\"sew-button\"}"
```

Check a JPEG frame (the image must be raw base64 without a data URL prefix):

```powershell
curl.exe -X POST http://localhost:3001/check `
  -H "Content-Type: application/json" `
  -d '{"sessionId":"SESSION_ID","image":"BASE64_JPEG"}'
```

Reset a session:

```powershell
curl.exe -X POST http://localhost:3001/session/reset `
  -H "Content-Type: application/json" `
  -d '{"sessionId":"SESSION_ID"}'
```

Confirm a step that a camera cannot verify (`verifiable: false`):

```powershell
curl.exe -X POST http://localhost:3001/session/confirm `
  -H "Content-Type: application/json" `
  -d "{\"sessionId\":\"SESSION_ID\"}"
```

## Lessons

`GET /lessons` lists summaries from the lesson library (`server/lessons.json`).
The library is seeded from `server/curriculum.json` (including **sew-button**)
plus **Fold a fitted sheet**. `POST /generate-lesson` adds a lesson from a
photo of a handwritten note and/or typed text. `POST /session/start` accepts
`lessonId` (default `sew-button`); `skillId` still works as an alias.
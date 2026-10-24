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

The server listens on `http://localhost:3001` and accepts requests from
`http://localhost:5173`. Set `MOCK_MODE=true` in `.env` to test without API
calls; mock checks alternate between failure and success and wait 1.5 seconds.

## API examples

Start a session:

```powershell
curl.exe -X POST http://localhost:3001/session/start
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

Replace `server/curriculum.json` to swap the lesson without changing code.
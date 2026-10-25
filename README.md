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

The server listens on port `3001` on all network interfaces. A computer
frontend can use `http://localhost:3001`; an Expo Go app on a phone must use
the computer's local IPv4 address, such as `http://192.168.1.25:3001`.
The phone and computer must be on the same Wi-Fi network, and the computer's
firewall must allow inbound TCP traffic on port `3001`.

Set `MOCK_MODE=true` in `.env` to test without API calls. Mock `/check` results
alternate between failure and success (1.5s). Mock `/generate-lesson` returns
a hardcoded **Grandma's flatbread** lesson after 2 seconds.

Put `.env` next to `package.json` or in `server/`. The JSON body limit is 15mb
so a photo of a handwritten note can be sent with `/generate-lesson`.

> This repository currently contains the Express backend only. Expo Go runs a
> separate React Native client; it cannot run the Node.js server itself.

## Use with Expo Go

1. Start the backend on the computer with `npm start`.
2. Find the computer's LAN IPv4 address:

   ```powershell
   ipconfig
   ```

3. Configure the Expo client API base URL to
   `http://YOUR_COMPUTER_IP:3001`, not `localhost`.
4. Start the Expo project with `npx expo start` and open it with Expo Go.
5. Verify connectivity from the phone by opening
   `http://YOUR_COMPUTER_IP:3001/health` in its browser. It should return
   `{"ok":true}`.

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
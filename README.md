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

Set `MOCK_MODE=true` in `.env` to test without API calls; mock checks alternate
between failure and success and wait 1.5 seconds.

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

List skills:

```powershell
curl.exe http://localhost:3001/skills
```

Start a session (default skill, or pass `"skillId":"knot-a-tie"`):

```powershell
curl.exe -X POST http://localhost:3001/session/start `
  -H "Content-Type: application/json" `
  -d "{\"skillId\":\"knot-a-tie\"}"
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

## Lessons

`GET /skills` lists five categories and ten lessons. `POST /session/start` accepts an optional `skillId`; if it is omitted, the session starts on **Sew a button**.

Replace `server/curriculum.json` to add or edit lessons without changing code.
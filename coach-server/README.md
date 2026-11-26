# Private AI coach setup

The GitHub Pages tracker remains at its existing address. The on-demand **local shot analysis** is usable without this server. AI is not activated until the Worker is deployed with private secrets and its URL/token are entered in the tracker. No API key belongs in HTML, GitHub, or the tracker connection form.

## Deploy

From this directory, using a Cloudflare account you control:

```sh
npx wrangler@4 login
npx wrangler@4 deploy
npx wrangler@4 secret put OPENAI_API_KEY
npx wrangler@4 secret put COACH_ACCESS_TOKEN
```

Use a dedicated OpenAI project key with billing enabled. Generate a separate random coach access token locally, for example `openssl rand -hex 32`, and store it in your password manager. It is NOT the OpenAI key. Enter that token at the final secret prompt. Until all secrets are set, requests fail closed. Choose a unique rate-limit namespace ID if 1001 already exists in your Cloudflare account. Adjust OPENAI_MODEL in wrangler.jsonc to a model available to your project if needed; then redeploy.

In the tracker: **Settings → Coach connection**, enter `https://YOUR-WORKER.workers.dev/coach` and the coach access token. The URL is remembered; the access token stays only in page memory and must be entered again after reopening/reloading. Tap **Use connection**. Open **Coach → Help me adjust**, optionally enter a question, and tap **Ask AI coach**. The local **Read this lane** button remains available without internet.

## What is sent

Only the selected current lane/game/ball/line, up to six recent first balls for that lane, the subset on the same line, up to four other-lane first balls, and your optional question. Spare attempts, notes, archived sessions, and dates are excluded. Local feedback is saved with its session; it is not model training or persistent AI memory. AI feedback identifies the following shots but does not automatically evaluate causality or change your markers.

## Protection and limits

The server requires the separate bearer token, allows only the tracker origin, validates input and caps the request body, uses a Cloudflare rate-limit binding (six requests/minute, approximate per location), and limits model output. It requests structured output with `store:false`; that flag does not promise zero provider retention. It does not log shot context or secrets. Keep the access token private. Origin checks alone are not authentication. Rate limits are not a monthly spending cap: monitor the dedicated OpenAI project's usage and configure its available budget alerts/limits.

Tests use a mocked provider response and do not incur API usage. A real AI call must be verified after provisioning. Revoke the project API key or remove the Worker to shut the AI connection down; local tracking and local analysis continue working.

## Checks

From the repository root:

```sh
node tests/tracker.test.cjs
node tests/coach.test.cjs
node tests/coach-server.test.mjs
```

References: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Cloudflare rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

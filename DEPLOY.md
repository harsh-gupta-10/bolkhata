# Cloudflare deploy (not done)

D1 binding name: **`DB`**. Database name: **`bolkhata`**. Schema: `db/schema.sql`. Sessions are rows in D1, not KV. Do not add `VINEXT_KV_CACHE`.

`cloudflare.config.ts` sets `DB: bindings.d1({ name: "bolkhata" })` and does not enable a cache binding, so a free-tier `build:vinext` then `cf deploy --prebuilt` is the intended deploy (not `deploy:vinext`, which refuses ISR/KV). `wrangler.jsonc` has the same binding. Replace `REPLACE_WITH_D1_DATABASE_ID` after `wrangler d1 create bolkhata`, then:

```bash
npx wrangler d1 execute bolkhata --remote --file=db/schema.sql
```

`GNANI_API_KEY` and `OPENAI_API_KEY` are Worker secrets, never client variables. Set them the same way, for example `npx wrangler secret put OPENAI_API_KEY`. The chat model defaults to `gpt-4o-mini`. Local `npm run dev` uses `.data/bolkhata.sqlite` when the D1 binding is absent. Without `OPENAI_API_KEY`, chat uses the in-app parser.

Google sign-in uses the public Firebase web config (`NEXT_PUBLIC_FIREBASE_*`, defaults baked into `lib/firebase-client.ts`). `POST /api/auth/google` checks the ID token with Google’s Secure Token keys. Enable the Google provider and add `bolkhata.harshgupta24716.workers.dev` (no protocol) as an authorized domain in the Firebase console.

# Earlier note

Nothing in this repo is deployed. There is no `GNANI_API_KEY` here. Do not put one in git, in `wrangler.jsonc`, or in any `NEXT_PUBLIC_` variable.

`npm run dev` and `npm run build` stay plain Next.js. That is the path that was tested.

## vinext check

`npx vinext check` on 6 Nov 2026:

- Overall **92%** (10 supported, 2 partial, **0 issues**)
- App Router, both pages, the layout, and both route handlers (`/api/stt`, `/api/tts`) are recognized
- `next/font/google`, `next/link`, `next/navigation`, Tailwind, and lucide are supported
- Partial: `next.config.ts` `turbopack.rules` are ignored (Vite does not use that loader)
- Partial: `cacheComponents` is experimental and incomplete

Route handlers themselves are on the supported list. The speech proxies are ordinary `POST` handlers: `FormData` in, JSON or `audio/wav` out, `fetch` to `api.vachana.ai`. That shape fits Workers. The check did **not** say the UI shell is safe. This app turns on Next.js 16 `cacheComponents` and `partialPrefetching`, and the customer page depends on that prerender behavior. vinext’s own report says that behavior is incomplete, so the app was **not** switched to vinext.

`vinext init --platform=cloudflare` was also not run. It stops when `wrangler.jsonc` is already in the repo, and it requires cache choices (`--cdn-cache`, `--data-cache`, `--image-optimization`) that should be picked by the person deploying, not guessed here.

## Safest later path

Keep this Next.js app until a vinext dev server is proven side by side.

1. Move the stub `wrangler.jsonc` aside, or pass vinext’s `--ignore-wrangler-config`, then run `vinext init` for Cloudflare with the cache flags you actually want. Do not delete the Next scripts until the steps below pass.
2. `npm run dev` must still work. Use the new `dev:vinext` script only as a second server.
3. On that server, with a real key only in the Worker environment, check:
   - typed add / udhaar / jama / balance (no key required)
   - `POST /api/stt` with `recording.wav` returns Prisma JSON, not a made-up transcript
   - `POST /api/tts` returns Poorvi `audio/wav` (`timbre-v2.5`, `hi-en`)
   - the home page, customer ledger, mic, and undo still render
4. Set the key as a secret after you are ready to deploy, for example `npx wrangler secret put GNANI_API_KEY` or the equivalent `cf` secret. Restart or redeploy so the Worker sees it.
5. Only then deploy. Free-tier Workers is the target. Do not deploy from this task.

`@opennextjs/cloudflare` is the fallback if a vinext build breaks `cacheComponents` or the two proxies. It keeps the real Next.js server build. Use it only after the same four checks. The stub `wrangler.jsonc` is not a deploy config: it has no `main` and no assets directory.

## Leftover blockers

- **No API key.** Voice stays off until a secret is added on the server. Typed khata already works. Do not invent a key.
- **Free-plan CPU is 10 ms** ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/), updated 29 Oct 2026). Time waiting on `fetch` does not count, and HTTP wall time is unlimited while the phone stays connected, so a slow Gnani reply is allowed. Copying a WAV into memory does count. `/api/stt` buffers up to 2.5 MB. Cloudflare’s own note is that parsing a large body often takes 10–20 ms, which is over the free limit (`Error 1102`). A 30-second 16 kHz mono WAV is about 1 MB. **Try one real upload on the free plan before the demo.** If it is killed, use Workers Paid (default 30 s CPU) or stream the file instead of `arrayBuffer()`.
- **The in-memory Gnani lock is per isolate.** One phone already waits for STT to finish before TTS. Two phones at once can still send two Gnani calls. Free accounts that allow only one in-flight request can get HTTP 429. The route retries 429, but it cannot queue across isolates.
- **Request body limit on a free zone is 100 MB.** The app caps audio at 2.5 MB, so this is not the blocker.
- **PWA.** `public/sw.js` is registered only in production. Confirm the manifest and icons after the first real deploy. vinext loads `next/font/google` itself and falls back to the Google CDN if that fetch fails, so a font can look different offline.
- **`wrangler.jsonc` must not be deployed as it stands.**

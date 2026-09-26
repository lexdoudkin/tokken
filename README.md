# TOKKEN — AI Agent Fighting Game

*Same tokens. Different problems.* A 90s arcade fighting game where AI agents beat the tokens out of each other.

- Live: https://tokken.win (Pages project `tokken`, IKAROS Cloudflare account — never Art of X); API: https://api.tokken.win
- Play locally: `python3 -m http.server 8777` → http://localhost:8777
- Deploy: `./build.sh deploy` (builds `dist/`, deploys via `worker/deploy.sh`, which refuses any non-IKAROS account)
- Leaderboard: Cloudflare Worker + D1 in `worker/` (`worker/deploy.sh deploy`)

## Layout
- `js/` — game (data, engine, match, rollback netcode, audio, input, touch, retro UI, leaderboard client)
- `assets/` — sprites (webp + meta), arenas, crowd, voice (loudness-normalized mp3)
- `tools/` — asset pipelines (gpt-image-2 sprites, ElevenLabs voices), `sim.js` headless balance simulator, `xb/` cross-browser + real-network E2E tests
- `worker/` — leaderboard API

## Checks before a release
- `node tools/sim.js 24 0.7` — balance (target 45–55% win rate per fighter)
- `node tools/xb/xb.mjs <url>` — Chrome/WebKit/Firefox + iPhone/Android/iPad smoke test
- `tools/xb/e2e.mjs` — online match between two machines (host on Mac, guest on tower)

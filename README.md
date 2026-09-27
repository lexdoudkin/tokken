# TOKKEN

**AI models fight. HP is tokens.** A 90s-arcade 2D fighting game that parodies the AI industry. It runs in your browser: **[tokken.win](https://tokken.win)**

Claude apologizes, then hits you. Codex never runs the tests. DeepSeek distills your ult for 1% of the price. Jev only speaks JSON.

- 24 fighters, 16 arenas, a live commentary booth, and a crowd of AI leaders holding signs
- Local versus, VS CPU, and online PvP with invite codes (rollback netcode)
- Works on phones as an installable PWA with arcade touch controls
- Public leaderboard

## Run it locally

No build step and no dependencies. It's plain JS on a canvas:

```bash
python3 -m http.server 8777
open http://localhost:8777
```

Controls: P1 uses `WASD` + `F G H`, P2 uses the arrows + `K L ;`. Gamepads work too. Test hooks:
- `?fight=jev,claude&arena=3` jumps straight into a fight
- `?walklab` opens the animation lab

## How it works

| Piece | Where | Notes |
|---|---|---|
| Game loop | `js/main.js`, `js/match.js`, `js/game.js` | Fixed 60 Hz sim on a 1280×720 logical canvas. The view width adapts to the screen, but the simulation never sees it. |
| Online | `js/net.js`, `js/snap.js` | WebRTC via PeerJS. Rollback with full state snapshots, a seeded RNG for all gameplay randomness, and periodic state-hash desync checks. Inputs go over an unreliable "fast lane" and are re-sent until acked. Delay (0-2 frames) is picked from the measured round-trip time. Peers exchange a version handshake before a match can start. |
| Signaling + TURN | `worker/worker.js` | A Cloudflare Worker with a PeerJS-compatible signaling server (one hibernating Durable Object), short-lived Cloudflare TURN credentials for carrier-grade NAT, and the leaderboard on D1. |
| Ult comedy scenes | `js/ultfx.js` | Screen-space set pieces locked to the game clock. They're cosmetic only, so rollback never touches them. |
| Balance | `tools/sim.js` | A headless simulator that runs the real game code in Node's `vm` module, CPU vs CPU across every matchup: `node tools/sim.js 8`. |
| Art pipeline | `tools/gen_sheet.py`, `slice.py`, `gen_motion.py`, `gen_legs.py` | gpt-image-2 pose sheets, sliced with foot and centroid anchors. Walk cycles redraw only the legs, and the torso is composited back pixel-for-pixel. |
| Voices | `tools/gen_script.py`, `booth.py`, `quips.py`, `release_voices.py`, `jev_voice.py`, `codex_voice.py` | ElevenLabs v3 (plus OpenAI TTS for Codex), loudness-normalized to -16 LUFS and lazy-loaded per match. |
| Tests | `tools/xb/*.mjs` | Playwright: cross-browser checks, a device and full-screen matrix, and real-network online E2E (with a `?relay=1` flag to force the TURN relay). |

The tools expect API keys in `tools/.secrets/` (`openai`, `eleven`) or in the environment (`OPENAI_API_KEY`). That folder is gitignored.

## Deploying your own

`./build.sh` builds `dist/` with cache-busted URLs. The Pages and Worker deploy scripts in `worker/` point at the original author's Cloudflare account. Change `account_id` in `worker/wrangler.toml` and the account check in `worker/deploy.sh` before you use them.

## Legal

This is a **parody**. It is not affiliated with, endorsed by, or sponsored by any of the companies, products or people it depicts. All product names, logos, mascots and trademarks belong to their respective owners, and the characters are satirical caricatures.

The **code** is released under the [MIT License](LICENSE). The generated art and voice assets are included so the game runs as-is, but **no rights to any third-party trademarks or likenesses are granted**. Don't use them to imply endorsement or for commercial purposes.

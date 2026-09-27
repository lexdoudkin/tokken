// Trailer footage: frame-perfect 1920x1080@30 clips of the real game (rAF frozen, sim stepped by hand).
import { chromium } from 'playwright'; import fs from 'fs'; import { execFileSync } from 'child_process';
const OUT = '/Users/alexander/tokken/trailer/public/shots/', TMP = '/tmp/tokken-shots/';
const only = (process.env.SHOTS || '').split(',').filter(Boolean);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 }); const p = await ctx.newPage();
await p.addInitScript(() => { let first = true; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => first ? (first = false, raf(f)) : 0; });
await p.goto('http://localhost:8777/index.html?promo=1'); await p.waitForFunction(() => window.TOKKEN, null, { timeout: 60000, polling: 250 });
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); });
const fight = (a, o, arena, lvl = 0.9) => p.evaluate(([a, o, arena, lvl]) => { TOKKEN.sel.cur = [ROSTER.indexOf(a), ROSTER.indexOf(o)]; TOKKEN.sel.cpu = true; TOKKEN.sel.arena = arena; TOKKEN.startMatch(); TOKKEN.ctrls[0].cpu = new CPU(lvl); TOKKEN.ctrls[1].cpu = new CPU(lvl); }, [a, o, arena, lvl]);
async function record(name, frames, step = 2, perFrame) {
  if (only.length && !only.includes(name)) return; fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
  for (let i = 0; i < frames; i++) { if (perFrame) await perFrame(i); await p.evaluate(s => TOKKEN.tick(s), step); await p.screenshot({ path: `${TMP}f${String(i).padStart(5, '0')}.png` }); }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', TMP + 'f%05d.png', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', OUT + name + '.mp4']);
  console.log(name, frames, 'frames');
}
const ultShot = async (name, a, o, arena, frames = 115, gap = 380) => {
  if (only.length && !only.includes(name)) return;
  await fight(a, o, arena); await p.evaluate(g => { TOKKEN.tick(170); const m = TOKKEN.match; m.f[1].x = m.f[0].x + g * (m.f[0].facing || 1); m.f[0].compute = 100; m.startUlt(m.f[0], m.f[1]); }, gap);
  await record(name, frames);
};
// neutral brawl
if (!only.length || only.includes('brawl')) { await fight('claude', 'codex', 0, 1); await p.evaluate(() => TOKKEN.tick(260)); await record('brawl', 150); }
await ultShot('ult_jev', 'jev', 'claude', 12, 120);
await ultShot('ult_openclaw', 'openclaw', 'grok', 3, 125);
await ultShot('ult_kimi', 'kimi', 'gemini', 7, 105);
await ultShot('ult_qwen', 'qwen', 'llama', 10, 115);
await ultShot('ult_mistral', 'mistral', 'grok', 8, 120);
await ultShot('ult_codex', 'codex', 'perplexity', 13, 125);
await ultShot('ult_deepseek', 'deepseek', 'claude', 15, 120);
await ultShot('ult_hermes', 'hermes', 'llama', 5, 110);
await ultShot('ult_alexa', 'alexa', 'siri', 9, 125);
await ultShot('ult_manus', 'manus', 'devin', 11, 115);
await ultShot('ult_cursor', 'cursor', 'codex', 14, 100);
// KO: the lobster swarm finishes a low-token Claude, then slow-mo, K.O. and the win quote
if (!only.length || only.includes('ko')) { await fight('openclaw', 'claude', 6, 0.3); await p.evaluate(() => { TOKKEN.tick(170); const m = TOKKEN.match; m.f[1].tokens = 2600; m.f[1].wins = 1; m.f[0].wins = 1; m.round = 3; m.f[1].x = m.f[0].x + 300 * (m.f[0].facing || 1); m.f[0].compute = 100; m.startUlt(m.f[0], m.f[1]); });
  let koAt = -1; await record('ko', 200, 2, async i => { if (koAt < 0 && await p.evaluate(() => TOKKEN.match.phase === 'ko')) { koAt = i; console.log('KO_AT', i); } }); }
// select screen: P1 cursor sweeps the whole roster
if (!only.length || only.includes('select')) {
  await p.evaluate(() => { scene = 'select'; sel.cpu = true; sel.done = [false, false]; sel.stage = false; sel.timer = 99 * 60; sel.cur = [0, ROSTER.indexOf('openclaw')]; });
  const R = await p.evaluate(() => ROSTER.length - 1);
  await record('select', 150, 2, async i => { if (i % 6 === 0) await p.evaluate(k => { sel.cur[0] = k; }, Math.floor(i / 6) % R); });
}
await b.close();

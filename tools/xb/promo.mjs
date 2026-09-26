// Frame-perfect gameplay capture: freeze the rAF loop, drive the game with TOKKEN.tick, screenshot every 2 sim frames (30fps).
import { chromium } from 'playwright'; import fs from 'fs';
const OUT = '/Users/alexander/tokken/promo/frames/'; let n = 0; const ev = [];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 }); const p = await ctx.newPage();
await p.addInitScript(() => { let first = true; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => first ? (first = false, raf(f)) : 0; });
await p.goto('http://localhost:8777/index.html?promo=1'); await p.waitForFunction(() => window.TOKKEN, null, { timeout: 60000, polling: 250 });
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); });
const shot = async (frames, step = 2) => { for (let i = 0; i < frames; i++) { await p.evaluate(s => TOKKEN.tick(s), step); await p.screenshot({ path: `${OUT}f${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); } };
const mark = k => ev.push([k, n / 30]);
// 1) title
mark('title'); await shot(80);
// fight helper: both CPU, skip into the round
const fight = async (a, o, arena) => p.evaluate(([a, o, arena]) => { TOKKEN.sel.cur = [ROSTER.indexOf(a), ROSTER.indexOf(o)]; TOKKEN.sel.cpu = true; TOKKEN.sel.arena = arena; TOKKEN.startMatch(); TOKKEN.ctrls[0].cpu = new CPU(0.85); TOKKEN.ctrls[1].cpu = new CPU(0.85); }, [a, o, arena]);
const ult = side => p.evaluate(s => { const m = TOKKEN.match; m.f[s].compute = 100; m.startUlt(m.f[s], m.f[1 - s]); }, side);
// 2) Jev vs Claude: round intro, brawl, JSON firehose
await fight('jev', 'claude', 0); mark('round_1'); await shot(55, 3); await shot(50); mark('ult_jev'); await ult(0); await shot(150);
// 3) DeepSeek vs Codex: distillation
await fight('deepseek', 'codex', 15); await p.evaluate(() => TOKKEN.tick(160)); await shot(35); mark('ult_deepseek'); await ult(0); await shot(120);
// 4) Midjourney vs Muse: the painting
await fight('midjourney', 'muse', 5); await p.evaluate(() => TOKKEN.tick(160)); await shot(25); mark('ult_midjourney'); await ult(0); await shot(115);
// 5) Alexa vs Siri: Prime Day
await fight('alexa', 'siri', 9); await p.evaluate(() => TOKKEN.tick(160)); await shot(20); mark('ult_alexa'); await ult(0); await shot(105);
// 6) Kimi vs Grok: eclipse into the KO + win quote
await fight('kimi', 'grok', 3); await p.evaluate(() => { TOKKEN.tick(160); const m = TOKKEN.match; m.f[1].tokens = 9000; m.f[1].wins = 1; m.f[0].wins = 1; m.round = 3; }); await shot(20); mark('ult_kimi'); await ult(0);
for (let i = 0; i < 260 && !(await p.evaluate(() => TOKKEN.match.phase === 'ko')); i++) await shot(1);
mark('ko'); await shot(150);
fs.writeFileSync('/Users/alexander/tokken/promo/events.json', JSON.stringify(ev)); console.log('frames', n, ev); await b.close();

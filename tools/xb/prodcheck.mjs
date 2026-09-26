import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('https://tokken.win/?fight=jev,kimi&arena=4', { waitUntil: 'load' }); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match, null, { timeout: 90000 });
const r = await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.tick(600); return { roster: ROSTER.length, jevNew: FIGHTERS.jev.isNew, line: FIGHTERS.jev.line, sw: !!navigator.serviceWorker }; });
await p.screenshot({ path: 'prod.png' }); console.log(JSON.stringify(r), 'errors:', errs); await b.close();

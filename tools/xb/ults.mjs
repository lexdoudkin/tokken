import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8777/index.html?fight=claude,grok&arena=3'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
const R = await p.evaluate(() => ROSTER);
for (const id of R) {
  await p.evaluate(id => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.sel.cur = [ROSTER.indexOf(id), ROSTER.indexOf(id === 'grok' ? 'claude' : 'grok')]; TOKKEN.sel.cpu = true; TOKKEN.sel.arena = 3; TOKKEN.startMatch(); TOKKEN.ctrls[1].cpu = null; TOKKEN.tick(130);
    const m = TOKKEN.match; m.startUlt(m.f[0], m.f[1]); TOKKEN.tick(40); }, id);
  await p.screenshot({ path: `ult-cin-${id}.png` });
  await p.evaluate(() => TOKKEN.tick(30 + 58)); await p.screenshot({ path: `ult-${id}.png` });
}
console.log('errors:', errs); await b.close();

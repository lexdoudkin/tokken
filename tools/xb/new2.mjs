import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8777/index.html?fight=openclaw,hermes&arena=1'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.tick(150); }); await p.screenshot({ path: 'n6-fight.png' });
for (const id of ['openclaw', 'hermes']) {
  await p.evaluate(id => { TOKKEN.sel.cur = [ROSTER.indexOf(id), ROSTER.indexOf('grok')]; TOKKEN.sel.cpu = true; TOKKEN.sel.arena = 3; TOKKEN.startMatch(); TOKKEN.ctrls[1].cpu = null; TOKKEN.tick(130);
    const m = TOKKEN.match; m.startUlt(m.f[0], m.f[1]); TOKKEN.tick(40); }, id);
  await p.evaluate(() => TOKKEN.tick(30 + 70)); await p.screenshot({ path: `ult-${id}.png` });
}
await p.goto('http://localhost:8777/index.html'); await p.waitForTimeout(1500);
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); });
for (const k of ['Enter', 'Enter']) { await p.keyboard.press(k); await p.waitForTimeout(700); }
await p.screenshot({ path: 'n6-select.png' });
console.log('errors:', errs); await b.close();

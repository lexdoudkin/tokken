import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8777/index.html?fight=claude,grok&arena=3'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
for (const id of (process.env.IDS || 'openclaw,mistral,qwen,alexa,manus,cursor,kimi,hermes').split(',')) {
  await p.evaluate(id => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.sel.cur = [ROSTER.indexOf(id), ROSTER.indexOf('grok')]; TOKKEN.sel.cpu = true; TOKKEN.sel.arena = 3; TOKKEN.startMatch(); TOKKEN.ctrls[1].cpu = null; TOKKEN.tick(130);
    const m = TOKKEN.match; m.f[1].x = m.f[0].x + 420; m.startUlt(m.f[0], m.f[1]); TOKKEN.tick(70 + 38); }, id);
  await p.screenshot({ path: `u8-${id}-a.png` }); await p.evaluate(() => TOKKEN.tick(40)); await p.screenshot({ path: `u8-${id}-b.png` });
  console.log(id, await p.evaluate(() => { const m = TOKKEN.match; return m.f[1].tokens; }));
}
console.log('errors:', errs); await b.close();

import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8777/index.html?fight=claude,grok&arena=3'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
const S = [['seedance', 30], ['sora', 40], ['alexa', 18], ['devin', 28], ['midjourney', 40], ['qwen', 14], ['hermes', 30]];
for (const [id, wait] of S) {
  await p.evaluate(([id, wait]) => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.sel.cur = [ROSTER.indexOf(id), ROSTER.indexOf(id === 'hermes' ? 'gemini' : 'grok')]; TOKKEN.sel.cpu = true; TOKKEN.sel.arena = 3; TOKKEN.startMatch(); TOKKEN.ctrls[1].cpu = null; TOKKEN.tick(130);
    const m = TOKKEN.match; m.f[1].x = m.f[0].x + 330; const f = m.f[0]; f.cd = 0; f.startSpecial(m, m.f[1]); TOKKEN.tick(wait); }, [id, wait]);
  await p.screenshot({ path: `sp-${id}.png` });
}
for (const id of ['seedance', 'sora']) { await p.evaluate(id => { TOKKEN.sel.cur = [ROSTER.indexOf(id), ROSTER.indexOf('grok')]; TOKKEN.startMatch(); TOKKEN.ctrls[1].cpu = null; TOKKEN.tick(130); const m = TOKKEN.match; m.f[1].x = m.f[0].x + 380; m.f[0].compute = 100; m.startUlt(m.f[0], m.f[1]); TOKKEN.tick(70 + 60); }, id); await p.screenshot({ path: `ult-${id}-a.png` }); await p.evaluate(() => TOKKEN.tick(60)); await p.screenshot({ path: `ult-${id}-b.png` }); }
console.log('errors:', errs); await b.close();

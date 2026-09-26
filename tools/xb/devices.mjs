import { chromium, webkit, devices } from 'playwright';
const U = process.env.U || 'http://localhost:8777/index.html';
const D = ['iPhone SE', 'iPhone 14', 'iPhone 15 Pro Max', 'Pixel 7', 'Galaxy S9+', 'Galaxy Tab S4', 'iPad Mini', 'iPad Pro 11'];
const out = [];
for (const name of D) for (const orient of ['landscape', 'portrait']) {
  const dev = devices[`${name}${orient === 'landscape' ? ' landscape' : ''}`]; if (!dev) { out.push(`${name} ${orient}: n/a`); continue; }
  const bt = dev.defaultBrowserType === 'webkit' ? webkit : chromium; const b = await bt.launch(); const ctx = await b.newContext({ ...dev }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(U, { waitUntil: 'load' }); await p.waitForFunction(() => window.TOKKEN, null, { timeout: 60000 }); await p.waitForTimeout(800);
  const m = () => p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(), vw = innerWidth, vh = innerHeight, rot = getComputedStyle(document.getElementById('tk-rotate')).display !== 'none';
    return { vw, vh, cw: Math.round(r.width), ch: Math.round(r.height), fillW: +(r.width / vw).toFixed(3), fillH: +(r.height / vh).toFixed(3), rot }; });
  const a = await m();
  const vp = p.viewportSize(); await p.setViewportSize({ width: vp.width, height: vp.height - 60 }); await p.waitForTimeout(200); const bshrink = await m();   // browser bar appears
  await p.setViewportSize(vp); await p.waitForTimeout(1000); const c = await m();
  if (orient === 'landscape') await p.screenshot({ path: `dev-${name.replace(/ /g, '_')}.png` });
  const fits = x => x.rot || (Math.min(x.fillW, x.fillH) > 0.985 && x.fillW <= 1.001 && x.fillH <= 1.001);
  out.push(`${name.padEnd(18)} ${orient.padEnd(9)} ${a.vw}x${a.vh} game ${a.cw}x${a.ch} fill ${a.fillW}/${a.fillH}${a.rot ? ' [ROTATE PROMPT]' : ''} | bar-shrink ${fits(bshrink) ? 'ok' : 'BAD ' + JSON.stringify(bshrink)} | restore ${fits(c) ? 'ok' : 'BAD'} ${errs.length ? 'ERR ' + errs[0] : ''}`);
  await b.close();
}
console.log(out.join('\n'));

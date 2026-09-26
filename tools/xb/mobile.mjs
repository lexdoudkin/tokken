import { chromium, webkit, devices } from 'playwright';
const U = 'https://tokken-6t6.pages.dev/';
for (const [name, bt, dev] of [['iPhone', webkit, devices['iPhone 14 landscape']], ['Pixel', chromium, devices['Pixel 7 landscape']]]) {
  const b = await bt.launch(); const ctx = await b.newContext({ ...dev }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(U, { waitUntil: 'load' }); await p.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 60000 });
  await p.waitForTimeout(1500); await p.screenshot({ path: `m-${name}-title.png` });
  const man = await p.evaluate(async () => { const r = await fetch('manifest.webmanifest'); const j = await r.json(); return { display: j.display, orientation: j.orientation, icons: j.icons.length, sw: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistration()) ? 'registered' : 'pending' : 'n/a' }; });
  await p.goto(U + '?fight=mistral,grok&arena=13', { waitUntil: 'load' }); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match, null, { timeout: 60000 });
  await p.evaluate(() => { TOKKEN.tick(300); TOKKEN.match.f[0].compute = 100; });
  await p.touchscreen.tap(dev.viewport.width * 0.92, dev.viewport.height * 0.75).catch(() => {});
  await p.waitForTimeout(400); await p.screenshot({ path: `m-${name}-fight.png` });
  console.log(name, JSON.stringify(man), errs.length ? 'ERR ' + errs.join('|') : 'no errors');
  await b.close();
}

import { chromium, webkit, devices } from 'playwright';
for (const name of ['Pixel 7', 'iPad Mini', 'iPhone 14']) { const dev = devices[name + ' landscape']; const bt = dev.defaultBrowserType === 'webkit' ? webkit : chromium; const b = await bt.launch(); const p = await (await b.newContext({ ...dev })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8777/index.html?fight=jev,alexa&arena=0', { waitUntil: 'load' }); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match, null, { timeout: 60000 });
  await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.tick(200); }); await p.waitForTimeout(300); await p.screenshot({ path: `devf-${name.replace(/ /g, '_')}.png` }); console.log(name, errs); await b.close(); }

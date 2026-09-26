import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
for (const [i, n] of [[0, 'colosseum'], [1, 'lab'], [5, 'goldengate']]) {
  await p.goto(`http://localhost:8777/index.html?fight=grok,muse&arena=${i}&s=${n}`); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
  await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.tick(140); }); await p.screenshot({ path: `stand-${n}.png` });
}
await b.close();

import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await p.goto('http://localhost:8777/index.html?fight=grok,claude&arena=2'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
await p.evaluate(() => TOKKEN.tick(300)); await p.keyboard.press('Escape'); await p.evaluate(() => TOKKEN.tick(3));
const seen = []; for (let i = 0; i < 20; i++) { await p.evaluate(() => TOKKEN.tick(15)); seen.push(await p.evaluate(() => update.pauseIdx)); }
await p.keyboard.press('ArrowDown'); await p.evaluate(() => TOKKEN.tick(3)); const afterDown = await p.evaluate(() => update.pauseIdx);
console.log('idle for 5s in pause, menu index:', [...new Set(seen)].join(','), '| after one ↓:', afterDown, '| still paused:', await p.evaluate(() => !!update.paused));
await b.close();

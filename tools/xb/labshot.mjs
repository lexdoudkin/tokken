import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8777/index.html?fight=muse,deepseek&arena=1'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.tick(130); STROLL.next = 1; TOKKEN.tick(2); STROLL.list[0].x = 500; TOKKEN.ctrls[1].cpu = null; });
await p.keyboard.down('KeyD'); await p.evaluate(() => TOKKEN.tick(24)); await p.screenshot({ path: 'lab.png' }); await p.keyboard.up('KeyD');
console.log(await p.evaluate(() => TOKKEN.match.arena.id + ' ' + TOKKEN.match.f[0].pose() + ' strollers=' + STROLL.list.length), errs);
await b.close();

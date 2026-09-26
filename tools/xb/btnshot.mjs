import { webkit, devices } from 'playwright';
const b = await webkit.launch(); const p = await (await b.newContext({ ...devices['iPhone 14 landscape'] })).newPage();
await p.goto('http://localhost:8777/index.html?fight=llama,cursor&arena=1'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
await p.evaluate(() => { TOKKEN.tick(200); TOKKEN.match.f[0].compute = 72; TOKKEN.match.f[0].cd = 30; }); await p.waitForTimeout(600);
await p.screenshot({ path: 'btns.png' }); await b.close();

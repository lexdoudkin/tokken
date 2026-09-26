import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(process.argv[2] || 'http://localhost:8777/index.html'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 60000 });
await p.evaluate(() => TOKKEN.tick(120)); await p.screenshot({ path: 'title.png' }); console.log('errors', errs); await b.close();

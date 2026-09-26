import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.route('**/assets/**', async r => { await new Promise(x => setTimeout(x, 300 + Math.random() * 2500)); r.continue(); });
await p.goto('http://localhost:8777/index.html'); await p.waitForTimeout(2200); await p.screenshot({ path: 'load-a.png' });
await p.waitForTimeout(4000); await p.screenshot({ path: 'load-b.png' }); console.log('errors:', errs); await b.close();

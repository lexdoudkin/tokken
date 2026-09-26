import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8777/index.html'); await p.waitForTimeout(2500); await p.screenshot({ path: 'title-a.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.screenshot({ path: 'title-b.png' });
console.log('errors:', errs); await b.close();

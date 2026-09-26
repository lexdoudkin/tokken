import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [], urls = [];
p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { if (/data\.js|manifest\.json|jev\/idle/.test(r.url())) urls.push(r.url().replace('https://tokken.win', '')); });
await p.goto('https://tokken.win/', { waitUntil: 'load' }); await p.waitForFunction(() => window.TOKKEN, null, { timeout: 90000 }); await p.waitForTimeout(4000);
console.log(await p.evaluate(() => ROSTER.length), urls.slice(0, 4), 'errors:', errs); await b.close();

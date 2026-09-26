import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => errs.push(m.text()));
await p.addInitScript(() => { let first = true; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => first ? (first = false, raf(f)) : 0; });
await p.goto('http://localhost:8777/index.html?promo=1'); await p.waitForTimeout(8000);
console.log(await p.evaluate(() => ({ t: !!window.TOKKEN, loadPct: typeof loadPct !== 'undefined' && loadPct })), errs.slice(0, 5)); await b.close();

import { chromium } from 'playwright';
const b = await chromium.launch(); const picks = [], warns = [];
for (let i = 0; i < 4; i++) { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('console', m => { if (/AudioContext/.test(m.text())) warns.push(m.text().slice(0, 60)); });
  await p.goto('http://localhost:8777/index.html'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 60000 });
  await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  picks.push(await p.evaluate(() => TOKKEN.scene + ':' + ROSTER[TOKKEN.sel.cur[1]])); await p.close(); }
console.log(picks, 'audio warnings:', warns.length); await b.close();

import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const errs = [];
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8777/index.html'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 60000 });
await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
const s1 = await p.evaluate(() => TOKKEN.scene); await p.screenshot({ path: 'howto-kb.png' });
await p.waitForTimeout(900); await p.keyboard.press('Enter'); await p.waitForTimeout(500); const s2 = await p.evaluate(() => TOKKEN.scene);
// second time: already seen -> straight to select
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.evaluate(() => { scene = 'title'; }); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(500); const s3 = await p.evaluate(() => TOKKEN.scene);
// pause menu -> CONTROLS
await p.goto('http://localhost:8777/index.html?fight=claude,grok&arena=0'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); await p.screenshot({ path: 'howto-pausemenu.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(400); await p.screenshot({ path: 'howto-pause.png' });
await p.keyboard.press('Escape'); await p.waitForTimeout(300); const s4 = await p.evaluate(() => [TOKKEN.scene, update.paused, !!update.howto]);
const m = await (await b.newContext({ ...devices['Pixel 7 landscape'] })).newPage(); m.on('pageerror', e => errs.push(e.message));
await m.goto('http://localhost:8777/index.html'); await m.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 60000 });
await m.evaluate(() => { titleArmed = true; menu.idx = 0; Input.vpress('start', true); setTimeout(() => Input.vpress('start', false), 60); }); await m.waitForTimeout(700); await m.screenshot({ path: 'howto-touch.png' });
console.log({ afterMenu: s1, afterContinue: s2, secondVisit: s3, afterPauseControls: s4, touchScene: await m.evaluate(() => TOKKEN.scene), errs }); await b.close();

import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8777' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8777/index.html'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 60000 });
const S = () => p.evaluate(() => TOKKEN.scene); const tick = n => p.evaluate(n => TOKKEN.tick(n), n);
const css = (x, y) => p.evaluate(([x, y]) => { const cv = document.getElementById('game'), r = cv.getBoundingClientRect(), k = r.width / cv.width; return [r.left + (x * DPR + Mouse.VIEW.cx) * k, r.top + (y * DPR + Mouse.VIEW.oy) * k]; }, [x, y]);
async function click(x, y) { const [a, c] = await css(x, y); await p.mouse.move(a, c); await tick(2); await p.mouse.down(); await p.mouse.up(); await tick(6); }
async function hover(x, y) { const [a, c] = await css(x, y); await p.mouse.move(a, c); await tick(2); }
const Wl = () => p.evaluate(() => W);
await tick(60); await click(640, 400); await tick(20);
let w = await Wl(); console.log('title W', w, 'cursor', await p.evaluate(() => Mouse.st.cursor));
// hover item 2, check idx
const items = await p.evaluate(() => menu.items); console.log('items', items.join('|'));
await hover(w / 2, 314 + 2 * 38 - 10); console.log('hover idx', await p.evaluate(() => menu.idx), 'cursor', await p.evaluate(() => Mouse.st.cursor));
await p.screenshot({ path: 'mouse-title.png' });
// ONLINE -> host -> copy
const oi = items.findIndex(s => /ONLINE/.test(s)); await click(w / 2, 314 + oi * 38 - 10); await tick(50); while (await S() === 'howto') { await click(640, 360); await tick(10); } console.log('scene', await S(), 'mode', await p.evaluate(() => online.mode));
await click(640, 290 - 12); console.log('host mode', await p.evaluate(() => online.mode));
await p.waitForFunction(() => Net.st.status === 'waiting', null, { timeout: 15000 }).catch(() => {}); await tick(3);
console.log('code', await p.evaluate(() => Net.st.code), await p.evaluate(() => Net.st.status));
await click(640, 516); await p.waitForTimeout(300);
console.log('clipboard', await p.evaluate(() => navigator.clipboard.readText()), 'toast', await p.evaluate(() => online.toast));
await tick(2); await p.screenshot({ path: 'mouse-host.png' });
await p.keyboard.press('Escape'); await tick(4); await p.evaluate(() => { Net.reset(); online.mode = 'menu'; }); await tick(2);
// join via paste button
await p.evaluate(() => navigator.clipboard.writeText('https://tokken.win/?join=QZ7K'));
await click(640, 290 + 70 - 12); console.log('join mode', await p.evaluate(() => online.mode)); await click(640, 506); await p.waitForTimeout(300);
console.log('typed', await p.evaluate(() => online.typed)); await tick(2); await p.screenshot({ path: 'mouse-join.png' });
await p.evaluate(() => { Net.reset(); online.mode = 'menu'; }); await click(640, 290 + 140 - 12); console.log('back ->', await S());
// VS CPU -> select via mouse
await tick(10); const vi = (await p.evaluate(() => menu.items)).findIndex(s => /CPU/.test(s)); w = await Wl();
await click(w / 2, 314 + vi * 38 - 10); await tick(60); while (await S() === 'howto') { await click(640, 360); await tick(50); } let sc = await S(); console.log('after vs cpu', sc);
while (sc === 'howto') { await click(640, 360); await tick(50); sc = await S(); }
console.log('scene', sc);
const cols = 9, pw = 76, ph = 80, gx = 640 - (cols * (pw + 6)) / 2, gy = 100;
await hover(gx + 3 * 82 + 30, gy + 30); console.log('sel.cur', await p.evaluate(() => sel.cur[0]));
await p.screenshot({ path: 'mouse-select.png' });
await click(gx + 3 * 82 + 30, gy + 30); console.log('done', await p.evaluate(() => sel.done));
await tick(30); await click(gx + 5 * 82 + 30, gy + 86 + 30); console.log('opp', await p.evaluate(() => [sel.cur[1], sel.done, sel.stage])); await tick(10); await p.screenshot({ path: 'mouse-select2.png' });
console.log('stage zones', await p.evaluate(() => Mouse.st.zones.length));
for (let i = 0; i < 6 && (await S()) !== 'fight'; i++) { const s = await S(); if (s === 'stage') { await click(640 - 4 * 144 + 144 * 2 + 60, 560); } else await click(640, 360); await tick(60); }
console.log('final scene', await S()); await tick(200); await p.screenshot({ path: 'mouse-fight.png' });
console.log('fight cursor', await p.evaluate(() => Mouse.st.cursor));
console.log('errs', errs); await b.close();

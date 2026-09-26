import { chromium } from 'playwright';
const U = 'https://e2e-preview.tokken-6t6.pages.dev/';
const b = await chromium.launch(); const mk = async () => { const p = await (await b.newContext()).newPage(); await p.goto(U); await p.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 60000 }); return p; };
const h = await mk(), g = await mk();
await h.evaluate(() => { scene = 'online'; online.mode = 'host'; Net.host(); }); await h.waitForFunction(() => Net.st.status === 'waiting'); const code = await h.evaluate(() => Net.st.code);
await g.evaluate(() => { const s = Net.send; Net.send = d => s(d.t === 'ver' ? { t: 'ver', b: '1790000000', sig: 'claude,codex,old-roster' } : d); window.__reloaded = false; });   // pretend to be an old build
let reloaded = false; g.on('framenavigated', f => { if (f === g.mainFrame()) reloaded = true; });
await g.evaluate(c => { scene = 'online'; online.mode = 'join'; Net.join(c); }, code);
await h.waitForTimeout(6000);
console.log('host:', await h.evaluate(() => ({ scene: TOKKEN.scene, toast: online.toast })), 'guest reloaded:', reloaded);
await b.close();

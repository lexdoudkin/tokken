import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://tokken.win/'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.scene === 'title', null, { timeout: 90000 });
await p.keyboard.press('Enter'); await p.waitForTimeout(500);   // real gesture -> AudioContext
const r = await p.evaluate(async () => {
  const played = []; const orig = Audio.play; Audio.play = (k, o) => { const d = orig(k, o); played.push(k + '=' + (d ? d.toFixed(1) : d)); return d; };
  await preloadMatch('kimi', 'manus', 'basement'); TOKKEN.sel.cur = [ROSTER.indexOf('kimi'), ROSTER.indexOf('manus')]; TOKKEN.sel.cpu = true; TOKKEN.sel.arena = 2; TOKKEN.startMatch(); TOKKEN.ctrls[0].cpu = new CPU(0.9);
  await new Promise(r => setTimeout(r, 4000));
  for (let i = 0; i < 40; i++) { TOKKEN.tick(30); await new Promise(r => setTimeout(r, 120)); }
  const m = TOKKEN.match; m.f[0].compute = 100; m.startUlt(m.f[0], m.f[1]); for (let i = 0; i < 10; i++) { TOKKEN.tick(20); await new Promise(r => setTimeout(r, 150)); }
  return { ctx: Audio.muted, has: ['v_kimi_ult', 'v_kimi_taunt0', 'v_manus_intro'].map(k => Audio.has(k)), played: played.filter(k => /^v_(kimi|manus)/.test(k)) };
});
console.log(JSON.stringify(r), errs); await b.close();

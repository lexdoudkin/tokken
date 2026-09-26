// Cross-browser / cross-device smoke test for TOKKEN.
import { chromium, webkit, firefox, devices } from 'playwright';
const URL = process.argv[2] || 'http://localhost:8777/index.html';
const targets = [
  ['Chrome desktop', chromium, { viewport: { width: 1280, height: 720 } }],
  ['Safari/WebKit desktop', webkit, { viewport: { width: 1280, height: 720 } }],
  ['Firefox desktop', firefox, { viewport: { width: 1280, height: 720 } }],
  ['iPhone 14 (WebKit)', webkit, { ...devices['iPhone 14 landscape'] }],
  ['Pixel 7 (Chrome Android)', chromium, { ...devices['Pixel 7 landscape'] }],
  ['iPad (WebKit)', webkit, { ...devices['iPad (gen 7) landscape'] }],
];
for (const [name, bt, opts] of targets) {
  const b = await bt.launch(); const ctx = await b.newContext(opts); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const t0 = Date.now(); let res = {};
  try {
    await p.goto(URL + '?fight=claude,dolphin&arena=3', { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => window.TOKKEN && TOKKEN.match, null, { timeout: 60000 });
    const load = Date.now() - t0;
    res = await p.evaluate(() => { TOKKEN.tick(400); const m = TOKKEN.match; return {
      scene: TOKKEN.scene, frame: m.frame, sprites: ROSTER.filter(f => ASSETS.sprites[f].idle && ASSETS.sprites[f].walk3).length,
      arenas: Object.values(ASSETS.arenas).filter(Boolean).length, touchUI: !!document.getElementById('tk'),
      webaudio: !!(window.AudioContext || window.webkitAudioContext), roundRect: !!CanvasRenderingContext2D.prototype.roundRect,
      gamepadAPI: !!navigator.getGamepads, webrtc: !!window.RTCPeerConnection, peerjs: typeof Peer === 'function' }; });
    res.loadMs = load;
    await p.screenshot({ path: `shot-${name.replace(/[^a-z0-9]+/gi, '_')}.png` });
  } catch (e) { errs.push('FAIL: ' + e.message.split('\n')[0]); }
  console.log(`${errs.length ? '✗' : '✓'} ${name.padEnd(26)} ${JSON.stringify(res)}${errs.length ? '\n    errors: ' + [...new Set(errs)].slice(0, 4).join(' | ') : ''}`);
  await b.close();
}

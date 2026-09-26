import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await p.goto('http://localhost:8777/index.html?fight=' + (process.argv[2] || 'grok') + ',llama&arena=1&cpu=0'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.tick(130); TOKKEN.ctrls[1].cpu = null; });
const frames = await p.evaluate(async () => {
  const out = []; const f = TOKKEN.match.f[0]; const cv = document.getElementById('game');
  dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
  for (let i = 0; i < 48; i++) { TOKKEN.tick(2); if (i % 2 === 0) {
    const c = document.createElement('canvas'); c.width = 260; c.height = 260; const cx = c.getContext('2d');
    const cm = TOKKEN.match.cam, sx = (640 + (f.x - cm.x) * cm.z) * (cv.width / 1280), sy = (628 - cm.y * cm.z) * (cv.height / 720);
    cx.drawImage(cv, sx - 130 * cv.width / 1280, sy - 230 * cv.height / 720, 260 * cv.width / 1280, 260 * cv.height / 720, 0, 0, 260, 260);
    out.push(c.toDataURL('image/png')); out.push(f.pose() + ' x=' + Math.round(f.x)); } }
  dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' })); return out; });
const fs = await import('fs'); const names = [];
for (let i = 0; i < frames.length; i += 2) { const n = `/tmp/claude-walk-${i / 2}.png`; fs.writeFileSync(n, Buffer.from(frames[i].split(',')[1], 'base64')); names.push(frames[i + 1]); }
console.log(names.join(' | ')); await b.close();

import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await p.goto('http://localhost:8777/index.html?fight=jev,manus&arena=1'); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); TOKKEN.tick(5); });
const out = await p.evaluate(() => { const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const c = cv.getContext('2d'); c.fillStyle = '#446'; c.fillRect(0, 0, 1280, 720);
  const row = ['sam', 'jensen', 'eng2', 'eng8', 'dario'].map((id, i) => ({ id, x: 140 + i * 250, ph: 0, s: 1, cheerT: 0, sign: 'WE MUST PACE THE FRONTIER' }));
  drawRow(c, row, 0, false, 600, 640, 320, 'none'); drawRow(c, row.map(r => ({ ...r, x: r.x + 60 })), 0, false, 700, 640, 80, 'none'); return cv.toDataURL(); });
(await import('fs')).writeFileSync('signdbg.png', Buffer.from(out.split(',')[1], 'base64')); await b.close();

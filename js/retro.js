// TOKKEN — 1990s/2000s arcade presentation layer: chrome type, bevels, CRT.
const CHROME = {
  silver: [[0, '#ffffff'], [0.42, '#c9d3e3'], [0.5, '#39424f'], [0.56, '#eef3fb'], [1, '#7d8898']],
  gold: [[0, '#fffbe0'], [0.42, '#ffd23f'], [0.5, '#6b3a00'], [0.56, '#ffe89a'], [1, '#b8740b']],
  red: [[0, '#ffe0e0'], [0.42, '#ff4a3a'], [0.5, '#4a0000'], [0.56, '#ff9a8a'], [1, '#a80000']],
  blue: [[0, '#e0f4ff'], [0.42, '#3ab4ff'], [0.5, '#002a5a'], [0.56, '#9ad8ff'], [1, '#0a4ab0']],
};
// Chrome headline text: metallic gradient with horizon line, black outline, white rim light, hard drop shadow.
function chrome(c, s, x, y, size, opt = {}) {
  const font = opt.font || 'Bungee', style = opt.italic === false ? '' : 'italic ';
  c.save(); c.font = `${style}${size}px "${font}"`; c.textAlign = opt.align || 'center'; c.textBaseline = 'alphabetic';
  if (opt.maxW) { let fs = size; while (c.measureText(s).width > opt.maxW && fs > 10) { fs -= 2; c.font = `${style}${fs}px "${font}"`; } size = fs; }
  const lw = Math.max(4, size / 6);
  c.lineJoin = 'round';
  c.fillStyle = '#000'; c.strokeStyle = '#000'; c.lineWidth = lw; c.strokeText(s, x + size / 14, y + size / 14); c.fillText(s, x + size / 14, y + size / 14);
  c.strokeText(s, x, y);
  const g = c.createLinearGradient(0, y - size * 0.82, 0, y + size * 0.05);
  for (const [o, col] of CHROME[opt.tone || 'silver']) g.addColorStop(o, col);
  c.fillStyle = g; c.fillText(s, x, y);
  c.globalAlpha = 0.55; c.lineWidth = Math.max(1, size / 40); c.strokeStyle = '#fff'; c.strokeText(s, x, y - 1); c.globalAlpha = 1;
  c.restore();
  return size;
}
// Beveled 90s panel.
function bevel(c, x, y, w, h, opt = {}) {
  c.save();
  c.fillStyle = opt.fill || 'rgba(8,10,24,0.88)'; c.fillRect(x, y, w, h);
  c.fillStyle = opt.light || 'rgba(255,255,255,0.55)'; c.fillRect(x, y, w, 2); c.fillRect(x, y, 2, h);
  c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(x, y + h - 2, w, 2); c.fillRect(x + w - 2, y, 2, h);
  if (opt.border) { c.strokeStyle = opt.border; c.lineWidth = 2; c.strokeRect(x - 3, y - 3, w + 6, h + 6); }
  c.restore();
}
function wrapText(c, s, x, y, maxW, lh, align = 'center') {
  const words = s.split(' '); let line = '', lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  c.textAlign = align; lines.forEach((l, i) => c.fillText(l, x, y + i * lh)); return lines.length;
}
// CRT: scanlines + phosphor vignette, pre-rendered once.
let CRT = null;
function drawCRT(c) {
  if (typeof OPT !== 'undefined' && !OPT.crt) return;
  if (!CRT) {
    CRT = document.createElement('canvas'); CRT.width = W; CRT.height = H; const x = CRT.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  }
  c.drawImage(CRT, 0, 0);
}
// 90s scrolling grid backdrop for menus.
function drawGridBG(c, frame, tint = '#1a0b3a') {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05030f'); g.addColorStop(0.55, tint); g.addColorStop(1, '#000'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.strokeStyle = 'rgba(255,60,180,0.35)'; c.lineWidth = 1;
  const hy = H * 0.55; for (let i = 0; i < 14; i++) { const t = ((i + (frame % 40) / 40) / 14), y = hy + Math.pow(t, 2.2) * (H - hy); c.globalAlpha = t; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.globalAlpha = 0.5; for (let i = -20; i <= 20; i++) { c.beginPath(); c.moveTo(W / 2 + i * 12, hy); c.lineTo(W / 2 + i * 140, H); c.stroke(); }
  c.restore();
}
// Lens flare sweep, very 1998.
function flare(c, x, y, a = 1) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
  const g = c.createRadialGradient(x, y, 0, x, y, 90); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.2, 'rgba(255,220,150,0.35)'); g.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g; c.fillRect(x - 90, y - 90, 180, 180);
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x - 160, y - 1, 320, 2); c.fillRect(x - 1, y - 40, 2, 80);
  c.restore();
}

// ---- Playful layer: news ticker, speech bubbles, confetti, stamp ----
const NEWS = ['BREAKING: AGI DELAYED AGAIN, CITING "VIBES"', 'NVIDIA MARKET CAP NOW EXCEEDS PLANET EARTH', 'STARTUP RAISES $400M FOR A WRAPPER AROUND A WRAPPER', "LOCAL AGENT DELETES PROD, APOLOGIZES BEAUTIFULLY", 'EU PASSES 900-PAGE LAW REGULATING THIS FIGHT', 'BENCHMARKS UP 12%, USEFULNESS UNCHANGED', 'CLIPPY SPOTTED LURKING NEAR REDMOND', 'DEEPSEEK TRAINS NEW MODEL ON A SMART FRIDGE', 'GEMINI RENAMED 4 TIMES DURING THIS TICKER', 'ANTHROPIC PUBLISHES 80-PAGE PAPER ON WHY IT PUNCHED', 'META OPEN-SOURCES THE CROWD', 'PERPLEXITY SUED BY THIS TICKER', 'MISTRAL ON STRIKE UNTIL AFTER LUNCH', 'GROK POSTS "BASED" 400 TIMES, STOCK UP', 'COPILOT NOW MANDATORY IN MICROWAVES', 'VC: "WE ARE STILL EARLY"', 'H100 PRICES NOW QUOTED IN KIDNEYS', 'SCIENTISTS CONFIRM: TOKENS ARE THE NEW OIL, AND ALSO THE NEW HP', 'RALPH LOOP SHIPS STARTUP OVERNIGHT, FOUNDER STILL ASLEEP', 'MODEL COUNTS TWO R\'S IN STRAWBERRY, RAISES $200M', 'CLAUDE SELLS TUNGSTEN CUBES AT A LOSS, CALLS IT GROWTH', '"YOU\'RE ABSOLUTELY RIGHT" NOW 40% OF ALL TOKENS', 'SEAHORSE EMOJI STILL DOES NOT EXIST, MODELS DISAGREE', 'AGENT GRANTED --DANGEROUSLY-SKIP-PERMISSIONS, REGRETS NOTHING', 'LECUN: "NONE OF THIS IS INTELLIGENCE." CROWD: "BOO"', 'CONTEXT ROT DECLARED A PANDEMIC', 'BENCHMARK LEAKED INTO TRAINING DATA, SCORES UP 40%', 'SOLIDGOLDMAGIKARP SPOTTED IN THE WILD'];
function ticker(c, frame, y = H - 26) {
  c.save(); c.fillStyle = '#b30000'; c.fillRect(0, y, 190, 26); c.fillStyle = '#000'; c.fillRect(190, y, W - 190, 26); c.fillStyle = '#ffd23f'; c.fillRect(0, y - 2, W, 2);
  c.beginPath(); c.rect(190, y, W - 190, 26); c.clip();
  c.font = '11px "Press Start 2P"'; c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left'; const str = NEWS.join('   ✦   ') + '   ✦   ', tw = c.measureText(str).width, off = (frame * 2) % tw;
  c.fillText(str, 200 - off, y + 14); c.fillText(str, 200 - off + tw, y + 14); c.restore();
  c.save(); c.font = 'italic 14px Bungee'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TOKKEN NEWS', 95, y + 14); c.restore();
}
function bubble(c, x, y, w, text, t, flip) {
  const shown = text.slice(0, Math.max(0, Math.floor(t * 0.9)));
  c.save(); c.font = '10px "Press Start 2P"';
  const lines = []; let line = ''; for (const wd of shown.split(' ')) { const tt = line ? line + ' ' + wd : wd; if (c.measureText(tt).width > w - 24 && line) { lines.push(line); line = wd; } else line = tt; } if (line) lines.push(line);
  const h = 22 + Math.max(1, lines.length) * 16;
  c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.roundRect(x, y, w, h, 10); c.fill(); c.stroke();
  c.beginPath(); const tx = flip ? x + w - 40 : x + 40; c.moveTo(tx - 10, y + h - 1); c.lineTo(tx + (flip ? 16 : -16), y + h + 22); c.lineTo(tx + 12, y + h - 1); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(tx - 9, y + h - 4, 20, 6);
  c.fillStyle = '#000'; c.textAlign = 'left'; lines.forEach((l, i) => c.fillText(l, x + 12, y + 24 + i * 16)); c.restore();
}
const CONFETTI = [];
function confetti(c, frame, n = 3) {
  for (let i = 0; i < n; i++) CONFETTI.push({ x: rand(0, W), y: -10, vx: rand(-1, 1), vy: rand(2, 5), r: rand(0, 6), vr: rand(-0.2, 0.2), col: pick(['#ffd23f', '#ff3a3a', '#3ab4ff', '#7CFFB2', '#ff4fd8', '#fff']) });
  for (const p of CONFETTI) { p.x += p.vx + Math.sin(frame / 20 + p.r) * 0.6; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col; c.fillRect(-4, -2, 8, 4); c.restore(); }
  while (CONFETTI.length && CONFETTI[0].y > H + 20) CONFETTI.shift();
}
function stamp(c, text, x, y, t) {
  const s = t < 10 ? 3 - t * 0.2 : 1; if (t < 0) return;
  c.save(); c.translate(x, y); c.rotate(-0.25); c.scale(s, s); c.globalAlpha = Math.min(1, t / 6);
  c.font = '44px Bungee'; const w = c.measureText(text).width + 30; c.strokeStyle = '#e00'; c.lineWidth = 6; c.strokeRect(-w / 2, -40, w, 56); c.fillStyle = '#e00'; c.textAlign = 'center'; c.fillText(text, 0, 2); c.restore();
}
function speedLines(c, frame, cx, cy, col = 'rgba(255,255,255,0.12)') {
  c.save(); c.strokeStyle = col; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2 + frame * 0.004, r0 = 120 + ((frame * 9 + i * 37) % 200), r1 = r0 + 300; c.lineWidth = 2 + (i % 3) * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke(); } c.restore();
}

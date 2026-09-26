// TOKKEN — the fight engine. Fixed 60Hz sim, render every rAF.
const W = 1280, H = 720, FLOOR_S = 628, WORLD_W = 1900, GRAV = 0.82;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let DPR = 1;
function resize() {
  DPR = Math.min(matchMedia('(pointer: coarse)').matches ? 1.5 : 2, window.devicePixelRatio || 1);   // phones: cap resolution for a steady 60fps
  cv.width = W * DPR; cv.height = H * DPR;
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
}
addEventListener('resize', resize); resize();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
// Seeded gameplay RNG (lockstep netplay): anything that changes game state must use grand/gpick. Cosmetics use rand/pick.
let _gseed = 1;
function gseed(s) { _gseed = s >>> 0 || 1; }
function grng() { _gseed |= 0; _gseed = _gseed + 0x6D2B79F5 | 0; let t = Math.imul(_gseed ^ _gseed >>> 15, 1 | _gseed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const grand = (a, b) => a + grng() * (b - a);
const gpick = a => a[Math.floor(grng() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => Math.round(n).toLocaleString('en-US');
const rectHit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------------- Assets ----------------
const ASSETS = { sprites: {}, meta: {}, arenas: {}, flash: {}, crowd: {} };
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
async function loadAll(progress) {
  const jobs = [];
  for (const f of ROSTER) {
    ASSETS.sprites[f] = {};
    jobs.push(fetch(`assets/sprites/${f}/meta.json`).then(r => r.json()).then(m => { ASSETS.meta[f] = m; }).catch(() => { ASSETS.meta[f] = {}; }));
    for (const p of POSES) jobs.push(loadImg(`assets/sprites/${f}/${p}.webp`).then(i => { ASSETS.sprites[f][p] = i; }));
  }
  for (const id of ['jensen', 'sam', 'elon', 'zuck', 'dario', 'demis', 'satya', 'sundar', 'lisa', 'karpathy', 'lecun', 'ilya']) for (const p of [0, 1]) jobs.push(loadImg(`assets/crowd/${id}_${p}.webp`).then(i => { ASSETS.crowd[id + '_' + p] = i; }));
  for (const e of [0, 2, 5, 7]) for (let w = 0; w < 4; w++) jobs.push(loadImg(`assets/crowd/eng${e}_w${w}.webp`).then(i => { ASSETS.crowd[`eng${e}_w${w}`] = i; }));
  for (let e = 0; e < 12; e++) for (const p of [0, 1]) jobs.push(loadImg(`assets/crowd/eng${e}_${p}.webp`).then(i => { ASSETS.crowd['eng' + e + '_' + p] = i; }));
  for (const f of ROSTER) jobs.push(fetch(`assets/sprites/${f}/motion.json`).then(r => r.ok ? r.json() : null).then(mm => {
    if (!mm) return; const js = [];
    for (const k in mm) js.push(loadImg(`assets/sprites/${f}/${k}.webp`).then(i => { if (i) { ASSETS.sprites[f][k] = i; ASSETS.meta[f][k] = mm[k]; } }));
    return Promise.all(js);
  }).catch(() => {}));
  for (const a of ARENAS) jobs.push(loadImg(`assets/arenas/${a.id}.webp`).then(i => { ASSETS.arenas[a.id] = i; }));
  let done = 0; jobs.forEach(j => j.then(() => progress(++done / jobs.length)));
  await Promise.all(jobs);
  // fill missing poses with idle so nothing crashes
  for (const f of ROSTER) {
    const m = ASSETS.meta[f];
    for (const p of POSES) if (!ASSETS.sprites[f][p] || !m[p]) { ASSETS.sprites[f][p] = ASSETS.sprites[f].idle || ASSETS.sprites[f][Object.keys(m)[0]]; m[p] = m.idle || m[Object.keys(m)[0]]; }
  }
}
function flashImg(f, p) {
  const k = f + p; if (ASSETS.flash[k]) return ASSETS.flash[k];
  const img = ASSETS.sprites[f][p]; if (!img) return null;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return (ASSETS.flash[k] = c);
}
const tintCache = {};
function tintImg(f, p, color) {
  const k = f + p + color; if (tintCache[k]) return tintCache[k];
  const img = ASSETS.sprites[f][p]; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.65; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return (tintCache[k] = c);
}

// ---------------- World FX ----------------
const FX = { parts: [], texts: [], shake: 0, flash: 0, flashColor: '#fff', slowmo: 0, darken: 0, glitch: 0 };
function burst(x, y, color, n = 14, spd = 7, size = 6) { if (RESIM) return;
  for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), s = rand(spd * 0.3, spd); FX.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: rand(18, 34), max: 34, color: Math.random() < 0.35 ? '#fff' : color, size: rand(size * 0.5, size), g: 0.35 }); }
}
function sparks(x, y, dir, n = 10) { if (RESIM) return;
  for (let i = 0; i < n; i++) FX.parts.push({ x, y, vx: dir * rand(3, 14), vy: rand(-7, 3), life: rand(10, 20), max: 20, color: pick(['#fff', '#ffe86b', '#ffb000']), size: rand(2, 5), g: 0.4, streak: true });
}
function dust(x, y, n = 8) { if (RESIM) return; for (let i = 0; i < n; i++) FX.parts.push({ x: x + rand(-30, 30), y, vx: rand(-3, 3), vy: rand(-2.5, -0.5), life: rand(20, 35), max: 35, color: 'rgba(220,220,230,0.6)', size: rand(6, 14), g: -0.02, soft: true }); }
function glyphs(x, y, chars, color = '#7CFFB2', n = 10) { if (RESIM) return; for (let i = 0; i < n; i++) FX.parts.push({ x, y, vx: rand(-6, 6), vy: rand(-9, -2), life: rand(30, 50), max: 50, color, size: 20, g: 0.3, ch: pick(chars) }); }
function floatText(x, y, text, opt = {}) { if (RESIM) return; FX.texts.push({ x, y, text, vy: opt.vy ?? -2.2, life: opt.life ?? 60, max: opt.life ?? 60, size: opt.size ?? 34, color: opt.color ?? '#fff', stroke: opt.stroke ?? '#000', font: opt.font ?? 'Bungee', scale: 1.8 }); }
function shake(n) { if (RESIM) return; FX.shake = Math.max(FX.shake, n); }

// ---------------- Announcer / commentary ----------------
const Ann = { big: null, caption: null, captionT: 0, combo: [null, null] };
// Voice: play pre-rendered ElevenLabs clip by key, else fall back to speech synthesis.
function vo(key, text, opt = {}) { if (RESIM) return 0; if (Audio.has(key)) return Audio.play(key, opt); if (text) Audio.say(text, { force: true, ...opt }); return 0; }
const whyKey = r => 'why_' + r.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
function announce(text, opt = {}) { if (RESIM) return; Ann.big = { text, sub: opt.sub, t: 0, dur: opt.dur ?? 90, color: opt.color ?? '#FFD23F', size: opt.size ?? 120 }; if (opt.say !== false) vo(opt.key || '', opt.speak ?? text, { interrupt: true }); }
// ---------------- Commentary booth: BRAD GRADIENT (play-by-play) + DR. NIGEL OVERFIT (analyst) ----------------
const Booth = { last: {}, cool: {}, lastT: 0 };
const BOOTH_COOL = { bighit: 4, combo: 5, whiff: 9, block: 10, slop: 5, neutral: 12, turtle: 15, jumpspam: 15, low: 8, comeback: 10 };
function boothVariants(ev) { const out = []; for (let i = 0; i < 12; i++) { if (Audio.has(`b_${ev}_${i}_0`)) out.push(i); } return out; }
function boothKeys(ev, i) { const ks = []; for (let j = 0; j < 4; j++) { const k = `b_${ev}_${i}_${j}`; if (Audio.has(k)) ks.push(k); else break; } return ks; }
function boothPlay(keys, opt = {}) {
  const starts = Audio.chain(keys, opt); if (!starts) return false;
  for (const [k, off] of starts) aTimeout(() => { Ann.caption = Audio.lineText(k) || ''; Ann.captionT = 240; }, off * 1000);
  Booth.lastT = performance.now(); return true;
}
function boothEvent(ev, opt = {}) { if (RESIM) return false;
  const now = performance.now() / 1000;
  if (!opt.force && Booth.cool[ev] && now < Booth.cool[ev]) return false;
  if (!opt.force && Math.random() > (opt.p ?? 1)) return false;
  const vs = boothVariants(ev); if (!vs.length) return false;
  let i = pick(vs); if (vs.length > 1 && i === Booth.last[ev]) i = pick(vs.filter(x => x !== Booth.last[ev]));
  const ok = boothPlay(boothKeys(ev, i), { interrupt: opt.force });
  if (ok) { Booth.last[ev] = i; Booth.cool[ev] = now + (BOOTH_COOL[ev] || 3); }
  return ok;
}
function boothKey(keys, force) { if (RESIM) return false; return boothPlay(keys.filter(k => Audio.has(k)), { interrupt: force }); }
// Legacy entry point used around the engine.
function comment(kind, vars = {}, speakIt = true) { if (RESIM) return false;
  const map = { bigHit: 'bighit', combo: 'combo', slop: 'slop', whiff: 'whiff', low: 'low', block: 'block', inject: 'inject', ko: 'ko', start: 'open' };
  if (kind === 'ult' && vars.aid && Audio.has(`f_${vars.aid}_ult`)) return boothKey([`f_${vars.aid}_ult`], true);
  const ev = map[kind] || kind;
  if (boothVariants(ev).length) return boothEvent(ev, { force: kind === 'ko' });
  // fallback: old single-caster lines
  const pool = { bigHit: ['c_big_1', 'c_big_2', 'c_big_3', 'c_big_4', 'c_big_5'], combo: ['c_combo_1', 'c_combo_2', 'c_combo_3'], slop: ['c_slop_1', 'c_slop_2', 'c_slop_3', 'c_slop_4'], whiff: ['c_whiff_1', 'c_whiff_2', 'c_whiff_3', 'c_whiff_4'], low: ['c_low_1'], block: ['c_block_1', 'c_block_2'], ult: ['c_ult_1', 'c_ult_2', 'c_ult_3'], inject: ['c_inject_1', 'c_inject_2'], ko: ['c_ko_1', 'c_ko_2', 'c_ko_3'], start: ['c_start_1', 'c_start_2', 'c_start_3'] }[kind] || [];
  const avail = pool.filter(k => Audio.has(k)); if (!avail.length) return false;
  return boothKey([pick(avail)], kind === 'ko');
}

// ---------------- Projectiles ----------------
class Proj {
  constructor(o) { Object.assign(this, { vx: 0, vy: 0, g: 0, w: 40, h: 40, life: 240, hits: 1, hitCd: 0, t: 0, blockable: true, strength: 1, knock: 6, hitstun: 20, dead: false }, o); }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  update(game) {
    this.t++; if (this.hitCd > 0) this.hitCd--;
    if (this.homing && this.t > 12) { const o = this.target; const dx = o.x - this.x, dy = (o.y - o.h * 0.55) - this.y, d = Math.hypot(dx, dy) || 1; this.vx = lerp(this.vx, dx / d * 11, 0.08); this.vy = lerp(this.vy, dy / d * 11, 0.08); }
    this.vy += this.g; this.x += this.vx; this.y += this.vy;
    if (this.onUpdate) this.onUpdate(this, game);
    if (--this.life <= 0 || this.x < -200 || this.x > WORLD_W + 200 || (this.y > 0 && !this.ground)) { if (this.y > 0 && this.onGround) this.onGround(this, game); this.dead = true; }
  }
  draw(c) {
    c.save(); c.translate(this.x, this.y);
    if (this.render) this.render(c, this);
    else if (this.emoji) { c.rotate(this.t * 0.2 * Math.sign(this.vx || 1)); c.font = `${this.h}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(this.emoji, 0, 0); }
    else if (this.label) { c.font = `${this.fs || 22}px "Press Start 2P"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(this.label, 0, 0); c.fillStyle = this.color || '#7CFFB2'; c.fillText(this.label, 0, 0); }
    c.restore();
  }
}
function drawSlop(c, p) {
  const t = p.t, r = p.w / 2;
  c.rotate(t * 0.25);
  const g = c.createRadialGradient(0, 0, 2, 0, 0, r * 1.3); g.addColorStop(0, '#fff7a8'); g.addColorStop(0.35, '#b6ff3b'); g.addColorStop(0.7, '#ff3bd4'); g.addColorStop(1, 'rgba(120,0,255,0)');
  c.fillStyle = g; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, rr = r * (0.8 + 0.3 * Math.sin(t * 0.7 + i * 2)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill();
  c.font = '18px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(pick(['🖐️', '🚀', '✨', '💯', '🤖']), Math.sin(t) * 6, Math.cos(t) * 6);
}

// ---------------- Fighter ----------------
class Fighter {
  constructor(id, side, ctrl) {
    this.id = id; this.cfg = FIGHTERS[id]; this.side = side; this.ctrl = ctrl;
    this.meta = ASSETS.meta[id]; this.h = this.cfg.h; this.sc = this.h / this.meta.idle[1];
    this.wBody = clamp(this.meta.idle[0] * this.sc * 0.55, 60, 110);
    this.stats = { dealt: 0, hits: 0, whiffs: 0, slops: 0, maxCombo: 0, compute: 0, specials: 0 };
    this.wins = 0; this.reset();
  }
  reset() {
    this.x = this.side ? WORLD_W / 2 + 230 : WORLD_W / 2 - 230; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = this.side ? -1 : 1; this.tokens = MAX_TOKENS; this.shownTokens = MAX_TOKENS; this.trailTokens = MAX_TOKENS;
    this.compute = 0; this.state = 'idle'; this.st = 0; this.move = null; this.mt = 0; this.hitDone = false;
    this.stun = 0; this.combo = 0; this.cd = 0; this.airUsed = false; this.inv = 0; this.flash = 0; this.squash = 0;
    this.status = { think: 0, inject: 0, rate: 0, loop: 0 }; this.hist = []; this.after = []; this.visible = true; this.chain = 0;
    this.lowWarned = false; this.dashT = 0; this.armor = false;
  }
  get grounded() { return this.y >= 0; }
  get free() { return ['idle', 'walk', 'crouch', 'jump', 'dash'].includes(this.state); }
  get crouching() { return this.state === 'crouch' || (this.state === 'blockstun' && this.lowBlock); }
  hurtbox() {
    if (this.state === 'ko' || this.state === 'knockdown' || !this.visible) return null;
    const h = this.crouching || (this.state === 'attack' && this.move?.pose === 'crouch') ? this.h * 0.62 : this.h;
    return { x: this.x - this.wBody / 2, y: this.y - h, w: this.wBody, h };
  }
  setState(s) { this.state = s; this.st = 0; }
  startMove(key, m) {
    this.move = { key, ...m }; this.mt = 0; this.hitDone = false; this.setState('attack');
    if (m.cost) { this.compute -= m.cost; this.stats.compute += m.cost; }
    if (key !== 'light') Audio.S.whoosh();
    if ((key === 'heavy' && Math.random() < 0.8) || (key === 'light' && Math.random() < 0.3) || (key === 'low' && Math.random() < 0.3) || key === 'slop') vo(`v_${this.id}_atk${key === 'heavy' ? 2 : 1}`, '', { who: 'char' });
  }
  dmgMul() { return this.cfg.dmgMul * (this.status.think ? 1.8 : 1); }
  update(g, opp) {
    const c = this.ctrl; this.st++;
    for (const k in this.status) if (this.status[k] > 0) this.status[k]--;
    if (this.cd > 0) this.cd--; if (this.inv > 0) this.inv--; if (this.flash > 0) this.flash--; if (this.squash) this.squash *= 0.8;
    this.hist.push({ x: this.x, y: this.y }); if (this.hist.length > 60) this.hist.shift();
    if (this.landT > 0) this.landT--; if (this.turnT > 0) this.turnT--;
    if (this.lastFacing && this.lastFacing !== this.facing) this.turnT = 6; this.lastFacing = this.facing;
    if (this.state === 'walk' || this.state === 'dash') {
      const cnt = this.walkCount || (this.walkCount = Object.keys(this.meta).filter(k => /^walk\d$/.test(k)).length || 1);
      this.walkDist = (this.walkDist || 0) + Math.abs(this.vx); const n = Math.floor(this.walkDist / (this.h * 1.12 / cnt)) % cnt;
      if (n !== this.walkN && n % (cnt / 2) === 0 && this.grounded) dust(this.x - this.facing * 10, 0, 2); this.walkN = n;
    }
    if (this.after.length) this.after = this.after.filter(a => --a.life > 0);
    this.shownTokens = lerp(this.shownTokens, this.tokens, 0.25);
    if (this.st > 30 || this.state !== 'hitstun') this.trailTokens = Math.max(this.tokens, this.trailTokens - 260);

    let L = c.held('left'), R = c.held('right');
    if (this.status.inject) [L, R] = [R, L];
    const fwd = this.facing > 0 ? R : L, back = this.facing > 0 ? L : R;
    this.holdBack = back || c.held('block'); this.holdDown = c.held('down');
    const spd = this.cfg.speed * (this.status.rate ? 0.45 : 1) * (this.status.think ? 1.2 : 1);

    if (g.phase !== 'fight') { this.physics(g); return; }

    switch (this.state) {
      case 'hitstun': if (--this.stun <= 0 && this.grounded) this.setState('idle'); break;
      case 'blockstun': if (--this.stun <= 0) this.setState(this.lowBlock ? 'crouch' : 'idle'); break;
      case 'knockdown': if (this.st > 42) { this.setState('idle'); this.inv = 20; dust(this.x, 0, 5); } break;
      case 'launched': if (this.grounded && this.vy >= 0 && this.st > 4) { this.setState('knockdown'); this.vx *= 0.3; shake(6); dust(this.x, 0, 12); Audio.S.land(); } break;
      case 'attack': this.updateMove(g, opp); break;
      case 'ultrun': this.updateUltRun(g, opp); break;
      case 'dash': this.vx = this.facing * (this.dashDir || 1) * 13; if (this.st % 3 === 0) this.after.push({ x: this.x, y: this.y, pose: 'walk', life: 10, facing: this.facing }); if (this.st > 11) { this.setState('idle'); this.vx *= 0.3; } break;
    }

    if (this.free) {
      const buf = b => c.buffered(b, 6);
      if (this.grounded) {
        if (this.state === 'jump') this.setState('idle');
        if (buf('ult') && this.compute >= MAX_COMPUTE) { c.consume('ult'); g.startUlt(this, opp); return; }
        if (buf('slop') && this.compute >= BASE_MOVES.slop.cost) { c.consume('slop'); this.startMove('slop', BASE_MOVES.slop); return; }
        if (buf('special') && this.cd <= 0) { c.consume('special'); this.startSpecial(g, opp); return; }
        if (buf('heavy')) { c.consume('heavy'); this.startMove('heavy', BASE_MOVES.heavy); return; }
        if (buf('light')) { c.consume('light'); this.startMove(this.holdDown ? 'low' : 'light', this.holdDown ? BASE_MOVES.low : BASE_MOVES.light); return; }
        if (c.pressed('dash')) { this.dashDir = back ? -1 : 1; this.setState('dash'); Audio.S.whoosh(); return; }
        if (c.held('up')) { this.vy = -this.cfg.jump; this.vx = (fwd ? 1 : back ? -1 : 0) * this.facing * spd * 1.25; this.y = -1; this.airUsed = false; this.setState('jump'); Audio.S.jump(); this.squash = -0.18; return; }
        if (this.holdDown) { if (this.state !== 'crouch') this.setState('crouch'); this.vx *= 0.6; }
        else if (L || R) { if (this.state !== 'walk') this.setState('walk'); const target = (R ? 1 : -1) * spd * (back ? 0.8 : 1); this.vx = lerp(this.vx, target, 0.35); }
        else { if (this.state !== 'idle') this.setState('idle'); this.vx *= 0.7; }
      } else {
        if (!this.airUsed && (buf('light') || buf('heavy'))) { c.consume('light'); c.consume('heavy'); this.airUsed = true; const m = { ...BASE_MOVES.air }; this.move = { key: 'air', ...m }; this.mt = 0; this.hitDone = false; this.state = 'attack'; Audio.S.whoosh(); }
      }
    }
    this.physics(g);
  }
  physics(g) {
    if (this.state === 'ultrun' && this.ultFly) return;
    if (!this.grounded || this.vy < 0) { this.vy += GRAV * (this.state === 'launched' ? 0.9 : 1); this.y += this.vy; }
    this.x += this.vx;
    if (this.y >= 0) {
      if (this.vy > 4 && this.state !== 'launched') { this.squash = 0.22; this.landT = 6; Audio.S.land(); dust(this.x, 0, 4); }
      this.y = 0; if (this.state !== 'launched') this.vy = 0;
      if (this.state === 'launched' && this.vy > 0) this.vy = 0;
      if (this.state === 'attack' && this.move?.key === 'air') { this.setState('idle'); this.move = null; }
      if (this.state === 'hitstun' || this.state === 'blockstun' || this.state === 'knockdown' || this.state === 'ko') this.vx *= 0.82;
      if (this.state === 'attack' && !this.move?.keepVx) this.vx *= 0.75;
    }
  }
  // Active hitbox of current move in world coords
  hitbox() {
    const m = this.move; if (!m || !m.box) return null;
    const act = this.mt > m.startup && this.mt <= m.startup + m.active; if (!act || this.hitDone) return null;
    const [bx, by, bw, bh] = m.box, h = Math.max(this.h, 158);   // normalized reach: small sprites (Claude, Siri) aren't punished
    const x0 = this.facing > 0 ? this.x + bx * h : this.x - (bx + bw) * h;
    return { x: x0, y: this.y + by * h, w: bw * h, h: bh * h };
  }
  updateMove(g, opp) {
    const m = this.move; this.mt++;
    if (m.onFrame) m.onFrame(this, g, opp, this.mt);
    if (m.proj && this.mt === m.startup) g.spawnMoveProj(this, opp, m.proj);
    if (m.lunge && this.mt === m.startup + 1) this.vx += this.facing * m.lunge * 0.35;
    const total = m.startup + m.active + m.recovery;
    // whiff tracking
    if (this.mt === m.startup + m.active + 1 && m.box && !this.hitDone && !m.noWhiff) { this.stats.whiffs++; if (Math.random() < 0.18) floatText(this.x + this.facing * 60, this.y - this.h - 10, pick(['HALLUCINATED', 'CONFIDENTLY WRONG', '404', 'MISSED (100% SURE)']), { size: 11, font: 'Press Start 2P', color: '#ff9ad5', life: 45 }); if (Math.random() < 0.08) comment('whiff', { a: this.cfg.name }); }
    // cancels: on hit, light->light(x2)->heavy->special/slop
    if (this.hitDone && this.mt > m.startup + 1 && !m.noCancel) {
      const c = this.ctrl;
      if (m.key === 'light' && this.chain < 2 && c.buffered('light', 8)) { c.consume('light'); this.chain++; this.startMove(this.holdDown ? 'low' : 'light', this.holdDown ? BASE_MOVES.low : BASE_MOVES.light); return; }
      if ((m.key === 'light' || m.key === 'low') && c.buffered('heavy', 8)) { c.consume('heavy'); this.startMove('heavy', BASE_MOVES.heavy); return; }
      if (['light', 'low', 'heavy'].includes(m.key)) {
        if (c.buffered('special', 8) && this.cd <= 0) { c.consume('special'); this.startSpecial(g, opp); return; }
        if (c.buffered('slop', 8) && this.compute >= 25) { c.consume('slop'); this.startMove('slop', BASE_MOVES.slop); return; }
        if (c.buffered('ult', 8) && this.compute >= MAX_COMPUTE) { c.consume('ult'); g.startUlt(this, opp); return; }
      }
    }
    if (this.mt >= total && m.key !== 'air') { this.move = null; this.chain = m.key === 'light' ? this.chain : 0; if (m.key !== 'light') this.chain = 0; this.setState(this.grounded ? 'idle' : 'jump'); if (m.onEnd) m.onEnd(this, g, opp); }
    if (m.key === 'air' && this.mt > m.startup + m.active + m.recovery + 30) { this.move = null; this.setState('jump'); }
  }
  startSpecial(g, opp) {
    const sp = this.cfg.special; this.cd = sp.cd; this.stats.specials++;
    if (this.id === 'deepseek' && grng() < 0.15) { // the server is, in fact, busy
      this.startMove('special', { name: 'SERVER BUSY', startup: 40, active: 1, recovery: 6, pose: 'block', noWhiff: true, poseFn: () => 'block' });
      floatText(this.x, this.y - this.h - 30, '服务器繁忙，请稍后再试', { size: 22, font: 'sans-serif', color: '#ff5555', life: 70 });
      floatText(this.x, this.y - this.h - 2, 'SERVER BUSY. PLEASE TRY AGAIN LATER.', { size: 10, font: 'Press Start 2P', color: '#fff', life: 70 }); Audio.S.error(); return;
    }
    const s = Specials[sp.kind]; this.startMove('special', { name: sp.name, pose: 'special', noWhiff: true, ...s(this, sp, g, opp) });
    floatText(this.x, this.y - this.h - 30, sp.name, { size: 26, color: this.cfg.color, life: 55 });
    if (this.id === 'deepseek') floatText(this.x, this.y - this.h - 64, '蒸馏！', { size: 34, font: 'sans-serif', color: '#fff', life: 55 });
    vo(`v_${this.id}_special`, '', { who: 'char', interrupt: true });
    if (Math.random() < 0.45) aTimeout(() => boothKey([`f_${this.id}_special`]), 500);
  }
  updateUltRun(g, opp) { if (this.ultRun) this.ultRun(this, g, opp, ++this.ut); }
  pose() {
    const s = this.state;
    if (s === 'ko') return this.grounded && this.st > 10 ? 'ko' : 'hit';
    if (s === 'win') return 'win';
    if (s === 'hitstun' || s === 'launched') return s === 'launched' && this.vy > 0 && this.st > 20 ? 'ko' : 'hit';
    if (s === 'knockdown') return this.st < 30 ? 'ko' : 'crouch';
    if (s === 'blockstun') return this.lowBlock ? 'crouch' : 'block';
    if (s === 'ultrun') return this.ultPose || 'ult';
    if (s === 'ultcin') return 'ult';
    if (s === 'attack') {
      const m = this.move; if (m.poseFn) return m.poseFn(this, this.mt);
      if (this.mt <= m.startup * 0.6 && m.key !== 'air') return m.windup || (m.key === 'low' ? 'crouch' : 'block');
      return m.pose;
    }
    if (s === 'jump') return 'jump';
    if (s === 'crouch') return this.holdBack ? 'crouch' : 'crouch';
    const hasWalk = this.meta.walk0, hasIdle = this.meta.idle0;
    if ((s === 'idle' || s === 'walk') && this.landT > 2) return 'crouch';
    if (s === 'walk' || s === 'dash') {
      if (!hasWalk) return Math.floor(this.st / 9) % 2 ? 'walk' : 'idle';
      const back = Math.sign(this.vx) !== this.facing, n = this.walkN || 0, cnt = this.walkCount || 8; return 'walk' + (back ? (cnt - n) % cnt : n);
    }
    if (s === 'intro') return this.st < 40 ? 'win' : (this.meta.idle0 ? 'idle' + (Math.floor(this.st / 9) % 4) : 'idle');
    if (s === 'idle' && this.holdBack && this.ctrl.held('block')) return 'block';
    if (this.meta.idle0) return 'idle' + (Math.floor((this.animT = (this.animT || 0) + 1) / 9) % 4);
    return 'idle';
  }
  draw(c, g) {
    if (!this.visible) return;
    const pose = this.pose(), m = this.meta[pose], img = ASSETS.sprites[this.id][pose];
    // afterimages
    for (const a of this.after) { c.globalAlpha = a.life / 14 * 0.5; this.blit(c, a.pose, a.x, a.y, a.facing, 1, 1, tintImg(this.id, a.pose, this.status.think ? '#ffb000' : this.cfg.color)); }
    c.globalAlpha = 1;
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(this.x, 2, this.wBody * 0.75 * clamp(1 + this.y / 600, 0.4, 1), 9, 0, 0, Math.PI * 2); c.fill();
    let sx = 1, sy = 1, rot = 0; const st = this.state;
    if (st === 'idle' && !this.meta.idle0) { const b = Math.sin(g.frame / 9 + this.side) * 0.025; sx = 1 - b; sy = 1 + b; }
    if (st === 'walk') { const fwd = Math.sign(this.vx) === this.facing; rot = (fwd ? 0.05 : -0.035) * this.facing * Math.min(1, Math.abs(this.vx) / 3); if (!this.meta.walk0) sy *= 1 + Math.abs(Math.sin(this.walkDist / (this.h * 0.14) * Math.PI / 4)) * 0.03; }
    if (st === 'dash') { rot = 0.12 * this.facing * (this.dashDir || 1); sx *= 1.12; sy *= 0.94; }
    if (st === 'hitstun') rot = -this.facing * 0.14 * Math.min(1, this.stun / 10);
    if (st === 'launched' && !this.grounded) rot = -this.facing * Math.min(1.3, this.st * 0.09);
    if (st === 'jump') rot = this.facing * clamp(this.vx * 0.012, -0.12, 0.12) + (this.vy < 0 ? 0 : this.facing * 0.04);
    if (this.turnT > 0) sx *= 0.55 + 0.45 * (1 - this.turnT / 6);
    let bobY = 0; if ((st === 'walk') && this.walkCount === 4 && (this.walkN || 0) % 2 === 1) bobY = -this.h * 0.03;
    if (this.squash) { sx *= 1 + this.squash; sy *= 1 - this.squash; }
    let ox = 0; if (this.state === 'hitstun' && this.stun > 0 && g.hitstop > 0) ox = rand(-4, 4);
    if (this.state === 'attack' && this.move) { const m = this.move; if (this.mt > m.startup && this.mt <= m.startup + m.active + 3) ox += this.facing * (m.lunge || 0) * 0.35; }
    if (this.status.think) { c.save(); c.shadowColor = '#ffb000'; c.shadowBlur = 30 + Math.sin(g.frame / 4) * 10; }
    if (this.inv > 0 && this.state !== 'ultrun' && g.frame % 4 < 2) c.globalAlpha = 0.5;
    this.blit(c, pose, this.x + ox, this.y + bobY, this.facing, sx, sy, this.flash > 0 ? flashImg(this.id, pose) : img, rot);
    c.globalAlpha = 1;
    if (this.status.think) c.restore();
  }
  blit(c, pose, x, y, facing, sx, sy, img, rot = 0) {
    const m = this.meta[pose] || this.meta.idle; if (!img) return;
    c.save(); c.translate(x, y); if (rot) { c.translate(0, -this.h * 0.4); c.rotate(rot); c.translate(0, this.h * 0.4); } c.scale(facing * this.sc * sx, this.sc * sy);
    c.drawImage(img, -m[3], -m[2]); c.restore();
  }
}

// ---------------- Specials ----------------
const Specials = {
  slam: (f, sp) => ({
    startup: 8, active: 999, recovery: 0, windup: 'crouch', keepVx: true, noCancel: true,
    poseFn: (f, t) => t < 8 ? 'crouch' : f.vy < 0 ? 'jump' : 'heavy',
    onFrame(f, g, o, t) {
      if (t === 8) { f.vy = -15; f.vx = f.facing * 7.5; f.y = -1; Audio.S.jump(); }
      if (t > 10 && f.grounded) {
        shake(16); dust(f.x, 0, 20); Audio.S.huge(); FX.flash = 4; FX.flashColor = '#ffb68a';
        g.areaHit(f, o, { x: f.x - f.h * 0.9, y: -f.h * 0.5, w: f.h * 1.8, h: f.h * 0.5 }, { dmg: sp.dmg, knock: 10, launch: true, hitstun: 30, hitstop: 12, name: sp.name, low: false });
        f.move.startup = 0; f.move.active = 0; f.move.recovery = 16; f.mt = 0; f.move.onFrame = null; f.move.poseFn = t => 'heavy';
      }
    },
  }),
  revert: (f, sp, g) => ({
    startup: 4, active: 1, recovery: 10, pose: 'special',
    onFrame(f, g, o, t) {
      if (t === 4) {
        const h = f.hist[0] || f; for (let i = 0; i < f.hist.length; i += 6) f.after.push({ x: f.hist[i].x, y: Math.min(0, f.hist[i].y), pose: 'special', life: 14, facing: f.facing });
        f.x = h.x; f.y = Math.min(0, h.y); f.inv = 24; f.tokens = Math.min(MAX_TOKENS, f.tokens + 1024);
        floatText(f.x, f.y - f.h - 10, 'git revert HEAD~1', { font: 'Press Start 2P', size: 14, color: '#7CFFB2' });
        floatText(f.x, f.y - f.h - 40, '+1,024 HOTFIX', { size: 22, color: '#7CFFB2' }); Audio.S.modem();
      }
    },
  }),
  beam: (f, sp, g) => ({
    startup: 16, active: 36, recovery: 16, pose: 'special', noCancel: true,
    onFrame(f, g, o, t) {
      if (t === 16) Audio.S.beam();
      if (t > 16 && t <= 52 && (t - 17) % 5 === 0) g.areaHit(f, o, { x: f.facing > 0 ? f.x + 20 : f.x - 920, y: f.y - f.h * 0.72, w: 900, h: f.h * 0.34 }, { dmg: sp.dmg, knock: 2, hitstun: 14, hitstop: 2, name: sp.name, multi: true });
    },
    render(c, f, t) {
      if (t <= 16 || t > 52) return; const y = f.y - f.h * 0.55, x0 = f.x + f.facing * 30, len = 900 * Math.min(1, (t - 16) / 6), th = f.h * 0.3 * (1 + Math.sin(t) * 0.1);
      const gr = c.createLinearGradient(0, y - th, 0, y + th); gr.addColorStop(0, 'rgba(49,134,255,0)'); gr.addColorStop(0.3, '#BD99FE'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(0.7, '#FFE432'); gr.addColorStop(1, 'rgba(252,65,61,0)');
      c.fillStyle = gr; c.fillRect(f.facing > 0 ? x0 : x0 - len, y - th, len, th * 2);
      c.font = '16px "Press Start 2P"'; c.fillStyle = '#1a1a40'; for (let i = 0; i < 8; i++) c.fillText('2,000,000 TOKENS'.slice(0, (t + i * 3) % 17), x0 + f.facing * (i * 110 + (t * 8) % 110) - (f.facing < 0 ? 100 : 0), y + 6);
    },
  }),
  rush: (f, sp) => ({
    startup: 8, active: 16, recovery: 16, pose: 'heavy', windup: 'block', keepVx: true, box: [0.1, -0.85, 0.9, 0.6], dmg: sp.dmg, hitstun: 26, blockstun: 16, push: 12, launch: true, lunge: 0, gain: 10,
    onFrame(f, g, o, t) { if (t > 8 && t <= 24) { f.vx = f.facing * 16; if (t % 2) f.after.push({ x: f.x, y: f.y, pose: 'heavy', life: 12, facing: f.facing }); FX.parts.push({ x: f.x - f.facing * 20, y: f.y - f.h * 0.5 + rand(-30, 30), vx: -f.facing * rand(2, 6), vy: rand(-2, 0), life: 20, max: 20, color: pick(['#ff3b1f', '#ffb000', '#fff']), size: rand(5, 10), g: -0.1 }); } if (t === 25) f.vx *= 0.2; },
    onHit(f, o, g) { f.tokens -= sp.recoil; floatText(f.x, f.y - f.h - 10, `-${fmt(sp.recoil)} RECOIL`, { size: 18, color: '#ff6b6b' }); },
  }),
  fork: (f, sp, g) => ({
    startup: 10, active: 1, recovery: 14, pose: 'special',
    onFrame(f, g, o, t) {
      if (t !== 10) return; Audio.S.notif(); floatText(f.x, f.y - f.h - 10, 'git fork', { font: 'Press Start 2P', size: 14, color: '#7CFFB2' });
      g.projs.push(new Proj({ owner: f, target: o, x: f.x + f.facing * 40, y: -f.h * 0.5, vx: f.facing * 8, w: f.wBody, h: f.h * 0.9, dmg: sp.dmg, life: 110, knock: 9, hitstun: 26, strength: 3, launch: true,
        render(c, p) { const pose = p.t % 16 < 8 ? 'walk' : 'idle'; c.globalAlpha = 0.75; f.blit(c, pose, 0, f.h * 0.5, f.facing * 1, 1, 1, tintImg(f.id, pose, '#7ab8ff')); c.globalAlpha = 1; } }));
    },
  }),
  smash: (f, sp) => ({
    startup: 6, active: 30, recovery: 12, pose: 'heavy', noCancel: true,
    poseFn: (f, t) => t < 6 ? 'block' : Math.floor(t / 5) % 2 ? 'heavy' : 'light',
    onFrame(f, g, o, t) {
      if (t > 6 && (t - 7) % 10 === 0) { Audio.S.key(8); glyphs(f.x + f.facing * 70, f.y - f.h * 0.6, 'asdfjkl;qwerty!?#'.split(''), '#ff4fd8', 6); g.areaHit(f, o, { x: f.facing > 0 ? f.x : f.x - f.h * 0.95, y: f.y - f.h * 0.9, w: f.h * 0.95, h: f.h * 0.8 }, { dmg: sp.dmg, knock: 3, hitstun: 16, hitstop: 4, name: sp.name, multi: true, exact: true }); }
    },
  }),
  distill: (f, sp) => ({
    startup: 12, active: 18, recovery: 14, pose: 'special', noCancel: true,
    onFrame(f, g, o, t) { if (t === 12) { Audio.S.beam(); g.areaHit(f, o, { x: f.facing > 0 ? f.x + 10 : f.x - 440, y: f.y - f.h * 0.75, w: 430, h: f.h * 0.4 }, { dmg: sp.dmg, knock: 3, hitstun: 22, hitstop: 8, name: sp.name, onHit: (a, d) => { const s = Math.min(d.compute, sp.steal); d.compute -= s; a.compute = Math.min(100, a.compute + s); d.status.rate = 180; floatText(d.x, d.y - d.h - 20, '429 RATE LIMITED', { font: 'Press Start 2P', size: 16, color: '#ff5555' }); floatText(d.x, d.y - d.h - 48, '知识已被蒸馏', { font: 'sans-serif', size: 22, color: '#9fb3ff' }); } }); } },
    render(c, f, t) { if (t < 12 || t > 30) return; const y = f.y - f.h * 0.55, a = 1 - (t - 12) / 18; c.globalAlpha = a; c.fillStyle = '#4D6BFE'; c.fillRect(f.facing > 0 ? f.x + 20 : f.x - 440, y - 18, 420, 36); c.fillStyle = '#fff'; c.fillRect(f.facing > 0 ? f.x + 20 : f.x - 440, y - 5, 420, 10); c.globalAlpha = 1; },
  }),
  lunge: (f, sp) => ({
    startup: 6, active: 10, recovery: 14, pose: 'light', windup: 'crouch', keepVx: true, box: [0.1, -0.75, 1.1, 0.4], dmg: sp.dmg, hitstun: 22, blockstun: 12, push: 8, gain: 9, lunge: 0,
    onFrame(f, g, o, t) { if (t > 6 && t <= 16) { f.vx = f.facing * 21; f.after.push({ x: f.x, y: f.y, pose: 'light', life: 10, facing: f.facing }); } if (t === 17) f.vx *= 0.15; if (t === 7) Audio.S.whoosh(); },
  }),
  cite: (f, sp, g) => ({
    startup: 12, active: 1, recovery: 16, pose: 'special',
    onFrame(f, g, o, t) { if (t !== 12) return; Audio.S.throw(); [-2.2, 0, 2.2].forEach((vy, i) => g.projs.push(new Proj({ owner: f, target: o, x: f.x + f.facing * 50, y: f.y - f.h * 0.6, vx: f.facing * 10, vy, w: 44, h: 32, dmg: sp.dmg, label: sp.labels ? sp.labels[i] : `[${i + 1}]`, fs: sp.labels ? 16 : 22, color: sp.color || '#20B8CD', life: 120, knock: 4, hitstun: 16 }))); },
  }),
  gen: (f, sp, g) => ({
    startup: 12, active: 1, recovery: 16, pose: 'special',
    onFrame(f, g, o, t) { if (t !== 12) return; Audio.S.throw(); const e = pick(sp.icons); g.projs.push(new Proj({ owner: f, target: o, x: f.x + f.facing * 50, y: f.y - f.h * 0.8, vx: f.facing * 9, vy: -9, g: 0.42, w: 64, h: 64, emoji: e, dmg: sp.dmg, life: 160, knock: 8, hitstun: 24, strength: 2 })); floatText(f.x, f.y - f.h - 40, `prompt: "${e}"`, { size: 16, font: 'Press Start 2P', color: '#fff' }); },
  }),
  search: (f, sp, g) => ({
    startup: 14, active: 1, recovery: 18, pose: 'special',
    onFrame(f, g, o, t) { if (t !== 14) return; Audio.S.notif(); const q = pick(['how to win fight', 'is punching legal', 'fight near me', 'what is a token']); g.projs.push(new Proj({ owner: f, target: o, x: f.x + f.facing * 70, y: f.y - f.h * 0.7, vx: f.facing * 5.5, w: 170, h: 110, dmg: sp.dmg, life: 190, knock: 6, hitstun: 24, strength: 3,
      render(c, p) { c.fillStyle = '#f5f5f7'; c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.roundRect(-85, -55, 170, 110, 10); c.fill(); c.stroke(); c.fillStyle = '#ddd'; c.fillRect(-85, -55, 170, 16); ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(-74 + i * 11, -47, 3.5, 0, 7); c.fill(); });
        c.fillStyle = '#000'; c.font = '8px "Press Start 2P"'; c.textAlign = 'left'; c.fillText("HERE'S WHAT I", -76, -24); c.fillText('FOUND ON THE WEB:', -76, -12); c.fillStyle = '#1a55d6'; c.fillText(q.slice(0, 17), -76, 6); c.fillStyle = '#888'; for (let i = 0; i < 3; i++) c.fillRect(-76, 16 + i * 10, 120 - i * 25, 4); } })); },
  }),
  tab: (f, sp, g) => ({
    startup: 6, active: 6, recovery: 16, pose: 'heavy', windup: 'block', box: [0.1, -0.85, 0.9, 0.6], dmg: sp.dmg, hitstun: 26, blockstun: 12, push: 9, launch: true, gain: 10, lunge: 0,
    onFrame(f, g, o, t) {
      if (t !== 5) return; // autocomplete: appear right behind the opponent
      for (let i = 0; i < 6; i++) f.after.push({ x: lerp(f.x, o.x, i / 6), y: f.y, pose: 'walk', life: 12, facing: f.facing });
      f.x = clamp(o.x + f.facing * (o.wBody * 0.5 + f.wBody * 0.6), 60, WORLD_W - 60); f.facing *= -1; f.inv = 8;
      floatText(f.x, f.y - f.h - 20, '⇥ TAB', { size: 20, font: 'Press Start 2P', color: '#3A8BFF', life: 40 }); Audio.S.whoosh();
    },
  }),
  inject: (f, sp, g) => ({
    startup: 14, active: 1, recovery: 18, pose: 'special',
    onFrame(f, g, o, t) { if (t !== 14) return; Audio.S.notif(); g.projs.push(new Proj({ owner: f, target: o, x: f.x + f.facing * 60, y: f.y - f.h * 0.75, vx: f.facing * 6, w: 150, h: 70, dmg: sp.dmg, life: 170, knock: 3, hitstun: 20,
      onHit: (a, d) => { d.status.inject = 240; announce('PROMPT INJECTION', { sub: 'IGNORE ALL PREVIOUS INSTRUCTIONS', size: 70, dur: 70, color: '#ff4fd8', say: false }); comment('inject', { v: d.cfg.name, vid: d.id }); vo('prompt_injection', ''); Audio.S.error(); },
      render(c, p) { c.fillStyle = '#FFFFC8'; c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.roundRect(-75, -35, 150, 62, 10); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-40 * Math.sign(p.vx), 26); c.lineTo(-60 * Math.sign(p.vx), 42); c.lineTo(-20 * Math.sign(p.vx), 26); c.fill(); c.stroke(); c.fillStyle = '#000'; c.font = '9px "Press Start 2P"'; c.textAlign = 'center'; c.fillText("IT LOOKS LIKE", 0, -14); c.fillText("YOU'RE TRYING", 0, 0); c.fillText('TO FIGHT.', 0, 14); } })); },
  }),
};

// ---------------- Ultimates ----------------
const Ults = {
  think(f, u, g, o) { f.status.think = u.dur; f.setState('idle'); announce('THINKING...', { size: 90, dur: 80, color: '#ffb000', key: 'thinking' }); },
  ship(f, u, g, o) {
    const cmds = ['npm install', 'git push', 'docker build', 'ERROR', 'RETRY', 'pip install', 'rm -rf node_modules', 'DEPLOY', 'kubectl apply', 'terraform', 'ERROR', 'RETRY'];
    f.setState('idle');
    for (let i = 0; i < 16; i++) g.later(i * 6, () => { const last = i === 15; g.projs.push(new Proj({ owner: f, target: o, x: o.x + grand(-160, 160), y: -H, vx: 0, vy: last ? 18 : 14, w: last ? 260 : 140, h: last ? 60 : 34, dmg: last ? 4096 : 1024, label: last ? '🚀 DEPLOY' : pick(cmds), fs: last ? 30 : 14, color: pick(['#7CFFB2', '#ff5555', '#FFD23F']), blockable: true, knock: last ? 12 : 3, hitstun: last ? 40 : 18, launch: last, life: 200, strength: 9, ground: false, onGround: p => { dust(p.x, 0, 6); shake(4); } })); Audio.S.key(2); });
  },
  barrage(f, u, g, o) {
    f.setState('idle');
    for (let i = 0; i < u.n; i++) g.later(i * 5, () => {
      const rain = u.rain; g.projs.push(new Proj({ owner: f, target: o, x: rain ? o.x + grand(-220, 220) : f.x + f.facing * 40, y: rain ? -H : f.y - f.h * grand(0.25, 0.95), vx: rain ? grand(-1, 1) : f.facing * grand(11, 15), vy: rain ? grand(10, 14) : grand(-1.5, 1.5), w: 56, h: u.labels ? 30 : 56, emoji: u.icons ? pick(u.icons) : null, label: u.labels ? pick(u.labels) : null, fs: 16, color: f.cfg.color, dmg: u.dmg, knock: 4, hitstun: 20, strength: 9, life: 200 })); Audio.S.throw();
    });
  },
  flurry(f, u, g, o) {
    f.setState('ultrun'); f.ut = 0; f.ultPose = 'heavy'; f.inv = 999;
    f.ultRun = (f, g, o, t) => {
      if (!f.locked) {
        f.vx = f.facing * 22; f.after.push({ x: f.x, y: f.y, pose: 'heavy', life: 10, facing: f.facing });
        if (Math.abs(o.x - f.x) < f.wBody + o.wBody * 0.6 && o.hurtbox()) { f.locked = t; f.vx = 0; o.setState('hitstun'); o.stun = 999; o.vx = 0; }
        else if (t > 34) { f.inv = 0; f.setState('idle'); f.ultRun = null; }
        f.physics(g); return;
      }
      const k = t - f.locked; f.ultPose = k % 8 < 4 ? 'light' : 'heavy'; o.vx = 0;
      if (k % 5 === 0 && k / 5 < u.hits) { g.rawHit(f, o, u.dmg, { hitstop: 3, knock: 0, hitstun: 999, sfx: 'light' }); sparks(o.x, o.y - o.h * 0.6, -f.facing, 6); floatText(o.x + rand(-40, 40), o.y - o.h - rand(0, 60), pick(u.words || ['BASED', 'RATIO', 'L', '💀', 'NO CAP', 'SPICY']), { size: 22, color: u.color || '#ff3b1f' }); }
      if (k === u.hits * 5 + 6) { g.rawHit(f, o, u.dmg * 3, { hitstop: 14, knock: 13, launch: true, hitstun: 40, sfx: 'huge' }); if (u.invoice) { floatText(o.x, o.y - o.h - 90, 'INVOICE: $4,812.00', { size: 28, color: '#fff', life: 120, vy: -0.6 }); floatText(o.x, o.y - o.h - 60, 'USAGE-BASED PRICING', { size: 11, font: 'Press Start 2P', color: '#3A8BFF', life: 120, vy: -0.6 }); Audio.S.notif(); } f.locked = 0; f.inv = 10; f.setState('idle'); f.ultRun = null; }
    };
  },
  heal(f, u, g, o) {
    f.setState('idle'); f.tokens = Math.min(MAX_TOKENS, f.tokens + u.heal); Audio.S.heal();
    floatText(f.x, f.y - f.h - 30, `+${fmt(u.heal)} TOKENS`, { size: 40, color: '#7CFFB2', life: 90 }); burst(f.x, f.y - f.h / 2, '#7CFFB2', 30, 9);
    Ults.barrage(f, { ...u, rain: true }, g, o);
  },
  skate(f, u, g, o) {
    f.setState('ultrun'); f.ut = 0; f.ultPose = 'ult'; f.inv = 999; f.passes = 0; f.ultFly = true; f.y = 0; Audio.setMode('dolphin');
    f.hitCd = 0;
    f.ultRun = (f, g, o, t) => {
      f.x += f.facing * 27; f.y = -Math.abs(Math.sin(t / 7)) * 40;
      if (t % 2) f.after.push({ x: f.x, y: f.y, pose: 'ult', life: 14, facing: f.facing });
      if (f.hitCd > 0) f.hitCd--;
      const hb = o.hurtbox(); if (hb && f.hitCd <= 0 && rectHit({ x: f.x - 60, y: f.y - f.h, w: 120, h: f.h }, hb)) { f.hitCd = 18; g.rawHit(f, o, u.dmg, { hitstop: 6, knock: f.facing * 0 + 8, launch: true, hitstun: 30, sfx: 'heavy' }); glyphs(o.x, o.y - o.h / 2, 'asdf;lkj'.split(''), '#0ff', 8); }
      const L = g.cam.x - W / 2 / g.cam.z + 40, R = g.cam.x + W / 2 / g.cam.z - 40;
      if ((f.facing > 0 && f.x > R + 200) || (f.facing < 0 && f.x < L - 200)) { f.facing *= -1; f.passes++; Audio.S.whoosh(); floatText(clamp(f.x, L + 100, R - 100), -300, pick(['*EEE EEE*', 'COWABUNGA', 'SYNTHWAVE!', '1337']), { size: 28, color: '#ff4fd8' }); }
      if (f.passes >= u.passes && Math.abs(f.x - g.cam.x) < 200) { f.ultFly = false; f.inv = 10; f.y = 0; f.setState('idle'); f.ultRun = null; Audio.setMode('normal'); f.facing = f.x < o.x ? 1 : -1; }
    };
  },
  wave(f, u, g, o) {
    f.setState('ultrun'); f.ut = 0; f.ultPose = 'special'; Audio.S.charge();
    f.ultRun = (f, g, o, t) => {
      if (t % 4 === 0) floatText(f.x + rand(-60, 60), f.y - f.h - rand(0, 80), pick(['$5M', '便宜', 'H800', '开源', '蒸馏', 'MoE', '¥', '太便宜了']), { size: 20, color: '#4D6BFE', life: 30 });
      if (t === 36) {
        Audio.S.huge(); shake(12);
        g.projs.push(new Proj({ owner: f, target: o, x: f.x + f.facing * 60, y: -110, vx: f.facing * 12, w: 170, h: 220, dmg: u.dmg, knock: 16, hitstun: 50, launch: true, strength: 99, life: 180, chipMul: 0.25,
          render(c, p) { c.scale(Math.sign(p.vx), 1); const gr = c.createLinearGradient(-85, 0, 85, 0); gr.addColorStop(0, 'rgba(77,107,254,0)'); gr.addColorStop(0.6, 'rgba(77,107,254,0.85)'); gr.addColorStop(1, '#cfe0ff'); c.fillStyle = gr; c.beginPath(); c.moveTo(-85, 110); c.quadraticCurveTo(40, 110, 85, -40 + Math.sin(p.t / 3) * 10); c.quadraticCurveTo(30, -110, -20, -80); c.quadraticCurveTo(10, -40, -85, 0); c.fill(); c.font = '90px serif'; c.textAlign = 'center'; c.fillText('🐋', 10, 40); c.font = 'bold 30px sans-serif'; c.fillStyle = '#fff'; c.fillText('五百万', 0, -60); } }));
      }
      if (t > 60) { f.setState('idle'); f.ultRun = null; }
    };
  },
  homing(f, u, g, o) {
    f.setState('idle');
    for (let i = 0; i < u.n; i++) g.later(i * 4, () => { const a = grand(0, Math.PI * 2); g.projs.push(new Proj({ owner: f, target: o, homing: true, x: f.x + Math.cos(a) * 60, y: f.y - f.h * 0.6 + Math.sin(a) * 60, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, w: 44, h: 30, label: `[${i + 1}]`, fs: 16, color: '#20B8CD', dmg: u.dmg, knock: 3, hitstun: 18, strength: 9, life: 150 })); Audio.S.throw(); });
  },
  clones(f, u, g, o) {
    f.setState('idle'); announce('GENERATE 4 VARIATIONS', { size: 64, dur: 60, color: '#E8C9A8', key: 'gen_4' });
    const tints = ['#ff9ad5', '#9ad5ff', '#b6ff9a', '#ffd59a'];
    for (let i = 0; i < u.n; i++) g.later(i * 12, () => {
      const dir = f.facing, sx = dir > 0 ? g.cam.x - W / 2 / g.cam.z - 80 : g.cam.x + W / 2 / g.cam.z + 80, yy = i % 2 ? -f.h * 0.5 : -f.h * 1.2;
      g.projs.push(new Proj({ owner: f, target: o, x: sx, y: yy, vx: dir * 17, w: f.wBody * 1.2, h: f.h * 0.9, dmg: u.dmg, knock: 8, hitstun: 26, strength: 9, life: 160, launch: i === u.n - 1,
        render(c, p) { f.blit(c, 'heavy', 0, f.h * 0.45, dir, 1, 1, tintImg(f.id, 'heavy', tints[i])); } })); Audio.S.whoosh();
    });
  },
  distillult(f, u, g, o) {
    // DeepSeek "distills" the opponent: runs THEIR ultimate, wearing its own face.
    const src = o.cfg.ult;
    if (!src || src.kind === 'distillult') return Ults.wave(f, u, g, o);
    announce('DISTILLED!', { size: 110, dur: 70, color: '#3ad0ff', sub: `DISTILLED FROM ${o.cfg.name} — FOR 1/100 OF THE COST`, say: false });
    floatText(f.x, f.y - f.h - 40, `${src.name} (DEEPSEEK EDITION)`, { size: 18, color: '#4D6BFE', life: 110, vy: -0.5 });
    floatText(f.x, f.y - f.h - 70, '蒸馏', { size: 36, font: 'sans-serif', color: '#fff', life: 110, vy: -0.5 });
    Ults[src.kind](f, src, g, o);
  },
  delayed(f, u, g, o) {
    f.setState('idle');
    announce('COMING NEXT YEAR', { size: 70, dur: 80, color: '#fff', sub: 'APPLE INTELLIGENCE™ — AVAILABLE IN SELECT REGIONS', say: false });
    const ships = grng() < 0.35; // it usually doesn't ship
    g.later(110, () => {
      if (!ships) { floatText(f.x, f.y - f.h - 40, 'DELAYED TO 2027', { size: 26, color: '#ff5555', life: 110, vy: -0.5 }); floatText(f.x, f.y - f.h - 12, '(FEATURE NOT AVAILABLE)', { size: 10, font: 'Press Start 2P', color: '#fff', life: 110, vy: -0.5 }); Audio.S.error(); Audio.crowd(0.5, 1.2, 250); return; }
      announce('IT ACTUALLY SHIPPED', { size: 64, dur: 60, color: '#ff4fd8', say: false });
      g.projs.push(new Proj({ owner: f, target: o, x: o.x, y: -H, vy: 20, w: 200, h: 200, dmg: u.dmg, knock: 14, hitstun: 50, launch: true, strength: 99, life: 200, chipMul: 0.25, onGround: p => { shake(18); Audio.S.huge(); dust(p.x, 0, 24); },
        render(c, p) { const gr = c.createRadialGradient(0, 0, 10, 0, 0, 100); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, '#ff6ad5'); gr.addColorStop(0.7, '#5ad1ff'); gr.addColorStop(1, 'rgba(90,209,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 100, 0, 7); c.fill(); c.font = '60px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('', 0, 4); } }));
    });
  },
  wordart(f, u, g, o) {
    f.setState('idle');
    g.later(20, () => g.projs.push(new Proj({ owner: f, target: o, x: o.x, y: -H * 1.2, vy: 16, w: 520, h: 150, dmg: u.dmg, knock: 14, hitstun: 50, launch: true, strength: 99, life: 200, chipMul: 0.25, onGround: p => { shake(20); Audio.S.huge(); dust(p.x, 0, 30); },
      render(c, p) { c.save(); c.transform(1, 0, -0.25, 1, 0, 0); c.font = '96px "Bungee"'; c.textAlign = 'center'; c.textBaseline = 'middle'; const gr = c.createLinearGradient(-260, -50, 260, 50); ['#ff0000', '#ff9900', '#ffee00', '#00dd00', '#0099ff', '#aa00ff'].forEach((col, i) => gr.addColorStop(i / 5, col)); c.lineWidth = 10; c.strokeStyle = '#000'; c.strokeText('YOU LOSE', 0, 0); c.fillStyle = gr; c.fillText('YOU LOSE', 0, 0); c.restore(); } })));
  },
};

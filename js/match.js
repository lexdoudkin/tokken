// TOKKEN — match: rounds, hits, camera, render, HUD.
// Per-fighter variation lines (tools/quips.py): taunt / pain / low pools, spoken + floated as a subtitle.
function quip(f, kind, opt = {}) { if (RESIM) return 0;
  const ks = []; for (let i = 0; i < 6; i++) if (Audio.has(`v_${f.id}_${kind}${i}`)) ks.push(`v_${f.id}_${kind}${i}`);
  if (f.id === 'codex' && kind === 'taunt') for (let i = 1; i <= 5; i++) ks.push(`v_codex_quip${i}`);
  if (!ks.length) return 0; let k = pick(ks); if (ks.length > 1 && k === f.lastQuip) k = pick(ks.filter(x => x !== k)); f.lastQuip = k;
  const d = vo(k, '', { who: 'char' }); const t = Audio.lineText(k);
  if (d && t) { const rows = []; for (const w of t.split(' ')) { if (rows.length && (rows[rows.length - 1] + ' ' + w).length <= 30) rows[rows.length - 1] += ' ' + w; else rows.push(w); }
    const x = Math.max(250, Math.min(1030, f.x)); rows.forEach((r, i) => floatText(x, f.y - f.h - 50 - (rows.length - 1 - i) * 15, r, { size: 10, font: 'Press Start 2P', color: opt.color || f.cfg.color, life: 130, vy: -0.4 })); }
  return d;
}
class Match {
  constructor(p1, p2, arena, ctrls, cpu) {
    this.f = [new Fighter(p1, 0, ctrls[0]), new Fighter(p2, 1, ctrls[1])]; Memes.used.clear(); Memes.next = 0;
    this.arena = arena; this.cpu = cpu; this.round = 1; this.frame = 0; this.hitstop = 0; this.projs = []; this.timers = [];
    this.cam = { x: WORLD_W / 2, z: 1, y: 0 }; this.ultCin = null; this.over = false; this.slops = 0; this.hallucinations = 0;
    this.startRound();
  }
  later(n, fn) { this.timers.push({ n, fn }); }
  startRound() {
    this.winQuote = null; this.rotSaid = false;
    this.f.forEach(f => { f.reset(); f.setState('intro'); });
    this.projs = []; this.timers = []; this.time = 99 * 60; this.phase = 'intro'; this.pt = 0; this.koInfo = null;
    FX.parts = []; FX.texts = []; Ann.big = null; Audio.setMode('normal');
    const final = this.f[0].wins === 1 && this.f[1].wins === 1;
    this.later(20, () => announce(final ? 'FINAL ROUND' : `ROUND ${this.round}`, { dur: 70, key: final ? 'final_round' : `round_${this.round}`, speak: final ? 'Final round' : `Round ${this.round}` }));
    this.later(140, () => this.boothRoundStart(final));
    this.noHitT = 0; this.blocks = []; this.jumps = []; this.firstHit = this.round === 1 ? false : true;
    if (this.round === 1) { this.later(2, () => { const [p, q] = this.f; const d = vo(`v_${p.id}_intro`, '', { who: 'char' }) || 0; aTimeout(() => vo(`v_${q.id}_intro`, '', { who: 'char' }), (d ? d * 1000 : 0) + 150); }); }
    this.later(95, () => { announce('PROMPT!', { dur: 50, color: '#fff', size: 150, key: 'prompt' }); Audio.S.huge(); shake(8); });
    this.later(115, () => { this.phase = 'fight'; this.f.forEach(f => f.setState('idle')); });
  }
  boothRoundStart(final) {
    const [a, b] = this.f;
    if (this.round === 1) {
      const mk = [`m_${a.id}_${b.id}_0`, `m_${a.id}_${b.id}_1`], mk2 = [`m_${b.id}_${a.id}_0`, `m_${b.id}_${a.id}_1`];
      const r = Math.random();
      if (Audio.has(mk[0]) && r < 0.7) boothKey(mk, true); else if (Audio.has(mk2[0]) && r < 0.7) boothKey(mk2, true);
      else if (r < 0.55 && Audio.has(`a_${this.arena.id}`)) boothKey([`a_${this.arena.id}`], true); else boothEvent('open', { force: true });
    } else if (final) boothEvent('final', { force: true });
    else if (this.f.some(f => f.wins === 1)) boothEvent(Math.random() < 0.5 ? 'matchpoint' : 'round2', { force: true });
    else boothEvent('round2', { force: true });
  }
  startUlt(f, o) {
    f.compute = 0; f.stats.compute += 100; f.ultLock = 330;   // no meter from your own ult (cut-in + ult + tail): kills ult loops
    f.setState('ultcin');
    this.ultCin = { f, o, t: 0, name: f.cfg.ult.name }; Audio.S.ult(); Audio.duck(0.05, 1800); Audio.crowd(0.8, 2);
    if (['claude', 'codex', 'cursor'].includes(f.id) && memeOk('yolo')) { floatText(f.x, f.y - f.h - 110, '--dangerously-skip-permissions', { size: 10, font: 'Press Start 2P', color: '#ff5555', life: 90 }); aTimeout(() => boothEvent('yolo', { p: 0.4 }), 2600); }
    const d = vo(`v_${f.id}_ult`, '', { who: 'char', interrupt: true });   // key lines cut in over long taunts aTimeout(() => vo(`ult_${f.id}`, f.cfg.ult.name, { interrupt: false }), (d || 0) * 700 + 200);
    aTimeout(() => comment('ult', { a: f.cfg.name, aid: f.id }), 1600);
  }
  spawnMoveProj(f, o, kind) {
    if (kind === 'slop') {
      f.stats.slops++; this.slops++; Audio.S.throw();
      this.projs.push(new Proj({ owner: f, target: o, x: f.x + f.facing * 60, y: f.y - f.h * 0.62, vx: f.facing * 9.5, w: 56, h: 56, dmg: 4096, knock: 8, hitstun: 26, render: drawSlop, strength: 2, slop: true }));
    }
  }
  // Generic area hit (specials). Respects blocking.
  areaHit(a, d, box, o) {
    const hb = d.hurtbox(); if (!hb || d.inv > 0 || !rectHit(box, hb)) return false;
    this.applyHit(a, d, { ...o, fromX: a.x }); return true;
  }
  canBlock(d, a, o) {
    if (!['idle', 'walk', 'crouch', 'blockstun'].includes(d.state) || !d.grounded) return false;
    const awayFromAttacker = d.ctrl.held('block') || (a.x > d.x ? (d.status.inject ? d.ctrl.held('right') : d.ctrl.held('left')) : (d.status.inject ? d.ctrl.held('left') : d.ctrl.held('right')));
    if (!awayFromAttacker) return false;
    const crouch = d.holdDown;
    if (o.low && !crouch) return false; if (o.overhead && crouch) return false;
    return true;
  }
  applyHit(a, d, o) {
    if (d.parryT > 0 && d.state === 'attack') {   // Jev's CALIBRATED: cancel and answer
      d.parryT = 0; d.parried = true; this.hitstop = Math.max(this.hitstop, 10); Audio.S.block(); sparks(d.x, d.y - d.h * 0.6, -Math.sign(d.x - a.x) || 1, 14);
      floatText(d.x, d.y - d.h - 50, '{"blocked": 0.98}', { size: 13, font: 'Press Start 2P', color: '#E551BA', life: 60 });
      this.rawHit(d, a, d.cfg.special.dmg, { dir: Math.sign(a.x - d.x) || 1, knock: 10, launch: true, hitstun: 30, hitstop: 12, sfx: 'heavy' });
      return 'block';
    }
    const dir = Math.sign(d.x - (o.fromX ?? a.x)) || a.facing;
    if (o.blockable !== false && this.canBlock(d, a, o)) {
      const chip = Math.round(o.dmg * a.dmgMul() * (o.chipMul ?? 0.08));
      d.tokens -= chip; d.lowBlock = d.holdDown; d.setState('blockstun'); d.stun = o.blockstun ?? 10; d.vx = dir * (o.push ?? 5) * 0.8;
      d.compute = Math.min(100, d.compute + 3); if (!(a.ultLock > 0)) a.compute = Math.min(100, a.compute + 2);
      this.blocks = (this.blocks || []).filter(t => this.frame - t < 180); this.blocks.push(this.frame); if (this.blocks.length >= 4) { this.blocks = []; boothEvent('turtle', { p: 0.6 }); }
      this.hitstop = Math.max(this.hitstop, 4); Audio.S.block(); sparks(d.x - dir * d.wBody / 2, d.y - d.h * (d.lowBlock ? 0.3 : 0.6), -dir, 6);
      if (chip > 0) floatText(d.x, d.y - d.h - 10, `-${fmt(chip)}`, { size: 20, color: '#9fb3c8' });
      if (Math.random() < 0.25) floatText(d.x, d.y - d.h - 40, pick(["I CAN'T HELP WITH THAT", 'REFUSED', 'AS AN AI AGENT…', 'GUARDRAILS ON']), { size: 11, font: 'Press Start 2P', color: '#9fb3c8', life: 50 });
      if (Math.random() < 0.05) comment('block', { v: d.cfg.name, vid: d.id });
      if (d.tokens <= 0) this.ko(a, d);
      return 'block';
    }
    const scaling = Math.max(0.35, 1 - 0.1 * Math.max(0, a.combo - 1));
    let dmg = Math.round(o.dmg * (o.exact ? 1 : a.dmgMul() * scaling) * (d.status.think ? 0.5 : 1));
    this.rawHit(a, d, dmg, { ...o, dir });
    if (o.onHit) o.onHit(a, d, this);
    return 'hit';
  }
  rawHit(a, d, dmg, o) {
    const dir = o.dir ?? a.facing;
    const wasStunned = ['hitstun', 'launched'].includes(d.state);
    a.combo = wasStunned ? a.combo + 1 : 1; a.stats.maxCombo = Math.max(a.stats.maxCombo, a.combo);
    d.tokens -= dmg; a.stats.dealt += dmg; a.stats.hits++; this.noHitT = 0;
    if (!this.firstHit) { this.firstHit = true; aTimeout(() => boothEvent('firsthit', { p: 0.8 }), 250); }
    if (a.tokens < MAX_TOKENS * 0.25 && a.combo === 3 && d.tokens > a.tokens) boothEvent('comeback');
    if (!(a.ultLock > 0)) a.compute = Math.min(100, a.compute + (o.gain ?? 6)); d.compute = Math.min(100, d.compute + 4);
    const armored = d.status.think && dmg < 5000;
    if (!armored) {
      if (o.launch || !d.grounded) { d.setState('launched'); d.vy = -(o.launch ? 11 : 7); d.vx = dir * (o.knock ?? 6) * 0.9; d.y = Math.min(d.y, -1); }
      else { d.setState('hitstun'); d.stun = o.hitstun ?? 16; d.vx = dir * (o.knock ?? 5); }
      if (d.move) d.move = null;
    }
    d.flash = 5; d.squash = -0.08;
    if ((d.id === 'claude' || d.id === 'codex') && dmg >= 2000 && Math.random() < 0.18 && memeOk('sycophant')) { floatText(d.x, d.y - d.h - 80, "YOU'RE ABSOLUTELY RIGHT", { size: 11, font: 'Press Start 2P', color: '#bfe0ff', life: 70 }); boothEvent('sycophant', { p: 0.35 }); }
    if ((dmg >= 1500 || a.combo >= 3) && (!a.quipT || this.frame - a.quipT > (a.id === 'codex' ? 240 : 420)) && Math.random() < (a.id === 'codex' ? 0.35 : 0.28)) { if (quip(a, 'taunt')) a.quipT = this.frame; }
    if (dmg >= 1200 && (!d.hurtT || this.frame - d.hurtT > 35) && d.tokens - dmg > 0) { d.hurtT = this.frame; if (!(dmg >= 2500 && Math.random() < 0.45 && quip(d, 'pain'))) vo(`v_${d.id}_hurt${1 + (Math.random() < 0.5)}`, '', { who: 'char' }); }
    const big = dmg >= 3000;
    this.hitstop = Math.max(this.hitstop, o.hitstop ?? (big ? 9 : 5)); shake(big ? 9 : 4);
    Audio.S[o.sfx || (dmg >= 6000 ? 'huge' : big ? 'heavy' : 'light')](); Audio.S.tok(Math.min(6, Math.ceil(dmg / 1024)));
    const hy = d.y - d.h * 0.6;
    burst(d.x, hy, a.cfg.color, big ? 22 : 12, big ? 10 : 7); sparks(d.x, hy, dir, big ? 14 : 7);
    if (Math.random() < 0.4) glyphs(d.x, hy, a.id === 'deepseek' ? ['令牌', '蒸', '馏', '¥', '开源', '便宜'] : ['TOK', '▮', '0', '1', '<|eot|>', '∑'], '#ffe86b', big ? 5 : 2);
    floatText(d.x + rand(-20, 20), d.y - d.h - 10, `-${fmt(dmg)}`, { size: big ? 54 : 36, color: big ? '#ff4040' : '#fff', life: 55 });
    if (big) { floatText(d.x, d.y - d.h - 60, 'TOKENS', { size: 20, color: '#ffb000', life: 50 }); Audio.crowd(0.5, 1.2); }
    if (big && Math.random() < 0.35) comment('bigHit', { a: a.cfg.name, aid: a.id, v: d.cfg.name, d: fmt(dmg) });
    if (a.combo >= 3) { Ann.combo[a.side] = { n: a.combo, t: 0 }; if (a.combo === 4 || a.combo === 6 || a.combo === 8) comment('combo', { a: a.cfg.name, aid: a.id, v: d.cfg.name }); if (a.combo >= 5) Audio.crowd(0.7, 1.4); }
    if (d.tokens < MAX_TOKENS * 0.2 && d.tokens > 0 && !d.lowWarned) { d.lowWarned = true; announce('TOKEN CRITICAL!', { size: 72, dur: 60, color: '#ff4040', key: 'token_critical' }); aTimeout(() => quip(d, 'low', { color: '#ff8080' }), 350); aTimeout(() => comment('low', { v: d.cfg.name, vid: d.id, t: fmt(d.tokens) }), 2600); }
    if (d.tokens <= 0) this.ko(a, d);
  }
  ko(a, d) {
    if (this.phase !== 'fight') return;
    d.tokens = 0; this.phase = 'ko'; this.pt = 0; d.setState('ko'); d.vy = -12; d.vx = (Math.sign(d.x - a.x) || 1) * 9; d.y = -1;
    const why = gpick(d.cfg.ko); this.koInfo = { a, d, why }; a.wins++;
    this.perfects = this.perfects || [0, 0]; if (a.tokens >= MAX_TOKENS) this.perfects[a.side]++;
    this.hitstop = 30; FX.slowmo = 90; FX.flash = 8; FX.flashColor = '#fff'; FX.glitch = 40; shake(20);
    Audio.duck(0.02, 3000); Audio.S.ko();
    vo(`v_${d.id}_ko`, '', { who: 'char', interrupt: true });
    this.later(25, () => announce(why, { size: why.length > 16 ? 64 : 90, dur: 110, color: '#ff4040', key: whyKey(why), speak: why.replace('429', 'four two nine') }));
    const perfect = a.tokens >= MAX_TOKENS;
    this.later(150, () => { if (perfect && boothEvent('perfect', { force: true })) return; if (Math.random() < 0.5 && Audio.has(`f_${d.id}_ko`)) boothKey([`b_ko_x`, `f_${d.id}_ko`].filter(k => Audio.has(k)), true); else comment('ko', {}); });
    this.later(115, () => { announce('K.O.', { size: 200, dur: 80, color: '#FFD23F', key: 'ko' }); });
    this.later(200, () => { a.setState('win'); const w = a.wins >= 2 ? vo(`wins_${a.id}`, '') : 0; const wk = pick(['', '1', '2'].filter(x => !x || Audio.has(`v_${a.id}_winq${x}`))); const wt = (wk && Audio.lineText(`v_${a.id}_winq${wk}`)) || a.cfg.win; aTimeout(() => vo(`v_${a.id}_winq${wk}`, wt, { who: 'char', interrupt: true }), (w || 0) * 1000 + 100); if (!RESIM) this.winQuote = { f: a, text: `"${wt}"`, t: 0 }; });
    this.later(330, () => {
      if (a.wins >= 2) { this.over = true; this.winner = a; }
      else { this.round++; this.startRound(); }
    });
  }
  timeOver() {
    this.phase = 'ko'; this.pt = 0; const [p, q] = this.f; const a = p.tokens >= q.tokens ? p : q, d = a === p ? q : p;
    a.wins++; this.koInfo = { a, d, why: 'TIME OVER' };
    announce('RATE LIMIT: TIME OVER', { size: 64, dur: 120, color: '#ff4040', key: 'time_over', speak: 'Time over' }); this.later(90, () => boothEvent('timeover', { force: true }));
    this.later(130, () => { a.setState('win'); d.setState('idle'); });
    this.later(260, () => { if (a.wins >= 2) { this.over = true; this.winner = a; } else { this.round++; this.startRound(); } });
  }
  step() {
    this.frame++;
    // timers
    for (const t of this.timers) if (--t.n <= 0) t.fn(); this.timers = this.timers.filter(t => t.n > 0);
    if (this.ultCin) {
      const u = this.ultCin; u.t++; u.f.st++;
      if (u.t === 70) { this.ultCin = null; if (!RESIM) UltFX.start(u.f, this); Ults[u.f.cfg.ult.kind](u.f, u.f.cfg.ult, this, u.o); u.f.inv = Math.max(u.f.inv, 10); }
      this.updateFX(); return;
    }
    if (this.hitstop > 0) { this.hitstop--; this.updateFX(true); return; }
    if (FX.slowmo > 0) { FX.slowmo--; if (FX.slowmo % 3 !== 0) { this.updateFX(); return; } }
    const [a, b] = this.f;
    if (!(a.status.slowmo > 0 && this.frame % 2)) a.update(this, b); else if (a.status.slowmo) a.status.slowmo--;
    if (!(b.status.slowmo > 0 && this.frame % 2)) b.update(this, a); else if (b.status.slowmo) b.status.slowmo--;
    // facing
    for (const [f, o] of [[a, b], [b, a]]) if (f.free && f.grounded && f.state !== 'dash') f.facing = o.x >= f.x ? 1 : -1;
    // push boxes
    if (a.hurtbox() && b.hurtbox() && Math.abs(a.y - b.y) < Math.min(a.h, b.h) * 0.8 && a.state !== 'ultrun' && b.state !== 'ultrun') {
      const min = (a.wBody + b.wBody) / 2 * 0.9, dx = b.x - a.x;
      if (Math.abs(dx) < min) { const push = (min - Math.abs(dx)) / 2, s = Math.sign(dx) || (a.side ? -1 : 1); a.x -= s * push; b.x += s * push; }
    }
    // bounds
    const half = SIM_W / 2 / this.cam.z;
    for (const f of this.f) { if (f.state === 'ultrun' && f.ultFly) continue; f.x = clamp(f.x, 60, WORLD_W - 60); }
    const spread = 1150;
    if (Math.abs(a.x - b.x) > spread && a.state !== 'ultrun' && b.state !== 'ultrun') { const mid = (a.x + b.x) / 2, s = Math.sign(b.x - a.x); a.x = mid - s * spread / 2; b.x = mid + s * spread / 2; }
    // melee hits
    for (const [f, o] of [[a, b], [b, a]]) {
      const hb = f.hitbox(); const hu = o.hurtbox();
      if (hb && hu && o.inv <= 0 && rectHit(hb, hu)) {
        f.hitDone = true; const m = f.move;
        const r = this.applyHit(f, o, { dmg: m.dmg, hitstun: m.hitstun, blockstun: m.blockstun, knock: m.push, push: m.push, low: m.low, overhead: m.overhead, launch: m.launch && (o.state === 'launched' || !o.grounded || f.combo >= 2), gain: m.gain });
        if (r === 'hit' && m.onHit) m.onHit(f, o, this);
      }
    }
    // combo reset
    for (const [f, o] of [[a, b], [b, a]]) if (!['hitstun', 'launched'].includes(o.state) && f.combo) { if (f.combo >= 3) Ann.combo[f.side] = { ...(Ann.combo[f.side] || { n: f.combo }), t: Ann.combo[f.side]?.t ?? 0, done: true }; f.combo = 0; }
    // projectiles
    for (const p of this.projs) p.update(this);
    for (let i = 0; i < this.projs.length; i++) for (let j = i + 1; j < this.projs.length; j++) {
      const p = this.projs[i], q = this.projs[j];
      if (p.dead || q.dead || p.owner === q.owner || !rectHit(p.box(), q.box())) continue;
      const s = Math.min(p.strength, q.strength); p.strength -= s; q.strength -= s; burst((p.x + q.x) / 2, (p.y + q.y) / 2, '#fff', 10, 6); Audio.S.block();
      if (p.strength <= 0) p.dead = true; if (q.strength <= 0) q.dead = true;
    }
    for (const p of this.projs) {
      if (p.dead || !p.w) continue; const d = p.target, hu = d.hurtbox();   // zero-size projectiles are markers (targets, shadows), never hits
      if (hu && d.inv <= 0 && p.hitCd <= 0 && rectHit(p.box(), hu)) {
        const r = this.applyHit(p.owner, d, { dmg: p.dmg, hitstun: p.hitstun, blockstun: 12, knock: p.knock, push: 6, launch: p.launch, fromX: p.x - Math.sign(p.vx || 1) * 50, chipMul: p.chipMul, blockable: p.blockable, gain: 5 });
        if (p.slop) { if (r === 'hit') { Audio.S.slop(); glyphs(d.x, d.y - d.h / 2, ['🖐️', '🚀', '✨', '💯', '🤖', '📈', 'lorem', 'ipsum'], '#ff4fd8', 12); announce('SLOP!', { size: 90, dur: 40, color: '#b6ff3b', key: 'slop_hit' }); aTimeout(() => comment('slop', {}), 700); } }
        if (r === 'hit' && p.onHit) p.onHit(p.owner, d, this);
        if (--p.hits <= 0) p.dead = true; else p.hitCd = 10;
      }
    }
    this.projs = this.projs.filter(p => !p.dead);
    // timer
    if (this.phase === 'fight') {
      if (--this.time <= 0) this.timeOver();
      if (this.time === 10 * 60) boothEvent('timelow', { force: true });
      if (++this.noHitT === 60 * 7) { boothEvent(Math.random() < 0.45 ? 'leaders' : 'neutral'); this.noHitT = 60 * 3; }
      if (this.frame % 60 === 0 && Math.random() < 0.035 && !RESIM) { const pool = MEME_POOL.filter(x => !Memes.used.has(x[0])); const mm = pool.length && pick(pool);
        if (mm && memeOk(mm[0], 12)) { floatText(this.cam.x, -400, mm[0], { size: 26, color: '#ffd23f', life: 110, vy: -0.3 }); floatText(this.cam.x, -372, mm[1], { size: 10, font: 'Press Start 2P', color: '#fff', life: 110, vy: -0.3 }); if (mm[2]) boothEvent(mm[2], { p: 0.8 }); } }
      if (this.time === 50 * 60 && !this.rotSaid) { this.rotSaid = true; boothEvent('rot', { p: 0.8 }); }
      for (const f of this.f) if (f.state === 'jump' && f.st === 1) { this.jumps = (this.jumps || []).filter(t => this.frame - t < 240); this.jumps.push(this.frame); if (this.jumps.length >= 6) { this.jumps = []; boothEvent('jumpspam', { p: 0.7 }); } }
    }
    this.updateFX();
    this.updateCam();
  }
  updateFX(frozen) {
    FX.parts.forEach(p => { if (frozen && !p.ch) return; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life--; if (p.y > 0 && p.g > 0) { p.y = 0; p.vy *= -0.4; p.vx *= 0.7; } });
    FX.parts = FX.parts.filter(p => p.life > 0);
    FX.texts.forEach(t => { t.y += t.vy; t.vy *= 0.96; t.life--; t.scale = lerp(t.scale, 1, 0.3); }); FX.texts = FX.texts.filter(t => t.life > 0);
    if (FX.shake > 0) FX.shake *= 0.86; if (FX.shake < 0.3) FX.shake = 0;
    if (FX.flash > 0) FX.flash--; if (FX.glitch > 0) FX.glitch--;
    if (Ann.big) { Ann.big.t++; if (Ann.big.t > Ann.big.dur) Ann.big = null; }
    if (Ann.captionT > 0) Ann.captionT--;
    for (const c of Ann.combo) if (c) c.t++;
    Ann.combo = Ann.combo.map(c => c && c.t < (c.done ? 90 : 200) ? c : null);
  }
  updateCam() {
    const [a, b] = this.f, cm = this.cam;
    const tx = (a.x + b.x) / 2, dist = Math.abs(a.x - b.x);
    const tz = clamp(1180 / (dist + 520), 0.82, 1.22);
    cm.z = lerp(cm.z, this.ultCin ? 1.35 : tz, this.ultCin ? 0.12 : 0.06);
    const focus = this.ultCin ? this.ultCin.f.x : tx;
    const half = SIM_W / 2 / cm.z; cm.x = lerp(cm.x, clamp(focus, half, WORLD_W - half), 0.1);
    const ty = Math.min(0, Math.min(a.y, b.y) + 200) * 0.35; cm.y = lerp(cm.y, this.ultCin ? -60 : ty, 0.1);
  }

  // ---------------- Render ----------------
  render(c) {
    const cm = this.cam;
    c.save();
    const sx = FX.shake ? rand(-FX.shake, FX.shake) : 0, sy = FX.shake ? rand(-FX.shake, FX.shake) : 0;
    c.translate(sx, sy);
    this.drawArena(c);
    // world transform
    c.save(); c.translate(W / 2, FLOOR_S - cm.y * cm.z); c.scale(cm.z, cm.z); c.translate(-cm.x, 0);
    for (const p of FX.parts) if (p.soft) { c.globalAlpha = p.life / p.max; c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (2 - p.life / p.max), 0, 7); c.fill(); }
    c.globalAlpha = 1;
    const order = [...this.f].sort((p, q) => (p.state === 'attack' || p.state === 'ultrun' ? 1 : 0) - (q.state === 'attack' || q.state === 'ultrun' ? 1 : 0));
    for (const f of order) { f.draw(c, this); if (f.state === 'attack' && f.move?.render) f.move.render(c, f, f.mt); }
    for (const p of this.projs) p.draw(c);
    for (const p of FX.parts) {
      if (p.soft) continue; c.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      if (p.ch) { c.font = `${p.size}px "Press Start 2P"`; c.fillStyle = p.color; c.textAlign = 'center'; c.fillText(p.ch, p.x, p.y); }
      else if (p.streak) { c.strokeStyle = p.color; c.lineWidth = p.size; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); c.stroke(); }
      else { c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    }
    c.globalAlpha = 1;
    for (const t of FX.texts) {
      c.globalAlpha = Math.min(1, t.life / 15); c.font = `${Math.round(t.size * t.scale)}px "${t.font}"`; c.textAlign = 'center';
      c.lineWidth = t.size > 30 ? 8 : 5; c.strokeStyle = t.stroke; c.lineJoin = 'round'; c.strokeText(t.text, t.x, t.y); c.fillStyle = t.color; c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;
    if (DEBUG) for (const f of this.f) { const h = f.hurtbox(); if (h) { c.strokeStyle = '#0f0'; c.strokeRect(h.x, h.y, h.w, h.h); } const hb = f.hitbox(); if (hb) { c.strokeStyle = '#f00'; c.strokeRect(hb.x, hb.y, hb.w, hb.h); } }
    c.restore();
    // think overlay
    for (const f of this.f) if (f.status.think) { c.font = '22px "Press Start 2P"'; c.fillStyle = `rgba(255,176,0,${0.12 + 0.08 * Math.sin(this.frame / 6)})`; for (let i = 0; i < 6; i++) c.fillText('THINKING...', ((this.frame * 2 + i * 260) % (W + 300)) - 300, 150 + i * 90); }
    if (this.ultCin) this.drawUltCin(c);
    c.restore();
    if (FX.flash > 0) { c.fillStyle = FX.flashColor; c.globalAlpha = FX.flash / 10; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    if (FX.glitch > 0) this.drawGlitch(c);
    UltFX.draw(c, this, 'front');
    drawCRT(c);
    this.drawWinQuote(c);
    this.drawHUD(c);
    drawAnnouncer(c);
  }
  drawArena(c) {
    const img = ASSETS.arenas[this.arena.id], cm = this.cam, fl = ARENA_FLOOR[this.arena.id] || 0.85;
    if (!img) { c.fillStyle = '#111'; c.fillRect(0, 0, W, H); return; }
    const bz = 1 + (cm.z - 1) * 0.45, bw = Math.max(1500, W + 80) * bz, bh = bw * img.height / img.width;
    const floorY = fl * bh, by = FLOOR_S - floorY - cm.y * cm.z * 0.6;
    let bx = W / 2 - bw / 2 - (cm.x - WORLD_W / 2) * 0.33 * cm.z; bx = clamp(bx, W - bw, 0);
    const drawY = Math.min(0, Math.max(H - bh, by)); c.drawImage(img, bx, drawY, bw, bh);
    const midS = W / 2 + (((this.f[0].x + this.f[1].x) / 2) - cm.x) * cm.z;
    drawCrowd(c, this.frame, this.hitstop > 6 || FX.slowmo > 0 || this.f.some(f => f.combo >= 4 || f.state === 'ultrun'), drawY + (ARENA_BACK[this.arena.id] || 0.75) * bh + 8, midS, this.arena.id);
    // floor gloss + vignette
    const g = c.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
    // front-row crowd signs
    if (this.ultCin || this.f.some(f => f.state === 'ultrun')) { c.fillStyle = 'rgba(5,0,20,0.55)'; c.fillRect(0, 0, W, H); }
    UltFX.draw(c, this, 'back');
  }
  drawUltCin(c) {
    const u = this.ultCin, t = u.t, f = u.f;
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 0, W, H);
    const slide = Math.min(1, t / 10), out = t > 58 ? (t - 58) / 12 : 0;
    const y = 250, hh = 220; c.save(); c.translate((1 - slide) * (f.side ? W : -W) + out * (f.side ? -W : W), 0);
    const g = c.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, f.cfg.color); g.addColorStop(1, '#000'); c.fillStyle = g;
    c.beginPath(); c.moveTo(0, y + 30); c.lineTo(W, y); c.lineTo(W, y + hh - 30); c.lineTo(0, y + hh); c.fill();
    c.globalAlpha = 0.25; c.font = '60px Bungee'; c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) c.fillText(u.name + ' ' + u.name, -((t * 12 + i * 300) % 900), y + 60 + i * 45); c.globalAlpha = 1;
    const img = ASSETS.sprites[f.id].ult, m = f.meta.ult, s = 300 / m[1];
    c.save(); c.translate(f.side ? W - 260 : 260, y + hh + 20); c.scale((f.side ? -1 : 1) * s, s); c.drawImage(img, -m[3], -m[2]); c.restore();
    c.font = '78px Bungee'; c.textAlign = f.side ? 'left' : 'right'; c.lineWidth = 10; c.strokeStyle = '#000'; const tx = f.side ? 90 : W - 90;
    c.strokeText(u.name, tx, y + 135); c.fillStyle = '#fff'; c.fillText(u.name, tx, y + 135);
    c.font = '18px "Press Start 2P"'; c.fillStyle = '#FFD23F'; c.fillText('ULTIMATE · 100 COMPUTE', tx, y + 175);
    if (ULT_QUOTES[f.id]) bubble(c, f.side ? W - 420 : 60, y - 110, 360, ULT_QUOTES[f.id], t * 1.6, !!f.side);
    c.restore(); c.textAlign = 'left';
  }
  drawGlitch(c) {
    for (let i = 0; i < 6; i++) { const y = rand(0, H), h = rand(4, 30); c.drawImage(cv, OX, OY + y * DPR, W * DPR, h * DPR, rand(-30, 30), y, W, h); }
    c.fillStyle = `rgba(255,0,60,${FX.glitch / 200})`; c.fillRect(0, 0, W, H);
  }
  drawHUD(c) {
    const [a, b] = this.f;
    c.save();
    const g = c.createLinearGradient(0, 0, 0, 130); g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 130);
    for (const f of this.f) this.drawBar(c, f);
    // timer
    const secs = Math.ceil(this.time / 60);
    bevel(c, W / 2 - 52, 14, 104, 70, { fill: '#0b0d18', border: '#000' });
    chrome(c, String(secs).padStart(2, '0'), W / 2, 72, 52, { italic: false, font: 'Russo One', tone: secs <= 10 ? 'red' : 'silver' });
    c.font = '7px "Press Start 2P"'; c.fillStyle = '#aaa'; c.textAlign = 'center'; c.fillText(this.arena.name, W / 2, 98);
    if (this.time < 50 * 60 && this.phase === 'fight') { const rot = Math.min(99, Math.round((50 * 60 - this.time) / (50 * 60) * 100 + 40)); c.fillStyle = `rgba(255,120,120,${0.5 + 0.3 * Math.sin(this.frame / 12)})`; c.fillText(`CONTEXT ROT ${rot}%`, W / 2, 124); }
    // combo counters
    Ann.combo.forEach((cb, side) => {
      if (!cb) return; const x = side ? W - 60 : 60, al = cb.done ? Math.max(0, 1 - (cb.t - 30) / 60) : 1, pop = 1 + Math.max(0, 0.4 - cb.t * 0.05);
      c.save(); c.globalAlpha = al; c.translate(x, 250); c.scale(pop, pop); c.textAlign = side ? 'right' : 'left';
      c.font = '64px Bungee'; c.lineWidth = 8; c.strokeStyle = '#000'; c.strokeText(cb.n, 0, 0); c.fillStyle = '#FFD23F'; c.fillText(cb.n, 0, 0);
      const name = (COMBO_NAMES.find(([n]) => cb.n >= n) || [0, 'TOOL CALLS'])[1];
      c.font = '16px "Press Start 2P"'; c.lineWidth = 5; c.strokeText(cb.n < 3 ? 'TOOL CALLS' : name, 0, 30); c.fillStyle = '#fff'; c.fillText(cb.n < 3 ? 'TOOL CALLS' : name, 0, 30);
      c.font = '10px "Press Start 2P"'; c.fillStyle = '#7CFFB2'; c.fillText(`${cb.n} TOOL CALLS`, 0, 50); c.restore();
    });
    // caption ticker
    if (Ann.captionT > 0 && Ann.caption) {
      const al = Math.min(1, Ann.captionT / 20), maxW = W - 160; c.globalAlpha = al;
      let fs = 14; c.font = `${fs}px "Press Start 2P"`;
      // wrap to at most 2 lines, shrink if still too long
      const wrap = () => { const words = Ann.caption.split(' '); const L = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW - 40 && line) { L.push(line); line = w; } else line = t; } if (line) L.push(line); return L; };
      let lines = wrap(); while (lines.length > 2 && fs > 9) { fs--; c.font = `${fs}px "Press Start 2P"`; lines = wrap(); }
      const tw = Math.min(maxW, Math.max(...lines.map(l => c.measureText(l).width)) + 60), lh = fs + 10, bh = lines.length * lh + 16, by = H - 22 - bh;
      c.fillStyle = 'rgba(10,10,20,0.88)'; c.fillRect(W / 2 - tw / 2, by, tw, bh); c.fillStyle = '#ff2a55'; c.fillRect(W / 2 - tw / 2, by, 8, bh);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => c.fillText(l, W / 2 + 4, by + 8 + lh / 2 + i * lh)); c.textBaseline = 'alphabetic'; c.globalAlpha = 1;
      c.font = '8px "Press Start 2P"'; c.fillStyle = '#ff2a55'; c.fillText('● LIVE COMMENTARY', W / 2, by - 6);
    }
    c.restore();
  }
  drawWinQuote(c) {
    const q = this.winQuote; if (!q) return; q.t++;
    const f = q.f, cm = this.cam, sx = W / 2 + (f.x - cm.x) * cm.z, sy = FLOOR_S + (f.y - f.h - cm.y) * cm.z;
    const bw = 360, x = clamp(sx - bw / 2, 20, W - bw - 20), y = clamp(sy - 150, 120, H - 260);
    bubble(c, x, y, bw, q.text, q.t, sx < x + bw / 2);
  }
  drawBar(c, f) {
    // on touch screens keep clear of the BACK / START buttons in the corners
    const IN = Touch.active ? 118 : 0, L = f.side === 0, bw = Math.min(470, W / 2 - 64 - 92 - IN), bh = 22, y = 30, x = L ? 92 : W - 92 - bw;
    c.save(); c.translate(L ? IN : -IN, 0); this.drawBar2(c, f, L, bw, bh, y, x); c.restore();
  }
  drawBar2(c, f, L, bw, bh, y, x) {
    // portrait
    const pi = ASSETS.sprites[f.id].idle, pm = f.meta.idle, ps = 66 / Math.max(pm[0], pm[1]);
    bevel(c, L ? 12 : W - 12 - 72, 12, 72, 72, { fill: '#10121e', border: f.cfg.color });
    c.save(); c.beginPath(); c.rect(L ? 12 : W - 84, 12, 72, 72); c.clip(); c.translate(L ? 48 : W - 48, 50); c.scale((L ? 1 : -1) * ps, ps); c.drawImage(pi, -pm[0] / 2, -pm[1] / 2); c.restore();
    // frame: black, chrome bevel, inner dark
    c.fillStyle = '#000'; c.fillRect(x - 5, y - 5, bw + 10, bh + 10);
    const fg = c.createLinearGradient(0, y - 3, 0, y + bh + 3); fg.addColorStop(0, '#f4f6fa'); fg.addColorStop(0.5, '#6b7280'); fg.addColorStop(1, '#d9dde5'); c.fillStyle = fg; c.fillRect(x - 3, y - 3, bw + 6, bh + 6);
    c.fillStyle = '#1a0000'; c.fillRect(x, y, bw, bh);
    const pct = clamp(f.shownTokens / MAX_TOKENS, 0, 1), tr = clamp(f.trailTokens / MAX_TOKENS, 0, 1), crit = pct < 0.2;
    c.fillStyle = '#e01010'; if (L) c.fillRect(x + bw * (1 - tr), y, bw * tr, bh); else c.fillRect(x, y, bw * tr, bh);
    const gr = c.createLinearGradient(0, y, 0, y + bh);
    if (crit && this.frame % 16 < 8) { gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#ff8080'); } else { gr.addColorStop(0, '#fffbd0'); gr.addColorStop(0.35, '#ffe23f'); gr.addColorStop(0.65, '#f0b000'); gr.addColorStop(1, '#a86a00'); }
    c.fillStyle = gr; if (L) c.fillRect(x + bw * (1 - pct), y, bw * pct, bh); else c.fillRect(x, y, bw * pct, bh);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, y + 2, bw, 4);
    c.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 1; i < 8; i++) c.fillRect(x + bw * i / 8, y, 2, bh);
    // name under bar (Tekken), tokens readout
    chrome(c, f.cfg.name, L ? x : x + bw, y + bh + 30, 22, { align: L ? 'left' : 'right', tone: 'silver' });
    c.font = '9px "Press Start 2P"'; c.textAlign = L ? 'right' : 'left'; c.lineWidth = 4; c.strokeStyle = '#000';
    const tt = `${fmt(Math.max(0, f.shownTokens))} TOKENS`; const tx = L ? x + bw : x; c.strokeText(tt, tx, y + bh + 16); c.fillStyle = crit ? '#ff6060' : '#FFD23F'; c.fillText(tt, tx, y + bh + 16);
    // WIN lamps
    for (let i = 0; i < 2; i++) { const wx = L ? x + bw - 34 - i * 40 : x + 6 + i * 40, wy = y + bh + 22; const on = f.wins > i; bevel(c, wx, wy, 32, 14, { fill: on ? '#ffd23f' : '#1a1a1a' }); c.font = '7px "Press Start 2P"'; c.fillStyle = on ? '#000' : '#444'; c.textAlign = 'center'; c.fillText('WIN', wx + 16, wy + 10); }
    // compute (below)
    const cw = 250, cx0 = L ? x : x + bw - cw, cy = y + bh + 42;
    c.fillStyle = '#000'; c.fillRect(cx0 - 2, cy - 2, cw + 4, 12);
    const cp = f.compute / MAX_COMPUTE, full = f.compute >= 100;
    const cg = c.createLinearGradient(0, cy, 0, cy + 8); if (full) { cg.addColorStop(0, '#fff'); cg.addColorStop(1, `hsl(${(this.frame * 8) % 360},100%,55%)`); } else { cg.addColorStop(0, '#bff0ff'); cg.addColorStop(1, '#1a7ad0'); }
    c.fillStyle = cg; if (L) c.fillRect(cx0, cy, cw * cp, 8); else c.fillRect(cx0 + cw * (1 - cp), cy, cw * cp, 8);
    c.fillStyle = '#000'; for (let i = 1; i < 4; i++) c.fillRect(cx0 + cw * i / 4, cy, 2, 8);
    c.font = '7px "Press Start 2P"'; c.textAlign = L ? 'left' : 'right'; c.fillStyle = full ? '#fff' : '#6cc8ff';
    c.fillText(full ? 'COMPUTE MAX — ULTIMATE READY' : `COMPUTE ${Math.floor(f.compute)} TFLOPS`, L ? cx0 : cx0 + cw, cy + 20);
    const tags = []; if (f.status.think) tags.push(['THINKING', '#ffb000']); if (f.status.rate) tags.push(['429', '#ff5555']); if (f.status.slowmo) tags.push(['TOKENIZING…', '#E551BA']); if (f.status.inject) tags.push(['INJECTED', '#ff4fd8']); if (f.state === 'ultrun') tags.push([f.cfg.ult.name, f.cfg.color]);
    tags.forEach(([t, col], i) => { c.font = '9px "Press Start 2P"'; const tw = c.measureText(t).width + 12, tx2 = L ? cx0 + cw + 12 + i * 110 : cx0 - 12 - tw - i * 110; c.fillStyle = col; c.fillRect(tx2, cy - 3, tw, 15); c.fillStyle = '#000'; c.textAlign = 'left'; c.fillText(t, tx2 + 6, cy + 9); });
  }
}
let DEBUG = false;
const ARENA_FLOOR = { colosseum: 0.86, datacenter: 0.82, distillation: 0.86, feed: 0.93, basement: 0.84, hackerhouse: 0.86, goldengate: 0.87, singularity: 0.84, hearing: 0.86, boardroom: 0.86, leaderboard: 0.86, tesla: 0.86, h100: 0.86, graveyard: 0.86, demoday: 0.86, waitlist: 0.86, burningman: 0.86 };

function drawAnnouncer(c) {
  const b = Ann.big; if (!b) return;
  const t = b.t, inT = Math.min(1, t / 8), outT = t > b.dur - 12 ? (b.dur - t) / 12 : 1;
  const s = (1 + (1 - inT) * 1.5) * (t > b.dur - 12 ? 1 + (1 - outT) * 0.3 : 1);
  const tone = b.color === '#ff4040' || b.color === '#ff4fd8' ? 'red' : b.color === '#fff' ? 'silver' : b.color === '#3ad0ff' ? 'blue' : 'gold';
  c.save(); c.globalAlpha = Math.max(0, Math.min(inT, outT)); c.translate(W / 2, H / 2 - 20); c.scale(s, s); c.rotate(-0.03);
  const fs = chrome(c, b.text, 0, b.size * 0.35, b.size, { tone, maxW: W * 0.9 });
  if (b.sub) { c.font = '18px "Press Start 2P"'; c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(b.sub, 0, fs * 0.35 + 40); c.fillStyle = '#fff'; c.fillText(b.sub, 0, fs * 0.35 + 40); }
  c.restore();
}
function shade(hex) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * 0.45, g = ((n >> 8) & 255) * 0.45, b = (n & 255) * 0.45; return `rgb(${r | 0},${g | 0},${b | 0})`; }

// Crowd: AI leaders & scientists at the back of the stage, side profile, watching the carnage.
const CROWD_IDS = ['jensen', 'sam', 'elon', 'zuck', 'dario', 'demis', 'satya', 'sundar', 'lisa', 'karpathy', 'lecun', 'ilya'];
const HANDS = {"dario":[-0.364,0.099,0.302,0.111],"demis":[-0.323,0.093,0.34,0.05],"elon":[-0.309,0.102,0.4,0.102],"eng0":[-0.309,0.064,0.392,0.029],"eng10":[-0.304,0.074,0.4,0.03],"eng11":[-0.189,0.044,0.366,0.03],"eng1":[-0.321,0.117,0.353,0.029],"eng2":[-0.281,0.029,0.391,0.092],"eng3":[-0.313,0.054,0.361,0.093],"eng4":[-0.329,0.056,0.325,0.031],"eng5":[-0.334,0.03,0.363,0.041],"eng6":[-0.34,0.13,0.298,0.049],"eng7":[-0.317,0.03,0.396,0.034],"eng8":[-0.317,0.05,0.463,0.103],"eng9":[-0.26,0.18,0.325,0.052],"ilya":[-0.371,0.11,0.395,0.14],"jensen":[-0.325,0.065,0.394,0.094],"karpathy":[-0.307,0.125,0.426,0.184],"lecun":[-0.39,0.087,0.293,0.089],"lisa":[-0.314,0.121,0.424,0.114],"sam":[-0.314,0.124,0.394,0.092],"satya":[-0.351,0.079,0.318,0.133],"sundar":[-0.365,0.118,0.424,0.145],"zuck":[-0.323,0.135,0.276,0.064]};
const CROWD_SIGNS = { jensen: 'BUY MORE GPUS', sam: 'AGI 2027 (PROBABLY)', elon: 'GROK IS BASED', zuck: 'OPEN WEIGHTS!', dario: 'WE MUST PACE THE FRONTIER', demis: 'SOLVE INTELLIGENCE', satya: 'COPILOT EVERYWHERE', sundar: 'GEMINI 4 SOON', lisa: 'MI400 > H100', karpathy: 'VIBE CODED', lecun: 'LLMS ARE NOT AGI', ilya: 'FEEL THE AGI' };
const ENG_SIGNS = ['EXFOLIATE!', 'MOLTBOOK > TWITTER', 'H100 LOL', 'RALPH WIGGUM WAS RIGHT', '9.11 > 9.9', 'STRAWBERRY: 2 Rs', 'CONTEXT ROT IS REAL', 'SHIP IT', 'LGTM', 'IT WORKS ON MY GPU', 'WILL CODE FOR H100S', 'MY PR IS STILL OPEN', 'TEAM LOCAL', '429 LOL', 'ATTENTION IS ALL', 'VIBE CODED'];
const ENG = Array.from({ length: 26 }, (_, i) => ({ id: 'eng' + (i % 12), x: 20 + i * 49, lo: 20, u: i / 25, j: rand(-8, 8), ph: rand(0, 6), s: rand(0.85, 1.0), cheerT: 0, sign: i % 6 === 3 ? ENG_SIGNS[(i / 6 | 0) % ENG_SIGNS.length] : null }));
const CROWD = (() => { const order = [...CROWD_IDS].sort(() => Math.random() - 0.5); return order.map((id, i) => ({ id, x: 60 + i * 105, lo: 60, u: i / (order.length - 1), j: rand(-10, 10), ph: rand(0, 6), sign: id === 'dario' || (i % 3 === 1 && id !== order[i - 1]) ? CROWD_SIGNS[id] : null, s: rand(0.94, 1.06), cheerT: 0 })); })();
const ARENA_BACK = { colosseum: 0.8, datacenter: 0.66, distillation: 0.74, feed: 0.87, basement: 0.72, hackerhouse: 0.72, goldengate: 0.76, singularity: 0.76, hearing: 0.67, boardroom: 0.7, leaderboard: 0.76, tesla: 0.7, h100: 0.76, graveyard: 0.76, demoday: 0.72, waitlist: 0.76, burningman: 0.76 };
// Strollers: now and then an engineer wanders across the back (coffee, laptop, energy drink...) with a real walk cycle.
const STROLL = { list: [], next: 240 };
function drawStrollers(c, backY) {
  if (--STROLL.next <= 0 && STROLL.list.length < 2) { const dir = Math.random() < 0.5 ? 1 : -1; STROLL.list.push({ id: pick([0, 2, 5, 7]), x: dir > 0 ? -40 : W + 40, dir, speed: rand(0.7, 1.1), dist: 0 }); STROLL.next = Math.floor(rand(360, 900)); }
  for (const s of STROLL.list) {
    s.x += s.dir * s.speed; s.dist += s.speed;
    const hgt = 60, step = Math.floor(s.dist / (hgt * 0.3)) % 4, img = ASSETS.crowd[`eng${s.id}_w${step}`]; if (!img) continue;
    const sc = hgt / img.height, bob = step % 2 ? -1.5 : 0;
    c.save(); c.translate(s.x, backY - 6 + bob); c.scale(s.dir * sc, sc); c.filter = 'brightness(0.6) saturate(0.85)'; c.drawImage(img, -img.width / 2, -img.height); c.restore(); c.filter = 'none';
  }
  STROLL.list = STROLL.list.filter(s => s.x > -60 && s.x < W + 60);
}
// Stadium grandstand: two tiers (engineers back/up, leaders front) + scrolling LED ad boards hiding everyone's feet.
const STAND_ACCENT = { colosseum: '#7CFF3A', distillation: '#ffb000', feed: '#3ab4ff', basement: '#ff3af0', hackerhouse: '#ffd23f', goldengate: '#ff6a2a', singularity: '#b06aff', hearing: '#d9b35a', boardroom: '#9ad8ff', leaderboard: '#ffd23f', tesla: '#ff3a3a', h100: '#76b900', graveyard: '#7CFFB2', demoday: '#ff8a00', waitlist: '#ff3a3a', burningman: '#ff9a3a' };
const ADS = '  TOKKEN.WIN  ✦  © 1997-2026 TOKKEN ENTERTAINMENT INC. ALL RIGHTS RESERVED (ISH)  ✦  H100s IN STOCK (NOT REALLY)  ✦  POWERED BY AN UNSUSTAINABLE BURN RATE  ✦  YOUR DATA MAY BE USED FOR TRAINING  ✦  NOW WITH 40% MORE HALLUCINATIONS  ✦  BUY MORE GPUS  ✦  AGI: 6 MONTHS AWAY  ✦  ';
function tier(c, y, h, acc) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#5a6078'); g.addColorStop(0.15, '#343a52'); g.addColorStop(1, '#10121c'); c.fillStyle = g; c.fillRect(0, y, W, h);
  c.fillStyle = acc; c.globalAlpha = 0.85; c.fillRect(0, y, W, 2); c.globalAlpha = 0.25; c.fillRect(0, y + 2, W, 3); c.globalAlpha = 1;   // glowing step lip
  c.fillStyle = acc; c.globalAlpha = 0.55; for (let x = 12; x < W; x += 48) c.fillRect(x, y + 5, 14, 2); c.globalAlpha = 1;   // step lights
  c.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 0; x < W; x += 96) c.fillRect(x, y + 2, 2, h - 2);  // riser seams
}
function adBoard(c, y, frame, acc) {
  const h = 20; c.fillStyle = '#05060a'; c.fillRect(0, y, W, h); c.fillStyle = '#2a2d3a'; c.fillRect(0, y, W, 2); c.fillRect(0, y + h - 2, W, 2);
  c.save(); c.beginPath(); c.rect(0, y + 2, W, h - 4); c.clip(); c.font = '10px "Press Start 2P"'; c.textBaseline = 'middle'; c.textAlign = 'left';
  const tw = c.measureText(ADS).width, off = (frame * 1.2) % tw; c.shadowColor = acc; c.shadowBlur = 6; c.fillStyle = acc;
  for (let x = -off; x < W; x += tw) c.fillText(ADS, x, y + h / 2 + 1); c.restore();
  c.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 0; x < W; x += 3) c.fillRect(x, y + 2, 1, h - 4);       // LED dot-matrix grille
  c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, y + 2, W, 4);
}
function drawCrowd(c, frame, excited, backY, midX, arenaId) {
  const acc = STAND_ACCENT[arenaId] || '#ffd23f';
  tier(c, backY - 26, 40, acc);                                                        // back tier (engineers)
  drawRow(c, ENG, frame, excited, backY - 24, midX, 58, 'brightness(0.55) saturate(0.8)', CROWD.filter(p => p.sign).map(p => p.x));
  tier(c, backY - 8, 34, acc);                                                         // front tier (leaders + strollers)
  drawStrollers(c, backY - 4);
  drawRow(c, CROWD, frame, excited, backY + 2, midX, 80, 'brightness(0.85)');
  adBoard(c, backY - 6, frame, acc);                                                   // ad boards hide everyone's feet
  const sh = c.createLinearGradient(0, backY + 14, 0, backY + 40); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sh; c.fillRect(0, backY + 14, W, 26);
}
function drawRow(c, row, frame, excited, backY, midX, base, filter, avoid = []) {
  for (const p of row) {
    if (p.u != null) p.x = p.lo + p.u * (W - 2 * p.lo - 40) + p.j;   // spread across the current view width
    if (excited && Math.random() < 0.08) p.cheerT = 40 + rand(0, 40);
    if (!excited && Math.random() < 0.002) p.cheerT = 30;
    if (p.cheerT > 0) p.cheerT--;
    const pose = p.cheerT > 0 ? 1 : 0, img = ASSETS.crowd[p.id + '_' + pose]; if (!img) continue;
    const hgt = base * p.s, s = hgt / img.height, hop = p.cheerT > 0 ? Math.abs(Math.sin(frame / 5 + p.ph)) * 8 : Math.sin(frame / 30 + p.ph) * 1.2;
    const face = p.x < midX ? 1 : -1; // turn toward the fight
    const top = backY - hop - hgt;
    let banner = null;
    if (p.sign && !avoid.some(x => Math.abs(x - p.x) < 180)) { // sign on a stick planted in the platform beside its fan, each leaning its own way
      const iw = img.width * s, side = (p.ph * 10 | 0) % 2 ? 1 : -1, bx = p.x + side * iw * 0.42, by = backY + 2;
      const tilt = ((p.ph * 7) % 1 - 0.5) * 0.35 + Math.sin(frame / 26 + p.ph) * 0.03, len = hgt + 14;
      const tx = bx + Math.sin(tilt) * len, ty = by - Math.cos(tilt) * len;
      c.strokeStyle = '#6b4a24'; c.lineWidth = 3; c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(bx - 4, by - 1, 8, 2);   // where it's jammed into the platform
      c.font = '7px "Press Start 2P"'; const tw = c.measureText(p.sign).width + 10, bh = 16;
      banner = () => { c.save(); c.translate(tx, ty); c.rotate(tilt); c.font = '7px "Press Start 2P"';
        c.fillStyle = '#f4f1e8'; c.fillRect(-tw / 2, -bh, tw, bh); c.strokeStyle = '#000'; c.lineWidth = 2; c.strokeRect(-tw / 2, -bh, tw, bh);
        c.fillStyle = '#111'; c.textAlign = 'center'; c.fillText(p.sign, 0, -5); c.restore(); };
    }
    c.save(); c.translate(p.x, backY - hop); c.scale(face * s, s * (1 + Math.sin(frame / 22 + p.ph) * 0.01)); c.filter = filter; c.drawImage(img, -img.width / 2, -img.height); c.restore(); c.filter = 'none';
    if (banner) banner();
  }
}

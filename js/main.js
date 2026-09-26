// TOKKEN — scenes, CPU, main loop.
const ctrls = [new Input.Controller(0), new Input.Controller(1)];
let scene = 'loading', loadPct = 0, match = null, sceneT = 0, frame = 0;
const menu = { idx: 0, items: ['VS CPU', 'LOCAL VERSUS', 'ONLINE', 'RANKINGS', 'OPTIONS', 'CONTROLS'] };
const OPT = { cpu: 1, crt: true };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('tokken.opt') || '{}')); } catch (e) {}
const saveOpt = () => { try { localStorage.setItem('tokken.opt', JSON.stringify(OPT)); } catch (e) {} };
const CPU_LEVELS = [['EASY', 0.35], ['NORMAL', 0.62], ['HARD', 0.85], ['AGI', 1.0]];
const OPTROWS = [['MASTER', 'master'], ['MUSIC', 'music'], ['SFX', 'sfx'], ['ANNOUNCER', 'announcer'], ['COMMENTARY', 'commentary'], ['CHARACTER VOICES', 'voices'], ['CPU DIFFICULTY', 'cpu'], ['CRT SCANLINES', 'crt'], ['BACK', 'back']];
const optUI = { idx: 0 };
const nameUI = { buf: '', after: null };
function reportMatch() {
  const mode = sel.online ? 'online' : sel.cpu ? 'cpu' : 'local'; if (mode === 'local' || !match || match.reported) return; match.reported = true;
  const i = sel.online ? me() : 0, f = match.f[i], o = match.f[1 - i];
  const info = { fighter: f.id, opponent: o.id, mode, diff: OPT.cpu, won: match.winner === f, perfect: (match.perfects || [0, 0])[i] > 0, combo: f.stats.maxCombo };
  if (!Board.st.name) { nameUI.buf = ''; nameUI.after = () => Board.submit(info); scene = 'name'; sceneT = 0; return; }
  Board.submit(info);
}
addEventListener('keydown', e => {
  if (scene !== 'name') return;
  if (e.code === 'Enter' || e.code === 'NumpadEnter') nameUI.enter = true;
  else if (e.code === 'Backspace') nameUI.buf = nameUI.buf.slice(0, -1);
  else if (e.code === 'Space' && nameUI.buf.length < 12) nameUI.buf += ' ';
  else if (/^Key[A-Z]$|^Digit[0-9]$/.test(e.code) && nameUI.buf.length < 12) nameUI.buf += e.code.slice(-1);
  else if ((e.code === 'Minus' || e.code === 'Period') && nameUI.buf.length < 12) nameUI.buf += e.code === 'Minus' ? '-' : '.';
});
const localCtrl = new Input.Controller(0); localCtrl.bothKB = true;
const online = { mode: 'menu', idx: 0, typed: '', toast: '', toastT: 0, rematch: [false, false], seed: 0 };
const sel = { timer: 1800, cur: [0, 5], done: [false, false], cpu: false, arena: 0, stage: false, t: 0 };
let showControls = false, titleArmed = false;

// ---------------- CPU ----------------
class CPU {
  constructor(level = 0.6) { this.out = {}; this.level = level; this.t = 0; this.plan = null; this.planT = 0; this.react = 0; }
  think(me, opp, g) {
    this.t++; const o = {}; this.out = o;
    if (!g || g.phase !== 'fight' || me.state === 'ko') return;
    const dx = opp.x - me.x, dist = Math.abs(dx), toward = dx > 0 ? 'right' : 'left', away = dx > 0 ? 'left' : 'right';
    // react to threats: block incoming attacks / projectiles
    const oppAttacking = opp.state === 'attack' && opp.move && opp.mt <= (opp.move.startup + opp.move.active) && dist < 330;
    const projIncoming = g.projs.some(p => p.owner === opp && Math.abs(p.x - me.x) < 260 && Math.sign(me.x - p.x) === Math.sign(p.vx || 1));
    if ((oppAttacking || projIncoming) && Math.random() < this.level * 0.9 && me.free) {
      if (this.react <= 0) this.react = 3 + Math.floor(Math.random() * 6);
      if (--this.react <= 0 || this.planT > 0) { o[away] = true; if (opp.move?.low || (!projIncoming && Math.random() < 0.3)) o.down = true; this.plan = 'block'; this.planT = 12; }
    }
    if (this.planT > 0) { this.planT--; if (this.plan === 'block') { o[away] = true; return; } if (this.plan === 'walk') o[toward] = true; if (this.plan === 'back') o[away] = true; if (this.plan === 'crouch') o.down = true; return; }
    if (!me.free || this.t % Math.round(9 - this.level * 5) !== 0) { if (me.state === 'attack' && me.hitDone && Math.random() < this.level * 0.7) o[pick(['light', 'heavy', 'special'])] = true; return; }
    const r = Math.random();
    if (me.compute >= 100 && dist < 500 && r < 0.5) { o.ult = true; return; }
    if (dist > 420) {
      if (me.compute >= 25 && r < 0.18) o.slop = true;
      else if (r < 0.28 && me.cd <= 0 && ['beam', 'cite', 'gen', 'inject', 'fork', 'distill', 'search'].includes(me.cfg.special.kind)) o.special = true;
      else if (r < 0.36) { o.up = true; o[toward] = true; }
      else if (r < 0.46) o.dash = true;
      else { this.plan = 'walk'; this.planT = 14; }
    } else if (dist > 180) {
      if (r < 0.3) { this.plan = 'walk'; this.planT = 8; }
      else if (r < 0.42 && me.cd <= 0) o.special = true;
      else if (r < 0.52) { o.up = true; o[toward] = true; }
      else if (r < 0.6 && me.compute >= 25) o.slop = true;
      else if (r < 0.7) o.dash = true;
      else { this.plan = 'walk'; this.planT = 6; }
    } else {
      if (r < 0.32) o.light = true;
      else if (r < 0.5) { o.down = true; o.light = true; }
      else if (r < 0.64) o.heavy = true;
      else if (r < 0.72 && me.cd <= 0) o.special = true;
      else if (r < 0.8) { this.plan = 'back'; this.planT = 10; }
      else if (r < 0.88) { this.plan = 'block'; this.planT = 16; }
      else { o.up = true; o[toward] = true; }
    }
  }
}

// ---------------- Scenes ----------------
function startMatch(seed) {
  const cpu = sel.cpu && !sel.online;
  gseed(seed ?? Math.floor(Math.random() * 2 ** 31));
  if (sel.online) { ctrls[0].cpu = { out: {} }; ctrls[1].cpu = { out: {} }; ctrls[0].alsoPad = null; ctrls.forEach(c => { c.cur = {}; c.prev = {}; c.pressT = {}; c.frame = 0; }); Net.resetFrames(online.delay ?? 1); online.rematch = [false, false]; update.paused = false; }
  else { ctrls[0].cpu = null; ctrls[1].cpu = cpu ? new CPU(CPU_LEVELS[OPT.cpu][1]) : null; ctrls[0].alsoPad = cpu ? 1 : null; ctrls[0].bothKB = !!cpu; }
  match = new Match(ROSTER[sel.cur[0]], ROSTER[sel.cur[1]], ARENAS[sel.arena], ctrls, cpu);
  scene = 'fight'; sceneT = 0; Audio.startMusic('battle');
}
function preloadMatch(a, b, arena) {
  const ids = [a, b], whyk = ids.flatMap(id => FIGHTERS[id].ko.map(r => 'why_' + r.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')));
  return Audio.ensure(k => ids.some(id => k.startsWith(`v_${id}_`) || k.startsWith(`f_${id}_`) || k === `name_${id}` || k === `wins_${id}` || k === `ult_${id}`) || whyk.includes(k) || k === `a_${arena}` || k.startsWith(`m_${a}_${b}_`) || k.startsWith(`m_${b}_${a}_`) || k === 'music_battle');
}
function toVS() {
  Audio.stopVoices();
  preloadMatch(ROSTER[sel.cur[0]], ROSTER[sel.cur[1]], ARENAS[sel.arena].id);
  scene = 'vs'; sceneT = 0; Audio.duck(0.05, 3000);
  const a = FIGHTERS[ROSTER[sel.cur[0]]], b = FIGHTERS[ROSTER[sel.cur[1]]];
  if (Audio.has('versus')) Audio.seq([`name_${ROSTER[sel.cur[0]]}`, 'versus', `name_${ROSTER[sel.cur[1]]}`], 0.25); else Audio.say(`${a.name}... versus... ${b.name}.`, { force: true, interrupt: true });
  Audio.startMusic('title');
}

const me = () => Net.st.role === 'host' ? 0 : 1;
function enterOnlineSelect() { sel.online = true; sel.cpu = false; sel.done = [false, false]; sel.stage = false; sel.timer = 30 * 60; scene = 'select'; sceneT = 0; Audio.startMusic('title'); vo('select', 'Select your agent'); }
function leaveOnline(msg) { Net.reset(); sel.online = false; ctrls.forEach(c => c.cpu = null); if (msg) { online.toast = msg; online.toastT = 240; } scene = 'title'; titleArmed = true; online.mode = 'menu'; }
function stateHash() { let h = 0; for (const f of match.f) h = (h * 31 + Math.round(f.x * 10) + f.tokens * 7 + Math.round(f.compute * 10) + f.wins * 1000003) | 0; return (h * 31 + match.time + match.round) | 0; }
Net.on('connected', () => { if (scene === 'online') enterOnlineSelect(); });
Net.on('closed', () => { if (sel.online || scene === 'online') leaveOnline('OPPONENT DISCONNECTED'); });
const okIdx = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
Net.on('sel', d => { if (!okIdx(d.i, 2) || !okIdx(d.cur, ROSTER.length) || d.i === me()) return; sel.cur[d.i] = d.cur; sel.done[d.i] = !!d.done; });
Net.on('vis', d => { online.rivalHidden = !!d.hidden; });
Net.on('arena', d => { if (okIdx(d.arena, ARENAS.length)) sel.arena = d.arena; });
Net.on('go', d => { if (me() !== 1 || !Array.isArray(d.cur) || !d.cur.every(v => okIdx(v, ROSTER.length)) || !okIdx(d.arena, ARENAS.length) || !Number.isInteger(d.seed) || !okIdx(d.delay ?? 1, 3)) return; sel.cur = d.cur; sel.arena = d.arena; online.seed = d.seed; online.delay = d.delay ?? 1; online.rematch = [false, false]; toVS(); });
Net.on('bye', () => leaveOnline('OPPONENT LEFT'));
Net.on('rematch', d => { if (okIdx(d.i, 2) && d.i !== me()) online.rematch[d.i] = true; });
Net.on('toselect', () => { enterOnlineSelect(); });
addEventListener('keydown', e => {
  if (scene !== 'online' || online.mode !== 'join') return;
  if (e.code === 'Backspace') online.typed = online.typed.slice(0, -1);
  else if (/^Key[A-Z]$|^Digit[0-9]$/.test(e.code) && online.typed.length < 4) online.typed += e.code.slice(-1);
});

function updateStage(P) {
  const host = !sel.online || me() === 0, a0 = sel.arena, N = ARENAS.length, cols = 8;
  if (host) {
    if (P('left')) sel.arena = (sel.arena + N - 1) % N; if (P('right')) sel.arena = (sel.arena + 1) % N;
    if (P('up')) sel.arena = (sel.arena + N - cols) % N; if (P('down')) sel.arena = (sel.arena + cols) % N;
    if (a0 !== sel.arena) { Audio.S.move(); sel.stageT = 0; if (sel.online) Net.send({ t: 'arena', arena: sel.arena }); }
    if (P('special') || P('slop')) { sel.arena = Math.floor(Math.random() * N); Audio.S.select(); if (sel.online) Net.send({ t: 'arena', arena: sel.arena }); }
    if (P('confirm')) { Audio.S.select(); if (sel.online) { const seed = Math.floor(Math.random() * 2 ** 31); online.delay = Net.pickDelay(); Net.send({ t: 'go', cur: sel.cur, arena: sel.arena, seed, delay: online.delay }); online.seed = seed; } toVS(); return; }
  }
  if (P('cancel') && !sel.online) { sel.stage = false; sel.done = [false, false]; sel.timer = 30 * 60; scene = 'select'; }
}
function update() {
  frame++; sceneT++;
  const netFight = sel.online && scene === 'fight';
  if (!netFight) ctrls.forEach(c => { if (!(sel.online && c.cpu && !c.cpu.think)) c.poll(); });
  localCtrl.poll(); Input.endFrame();
  if (online.toastT > 0) online.toastT--;
  if (ctrls[1].cpu && ctrls[1].cpu.think && match && scene === 'fight' && !update.paused) ctrls[1].cpu.think(match.f[1], match.f[0], match);
  const humans = ctrls.filter(c => !c.cpu);   // menus only ever listen to humans (never the CPU's controller)
  const P = sel.online || scene === 'online' ? (b => localCtrl.pressed(b)) : (b => Input.anyPressed(humans, b));
  if (Input.keys.has('KeyM') && sceneT % 1 === 0 && !update.mLatch) { Audio.toggleMute(); } update.mLatch = Input.keys.has('KeyM');
  if (Input.keys.has('Backquote') && !update.dLatch) DEBUG = !DEBUG; update.dLatch = Input.keys.has('Backquote');

  if (scene === 'title') {
    if (showControls) { if (P('confirm') || P('cancel')) { showControls = false; Audio.S.select(); } return; }
    if (!titleArmed) { if (P('confirm')) { titleArmed = true; Audio.init(); Audio.S.select(); vo('title', ''); Audio.startMusic('title'); } return; }
    const NM = menu.items.length;
    if (P('up')) { menu.idx = (menu.idx + NM - 1) % NM; Audio.S.move(); }
    if (P('down')) { menu.idx = (menu.idx + 1) % NM; Audio.S.move(); }
    if (P('confirm')) {
      Audio.init(); Audio.S.select(); const item = menu.items[menu.idx];
      if (item === 'CONTROLS') { showControls = true; return; }
      if (item === 'OPTIONS') { scene = 'options'; optUI.idx = 0; sceneT = 0; return; }
      if (item === 'RANKINGS') { scene = 'rankings'; sceneT = 0; Board.refresh(); return; }
      if (item === 'ONLINE') { scene = 'online'; online.mode = 'menu'; online.idx = 0; sceneT = 0; return; }
      sel.online = false; ctrls.forEach(c => { c.cpu = null; c.bothKB = false; c.alsoPad = null; });
      sel.cpu = item === 'VS CPU'; ctrls[0].bothKB = sel.cpu; sel.done = [false, sel.cpu ? false : false]; sel.stage = false; sel.timer = 30 * 60; scene = 'select'; sceneT = 0; Audio.startMusic('title');
      vo('select', 'Select your agent');
    }
  } else if (scene === 'options') {
    const N = OPTROWS.length, [, key] = OPTROWS[optUI.idx];
    if (P('up')) { optUI.idx = (optUI.idx + N - 1) % N; Audio.S.move(); }
    if (P('down')) { optUI.idx = (optUI.idx + 1) % N; Audio.S.move(); }
    const d = P('right') ? 1 : P('left') ? -1 : 0;
    if (d && Audio.VOL[key] != null) {
      Audio.setVol(key, Math.round(Audio.VOL[key] * 10 + d) / 10);
      if (key === 'sfx' || key === 'master') Audio.S.heavy(); else if (key === 'announcer') vo('prompt', ''); else if (key === 'commentary') Audio.chain([pick(['b_bighit_0_0', 'b_block_0_1', 'b_whiff_1_0'])], { interrupt: true }); else if (key === 'voices') vo(`v_${pick(['claude', 'codex', 'grok', 'siri'])}_atk2`, '', { who: 'char', interrupt: true });
    }
    if (d && key === 'cpu') { OPT.cpu = (OPT.cpu + d + 4) % 4; saveOpt(); Audio.S.move(); }
    if ((d || P('confirm')) && key === 'crt') { OPT.crt = !OPT.crt; saveOpt(); Audio.S.move(); }
    if ((P('confirm') && key === 'back') || P('cancel')) { scene = 'title'; Audio.S.select(); }
  } else if (scene === 'rankings') {
    if (P('special') && !Touch.active || P('slop')) { nameUI.buf = Board.st.name; nameUI.after = null; scene = 'name'; sceneT = 0; return; }
    if (P('confirm') || P('cancel')) { scene = 'title'; Audio.S.select(); }
  } else if (scene === 'name') {
    // pad support: up/down cycles the last letter, right adds one
    const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    // gamepad only (keyboard letters are typed directly): d-pad/stick up/down cycles the letter, right adds one
    const pad = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean), pb = n => pad && pad.buttons[n] && pad.buttons[n].pressed;
    const pu = pb(12) || (pad && pad.axes[1] < -0.6), pd = pb(13) || (pad && pad.axes[1] > 0.6), pr = pb(15) || (pad && pad.axes[0] > 0.6), last = nameUI.padPrev || {};
    if ((pu && !last.pu) || (pd && !last.pd)) { const ch = nameUI.buf.slice(-1) || 'A', i = Math.max(0, AL.indexOf(ch)); nameUI.buf = (nameUI.buf.slice(0, -1) || '') + AL[(i + (pu ? 1 : AL.length - 1)) % AL.length]; }
    if (pr && !last.pr && nameUI.buf.length < 12) nameUI.buf += 'A';
    nameUI.padPrev = { pu, pd, pr };
    const padStart = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(p => p && p.buttons[9] && p.buttons[9].pressed);
    const touchStart = typeof Touch !== 'undefined' && Touch.active && localCtrl.pressed('start') && !Input.keys.size;
    const ok = nameUI.enter || touchStart || (padStart && !nameUI.padLatch); nameUI.padLatch = padStart; nameUI.enter = false;
    if (ok && nameUI.buf.trim() && sceneT > 10) {
      Board.setName(nameUI.buf); Audio.S.select(); vo('perfect', '');
      if (nameUI.after) { const fn = nameUI.after; nameUI.after = null; fn(); scene = 'results'; } else { scene = 'rankings'; Board.refresh(); }
    }
    if ((Input.keys.has('Escape') || Input.vheld.has('back')) && !nameUI.after) scene = 'rankings';
  } else if (scene === 'online') {
    if (online.mode === 'menu') {
      if (P('up') || P('down')) { online.idx = (online.idx + (P('up') ? 2 : 1)) % 3; Audio.S.move(); }
      if (P('confirm')) { Audio.S.select(); if (online.idx === 0) { online.mode = 'host'; Net.host(); } else if (online.idx === 1) { online.mode = 'join'; online.typed = ''; } else scene = 'title'; }
      if (P('cancel')) scene = 'title';
    } else if (online.mode === 'host') { if (P('cancel') || P('back')) { Net.reset(); online.mode = 'menu'; } }
    else if (online.mode === 'join') {
      if (Input.keys.has('Escape') || localCtrl.pressed('back')) { Net.reset(); online.mode = 'menu'; }
      if ((Input.keys.has('Enter') || localCtrl.pressed('start')) && online.typed.length === 4 && Net.st.status !== 'connecting') { Audio.S.select(); Net.join(online.typed); }
    }
  } else if (scene === 'select') {
    const cols = 7;
    if (sel.stage && !sel.online) { scene = 'stage'; sceneT = 0; return; }
    if (!sel.online && --sel.timer <= 0) { sel.done = [true, true]; }
    const nav = (i, c) => {
      if (sel.done[i]) { if (c.pressed('cancel')) { sel.done[i] = false; Audio.S.move(); } return; }
      let k = sel.cur[i];
      if (c.pressed('left')) k = (k + ROSTER.length - 1) % ROSTER.length;
      if (c.pressed('right')) k = (k + 1) % ROSTER.length;
      if (c.pressed('up')) k = (k - cols + ROSTER.length) % ROSTER.length;
      if (c.pressed('down')) k = (k + cols) % ROSTER.length;
      if (k !== sel.cur[i]) { sel.cur[i] = k; Audio.S.move(); sel.hoverT = 0; Audio.stopVoices(); vo(`v_${ROSTER[k]}_line`, FIGHTERS[ROSTER[k]].line, { who: 'char', interrupt: true, gap: 300 }); }
      if (c.pressed('confirm')) { sel.done[i] = true; Audio.S.select(); Audio.S.heavy(); vo(`name_${ROSTER[k]}`, FIGHTERS[ROSTER[k]].name, { interrupt: true }); }
    };
    if (sel.online) {
      const i = me();
      if (sel.stage) {
        if (i === 0) {
          const a0 = sel.arena;
          if (P('left')) sel.arena = (sel.arena + ARENAS.length - 1) % ARENAS.length; if (P('right')) sel.arena = (sel.arena + 1) % ARENAS.length;
          if (P('up')) sel.arena = (sel.arena + ARENAS.length - 4) % ARENAS.length; if (P('down')) sel.arena = (sel.arena + 4) % ARENAS.length;
          if (a0 !== sel.arena) { Audio.S.move(); Net.send({ t: 'arena', arena: sel.arena }); }
          if (P('confirm')) { Audio.S.select(); const seed = Math.floor(Math.random() * 2 ** 31); online.delay = Net.pickDelay(); Net.send({ t: 'go', cur: sel.cur, arena: sel.arena, seed, delay: online.delay }); online.seed = seed; toVS(); }
        }
        return;
      }
      const before = [sel.cur[i], sel.done[i]];
      nav(i, { pressed: b => P(b) });
      if (P('cancel') && !sel.done[i] && before[1] === false) { leaveOnline('LEFT ONLINE LOBBY'); Net.send({ t: 'bye' }); return; }
      if (before[0] !== sel.cur[i] || before[1] !== sel.done[i]) Net.send({ t: 'sel', i, cur: sel.cur[i], done: sel.done[i] });
      if (sel.done[0] && sel.done[1]) { sel.stage = true; scene = 'stage'; sceneT = 0; Audio.stopVoices(); vo('arena', 'Choose your arena'); }
      return;
    }
    if (sel.cpu) {
      // P1 picks own fighter, then the CPU opponent with the same controller
      const c = { pressed: b => P(b) };
      const i = sel.done[0] ? 1 : 0;
      if (i === 1 && !sel.done[1] && P('cancel')) { sel.done[0] = false; Audio.S.move(); return; }
      nav(i, c);
      if (!sel.done[0] && P('cancel')) { scene = 'title'; }
    } else { nav(0, ctrls[0]); nav(1, ctrls[1]); if (!sel.done[0] && !sel.done[1] && P('cancel')) scene = 'title'; }
    if (sel.done[0] && sel.done[1]) { sel.stage = true; scene = 'stage'; sceneT = 0; Audio.stopVoices(); vo('arena', 'Choose your arena'); }
  } else if (scene === 'stage') {
    updateStage(P);
  } else if (scene === 'vs') {
    if (sceneT === 20 || sceneT === 28) Audio.S.heavy();
    if (!sel.online && sceneT > 10 && P('cancel')) { Audio.stopVoices(); scene = 'stage'; sel.stageT = 0; return; }
    if (sceneT > 330 || (!sel.online && sceneT > 40 && P('confirm'))) { sel.odds = 0; startMatch(sel.online ? online.seed : undefined); }
  } else if (scene === 'fight' && sel.online) {
    update.stalled = Net.tick(localCtrl.cur, {
      step: ([s0, s1]) => { ctrls[0].cpu.out = s0; ctrls[1].cpu.out = s1; ctrls[0].poll(); ctrls[1].poll(); match.step(); },
      save: () => snapshotState(match, ctrls), load: s => restoreState(match, ctrls, s), hash: stateHash,
      hashSnap: s => { let h = 0; for (const f of s.f) h = (h * 31 + Math.round(f.x * 10) + f.tokens * 7 + Math.round(f.compute * 10) + f.wins * 1000003) | 0; return (h * 31 + s.m.time + s.m.round) | 0; },
    });
    if (match.over && !match.overT) match.overT = 1;
    if (match.overT && ++match.overT > 60) { scene = 'results'; sceneT = 0; resultsIdx = 0; Audio.crowd(0.9, 3); reportMatch(); }
  } else if (scene === 'fight') {
    if (P('back') && !update.paused) { update.paused = true; update.pauseIdx = 0; Audio.S.select(); return; }
    if (update.paused) {
      const N = PAUSE_ITEMS.length;
      if (P('up')) { update.pauseIdx = (update.pauseIdx + N - 1) % N; Audio.S.move(); }
      if (P('down')) { update.pauseIdx = (update.pauseIdx + 1) % N; Audio.S.move(); }
      if (P('back')) { update.paused = false; return; }                         // ESC / BACK again = resume
      if (P('confirm')) { const it = PAUSE_ITEMS[update.pauseIdx]; update.paused = false; Audio.S.select();
        if (it === 'CHARACTER SELECT') { ctrls[1].cpu = null; scene = 'select'; sel.done = [false, false]; sel.stage = false; sel.timer = 30 * 60; }
        if (it === 'QUIT TO TITLE') { ctrls.forEach(c => c.cpu = null); scene = 'title'; Audio.startMusic('title'); } }
      return;
    }
    match.step();
    if (match.over && !match.overT) match.overT = 1;
    if (match.overT && ++match.overT > 60) { scene = 'results'; sceneT = 0; resultsIdx = 0; Audio.crowd(0.9, 3); reportMatch(); }
  } else if (scene === 'results') {
    if (P('left') || P('right') || P('up') || P('down')) { resultsIdx = 1 - resultsIdx; Audio.S.move(); }
    if (sel.online) {
      if (sceneT > 30 && P('confirm')) {
        Audio.S.select();
        if (resultsIdx === 0) { online.rematch[me()] = true; Net.send({ t: 'rematch', i: me() }); }
        else { Net.send({ t: 'toselect' }); enterOnlineSelect(); }
      }
      if (online.rematch[0] && online.rematch[1] && me() === 0) { const seed = Math.floor(Math.random() * 2 ** 31); online.delay = Net.pickDelay(); Net.send({ t: 'go', cur: sel.cur, arena: sel.arena, seed, delay: online.delay }); online.seed = seed; online.rematch = [false, false]; toVS(); }
      return;
    }
    if (sceneT > 30 && P('cancel')) { Audio.S.select(); scene = 'select'; ctrls[1].cpu = null; sel.done = [false, false]; sel.stage = false; sel.timer = 30 * 60; return; }
    if (sceneT > 30 && P('confirm')) {
      Audio.S.select();
      if (resultsIdx === 0) { match.f.forEach(f => f.wins = 0); startMatch(); }
      else { scene = 'select'; ctrls[1].cpu = null; sel.done = [false, false]; sel.stage = false; sel.timer = 30 * 60; }
    }
  }
}
let resultsIdx = 0;
const PAUSE_ITEMS = ['RESUME', 'CHARACTER SELECT', 'QUIT TO TITLE'];
const TAGLINES = ['SAME TOKENS. DIFFERENT PROBLEMS.', 'NOW WITH 40% MORE HALLUCINATIONS', 'BENCHMARKED BY US, FOR US', 'YOUR DATA MAY BE USED FOR TRAINING', 'NOT FINANCIAL ADVICE', 'AGI IS 6 MONTHS AWAY (SINCE 2019)', 'THERE CAN ONLY BE ONE AGENT'];

// ---------------- Render scenes ----------------
function drawBG(c, id = 'colosseum', blur = true, dim = 0.55) {
  const img = ASSETS.arenas[id];
  if (img) { const s = Math.max(W / img.width, H / img.height) * 1.08, ox = Math.sin(frame / 400) * 30; c.save(); if (blur) c.filter = 'blur(3px)'; c.drawImage(img, W / 2 - img.width * s / 2 + ox, H / 2 - img.height * s / 2, img.width * s, img.height * s); c.restore(); }
  c.fillStyle = `rgba(5,5,15,${dim})`; c.fillRect(0, 0, W, H);
}
function txt(c, s, x, y, size, color = '#fff', font = 'Bungee', align = 'center', stroke = true) {
  c.font = `${size}px "${font}"`; c.textAlign = align; c.textBaseline = 'alphabetic';
  if (stroke) { c.lineWidth = Math.max(3, size / 7); c.strokeStyle = '#000'; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = color; c.fillText(s, x, y);
}
function midTxt(c, s, x, y, size, color, align) { c.font = `${size}px "Press Start 2P"`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(s, x, y); c.textBaseline = 'alphabetic'; }
// real animation frames (8-frame walk / 4-frame idle) with fallback to the single poses
function animPose(id, kind, t) {
  const m = ASSETS.meta[id] || {};
  if (kind === 'walk') { const cnt = Object.keys(m).filter(k => /^walk\d$/.test(k)).length; return cnt ? 'walk' + (Math.floor(t / (cnt === 4 ? 9 : 5)) % cnt) : (Math.floor(t / 9) % 2 ? 'walk' : 'idle'); }
  if (kind === 'idle') return m.idle0 ? 'idle' + (Math.floor(t / 9) % 4) : 'idle';
  return kind;
}
// on-screen size: normalize wide sprites (Claude) so every fighter reads the same size
function presH(id, hgt) { const m = ASSETS.meta[id]?.idle; if (!m) return hgt; const aspect = FIGHTERS[id].presAspect ?? m[0] / m[1]; return hgt * Math.min(1, 0.95 / Math.max(0.6, aspect)) * (FIGHTERS[id].h / 155 * 0.5 + 0.5); }
function drawSprite(c, id, pose, x, y, hgt, flip = false, filter) {
  const img = ASSETS.sprites[id]?.[pose], m = ASSETS.meta[id]?.[pose]; if (!img || !m) return;
  const s = hgt / ASSETS.meta[id].idle[1];
  c.save(); c.translate(x, y); c.scale((flip ? -1 : 1) * s, s); if (filter) c.filter = filter; c.drawImage(img, -m[3], -m[2]); c.restore();
}
function drawLogo(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-0.04);
  // red slab behind the logo, very 1998
  c.fillStyle = '#b30000'; c.beginPath(); c.moveTo(-430, -60); c.lineTo(440, -95); c.lineTo(430, 10); c.lineTo(-440, 40); c.fill();
  c.fillStyle = '#000'; c.fillRect(-440, 30, 880, 6);
  chrome(c, 'TOKKEN', 0, 0, 150, { tone: 'gold' });
  c.restore();
  flare(c, x - 330 + ((frame * 6) % 900), y - 95, 0.8);
}
function portrait(c, id, x, y, w, h, hidden) {
  // whole fighter fitted into the box (contain), feet on a little floor
  const img = ASSETS.sprites[id]?.idle, m = ASSETS.meta[id]?.idle; if (!img) return;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#2a2f45'); g.addColorStop(1, '#07080f'); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.fillStyle = FIGHTERS[id].color + '55'; c.fillRect(x, y + h - 22, w, 22);
  const s = Math.min((w - 10) / img.width, (h - 20) / img.height); if (hidden) c.filter = 'brightness(0)';
  c.drawImage(img, x + w / 2 - img.width * s / 2, y + h - 16 - img.height * s, img.width * s, img.height * s); c.restore();
}

function render() {
  const c = ctx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.imageSmoothingEnabled = false;
  if (scene === 'loading') drawLoading(c);
  else if (scene === 'title') drawTitle(c);
  else if (scene === 'select') drawSelect(c);
  else if (scene === 'stage') drawStage(c);
  else if (scene === 'vs') drawVS(c);
  else if (scene === 'fight') { match.render(c); if (update.paused) drawPause(c); }
  else if (scene === 'results') drawResults(c);
  else if (scene === 'online') drawOnline(c);
  else if (scene === 'options') drawOptions(c);
  else if (scene === 'name') drawName(c);
  else if (scene === 'rankings') drawRankings(c);
  if (sel.online && scene === 'fight') drawNetHUD(c);
  if (online.toastT > 0) { bevel(c, W / 2 - 260, 90, 520, 44, { fill: '#b30000' }); txt(c, online.toast, W / 2, 118, 12, '#fff', 'Press Start 2P', 'center', false); }
}
function drawName(c) {
  drawGridBG(c, frame, '#2a0610'); drawCRT(c);
  chrome(c, 'ENTER YOUR NAME', W / 2, 150, 58, { tone: 'gold' });
  txt(c, 'FOR THE WORLD RANKINGS · SPELLING IS PERMANENT (ISH)', W / 2, 190, 10, '#aaa', 'Press Start 2P');
  for (let i = 0; i < 12; i++) { const x = W / 2 - 12 * 44 / 2 + i * 44, ch = nameUI.buf[i]; bevel(c, x, 260, 38, 56, { border: i === nameUI.buf.length ? '#ffd23f' : null }); if (ch && ch !== ' ') chrome(c, ch, x + 19, 304, 36, { italic: false, font: 'Russo One', tone: 'gold' }); else if (i === nameUI.buf.length && frame % 40 < 24) { c.fillStyle = '#ffd23f'; c.fillRect(x + 8, 304, 22, 5); } }
  txt(c, 'TYPE A-Z 0-9 · BACKSPACE DELETES · ENTER CONFIRMS', W / 2, 380, 10, '#9ad8ff', 'Press Start 2P');
  txt(c, 'PAD: ↑↓ CHANGE LETTER · → NEXT LETTER · START CONFIRMS', W / 2, 404, 9, '#777', 'Press Start 2P');
  if (nameUI.after) txt(c, 'YOUR SCORE WILL BE SUBMITTED AFTER THIS', W / 2, 460, 10, '#7CFFB2', 'Press Start 2P');
}
function drawRankings(c) {
  drawGridBG(c, frame, '#06203a'); drawCRT(c);
  chrome(c, 'WORLD RANKINGS', W / 2, 88, 58, { tone: 'gold' });
  const st = Board.st;
  if (st.status === 'loading') txt(c, 'QUERYING THE BLOCKCHAIN… JUST KIDDING, IT\'S A DATABASE', W / 2, 360, 11, '#9ad8ff', 'Press Start 2P');
  else if (st.status === 'offline') txt(c, 'LEADERBOARD OFFLINE (RATE LIMITED BY REALITY)', W / 2, 360, 12, '#ff5555', 'Press Start 2P');
  else if (!st.top.length) txt(c, 'NO CHAMPIONS YET. THE THRONE IS EMPTY. GO FIGHT.', W / 2, 360, 12, '#fff', 'Press Start 2P');
  else {
    bevel(c, 150, 120, W - 300, 520, { border: '#ffd23f' });
    const cols = [['#', 190, 'left'], ['NAME', 240, 'left'], ['MAIN', 560, 'center'], ['PTS', 700, 'right'], ['W-L', 830, 'right'], ['COMBO', 960, 'right'], ['PERFECT', 1100, 'right']];
    cols.forEach(([h, x, a]) => midTxt(c, h, x, 145, 9, '#ffd23f', a));
    st.top.slice(0, 20).forEach((r, i) => {
      const y = 172 + i * 23, mine = r.name === st.name;
      if (mine) { c.fillStyle = 'rgba(179,0,0,0.55)'; c.fillRect(160, y - 11, W - 320, 22); }
      const col = i === 0 ? '#ffd23f' : i < 3 ? '#e0e0ff' : '#fff';
      midTxt(c, String(i + 1), 190, y, 10, col, 'left'); midTxt(c, r.name, 240, y, 10, col, 'left');
      if (r.main && ASSETS.sprites[r.main]) { const im = ASSETS.sprites[r.main].idle, s = 20 / im.height; c.drawImage(im, 560 - im.width * s / 2, y - 10, im.width * s, 20); }
      midTxt(c, String(r.points), 700, y, 10, col, 'right'); midTxt(c, `${r.wins}-${r.losses}`, 830, y, 10, col, 'right'); midTxt(c, String(r.best_combo), 960, y, 10, col, 'right'); midTxt(c, String(r.perfects), 1100, y, 10, col, 'right');
    });
  }
  txt(c, `YOU: ${st.name || '(NO NAME YET)'}  ·  SPECIAL = CHANGE NAME  ·  ESC BACK`, W / 2, 672, 9, '#bbb', 'Press Start 2P');
  txt(c, 'POINTS: CPU WIN 5/10/20/35 BY DIFFICULTY · ONLINE WIN 50 · PERFECT +25 · LOSS +2 (PARTICIPATION TROPHY)', W / 2, 694, 7, '#777', 'Press Start 2P');
}
function drawOptions(c) {
  drawGridBG(c, frame, '#1a1030'); drawCRT(c);
  chrome(c, 'OPTIONS', W / 2, 110, 70, { tone: 'gold' });
  OPTROWS.forEach(([label, key], i) => {
    const y = 190 + i * 52, on = optUI.idx === i;
    if (on) { c.fillStyle = 'rgba(179,0,0,0.85)'; c.fillRect(W / 2 - 420, y - 30, 840, 44); }
    txt(c, label, W / 2 - 390, y, 14, on ? '#fff' : '#aaa', 'Press Start 2P', 'left', false);
    if (Audio.VOL[key] != null) {
      const v = Audio.VOL[key]; for (let k = 0; k < 10; k++) { c.fillStyle = k < Math.round(v * 10) ? (on ? '#ffd23f' : '#c9a400') : '#2a2a3a'; c.fillRect(W / 2 + 40 + k * 30, y - 20, 24, 24); }
      txt(c, `${Math.round(v * 100)}%`, W / 2 + 390, y, 12, '#fff', 'Press Start 2P', 'right', false);
    } else if (key === 'cpu') txt(c, `◀ ${CPU_LEVELS[OPT.cpu][0]} ▶`, W / 2 + 190, y, 16, OPT.cpu === 3 ? '#ff5555' : '#fff', 'Press Start 2P', 'center', false);
    else if (key === 'crt') txt(c, OPT.crt ? '◀ ON ▶' : '◀ OFF ▶', W / 2 + 190, y, 16, '#fff', 'Press Start 2P', 'center', false);
  });
  txt(c, '↑↓ SELECT · ←→ ADJUST · ESC BACK', W / 2, 680, 10, '#888', 'Press Start 2P');
  if (OPT.cpu === 3 && optUI.idx === 6) txt(c, 'WARNING: AGI DIFFICULTY IS 6 MONTHS AWAY. ALWAYS.', W / 2, 650, 9, '#ff5555', 'Press Start 2P');
}
function drawOnline(c) {
  drawGridBG(c, frame, '#06203a'); drawCRT(c);
  chrome(c, 'ONLINE VERSUS', W / 2, 120, 64, { tone: 'blue' });
  txt(c, 'PEER-TO-PEER · NO ACCOUNT · NO SERVERS · NO REFUNDS', W / 2, 160, 10, '#9ad8ff', 'Press Start 2P');
  if (online.mode === 'menu') {
    ['HOST A GAME', 'JOIN WITH CODE', 'BACK'].forEach((it, i) => { const y = 290 + i * 70, on = online.idx === i; if (on) { c.fillStyle = 'rgba(0,80,200,0.8)'; c.fillRect(W / 2 - 260, y - 38, 520, 50); } chrome(c, it, W / 2, y, on ? 36 : 28, { tone: on ? 'gold' : 'silver' }); });
  } else if (online.mode === 'host') {
    const st = Net.st;
    txt(c, 'YOUR INVITE CODE', W / 2, 250, 14, '#fff', 'Press Start 2P');
    bevel(c, W / 2 - 220, 270, 440, 130, { border: '#ffd23f' });
    if (st.code && st.status !== 'opening') chrome(c, st.code, W / 2, 370, 96, { tone: 'gold', italic: false, font: 'Russo One' }); else txt(c, 'GENERATING…', W / 2, 345, 16, '#aaa', 'Press Start 2P');
    txt(c, st.status === 'error' ? 'ERROR: ' + st.error : 'SEND THIS CODE TO YOUR OPPONENT', W / 2, 450, 11, st.status === 'error' ? '#ff5555' : '#9ad8ff', 'Press Start 2P');
    txt(c, 'OR THIS LINK:  ' + location.origin + location.pathname + '?join=' + st.code, W / 2, 480, 9, '#aaa', 'Press Start 2P');
    if (frame % 60 < 40) txt(c, 'WAITING FOR A CHALLENGER…', W / 2, 560, 16, '#ffd23f', 'Press Start 2P');
    txt(c, 'ESC TO CANCEL', W / 2, 620, 9, '#777', 'Press Start 2P');
  } else if (online.mode === 'join') {
    txt(c, 'ENTER INVITE CODE', W / 2, 250, 14, '#fff', 'Press Start 2P');
    for (let i = 0; i < 4; i++) { const x = W / 2 - 200 + i * 104; bevel(c, x, 280, 88, 110, { border: i === online.typed.length ? '#ffd23f' : null }); if (online.typed[i]) chrome(c, online.typed[i], x + 44, 368, 80, { italic: false, font: 'Russo One', tone: 'gold' }); else if (i === online.typed.length && frame % 40 < 24) { c.fillStyle = '#ffd23f'; c.fillRect(x + 24, 370, 40, 6); } }
    const st = Net.st;
    const msg = st.status === 'connecting' ? 'CONNECTING…' : st.status === 'error' ? 'ERROR: ' + st.error : online.typed.length === 4 ? 'PRESS ENTER TO CONNECT' : 'TYPE THE 4-CHARACTER CODE';
    txt(c, msg, W / 2, 450, 12, st.status === 'error' ? '#ff5555' : '#9ad8ff', 'Press Start 2P');
    txt(c, 'ESC TO CANCEL', W / 2, 620, 9, '#777', 'Press Start 2P');
  }
  ticker(c, frame);
}
function drawNetHUD(c) {
  const st = Net.st; c.font = '8px "Press Start 2P"'; c.textAlign = 'center'; c.fillStyle = '#9ad8ff';
  c.fillText(`ONLINE · ${st.role === 'host' ? 'P1' : 'P2'} · ${st.path || '…'} · PING ${st.netRtt ?? Math.round(st.rtt)}MS · DELAY ${st.delay}F · ROLLBACK ${st.rollbacks}`, W / 2, 112);
  if (st.desync) { c.fillStyle = '#ff5555'; c.fillText('DESYNC DETECTED — BLAME THE TOKENIZER', W / 2, 124); }
  if (update.stalled) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, H / 2 - 40, W, 80); txt(c, online.rivalHidden ? 'RIVAL TABBED OUT — WAITING…' : 'WAITING FOR OPPONENT…', W / 2, H / 2 + 8, 18, '#ffd23f', 'Press Start 2P'); }
}
function drawLoading(c) {
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  chrome(c, 'NOW LOADING', W - 60, H - 60, 34, { align: 'right' });
  for (let i = 0; i < 8; i++) { const a = frame / 6 + i * Math.PI / 4; c.fillStyle = `rgba(255,210,63,${(i + 1) / 8})`; c.fillRect(W - 470 + Math.cos(a) * 18 - 4, H - 72 + Math.sin(a) * 18 - 4, 8, 8); }
  txt(c, `${fmt(loadPct * 65536)} / 65,536 TOKENS`, W - 60, H - 30, 10, '#777', 'Press Start 2P', 'right', false);
}
function drawTitle(c) {
  drawBG(c, 'colosseum', true, 0.55);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, W, H); drawCRT(c);
  const parade = ROSTER.filter(id => !FIGHTERS[id].secret), loopW = W + 260, gap = loopW / parade.length;
  parade.forEach((id, i) => { const x = ((i * gap + frame * 1.1) % loopW) - 130, h = presH(id, 74), cnt = Object.keys(ASSETS.meta[id] || {}).filter(k => /^walk\d$/.test(k)).length || 8, step = Math.floor((frame * 1.1 + i * 37) / (h * 1.12 / cnt)) % cnt;   // legs synced to distance walked: no foot sliding
    drawSprite(c, id, ASSETS.meta[id]?.walk0 ? 'walk' + step : animPose(id, 'walk', frame), x, 676, h, false, 'brightness(0.55)'); });
  drawLogo(c, W / 2, 196, 0.9 + Math.sin(frame / 40) * 0.01);
  txt(c, TAGLINES[Math.floor(frame / 240) % TAGLINES.length], W / 2, 256, 13, '#fff', 'Press Start 2P');
  if (showControls) return drawControls(c);
  if (!titleArmed) {
    if (frame % 50 < 34) chrome(c, 'PRESS START BUTTON', W / 2, 420, 34, { tone: 'silver' });
  } else {
    menu.items.forEach((it, i) => {
      const y = 314 + i * 38, on = menu.idx === i;
      if (on) { const g = c.createLinearGradient(W / 2 - 260, 0, W / 2 + 260, 0); g.addColorStop(0, 'rgba(180,0,0,0)'); g.addColorStop(0.5, 'rgba(200,0,0,0.9)'); g.addColorStop(1, 'rgba(180,0,0,0)'); c.fillStyle = g; c.fillRect(W / 2 - 260, y - 28, 520, 36); }
      chrome(c, it, W / 2, y, on ? 28 : 21, { tone: on ? 'gold' : 'silver' });
    });
  }
  const pads = Input.padNames(); const vp = Audio.voiceProgress;
  txt(c, pads.length ? `CONTROLLER ${pads.length > 1 ? '1+2' : '1'} CONNECTED` : 'KEYBOARD / XBOX / PLAYSTATION SUPPORTED', W / 2, 556, 10, pads.length ? '#7CFFB2' : '#999', 'Press Start 2P');
  txt(c, '© 1997-2026 TOKKEN ENTERTAINMENT INC.  ALL RIGHTS RESERVED (ISH)', W / 2, 578, 8, '#aaa', 'Press Start 2P', 'center', false);
  ticker(c, frame);
  txt(c, 'M = MUTE', W - 20, 24, 9, '#666', 'Press Start 2P', 'right', false);
  if (vp < 1) txt(c, `WARMING UP THE ANNOUNCER… ${Math.round(vp * 100)}%`, 20, 24, 9, '#888', 'Press Start 2P', 'left', false);
}
function drawControls(c) {
  bevel(c, 130, 340, W - 260, 340, { border: '#ffd23f' });
  const rows = [['', 'P1 KEYBOARD', 'P2 KEYBOARD', 'XBOX / PS'], ['MOVE / JUMP / CROUCH', 'W A S D', 'ARROWS', 'STICK / D-PAD'], ['LIGHT (↓+ = SWEEP)', 'F', 'K', 'X / □'], ['HEAVY', 'G', 'L', 'Y / △'], ['SPECIAL', 'H', ';', 'B / ○'], ['SLOP BOMB (25 COMPUTE)', 'R', 'O', 'A / ✕  ·  LT'], ['ULTIMATE (100 COMPUTE)', 'T', 'P', 'RT / R2'], ['DASH', 'L-SHIFT', 'R-SHIFT', 'RB / R1'], ['BLOCK', 'HOLD BACK · Q', 'HOLD BACK · I', 'BACK · LB'], ['PAUSE', 'ESC', '', 'SELECT / SHARE']];
  rows.forEach((r, i) => r.forEach((s, j) => txt(c, s, 160 + [0, 330, 540, 740][j], 376 + i * 29, 11, i === 0 ? '#FFD23F' : j === 0 ? '#aaa' : '#fff', 'Press Start 2P', 'left', false)));
  txt(c, 'VS CPU: BOTH KEYBOARD LAYOUTS CONTROL P1', W / 2, 648, 9, '#7CFFB2', 'Press Start 2P', 'center', false);
  txt(c, 'COMBOS: LIGHT → LIGHT → HEAVY → SPECIAL / SLOP / ULT (ON HIT)', W / 2, 668, 9, '#7CFFB2', 'Press Start 2P', 'center', false);
}
// ---- select-screen fighter animation: hover slide-in, lock-in flourish, fight-ready shadowboxing loop
const selAnim = { lastCur: [-1, -1], lastDone: [false, false], hoverT: [0, 0], lockT: [-999, -999] };
function selTrack(i) {
  if (selAnim.lastCur[i] !== sel.cur[i]) { selAnim.lastCur[i] = sel.cur[i]; selAnim.hoverT[i] = frame; }
  if (!selAnim.lastDone[i] && sel.done[i]) selAnim.lockT[i] = frame;
  selAnim.lastDone[i] = sel.done[i];
}
function drawPose(c, id, pose, x, y, hgt, flip, sx = 1, sy = 1, img) {
  const m = ASSETS.meta[id]?.[pose], base = ASSETS.meta[id]?.idle; img = img || ASSETS.sprites[id]?.[pose]; if (!img || !m) return;
  const s = hgt / base[1];
  c.save(); c.translate(x, y); c.scale((flip ? -1 : 1) * s * sx, s * sy); c.drawImage(img, -m[3], -m[2]); c.restore();
}
function drawSelFighter(c, id, i, x, y, hgt, flip) {
  const f = FIGHTERS[id], dir = flip ? -1 : 1;
  const ht = frame - selAnim.hoverT[i], lt = frame - selAnim.lockT[i];
  let pose = 'idle', ox = 0, oy = 0, sx = 1, sy = 1, flash = false, trail = null;
  hgt = presH(id, hgt); const hasFrames = !!ASSETS.meta[id]?.idle0;
  if (!hasFrames) { const breathe = Math.sin(frame / 12 + i * 2); sx = 1 - breathe * 0.02; sy = 1 + breathe * 0.025; }
  if (!sel.done[i]) {
    if (ht < 16) { const k = 1 - ht / 16; ox = -dir * 170 * k * k; pose = animPose(id, 'walk', ht); }   // walk in on hover
    else pose = animPose(id, 'idle', frame + i * 5);
  } else if (lt < 6) { pose = 'ult'; flash = true; sx = sy = 1.15 - lt * 0.02; ox = (Math.random() - 0.5) * 10; }  // lock-in flash
  else if (lt < 26) { pose = 'ult'; const k = (lt - 6) / 20; sx = sy = 1.05 - k * 0.05; }
  else if (lt < 60) { pose = 'win'; oy = -Math.abs(Math.sin((lt - 26) / 34 * Math.PI)) * 16; }
  else {                                                                                                 // fight-ready loop: stance + shadowbox combo
    const cyc = (lt - 60) % 150;
    if (cyc < 96) pose = animPose(id, 'idle', frame + i * 5);
    else if (cyc < 104) { pose = 'light'; ox = dir * 12; trail = 'light'; }
    else if (cyc < 110) pose = animPose(id, 'idle', frame);
    else if (cyc < 118) { pose = 'light'; ox = dir * 14; trail = 'light'; }
    else if (cyc < 124) pose = 'block';
    else if (cyc < 138) { pose = 'heavy'; ox = dir * 22; trail = 'heavy'; }
    else pose = animPose(id, 'idle', frame);
  }
  // aura
  if (sel.done[i]) {
    const pulse = 0.55 + 0.25 * Math.sin(frame / 8), r = 150 + (lt < 20 ? (20 - lt) * 12 : 0);
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y - hgt * 0.45, 10, x, y - hgt * 0.45, r); g.addColorStop(0, f.color + 'aa'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = pulse; c.fillStyle = g; c.fillRect(x - r, y - hgt * 0.45 - r, r * 2, r * 2); c.restore();
    if (lt < 14) { c.save(); c.strokeStyle = '#fff'; c.globalAlpha = 1 - lt / 14; c.lineWidth = 6; c.beginPath(); c.arc(x, y - hgt * 0.45, 40 + lt * 16, 0, 7); c.stroke(); c.restore(); }
  }
  // floor shadow
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(x + ox * 0.5, y + 4, 90 - Math.abs(oy), 12, 0, 0, 7); c.fill();
  if (trail) for (let k = 1; k <= 3; k++) { c.globalAlpha = 0.18 * (4 - k); drawPose(c, id, trail, x + ox - dir * k * 14, y + oy, hgt, flip, sx, sy, tintImg(id, trail, f.color)); } c.globalAlpha = 1;
  drawPose(c, id, pose, x + ox, y + oy, hgt, flip, sx, sy, flash ? flashImg(id, pose) : null);
  if (sel.done[i] && lt < 40) { c.save(); c.translate(x, y - hgt - 20); const k = Math.min(1, lt / 6); c.scale(2 - k, 2 - k); c.globalAlpha = lt > 30 ? (40 - lt) / 10 : 1; chrome(c, 'READY!', 0, 0, 40, { tone: 'gold' }); c.restore(); }
}
function drawSelect(c) {
  drawGridBG(c, frame, '#2a0610');
  c.globalAlpha = 0.25; drawBG(c, ARENAS[sel.arena].id, true, 0.2); c.globalAlpha = 1; drawCRT(c);
  // header strip
  c.fillStyle = '#000'; c.fillRect(0, 0, W, 64); c.fillStyle = '#b30000'; c.fillRect(0, 64, W, 4);
  chrome(c, sel.stage ? 'SELECT STAGE' : 'SELECT YOUR AGENT', 40, 48, 34, { align: 'left', tone: 'gold' });
  if (!sel.stage) { txt(c, 'TIME', W - 150, 28, 11, '#ffd23f', 'Press Start 2P'); chrome(c, String(Math.max(0, Math.ceil(sel.timer / 60))).padStart(2, '0'), W - 150, 58, 30, { italic: false, font: 'Russo One' }); }
  // big character renders + name plates
  [0, 1].forEach(i => {
    const id = ROSTER[sel.cur[i]], f = FIGHTERS[id], L = i === 0, x = L ? 200 : W - 200;
    selTrack(i);
    c.save(); const g = c.createRadialGradient(x, 400, 10, x, 400, 230); g.addColorStop(0, f.color + '88'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - 240, 150, 480, 460); c.restore();
    drawSelFighter(c, id, i, x, 470, 250, !L);
    // name plate
    c.save(); c.translate(x, 505); c.fillStyle = L ? '#b30000' : '#0a3ab0'; c.beginPath(); c.moveTo(-180, 0); c.lineTo(190, 0); c.lineTo(175, 44); c.lineTo(-195, 44); c.fill(); c.fillStyle = '#000'; c.fillRect(-195, 44, 370, 4); c.restore();
    chrome(c, f.name, x, 543, 36, { maxW: 340 });
    txt(c, sel.cpu && !L ? 'CPU' : sel.online ? (i === me() ? 'YOU' : 'RIVAL') : `${i + 1}P`, L ? 40 : W - 40, 110, 22, L ? '#ff3a3a' : '#3ab4ff', 'Bungee', L ? 'left' : 'right');
    bevel(c, x - 190, 560, 380, 118);
    c.font = '10px "Press Start 2P"'; c.fillStyle = f.color; wrapText(c, f.title, x, 580, 360, 14);
    c.fillStyle = '#ddd'; wrapText(c, `SPECIAL: ${f.special.name}`, x, 600, 360, 14);
    c.fillStyle = '#FFD23F'; wrapText(c, `ULT: ${f.ult.name}`, x, 616, 360, 14);
    c.font = '9px "Press Start 2P"'; c.fillStyle = '#fff'; if (!sel.done[i]) wrapText(c, `"${f.line}"`, x, 640, 360, 13);
    if (sel.done[i]) chrome(c, 'LOCKED IN', x, 660, 24, { tone: 'gold' });
  });
  // portrait grid (Tekken style)
  const cols = 7, pw = 80, ph = 80, gx = W / 2 - (cols * (pw + 6)) / 2, gy = 100;
  ROSTER.forEach((id, k) => {
    const x = gx + (k % cols) * (pw + 6), y = gy + Math.floor(k / cols) * (ph + 6), f = FIGHTERS[id];
    const hidden = f.secret && sel.cur[0] !== k && sel.cur[1] !== k;
    c.fillStyle = '#000'; c.fillRect(x - 2, y - 2, pw + 4, ph + 4);
    portrait(c, id, x, y, pw, ph, hidden);
    c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(x, y + ph - 14, pw, 14); txt(c, hidden ? '???' : f.name, x + pw / 2, y + ph - 3, 7, '#fff', 'Press Start 2P', 'center', false);
    [0, 1].forEach(i => { if (sel.cur[i] !== k) return; const col = i ? '#3ab4ff' : '#ff3a3a'; c.lineWidth = 4; c.strokeStyle = col; if (frame % 16 < 11 || sel.done[i]) c.strokeRect(x - 2 + i * 3, y - 2 + i * 3, pw + 4 - i * 6, ph + 4 - i * 6); c.fillStyle = col; c.fillRect(x + (i ? pw - 26 : 0), y, 26, 14); txt(c, sel.cpu && i ? 'CPU' : `${i + 1}P`, x + (i ? pw - 13 : 13), y + 11, 8, '#fff', 'Press Start 2P', 'center', false); });
  });
  if (sel.stage) {
    bevel(c, 150, 214, W - 300, 424, { border: '#ffd23f' });
    ARENAS.forEach((a, i) => { const col = i % 4, row = Math.floor(i / 4), x = 172 + col * 238, y = 226 + row * 102, on = sel.arena === i, img = ASSETS.arenas[a.id];
      if (img) c.drawImage(img, x, y, 218, 76); c.lineWidth = on ? 4 : 1; c.strokeStyle = on ? '#FFD23F' : '#555'; c.strokeRect(x, y, 218, 76); if (!on) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x, y, 218, 76); } txt(c, a.name, x + 109, y + 90, 7, on ? '#FFD23F' : '#aaa', 'Press Start 2P'); });
  }
  ticker(c, frame);
  txt(c, sel.stage ? '←→↑↓ CHOOSE STAGE · START / Ⓐ CONFIRM' : sel.cpu ? (sel.done[0] ? 'NOW CHOOSE YOUR OPPONENT' : 'START / Ⓐ TO SELECT · ESC BACK') : 'BOTH PLAYERS SELECT', W / 2, sel.stage ? 204 : 300, 9, '#bbb', 'Press Start 2P');
}
function drawStage(c) {
  const a = ARENAS[sel.arena], img = ASSETS.arenas[a.id]; sel.stageT = (sel.stageT || 0) + 1;
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  // big live preview with slow pan
  if (img) { const s = W / img.width * 1.12, pan = Math.sin(frame / 200) * 50; c.drawImage(img, W / 2 - img.width * s / 2 + pan, -40, img.width * s, img.height * s); }
  const g = c.createLinearGradient(0, 380, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,0.85)'); g.addColorStop(1, '#000'); c.fillStyle = g; c.fillRect(0, 380, W, H - 380);
  drawCRT(c);
  // header
  c.fillStyle = '#000'; c.fillRect(0, 0, W, 64); c.fillStyle = '#b30000'; c.fillRect(0, 64, W, 4);
  chrome(c, 'SELECT STAGE', 40, 48, 34, { align: 'left', tone: 'gold' });
  txt(c, `STAGE ${sel.arena + 1} / ${ARENAS.length}`, W - 40, 42, 12, '#fff', 'Press Start 2P', 'right', false);
  // name + blurb slam-in
  const t = Math.min(1, sel.stageT / 10);
  c.save(); c.translate((1 - t) * -200, 0); c.globalAlpha = t;
  chrome(c, a.name, 60, 470, 64, { align: 'left', tone: 'silver', maxW: W - 120 });
  c.font = '12px "Press Start 2P"'; c.fillStyle = '#ffd23f'; c.textAlign = 'left'; c.fillText(a.blurb || '', 64, 500); c.restore();
  // thumbnail strip (2 rows x 8)
  const cols = 8, tw = 136, th = 60, gx = W / 2 - (cols * (tw + 8)) / 2, gy = 530;
  ARENAS.forEach((ar, i) => { const x = gx + (i % cols) * (tw + 8), y = gy + Math.floor(i / cols) * (th + 10), on = sel.arena === i, im = ASSETS.arenas[ar.id];
    c.fillStyle = '#000'; c.fillRect(x - 2, y - 2, tw + 4, th + 4); if (im) c.drawImage(im, x, y, tw, th);
    if (!on) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x, y, tw, th); } else { c.lineWidth = 3; c.strokeStyle = frame % 16 < 11 ? '#ffd23f' : '#fff'; c.strokeRect(x - 2, y - 2, tw + 4, th + 4); } });
  const host = !sel.online || me() === 0;
  txt(c, host ? '←→↑↓ CHOOSE  ·  START / Ⓐ FIGHT  ·  SPECIAL = RANDOM  ·  ESC BACK' : 'YOUR RIVAL IS PICKING THE STAGE…', W / 2, 700, 9, '#bbb', 'Press Start 2P');
}
function drawVS(c) {
  const t = sceneT, a = ROSTER[sel.cur[0]], b = ROSTER[sel.cur[1]], A = FIGHTERS[a], B = FIGHTERS[b];
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const slide = Math.min(1, t / 12);
  c.save(); c.translate(-(1 - slide) * W / 2, 0); const ga = c.createLinearGradient(0, 0, W / 2, 0); ga.addColorStop(0, '#000'); ga.addColorStop(1, A.color); c.fillStyle = ga; c.beginPath(); c.moveTo(0, 0); c.lineTo(W / 2 + 70, 0); c.lineTo(W / 2 - 70, H); c.lineTo(0, H); c.fill(); c.restore();
  c.save(); c.translate((1 - slide) * W / 2, 0); const gb = c.createLinearGradient(W / 2, 0, W, 0); gb.addColorStop(0, B.color); gb.addColorStop(1, '#000'); c.fillStyle = gb; c.beginPath(); c.moveTo(W / 2 + 70, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W / 2 - 70, H); c.fill(); c.restore();
  // giant scrolling names + halftone + speed lines
  c.save(); c.globalAlpha = 0.1; c.font = 'italic 160px Bungee'; c.fillStyle = '#fff'; c.textAlign = 'left';
  c.fillText((A.name + ' ').repeat(4), -((t * 4) % 900), 200); c.fillText((B.name + ' ').repeat(4), -900 + ((t * 4) % 900), 560); c.restore();
  speedLines(c, t, W / 2, 330); drawCRT(c);
  // seam lightning
  if (t > 12) { c.save(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.shadowColor = '#9ad8ff'; c.shadowBlur = 24; c.beginPath(); let x = W / 2 + 70; c.moveTo(x, 0); for (let y = 0; y <= H; y += 36) { x = W / 2 + 70 - y * 140 / H + rand(-16, 16); c.lineTo(x, y); } c.stroke(); c.restore(); }
  // fighters slam in
  const slam = k => t < 14 + k ? 0 : Math.min(1, (t - 14 - k) / 6);
  const sa = slam(0), sb = slam(8);
  if (sa) drawSprite(c, a, 'ult', 240 - (1 - sa) * 500, 560, presH(a, 330) * (1 + (1 - sa) * 0.5), false);
  if (sb) drawSprite(c, b, 'ult', W - 240 + (1 - sb) * 500, 560, presH(b, 330) * (1 + (1 - sb) * 0.5), true);
  if ((t >= 20 && t < 23) || (t >= 28 && t < 31)) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, W, H); }
  chrome(c, A.name, 240, 92, 58, { maxW: 440 }); chrome(c, B.name, W - 240, 92, 58, { maxW: 440 });
  txt(c, A.title, 240, 118, 10, '#fff', 'Press Start 2P'); txt(c, B.title, W - 240, 118, 10, '#fff', 'Press Start 2P');
  // trash-talk bubbles
  if (t > 40) bubble(c, 40, 140, 330, A.intro || A.line, t - 40, false);
  if (t > 70) bubble(c, W - 370, 140, 330, B.intro || B.line, t - 70, true);
  const vsS = t > 16 ? 1 + Math.max(0, (26 - t) / 8) : 0; if (vsS) { c.save(); c.translate(W / 2, 300); c.scale(vsS, vsS); c.rotate(Math.sin(t / 10) * 0.03); chrome(c, 'VS', 0, 40, 150, { tone: 'red' }); c.restore(); flare(c, W / 2 + 60, 250, 0.7); }
  // tale of the tape
  if (t > 30) {
    const keys = [...new Set([...Object.keys(A.stats), ...Object.keys(B.stats)])].slice(0, 5), bx = W / 2 - 250, by = 370, grow = Math.min(1, (t - 30) / 40);
    bevel(c, bx, by, 500, 40 + keys.length * 34, { border: '#ffd23f' });
    chrome(c, 'TALE OF THE TAPE', W / 2, by + 26, 18, { tone: 'gold' });
    keys.forEach((k, i) => {
      const y = by + 52 + i * 34, va = A.stats[k], vb = B.stats[k];
      midTxt(c, k.toUpperCase(), W / 2, y + 13, 8, '#FFD23F', 'center');
      [[va, -1, A.color], [vb, 1, B.color]].forEach(([v, d, col]) => {
        if (typeof v === 'number') { const w = 116 * Math.min(1, v / 100) * grow; c.fillStyle = '#222'; c.fillRect(d < 0 ? W / 2 - 80 - 116 : W / 2 + 80, y + 8, 116, 10); c.fillStyle = col; c.fillRect(d < 0 ? W / 2 - 80 - w : W / 2 + 80, y + 8, w, 10); midTxt(c, String(Math.round(v * grow)), d < 0 ? W / 2 - 222 : W / 2 + 222, y + 13, 10, '#fff', 'center'); }
        else midTxt(c, String(v ?? '—'), d < 0 ? W / 2 - 150 : W / 2 + 150, y + 13, 11, '#fff', 'center');
      });
    });
    // odds
    if (!sel.odds) sel.odds = Math.round(rand(22, 78));
    const oy = by + 52 + keys.length * 34 + 8; bevel(c, bx, oy, 500, 42);
    txt(c, 'POLYMARKET ODDS', W / 2, oy + 16, 8, '#aaa', 'Press Start 2P', 'center', false);
    c.fillStyle = A.color; c.fillRect(bx + 10, oy + 22, 480 * sel.odds / 100, 12); c.fillStyle = B.color; c.fillRect(bx + 10 + 480 * sel.odds / 100, oy + 22, 480 * (100 - sel.odds) / 100, 12);
    midTxt(c, `${sel.odds}%`, bx + 30, oy + 28, 9, '#fff', 'center'); midTxt(c, `${100 - sel.odds}%`, bx + 470, oy + 28, 9, '#fff', 'center');
  }
  // sponsor strip + stage + ticker
  c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(0, H - 66, W, 38);
  txt(c, `STAGE: ${ARENAS[sel.arena].name}   ·   SPONSORED BY AN UNSUSTAINABLE BURN RATE`, W / 2, H - 42, 10, '#ffd23f', 'Press Start 2P', 'center', false);
  ticker(c, frame);
  if (t > 60 && frame % 50 < 34) txt(c, 'PRESS START TO SKIP', W - 20, 24, 8, '#fff', 'Press Start 2P', 'right', false);
}
function drawPause(c) {
  c.fillStyle = 'rgba(0,0,0,0.72)'; c.fillRect(0, 0, W, H); chrome(c, 'PAUSE', W / 2, 220, 90, { tone: 'gold' });
  PAUSE_ITEMS.forEach((it, i) => { const y = 330 + i * 60, on = (update.pauseIdx || 0) === i; if (on) { c.fillStyle = 'rgba(179,0,0,0.85)'; c.fillRect(W / 2 - 260, y - 32, 520, 44); } chrome(c, it, W / 2, y, on ? 30 : 24, { tone: on ? 'gold' : 'silver' }); });
  txt(c, '↑↓ SELECT · ENTER / Ⓐ CONFIRM · ESC RESUME', W / 2, 560, 10, '#bbb', 'Press Start 2P');
  txt(c, 'Please try again in 37 seconds.', W / 2, 600, 9, '#777', 'Press Start 2P');
}
function drawResults(c) {
  const m = match, w = m.winner, l = m.f.find(f => f !== w);
  drawGridBG(c, frame, '#0a1a3a'); c.globalAlpha = 0.35; drawBG(c, m.arena.id, true, 0.3); c.globalAlpha = 1;
  c.fillStyle = w.cfg.color; c.globalAlpha = 0.18; c.fillRect(0, 0, W, H); c.globalAlpha = 1; drawCRT(c);
  drawSprite(c, w.id, 'win', 250, 580 + Math.sin(frame / 10) * 4, presH(w.id, 360), false);
  drawSprite(c, l.id, 'ko', 250 + 150, 690, 120, true);
  confetti(c, frame, sceneT < 200 ? 3 : 1);
  chrome(c, `${w.cfg.name} WINS`, W / 2 + 140, 100, 70, { tone: 'gold', maxW: 760 });
  c.font = '11px "Press Start 2P"'; c.fillStyle = '#fff'; wrapText(c, `"${w.cfg.win}"`, W / 2 + 140, 136, 700, 16);
  const x = 520, y = 180, cw = 600;
  bevel(c, x, y, cw, 410, { border: '#ffd23f' });
  chrome(c, w.cfg.name, x + 24, y + 42, 22, { align: 'left' }); midTxt(c, `${fmt(w.tokens)} TOKENS LEFT`, x + cw - 24, y + 34, 10, '#7CFFB2', 'right');
  chrome(c, l.cfg.name, x + 24, y + 78, 22, { align: 'left' }); midTxt(c, m.koInfo?.why || 'TOKEN LIMIT REACHED', x + cw - 24, y + 70, 10, '#ff4040', 'right');
  const burned = m.f.reduce((s, f) => s + f.stats.dealt, 0), comp = m.f.reduce((s, f) => s + f.stats.compute, 0);
  const rows = [['TOKENS BURNED', fmt(burned)], ['COMPUTE WASTED', '$' + (burned / 1e6 * 15 + comp * 0.07).toFixed(2)], ['TOOL CALLS', fmt(m.f.reduce((s, f) => s + f.stats.hits, 0))], ['HALLUCINATIONS', fmt(m.f.reduce((s, f) => s + f.stats.whiffs, 0))], ['SLOP GENERATED', (m.slops * 2.3).toFixed(1) + ' MB'], ['LONGEST COMBO', Math.max(...m.f.map(f => f.stats.maxCombo)) + ' CALLS'], ['CO₂ EMITTED', (burned / 90000).toFixed(1) + ' TONS'], ['VC MONEY INCINERATED', '$' + (burned / 1400).toFixed(0) + 'M']];
  const cu = Math.min(1, sceneT / 90); rows.forEach(([k, v0], i) => { c.textBaseline = 'middle'; const v = cu < 1 ? String(v0).replace(/[\d,.]+/, n => { const num = parseFloat(n.replace(/,/g, '')) * cu; return n.includes('.') ? num.toFixed(n.split('.')[1].length) : fmt(num); }) : v0; const yy = y + 118 + i * 32; midTxt(c, k, x + 24, yy, 12, '#aaa', 'left'); midTxt(c, v, x + cw - 24, yy, 14, '#fff', 'right'); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x + 20, yy + 15, cw - 40, 1); });
  txt(c, 'tokken.gg', x + cw - 16, y + 400, 8, '#666', 'Press Start 2P', 'right', false);
  stamp(c, 'DEPRECATED', 400, 640, sceneT - 60); ticker(c, frame);
  const L = Board.st.last; if (L && match.reported) { const t = L.pending ? 'SUBMITTING TO WORLD RANKINGS…' : L.error ? `RANKINGS: ${String(L.error).toUpperCase()}` : `+${L.points} PTS · WORLD RANK #${L.rank} · ${Board.st.name}`; bevel(c, W / 2 - 200 + 140, 160 - 2, 400, 0); midTxt(c, t, W / 2 + 140, 166, 10, L.error ? '#ff7777' : '#7CFFB2', 'center'); }
  if (sel.online && (online.rematch[0] || online.rematch[1])) txt(c, online.rematch[me()] ? 'WAITING FOR RIVAL TO ACCEPT REMATCH…' : 'RIVAL WANTS A REMATCH!', W / 2 + 140, 596, 10, '#7CFFB2', 'Press Start 2P');
  ['REMATCH', 'CHARACTER SELECT'].forEach((s, i) => { const bx = 540 + i * 300, on = resultsIdx === i; bevel(c, bx, 606, 270, 56, { fill: on ? '#b30000' : 'rgba(0,0,0,0.7)' }); chrome(c, s, bx + 135, 644, on ? 22 : 18, { tone: on ? 'gold' : 'silver', maxW: 250 }); });
}

// ---------------- Main loop: fixed 60Hz ----------------
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}
const hb = (() => { try { return new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 16)'], { type: 'text/javascript' }))); } catch (e) { return null; } })();
if (hb) hb.onmessage = () => {
  if (!document.hidden || !(sel.online || scene === 'online')) return;       // only needed while hidden during online play
  const now = performance.now(); acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
};
document.addEventListener('visibilitychange', () => { if (sel.online) Net.send({ t: 'vis', hidden: document.hidden }); last = performance.now(); });
window.addEventListener('gamepadconnected', e => { Audio.init(); console.log('[tokken] pad', e.gamepad.id); });
(async () => {
  requestAnimationFrame(loop);
  await Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('12px "Press Start 2P"')]).catch(() => {});
  await loadAll(p => loadPct = p);
  scene = 'title'; sceneT = 0;
  // test hooks
  const q = new URLSearchParams(location.search);
  if (q.get('join')) { titleArmed = true; scene = 'online'; online.mode = 'join'; online.typed = q.get('join').toUpperCase().slice(0, 4); Net.join(online.typed); }
  if (q.get('fight')) { const [a, b] = q.get('fight').split(','); sel.cur = [ROSTER.indexOf(a), ROSTER.indexOf(b)]; sel.cpu = q.get('cpu') !== '0'; sel.arena = Math.abs(+(q.get('arena') || 0) | 0) % ARENAS.length; await preloadMatch(a, b, ARENAS[sel.arena].id); startMatch(); }
  window.TOKKEN = { get match() { return match; }, ctrls, sel, startMatch, get scene() { return scene; }, tick(n = 1) { for (let i = 0; i < n; i++) update(); render(); return scene; } };
})();

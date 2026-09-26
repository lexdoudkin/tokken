// Headless TOKKEN simulator for balance passes: runs the real game code (data/game/snap/match + CPU AI) in Node.
// usage: node tools/sim.js [matchesPerPair=6] [cpuLevel=0.7] [--only=a,b]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const noop = () => {};
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
const fakeCanvas = { getContext: () => ctx2d, style: {}, width: 0, height: 0 };
const sandbox = {
  console, Math, JSON, Promise, Set, Map, Object, Array, Number, String, Boolean, Symbol, Error, parseInt, parseFloat, isNaN,
  performance: { now: () => Date.now() }, setTimeout: noop, setInterval: noop, clearInterval: noop,
  addEventListener: noop, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, location: { search: '' },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  document: { addEventListener: noop, hidden: false, getElementById: () => fakeCanvas, createElement: () => fakeCanvas, fonts: { load: () => Promise.resolve() } },
  navigator: { getGamepads: () => [] }, matchMedia: () => ({ matches: false }), Image: function () {}, fetch: () => Promise.reject(new Error('no fetch')),
};
sandbox.window = sandbox;
// Audio stub: the sim never makes sound
sandbox.Audio = new Proxy({ S: new Proxy({}, { get: () => noop }), has: () => false, play: () => false, chain: () => null, lineText: () => '', VOL: {}, muted: true, voiceProgress: 1 }, { get: (t, k) => (k in t ? t[k] : noop) });
vm.createContext(sandbox);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox, { filename: f });
load('data.js'); load('input.js'); load('game.js'); load('snap.js'); load('retro.js'); load('ultfx.js'); load('match.js');
// CPU class lives in main.js; pull just that class out.
const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
vm.runInContext(main.slice(main.indexOf('class CPU {'), main.indexOf('// ---------------- Scenes')) + '\nthis.CPU = CPU;', sandbox);
// sprite meta (no images needed for the sim)
vm.runInContext(`for (const f of ROSTER) { ASSETS.sprites[f] = {}; }`, sandbox);
for (const f of vm.runInContext('ROSTER', sandbox)) {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/sprites', f, 'meta.json'), 'utf8'));
  const mp = path.join(ROOT, 'assets/sprites', f, 'motion.json'); if (fs.existsSync(mp)) Object.assign(meta, JSON.parse(fs.readFileSync(mp, 'utf8')));
  sandbox.__m = meta; vm.runInContext(`ASSETS.meta['${f}'] = __m;`, sandbox);
}
vm.runInContext(`
function simMatch(a, b, lvl, arena, seed) {
  const c = [new Input.Controller(0), new Input.Controller(1)];
  c[0].cpu = new CPU(lvl); c[1].cpu = new CPU(lvl);
  gseed(seed);
  const m = new Match(a, b, ARENAS[arena % ARENAS.length], c, true); let frames = 0;
  while (!m.over && frames < 30000) { c[0].cpu.think(m.f[0], m.f[1], m); c[1].cpu.think(m.f[1], m.f[0], m); c[0].poll(); c[1].poll(); m.step(); frames++;
    if (FX.parts.length > 200) FX.parts.length = 0; if (FX.texts.length > 50) FX.texts.length = 0; }
  return { winner: m.winner ? m.winner.id : null, frames, dealt: m.f.map(f => f.stats.dealt), hits: m.f.map(f => f.stats.hits), timeout: m.koInfo && m.koInfo.why === 'TIME OVER' };
}
this.simMatch = simMatch;`, sandbox);

const N = +(process.argv[2] || 6), LVL = +(process.argv[3] || 0.7);
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const R = vm.runInContext('ROSTER', sandbox).filter(f => !only.length || only.includes(f));
const S = {}; R.forEach(f => S[f] = { w: 0, g: 0, dealt: 0, taken: 0, hits: 0, frames: 0, to: 0, vs: {} });
const t0 = Date.now(); let seed = 1;
for (const a of R) for (const b of R) { if (a === b) continue;
  for (let i = 0; i < N; i++) { const r = sandbox.simMatch(a, b, LVL, i * 5 + 1, seed++);
    for (const [k, f, o] of [[0, a, b], [1, b, a]]) { const s = S[f]; s.g++; s.dealt += r.dealt[k]; s.taken += r.dealt[1 - k]; s.hits += r.hits[k]; s.frames += r.frames; if (r.timeout) s.to++; if (r.winner === f) { s.w++; s.vs[o] = (s.vs[o] || 0) + 1; } } } }
const out = Object.entries(S).map(([f, s]) => ({ f, win: +(s.w / s.g * 100).toFixed(1), dealt: Math.round(s.dealt / s.g), taken: Math.round(s.taken / s.g), hits: +(s.hits / s.g).toFixed(1), secs: Math.round(s.frames / s.g / 60), timeouts: s.to })).sort((x, y) => y.win - x.win);
for (const o of out) console.log(`${o.f.padEnd(11)} win ${String(o.win).padStart(5)}%  dealt ${String(o.dealt).padStart(6)}  taken ${String(o.taken).padStart(6)}  hits ${String(o.hits).padStart(5)}  ${o.secs}s/match  TO ${o.timeouts}`);
console.log(`\n${R.length * (R.length - 1) * N} matches in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
fs.writeFileSync(path.join(__dirname, 'balance_last.json'), JSON.stringify(out, null, 1));

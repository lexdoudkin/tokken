// TOKKEN rollback support: full sim-state snapshots + a RESIM flag that silences audio/FX while re-simulating.
let RESIM = false;
Object.defineProperty(window, 'RESIM_ON', { get: () => RESIM });
// setTimeout for cosmetic/audio follow-ups scheduled from inside the sim: never schedule during re-simulation.
function aTimeout(fn, ms) { if (!RESIM) setTimeout(fn, ms); }

const FIGHTER_REFS = new Set(['ctrl', 'cfg', 'meta']);
function snapObj(o, refs) {
  const s = {};
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (refs && refs.has(k)) s[k] = v;
    else if (Array.isArray(v)) s[k] = v.map(x => (x && typeof x === 'object' && !(x instanceof Fighter)) ? { ...x } : x);
    else if (v && typeof v === 'object' && v.constructor === Object) s[k] = { ...v };
    else s[k] = v;                          // primitives, functions, Fighter refs, class instances kept by reference
  }
  return s;
}
function restoreObj(o, s) {
  for (const k of Object.keys(o)) if (!(k in s)) delete o[k];   // drop fields created after the snapshot (e.g. ult closures, locks)
  for (const k of Object.keys(s)) {
    const v = s[k];
    if (Array.isArray(v)) o[k] = v.map(x => (x && typeof x === 'object' && !(x instanceof Fighter)) ? { ...x } : x);
    else if (v && typeof v === 'object' && v.constructor === Object) o[k] = { ...v };
    else o[k] = v;
  }
}
function snapshotState(match, ctrls) {
  const m = {};
  for (const k of Object.keys(match)) {
    if (k === 'f' || k === 'arena') continue;
    const v = match[k];
    if (k === 'projs') m.projs = v.map(p => { const c = Object.create(Proj.prototype); return Object.assign(c, p); });
    else if (k === 'timers') m.timers = v.map(t => ({ ...t }));
    else if (Array.isArray(v)) m[k] = v.slice();
    else if (v && typeof v === 'object' && v.constructor === Object) m[k] = { ...v };
    else m[k] = v;
  }
  return {
    m, f: match.f.map(f => snapObj(f, FIGHTER_REFS)), seed: _gseed, slowmo: FX.slowmo,
    c: ctrls.map(c => ({ cur: { ...c.cur }, prev: { ...c.prev }, pressT: { ...c.pressT }, frame: c.frame })),
  };
}
function restoreState(match, ctrls, s) {
  for (const k of Object.keys(match)) if (k !== 'f' && k !== 'arena' && !(k in s.m)) delete match[k];
  for (const k of Object.keys(s.m)) {
    const v = s.m[k];
    if (k === 'projs') match.projs = v.map(p => Object.assign(Object.create(Proj.prototype), p));
    else if (k === 'timers') match.timers = v.map(t => ({ ...t }));
    else if (Array.isArray(v)) match[k] = v.slice();
    else if (v && typeof v === 'object' && v.constructor === Object) match[k] = { ...v };
    else match[k] = v;
  }
  match.f.forEach((f, i) => restoreObj(f, s.f[i]));
  _gseed = s.seed; FX.slowmo = s.slowmo;
  ctrls.forEach((c, i) => { const cs = s.c[i]; c.cur = { ...cs.cur }; c.prev = { ...cs.prev }; c.pressT = { ...cs.pressT }; c.frame = cs.frame; });
}

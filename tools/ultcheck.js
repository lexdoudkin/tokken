// Headless ult checks: (1) each ult's effect on a stationary opponent, (2) rollback determinism: snapshot -> play -> restore -> replay must match.
const { sandbox, vm } = require('./sim.js');
vm.runInContext(`
function ultRun(a, b, frames) { const c = [new Input.Controller(0), new Input.Controller(1)]; gseed(7); const m = new Match(a, b, ARENAS[3], c, true);
  for (let i = 0; i < 260; i++) m.step(); const A = m.f[0], B = m.f[1]; B.x = A.x + 380; A.compute = 100; m.startUlt(A, B); const log = [];
  for (let i = 0; i < frames; i++) { m.step(); if (i % 40 === 0) log.push(i + ':' + A.state + (A.inv > 100 ? '!INV' : '') + ' B=' + B.tokens); } return { log: log.join(' | '), dmg: 65536 - B.tokens, end: A.state }; }
function hashOf(m) { return JSON.stringify(m.f.map(f => [Math.round(f.x * 100), Math.round(f.y * 100), f.tokens, f.state, f.compute])) + m.projs.length; }
function rollback(a, b) { const c = [new Input.Controller(0), new Input.Controller(1)]; gseed(11); const m = new Match(a, b, ARENAS[3], c, true);
  for (let i = 0; i < 260; i++) m.step(); const A = m.f[0], B = m.f[1]; B.x = A.x + 380; A.compute = 100; m.startUlt(A, B); for (let i = 0; i < 90; i++) m.step();
  const snap = snapshotState(m, c); for (let i = 0; i < 120; i++) m.step(); const h1 = hashOf(m);
  restoreState(m, c, snap); RESIM = true; for (let i = 0; i < 120; i++) m.step(); RESIM = false; const h2 = hashOf(m); return h1 === h2 ? 'OK' : 'DESYNC ' + h1 + ' vs ' + h2; }
this.ultRun = ultRun; this.rollback = rollback;`, sandbox);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : vm.runInContext('ROSTER', sandbox);
for (const id of ids) { const r = sandbox.ultRun(id, id === 'grok' ? 'claude' : 'grok', 320); console.log(id.padEnd(11), 'dmg', String(r.dmg).padStart(6), 'end', r.end.padEnd(8), 'rollback', sandbox.rollback(id, id === 'grok' ? 'claude' : 'grok')); }

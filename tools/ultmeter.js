// How much compute (ult meter) does each ult refund to its user? (anything near 100 = ult loop)
const { sandbox, vm } = require('./sim.js');
vm.runInContext(`(function(){ const out = [];
for (const id of ROSTER) { const o = id === 'grok' ? 'claude' : 'grok'; const c = [new Input.Controller(0), new Input.Controller(1)]; gseed(3); const m = new Match(id, o, ARENAS[3], c, true);
  for (let i = 0; i < 260; i++) m.step(); const A = m.f[0], B = m.f[1]; B.x = A.x + 360; A.compute = 100; m.startUlt(A, B); let peak = 0;
  for (let i = 0; i < 420; i++) { m.step(); peak = Math.max(peak, A.compute); }
  out.push([id, Math.round(peak)]); }
sandbox_out = out.sort((a, b) => b[1] - a[1]).map(x => x.join(':')).join('  '); })()`, sandbox);
console.log(sandbox.sandbox_out);

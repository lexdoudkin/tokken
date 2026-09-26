const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync('sim.js', 'utf8').split('\nconst N = +(process.argv')[0];
eval(src.replace("const fs = require('fs'), path = require('path'), vm = require('vm');", ''));
vm.runInContext(`
function dbg(a, b) { const c = [new Input.Controller(0), new Input.Controller(1)]; gseed(7); const m = new Match(a, b, ARENAS[3], c, true);
  for (let i = 0; i < 260; i++) m.step(); const A = m.f[0], B = m.f[1]; B.x = A.x + 380; A.compute = 100; m.startUlt(A, B); const log = [];
  for (let i = 0; i < 260; i++) { m.step(); if (i % 20 === 0) log.push(i + ':' + A.state + '/inv' + A.inv + '/B' + B.tokens); } return log.join(' '); }
this.dbg = dbg;`, sandbox);
for (const id of ['cursor', 'kimi', 'hermes']) console.log(id, sandbox.dbg(id, 'grok'));

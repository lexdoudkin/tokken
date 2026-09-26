// Real-network online E2E: run as host (prints invite code) or guest (joins code). Bot plays; reports netcode stats.
import { chromium } from 'playwright';
const [,, role, code, secs = '170'] = process.argv;
const U = process.env.TOKKEN_URL || 'https://tokken-6t6.pages.dev/';
const opts = process.env.CHROME ? { executablePath: process.env.CHROME } : {};
const b = await chromium.launch({ ...opts, args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
const Q = process.env.RELAY ? 'relay=1' : '';
await p.goto(role === 'guest' ? `${U}?join=${code}&${Q}` : `${U}?${Q}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.TOKKEN && (TOKKEN.scene === 'title' || TOKKEN.scene === 'online'), null, { timeout: 90000 });
await p.evaluate(() => { if (!Audio.muted) Audio.toggleMute(); });
// bot drives the local controller
await p.evaluate(() => { const bot = new CPU(0.75); localCtrl.poll = function () { const m = TOKKEN.match; if (m && TOKKEN.scene === 'fight') { const i = me(); bot.think(m.f[i], m.f[1 - i], m); } this.prev = this.cur; this.cur = Object.assign({}, bot.out); }; });
if (role === 'host') {
  await p.evaluate(() => { scene = 'online'; online.mode = 'host'; Net.host(); });
  await p.waitForFunction(() => Net.st.status === 'waiting', null, { timeout: 30000 });
  console.log('CODE', await p.evaluate(() => Net.st.code));
  await p.waitForFunction(() => Net.st.status === 'connected', null, { timeout: 180000 });
  await p.waitForTimeout(3000);   // let pings settle so the delay pick is real
  await p.evaluate(([a, b]) => { sel.cur = [ROSTER.indexOf(a), ROSTER.indexOf(b)]; sel.arena = 11; online.delay = Net.pickDelay(); const seed = 424242; Net.send({ t: 'go', cur: sel.cur, arena: sel.arena, seed, delay: online.delay }); online.seed = seed; toVS(); }, [process.env.P1 || 'jev', process.env.P2 || 'kimi']);
} else {
  await p.waitForFunction(() => Net.st.status === 'connected', null, { timeout: 60000 });
}
const t0 = Date.now(); let stalls = 0, lastSim = 0, samples = [];
while (Date.now() - t0 < +secs * 1000) {
  await p.waitForTimeout(2000);
  const s = await p.evaluate(() => ({ scene: TOKKEN.scene, sim: Net.st.sim, rtt: Math.round(Net.st.rtt), netRtt: Net.st.netRtt, path: Net.st.path, delay: Net.st.delay, rb: Net.st.rollbacks, depth: Net.st.maxDepth, desync: Net.st.desync, stalled: !!update.stalled, fast: !!(Net.st.fast && Net.st.fast.open), hashes: Net.st.rb ? Net.st.rb.reported.size : 0, tok: TOKKEN.match ? TOKKEN.match.f.map(f => f.tokens + '/' + f.wins).join(' ') : '' }));
  if (s.stalled) stalls++; samples.push(s.rtt);
  if (s.scene === 'results' || (s.scene === 'fight' && s.sim === lastSim && s.sim > 0)) { console.log('STATE', JSON.stringify(s)); if (s.scene === 'results') break; }
  lastSim = s.sim;
}
const fin = await p.evaluate(() => ({ scene: TOKKEN.scene, winner: TOKKEN.match && TOKKEN.match.winner && TOKKEN.match.winner.id, rounds: TOKKEN.match && TOKKEN.match.round, sim: Net.st.sim, netRtt: Net.st.netRtt, path: Net.st.path, relay: Net.st.relay, delay: Net.st.delay, rollbacks: Net.st.rollbacks, maxDepth: Net.st.maxDepth, desync: Net.st.desync, hashesChecked: Net.st.rb ? Net.st.rb.reported.size : 0, fastLane: !!(Net.st.fast && Net.st.fast.open), tokens: TOKKEN.match ? TOKKEN.match.f.map(f => f.tokens + '/' + f.wins) : [] }));
samples.sort((a, b) => a - b);
console.log('FINAL', role, JSON.stringify({ ...fin, rttMedian: samples[samples.length >> 1], rttMax: samples[samples.length - 1], stallSamples: stalls, errors: errs.slice(0, 3) }));
await b.close();

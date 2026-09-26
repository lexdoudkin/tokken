// TOKKEN online: peer-to-peer (WebRTC via PeerJS) with invite codes + rollback netcode.
// Host = P1, guest = P2. Both run the same deterministic sim; only inputs cross the wire.
// Two channels: a reliable one for menus/control, and an unreliable "fast lane" for inputs + pings
// (no head-of-line blocking on packet loss; every packet re-sends the last unacknowledged frames).
const Net = (() => {
  const BITS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special', 'slop', 'ult', 'dash', 'block'];
  const MAXROLL = 8;
  const ICE = { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
  // TURN relay fallback (fetched per session from our Worker; never blocks longer than 2.5s)
  let turnP = null;
  function iceConfig() {
    turnP = turnP || Promise.race([fetch('https://tokken-leaderboard.tokken.workers.dev/turn').then(r => r.json()), new Promise(r => setTimeout(() => r(null), 2500))])
      .then(d => { st.relay = !!(d && d.relay); return d && d.iceServers ? { iceServers: [...ICE.iceServers, ...d.iceServers.filter(s => String(s.urls).includes('turn'))] } : ICE; }).catch(() => ICE);
    return turnP;
  }
  function watchFail(conn) { const pc = conn.peerConnection; if (!pc) return; pc.addEventListener('iceconnectionstatechange', () => { if (pc.iceConnectionState === 'failed' && st.status !== 'connected') { st.status = 'error'; st.error = 'NETWORK BLOCKED THE CONNECTION'; } }); }
  const st = { delay: 1, inbox: [], rb: null, rollbacks: 0, maxDepth: 0, peer: null, conn: null, fast: null, path: '', peerAck: -1, role: null, code: '', status: 'idle', error: '', local: new Map(), remote: new Map(), sim: 0, waitT: 0, hashes: {}, desync: false, handlers: {}, rtt: 0, rtts: [] };
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const mkCode = () => Array.from({ length: 4 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
  const pid = code => 'tokken-gg-' + code.toUpperCase();

  function handle(d) {
    if (d.t === 'in') { if (d.a != null) st.peerAck = Math.max(st.peerAck, d.a); for (let i = 0; i < d.b.length; i++) onRemote(d.f + i, d.b[i]); }
    else if (d.t === 'ping') sendFast({ t: 'pong', ts: d.ts });
    else if (d.t === 'pong') { st.rtts.push(performance.now() - d.ts); if (st.rtts.length > 9) st.rtts.shift(); st.rtt = [...st.rtts].sort((x, y) => x - y)[st.rtts.length >> 1]; }
    else if (d.t === 'hash') checkHash(d.f, d.h, 'remote');
    else emit(d.t, d);
  }
  function wire(conn) {
    conn.on('data', d0 => { if (st.lossPct && d0.t === 'in' && Math.random() < st.lossPct) return; if (st.lagMs) st.inbox.push({ at: performance.now() + st.lagMs + Math.random() * st.lagMs * 0.3, d: d0 }); else handle(d0); });  // lagMs: test hook (released from tick)
  }
  function setup(conn) {
    st.conn = conn; wire(conn);
    conn.on('open', () => { st.status = 'connected'; emit('connected'); ping(); detectPath(); if (st.role === 'guest') openFast(); });
    conn.on('iceStateChanged', s => { if (s === 'failed' && st.status !== 'connected') { st.status = 'error'; st.error = 'NETWORK BLOCKED THE CONNECTION'; } });
    conn.on('close', () => { st.status = 'closed'; emit('closed'); });
    conn.on('error', e => { st.error = String(e); emit('closed'); });
  }
  function openFast() { const f = st.peer.connect(pid(st.code), { reliable: false, label: 'fast', serialization: 'json' }); setupFast(f); }
  function setupFast(f) { wire(f); f.on('open', () => { st.fast = f; }); f.on('close', () => { if (st.fast === f) st.fast = null; }); }
  async function host() {
    reset(); st.role = 'host'; st.code = mkCode(); st.status = 'opening';
    const config = await iceConfig();
    st.peer = new Peer(pid(st.code), { config });
    st.peer.on('open', () => { st.status = 'waiting'; });
    st.peer.on('connection', c => { if (c.label === 'fast') { setupFast(c); return; } if (st.conn) { c.close(); return; } setup(c); setTimeout(() => watchFail(c), 0); });
    st.peer.on('error', e => { if (String(e.type) === 'unavailable-id') { st.peer.destroy(); host(); return; } st.status = 'error'; st.error = e.type || String(e); });
  }
  async function join(code) {
    reset(); st.role = 'guest'; st.code = code.toUpperCase(); st.status = 'connecting';
    const config = await iceConfig();
    st.peer = new Peer({ config });
    st.peer.on('open', () => { const c = st.peer.connect(pid(st.code), { reliable: true }); setup(c); setTimeout(() => watchFail(c), 0); });
    setTimeout(() => { if (st.status === 'connecting') { st.status = 'error'; st.error = 'COULD NOT CONNECT (20S). CHECK THE CODE / NETWORK'; } }, 20000);
    st.peer.on('error', e => { st.status = 'error'; st.error = e.type === 'peer-unavailable' ? 'NO GAME WITH THAT CODE' : (e.type || String(e)); });
  }
  // Is this a direct peer-to-peer path, or relayed through a TURN server?
  async function detectPath() {
    try {
      const pc = st.conn.peerConnection; if (!pc) return; const stats = await pc.getStats(); let pair;
      stats.forEach(r => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId); });
      if (!pair) stats.forEach(r => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
      const lc = pair && stats.get(pair.localCandidateId), rc = pair && stats.get(pair.remoteCandidateId);
      if (pair && pair.currentRoundTripTime != null) st.netRtt = Math.round(pair.currentRoundTripTime * 1000);   // true network RTT, independent of the page's main thread
      st.path = !lc ? '' : (lc.candidateType === 'relay' || rc.candidateType === 'relay') ? 'RELAY' : (lc.candidateType === 'host' && rc.candidateType === 'host') ? 'LAN' : 'DIRECT';
    } catch (e) {}
  }
  function reset() { try { st.fast && st.fast.close(); st.conn && st.conn.close(); st.peer && st.peer.destroy(); } catch (e) {} Object.assign(st, { peer: null, conn: null, fast: null, path: '', status: 'idle', error: '', desync: false, rtts: [], rtt: 0 }); resetFrames(); }
  // Host picks the input delay from measured ping; both sides MUST use the same value (it's sent in the 'go' message).
  function pickDelay() { const r = st.netRtt ?? st.rtt; return !r ? 1 : r < 45 ? 0 : r < 140 ? 1 : 2; }
  function resetFrames(delay = st.delay) {
    st.delay = delay; st.peerAck = -1;
    st.local = new Map(); st.remote = new Map(); st.sim = 0; st.waitT = 0; st.hashes = {}; st.rollbacks = 0; st.maxDepth = 0;
    st.rb = { snaps: new Map(), predicted: new Map(), lastRemote: 0, confirmed: delay - 1, pending: null, reported: new Set() };
    for (let f = 0; f < delay; f++) { st.local.set(f, 0); st.remote.set(f, 0); }
  }
  // Remote input arrived: confirm it, and schedule a rollback if we predicted that frame wrong.
  function onRemote(f, b) {
    if (st.remote.has(f)) return; st.remote.set(f, b); const rb = st.rb; if (!rb) return;
    while (st.remote.has(rb.confirmed + 1)) rb.confirmed++;
    if (f >= rb.confirmed) rb.lastRemote = st.remote.get(rb.confirmed);
    if (rb.predicted.has(f)) { if (rb.predicted.get(f) !== b) rb.pending = rb.pending == null ? f : Math.min(rb.pending, f); rb.predicted.delete(f); }
  }
  function send(o) { if (st.conn && st.conn.open) st.conn.send(o); }
  function sendFast(o) { if (st.fast && st.fast.open) st.fast.send(o); else send(o); }
  // Send every local input the peer hasn't acknowledged yet (max 16 frames) — packet loss just means the next packet covers it.
  function sendInputs(upto) {
    const from = Math.max(st.peerAck + 1, upto - 15, 0), b = [];
    for (let f = from; f <= upto; f++) { if (!st.local.has(f)) break; b.push(st.local.get(f)); }
    if (b.length) sendFast({ t: 'in', f: from, b, a: st.rb ? st.rb.confirmed : -1 });
  }
  function ping() { if (st.status !== 'connected') return; sendFast({ t: 'ping', ts: performance.now() }); setTimeout(ping, 500); if (!st.path || (st.pingN = (st.pingN || 0) + 1) % 4 === 0) detectPath(); }
  function emit(t, d) { (st.handlers[t] || []).forEach(fn => fn(d)); }
  function on(t, fn) { (st.handlers[t] = st.handlers[t] || []).push(fn); }
  const encode = s => BITS.reduce((b, k, i) => b | (s[k] ? 1 << i : 0), 0);
  const decode = b => Object.fromEntries(BITS.map((k, i) => [k, !!(b & (1 << i))]));
  // Rollback tick, once per game update during an online fight.
  // sim = { step([p1, p2]), save() -> snapshot, load(snapshot), hash() -> int }
  function tick(localState, sim) {
    if (st.inbox.length) { const now = performance.now(); st.inbox.sort((a, b) => a.at - b.at); while (st.inbox.length && st.inbox[0].at <= now) handle(st.inbox.shift().d); }
    const rb = st.rb, bitsLocal = encode(localState);
    const target = st.sim + st.delay;
    if (!st.local.has(target)) st.local.set(target, bitsLocal);
    sendInputs(target);
    // 1) rollback + re-simulate if a prediction was wrong
    if (rb.pending != null && rb.pending < st.sim && rb.snaps.has(rb.pending)) {
      const from = rb.pending; rb.pending = null; st.rollbacks++; st.maxDepth = Math.max(st.maxDepth, st.sim - from);
      sim.load(rb.snaps.get(from)); RESIM = true;
      try { for (let f = from; f < st.sim; f++) runFrame(f, sim); } finally { RESIM = false; }
    } else rb.pending = null;
    // 2) don't run too far ahead of the last confirmed remote frame
    if (st.sim - rb.confirmed > MAXROLL) { st.waitT++; return st.waitT > 20; }
    st.waitT = 0;
    if (!st.local.has(st.sim)) return false;
    runFrame(st.sim, sim); st.sim++;
    // desync check: once frame F is fully confirmed, hash the saved snapshot taken right after it
    for (let F = Math.floor((rb.confirmed - 1) / 120) * 120; F > 0 && F + 1 <= rb.confirmed && !rb.reported.has(F) && rb.snaps.has(F + 1); F -= 120) { rb.reported.add(F); report(F, sim.hashSnap(rb.snaps.get(F + 1))); }
    // housekeeping
    for (const k of rb.snaps.keys()) if (k < rb.confirmed - 2) rb.snaps.delete(k);
    for (const k of st.local.keys()) if (k < rb.confirmed - 60) { st.local.delete(k); st.remote.delete(k); }
    return false;
  }
  function runFrame(f, sim) {
    const rb = st.rb; rb.snaps.set(f, sim.save());
    let theirs;
    if (st.remote.has(f)) { theirs = st.remote.get(f); rb.predicted.delete(f); }
    else { theirs = rb.lastRemote; rb.predicted.set(f, theirs); }          // predict: they keep doing what they did
    const mine = decode(st.local.get(f)), them = decode(theirs);
    sim.step(st.role === 'host' ? [mine, them] : [them, mine]);
  }
  function checkHash(f, h, who) { const e = st.hashes[f] = st.hashes[f] || {}; e[who] = h; if (e.local != null && e.remote != null) { if (e.local !== e.remote) st.desync = true; delete st.hashes[f]; } }
  function report(f, h) { checkHash(f, h, 'local'); send({ t: 'hash', f, h }); }
  return { st, host, join, reset, resetFrames, send, on, tick, report, pickDelay, MAXROLL, get online() { return st.status === 'connected'; } };
})();

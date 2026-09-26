// TOKKEN public leaderboard client (Cloudflare Worker + D1 backend).
const Board = (() => {
  const API = 'https://api.tokken.win';
  const st = { top: [], status: 'idle', last: null, name: '', pid: '' };
  try { st.name = localStorage.getItem('tokken.name') || ''; st.pid = localStorage.getItem('tokken.pid') || ''; } catch (e) {}
  if (!st.pid) { st.pid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem('tokken.pid', st.pid); } catch (e) {} }
  function setName(n) { st.name = n.toUpperCase().replace(/[^A-Z0-9 ._-]/g, '').trim().slice(0, 12); try { localStorage.setItem('tokken.name', st.name); } catch (e) {} }
  async function refresh() {
    st.status = 'loading';
    try { const r = await fetch(API + '/top?limit=20'); st.top = (await r.json()).top || []; st.status = 'ok'; }
    catch (e) { st.status = 'offline'; }
  }
  async function submit(m) {
    st.last = { pending: true };
    try {
      const r = await fetch(API + '/match', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pid: st.pid, name: st.name || 'ANON', ...m }) });
      const d = await r.json(); st.last = r.ok ? { points: d.points, rank: d.rank } : { error: d.error || 'rejected' };
    } catch (e) { st.last = { error: 'LEADERBOARD OFFLINE' }; }
  }
  return { st, setName, refresh, submit };
})();

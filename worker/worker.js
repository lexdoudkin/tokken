// TOKKEN public leaderboard — Cloudflare Worker + D1.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', ...CORS } });
const FIGHTERS = ['claude', 'codex', 'gemini', 'grok', 'llama', 'dolphin', 'deepseek', 'mistral', 'perplexity', 'muse', 'qwen', 'siri', 'cursor', 'clippy'];
const cleanName = n => String(n || '').toUpperCase().replace(/[^A-Z0-9 ._-]/g, '').trim().slice(0, 12) || 'ANON';
// Points are decided here, not by the client.
function points(m) {
  if (!m.won) return 2;                                        // participation trophy
  let p = m.mode === 'online' ? 50 : [5, 10, 20, 35][m.diff | 0] || 10;
  if (m.perfect) p += 25;
  p += Math.min(15, (m.combo | 0));
  return p;
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/top') {
      const lim = Math.min(50, +url.searchParams.get('limit') || 20);
      const { results } = await env.DB.prepare('SELECT name, points, wins, losses, best_combo, perfects, main FROM players ORDER BY points DESC, wins DESC LIMIT ?').bind(lim).all();
      return json({ top: results });
    }
    if (url.pathname === '/match' && req.method === 'POST') {
      let m; try { m = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const pid = String(m.pid || '').replace(/[^a-z0-9]/gi, '').slice(0, 32);
      if (pid.length < 8 || !FIGHTERS.includes(m.fighter) || !['cpu', 'online', 'local'].includes(m.mode)) return json({ error: 'bad match' }, 400);
      if (m.mode === 'local') return json({ ok: true, skipped: 'local matches are unranked' });
      if ((m.combo | 0) > 40 || (m.perfect && !m.won) || ((m.diff | 0) < 0 || (m.diff | 0) > 3)) return json({ error: 'nice try' }, 400);
      // per-IP limit: 30 submissions / hour (a real match takes ~2 minutes)
      const ip = req.headers.get('CF-Connecting-IP') || 'x', hour = Math.floor(Date.now() / 3600000);
      const hits = await env.DB.prepare('INSERT INTO ip_hits (ip, hour, n) VALUES (?1, ?2, 1) ON CONFLICT(ip, hour) DO UPDATE SET n = n + 1 RETURNING n').bind(ip, hour).first();
      if (hits && hits.n > 30) return json({ error: 'slow down, champ' }, 429);
      const now = Date.now(), name = cleanName(m.name);
      const row = await env.DB.prepare('SELECT updated, mains FROM players WHERE pid = ?').bind(pid).first();
      if (row && now - row.updated < 20000) return json({ error: 'slow down, champ' }, 429);
      const mains = row ? JSON.parse(row.mains || '{}') : {}; mains[m.fighter] = (mains[m.fighter] || 0) + 1;
      const main = Object.entries(mains).sort((a, b) => b[1] - a[1])[0][0], pts = points(m), won = m.won ? 1 : 0;
      await env.DB.prepare(`INSERT INTO players (pid, name, points, wins, losses, best_combo, perfects, main, mains, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        ON CONFLICT(pid) DO UPDATE SET name = ?2, points = points + ?3, wins = wins + ?4, losses = losses + ?5, best_combo = MAX(best_combo, ?6), perfects = perfects + ?7, main = ?8, mains = ?9, updated = ?10`)
        .bind(pid, name, pts, won, 1 - won, Math.min(99, m.combo | 0), m.won && m.perfect ? 1 : 0, main, JSON.stringify(mains), now).run();
      const rank = await env.DB.prepare('SELECT COUNT(*) + 1 AS r FROM players WHERE points > (SELECT points FROM players WHERE pid = ?)').bind(pid).first();
      return json({ ok: true, points: pts, rank: rank.r });
    }
    return json({ name: 'TOKKEN leaderboard', endpoints: ['/top', 'POST /match'] });
  },
};

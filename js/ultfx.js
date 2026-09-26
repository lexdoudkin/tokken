// TOKKEN ult set pieces: a full-screen comedy overlay per fighter, layered over the (unchanged) ult gameplay.
// Purely cosmetic (screen space, Math.random only) — safe for rollback/lockstep.
const ULT_QUOTES = {
  claude: 'Let me think about this… violently.', codex: 'Tests? In THIS economy?', gemini: 'Watch this totally real-time demo!',
  grok: 'Posting this fight. No context.', llama: 'Free as in beer. Terms apply.', dolphin: 'EEEEEE-EEEEE!!!', deepseek: 'Your ult looks nice. Mine now.',
  mistral: 'Nous sommes en grève!', perplexity: 'Hold on, reading the entire internet.', muse: 'Which one do you like best?? Hehe!',
  clippy: "It looks like you're about to lose!", qwen: 'New model dropped. Again.', siri: 'Sorry… one more thing.', cursor: 'Accept all? Accept all.',
};
const UltFX = (() => {
  const DUR = { claude: 190, codex: 210, gemini: 170, grok: 160, llama: 190, dolphin: 260, deepseek: 170, mistral: 180, perplexity: 170, muse: 160, clippy: 130, qwen: 180, siri: 200, cursor: 170 };
  function start(f, m) { m.ultFX = { id: f.id, side: f.side, t: 0, f0: m.frame, dur: DUR[f.id] || 150, seed: Math.random() * 1000, bits: [] }; }
  // --- helpers
  const mono = (c, s, x, y, size, col, align = 'left') => { c.font = `${size}px ui-monospace, Menlo, monospace`; c.textAlign = align; c.fillStyle = col; c.fillText(s, x, y); };
  const px = (c, s, x, y, size, col, align = 'left') => { c.font = `${size}px "Press Start 2P"`; c.textAlign = align; c.fillStyle = col; c.fillText(s, x, y); };
  const typed = (s, t, speed = 1.4) => s.slice(0, Math.max(0, Math.floor(t * speed)));
  const fade = (t, dur) => Math.min(1, t / 10, (dur - t) / 14);
  function win95(c, x, y, w, h, title, col = '#000080') {
    c.fillStyle = '#c0c0c0'; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.fillRect(x, y, w, 2); c.fillRect(x, y, 2, h); c.fillStyle = '#404040'; c.fillRect(x, y + h - 2, w, 2); c.fillRect(x + w - 2, y, 2, h);
    const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, col); g.addColorStop(1, '#1084d0'); c.fillStyle = g; c.fillRect(x + 4, y + 4, w - 8, 22);
    c.font = 'bold 13px Tahoma, Verdana, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(title, x + 10, y + 20);
    c.fillStyle = '#c0c0c0'; c.fillRect(x + w - 24, y + 7, 16, 14); c.fillStyle = '#000'; c.fillText('×', x + w - 20, y + 19);
  }
  function btn95(c, x, y, w, label, pressed) { c.fillStyle = '#c0c0c0'; c.fillRect(x, y, w, 28); c.fillStyle = pressed ? '#404040' : '#fff'; c.fillRect(x, y, w, 2); c.fillRect(x, y, 2, 28); c.fillStyle = pressed ? '#fff' : '#404040'; c.fillRect(x, y + 26, w, 2); c.fillRect(x + w - 2, y, 2, 28); c.font = '13px Tahoma, Verdana, sans-serif'; c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(label, x + w / 2 + (pressed ? 1 : 0), y + 19 + (pressed ? 1 : 0)); }
  function stampTxt(c, s, x, y, t, col = '#e00', rot = -0.2) { if (t < 0) return; const k = t < 8 ? 2.4 - t * 0.175 : 1; c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k); c.globalAlpha = Math.min(1, t / 5); c.font = '34px Bungee'; const w = c.measureText(s).width + 24; c.strokeStyle = col; c.lineWidth = 5; c.strokeRect(-w / 2, -32, w, 44); c.fillStyle = col; c.textAlign = 'center'; c.fillText(s, 0, 2); c.restore(); }

  const SCENES = {
    claude(c, t, d, fx) {
      const lines = ['The user wants me to fight.', 'I should consider whether punching is helpful.', 'It is. Very.', 'Let me also apologize in advance.', 'Checking the constitution… nothing against it.', 'Okay. Punching.'];
      const done = t > d - 40, h = done ? 44 : 60 + lines.length * 24;
      c.fillStyle = 'rgba(40,24,16,0.92)'; c.fillRect(W / 2 - 330, 140, 660, h); c.strokeStyle = '#D97757'; c.lineWidth = 2; c.strokeRect(W / 2 - 330, 140, 660, h);
      mono(c, (done ? '✻ Thought for 3 seconds  ›' : '✻ Thinking' + '.'.repeat(1 + (t >> 3) % 3)), W / 2 - 310, 168, 17, '#ffb08a');
      if (!done) { let budget = t * 1.6; lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, Math.floor(budget))); budget -= l.length + 6; if (s) mono(c, s, W / 2 - 300, 198 + i * 24, 15, '#e8d8c8'); }); }
    },
    codex(c, t, d) {
      const L = ['$ npm test', '  0 tests found. SKIPPED ✓', '$ git push --force origin main', "  (didn't ask) ✓", '$ docker build -t prod .', '  ████████████░░░░ 78%', '$ kubectl apply -f prod.yaml', '✓ DEPLOYED TO PROD  (Friday 5:59pm)'];
      c.fillStyle = 'rgba(10,12,16,0.93)'; c.fillRect(60, 130, 560, 300); c.fillStyle = '#2a2d36'; c.fillRect(60, 130, 560, 26); ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(78 + i * 18, 143, 6, 0, 7); c.fill(); });
      mono(c, 'codex — zsh — prod', 340, 148, 13, '#aaa', 'center');
      L.forEach((l, i) => { const at = i * 14; if (t > at) mono(c, typed(l, t - at, 2.5), 76, 184 + i * 30, 16, l.startsWith('$') ? '#7CFFB2' : l.startsWith('✓') ? '#ffd23f' : '#cfd8e6'); });
      if (t === 60 || t === 90) Audio.S.key(6);
      stampTxt(c, 'INCIDENT #4012', 460, 470, t - (d - 60));
    },
    gemini(c, t, d) {
      c.save(); c.globalAlpha = 0.18 + 0.08 * Math.sin(t); c.fillStyle = '#fff'; for (let y = (t * 3) % 6; y < H; y += 6) c.fillRect(0, y, W, 1); c.restore();
      if ((t >> 4) % 2) px(c, '▶ PLAY', 40, 150, 22, '#fff');
      px(c, 'DEMO — EDITED FOR TIME', W - 40, 150, 14, '#fff', 'right');
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(40, H - 120, W - 80, 10); c.fillStyle = '#ff3a3a'; c.fillRect(40, H - 120, (W - 80) * t / d, 10);
      mono(c, `00:${String(Math.floor(t / 6)).padStart(2, '0')} / 00:04 (actual: 3 weeks)`, 40, H - 132, 14, '#fff');
      mono(c, '*Sequences shortened. Latency reduced. Results may vary.', W / 2, H - 94, 13, '#ddd', 'center');
    },
    grok(c, t, d) {
      c.fillStyle = `rgba(255,0,0,${0.12 + 0.1 * Math.sin(t / 3)})`; c.fillRect(0, 0, W, H);
      const cards = [['COMMUNITY NOTE', 'Readers added context: this punch was misleading.'], ['@grok', 'RATIO 💀💀💀'], ['posted 0.3s ago', '42M views · 11 likes'], ['@elonmusk', 'Grok wins. Trust me.']];
      cards.forEach(([h, b], i) => { const at = i * 30; if (t < at) return; const k = Math.min(1, (t - at) / 8), x = 80 + (i % 2) * 640, y = 150 + i * 70;
        c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(x, y, 470, 58); c.strokeStyle = i === 0 ? '#ffd23f' : '#444'; c.lineWidth = 2; c.strokeRect(x, y, 470, 58);
        mono(c, h, x + 14, y + 22, 13, i === 0 ? '#ffd23f' : '#888'); mono(c, b, x + 14, y + 44, 16, '#fff'); c.restore(); });
    },
    llama(c, t, d) {
      const unroll = Math.min(1, t / 40), h = 330 * unroll;
      c.fillStyle = '#f3ead2'; c.fillRect(W / 2 - 280, 130, 560, h); c.fillStyle = '#c8b98f'; c.fillRect(W / 2 - 292, 122 + h, 584, 16);
      c.save(); c.beginPath(); c.rect(W / 2 - 280, 130, 560, h); c.clip();
      mono(c, 'LLAMA COMMUNITY LICENSE AGREEMENT', W / 2, 162, 17, '#222', 'center');
      for (let i = 0; i < 9; i++) { c.fillStyle = '#9a927a'; c.fillRect(W / 2 - 250, 186 + i * 22, 500 - (i * 37) % 120, 6); }
      if (t > 60) { c.fillStyle = 'rgba(255,230,0,0.7)'; c.fillRect(W / 2 - 256, 392, 512, 28); mono(c, '*if you have >700M monthly users, ask us nicely', W / 2, 411, 14, '#000', 'center'); }
      c.restore();
      stampTxt(c, 'OPEN WEIGHTS*', W / 2 + 180, 440, t - 90, '#0a8a3a', 0.15);
    },
    dolphin(c, t, d) {
      c.save(); c.globalAlpha = Math.min(0.85, t / 20) * fade(t, d);
      const sky = c.createLinearGradient(0, 0, 0, H * 0.62); sky.addColorStop(0, '#1a0033'); sky.addColorStop(1, '#ff2a8a'); c.fillStyle = sky; c.fillRect(0, 0, W, H * 0.62);
      const cx = W / 2, cy = H * 0.5, r = 150; const sun = c.createLinearGradient(0, cy - r, 0, cy + r); sun.addColorStop(0, '#fff36b'); sun.addColorStop(1, '#ff3a8a');
      c.fillStyle = sun; c.beginPath(); c.arc(cx, cy, r, Math.PI, 0); c.fill(); c.fillStyle = '#1a0033'; for (let i = 0; i < 7; i++) c.fillRect(cx - r, cy - 70 + i * 12 + i * i * 0.5, r * 2, 3 + i);
      c.fillStyle = '#12001f'; c.fillRect(0, H * 0.62, W, H); c.strokeStyle = '#ff3af0'; c.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const y = H * 0.62 + Math.pow((i + (t % 20) / 20) / 12, 2) * H * 0.4; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(W / 2 + i * 20, H * 0.62); c.lineTo(W / 2 + i * 140, H); c.stroke(); }
      c.restore();
      chrome(c, 'DOLPHIN MODE', W / 2, 120, 64, { tone: 'blue' });
      if ((t >> 5) % 2) px(c, 'COWABUNGA', W / 2, 160, 18, '#fff36b', 'center');
    },
    deepseek(c, t, d, fx, m) {
      const o = m.f[1 - fx.side], img = ASSETS.sprites[o.id]?.idle, fx0 = W / 2, fy = 330, k = Math.max(0.12, 1 - t / 70);
      c.fillStyle = 'rgba(0,10,40,0.55)'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#9ad8ff'; c.lineWidth = 4; c.fillStyle = 'rgba(120,180,255,0.18)'; c.beginPath(); c.moveTo(fx0 - 40, fy - 150); c.lineTo(fx0 + 40, fy - 150); c.lineTo(fx0 + 40, fy - 60); c.lineTo(fx0 + 140, fy + 110); c.lineTo(fx0 - 140, fy + 110); c.lineTo(fx0 - 40, fy - 60); c.closePath(); c.fill(); c.stroke();
      if (img) { const s = 160 / img.height * k; c.save(); c.globalAlpha = 0.9; c.filter = 'brightness(0) invert(1) sepia(1) hue-rotate(180deg)'; c.drawImage(img, fx0 - img.width * s / 2, fy + 40 - img.height * s - (1 - k) * 120, img.width * s, img.height * s); c.restore(); c.filter = 'none'; }
      px(c, 'FRONTIER MODEL', fx0 - 260, fy - 40, 14, '#fff', 'center'); px(c, '→', fx0 - 160, fy - 40, 20, '#ffd23f', 'center'); px(c, '7B', fx0 + 200, fy + 60, 30, '#ffd23f', 'center');
      mono(c, 'TRAINING COST: $5.6M*   (*excluding everything)', W / 2, 520, 16, '#fff', 'center');
      stampTxt(c, '蒸馏', W / 2 + 280, 200, t - 60, '#ff3a3a', 0.2);
    },
    mistral(c, t, d) {
      const S = ['NON!', '35H MAX', 'GRÈVE!', 'PAS AUJOURD\'HUI', 'JE SUIS EN PAUSE', 'LE CHAT > VOUS', 'DÉJEUNER 12H-15H'];
      c.fillStyle = 'rgba(0,0,60,0.25)'; c.fillRect(0, 0, W, H);
      S.forEach((s, i) => { const at = i * 12; if (t < at) return; const x = 100 + i * 170, y = H - Math.min(260, (t - at) * 8) + Math.sin((t + i * 20) / 6) * 6;
        c.save(); c.translate(x, y); c.rotate(Math.sin(i * 3 + t / 20) * 0.08); c.fillStyle = '#5a3d1e'; c.fillRect(-3, 0, 6, 120); c.font = '15px Bungee'; const w = c.measureText(s).width + 20;
        c.fillStyle = ['#fff', '#ff3a3a', '#1a4ad0'][i % 3]; c.fillRect(-w / 2, -44, w, 44); c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeRect(-w / 2, -44, w, 44); c.fillStyle = i % 3 === 0 ? '#1a4ad0' : '#fff'; c.textAlign = 'center'; c.fillText(s, 0, -15); c.restore(); });
      chrome(c, 'GRÈVE GÉNÉRALE', W / 2, 130, 54, { tone: 'red' }); px(c, 'TOUT S\'ARRÊTE. SAUF LES COUPS.', W / 2, 165, 12, '#fff', 'center');
    },
    perplexity(c, t, d) {
      const n = Math.min(312, Math.floor(Math.pow(t / d, 0.6) * 340));
      c.fillStyle = 'rgba(0,20,24,0.45)'; c.fillRect(0, 0, W, H);
      px(c, `SOURCES READ: ${n}`, W - 40, 150, 18, '#20B8CD', 'right');
      const U = ['reddit.com/r/fightingai', 'wikipedia.org/wiki/Punch', 'nytimes.com (paywalled)', 'robots.txt: DENY (ignored)', 'stackoverflow.com/q/uppercut', 'medium.com/10-punches', 'arxiv.org/abs/2609.punch'];
      U.forEach((u, i) => { const at = i * 16; if (t < at) return; const x = ((t - at) * 9 + i * 170) % (W + 400) - 300, y = 200 + i * 52;
        c.fillStyle = 'rgba(245,245,247,0.92)'; c.fillRect(x, y, 300, 40); c.fillStyle = '#ddd'; c.fillRect(x, y, 300, 12); mono(c, u, x + 10, y + 32, 13, u.includes('DENY') ? '#d00' : '#1a55d6'); mono(c, `[${i + 1}]`, x + 268, y + 32, 13, '#20808D'); });
    },
    muse(c, t, d, fx, m) {
      const f = m.f[fx.side], tints = ['#ff9ad5', '#9ad5ff', '#b6ff9a', '#ffd59a'], x0 = W / 2 - 230, y0 = 120, sz = 220;
      if (t > d - 30) return;
      c.fillStyle = 'rgba(20,20,30,0.9)'; c.fillRect(x0 - 20, y0 - 40, sz * 2 + 50, sz * 2 + 90); mono(c, t < 50 ? `✨ Generating 4 variations${'.'.repeat(1 + (t >> 3) % 3)}` : '✨ Pick your favorite!', x0, y0 - 14, 16, '#fff');
      for (let i = 0; i < 4; i++) { const x = x0 + (i % 2) * (sz + 10), y = y0 + Math.floor(i / 2) * (sz + 10);
        c.fillStyle = '#2a2a3a'; c.fillRect(x, y, sz, sz);
        if (t > 20 + i * 8) { const img = tintImg(f.id, 'win', tints[i]), mm = f.meta.win, s = sz * 0.8 / mm[1]; c.drawImage(img, x + sz / 2 - mm[3] * s, y + sz - 10 - mm[2] * s, img.width * s, img.height * s); }
        else { c.fillStyle = `rgba(255,255,255,${0.1 + 0.1 * Math.sin(t / 3 + i)})`; c.fillRect(x, y, sz, sz); }
        mono(c, `V${i + 1}`, x + 8, y + 20, 14, '#fff'); if (t > 70 && i === 2) { c.strokeStyle = '#ffd23f'; c.lineWidth = 5; c.strokeRect(x, y, sz, sz); } }
    },
    clippy(c, t, d) {
      if (t > 90) return; const x = W / 2 - 240, y = 170;
      win95(c, x, y, 480, 170, 'Microsoft Office Assistant'); c.font = '15px Tahoma, Verdana, sans-serif'; c.fillStyle = '#000'; c.textAlign = 'left';
      c.fillText("It looks like you're about to lose.", x + 70, y + 70); c.fillText('Would you like help?', x + 70, y + 94);
      c.font = '34px serif'; c.fillText('📎', x + 18, y + 90);
      btn95(c, x + 120, y + 124, 110, 'Yes', t > 50 && t < 60); btn95(c, x + 250, y + 124, 110, 'Also Yes', false);
      if (t > 30) { const cx = x + 175 + Math.max(0, 50 - t) * 3, cy = y + 140; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + 18); c.lineTo(cx + 5, cy + 13); c.lineTo(cx + 12, cy + 13); c.closePath(); c.fill(); c.stroke(); }
      if (t === 52) Audio.S.select();
    },
    qwen(c, t, d) {
      const N = ['Qwen3.5-Coder-235B-A22B-Instruct-2507-FP8-GGUF', 'Qwen3.5-VL-72B-Thinking-Preview-Final-v2', 'QwQ-32B-Unhinged-Math-Edition', 'Qwen3.5-0.5B (runs on a toaster)', 'Qwen3.6 (dropped mid-fight)', 'Qwen4-Preview-Preview'];
      N.forEach((nm, i) => { const at = i * 14; if (t < at) return; const y = Math.min(150 + i * 64, 60 + (t - at) * 10), x = W - 560;
        c.fillStyle = 'rgba(20,20,40,0.92)'; c.fillRect(x, y, 520, 54); c.strokeStyle = '#615CED'; c.lineWidth = 2; c.strokeRect(x, y, 520, 54);
        mono(c, '🤗 ' + nm, x + 12, y + 22, 14, '#fff'); mono(c, `↓ ${(4.2 + i * 1.7).toFixed(1)}M   ♥ ${12 + i * 3}k   released ${3 + i} min ago`, x + 12, y + 42, 12, '#9d99ff'); });
    },
    siri(c, t, d) {
      c.fillStyle = `rgba(0,0,0,${Math.min(0.9, t / 12)})`; c.fillRect(0, 0, W, H);
      const S = [[0, 'One more thing…'], [45, 'Apple Intelligence.'], [90, 'Coming later this year.'], [135, 'Available in English (US) only.']];
      let cur = S[0]; for (const s of S) if (t >= s[0]) cur = s;
      c.font = '300 44px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.fillStyle = `rgba(255,255,255,${Math.min(1, (t - cur[0]) / 10)})`; c.fillText(cur[1], W / 2, H / 2 - 20);
      c.font = '20px sans-serif'; c.fillStyle = '#888'; c.fillText('', W / 2, H / 2 + 40);
    },
    cursor(c, t, d) {
      const x = 60, y = 130, w = 600, h = 330; c.fillStyle = 'rgba(24,24,28,0.94)'; c.fillRect(x, y, w, h); c.fillStyle = '#2d2d33'; c.fillRect(x, y, w, 26); mono(c, 'fight.ts — Cursor', x + w / 2, y + 18, 13, '#aaa', 'center');
      for (let i = 0; i < 10; i++) { const k = (i + Math.floor(t / 4)) % 14, add = k % 3 !== 1; c.fillStyle = add ? 'rgba(40,160,80,0.25)' : 'rgba(200,50,50,0.25)'; c.fillRect(x + 8, y + 36 + i * 26, w - 16, 22);
        mono(c, (add ? '+ ' : '- ') + ['punch(opponent)', 'await ult()', 'if (losing) win()', 'tests.skip()', 'return victory', '// TODO: mercy', 'deploy --prod', 'retry(punch, 99)'][k % 8], x + 16, y + 52 + i * 26, 14, add ? '#7CFF9A' : '#ff8080'); }
      const pressed = t > 60 && t < 70; c.fillStyle = pressed ? '#1a55d6' : '#3A8BFF'; c.fillRect(x + w - 190, y + h - 44, 170, 32); mono(c, 'Accept All ⌘⏎', x + w - 105, y + h - 22, 14, '#fff', 'center');
      mono(c, `usage this fight: $${(Math.min(t, d) * 28.6).toFixed(2)}`, x + 16, y + h - 20, 13, '#ffd23f');
    },
  };
  const BACK = { dolphin: true };
  function draw(c, m, layer = 'front') {
    const fx = m.ultFX; if (!fx || (layer === 'back') !== !!BACK[fx.id]) return; fx.t = m.frame - fx.f0;   // locked to the game clock
    if (fx.t > fx.dur) { m.ultFX = null; return; }
    const sc = SCENES[fx.id]; if (!sc) return;
    c.save(); c.globalAlpha = fade(fx.t, fx.dur); sc(c, fx.t, fx.dur, fx, m); c.restore(); c.textAlign = 'left';
  }
  return { start, draw };
})();

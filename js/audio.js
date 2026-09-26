// TOKKEN audio: everything synthesized with WebAudio. Ridiculously overproduced on purpose.
const Audio = (() => {
  let ctx, master, sfxBus, musicBus, crowdGain, comp, noiseBuf, musicOn = false, nextNote = 0, step = 0, musicTimer, mode = 'normal';
  let muted = false;
  // Mixer settings (0..1), persisted per viewer. Base levels were balanced after loudness-normalizing every clip.
  const VOL = { master: 0.85, music: 0.6, sfx: 0.8, announcer: 0.9, commentary: 0.85, voices: 0.9 };
  try { Object.assign(VOL, JSON.parse(localStorage.getItem('tokken.vol') || '{}')); } catch (e) {}
  const BASE = { music: 0.55, sfx: 1.0, announcer: 1.0, commentary: 0.95, voices: 1.05 };
  let charBus;
  function applyVol() {
    if (!ctx) return;
    master.gain.value = muted ? 0 : VOL.master; sfxBus.gain.value = BASE.sfx * VOL.sfx;
    if (annBus) annBus.gain.value = BASE.announcer * VOL.announcer * 1.0;
    if (casBus) casBus.gain.value = BASE.commentary * VOL.commentary;
    if (charBus) charBus.gain.value = BASE.voices * VOL.voices;
    musicBus.gain.value = musicLevel();
  }
  const musicLevel = () => BASE.music * VOL.music * (trackName ? 1 : 0.7);
  function setVol(k, v) { VOL[k] = Math.max(0, Math.min(1, v)); try { localStorage.setItem('tokken.vol', JSON.stringify(VOL)); } catch (e) {} applyVol(); }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;   // browsers refuse audio before the first tap/key; next gesture retries
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination); 
    master = ctx.createGain(); master.gain.value = VOL.master; master.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // crowd bed: filtered noise, swells on big moments
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.0;
    n.connect(bp); bp.connect(crowdGain); crowdGain.connect(master); n.start();
    mkBuses(); applyVol();
  }
  const t0 = () => ctx.currentTime;

  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function osc(type, f0, f1, dur, vol, when = 0, bus = sfxBus) {
    if (!ctx) return; const t = t0() + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, 0.004, vol, dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq = 1000, type = 'bandpass', q = 1, when = 0, f1) {
    if (!ctx) return; const t = t0() + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4; f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q;
    env(g, t, 0.003, vol, dur); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  const S = {
    light() { osc('sine', 420, 90, 0.12, 0.7); noise(0.06, 0.5, 2500); osc('square', 900, 700, 0.03, 0.08); },
    heavy() { osc('sine', 160, 38, 0.35, 1.0); osc('triangle', 90, 30, 0.4, 0.6); noise(0.18, 0.7, 900, 'lowpass'); noise(0.08, 0.4, 4000); },
    huge() { osc('sine', 120, 25, 0.8, 1.0); osc('sawtooth', 70, 20, 0.6, 0.35); noise(0.5, 0.9, 600, 'lowpass', 1, 0, 80); noise(0.2, 0.5, 5000); },
    block() { osc('square', 1400, 900, 0.05, 0.15); noise(0.05, 0.4, 5000, 'highpass'); osc('sine', 300, 200, 0.06, 0.3); },
    whoosh() { noise(0.16, 0.35, 600, 'bandpass', 2, 0, 3000); },
    jump() { osc('square', 220, 520, 0.09, 0.08); },
    land() { osc('sine', 110, 50, 0.1, 0.35); noise(0.06, 0.2, 400, 'lowpass'); },
    tok(n = 3) { for (let i = 0; i < n; i++) { osc('square', 1800 - i * 90, 1200, 0.025, 0.09, i * 0.045); osc('sine', 600, 300, 0.03, 0.2, i * 0.045); } },
    key(n = 6) { for (let i = 0; i < n; i++) { noise(0.02, 0.45, 3500 + Math.random() * 2000, 'bandpass', 3, i * (0.03 + Math.random() * 0.03)); osc('square', 2600, 2000, 0.01, 0.05, i * 0.04); } },
    error() { osc('square', 880, 0, 0.12, 0.2); osc('square', 587, 0, 0.18, 0.2, 0.12); osc('square', 440, 0, 0.3, 0.2, 0.3); },
    notif() { osc('sine', 1318, 0, 0.08, 0.25); osc('sine', 1760, 0, 0.14, 0.25, 0.08); },
    slop() { osc('sawtooth', 300, 60, 0.4, 0.3); noise(0.4, 0.6, 400, 'lowpass', 2, 0, 100); for (let i = 0; i < 4; i++) osc('sine', 200 + Math.random() * 600, 100, 0.08, 0.15, 0.05 + i * 0.05); },
    throw() { osc('sawtooth', 200, 900, 0.18, 0.15); noise(0.18, 0.3, 1200, 'bandpass', 3, 0, 4000); },
    beam() { osc('sawtooth', 110, 220, 0.6, 0.25); osc('square', 880, 1760, 0.6, 0.06); noise(0.6, 0.25, 3000, 'bandpass', 4); },
    charge() { osc('sawtooth', 80, 800, 0.9, 0.2); osc('sine', 160, 1600, 0.9, 0.2); },
    modem() { for (let i = 0; i < 10; i++) osc(i % 2 ? 'square' : 'sine', 1200 + Math.random() * 1800, 0, 0.05, 0.08, i * 0.05); noise(0.5, 0.15, 2000, 'bandpass', 8); },
    ko() { if (!ctx) return; S.error(); setTimeout(() => { S.huge(); crowd(1.0, 2.5); }, 380); },
    select() { osc('square', 660, 0, 0.06, 0.12); osc('square', 990, 0, 0.08, 0.1, 0.05); },
    move() { osc('square', 440, 0, 0.03, 0.07); },
    heal() { for (let i = 0; i < 6; i++) osc('sine', 523 * Math.pow(1.26, i), 0, 0.12, 0.15, i * 0.06); },
    ult() { S.charge(); osc('sine', 55, 30, 1.4, 0.8, 0.3); noise(1.2, 0.3, 200, 'lowpass', 1, 0.2, 2000); },
    boo() { crowd(0.5, 1.2, 250); },
  };
  let lastCrowd = 0;
  // Prefer ElevenLabs samples; fall back to synth.
  const SYN = {};
  for (const k of Object.keys(S)) { SYN[k] = S[k]; S[k] = (...a) => { if (window.RESIM_ON) return; const b = bank['sfx_' + k]; if (b && ctx && !muted) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = 0.94 + Math.random() * 0.12; g.gain.value = SFXVOL[k] ?? 0.8; s.connect(g); g.connect(sfxBus); s.start(); if (k === 'key' || k === 'light' || k === 'heavy') SYN.tok && 0; } else SYN[k](...a); }; }
  const SFXVOL = { light: 0.75, heavy: 0.9, huge: 1, block: 0.6, whoosh: 0.45, jump: 0.35, land: 0.4, move: 0.4, select: 0.5, ko: 1, ult: 0.9 };
  function crowd(level = 0.6, dur = 1.5, freq = 700) { if (window.RESIM_ON) return false;
    if (!ctx) return;
    const k = freq === 250 ? 'sfx_boo' : level >= 0.9 ? 'sfx_cheer' : 'sfx_ooh';
    if (bank[k]) { if (ctx.currentTime - lastCrowd < 1.2) return; lastCrowd = ctx.currentTime; sample(k, 0.35 + level * 0.5); return; } const t = t0(); crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, t); crowdGain.gain.linearRampToValueAtTime(level * 0.55, t + 0.12);
    crowdGain.gain.linearRampToValueAtTime(0.04, t + dur);
    // "OOOHHH" formant
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(freq === 250 ? 140 : 190, t); o.frequency.linearRampToValueAtTime(freq === 250 ? 110 : 150, t + dur);
    f.type = 'bandpass'; f.frequency.value = freq === 250 ? 400 : 650; f.Q.value = 3;
    env(g, t, 0.15, level * 0.12, dur); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.1);
  }

  // ---- Music: synthwave loop. Am - F - C - G, 124 bpm ----
  const BPM = 124, SPB = 60 / BPM / 4;
  const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function kick(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); env(g, t, 0.002, 0.9, 0.22); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.3); }
  function snare(t) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 1500; env(g, t, 0.002, 0.45, 0.16); s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.2); const o = ctx.createOscillator(), g2 = ctx.createGain(); o.frequency.value = 190; env(g2, t, 0.002, 0.3, 0.08); o.connect(g2); g2.connect(musicBus); o.start(t); o.stop(t + 0.1); }
  function hat(t, v = 0.12) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000; env(g, t, 0.001, v, 0.04); s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.06); }
  function synth(t, m, dur, type, vol, cut = 1800) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = o2.type = type; o.frequency.value = mtof(m); o2.frequency.value = mtof(m) * 1.006; f.type = 'lowpass'; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(cut * 0.3, t + dur); env(g, t, 0.005, vol, dur); o.connect(f); o2.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); }
  function schedule() {
    while (nextNote < ctx.currentTime + 0.12) {
      const t = nextNote, s = step % 16, bar = Math.floor(step / 16) % 4, ch = CH[bar];
      const hyper = mode === 'dolphin';
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) snare(t);
      if (hyper && s % 2 === 1) hat(t, 0.2); else if (s % 2 === 0) hat(t, 0.08);
      // bass: octave pulses
      synth(t, ch[0] - 24 + (s % 2 ? 12 : 0), SPB * 0.9, 'sawtooth', 0.22, 900);
      // arp
      if (s % 2 === 0 || hyper) synth(t, ch[(s / 2 | 0) % 3] + 12 + (hyper ? 12 : 0), SPB * 0.8, 'square', 0.05, 3000);
      // pad on bar start
      if (s === 0) ch.forEach(n => synth(t, n, SPB * 15, 'sawtooth', 0.035, 1400));
      nextNote += SPB * (hyper ? 0.85 : 1); step++;
    }
  }
  let track = null, trackName = null;
  function startMusic(name = 'battle') {
    if (!ctx) return;
    const b = bank['music_' + name];
    if (b) {
      if (trackName === name) return; stopMusic(); trackName = name;
      track = ctx.createBufferSource(); track.buffer = b; track.loop = true; track.connect(musicBus); track.start(); musicBus.gain.value = musicLevel(); return;
    }
    if (musicOn) return; musicOn = true; nextNote = ctx.currentTime + 0.05; musicTimer = setInterval(schedule, 25);
  }
  function stopMusic() { musicOn = false; clearInterval(musicTimer); if (track) { try { track.stop(); } catch (e) {} track = null; trackName = null; } }
  function setMode(m) { mode = m; }
  function duck(v = 0.08, ms = 900) { if (window.RESIM_ON) return false; if (!ctx) return; const t = t0(); musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(Math.min(musicLevel(), v * VOL.music * 1.6), t); musicBus.gain.linearRampToValueAtTime(musicLevel(), t + ms / 1000); }

  // ---- ElevenLabs voice bank (pre-rendered) ----
  const bank = {}; const charCh = {}; let annBusyUntil = 0, charBusyUntil = 0, lines = {}, loaded = 0, total = 0, charSrc = null, annBus, casBus, annSrc = null, casSrc = null, casBusyUntil = 0;
  let ALL = [], dec = null; const pending = {};
  const CORE = k => /^(round_|final_round|prompt$|ko$|time_over|versus|select$|arena$|slop_hit|token_critical|prompt_injection|thinking|title|perfect|game_over|gen_4|sfx_|b_|music_title)/.test(k);
  function fetchKey(k) {
    if (bank[k] || pending[k]) return pending[k] || Promise.resolve();
    return pending[k] = fetch(`assets/voice/${k}.mp3${window.VQ || ''}`).then(r => r.ok ? r.arrayBuffer() : null).then(b => b && dec.decodeAudioData(b)).then(buf => { if (buf) bank[k] = buf; loaded++; }).catch(() => { loaded++; });
  }
  // Load a group of clips (by predicate or key list) — used when fighters/stage are chosen.
  function ensure(sel) { const keys = typeof sel === 'function' ? ALL.filter(sel) : sel.filter(k => ALL.includes(k)); return Promise.all(keys.map(fetchKey)); }
  async function loadVoices2() {
    try {
      ALL = (await fetch('assets/voice/manifest.json' + (window.VQ || '')).then(r => r.json())).concat(['music_battle', 'music_title']);
      lines = await fetch('assets/voice/lines.json' + (window.VQ || '')).then(r => r.json()).catch(() => ({}));
      dec = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 44100, 44100);
      const core = ALL.filter(CORE); total = core.length;
      await ensure(core);
      console.log('[tokken] core voice bank', Object.keys(bank).length, '/', ALL.length, 'total clips');
      // then, quietly: select-screen lines + names, then battle music
      ensure(k => /^(v_[a-z]+_line|name_)/.test(k)).then(() => ensure(['music_battle']));
    } catch (e) { console.warn('[tokken] no voice bank', e); }
  }
  function mkBuses() {
    // announcer: big hall reverb + drive
    const conv = ctx.createConvolver(), len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    conv.buffer = ir; annBus = ctx.createGain(); annBus.gain.value = 1.35; const wet = ctx.createGain(); wet.gain.value = 0.32;
    annBus.connect(master); annBus.connect(conv); conv.connect(wet); wet.connect(master);
    casBus = ctx.createGain(); casBus.gain.value = 1.1; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180; casBus.connect(hp); hp.connect(master);
    charBus = ctx.createGain(); charBus.connect(master);
  }
  function has(k) { return !!bank[k]; }
  function play(k, opts = {}) { if (window.RESIM_ON) return false;
    if (!ctx || muted || !bank[k]) return false;
    let who = opts.who || (k.startsWith('v_') ? 'char' : k.startsWith('c_') || k.startsWith('special_') ? 'caster' : 'ann');
    if (k.startsWith('v_')) who = 'char';
    const now = ctx.currentTime, when = now + (opts.delay || 0);
    if (who === 'char') {
      // One channel per fighter: a fighter never cuts off the other one, and big lines are never skipped.
      const fid = k.split('_')[1], ch = charCh[fid] = charCh[fid] || { src: null, until: 0, prio: 0 };
      const minor = /_(atk|hurt)\d$/.test(k), prio = minor ? 0 : /_quip\d$/.test(k) ? 1 : 2;
      if (now < ch.until && prio <= ch.prio && !opts.interrupt) return false;       // don't cut own line for a smaller one
      if (ch.src && now < ch.until) try { ch.src.stop(); } catch (e) {}
      const s = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = now < casBusyUntil ? 0.85 : 1;                                  // sit slightly under the booth
      s.buffer = bank[k]; s.connect(g); g.connect(charBus); s.start(when);
      ch.src = s; ch.until = when + bank[k].duration; ch.prio = prio; return bank[k].duration;
    }
    if (who === 'caster') {
      if (now < casBusyUntil && !opts.interrupt) return false;
      if (casSrc && opts.interrupt) try { casSrc.stop(); } catch (e) {}
    } else if (annSrc && opts.interrupt !== false && !opts.delay) try { annSrc.stop(); } catch (e) {}
    const s = ctx.createBufferSource(); s.buffer = bank[k]; s.connect(who === 'caster' ? casBus : annBus); s.start(when);
    if (who === 'caster') { casSrc = s; casBusyUntil = when + bank[k].duration; } else annSrc = s;
    if (who === 'ann') { duck(0.1, bank[k].duration * 1000 + 300); annBusyUntil = when + bank[k].duration; const cv = BASE.commentary * VOL.commentary; casBus.gain.cancelScheduledValues(now); casBus.gain.setValueAtTime(cv * 0.45, now); casBus.gain.linearRampToValueAtTime(cv, annBusyUntil + 0.2); }
    return bank[k].duration;
  }
  // Commentary booth: chain several clips on the caster bus, back to back. Returns [[key, offsetSec], ...] or null if busy.
  let boothSrcs = [];
  function chain(keys, opts = {}) { if (window.RESIM_ON) return null;
    if (!ctx || muted) return null; const now = ctx.currentTime;
    if (now < casBusyUntil && !opts.interrupt) return null;
    if (opts.interrupt) { boothSrcs.forEach(s => { try { s.stop(); } catch (e) {} }); if (casSrc) try { casSrc.stop(); } catch (e) {} boothSrcs = []; }
    let t = Math.max(now + 0.03, annBusyUntil + 0.1); const starts = [];
    for (const k of keys) { if (!bank[k]) continue; const s = ctx.createBufferSource(); s.buffer = bank[k]; s.connect(casBus); s.start(t); boothSrcs.push(s); starts.push([k, t - now]); t += bank[k].duration + 0.18; }
    if (!starts.length) return null;
    casBusyUntil = t; duck(0.2, (t - now) * 1000); return starts;
  }
  function stopVoices() {
    if (!ctx) return; const kill = s => { try { s && s.stop(); } catch (e) {} };
    for (const k in charCh) { kill(charCh[k].src); charCh[k].until = 0; }
    kill(annSrc); kill(casSrc); boothSrcs.forEach(kill); boothSrcs = []; casBusyUntil = 0; annBusyUntil = 0;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  function boothBusy() { return ctx ? ctx.currentTime < casBusyUntil : false; }
  function seq(keys, gap = 0.08) { let t = 0; for (const k of keys) { if (!bank[k]) continue; play(k, { delay: t, interrupt: false }); t += bank[k].duration + gap; } return t; }
  function sample(k, vol = 1) { if (window.RESIM_ON) return false; if (!ctx || muted || !bank[k]) return; const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = vol; s.buffer = bank[k]; s.connect(g); g.connect(sfxBus); s.start(); }
  function lineText(k) { return lines[k]; }
  loadVoices2();

  // ---- Fallback: speech synthesis ----
  let voices = [], lastSpeak = 0;
  function loadVoices() { voices = speechSynthesis.getVoices(); }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pick(pref) { for (const p of pref) { const v = voices.find(v => v.name.includes(p) && v.lang.startsWith('en')); if (v) return v; } return voices.find(v => v.lang.startsWith('en')); }
  function say(text, opts = {}) { if (window.RESIM_ON) return false;
    if (muted || !('speechSynthesis' in window)) return;
    const now = performance.now();
    if (!opts.force && now - lastSpeak < (opts.gap ?? 1400)) return;
    lastSpeak = now;
    if (opts.interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const announcer = opts.who !== 'caster';
    u.voice = announcer ? pick(['Daniel', 'Fred', 'Ralph', 'Google UK English Male', 'Alex']) : pick(['Samantha', 'Karen', 'Google US English', 'Moira']);
    u.pitch = announcer ? 0.55 : 1.1; u.rate = announcer ? 0.92 : 1.18; u.volume = 1;
    speechSynthesis.speak(u);
  }
  function toggleMute() { muted = !muted; applyVol(); if (muted) speechSynthesis.cancel(); return muted; }

  return { stopVoices, ensure, setVol, VOL, chain, boothBusy, get voiceProgress() { return total ? loaded / total : 0; }, init, S, crowd, play, seq, has, sample, lineText, startMusic, stopMusic, setMode, duck, say, toggleMute, get muted() { return muted; } };
})();

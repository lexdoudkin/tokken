// TOKKEN mobile: arcade-cabinet touch controls (bat-top stick + convex buttons), landscape, app install, native keyboard.
const Touch = (() => {
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!isTouch) return { active: false };

  const css = document.createElement('style');
  css.textContent = `
    html,body{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;overscroll-behavior:none;background:#000}
    #tk{position:fixed;inset:0;pointer-events:none;z-index:5;font-family:"Press Start 2P",monospace;
        padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
    /* ---- bat-top joystick ---- */
    #tk .stick{position:absolute;left:0;bottom:0;width:40vw;height:78vh;pointer-events:auto}
    #tk .plate{position:absolute;width:30vh;height:30vh;transform:translate(-50%,-50%);border-radius:50%;
        background:radial-gradient(circle,#1a1a24 0 40%,#0b0b12 41% 62%,#2b2b3a 63% 66%,#0b0b12 67%);
        box-shadow:0 0 0 .5vh #000,0 0 0 1vh rgba(190,190,210,.35),0 1vh 2vh rgba(0,0,0,.6);opacity:.9}
    #tk .plate:after{content:"";position:absolute;inset:44%;border-radius:50%;background:#000}
    #tk .ball{position:absolute;left:50%;top:50%;width:13vh;height:13vh;margin:-6.5vh;border-radius:50%;
        background:radial-gradient(circle at 38% 32%,#fff 0 6%,#ff6b6b 14%,#d10000 45%,#5a0000 78%);
        box-shadow:0 1.2vh 1.4vh rgba(0,0,0,.65),inset 0 -1vh 1.4vh rgba(0,0,0,.45)}
    #tk .shaft{position:absolute;left:50%;top:50%;width:2vh;margin-left:-1vh;height:0;background:linear-gradient(90deg,#666,#ddd,#666);transform-origin:top center;border-radius:1vh}
    /* ---- convex arcade buttons with chrome bezel ---- */
    #tk .btns{position:absolute;right:calc(2vw + env(safe-area-inset-right));bottom:3vh;width:50vh;height:50vh;max-width:44vw;max-height:44vw;pointer-events:none}
    #tk .b{position:absolute;pointer-events:auto;border-radius:50%;transition:transform .05s;--c:#3a7bff}
    #tk .b .cap{position:absolute;inset:0;border-radius:50%;
        background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.85) 0 7%,rgba(255,255,255,0) 30%),radial-gradient(circle at 50% 45%,var(--c) 0 55%,color-mix(in srgb,var(--c) 45%,#000) 100%);
        box-shadow:0 0 0 .45vh #0a0a0a,0 0 0 .9vh #c9ced8,0 0 0 1.2vh #555,0 .9vh 0 1.2vh #1a1a1a,inset 0 -.9vh 1vh rgba(0,0,0,.45)}
    #tk .b .lbl{position:absolute;left:50%;top:100%;transform:translate(-50%,1.6vh);font-size:1.15vh;color:#ffd23f;text-shadow:0 .25vh 0 #000,0 0 .6vh #000;white-space:nowrap;letter-spacing:.05em}
    #tk .b.on{transform:translateY(.7vh)} #tk .b.on .cap{filter:brightness(1.45);box-shadow:0 0 0 .45vh #0a0a0a,0 0 0 .9vh #fff,0 0 0 1.2vh #555,0 .2vh 0 1.2vh #1a1a1a,0 0 3vh var(--c)}
    #tk .b.dim{opacity:.45}
    #tk .b.ready .cap{animation:rdy .6s linear infinite}
    @keyframes rdy{0%{filter:hue-rotate(0) brightness(1.4)}100%{filter:hue-rotate(360deg) brightness(1.4)}}
    #tk.menu .b:not([data-b=light]){display:none} #tk.menu .ph{display:none}
    /* ---- cabinet START / BACK ---- */
    #tk .sys{position:absolute;top:calc(1.5vh + env(safe-area-inset-top));pointer-events:auto;padding:1.1vh 1.8vh;border-radius:.6vh;font-size:1.25vh;color:#1a1a1a;
        background:linear-gradient(#fff6c0,#ffd23f 45%,#c98a00);border:.35vh solid #000;box-shadow:0 .6vh 0 #000,inset 0 .3vh 0 rgba(255,255,255,.7)}
    #tk .sys.on{transform:translateY(.5vh);box-shadow:0 .1vh 0 #000}
    #tk .sys.back{background:linear-gradient(#e8e8f0,#9aa0ad 45%,#5a5f6a);color:#111}
    #tk-rot{position:fixed;inset:0;z-index:9;background:#07070d;color:#ffd23f;display:none;align-items:center;justify-content:center;flex-direction:column;gap:3vh;font:bold 3vh "Press Start 2P",monospace;text-align:center;padding:4vw}
    #tk-rot span{font-size:10vh;animation:spin 2s ease-in-out infinite} @keyframes spin{50%{transform:rotate(90deg)}}
    @media (orientation:portrait){#tk-rot{display:flex}}
    #tk-in{position:fixed;left:50%;top:18vh;transform:translateX(-50%);z-index:8;font:3.5vh "Press Start 2P",monospace;text-transform:uppercase;width:60vw;padding:1.5vh;background:#111;color:#ffd23f;border:3px solid #ffd23f;border-radius:1vh;text-align:center;display:none}
    #tk-inst{position:fixed;left:50%;bottom:calc(10vh + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:7;display:none;pointer-events:auto;font:1.5vh "Press Start 2P",monospace;padding:1.4vh 2.2vh;color:#111;background:linear-gradient(#fff6c0,#ffd23f 45%,#c98a00);border:.35vh solid #000;box-shadow:0 .6vh 0 #000;border-radius:.6vh;text-align:center;max-width:70vw;line-height:1.6}
  `;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'tk';
  root.innerHTML = `<div class="stick"><div class="plate"><div class="shaft"></div><div class="ball"></div></div></div><div class="btns"></div>
    <div class="sys back" data-b="back" style="left:calc(1.5vw + env(safe-area-inset-left))">◀ BACK</div><div class="sys" data-b="start" style="right:calc(1.5vw + env(safe-area-inset-right))">1P START</div>`;
  document.body.appendChild(root);
  const rot = document.createElement('div'); rot.id = 'tk-rot'; rot.innerHTML = '<span>📱</span>ROTATE YOUR PHONE<br><small style="font-size:1.6vh;color:#aaa">TOKKEN IS A LANDSCAPE-ONLY SPORT</small>'; document.body.appendChild(rot);
  // [button, label, color, x%, y%, size%] — arcade layout: punches top row, kicks/specials bottom
  const BTN = [
    ['block', 'BLOCK', '#8c93a8', 0, 24, 19], ['heavy', 'HEAVY', '#ff2d2d', 34, 38, 23], ['special', 'SPECIAL', '#ffb000', 64, 22, 23],
    ['light', 'LIGHT', '#2f7dff', 4, 56, 23], ['slop', 'SLOP', '#5fd13a', 34, 72, 20], ['ult', 'ULT', '#ff3fd0', 64, 58, 23], ['dash', 'DASH', '#20c8dd', 80, 0, 17],
  ];
  const box = root.querySelector('.btns'), btnEl = {};
  for (const [b, label, col, x, y, s] of BTN) {
    const d = document.createElement('div'); d.className = 'b'; d.dataset.b = b; d.style.setProperty('--c', col);
    Object.assign(d.style, { left: x + '%', top: y + '%', width: s + '%', height: s + '%' });
    d.innerHTML = `<span class="cap"></span><span class="lbl">${label}</span>`; box.appendChild(d); btnEl[b] = d;
  }
  // buttons: multi-touch, each finger tracked
  const owner = new Map();
  const press = (el, down) => { Input.vpress(el.dataset.b, down); el.classList.toggle('on', down); if (down && navigator.vibrate) navigator.vibrate(10); };
  root.querySelectorAll('[data-b]').forEach(el => {
    el.addEventListener('touchstart', e => { e.preventDefault(); Audio.init(); for (const t of e.changedTouches) owner.set(t.identifier, el); press(el, true); }, { passive: false });
    const up = e => { e.preventDefault(); goFull(); for (const t of e.changedTouches) { const o = owner.get(t.identifier); if (o) { owner.delete(t.identifier); if (![...owner.values()].includes(o)) press(o, false); } } };
    el.addEventListener('touchend', up, { passive: false }); el.addEventListener('touchcancel', up, { passive: false });
  });
  // bat-top stick: rests bottom-left, jumps to your thumb, 8-way
  const zone = root.querySelector('.stick'), plate = root.querySelector('.plate'), ball = root.querySelector('.ball'), shaft = root.querySelector('.shaft');
  const rest = () => { plate.style.left = '22vh'; plate.style.top = 'calc(100% - 22vh)'; ball.style.transform = ''; shaft.style.height = '0'; };
  rest();
  let sid = null, ox = 0, oy = 0; const dirs = { left: false, right: false, up: false, down: false };
  const setDir = (k, v) => { if (dirs[k] !== v) { dirs[k] = v; Input.vpress(k, v); if (v && navigator.vibrate) navigator.vibrate(4); } };
  zone.addEventListener('touchstart', e => { e.preventDefault(); Audio.init(); const t = e.changedTouches[0]; if (sid !== null) return; sid = t.identifier; ox = t.clientX; oy = t.clientY; const r = zone.getBoundingClientRect(); plate.style.left = (ox - r.left) + 'px'; plate.style.top = (oy - r.top) + 'px'; }, { passive: false });
  zone.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier !== sid) continue; const dx = t.clientX - ox, dy = t.clientY - oy, r = innerHeight * 0.09, d = Math.hypot(dx, dy), k = Math.min(1, r / (d || 1));
    const px = dx * k, py = dy * k; ball.style.transform = `translate(${px}px,${py}px)`;
    shaft.style.height = Math.hypot(px, py) + 'px'; shaft.style.transform = `rotate(${Math.atan2(py, px) - Math.PI / 2}rad)`;
    const dead = innerHeight * 0.03;
    setDir('left', dx < -dead && Math.abs(dx) > Math.abs(dy) * 0.45); setDir('right', dx > dead && Math.abs(dx) > Math.abs(dy) * 0.45);
    setDir('up', dy < -dead * 1.6 && Math.abs(dy) > Math.abs(dx) * 0.45); setDir('down', dy > dead * 1.6 && Math.abs(dy) > Math.abs(dx) * 0.45); } }, { passive: false });
  const release = e => { goFull(); for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; rest(); for (const k in dirs) setDir(k, false); } };
  zone.addEventListener('touchend', release); zone.addEventListener('touchcancel', release);
  // tap on the game itself = START in menus
  document.getElementById('game').addEventListener('touchstart', e => { e.preventDefault(); Audio.init(); Input.vpress('start', true); setTimeout(() => Input.vpress('start', false), 60); }, { passive: false });
  document.addEventListener('touchend', () => goFull(), { passive: true });   // fullscreen is only allowed after a finished tap
  document.addEventListener('fullscreenchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 50));
  const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
  function goFull() { if (standalone || document.fullscreenElement) return; const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); }

  // install as an app: Android shows a real button, iOS gets the Share → Add to Home Screen tip
  const inst = document.createElement('div'); inst.id = 'tk-inst'; document.body.appendChild(inst);
  let deferred = null; const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  inst.addEventListener('touchstart', async e => { e.preventDefault(); e.stopPropagation(); if (deferred) { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; } inst.dataset.dismissed = '1'; inst.style.display = 'none'; }, { passive: false });

  // native keyboard for name entry + invite codes
  const inp = document.createElement('input'); inp.id = 'tk-in'; inp.autocapitalize = 'characters'; inp.autocomplete = 'off'; inp.spellcheck = false; document.body.appendChild(inp);
  let mode = null;
  inp.addEventListener('input', () => { const v = inp.value.toUpperCase().replace(/[^A-Z0-9 ._-]/g, ''); if (mode === 'name') { nameUI.buf = v.slice(0, 12); inp.value = nameUI.buf; } else if (mode === 'join') { online.typed = v.replace(/[^A-Z0-9]/g, '').slice(0, 4); inp.value = online.typed; } });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { if (mode === 'name') nameUI.enter = true; else if (mode === 'join' && online.typed.length === 4) Net.join(online.typed); inp.blur(); } });
  (function watch() {
    const want = scene === 'name' ? 'name' : scene === 'online' && online.mode === 'join' ? 'join' : null;
    if (want !== mode) { mode = want; inp.style.display = want ? 'block' : 'none'; if (want) { inp.value = want === 'name' ? nameUI.buf : online.typed; inp.placeholder = want === 'name' ? 'YOUR NAME' : 'CODE'; inp.maxLength = want === 'name' ? 12 : 4; } }
    // menus: stick + OK + BACK only; fights: full cabinet with meter-aware buttons
    const fighting = scene === 'fight';
    root.classList.toggle('menu', !fighting);
    btnEl.light.querySelector('.lbl').textContent = fighting ? 'LIGHT' : 'OK';
    if (fighting && match) {
      const f = match.f[sel.online ? me() : 0];
      btnEl.ult.classList.toggle('ready', f.compute >= 100); btnEl.ult.classList.toggle('dim', f.compute < 100);
      btnEl.slop.classList.toggle('dim', f.compute < 25); btnEl.special.classList.toggle('dim', f.cd > 0);
    }
    const showInst = scene === 'title' && !standalone && !inst.dataset.dismissed && (deferred || isIOS);
    if (showInst) inst.innerHTML = deferred ? '⬇ INSTALL TOKKEN APP<br><small>FULLSCREEN · NO BROWSER BARS</small>' : 'PLAY FULLSCREEN: TAP <b>SHARE</b> ⎋ THEN<br><b>ADD TO HOME SCREEN</b> · TAP TO HIDE';
    inst.style.display = showInst ? 'block' : 'none';
    requestAnimationFrame(watch);
  })();
  return { active: true, standalone };
})();

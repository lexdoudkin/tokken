// TOKKEN mouse: pixel-art cursors + clickable zones for every menu. Menus register zones while drawing;
// hover selects (only when the mouse actually moves, so keyboard/pad selection is never overridden) and
// click confirms through the same virtual buttons the touch controls use.
const Mouse = (() => {
  const st = { x: -1, y: -1, moved: false, clicked: false, zones: [], hot: null, cursor: '' };
  const VIEW = { cx: 0, oy: 0 };   // set by render(): where the logical frame starts on the backing canvas

  // ---- pixel cursors (drawn once, 2x-scaled 16px art: gold arrow and a pointing gauntlet)
  function makeCursor(rows, pal) {
    const s = 2, c = document.createElement('canvas'); c.width = 16 * s; c.height = 16 * s; const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * s, y * s, s, s); } }));
    return c.toDataURL();
  }
  const PAL = { k: '#000', y: '#ffd23f', o: '#c98a00', w: '#fff7c4', r: '#b30000' };
  const ARROW = ['k', 'kk', 'kwk', 'kwyk', 'kwyyk', 'kwyyyk', 'kwyyyyk', 'kwyyyyyk', 'kwyyyyyyk', 'kwyyyyykkk', 'kwyykyyk', 'kwykkyyk', 'kkk kyyk', 'k    kyyk', '     kyyk', '      kk'];
  const HAND = ['    kk', '   kwyk', '   kwyk', '   kwyk', '   kwykkk', '   kwykyykk', 'kk kwykyykyk', 'kyykwyyyyyyk', 'kwyywyyyyyyk', ' kwyyyyyyyyk', '  kwyyyyyyyk', '  kwyyyyyyk', '   kwyyyyyk', '   krrrrrk', '   krrrrrk', '   kkkkkkk'];
  let CUR = null;
  function cursorCss(kind) {
    if (!CUR) CUR = { arrow: `url(${makeCursor(ARROW, PAL)}) 0 0, auto`, hand: `url(${makeCursor(HAND, PAL)}) 8 0, pointer` };
    return kind === 'none' ? 'none' : CUR[kind];
  }
  function setCursor(kind) { if (st.cursor === kind) return; st.cursor = kind; const cv = document.getElementById('game'); if (cv) cv.style.cursor = cursorCss(kind); }

  function toLogical(e) {
    const cv = document.getElementById('game'); const r = cv.getBoundingClientRect();
    const px = (e.clientX - r.left) * (cv.width / r.width), py = (e.clientY - r.top) * (cv.height / r.height);
    return [(px - VIEW.cx) / DPR, (py - VIEW.oy) / DPR];
  }
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; [st.x, st.y] = toLogical(e); st.moved = true; });
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; [st.x, st.y] = toLogical(e); st.clicked = true; Audio.init(); });

  /** register a clickable zone for this frame (logical coords of the current scene) */
  function zone(x, y, w, h, onHover, onClick) { st.zones.push({ x, y, w, h, onHover, onClick }); }
  function tap(b) { Input.vpress(b, true); Input.vheld.delete(b); }   // one-poll latch: rapid clicks each register as a fresh press

  /** called once per update, before scene logic: uses the zones drawn by the last render */
  function process() {
    const zs = st.zones; let hit = null;   // complete list from the last render (update never runs mid-render)
    for (let i = zs.length - 1; i >= 0; i--) { const z = zs[i]; if (st.x >= z.x && st.x <= z.x + z.w && st.y >= z.y && st.y <= z.y + z.h) { hit = z; break; } }
    if (hit && st.moved && hit.onHover) hit.onHover();
    if (hit && st.clicked && hit.onClick) hit.onClick(st.x - hit.x, hit.w);
    st.hot = hit; st.moved = false; st.clicked = false;
  }
  /** called at the start of each render */
  function beginFrame(cx, oy) { VIEW.cx = cx; VIEW.oy = oy; st.zones = []; }
  /** called at the end of each render: cursor shape (always hidden during a live fight; pause menu brings it back) */
  function endFrame(fighting) { setCursor(fighting ? 'none' : st.hot ? 'hand' : 'arrow'); }
  return { st, VIEW, zone, tap, process, beginFrame, endFrame };
})();

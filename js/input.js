// TOKKEN input: keyboard (2 layouts) + Gamepad API (Xbox / PlayStation standard mapping).
const Input = (() => {
  const keys = new Set(), tapped = new Set();
  // Virtual (touch) buttons feed player 1: held while touched, plus a one-poll tap latch for quick taps.
  const vheld = new Set(), vtap = new Set();
  function vpress(b, down) { if (down) { vheld.add(b); vtap.add(b); } else vheld.delete(b); }
  const KB = [
    { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], light: ['KeyF'], heavy: ['KeyG'], special: ['KeyH'], slop: ['KeyR'], ult: ['KeyT'], dash: ['ShiftLeft'], block: ['KeyQ'], start: ['Enter', 'Space'], back: ['Escape', 'Backspace'] },
    { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], light: ['KeyK', 'Numpad1'], heavy: ['KeyL', 'Numpad2'], special: ['Semicolon', 'Numpad3'], slop: ['KeyO', 'Numpad4'], ult: ['KeyP', 'Numpad5'], dash: ['ShiftRight', 'Numpad0'], block: ['KeyI', 'Numpad6'], start: ['NumpadEnter'], back: [] },
  ];
  const BTN = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special', 'slop', 'ult', 'dash', 'block', 'start', 'back'];
  addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); keys.add(e.code); tapped.add(e.code); Audio.init(); });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('mousedown', () => Audio.init());

  function readPad(i) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const list = [...pads].filter(Boolean);
    const p = list[i]; if (!p) return null;
    const b = n => p.buttons[n] && (p.buttons[n].pressed || p.buttons[n].value > 0.4);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, dz = 0.45;
    return {
      left: b(14) || ax < -dz, right: b(15) || ax > dz, up: b(12) || ay < -dz * 1.3, down: b(13) || ay > dz * 1.3,
      light: b(2), heavy: b(3), slop: b(0) || b(6), special: b(1), block: b(4), dash: b(5), ult: b(7),
      start: b(9), back: b(8), confirm: b(0), cancel: b(1), id: p.id,
    };
  }
  function padNames() { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).map(p => p.id); }

  // A Controller holds one player's merged state (keyboard layout + gamepad slot) with edge detection + buffer.
  class Controller {
    constructor(slot) { this.bothKB = false; this.slot = slot; this.cur = {}; this.prev = {}; this.pressT = {}; this.frame = 0; this.cpu = null; this.alsoPad = null; }
    poll() {
      this.frame++; this.prev = this.cur; const s = {};
      if (this.cpu) { Object.assign(s, this.cpu.out); }
      else {
        const kms = this.bothKB ? KB : [KB[this.slot]];
        for (const b of BTN) s[b] = kms.some(km => km[b].some(k => keys.has(k) || tapped.has(k)));
        if (this.slot === 0 || this.bothKB) for (const b of BTN) s[b] = s[b] || vheld.has(b) || vtap.has(b);
        const pads = [readPad(this.slot)]; if (this.alsoPad != null) pads.push(readPad(this.alsoPad));
        for (const p of pads) if (p) { for (const b of BTN) s[b] = s[b] || p[b]; s.confirm = s.confirm || p.confirm; s.cancel = s.cancel || p.cancel; }
        s.confirm = s.confirm || s.start || s.light; s.cancel = s.cancel || s.back;
      }
      this.cur = s;
      for (const b in s) if (s[b] && !this.prev[b]) this.pressT[b] = this.frame;
    }
    held(b) { return !!this.cur[b]; }
    pressed(b) { return !!this.cur[b] && !this.prev[b]; }
    buffered(b, win = 7) { return this.pressT[b] != null && this.frame - this.pressT[b] <= win; }
    consume(b) { this.pressT[b] = -999; }
  }
  // Menu input: any device, any player.
  function endFrame() { tapped.clear(); vtap.clear(); }
  function anyPressed(ctrls, b) { return ctrls.some(c => c.pressed(b)); }
  return { Controller, keys, padNames, anyPressed, KB, endFrame, vpress, vheld };
})();

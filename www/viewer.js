'use strict';
/* Shared by the look-at-it apps (Lava Lamp, Fireplace, Aquarium): a canvas loop, a pointer helper and a full-screen overlay. */
const Viewer = (() => {
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hexRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // The simulation clock: seconds since the last frame. Two canvases drawn in the same frame share one tick, so the world moves once.
  const clock = () => { let last = 0; return t => { const dt = last && t > last ? Math.min(0.1, (t - last) / 1000) : 0; if (t > last) last = t; return dt; }; };
  // Calls advance(t) then draw(g, w, h) every frame until the canvas leaves the page.
  function run(canvas, advance, draw) {
    const frame = t => {
      if (!canvas.isConnected) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      advance(t); const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); draw(g, w, h);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  const pointer = (canvas, fn) => canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); fn(e.clientX - r.left, e.clientY - r.top, r.width, r.height, e); });
  let open = null;
  // opts: hint (small text), extra (an element laid over the picture), onPointer(x, y, w, h), tapClose (a tap anywhere closes it), onClose
  function fullscreen(label, advance, draw, opts = {}) {
    if (open) return;
    const canvas = h('canvas', { class: 'vw-canvas', role: 'img', 'aria-label': label });
    const close = () => { document.removeEventListener('keydown', onKey); try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* fine */ } try { open.lock && open.lock.release(); } catch { /* fine */ } el.remove(); open = null; if (opts.onClose) opts.onClose(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const el = h('div', { class: 'vw-full', role: 'dialog', 'aria-label': label + ', full screen' }, canvas,
      h('button', { class: 'vw-x', type: 'button', 'aria-label': 'Close full screen', title: 'Close', onclick: close }, icon('x')), opts.extra || null, opts.hint ? h('p', { class: 'fine' }, opts.hint) : null);
    document.addEventListener('keydown', onKey); document.body.append(el); open = { el };
    if (opts.tapClose) canvas.addEventListener('click', close);
    if (opts.onPointer) pointer(canvas, opts.onPointer);
    run(canvas, advance, (g, w, hh) => draw(g, w, hh, true));
    try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch { /* the overlay still fills the window */ }
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { if (open) open.lock = l; else l.release(); }).catch(() => {}); } catch { /* fine */ }
  }
  const isOpen = () => !!open;
  // Ambient sound made from nothing but filtered noise and short tones, so there are no audio files to ship. It stays quiet until the first tap
  // (browsers insist on that), remembers on/off and volume on this device, and shuts itself down when you leave the app.
  function ambience(key, alive) {
    let st = { on: true, vol: 0.5 };
    try { const v = JSON.parse(localStorage.getItem(key) || 'null'); if (v && typeof v === 'object') st = { on: v.on !== false, vol: Math.min(1, Math.max(0, +v.vol || 0.5)) }; } catch { /* default */ }
    let ctx = null, master = null, brown = null, white = null, timer = 0, dead = false; const hooks = [];
    const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch { /* not remembered */ } };
    const level = () => (st.on ? st.vol * st.vol : 0);
    const make = () => {
      if (ctx || dead) return ctx;
      try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); } catch { return null; }
      master = ctx.createGain(); master.gain.value = level(); master.connect(ctx.destination);
      const n = ctx.sampleRate * 4; brown = ctx.createBuffer(1, n, ctx.sampleRate); white = ctx.createBuffer(1, n, ctx.sampleRate);
      const b = brown.getChannelData(0), w = white.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { const r = Math.random() * 2 - 1; w[i] = r; last = (last + 0.02 * r) / 1.02; b[i] = last * 3.5; }
      timer = setInterval(() => { if (!alive()) stop(); else if (ctx && ctx.state === 'suspended' && st.on) ctx.resume().catch(() => {}); }, 1000);
      return ctx;
    };
    const stop = () => { dead = true; clearInterval(timer); hooks.forEach(h => clearInterval(h)); try { ctx && ctx.close(); } catch { /* fine */ } ctx = null; };
    const resumeOnTap = () => { const go = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); document.removeEventListener('pointerdown', go, true); }; document.addEventListener('pointerdown', go, true); };
    return {
      get on() { return st.on; }, get vol() { return st.vol; },
      set(on, vol) { if (on !== undefined) st.on = !!on; if (vol !== undefined) st.vol = Math.min(1, Math.max(0, vol)); save(); if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.1); if (st.on && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
      // a steady bed of sound: type 'brown' (deep rumble) or 'white' (hiss), through a filter. Returns { gain, filter } so the app can move them.
      loop(type, filterType, freq, q, gain) {
        if (!make()) return null; const src = ctx.createBufferSource(); src.buffer = type === 'brown' ? brown : white; src.loop = true; src.loopStart = Math.random() * 2;
        const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = gain;
        src.connect(f); f.connect(g); g.connect(master); src.start(0, Math.random() * 2); resumeOnTap(); return { gain: g, filter: f };
      },
      // a short burst of noise (a crackle, a splash)
      burst(freq, q, dur, vol, type = 'bandpass') {
        if (!ctx || ctx.state !== 'running' || !st.on) return; const len = Math.max(64, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; src.buffer = buf; src.connect(f); f.connect(g); g.connect(master); src.start();
      },
      // a short tone that slides from one pitch to another (a bubble, a thump)
      blip(f0, f1, dur, vol, wave = 'sine') {
        if (!ctx || ctx.state !== 'running' || !st.on) return; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime; o.type = wave; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
      },
      // calls fn at random gaps between lo and hi seconds while the sound is alive
      every(lo, hi, fn) { const tick = () => { if (dead) return; fn(); hooks.push(setTimeout(tick, (lo + Math.random() * (hi - lo)) * 1000)); }; hooks.push(setTimeout(tick, lo * 1000)); },
      get ctx() { return ctx; }, stop,
    };
  }
  return { ambience, reduced, hexRgb, mixRgb, clock, run, pointer, fullscreen, isOpen };
})();

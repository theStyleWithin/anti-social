'use strict';
/* Fireplace: a fire in a brick hearth, just to look at. Place logs and watch them burn away. Settings are remembered on this device. */
const FR = FireCore;
let frCfg = null, frFire = null, frClock = null, frPaused = false;
const frLoad = () => { try { return FR.normCfg(JSON.parse(localStorage.getItem('as.fire') || 'null')); } catch { return FR.normCfg(null); } };
const frStore = () => { try { localStorage.setItem('as.fire', JSON.stringify(frCfg)); } catch { /* not remembered */ } };
const frPal = () => FR.FLAMES.find(f => f[0] === frCfg.flame);
const frRgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

function frAdvance(t) {
  if (!frClock) frClock = Viewer.clock();
  const dt = frClock(t); if (dt > 0 && !frPaused) { const before = frFire.pops; FR.step(frFire, dt, frCfg, Math.random); frAmbient(dt); if (frAmb && frFire.pops > before) { frAmb.burst(320, 0.8, 0.09, 0.4); frAmb.blip(220, 70, 0.1, 0.12); } } frEvents();
}
// The picture is built from the opening outwards: ox, oy is the middle of the log bed, s is half the opening width in pixels.

// things that move around the room besides the fire: snow outside the window and dust floating in the firelight
function frAmbient(dt) {
  if (!frSnow) { frSnow = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, v: 0.05 + Math.random() * 0.09, ph: Math.random() * 6 })); frMotes = Array.from({ length: 48 }, () => ({ x: Math.random(), y: Math.random(), ph: Math.random() * 6, v: 0.006 + Math.random() * 0.014 })); }
  const t = frFire.t; for (const f of frSnow) { f.y += f.v * dt; f.x += Math.sin(t * 0.8 + f.ph) * 0.012 * dt; if (f.y > 1) { f.y = 0; f.x = Math.random(); } }
  for (const m of frMotes) { m.y -= m.v * dt; m.x += Math.sin(t * 0.4 + m.ph) * 0.006 * dt; if (m.y < 0) { m.y = 1; m.x = Math.random(); } }
}
function frWindow(g, x, y, w, h, t) {
  const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, '#0a1330'); sky.addColorStop(1, '#223a66'); g.fillStyle = sky; g.fillRect(x, y, w, h);
  g.fillStyle = '#e9efff'; g.beginPath(); g.arc(x + w * 0.72, y + h * 0.2, w * 0.1, 0, 6.283); g.fill(); g.fillStyle = '#0d1736'; g.beginPath(); g.arc(x + w * 0.76, y + h * 0.18, w * 0.09, 0, 6.283); g.fill();
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = 'rgba(255,255,255,.85)';
  for (const f of frSnow) { g.globalAlpha = 0.45 + 0.5 * f.r / 2.2; g.beginPath(); g.arc(x + f.x * w, y + f.y * h, f.r * Math.max(0.8, w / 140), 0, 6.283); g.fill(); } g.globalAlpha = 1;
  g.fillStyle = '#e8eef8'; g.fillRect(x, y + h * 0.93, w, h * 0.07); g.restore();
  g.strokeStyle = '#3a2417'; g.lineWidth = Math.max(3, w * 0.07); g.strokeRect(x, y, w, h); g.lineWidth = Math.max(2, w * 0.04); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.5); g.lineTo(x + w, y + h * 0.5); g.stroke();
  g.fillStyle = '#4a2f1d'; g.fillRect(x - w * 0.08, y + h, w * 1.16, h * 0.05);
}
function frDecor(g, L, w, light, pal) {
  const { s, ox, openTop, floorY } = L, mantelY = openTop - s * 0.3, t = frFire.t, hot = Viewer.hexRgb(pal[3]);
  // stockings hang from the mantel
  [[-1.25, '#b3202a'], [-0.95, '#2f7a46'], [1.2, '#b3202a']].forEach(([dx, col], i) => { const x = ox + dx * s, y = mantelY + s * 0.2, sw = Math.sin(t * 1.3 + i) * s * 0.01; g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 0.07, y); g.lineTo(x + s * 0.07, y); g.lineTo(x + s * 0.07 + sw, y + s * 0.2); g.quadraticCurveTo(x + s * 0.1 + sw, y + s * 0.3, x + s * 0.0 + sw, y + s * 0.3); g.lineTo(x - s * 0.07 + sw, y + s * 0.22); g.closePath(); g.fill(); g.fillStyle = '#f2ece0'; g.fillRect(x - s * 0.08, y - s * 0.015, s * 0.16, s * 0.05); });
  // a candle with a little flame of its own
  const cx = ox + s * 1.5, cy = mantelY; g.fillStyle = '#efe6cf'; g.fillRect(cx - s * 0.035, cy - s * 0.2, s * 0.07, s * 0.2);
  const fl = 0.85 + 0.15 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23); g.globalCompositeOperation = 'lighter'; const cg = g.createRadialGradient(cx, cy - s * 0.25, 0, cx, cy - s * 0.25, s * 0.5); cg.addColorStop(0, `rgba(255,190,90,${0.35 * fl})`); cg.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = cg; g.fillRect(cx - s * 0.5, cy - s * 0.75, s, s); g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#ffd36a'; g.beginPath(); g.ellipse(cx, cy - s * 0.25, s * 0.022 * fl, s * 0.05 * fl, 0, 0, 6.283); g.fill();
  // a clock that really ticks
  const kx = ox - s * 1.45, ky = mantelY - s * 0.17, r = s * 0.15; g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(kx, ky, r + s * 0.02, 0, 6.283); g.fill(); g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(kx, ky, r, 0, 6.283); g.fill();
  const d = new Date(), hh = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * 6.283, mm = (d.getMinutes() + d.getSeconds() / 60) / 60 * 6.283; g.strokeStyle = '#2a1a10'; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, s * 0.015);
  g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(hh) * r * 0.55, ky - Math.cos(hh) * r * 0.55); g.stroke(); g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(mm) * r * 0.82, ky - Math.cos(mm) * r * 0.82); g.stroke();
  // a rug in front of the hearth, warmed by the fire
  g.fillStyle = '#4a1d22'; g.beginPath(); g.ellipse(ox, floorY + (g.canvas.height / (window.devicePixelRatio || 1) - floorY) * 0.55, s * 1.7, (g.canvas.height / (window.devicePixelRatio || 1) - floorY) * 0.33, 0, 0, 6.283); g.fill();
  g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(${hot[0]},${hot[1] * 0.5 | 0},0,${0.2 * light})`; g.beginPath(); g.ellipse(ox, floorY + s * 0.18, s * 1.3, s * 0.16, 0, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
}
function frMotesDraw(g, w, h, L, light, pal) {
  const hot = Viewer.hexRgb(pal[3]); g.globalCompositeOperation = 'lighter';
  for (const m of frMotes) { const x = m.x * w, y = m.y * h, d = Math.hypot(x - L.ox, y - (L.oy - L.s * 0.4)) / (L.s * 3.2), a = Math.max(0, 1 - d) * light * (0.35 + 0.35 * Math.sin(frFire.t * 1.5 + m.ph)); if (a <= 0.01) continue; g.fillStyle = `rgba(${hot[0]},${hot[1] | 0},${hot[2] * 0.6 | 0},${a * 0.8})`; g.beginPath(); g.arc(x, y, 1 + (m.ph % 1.4), 0, 6.283); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  const v = g.createRadialGradient(w / 2, L.oy - L.s * 0.5, Math.min(w, h) * 0.35, w / 2, L.oy - L.s * 0.5, Math.max(w, h) * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
}
const frLayout = (w, h) => { const s = Math.min(w * 0.3, h * 0.36), floorY = h * 0.86; return { s, ox: w / 2, floorY, oy: floorY - s * 0.12, openTop: floorY - s * 1.55 }; };
// a tap on the opening places a log there; the log falls in from above
function frTap(x, y, w, h) { const L = frLayout(w, h); if (Math.abs(x - L.ox) < L.s * 1.1 && y > L.openTop - L.s * 0.4 && y < L.floorY + L.s * 0.1) { if (!FR.addLog(frFire, Math.random, (x - L.ox) / L.s)) frToast('The fireplace is full.'); } }
let frToast = () => {};
function frDraw(g, w, h) {
  const pal = frPal(), mix = (a, b, t) => Viewer.mixRgb(Viewer.hexRgb(a), Viewer.hexRgb(b), t), power = Math.min(1, FR.power(frFire)), coal = frFire.coals, light = Math.min(1, power * 0.9 + coal * 0.25) * (0.9 + 0.06 * Math.sin(frFire.t * 11) + 0.04 * Math.sin(frFire.t * 27 + 1));
  const { s, ox, floorY, oy, openTop } = frLayout(w, h);
  // wall
  g.fillStyle = '#120b09'; g.fillRect(0, 0, w, h);
  const bw = s * 0.34, bh = s * 0.16; g.save(); g.beginPath(); g.rect(0, 0, w, floorY); g.clip();
  for (let r = 0, y = 0; y < floorY; r++, y += bh) for (let x = -(r % 2) * bw / 2; x < w; x += bw) { const v = ((Math.sin(r * 12.9 + x * 0.071) * 43758.5) % 1 + 1) % 1; g.fillStyle = `rgb(${52 + v * 18 | 0},${28 + v * 9 | 0},${24 + v * 7 | 0})`; g.fillRect(x + 1, y + 1, bw - 2, bh - 2); }
  g.restore();
  if (!frSnow) frAmbient(0);
  { const ww = s * 0.95, wh = s * 1.5, wy = floorY - s * 2.5; if (ox - s * 3.0 - ww / 2 > 8) frWindow(g, ox - s * 3.0 - ww / 2, wy, ww, wh, frFire.t); }
  // the opening
  const openL = ox - s * 1.1, openW = s * 2.2; g.beginPath(); g.moveTo(openL, floorY); g.lineTo(openL, openTop + s * 0.4); g.quadraticCurveTo(openL, openTop, ox, openTop); g.quadraticCurveTo(openL + openW, openTop, openL + openW, openTop + s * 0.4); g.lineTo(openL + openW, floorY); g.closePath();
  const back = g.createLinearGradient(0, openTop, 0, floorY); back.addColorStop(0, '#050302'); back.addColorStop(1, '#1a0d08'); g.fillStyle = back; g.fill();
  g.save(); g.clip();
  // glow on the back wall
  const wall = g.createRadialGradient(ox, oy - s * 0.3, s * 0.1, ox, oy - s * 0.3, s * 1.6); const hot = Viewer.hexRgb(pal[3]);
  wall.addColorStop(0, `rgba(${hot[0]},${hot[1]},${hot[2]},${0.55 * light})`); wall.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = wall; g.fillRect(openL, openTop, openW, floorY - openTop);
  // logs: they char, shrink and glow as they burn, and the ones above settle as the ones below burn away
  const logsNow = frFire.logs.slice().sort((p, q) => p.y - q.y);
  for (const l of logsNow) {
    const rad = l.rad * (0.45 + 0.55 * l.wood) * s, len = l.len * s * (0.62 + 0.38 * l.wood), char = Math.pow(1 - l.wood, 0.8), flick = 0.7 + 0.3 * Math.sin(frFire.t * 4 + l.ring * 3);
    g.save(); g.translate(ox + l.x * s, oy - l.y * s); g.rotate(l.ang);
    const body = (c) => Viewer.mixRgb(c, [12, 8, 6], char * 0.92), top = frRgb(body([112, 76, 46])), mid = frRgb(body([78, 50, 29])), low = frRgb(body([34, 20, 11]));
    const b = g.createLinearGradient(0, -rad, 0, rad); b.addColorStop(0, top); b.addColorStop(0.5, mid); b.addColorStop(1, low); g.fillStyle = b;
    g.beginPath(); if (g.roundRect) g.roundRect(-len / 2, -rad, len, rad * 2, rad * 0.9); else g.rect(-len / 2, -rad, len, rad * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, s * 0.006); for (let k = 0; k < 4; k++) { const x = -len / 2 + len * (0.15 + 0.22 * k + 0.04 * Math.sin(l.ring + k)); g.beginPath(); g.moveTo(x, -rad * 0.8); g.lineTo(x + rad * 0.3, rad * 0.8); g.stroke(); }
    g.fillStyle = frRgb(body([150, 112, 72])); g.beginPath(); g.ellipse(-len / 2 + rad * 0.15, 0, rad * 0.45, rad * 0.95, 0, 0, 6.283); g.fill();
    if (l.lit > 0.2) { const glow = l.lit * (0.25 + 0.75 * char) * flick, hotc = Viewer.hexRgb(pal[3]); g.fillStyle = `rgba(${hotc[0]},${hotc[1] * 0.7 | 0},${hotc[2] * 0.4 | 0},${glow * 0.8})`; g.fillRect(-len / 2 + rad * 0.6, -rad * 0.15, len - rad * 1.2, rad * 0.8); g.fillStyle = `rgba(255,225,150,${glow * 0.35})`; g.fillRect(-len / 2 + rad * 1.2, rad * 0.05, len - rad * 2.4, rad * 0.25); }
    g.restore();
  }
  // flames and embers, added together so they glow
  g.globalCompositeOperation = 'lighter';
  const bed = g.createRadialGradient(ox, oy, 0, ox, oy, s * 0.75); bed.addColorStop(0, `rgba(255,120,30,${0.55 * coal})`); bed.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = bed; g.fillRect(ox - s * 1.1, oy - s, s * 2.2, s * 1.4);
  for (const p of frFire.parts) {
    const frac = p.life / p.max, px = ox + p.x * s, py = oy - p.y * s;
    if (p.k === 'f') { const rad = p.r * s * (1.2 - frac * 0.85) * 1.55, c = FR.flameColor(pal, frac, mix), a = (1 - frac) * 0.15 * (frac < 0.08 ? frac / 0.08 : 1); g.save(); g.translate(px, py); g.scale(1, 1.9); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad); gr.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`); gr.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`); g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2); g.restore(); }
    else { const a = (1 - frac) * (p.k === 'e' ? 0.75 + 0.25 * Math.sin(frFire.t * 18 + p.max * 30) : 1), c = FR.flameColor(pal, 0.2 + frac * 0.35, mix); g.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; g.beginPath(); g.arc(px, py, Math.max(0.8, p.r * s * 1.5), 0, 6.283); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over'; g.restore();
  // brick surround glow, hearth and mantel
  g.globalCompositeOperation = 'lighter'; const room = g.createRadialGradient(ox, oy - s * 0.4, s * 0.5, ox, oy - s * 0.4, Math.max(w, h) * 0.7); room.addColorStop(0, `rgba(${hot[0]},${hot[1] * 0.6 | 0},${hot[2] * 0.3 | 0},${0.32 * light})`); room.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = room; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#2a1a14'; g.lineWidth = Math.max(3, s * 0.05); g.beginPath(); g.moveTo(openL, floorY); g.lineTo(openL, openTop + s * 0.4); g.quadraticCurveTo(openL, openTop, ox, openTop); g.quadraticCurveTo(openL + openW, openTop, openL + openW, openTop + s * 0.4); g.lineTo(openL + openW, floorY); g.stroke();
  const mantelY = openTop - s * 0.3, m = g.createLinearGradient(0, mantelY, 0, mantelY + s * 0.2); m.addColorStop(0, '#6a4426'); m.addColorStop(1, '#2d1b0e'); g.fillStyle = m; g.fillRect(ox - s * 1.7, mantelY, s * 3.4, s * 0.2);
  g.fillStyle = `rgba(255,170,80,${0.18 * light})`; g.fillRect(ox - s * 1.7, mantelY, s * 3.4, s * 0.025);

  const hearth = g.createLinearGradient(0, floorY, 0, h); hearth.addColorStop(0, '#2c2724'); hearth.addColorStop(1, '#0d0b0a'); g.fillStyle = hearth; g.fillRect(0, floorY, w, h - floorY);
  g.fillStyle = `rgba(255,150,60,${0.12 * light})`; g.fillRect(ox - s * 1.6, floorY, s * 3.2, s * 0.05);
  const Lay = { s, ox, oy, openTop, floorY };
  frDecor(g, Lay, w, light, pal);
  frMotesDraw(g, w, h, Lay, light, pal);
  if (FR.isOut(frFire) && frFire.coals < 0.02) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `${Math.max(14, s * 0.12)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(frFire.logs.length ? 'Cold logs. Strike a match.' : 'The fire is out. Tap the hearth to place a log.', ox, floorY + s * 0.28); }
}

// Sound: a low roar that follows the fire, a hiss, wind outside, crackles, pops and the thud of a log landing. Nothing is downloaded.
let frAmb = null, frSnow = null, frMotes = null;
function frSetupSound(canvas) {
  frAmb = Viewer.ambience('as.fire.sound', () => canvas.isConnected);
  const a = frAmb, roar = a.loop('brown', 'lowpass', 380, 0.7, 0.2), hiss = a.loop('white', 'highpass', 5200, 0.5, 0.012), wind = a.loop('brown', 'bandpass', 420, 2.5, 0.05);
  a.every(0.1, 0.8, () => { const p = FR.power(frFire); if (p < 0.08 || frPaused || Math.random() > 0.35 + 0.65 * Math.min(1, p)) return; a.burst(900 + Math.random() * 3600, 0.9, 0.012 + Math.random() * 0.05, 0.1 + Math.random() * 0.25); });
  a.every(0.05, 0.1, () => { if (!a.ctx || !roar) return; const p = Math.min(1.2, FR.power(frFire)), t = a.ctx.currentTime, k = performance.now() / 1000;
    roar.gain.gain.setTargetAtTime(0.03 + 0.34 * p, t, 0.3); roar.filter.frequency.setTargetAtTime(240 + 380 * p + 90 * Math.sin(k * 1.7), t, 0.2); hiss.gain.gain.setTargetAtTime(0.002 + 0.016 * p, t, 0.3); wind.gain.gain.setTargetAtTime(0.03 + 0.03 * Math.sin(k * 0.35) + 0.02 * Math.sin(k * 0.9), t, 0.5); });
  return a;
}
function frEvents() {
  const ev = frFire.events.splice(0); if (!frAmb) return;
  for (const e of ev) { if (e === 'thump') { frAmb.blip(120, 42, 0.28, 0.5); frAmb.burst(260, 0.7, 0.12, 0.25, 'lowpass'); } else if (e === 'collapse') { frAmb.blip(150, 50, 0.4, 0.35); frAmb.burst(700, 0.8, 0.2, 0.25); } }
}

function fireView(acct, ctx, back) {
  if (!frCfg) { frCfg = frLoad(); frPaused = Viewer.reduced(); }
  if (!frFire) frFire = FR.makeFire();
  const canvas = h('canvas', { class: 'vw-canvas', role: 'img', 'aria-label': 'A fire burning in a brick fireplace, a decoration' });
  Viewer.run(canvas, frAdvance, frDraw);
  Viewer.pointer(canvas, frTap);
  const set = (k, v) => { frCfg = FR.normCfg({ ...frCfg, [k]: v }); frStore(); };
  const status = h('span', { class: 'fine' }, '');
  frToast = m => { status.textContent = m; setTimeout(() => { if (status.textContent === m) status.textContent = ''; }, 2500); };
  const log = h('button', { class: 'btn primary', onclick: () => { if (!FR.addLog(frFire, Math.random)) frToast('The fireplace is full.'); } }, 'Add a log');
  const poke = h('button', { class: 'btn', onclick: () => { FR.poke(frFire, Math.random); if (frAmb) frAmb.burst(1800, 0.8, 0.05, 0.3); } }, 'Poke');
  const match = h('button', { class: 'btn', onclick: () => FR.light(frFire) }, 'Strike a match');
  const pause = h('button', { class: 'btn', 'aria-pressed': String(frPaused), onclick: e => { frPaused = !frPaused; e.currentTarget.textContent = frPaused ? 'Play' : 'Pause'; e.currentTarget.setAttribute('aria-pressed', String(frPaused)); } }, frPaused ? 'Play' : 'Pause');
  const range = (label, key, min, max, step) => { const out = h('output', {}, String(frCfg[key])); return h('label', { class: 'mx-range' }, h('span', {}, label), h('input', { type: 'range', min, max, step, value: String(frCfg[key]), 'aria-label': label, oninput: e => { set(key, Number(e.target.value)); out.textContent = e.target.value; } }), out); };
  const swatches = h('div', { class: 'ck-themes', role: 'radiogroup', 'aria-label': 'Flame colour' }, FR.FLAMES.map(([id, name,, mid]) => { const b = h('button', { class: 'ck-swatch' + (frCfg.flame === id ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(frCfg.flame === id), 'aria-label': name, title: name, style: `background:${mid}`, onclick: () => { set('flame', id); swatches.querySelectorAll('.ck-swatch').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); } }); return b; }));
  const keep = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: frCfg.keep, onchange: e => set('keep', e.target.checked) }), ' Add logs by itself (turn off to let the fire die down)');
  const amb = frSetupSound(canvas), vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: String(amb.vol), 'aria-label': 'Volume', oninput: e => amb.set(undefined, Number(e.target.value)) });
  const snd = h('div', { class: 'vw-snd' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: amb.on, onchange: e => amb.set(e.target.checked) }), ' Ambient sound'), vol);
  const full = () => Viewer.fullscreen('Fireplace', frAdvance, frDraw, { onPointer: frTap, extra: h('div', { class: 'vw-bar' }, h('button', { class: 'btn primary', onclick: () => FR.addLog(frFire, Math.random) }, 'Add a log'), h('button', { class: 'btn', onclick: () => FR.poke(frFire, Math.random) }, 'Poke'), h('button', { class: 'btn', onclick: () => FR.light(frFire) }, 'Match'), h('button', { class: 'btn', 'aria-label': 'Sound on or off', onclick: () => frAmb && frAmb.set(!frAmb.on) }, 'Sound')), hint: 'Tap the hearth to place a log.' });
  return [back(appName(acct, 'fire')), h('div', { class: 'app-pad vw-wrap' }, h('div', { class: 'vw-stage vw-wide' }, canvas),
    h('div', { class: 'btnrow' }, log, poke, match, pause, h('button', { class: 'btn', onclick: full }, 'Full screen'), status),
    h('div', { class: 'mx-opts' }, range('Flame height', 'height', 0.5, 1.6, 0.1), keep, snd, swatches),
    h('p', { class: 'fine' }, 'Tap the hearth to drop a log there. Logs catch from the ones already burning, char and burn away. Just something to look at.'))];
}

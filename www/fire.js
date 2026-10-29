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
// a tap on the opening places a log there; the log falls in from above
function frTap(x, y, w, h) { const L = frLayout(w, h); if (Math.abs(x - L.ox) < L.s * 1.1 && y > L.openTop - L.s * 0.4 && y < L.floorY + L.s * 0.1) { if (!FR.addLog(frFire, Math.random, (x - L.ox) / L.s)) frToast('The fireplace is full.'); } }
let frToast = () => {};
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

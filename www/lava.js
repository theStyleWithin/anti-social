'use strict';
/* Lava Lamp: wax blobs drifting up and down inside a glass. Just to look at. Settings are remembered on this device. */
const LV = LavaCore;
let lvCfg = null, lvPaused = false, lvBlobs = null, lvClock = null, lvBuf = null;
const lvLoad = () => { try { return LV.normCfg(JSON.parse(localStorage.getItem('as.lava') || 'null')); } catch { return LV.normCfg(null); } };
const lvStore = () => { try { localStorage.setItem('as.lava', JSON.stringify(lvCfg)); } catch { /* not remembered */ } };
const LV_GW = 130, LV_GH = Math.round(130 * LV.ASPECT);

function lvAdvance(t) {
  if (!lvClock) lvClock = Viewer.clock();
  const dt = lvClock(t); if (dt > 0 && !lvPaused) LV.step(lvBlobs, dt, lvCfg, Math.random);
}
// paints the wax and liquid for the whole glass into a small grid; it is scaled up smoothly, which is what makes the edges soft
function lvField() {
  if (!lvBuf) { lvBuf = document.createElement('canvas'); lvBuf.width = LV_GW; lvBuf.height = LV_GH; }
  const pal = LV.PALETTES.find(p => p[0] === lvCfg.palette), top = Viewer.hexRgb(pal[2]), bot = Viewer.hexRgb(pal[3]), wCool = Viewer.hexRgb(pal[4]), wHot = Viewer.hexRgb(pal[5]);
  const g = lvBuf.getContext('2d'), img = g.createImageData(LV_GW, LV_GH), d = img.data, n = lvBlobs.length + 1;
  const bx = new Float32Array(n), by = new Float32Array(n), br = new Float32Array(n);
  lvBlobs.forEach((b, i) => { bx[i] = b.x; by[i] = b.y * LV.ASPECT; br[i] = b.r * b.r; });
  bx[n - 1] = 0.5; by[n - 1] = LV.ASPECT + 0.22; br[n - 1] = 0.36 * 0.36;      // the puddle at the bottom
  for (let j = 0; j < LV_GH; j++) {
    const yn = (j + 0.5) / LV_GH, Y = yn * LV.ASPECT, hw = LV.halfWidth(yn);
    for (let i = 0; i < LV_GW; i++) {
      const X = (i + 0.5) / LV_GW, o = (j * LV_GW + i) * 4;
      if (Math.abs(X - 0.5) > hw + 0.02) { d[o + 3] = 0; continue; }
      let f = 0; for (let k = 0; k < n; k++) { const dx = X - bx[k], dy = Y - by[k]; f += br[k] / (dx * dx + dy * dy + 1e-4); }
      let c = Viewer.mixRgb(top, bot, yn);
      const halo = Math.min(f, 1); c = Viewer.mixRgb(c, wCool, halo * halo * 0.22);
      if (f >= 1) { const edge = Math.min(1, (f - 1) / 0.1), wax = Viewer.mixRgb(wCool, wHot, Math.min(1, yn * 0.8 + (f - 1) * 0.12)), shade = 0.86 + 0.14 * Math.min(1, (f - 1) / 1.6); c = Viewer.mixRgb(c, [wax[0] * shade, wax[1] * shade, wax[2] * shade], edge); }
      const edgeFade = Math.min(1, (hw + 0.02 - Math.abs(X - 0.5)) / 0.02);
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255 * edgeFade;
    }
  }
  g.putImageData(img, 0, 0); return lvBuf;
}
function lvDraw(g, w, h) {
  const pal = LV.PALETTES.find(p => p[0] === lvCfg.palette), glowC = pal[4];
  g.fillStyle = '#07060b'; g.fillRect(0, 0, w, h);
  const u = Math.min(h * 0.94 / 2.62, w * 0.9), x0 = (w - u) / 2, y0 = (h - 2.62 * u) / 2, capH = 0.22 * u, bodyY = y0 + capH, bodyH = LV.ASPECT * u, baseY = bodyY + bodyH;
  if (lvCfg.glow) { const r = g.createRadialGradient(w / 2, bodyY + bodyH * 0.7, u * 0.1, w / 2, bodyY + bodyH * 0.7, Math.max(w, h) * 0.7); r.addColorStop(0, glowC + '55'); r.addColorStop(1, glowC + '00'); g.fillStyle = r; g.fillRect(0, 0, w, h); }
  const metal = (x, y, ww, hh) => { const m = g.createLinearGradient(x, 0, x + ww, 0); m.addColorStop(0, '#4a4a55'); m.addColorStop(0.3, '#c9c9d6'); m.addColorStop(0.55, '#7d7d8b'); m.addColorStop(1, '#2c2c36'); return m; };
  // cap
  g.beginPath(); g.moveTo(x0 + u * (0.5 - 0.18), y0); g.lineTo(x0 + u * (0.5 + 0.18), y0); g.lineTo(x0 + u * (0.5 + 0.27), bodyY); g.lineTo(x0 + u * (0.5 - 0.27), bodyY); g.closePath(); g.fillStyle = metal(x0, y0, u, capH); g.fill();
  g.beginPath(); g.arc(x0 + u / 2, y0, u * 0.18, Math.PI, 0); g.fillStyle = metal(x0, y0, u, capH); g.fill();
  // the glass, filled from the field
  const poly = () => { g.beginPath(); g.moveTo(x0 + u * (0.5 - LV.halfWidth(0)), bodyY); g.lineTo(x0 + u * (0.5 + LV.halfWidth(0)), bodyY); g.lineTo(x0 + u * (0.5 + LV.halfWidth(1)), baseY); g.lineTo(x0 + u * (0.5 - LV.halfWidth(1)), baseY); g.closePath(); };
  g.save(); poly(); g.clip(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(lvField(), x0, bodyY, u, bodyH);
  const sheen = g.createLinearGradient(x0 + u * 0.2, 0, x0 + u * 0.8, 0); sheen.addColorStop(0, 'rgba(255,255,255,.16)'); sheen.addColorStop(0.18, 'rgba(255,255,255,.02)'); sheen.addColorStop(0.8, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(255,255,255,.1)');
  g.fillStyle = sheen; g.fillRect(x0, bodyY, u, bodyH); g.restore();
  poly(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = Math.max(1, u * 0.008); g.stroke();
  // base
  g.beginPath(); g.moveTo(x0 + u * (0.5 - 0.4), baseY); g.lineTo(x0 + u * (0.5 + 0.4), baseY); g.lineTo(x0 + u * (0.5 + 0.34), baseY + 0.18 * u); g.lineTo(x0 + u * (0.5 + 0.46), baseY + 0.6 * u); g.lineTo(x0 + u * (0.5 - 0.46), baseY + 0.6 * u); g.lineTo(x0 + u * (0.5 - 0.34), baseY + 0.18 * u); g.closePath(); g.fillStyle = metal(x0, baseY, u, 0.6 * u); g.fill();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 + u * 0.1, baseY + 0.56 * u, u * 0.8, 0.04 * u);
}

function lavaView(acct, ctx, back) {
  if (!lvCfg) { lvCfg = lvLoad(); lvPaused = Viewer.reduced(); }
  if (!lvBlobs) lvBlobs = LV.makeBlobs(lvCfg.blobs, Math.random);
  const canvas = h('canvas', { class: 'vw-canvas', role: 'img', 'aria-label': 'A lava lamp with blobs of wax rising and sinking, a decoration' });
  Viewer.run(canvas, lvAdvance, lvDraw);
  const set = (k, v) => { lvCfg = LV.normCfg({ ...lvCfg, [k]: v }); lvStore(); if (k === 'blobs') LV.resize(lvBlobs, lvCfg.blobs, Math.random); };
  const pause = h('button', { class: 'btn primary', 'aria-pressed': String(lvPaused), onclick: e => { lvPaused = !lvPaused; e.currentTarget.textContent = lvPaused ? 'Play' : 'Pause'; e.currentTarget.setAttribute('aria-pressed', String(lvPaused)); } }, lvPaused ? 'Play' : 'Pause');
  const range = (label, key, min, max, step) => { const out = h('output', {}, String(lvCfg[key])); return h('label', { class: 'mx-range' }, h('span', {}, label), h('input', { type: 'range', min, max, step, value: String(lvCfg[key]), 'aria-label': label, oninput: e => { set(key, Number(e.target.value)); out.textContent = e.target.value; } }), out); };
  const swatches = h('div', { class: 'ck-themes', role: 'radiogroup', 'aria-label': 'Lamp colour' }, LV.PALETTES.map(([id, name,, , wax]) => { const b = h('button', { class: 'ck-swatch' + (lvCfg.palette === id ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(lvCfg.palette === id), 'aria-label': name, title: name, style: `background:${wax}`, onclick: () => { set('palette', id); swatches.querySelectorAll('.ck-swatch').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); } }); return b; }));
  const glow = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: lvCfg.glow, onchange: e => set('glow', e.target.checked) }), ' Glow on the room');
  const full = () => Viewer.fullscreen('Lava lamp', lvAdvance, lvDraw, { tapClose: true, hint: 'Tap to close.' });
  return [back(appName(acct, 'lava')), h('div', { class: 'app-pad vw-wrap' }, h('div', { class: 'vw-stage vw-tall' }, canvas),
    h('div', { class: 'btnrow' }, pause, h('button', { class: 'btn', onclick: full }, 'Full screen')),
    h('div', { class: 'mx-opts' }, range('Speed', 'speed', 0.3, 3, 0.1), range('Wax blobs', 'blobs', 3, 12, 1), range('Heat', 'heat', 0.4, 2.5, 0.1), glow, swatches),
    h('p', { class: 'fine' }, 'Just something to look at. It does nothing useful, on purpose.'))];
}

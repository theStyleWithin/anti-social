'use strict';
/* Matrix Viewer: falling digits, just to look at. Nothing to do, nothing to save. Settings are remembered on this device. */
const MX = MatrixCore;
let mxCfg = null, mxPaused = false, mxFull = null, mxRaf = 0, mxRunning = 0;
const mxLoad = () => { try { return MX.normCfg(JSON.parse(localStorage.getItem('as.matrix') || 'null')); } catch { return MX.normCfg(null); } };
const mxStore = () => { try { localStorage.setItem('as.matrix', JSON.stringify(mxCfg)); } catch { /* not remembered */ } };

// runs the rain on a canvas until the canvas leaves the page; returns controls
function mxPlay(canvas, getCfg, isPaused) {
  let cols = [], last = 0, w = 0, h = 0, grid = [0, 0], cellW = 0, cellH = 0, dpr = 1, gen = ++mxRunning;
  const fit = () => {
    const cfg = getCfg(); dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, canvas.clientWidth); h = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    cellW = cfg.size * 0.62 + 6; cellH = cfg.size * 1.12;
    const g = [Math.max(1, Math.floor(w / cellW)), Math.max(1, Math.ceil(h / cellH))];
    if (g[0] !== grid[0] || g[1] !== grid[1] || !cols.length) { cols = cols.length ? MX.resize(cols, g[0], g[1], cfg) : MX.makeColumns(g[0], g[1], cfg); grid = g; }
  };
  const draw = () => {
    const cfg = getCfg(), g = canvas.getContext('2d'), base = MX.hexOf(cfg.color);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.font = `${cfg.size}px ui-monospace, "SF Mono", Consolas, "DejaVu Sans Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const offX = (w - grid[0] * cellW) / 2 + cellW / 2; let glows = 0;
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c], x = offX + c * cellW;
      for (let r = 0; r < col.cells.length; r++) {
        const cell = col.cells[r]; if (cell.b < 0.03) continue;
        const y = r * cellH + cellH / 2, bright = cell.b > 0.96;
        g.globalAlpha = Math.min(1, 0.15 + cell.b * 0.85);
        if (bright && cell.glow && cfg.glow && glows < 60) { glows++; g.shadowColor = base; g.shadowBlur = cfg.size * 0.9; g.fillStyle = '#dfffe8'; }
        else { g.shadowBlur = 0; g.fillStyle = bright ? '#c9ffd8' : base; }
        g.fillText(cell.ch, x, y);
      }
    }
    g.globalAlpha = 1; g.shadowBlur = 0;
  };
  const frame = t => {
    if (gen !== mxRunning || !canvas.isConnected) { mxRaf = 0; return; }
    const dt = Math.min(0.1, last ? (t - last) / 1000 : 0.016); last = t;
    fit(); if (!isPaused()) MX.step(cols, dt, getCfg()); draw();
    mxRaf = requestAnimationFrame(frame);
  };
  cancelAnimationFrame(mxRaf); mxRaf = requestAnimationFrame(frame);
  return { reset: () => { cols = []; grid = [0, 0]; } };
}

function matrixView(acct, ctx, back) {
  if (!mxCfg) { mxCfg = mxLoad(); mxPaused = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  const canvas = h('canvas', { class: 'mx-canvas', role: 'img', 'aria-label': 'Falling green digits, a decoration' });
  const stage = h('div', { class: 'mx-stage' }, canvas);
  const ctl = mxPlay(canvas, () => mxCfg, () => mxPaused);
  const set = (k, v, redo) => { mxCfg = MX.normCfg({ ...mxCfg, [k]: v }); mxStore(); if (redo) ctl.reset(); };
  const pause = h('button', { class: 'btn primary', 'aria-pressed': String(mxPaused), onclick: e => { mxPaused = !mxPaused; e.currentTarget.textContent = mxPaused ? 'Play' : 'Pause'; e.currentTarget.setAttribute('aria-pressed', String(mxPaused)); } }, mxPaused ? 'Play' : 'Pause');
  const range = (label, key, min, max, step, redo) => { const out = h('output', {}, String(mxCfg[key])); const inp = h('input', { type: 'range', min, max, step, value: String(mxCfg[key]), 'aria-label': label, oninput: e => { set(key, Number(e.target.value), redo); out.textContent = e.target.value; } }); return h('label', { class: 'mx-range' }, h('span', {}, label), inp, out); };
  const chars = h('select', { 'aria-label': 'Characters', onchange: e => set('chars', e.target.value, true) }, Object.entries(MX.CHARSETS).map(([id, [name]]) => h('option', { value: id }, name))); chars.value = mxCfg.chars;
  const swatches = h('div', { class: 'ck-themes', role: 'radiogroup', 'aria-label': 'Colour' }, MX.PALETTES.map(([id, name, hex]) => { const b = h('button', { class: 'ck-swatch' + (mxCfg.color === id ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(mxCfg.color === id), 'aria-label': name, title: name, style: `background:${hex}`, onclick: () => { set('color', id); swatches.querySelectorAll('.ck-swatch').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); } }); return b; }));
  const glow = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: mxCfg.glow, onchange: e => set('glow', e.target.checked) }), ' Glowing digits');
  return [back(appName(acct, 'matrix')), h('div', { class: 'app-pad mx-wrap' }, stage,
    h('div', { class: 'btnrow' }, pause, h('button', { class: 'btn', onclick: () => mxFullscreen() }, 'Full screen'), h('button', { class: 'btn', onclick: () => ctl.reset() }, 'Restart')),
    h('div', { class: 'mx-opts' }, h('label', { class: 'field' }, h('span', {}, 'Characters'), chars), range('Speed', 'speed', 0.2, 3, 0.1), range('Digit size', 'size', 14, 48, 1, true), range('Trail length', 'trail', 0.3, 3, 0.1), glow, swatches),
    h('p', { class: 'fine' }, 'Just something to look at. It does nothing useful, on purpose.'))];
}

function mxFullscreen() {
  if (mxFull) return;
  const canvas = h('canvas', { class: 'mx-canvas', role: 'img', 'aria-label': 'Falling digits, full screen' });
  const el = h('div', { class: 'mx-full', role: 'dialog', 'aria-label': 'Matrix, full screen' }, canvas, h('p', { class: 'fine' }, 'Tap to close. Space pauses.'));
  const close = () => { document.removeEventListener('keydown', onKey); try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* fine */ } try { mxFull.lock && mxFull.lock.release(); } catch { /* fine */ } el.remove(); mxFull = null; render(true); };
  const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === ' ') { e.preventDefault(); mxPaused = !mxPaused; } };
  el.addEventListener('click', close); document.addEventListener('keydown', onKey);
  document.body.append(el); mxFull = { el };
  mxPlay(canvas, () => mxCfg, () => mxPaused);
  try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch { /* the overlay still fills the window */ }
  try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { if (mxFull) mxFull.lock = l; else l.release(); }).catch(() => {}); } catch { /* fine */ }
}

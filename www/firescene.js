'use strict';
/* Fireplace picture, drawn in code: a brick chimney breast, a firebox with a grate, bark-and-char logs, coals and flames.
   The still parts (bricks, mantel, floor) are painted once per size; the light, the fire and the moving details are painted every frame. */
const frLayout = (w, h) => { const s = Math.min(w * 0.3, h * 0.36), floorY = h * 0.86; return { s, ox: w / 2, floorY, oy: floorY - s * 0.26, openTop: floorY - s * 1.6 }; };
const frSeed = n => { let x = (n * 9301 + 49297) % 233280; return () => (x = (x * 9301 + 49297) % 233280) / 233280; };
const frRound = (g, x, y, w, h, r) => { if (g.roundRect) { g.beginPath(); g.roundRect(x, y, w, h, r); } else { g.beginPath(); g.rect(x, y, w, h); } };
const frArch = (g, L) => { const { s, ox, floorY, openTop } = L, l = ox - s * 1.1, r = ox + s * 1.1; g.beginPath(); g.moveTo(l, floorY); g.lineTo(l, openTop + s * 0.4); g.quadraticCurveTo(l, openTop, ox, openTop); g.quadraticCurveTo(r, openTop, r, openTop + s * 0.4); g.lineTo(r, floorY); g.closePath(); };
let frStatic = null, frStaticKey = '';

/* ----- the parts that never move ----- */
function frPaintStatic(c, w, h, L) {
  const g = c.getContext('2d'), { s, ox, floorY, oy, openTop } = L, r = frSeed(11);
  // brick wall
  g.fillStyle = '#241915'; g.fillRect(0, 0, w, h);
  const bw = s * 0.37, bh = s * 0.15;
  for (let row = 0, y = 0; y < floorY; row++, y += bh) for (let x = -((row % 2) * bw) / 2; x < w; x += bw) {
    const v = r(), rr = 148 + (v - 0.5) * 70, gg = 74 + (v - 0.5) * 34, bb = 58 + (v - 0.5) * 26, k = 0.72;
    g.fillStyle = `rgb(${rr * k | 0},${gg * k | 0},${bb * k | 0})`; g.fillRect(x + 1.2, y + 1.2, bw - 2.4, bh - 2.4);
    g.fillStyle = 'rgba(255,220,190,.10)'; g.fillRect(x + 1.2, y + 1.2, bw - 2.4, 1.2); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 1.2, y + bh - 2.8, bw - 2.4, 1.6);
    for (let i = 0; i < 3; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,200,160,.08)'; g.fillRect(x + 2 + r() * (bw - 6), y + 2 + r() * (bh - 6), 1 + r() * 3, 1 + r() * 2); }
  }
  // the chimney breast stands out from the wall: shaded edges and a shadow under the mantel
  const bl = ox - s * 1.95, br = ox + s * 1.95; for (const [x, dir] of [[bl, -1], [br, 1]]) { const e = g.createLinearGradient(x - dir * s * 0.02, 0, x + dir * s * 0.28, 0); e.addColorStop(0, 'rgba(0,0,0,.55)'); e.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = e; g.fillRect(dir > 0 ? x - s * 0.3 : x, 0, s * 0.3, floorY); }
  // soot above the opening
  const sootG = g.createRadialGradient(ox, openTop, s * 0.1, ox, openTop - s * 0.2, s * 1.4); sootG.addColorStop(0, 'rgba(0,0,0,.55)'); sootG.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sootG; g.fillRect(ox - s * 1.6, openTop - s * 1.2, s * 3.2, s * 1.5);
  // the mantel: a thick wooden beam with grain
  const mY = openTop - s * 0.3, mH = s * 0.2, mx = ox - s * 1.75, mW = s * 3.5;
  const shade = g.createLinearGradient(0, mY + mH, 0, mY + mH + s * 0.3); shade.addColorStop(0, 'rgba(0,0,0,.65)'); shade.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = shade; g.fillRect(mx + s * 0.05, mY + mH, mW - s * 0.1, s * 0.3);
  const wood = g.createLinearGradient(0, mY, 0, mY + mH); wood.addColorStop(0, '#8a5d36'); wood.addColorStop(0.15, '#6b4627'); wood.addColorStop(0.8, '#4a2e18'); wood.addColorStop(1, '#2a180b'); g.fillStyle = wood; g.fillRect(mx, mY, mW, mH);
  g.strokeStyle = 'rgba(30,15,5,.4)'; for (let i = 0; i < 26; i++) { const y = mY + r() * mH; g.lineWidth = 0.5 + r(); g.beginPath(); g.moveTo(mx + r() * mW * 0.2, y); g.bezierCurveTo(mx + mW * 0.3, y + (r() - 0.5) * 3, mx + mW * 0.6, y + (r() - 0.5) * 3, mx + mW * (0.7 + r() * 0.3), y + (r() - 0.5) * 2); g.stroke(); }
  g.fillStyle = 'rgba(255,220,170,.28)'; g.fillRect(mx, mY, mW, 1.6); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(mx, mY + mH - 2, mW, 2);
  // a framed painting above it
  if (mY - s * 1.25 > 6) { const pw = s * 1.5, ph = s * 0.9, px = ox - pw / 2, py = mY - s * 1.12; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(px + 4, py + 6, pw, ph); g.fillStyle = '#6b4a1e'; g.fillRect(px - s * 0.05, py - s * 0.05, pw + s * 0.1, ph + s * 0.1); g.fillStyle = '#c79a43'; g.fillRect(px - s * 0.03, py - s * 0.03, pw + s * 0.06, ph + s * 0.06);
    const sky = g.createLinearGradient(0, py, 0, py + ph); sky.addColorStop(0, '#2a3a6a'); sky.addColorStop(0.55, '#e7a35a'); sky.addColorStop(1, '#5a3a3a'); g.fillStyle = sky; g.fillRect(px, py, pw, ph);
    g.fillStyle = '#3a2f4a'; g.beginPath(); g.moveTo(px, py + ph * 0.7); g.bezierCurveTo(px + pw * 0.2, py + ph * 0.45, px + pw * 0.4, py + ph * 0.7, px + pw * 0.6, py + ph * 0.55); g.bezierCurveTo(px + pw * 0.8, py + ph * 0.4, px + pw * 0.9, py + ph * 0.6, px + pw, py + ph * 0.5); g.lineTo(px + pw, py + ph); g.lineTo(px, py + ph); g.fill();
    g.fillStyle = '#1e1a2a'; g.beginPath(); g.moveTo(px, py + ph * 0.85); g.bezierCurveTo(px + pw * 0.3, py + ph * 0.7, px + pw * 0.6, py + ph * 0.95, px + pw, py + ph * 0.75); g.lineTo(px + pw, py + ph); g.lineTo(px, py + ph); g.fill(); g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(px + pw * 0.75, py + ph * 0.28, ph * 0.08, 0, 6.283); g.fill(); }
  // the opening: stone surround, then the firebox with a firebrick back and sides that run into the distance
  frArch(g, L); g.lineWidth = s * 0.12; g.strokeStyle = '#3a312c'; g.stroke(); g.lineWidth = s * 0.03; g.strokeStyle = '#6a5d54'; g.stroke();
  g.save(); frArch(g, L); g.clip();
  const l = ox - s * 1.1, rr = ox + s * 1.1, il = ox - s * 0.82, ir = ox + s * 0.82, it = openTop + s * 0.34, ib = floorY - s * 0.1;
  g.fillStyle = '#0c0807'; g.fillRect(l, openTop, rr - l, floorY - openTop);
  const bwall = g.createLinearGradient(0, it, 0, ib); bwall.addColorStop(0, '#171210'); bwall.addColorStop(1, '#3a2f29'); g.fillStyle = bwall; g.fillRect(il, it, ir - il, ib - it);
  const fr = frSeed(5), fb = s * 0.2, fh = s * 0.085; g.fillStyle = '#5a4a40'; g.fillRect(il, it, ir - il, ib - it); for (let row = 0, y = it; y < ib; row++, y += fh) for (let x = il - (row % 2) * fb / 2; x < ir; x += fb) { const v = 0.5 + fr() * 0.5; g.fillStyle = `rgb(${205 * v | 0},${160 * v | 0},${122 * v | 0})`; g.fillRect(Math.max(il, x) + 1, y + 1.5, Math.min(ir, x + fb) - Math.max(il, x) - 2, fh - 3); g.fillStyle = 'rgba(255,230,200,.18)'; g.fillRect(Math.max(il, x) + 1, y + 1.5, Math.min(ir, x + fb) - Math.max(il, x) - 2, 1.3); }
  for (const dir of [-1, 1]) { const ox0 = dir < 0 ? l : rr, ix = dir < 0 ? il : ir; const sg = g.createLinearGradient(ox0, 0, ix, 0); sg.addColorStop(0, 'rgba(20,14,10,.97)'); sg.addColorStop(1, 'rgba(50,40,34,.9)'); g.fillStyle = sg; g.beginPath(); g.moveTo(ox0, floorY); g.lineTo(ox0, openTop); g.lineTo(ix, it); g.lineTo(ix, ib); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(8,5,4,.97)'; g.beginPath(); g.moveTo(l, openTop); g.lineTo(rr, openTop); g.lineTo(ir, it); g.lineTo(il, it); g.closePath(); g.fill();
  const flo = g.createLinearGradient(0, ib, 0, floorY); flo.addColorStop(0, '#3a322c'); flo.addColorStop(1, '#201a16'); g.fillStyle = flo; g.beginPath(); g.moveTo(il, ib); g.lineTo(ir, ib); g.lineTo(rr, floorY); g.lineTo(l, floorY); g.closePath(); g.fill();
  const soot = g.createLinearGradient(0, it, 0, ib); soot.addColorStop(0, 'rgba(0,0,0,.85)'); soot.addColorStop(0.55, 'rgba(0,0,0,.28)'); soot.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = soot; g.fillRect(il, it, ir - il, ib - it);
  g.restore();
  // hearth stone and the floor around it
  const hh = s * 0.16, hy = floorY; const stone = g.createLinearGradient(0, hy, 0, hy + hh); stone.addColorStop(0, '#6f6862'); stone.addColorStop(1, '#3a3532'); g.fillStyle = stone; g.fillRect(ox - s * 1.6, hy, s * 3.2, hh); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(ox - s * 1.6, hy, s * 3.2, 2);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(ox - s * 1.6 + i * s * 0.533, hy); g.lineTo(ox - s * 1.6 + i * s * 0.533, hy + hh); g.stroke(); }
  const fl = g.createLinearGradient(0, hy + hh, 0, h); fl.addColorStop(0, '#2b1c12'); fl.addColorStop(1, '#0e0905'); g.fillStyle = fl; g.fillRect(0, hy + hh, w, h - hy - hh);
  g.fillStyle = '#241911'; g.fillRect(0, hy, ox - s * 1.6, h - hy); g.fillRect(ox + s * 1.6, hy, w - ox - s * 1.6, h - hy);
  g.strokeStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 9; i++) { const y = hy + hh + (h - hy - hh) * Math.pow(i / 9, 1.5) + 4; g.lineWidth = 1 + i * 0.25; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#2a1e18'; g.fillRect(0, floorY - s * 0.07, w, s * 0.07); g.fillStyle = 'rgba(255,230,200,.08)'; g.fillRect(0, floorY - s * 0.07, w, 1.5);
  // the rug
  const ry = hy + hh + (h - hy - hh) * 0.5, rw = s * 1.85, rh = (h - hy - hh) * 0.36; g.fillStyle = '#4a1b22'; g.beginPath(); g.ellipse(ox, ry, rw, rh, 0, 0, 6.283); g.fill(); g.strokeStyle = '#c9a15a'; g.lineWidth = 3; g.beginPath(); g.ellipse(ox, ry, rw * 0.9, rh * 0.82, 0, 0, 6.283); g.stroke(); g.strokeStyle = 'rgba(201,161,90,.5)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(ox, ry, rw * 0.7, rh * 0.6, 0, 0, 6.283); g.stroke();
  // a basket of logs on one side, fire tools on the other
  if (ox + s * 2.6 < w) { const bx = ox + s * 2.35, by = floorY + s * 0.02; g.fillStyle = '#3a2a1a'; for (let i = 0; i < 4; i++) { g.fillStyle = ['#6b4627', '#58381d', '#7a5230'][i % 3]; g.beginPath(); g.ellipse(bx - s * 0.16 + i * s * 0.1, by - s * 0.4 - (i % 2) * s * 0.05, s * 0.07, s * 0.04, 0, 0, 6.283); g.fill(); g.fillStyle = '#8a6a44'; g.beginPath(); g.arc(bx - s * 0.16 + i * s * 0.1 - s * 0.05, by - s * 0.4 - (i % 2) * s * 0.05, s * 0.032, 0, 6.283); g.fill(); }
    const bk = g.createLinearGradient(0, by - s * 0.45, 0, by); bk.addColorStop(0, '#8a6a3a'); bk.addColorStop(1, '#4a3418'); g.fillStyle = bk; g.beginPath(); g.moveTo(bx - s * 0.32, by - s * 0.42); g.lineTo(bx + s * 0.32, by - s * 0.42); g.lineTo(bx + s * 0.26, by); g.lineTo(bx - s * 0.26, by); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,25,10,.55)'; g.lineWidth = 1.5; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(bx - s * 0.3, by - s * 0.42 + i * s * 0.07); g.lineTo(bx + s * 0.3, by - s * 0.42 + i * s * 0.07); g.stroke(); } for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(bx + i * s * 0.09, by - s * 0.42); g.lineTo(bx + i * s * 0.075, by); g.stroke(); } }
  if (ox - s * 2.6 > 0) { const tx = ox - s * 2.2; g.strokeStyle = '#1a1a1e'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx, floorY - s * 0.05); g.lineTo(tx, floorY - s * 0.15); g.stroke(); g.fillStyle = '#16161a'; g.beginPath(); g.ellipse(tx, floorY + s * 0.02, s * 0.12, s * 0.035, 0, 0, 6.283); g.fill();
    g.lineWidth = 2.4; g.strokeStyle = '#25252b'; g.beginPath(); g.moveTo(tx, floorY - s * 0.05); g.lineTo(tx - s * 0.05, floorY - s * 0.85); g.quadraticCurveTo(tx - s * 0.07, floorY - s * 0.92, tx - s * 0.12, floorY - s * 0.88); g.stroke(); g.beginPath(); g.moveTo(tx, floorY - s * 0.05); g.lineTo(tx + s * 0.04, floorY - s * 0.78); g.stroke(); g.fillStyle = '#25252b'; g.fillRect(tx + s * 0.0, floorY - s * 0.82, s * 0.09, s * 0.07); g.strokeStyle = '#3a3a42'; g.lineWidth = 5; g.beginPath(); g.moveTo(tx + s * 0.07, floorY - s * 0.05); g.lineTo(tx + s * 0.09, floorY - s * 0.7); g.stroke(); }
  // a window on the left wall, if there is room
  if (ox - s * 3.0 - s * 0.5 > 8) { const ww = s * 0.95, wh = s * 1.5, wx = ox - s * 3.0 - ww / 2, wy = floorY - s * 2.5; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 14); g.fillStyle = '#4a2f1d'; g.fillRect(wx - s * 0.08, wy + wh, ww + s * 0.16, s * 0.06); }
}
function frWindowLive(g, L, w) {
  const { s, ox, floorY } = L; if (!(ox - s * 3.0 - s * 0.5 > 8)) return; const ww = s * 0.95, wh = s * 1.5, x = ox - s * 3.0 - ww / 2, y = floorY - s * 2.5;
  const sky = g.createLinearGradient(0, y, 0, y + wh); sky.addColorStop(0, '#08102a'); sky.addColorStop(1, '#27406e'); g.fillStyle = sky; g.fillRect(x, y, ww, wh);
  g.fillStyle = '#eef3ff'; g.beginPath(); g.arc(x + ww * 0.72, y + wh * 0.2, ww * 0.1, 0, 6.283); g.fill(); g.fillStyle = '#0c1634'; g.beginPath(); g.arc(x + ww * 0.77, y + wh * 0.18, ww * 0.09, 0, 6.283); g.fill();
  g.fillStyle = '#0d1a33'; g.beginPath(); g.moveTo(x, y + wh * 0.85); for (let i = 0; i <= 8; i++) g.lineTo(x + ww * i / 8, y + wh * (0.8 - 0.06 * Math.sin(i * 1.7) )); g.lineTo(x + ww, y + wh); g.lineTo(x, y + wh); g.fill();
  g.save(); g.beginPath(); g.rect(x, y, ww, wh); g.clip(); g.fillStyle = '#fff'; for (const f of frSnow || []) { g.globalAlpha = 0.4 + 0.5 * f.r / 2.2; g.beginPath(); g.arc(x + f.x * ww, y + f.y * wh, f.r * Math.max(0.8, ww / 150), 0, 6.283); g.fill(); } g.globalAlpha = 1; g.fillStyle = '#dfe8f6'; g.fillRect(x, y + wh * 0.94, ww, wh * 0.06); g.restore();
  g.strokeStyle = '#4a2f1d'; g.lineWidth = Math.max(4, ww * 0.08); g.strokeRect(x, y, ww, wh); g.lineWidth = Math.max(2, ww * 0.045); g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + wh); g.moveTo(x, y + wh * 0.5); g.lineTo(x + ww, y + wh * 0.5); g.stroke();
  const gl = g.createLinearGradient(x, y, x + ww, y + wh); gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(0.3, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x, y, ww, wh);
}

/* ----- the flames: heat is painted into a small grey picture, then every level of heat is given a colour ----- */
const FRW = 300, FRH = 352, FR_X0 = -1.15, FR_X1 = 1.15, FR_Y0 = -0.15, FR_Y1 = 1.6;
let frHeat = null, frHeatG = null, frFlame = null, frFlameG = null, frSprite = null, frLut = null, frLutId = '';
const frNoise = (t, k) => Math.sin(t * 1.0 + k * 12.9) * 0.5 + Math.sin(t * 2.3 + k * 7.1) * 0.3 + Math.sin(t * 5.1 + k * 3.7) * 0.2;
// Flames are made of tongues. Each one grows, leans, flickers and dies on its own cycle, then comes back somewhere else on the logs.
// They are worked out from the time alone, so nothing has to be remembered between frames.
function frTongues(pw) {
  const lit = frFire.logs.filter(l => l.lit > 0.2 && l.wood > 0.04), out = [], t = frFire.t, n = Math.round(10 + 18 * Math.min(1, pw)); if (!lit.length) return out;
  for (let i = 0; i < n; i++) {
    const r = frSeed(i * 7919 + 3), P = 1.0 + r() * 1.7, ph = r(), u = (t / P + ph) % 1, cyc = Math.floor(t / P + ph), q = frSeed(i * 977 + cyc * 131 + 17), l = lit[(q() * lit.length) | 0];
    const env = u < 0.3 ? u / 0.3 : u > 0.72 ? Math.max(0, (1 - u) / 0.28) : 1, e2 = env * env * (3 - 2 * env), big = i < 4 ? 1 : 0.45 + q() * 0.4;
    const x = l.x + (q() - 0.5) * l.len * 0.75, y = l.y + l.rad * 0.7, hgt = (0.75 + 0.8 * q()) * big * (0.75 + 0.25 * frNoise(t * 2.2 + i, i)) * e2 * frCfg.height * (0.55 + 0.6 * Math.min(1.1, pw));
    out.push({ x, y, h: hgt, w: (0.032 + 0.04 * q()) * (0.6 + 0.4 * e2) * (0.7 + 0.5 * big), lean: (frNoise(t * 1.3, i) * 0.16 + (x * 0.06)), curl: frNoise(t * 2.6 + 2, i + 40) * 0.26, k: i });
  }
  return out;
}
function frFlameImage(pal, pw) {
  if (!frHeat) {
    frHeat = document.createElement('canvas'); frHeat.width = FRW; frHeat.height = FRH; frHeatG = frHeat.getContext('2d', { willReadFrequently: true });
    frFlame = document.createElement('canvas'); frFlame.width = FRW; frFlame.height = FRH; frFlameG = frFlame.getContext('2d');
    frSprite = document.createElement('canvas'); frSprite.width = frSprite.height = 64; const sg = frSprite.getContext('2d'), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  }
  if (frLutId !== pal[0]) {
    frLutId = pal[0]; frLut = new Uint8ClampedArray(256 * 4); const st = [pal[5], pal[4], pal[3], pal[2]].map(Viewer.hexRgb);
    for (let v = 0; v < 256; v++) { const t = v / 255, u = Math.min(0.999, Math.pow(t, 0.95)) * 3, i = u | 0, c = Viewer.mixRgb(st[i], st[i + 1], u - i), a = Math.max(0, Math.min(1, (t - 0.1) / 0.17)); frLut[v * 4] = c[0]; frLut[v * 4 + 1] = c[1]; frLut[v * 4 + 2] = c[2]; frLut[v * 4 + 3] = 255 * a * a * (3 - 2 * a); }
  }
  const g = frHeatG; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, FRW, FRH); g.globalCompositeOperation = 'lighter';
  const px = x => (x - FR_X0) / (FR_X1 - FR_X0) * FRW, py = y => FRH - (y - FR_Y0) / (FR_Y1 - FR_Y0) * FRH, unit = FRW / (FR_X1 - FR_X0);
  // heat sitting on every burning log, so the tongues have something to grow out of
  for (const l of frFire.logs) if (l.lit > 0.2 && l.wood > 0.04) { const k = l.lit * Math.sqrt(l.wood); g.globalAlpha = 0.5 * k; const lw = l.len * unit * 0.5, lh = unit * 0.2; g.drawImage(frSprite, px(l.x) - lw, py(l.y + 0.08) - lh * 0.7, lw * 2, lh); }
  g.globalAlpha = 1;
  for (const T of frTongues(pw)) {
    const bx = px(T.x), by = py(T.y), H = T.h * unit, W = T.w * unit, tx = bx + T.lean * H, ty = by - H, cv = T.curl * H;
    for (const [wm, am] of [[1.7, 0.42], [1, 0.62], [0.45, 0.55]]) {
      const w = W * wm, gr = g.createLinearGradient(0, by, 0, ty); gr.addColorStop(0, `rgba(255,255,255,${am})`); gr.addColorStop(0.35, `rgba(255,255,255,${am * 0.8})`); gr.addColorStop(0.75, `rgba(255,255,255,${am * 0.32})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(bx - w, by); g.bezierCurveTo(bx - w * 1.15 + cv * 0.9, by - H * 0.33, tx - w * 0.4 - cv * 0.7, by - H * 0.7, tx, ty); g.bezierCurveTo(tx + w * 0.4 - cv * 0.7, by - H * 0.68, bx + w * 1.15 + cv * 0.9, by - H * 0.3, bx + w, by); g.closePath(); g.fill();
    }
  }
  // a little general body so the gaps between tongues glow rather than go black
  for (const p of frFire.parts) {
    if (p.k !== 'f') continue; const frac = p.life / p.max, a = Math.pow(1 - frac, 1.4) * 0.07 * (frac < 0.1 ? frac / 0.1 : 1), r = p.r * unit * (1.2 - frac * 0.6) * 1.1;
    g.globalAlpha = a; g.drawImage(frSprite, px(p.x) - r, py(p.y) - r * 2, r * 2, r * 4);
  }
  g.globalAlpha = 1; const img = g.getImageData(0, 0, FRW, FRH), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = d[i] * 4; d[i] = frLut[v]; d[i + 1] = frLut[v + 1]; d[i + 2] = frLut[v + 2]; d[i + 3] = frLut[v + 3]; }
  frFlameG.putImageData(img, 0, 0); return frFlame;
}

/* ----- logs ----- */
function frLogDraw(g, l, ox, oy, s, pal, t) {
  const rad = l.rad * (0.5 + 0.5 * l.wood) * s, len = l.len * s * (0.64 + 0.36 * l.wood), char = Math.pow(1 - l.wood, 0.75), r = frSeed(l.id * 131 + 7), flick = 0.72 + 0.28 * Math.sin(t * 4 + l.ring * 3);
  g.save(); g.translate(ox + l.x * s, oy - l.y * s); g.rotate(l.ang);
  const n = 16, top = [], bot = []; for (let i = 0; i <= n; i++) { const x = -len / 2 + len * i / n; top.push([x, -rad * (1 + (r() - 0.5) * 0.14)]); bot.push([x, rad * (1 + (r() - 0.5) * 0.14)]); }
  const path = () => { g.beginPath(); g.moveTo(bot[0][0], bot[0][1]); g.quadraticCurveTo(-len / 2 - rad * 0.28, 0, top[0][0], top[0][1]); for (let i = 1; i <= n; i++) g.lineTo(top[i][0], top[i][1]); g.quadraticCurveTo(len / 2 + rad * 0.2, 0, bot[n][0], bot[n][1]); for (let i = n - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]); g.closePath(); };
  const mixc = (c, k) => { const m = Viewer.mixRgb(c, [14, 9, 7], Math.min(0.94, char * k)); return `rgb(${m[0] | 0},${m[1] | 0},${m[2] | 0})`; };
  const bg = g.createLinearGradient(0, -rad, 0, rad); bg.addColorStop(0, mixc([96, 66, 42], 0.9)); bg.addColorStop(0.3, mixc([66, 44, 27], 0.95)); bg.addColorStop(0.7, mixc([40, 26, 15], 1)); bg.addColorStop(1, mixc([16, 9, 5], 1));
  path(); g.fillStyle = bg; g.fill(); g.save(); path(); g.clip();
  g.lineCap = 'round'; for (let k = 0; k < 11; k++) { const y0 = -rad + rad * 2 * (k + 0.5) / 11 + (r() - 0.5) * rad * 0.12; g.strokeStyle = `rgba(0,0,0,${0.18 + r() * 0.22})`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); g.moveTo(-len / 2, y0); for (let i = 1; i <= 10; i++) g.lineTo(-len / 2 + len * i / 10, y0 + Math.sin(i * 1.3 + k) * rad * 0.06); g.stroke(); }
  g.fillStyle = `rgba(255,225,185,${0.07 * (1 - char)})`; g.fillRect(-len / 2, -rad * 0.78, len, rad * 0.18);
  if (char > 0.04) { for (let k = 0, m = 14 + char * 50; k < m; k++) { g.fillStyle = `rgba(8,5,3,${(0.35 + r() * 0.5) * Math.min(1, char * 1.4)})`; const cx = -len / 2 + r() * len, cy = (r() - 0.5) * rad * 2, cw = rad * (0.15 + r() * 0.5); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + cw, cy + (r() - 0.5) * cw); g.lineTo(cx + cw * 0.6, cy + cw * (0.3 + r() * 0.5)); g.lineTo(cx - cw * 0.2, cy + cw * 0.4); g.closePath(); g.fill(); } }
  if (l.lit > 0.2) { g.globalCompositeOperation = 'lighter'; const gl = l.lit * (0.2 + 0.8 * char) * flick, hot = Viewer.hexRgb(pal[3]);
    for (let k = 0, m = 8 + char * 12; k < m; k++) { let x = -len / 2 + r() * len, y = (r() - 0.5) * rad * 1.6; g.strokeStyle = `rgba(${hot[0]},${hot[1] * 0.55 | 0},${hot[2] * 0.2 | 0},${gl * (0.5 + r() * 0.5)})`; g.lineWidth = 0.8 + r() * 1.6; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - 0.3) * rad * 0.7; y += (r() - 0.5) * rad * 0.5; g.lineTo(x, y); } g.stroke(); }
    const ug = g.createLinearGradient(0, -rad, 0, rad); ug.addColorStop(0.4, 'rgba(255,120,30,0)'); ug.addColorStop(1, `rgba(255,120,30,${l.lit * 0.45 * (0.4 + char) * flick})`); g.fillStyle = ug; g.fillRect(-len / 2, -rad, len, rad * 2); g.globalCompositeOperation = 'source-over'; }
  g.restore();
  if (char > 0.35) { g.fillStyle = 'rgba(150,140,130,.4)'; for (let k = 0, m = 20 + char * 40; k < m; k++) { const ax = -len / 2 + r() * len, ay = -rad * (0.95 - r() * 0.5); g.globalAlpha = 0.25 + r() * 0.4 * char; g.fillRect(ax, ay, 1 + r() * 3, 1 + r() * 1.6); } g.globalAlpha = 1; }
  // the sawn end with its rings
  const ex = -len / 2, ew = rad * 0.34; g.fillStyle = mixc([176, 138, 92], 0.9); g.beginPath(); g.ellipse(ex, 0, ew, rad * 0.98, 0, 0, 6.283); g.fill(); g.strokeStyle = `rgba(70,40,18,${0.5 - char * 0.3})`; g.lineWidth = 1; for (let k = 1; k <= 4; k++) { g.beginPath(); g.ellipse(ex, 0, ew * k / 4.5, rad * 0.98 * k / 4.5, 0, 0, 6.283); g.stroke(); }
  g.strokeStyle = 'rgba(30,15,5,.6)'; g.beginPath(); g.moveTo(ex, 0); g.lineTo(ex - ew * 0.8, -rad * (0.3 + r() * 0.5)); g.stroke();
  if (l.lit > 0.3 && char > 0.3) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,110,30,${0.5 * l.lit * char * flick})`; g.beginPath(); g.ellipse(ex, 0, ew * 0.8, rad * 0.8, 0, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.restore();
}

/* ----- one frame ----- */
function frDraw(g, w, h) {
  const L = frLayout(w, h), { s, ox, floorY, oy, openTop } = L, pal = frPal(), hot = Viewer.hexRgb(pal[3]), t = frFire.t, d = Math.min(2, window.devicePixelRatio || 1);
  const key = `${w}x${h}@${d}`; if (key !== frStaticKey) { frStatic = document.createElement('canvas'); frStatic.width = Math.round(w * d); frStatic.height = Math.round(h * d); const sg = frStatic.getContext('2d'); sg.scale(d, d); frPaintStatic(frStatic, w, h, L); frStaticKey = key; }
  const pw = Math.min(1.2, FR.power(frFire)), coal = frFire.coals, light = Math.min(1, pw * 0.85 + coal * 0.3) * (0.92 + 0.05 * Math.sin(t * 11) + 0.03 * Math.sin(t * 27 + 1));
  g.drawImage(frStatic, 0, 0, w, h); if (!frSnow) frAmbient(0);
  frWindowLive(g, L, w);
  // stockings, candle and clock sway and tick
  const mY = openTop - s * 0.3;
  [[-1.3, '#a8202a'], [-1.0, '#2c7a45'], [1.25, '#a8202a']].forEach(([dx, col], i) => { const x = ox + dx * s, y = mY + s * 0.2, sw = Math.sin(t * 1.3 + i * 2) * s * 0.012; g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 0.07, y); g.lineTo(x + s * 0.07, y); g.lineTo(x + s * 0.07 + sw, y + s * 0.2); g.quadraticCurveTo(x + s * 0.11 + sw, y + s * 0.3, x + sw * 1.3, y + s * 0.3); g.lineTo(x - s * 0.07 + sw, y + s * 0.22); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y, s * 0.07, s * 0.2); g.fillStyle = '#f2ece0'; g.fillRect(x - s * 0.085, y - s * 0.015, s * 0.17, s * 0.055); });
  const kx = ox - s * 1.45, ky = mY - s * 0.17, kr = s * 0.15; g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(kx, ky, kr + s * 0.025, 0, 6.283); g.fill(); g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(kx, ky, kr, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(40,25,10,.6)'; g.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i * 0.5236; g.beginPath(); g.moveTo(kx + Math.sin(a) * kr * 0.86, ky - Math.cos(a) * kr * 0.86); g.lineTo(kx + Math.sin(a) * kr * 0.96, ky - Math.cos(a) * kr * 0.96); g.stroke(); }
  const dd = new Date(), hh = (dd.getHours() % 12 + dd.getMinutes() / 60) / 12 * 6.283, mm = (dd.getMinutes() + dd.getSeconds() / 60) / 60 * 6.283, ss = dd.getSeconds() / 60 * 6.283; g.strokeStyle = '#2a1a10'; g.lineCap = 'round'; g.lineWidth = Math.max(1.6, s * 0.016);
  g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(hh) * kr * 0.5, ky - Math.cos(hh) * kr * 0.5); g.stroke(); g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(mm) * kr * 0.78, ky - Math.cos(mm) * kr * 0.78); g.stroke(); g.strokeStyle = '#a02020'; g.lineWidth = 1; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(ss) * kr * 0.85, ky - Math.cos(ss) * kr * 0.85); g.stroke();
  const cx = ox + s * 1.5, cfl = 0.85 + 0.15 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23); g.fillStyle = '#efe6cf'; g.fillRect(cx - s * 0.035, mY - s * 0.2, s * 0.07, s * 0.2); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(cx, mY - s * 0.2, s * 0.035, s * 0.2);
  // night over the room, lifted by the firelight
  const dark = g.createRadialGradient(ox, oy - s * 0.5, s * 0.5, ox, oy - s * 0.5, Math.max(w, h) * 0.78), out = 1 - light;
  dark.addColorStop(0, `rgba(6,3,2,${0.2 + 0.6 * out})`); dark.addColorStop(0.45, `rgba(6,3,2,${0.62 + 0.3 * out})`); dark.addColorStop(1, `rgba(3,2,2,${0.9 + 0.08 * out})`); g.fillStyle = dark; g.fillRect(0, 0, w, h);
  // warm light on the bricks, the mantel and the floor
  g.globalCompositeOperation = 'lighter';
  const warm = g.createRadialGradient(ox, oy - s * 0.3, s * 0.2, ox, oy - s * 0.3, s * 3.4); warm.addColorStop(0, `rgba(${hot[0]},${hot[1] * 0.62 | 0},${hot[2] * 0.3 | 0},${0.5 * light})`); warm.addColorStop(0.5, `rgba(${hot[0]},${hot[1] * 0.45 | 0},${hot[2] * 0.2 | 0},${0.2 * light})`); warm.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = warm; g.fillRect(0, 0, w, h);
  const spill = g.createRadialGradient(ox, floorY + s * 0.2, s * 0.1, ox, floorY + s * 0.2, s * 1.9); spill.addColorStop(0, `rgba(${hot[0]},${hot[1] * 0.5 | 0},${hot[2] * 0.2 | 0},${0.5 * light})`); spill.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(0, floorY + s * 0.2); g.scale(1, 0.32); g.translate(0, -(floorY + s * 0.2)); g.fillStyle = spill; g.fillRect(ox - s * 2, floorY - s * 2, s * 4, s * 4); g.restore();
  const cg = g.createRadialGradient(cx, mY - s * 0.25, 0, cx, mY - s * 0.25, s * 0.6); cg.addColorStop(0, `rgba(255,190,90,${0.4 * cfl})`); cg.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = cg; g.fillRect(cx - s * 0.6, mY - s * 0.85, s * 1.2, s * 1.2);
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#ffd36a'; g.beginPath(); g.ellipse(cx, mY - s * 0.25, s * 0.022 * cfl, s * 0.052 * cfl, 0, 0, 6.283); g.fill(); g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(cx, mY - s * 0.23, s * 0.011, s * 0.024, 0, 0, 6.283); g.fill();
  // everything inside the firebox is drawn clipped to the opening
  g.save(); frArch(g, L); g.clip();
  const back = g.createRadialGradient(ox, oy - s * 0.2, s * 0.1, ox, oy - s * 0.2, s * 1.5); back.addColorStop(0, `rgba(${hot[0]},${hot[1] * 0.6 | 0},${hot[2] * 0.3 | 0},${0.65 * light})`); back.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = back; g.fillRect(ox - s * 1.2, openTop, s * 2.4, floorY - openTop); g.globalCompositeOperation = 'source-over';
  // grate bars and ash
  const barY = oy + s * 0.14; g.fillStyle = '#0d0d10'; g.fillRect(ox - s * 0.9, barY + s * 0.02, s * 1.8, s * 0.03);
  const ashAmt = frFire.ash || 0; if (ashAmt > 0.01) { const ag = g.createLinearGradient(0, floorY - s * 0.3, 0, floorY - s * 0.05); ag.addColorStop(0, '#6a6560'); ag.addColorStop(1, '#2a2724'); g.fillStyle = ag; g.beginPath(); g.ellipse(ox, floorY - s * 0.07, s * (0.5 + 0.35 * ashAmt), s * 0.1 * (0.4 + ashAmt * 0.9), 0, Math.PI, 0); g.fill(); }
  // coals
  const cr = frSeed(21); for (let i = 0; i < 70; i++) { const x = ox + (cr() - 0.5) * s * 1.7, y = barY - s * (0.02 + cr() * 0.07) + s * 0.05, cw = s * (0.018 + cr() * 0.035), ph = cr() * 6, glow = coal * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (1 + cr() * 2) + ph)));
    g.fillStyle = '#1b1310'; g.beginPath(); g.ellipse(x, y, cw, cw * 0.6, cr(), 0, 6.283); g.fill(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,${80 + 70 * glow | 0},20,${glow * 0.8})`; g.beginPath(); g.ellipse(x, y, cw * 0.8, cw * 0.46, 0, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.globalCompositeOperation = 'lighter'; const bed = g.createRadialGradient(ox, barY, 0, ox, barY, s * 0.9); bed.addColorStop(0, `rgba(255,110,25,${0.45 * coal})`); bed.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = bed; g.fillRect(ox - s, barY - s * 0.6, s * 2, s * 1.2); g.globalCompositeOperation = 'source-over';
  for (const l of frFire.logs.slice().sort((p, q) => p.y - q.y)) frLogDraw(g, l, ox, oy, s, pal, t);
  g.globalCompositeOperation = 'lighter'; { const lw = g.createRadialGradient(ox, oy - s * 0.1, s * 0.1, ox, oy - s * 0.1, s * 1.1); lw.addColorStop(0, `rgba(255,120,30,${0.22 * light})`); lw.addColorStop(1, 'rgba(255,80,10,0)'); g.fillStyle = lw; g.fillRect(ox - s * 1.2, oy - s * 0.9, s * 2.4, s * 1.4); } g.globalCompositeOperation = 'source-over';
  // the flames
  const img = frFlameImage(pal, pw), fx = ox + FR_X0 * s, fw = (FR_X1 - FR_X0) * s, fh = (FR_Y1 - FR_Y0) * s, fy = oy - FR_Y1 * s;
  g.imageSmoothingEnabled = true; g.drawImage(img, fx, fy, fw, fh);
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.3 * Math.min(1, pw + 0.2); g.drawImage(img, ox - fw * 0.62, fy - fh * 0.12, fw * 1.24, fh * 1.24); g.globalAlpha = 1;
  // embers and sparks
  for (const p of frFire.parts) { if (p.k === 'f') continue; const frac = p.life / p.max, a = (1 - frac) * (p.k === 'e' ? 0.7 + 0.3 * Math.sin(t * 18 + p.max * 30) : 1), c = FR.flameColor(pal, 0.15 + frac * 0.4, (A, B, k) => Viewer.mixRgb(Viewer.hexRgb(A), Viewer.hexRgb(B), k)), x = ox + p.x * s, y = oy - p.y * s, rr = Math.max(0.9, p.r * s * 1.6);
    const sg = g.createRadialGradient(x, y, 0, x, y, rr * 3); sg.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`); sg.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`); g.fillStyle = sg; g.fillRect(x - rr * 3, y - rr * 3, rr * 6, rr * 6); }
  g.globalCompositeOperation = 'source-over';
  // the front of the grate: top rail, bottom rail and a row of spindles, standing in front of the glowing ash bed
  { const rt = oy + s * 0.15, rb = oy + s * 0.3, x0 = ox - s * 0.9, x1 = ox + s * 0.9, ir = frSeed(77); for (let i = 0; i <= 16; i++) { const x = x0 + (x1 - x0) * i / 16; const sg = g.createLinearGradient(x - s * 0.012, 0, x + s * 0.012, 0); sg.addColorStop(0, '#08080a'); sg.addColorStop(0.5, '#3c3c44'); sg.addColorStop(1, '#08080a'); g.fillStyle = sg; g.fillRect(x - s * 0.012, rt, s * 0.024, rb - rt); }
    for (const y of [rt, rb]) { const rg = g.createLinearGradient(0, y, 0, y + s * 0.03); rg.addColorStop(0, '#46464e'); rg.addColorStop(1, '#0a0a0c'); g.fillStyle = rg; g.fillRect(x0 - s * 0.02, y, x1 - x0 + s * 0.04, s * 0.03); }
    g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,120,30,${0.18 * light})`; g.fillRect(x0, rt + s * 0.03, x1 - x0, rb - rt - s * 0.03); g.globalCompositeOperation = 'source-over'; void ir; }
  // the front posts of the andirons stand in front of the logs
  for (const dx of [-0.9, 0.9]) { const x = ox + dx * s, gp = g.createLinearGradient(x - s * 0.03, 0, x + s * 0.03, 0); gp.addColorStop(0, '#0a0a0c'); gp.addColorStop(0.4, '#4a4a54'); gp.addColorStop(1, '#0a0a0c'); g.fillStyle = gp; g.fillRect(x - s * 0.025, oy - s * 0.2, s * 0.05, floorY - oy + s * 0.2 - s * 0.04); g.fillStyle = '#26262c'; g.beginPath(); g.arc(x, oy - s * 0.22, s * 0.045, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - s * 0.015, oy - s * 0.235, s * 0.014, 0, 6.283); g.fill(); g.fillStyle = `rgba(255,140,50,${0.4 * light})`; g.fillRect(x - s * 0.02, oy - s * 0.2, s * 0.012, floorY - oy); }
  g.restore();
  // dust floating in the firelight, then a soft edge to the whole picture
  g.globalCompositeOperation = 'lighter'; for (const m of frMotes || []) { const x = m.x * w, y = m.y * h, dist = Math.hypot(x - ox, y - (oy - s * 0.4)) / (s * 3.2), a = Math.max(0, 1 - dist) * light * (0.3 + 0.35 * Math.sin(t * 1.5 + m.ph)); if (a <= 0.01) continue; g.fillStyle = `rgba(${hot[0]},${hot[1] | 0},${hot[2] * 0.6 | 0},${a * 0.8})`; g.beginPath(); g.arc(x, y, 0.8 + (m.ph % 1.3), 0, 6.283); g.fill(); } g.globalCompositeOperation = 'source-over';
  if (FR.isOut(frFire) && frFire.coals < 0.02) { g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `${Math.max(14, s * 0.12)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(frFire.logs.length ? 'Cold logs. Strike a match.' : 'The fire is out. Tap the hearth to place a log.', ox, floorY + s * 0.45); }
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
}

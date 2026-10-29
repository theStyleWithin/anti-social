'use strict';
/* Fireplace looks. Each theme paints its own still picture (wall, surround, firebox, hearth) once per size;
   the fire, the logs and the light are painted on top every frame by firescene.js. */
const FR_THEMES = [['cozy', 'Cozy brick'], ['brick', 'Glazed brick arch'], ['cabin', 'Cabin'], ['stone', 'Stone and snow'], ['insert', 'Gas insert'], ['herring', 'Herringbone']];

/* ----- building blocks ----- */
const frC = (c, k) => `rgb(${Math.max(0, Math.min(255, c[0] * k)) | 0},${Math.max(0, Math.min(255, c[1] * k)) | 0},${Math.max(0, Math.min(255, c[2] * k)) | 0})`;
function frBricks(g, x0, y0, x1, y1, bw, bh, base, vary, mortar, seed, gloss, gap = 1.3) {
  const r = frSeed(seed); g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); g.fillStyle = mortar; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let row = 0, y = y0; y < y1; row++, y += bh) for (let x = x0 - ((row % 2) * bw) / 2 - bw * (r() < 0.0 ? 1 : 0); x < x1; x += bw) {
    const v = (r() - 0.5) * vary, k = 1 + v; const bx = x + gap, by = y + gap, ww = bw - gap * 2, hh = bh - gap * 2;
    const gr = g.createLinearGradient(0, by, 0, by + hh); gr.addColorStop(0, frC(base, k * (1 + gloss))); gr.addColorStop(0.5, frC(base, k)); gr.addColorStop(1, frC(base, k * 0.8)); g.fillStyle = gr; g.fillRect(bx, by, ww, hh);
    for (let i = 0; i < 3; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.1)' : 'rgba(255,230,200,.07)'; g.fillRect(bx + r() * ww, by + r() * hh, 1 + r() * 4, 1 + r() * 2); }
  }
  g.restore();
}
function frStones(g, x0, y0, x1, y1, size, seed, tone, gapCol) {
  const r = frSeed(seed); g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); g.fillStyle = gapCol || '#0a0807'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let y = y0 - size * 0.3; y < y1; y += size * 0.62) { let x = x0 - r() * size; while (x < x1) {
    const w = size * (0.7 + r() * 0.9), hh = size * (0.5 + r() * 0.45), cx = x + w / 2, cy = y + hh / 2 + (r() - 0.5) * size * 0.1, t = 0.75 + r() * 0.5, tint = [tone[0] * t + (r() - 0.5) * 14, tone[1] * t + (r() - 0.5) * 12, tone[2] * t + (r() - 0.5) * 12];
    const gr = g.createRadialGradient(cx - w * 0.2, cy - hh * 0.3, 1, cx, cy, Math.max(w, hh) * 0.65); gr.addColorStop(0, frC(tint, 1.25)); gr.addColorStop(0.6, frC(tint, 0.95)); gr.addColorStop(1, frC(tint, 0.5)); g.fillStyle = gr;
    g.beginPath(); const n = 9; for (let i = 0; i < n; i++) { const a = i / n * 6.283, rr = 0.46 + (r() - 0.5) * 0.1; const px = cx + Math.cos(a) * w * rr, py = cy + Math.sin(a) * hh * rr * 1.05; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 6; i++) g.fillRect(cx + (r() - 0.5) * w * 0.7, cy + (r() - 0.5) * hh * 0.7, 1 + r() * 3, 1 + r() * 2);
    x += w * 0.93; } }
  g.restore();
}
function frPlanks(g, x0, y0, x1, y1, pw, base, seed) {
  const r = frSeed(seed); g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  for (let x = x0; x < x1; x += pw) { const k = 0.85 + r() * 0.3, gr = g.createLinearGradient(x, 0, x + pw, 0); gr.addColorStop(0, frC(base, k * 0.9)); gr.addColorStop(0.5, frC(base, k * 1.05)); gr.addColorStop(1, frC(base, k * 0.8)); g.fillStyle = gr; g.fillRect(x, y0, pw, y1 - y0);
    g.strokeStyle = 'rgba(60,30,8,.3)'; g.lineWidth = 0.8; for (let i = 0; i < 7; i++) { const gx = x + 4 + r() * (pw - 8); g.beginPath(); g.moveTo(gx, y0); g.bezierCurveTo(gx + (r() - 0.5) * 8, y0 + (y1 - y0) * 0.33, gx + (r() - 0.5) * 8, y0 + (y1 - y0) * 0.66, gx + (r() - 0.5) * 6, y1); g.stroke(); }
    g.fillStyle = 'rgba(40,20,5,.55)'; g.fillRect(x, y0, 1.6, y1 - y0); }
  g.restore();
}
// the opening of a fireplace: round-topped or square-topped
function frOpening(g, L) { g.beginPath(); g.moveTo(L.openL, L.floorY); g.lineTo(L.openL, L.arch ? L.openTop + L.ry : L.openTop); if (L.arch) g.ellipse(L.ox, L.openTop + L.ry, (L.openR - L.openL) / 2, L.ry, 0, Math.PI, Math.PI * 2); else g.lineTo(L.openR, L.openTop); g.lineTo(L.openR, L.floorY); g.closePath(); }
// the inside of the firebox: a back wall with a brick pattern, side walls running back into the dark, a sooty roof and a floor of ash
function frFirebox(g, L, o) {
  const { s, floorY } = L, l = L.openL, rr = L.openR, ins = o.inset * s, il = l + ins, ir = rr - ins, it = L.openTop + (L.arch ? L.ry * 0.75 : s * 0.1) + (o.roof || 0.12) * s, ib = floorY - s * 0.1, tint = o.tint, r = frSeed(o.seed || 5);
  g.save(); frOpening(g, L); g.clip(); g.fillStyle = '#0a0706'; g.fillRect(l, L.openTop, rr - l, floorY - L.openTop);
  g.fillStyle = frC(tint, 0.35); g.fillRect(il, it, ir - il, ib - it);
  if (o.pattern === 'herring') frHerring(g, il, it, ir, ib, s * 0.07, tint, r); else frBricks(g, il, it, ir, ib, s * (o.bw || 0.2), s * (o.bh || 0.085), tint, 0.5, frC(tint, 0.3), (o.seed || 5) + 1, 0.18, 1.2);
  for (const dir of [-1, 1]) { const x0 = dir < 0 ? l : rr, x1 = dir < 0 ? il : ir; const sg = g.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, `rgba(10,6,4,${o.sideDark || 0.97})`); sg.addColorStop(1, `rgba(${tint[0] * 0.2 | 0},${tint[1] * 0.18 | 0},${tint[2] * 0.16 | 0},.9)`); g.fillStyle = sg; g.beginPath(); g.moveTo(x0, floorY); g.lineTo(x0, L.openTop); g.lineTo(x1, it); g.lineTo(x1, ib); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; for (let i = 1; i < 7; i++) { const t = i / 7; g.beginPath(); g.moveTo(x0, L.openTop + (floorY - L.openTop) * t); g.lineTo(x1, it + (ib - it) * t); g.stroke(); } }
  g.fillStyle = 'rgba(6,4,3,.98)'; g.beginPath(); g.moveTo(l, L.openTop); g.lineTo(rr, L.openTop); g.lineTo(ir, it); g.lineTo(il, it); g.closePath(); g.fill();
  const flo = g.createLinearGradient(0, ib, 0, floorY); flo.addColorStop(0, o.floorA || '#4a423a'); flo.addColorStop(1, o.floorB || '#241d18'); g.fillStyle = flo; g.beginPath(); g.moveTo(il, ib); g.lineTo(ir, ib); g.lineTo(rr, floorY); g.lineTo(l, floorY); g.closePath(); g.fill();
  const soot = g.createLinearGradient(0, it, 0, ib); soot.addColorStop(0, `rgba(0,0,0,${o.soot || 0.85})`); soot.addColorStop(0.55, `rgba(0,0,0,${(o.soot || 0.85) * 0.3})`); soot.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = soot; g.fillRect(il, it, ir - il, ib - it);
  g.restore();
}
function frHerring(g, x0, y0, x1, y1, bh, base, r) {
  const mid = (x0 + x1) / 2; g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); g.fillStyle = frC(base, 0.3); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (const side of [-1, 1]) { g.save(); g.beginPath(); if (side < 0) g.rect(x0, y0, mid - x0, y1 - y0); else g.rect(mid, y0, x1 - mid, y1 - y0); g.clip(); g.translate(mid, y0); g.rotate(side * Math.PI / 4);
    const L2 = Math.hypot(x1 - x0, y1 - y0); const bl = bh * 3.4; for (let row = -L2 / bh; row < L2 / bh; row++) for (let x = -L2 - ((row & 1) * bl) / 2; x < L2; x += bl) { const k = 0.8 + r() * 0.5; g.fillStyle = frC(base, k * 0.9); g.fillRect(x + 1, row * bh + 1, bl - 2, bh - 2); g.fillStyle = 'rgba(255,225,190,.14)'; g.fillRect(x + 1, row * bh + 1, bl - 2, 1.1); }
    g.restore(); }
  g.restore();
}
function frTiles(g, x0, x1, y0, y1, ox, vanishY, rows, base, gap, seed, cols = 7) {
  const r = frSeed(seed); let y = y0; const total = rows * (rows + 1) / 2;
  for (let i = 0; i < rows; i++) { const hh = (y1 - y0) * (i + 1) / total, ya = y, yb = y + hh, ta = (ya - vanishY) / (y1 - vanishY), tb = (yb - vanishY) / (y1 - vanishY), wa = (x1 - x0) * Math.max(0.4, ta), wb = (x1 - x0) * Math.max(0.4, tb);
    for (let c = 0; c < cols; c++) { const k = 0.82 + r() * 0.36, xa0 = ox - wa / 2 + wa * c / cols, xa1 = ox - wa / 2 + wa * (c + 1) / cols, xb0 = ox - wb / 2 + wb * c / cols, xb1 = ox - wb / 2 + wb * (c + 1) / cols;
      const gr = g.createLinearGradient(0, ya, 0, yb); gr.addColorStop(0, frC(base, k * 1.12)); gr.addColorStop(1, frC(base, k * 0.85)); g.fillStyle = gr; g.beginPath(); g.moveTo(xa0 + gap, ya + gap); g.lineTo(xa1 - gap, ya + gap); g.lineTo(xb1 - gap, yb - gap); g.lineTo(xb0 + gap, yb - gap); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,230,200,.1)'; g.fillRect(xa0 + gap, ya + gap, xa1 - xa0 - gap * 2, 1.4); }
    y = yb; }
}
function frPine(g, x, y, h, col, snow, k) { const tiers = 7; for (let i = 0; i < tiers; i++) { const t = i / tiers, w = h * 0.34 * (0.25 + t * 0.85), yy = y - h + h * (0.05 + t * 0.95) * (0.95), th = h / tiers * 1.5; g.fillStyle = col; g.beginPath(); g.moveTo(x, yy - th * 0.9); g.lineTo(x + w, yy + th * 0.3); g.lineTo(x - w, yy + th * 0.3); g.closePath(); g.fill(); g.fillStyle = snow; g.globalAlpha = 0.85 * k; g.beginPath(); g.moveTo(x, yy - th * 0.9); g.lineTo(x + w * 0.8, yy + th * 0.05); g.lineTo(x + w * 0.2, yy - th * 0.1); g.lineTo(x - w * 0.3, yy + th * 0.1); g.lineTo(x - w * 0.8, yy + th * 0.05); g.closePath(); g.fill(); g.globalAlpha = 1; } g.fillStyle = '#3a2a1e'; g.fillRect(x - h * 0.012, y - h * 0.04, h * 0.024, h * 0.05); }

/* ----- cozy brick: the original look, with a mantel, a window, stockings ----- */
function frPaintCozy(g, w, h, L) {
  const { s, ox, floorY, oy, openTop } = L, r = frSeed(11);
  g.fillStyle = '#241915'; g.fillRect(0, 0, w, h); frBricks(g, 0, 0, w, floorY, s * 0.37, s * 0.15, [149, 74, 58], 0.45, '#2a1e18', 11, 0.12, 1.2);
  const bl = ox - s * 1.95, br = ox + s * 1.95; for (const [x, dir] of [[bl, -1], [br, 1]]) { const e = g.createLinearGradient(x - dir * s * 0.02, 0, x + dir * s * 0.28, 0); e.addColorStop(0, 'rgba(0,0,0,.55)'); e.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = e; g.fillRect(dir > 0 ? x - s * 0.3 : x, 0, s * 0.3, floorY); }
  const sootG = g.createRadialGradient(ox, openTop, s * 0.1, ox, openTop - s * 0.2, s * 1.4); sootG.addColorStop(0, 'rgba(0,0,0,.55)'); sootG.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sootG; g.fillRect(ox - s * 1.6, openTop - s * 1.2, s * 3.2, s * 1.5);
  const mY = openTop - s * 0.3, mH = s * 0.2, mx = ox - s * 1.75, mW = s * 3.5;
  const shade = g.createLinearGradient(0, mY + mH, 0, mY + mH + s * 0.3); shade.addColorStop(0, 'rgba(0,0,0,.65)'); shade.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = shade; g.fillRect(mx + s * 0.05, mY + mH, mW - s * 0.1, s * 0.3);
  const wood = g.createLinearGradient(0, mY, 0, mY + mH); wood.addColorStop(0, '#8a5d36'); wood.addColorStop(0.15, '#6b4627'); wood.addColorStop(0.8, '#4a2e18'); wood.addColorStop(1, '#2a180b'); g.fillStyle = wood; g.fillRect(mx, mY, mW, mH);
  g.strokeStyle = 'rgba(30,15,5,.4)'; for (let i = 0; i < 26; i++) { const y = mY + r() * mH; g.lineWidth = 0.5 + r(); g.beginPath(); g.moveTo(mx + r() * mW * 0.2, y); g.bezierCurveTo(mx + mW * 0.3, y + (r() - 0.5) * 3, mx + mW * 0.6, y + (r() - 0.5) * 3, mx + mW * (0.7 + r() * 0.3), y + (r() - 0.5) * 2); g.stroke(); }
  g.fillStyle = 'rgba(255,220,170,.28)'; g.fillRect(mx, mY, mW, 1.6); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(mx, mY + mH - 2, mW, 2);
  if (mY - s * 1.25 > 6) { const pw = s * 1.5, ph = s * 0.9, px = ox - pw / 2, py = mY - s * 1.12; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(px + 4, py + 6, pw, ph); g.fillStyle = '#6b4a1e'; g.fillRect(px - s * 0.05, py - s * 0.05, pw + s * 0.1, ph + s * 0.1); g.fillStyle = '#c79a43'; g.fillRect(px - s * 0.03, py - s * 0.03, pw + s * 0.06, ph + s * 0.06);
    const sky = g.createLinearGradient(0, py, 0, py + ph); sky.addColorStop(0, '#2a3a6a'); sky.addColorStop(0.55, '#e7a35a'); sky.addColorStop(1, '#5a3a3a'); g.fillStyle = sky; g.fillRect(px, py, pw, ph);
    g.fillStyle = '#3a2f4a'; g.beginPath(); g.moveTo(px, py + ph * 0.7); g.bezierCurveTo(px + pw * 0.2, py + ph * 0.45, px + pw * 0.4, py + ph * 0.7, px + pw * 0.6, py + ph * 0.55); g.bezierCurveTo(px + pw * 0.8, py + ph * 0.4, px + pw * 0.9, py + ph * 0.6, px + pw, py + ph * 0.5); g.lineTo(px + pw, py + ph); g.lineTo(px, py + ph); g.fill(); g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(px + pw * 0.75, py + ph * 0.28, ph * 0.08, 0, 6.283); g.fill(); }
  frOpening(g, L); g.lineWidth = s * 0.12; g.strokeStyle = '#3a312c'; g.stroke(); g.lineWidth = s * 0.03; g.strokeStyle = '#6a5d54'; g.stroke();
  frFirebox(g, L, { inset: 0.26, tint: [205, 160, 122], seed: 5, roof: 0.1 });
  const hh = s * 0.16, hy = floorY; const stone = g.createLinearGradient(0, hy, 0, hy + hh); stone.addColorStop(0, '#6f6862'); stone.addColorStop(1, '#3a3532'); g.fillStyle = stone; g.fillRect(ox - s * 1.6, hy, s * 3.2, hh); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(ox - s * 1.6, hy, s * 3.2, 2);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(ox - s * 1.6 + i * s * 0.533, hy); g.lineTo(ox - s * 1.6 + i * s * 0.533, hy + hh); g.stroke(); }
  const fl = g.createLinearGradient(0, hy + hh, 0, h); fl.addColorStop(0, '#2b1c12'); fl.addColorStop(1, '#0e0905'); g.fillStyle = fl; g.fillRect(0, hy + hh, w, h - hy - hh);
  g.strokeStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 9; i++) { const y = hy + hh + (h - hy - hh) * Math.pow(i / 9, 1.5) + 4; g.lineWidth = 1 + i * 0.25; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#2a1e18'; g.fillRect(0, floorY - s * 0.07, w, s * 0.07);
  const ry = hy + hh + (h - hy - hh) * 0.5, rw = s * 1.85, rh = (h - hy - hh) * 0.36; g.fillStyle = '#4a1b22'; g.beginPath(); g.ellipse(ox, ry, rw, rh, 0, 0, 6.283); g.fill(); g.strokeStyle = '#c9a15a'; g.lineWidth = 3; g.beginPath(); g.ellipse(ox, ry, rw * 0.9, rh * 0.82, 0, 0, 6.283); g.stroke();
  if (ox + s * 2.6 < w) { const bx = ox + s * 2.35, by = floorY + s * 0.02; for (let i = 0; i < 4; i++) { g.fillStyle = ['#6b4627', '#58381d', '#7a5230'][i % 3]; g.beginPath(); g.ellipse(bx - s * 0.16 + i * s * 0.1, by - s * 0.4 - (i % 2) * s * 0.05, s * 0.07, s * 0.04, 0, 0, 6.283); g.fill(); g.fillStyle = '#8a6a44'; g.beginPath(); g.arc(bx - s * 0.16 + i * s * 0.1 - s * 0.05, by - s * 0.4 - (i % 2) * s * 0.05, s * 0.032, 0, 6.283); g.fill(); }
    const bk = g.createLinearGradient(0, by - s * 0.45, 0, by); bk.addColorStop(0, '#8a6a3a'); bk.addColorStop(1, '#4a3418'); g.fillStyle = bk; g.beginPath(); g.moveTo(bx - s * 0.32, by - s * 0.42); g.lineTo(bx + s * 0.32, by - s * 0.42); g.lineTo(bx + s * 0.26, by); g.lineTo(bx - s * 0.26, by); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,25,10,.55)'; g.lineWidth = 1.5; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(bx - s * 0.3, by - s * 0.42 + i * s * 0.07); g.lineTo(bx + s * 0.3, by - s * 0.42 + i * s * 0.07); g.stroke(); } }
  if (ox - s * 3.0 - s * 0.5 > 8) { const ww = s * 0.95, wh = s * 1.5, wx = ox - s * 3.0 - ww / 2, wy = floorY - s * 2.5; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 14); g.fillStyle = '#4a2f1d'; g.fillRect(wx - s * 0.08, wy + wh, ww + s * 0.16, s * 0.06); }
}

/* ----- glazed brick with a dark arch and a tiled hearth ----- */
function frPaintBrick(g, w, h, L) {
  const { s, ox, floorY, openTop, openL, openR, ry } = L, cy = openTop + ry;
  g.fillStyle = '#d9caa4'; g.fillRect(0, 0, w, h); frBricks(g, 0, 0, w, floorY, s * 0.62, s * 0.24, [150, 62, 48], 0.4, '#d6c7a2', 31, 0.22, 2.2);
  g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 0, w, floorY);
  // the arch: a ring of wedge-shaped stones with pale mortar between them
  const rxIn = (openR - openL) / 2, N = 15, band = s * 0.34;
  for (let i = 0; i < N; i++) { const a0 = Math.PI + (i / N) * Math.PI, a1 = Math.PI + ((i + 1) / N) * Math.PI, gap = 0.012; const P = (a, k, off) => [ox + Math.cos(a) * (rxIn + k), cy + Math.sin(a) * (ry + k * 0.8) + off];
    const p0 = P(a0 + gap, 0, 0), p1 = P(a1 - gap, 0, 0), p2 = P(a1 - gap, band, 0), p3 = P(a0 + gap, band, 0); const k = 0.85 + ((i * 37) % 10) / 40; g.fillStyle = frC([72, 62, 60], k); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(p3[0], p3[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p2[0] - 1, p2[1] + 3); g.lineTo(p3[0] + 1, p3[1] + 3); g.closePath(); g.fill(); }
  g.strokeStyle = '#a96b32'; g.lineWidth = s * 0.05; g.beginPath(); g.ellipse(ox, cy, rxIn + s * 0.03, ry + s * 0.025, 0, Math.PI, Math.PI * 2); g.stroke();
  frOpening(g, L); g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.5)'; g.stroke();
  frFirebox(g, L, { inset: 0.3, tint: [70, 56, 48], seed: 9, roof: 0.05, soot: 0.95, bw: 0.24, bh: 0.1, floorA: '#6a645c', floorB: '#3a3632' });
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, floorY - 2, w, 4);
  frTiles(g, 0, w * 1.3, floorY, h, ox, floorY - s * 2.2, 5, [166, 78, 52], 2.5, 41, 9);
  // a few logs stacked beside the hearth
  for (let i = 0; i < 3; i++) { const y = floorY - s * 0.18 - i * s * 0.34; g.fillStyle = '#c8b690'; g.beginPath(); g.ellipse(0, y, s * 0.2, s * 0.15, 0, -1.57, 1.57); g.fill(); g.strokeStyle = 'rgba(80,50,20,.5)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(0, y, s * 0.2 * k / 4, s * 0.15 * k / 4, 0, -1.57, 1.57); g.stroke(); } }
}

/* ----- cabin: plank walls, pale brick columns, a steel firebox and a terracotta hearth ----- */
function frPaintCabin(g, w, h, L) {
  const { s, ox, floorY, openTop, openL, openR } = L;
  frPlanks(g, 0, 0, w, floorY, s * 0.6, [196, 142, 78], 61);
  const colW = s * 0.62, top = openTop - s * 0.5;
  for (const [x0, x1] of [[openL - colW, openL], [openR, openR + colW]]) { frBricks(g, x0, top, x1, floorY, s * 0.46, s * 0.21, [204, 176, 132], 0.3, '#5a4a38', 71, 0.15, 1.8); const e = g.createLinearGradient(x0, 0, x1, 0); e.addColorStop(0, 'rgba(0,0,0,.35)'); e.addColorStop(0.15, 'rgba(0,0,0,0)'); e.addColorStop(0.85, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = e; g.fillRect(x0, top, x1 - x0, floorY - top); }
  const lin = g.createLinearGradient(0, top, 0, top + s * 0.55); lin.addColorStop(0, '#3a3a40'); lin.addColorStop(0.5, '#1c1c20'); lin.addColorStop(1, '#101014'); g.fillStyle = lin; g.fillRect(openL - colW, top, openR - openL + colW * 2, s * 0.5 + (openTop - top - s * 0.5 + s * 0.5) * 0); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(openL - colW, top, openR - openL + colW * 2, 2);
  const mH = s * 0.2, mg = g.createLinearGradient(0, top - mH, 0, top); mg.addColorStop(0, '#6a4a2a'); mg.addColorStop(1, '#3a2512'); g.fillStyle = mg; g.fillRect(openL - colW - s * 0.3, top - mH, openR - openL + colW * 2 + s * 0.6, mH); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(openL - colW - s * 0.3, top, openR - openL + colW * 2 + s * 0.6, 4);
  g.fillStyle = '#17171b'; g.fillRect(openL - s * 0.06, openTop - s * 0.06, s * 0.06, floorY - openTop + s * 0.06); g.fillRect(openR, openTop - s * 0.06, s * 0.06, floorY - openTop + s * 0.06); g.fillRect(openL - s * 0.06, openTop - s * 0.06, openR - openL + s * 0.12, s * 0.07);
  frFirebox(g, L, { inset: 0.16, tint: [214, 150, 96], seed: 13, roof: 0.1, soot: 0.8, bw: 0.19, bh: 0.09, sideDark: 0.8 });
  const dk = g.createLinearGradient(0, floorY, 0, h); dk.addColorStop(0, '#3a2412'); dk.addColorStop(1, '#120a05'); g.fillStyle = dk; g.fillRect(0, floorY, w, h - floorY);
  frTiles(g, 0, s * 4.6, floorY + 2, floorY + (h - floorY) * 0.92, ox, floorY - s * 1.6, 3, [190, 98, 64], 3, 81, 7);
}

/* ----- fieldstone chimney in front of a window onto a snowy pine forest ----- */
function frPaintStone(g, w, h, L) {
  const { s, ox, floorY, openTop, openL, openR } = L, r = frSeed(91);
  const sky = g.createLinearGradient(0, 0, 0, floorY); sky.addColorStop(0, '#9db4cf'); sky.addColorStop(0.6, '#d3e0ee'); sky.addColorStop(1, '#eef3f8'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const x = r() * w, hh = h * (0.34 + r() * 0.2); frPine(g, x, floorY - h * 0.08 + r() * 20, hh, '#7d93a8', '#f2f6fa', 0.9); }
  g.fillStyle = 'rgba(210,224,238,.55)'; g.fillRect(0, h * 0.2, w, h * 0.5);
  for (let i = 0; i < 16; i++) { const x = r() * w, hh = h * (0.5 + r() * 0.3); frPine(g, x, floorY + h * 0.02 + r() * 20, hh, '#2f4a46', '#f5f8fb', 1); }
  const snow = g.createLinearGradient(0, floorY - h * 0.1, 0, floorY + h * 0.06); snow.addColorStop(0, '#e6eef6'); snow.addColorStop(1, '#fafcfe'); g.fillStyle = snow; g.beginPath(); g.moveTo(0, floorY - h * 0.03); for (let x = 0; x <= w; x += 60) g.lineTo(x, floorY - h * 0.03 - Math.sin(x * 0.01) * 12); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  // the wooden window frame
  const fw = s * 0.34, wf = g.createLinearGradient(0, 0, fw, 0); wf.addColorStop(0, '#8a5a30'); wf.addColorStop(1, '#5a3418'); g.fillStyle = wf; g.fillRect(0, 0, fw, h); g.fillRect(w - fw, 0, fw, h); g.fillStyle = '#6a4222'; g.fillRect(0, 0, w, s * 0.28); g.fillStyle = '#4a2c14'; g.fillRect(0, floorY - s * 0.06, w, s * 0.1);
  g.strokeStyle = 'rgba(40,20,5,.4)'; g.lineWidth = 1; for (let i = 0; i < 20; i++) { const x = r() * fw; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, h); g.stroke(); }
  // the chimney
  const cw = s * 1.8, top = 0, mantelY = openTop - s * 0.5; frStones(g, ox - cw, top, ox + cw, mantelY, s * 0.34, 101, [112, 96, 86]);
  const sh = g.createLinearGradient(ox - cw, 0, ox + cw, 0); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(0.12, 'rgba(0,0,0,0)'); sh.addColorStop(0.85, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = sh; g.fillRect(ox - cw, top, cw * 2, mantelY - top);
  // the mantel slab with a lantern and candles
  const sm = g.createLinearGradient(0, mantelY, 0, mantelY + s * 0.26); sm.addColorStop(0, '#8c7c6c'); sm.addColorStop(1, '#4a4038'); g.fillStyle = sm; g.fillRect(ox - cw - s * 0.35, mantelY, cw * 2 + s * 0.7, s * 0.26); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(ox - cw - s * 0.35, mantelY, cw * 2 + s * 0.7, 2);
  { const lx = ox - cw - s * 0.05, ly = mantelY; g.fillStyle = '#16120f'; g.fillRect(lx - s * 0.1, ly - s * 0.05, s * 0.2, s * 0.05); g.beginPath(); g.moveTo(lx - s * 0.07, ly - s * 0.05); g.lineTo(lx - s * 0.1, ly - s * 0.32); g.lineTo(lx + s * 0.1, ly - s * 0.32); g.lineTo(lx + s * 0.07, ly - s * 0.05); g.closePath(); g.fill(); g.strokeStyle = '#16120f'; g.lineWidth = 3; g.beginPath(); g.arc(lx, ly - s * 0.32, s * 0.08, Math.PI, 0); g.stroke(); g.fillStyle = 'rgba(255,200,120,.22)'; g.fillRect(lx - s * 0.06, ly - s * 0.28, s * 0.12, s * 0.2);
    for (const dx of [0.5, 0.7]) { g.fillStyle = '#b9a98f'; g.fillRect(ox + cw * 0.2 + s * dx, ly - s * 0.2, s * 0.1, s * 0.2); g.fillStyle = 'rgba(255,190,100,.5)'; g.fillRect(ox + cw * 0.2 + s * dx + 4, ly - s * 0.17, s * 0.1 - 8, s * 0.08); } }
  // firebox surround and a stack of firewood below
  const sideW = s * 0.5; frStones(g, openL - sideW, mantelY + s * 0.26, openL, floorY, s * 0.3, 111, [100, 88, 80]); frStones(g, openR, mantelY + s * 0.26, openR + sideW, floorY, s * 0.3, 112, [100, 88, 80]); frStones(g, openL - sideW, mantelY + s * 0.26, openR + sideW, openTop - s * 0.04, s * 0.3, 113, [100, 88, 80]);
  g.fillStyle = '#16120f'; g.fillRect(openL - s * 0.05, openTop - s * 0.05, openR - openL + s * 0.1, s * 0.05);
  frFirebox(g, L, { inset: 0.1, tint: [150, 110, 86], seed: 17, roof: 0.06, soot: 0.9, bw: 0.18, bh: 0.08, sideDark: 0.85 });
  const baseY = floorY + s * 0.02, baseH = s * 0.82; const bsl = g.createLinearGradient(0, baseY, 0, baseY + s * 0.2); bsl.addColorStop(0, '#8c7c6c'); bsl.addColorStop(1, '#5a4e44'); g.fillStyle = bsl; g.fillRect(ox - cw - s * 0.45, baseY, cw * 2 + s * 0.9, s * 0.2);
  frStones(g, ox - cw - s * 0.3, baseY + s * 0.2, ox - cw + s * 0.3, baseY + baseH, s * 0.3, 121, [100, 88, 80]); frStones(g, ox + cw - s * 0.3, baseY + s * 0.2, ox + cw + s * 0.3, baseY + baseH, s * 0.3, 122, [100, 88, 80]);
  g.fillStyle = '#0d0a08'; g.fillRect(ox - cw + s * 0.3, baseY + s * 0.2, cw * 2 - s * 0.6, baseH - s * 0.2);
  { const lr = frSeed(131), rad = s * 0.11; for (let row = 0; row < 3; row++) for (let i = 0; i < Math.floor((cw * 2 - s * 0.7) / (rad * 2)); i++) { const x = ox - cw + s * 0.35 + rad + i * rad * 2 + (row % 2) * rad, y = baseY + baseH - rad - row * rad * 1.7; if (x > ox + cw - s * 0.35) continue; const k = 0.8 + lr() * 0.4; g.fillStyle = frC([196, 150, 98], k); g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(90,55,20,.55)'; g.lineWidth = 1; for (let q = 1; q < 4; q++) { g.beginPath(); g.arc(x, y, rad * q / 4, 0, 6.283); g.stroke(); } g.strokeStyle = 'rgba(40,20,5,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.stroke(); } }
  const fl = g.createLinearGradient(0, baseY + baseH, 0, h); fl.addColorStop(0, '#2a1c12'); fl.addColorStop(1, '#0c0705'); g.fillStyle = fl; g.fillRect(0, baseY + baseH, w, h - baseY - baseH);
  for (const dir of [-1, 1]) { const x = dir < 0 ? 0 : w, sw = s * 1.3; g.fillStyle = '#17110e'; g.beginPath(); g.moveTo(x, baseY + baseH - s * 0.7); g.quadraticCurveTo(x - dir * sw * 0.7, baseY + baseH - s * 0.75, x - dir * sw, baseY + baseH - s * 0.1); g.lineTo(x - dir * sw, h); g.lineTo(x, h); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(Math.min(x, x - dir * sw) + 4, baseY + baseH - s * 0.5, sw * 0.8, 3); }
}

/* ----- a gas fireplace behind black iron doors and a mesh screen, set in river rock ----- */
function frPaintInsert(g, w, h, L) {
  const { s, ox, floorY, openTop, openL, openR, ry } = L;
  frStones(g, 0, 0, w, h, s * 0.52, 141, [124, 108, 98], '#171210');
  const fw = s * 0.34, T = openTop - fw - s * 0.2, Bt = floorY + s * 0.36, Lf = openL - fw, Rt = openR + fw;
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(Lf - 8, T - 6, Rt - Lf + 22, Bt - T + 18);
  const iron = (x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#1b1b1f'); gr.addColorStop(0.5, '#2c2c32'); gr.addColorStop(1, '#141417'); return gr; };
  g.fillStyle = iron(Lf, Rt); g.beginPath(); g.moveTo(Lf, Bt); g.lineTo(Lf, T + s * 0.5); g.quadraticCurveTo(Lf, T, ox, T - s * 0.06); g.quadraticCurveTo(Rt, T, Rt, T + s * 0.5); g.lineTo(Rt, Bt); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.stroke(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(Lf + 8, Bt - 8); g.lineTo(Lf + 8, T + s * 0.56); g.quadraticCurveTo(Lf + 8, T + 10, ox, T + 4); g.quadraticCurveTo(Rt - 8, T + 10, Rt - 8, T + s * 0.56); g.lineTo(Rt - 8, Bt - 8); g.stroke();
  // lattice band across the top, a raised plate on the crown
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.2; const by = T + s * 0.16; for (let x = Lf + s * 0.3; x < Rt - s * 0.3; x += s * 0.12) { g.beginPath(); g.moveTo(x, by); g.lineTo(x + s * 0.06, by + s * 0.1); g.lineTo(x + s * 0.12, by); g.stroke(); }
  g.fillStyle = '#26262b'; g.fillRect(ox - s * 0.28, T - s * 0.1, s * 0.56, s * 0.16); g.strokeStyle = 'rgba(255,255,255,.14)'; g.strokeRect(ox - s * 0.28, T - s * 0.1, s * 0.56, s * 0.16);
  // the firebox behind glass
  frOpening(g, L); g.lineWidth = 6; g.strokeStyle = '#0b0b0d'; g.stroke();
  frFirebox(g, L, { inset: 0.12, tint: [236, 138, 74], seed: 23, roof: 0.06, soot: 0.4, bw: 0.17, bh: 0.075, sideDark: 0.55, floorA: '#3a2a22', floorB: '#1a110d' });
  // the bottom panel and handles
  const pnl = g.createLinearGradient(0, floorY, 0, Bt); pnl.addColorStop(0, '#26262b'); pnl.addColorStop(1, '#141417'); g.fillStyle = pnl; g.fillRect(Lf + 4, floorY, Rt - Lf - 8, Bt - floorY - 4); g.strokeStyle = 'rgba(255,255,255,.12)'; g.strokeRect(Lf + s * 0.2, floorY + s * 0.08, Rt - Lf - s * 0.4, Bt - floorY - s * 0.22);
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; for (let x = Lf + s * 0.3; x < Rt - s * 0.3; x += s * 0.1) { g.beginPath(); g.moveTo(x, floorY + s * 0.14); g.lineTo(x, Bt - s * 0.18); g.stroke(); }
  for (const dx of [-0.3, 0.3]) { g.fillStyle = '#3a3a42'; g.fillRect(ox + dx * s - s * 0.12, floorY - s * 0.04, s * 0.24, s * 0.03); }
  for (const x of [openL, openR]) for (const yy of [openTop + s * 0.5, floorY - s * 0.3]) { g.fillStyle = '#0c0c0e'; g.fillRect(x - s * 0.04, yy, s * 0.08, s * 0.1); }
  const hearth = g.createLinearGradient(0, Bt, 0, h); hearth.addColorStop(0, '#6a5e54'); hearth.addColorStop(1, '#2a2420'); g.fillStyle = hearth; g.fillRect(0, Bt, w, h - Bt); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, Bt, w, 2);
}
// the screen and the glass go in front of the fire
function frFrontInsert(g, L, light) {
  const { s, ox, floorY, openTop, openL, openR } = L; g.save(); frOpening(g, L); g.clip();
  g.strokeStyle = `rgba(30,12,4,${0.55})`; g.lineWidth = 1; const st = Math.max(3, s * 0.02); for (let x = openL; x < openR; x += st) { g.beginPath(); g.moveTo(x, openTop); g.lineTo(x, floorY); g.stroke(); } for (let y = openTop; y < floorY; y += st) { g.beginPath(); g.moveTo(openL, y); g.lineTo(openR, y); g.stroke(); }
  g.fillStyle = '#0c0c0e'; g.fillRect(ox - s * 0.025, openTop, s * 0.05, floorY - openTop);
  const gl = g.createLinearGradient(openL, openTop, openR, floorY); gl.addColorStop(0, 'rgba(255,255,255,.1)'); gl.addColorStop(0.3, 'rgba(255,255,255,0)'); gl.addColorStop(0.7, 'rgba(255,200,140,.04)'); gl.addColorStop(1, 'rgba(255,255,255,.07)'); g.fillStyle = gl; g.fillRect(openL, openTop, openR - openL, floorY - openTop); void light; g.restore();
}

/* ----- a herringbone firebox with a stainless frame and big rough logs ----- */
function frPaintHerring(g, w, h, L) {
  const { s, ox, floorY, openTop, openL, openR } = L, bw = s * 0.16;
  const steel = g.createLinearGradient(0, 0, 0, h); steel.addColorStop(0, '#9a9ea4'); steel.addColorStop(0.5, '#6c7076'); steel.addColorStop(1, '#4a4d52'); g.fillStyle = steel; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const bt = openTop - s * 0.12, bb = floorY + s * 0.1, lx = openL - bw, rx = openR + bw;
  g.fillStyle = '#1a1a1d'; g.fillRect(lx - 3, bt - 3, rx - lx + 6, bb - bt + 6);
  for (const x of [lx, openR]) { g.fillStyle = '#16161a'; g.fillRect(x, bt, bw, bb - bt); g.fillStyle = '#6a6e74'; for (let y = bt + 6; y < bb - 4; y += 5) for (let i = 0; i < bw / 5; i++) { g.globalAlpha = 0.5; g.fillRect(x + 3 + i * 5 + ((y / 5 | 0) % 2) * 2, y, 2.2, 2.2); } g.globalAlpha = 1; }
  frFirebox(g, L, { inset: 0.36, tint: [186, 120, 70], seed: 29, roof: 0.1, soot: 0.5, pattern: 'herring', sideDark: 0.55, floorA: '#6a6a6e', floorB: '#3a3a3e' });
  const hood = g.createLinearGradient(0, bt, 0, openTop + s * 0.14); hood.addColorStop(0, '#8a8e94'); hood.addColorStop(1, '#3a3d42'); g.fillStyle = hood; g.fillRect(lx, bt, rx - lx, openTop - bt + s * 0.14);
  const tray = g.createLinearGradient(0, floorY - s * 0.02, 0, bb); tray.addColorStop(0, '#9a9ea4'); tray.addColorStop(1, '#3e4146'); g.fillStyle = tray; g.fillRect(lx, floorY - s * 0.02, rx - lx, bb - floorY + s * 0.02);
}

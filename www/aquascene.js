'use strict';
/* Aquarium picture, drawn in code: a planted aquascape with dark stone, white sand, a bright rippling surface and caustics on the floor.
   The still parts (water, rocks, sand) are painted once per size; plants, light, bubbles and fish are painted every frame. */
const aqRnd2 = AquaCore.seeded;
const aqTau = Math.PI * 2;
let aqStaticCv = null, aqStaticKey = '', aqScaleTex = null, aqCaus = null, aqSurf = null, aqPlantsList = null;
const aqMix = (a, b, t) => Viewer.mixRgb(a, b, t), aqRgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`, aqRgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const aqWater = night => night ? [[0, [10, 40, 62]], [0.2, [7, 26, 46]], [0.6, [4, 14, 26]], [1, [2, 6, 12]]] : [[0, [24, 150, 166]], [0.1, [14, 102, 126]], [0.38, [9, 56, 84]], [0.75, [5, 30, 50]], [1, [3, 18, 30]]];
const aqFogColor = night => night ? [6, 20, 38] : [10, 62, 92];

/* ---------- rocks, sand and the far water: painted once ---------- */
function aqRockPath(r, x, y, w, h, seed) {
  const pts = [], n = 40, p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
  for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI, bump = 1 + 0.1 * Math.sin(3 * a + p1) + 0.07 * Math.sin(5 * a + p2) + 0.04 * Math.sin(9 * a + p3) + (r() - 0.5) * 0.025, sq = Math.pow(Math.abs(Math.cos(a)), 0.7) * Math.sign(Math.cos(a)), up = Math.pow(Math.abs(Math.sin(a)), 0.8);
    pts.push([x + sq * w * 0.5 * bump, y - up * h * bump * (0.9 + 0.12 * Math.sin(seed + a * 2))]); }
  return pts;
}
function aqPaintRock(g, r, x, y, w, h, night) {
  const pts = aqRockPath(r, x, y, w, h, x), base = night ? [40, 52, 64] : [78, 96, 108], cx = x - w * 0.05, cy = y - h * 0.45, light = [-0.55, -0.8];
  g.save(); g.beginPath(); g.moveTo(pts[0][0], y + h * 0.2); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(pts[pts.length - 1][0], y + h * 0.2); g.closePath(); g.clip();
  const rg = g.createRadialGradient(x - w * 0.16, y - h * 0.75, h * 0.1, x - w * 0.05, y - h * 0.45, w * 0.75); rg.addColorStop(0, aqRgb(aqMix(base, [220, 235, 245], 0.12))); rg.addColorStop(0.45, aqRgb(base)); rg.addColorStop(1, aqRgb(aqMix(base, [4, 8, 14], 0.86))); g.fillStyle = rg; g.fillRect(x - w, y - h * 1.3, w * 2, h * 1.6);
  for (let k = 0; k < 22; k++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(210,230,240,.045)'; g.beginPath(); g.ellipse(x + (r() - 0.5) * w * 0.9, y - r() * h * 0.95, w * (0.04 + r() * 0.14), h * (0.04 + r() * 0.16), r() * 3, 0, aqTau); g.fill(); }
  g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1.2; for (let k = 0; k < 5; k++) { const yy = y - h * (0.15 + 0.17 * k + r() * 0.05); g.beginPath(); g.moveTo(x - w * 0.5, yy + r() * 8); g.bezierCurveTo(x - w * 0.2, yy - 10 + r() * 20, x + w * 0.2, yy - 10 + r() * 20, x + w * 0.5, yy + r() * 8); g.stroke(); }
  for (let k = 0; k < 9; k++) { const x0 = x + (r() - 0.5) * w * 0.8, y0 = y - r() * h * 0.9, x1 = x0 + (r() - 0.5) * w * 0.4, y1 = y0 + (r() - 0.3) * h * 0.4; g.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,.28)' : 'rgba(210,235,245,.12)'; g.lineWidth = 0.8 + r() * 1.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo((x0 + x1) / 2 + (r() - 0.5) * 8, (y0 + y1) / 2 + (r() - 0.5) * 8); g.lineTo(x1, y1); g.stroke(); }
  for (let k = 0; k < 420; k++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.14)' : 'rgba(220,240,250,.10)'; g.fillRect(x + (r() - 0.5) * w, y - r() * h, 1 + r() * 2, 1 + r() * 2); }
  const sheen = g.createLinearGradient(0, y - h, 0, y); sheen.addColorStop(0, 'rgba(190,225,240,.22)'); sheen.addColorStop(0.35, 'rgba(190,225,240,0)'); g.fillStyle = sheen; g.fillRect(x - w, y - h * 1.3, w * 2, h * 1.5);
  const algae = g.createLinearGradient(0, y - h * 0.5, 0, y + h * 0.1); algae.addColorStop(0, 'rgba(50,110,60,0)'); algae.addColorStop(1, `rgba(40,100,50,${night ? 0.25 : 0.38})`); g.fillStyle = algae; g.fillRect(x - w, y - h * 1.3, w * 2, h * 1.5);
  g.restore();
  g.strokeStyle = 'rgba(200,235,250,.2)'; g.lineWidth = 1.4; g.beginPath(); for (let i = 1; i < pts.length - 2; i++) { const p = pts[i]; i === 1 ? g.moveTo(p[0], p[1] + 1) : g.lineTo(p[0], p[1] + 1); } g.stroke();
}
function aqPaintStatic(c, w, h, night) {
  const g = c.getContext('2d'), H = aqH, floor = AquaCore.floorOf(H), W = AquaCore.W, r = aqRnd2(3);
  const wat = g.createLinearGradient(0, 0, 0, H); aqWater(night).forEach(([o, col]) => wat.addColorStop(o, aqRgb(col))); g.fillStyle = wat; g.fillRect(0, 0, W, H);
  // far away: faint stones and plant shapes that vanish into the blue
  const fog = aqFogColor(night); g.globalAlpha = night ? 0.4 : 0.5;
  for (const [x, y, ww, hh] of [[170, floor - 30, 160, 90], [470, floor - 20, 190, 120], [800, floor - 25, 200, 110]]) { g.fillStyle = aqRgba(aqMix(fog, [0, 10, 18], 0.5), 0.8); g.beginPath(); g.ellipse(x, y, ww / 2, hh, 0, Math.PI, 0); g.fill(); }
  for (let i = 0; i < 26; i++) { const x = r() * W, hh = 90 + r() * 140, gr = g.createLinearGradient(0, floor, 0, floor - hh); gr.addColorStop(0, aqRgba(aqMix(fog, [30, 110, 90], 0.35), 0.0)); gr.addColorStop(0.5, aqRgba(aqMix(fog, [30, 120, 90], 0.4), 0.5)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 7, floor); g.quadraticCurveTo(x + (r() - 0.5) * 30, floor - hh * 0.6, x + (r() - 0.5) * 20, floor - hh); g.quadraticCurveTo(x + 8, floor - hh * 0.5, x + 7, floor); g.fill(); }
  g.globalAlpha = 1;
  // rocks
  if (aqCfg.decor) for (const [x, w2, hh] of [[75, 210, 170], [245, 150, 105], [430, 100, 62], [585, 280, 200], [745, 170, 105], [910, 240, 165]]) { g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x + 12, floor + 14, w2 * 0.56, 12, 0, 0, aqTau); g.fill(); aqPaintRock(g, r, x, floor + 12, w2, hh, night); }
  // sand: pale, banked a little, with a dark edge at the front
  const sand = g.createLinearGradient(0, floor - 14, 0, H); sand.addColorStop(0, night ? '#4a4a52' : '#f0e6cc'); sand.addColorStop(0.5, night ? '#2e2e36' : '#cdbd96'); sand.addColorStop(1, night ? '#16161c' : '#a99a72'); g.fillStyle = sand;
  g.beginPath(); g.moveTo(0, H); g.lineTo(0, floor - 6); for (let x = 0; x <= W; x += 20) g.lineTo(x, floor + 6 - 8 * Math.sin(x * 0.006 + 0.8) - 5 * Math.sin(x * 0.017) - (x < 90 || x > W - 90 ? 8 : 0)); g.lineTo(W, H); g.closePath(); g.fill();
  g.save(); g.clip(); for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,250,235,.28)' : 'rgba(80,60,30,.18)'; g.fillRect(r() * W, floor - 10 + r() * (H - floor + 10), 1 + r() * 1.6, 1 + r() * 1.2); }
  g.strokeStyle = 'rgba(80,60,30,.12)'; g.lineWidth = 1.2; for (let k = 0; k < 8; k++) { const y = floor + 6 + k * (H - floor) / 8; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * 0.03 + k * 2) * 3); g.stroke(); }
  const rim = g.createLinearGradient(0, H - 16, 0, H); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = rim; g.fillRect(0, H - 16, W, 16); g.restore();
}

/* ---------- plants ---------- */
function aqBuildPlants() {
  const r = aqRnd2(19), list = [], floor0 = 0;
  const grass = [[150, 0, 22, 120], [335, 0, 20, 90], [500, 0, 22, 110], [670, 0, 20, 100], [830, 0, 22, 120], [980, 0, 18, 110]];
  grass.forEach(([x, , n, hh], i) => list.push({ kind: 'grass', x, n, hh, layer: 0, hue: i % 2, seed: r() * 100 }));
  [[245, 130], [640, 150], [790, 110]].forEach(([x, hh]) => list.push({ kind: 'stem', x, n: 3 + (r() * 2 | 0), hh, layer: 0, seed: r() * 100 }));
  [[330, 0], [800, 0], [150, 0]].forEach(([x]) => list.push({ kind: 'broad', x, n: 6, hh: 70, layer: 0, seed: r() * 100 }));
  [[10, 30, 110], [985, 30, 100], [440, 14, 50], [740, 14, 45]].forEach(([x, n, hh]) => list.push({ kind: 'grass', x, n, hh, layer: 1, hue: 1, seed: r() * 100 }));
  return list;
}
function aqDrawPlants(g, t, layer, night) {
  if (!aqCfg.decor) return; if (!aqPlantsList) aqPlantsList = aqBuildPlants(); const floor = AquaCore.floorOf(aqH) + 8, fog = aqFogColor(night);
  for (const p of aqPlantsList) {
    if (p.layer !== layer) continue; const r = aqRnd2(Math.floor(p.seed * 1000)), far = layer === 0 ? 0.25 : 0, flow = Math.sin(t * 0.35 + p.seed) * 0.5;
    if (p.kind === 'grass') {
      for (let i = 0; i < p.n; i++) {
        const x0 = p.x + (r() - 0.5) * 70, hgt = p.hh * (0.45 + r() * 0.75), wb = 2.6 + r() * 3.4 * (layer ? 1.4 : 1), ph = r() * 6.28, bend = (r() - 0.5) * 0.35;
        const sway = (Math.sin(t * 0.9 + ph + x0 * 0.012) * 0.55 + flow + Math.sin(t * 1.7 + ph) * 0.15) * hgt * 0.16, tipx = x0 + bend * hgt + sway, tipy = floor - hgt;
        let col = p.hue ? [58 + r() * 40, 150 + r() * 40, 60 + r() * 30] : [88 + r() * 40, 168 + r() * 30, 70 + r() * 30]; if (night) col = aqMix(col, [10, 30, 40], 0.65); if (layer === 0) col = aqMix(col, fog, far + 0.12); else col = aqMix(col, [8, 40, 30], 0.35);
        g.fillStyle = aqRgb(col); g.beginPath(); g.moveTo(x0 - wb / 2, floor); g.quadraticCurveTo(x0 + bend * hgt * 0.4 + sway * 0.3 - wb * 0.3, floor - hgt * 0.55, tipx, tipy); g.quadraticCurveTo(x0 + bend * hgt * 0.4 + sway * 0.3 + wb * 0.5, floor - hgt * 0.5, x0 + wb / 2, floor); g.closePath(); g.fill();
        g.strokeStyle = aqRgba(aqMix(col, [210, 255, 200], night ? 0.15 : 0.35), 0.35); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0, floor); g.quadraticCurveTo(x0 + bend * hgt * 0.4 + sway * 0.3, floor - hgt * 0.55, tipx, tipy); g.stroke();
      }
    } else if (p.kind === 'stem') {
      for (let i = 0; i < p.n; i++) {
        const x0 = p.x + (i - p.n / 2) * 9 + (r() - 0.5) * 6, hgt = p.hh * (0.7 + r() * 0.5), ph = r() * 6.28, cols = [[200, 50, 50], [225, 80, 70], [180, 40, 70]], base = cols[(r() * 3) | 0];
        const pts = []; for (let s = 0; s <= 12; s++) { const u = s / 12, sw = Math.sin(t * 0.8 + ph + u * 2.4) * 10 * u * u + flow * 8 * u; pts.push([x0 + sw + (r() - 0.5) * 0.4, floor - hgt * u]); }
        g.strokeStyle = aqRgb(aqMix(night ? aqMix(base, [10, 20, 30], 0.6) : base, fog, 0.18)); g.lineWidth = 2.2; g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
        for (let s = 2; s <= 12; s++) { const q = pts[s], ln = 16 * (1.1 - s / 14); for (const side of [-1, 1]) { g.fillStyle = aqRgb(aqMix(night ? aqMix(base, [10, 20, 30], 0.6) : [base[0] + 20, base[1] + 15, base[2] + 10], fog, 0.15)); g.beginPath(); g.ellipse(q[0] + side * ln * 0.5, q[1] - 2, ln * 0.5, 3.4, side * 0.5 + Math.sin(t + s) * 0.08, 0, aqTau); g.fill(); } }
      }
    } else {
      for (let i = 0; i < p.n; i++) { const a = -Math.PI / 2 + (i - (p.n - 1) / 2) * 0.42 + Math.sin(t * 0.6 + i + p.seed) * 0.04, len = p.hh * (0.7 + 0.3 * ((i * 37) % 10) / 10), x0 = p.x, y0 = floor, tx = x0 + Math.cos(a) * len, ty = y0 + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a), wd = len * 0.2;
        const lg = g.createLinearGradient(x0, y0, tx, ty); const c0 = night ? [14, 44, 40] : [30, 90, 50], c1 = night ? [24, 70, 56] : [76, 160, 80]; lg.addColorStop(0, aqRgb(c0)); lg.addColorStop(1, aqRgb(c1)); g.fillStyle = lg; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + tx) / 2 + nx * wd * 1.4, (y0 + ty) / 2 + ny * wd * 1.4, tx, ty); g.quadraticCurveTo((x0 + tx) / 2 - nx * wd * 1.4, (y0 + ty) / 2 - ny * wd * 1.4, x0, y0); g.fill(); g.strokeStyle = 'rgba(210,255,200,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(tx, ty); g.stroke(); }
    }
  }
}

/* ---------- light ---------- */
function aqCaustics(t) {
  if (!aqCaus) { aqCaus = document.createElement('canvas'); aqCaus.width = 128; aqCaus.height = 48; }
  const g = aqCaus.getContext('2d'), img = g.createImageData(128, 48), d = img.data;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 128; x++) { const u = x / 128 * 14, v = y / 48 * 5; let c = 0; for (let k = 1; k <= 3; k++) c += 1 - Math.abs(Math.sin(u * k * 0.9 + Math.sin(v * k * 1.3 + t * 0.7 * k) * 1.6 + t * 0.35 * k)); c = Math.pow(c / 3, 5) * 2.4; const a = Math.min(1, c), o = (y * 128 + x) * 4; d[o] = 255; d[o + 1] = 255; d[o + 2] = 235; d[o + 3] = 255 * a; }
  g.putImageData(img, 0, 0); return aqCaus;
}
function aqSurfaceLight(g, t, night) {
  const W = AquaCore.W, H = aqH, depth = H * 0.2;
  const sh = g.createLinearGradient(0, 0, 0, depth); sh.addColorStop(0, night ? 'rgba(90,150,210,.55)' : 'rgba(120,235,230,.85)'); sh.addColorStop(0.35, night ? 'rgba(50,100,160,.25)' : 'rgba(60,190,200,.4)'); sh.addColorStop(1, 'rgba(20,100,130,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, depth);
  g.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 9; j++) { const y0 = 4 + j * depth / 9, a = (night ? 0.07 : 0.16) * (1 - j / 10); g.strokeStyle = `rgba(210,255,255,${a})`; g.lineWidth = 1.5 + (j % 3) * 2; g.beginPath(); for (let x = 0; x <= W; x += 14) { const y = y0 + Math.sin(x * 0.02 + t * (0.8 + j * 0.1) + j) * 6 + Math.sin(x * 0.047 - t * 1.1 + j * 2) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  for (let i = 0; i < 7; i++) { const x = (i * 163 + Math.sin(t * 0.3 + i) * 40) % W, rr = 40 + (i % 3) * 30, gg = g.createRadialGradient(x, 6, 0, x, 6, rr); gg.addColorStop(0, `rgba(230,255,255,${night ? 0.1 : 0.28})`); gg.addColorStop(1, 'rgba(230,255,255,0)'); g.fillStyle = gg; g.fillRect(x - rr, 0, rr * 2, rr); }
  // soft shafts that reach down and fade
  for (let i = 0; i < 7; i++) { const x = 60 + i * 150 + Math.sin(t * 0.22 + i * 1.9) * 45, wd = 26 + (i % 3) * 14, a = (night ? 0.035 : 0.075) * (0.6 + 0.4 * Math.sin(t * 0.4 + i)); const gr = g.createLinearGradient(0, 0, 0, AquaCore.floorOf(H)); gr.addColorStop(0, `rgba(210,255,250,${a})`); gr.addColorStop(1, 'rgba(210,255,250,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - wd, 0); g.lineTo(x + wd, 0); g.lineTo(x + wd + 150 + Math.sin(t * 0.3 + i) * 25, AquaCore.floorOf(H)); g.lineTo(x - wd + 100, AquaCore.floorOf(H)); g.closePath(); g.fill(); }
  g.globalCompositeOperation = 'source-over';
}

/* ---------- fish ---------- */
function aqScalePattern(g) {
  if (!aqScaleTex) { const c = document.createElement('canvas'); c.width = 10; c.height = 8; const s = c.getContext('2d'); s.strokeStyle = 'rgba(0,0,0,.5)'; s.lineWidth = 0.8; for (const [x, y] of [[0, 0], [10, 0], [5, 4], [0, 8], [10, 8]]) { s.beginPath(); s.arc(x, y, 5, 0.3, Math.PI - 0.3); s.stroke(); } aqScaleTex = g.createPattern(c, 'repeat'); }
  return aqScaleTex;
}
// the body of a fish as a bending spine with a width at each point; nose at +x
function aqSpineBody(L, hRatio, f, amp, prof, lenFrac, topS, botS) {
  const n = 20, Lb = L * lenFrac, H = L * hRatio * 0.5, pts = [], ph = f.phase;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push({ t, x: Lb * (0.5 - t), y: Math.sin(ph * 2.2 - t * 4.6) * amp * L * (0.1 + t * t * 1.1), w: H * prof(t) }); }
  for (let i = 0; i <= n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], tx = b.x - a.x, ty = b.y - a.y, ln = Math.hypot(tx, ty) || 1, p = pts[i]; p.ux = -ty / ln; p.uy = tx / ln; p.ang = Math.atan2(ty, tx); p.top = [p.x + p.ux * p.w * topS, p.y + p.uy * p.w * topS]; p.bot = [p.x - p.ux * p.w * botS, p.y - p.uy * p.w * botS]; }
  return pts;
}
const aqBodyPath = (g, pts) => { g.beginPath(); g.moveTo(pts[0].top[0], pts[0].top[1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].top[0], pts[i].top[1]); for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].bot[0], pts[i].bot[1]); g.closePath(); };
function aqFinRays(g, a, b, tip, n, color, alpha) { g.strokeStyle = color; g.globalAlpha = alpha; g.lineWidth = 0.7; for (let k = 0; k <= n; k++) { const u = k / n, bx = a[0] + (b[0] - a[0]) * u, by = a[1] + (b[1] - a[1]) * u, ex = tip[0] + (b[0] - a[0]) * (u - 0.5) * 0.9, ey = tip[1] + (b[1] - a[1]) * (u - 0.5) * 0.9; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (ex - bx) * 0.97, by + (ey - by) * 0.97); g.stroke(); } g.globalAlpha = 1; }
function aqFin(g, a, b, tip, bow, color, alpha) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, c1 = [(a[0] + tip[0]) / 2 + bow[0], (a[1] + tip[1]) / 2 + bow[1]], c2 = [(b[0] + tip[0]) / 2 + bow[0], (b[1] + tip[1]) / 2 + bow[1]];
  const gr = g.createLinearGradient(mx, my, tip[0], tip[1]); gr.addColorStop(0, color); gr.addColorStop(1, color); g.globalAlpha = alpha; g.fillStyle = gr; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]); g.quadraticCurveTo(c2[0], c2[1], b[0], b[1]); g.closePath(); g.fill(); g.globalAlpha = 1; aqFinRays(g, a, b, tip, 6, 'rgba(0,0,0,.35)', 0.5);
}
function aqEye(g, x, y, r, iris) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x, y, r * 1.18, 0, aqTau); g.fill(); g.fillStyle = '#f2f2ee'; g.beginPath(); g.arc(x, y, r, 0, aqTau); g.fill(); g.fillStyle = iris || '#c9a227'; g.beginPath(); g.arc(x + r * 0.1, y, r * 0.72, 0, aqTau); g.fill(); g.fillStyle = '#050505'; g.beginPath(); g.arc(x + r * 0.15, y, r * 0.42, 0, aqTau); g.fill(); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(x - r * 0.12, y - r * 0.3, r * 0.2, 0, aqTau); g.fill(); }
function aqDrawFishBody(g, f, sp) {
  const k = sp.look, L = sp.size, shark = sp.kind === 'shark', hRatio = shark ? 0.31 : k.h;
  const prof = shark ? (t => { const base = Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, t), 0.5)), 0.85); return base * (1 - 0.62 * t) * 0.95 + 0.06 * t; }) : k.pattern === 'neon' ? (t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.75) * (1 - 0.35 * t) * 0.9 + 0.1 * t * t) : (t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.8) * (1 - 0.3 * t) * 0.92 + 0.1 * t * t);
  const amp = shark ? 0.05 : 0.04 + 0.01 * Math.min(2, Math.abs(f.vx || 0) / (sp.speed + 1)), pts = aqSpineBody(L, hRatio, f, amp, prof, shark ? 0.78 : 0.82, 1, shark ? 0.8 : 1.12), n = pts.length - 1, at = i => pts[Math.max(0, Math.min(n, i))];
  const dark = (c, m) => aqRgb(aqMix(Viewer.hexRgb(c), [0, 0, 0], m)), fin = Viewer.hexRgb(k.fin), finCss = aqRgb(fin), root = at(n), tr = pts[n], H = L * hRatio * 0.5;
  // tail
  g.save(); g.translate(root.x, root.y); g.rotate(root.ang + Math.sin(f.phase * 2.2 - 4.6 - 0.5) * 0.28); g.scale(1, 1);
  { const T = shark ? L * 0.22 : L * 0.24, hh = shark ? L * 0.2 : Math.max(H * 1.1, L * 0.14); g.beginPath();
    if (shark) { g.moveTo(0, 0); g.bezierCurveTo(T * 0.5, -hh * 0.4, T * 1.2, -hh * 1.1, T * 1.55, -hh * 1.45); g.bezierCurveTo(T * 1.2, -hh * 0.5, T * 0.95, -hh * 0.1, T * 1.0, hh * 0.05); g.bezierCurveTo(T * 1.1, hh * 0.35, T * 0.95, hh * 0.7, T * 0.85, hh * 0.78); g.bezierCurveTo(T * 0.5, hh * 0.35, T * 0.2, hh * 0.1, 0, 0); }
    else if (k.tail === 'fork') { g.moveTo(0, 0); g.quadraticCurveTo(T * 0.5, -hh * 0.9, T * 1.3, -hh * 1.1); g.quadraticCurveTo(T * 0.9, -hh * 0.1, T * 0.8, 0); g.quadraticCurveTo(T * 0.9, hh * 0.1, T * 1.3, hh * 1.1); g.quadraticCurveTo(T * 0.5, hh * 0.9, 0, 0); }
    else if (k.tail === 'round') { g.moveTo(0, 0); g.bezierCurveTo(T * 0.3, -hh * 0.9, T * 1.1, -hh * 0.8, T * 1.1, 0); g.bezierCurveTo(T * 1.1, hh * 0.8, T * 0.3, hh * 0.9, 0, 0); }
    else if (k.tail === 'flow') { g.moveTo(0, 0); g.bezierCurveTo(T * 0.5, -hh * 2.2, T * 1.6, -hh * 1.6 + Math.sin(f.phase * 3) * 5, T * 2.1, -hh * 0.2); g.bezierCurveTo(T * 1.7, hh * 0.9 + Math.sin(f.phase * 3 + 1) * 5, T * 0.7, hh * 2.0, 0, 0); }
    else { g.moveTo(0, 0); g.bezierCurveTo(T * 0.4, -hh * 1.4, T * 1.3, -hh * 1.3, T * 1.35, -hh * 0.2); g.quadraticCurveTo(T * 1.15, 0, T * 1.35, hh * 0.2); g.bezierCurveTo(T * 1.3, hh * 1.3, T * 0.4, hh * 1.4, 0, 0); }
    const tg = g.createLinearGradient(0, 0, T * 1.5, 0); tg.addColorStop(0, finCss); tg.addColorStop(1, aqRgba(fin, 0.55)); g.globalAlpha = 0.92; g.fillStyle = tg; g.fill(); g.globalAlpha = 0.5; g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.7; g.save(); g.clip(); for (let r = -7; r <= 7; r++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(T * 1.8, r * hh * 0.18); g.stroke(); } g.restore(); g.globalAlpha = 1;
    if (k.pattern === 'tang' && !shark) { g.fillStyle = '#ffd42a'; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; } }
  g.restore();
  // dorsal, anal and pectoral fins
  const dTop = shark ? 0.34 : 0.52, dA = at(Math.round(n * (shark ? 0.3 : 0.28))), dB = at(Math.round(n * (shark ? 0.5 : 0.66))), dh = shark ? L * 0.19 : (k.tall ? H * 1.45 : H * 0.95);
  aqFin(g, dA.top, dB.top, [dA.top[0] - (shark ? L * 0.1 : L * 0.1) + Math.sin(f.phase * 2) * 2, dA.top[1] - dh * (shark ? 1 : 1) + dA.uy * 0], [-1, -2].map(v => v * 0), finCss, 0.9); void dTop;
  if (shark) { const s2a = at(Math.round(n * 0.72)), s2b = at(Math.round(n * 0.8)); aqFin(g, s2a.top, s2b.top, [s2b.top[0] - L * 0.02, s2b.top[1] - L * 0.045], [0, 0], finCss, 0.9); }
  const aA = at(Math.round(n * (shark ? 0.72 : 0.6))), aB = at(Math.round(n * (shark ? 0.8 : 0.76))); aqFin(g, aA.bot, aB.bot, [aB.bot[0] - L * 0.03, aB.bot[1] + (shark ? L * 0.05 : (k.tall ? H * 1.1 : H * 0.55))], [0, 0], finCss, 0.9);
  // the body itself: darker on the back, paler underneath, with scale texture and a soft sheen
  const body = Viewer.hexRgb(k.body), belly = Viewer.hexRgb(k.belly || k.body);
  g.save(); aqBodyPath(g, pts); const bg = g.createLinearGradient(0, -H, 0, H);
  if (shark) { bg.addColorStop(0, aqRgb(aqMix(body, [10, 14, 20], 0.35))); bg.addColorStop(0.5, aqRgb(body)); bg.addColorStop(0.64, aqRgb(aqMix(body, belly, 0.7))); bg.addColorStop(1, aqRgb(belly)); } else { bg.addColorStop(0, aqRgb(aqMix(body, [0, 0, 0], 0.4))); bg.addColorStop(0.35, aqRgb(body)); bg.addColorStop(0.8, aqRgb(aqMix(body, belly, 0.7))); bg.addColorStop(1, aqRgb(belly)); }
  g.fillStyle = bg; g.fill(); g.clip();
  // markings follow the bending spine
  const strip = (t0, t1, o0, o1, col, a) => { g.fillStyle = col; g.globalAlpha = a; g.beginPath(); for (let i = Math.round(t0 * n); i <= Math.round(t1 * n); i++) { const p = at(i), o = o1; g.lineTo(p.x + p.ux * p.w * o, p.y + p.uy * p.w * o); } for (let i = Math.round(t1 * n); i >= Math.round(t0 * n); i--) { const p = at(i); g.lineTo(p.x + p.ux * p.w * o0, p.y + p.uy * p.w * o0); } g.closePath(); g.fill(); g.globalAlpha = 1; };
  if (k.pattern === 'bands') { for (const [a, b] of [[0.18, 0.3], [0.5, 0.62], [0.82, 0.9]]) { strip(a - 0.02, b + 0.02, -3, 3, '#14100c', 1); strip(a, b, -3, 3, k.accent, 1); } }
  else if (k.pattern === 'tang') { g.fillStyle = k.accent; g.globalAlpha = 0.95; g.beginPath(); for (let i = 3; i <= n; i++) { const p = at(i); g.lineTo(p.x + p.ux * p.w * (0.75 - 0.5 * i / n), p.y + p.uy * p.w * (0.75 - 0.5 * i / n)); } for (let i = n; i >= 3; i--) { const p = at(i); g.lineTo(p.x + p.ux * p.w * (0.1 - 0.2 * i / n), p.y + p.uy * p.w * (0.1 - 0.2 * i / n)); } g.fill(); g.globalAlpha = 1; }
  else if (k.pattern === 'bars') { for (const [a, b] of [[0.12, 0.2], [0.34, 0.46], [0.6, 0.7]]) strip(a, b, -2, 2, k.accent, 0.78); }
  else if (k.pattern === 'neon') { strip(0.08, 0.98, 0.0, 0.34, k.accent, 0.95); strip(0.3, 1, -0.9, -0.1, k.accent2, 0.9); }
  g.fillStyle = aqScalePattern(g); g.globalAlpha = 0.16; g.fillRect(-L, -L, L * 2, L * 2); g.globalAlpha = 1;
  const sg = g.createLinearGradient(0, -H, 0, H * 0.2); sg.addColorStop(0, 'rgba(255,255,255,.42)'); sg.addColorStop(0.5, 'rgba(255,255,255,.06)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.beginPath(); for (let i = 1; i < n - 2; i++) { const p = at(i); g.lineTo(p.x + p.ux * p.w * 0.88, p.y + p.uy * p.w * 0.88); } for (let i = n - 3; i >= 1; i--) { const p = at(i); g.lineTo(p.x + p.ux * p.w * 0.35, p.y + p.uy * p.w * 0.35); } g.fill();
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 0.8; g.setLineDash([2, 3]); g.beginPath(); for (let i = 3; i < n - 1; i++) { const p = at(i); g.lineTo(p.x + p.ux * p.w * 0.12, p.y + p.uy * p.w * 0.12); } g.stroke(); g.setLineDash([]);
  g.restore(); aqBodyPath(g, pts); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.9; g.stroke();
  // head: gill cover, mouth, eye
  const hd = at(Math.round(n * (shark ? 0.22 : 0.2)));
  if (shark) { g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.3; for (let i = 0; i < 5; i++) { const p = at(Math.round(n * (0.22 + i * 0.03))); g.beginPath(); g.moveTo(p.x + p.ux * p.w * 0.45, p.y + p.uy * p.w * 0.45); g.quadraticCurveTo(p.x + 2, p.y, p.x + p.ux * p.w * -0.15 - 2, p.y + p.uy * p.w * -0.15); g.stroke(); } const nz = at(1), m1 = at(2); g.strokeStyle = 'rgba(10,10,10,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(nz.bot[0] + 3, nz.bot[1] + 1); g.quadraticCurveTo(m1.bot[0] - L * 0.04, m1.bot[1] + 3, m1.bot[0] - L * 0.12, m1.bot[1] - 1); g.stroke(); }
  else { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(hd.top[0] + 1, hd.top[1] + 3); g.quadraticCurveTo(hd.x - L * 0.03, hd.y, hd.bot[0] + 1, hd.bot[1] - 3); g.stroke(); const m0 = at(0); g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(m0.x, m0.y + H * 0.08); g.lineTo(m0.x - L * 0.05, m0.y + H * 0.14); g.stroke(); }
  const ep = at(Math.round(n * (shark ? 0.1 : 0.12))); const eyeR = shark ? L * 0.014 : Math.max(2.4, L * 0.05);
  if (shark && k.hammer) { g.fillStyle = aqRgb(aqMix(body, [10, 14, 20], 0.15)); const hx = at(0).x; g.beginPath(); g.moveTo(hx - L * 0.08, -L * 0.03); g.quadraticCurveTo(hx + L * 0.02, -L * 0.2, hx + L * 0.03, -L * 0.2); g.lineTo(hx + L * 0.08, -L * 0.19); g.lineTo(hx + L * 0.08, L * 0.19); g.lineTo(hx + L * 0.03, L * 0.2); g.quadraticCurveTo(hx + L * 0.02, L * 0.2, hx - L * 0.08, L * 0.05); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); for (const y of [-L * 0.185, L * 0.185]) aqEye(g, hx + L * 0.05, y, L * 0.016, '#3a2a10'); }
  else aqEye(g, ep.x + ep.ux * ep.w * 0.18 + L * 0.015, ep.y + ep.uy * ep.w * 0.18, eyeR, shark ? '#202020' : k.pattern === 'neon' ? '#7a7a7a' : '#c9a227');
  // pectoral fin, fanning
  const pc = at(Math.round(n * (shark ? 0.3 : 0.27))), fl = Math.sin(f.phase * 3.2) * 0.35, pl = shark ? L * 0.2 : Math.max(L * 0.1, H * 0.7), a = Math.PI * (shark ? 0.62 : 0.78) + fl, bx = pc.x + pc.ux * -pc.w * 0.3, by = pc.y + pc.uy * -pc.w * 0.3;
  const pbw = shark ? L * 0.055 : 3; aqFin(g, [bx + pbw, by - 2], [bx - pbw, by + 2], [bx + Math.cos(a) * pl, by + Math.sin(a) * pl * (shark ? 1 : 0.7) + (shark ? pl * 0.3 : 0)], [0, 0], finCss, shark ? 0.95 : 0.8);
}
function aqDrawCreature(g, f, sp, night, t) {
  const L = sp.size, k = sp.look, ph = f.phase, grad = (y0, y1, c0, c1, mid) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); if (mid) gr.addColorStop(0.5, mid); gr.addColorStop(1, c1); return gr; };
  g.lineJoin = 'round'; g.lineCap = 'round'; void t;
  if (sp.kind === 'fish' || sp.kind === 'shark') aqDrawFishBody(g, f, sp);
  else if (sp.kind === 'puffer') {
    const inf = f.puff > 0 ? Math.min(1, f.puff) : 0, R = L * 0.36 * (1 + inf * 0.4), wag = Math.sin(ph * 2.2) * 0.2;
    g.save(); g.translate(-R * 0.95, 0); g.rotate(wag); aqFin(g, [0, -3], [0, 3], [-L * 0.2, 0], [0, -L * 0.1], aqRgb(Viewer.hexRgb(k.fin)), 0.9); g.restore();
    g.save(); g.beginPath(); g.ellipse(0, 0, R * 1.08, R, 0, 0, aqTau); const bg = g.createLinearGradient(0, -R, 0, R); bg.addColorStop(0, aqRgb(aqMix(Viewer.hexRgb(k.body), [60, 40, 0], 0.35))); bg.addColorStop(0.55, k.body); bg.addColorStop(0.75, k.belly); bg.addColorStop(1, '#ffffff'); g.fillStyle = bg; g.fill(); g.clip();
    g.fillStyle = aqScalePattern(g); g.globalAlpha = 0.1; g.fillRect(-L, -L, L * 2, L * 2); g.globalAlpha = 1; g.fillStyle = k.spots; g.globalAlpha = 0.65; const rr = aqRnd2(5); for (let i = 0; i < 26; i++) { g.beginPath(); g.arc((rr() - 0.5) * R * 1.9, -R * 0.2 - rr() * R * 0.8, R * (0.03 + rr() * 0.05), 0, aqTau); g.fill(); } g.globalAlpha = 1;
    const sh = g.createRadialGradient(-R * 0.3, -R * 0.5, 0, -R * 0.3, -R * 0.5, R); sh.addColorStop(0, 'rgba(255,255,255,.4)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4); g.restore(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, R * 1.08, R, 0, 0, aqTau); g.stroke();
    if (inf > 0.2) { g.strokeStyle = '#8a6a1a'; g.lineWidth = 1.6; for (let a = 0; a < 22; a++) { const an = a / 22 * aqTau; g.beginPath(); g.moveTo(Math.cos(an) * R * 1.06, Math.sin(an) * R); g.lineTo(Math.cos(an) * R * 1.28, Math.sin(an) * R * 1.2); g.stroke(); } }
    aqFin(g, [-R * 0.1, R * 0.1], [R * 0.05, R * 0.3], [-R * 0.3 + Math.sin(ph * 4) * 4, R * 0.55], [0, 0], aqRgb(Viewer.hexRgb(k.fin)), 0.85); aqEye(g, R * 0.55, -R * 0.2, R * 0.2, '#3a7a3a'); g.strokeStyle = '#6a4a10'; g.lineWidth = 2; g.beginPath(); g.arc(R * 1.0, R * 0.12, R * 0.07, 0, aqTau); g.stroke();
  } else if (sp.kind === 'ray') {
    const wing = L * 0.4, fl = Math.sin(ph * 1.6);
    g.strokeStyle = aqRgb(aqMix(Viewer.hexRgb(k.body), [0, 0, 0], 0.3)); g.lineWidth = 3.4; g.beginPath(); g.moveTo(-L * 0.38, 0); for (let i = 1; i <= 12; i++) g.lineTo(-L * 0.38 - L * 0.62 * i / 12, Math.sin(ph * 2 - i * 0.5) * 6 * i / 12); g.stroke(); g.strokeStyle = '#2a2a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(-L * 0.5, Math.sin(ph * 2 - 0.9) * 2); g.lineTo(-L * 0.62, Math.sin(ph * 2 - 1.4) * 4); g.stroke();
    const path = () => { g.beginPath(); g.moveTo(L * 0.5, 0); g.bezierCurveTo(L * 0.3, -wing * (0.35 + 0.1 * fl), L * 0.08, -wing * (0.95 + 0.3 * fl), -L * 0.08, -wing * (1.0 + 0.32 * fl)); g.bezierCurveTo(-L * 0.18, -wing * 0.6, -L * 0.3, -wing * 0.25, -L * 0.4, 0); g.bezierCurveTo(-L * 0.3, wing * 0.25, -L * 0.18, wing * 0.6, -L * 0.08, wing * (1.0 + 0.32 * fl)); g.bezierCurveTo(L * 0.08, wing * (0.95 + 0.3 * fl), L * 0.3, wing * (0.35 + 0.1 * fl), L * 0.5, 0); g.closePath(); };
    path(); const rg = g.createRadialGradient(L * 0.05, 0, 0, L * 0.05, 0, wing * 1.1); rg.addColorStop(0, aqRgb(aqMix(Viewer.hexRgb(k.body), [255, 255, 255], 0.08))); rg.addColorStop(0.7, k.body); rg.addColorStop(1, aqRgb(aqMix(Viewer.hexRgb(k.body), [0, 0, 0], 0.4))); g.fillStyle = rg; g.fill(); g.save(); path(); g.clip(); g.fillStyle = 'rgba(0,0,0,.2)'; const rr = aqRnd2(8); for (let i = 0; i < 28; i++) { g.beginPath(); g.arc((rr() - 0.4) * L * 0.7, (rr() - 0.5) * wing * 1.4, L * (0.008 + rr() * 0.014), 0, aqTau); g.fill(); } g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(L * 0.05, -wing * 0.2, L * 0.28, wing * 0.14, 0.2, 0, aqTau); g.fill(); g.restore(); path(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
    for (const y of [-0.07, 0.07]) aqEye(g, L * 0.33, L * y, L * 0.02, '#3a2a10'); g.fillStyle = 'rgba(0,0,0,.45)'; for (const y of [-0.05, 0.05]) { g.beginPath(); g.ellipse(L * 0.12, L * y, L * 0.03, L * 0.012, 0, 0, aqTau); g.fill(); }
  } else if (sp.kind === 'jelly') {
    const pulse = 0.5 + 0.5 * Math.sin(ph * 1.4), bw = L * (0.5 - pulse * 0.08), bh = L * (0.34 + pulse * 0.06), glow = night ? 1 : 0.55;
    for (let i = 0; i < 12; i++) { const x = (i - 5.5) / 5.5 * bw * 0.9; g.strokeStyle = `rgba(235,225,255,${0.16 + 0.12 * (i % 2)})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 2); for (let s = 1; s <= 12; s++) g.lineTo(x + Math.sin(ph * 1.2 - s * 0.6 + i) * 7 * s / 4, s * L * 0.075); g.stroke(); }
    for (let i = -2; i <= 2; i++) { g.fillStyle = 'rgba(215,200,255,.5)'; g.beginPath(); g.moveTo(i * bw * 0.16, 0); for (let s = 1; s <= 7; s++) g.lineTo(i * bw * 0.16 + Math.sin(ph * 1.6 - s * 0.8 + i) * 8 * s / 3 + 3, s * L * 0.07); for (let s = 7; s >= 1; s--) g.lineTo(i * bw * 0.16 + Math.sin(ph * 1.6 - s * 0.8 + i) * 8 * s / 3 - 3, s * L * 0.07); g.closePath(); g.fill(); }
    const bell = () => { g.beginPath(); g.moveTo(-bw, 0); g.bezierCurveTo(-bw, -bh * 1.55, bw, -bh * 1.55, bw, 0); for (let i = 0; i <= 14; i++) { const x = bw - (2 * bw * i) / 14; g.lineTo(x, 2 + (i % 2) * 3 + pulse * 3); } g.closePath(); };
    bell(); const gr = g.createRadialGradient(0, -bh * 0.5, bh * 0.1, 0, -bh * 0.2, bw * 1.1); gr.addColorStop(0, 'rgba(235,225,255,.75)'); gr.addColorStop(0.7, 'rgba(180,160,255,.38)'); gr.addColorStop(1, 'rgba(150,120,255,.5)'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.stroke();
    g.save(); bell(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1; for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(0, -bh * 0.25); g.lineTo(i * bw * 0.18, 4); g.stroke(); } g.restore();
    g.strokeStyle = 'rgba(255,170,230,.6)'; g.lineWidth = 2.2; for (let i = 0; i < 4; i++) { const a = i / 4 * aqTau; g.beginPath(); g.ellipse(Math.cos(a) * bw * 0.22, -bh * 0.42 + Math.sin(a) * bh * 0.1, bw * 0.17, bh * 0.14, 0, 0.3, 5.9); g.stroke(); }
    g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(0, -bh * 0.3, 0, 0, -bh * 0.3, bw * 1.7); gl.addColorStop(0, `rgba(170,140,255,${0.3 * glow})`); gl.addColorStop(1, 'rgba(170,140,255,0)'); g.fillStyle = gl; g.fillRect(-bw * 1.8, -bw * 1.8, bw * 3.6, bw * 3.6); g.restore();
  } else if (sp.kind === 'seahorse') {
    const u = L * 0.5, sway = Math.sin(ph * 0.9) * 2, body = Viewer.hexRgb(k.body);
    for (let s = 0; s < 3; s++) aqFin(g, [-u * 0.2, -u * 0.35 + s * 12], [-u * 0.2, -u * 0.2 + s * 12], [-u * 0.5 + Math.sin(ph * 9 + s) * 3, -u * 0.28 + s * 12], [0, 0], aqRgb(Viewer.hexRgb(k.fin)), 0.7);
    const spine = []; for (let i = 0; i <= 14; i++) { const t2 = i / 14, y = -u * 0.85 + t2 * u * 1.35; spine.push([u * (0.1 - 0.28 * Math.sin(t2 * 3.0) * 0.5 + (t2 > 0.6 ? 0.1 : 0)) + sway * t2, y]); }
    const loop = []; for (let i = 0; i <= 10; i++) { const a = -0.2 + i * 0.5, rr = u * 0.2 * (1 - i / 14); loop.push([spine[14][0] + Math.cos(a + 1.2) * rr * 1.4 + u * 0.1, spine[14][1] + Math.sin(a + 1.2) * rr * 1.4 + u * 0.1]); }
    const all = spine.concat(loop); for (let pass = 0; pass < 2; pass++) { g.strokeStyle = pass ? aqRgb(aqMix(body, [255, 240, 200], 0.28)) : aqRgb(aqMix(body, [0, 0, 0], 0.4)); g.lineCap = 'round'; for (let i = 0; i < all.length - 1; i++) { const wd = i < 14 ? u * (0.07 + 0.22 * Math.sin(Math.min(1, i / 9) * Math.PI * 0.85 + 0.2)) : u * 0.1 * (1 - (i - 14) / 12); g.lineWidth = pass ? wd * 0.6 : wd; g.beginPath(); g.moveTo(all[i][0], all[i][1]); g.lineTo(all[i + 1][0], all[i + 1][1]); g.stroke(); } }
    g.fillStyle = aqRgb(aqMix(body, [0, 0, 0], 0.35)); for (let i = 2; i < 12; i++) { g.beginPath(); g.arc(spine[i][0] - u * 0.14, spine[i][1], u * 0.035, 0, aqTau); g.fill(); }
    g.strokeStyle = aqRgb(aqMix(body, [0, 0, 0], 0.15)); g.lineWidth = u * 0.15; g.beginPath(); g.moveTo(spine[0][0] + u * 0.05, spine[0][1] + u * 0.02); g.lineTo(spine[0][0] + u * 0.5, spine[0][1] + u * 0.1); g.stroke(); aqEye(g, spine[0][0] + u * 0.04, spine[0][1] - u * 0.03, u * 0.07, '#5a3a10');
    g.strokeStyle = aqRgb(aqMix(body, [255, 220, 120], 0.3)); g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(spine[0][0] - u * 0.03 + i * 5, spine[0][1] - u * 0.08); g.lineTo(spine[0][0] - u * 0.06 + i * 6, spine[0][1] - u * 0.2); g.stroke(); }
  } else if (sp.kind === 'turtle') {
    const flap = Math.sin(ph * 1.3), skin = Viewer.hexRgb(k.body), fl = Viewer.hexRgb(k.fin);
    const flipper = (x, y, a, len, wd) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, -wd * 0.4); g.bezierCurveTo(len * 0.5, -wd * 1.1, len * 0.95, -wd * 0.4, len, 0); g.bezierCurveTo(len * 0.9, wd * 0.4, len * 0.4, wd * 0.6, 0, wd * 0.5); g.closePath(); const fg = g.createLinearGradient(0, 0, len, 0); fg.addColorStop(0, aqRgb(skin)); fg.addColorStop(1, aqRgb(fl)); g.fillStyle = fg; g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.stroke(); g.restore(); };
    flipper(-L * 0.08, L * 0.1, 0.7 + flap * 0.65, L * 0.34, L * 0.08); flipper(-L * 0.3, L * 0.1, 2.5 - flap * 0.3, L * 0.16, L * 0.05);
    g.fillStyle = aqRgb(skin); g.beginPath(); g.moveTo(L * 0.28, -L * 0.04); g.quadraticCurveTo(L * 0.4, -L * 0.18, L * 0.5, -L * 0.1); g.quadraticCurveTo(L * 0.56, -L * 0.03, L * 0.5, L * 0.03); g.quadraticCurveTo(L * 0.4, L * 0.08, L * 0.28, L * 0.08); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.stroke(); aqEye(g, L * 0.46, -L * 0.07, L * 0.024, '#3a2a10'); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(L * 0.5, L * 0.0); g.lineTo(L * 0.44, L * 0.02); g.stroke();
    g.fillStyle = aqRgb(Viewer.hexRgb(k.belly)); g.beginPath(); g.ellipse(0, L * 0.06, L * 0.33, L * 0.09, 0, 0, aqTau); g.fill();
    const shell = () => { g.beginPath(); g.moveTo(-L * 0.38, L * 0.05); g.bezierCurveTo(-L * 0.34, -L * 0.36, L * 0.34, -L * 0.36, L * 0.4, L * 0.05); g.closePath(); }; shell(); const sg = g.createRadialGradient(-L * 0.08, -L * 0.2, L * 0.02, 0, -L * 0.05, L * 0.4); sg.addColorStop(0, '#b0a04a'); sg.addColorStop(0.5, '#7a6a2e'); sg.addColorStop(1, '#3a301a'); g.fillStyle = sg; g.fill();
    g.save(); shell(); g.clip(); g.strokeStyle = 'rgba(30,22,8,.6)'; g.lineWidth = 1.6; for (let row = 0; row < 3; row++) for (let i = -3; i <= 3; i++) { const cx = i * L * 0.11 + (row % 2) * L * 0.055, cy = -L * 0.26 + row * L * 0.1; g.beginPath(); for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3 + Math.PI / 6; a ? g.lineTo(cx + Math.cos(an) * L * 0.058, cy + Math.sin(an) * L * 0.05) : g.moveTo(cx + Math.cos(an) * L * 0.058, cy + Math.sin(an) * L * 0.05); } g.closePath(); g.stroke(); } const hl = g.createLinearGradient(0, -L * 0.36, 0, 0); hl.addColorStop(0, 'rgba(255,255,255,.3)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(-L * 0.4, -L * 0.36, L * 0.8, L * 0.34); g.restore();
    flipper(L * 0.12, L * 0.08, -0.5 - flap * 0.8, L * 0.4, L * 0.09);
  } else if (sp.kind === 'crab') {
    const lg = f.phase * 3, col = Viewer.hexRgb(k.body);
    g.strokeStyle = aqRgb(aqMix(col, [0, 0, 0], 0.25)); g.lineWidth = 3.4; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const x = (i - 1.5) * L * 0.14, sw = Math.sin(lg + i * 2 + (s > 0 ? 1.5 : 0)) * 3; g.beginPath(); g.moveTo(x, L * 0.05); g.lineTo(x + s * L * 0.22, L * 0.1 + sw); g.lineTo(x + s * L * 0.3, L * 0.3); g.stroke(); }
    for (const s of [-1, 1]) { const o = Math.sin(f.phase * 2 + s) * 3, ax = s * L * 0.45, ay = -L * 0.3 + o; g.strokeStyle = aqRgb(col); g.lineWidth = 5; g.beginPath(); g.moveTo(s * L * 0.28, -L * 0.08); g.lineTo(ax, ay); g.stroke(); g.save(); g.translate(s * L * 0.52, -L * 0.38 + o); g.rotate(-s * 0.4); const cg = g.createRadialGradient(0, -3, 2, 0, 0, L * 0.2); cg.addColorStop(0, aqRgb(aqMix(col, [255, 200, 160], 0.3))); cg.addColorStop(1, aqRgb(aqMix(col, [0, 0, 0], 0.3))); g.fillStyle = cg; g.beginPath(); g.ellipse(0, 0, L * 0.13, L * 0.17, 0, 0, aqTau); g.fill(); g.fillStyle = '#1a0a05'; g.beginPath(); g.moveTo(-L * 0.025, -L * 0.1); g.lineTo(0, -L * 0.22); g.lineTo(L * 0.05, -L * 0.1); g.closePath(); g.fill(); g.restore(); }
    g.beginPath(); g.ellipse(0, 0, L * 0.42, L * 0.25, 0, 0, aqTau); const bgc = g.createRadialGradient(-L * 0.1, -L * 0.1, 2, 0, 0, L * 0.45); bgc.addColorStop(0, aqRgb(aqMix(col, [255, 210, 170], 0.3))); bgc.addColorStop(1, aqRgb(aqMix(col, [0, 0, 0], 0.4))); g.fillStyle = bgc; g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(Math.cos(i * 2.4) * L * 0.25 * (0.4 + (i % 5) * 0.15), Math.sin(i * 2.4) * L * 0.13 * (0.4 + (i % 4) * 0.2), 1.6, 0, aqTau); g.fill(); }
    for (const s of [-1, 1]) { g.strokeStyle = aqRgb(col); g.lineWidth = 2.2; g.beginPath(); g.moveTo(s * L * 0.1, -L * 0.22); g.lineTo(s * L * 0.1, -L * 0.32); g.stroke(); aqEye(g, s * L * 0.1, -L * 0.34, L * 0.045, '#222'); }
  } else if (sp.kind === 'star') {
    const R = L * 0.5 * (1 + 0.03 * Math.sin(ph)), col = Viewer.hexRgb(k.body), tipOf = i => { const a = -Math.PI / 2 + i * Math.PI / 5; return [Math.cos(a) * (i % 2 ? R * 0.4 : R), Math.sin(a) * (i % 2 ? R * 0.4 : R) * 0.9]; };
    g.beginPath(); for (let i = 0; i < 10; i++) { const p = tipOf(i); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); const sg = g.createRadialGradient(0, -R * 0.2, 2, 0, 0, R); sg.addColorStop(0, aqRgb(aqMix(col, [255, 220, 180], 0.35))); sg.addColorStop(1, aqRgb(aqMix(col, [90, 20, 0], 0.5))); g.fillStyle = sg; g.fill(); g.lineJoin = 'round'; g.strokeStyle = aqRgb(aqMix(col, [60, 10, 0], 0.4)); g.lineWidth = 5; g.stroke(); g.fillStyle = aqRgb(aqMix(col, [255, 240, 220], 0.55));
    for (let i = 0; i < 5; i++) for (let j = 1; j < 6; j++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; g.beginPath(); g.arc(Math.cos(a) * R * 0.17 * j, Math.sin(a) * R * 0.17 * j * 0.9, 2.2 - j * 0.15, 0, aqTau); g.fill(); }
  }
}

/* ---------- food and bubbles ---------- */
function aqDrawFeeder(g, feeding) {
  const p = AquaCore.feederPos(), y = p.y, shake = feeding > 0 ? Math.sin(feeding * 40) * 2 : 0, bd = g.createLinearGradient(p.x - 34, 0, p.x + 34, 0); bd.addColorStop(0, '#6a6e76'); bd.addColorStop(0.35, '#d5d9df'); bd.addColorStop(1, '#4a4e56');
  g.fillStyle = bd; g.fillRect(p.x - 34, 0, 68, y - 4); g.fillStyle = '#23262c'; g.fillRect(p.x - 34, y - 14, 68, 6); g.fillStyle = '#b3342a'; g.fillRect(p.x - 18 + shake, y - 4, 36, 12); g.fillStyle = '#0d0f12'; g.fillRect(p.x - 18, y + 8, 36, 4); g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '600 10px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('FEEDER', p.x, y - 22);
}
function aqDrawFood(g) {
  for (const f of aqFood) { const fade = f.rest > 30 ? 1 - (f.rest - 30) / 10 : 1; g.globalAlpha = Math.max(0, fade);
    if (f.kind === 'pellet') { const gr = g.createRadialGradient(f.x - 1, f.y - 1, 0.5, f.x, f.y, 4.5); gr.addColorStop(0, '#d49a5a'); gr.addColorStop(1, '#5a3418'); g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, 4, 0, aqTau); g.fill(); }
    else { g.save(); g.translate(f.x, f.y); g.rotate(f.ph + f.age * 0.8); g.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(f.age * 2 + f.ph))); g.fillStyle = f.rest > 0 ? '#b9824a' : ['#f2c23a', '#e5822e', '#d9524a'][(f.ph * 3 | 0) % 3]; g.beginPath(); g.moveTo(-4, -1); g.lineTo(-1, -3.2); g.lineTo(4, -1.4); g.lineTo(3.2, 2); g.lineTo(-2, 3); g.closePath(); g.fill(); g.restore(); } }
  g.globalAlpha = 1;
}
function aqDrawBubbles(g, t) {
  for (const b of aqBubbles) { const wob = 1 + 0.08 * Math.sin(t * 9 + b.ph); g.save(); g.translate(b.x, b.y); g.scale(wob, 2 - wob); const gr = g.createRadialGradient(-b.r * 0.2, -b.r * 0.2, b.r * 0.1, 0, 0, b.r); gr.addColorStop(0, 'rgba(255,255,255,.04)'); gr.addColorStop(0.75, 'rgba(200,235,255,.12)'); gr.addColorStop(1, 'rgba(235,250,255,.7)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, b.r, 0, aqTau); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-b.r * 0.38, -b.r * 0.42, Math.max(0.5, b.r * 0.22), 0, aqTau); g.fill(); g.restore(); }
}

/* ---------- one frame ---------- */
function aqDraw(g, w, h, isFull) {
  const sc = w / AquaCore.W, Hn = h / sc, d = Math.min(2, window.devicePixelRatio || 1); if (!Viewer.isOpen() || isFull) aqH = Hn;
  const night = aqCfg.night, W = AquaCore.W, H = aqH, floor = AquaCore.floorOf(H), t = aqT, key = `${Math.round(w)}x${Math.round(h)}|${night}|${aqCfg.decor}|${Math.round(H)}`;
  if (key !== aqStaticKey) { aqStaticCv = document.createElement('canvas'); aqStaticCv.width = Math.round(w * d); aqStaticCv.height = Math.round(h * d); const sg = aqStaticCv.getContext('2d'); sg.scale(sc * d, sc * d); aqPaintStatic(aqStaticCv, w, h, night); aqStaticKey = key; }
  g.save(); g.scale(sc, sc); g.drawImage(aqStaticCv, 0, 0, W, H);
  aqSurfaceLight(g, t, night);
  // caustics rippling over the sand and the foot of the rocks
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = night ? 0.2 : 0.55; const cv = aqCaustics(t); g.beginPath(); g.moveTo(0, H); g.lineTo(0, floor - 4); for (let x = 0; x <= W; x += 20) g.lineTo(x, floor + 6 - 8 * Math.sin(x * 0.006 + 0.8) - 5 * Math.sin(x * 0.017)); g.lineTo(W, H); g.closePath(); g.clip(); g.imageSmoothingEnabled = true; g.drawImage(cv, -20 + Math.sin(t * 0.2) * 12, floor - 12, W + 40, H - floor + 18); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = night ? 0.03 : 0.07; g.drawImage(cv, 0, floor - H * 0.32, W, H * 0.34); g.restore();
  aqDrawPlants(g, t, 0, night);
  // drifting particles catch the light
  g.fillStyle = night ? 'rgba(140,180,255,.5)' : 'rgba(235,255,255,.6)'; for (const m of aqMotes || []) { g.globalAlpha = (0.15 + 0.5 * Math.abs(Math.sin(t * 0.7 + m.ph))) * (0.4 + 0.6 * (1 - m.y)); g.beginPath(); g.arc(m.x * W, m.y * H, m.r, 0, aqTau); g.fill(); } g.globalAlpha = 1;
  aqDrawFeeder(g, aqFeedT); aqDrawFood(g);
  // fish: farther ones are smaller, bluer and fainter, and every one throws a faint shadow on the sand
  const order = aqFish.slice().sort((a, b) => a.z - b.z || AquaCore.bySp(a.sp).size - AquaCore.bySp(b.sp).size), fog = aqFogColor(night);
  for (const f of order) {
    const sp = AquaCore.bySp(f.sp); if (sp.kind !== 'star' && sp.kind !== 'crab') { const hgt = Math.max(0, floor - f.y), a = 0.2 * Math.max(0, 1 - hgt / 380) * (night ? 0.5 : 1); if (a > 0.01) { g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(f.x + 18, floor + 8 + (1 - f.z) * 6, sp.size * 0.36 * (1 + hgt / 600), sp.size * 0.05, 0, 0, aqTau); g.fill(); } }
    g.save(); g.translate(f.x, f.y); const s2 = 0.82 + 0.26 * f.z, flip = sp.kind === 'crab' || sp.kind === 'star' || sp.kind === 'jelly' ? 1 : f.dir; g.scale(s2 * flip, s2);
    if (!['seahorse', 'star', 'crab', 'jelly', 'turtle', 'ray'].includes(sp.kind)) g.rotate(AquaCore.clamp(f.vy / (sp.speed * 3 + 1), -0.5, 0.5) * 0.9);
    g.globalAlpha = 0.7 + 0.3 * f.z; aqDrawCreature(g, f, sp, night, t);
    g.globalAlpha = (1 - f.z) * (night ? 0.3 : 0.2); g.globalCompositeOperation = 'source-atop'; g.fillStyle = aqRgb(fog); g.fillRect(-sp.size, -sp.size, sp.size * 2, sp.size * 2); g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (f.happy > 0 && Math.random() < 0.02) aqBubble(f.x + f.dir * sp.size * 0.45, f.y - 6, 1.5);
    if (aqSel === f || aqCfg.tags) { g.save(); g.font = '600 13px system-ui, sans-serif'; g.textAlign = 'center'; const tw = g.measureText(f.name).width + 14, ly = f.y - sp.size * 0.5 - (sp.kind === 'shark' ? 16 : 22); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect ? g.roundRect(f.x - tw / 2, ly - 12, tw, 20, 10) : g.rect(f.x - tw / 2, ly - 12, tw, 20); g.fill(); g.fillStyle = '#fff'; g.fillText(f.name, f.x, ly + 3); g.restore(); }
    if (aqSel === f) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.ellipse(f.x, f.y, sp.size * 0.62, Math.max(26, sp.size * 0.4), 0, 0, aqTau); g.stroke(); g.setLineDash([]); }
  }
  aqDrawBubbles(g, t); aqDrawPlants(g, t, 1, night);
  const haze = g.createLinearGradient(0, 0, 0, H); haze.addColorStop(0, 'rgba(0,0,0,0)'); haze.addColorStop(0.6, 'rgba(0,10,20,.08)'); haze.addColorStop(1, 'rgba(0,6,12,.32)'); g.fillStyle = haze; g.fillRect(0, 0, W, H);
  if (night) { g.fillStyle = 'rgba(2,6,20,.28)'; g.fillRect(0, 0, W, H); }
  if (!aqFish.length) { g.fillStyle = 'rgba(255,255,255,.88)'; g.font = '600 30px system-ui, sans-serif'; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 8; g.fillText('The tank is empty.', W / 2, H * 0.42); g.font = '18px system-ui, sans-serif'; g.fillText('Open Add fish below and pick someone to live here.', W / 2, H * 0.42 + 34); g.shadowBlur = 0; }
  g.restore();
  // the glass: a faint reflection, darker corners, and the lid with its lights
  const v = g.createLinearGradient(0, 0, w, h); v.addColorStop(0, 'rgba(255,255,255,.08)'); v.addColorStop(0.16, 'rgba(255,255,255,0)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  const e = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.5, w / 2, h / 2, Math.max(w, h) * 0.8); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,.42)'); g.fillStyle = e; g.fillRect(0, 0, w, h);
}

'use strict';
/* Fireplace picture, drawn in code: a brick chimney breast, a firebox with a grate, bark-and-char logs, coals and flames.
   The still parts (bricks, mantel, floor) are painted once per size; the light, the fire and the moving details are painted every frame. */
const frSeed = n => { let x = (n * 9301 + 49297) % 233280; return () => (x = (x * 9301 + 49297) % 233280) / 233280; };
// size and place of the fire opening for each look
const FR_GEO = { cozy: { k: 1, floor: 0.86, arch: true, h: 1.6 }, brick: { k: 1, floor: 0.84, arch: true, h: 1.75 }, cabin: { k: 0.95, floor: 0.8, arch: false, h: 1.4 }, stone: { k: 0.55, floor: 0.78, arch: false, h: 1.25 }, insert: { k: 0.88, floor: 0.8, arch: true, h: 1.55 }, herring: { k: 1.15, floor: 0.86, arch: false, h: 1.55 } };
// what each look does to the live picture: how dark the room is, what the logs are, the grate and how tall the flames stand
const FR_DYN = { cozy: { amb: 1, logs: ['oak'], grate: 'basket', fk: 1 }, brick: { amb: 0.9, logs: ['birch', 'oak'], grate: 'bars', fk: 1 }, cabin: { amb: 0.85, logs: ['birch'], grate: 'rack', fk: 1 }, stone: { amb: 0.22, logs: ['oak'], grate: 'none', fk: 0.9 }, insert: { amb: 0.5, logs: ['ceramic'], grate: 'pan', fk: 0.7 }, herring: { amb: 0.7, logs: ['rough'], grate: 'steel', fk: 1.05 } };
const frTheme = () => (typeof frCfg !== 'undefined' && frCfg && FR_GEO[frCfg.theme] ? frCfg.theme : 'cozy');
function frLayout(w, h) { const th = frTheme(), T = FR_GEO[th], base = Math.min(w * 0.3, h * 0.36), s = base * T.k, floorY = h * T.floor, ox = w / 2; return { theme: th, s, ox, floorY, oy: floorY - s * 0.26, openTop: floorY - s * T.h, openL: ox - 1.1 * s, openR: ox + 1.1 * s, arch: T.arch, ry: s * 0.5 }; }
const frArch = (g, L) => frOpening(g, L);
let frStatic = null, frStaticKey = '';
const FR_PAINT = { cozy: frPaintCozy, brick: frPaintBrick, cabin: frPaintCabin, stone: frPaintStone, insert: frPaintInsert, herring: frPaintHerring };
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
    const x = l.x + (q() - 0.5) * l.len * 0.75, y = l.y + l.rad * 0.7, hgt = (0.75 + 0.8 * q()) * big * (0.75 + 0.25 * frNoise(t * 2.2 + i, i)) * e2 * frCfg.height * FR_DYN[frTheme()].fk * (0.55 + 0.6 * Math.min(1.1, pw));
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
  const Td = FR_DYN[frTheme()], st = Td.logs[l.id % Td.logs.length], P = { oak: [[96, 66, 42], [66, 44, 27], [40, 26, 15], [16, 9, 5]], birch: [[236, 230, 216], [214, 206, 190], [168, 158, 144], [92, 86, 78]], ceramic: [[176, 122, 80], [138, 90, 54], [98, 60, 36], [52, 30, 18]], rough: [[104, 84, 70], [78, 62, 50], [52, 40, 32], [24, 18, 14]] }[st];
  const bg = g.createLinearGradient(0, -rad, 0, rad); bg.addColorStop(0, mixc(P[0], st === 'birch' ? 1.1 : 0.9)); bg.addColorStop(0.3, mixc(P[1], 0.95)); bg.addColorStop(0.7, mixc(P[2], 1)); bg.addColorStop(1, mixc(P[3], 1));
  path(); g.fillStyle = bg; g.fill(); g.save(); path(); g.clip();
  g.lineCap = 'round'; if (st === 'birch') { for (let k = 0, m = 30; k < m; k++) { const yy = -rad + rad * 2 * r(), xx = -len / 2 + r() * len, ww = len * (0.02 + r() * 0.06); g.strokeStyle = `rgba(30,24,18,${0.35 + r() * 0.4})`; g.lineWidth = 1 + r() * 2.2; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + ww, yy + (r() - 0.5) * 2); g.stroke(); } for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(120,100,76,${0.15 + r() * 0.2})`; g.beginPath(); g.ellipse(-len / 2 + r() * len, (r() - 0.5) * rad * 1.6, len * (0.03 + r() * 0.06), rad * (0.12 + r() * 0.3), 0, 0, 6.283); g.fill(); } } else {
    g.lineCap = 'round'; for (let k = 0; k < (st === 'rough' ? 16 : 11); k++) { const y0 = -rad + rad * 2 * (k + 0.5) / 11 + (r() - 0.5) * rad * 0.12; g.strokeStyle = `rgba(0,0,0,${0.18 + r() * 0.22})`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); g.moveTo(-len / 2, y0); for (let i = 1; i <= 10; i++) g.lineTo(-len / 2 + len * i / 10, y0 + Math.sin(i * 1.3 + k) * rad * 0.06); g.stroke(); } }
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
  const key = `${w}x${h}@${d}|${L.theme}`; if (key !== frStaticKey) { frStatic = document.createElement('canvas'); frStatic.width = Math.round(w * d); frStatic.height = Math.round(h * d); const sg = frStatic.getContext('2d'); sg.scale(d, d); FR_PAINT[L.theme](sg, w, h, L); frStaticKey = key; }
  const pw = Math.min(1.2, FR.power(frFire)), coal = frFire.coals, light = Math.min(1, pw * 0.85 + coal * 0.3) * (0.92 + 0.05 * Math.sin(t * 11) + 0.03 * Math.sin(t * 27 + 1));
  g.drawImage(frStatic, 0, 0, w, h); if (!frSnow) frAmbient(0);
  const Th = FR_DYN[L.theme], mY = openTop - s * 0.3; let cx = 0, cfl = 1;
  if (L.theme === 'cozy') {
  frWindowLive(g, L, w);
  // stockings, candle and clock sway and tick
  [[-1.3, '#a8202a'], [-1.0, '#2c7a45'], [1.25, '#a8202a']].forEach(([dx, col], i) => { const x = ox + dx * s, y = mY + s * 0.2, sw = Math.sin(t * 1.3 + i * 2) * s * 0.012; g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 0.07, y); g.lineTo(x + s * 0.07, y); g.lineTo(x + s * 0.07 + sw, y + s * 0.2); g.quadraticCurveTo(x + s * 0.11 + sw, y + s * 0.3, x + sw * 1.3, y + s * 0.3); g.lineTo(x - s * 0.07 + sw, y + s * 0.22); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y, s * 0.07, s * 0.2); g.fillStyle = '#f2ece0'; g.fillRect(x - s * 0.085, y - s * 0.015, s * 0.17, s * 0.055); });
  const kx = ox - s * 1.45, ky = mY - s * 0.17, kr = s * 0.15; g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(kx, ky, kr + s * 0.025, 0, 6.283); g.fill(); g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(kx, ky, kr, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(40,25,10,.6)'; g.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i * 0.5236; g.beginPath(); g.moveTo(kx + Math.sin(a) * kr * 0.86, ky - Math.cos(a) * kr * 0.86); g.lineTo(kx + Math.sin(a) * kr * 0.96, ky - Math.cos(a) * kr * 0.96); g.stroke(); }
  const dd = new Date(), hh = (dd.getHours() % 12 + dd.getMinutes() / 60) / 12 * 6.283, mm = (dd.getMinutes() + dd.getSeconds() / 60) / 60 * 6.283, ss = dd.getSeconds() / 60 * 6.283; g.strokeStyle = '#2a1a10'; g.lineCap = 'round'; g.lineWidth = Math.max(1.6, s * 0.016);
  g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(hh) * kr * 0.5, ky - Math.cos(hh) * kr * 0.5); g.stroke(); g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(mm) * kr * 0.78, ky - Math.cos(mm) * kr * 0.78); g.stroke(); g.strokeStyle = '#a02020'; g.lineWidth = 1; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.sin(ss) * kr * 0.85, ky - Math.cos(ss) * kr * 0.85); g.stroke();
  cx = ox + s * 1.5; cfl = 0.85 + 0.15 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23); g.fillStyle = '#efe6cf'; g.fillRect(cx - s * 0.035, mY - s * 0.2, s * 0.07, s * 0.2); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(cx, mY - s * 0.2, s * 0.035, s * 0.2);
  }
  if (L.theme === 'stone') frSnowOutside(g, w, h, L);
  // night over the room, lifted by the firelight
  const dark = g.createRadialGradient(ox, oy - s * 0.5, s * 0.5, ox, oy - s * 0.5, Math.max(w, h) * 0.78), out = 1 - light;
  const am = Th.amb; dark.addColorStop(0, `rgba(6,3,2,${(0.2 + 0.6 * out) * am})`); dark.addColorStop(0.45, `rgba(6,3,2,${(0.62 + 0.3 * out) * am})`); dark.addColorStop(1, `rgba(3,2,2,${(0.9 + 0.08 * out) * am})`); g.fillStyle = dark; g.fillRect(0, 0, w, h);
  // warm light on the bricks, the mantel and the floor
  g.globalCompositeOperation = 'lighter';
  const warm = g.createRadialGradient(ox, oy - s * 0.3, s * 0.2, ox, oy - s * 0.3, s * 3.4); warm.addColorStop(0, `rgba(${hot[0]},${hot[1] * 0.62 | 0},${hot[2] * 0.3 | 0},${0.5 * light})`); warm.addColorStop(0.5, `rgba(${hot[0]},${hot[1] * 0.45 | 0},${hot[2] * 0.2 | 0},${0.2 * light})`); warm.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = warm; g.fillRect(0, 0, w, h);
  const spill = g.createRadialGradient(ox, floorY + s * 0.2, s * 0.1, ox, floorY + s * 0.2, s * 1.9); spill.addColorStop(0, `rgba(${hot[0]},${hot[1] * 0.5 | 0},${hot[2] * 0.2 | 0},${0.5 * light})`); spill.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(0, floorY + s * 0.2); g.scale(1, 0.32); g.translate(0, -(floorY + s * 0.2)); g.fillStyle = spill; g.fillRect(ox - s * 2, floorY - s * 2, s * 4, s * 4); g.restore();
  if (L.theme === 'cozy') { const cg = g.createRadialGradient(cx, mY - s * 0.25, 0, cx, mY - s * 0.25, s * 0.6); cg.addColorStop(0, `rgba(255,190,90,${0.4 * cfl})`); cg.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = cg; g.fillRect(cx - s * 0.6, mY - s * 0.85, s * 1.2, s * 1.2); }
  g.globalCompositeOperation = 'source-over'; if (L.theme === 'cozy') { g.fillStyle = '#ffd36a'; g.beginPath(); g.ellipse(cx, mY - s * 0.25, s * 0.022 * cfl, s * 0.052 * cfl, 0, 0, 6.283); g.fill(); g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(cx, mY - s * 0.23, s * 0.011, s * 0.024, 0, 0, 6.283); g.fill(); }
  // everything inside the firebox is drawn clipped to the opening
  g.save(); frArch(g, L); g.clip();
  const back = g.createRadialGradient(ox, oy - s * 0.2, s * 0.1, ox, oy - s * 0.2, s * 1.5); back.addColorStop(0, `rgba(${hot[0]},${hot[1] * 0.6 | 0},${hot[2] * 0.3 | 0},${0.65 * light})`); back.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = back; g.fillRect(ox - s * 1.2, openTop, s * 2.4, floorY - openTop); g.globalCompositeOperation = 'source-over';
  // grate bars and ash
  const barY = oy + s * 0.14; if (Th.grate === 'basket') { g.fillStyle = '#0d0d10'; g.fillRect(ox - s * 0.9, barY + s * 0.02, s * 1.8, s * 0.03); }
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
  if (Th.grate === 'basket') {
  // the front of the grate: top rail, bottom rail and a row of spindles, standing in front of the glowing ash bed
  { const rt = oy + s * 0.15, rb = oy + s * 0.3, x0 = ox - s * 0.9, x1 = ox + s * 0.9, ir = frSeed(77); for (let i = 0; i <= 16; i++) { const x = x0 + (x1 - x0) * i / 16; const sg = g.createLinearGradient(x - s * 0.012, 0, x + s * 0.012, 0); sg.addColorStop(0, '#08080a'); sg.addColorStop(0.5, '#3c3c44'); sg.addColorStop(1, '#08080a'); g.fillStyle = sg; g.fillRect(x - s * 0.012, rt, s * 0.024, rb - rt); }
    for (const y of [rt, rb]) { const rg = g.createLinearGradient(0, y, 0, y + s * 0.03); rg.addColorStop(0, '#46464e'); rg.addColorStop(1, '#0a0a0c'); g.fillStyle = rg; g.fillRect(x0 - s * 0.02, y, x1 - x0 + s * 0.04, s * 0.03); }
    g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,120,30,${0.18 * light})`; g.fillRect(x0, rt + s * 0.03, x1 - x0, rb - rt - s * 0.03); g.globalCompositeOperation = 'source-over'; void ir; }
  // the front posts of the andirons stand in front of the logs
  for (const dx of [-0.9, 0.9]) { const x = ox + dx * s, gp = g.createLinearGradient(x - s * 0.03, 0, x + s * 0.03, 0); gp.addColorStop(0, '#0a0a0c'); gp.addColorStop(0.4, '#4a4a54'); gp.addColorStop(1, '#0a0a0c'); g.fillStyle = gp; g.fillRect(x - s * 0.025, oy - s * 0.2, s * 0.05, floorY - oy + s * 0.2 - s * 0.04); g.fillStyle = '#26262c'; g.beginPath(); g.arc(x, oy - s * 0.22, s * 0.045, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - s * 0.015, oy - s * 0.235, s * 0.014, 0, 6.283); g.fill(); g.fillStyle = `rgba(255,140,50,${0.4 * light})`; g.fillRect(x - s * 0.02, oy - s * 0.2, s * 0.012, floorY - oy); }
  } else {
    const fr2 = frSeed(61), gy = oy + s * 0.2;
    if (Th.grate === 'rack') { for (const dx of [-0.92, 0.92]) { g.fillStyle = '#1a1a1e'; g.fillRect(ox + dx * s - s * 0.02, gy, s * 0.04, floorY - gy - s * 0.04); } const rg = g.createLinearGradient(0, gy, 0, gy + s * 0.04); rg.addColorStop(0, '#5a5a62'); rg.addColorStop(1, '#101014'); g.fillStyle = rg; g.fillRect(ox - s * 0.95, gy, s * 1.9, s * 0.04); g.fillRect(ox - s * 0.95, gy + s * 0.14, s * 1.9, s * 0.03); g.fillStyle = 'rgba(255,120,30,' + (0.2 * light) + ')'; g.fillRect(ox - s * 0.9, gy + s * 0.05, s * 1.8, s * 0.08); }
    else if (Th.grate === 'bars') { g.fillStyle = '#17171b'; for (let i = 0; i < 6; i++) g.fillRect(ox - s * 0.7 + i * s * 0.28, gy - s * 0.02, s * 0.03, s * 0.2); g.fillRect(ox - s * 0.72, gy + s * 0.14, s * 1.46, s * 0.03); }
    else if (Th.grate === 'pan') { const pg = g.createLinearGradient(0, floorY - s * 0.2, 0, floorY); pg.addColorStop(0, '#3a3a40'); pg.addColorStop(1, '#101014'); g.fillStyle = pg; g.beginPath(); g.moveTo(ox - s * 0.95, floorY - s * 0.12); g.lineTo(ox + s * 0.95, floorY - s * 0.12); g.lineTo(ox + s * 1.05, floorY); g.lineTo(ox - s * 1.05, floorY); g.closePath(); g.fill(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,120,30,${0.35 * light})`; g.fillRect(ox - s * 0.9, floorY - s * 0.12, s * 1.8, s * 0.05); g.globalCompositeOperation = 'source-over'; }
    else if (Th.grate === 'steel') { const rg = g.createLinearGradient(0, gy, 0, gy + s * 0.05); rg.addColorStop(0, '#cfd3d8'); rg.addColorStop(1, '#4a4d52'); g.fillStyle = rg; g.fillRect(ox - s * 1.05, gy + s * 0.04, s * 2.1, s * 0.05); g.fillRect(ox - s * 1.05, gy + s * 0.2, s * 2.1, s * 0.04); for (let i = 0; i < 7; i++) { const x = ox - s * 0.9 + i * s * 0.3; const sg2 = g.createLinearGradient(x - s * 0.03, 0, x + s * 0.03, 0); sg2.addColorStop(0, '#2a2c30'); sg2.addColorStop(0.5, '#a8acb2'); sg2.addColorStop(1, '#2a2c30'); g.fillStyle = sg2; g.fillRect(x - s * 0.03, gy - s * 0.04, s * 0.06, s * 0.08); } g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,140,50,${0.25 * light})`; g.fillRect(ox - s * 1.0, gy + s * 0.1, s * 2, s * 0.1); g.globalCompositeOperation = 'source-over'; void fr2; }
  }
  g.restore();
  if (L.theme === 'insert') frFrontInsert(g, L, light);
  // dust floating in the firelight, then a soft edge to the whole picture
  g.globalCompositeOperation = 'lighter'; for (const m of frMotes || []) { const x = m.x * w, y = m.y * h, dist = Math.hypot(x - ox, y - (oy - s * 0.4)) / (s * 3.2), a = Math.max(0, 1 - dist) * light * (0.3 + 0.35 * Math.sin(t * 1.5 + m.ph)); if (a <= 0.01) continue; g.fillStyle = `rgba(${hot[0]},${hot[1] | 0},${hot[2] * 0.6 | 0},${a * 0.8})`; g.beginPath(); g.arc(x, y, 0.8 + (m.ph % 1.3), 0, 6.283); g.fill(); } g.globalCompositeOperation = 'source-over';
  if (FR.isOut(frFire) && frFire.coals < 0.02) { g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `${Math.max(14, s * 0.12)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(frFire.logs.length ? 'Cold logs. Strike a match.' : 'The fire is out. Tap the hearth to place a log.', ox, floorY + s * 0.45); }
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
}

// snow falling past the big window; it drifts across the whole view
function frSnowOutside(g, w, h, L) {
  if (!frSnow) frAmbient(0); const t = frFire.t; const cw = L.s * 1.8; g.save(); g.beginPath(); g.rect(0, 0, L.ox - cw, L.floorY); g.rect(L.ox + cw, 0, w - L.ox - cw, L.floorY); g.clip(); g.fillStyle = '#fff';
  for (const f of frSnow) { const x = ((f.x + Math.sin(t * 0.6 + f.ph) * 0.02) % 1) * w, y = f.y * L.floorY, r = f.r * Math.max(1, w / 520); g.globalAlpha = 0.5 + 0.4 * f.r / 2.2; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
  g.globalAlpha = 1; g.restore();
}

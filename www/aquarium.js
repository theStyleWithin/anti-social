'use strict';
/* Aquarium: a fish tank that starts empty. Add fish from the menu, feed them, watch them swim. The tank is remembered on this device. */
const AQ = AquaCore;
let aqFish = null, aqFood = [], aqH = 620, aqClock = null, aqCfg = null, aqPaused = false, aqSel = null, aqTab = 'add', aqBubbles = [], aqMotes = null, aqAmb = null, aqSaveT = 0, aqFeedT = 0, aqChest = 0, aqNext = 0, aqDecor = null, aqT = 0, aqUi = null;
const aqLoadList = () => { try { return AQ.normSave(JSON.parse(localStorage.getItem('as.aquarium') || '[]')); } catch { return []; } };
const aqSave = () => { try { localStorage.setItem('as.aquarium', JSON.stringify(aqFish.map(f => ({ sp: f.sp, name: f.name, meals: f.meals })))); } catch { /* not remembered */ } };
const aqLoadCfg = () => { try { const c = JSON.parse(localStorage.getItem('as.aquarium.cfg') || 'null') || {}; return { night: !!c.night, decor: c.decor !== false, tags: !!c.tags, auto: !!c.auto }; } catch { return { night: false, decor: true, tags: false, auto: false }; } };
const aqStoreCfg = () => { try { localStorage.setItem('as.aquarium.cfg', JSON.stringify(aqCfg)); } catch { /* not remembered */ } };
const aqRnd = Math.random;

/* ---------- the world moves ---------- */
function aqBubble(x, y, r) { if (aqBubbles.length < 160) aqBubbles.push({ x, y, r: r || 2 + aqRnd() * 4, v: 40 + aqRnd() * 50, ph: aqRnd() * 6 }); }
function aqAdvance(t) {
  if (!aqClock) aqClock = Viewer.clock();
  const dt = aqClock(t); if (dt <= 0 || aqPaused) return; aqT += dt;
  const world = { fish: aqFish, food: aqFood, H: aqH }, before = aqFish.map(f => f.meals);
  AQ.stepFood(aqFood, dt, aqH); aqFish.forEach(f => AQ.stepFish(f, dt, world, aqRnd));
  aqFish.forEach((f, i) => { if (f.meals > before[i]) { for (let k = 0; k < 2; k++) aqBubble(f.x + f.dir * AQ.bySp(f.sp).size * 0.4, f.y - 4, 1.5 + aqRnd() * 2); if (aqAmb) aqAmb.blip(500 + aqRnd() * 300, 900, 0.05, 0.05); } });
  // the air stone and the treasure chest
  if (aqRnd() < dt * 7) aqBubble(520 + (aqRnd() - 0.5) * 6, AQ.floorOf(aqH) - 6, 1.5 + aqRnd() * 3.5);
  aqChest -= dt; if (aqChest <= 0) { aqChest = 9 + aqRnd() * 8; aqNext = 2.2; if (aqAmb) aqAmb.blip(160, 320, 0.35, 0.08, 'triangle'); }
  if (aqNext > 0) { aqNext -= dt; if (aqRnd() < dt * 30) aqBubble(185 + (aqRnd() - 0.5) * 30, AQ.floorOf(aqH) - 30, 2 + aqRnd() * 5); }
  for (const b of aqBubbles) { b.y -= b.v * dt; b.x += Math.sin(aqT * 3 + b.ph) * 10 * dt; }
  aqBubbles = aqBubbles.filter(b => b.y > 22);
  if (!aqMotes) aqMotes = Array.from({ length: 70 }, () => ({ x: aqRnd(), y: aqRnd(), v: 0.004 + aqRnd() * 0.012, ph: aqRnd() * 6, r: 0.6 + aqRnd() * 1.3 }));
  for (const m of aqMotes) { m.y += m.v * dt; m.x += Math.sin(aqT * 0.5 + m.ph) * 0.004 * dt; if (m.y > 1) { m.y = 0; m.x = aqRnd(); } }
  if (aqFeedT > 0) aqFeedT -= dt;
  aqCfgAuto(dt);
  aqSaveT += dt; if (aqSaveT > 20) { aqSaveT = 0; aqSave(); }
}
let aqAutoT = 0;
function aqCfgAuto(dt) { if (!aqCfg.auto || !aqFish.length) return; aqAutoT += dt; if (aqAutoT > 90) { aqAutoT = 0; aqFeed('flake', true); } }
function aqFeed(kind, quiet) {
  if (!aqFish.length) { aqSay('The tank is empty. Add some fish first.'); return; }
  AQ.dropFlakes(aqFood, aqRnd, kind === 'pellet' ? 10 : 18, kind); aqFeedT = 1.2;
  if (aqAmb) { aqAmb.burst(500, 0.6, 0.12, 0.2, 'lowpass'); aqAmb.blip(240, 120, 0.12, 0.06); }
  if (!quiet) aqSay(kind === 'pellet' ? 'Sinking pellets dropped. The crab and the ray will find them.' : 'Flakes dropped.');
}
function aqSay(m) { if (aqUi) aqUi.say(m); }

/* ---------- drawing ---------- */
const aqPal = night => night ? { top: '#06142c', bot: '#020711', ray: 'rgba(120,160,255,', sand: ['#2a2a3a', '#14141e'] } : { top: '#46b6e0', bot: '#0a4676', ray: 'rgba(255,255,255,', sand: ['#d9c58c', '#a98f55'] };
function aqBuildDecor() {
  const r = AQ.seeded(7);
  return { kelp: Array.from({ length: 9 }, (_, i) => ({ x: 40 + i * 118 + r() * 50, h: 120 + r() * 170, ph: r() * 6, w: 7 + r() * 5, c: ['#2f9a52', '#3fae5f', '#23834a'][i % 3] })), pebbles: Array.from({ length: 46 }, () => ({ x: r() * 1000, y: r(), s: 2 + r() * 5, c: ['#8d8570', '#b3a98a', '#6e6955', '#c7bd9b'][(r() * 4) | 0] })), rocks: [{ x: 700, w: 130, h: 80 }, { x: 345, w: 80, h: 52 }], coral: [{ x: 840, c: '#ff5f8f', n: 7 }, { x: 905, c: '#ffa63c', n: 5 }] };
}
function aqDrawTank(g, w, h, night) {
  const P = aqPal(night), H = aqH, floor = AQ.floorOf(H), t = aqT, bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, P.top); bg.addColorStop(1, P.bot); g.fillStyle = bg; g.fillRect(0, 0, AQ.W, H);
  // light shafts from the surface
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const x = 100 + i * 170 + Math.sin(t * 0.25 + i * 1.7) * 40, a = (night ? 0.05 : 0.09) * (0.6 + 0.4 * Math.sin(t * 0.5 + i)); const gr = g.createLinearGradient(0, 0, 0, floor); gr.addColorStop(0, P.ray + a + ')'); gr.addColorStop(1, P.ray + '0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 20, 0); g.lineTo(x + 40, 0); g.lineTo(x + 140 + Math.sin(t * 0.3 + i) * 30, floor); g.lineTo(x - 10, floor); g.closePath(); g.fill(); }
  g.restore();
  // far hills so the water has some depth
  g.fillStyle = night ? 'rgba(10,20,50,.55)' : 'rgba(20,90,140,.35)'; g.beginPath(); g.moveTo(0, floor); for (let x = 0; x <= AQ.W; x += 40) g.lineTo(x, floor - 55 - 35 * Math.sin(x * 0.006 + 1) - 20 * Math.sin(x * 0.017)); g.lineTo(AQ.W, floor); g.closePath(); g.fill();
  // sand
  const sd = g.createLinearGradient(0, floor - 8, 0, H); sd.addColorStop(0, P.sand[0]); sd.addColorStop(1, P.sand[1]); g.fillStyle = sd; g.beginPath(); g.moveTo(0, floor + 6); for (let x = 0; x <= AQ.W; x += 25) g.lineTo(x, floor - 4 + Math.sin(x * 0.02) * 5); g.lineTo(AQ.W, H); g.lineTo(0, H); g.closePath(); g.fill();
  if (!aqDecor) aqDecor = aqBuildDecor();
  for (const p of aqDecor.pebbles) { g.fillStyle = night ? 'rgba(50,50,70,.9)' : p.c; g.beginPath(); g.ellipse(p.x, floor + 4 + p.y * (H - floor - 8), p.s * 1.3, p.s, 0, 0, 6.283); g.fill(); }
  if (aqCfg.decor) {
    for (const r of aqDecor.rocks) { const y = floor + 6, gr = g.createLinearGradient(0, y - r.h, 0, y); gr.addColorStop(0, night ? '#3a3f55' : '#8a8f99'); gr.addColorStop(1, night ? '#161826' : '#4c505a'); g.fillStyle = gr; g.beginPath(); g.moveTo(r.x - r.w / 2, y); g.quadraticCurveTo(r.x - r.w * 0.35, y - r.h, r.x, y - r.h * 0.92); g.quadraticCurveTo(r.x + r.w * 0.4, y - r.h * 1.05, r.x + r.w / 2, y); g.closePath(); g.fill(); }
    for (const c of aqDecor.coral) for (let i = 0; i < c.n; i++) { const a = -Math.PI / 2 + (i - (c.n - 1) / 2) * 0.32, len = 55 + (i % 3) * 22, x0 = c.x, y0 = floor + 6, sway = Math.sin(t * 0.8 + i) * 3; g.strokeStyle = night ? 'rgba(120,70,100,.9)' : c.c; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * len + sway, y0 + Math.sin(a) * len); g.stroke(); g.fillStyle = night ? '#a0709a' : '#fff1f5'; g.beginPath(); g.arc(x0 + Math.cos(a) * len + sway, y0 + Math.sin(a) * len, 5, 0, 6.283); g.fill(); }
    // the treasure chest opens now and then and lets bubbles out
    const cx = 185, cy = floor + 8, open = aqNext > 0 ? Math.min(1, Math.min(aqNext, 2.2 - aqNext) * 3) : 0;
    g.fillStyle = night ? '#3a2a1c' : '#8a5a2c'; g.fillRect(cx - 34, cy - 30, 68, 30); g.fillStyle = '#e0b44a'; g.fillRect(cx - 34, cy - 18, 68, 5); g.fillRect(cx - 4, cy - 22, 8, 12);
    g.save(); g.translate(cx - 34, cy - 30); g.rotate(-open * 0.85); g.fillStyle = night ? '#4a331f' : '#a06a34'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(34, -34, 68, 0); g.closePath(); g.fill(); g.restore();
    if (open > 0) { g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(cx, cy - 34, 0, cx, cy - 34, 70); gg.addColorStop(0, `rgba(255,220,120,${0.5 * open})`); gg.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gg; g.fillRect(cx - 80, cy - 110, 160, 130); g.globalCompositeOperation = 'source-over'; }
    // the air stone and its pump
    g.fillStyle = night ? '#2a2f3a' : '#9aa2ad'; g.beginPath(); g.ellipse(520, floor + 4, 14, 6, 0, 0, 6.283); g.fill(); g.strokeStyle = night ? '#242a34' : '#6f7782'; g.lineWidth = 3; g.beginPath(); g.moveTo(534, floor + 2); g.bezierCurveTo(580, floor - 20, 620, floor + 10, 700, floor - 4); g.stroke();
    // kelp swaying
    for (const k of aqDecor.kelp) { g.strokeStyle = night ? '#16402a' : k.c; g.lineWidth = k.w; g.lineCap = 'round'; g.beginPath(); g.moveTo(k.x, floor + 6); for (let s = 1; s <= 8; s++) { const y = floor + 6 - k.h * s / 8; g.lineTo(k.x + Math.sin(t * 0.9 + k.ph + s * 0.55) * 7 * s / 2, y); } g.stroke(); }
  }
  // dancing light on the sand
  if (!night) { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { const x = (i * 83 + Math.sin(t * 0.6 + i) * 30 + 40) % AQ.W; g.fillStyle = `rgba(255,255,210,${0.05 + 0.04 * Math.sin(t * 1.3 + i * 2)})`; g.beginPath(); g.ellipse(x, floor + 8 + (i % 4) * 8, 36, 5, 0, 0, 6.283); g.fill(); } g.globalCompositeOperation = 'source-over'; }
  // the surface
  g.fillStyle = night ? 'rgba(120,160,255,.12)' : 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(AQ.W, 0); for (let x = AQ.W; x >= 0; x -= 20) g.lineTo(x, 12 + Math.sin(x * 0.03 + t * 1.2) * 3 + Math.sin(x * 0.011 - t * 0.7) * 3); g.closePath(); g.fill();
}
function aqDrawFeeder(g) {
  const p = AQ.feederPos(), y = p.y, shake = aqFeedT > 0 ? Math.sin(aqFeedT * 40) * 2 : 0;
  g.fillStyle = '#d9dde3'; g.fillRect(p.x - 34, 0, 68, y - 4); g.fillStyle = '#9aa2ad'; g.fillRect(p.x - 34, y - 14, 68, 6); g.fillStyle = '#c0392b'; g.fillRect(p.x - 18 + shake, y - 4, 36, 12);
  g.fillStyle = '#2d3138'; g.fillRect(p.x - 18, y + 8, 36, 4); g.fillStyle = 'rgba(0,0,0,.5)'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('FEED', p.x, y - 24);
}
function aqDrawFood(g) {
  for (const f of aqFood) { const fade = f.rest > 30 ? 1 - (f.rest - 30) / 10 : 1; g.globalAlpha = Math.max(0, fade); if (f.kind === 'pellet') { g.fillStyle = '#7a4a22'; g.beginPath(); g.arc(f.x, f.y, 4, 0, 6.283); g.fill(); g.fillStyle = '#b4763a'; g.beginPath(); g.arc(f.x - 1, f.y - 1, 1.6, 0, 6.283); g.fill(); } else { g.fillStyle = f.rest > 0 ? '#c88a4a' : ['#f5c542', '#e8873a', '#e86a6a'][(f.ph * 3 | 0) % 3]; g.beginPath(); g.ellipse(f.x, f.y, 3.6, 2.2, f.ph, 0, 6.283); g.fill(); } }
  g.globalAlpha = 1;
}
function aqDrawBubbles(g) {
  for (const b of aqBubbles) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, Math.max(0.6, b.r * 0.25), 0, 6.283); g.fill(); }
}

// one creature, facing right, drawn around (0, 0); the caller flips it
function aqDrawCreature(g, f, sp, night, t) {
  const L = sp.size, k = sp.look, ph = f.phase, wag = Math.sin(ph * 2.2) * 0.12;
  const grad = (y0, y1, c0, c1, mid) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); if (mid) gr.addColorStop(0.5, mid); gr.addColorStop(1, c1); return gr; };
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (sp.kind === 'fish') {
    const hh = L * k.h * 0.5, bl = L * 0.42;
    // tail
    g.save(); g.translate(-bl * 0.9, 0); g.rotate(wag); g.fillStyle = k.fin;
    g.beginPath();
    if (k.tail === 'fork') { g.moveTo(0, 0); g.lineTo(-L * 0.26, -hh * 0.95); g.lineTo(-L * 0.16, 0); g.lineTo(-L * 0.26, hh * 0.95); }
    else if (k.tail === 'round') { g.moveTo(0, 0); g.quadraticCurveTo(-L * 0.12, -hh * 0.9, -L * 0.24, -hh * 0.5); g.lineTo(-L * 0.24, hh * 0.5); g.quadraticCurveTo(-L * 0.12, hh * 0.9, 0, 0); }
    else if (k.tail === 'flow') { g.moveTo(0, 0); g.bezierCurveTo(-L * 0.2, -hh * 1.8, -L * 0.45 + Math.sin(ph * 2) * 4, -hh * 1.4, -L * 0.55, 0); g.bezierCurveTo(-L * 0.45 + Math.sin(ph * 2 + 1) * 4, hh * 1.4, -L * 0.2, hh * 1.8, 0, 0); }
    else { g.moveTo(0, 0); g.bezierCurveTo(-L * 0.12, -hh * 1.3, -L * 0.3, -hh * 1.1, -L * 0.3, 0); g.bezierCurveTo(-L * 0.3, hh * 1.1, -L * 0.12, hh * 1.3, 0, 0); }
    g.closePath(); g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1; g.restore();
    // fins
    g.fillStyle = k.fin; g.globalAlpha = 0.9; g.beginPath(); const dh = k.tall ? hh * 1.5 : hh * 0.75; g.moveTo(bl * 0.4, -hh * 0.85); g.quadraticCurveTo(0, -hh - dh, -bl * 0.55, -hh * 0.7); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(bl * 0.1, hh * 0.8); g.quadraticCurveTo(-bl * 0.2, hh + (k.tall ? hh * 1.1 : hh * 0.45), -bl * 0.5, hh * 0.6); g.closePath(); g.fill(); g.globalAlpha = 1;
    // body
    g.fillStyle = grad(-hh, hh, k.body, k.belly, k.body); g.beginPath(); g.ellipse(0, 0, bl, hh, 0, 0, 6.283); g.fill();
    g.save(); g.beginPath(); g.ellipse(0, 0, bl, hh, 0, 0, 6.283); g.clip();
    if (k.pattern === 'bands') { for (const x of [0.28, -0.08, -0.4]) { g.fillStyle = '#16120f'; g.fillRect(bl * x - 6, -hh, 12, hh * 2); g.fillStyle = k.accent; g.fillRect(bl * x - 3.5, -hh, 7, hh * 2); } }
    else if (k.pattern === 'tang') { g.fillStyle = k.accent; g.beginPath(); g.moveTo(bl * 0.5, -hh * 0.1); g.bezierCurveTo(bl * 0.1, -hh * 1.05, -bl * 0.5, -hh * 0.9, -bl, -hh * 0.2); g.bezierCurveTo(-bl * 0.4, -hh * 0.5, bl * 0.1, 0, bl * 0.5, -hh * 0.1); g.fill(); }
    else if (k.pattern === 'bars') { g.fillStyle = k.accent; for (const x of [0.15, -0.3]) { g.globalAlpha = 0.8; g.fillRect(bl * x - 5, -hh, 10, hh * 2); } g.globalAlpha = 1; }
    else if (k.pattern === 'neon') { g.fillStyle = k.accent; g.fillRect(-bl, -hh * 0.12, bl * 1.7, hh * 0.28); g.fillStyle = k.accent2; g.fillRect(-bl, hh * 0.2, bl * 1.1, hh * 0.5); }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(bl * 0.1, -hh * 0.45, bl * 0.55, hh * 0.22, 0, 0, 6.283); g.fill();
    g.fillStyle = k.fin; g.beginPath(); g.moveTo(bl * 0.25, hh * 0.1); g.lineTo(-bl * 0.1, hh * 0.15 + Math.sin(ph * 3) * 3); g.lineTo(bl * 0.0, hh * 0.5); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(bl * 0.62, -hh * 0.2, Math.max(2.5, L * 0.065), 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(bl * 0.65, -hh * 0.2, Math.max(1.4, L * 0.035), 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(bl * 0.88, hh * 0.1, 3, 0.2, 1.8); g.stroke();
  } else if (sp.kind === 'puffer') {
    const inf = f.puff > 0 ? Math.min(1, f.puff) : 0, R = L * 0.36 * (1 + inf * 0.4);
    g.fillStyle = k.fin; g.save(); g.translate(-R * 0.95, 0); g.rotate(wag); g.beginPath(); g.moveTo(0, 0); g.lineTo(-L * 0.18, -R * 0.55); g.lineTo(-L * 0.18, R * 0.55); g.closePath(); g.fill(); g.restore();
    g.fillStyle = grad(-R, R, k.body, k.belly, k.body); g.beginPath(); g.ellipse(0, 0, R * 1.08, R, 0, 0, 6.283); g.fill();
    g.fillStyle = k.spots; for (const [x, y] of [[-0.3, -0.5], [0.1, -0.62], [-0.55, -0.1], [-0.1, -0.25], [0.3, -0.35]]) { g.beginPath(); g.arc(R * x, R * y, R * 0.07, 0, 6.283); g.fill(); }
    if (inf > 0.2) { g.strokeStyle = '#8a6a1a'; g.lineWidth = 2; for (let a = 0; a < 16; a++) { const an = a / 16 * 6.283; g.beginPath(); g.moveTo(Math.cos(an) * R * 1.05, Math.sin(an) * R); g.lineTo(Math.cos(an) * R * 1.3, Math.sin(an) * R * 1.22); g.stroke(); } }
    g.fillStyle = k.fin; g.beginPath(); g.ellipse(-R * 0.05, R * 0.2, R * 0.28, R * 0.14, 0.6 + Math.sin(ph * 4) * 0.4, 0, 6.283); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(R * 0.55, -R * 0.2, R * 0.2, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(R * 0.6, -R * 0.2, R * 0.1, 0, 6.283); g.fill();
    g.strokeStyle = '#6a4a10'; g.lineWidth = 2; g.beginPath(); g.arc(R * 1.0, R * 0.12, R * 0.08, 0, 6.283); g.stroke();
  } else if (sp.kind === 'shark') {
    const bl = L * 0.5, hh = L * 0.1, tw = Math.sin(ph * 1.3) * L * 0.025;
    g.fillStyle = k.fin; g.beginPath(); g.moveTo(-bl * 0.78, tw); g.lineTo(-bl * 1.1 + tw, -hh * 2.1); g.quadraticCurveTo(-bl * 0.95, -hh * 0.6, -bl * 0.88 + tw, tw); g.quadraticCurveTo(-bl * 0.95, hh * 0.9, -bl * 1.0 + tw, hh * 1.1); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(bl * 0.05, -hh * 0.7); g.quadraticCurveTo(-bl * 0.05, -hh * 3, -bl * 0.3, -hh * 0.65); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(bl * 0.18, hh * 0.5); g.quadraticCurveTo(-bl * 0.1, hh * 2.3 + Math.sin(ph * 2) * 3, -bl * 0.24, hh * 0.7); g.closePath(); g.fill();
    const body = () => { g.beginPath(); g.moveTo(bl, hh * 0.1); g.quadraticCurveTo(bl * 0.6, -hh * 1.05, bl * 0.1, -hh * 1.05); g.quadraticCurveTo(-bl * 0.5, -hh * 0.9, -bl * 0.82, tw); g.quadraticCurveTo(-bl * 0.5, hh * 0.9, bl * 0.1, hh * 1.0); g.quadraticCurveTo(bl * 0.62, hh * 0.9, bl, hh * 0.1); g.closePath(); };
    const gr = g.createLinearGradient(0, -hh, 0, hh); gr.addColorStop(0, k.body); gr.addColorStop(0.55, k.body); gr.addColorStop(0.62, k.belly); gr.addColorStop(1, k.belly); g.fillStyle = gr; body(); g.fill();
    if (k.hammer) { g.fillStyle = k.body; g.beginPath(); g.moveTo(bl * 0.72, -hh * 0.5); g.lineTo(bl * 0.84, -L * 0.2); g.lineTo(bl * 0.95, -L * 0.2); g.lineTo(bl * 0.95, L * 0.2); g.lineTo(bl * 0.84, L * 0.2); g.lineTo(bl * 0.72, hh * 0.5); g.closePath(); g.fill(); g.fillStyle = '#fff'; for (const y of [-L * 0.19, L * 0.19]) { g.beginPath(); g.arc(bl * 0.88, y, L * 0.016, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(bl * 0.89, y, L * 0.008, 0, 6.283); g.fill(); g.fillStyle = '#fff'; } }
    else { g.fillStyle = '#111'; g.beginPath(); g.arc(bl * 0.7, -hh * 0.25, L * 0.011, 0, 6.283); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(bl * (0.36 - i * 0.05), -hh * 0.5); g.lineTo(bl * (0.33 - i * 0.05), hh * 0.35); g.stroke(); }
    g.beginPath(); g.moveTo(bl * 0.82, hh * 0.35); g.quadraticCurveTo(bl * 0.7, hh * 0.55, bl * 0.58, hh * 0.4); g.stroke();
  } else if (sp.kind === 'ray') {
    const wing = L * 0.4, fl = Math.sin(ph * 1.6);
    g.strokeStyle = k.fin; g.lineWidth = 3; g.beginPath(); g.moveTo(-L * 0.4, 0); for (let i = 1; i <= 8; i++) g.lineTo(-L * 0.4 - L * 0.6 * i / 8, Math.sin(ph * 2 - i * 0.6) * 5 * i / 8); g.stroke();
    g.fillStyle = grad(-wing, wing, k.body, k.belly, k.body); g.beginPath(); g.moveTo(L * 0.5, 0); g.quadraticCurveTo(L * 0.25, -wing * (0.5 + 0.1 * fl), -L * 0.08, -wing * (1 + 0.28 * fl)); g.quadraticCurveTo(-L * 0.2, -wing * 0.4, -L * 0.4, 0); g.quadraticCurveTo(-L * 0.2, wing * 0.4, -L * 0.08, wing * (1 + 0.28 * fl)); g.quadraticCurveTo(L * 0.25, wing * (0.5 + 0.1 * fl), L * 0.5, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; for (const [x, y] of [[0.0, -0.1], [-0.1, 0.12], [0.12, 0.05], [-0.2, -0.05]]) { g.beginPath(); g.arc(L * x, L * y, L * 0.018, 0, 6.283); g.fill(); }
    g.fillStyle = '#fff'; for (const y of [-0.06, 0.06]) { g.beginPath(); g.arc(L * 0.3, L * y, L * 0.022, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(L * 0.31, L * y, L * 0.011, 0, 6.283); g.fill(); g.fillStyle = '#fff'; }
  } else if (sp.kind === 'jelly') {
    const pulse = 0.5 + 0.5 * Math.sin(ph * 1.4), bw = L * (0.5 - pulse * 0.07), bh = L * (0.34 + pulse * 0.06), glow = night ? 1 : 0.5;
    for (let i = 0; i < 9; i++) { const x = (i - 4) / 4 * bw * 0.85; g.strokeStyle = `rgba(230,220,255,${0.3 + 0.2 * (i % 2)})`; g.lineWidth = i % 3 === 0 ? 3 : 1.6; g.beginPath(); g.moveTo(x, 0); for (let s = 1; s <= 8; s++) g.lineTo(x + Math.sin(ph * 1.2 - s * 0.7 + i) * 6 * s / 3, s * L * (0.07 + (i % 3) * 0.015)); g.stroke(); }
    const gr = g.createRadialGradient(0, -bh * 0.3, bh * 0.1, 0, 0, bw); gr.addColorStop(0, `rgba(220,205,255,${0.75})`); gr.addColorStop(1, `rgba(160,130,255,${0.35})`); g.fillStyle = gr; g.beginPath(); g.moveTo(-bw, 0); g.bezierCurveTo(-bw, -bh * 1.5, bw, -bh * 1.5, bw, 0); g.quadraticCurveTo(0, bh * 0.25 + pulse * 5, -bw, 0); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = 'rgba(255,200,255,.45)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -bh * 0.35, bw * 0.4, bh * 0.22, 0, 0, 6.283); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(0, -bh * 0.3, 0, 0, -bh * 0.3, bw * 1.5); gl.addColorStop(0, `rgba(180,150,255,${0.28 * glow})`); gl.addColorStop(1, 'rgba(180,150,255,0)'); g.fillStyle = gl; g.fillRect(-bw * 1.6, -bw * 1.6, bw * 3.2, bw * 3.2); g.restore();
  } else if (sp.kind === 'seahorse') {
    const u = L * 0.5; g.fillStyle = k.fin; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(-u * 0.22, -u * 0.05, u * 0.1, u * 0.28 + Math.sin(ph * 5) * 2, 0.2, 0, 6.283); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = k.body; g.lineWidth = u * 0.34; const sway = Math.sin(ph * 0.9) * 2;
    g.beginPath(); g.moveTo(u * 0.1, -u * 0.8); g.quadraticCurveTo(u * 0.22, -u * 0.3, 0, u * 0.1); g.quadraticCurveTo(-u * 0.2 + sway, u * 0.55, -u * 0.05, u * 0.8); g.stroke();
    g.lineWidth = u * 0.14; g.beginPath(); g.moveTo(-u * 0.05, u * 0.8); g.bezierCurveTo(u * 0.2, u * 0.95, u * 0.4, u * 0.7, u * 0.25, u * 0.55); g.bezierCurveTo(u * 0.15, u * 0.5, u * 0.1, u * 0.62, u * 0.18, u * 0.66); g.stroke();
    g.lineWidth = u * 0.2; g.beginPath(); g.moveTo(u * 0.14, -u * 0.86); g.lineTo(u * 0.55, -u * 0.8); g.stroke();
    g.fillStyle = k.fin; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(u * 0.05 + i * 0.01, -u * 0.35 + i * u * 0.28, u * 0.05, 0, 6.283); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(u * 0.14, -u * 0.88, u * 0.08, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(u * 0.16, -u * 0.88, u * 0.04, 0, 6.283); g.fill();
  } else if (sp.kind === 'turtle') {
    const flap = Math.sin(ph * 1.3);
    g.fillStyle = k.fin; g.save(); g.translate(-L * 0.1, L * 0.12); g.rotate(0.5 + flap * 0.6); g.beginPath(); g.ellipse(L * 0.12, 0, L * 0.2, L * 0.06, 0, 0, 6.283); g.fill(); g.restore();
    g.beginPath(); g.ellipse(-L * 0.36, L * 0.1 + flap * 3, L * 0.09, L * 0.04, 0.4, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(-L * 0.4, 0); g.lineTo(-L * 0.52, L * 0.05); g.lineTo(-L * 0.4, L * 0.07); g.fill();
    g.fillStyle = k.body; g.beginPath(); g.ellipse(L * 0.42, -L * 0.04, L * 0.12, L * 0.09, 0.2, 0, 6.283); g.fill();
    g.fillStyle = k.belly; g.beginPath(); g.ellipse(0, L * 0.05, L * 0.34, L * 0.1, 0, 0, 6.283); g.fill();
    const sh = g.createRadialGradient(-L * 0.05, -L * 0.18, L * 0.04, 0, -L * 0.05, L * 0.34); sh.addColorStop(0, '#9a8a3a'); sh.addColorStop(1, k.shell); g.fillStyle = sh; g.beginPath(); g.moveTo(-L * 0.36, L * 0.04); g.bezierCurveTo(-L * 0.3, -L * 0.34, L * 0.3, -L * 0.34, L * 0.36, L * 0.04); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,30,10,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-L * 0.12, -L * 0.25); g.lineTo(-L * 0.14, L * 0.03); g.moveTo(L * 0.12, -L * 0.25); g.lineTo(L * 0.14, L * 0.03); g.moveTo(-L * 0.28, -L * 0.1); g.lineTo(L * 0.28, -L * 0.1); g.stroke();
    g.fillStyle = k.fin; g.save(); g.translate(L * 0.14, L * 0.08); g.rotate(-0.4 - flap * 0.7); g.beginPath(); g.ellipse(L * 0.14, 0, L * 0.22, L * 0.06, 0, 0, 6.283); g.fill(); g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(L * 0.46, -L * 0.07, L * 0.03, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(L * 0.47, -L * 0.07, L * 0.015, 0, 6.283); g.fill();
  } else if (sp.kind === 'crab') {
    const lg = f.phase * 3;
    g.strokeStyle = k.fin; g.lineWidth = 3.2; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = (i - 1) * L * 0.2, sw = Math.sin(lg + i * 2 + (s > 0 ? 1.5 : 0)) * 3; g.beginPath(); g.moveTo(x, L * 0.02); g.lineTo(x + s * L * 0.2, L * 0.12 + sw); g.lineTo(x + s * L * 0.26, L * 0.28); g.stroke(); }
    g.fillStyle = k.body; g.beginPath(); g.ellipse(0, 0, L * 0.4, L * 0.24, 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(0, -L * 0.07, L * 0.3, L * 0.1, 0, 0, 6.283); g.fill();
    for (const s of [-1, 1]) { const o = Math.sin(f.phase * 2 + s) * 3; g.strokeStyle = k.body; g.lineWidth = 5; g.beginPath(); g.moveTo(s * L * 0.3, -L * 0.1); g.lineTo(s * L * 0.46, -L * 0.3 + o); g.stroke(); g.fillStyle = k.fin; g.beginPath(); g.arc(s * L * 0.5, -L * 0.36 + o, L * 0.13, 0, 6.283); g.fill(); g.fillStyle = '#7a1a0a'; g.beginPath(); g.moveTo(s * L * 0.5, -L * 0.36 + o); g.lineTo(s * L * 0.6, -L * 0.48 + o); g.lineTo(s * L * 0.46, -L * 0.48 + o); g.closePath(); g.fill(); g.strokeStyle = k.body; g.lineWidth = 2; g.beginPath(); g.moveTo(s * L * 0.1, -L * 0.2); g.lineTo(s * L * 0.1, -L * 0.3); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * L * 0.1, -L * 0.32, L * 0.05, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(s * L * 0.1, -L * 0.32, L * 0.025, 0, 6.283); g.fill(); }
  } else if (sp.kind === 'star') {
    const R = L * 0.5 * (1 + 0.03 * Math.sin(ph)); g.fillStyle = k.body; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.42 : R, a = -Math.PI / 2 + i * Math.PI / 5; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.9); } g.closePath(); g.fill(); g.strokeStyle = k.body; g.lineWidth = 3; g.stroke();
    g.fillStyle = k.fin; for (let i = 0; i < 5; i++) for (let j = 1; j < 4; j++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; g.beginPath(); g.arc(Math.cos(a) * R * 0.25 * j, Math.sin(a) * R * 0.25 * j * 0.9, 2, 0, 6.283); g.fill(); }
  }
}
function aqDrawFish(g, night) {
  const order = aqFish.slice().sort((a, b) => AQ.bySp(a.sp).size - AQ.bySp(b.sp).size);
  for (const f of order) {
    const sp = AQ.bySp(f.sp); g.save(); g.translate(f.x, f.y);
    const tilt = sp.kind === 'seahorse' || sp.kind === 'star' || sp.kind === 'crab' || sp.kind === 'jelly' ? 0 : AQ.clamp(f.vy / (sp.speed * 3 + 1), -0.5, 0.5) * f.dir;
    g.scale(sp.kind === 'crab' || sp.kind === 'star' || sp.kind === 'jelly' ? 1 : f.dir, 1); g.rotate(tilt);
    if (night) g.globalAlpha = 0.97;
    aqDrawCreature(g, f, sp, night, aqT); g.restore();
    if (f.happy > 0 && aqRnd() < 0.02) aqBubble(f.x + f.dir * sp.size * 0.45, f.y - 6, 1.5);
    const show = aqSel === f || aqCfg.tags;
    if (show) { g.save(); g.font = '600 13px system-ui, sans-serif'; g.textAlign = 'center'; const label = f.name, tw = g.measureText(label).width + 14, ly = f.y - sp.size * 0.5 - (sp.kind === 'shark' ? 16 : 22); g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect ? g.roundRect(f.x - tw / 2, ly - 12, tw, 20, 10) : g.rect(f.x - tw / 2, ly - 12, tw, 20); g.fill(); g.fillStyle = '#fff'; g.fillText(label, f.x, ly + 3); g.restore(); }
    if (aqSel === f) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.ellipse(f.x, f.y, sp.size * 0.62, Math.max(26, sp.size * 0.4), 0, 0, 6.283); g.stroke(); g.setLineDash([]); }
  }
}
function aqDraw(g, w, h, isFull) {
  const sc = w / AQ.W, Hn = h / sc; if (!Viewer.isOpen() || isFull) aqH = Hn;
  g.save(); g.scale(sc, sc); const night = aqCfg.night;
  aqDrawTank(g, w, h, night); aqDrawFeeder(g); aqDrawFood(g); aqDrawFish(g, night); aqDrawBubbles(g);
  // plankton drifting in the light
  g.fillStyle = night ? 'rgba(140,180,255,.35)' : 'rgba(255,255,255,.4)'; for (const m of aqMotes || []) { g.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(aqT * 0.7 + m.ph)); g.beginPath(); g.arc(m.x * AQ.W, m.y * aqH, m.r, 0, 6.283); g.fill(); } g.globalAlpha = 1;
  if (night) { g.fillStyle = 'rgba(2,6,20,.35)'; g.fillRect(0, 0, AQ.W, aqH); g.globalCompositeOperation = 'lighter'; const mg = g.createRadialGradient(AQ.W * 0.78, 0, 10, AQ.W * 0.78, 0, aqH * 0.9); mg.addColorStop(0, 'rgba(150,180,255,.18)'); mg.addColorStop(1, 'rgba(150,180,255,0)'); g.fillStyle = mg; g.fillRect(0, 0, AQ.W, aqH); g.globalCompositeOperation = 'source-over'; }
  if (!aqFish.length) { g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('The tank is empty.', AQ.W / 2, aqH * 0.42); g.font = '18px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('Open Add fish below and pick someone to live here.', AQ.W / 2, aqH * 0.42 + 34); }
  g.restore();
  // glass: a faint reflection and darker edges
  const v = g.createLinearGradient(0, 0, w, h); v.addColorStop(0, 'rgba(255,255,255,.07)'); v.addColorStop(0.18, 'rgba(255,255,255,0)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  const e = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = e; g.fillRect(0, 0, w, h);
}

/* ---------- sound ---------- */
function aqSetupSound(canvas) {
  aqAmb = Viewer.ambience('as.aquarium.sound', () => canvas.isConnected); const a = aqAmb;
  const hum = a.loop('brown', 'lowpass', 160, 0.7, 0.3), flow = a.loop('white', 'lowpass', 600, 0.6, 0.02), hiss = a.loop('white', 'bandpass', 2400, 1.2, 0.0025);
  a.every(0.05, 0.12, () => { if (!a.ctx || !flow) return; const k = performance.now() / 1000, t = a.ctx.currentTime; flow.gain.gain.setTargetAtTime(0.02 + 0.014 * Math.sin(k * 0.4) + 0.008 * Math.sin(k * 1.1), t, 0.4); flow.filter.frequency.setTargetAtTime(520 + 160 * Math.sin(k * 0.23), t, 0.4); hum.gain.gain.setTargetAtTime(aqCfg.night ? 0.22 : 0.3, t, 0.5); hiss.gain.gain.setTargetAtTime(0.002 + 0.0015 * Math.sin(k * 0.8), t, 0.5); });
  a.every(0.2, 1.1, () => { if (aqPaused) return; const n = 1 + (aqRnd() * 3 | 0), p = 350 + aqRnd() * 450; for (let i = 0; i < n; i++) setTimeout(() => a.blip(p + i * 90, p * 2 + i * 150, 0.05 + aqRnd() * 0.07, 0.04 + aqRnd() * 0.05), i * 70); });
  a.every(9, 22, () => { if (aqFish.some(f => AQ.bySp(f.sp).predator)) a.blip(70, 55, 1.4, 0.06); else if (aqFish.length) a.blip(260, 180, 0.5, 0.025); });
  return a;
}

/* ---------- the page ---------- */
function aquariumView(acct, ctx, back) {
  if (!aqCfg) { aqCfg = aqLoadCfg(); aqPaused = Viewer.reduced(); }
  if (!aqFish) { aqFish = aqLoadList().map(s => AQ.makeFish(s.sp, aqRnd, aqH, s)).filter(Boolean); aqFood = []; aqBubbles = []; }
  aqSel = null; aqUi = null;
  const canvas = h('canvas', { class: 'vw-canvas', role: 'img', 'aria-label': 'A fish tank. ' + (aqFish.length ? aqFish.length + ' fish swimming.' : 'It is empty.') });
  const draw = (g, w, hh) => aqDraw(g, w, hh, false); Viewer.run(canvas, aqAdvance, draw);
  const tap = (x, y, w) => {
    const sc = w / AQ.W, wx = x / sc, wy = y / sc, fp = AQ.feederPos();
    if (Math.abs(wx - fp.x) < 44 && wy < fp.y + 24) { aqFeed('flake'); return; }
    const hit = AQ.pick(aqFish, wx, wy);
    if (hit) { aqSel = hit; aqTab = 'sel'; if (aqUi) aqUi.refresh(); return; }
    AQ.startle(aqFish, wx, wy, aqRnd); if (aqAmb) aqAmb.burst(1200, 1, 0.05, 0.25); for (let i = 0; i < 3; i++) aqBubble(wx + (aqRnd() - 0.5) * 30, wy, 1.5 + aqRnd() * 2);
    if (aqSel) { aqSel = null; if (aqUi) aqUi.refresh(); }
  };
  Viewer.pointer(canvas, tap);
  const status = h('span', { class: 'fine', role: 'status' }, ''); let say = '';
  const body = h('div', { class: 'aq-body' });
  const info = h('div', { class: 'aq-info' });
  const tabBtn = (id, label) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(aqTab === id), onclick: () => { aqTab = id; refresh(); } }, label);
  const tabs = h('div', { class: 'aq-tabs', role: 'tablist' });
  const add = id => {
    if (aqFish.length >= AQ.MAX_FISH) { say = `The tank is full (${AQ.MAX_FISH} is plenty).`; status.textContent = say; return; }
    const f = AQ.makeFish(id, aqRnd, aqH); const sp = AQ.bySp(id); f.x = aqRnd() < 0.5 ? 30 : AQ.W - 30; f.dir = f.x < 500 ? 1 : -1; f.vx = f.dir * sp.speed; if (sp.kind === 'jelly') f.y = 60; aqFish.push(f); aqSave();
    for (let i = 0; i < 5; i++) aqBubble(f.x + (aqRnd() - 0.5) * 20, f.y + (aqRnd() - 0.5) * 20, 2 + aqRnd() * 3); if (aqAmb) { aqAmb.burst(700, 0.7, 0.15, 0.25, 'lowpass'); aqAmb.blip(200, 420, 0.12, 0.08); }
    status.textContent = `${f.name} the ${sp.name.toLowerCase()} joined the tank.`; refresh(); canvas.setAttribute('aria-label', 'A fish tank. ' + aqFish.length + ' fish swimming.');
  };
  const remove = f => { const i = aqFish.indexOf(f); if (i >= 0) aqFish.splice(i, 1); if (aqSel === f) aqSel = null; aqSave(); status.textContent = `${f.name} was moved to a bigger tank.`; refresh(); };
  const preview = (sp) => { const c = h('canvas', { width: 216, height: 120 }); const g = c.getContext('2d'); const sc = Math.min(2.8, 170 / (sp.kind === 'ray' ? sp.size * 1.4 : sp.size), 100 / (sp.kind === 'seahorse' || sp.kind === 'jelly' ? sp.size * 0.9 : 60)); g.translate(108, 60); g.scale(sc * 0.92, sc * 0.92); aqDrawCreature(g, { phase: 0.6, puff: 0, happy: 0, dir: 1, vy: 0 }, sp, false, 0); return c; };
  function refresh() {
    tabs.replaceChildren(tabBtn('add', 'Add fish'), tabBtn('tank', `In the tank (${aqFish.length})`), tabBtn('opts', 'Options'));
    info.replaceChildren();
    if (aqSel && aqFish.includes(aqSel)) {
      const f = aqSel, sp = AQ.bySp(f.sp), name = h('input', { value: f.name, maxlength: 24, 'aria-label': 'Name', oninput: e => { f.name = e.target.value.slice(0, 24); }, onchange: () => aqSave() });
      info.append(h('b', {}, sp.name), name, h('span', { class: 'fine' }, `${f.meals} ${f.meals === 1 ? 'meal' : 'meals'} eaten`), h('button', { class: 'btn', onclick: () => remove(f) }, 'Remove'), h('button', { class: 'btn', onclick: () => { aqSel = null; refresh(); } }, 'Done'));
    }
    if (aqTab === 'add') body.replaceChildren(h('div', { class: 'aq-species' }, AQ.SPECIES.map(sp => h('button', { class: 'aq-card', type: 'button', onclick: () => add(sp.id), 'aria-label': `Add a ${sp.name}` }, preview(sp), h('b', {}, sp.name), h('small', {}, sp.note)))));
    else if (aqTab === 'tank' || aqTab === 'sel') {
      if (aqTab === 'sel') aqTab = 'tank'; tabs.replaceChildren(tabBtn('add', 'Add fish'), tabBtn('tank', `In the tank (${aqFish.length})`), tabBtn('opts', 'Options'));
      body.replaceChildren(aqFish.length ? h('div', { class: 'aq-list' }, aqFish.map(f => h('div', { class: 'aq-row' + (aqSel === f ? ' on' : '') }, h('span', {}, `${f.name}, ${AQ.bySp(f.sp).name.toLowerCase()} · ${f.meals} meals`), h('button', { class: 'btn', onclick: () => { aqSel = f; refresh(); } }, 'Select'), h('button', { class: 'btn', 'aria-label': `Remove ${f.name}`, onclick: () => remove(f) }, 'Remove')))) : h('p', { class: 'muted' }, 'Nothing here yet. Add fish and they will show up in this list.'));
    } else {
      let sure = false; const empty = h('button', { class: 'btn', onclick: e => { if (!sure) { sure = true; e.currentTarget.textContent = 'Really empty the tank?'; setTimeout(() => { sure = false; empty.textContent = 'Empty the tank'; }, 3000); return; } aqFish.length = 0; aqFood.length = 0; aqSel = null; aqSave(); status.textContent = 'The tank is empty again.'; refresh(); } }, 'Empty the tank');
      const chk = (label, key, extra) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: aqCfg[key], onchange: e => { aqCfg[key] = e.target.checked; aqStoreCfg(); if (extra) extra(); } }), ' ' + label);
      const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: String(aqAmb.vol), 'aria-label': 'Volume', oninput: e => aqAmb.set(undefined, Number(e.target.value)) });
      body.replaceChildren(h('div', { class: 'mx-opts' }, chk('Night mode', 'night'), chk('Decorations (plants, rocks, treasure chest, air stone)', 'decor'), chk('Always show name tags', 'tags'), chk('Automatic feeder (a pinch of flakes every 90 seconds while this is open)', 'auto'),
        h('div', { class: 'vw-snd' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: aqAmb.on, onchange: e => aqAmb.set(e.target.checked) }), ' Ambient sound'), vol), h('div', { class: 'btnrow' }, empty)));
    }
  }
  aqUi = { say: m => { status.textContent = m; }, refresh };
  const amb = aqSetupSound(canvas);
  const pause = h('button', { class: 'btn', 'aria-pressed': String(aqPaused), onclick: e => { aqPaused = !aqPaused; e.currentTarget.textContent = aqPaused ? 'Play' : 'Pause'; e.currentTarget.setAttribute('aria-pressed', String(aqPaused)); } }, aqPaused ? 'Play' : 'Pause');
  const night = h('button', { class: 'btn', onclick: e => { aqCfg.night = !aqCfg.night; aqStoreCfg(); e.currentTarget.textContent = aqCfg.night ? 'Day' : 'Night'; } }, aqCfg.night ? 'Day' : 'Night');
  const full = () => Viewer.fullscreen('Aquarium', aqAdvance, (g, w, hh) => aqDraw(g, w, hh, true), { onPointer: tap, hint: 'Tap a fish to pick it. Tap the glass to startle them.', extra: h('div', { class: 'vw-bar' }, h('button', { class: 'btn primary', onclick: () => aqFeed('flake') }, 'Feed'), h('button', { class: 'btn', onclick: () => aqFeed('pellet') }, 'Pellets'), h('button', { class: 'btn', onclick: () => { aqCfg.night = !aqCfg.night; aqStoreCfg(); } }, 'Day / night'), h('button', { class: 'btn', onclick: () => amb.set(!amb.on) }, 'Sound')) });
  refresh(); void say;
  return [back(appName(acct, 'aquarium')), h('div', { class: 'app-pad vw-wrap' }, h('div', { class: 'vw-stage aq-stage' }, canvas),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => aqFeed('flake') }, 'Feed'), h('button', { class: 'btn', onclick: () => aqFeed('pellet') }, 'Sinking pellets'), night, pause, h('button', { class: 'btn', onclick: full }, 'Full screen')),
    status, info, tabs, body,
    h('p', { class: 'fine' }, 'Tap a fish to pick it and rename it. Tap the glass and they dart away. Nobody gets eaten here, not even by the sharks.'))];
}

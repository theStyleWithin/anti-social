'use strict';
/* Lava Lamp: the pure part. Blobs of wax that heat up at the bottom, rise, cool at the top and sink again.
   Positions are in lamp-width units: x runs 0 to 1 across the glass, y runs 0 (top) to 1 (bottom) down the glass. */
const LavaCore = (() => {
  const ASPECT = 1.8;   // the glass is 1.8 widths tall
  // id, name, liquid at the top, liquid at the bottom, wax when cool, wax when hot
  const PALETTES = [
    ['classic', 'Classic', '#3a0d5e', '#16052b', '#ff5a1f', '#ffb347'],
    ['slime', 'Slime', '#06382a', '#021a14', '#7dff4a', '#d6ff7a'],
    ['ocean', 'Ocean', '#062a52', '#021024', '#37d5ff', '#a2f0ff'],
    ['gum', 'Bubblegum', '#3d0a3a', '#1b041b', '#ff5fd2', '#ffc2f0'],
    ['sun', 'Sunset', '#4a1a05', '#220a02', '#ffd23f', '#fff2a8'],
  ];
  const DEFAULTS = { palette: 'classic', speed: 1, blobs: 7, heat: 1, glow: true };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function normCfg(c) {
    const o = { ...DEFAULTS, ...(c && typeof c === 'object' ? c : {}) };
    if (!PALETTES.some(p => p[0] === o.palette)) o.palette = DEFAULTS.palette;
    o.speed = clamp(+o.speed || 1, 0.3, 3); o.blobs = Math.round(clamp(+o.blobs || 7, 3, 12)); o.heat = clamp(+o.heat || 1, 0.4, 2.5); o.glow = o.glow !== false;
    return o;
  }
  const halfWidth = y => 0.26 + 0.14 * clamp(y, 0, 1);   // the glass is narrow at the top and wide at the bottom
  const makeBlob = rnd => ({ x: 0.35 + rnd() * 0.3, y: rnd(), r: 0.075 + rnd() * 0.065, vx: 0, vy: 0, heat: rnd(), k: 0.6 + rnd() * 0.9 });
  const makeBlobs = (n, rnd) => Array.from({ length: n }, () => makeBlob(rnd));
  function resize(blobs, n, rnd) { while (blobs.length > n) blobs.pop(); while (blobs.length < n) blobs.push(makeBlob(rnd)); return blobs; }
  function step(blobs, dt, cfg, rnd) {
    for (const b of blobs) {
      const rY = b.r / ASPECT;
      if (b.y > 1 - rY * 2.4) b.heat += 0.45 * cfg.heat * (b.k || 1) * dt;        // the bulb is down here
      else if (b.y < 0.22) b.heat -= 0.55 * (b.k || 1) * dt;                       // cold up top
      else b.heat -= 0.05 * dt;
      b.heat = clamp(b.heat, 0, 1);
      b.vy += (0.5 - b.heat) * 0.12 * cfg.speed * dt;                 // warm wax rises, cool wax sinks
      b.vy *= Math.max(0, 1 - 0.9 * dt);
      b.vx += ((rnd() - 0.5) * 0.25 - (b.x - 0.5) * 0.12) * dt; b.vx *= Math.max(0, 1 - 1.2 * dt);
      b.x += b.vx * dt; b.y += b.vy * dt * cfg.speed;
      if (b.y > 1 - rY) { b.y = 1 - rY; b.vy = Math.min(0, b.vy); }
      if (b.y < rY) { b.y = rY; b.vy = Math.max(0, b.vy); }
      const lim = halfWidth(b.y) - b.r * 0.7; if (b.x < 0.5 - lim) { b.x = 0.5 - lim; b.vx = Math.abs(b.vx); } else if (b.x > 0.5 + lim) { b.x = 0.5 + lim; b.vx = -Math.abs(b.vx); }
    }
    return blobs;
  }
  const seeded = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  return { ASPECT, PALETTES, DEFAULTS, normCfg, halfWidth, makeBlobs, resize, step, seeded, clamp };
})();
if (typeof module !== 'undefined') module.exports = LavaCore;

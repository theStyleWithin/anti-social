'use strict';
/* Fireplace: the pure part. Flames, embers and sparks as particles above a bed of logs.
   x runs -1 to 1 across the opening and y runs up from the logs, both in half-opening widths. */
const FireCore = (() => {
  // id, name, then the flame from its hot core to its tip
  const FLAMES = [
    ['wood', 'Wood', '#fff6c8', '#ffb92e', '#ff5a14', '#9a1500'],
    ['gas', 'Gas blue', '#f2fbff', '#6fd0ff', '#2a6cff', '#10208a'],
    ['copper', 'Copper green', '#f6ffe8', '#9dff6a', '#1fbf5a', '#085a3a'],
    ['violet', 'Violet', '#fff2ff', '#e29bff', '#9a3cff', '#430a8a'],
  ];
  const THEMES = ['cozy', 'brick', 'cabin', 'stone', 'insert', 'herring'];
  const DEFAULTS = { flame: 'wood', height: 1, keep: true, sound: false, theme: 'cozy' };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function normCfg(c) {
    const o = { ...DEFAULTS, ...(c && typeof c === 'object' ? c : {}) };
    if (!FLAMES.some(f => f[0] === o.flame)) o.flame = DEFAULTS.flame;
    if (!THEMES.includes(o.theme)) o.theme = 'cozy'; o.height = clamp(+o.height || 1, 0.5, 1.6); o.keep = o.keep !== false; o.sound = o.sound === true;
    return o;
  }
  const MAX_LOGS = 8;
  // A log lies on the bed at x (in half-opening widths) and rests at height y. wood is what is left of it (1 fresh, 0 gone);
  // lit is how well it has caught (0 cold, 1 burning properly). Logs char, shrink, glow, fall in as the ones under them burn away, and finally go out.
  const newLog = (rnd, x) => ({ id: 0, x, y: 1.4, vy: 0, ang: (rnd() - 0.5) * 0.24, len: 0.95 + rnd() * 0.3, rad: 0.1 + rnd() * 0.025, wood: 1, lit: 0, ring: rnd() * 6 });
  const restY = (f, l) => { let y = 0; for (const o of f.logs) if (o.id !== l.id && o.y <= l.y + 0.001 && Math.abs(o.x - l.x) < 0.42) y = Math.max(y, o.y + (o.rad * (0.4 + 0.6 * o.wood) + l.rad * 0.7) * 1.1); return y; };
  function addLog(f, rnd, x) {
    if (f.logs.length >= MAX_LOGS) return null;
    if (x === undefined) { const used = f.logs.map(l => l.x); let best = 0, bestGap = -1; for (let c = -0.55; c <= 0.551; c += 0.11) { const gap = Math.min(9, ...used.map(u => Math.abs(u - c))); if (gap > bestGap) { bestGap = gap; best = c; } } x = best; }
    const l = newLog(rnd, clamp(x, -0.62, 0.62)); l.id = ++f.nextId; l.y = Math.max(restY(f, { ...l, y: 9 }), 0) + 0.9; f.logs.push(l); return l;
  }
  const power = f => clamp(f.logs.reduce((p, l) => p + (l.wood > 0.04 ? l.lit * Math.sqrt(l.wood) * 0.5 : 0), 0), 0, 1.6);
  const isOut = f => power(f) < 0.04;
  function makeFire(rnd) {
    rnd = rnd || Math.random; const f = { logs: [], coals: 1, parts: [], acc: 0, pops: 0, t: 0, nextId: 0, since: 0, events: [], ash: 0 };
    [-0.2, 0.22, 0.0].forEach(x => { const l = addLog(f, rnd, x); l.lit = 1; l.wood = 0.85; l.y = restY(f, { ...l, y: 9 }); });
    return f;
  }
  // strike a match: whatever is lying there starts to catch
  function light(f) { f.logs.forEach(l => { l.lit = Math.max(l.lit, 0.35); }); f.coals = Math.max(f.coals, 0.5); }
  function poke(f, rnd) { for (let i = 0; i < 14; i++) f.parts.push({ k: 's', x: (rnd() - 0.5) * 0.8, y: 0.2, vx: (rnd() - 0.5) * 0.9, vy: 0.5 + rnd() * 0.9, life: 0, max: 0.9 + rnd() * 0.9, r: 0.008 + rnd() * 0.01 }); f.pops++; f.logs.forEach(l => { l.lit = Math.min(1, l.lit + 0.15); }); }
  function step(f, dt, cfg, rnd) {
    f.t += dt; f.since += dt;
    const p0 = power(f);
    for (const l of f.logs) {
      if (l.lit < 1) l.lit = Math.min(1, l.lit + dt * (p0 > 0.12 ? 0.07 + 0.2 * Math.min(1, p0) : f.coals > 0.25 ? 0.05 : 0));   // a fresh log needs a burning one, or hot coals, nearby
      if (l.lit > 0.25) l.wood = Math.max(0, l.wood - dt * 0.0018 * (0.6 + l.lit) * (cfg.burn || 1));
      const ty = restY(f, l); if (l.y > ty + 0.0005) { l.vy -= 2.6 * dt; l.y = Math.max(ty, l.y + l.vy * dt); if (l.y === ty) { if (l.vy < -0.6) f.events.push('thump'); l.vy = 0; } } else { l.y = ty; l.vy = 0; }
    }
    const before = f.logs.length; f.logs = f.logs.filter(l => l.wood > 0.02); if (f.logs.length < before) { f.coals = 1; f.ash = Math.min(1, (f.ash || 0) + 0.12 * (before - f.logs.length)); f.events.push('collapse'); }       // burnt right through
    let pw = power(f);
    if (cfg.keep && pw < 0.04 && !f.logs.length) { const l = addLog(f, rnd); l.lit = 1; pw = power(f); }                                    // the fire went out and somebody lit it again
    if (cfg.keep && pw < 0.45 && f.logs.length < 5 && f.since > 3) { addLog(f, rnd); f.since = 0; }                                        // somebody keeps feeding it
    f.coals = pw > 0.04 ? Math.min(1, f.coals + 0.2 * dt) : Math.max(0, f.coals - 0.012 * dt);
    const lit = f.logs.filter(l => l.lit > 0.2 && l.wood > 0.04);
    f.acc += 150 * Math.pow(pw, 0.8) * dt;
    while (f.acc >= 1) {
      f.acc -= 1; const a = rnd(), src = lit[(rnd() * lit.length) | 0] || { x: 0, y: 0.1, rad: 0.1 }, spread = 0.2 + 0.14 * pw;
      f.parts.push({ k: 'f', x: src.x + (rnd() + rnd() - 1) * spread, y: src.y + src.rad, vx: (rnd() - 0.5) * 0.05, vy: (0.38 + rnd() * 0.3) * cfg.height * (0.7 + 0.3 * Math.min(1, pw)), life: 0, max: 0.55 + a * 0.75, r: 0.07 + rnd() * 0.07 });
      if (rnd() < 0.045) f.parts.push({ k: 'e', x: src.x + (rnd() - 0.5) * 0.4, y: src.y + 0.15, vx: (rnd() - 0.5) * 0.14, vy: 0.2 + rnd() * 0.3, life: 0, max: 1.8 + rnd() * 2.4, r: 0.006 + rnd() * 0.007, ph: rnd() * 6.28 });
      if (rnd() < 0.006) { f.pops++; for (let i = 0; i < 4; i++) f.parts.push({ k: 's', x: src.x + (rnd() - 0.5) * 0.3, y: src.y + 0.1, vx: (rnd() - 0.5) * 0.7, vy: 0.5 + rnd() * 0.8, life: 0, max: 0.7 + rnd() * 0.8, r: 0.006 + rnd() * 0.008 }); }
    }
    for (const p of f.parts) {
      p.life += dt;
      if (p.k === 'f') { p.x += (p.vx + Math.sin(f.t * 7 + p.y * 6 + p.max * 11) * 0.2 * Math.min(1, p.y + 0.1) + Math.sin(f.t * 3.1 + p.max * 5) * 0.06) * dt; p.y += p.vy * dt; p.x *= 1 - 0.3 * dt; }
      else if (p.k === 'e') { p.x += (p.vx + Math.sin(f.t * 2 + p.ph) * 0.07) * dt; p.y += p.vy * dt; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 1.1 * dt; }
    }
    f.parts = f.parts.filter(p => p.life < p.max && p.y > -0.05);
    return f;
  }
  // colour of a flame particle at a given point of its life, as [r, g, b]
  function flameColor(pal, frac, mix) {
    const stops = [pal[2], pal[3], pal[4], pal[5]]; const x = clamp(frac, 0, 0.9999) * (stops.length - 1), i = Math.floor(x);
    return mix(stops[i], stops[i + 1], x - i);
  }
  const seeded = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  return { THEMES, FLAMES, DEFAULTS, MAX_LOGS, normCfg, makeFire, addLog, power, isOut, light, poke, step, flameColor, seeded, clamp };
})();
if (typeof module !== 'undefined') module.exports = FireCore;

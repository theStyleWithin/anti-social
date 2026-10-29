'use strict';
/* Aquarium: the pure part. Fish that wander, school, flee from sharks and swim to food, plus the food itself.
   The world is 1000 units wide and as tall as the tank is; y runs down, and the sand is at the bottom. */
const AquaCore = (() => {
  const W = 1000;
  // kind: how it is drawn. size: body length in world units. speed: cruising units per second. diet: flake (eats flakes as they sink), bottom (eats what has landed), none.
  // zone: where it likes to swim, as fractions of the water depth. look: colours and body shape for the drawer.
  const SPECIES = [
    { id: 'goldfish', name: 'Goldfish', kind: 'fish', size: 62, speed: 42, diet: 'flake', zone: [0.15, 0.8], look: { body: '#ff9a1f', fin: '#ffc15c', belly: '#ffd08a', tail: 'fan', h: 0.62, pattern: 'plain' }, note: 'Calm, and always hungry.' },
    { id: 'clown', name: 'Clownfish', kind: 'fish', size: 46, speed: 50, diet: 'flake', zone: [0.45, 0.9], look: { body: '#ff6a14', fin: '#ff8a3c', belly: '#ff9a52', tail: 'round', h: 0.58, pattern: 'bands', accent: '#ffffff' }, note: 'Found him.' },
    { id: 'tang', name: 'Blue tang', kind: 'fish', size: 58, speed: 56, diet: 'flake', zone: [0.2, 0.75], look: { body: '#2a6bff', fin: '#ffe23a', belly: '#4f8aff', tail: 'fork', h: 0.72, pattern: 'tang', accent: '#0a1f6a' }, note: 'Just keep swimming.' },
    { id: 'angel', name: 'Angelfish', kind: 'fish', size: 60, speed: 38, diet: 'flake', zone: [0.2, 0.8], look: { body: '#e9edf2', fin: '#c8d0da', belly: '#ffffff', tail: 'fan', h: 0.95, pattern: 'bars', accent: '#242b36', tall: true }, note: 'Tall and elegant.' },
    { id: 'tetra', name: 'Neon tetra', kind: 'fish', size: 26, speed: 70, diet: 'flake', school: true, zone: [0.25, 0.8], look: { body: '#8fb8d8', fin: '#e8f2ff', belly: '#f4f6f8', tail: 'fork', h: 0.4, pattern: 'neon', accent: '#27e6ff', accent2: '#ff3b4a' }, note: 'Likes company. Add a few.' },
    { id: 'betta', name: 'Betta', kind: 'fish', size: 44, speed: 30, diet: 'flake', zone: [0.1, 0.6], look: { body: '#c4143a', fin: '#ff4f7a', belly: '#e0446a', tail: 'flow', h: 0.55, pattern: 'plain', tall: true }, note: 'Dramatic fins, quiet life.' },
    { id: 'puffer', name: 'Pufferfish', kind: 'puffer', size: 50, speed: 30, diet: 'flake', zone: [0.3, 0.85], look: { body: '#f2d46a', fin: '#fff0b0', belly: '#fff6d4', spots: '#8a6a1a' }, note: 'Puffs up if you tap the glass.' },
    { id: 'seahorse', name: 'Seahorse', kind: 'seahorse', size: 50, speed: 16, diet: 'flake', zone: [0.4, 0.9], look: { body: '#ffb13b', fin: '#ffd98a' }, note: 'Slow. Very slow.' },
    { id: 'jelly', name: 'Moon jellyfish', kind: 'jelly', size: 70, speed: 14, diet: 'none', zone: [0.1, 0.7], look: { body: '#b9a6ff', fin: '#e6dcff' }, note: 'Drifts. Does not eat flakes.' },
    { id: 'turtle', name: 'Sea turtle', kind: 'turtle', size: 120, speed: 30, diet: 'flake', zone: [0.2, 0.8], look: { body: '#3f8f4a', fin: '#7bc27f', belly: '#d9cf8f', shell: '#6a5a2a' }, note: 'Takes its time.' },
    { id: 'ray', name: 'Stingray', kind: 'ray', size: 150, speed: 38, diet: 'bottom', zone: [0.72, 0.95], look: { body: '#8a8f99', belly: '#ffffff', fin: '#6f747e' }, note: 'Glides along the sand and eats what lands there.' },
    { id: 'shark', name: 'Reef shark', kind: 'shark', size: 190, speed: 70, diet: 'none', predator: true, zone: [0.2, 0.7], look: { body: '#6c7a8a', belly: '#e8eef2', fin: '#55616f' }, note: 'Cruises. Nobody gets eaten here.' },
    { id: 'hammer', name: 'Hammerhead', kind: 'shark', size: 230, speed: 66, diet: 'none', predator: true, zone: [0.25, 0.75], look: { body: '#7b6f68', belly: '#efe8e2', fin: '#5d534d', hammer: true }, note: 'The big one.' },
    { id: 'crab', name: 'Crab', kind: 'crab', size: 46, speed: 24, diet: 'bottom', zone: [1, 1], look: { body: '#e0452c', fin: '#ff7a5a' }, note: 'Walks sideways, on purpose.' },
    { id: 'star', name: 'Starfish', kind: 'star', size: 44, speed: 0, diet: 'bottom', zone: [1, 1], look: { body: '#ff8f5a', fin: '#ffc09a' }, note: 'Stays where it is put.' },
  ];
  const bySp = id => SPECIES.find(s => s.id === id);
  const NAMES = ['Finn Diesel', 'Gill Bates', 'Sharky McSharkface', 'Bubbles', 'Captain Flipper', 'Sir Swims-a-Lot', 'Nemo-ish', 'Fishy Business', 'Dory-ish', 'Lord Fin', 'Splash', 'Coral', 'Kelp', 'Wanda', 'Pebble', 'Marlin-ish', 'Reef', 'Tide', 'Ripple', 'Squirt', 'Moby', 'Gilbert', 'Brian', 'Doug', 'Bubbleton', 'Nibbles', 'Mr. Wiggles', 'Fin Shady'];
  const MAX_FISH = 40, MAX_FOOD = 80, REACH = 520;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const floorOf = H => H - 46;                                         // where the sand starts
  let nameCounter = 0;
  function makeFish(spId, rnd, H, saved) {
    const sp = bySp(spId); if (!sp) return null;
    const floor = floorOf(H), top = 40, z = sp.zone, y = sp.kind === 'crab' || sp.kind === 'star' ? floor : top + (floor - top) * (z[0] + rnd() * (z[1] - z[0]));
    const dir = rnd() < 0.5 ? -1 : 1;
    return { sp: spId, name: saved && saved.name || NAMES[(Math.floor(rnd() * NAMES.length) + nameCounter++) % NAMES.length], meals: saved && saved.meals || 0, x: sp.kind === 'star' ? 120 + rnd() * (W - 240) : 60 + rnd() * (W - 120), y, vx: dir * sp.speed * 0.5, vy: 0, dir, tx: 0, ty: 0, retarget: 0, phase: rnd() * 6.28, scare: 0, happy: 0, puff: 0, id: ++nameCounter + Math.floor(rnd() * 1e6) };
  }
  const makeFood = (x, y, rnd, kind = 'flake') => ({ x, y, kind, vy: kind === 'pellet' ? 70 + rnd() * 20 : 22 + rnd() * 14, ph: rnd() * 6, age: 0, rest: 0, eaten: false });
  // a pinch of flakes from the feeder (it sits near the top right)
  const feederPos = () => ({ x: W - 90, y: 28 });
  const dropFlakes = (food, rnd, n = 16, kind = 'flake') => { const p = feederPos(); for (let i = 0; i < n && food.length < MAX_FOOD; i++) food.push(makeFood(p.x - 22 + rnd() * 44, p.y + 14 + rnd() * 10, rnd, kind)); };
  function stepFood(food, dt, H) {
    const floor = floorOf(H);
    for (const f of food) {
      f.age += dt;
      if (f.y < floor) { f.y += f.vy * dt; f.x += Math.sin(f.age * 2 + f.ph) * (f.kind === 'pellet' ? 2 : 9) * dt; if (f.y >= floor) { f.y = floor; f.rest = 0; } } else f.rest += dt;
    }
    for (let i = food.length - 1; i >= 0; i--) if (food[i].eaten || food[i].rest > 40) food.splice(i, 1);
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function wantFood(f, sp, food, H) {
    if (sp.diet === 'none') return null; const floor = floorOf(H); let best = null, bd = REACH * (sp.kind === 'star' ? 0.25 : 1);
    for (const p of food) { if (p.eaten) continue; if (sp.diet === 'bottom' ? p.y < floor - 1 : p.kind === 'pellet') continue; const d = dist(f, p); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function stepFish(f, dt, world, rnd) {
    const sp = bySp(f.sp), H = world.H, floor = floorOf(H), top = 36;
    f.phase += dt * (2 + sp.speed / 30); f.chew = Math.max(0, (f.chew || 0) - dt); f.scare = Math.max(0, f.scare - dt); f.happy = Math.max(0, f.happy - dt); f.puff = Math.max(0, f.puff - dt);
    if (sp.kind === 'star') { for (const p of world.food) if (!p.eaten && p.y >= floor - 1 && Math.abs(p.x - f.x) < 30 && f.chew <= 0) { p.eaten = true; f.meals++; f.happy = 2; f.chew = 0.8; } f.y = floor; return; }
    let ax = 0, ay = 0, want = null;
    // food first
    want = wantFood(f, sp, world.food, H);
    if (want) {
      const dx = want.x - f.x, dy = want.y - f.y, d = Math.hypot(dx, dy) || 1; ax += dx / d * 2.6; ay += dy / d * 2.6;
      if (d < sp.size * 0.42 + 6 && f.chew <= 0) { want.eaten = true; f.meals++; f.happy = 2.2; f.chew = 0.45; }
    } else {
      f.retarget -= dt;
      if (f.retarget <= 0 || Math.hypot(f.tx - f.x, f.ty - f.y) < 30) {
        f.retarget = 2.5 + rnd() * 5; const z = sp.zone;
        f.tx = 40 + rnd() * (W - 80); f.ty = sp.kind === 'crab' ? floor : top + (floor - top) * (z[0] + rnd() * (z[1] - z[0]));
      }
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1; ax += dx / d; ay += dy / d * (sp.kind === 'jelly' ? 0.5 : 0.7);
    }
    // schooling: stay close to your own kind, but not on top of them
    if (sp.school) {
      let n = 0, cx = 0, cy = 0, hx = 0; for (const o of world.fish) if (o !== f && o.sp === f.sp && dist(o, f) < 200) { n++; cx += o.x; cy += o.y; hx += o.vx; const d = dist(o, f); if (d < 24) { ax += (f.x - o.x) / (d + 1) * 1.4; ay += (f.y - o.y) / (d + 1) * 1.4; } }
      if (n) { ax += (cx / n - f.x) / 120; ay += (cy / n - f.y) / 120; ax += hx / n / sp.speed * 0.6; }
    }
    // everybody gives sharks a wide berth, nobody is hurt
    if (!sp.predator) for (const o of world.fish) { const os = bySp(o.sp); if (os.predator) { const d = dist(o, f); if (d < 170 && sp.kind !== 'star') { ax += (f.x - o.x) / (d + 1) * 2.2; ay += (f.y - o.y) / (d + 1) * 1.6; f.scare = Math.max(f.scare, 0.6); } } }
    if (f.scare > 0.9) { ax += f.dir * 3; }
    const k = f.scare > 0 ? 2.4 : 1, sp2 = sp.speed * (want ? 1.6 : 1) * k;
    if (sp.kind === 'jelly') { const pulse = Math.max(0, Math.sin(f.phase * 1.4)); ay = (ay * 0.4) - 0.9 * pulse + 0.35; ax *= 0.5; }
    if (sp.kind === 'seahorse') ay *= 0.5;
    const len = Math.hypot(ax, ay) || 1, wx = ax / len * sp2, wy = ay / len * sp2 * (sp.kind === 'crab' ? 0 : 1);
    const turn = sp.kind === 'jelly' ? 0.8 : 2.2; f.vx += (wx - f.vx) * Math.min(1, turn * dt); f.vy += (wy - f.vy) * Math.min(1, turn * dt);
    if (sp.kind === 'jelly') f.vy += 0;
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (Math.abs(f.vx) > sp.speed * 0.18) f.dir = f.vx < 0 ? -1 : 1;
    // walls, water surface and the sand
    const m = sp.size * 0.45; if (f.x < m) { f.x = m; f.vx = Math.abs(f.vx); } else if (f.x > W - m) { f.x = W - m; f.vx = -Math.abs(f.vx); }
    const yMax = sp.kind === 'crab' ? floor : floor - (sp.kind === 'ray' ? 10 : sp.size * 0.25), yMin = top + sp.size * 0.2;
    if (sp.kind === 'crab') f.y = floor;
    if (f.y > yMax) { f.y = yMax; f.vy = Math.min(0, f.vy); } else if (f.y < yMin) { f.y = yMin; f.vy = Math.max(0, f.vy); }
    return f;
  }
  // Something taps the glass or you tap a spot: nearby fish dart away and the puffer puffs up
  function startle(fish, x, y, rnd) { for (const f of fish) { const sp = bySp(f.sp), d = Math.hypot(f.x - x, f.y - y); if (d < 260 && sp.kind !== 'star') { f.scare = 1.4; const a = Math.atan2(f.y - y, f.x - x); f.vx += Math.cos(a) * sp.speed * 2.2; f.vy += Math.sin(a) * sp.speed * 1.2; f.retarget = 0; if (sp.kind === 'puffer') f.puff = 3; } } }
  function pick(fish, x, y) { let best = null, bd = 1e9; for (const f of fish) { const sp = bySp(f.sp), r = Math.max(24, sp.size * 0.55), d = Math.hypot(f.x - x, f.y - y); if (d < r && d < bd) { bd = d; best = f; } } return best; }
  function normSave(list) { if (!Array.isArray(list)) return []; return list.filter(s => s && bySp(s.sp)).slice(0, MAX_FISH).map(s => ({ sp: s.sp, name: String(s.name || '').slice(0, 24), meals: Math.max(0, Math.floor(+s.meals || 0)) })); }
  const seeded = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  return { W, SPECIES, bySp, MAX_FISH, floorOf, makeFish, makeFood, dropFlakes, feederPos, stepFood, stepFish, startle, pick, normSave, seeded, clamp };
})();
if (typeof module !== 'undefined') module.exports = AquaCore;

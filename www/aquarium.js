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

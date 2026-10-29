'use strict';
/* Digital Clock: a big clock, a world clock, a stopwatch and a timer. All from this device's own clock and time zone data. */
const CL = ClockCore;
let ckTab = 'clock', ckTick = null, ckLastCtx = null, ckFull = null, ckBeep = null;
const ckKey = (acct, k) => `as.clock.${k}.${acct.id}`;
const ckLoad = (acct, k) => { try { return JSON.parse(ls(ckKey(acct, k)) || 'null'); } catch { return null; } };
const ckStore = (acct, k, v) => ls(ckKey(acct, k), JSON.stringify(v));
const ckCfg = ctx => CL.normCfg((ctx.apps.clockcfg[0] || {}).cfg);
const ckSaveCfg = (acct, cfg) => savePost(acct, { id: 'clockcfg' + acct.id, accountId: acct.id, kind: 'clockcfg', cfg, createdAt: Date.now() });
const ckColor = cfg => (CL.THEMES.find(t => t[0] === cfg.theme) || CL.THEMES[0])[2];

// Runs fn about four times a second while its screen is up, and quietly stops once the screen has gone.
function ckRun(alive, fn) {
  clearInterval(ckTick);
  fn();
  ckTick = setInterval(() => { if (!alive()) { clearInterval(ckTick); ckTick = null; return; } fn(); }, 250);
}
function ckBeepNow() {
  try {
    ckBeep = ckBeep || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      const o = ckBeep.createOscillator(), g = ckBeep.createGain(), t = ckBeep.currentTime + i * 0.35;
      o.frequency.value = 880; g.gain.setValueAtTime(0.2, t); g.gain.setValueAtTime(0, t + 0.2);
      o.connect(g); g.connect(ckBeep.destination); o.start(t); o.stop(t + 0.25);
    }
  } catch { /* no sound, the screen still says it */ }
}

function clockView(acct, ctx, back) {
  ckLastCtx = ctx;
  const cfg = ckCfg(ctx);
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(ckTab === k), class: ckTab === k ? 'active' : '', onclick: () => { ckTab = k; render(true); } }, label);
  const body = { clock: ckMain, world: ckWorld, watch: ckWatch, timer: ckTimer }[ckTab](acct, ctx, cfg);
  return [back(appName(acct, 'clock')), h('div', { class: 'tabs', role: 'tablist' }, tab('clock', 'Clock'), tab('world', 'World'), tab('watch', 'Stopwatch'), tab('timer', 'Timer')), h('div', { class: 'app-pad ck-pad' }, body)];
}

/* ---------- the big clock ---------- */
function ckFace(cfg, tz, cls = '') {
  const time = h('span', { class: 'ck-time' }), sec = h('span', { class: 'ck-sec' }), ampm = h('span', { class: 'ck-ampm' }), date = h('div', { class: 'ck-date' });
  const el = h('div', { class: 'ck-face ' + cls, style: `--ck:${ckColor(cfg)}`, role: 'timer', 'aria-label': 'Current time' }, h('div', { class: 'ck-row' }, time, h('span', { class: 'ck-side' }, cfg.seconds ? sec : null, ampm)), cfg.date ? date : null);
  el.update = () => {
    const now = new Date(), c = CL.clock(now, tz, cfg.h24);
    time.textContent = c.text; sec.textContent = c.sec; ampm.textContent = c.ampm;
    const d = CL.dateText(now, tz); if (date.textContent !== d) date.textContent = d;
  };
  return el;
}
function ckMain(acct, ctx, cfg) {
  const home = CL.localZone(), face = ckFace(cfg, home), node = h('div', { class: 'ck-main' });
  const opt = (label, key, extra) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!cfg[key], onchange: async e => { await ckSaveCfg(acct, { ...cfg, [key]: e.target.checked }); render(true); } }), ' ' + label);
  const themes = h('div', { class: 'ck-themes', role: 'radiogroup', 'aria-label': 'Colour' }, CL.THEMES.map(([id, name, hex]) =>
    h('button', { class: 'ck-swatch' + (cfg.theme === id ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(cfg.theme === id), 'aria-label': name, title: name, style: `background:${hex}`, onclick: async () => { await ckSaveCfg(acct, { ...cfg, theme: id }); render(true); } })));
  node.append(h('div', { class: 'ck-stage' }, face),
    h('p', { class: 'fine ck-zone' }, `${CL.city(home)} · ${CL.offsetText(CL.offsetMin(new Date(), home))}`),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => ckFullscreen(cfg, home) }, 'Full screen')),
    h('div', { class: 'ck-opts' }, opt('24-hour', 'h24'), opt('Show seconds', 'seconds'), opt('Show the date', 'date')), themes);
  ckRun(() => node.isConnected, face.update);
  return [node];
}
function ckFullscreen(cfg, tz) {
  if (ckFull) return;
  const face = ckFace(cfg, tz, 'big');
  const close = () => { clearInterval(ckFull.t); document.removeEventListener('keydown', onKey); try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* fine */ } try { ckFull.lock && ckFull.lock.release(); } catch { /* fine */ } ckFull.el.remove(); ckFull = null; };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const el = h('div', { class: 'ck-full', role: 'dialog', 'aria-label': 'Full screen clock', onclick: close }, face, h('p', { class: 'fine' }, 'Tap anywhere to close'));
  document.body.append(el);
  ckFull = { el, t: setInterval(face.update, 250) };
  face.update();
  document.addEventListener('keydown', onKey);
  try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch { /* the overlay still fills the window */ }
  try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { if (ckFull) ckFull.lock = l; else l.release(); }).catch(() => {}); } catch { /* fine */ }
}

/* ---------- world clock ---------- */
function ckWorld(acct, ctx, cfg) {
  const home = CL.localZone(), list = [home, ...cfg.zones.filter(z => z !== home)];
  const rows = h('div', { class: 'ck-world' });
  const cells = list.map(tz => {
    const t = h('b', { class: 'ck-wtime' }), s = h('small', { class: 'muted' });
    const row = h('div', { class: 'ck-wrow', 'data-zone': tz }, h('span', { class: 'ck-dn', 'aria-hidden': 'true' }), h('div', { class: 'ck-wname' }, h('b', {}, CL.city(tz) + (tz === home ? ' (here)' : '')), s), t,
      tz === home ? null : h('button', { class: 'btn', 'aria-label': `Remove ${CL.city(tz)}`, onclick: async () => { await ckSaveCfg(acct, { ...cfg, zones: cfg.zones.filter(z => z !== tz) }); render(true); } }, 'Remove'));
    rows.append(row);
    return { tz, t, s, dn: row.firstChild };
  });
  const q = h('input', { type: 'search', placeholder: 'Add a city, like Tokyo or New York', 'aria-label': 'Add a city' });
  const found = h('div', { class: 'ck-found' });
  q.addEventListener('input', () => {
    const hits = CL.searchZones(q.value).filter(z => !list.includes(z));
    found.replaceChildren(...hits.map(z => h('button', { class: 'btn', type: 'button', onclick: async () => {
      if (cfg.zones.length >= CL.MAX_ZONES) return toast(`That is the most (${CL.MAX_ZONES}).`);
      await ckSaveCfg(acct, { ...cfg, zones: [...cfg.zones, z] }); render(true);
    } }, `${CL.city(z)} · ${CL.region(z) || z}`)));
  });
  const wrap = h('div', {}, rows, h('div', { class: 'ck-add' }, q, found), h('p', { class: 'fine' }, 'Time zones come from this device, so it works offline.'));
  ckRun(() => wrap.isConnected, () => {
    const now = new Date();
    for (const c of cells) {
      const k = CL.clock(now, c.tz, cfg.h24);
      c.t.textContent = k.text + (k.ampm ? ' ' + k.ampm : '');
      c.s.textContent = `${CL.dayWord(CL.dayDiff(now, c.tz, home))} · ${c.tz === home ? CL.offsetText(CL.offsetMin(now, c.tz)) : CL.hoursAhead(now, c.tz, home)}`;
      c.dn.textContent = CL.isDay(k.hour) ? '☀' : '☾';
    }
  });
  return [wrap];
}

/* ---------- stopwatch ---------- */
function ckWatch(acct) {
  let st = CL.normWatch(ckLoad(acct, 'watch'));
  const save = () => ckStore(acct, 'watch', st);
  const out = h('div', { class: 'ck-big', role: 'timer', 'aria-label': 'Stopwatch' }, '00:00.00');
  const laps = h('div', { class: 'ck-laps' });
  const btns = h('div', { class: 'btnrow ck-btns' });
  const drawLaps = () => laps.replaceChildren(...CL.lapRows(st.laps).map(r => h('div', { class: 'ck-lap' + (r.best ? ' best' : r.worst ? ' worst' : '') }, h('span', {}, 'Lap ' + r.n), h('b', {}, CL.fmtWatch(r.split)), h('span', { class: 'muted' }, CL.fmtWatch(r.total)))));
  const drawBtns = () => {
    const now = Date.now(), going = st.running, any = going || st.base > 0;
    btns.replaceChildren(
      h('button', { class: 'btn primary', onclick: () => { const n = Date.now(); if (st.running) st = { ...st, running: false, base: CL.watch(st, n), startAt: 0 }; else st = { ...st, running: true, startAt: n }; save(); drawBtns(); } }, going ? 'Stop' : any ? 'Resume' : 'Start'),
      h('button', { class: 'btn', disabled: !going, onclick: () => { st = { ...st, laps: [...st.laps, CL.watch(st, Date.now())] }; save(); drawLaps(); } }, 'Lap'),
      h('button', { class: 'btn', disabled: !any, onclick: () => { st = CL.normWatch(null); save(); out.textContent = CL.fmtWatch(0); drawBtns(); drawLaps(); } }, 'Reset'));
  };
  const wrap = h('div', { class: 'ck-wrap' }, out, btns, laps);
  drawBtns(); drawLaps();
  ckRun(() => wrap.isConnected, () => { out.textContent = CL.fmtWatch(CL.watch(st, Date.now())); });
  return [wrap];
}

/* ---------- timer ---------- */
function ckTimer(acct) {
  let t = CL.normTimer(ckLoad(acct, 'timer')), rung = false;
  const save = () => ckStore(acct, 'timer', t);
  const out = h('div', { class: 'ck-big', role: 'timer', 'aria-label': 'Timer' }, '00:00');
  const num = (label, max, v) => h('label', { class: 'ck-num' }, h('input', { type: 'number', min: 0, max, value: v, inputmode: 'numeric', 'aria-label': label }), h('small', {}, label));
  const hh = num('hours', 99, 0), mm = num('minutes', 59, 5), ss = num('seconds', 59, 0);
  const inputs = h('div', { class: 'ck-inputs' }, hh, mm, ss);
  const presets = h('div', { class: 'ck-presets' }, [['1 min', 1], ['3 min', 3], ['5 min', 5], ['10 min', 10], ['30 min', 30]].map(([l, m]) => h('button', { class: 'btn', type: 'button', onclick: () => { hh.firstChild.value = 0; mm.firstChild.value = m; ss.firstChild.value = 0; } }, l)));
  const btns = h('div', { class: 'btnrow ck-btns' });
  const done = h('p', { class: 'ck-done', role: 'status' });
  const idle = () => !t.running && t.left <= 0;
  const drawBtns = () => {
    inputs.hidden = presets.hidden = !idle();
    btns.replaceChildren(
      h('button', { class: 'btn primary', onclick: () => {
        const n = Date.now();
        if (t.running) t = { ...t, running: false, left: CL.timerLeft(t, n) };
        else if (t.left > 0) t = { ...t, running: true, endAt: n + t.left };
        else { const ms = CL.timerMs(hh.firstChild.value, mm.firstChild.value, ss.firstChild.value); if (!ms) return toast('Set a time first.'); t = { running: true, endAt: n + ms, left: ms, total: ms }; rung = false; done.textContent = ''; }
        save(); drawBtns();
      } }, t.running ? 'Pause' : t.left > 0 ? 'Resume' : 'Start'),
      h('button', { class: 'btn', disabled: idle() && !done.textContent, onclick: () => { t = CL.normTimer(null); rung = false; done.textContent = ''; save(); drawBtns(); } }, 'Reset'));
  };
  const wrap = h('div', { class: 'ck-wrap' }, out, inputs, presets, btns, done);
  drawBtns();
  ckRun(() => wrap.isConnected, () => {
    const left = CL.timerLeft(t, Date.now());
    out.textContent = idle() ? '00:00' : CL.fmtTimer(left);
    if (t.running && left <= 0) { t = { ...t, running: false, left: 0, endAt: 0 }; save(); done.textContent = 'Time is up.'; if (!rung) { rung = true; ckBeepNow(); } drawBtns(); }
  });
  return [wrap];
}

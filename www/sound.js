'use strict';
/* Sound Meter: measures how loud it is around you with the microphone. The sound is measured on the spot and thrown away.
   Nothing is recorded, nothing leaves the device. */
const SN = SoundCore;
let snTab = 'meter', snTimer = null;
const sn = { stream: null, ctx: null, an: null, buf: null, on: false, stats: SN.newStats(), series: [], now: null, startedAt: 0, err: '', ui: null };
const snGet = (k, d) => { try { const v = localStorage.getItem('as.sound.' + k); return v === null ? d : v; } catch { return d; } };
const snSet = (k, v) => { try { localStorage.setItem('as.sound.' + k, String(v)); } catch { /* not remembered */ } };
const snOffset = () => SN.clampOffset(snGet('cal', SN.DEFAULT_OFFSET));
const snWeight = () => { const w = snGet('w', 'A'); return SN.WEIGHTS.some(x => x[0] === w) ? w : 'A'; };
const snUnit = () => ({ A: 'dBA', C: 'dBC', Z: 'dB' })[snWeight()];

async function snStart() {
  sn.err = '';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { sn.err = 'This device cannot give the app a microphone.'; return render(true); }
  try {
    sn.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
  } catch (e) {
    sn.err = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'The microphone is blocked. Allow it for Anti-Social in your device settings, then try again.' : 'No microphone could be opened.';
    return render(true);
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  sn.ctx = new Ctx(); try { await sn.ctx.resume(); } catch { /* it starts on its own */ }
  const src = sn.ctx.createMediaStreamSource(sn.stream);
  sn.an = sn.ctx.createAnalyser(); sn.an.fftSize = 4096; sn.an.smoothingTimeConstant = 0;
  src.connect(sn.an);            // listens only; never connected to the speakers
  sn.buf = new Float32Array(sn.an.fftSize);
  sn.on = true; sn.startedAt = Date.now(); sn.stats = SN.newStats(); sn.series = [];
  clearInterval(snTimer); snTimer = setInterval(snTick, 100);
  render(true);
}
function snStop() {
  clearInterval(snTimer); snTimer = null;
  try { sn.stream && sn.stream.getTracks().forEach(t => t.stop()); } catch { /* gone already */ }
  try { sn.ctx && sn.ctx.close(); } catch { /* fine */ }
  sn.stream = sn.ctx = sn.an = null; sn.on = false; sn.now = null;
}
function snTick() {
  if (!document.querySelector('.sn-wrap')) { snStop(); return; }      // left the Sound Meter: let go of the microphone
  sn.an.getFloatTimeDomainData(sn.buf);
  const off = snOffset(), db = Math.max(0, SN.toDb(SN.weightedRms(sn.buf, sn.ctx.sampleRate, snWeight()), off)), pk = Math.max(0, SN.toDb(SN.peakAbs(sn.buf), off));      // nothing reads below 0 dB
  sn.now = db; SN.addStat(sn.stats, db, pk); sn.series.push(db); if (sn.series.length > 6000) sn.series.shift();
  sn.stats.seconds = Math.round((Date.now() - sn.startedAt) / 1000);
  if (sn.ui) sn.ui.draw();
}

function soundView(acct, ctx, back) {
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(snTab === k), class: snTab === k ? 'active' : '', onclick: () => { snTab = k; render(true); } }, label);
  const body = { meter: snMeter, saved: snSaved, levels: snLevels }[snTab](acct, ctx);
  return [back(appName(acct, 'sound')), h('div', { class: 'tabs', role: 'tablist' }, tab('meter', 'Meter'), tab('saved', 'Saved'), tab('levels', 'Levels')), h('div', { class: 'app-pad sn-wrap' }, body)];
}

function snGauge() {
  const R = 80, C = Math.PI * R;
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 112'); svg.setAttribute('class', 'sn-gauge'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<path d="M20 100 A80 80 0 0 1 180 100" fill="none" style="stroke:var(--line)" stroke-width="14" stroke-linecap="round"/><path class="sn-arc" d="M20 100 A80 80 0 0 1 180 100" fill="none" style="stroke:var(--accent)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C} ${C}" stroke-dashoffset="${C}"/>`;
  const arc = svg.querySelector('.sn-arc');
  svg.set = db => { arc.style.strokeDashoffset = String(C * (1 - (db === null ? 0 : SN.arc(db)))); arc.style.stroke = db === null ? 'var(--line)' : ({ safe: '#1c9c4a', loud: '#d4a017', risk: '#e8761f', danger: '#d6453d' })[SN.risk(db)[0]]; };
  return svg;
}
function snGraph(canvas, series) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, lo = 20, hi = 120, y = v => H - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * H;
  g.clearRect(0, 0, W, H); g.strokeStyle = 'rgba(128,128,128,.25)'; g.fillStyle = 'rgba(128,128,128,.8)'; g.font = '11px sans-serif'; g.lineWidth = 1;
  for (let v = 40; v <= 100; v += 20) { g.beginPath(); g.moveTo(0, y(v)); g.lineTo(W, y(v)); g.stroke(); g.fillText(String(v), 3, y(v) - 3); }
  if (series.length < 2) return;
  g.strokeStyle = getComputedStyle(canvas).getPropertyValue('--accent').trim() || '#1d9bf0'; g.lineWidth = 2; g.beginPath();
  series.forEach((v, i) => { const x = i * (W / 600); i ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); });
  g.stroke();
}

function snMeter(acct) {
  const big = h('div', { class: 'sn-big', role: 'status', 'aria-live': 'off', 'aria-label': 'Sound level' }, '--'), unit = h('span', { class: 'sn-unit' }, snUnit());
  const what = h('div', { class: 'sn-what' }, sn.on ? 'Listening...' : 'Tap Start to measure');
  const risk = h('span', { class: 'sn-risk' }), gauge = snGauge();
  const canvas = h('canvas', { class: 'sn-graph', width: 600, height: 150, 'aria-label': 'Sound level over the last minute', role: 'img' });
  const cell = (k, label) => { const b = h('b', {}, '--'); return [h('div', { class: 'sn-cell' }, h('small', {}, label), b), b]; };
  const [cMin, bMin] = cell('min', 'Min'), [cAvg, bAvg] = cell('avg', 'Average'), [cMax, bMax] = cell('max', 'Max'), [cPk, bPk] = cell('peak', 'Peak');
  const time = h('div', { class: 'fine sn-time' });
  const draw = () => {
    const s = sn.stats, v = sn.now;
    big.replaceChildren(v === null ? '--' : v.toFixed(1), unit);
    gauge.set(v);
    what.textContent = v === null ? (sn.on ? 'Listening...' : 'Tap Start to measure') : SN.describe(v);
    const r = v === null ? null : SN.risk(v); risk.textContent = r ? r[1] : ''; risk.className = 'sn-risk ' + (r ? r[0] : '');
    bMin.textContent = SN.fmtDb(s.min); bAvg.textContent = SN.fmtDb(SN.avgOf(s)); bMax.textContent = SN.fmtDb(s.max); bPk.textContent = SN.fmtDb(s.peak);
    time.textContent = s.n ? `Measured for ${SN.fmtDuration(s.seconds)}` : '';
    resetBtn.disabled = saveBtn.disabled = !s.n;
    snGraph(canvas, sn.series.slice(-600));
  };
  sn.ui = { draw };
  const wsel = h('select', { 'aria-label': 'Weighting', onchange: e => { snSet('w', e.target.value); sn.stats = SN.newStats(); sn.series = []; sn.startedAt = Date.now(); render(true); } }, SN.WEIGHTS.map(([id, name]) => h('option', { value: id }, name)));
  wsel.value = snWeight();
  const save = () => {
    if (!sn.stats.n) return toast('Measure something first.');
    const name = h('input', { maxlength: 80, placeholder: 'Where was this? (optional)', 'aria-label': 'Name' }), err = h('p', { class: 'err' });
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Save this reading'),
      h('p', { class: 'muted' }, `Average ${SN.fmtDb(SN.avgOf(sn.stats))} ${snUnit()}, max ${SN.fmtDb(sn.stats.max)}, over ${SN.fmtDuration(sn.stats.seconds)}.`), name, err,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn primary', onclick: async () => {
        const r = SN.normReading({ name: name.value, weighting: snWeight(), min: sn.stats.min, avg: SN.avgOf(sn.stats), max: sn.stats.max, peak: sn.stats.peak, seconds: sn.stats.seconds, series: SN.downsample(sn.series, 120) });
        if (await appSave(acct, { id: uid(), accountId: acct.id, kind: 'sound', createdAt: Date.now(), at: Date.now(), ...r })) { close(); toast('Saved. Find it under Saved.'); }
      } }, 'Save'))));
    setTimeout(() => name.focus(), 30);
  };
  const calibrate = () => {
    const input = h('input', { inputmode: 'decimal', placeholder: 'e.g. 62', 'aria-label': 'Reading on your other meter' }), err = h('p', { class: 'err' });
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Calibrate'),
      h('p', { class: 'muted' }, 'Phone and computer microphones differ, so the number is an estimate until you match it to a real sound meter. Start the meter, hold it next to a steady sound beside your other meter, then type what that meter shows.'),
      input, err, h('p', { class: 'fine' }, `Now showing ${sn.now === null ? '--' : sn.now.toFixed(1)} ${snUnit()}. Calibration offset: ${snOffset().toFixed(1)}.`),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { snSet('cal', SN.DEFAULT_OFFSET); close(); render(true); toast('Calibration reset.'); } }, 'Reset'), h('button', { class: 'btn', onclick: () => close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: () => {
          const t = parseFloat(input.value);
          if (sn.now === null) return void (err.textContent = 'Start the meter first.');
          if (!Number.isFinite(t) || t < 20 || t > 140) return void (err.textContent = 'Type a number between 20 and 140.');
          snSet('cal', SN.calibrate(snOffset(), sn.now, t).toFixed(2)); close(); sn.stats = SN.newStats(); sn.series = []; toast('Calibrated.');
        } }, 'Calibrate'))));
  };
  const resetBtn = h('button', { class: 'btn', onclick: () => { sn.stats = SN.newStats(); sn.series = []; sn.startedAt = Date.now(); draw(); } }, 'Reset'), saveBtn = h('button', { class: 'btn', onclick: save }, 'Save reading');
  const node = h('div', { class: 'sn-meter' },
    h('div', { class: 'sn-card' }, gauge, h('div', { class: 'sn-readout' }, big), what, risk),
    h('div', { class: 'sn-stats' }, cMin, cAvg, cMax, cPk), time,
    canvas,
    sn.err ? h('p', { class: 'err', role: 'alert' }, sn.err) : null,
    h('div', { class: 'btnrow sn-btns' },
      h('button', { class: 'btn primary', onclick: () => { if (sn.on) { snStop(); render(true); } else snStart(); } }, sn.on ? 'Stop' : 'Start'),
      resetBtn, saveBtn),
    h('div', { class: 'app-row' }, wsel, h('button', { class: 'btn', onclick: calibrate }, 'Calibrate')),
    h('p', { class: 'fine' }, 'The microphone is only on while this screen is open and you have pressed Start. Nothing is recorded; each moment of sound is measured and forgotten. Phone microphones are not lab equipment, so treat numbers as an estimate unless you calibrate.'));
  draw();
  return [node];
}

function snMini(series, w = 120, h2 = 28) {
  if (series.length < 2) return '';
  const lo = Math.min(...series), hi = Math.max(...series, lo + 5), pts = series.map((v, i) => `${(i / (series.length - 1) * w).toFixed(1)},${(h2 - (v - lo) / (hi - lo) * (h2 - 2) - 1).toFixed(1)}`).join(' ');
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${h2}`); s.setAttribute('class', 'sn-mini'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<polyline points="${pts}" fill="none" style="stroke:var(--accent)" stroke-width="1.6"/>`; return s;
}
function snSaved(acct, ctx) {
  const rows = [...ctx.apps.sound].sort((a, b) => b.at - a.at);
  if (!rows.length) return [emptyState('Nothing saved', 'Measure something on the Meter tab, then Save reading.')];
  const edit = r => {
    const name = h('input', { value: r.name, maxlength: 80, 'aria-label': 'Name' });
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Saved reading'), name,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn danger', onclick: async () => { await appDelete(r.id); close(); render(true); } }, 'Delete'), h('button', { class: 'btn', onclick: () => close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: async () => { if (await appSave(acct, { ...r, name: name.value.trim().slice(0, 80) })) { close(); render(true); } } }, 'Save'))));
  };
  const unit = w => ({ A: 'dBA', C: 'dBC', Z: 'dB' })[w] || 'dB';
  return [h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => saveFile('anti-social-sound-readings.csv', 'text/csv', SN.csv(rows)).then(x => toast(x.ok ? `Saved to ${x.where}.` : x.where)) }, 'Export CSV')),
    rows.map(r => h('button', { class: 'sn-row', onclick: () => edit(r), 'aria-label': `Reading ${r.name || 'untitled'}` },
      h('div', { class: 'sn-rmain' }, h('b', {}, r.name || 'Untitled reading'), h('span', { class: 'muted' }, new Date(r.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) + ' · ' + SN.fmtDuration(r.seconds)),
        h('span', { class: 'muted' }, `Min ${SN.fmtDb(r.min)} · Max ${SN.fmtDb(r.max)} ${unit(r.weighting)}`)),
      snMini(r.series), h('b', { class: 'sn-ravg' }, SN.fmtDb(r.avg), h('small', {}, ' avg'))))];
}
function snLevels() {
  return [h('p', { class: 'muted' }, 'What different levels sound like, and how long is safe.'),
    h('div', { class: 'sn-levels' }, [...SN.LEVELS].reverse().map(([l, t]) => h('div', { class: 'sn-lvl ' + SN.risk(l)[0] }, h('b', {}, String(l)), h('span', {}, t), h('small', { class: 'muted' }, SN.fmtSafe(SN.safeHours(l)) === 'No limit' ? '' : SN.fmtSafe(SN.safeHours(l)) + ' a day')))),
    h('p', { class: 'fine' }, 'Safe time follows the common 85 dBA for 8 hours rule, halving for every 3 dB more. This is general information, not medical advice.')];
}

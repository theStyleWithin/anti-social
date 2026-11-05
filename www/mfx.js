'use strict';
/* Music Player: the sound path and the pictures that move with it. One <audio> element feeds a chain of filters (ten equalizer bands,
   bass, a stereo widener and reverb) and then an analyser, which the visualizers read. Nothing is downloaded or sent anywhere. */
const MusicFx = (() => {
  const M = MusicCore;
  let ctx = null, audio = null, src = null, an = null, eq = [], bass = null, wide = null, rev = null, dry = null, wet = null, master = null, pre = null, freqData = null, waveData = null, state = { eqOn: true, gains: new Array(10).fill(0), bass: 0, virt: 0, reverb: 'none' };
  const irCache = {};
  function ir(secs) {
    if (irCache[secs]) return irCache[secs]; const sr = ctx.sampleRate, n = Math.max(1, Math.floor(sr * secs)), b = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const k = Math.pow(1 - i / n, 2.6); lp += (Math.random() * 2 - 1 - lp) * (0.35 + 0.65 * (1 - i / n)); d[i] = lp * k; } }
    return (irCache[secs] = b);
  }
  // builds the chain the first time something is played (browsers only allow it after a tap)
  function start(a) {
    audio = a || audio; if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return false; ctx = new C(); src = ctx.createMediaElementSource(audio);
      pre = ctx.createGain(); eq = M.BANDS.map((f, i) => { const b = ctx.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1.1; b.gain.value = 0; return b; });
      bass = ctx.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 140; bass.gain.value = 0;
      // stereo widener: L' = a L + b R and R' = b L + a R, where a + b = 1 and a - b = the width
      const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2), mk = () => ctx.createGain(); const ll = mk(), rl = mk(), lr = mk(), rr = mk(); wide = { ll, rl, lr, rr };
      split.connect(ll, 0); split.connect(rl, 0); split.connect(lr, 1); split.connect(rr, 1); ll.connect(merge, 0, 0); lr.connect(merge, 0, 0); rl.connect(merge, 0, 1); rr.connect(merge, 0, 1);
      rev = ctx.createConvolver(); dry = ctx.createGain(); wet = ctx.createGain(); wet.gain.value = 0; an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.82; master = ctx.createGain();
      src.connect(pre); let node = pre; for (const b of eq) { node.connect(b); node = b; } node.connect(bass); bass.connect(split); merge.connect(dry); merge.connect(rev); rev.connect(wet); dry.connect(master); wet.connect(master); master.connect(an); an.connect(ctx.destination);
      freqData = new Uint8Array(an.frequencyBinCount); waveData = new Uint8Array(an.fftSize); apply(); return true;
    } catch (e) { console.warn('Music effects are not available here', e); ctx = null; return false; }
  }
  function apply() {
    if (!ctx) return; const t = ctx.currentTime;
    eq.forEach((b, i) => { b.gain.setTargetAtTime(state.eqOn ? state.gains[i] : 0, t, 0.03); });
    bass.gain.setTargetAtTime(state.bass * 14, t, 0.05);
    const g = 1 + state.virt * 2.2, a = (1 + g) / 2, b = (1 - g) / 2; wide.ll.gain.setTargetAtTime(a, t, 0.05); wide.rr.gain.setTargetAtTime(a, t, 0.05); wide.lr.gain.setTargetAtTime(b, t, 0.05); wide.rl.gain.setTargetAtTime(b, t, 0.05);
    const r = M.REVERBS.find(x => x[0] === state.reverb) || M.REVERBS[0]; if (r[2] > 0) { rev.buffer = ir(r[2]); wet.gain.setTargetAtTime(r[3], t, 0.08); dry.gain.setTargetAtTime(1 - r[3] * 0.4, t, 0.08); } else { wet.gain.setTargetAtTime(0, t, 0.08); dry.gain.setTargetAtTime(1, t, 0.08); }
    // keep the loudness steady when bands are boosted
    const boost = Math.max(0, ...state.gains.map(v => (state.eqOn ? v : 0)), state.bass * 10); pre.gain.setTargetAtTime(Math.pow(10, -boost * 0.45 / 20), t, 0.05);
  }
  const set = o => { Object.assign(state, o); apply(); };
  const get = () => state;
  /* ----- what the analyser hears ----- */
  const smooth = { bars: new Float32Array(64), peaks: new Float32Array(64), bass: 0 };
  function sample(n = 32, playing = true) {
    const out = new Float32Array(n);
    if (an && playing) { an.getByteFrequencyData(freqData); const bins = freqData.length, lo = 2, hi = Math.floor(bins * 0.72); for (let i = 0; i < n; i++) { const a = Math.floor(lo * Math.pow(hi / lo, i / n)), z = Math.max(a + 1, Math.floor(lo * Math.pow(hi / lo, (i + 1) / n))); let s = 0; for (let k = a; k < z; k++) s += freqData[k]; out[i] = Math.min(1, (s / (z - a) / 255) * (1 + i / n * 0.7)); } }
    else { const t = performance.now() / 700; for (let i = 0; i < n; i++) out[i] = 0.12 + 0.1 * Math.sin(t + i * 0.5) * Math.sin(t * 0.7 + i * 0.2); }
    for (let i = 0; i < n; i++) { smooth.bars[i] = Math.max(out[i], smooth.bars[i] - 0.025); smooth.peaks[i] = Math.max(smooth.bars[i], smooth.peaks[i] - 0.008); }
    let b = 0; for (let i = 0; i < Math.min(4, n); i++) b += out[i]; b /= Math.min(4, n); smooth.bass = Math.max(b, smooth.bass - 0.03);
    return { bars: smooth.bars.subarray(0, n), peaks: smooth.peaks.subarray(0, n), bass: smooth.bass };
  }
  function wave(playing = true) { if (an && playing) { an.getByteTimeDomainData(waveData); return waveData; } const w = new Uint8Array(512), t = performance.now() / 500; for (let i = 0; i < 512; i++) w[i] = 128 + Math.sin(i / 14 + t) * 12; return w; }

  /* ----- visualizers ----- */
  const VIZ = [['bars', 'Spectrum'], ['ring', 'Pulse ring'], ['dots', 'Dotted burst'], ['crystal', 'Crystal ring'], ['orbit', 'Orbit dust'], ['waves', 'Sound waves']];
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  const parts = Array.from({ length: 70 }, (_, i) => ({ a: Math.random() * 6.283, r: 0.9 + Math.random() * 0.7, s: 0.15 + Math.random() * 0.5, z: 1 + Math.random() * 3, h: 180 + Math.random() * 160 }));
  // g: the canvas, cx/cy/r: the disc in the middle, w/h: the whole picture, accent: a #rrggbb colour
  function draw(id, g, w, h, cx, cy, r, accent, st, t) {
    const bars = st.bars, n = bars.length;
    if (id === 'bars') {
      const cols = 24, bw = w / cols, top = cy + r * 1.25, hmax = Math.min(h - top - 10, r * 1.5), seg = 9, gap = 2;
      for (let i = 0; i < cols; i++) { const v = bars[Math.floor(i / cols * n)], blocks = Math.max(1, Math.round(v * hmax / seg)), hue = 5 + i / cols * 125;
        for (let k = 0; k < blocks; k++) { const y = top + hmax - (k + 1) * seg; g.fillStyle = hsl(hue, 90, 50 - k * 0.6); g.fillRect(i * bw + gap, y, bw - gap * 2, seg - gap); g.fillStyle = hsl(hue, 90, 50, 0.22); g.fillRect(i * bw + gap, top + hmax + k * seg + gap + 2, bw - gap * 2, seg - gap); }
        const pk = Math.round(st.peaks[Math.floor(i / cols * n)] * hmax / seg); g.fillStyle = hsl(hue, 95, 62); g.fillRect(i * bw + gap, top + hmax - (pk + 1) * seg - 4, bw - gap * 2, 3); }
    } else if (id === 'ring') {
      const N = 96; g.lineCap = 'round'; for (let i = 0; i < N; i++) { const a = i / N * 6.283 - 1.5708, v = bars[Math.floor(Math.abs(i / N * 2 - 1) * (n - 1))], r0 = r * 1.1, r1 = r0 + 6 + v * r * 0.5; g.strokeStyle = rgba(accent, 0.35 + v * 0.6); g.lineWidth = Math.max(2, r * 0.035); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
      g.strokeStyle = rgba(accent, 0.55); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r * 1.06, 0, 6.283); g.stroke();
    } else if (id === 'dots') {
      for (let ring = 0; ring < 2; ring++) { const N = 72; for (let i = 0; i < N; i++) { const a = i / N * 6.283 + t * (ring ? -0.15 : 0.1), v = bars[Math.floor(Math.abs(i / N * 2 - 1) * (n - 1))], rr = r * (1.12 + ring * 0.2) + v * r * (0.25 + ring * 0.15); g.fillStyle = rgba(accent, ring ? 0.4 + v * 0.4 : 0.6 + v * 0.4); g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2 + v * r * 0.05 + (ring ? 0 : 1), 0, 6.283); g.fill(); } }
    } else if (id === 'crystal') {
      for (let layer = 0; layer < 2; layer++) { const N = 64; g.beginPath(); for (let i = 0; i <= N; i++) { const a = i / N * 6.283 + t * 0.1 * (layer ? -1 : 1), v = bars[Math.floor(Math.abs((i % N) / N * 2 - 1) * (n - 1))], rr = r * (1.1 + layer * 0.08) + (i % 2 ? v * r * 0.35 : 0) * (layer ? 0.6 : 1); i ? g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.strokeStyle = rgba(accent, layer ? 0.4 : 0.9); g.lineWidth = layer ? 1.5 : 2.5; g.lineJoin = 'miter'; g.stroke(); }
    } else if (id === 'orbit') {
      g.save(); g.globalCompositeOperation = 'lighter'; for (const p of parts) { const a = p.a + t * p.s * (1 + st.bass * 2), rr = r * (p.r + st.bass * 0.25), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92, sz = p.z * (1 + st.bass * 2.2); const gr = g.createRadialGradient(x, y, 0, x, y, sz * 3); gr.addColorStop(0, hsl(p.h, 85, 70, 0.9)); gr.addColorStop(1, hsl(p.h, 85, 60, 0)); g.fillStyle = gr; g.fillRect(x - sz * 3, y - sz * 3, sz * 6, sz * 6); } g.restore();
      for (let k = 1; k <= 3; k++) { g.strokeStyle = 'rgba(255,255,255,' + (0.07 * k) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, r * (1 + k * 0.17) * (1 + st.bass * 0.03), 0, 6.283); g.stroke(); }
    } else if (id === 'waves') {
      const wv = st.wave, N = 128; for (let layer = 0; layer < 3; layer++) { g.beginPath(); for (let i = 0; i <= N; i++) { const x = i / N * w, s = (wv[Math.floor(i / N * (wv.length - 1))] - 128) / 128; const y = cy + r * 1.65 + Math.sin(i * 0.2 + t * (1 + layer) ) * 6 * (layer + 1) * 0.4 + s * r * (0.55 - layer * 0.15) * (1 + st.bass); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = rgba(accent, 0.85 - layer * 0.25); g.lineWidth = 3 - layer * 0.6; g.stroke(); }
    }
  }
  return { start, set, get, sample, wave, draw, VIZ, get ready() { return !!ctx; }, get context() { return ctx; } };
})();

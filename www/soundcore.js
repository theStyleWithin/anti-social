'use strict';
/* Sound Meter: the pure maths. Turns a block of microphone samples into a sound level in decibels, with A, C or no
   weighting, and keeps min, average, max and peak. No page, no microphone here. */
const SoundCore = (() => {
  const DEFAULT_OFFSET = 90;      // dB shown for a full-scale-ish signal; the person calibrates this against a real meter
  const WEIGHTS = [['A', 'A weighting (dBA)', 'Like human hearing. Use this one for everyday noise.'], ['C', 'C weighting (dBC)', 'Flatter, counts bass more. Good for music and machinery.'], ['Z', 'No weighting (dB)', 'Every pitch counts the same.']];
  const aDb = f => { if (f <= 0) return -200; const f2 = f * f, ra = 12194 ** 2 * f2 * f2 / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2)); return 20 * Math.log10(ra) + 2.0; };
  const cDb = f => { if (f <= 0) return -200; const f2 = f * f, rc = 12194 ** 2 * f2 / ((f2 + 20.6 ** 2) * (f2 + 12194 ** 2)); return 20 * Math.log10(rc) + 0.06; };
  const weightDb = (w, f) => w === 'A' ? aDb(f) : w === 'C' ? cDb(f) : 0;

  // in-place radix-2 FFT; length must be a power of two
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  const pow2 = n => { let p = 1; while (p * 2 <= n) p *= 2; return p; };
  const HANN = new Map();
  const hann = n => { let w = HANN.get(n); if (!w) { w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n); HANN.set(n, w); } return w; };
  const WEIGHT_CACHE = new Map();
  const weightTable = (n, sr, w) => { const key = `${n}|${sr}|${w}`; let t = WEIGHT_CACHE.get(key); if (!t) { t = new Float64Array(n / 2 + 1); for (let k = 1; k <= n / 2; k++) t[k] = 10 ** (weightDb(w, k * sr / n) / 10); if (WEIGHT_CACHE.size > 12) WEIGHT_CACHE.clear(); WEIGHT_CACHE.set(key, t); } return t; };

  // RMS of the samples as heard through the weighting (linear, 1 = full scale square-ish). Z gives the plain RMS.
  function weightedRms(samples, sampleRate, weighting = 'A') {
    if (weighting === 'Z') { let s = 0; for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i]; return Math.sqrt(s / (samples.length || 1)); }
    const n = pow2(samples.length); if (n < 8) return 0;
    const w = hann(n), re = new Float64Array(n), im = new Float64Array(n);
    let wsum = 0; for (let i = 0; i < n; i++) { re[i] = samples[i] * w[i]; wsum += w[i] * w[i]; }
    fft(re, im);
    const g = weightTable(n, sampleRate, weighting); let total = 0;
    for (let k = 1; k <= n / 2; k++) total += (k === n / 2 ? 1 : 2) * g[k] * (re[k] * re[k] + im[k] * im[k]);
    return Math.sqrt(total / (n * wsum));
  }
  const peakAbs = s => { let m = 0; for (let i = 0; i < s.length; i++) { const a = Math.abs(s[i]); if (a > m) m = a; } return m; };
  const toDb = (lin, offset = DEFAULT_OFFSET) => 20 * Math.log10(Math.max(lin, 1e-9)) + offset;
  const clampOffset = o => Math.max(0, Math.min(200, Number.isFinite(+o) ? +o : DEFAULT_OFFSET));
  // the offset that would have made `current` read `target`
  const calibrate = (offset, current, target) => clampOffset(offset + (target - current));

  /* ---------- min, average (energy), max, peak ---------- */
  const newStats = () => ({ n: 0, min: null, max: null, energy: 0, peak: null, seconds: 0 });
  const addStat = (st, db, peakDb) => {
    st.n++; st.energy += 10 ** (db / 10);
    st.min = st.min === null ? db : Math.min(st.min, db); st.max = st.max === null ? db : Math.max(st.max, db);
    const p = peakDb === undefined ? db : peakDb; st.peak = st.peak === null ? p : Math.max(st.peak, p);
    return st;
  };
  const avgOf = st => st.n ? 10 * Math.log10(st.energy / st.n) : null;
  const fmtDb = v => v === null || v === undefined || !Number.isFinite(v) ? '--' : v.toFixed(1);

  /* ---------- what a level means ---------- */
  const LEVELS = [[0, 'Threshold of hearing'], [10, 'Still air, a breath'], [20, 'Rustling leaves'], [30, 'A whisper'], [40, 'A quiet library'], [50, 'Light rain, a quiet office'], [60, 'Normal conversation'], [70, 'A vacuum cleaner, busy road'], [80, 'Heavy traffic, an alarm clock'], [90, 'A lawn mower'], [100, 'A subway train'], [110, 'A rock concert'], [120, 'An ambulance siren up close'], [130, 'Pain threshold']];
  const describe = db => { let out = LEVELS[0][1]; for (const [l, t] of LEVELS) if (db >= l - 5) out = t; return out; };
  const risk = db => db < 70 ? ['safe', 'Comfortable'] : db < 85 ? ['loud', 'Loud, but fine for hours'] : db < 100 ? ['risk', 'Can harm hearing over time'] : ['danger', 'Dangerous within minutes'];
  // hours at this level before it counts as a full day of noise (8 h at 85 dB, halving every 3 dB)
  const safeHours = db => db < 85 ? Infinity : 8 / 2 ** ((db - 85) / 3);
  const fmtSafe = hours => { if (!Number.isFinite(hours)) return 'No limit'; const m = hours * 60; return m >= 90 ? (m / 60).toFixed(1) + ' hours' : m >= 1 ? Math.round(m) + ' minutes' : Math.max(1, Math.round(m * 60)) + ' seconds'; };
  const arc = db => Math.max(0, Math.min(1, (db - 20) / 100));

  /* ---------- saved readings ---------- */
  const downsample = (arr, n = 120) => { if (arr.length <= n) return arr.slice(); const out = []; for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * arr.length / n)]); return out; };
  const num = (v, d = 0) => Number.isFinite(+v) && v !== null && v !== '' ? +v : d;
  const normReading = r => ({ name: String(r.name || '').slice(0, 80), weighting: WEIGHTS.some(w => w[0] === r.weighting) ? r.weighting : 'A', min: num(r.min), avg: num(r.avg), max: num(r.max), peak: num(r.peak), seconds: Math.max(0, Math.round(num(r.seconds))), series: (Array.isArray(r.series) ? r.series : []).map(Number).filter(Number.isFinite).slice(0, 240).map(v => Math.round(v * 10) / 10) });
  const fmtDuration = s => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  const csv = rows => [['Date', 'Name', 'Weighting', 'Min', 'Average', 'Max', 'Peak', 'Seconds'], ...rows.map(r => [new Date(r.at).toISOString(), r.name, r.weighting, r.min, r.avg, r.max, r.peak, r.seconds])].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n';

  return { DEFAULT_OFFSET, WEIGHTS, aDb, cDb, weightDb, fft, weightedRms, peakAbs, toDb, clampOffset, calibrate, newStats, addStat, avgOf, fmtDb, LEVELS, describe, risk, safeHours, fmtSafe, arc, downsample, normReading, fmtDuration, csv };
})();
if (typeof module !== 'undefined') module.exports = SoundCore;

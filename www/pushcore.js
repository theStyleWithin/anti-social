'use strict';
/* Push-Up Counter: the pure part. Decides when a nose touch counts, and, if you turn the voice check on, whether a sound of you counting
   went with it. It listens for sound, not words: it knows that you made a noise at the same moment, not what you said. */
const PushCore = (() => {
  const MIN_GAP = 280;      // ms: the least time between two counted touches
  const VOICE_WINDOW = 1400; // ms: how close a touch and a sound have to be
  // The counter. Feed it events in time order; it says whether each touch counted.
  function makeCounter({ voice = false, now = 0 } = {}) {
    const s = { reps: 0, last: -1e9, down: 0, voice, lastVoice: -1e9, voiceUsed: true, pending: null, rejected: 0, log: [] };
    const count = (t, how) => { s.reps++; s.last = t; s.log.push({ t, how }); return { counted: true, reps: s.reps, how }; };
    return {
      s,
      // a finger or nose lands on the screen
      touch(t) {
        s.down++; if (s.down > 1) return { counted: false, why: 'already down' };            // a second contact while the first is still down is the same press
        if (t - s.last < MIN_GAP) return { counted: false, why: 'too soon' };
        if (!s.voice) return count(t, 'touch');
        if (!s.voiceUsed && t - s.lastVoice <= VOICE_WINDOW) { s.voiceUsed = true; return count(t, 'voice first'); }
        s.pending = t; return { counted: false, why: 'waiting for your voice', waiting: true };
      },
      release() { s.down = Math.max(0, s.down - 1); },
      // a burst of sound was heard
      sound(t) {
        if (!s.voice) return { counted: false };
        s.lastVoice = t; s.voiceUsed = false;
        if (s.pending !== null && t - s.pending <= VOICE_WINDOW) { s.pending = null; s.voiceUsed = true; return count(t, 'touch then voice'); }
        return { counted: false };
      },
      // call now and then: a touch that never got its voice is dropped
      tick(t) { if (s.pending !== null && t - s.pending > VOICE_WINDOW) { s.pending = null; s.rejected++; return { dropped: true }; } return {}; },
    };
  }
  // tells a spoken sound from the room: a level well above the quiet, held for a moment
  function makeVoiceDetector({ floor = 0.01, hold = 70 } = {}) {
    let thr = Math.max(0.04, floor * 3.5), since = -1, active = false, sm = 0;
    return {
      get threshold() { return thr; },
      calibrate(levels) { if (!levels.length) return; const sorted = levels.slice().sort((a, b) => a - b), q = sorted[Math.floor(sorted.length * 0.25)]; thr = Math.min(0.25, Math.max(0.04, q * 3.5 + 0.02)); },   // the quiet side of the room, never so high that speech cannot pass
      // returns true on the moment a sound starts
      feed(level, t) {
        sm = sm * 0.5 + level * 0.5; const loud = sm > thr;
        if (loud) { if (since < 0) since = t; if (!active && t - since >= hold) { active = true; return true; } } else { since = -1; if (sm < thr * 0.6) active = false; }
        return false;
      },
      get level() { return sm; },
    };
  }
  const rms = buf => { let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } return Math.sqrt(s / buf.length); };
  const fmt = secs => { secs = Math.max(0, Math.round(secs)); return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; };
  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function stats(sessions) {
    const by = {}; let total = 0, best = 0, bestSet = 0; for (const s of sessions) { by[s.date] = (by[s.date] || 0) + s.reps; total += s.reps; best = Math.max(best, s.reps); for (const r of s.sets || []) bestSet = Math.max(bestSet, r); }
    let streak = 0, d = new Date(); if (!by[dayKey(d.getTime())]) d = new Date(d.getTime() - 86400000); while (by[dayKey(d.getTime())]) { streak++; d = new Date(d.getTime() - 86400000); }
    return { by, total, best, bestSet, sessions: sessions.length, streak };
  }
  return { MIN_GAP, VOICE_WINDOW, makeCounter, makeVoiceDetector, rms, fmt, dayKey, stats };
})();
if (typeof module !== 'undefined') module.exports = PushCore;

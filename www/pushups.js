'use strict';
/* Push-Up Counter: put your phone flat on the floor where your nose lands at the bottom of each push-up. Touch the screen with your nose
   and it counts. Optionally it also listens for you counting out loud, so a finger tap alone does not count. */
const PU = PushCore;
const puPrefsGet = () => { let p = {}; try { p = JSON.parse(ls('as.pushup') || '{}') || {}; } catch { /* defaults */ } const n = (v, d, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+v) && +v > 0 ? Math.round(+v) : d));
  return { mode: ['free', 'sets', 'max'].includes(p.mode) ? p.mode : 'free', reps: n(p.reps, 10, 1, 200), sets: n(p.sets, 3, 1, 20), rest: n(p.rest, 60, 5, 600), countdown: n(p.countdown, 5, 3, 20), voice: p.voice === true, announce: p.announce === true, beep: p.beep !== false, vibrate: p.vibrate !== false, kcal: p.kcal !== false }; };
const puPrefsSet = p => ls('as.pushup', JSON.stringify(p));
let puBeepCtx = null;
function puTone(freq, dur = 0.12, vol = 0.18) { try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; puBeepCtx = puBeepCtx || new C(); if (puBeepCtx.state === 'suspended') puBeepCtx.resume(); const o = puBeepCtx.createOscillator(), g = puBeepCtx.createGain(), t = puBeepCtx.currentTime; o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(puBeepCtx.destination); o.start(t); o.stop(t + dur + 0.02); } catch { /* quiet */ } }

function pushupView(acct, ctx, back) {
  const prefs = puPrefsGet(), root = h('div', { class: 'app-pad pu' }); let tab = 'train';
  const sessions = (ctx.apps.pushup || []).slice().sort((a, b) => b.at - a.at);
  const kg = ((ctx.apps.calprof || [])[0] || {}).kg || 70;
  const save = () => puPrefsSet(prefs);

  function train() {
    const modeBtn = (id, label, tip) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(prefs.mode === id), class: 'pu-mode' + (prefs.mode === id ? ' on' : ''), onclick: () => { prefs.mode = id; save(); draw(); } }, h('b', {}, label), h('small', {}, tip));
    const num = (label, key, lo, hi, step = 1) => h('label', { class: 'field' }, h('span', {}, label), h('div', { class: 'pu-step' }, h('button', { class: 'btn', type: 'button', 'aria-label': 'Less ' + label, onclick: () => { prefs[key] = Math.max(lo, prefs[key] - step); save(); draw(); } }, '−'), h('output', {}, String(prefs[key])), h('button', { class: 'btn', type: 'button', 'aria-label': 'More ' + label, onclick: () => { prefs[key] = Math.min(hi, prefs[key] + step); save(); draw(); } }, '+')));
    const chk = (label, key, extra, disabled) => h('label', { class: 'check pu-chk' }, h('input', { type: 'checkbox', checked: prefs[key], disabled: !!disabled, onchange: e => { prefs[key] = e.target.checked; save(); draw(); } }), ' ', h('span', {}, label, extra ? h('small', {}, extra) : null));
    return h('div', {},
      h('div', { class: 'pu-how' }, h('b', {}, 'How it works'), h('p', {}, 'Lay your phone flat on the floor, screen up, right where your nose lands at the bottom of a push-up. Each time your nose touches the screen, that is one rep. Come all the way down or it does not count.')),
      h('div', { class: 'pu-modes', role: 'radiogroup', 'aria-label': 'Workout' }, modeBtn('free', 'Free', 'Count until you stop'), modeBtn('sets', 'Sets', 'Reps, sets and rests'), modeBtn('max', 'Max test', 'As many as you can')),
      prefs.mode === 'sets' ? h('div', { class: 'tool-fields' }, num('Reps per set', 'reps', 1, 200), num('Sets', 'sets', 1, 20), num('Rest (seconds)', 'rest', 5, 600, 5)) : null,
      h('div', { class: 'pu-opts' },
        chk('Check my voice', 'voice', 'A rep only counts if you also say the number out loud, so it cannot be done by tapping with a finger. It listens for sound, not words. It asks to use the microphone and nothing is recorded.'),
        chk('Count out loud for me', 'announce', prefs.voice ? 'Turned off while the voice check is on, so it does not hear itself.' : 'Says each number after your nose touches the screen.', prefs.voice),
        chk('Beep on every rep', 'beep', '', prefs.voice), chk('Buzz on every rep', 'vibrate', 'Phones only.'), chk('Add the calories to my Calorie Counter', 'kcal', 'A rough guess, about a third of a calorie per push-up.')),
      num('Get-ready countdown (seconds)', 'countdown', 3, 20),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary pu-start', onclick: () => run() }, 'Start')),
      h('p', { class: 'fine' }, 'To end a workout, press and hold the Stop button in the corner. Anywhere else on the screen counts as a touch. On a computer you can also press the space bar to count.'));
  }

  function history() {
    const st = PU.stats(sessions), keys = Array.from({ length: 14 }, (_, i) => KcalCore.shiftDay(PU.dayKey(), i - 13)), vals = keys.map(k => st.by[k] || 0), max = Math.max(10, ...vals), W = 320, H = 120, bw = W / 14, chart = h('div', { class: 'kc-chart' });
    chart.innerHTML = `<svg viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Push-ups per day, last 14 days">${vals.map((v, i) => `<rect x="${i * bw + 3}" y="${H - Math.max(2, v / max * H)}" width="${bw - 6}" height="${Math.max(2, v / max * H)}" rx="3" class="${v ? 'ok' : 'none'}"/>`).join('')}${keys.map((k, i) => (i % 3 === 0 ? `<text x="${i * bw + bw / 2}" y="${H + 14}" text-anchor="middle">${k.slice(8)}</text>` : '')).join('')}</svg>`;
    const stat = (n, l) => h('div', { class: 'lg-stat' }, h('b', {}, String(n)), h('small', {}, l));
    return h('div', {}, h('div', { class: 'lg-stats' }, stat(st.total, 'push-ups ever'), stat(st.best, 'best workout'), stat(st.bestSet || '–', 'best set'), stat(st.streak, 'day streak')), h('h3', { class: 'lg-h2' }, 'Last 14 days'), chart,
      h('h3', { class: 'lg-h2' }, 'Workouts'), sessions.length ? sessions.slice(0, 40).map(s => h('div', { class: 'kc-item static' }, h('span', { class: 'kc-item-n' }, h('b', {}, `${s.reps} push-ups`), h('small', {}, `${new Date(s.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${PU.fmt(s.secs)}${s.sets && s.sets.length > 1 ? ' · ' + s.sets.join(' + ') : ''}${s.voice ? ' · voice checked' : ''}`)), h('button', { class: 'kc-x', type: 'button', 'aria-label': 'Delete this workout', onclick: async () => { if (!confirm('Delete this workout?')) return; await appDelete(s.id); sessions.splice(sessions.indexOf(s), 1); draw(); } }, icon('x')))) : h('p', { class: 'muted' }, 'No workouts yet. Your first one will show up here.'));
  }

  /* ----- a workout ----- */
  function run() {
    const o = { ...prefs }, voiceOn = o.voice, counter = PU.makeCounter({ voice: voiceOn }), det = PU.makeVoiceDetector();
    const sets = []; let stage = 'ready', setNo = 1, startedAt = 0, wake = null, mic = null, timers = [], ended = false, pointers = new Set(), setReps = 0;
    const num = h('div', { class: 'pu-num', 'aria-live': 'off' }, '0'), msg = h('div', { class: 'pu-msg' }, ''), sub = h('div', { class: 'pu-sub' }, ''), meter = h('div', { class: 'pu-meter' }, h('i', {}), h('span', {}, 'Microphone')), skip = h('button', { class: 'pu-ctl pu-skip', type: 'button', hidden: true, onclick: () => nextSet() }, 'Skip rest');
    let holdT = null; const holdBar = h('i', {}), stop = h('button', { class: 'pu-ctl pu-stop', type: 'button', 'aria-label': 'Hold to stop' }, holdBar, h('span', {}, 'Hold to stop'));
    const down = e => { e.stopPropagation(); holdBar.style.transition = 'width 1.2s linear'; holdBar.style.width = '100%'; holdT = setTimeout(() => finish(), 1200); }, up = () => { clearTimeout(holdT); holdBar.style.transition = 'none'; holdBar.style.width = '0%'; };
    stop.addEventListener('pointerdown', down); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => stop.addEventListener(t, up)); skip.addEventListener('pointerdown', e => e.stopPropagation());
    const el = h('div', { class: 'pu-full', role: 'dialog', 'aria-label': 'Push-up workout' }, stop, meter, h('div', { class: 'pu-center' }, msg, num, sub), skip);
    meter.hidden = !voiceOn;
    document.body.append(el); document.body.classList.add('pu-lock');
    try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch { /* fine */ }
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { wake = l; if (ended) l.release(); }).catch(() => {}); } catch { /* fine */ }
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const flash = () => { num.classList.remove('hit'); void num.offsetWidth; num.classList.add('hit'); };
    const say = t => { try { if (!o.announce || voiceOn) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t)); u.rate = 1.1; speechSynthesis.speak(u); } catch { /* quiet */ } };
    const rep = () => {
      setReps++; num.textContent = String(counter.s.reps); flash(); msg.textContent = '';
      if (o.beep && !voiceOn) puTone(880, 0.08); if (o.vibrate) { try { navigator.vibrate && navigator.vibrate(25); } catch { /* none */ } } say(counter.s.reps);
      if (o.mode === 'sets') { sub.textContent = `Set ${setNo} of ${o.sets}: ${setReps} of ${o.reps}`; if (setReps >= o.reps) setDone(); }
    };
    const apply = r => { if (r && r.counted && stage === 'active') rep(); else if (r && r.waiting && stage === 'active') { msg.textContent = 'Say the number!'; msg.classList.add('warn'); } };
    function setDone() {
      sets.push(setReps); stage = 'between'; if (o.vibrate) { try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch { /* none */ } } puTone(660, 0.2); puTone(990, 0.25);
      if (setNo >= o.sets) { msg.textContent = 'All sets done!'; later(finish, 900); return; }
      let left = o.rest; stage = 'rest'; skip.hidden = false; msg.textContent = 'Rest'; num.textContent = String(left); sub.textContent = `Next: set ${setNo + 1} of ${o.sets}`;
      const iv = setInterval(() => { if (stage !== 'rest') { clearInterval(iv); return; } left--; num.textContent = String(Math.max(0, left)); if (left <= 3 && left > 0) puTone(520, 0.08); if (left <= 0) { clearInterval(iv); nextSet(); } }, 1000); timers.push(iv);
    }
    function nextSet() { if (stage !== 'rest') return; skip.hidden = true; setNo++; setReps = 0; countdown(3, () => { num.textContent = String(counter.s.reps); sub.textContent = `Set ${setNo} of ${o.sets}: 0 of ${o.reps}`; }); }
    function countdown(n, then) {
      stage = 'count'; let left = n; msg.textContent = 'Get ready'; msg.classList.remove('warn'); num.textContent = String(left); num.classList.add('big');
      const iv = setInterval(() => { left--; if (left > 0) { num.textContent = String(left); puTone(520, 0.08); } else { clearInterval(iv); stage = 'active'; puTone(880, 0.25); num.classList.remove('big'); msg.textContent = 'Go!'; later(() => { if (msg.textContent === 'Go!') msg.textContent = ''; }, 900); pointers.clear(); counter.s.down = 0; then(); if (!startedAt) startedAt = Date.now(); } }, 1000); timers.push(iv);
    }
    // a touch is anything that lands on the screen that is not a button
    el.addEventListener('pointerdown', e => { if (e.target.closest('.pu-ctl')) return; e.preventDefault(); pointers.add(e.pointerId); if (stage !== 'active') return; counter.s.down = pointers.size - 1; apply(counter.touch(performance.now())); });
    const lift = e => { pointers.delete(e.pointerId); counter.release(); };
    el.addEventListener('pointerup', lift); el.addEventListener('pointercancel', lift); el.addEventListener('contextmenu', e => e.preventDefault()); el.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    const onKey = e => { if (e.code === 'Space' && stage === 'active' && !e.repeat) { e.preventDefault(); counter.s.down = 0; apply(counter.touch(performance.now())); counter.release(); } };
    document.addEventListener('keydown', onKey);
    // the microphone: calibrate on the room first, then watch for you counting
    async function startMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }), C = window.AudioContext || window.webkitAudioContext, ac = new C(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
        const buf = new Uint8Array(an.fftSize), levels = []; let calibrating = true; mic = { stream, ac };
        later(() => { calibrating = false; det.calibrate(levels); }, 1500);
        const iv = setInterval(() => { an.getByteTimeDomainData(buf); const lv = PU.rms(buf), t = performance.now(); meter.firstChild.style.width = Math.min(100, lv * 400) + '%';
          if (calibrating) { levels.push(lv); return; } if (stage === 'active') { if (det.feed(lv, t)) apply(counter.sound(t)); const d = counter.tick(t); if (d.dropped) { msg.textContent = 'No voice, so that one did not count'; msg.classList.add('warn'); later(() => { if (stage === 'active') { msg.textContent = ''; msg.classList.remove('warn'); } }, 1600); } } else det.feed(lv, t); }, 20); timers.push(iv);
      } catch (e) { voiceOn && (counter.s.voice = false); meter.hidden = true; msg.textContent = 'The microphone is not available, so reps count by touch only.'; toast('The microphone is not available, so the voice check is off for this workout.'); }
    }
    async function finish() {
      if (ended) return; ended = true; stage = 'over'; timers.forEach(t => { clearTimeout(t); clearInterval(t); }); document.removeEventListener('keydown', onKey);
      try { if (mic) { mic.stream.getTracks().forEach(t => t.stop()); mic.ac.close(); } } catch { /* fine */ } try { wake && wake.release(); } catch { /* fine */ } try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* fine */ }
      el.remove(); document.body.classList.remove('pu-lock'); try { speechSynthesis.cancel(); } catch { /* none */ }
      if (setReps > 0 && (o.mode !== 'sets' || sets.length < o.sets || sets[sets.length - 1] !== setReps)) { if (o.mode === 'sets') sets.push(setReps); else sets.push(setReps); }
      const reps = counter.s.reps, secs = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
      if (!reps) { toast('No push-ups counted, so nothing was saved.'); draw(); return; }
      const rec = { id: 'push' + acct.id + Date.now(), accountId: acct.id, kind: 'pushup', createdAt: Date.now(), at: Date.now(), date: PU.dayKey(), reps, secs, sets: o.mode === 'sets' ? sets : [reps], mode: o.mode, voice: voiceOn && counter.s.voice };
      await appSave(acct, rec); sessions.unshift(rec); const kc = KcalCore.pushupKcal(reps, kg); if (o.kcal && typeof kcalAddExercise === 'function') kcalAddExercise(acct, `Push-ups (${reps})`, kc);
      const prev = Math.max(0, ...sessions.slice(1).map(s => s.reps)), best = reps > prev && sessions.length > 1;
      root.replaceChildren(h('div', { class: 'lg-done' }, h('div', { class: 'lg-trophy' }, icon('dumbbell')), h('h2', {}, `${reps} push-ups`), h('p', { class: 'muted' }, best ? 'A new personal best!' : 'Nicely done.'),
        h('div', { class: 'lg-stats' }, h('div', { class: 'lg-stat' }, h('b', {}, PU.fmt(secs)), h('small', {}, 'time')), h('div', { class: 'lg-stat' }, h('b', {}, `≈ ${kc}`), h('small', {}, 'calories (rough)')), h('div', { class: 'lg-stat' }, h('b', {}, String(PU.stats(sessions).streak)), h('small', {}, 'day streak'))),
        o.mode === 'sets' && rec.sets.length > 1 ? h('p', { class: 'fine' }, 'Sets: ' + rec.sets.join(' + ')) : null,
        h('div', { class: 'btnrow', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: draw }, 'Done'), h('button', { class: 'btn', onclick: run }, 'Go again'))));
    }
    if (voiceOn) startMic();
    num.textContent = '0'; sub.textContent = o.mode === 'sets' ? `Set 1 of ${o.sets}: 0 of ${o.reps}` : o.mode === 'max' ? 'As many as you can' : '';
    countdown(o.countdown, () => { num.textContent = '0'; if (!startedAt) startedAt = Date.now(); });
    window.__puFinish = finish;   // lets the page close the workout if the app is left
  }

  function draw() {
    root.replaceChildren(h('div', { class: 'aq-tabs', role: 'tablist' }, [['train', 'Train'], ['history', 'History']].map(([id, n]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; draw(); } }, n))), tab === 'train' ? train() : history());
  }
  draw();
  return [back(appName(acct, 'pushup')), root];
}

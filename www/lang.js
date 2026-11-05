'use strict';
/* Language Lab: short lessons in Spanish, French, German, Italian, Portuguese and Japanese. Everything is in the app, so it works offline.
   Words you miss come back sooner, words you know come back later. Progress is kept per account, on this device. */
const LC = LangCore;
let lgCode = null, lgKeyHandler = null;
const lgPrefsGet = () => { let p = {}; try { p = JSON.parse(ls('as.lang') || '{}') || {}; } catch { /* defaults */ } return { code: p.code || '', sound: p.sound !== false, speak: p.speak !== false, goal: [10, 20, 30, 50].includes(p.goal) ? p.goal : 20 }; };
const lgPrefsSet = p => ls('as.lang', JSON.stringify(p));
const lgRecId = (acct, code) => 'lang' + code + acct.id;
const lgBlank = (acct, code) => ({ id: lgRecId(acct, code), accountId: acct.id, kind: 'lang', code, createdAt: Date.now(), xp: 0, days: {}, words: {}, lessons: {} });

/* ----- sound: a few short notes, and the browser's own voices (offline ones where the computer has them) ----- */
let lgAudio = null;
function lgBeep(kind) {
  if (!lgPrefsGet().sound) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return; lgAudio = lgAudio || new C(); if (lgAudio.state === 'suspended') lgAudio.resume();
    const notes = { good: [[660, 0], [880, 0.09]], bad: [[220, 0], [165, 0.12]], done: [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3]] }[kind] || [];
    for (const [f, at] of notes) { const o = lgAudio.createOscillator(), g = lgAudio.createGain(), t = lgAudio.currentTime + at; o.type = kind === 'bad' ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(lgAudio.destination); o.start(t); o.stop(t + 0.2); }
  } catch { /* no sound is fine */ }
}
const lgVoiceFor = tts => { try { const vs = speechSynthesis.getVoices(), want = tts.toLowerCase(); return vs.find(v => v.lang.toLowerCase().replace('_', '-') === want) || vs.find(v => v.lang.toLowerCase().startsWith(want.slice(0, 2))) || null; } catch { return null; } };
const lgCanSpeak = tts => { try { return typeof speechSynthesis !== 'undefined' && !!lgVoiceFor(tts); } catch { return false; } };
function lgSpeak(text, tts, slow) {
  try { if (!lgCanSpeak(tts)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text), v = lgVoiceFor(tts); u.voice = v; u.lang = v.lang; u.rate = slow ? 0.7 : 0.9; speechSynthesis.speak(u); } catch { /* quiet */ }
}
try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices(); } catch { /* none */ }

/* ----- the view ----- */
function langView(acct, ctx, back) {
  const prefs = lgPrefsGet(), root = h('div', { class: 'app-pad lg' });
  const recs = new Map((ctx.apps.lang || []).map(r => [r.code, r]));
  const recFor = code => { if (!recs.has(code)) recs.set(code, lgBlank(acct, code)); return recs.get(code); };
  const save = async rec => { rec.updatedAt = Date.now(); const ok = await appSave(acct, rec); return ok; };
  const show = node => { lgStopKeys(); root.replaceChildren(node); };
  const course = () => LangData.langs[lgCode];
  if (!lgCode || !LangData.langs[lgCode]) lgCode = LangData.langs[prefs.code] ? prefs.code : '';

  /* choose a language */
  function picker() {
    const cards = LangData.list().map(l => { const r = recs.get(l.id), learned = r ? Object.values(r.words).filter(s => s.b >= LC.MASTERED).length : 0;
      return h('button', { class: 'lg-lang', type: 'button', onclick: () => { lgCode = l.id; prefs.code = l.id; lgPrefsSet(prefs); home(); } },
        h('span', { class: 'lg-native', lang: l.tts }, l.native), h('b', {}, l.name), h('small', {}, r ? `${r.xp} XP · ${learned} words learned` : (l.note || 'Start from the beginning'))); });
    show(h('div', {}, h('h2', { class: 'lg-h' }, 'What would you like to learn?'), h('p', { class: 'fine' }, 'Short lessons that work offline. Pick one; you can switch any time and your progress in each stays put.'), h('div', { class: 'lg-langs' }, cards)));
  }

  /* the course: your numbers, then the units */
  function home() {
    if (!course()) return picker();
    const C0 = course(), rec = recFor(lgCode), today = LC.dayKey(), todayXp = rec.days[today] || 0, streak = LC.streakOf(rec.days), due = LC.dueWords(C0, rec.words).length;
    const learned = Object.values(rec.words).filter(s => s.b >= LC.MASTERED).length, started = Object.keys(rec.words).length > 0, speech = lgCanSpeak(C0.tts);
    const goalPct = Math.min(100, Math.round(todayXp / prefs.goal * 100));
    const stat = (n, label) => h('div', { class: 'lg-stat' }, h('b', {}, String(n)), h('small', {}, label));
    let next = null;
    const units = C0.units.map(u => {
      const st = LC.unitStats(u, rec.words), prog = rec.lessons[u.id] || {}, n = LC.lessonCount(u);
      const btn = (label, idx, kind, i) => { const isDone = idx === 'test' ? !!prog.test : !!(prog.l && prog.l[idx]), isNext = !next && !isDone && kind === 'lesson'; if (isNext) next = { u, i }; return h('button', { class: 'lg-step' + (isDone ? ' done' : '') + (isNext ? ' next' : ''), type: 'button', 'aria-label': `${u.title}, ${kind === 'test' ? 'test' : 'lesson ' + (i + 1)}${isDone ? ', done' : ''}`, onclick: () => begin(u, kind, i) }, isDone ? icon('check') : label); };
      const steps = []; for (let i = 0; i < n; i++) steps.push(btn(String(i + 1), i, 'lesson', i)); steps.push(btn('Test', 'test', 'test', 0));
      return h('section', { class: 'lg-unit' }, h('div', { class: 'lg-unit-top' }, h('b', {}, u.title), h('small', {}, `${st.learned} of ${st.total} learned`)), h('div', { class: 'lg-bar', role: 'progressbar', 'aria-valuenow': String(st.pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': u.title + ' mastery' }, h('i', { style: `width:${st.pct}%` })), h('div', { class: 'lg-steps' }, steps));
    });
    const settings = () => {
      const sound = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: prefs.sound, onchange: e => { prefs.sound = e.target.checked; lgPrefsSet(prefs); } }), ' Sound effects');
      const say = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: prefs.speak, onchange: e => { prefs.speak = e.target.checked; lgPrefsSet(prefs); } }), ' Say new words out loud');
      const goal = h('select', { 'aria-label': 'Daily goal', onchange: e => { prefs.goal = Number(e.target.value); lgPrefsSet(prefs); home(); } }, [10, 20, 30, 50].map(g => h('option', { value: String(g) }, `${g} XP a day`))); goal.value = String(prefs.goal);
      return h('details', { class: 'lg-set' }, h('summary', {}, 'Settings'), h('div', { class: 'lg-set-in' }, sound, say, h('label', { class: 'field' }, h('span', {}, 'Daily goal'), goal),
        h('p', { class: 'fine' }, speech ? 'Voices come from your computer, so they work offline too.' : `No ${C0.name} voice was found on this device, so there is no spoken audio. Installing one in your system's speech settings adds it.`),
        h('button', { class: 'btn danger', onclick: () => { if (!confirm(`Erase your ${C0.name} progress? There is no undo.`)) return; recs.delete(lgCode); appDelete(lgRecId(acct, lgCode)).then(() => { toast('Progress erased.'); home(); }); } }, `Start ${C0.name} over`)));
    };
    show(h('div', {},
      h('div', { class: 'lg-head' }, h('div', {}, h('h2', { class: 'lg-h', lang: C0.tts }, C0.native), h('small', {}, C0.name + (C0.note ? ' · ' + C0.note : ''))), h('button', { class: 'btn', onclick: picker }, 'Change language')),
      h('div', { class: 'lg-stats' }, stat(streak, streak === 1 ? 'day streak' : 'day streak'), stat(rec.xp, 'XP'), stat(learned, 'words learned'), stat(due, 'to review')),
      h('div', { class: 'lg-goal' }, h('div', { class: 'lg-goal-top' }, h('span', {}, `Today: ${todayXp} of ${prefs.goal} XP`), h('b', {}, goalPct >= 100 ? 'Goal reached' : goalPct + '%')), h('div', { class: 'lg-bar big', role: 'progressbar', 'aria-valuenow': String(goalPct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Daily goal' }, h('i', { style: `width:${goalPct}%` }))),
      h('div', { class: 'btnrow' },
        next && h('button', { class: 'btn primary', onclick: () => begin(next.u, 'lesson', next.i) }, started ? 'Continue' : 'Start the first lesson'),
        h('button', { class: 'btn' + (next ? '' : ' primary'), disabled: !started, title: started ? '' : 'Finish a lesson first', onclick: practice }, due ? `Review ${due} ${due === 1 ? 'word' : 'words'}` : 'Practice'),
        h('button', { class: 'btn', onclick: dictionary }, 'All the words')),
      h('div', { class: 'lg-units' }, units), settings()));
  }

  /* what you have met so far, with the sound of each */
  function dictionary() {
    const C0 = course(), rec = recFor(lgCode), speech = lgCanSpeak(C0.tts), q = h('input', { type: 'search', placeholder: 'Search words', 'aria-label': 'Search words' }), list = h('div', {});
    const draw = () => { const needle = LC.loose(q.value); list.replaceChildren(...C0.units.map(u => {
      const rows = u.words.concat(u.phrases).filter(w => !needle || LC.loose(w.t).includes(needle) || LC.loose(w.en).includes(needle) || LC.loose(w.r || '').includes(needle)); if (!rows.length) return null;
      return h('section', { class: 'lg-dict-unit' }, h('h3', {}, u.title), rows.map(w => { const s = rec.words[LC.wordKey(u, w)], b = s ? s.b : 0;
        return h('div', { class: 'lg-row' }, speech ? h('button', { class: 'lg-say', type: 'button', 'aria-label': 'Hear ' + w.t, onclick: () => lgSpeak(w.t, C0.tts) }, icon('speaker')) : null,
          h('div', { class: 'lg-row-t' }, h('b', { lang: C0.tts }, w.t), w.r ? h('small', {}, w.r) : null), h('div', { class: 'lg-row-e' }, w.en), s ? h('span', { class: 'lg-pips', title: `Strength ${b} of 6` }, Array.from({ length: 6 }, (_, i) => h('i', { class: i < b ? 'on' : '' }))) : null); })); }).filter(Boolean)); };
    q.addEventListener('input', draw); draw();
    show(h('div', {}, h('div', { class: 'lg-head' }, h('h2', { class: 'lg-h' }, C0.name + ' words'), h('button', { class: 'btn', onclick: home }, 'Back')), q, list));
  }

  /* start something */
  function begin(unit, kind, index) {
    const C0 = course(), rec = recFor(lgCode), plan = { kind, unit, index, label: kind === 'test' ? `${unit.title}: test` : `${unit.title}: lesson ${index + 1}` };
    plan.exercises = LC.buildLesson({ course: C0, unit, kind, index, words: rec.words, speech: lgCanSpeak(C0.tts) });
    run(plan);
  }
  function practice() {
    const C0 = course(), rec = recFor(lgCode), items = LC.practiceItems(C0, rec.words, Math.random);
    if (!items.length) { toast('Nothing to review yet. Finish a lesson first.'); return; }
    const plan = { kind: 'practice', unit: items[0].unit, index: 0, label: 'Practice' };
    plan.exercises = LC.buildLesson({ course: C0, unit: items[0].unit, kind: 'practice', items, words: rec.words, speech: lgCanSpeak(C0.tts) });
    run(plan);
  }

  /* the lesson itself */
  function run(plan) {
    const C0 = course(), rec = recFor(lgCode), speech = lgCanSpeak(C0.tts);
    const queue = plan.exercises.slice(), total0 = queue.length, tally = { correct: 0, mistakes: 0 }, wordOk = new Map(), usedRetry = new Set();
    let pos = 0, ans = null, checked = false, done = 0;
    const bar = h('i', { style: 'width:0%' }), body = h('div', { class: 'lg-body' }), foot = h('div', { class: 'lg-foot' });
    const say = (text, slow) => lgSpeak(text, C0.tts, slow);
    const quit = h('button', { class: 'lg-x', type: 'button', 'aria-label': 'Leave this lesson', title: 'Leave', onclick: () => { if (done === 0 || confirm('Leave now? This lesson will not be counted.')) home(); } }, icon('x'));
    const frame = h('div', { class: 'lg-play' }, h('div', { class: 'lg-top' }, quit, h('div', { class: 'lg-bar big', role: 'progressbar', 'aria-label': 'Lesson progress' }, bar)), body, foot);
    const mark = (keys, ok) => { for (const k of keys) wordOk.set(k, (wordOk.has(k) ? wordOk.get(k) : true) && ok); };
    const advance = () => { pos++; checked = false; ans = null; step(); };
    const speakBtn = (text, label) => speech ? h('button', { class: 'lg-say big', type: 'button', 'aria-label': label || 'Hear it', onclick: () => say(text) }, icon('speaker')) : null;

    function step() {
      if (pos >= queue.length) return finish();
      bar.style.width = Math.round(done / (total0 + usedRetry.size) * 100) + '%';
      const ex = queue[pos]; body.replaceChildren(); foot.replaceChildren(); ans = null; checked = false;
      const check = h('button', { class: 'btn primary lg-go', type: 'button', disabled: true }, 'Check');
      const setReady = ok => { check.disabled = !ok; };
      const grade = response => {
        if (checked) return; checked = true; const r = LC.check(ex, response, C0); const ok = !!r.ok;
        if (ex.keys.length) mark(ex.keys, ok && !usedRetry.has(ex.n));
        if (!usedRetry.has(ex.n)) { if (ok) tally.correct++; else tally.mistakes++; }
        if (!ok && !usedRetry.has(ex.n)) { usedRetry.add(ex.n); queue.push({ ...ex }); }
        else done++;
        lgBeep(ok ? 'good' : 'bad');
        body.querySelectorAll('input,.lg-opt,.lg-tile').forEach(x => { x.disabled = true; });
        const note = ok && r.how === 'accent' ? 'Mind the accents: ' + r.shown : ok && r.how === 'typo' ? 'Watch the spelling: ' + r.shown : ok && r.how === 'article' ? 'With the article: ' + r.shown : '';
        const msg = ok ? h('div', {}, h('b', {}, ['Correct!', 'Nice!', 'Right!', 'Well done!'][pos % 4]), note ? h('div', { class: 'lg-note' }, note) : null) : h('div', {}, h('b', {}, 'Not quite'), h('div', { class: 'lg-note' }, 'Answer: ', h('span', { lang: C0.tts }, r.shown)));
        const cont = h('button', { class: 'btn primary lg-go', type: 'button', onclick: advance }, 'Continue');
        foot.className = 'lg-foot ' + (ok ? 'good' : 'bad'); foot.replaceChildren(msg, cont); cont.focus();
        if (!ok && ex.speak && prefs.speak) say(ex.speak);
      };
      foot.className = 'lg-foot'; foot.replaceChildren(check);
      const title = text => h('h2', { class: 'lg-q' }, text);
      const choices = (opts, subs, withSpeak) => {
        const grid = h('div', { class: 'lg-opts', role: 'radiogroup' });
        opts.forEach((o, i) => grid.append(h('button', { class: 'lg-opt', type: 'button', role: 'radio', 'aria-checked': 'false', 'data-i': String(i), onclick: e => { grid.querySelectorAll('.lg-opt').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); }); const b = e.currentTarget; b.classList.add('on'); b.setAttribute('aria-checked', 'true'); ans = o; setReady(true); if (withSpeak) say(o); } }, h('kbd', {}, String(i + 1)), h('span', { lang: subs ? C0.tts : null }, o), subs && subs[o] ? h('small', {}, subs[o]) : null)));
        return grid;
      };
      check.addEventListener('click', () => { if (ans !== null && ans !== undefined && !check.disabled) grade(ans); });
      const typed = (hint, autofocus) => {
        const inp = h('input', { class: 'lg-input', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-label': 'Your answer', lang: C0.tts, oninput: e => { ans = e.target.value; setReady(ans.trim().length > 0); } });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter' && ans && ans.trim()) { e.preventDefault(); grade(ans); } });
        if (autofocus !== false) setTimeout(() => inp.focus(), 30); return h('div', {}, inp, hint ? h('p', { class: 'fine' }, hint) : null);
      };
      switch (ex.t) {
        case 'learn': {
          foot.replaceChildren(h('button', { class: 'btn primary lg-go', type: 'button', onclick: () => { done++; advance(); } }, 'Got it'));
          body.append(h('p', { class: 'lg-tag' }, 'New word'), h('div', { class: 'lg-learn' }, h('div', { class: 'lg-big', lang: C0.tts }, ex.word.t), ex.sub ? h('div', { class: 'lg-sub' }, ex.sub) : null, h('div', { class: 'lg-mean' }, ex.word.en), speakBtn(ex.word.t, 'Hear ' + ex.word.t)));
          if (prefs.speak) say(ex.word.t); break; }
        case 'choose': body.append(title('What does this mean?'), h('div', { class: 'lg-prompt' }, h('span', { lang: C0.tts }, ex.prompt), ex.sub ? h('small', {}, ex.sub) : null, speakBtn(ex.speak, 'Hear ' + ex.prompt)), choices(ex.options)); if (prefs.speak && ex.speak) say(ex.speak); break;
        case 'chooseRev': body.append(title('How do you say…'), h('div', { class: 'lg-prompt' }, h('span', {}, ex.prompt)), choices(ex.options, ex.subs, true)); break;
        case 'phraseChoose': body.append(title('What does this say?'), h('div', { class: 'lg-prompt lg-phrase' }, h('span', { lang: C0.tts }, ex.prompt), ex.sub ? h('small', {}, ex.sub) : null, speakBtn(ex.speak, 'Hear it')), choices(ex.options)); break;
        case 'listenChoose': body.append(title('Listen and pick the meaning'), h('div', { class: 'lg-prompt' }, speakBtn(ex.speak, 'Play the word'), h('button', { class: 'lg-slow', type: 'button', onclick: () => say(ex.speak, true) }, 'Slower')), choices(ex.options)); setTimeout(() => say(ex.speak), 250); break;
        case 'type': body.append(title('Write it'), h('div', { class: 'lg-prompt' }, h('span', {}, ex.prompt), speakBtn(ex.speak, 'Hear it')), typed(ex.ask)); break;
        case 'listenType': body.append(title('Listen and write what you hear'), h('div', { class: 'lg-prompt' }, speakBtn(ex.speak, 'Play the word'), h('button', { class: 'lg-slow', type: 'button', onclick: () => say(ex.speak, true) }, 'Slower')), typed(C0.roman ? 'Type it in letters' : '')); setTimeout(() => say(ex.speak), 250); break;
        case 'order': {
          const chosen = [], answerBox = h('div', { class: 'lg-answer', 'aria-label': 'Your sentence', 'aria-live': 'polite' }), bank = h('div', { class: 'lg-bank' });
          const redraw = () => { answerBox.replaceChildren(...chosen.map(i => h('button', { class: 'lg-tile', type: 'button', onclick: () => { chosen.splice(chosen.indexOf(i), 1); redraw(); } }, ex.tiles[i]))); bank.replaceChildren(...ex.tiles.map((t, i) => h('button', { class: 'lg-tile' + (chosen.includes(i) ? ' used' : ''), type: 'button', disabled: chosen.includes(i), onclick: () => { chosen.push(i); redraw(); } }, t))); ans = chosen.map(i => ex.tiles[i]); setReady(chosen.length > 0); };
          body.append(title('Say it in ' + C0.name), h('div', { class: 'lg-prompt' }, h('span', {}, ex.prompt)), answerBox, bank); redraw();
          break; }
        case 'match': {
          foot.replaceChildren(); const left = ex.pairs.slice(), rights = LC.shuffle(ex.pairs, Math.random); let selL = null, selR = null, matched = 0, miss = new Set();
          const col1 = h('div', { class: 'lg-col' }), col2 = h('div', { class: 'lg-col' });
          const btns = { l: {}, r: {} };
          const tryPair = () => { if (selL === null || selR === null) return; const a = btns.l[selL], b = btns.r[selR];
            if (selL === selR) { a.classList.add('ok'); b.classList.add('ok'); a.disabled = b.disabled = true; matched++; lgBeep('good'); if (prefs.speak) say(ex.pairs.find(p => p.key === selL).speak);
              selL = selR = null; if (matched === ex.pairs.length) { if (!miss.size) tally.correct++; else tally.mistakes++; ex.pairs.forEach(p => mark([p.key], !miss.has(p.key))); done++; setTimeout(advance, 500); } }
            else { a.classList.add('no'); b.classList.add('no'); miss.add(selL); miss.add(selR); lgBeep('bad'); setTimeout(() => { a.classList.remove('no', 'on'); b.classList.remove('no', 'on'); }, 350); selL = selR = null; } };
          left.forEach(p => { const b = h('button', { class: 'lg-m', type: 'button', onclick: () => { if (b.disabled) return; col1.querySelectorAll('.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); selL = p.key; tryPair(); } }, h('span', { lang: C0.tts }, p.left), p.sub ? h('small', {}, p.sub) : null); btns.l[p.key] = b; col1.append(b); });
          rights.forEach(p => { const b = h('button', { class: 'lg-m', type: 'button', onclick: () => { if (b.disabled) return; col2.querySelectorAll('.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); selR = p.key; tryPair(); } }, p.right); btns.r[p.key] = b; col2.append(b); });
          body.append(title('Match the pairs'), h('div', { class: 'lg-match' }, col1, col2)); break; }
        default: advance();
      }
    }

    async function finish() {
      lgStopKeys(); bar.style.width = '100%';
      const scored = tally.correct + tally.mistakes, accuracy = scored ? tally.correct / scored : 1, xp = LC.xpFor(tally), now = Date.now(), today = LC.dayKey(now);
      for (const [k, ok] of wordOk) rec.words[k] = LC.review(rec.words[k], ok, now);
      if (plan.kind !== 'practice' && accuracy >= 0.6) { const n = LC.lessonCount(plan.unit), cur = rec.lessons[plan.unit.id] || {}, l = Array.from({ length: n }, (_, i) => !!(cur.l && cur.l[i])); if (plan.kind === 'test') cur.test = true; else l[plan.index] = true; rec.lessons[plan.unit.id] = { l, test: !!cur.test }; }
      const before = LC.streakOf(rec.days, today); rec.xp += xp; rec.days[today] = (rec.days[today] || 0) + xp; const streak = LC.streakOf(rec.days, today);
      await save(rec); lgBeep('done');
      const stars = accuracy >= 0.95 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;
      show(h('div', { class: 'lg-done' }, h('div', { class: 'lg-trophy' }, icon('trophy')), h('h2', {}, stars ? ['Good start', 'Nice work', 'Perfect'][stars - 1] : 'Keep at it'), h('p', { class: 'muted' }, plan.label),
        h('div', { class: 'lg-stats' }, h('div', { class: 'lg-stat' }, h('b', {}, '+' + xp), h('small', {}, 'XP')), h('div', { class: 'lg-stat' }, h('b', {}, Math.round(accuracy * 100) + '%'), h('small', {}, 'accuracy')), h('div', { class: 'lg-stat' }, h('b', {}, String(streak)), h('small', {}, streak > before ? 'day streak (up!)' : 'day streak'))),
        accuracy < 0.6 && plan.kind !== 'practice' ? h('p', { class: 'fine' }, 'You need about 60% to finish a lesson. The words you missed will come back, so try again.') : null,
        h('div', { class: 'btnrow', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: home }, 'Continue'), h('button', { class: 'btn', onclick: () => (plan.kind === 'practice' ? practice() : begin(plan.unit, plan.kind, plan.index)) }, plan.kind === 'practice' ? 'More practice' : 'Do it again'))));
    }
    // the keyboard: Enter checks or continues, 1 to 4 pick an answer, Escape asks to leave
    const keys = e => {
      if (!frame.isConnected) return lgStopKeys(); const t = e.target; const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
      if (e.key === 'Escape') { quit.click(); return; }
      if (e.key === 'Enter' && !typing) { const b = foot.querySelector('.lg-go:not([disabled])'); if (b) { e.preventDefault(); b.click(); } return; }
      if (!typing && !checked && /^[1-9]$/.test(e.key)) { const o = body.querySelector(`.lg-opt[data-i="${Number(e.key) - 1}"]`); if (o) o.click(); }
    };
    lgKeyHandler = keys; document.addEventListener('keydown', keys);
    show(frame); step();
  }

  if (lgCode) home(); else picker();
  return [back(appName(acct, 'lang')), root];
}
function lgStopKeys() { if (lgKeyHandler) { document.removeEventListener('keydown', lgKeyHandler); lgKeyHandler = null; } }

'use strict';
/* Language Lab: the pure part. Builds lessons out of the course data, checks typed answers kindly, and keeps the spaced-repetition
   state that decides what to practise next. Nothing here touches the page, so it can be tested with a fixed random source. */
const LangCore = (() => {
  const DAY = 86400000, DELAY = [0, 1, 2, 4, 8, 16, 32].map(d => d * DAY);     // how long a word rests after reaching each box
  const MASTERED = 3;                                                          // from this box up, a word counts as learned
  const seeded = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const shuffle = (a, rnd) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const sample = (a, n, rnd) => shuffle(a, rnd).slice(0, n);
  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  /* ----- checking answers ----- */
  const PUNCT = /[¿?¡!.,;:"“”()…。、！？「」«»]/g;
  const norm = s => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`]/g, "'").replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
  const loose = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ø/g, 'o');
  const flat = s => loose(s).replace(/[\s\-']/g, '');
  const lev = (a, b) => { if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m + n; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
  const stripArticle = (s, arts) => { for (const a of [...arts].sort((x, y) => y.length - x.length)) { const al = a.toLowerCase(); if (al.endsWith("'") ? s.startsWith(al) : s.startsWith(al + ' ')) return s.slice(al.endsWith("'") ? al.length : al.length + 1); } return s; };
  // How close is what was typed to the answer? { ok, how } where how is exact, article, accent or typo. Accents and a missed letter are forgiven, with a note.
  function grade(input, target, course) {
    const a = norm(input); if (!a) return { ok: false, how: 'empty' };
    const arts = course.articles || [], t = norm(target);
    if (a === t) return { ok: true, how: 'exact' };
    const aa = stripArticle(a, arts), ta = stripArticle(t, arts);
    if (aa === ta) return { ok: true, how: 'article' };
    if (loose(aa) === loose(ta)) return { ok: true, how: 'accent' };
    if (flat(aa) === flat(ta)) return { ok: true, how: 'accent' };
    const la = loose(aa), lt = loose(ta);
    if (lt.length >= 5 && lev(la, lt) <= 1) return { ok: true, how: 'typo' };
    return { ok: false, how: 'wrong' };
  }
  // for languages written in another script you may answer with the reading in Latin letters or with the word itself
  function gradeWord(input, word, course) {
    if (course.roman && word.r) { const g = grade(input, word.r, course); if (g.ok) return g; return grade(input, word.t, course); }
    return grade(input, word.t, course);
  }

  /* ----- what you know ----- */
  const wordKey = (unit, w) => unit.id + ':' + w.t;
  const fresh = () => ({ b: 0, due: 0, n: 0, w: 0 });
  function review(st, ok, now = Date.now()) {
    const s = { ...fresh(), ...(st || {}) }; s.n++;
    if (ok) { s.b = Math.min(6, s.b + 1); s.due = now + DELAY[s.b]; } else { s.w++; s.b = Math.max(0, s.b - 2); s.due = now + 10 * 60000; }
    return s;
  }
  const isDue = (st, now = Date.now()) => !!st && st.n > 0 && st.due <= now;
  function unitStats(unit, words) {
    let sum = 0, learned = 0, seen = 0; for (const w of unit.words) { const s = words[wordKey(unit, w)]; if (s) { sum += s.b; if (s.b >= MASTERED) learned++; if (s.n) seen++; } }
    return { pct: Math.round(sum / (unit.words.length * 6) * 100), learned, seen, total: unit.words.length };
  }
  const lessonCount = unit => Math.max(1, Math.ceil(unit.words.length / unit.size));
  const lessonWords = (unit, i) => unit.words.slice(i * unit.size, (i + 1) * unit.size);
  const lessonPhrases = (unit, i) => { const n = lessonCount(unit); return unit.phrases.filter((_, k) => k % n === i); };
  function streakOf(days, today = dayKey()) {
    let d = new Date(today + 'T12:00:00'), n = 0; if (!(days[dayKey(d.getTime())] > 0)) d = new Date(d.getTime() - DAY);
    while (days[dayKey(d.getTime())] > 0) { n++; d = new Date(d.getTime() - DAY); } return n;
  }
  const dueWords = (course, words, now = Date.now()) => { const out = []; for (const u of course.units) for (const w of u.words) { const s = words[wordKey(u, w)]; if (isDue(s, now)) out.push({ unit: u, w, s }); } return out.sort((a, b) => a.s.due - b.s.due); };

  /* ----- building lessons ----- */
  const options = (answer, pool, rnd, n = 4, pick = x => x) => {
    const seen = new Set([pick(answer)]), out = [pick(answer)];
    for (const x of shuffle(pool, rnd)) { const v = pick(x); if (!seen.has(v) && out.length < n) { seen.add(v); out.push(v); } }
    return shuffle(out, rnd);
  };
  const poolOf = (course, unit) => { const same = unit.words, other = course.units.filter(u => u !== unit).flatMap(u => u.words); return same.length >= 6 ? same.concat(shuffle(other, () => 0.5).slice(0, 4)) : same.concat(other); };
  const tokensOf = text => text.split(/\s+/).map(x => x.replace(PUNCT, '').trim()).filter(Boolean);

  function buildLesson(o) {
    const { course, unit, kind = 'lesson', index = 0, words: state = {}, speech = false, rnd = Math.random, now = Date.now() } = o;
    const pool = poolOf(course, unit), ex = [], roman = course.roman;
    const ent = (w, u = unit) => ({ w, unit: u, key: wordKey(u, w) });
    let items, phrases = [];
    if (kind === 'lesson') { items = lessonWords(unit, index).map(w => ent(w)); phrases = lessonPhrases(unit, index); }
    else if (kind === 'test') { items = sample(unit.words, Math.min(10, unit.words.length), rnd).map(w => ent(w)); phrases = unit.phrases.slice(); }
    else { items = (o.items || []).map(x => ent(x.w, x.unit)); }
    const label = w => (roman && w.r ? `${w.t}` : w.t), sub = w => (roman && w.r ? w.r : '');
    const choose = it => ({ t: 'choose', keys: [it.key], prompt: label(it.w), sub: sub(it.w), speak: it.w.t, options: options(it.w, pool, rnd, 4, x => x.en), answer: it.w.en, word: it.w });
    const chooseRev = it => ({ t: 'chooseRev', keys: [it.key], prompt: it.w.en, options: options(it.w, pool, rnd, 4, x => label(x)), answer: label(it.w), subs: Object.fromEntries(pool.concat([it.w]).map(x => [label(x), sub(x)])), word: it.w, speak: it.w.t });
    const type = it => ({ t: 'type', keys: [it.key], prompt: it.w.en, answer: roman && it.w.r ? it.w.r : it.w.t, alt: it.w, word: it.w, speak: it.w.t, ask: roman && it.w.r ? 'Type it in letters' : 'Type it in ' + course.name });
    const listenChoose = it => ({ t: 'listenChoose', keys: [it.key], speak: it.w.t, options: options(it.w, pool, rnd, 4, x => x.en), answer: it.w.en, word: it.w });
    const listenType = it => ({ t: 'listenType', keys: [it.key], speak: it.w.t, answer: roman && it.w.r ? it.w.r : it.w.t, alt: it.w, word: it.w });
    const match = list => ({ t: 'match', keys: list.map(x => x.key), pairs: list.map(x => ({ key: x.key, left: label(x.w), sub: sub(x.w), right: x.w.en, speak: x.w.t })) });
    if (kind === 'lesson') {
      for (const it of items) if (!(state[it.key] && state[it.key].n)) ex.push({ t: 'learn', keys: [], word: it.w, speak: it.w.t, sub: sub(it.w) });
      for (const it of items) ex.push(choose(it));
      for (const it of shuffle(items, rnd)) ex.push(chooseRev(it));
      if (items.length >= 3) ex.push(match(items));
      for (const it of sample(items, Math.min(2, items.length), rnd)) ex.push(type(it));
      if (speech) { const l = sample(items, Math.min(3, items.length), rnd); ex.push(listenChoose(l[0])); if (l[1]) ex.push(listenChoose(l[1])); if (l[2]) ex.push(listenType(l[2])); }
    } else if (kind === 'test') {
      for (const it of items) ex.push(choose(it));
      for (const it of shuffle(items, rnd)) ex.push(type(it));
      ex.push(match(items.slice(0, 5)));
      if (speech && items[0]) ex.push(listenChoose(items[0]));
    } else {   // practice: whatever is due, in a mix
      const kinds = [choose, chooseRev, type, ...(speech ? [listenChoose] : [])];
      items.forEach((it, i) => ex.push(kinds[(i + Math.floor(rnd() * 3)) % kinds.length](it)));
      if (items.length >= 4) ex.push(match(items.slice(0, 5)));
    }
    for (const p of phrases) {
      const toks = tokensOf(p.t);
      if (toks.length >= 3) {
        const extra = options({ t: '' }, pool.filter(x => !toks.some(k => norm(k) === norm(x.t))), rnd, 3, x => (x.t ? x.t : '')).filter(Boolean).slice(0, 2);
        let tiles = shuffle(toks.concat(extra), rnd), tries = 0; while (tries++ < 5 && tiles.slice(0, toks.length).join(' ') === toks.join(' ')) tiles = shuffle(tiles, rnd);
        ex.push({ t: 'order', keys: [], prompt: p.en, tiles, tokens: toks, answer: toks.join(' '), phrase: p, speak: p.t });
      } else {
        ex.push({ t: 'phraseChoose', keys: [], prompt: p.t, sub: p.r, speak: p.t, options: options(p, unit.phrases.concat(course.units.flatMap(u => u.phrases)), rnd, 4, x => x.en), answer: p.en, phrase: p });
      }
    }
    if (phrases[0]) ex.push({ t: 'phraseChoose', keys: [], prompt: phrases[0].t, sub: phrases[0].r, speak: phrases[0].t, options: options(phrases[0], unit.phrases.concat(course.units.flatMap(u => u.phrases)), rnd, 4, x => x.en), answer: phrases[0].en, phrase: phrases[0] });
    void now; return ex.map((e, i) => ({ ...e, n: i }));
  }
  // a practice session out of what is due (or, failing that, what you know least)
  function practiceItems(course, words, rnd, now = Date.now(), max = 10) {
    const due = dueWords(course, words, now); let list = due.slice(0, max);
    if (list.length < 6) { const have = new Set(list.map(x => wordKey(x.unit, x.w))), weak = []; for (const u of course.units) for (const w of u.words) { const s = words[wordKey(u, w)]; if (s && s.n && !have.has(wordKey(u, w))) weak.push({ unit: u, w, s }); } weak.sort((a, b) => a.s.b - b.s.b || b.s.w - a.s.w); list = list.concat(weak.slice(0, max - list.length)); }
    return shuffle(list, rnd);
  }
  // judging one answer
  function check(ex, resp, course) {
    switch (ex.t) {
      case 'choose': case 'chooseRev': case 'listenChoose': case 'phraseChoose': return { ok: resp === ex.answer, shown: ex.answer };
      case 'type': case 'listenType': { const g = gradeWord(resp, ex.alt, course); return { ...g, shown: ex.alt.t + (ex.alt.r && ex.answer === ex.alt.r ? ` (${ex.alt.r})` : '') }; }
      case 'order': return { ok: norm(resp.join(' ')) === norm(ex.answer), shown: ex.phrase.t };
      default: return { ok: true, shown: '' };
    }
  }
  const xpFor = s => (s.correct * 2) + 10 + (s.mistakes === 0 ? 5 : 0);
  return { seeded, shuffle, sample, dayKey, norm, loose, grade, gradeWord, wordKey, fresh, review, isDue, unitStats, lessonCount, lessonWords, lessonPhrases, streakOf, dueWords, buildLesson, practiceItems, check, xpFor, tokensOf, DAY, MASTERED };
})();
if (typeof module !== 'undefined') module.exports = LangCore;

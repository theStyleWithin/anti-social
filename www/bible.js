'use strict';
/* Bible: pure logic for reading, searching and importing a Bible file you already have.
   Nothing here touches the page or the network. Imports understand USFM, OSIS XML, simple JSON and plain
   "Book 1:1 text" lines. Books are matched by name, abbreviation or code and put in the usual order. */
const BibleCore = (() => {
  // [OSIS id, USFM code, name]
  const CANON = [
    ['Gen', 'GEN', 'Genesis'], ['Exod', 'EXO', 'Exodus'], ['Lev', 'LEV', 'Leviticus'], ['Num', 'NUM', 'Numbers'], ['Deut', 'DEU', 'Deuteronomy'],
    ['Josh', 'JOS', 'Joshua'], ['Judg', 'JDG', 'Judges'], ['Ruth', 'RUT', 'Ruth'], ['1Sam', '1SA', '1 Samuel'], ['2Sam', '2SA', '2 Samuel'],
    ['1Kgs', '1KI', '1 Kings'], ['2Kgs', '2KI', '2 Kings'], ['1Chr', '1CH', '1 Chronicles'], ['2Chr', '2CH', '2 Chronicles'], ['Ezra', 'EZR', 'Ezra'],
    ['Neh', 'NEH', 'Nehemiah'], ['Esth', 'EST', 'Esther'], ['Job', 'JOB', 'Job'], ['Ps', 'PSA', 'Psalms'], ['Prov', 'PRO', 'Proverbs'],
    ['Eccl', 'ECC', 'Ecclesiastes'], ['Song', 'SNG', 'Song of Solomon'], ['Isa', 'ISA', 'Isaiah'], ['Jer', 'JER', 'Jeremiah'], ['Lam', 'LAM', 'Lamentations'],
    ['Ezek', 'EZK', 'Ezekiel'], ['Dan', 'DAN', 'Daniel'], ['Hos', 'HOS', 'Hosea'], ['Joel', 'JOL', 'Joel'], ['Amos', 'AMO', 'Amos'],
    ['Obad', 'OBA', 'Obadiah'], ['Jonah', 'JON', 'Jonah'], ['Mic', 'MIC', 'Micah'], ['Nah', 'NAM', 'Nahum'], ['Hab', 'HAB', 'Habakkuk'],
    ['Zeph', 'ZEP', 'Zephaniah'], ['Hag', 'HAG', 'Haggai'], ['Zech', 'ZEC', 'Zechariah'], ['Mal', 'MAL', 'Malachi'],
    ['Matt', 'MAT', 'Matthew'], ['Mark', 'MRK', 'Mark'], ['Luke', 'LUK', 'Luke'], ['John', 'JHN', 'John'], ['Acts', 'ACT', 'Acts'],
    ['Rom', 'ROM', 'Romans'], ['1Cor', '1CO', '1 Corinthians'], ['2Cor', '2CO', '2 Corinthians'], ['Gal', 'GAL', 'Galatians'], ['Eph', 'EPH', 'Ephesians'],
    ['Phil', 'PHP', 'Philippians'], ['Col', 'COL', 'Colossians'], ['1Thess', '1TH', '1 Thessalonians'], ['2Thess', '2TH', '2 Thessalonians'],
    ['1Tim', '1TI', '1 Timothy'], ['2Tim', '2TI', '2 Timothy'], ['Titus', 'TIT', 'Titus'], ['Phlm', 'PHM', 'Philemon'], ['Heb', 'HEB', 'Hebrews'],
    ['Jas', 'JAS', 'James'], ['1Pet', '1PE', '1 Peter'], ['2Pet', '2PE', '2 Peter'], ['1John', '1JN', '1 John'], ['2John', '2JN', '2 John'],
    ['3John', '3JN', '3 John'], ['Jude', 'JUD', 'Jude'], ['Rev', 'REV', 'Revelation'],
  ];
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/^\s*(iii|ii|i)\b\.?\s*(?=[a-z])/, (m, r) => ({ i: '1', ii: '2', iii: '3' })[r] ).replace(/[^a-z0-9]/g, '');
  const ALIASES = { psalm: 18, ps: 18, pss: 18, songofsongs: 21, songofsolomon: 21, canticles: 21, sos: 21, song: 21, revelations: 65, apocalypse: 65, qoheleth: 20, eccles: 20, philippians: 50, phil: 50, phlm: 56, philem: 56, jas: 58, '1jn': 61, '2jn': 62, '3jn': 63, jud: 64, judg: 6, jdg: 6 };
  const TABLE = new Map();
  CANON.forEach(([o, u, n], i) => { for (const k of [norm(o), norm(u), norm(n)]) if (!TABLE.has(k)) TABLE.set(k, i); });
  for (const [k, i] of Object.entries(ALIASES)) TABLE.set(k, i);
  TABLE.set('jud', 64);   // JUD is Jude in USFM
  const NAMES = CANON.map(c => norm(c[2]));
  // Index in CANON for a name, abbreviation or code, or -1.
  const resolveBook = s => {
    const k = norm(s);
    if (!k) return -1;
    if (TABLE.has(k)) return TABLE.get(k);
    if (k.length >= 3) { const hits = NAMES.reduce((a, n, i) => n.startsWith(k) ? a.concat(i) : a, []); if (hits.length === 1) return hits[0]; }
    return -1;
  };

  const MAX_CH = 200, MAX_V = 300, MAX_TEXT = 20000;
  const newStore = () => ({ books: new Map(), verses: 0, skipped: new Set(), name: '' });
  // Puts one verse in the store; extra text for a verse that already has some is appended (verse ranges, split lines).
  const addVerse = (st, bi, ch, v, text) => {
    if (bi < 0) return false;
    ch = parseInt(ch, 10); v = parseInt(v, 10);
    if (!(ch >= 1 && ch <= MAX_CH && v >= 1 && v <= MAX_V)) return false;
    text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
    if (!text) return false;
    let chs = st.books.get(bi); if (!chs) st.books.set(bi, chs = []);
    while (chs.length < ch) chs.push([]);
    const vs = chs[ch - 1]; while (vs.length < v) vs.push('');
    if (!vs[v - 1]) st.verses++;
    vs[v - 1] = vs[v - 1] ? vs[v - 1] + ' ' + text : text;
    return true;
  };
  const skip = (st, name) => { if (name) st.skipped.add(String(name).slice(0, 40)); };

  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const unent = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(Math.min(0x10ffff, e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) || 32) : (ENT[e.toLowerCase()] ?? m));

  /* ---------- USFM ---------- */
  const SKIP_MARKERS = /^\\(?:h|toc[123]|mt\d?|ms\d?|mr|s\d?|r|d|sp|rem|ide|cl|cp|sts|restore|usfm|periph|imt\d?|is\d?|ip|ie|iot|io\d|mte\d?|sr|rq|qa|b)\b.*$/gm;
  function parseUSFM(st, text) {
    const id = /^\\id\s+(\S+)/m.exec(text);
    const bi = id ? resolveBook(id[1]) : -1;
    if (bi < 0) { skip(st, id ? id[1] : 'unknown book'); return; }
    let t = text.replace(/\r/g, '').replace(SKIP_MARKERS, '');
    t = t.replace(/\\(f|fe|x|fig|ef|ex)\b[\s\S]*?\\\1\*/g, ' ').replace(/\\w\s+([^|\\]*?)(?:\|[^\\]*)?\\w\*/g, '$1');
    let ch = 0, last = 0, cur = null;
    const flush = end => { if (cur) addVerse(st, bi, cur.c, cur.v, t.slice(last, end).replace(/\\[A-Za-z0-9+]+\*?/g, ' ')); };
    for (const m of t.matchAll(/\\c\s+(\d+)|\\v\s+(\d+)[-,\d]*[a-z]?\s*/g)) {
      flush(m.index);
      if (m[1]) { ch = +m[1]; cur = null; } else cur = ch ? { c: ch, v: +m[2] } : null;
      last = m.index + m[0].length;
    }
    flush(t.length);
  }

  /* ---------- OSIS XML ---------- */
  function parseOSIS(st, xml) {
    const title = /<work\b[\s\S]*?<title[^>]*>([^<]+)<\/title>/.exec(xml) || /<osisText[^>]*>[\s\S]*?<title[^>]*>([^<]+)<\/title>/.exec(xml);
    if (title && !st.name) st.name = unent(title[1]).trim();
    const body = xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<(note|title|rdg)\b[^>]*>[\s\S]*?<\/\1>/g, ' ').replace(/<header>[\s\S]*?<\/header>/, '');
    let cur = null, buf = '';
    const end = () => { if (cur) addVerse(st, cur.bi, cur.c, cur.v, buf); cur = null; buf = ''; };
    for (const m of body.matchAll(/<verse\b([^>]*?)(\/?)>|<\/verse>|<\/?(?:lb|l|p|q|div|lg|br)\b[^>]*>|<[^>]*>|[^<]+/g)) {
      const tok = m[0];
      if (m[1] !== undefined) {
        const a = m[1], eid = /\beID=/.test(a), id = /\b(?:osisID|sID)="([^"]+)"/.exec(a);
        if (eid) { end(); continue; }
        end();
        if (id) {
          const [b, c, v] = id[1].split(/\s+/)[0].split('.');
          const bi = resolveBook(b);
          if (bi < 0) skip(st, b); else cur = { bi, c, v };
        }
        if (m[2] && !id) end();
      } else if (tok === '</verse>') end();
      else if (tok[0] === '<') { if (cur && /^<\/?(?:lb|l|p|q|div|lg|br)\b/.test(tok)) buf += ' '; }
      else if (cur) buf += unent(tok);
    }
    end();
  }

  /* ---------- JSON ---------- */
  const bookName = o => o && (o.name ?? o.book ?? o.book_name ?? o.bookName ?? o.n ?? o.abbrev ?? o.abbr ?? o.id ?? o.title);
  function addChapters(st, name, chapters) {
    const bi = resolveBook(name);
    if (bi < 0) { skip(st, name); return; }
    const each = (x, f) => Array.isArray(x) ? x.forEach((v, i) => f(i + 1, v)) : x && typeof x === 'object' ? Object.entries(x).forEach(([k, v]) => /^\d+$/.test(k) && f(+k, v)) : 0;
    each(chapters, (c, vs) => each(vs, (v, t) => { if (typeof t === 'string') addVerse(st, bi, c, v, t); }));
  }
  function parseJSON(st, data) {
    if (data && typeof data === 'object' && !Array.isArray(data) && typeof data.name === 'string' && !st.name) st.name = data.name.slice(0, 80);
    const list = Array.isArray(data) ? data : data && (data.books || data.verses || data.rows);
    if (Array.isArray(list)) {
      for (const it of list) {
        if (!it || typeof it !== 'object') continue;
        const ch = it.chapters ?? it.c ?? it.chapter_list;
        if (ch !== undefined && typeof ch !== 'number' && typeof ch !== 'string') { addChapters(st, bookName(it), ch); continue; }
        const text = it.text ?? it.t ?? it.verse_text;
        if (typeof text === 'string') { const bi = resolveBook(it.book_name ?? it.bookName ?? it.book ?? it.b ?? it.name); if (bi < 0) skip(st, it.book_name ?? it.book ?? it.b); else addVerse(st, bi, it.chapter ?? it.c, it.verse ?? it.v, text); }
      }
      return;
    }
    const map = data && typeof data === 'object' ? (data.books && typeof data.books === 'object' ? data.books : data) : {};
    for (const [k, v] of Object.entries(map)) if (v && typeof v === 'object') addChapters(st, k, v);
  }

  /* ---------- plain lines: "John 3:16 For God so loved..." ---------- */
  function parseLines(st, text) {
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*((?:[1-3]|I{1,3})?\s*[A-Za-z][A-Za-z .]*?)\s+(\d+)\s*[:.]\s*(\d+)\s*[\t:.\-–—]?\s*(\S.*)$/.exec(line);
      if (!m) continue;
      const bi = resolveBook(m[1]);
      if (bi < 0) skip(st, m[1].trim()); else addVerse(st, bi, m[2], m[3], m[4]);
    }
  }

  // Works out which format each file is in and reads it. files: [{name, text}]
  function parseFiles(files) {
    const st = newStore();
    for (const f of files) {
      const t = String(f.text || '').replace(/^﻿/, '');
      if (/^\s*\\id\s/m.test(t) || /^\\c\s+\d+/m.test(t)) parseUSFM(st, t);
      else if (/^\s*</.test(t) && /<verse\b/.test(t)) parseOSIS(st, t);
      else {
        let data = null;
        if (/^\s*[\[{]/.test(t)) { try { data = JSON.parse(t); } catch { data = null; } }
        if (data) parseJSON(st, data); else parseLines(st, t);
      }
    }
    if (!st.name && files.length === 1) st.name = String(files[0].name || '').replace(/\.[^.]+$/, '').slice(0, 80);
    const books = [...st.books.keys()].sort((a, b) => a - b).map(i => ({ n: CANON[i][2], c: st.books.get(i).map(ch => ch.map(v => v || '')) }));
    return { name: st.name || 'My Bible', books, verses: st.verses, skipped: [...st.skipped] };
  }

  // All verses containing every word. books: [{n, c}]. Returns [{b, c, v, text}] (c and v count from 1).
  // fold(text) can simplify both sides first (for example, dropping Hebrew vowel marks).
  const plain = s => String(s).toLowerCase();
  const noMarks = s => String(s).replace(/[\u0591-\u05c7]/g, '');
  function search(books, query, limit = 100, fold = plain) {
    const words = fold(query || '').split(/\s+/).filter(Boolean).slice(0, 8);
    const out = [];
    if (!words.length) return out;
    for (let b = 0; b < books.length && out.length < limit; b++)
      for (let c = 0; c < books[b].c.length && out.length < limit; c++)
        for (let v = 0; v < books[b].c[c].length && out.length < limit; v++) {
          const t = books[b].c[c][v]; if (!t) continue;
          const low = fold(t);
          if (words.every(w => low.includes(w))) out.push({ b, c: c + 1, v: v + 1, text: t });
        }
    return out;
  }
  const refLabel = (books, b, c, v) => `${books[b].n} ${c}${v ? ':' + v : ''}`;
  // The chapter before or after, crossing book edges. Returns null at the very start or end.
  const step = (books, b, c, d) => {
    c += d;
    if (c < 1) { do { b--; } while (b >= 0 && !books[b].c.length); if (b < 0) return null; c = books[b].c.length; }
    else if (c > books[b].c.length) { do { b++; } while (b < books.length && !books[b].c.length); if (b >= books.length) return null; c = 1; }
    return { b, c };
  };
  const parseRef = s => { const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(s || ''); return m ? { b: +m[1], c: +m[2], k: +m[3] } : null; };

  return { CANON, resolveBook, parseFiles, parseUSFM, parseOSIS, parseJSON, parseLines, newStore, addVerse, search, noMarks, refLabel, step, parseRef, norm };
})();
if (typeof module !== 'undefined') module.exports = BibleCore;

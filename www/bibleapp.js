'use strict';
/* The Bible app: a bundled public-domain Tanakh (Hebrew and the 1917 JPS English), plus any Bible file you bring
   yourself. Everything is local. Imported text is saved like your posts, so it is encrypted if you use a passcode. */
const BC = BibleCore;
const TANAKH = { id: 'jps1917', name: 'Tanakh (Hebrew and JPS 1917 English)' };
const HL_COLORS = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8'];
const bookTexts = new Map();            // imported book token -> chapters, kept while the app is open
const scripts = {};
const loadScript = src => scripts[src] || (scripts[src] = new Promise((res, rej) => {
  const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error('missing ' + src)); }; document.head.append(s);
}));
const tanakhData = async () => { await Promise.all([loadScript('bible/jps1917.js'), loadScript('bible/tanakh-he.js')]); return { en: BibleData.jps1917.books, he: BibleData['tanakh-he'].books }; };

// The books of a Bible as [{n, ch, s?}] (name, chapter count, section).
async function bibleBooks(info) {
  if (info.builtin) return (await tanakhData()).en.map(b => ({ n: b.n, ch: b.c.length, s: b.s, h: b.h }));
  return info.meta.books.map(b => ({ n: b.n, ch: b.ch, s: BC.resolveBook(b.n) >= 39 ? 'New Testament' : 'Old Testament' }));
}
async function bookChapters(acct, info, b) {
  if (info.builtin) { const d = await tanakhData(); return { en: d.en[b].c, he: d.he[b].c }; }
  const m = info.meta.books[b]?.m;
  if (!m) return { en: [] };
  if (!bookTexts.has(m)) { const r = (await loadMedia(acct, m))[0]; bookTexts.set(m, r ? r.c : []); }
  return { en: bookTexts.get(m) };
}
const bibleInfos = ctx => [{ id: TANAKH.id, name: TANAKH.name, builtin: true }, ...ctx.apps.bible.map(m => ({ id: m.id, name: m.name, meta: m }))];
const findBible = (ctx, id) => bibleInfos(ctx).find(i => i.id === id);

// Reading position, display choices, highlights and notes: one small record per account.
function bibleState(acct, ctx) {
  const r = ctx.apps.bstate[0];
  return r ? { ...r, marks: { ...r.marks } } : { id: 'bstate' + acct.id, accountId: acct.id, kind: 'bstate', pos: null, mode: 'both', size: 1, marks: {} };
}
let saveTimer;
const saveBibleState = (acct, st, now) => { clearTimeout(saveTimer); const go = () => appSave(acct, { ...st, updatedAt: Date.now() }); if (now) return go(); saveTimer = setTimeout(go, 500); };

function bibleView(acct, ctx, back, arg) {
  if (arg === 'marks') return bibleMarks(acct, ctx, back);
  if (!arg) return bibleLibrary(acct, ctx, back);
  const [id, b, c] = arg.split(':');
  const info = findBible(ctx, id);
  if (!info) return [back('Bible'), emptyState('Bible not found', 'That one is not on this device.')];
  if (b === undefined) return bibleBookList(acct, ctx, back, info);
  return bibleReader(acct, ctx, back, info, parseInt(b, 10), parseInt(c, 10) || 1);
}

/* ---------- library ---------- */
function bibleLibrary(acct, ctx, back) {
  const st = bibleState(acct, ctx);
  const cont = st.pos && findBible(ctx, st.pos.split(':')[0]);
  const card = info => h('div', { class: 'bible-card' },
    h('a', { class: 'bible-open', href: '#/apps/bible/' + info.id }, h('b', {}, info.name), h('span', { class: 'muted' }, info.builtin ? 'Included. Public domain.' : `Yours. ${info.meta.verses.toLocaleString()} verses.`)),
    !info.builtin && h('button', { class: 'btn danger', onclick: async () => {
      if (!confirm(`Remove "${info.name}" from this device? You can import the file again later.`)) return;
      for (const b of info.meta.books) { await deleteMedia(acct, b.m); bookTexts.delete(b.m); }
      await appDelete(info.id); toast('Removed.'); render(true);
    } }, 'Remove'));
  const file = h('input', { type: 'file', multiple: true, hidden: true, 'aria-label': 'Bible files' });
  file.addEventListener('change', () => { const fs = [...file.files]; file.value = ''; if (fs.length) importBible(acct, fs); });
  return [back('Bible'), h('div', { class: 'app-pad' },
    cont && h('a', { class: 'btn primary', href: '#/apps/bible/' + st.pos, style: 'display:inline-block;margin-bottom:12px' }, 'Continue reading'),
    h('div', { class: 'bible-list' }, bibleInfos(ctx).map(card)),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => file.click() }, 'Import a Bible file'), file,
      Object.keys(st.marks).length > 0 && h('a', { class: 'btn', href: '#/apps/bible/marks' }, `Highlights and notes (${Object.keys(st.marks).length})`)),
    h('p', { class: 'fine', style: 'padding:12px 0 0' }, 'Bring your own: USFM, OSIS XML, JSON, or plain text lines like "John 3:16 For God so loved...". Only import a Bible you have the right to use. Anti-Social includes only public-domain text, and the NIV, ESV and most modern versions are not.'))];
}

async function importBible(acct, files) {
  const read = [];
  for (const f of files) {
    if (f.size > 40 * MB) { toast(`${f.name} is too big (over 40 MB).`); return; }
    try { read.push({ name: f.name, text: await f.text() }); } catch { toast(`Could not read ${f.name}.`); return; }
  }
  const r = BC.parseFiles(read);
  if (!r.verses) { toast('No verses found. Supported: USFM, OSIS XML, JSON, or lines like "John 3:16 text".'); return; }
  const name = h('input', { value: r.name, maxlength: 80, 'aria-label': 'Name' });
  const agree = h('input', { type: 'checkbox', id: 'bible-ok' });
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary', disabled: true }, 'Add this Bible');
  agree.addEventListener('change', () => { save.disabled = !agree.checked; });
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Import a Bible')),
    h('div', { class: 'mp' }, fieldEl('Name', name),
      h('p', {}, `Found ${r.verses.toLocaleString()} verses in ${plural(r.books.length, 'book')}.`),
      r.skipped.length > 0 && h('p', { class: 'fine', style: 'padding:0' }, 'Skipped (not recognised as Bible books): ' + r.skipped.slice(0, 8).join(', ')),
      h('label', { class: 'check' }, agree, ' I have the right to use this text.'), err,
      h('div', { class: 'btnrow' }, save))));
  save.addEventListener('click', async () => {
    save.disabled = true; err.textContent = 'Saving...';
    const token = uid(), made = [], books = [];
    const undo = async () => { for (const m of made) await deleteMedia(acct, m); };
    for (let i = 0; i < r.books.length; i++) {
      const m = `${token}-${i}`;
      if (!(await appSave(acct, { id: uid(), accountId: acct.id, kind: 'bbook', m, c: r.books[i].c, createdAt: Date.now() }))) { await undo(); err.textContent = 'Not saved.'; save.disabled = false; return; }
      made.push(m); books.push({ n: r.books[i].n, ch: r.books[i].c.length, m });
    }
    const meta = { id: uid(), accountId: acct.id, kind: 'bible', name: name.value.trim().slice(0, 80) || 'My Bible', verses: r.verses, books, createdAt: Date.now() };
    if (!(await appSave(acct, meta))) { await undo(); err.textContent = 'Not saved.'; save.disabled = false; return; }
    close(); toast('Bible added.'); render(true);
  });
}

/* ---------- books and search ---------- */
function bibleBookList(acct, ctx, back, info) {
  const box = h('div', { class: 'app-pad' }, h('p', { class: 'muted' }, 'Loading...'));
  const results = h('div', { class: 'bible-results' });
  const q = h('input', { type: 'search', placeholder: 'Search this Bible', 'aria-label': 'Search this Bible' });
  const runSearch = async () => {
    const text = q.value.trim(); results.replaceChildren();
    if (!text) return;
    results.append(h('p', { class: 'muted' }, 'Searching...'));
    const books = await bibleBooks(info), heb = /[֐-׿]/.test(text);
    const all = [];
    if (info.builtin) { const d = await tanakhData(); all.push(...(heb ? d.he : d.en).map(x => ({ c: x.c }))); }
    else for (let i = 0; i < books.length; i++) all.push({ c: (await bookChapters(acct, info, i)).en });
    const hits = BC.search(all, text, 100, heb ? BC.noMarks : undefined);
    results.replaceChildren(...(hits.length ? [h('p', { class: 'fine', style: 'padding:4px 0' }, hits.length >= 100 ? 'Showing the first 100.' : plural(hits.length, 'match').replace('matchs', 'matches')),
      ...hits.map(x => h('a', { class: 'bible-hit', href: `#/apps/bible/${info.id}:${x.b}:${x.c}` }, h('b', {}, `${books[x.b].n} ${x.c}:${x.v}`), h('span', { dir: heb ? 'rtl' : 'ltr' }, x.text)))] : [h('p', { class: 'muted' }, 'Nothing matches.')]));
  };
  q.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  bibleBooks(info).then(books => {
    const groups = [...new Set(books.map(b => b.s))];
    box.replaceChildren(h('div', { class: 'app-row' }, q, h('button', { class: 'btn', onclick: runSearch }, 'Search')), results,
      ...groups.map(g => h('section', { class: 'bible-group' }, h('h3', {}, g), h('div', { class: 'bible-books' },
        books.map((b, i) => b.s === g && h('a', { class: 'btn', href: `#/apps/bible/${info.id}:${i}:1` }, b.n, b.h && h('span', { class: 'he', lang: 'he' }, b.h)))))));
  }).catch(() => box.replaceChildren(h('p', { class: 'err' }, 'Could not load this Bible.')));
  return [back(info.name), box];
}

/* ---------- reading ---------- */
function bibleReader(acct, ctx, back, info, b, c) {
  const st = bibleState(acct, ctx);
  const box = h('div', { class: 'bible-read' }, h('p', { class: 'muted', style: 'padding:16px' }, 'Loading...'));
  const keyOf = v => `${info.id}:${b}:${c}:${v}`;
  (async () => {
    const books = await bibleBooks(info);
    if (!(b >= 0 && b < books.length) || !(c >= 1 && c <= books[b].ch)) { box.replaceChildren(emptyState('Not found', 'That chapter does not exist.')); return; }
    const txt = await bookChapters(acct, info, b);
    const en = txt.en[c - 1] || [], he = txt.he ? txt.he[c - 1] || [] : null;
    st.pos = `${info.id}:${b}:${c}`; saveBibleState(acct, st);
    const mode = he ? st.mode : 'en';
    const set = (k, v) => { st[k] = v; saveBibleState(acct, st, true).then(() => render(true)); };
    const lens = books.map(x => ({ c: { length: x.ch } }));
    const prev = BC.step(lens, b, c, -1), next = BC.step(lens, b, c, 1);
    const nav = (to, label) => to ? h('a', { class: 'btn', href: `#/apps/bible/${info.id}:${to.b}:${to.c}` }, label) : h('span');
    const sel = h('select', { 'aria-label': 'Chapter' }, Array.from({ length: books[b].ch }, (_, i) => h('option', { value: i + 1 }, 'Chapter ' + (i + 1))));
    sel.value = c; sel.addEventListener('change', () => go(`/apps/bible/${info.id}:${b}:${sel.value}`));
    const seg = (v, label) => h('button', { class: 'btn' + (mode === v ? ' primary' : ''), onclick: () => set('mode', v) }, label);
    const verses = Array.from({ length: Math.max(en.length, he ? he.length : 0) }, (_, i) => {
      const v = i + 1, mk = st.marks[keyOf(v)];
      const lines = [];
      if (mode !== 'he') lines.push(h('span', { class: 'v-en' }, en[i] || ''));
      if (he && mode !== 'en') lines.push(h('span', { class: 'v-he', lang: 'he', dir: 'rtl' }, he[i] || ''));
      return h('div', { class: 'verse' + (mk && mk.hl !== undefined ? ' hl' : ''), role: 'button', tabindex: '0', style: mk && mk.hl !== undefined ? `--hl:${HL_COLORS[mk.hl] || HL_COLORS[0]}` : '', 'aria-label': `Verse ${v}`,
        onclick: () => verseMenu(acct, st, info, books, b, c, v, en[i], he && he[i], keyOf(v)),
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } },
        h('sup', {}, String(v)), h('div', {}, ...lines), mk && mk.note && h('div', { class: 'v-note' }, icon('notes'), ' ', mk.note));
    });
    box.replaceChildren(
      h('div', { class: 'bible-bar' }, h('a', { class: 'bible-title', href: '#/apps/bible/' + info.id }, books[b].n + ' ' + c, books[b].h && h('span', { class: 'he', lang: 'he' }, books[b].h)), sel,
        h('div', { class: 'btnrow' }, he && [seg('en', 'English'), seg('he', 'עברית'), seg('both', 'Both')],
          h('button', { class: 'btn', 'aria-label': 'Smaller text', disabled: st.size <= 0.8, onclick: () => set('size', Math.round((st.size - 0.1) * 10) / 10) }, 'A-'),
          h('button', { class: 'btn', 'aria-label': 'Bigger text', disabled: st.size >= 1.8, onclick: () => set('size', Math.round((st.size + 0.1) * 10) / 10) }, 'A+'))),
      h('div', { class: 'verses', style: `font-size:${Math.max(0.8, Math.min(1.8, st.size || 1))}em` }, verses.length ? verses : emptyState('Empty chapter', 'There is no text here.')),
      h('div', { class: 'bible-pager' }, nav(prev, 'Previous'), nav(next, 'Next')));
    window.scrollTo(0, 0);
  })().catch(() => box.replaceChildren(h('p', { class: 'err', style: 'padding:16px' }, 'Could not load this chapter.')));
  return [back(info.name), box];
}

function verseMenu(acct, st, info, books, b, c, v, enText, heText, key) {
  const mk = st.marks[key] || {};
  let hl = mk.hl;
  const note = h('textarea', { rows: 3, placeholder: 'A note, only for you', 'aria-label': 'Note' }, mk.note || '');
  const dots = h('div', { class: 'btnrow' }, HL_COLORS.map((col, i) => h('button', { type: 'button', class: 'swatch' + (hl === i ? ' on' : ''), style: `background:${col}`, 'aria-label': 'Highlight ' + (i + 1), onclick: e => { hl = hl === i ? undefined : i; [...dots.children].forEach((x, j) => x.classList.toggle('on', hl === j)); } })));
  const label = `${books[b].n} ${c}:${v}`;
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, label)),
    h('div', { class: 'mp' }, h('p', {}, enText || ''), heText && h('p', { lang: 'he', dir: 'rtl', class: 'v-he' }, heText), h('div', { class: 'field' }, h('span', {}, 'Highlight'), dots), fieldEl('Note', note),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn primary', onclick: async () => {
          const n = note.value.trim().slice(0, 5000);
          if (hl === undefined && !n) delete st.marks[key]; else st.marks[key] = { ...(hl !== undefined ? { hl } : {}), ...(n ? { note: n } : {}) };
          await saveBibleState(acct, st, true); close(); render(true);
        } }, 'Save'),
        h('button', { class: 'btn', onclick: async () => { try { await navigator.clipboard.writeText(`${label} ${enText || ''}${heText ? '\n' + heText : ''}`); toast('Copied.'); } catch { toast('Could not copy.'); } } }, 'Copy')))));
}

function bibleMarks(acct, ctx, back) {
  const st = bibleState(acct, ctx), box = h('div', { class: 'app-pad' }, h('p', { class: 'muted' }, 'Loading...'));
  (async () => {
    const names = {};
    const rows = [];
    for (const [key, mk] of Object.entries(st.marks)) {
      const [id, b, c, v] = key.split(':'), info = findBible(ctx, id);
      if (!info) continue;
      names[id] = names[id] || await bibleBooks(info);
      if (names[id][+b]) rows.push({ id, b: +b, c: +c, v: +v, mk, label: `${names[id][+b].n} ${c}:${v}`, bible: info.name });
    }
    rows.sort((x, y) => x.id.localeCompare(y.id) || x.b - y.b || x.c - y.c || x.v - y.v);
    box.replaceChildren(...(rows.length ? rows.map(r => h('a', { class: 'bible-hit', href: `#/apps/bible/${r.id}:${r.b}:${r.c}` },
      h('b', {}, r.label), h('span', { class: 'muted' }, r.bible), r.mk.note && h('span', {}, r.mk.note))) : [emptyState('Nothing yet', 'Tap a verse while reading to highlight it or add a note.')]));
  })().catch(() => box.replaceChildren(h('p', { class: 'err' }, 'Could not load that.')));
  return [back('Highlights and notes'), box];
}

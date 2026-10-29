'use strict';
/* Books: an e-reader. Import your own books (EPUB, text, Markdown, HTML, Word, OpenDocument) and read them with your own
   font, size and page colour, a table of contents, search, bookmarks and a remembered place. Everything stays on this device. */
const BK = EbookCore;
let bkActive = null;      // the book being read, so leaving the page saves your place
window.addEventListener('hashchange', () => { if (bkActive && !location.hash.startsWith('#/apps/books/' + bkActive.id)) { const a = bkActive; bkActive = null; a.flush(); } });
let bkQuery = '', bkSort = 'recent', bkFilter = 'all', bkBusy = false, bkScrollOff = null, bkChapterCache = null;
const bkBooks = ctx => ctx.apps.ebook;
const bkSave = (acct, rec) => appSave(acct, { accountId: acct.id, createdAt: Date.now(), ...rec });
const bkPrefs = () => { try { const p = JSON.parse(localStorage.getItem('as.reader') || 'null') || {}; return { size: Math.max(13, Math.min(32, +p.size || 18)), font: ['serif', 'sans', 'mono'].includes(p.font) ? p.font : 'serif', theme: ['app', 'paper', 'sepia', 'dark', 'black'].includes(p.theme) ? p.theme : 'app', lh: Math.max(1.3, Math.min(2.2, +p.lh || 1.65)), width: ['narrow', 'medium', 'wide'].includes(p.width) ? p.width : 'medium' }; } catch { return { size: 18, font: 'serif', theme: 'app', lh: 1.65, width: 'medium' }; } };
const bkSetPref = (k, v) => { try { localStorage.setItem('as.reader', JSON.stringify({ ...bkPrefs(), [k]: v })); } catch { /* not remembered */ } };
const bkHue = s => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360;
const bkCover = (b, cls = '') => b.cover ? h('img', { class: 'bk-cover ' + cls, src: b.cover, alt: '', loading: 'lazy' }) : h('div', { class: 'bk-cover gen ' + cls, style: `--h:${bkHue(b.title)}`, 'aria-hidden': 'true' }, h('b', {}, b.title), b.author ? h('small', {}, b.author) : null);
const bkLeft = (b, lens) => { const m = BK.minutesLeft(lens, b.ci, b.frac); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min left` : `${m} min left`; };

function booksView(acct, ctx, back, bookId) {
  const title = appName(acct, 'books');
  if (bookId) { const b = bkBooks(ctx).find(x => x.id === bookId); return b ? bkReader(acct, ctx, back, b) : [back(title), emptyState('Book not found', 'That book is not on your shelf.')]; }
  const books = bkBooks(ctx);
  const pick = h('input', { type: 'file', multiple: true, hidden: true, accept: BK.TYPES.map(t => '.' + t).join(',') + ',application/epub+zip,text/plain', 'aria-label': 'Choose books to add' });
  pick.addEventListener('change', () => { const f = [...pick.files]; pick.value = ''; if (f.length) bkImport(acct, ctx, f); });
  const status = h('p', { class: 'muted bk-status', role: 'status' });
  const q = h('input', { type: 'search', placeholder: 'Search your books', value: bkQuery, 'aria-label': 'Search your books' });
  const sortSel = h('select', { 'aria-label': 'Sort books', onchange: e => { bkSort = e.target.value; draw(); } }, [['recent', 'Recently read'], ['added', 'Recently added'], ['title', 'Title'], ['author', 'Author']].map(([v, l]) => h('option', { value: v }, l))); sortSel.value = bkSort;
  const fsel = h('select', { 'aria-label': 'Show', onchange: e => { bkFilter = e.target.value; draw(); } }, [['all', 'All books'], ['reading', 'Reading'], ['unread', 'Not started'], ['finished', 'Finished']].map(([v, l]) => h('option', { value: v }, l))); fsel.value = bkFilter;
  const shelf = h('div', { class: 'bk-shelf' });
  const draw = () => {
    const list = BK.sort(BK.search(books, bkQuery), bkSort).filter(b => bkFilter === 'all' || BK.status(b) === bkFilter);
    shelf.replaceChildren(...(list.length ? list.map(b => h('a', { class: 'bk-book', href: '#/apps/books/' + b.id, 'aria-label': `${b.title}${b.author ? ' by ' + b.author : ''}` }, bkCover(b),
      h('b', { class: 'bk-t' }, b.title), h('span', { class: 'muted bk-a' }, b.author || ' '), h('div', { class: 'pd-bar', role: 'progressbar', 'aria-valuenow': String(Math.round(b.progress * 100)), 'aria-valuemax': '100', 'aria-label': 'Progress' }, h('i', { style: `width:${Math.round(b.progress * 100)}%` })),
      h('small', { class: 'muted' }, BK.status(b) === 'finished' ? 'Finished' : BK.status(b) === 'unread' ? 'Not started' : Math.round(b.progress * 100) + '% read'))) : [emptyState(books.length ? 'No matches' : 'Your shelf is empty', books.length ? 'No book matches that.' : 'Add a book from your device and it appears here. Books stay on this device.')]));
  };
  q.addEventListener('input', () => { bkQuery = q.value; draw(); }); draw();
  const body = books.length ? [h('div', { class: 'app-row' }, q), h('div', { class: 'app-row' }, sortSel, fsel), shelf] : [shelf];
  return [back(title, { action: h('button', { class: 'btn primary', onclick: () => pick.click() }, 'Add books') }), h('div', { class: 'app-pad bk-wrap' }, pick, status, ...body, h('p', { class: 'fine' }, 'Add EPUB, text, Markdown, HTML, Word (.docx) or OpenDocument (.odt) files. Your books are not uploaded anywhere. Free public-domain books are at gutenberg.org and standardebooks.org if you want some to start with.'))];
}

/* ---------- adding books ---------- */
async function bkImport(acct, ctx, files) {
  if (bkBusy) return; bkBusy = true;
  const status = document.querySelector('.bk-status'); let made = 0; const failed = [];
  for (const [i, f] of files.entries()) {
    if (status) status.textContent = `Adding ${i + 1} of ${files.length}: ${f.name}...`;
    try {
      if (f.size > BK.MAX_FILE) throw new Error('over 80 MB');
      const book = await BK.fromFile(f.name, new Uint8Array(await f.arrayBuffer()));
      let chs = book.chapters;
      if (chs.length > BK.CHAPTERS_MAX) { const keep = chs.slice(0, BK.CHAPTERS_MAX - 1), rest = chs.slice(BK.CHAPTERS_MAX - 1); keep.push({ title: 'The rest', blocks: rest.flatMap(c => [['h2', c.title], ...c.blocks]) }); chs = keep; }
      const lens = chs.map(c => BK.chars(c)), mts = chs.map(() => uid()), done = [];
      let ok = true;
      for (let k = 0; k < chs.length; k++) { const id = uid(); if (!(await bkSave(acct, { id, kind: 'bookch', m: mts[k], blocks: chs[k].blocks }))) { ok = false; break; } done.push(mts[k]); }
      if (!ok) { for (const m of done) await deleteMedia(acct, m); break; }
      let cover = ''; if (book.cover) { try { cover = await downscale(new File([book.cover.bytes], 'cover', { type: book.cover.type }), 300); } catch { /* no cover picture */ } }
      const rec = { id: uid(), kind: 'ebook', ...BK.norm(book), cover, chapters: chs.map((c, k) => ({ t: c.title, len: lens[k], mt: mts[k] })), marks: [], createdAt: Date.now() };
      if (!(await bkSave(acct, rec))) { for (const m of mts) await deleteMedia(acct, m); break; }
      made++;
    } catch (e) { failed.push(`${f.name} (${/not a zip|Word|OpenDocument|EPUB/.test(e.message) ? 'not a readable book' : e.message.replace(/\.$/, '')})`); }
  }
  bkBusy = false;
  toast(made ? `Added ${plural(made, 'book')}.${failed.length ? ' Could not read: ' + failed.join(', ') : ''}` : failed.length ? 'Could not add: ' + failed.join(', ') : 'Nothing was added.');
  render(true);
}

/* ---------- reading ---------- */
function bkReader(acct, ctx, back, book) {
  let b = { ...book }, ci = Math.min(b.ci, b.chapters.length - 1), saveT = null, loading = 0, locked = false;
  const lens = b.chapters.map(c => c.len), prefs = bkPrefs();
  const page = h('div', { class: 'bk-page' }), article = h('article', { class: 'bk-article', tabindex: '-1' }), meta = h('div', { class: 'bk-meta fine', 'aria-live': 'polite' });
  const applyPrefs = () => { const p = bkPrefs(); page.dataset.theme = p.theme; page.dataset.width = p.width; page.style.setProperty('--bk-size', p.size + 'px'); page.style.setProperty('--bk-lh', p.lh); page.dataset.font = p.font; };
  const flush = async () => { if (locked) return; clearTimeout(saveT); saveT = null; b = { ...b, ...BK.norm({ ...b, ci, frac: fracNow(), progress: BK.progress(lens, ci, fracNow()), lastRead: Date.now() }) }; b.progress = BK.progress(lens, ci, fracNow()); await bkSave(acct, b); };
  const fracNow = () => { const r = article.getBoundingClientRect(), vh = window.innerHeight, total = r.height - vh * 0.6; return total <= 0 ? (r.top < 0 ? 1 : 0) : Math.max(0, Math.min(1, -r.top / total)); };
  const later = () => { clearTimeout(saveT); saveT = setTimeout(flush, 900); meta.textContent = metaText(); };
  const metaText = () => `Chapter ${ci + 1} of ${b.chapters.length} · ${Math.round(BK.progress(lens, ci, fracNow()) * 100)}% · ${bkLeft({ ...b, ci, frac: fracNow() }, lens)}`;
  const onScroll = () => { if (!document.body.contains(article)) { window.removeEventListener('scroll', onScroll); clearTimeout(saveT); return; } if (!loading) later(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  const show = async (to, frac = 0, block = -1) => {
    ci = Math.max(0, Math.min(b.chapters.length - 1, to)); const my = ++loading;
    article.replaceChildren(h('p', { class: 'muted' }, 'Opening...'));
    let blocks = []; try { const r = await loadMedia(acct, b.chapters[ci].mt); blocks = (r[0] && r[0].blocks) || []; } catch { /* shown as empty */ }
    if (my !== loading) return;
    const hd = blocks[0] && blocks[0][0][0] === 'h' && blocks[0][1] === b.chapters[ci].t ? [] : [h('h2', { class: 'bk-ch' }, b.chapters[ci].t)];
    article.replaceChildren(...hd, ...blocks.map(([k, t], i) => k[0] === 'h' ? h(k === 'h1' ? 'h2' : 'h3', { class: 'bk-h', 'data-b': i }, t) : k === 'v' ? h('p', { class: 'bk-v', 'data-b': i }, t) : h('p', { 'data-b': i }, t)));
    article.append(h('div', { class: 'bk-nav' }, h('button', { class: 'btn', disabled: ci === 0, onclick: () => go2(-1) }, '‹ Previous'), h('span', { class: 'muted' }, `${ci + 1} / ${b.chapters.length}`), h('button', { class: 'btn' + (ci < b.chapters.length - 1 ? ' primary' : ''), disabled: ci >= b.chapters.length - 1, onclick: () => go2(1) }, 'Next ›')));
    requestAnimationFrame(() => {
      const top = article.getBoundingClientRect().top + window.scrollY - 70;
      if (block >= 0) { const el = article.querySelector(`[data-b="${block}"]`); if (el) { window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120); el.classList.add('bk-hit'); setTimeout(() => el.classList.remove('bk-hit'), 2500); } }
      else window.scrollTo(0, frac > 0 ? top + frac * Math.max(0, article.getBoundingClientRect().height - window.innerHeight * 0.6) : 0);
      loading = 0; meta.textContent = metaText(); if (frac || block >= 0 || to !== book.ci) later();
    });
  };
  const go2 = d => { show(ci + d, 0); };
  const contents = () => {
    const tab = { v: 'chapters' }, area = h('div', { class: 'bk-toc' });
    const drawT = () => {
      if (tab.v === 'chapters') area.replaceChildren(...b.chapters.map((c, i) => h('button', { class: 'bk-toc-row' + (i === ci ? ' on' : ''), onclick: () => { close(); show(i, 0); } }, h('span', {}, c.t), h('small', { class: 'muted' }, Math.max(1, Math.round(c.len / 5.7 / 230)) + ' min'))));
      else area.replaceChildren(...(b.marks.length ? b.marks.map((m, i) => h('div', { class: 'bk-mark' }, h('button', { class: 'bk-toc-row', onclick: () => { close(); show(m.ci, m.frac); } }, h('span', {}, m.note || `Bookmark in ${b.chapters[m.ci] ? b.chapters[m.ci].t : 'chapter ' + (m.ci + 1)}`), h('small', { class: 'muted' }, `${b.chapters[m.ci] ? b.chapters[m.ci].t : ''} · ${new Date(m.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`)), h('button', { class: 'btn', 'aria-label': 'Remove bookmark', onclick: async () => { b.marks.splice(i, 1); await bkSave(acct, b); drawT(); } }, '×'))) : [h('p', { class: 'muted' }, 'No bookmarks yet. Use the Bookmark button while you read.')]));
    };
    const t = (k, l) => h('button', { class: 'btn', type: 'button', onclick: () => { tab.v = k; drawT(); } }, l);
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, b.title), h('div', { class: 'btnrow' }, t('chapters', 'Chapters'), t('marks', 'Bookmarks')), area, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Close')))); drawT();
    setTimeout(() => area.querySelector('.on')?.scrollIntoView({ block: 'center' }), 50);
  };
  const searchIn = () => {
    const input = h('input', { type: 'search', placeholder: 'Search this book', 'aria-label': 'Search this book' }), out = h('div', { class: 'bk-toc' }), info = h('p', { class: 'muted bk-sinfo' });
    let run = 0;
    const go3 = async () => {
      const q = input.value.trim(), my = ++run; out.replaceChildren(); info.textContent = ''; if (q.length < 2) return;
      let n = 0; info.textContent = 'Searching...';
      for (let i = 0; i < b.chapters.length && n < 60; i++) {
        let blocks = []; try { blocks = ((await loadMedia(acct, b.chapters[i].mt))[0] || {}).blocks || []; } catch { /* skip */ }
        if (my !== run) return;
        for (const hit of BK.findIn({ blocks }, q, 4)) { if (n++ >= 60) break; out.append(h('button', { class: 'bk-toc-row', onclick: () => { close(); show(i, 0, hit.block); } }, h('span', {}, hit.snippet), h('small', { class: 'muted' }, b.chapters[i].t))); }
      }
      if (my === run) info.textContent = n ? `${n}${n >= 60 ? '+' : ''} ${n === 1 ? 'match' : 'matches'}` : 'Nothing found.';
    };
    let tm; input.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(go3, 300); });
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Search'), input, info, out, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { run++; close(); } }, 'Close')))); setTimeout(() => input.focus(), 30);
  };
  const addMark = () => {
    const note = h('input', { maxlength: 120, placeholder: 'A note (optional)', 'aria-label': 'Bookmark note' });
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Bookmark here'), h('p', { class: 'muted' }, b.chapters[ci].t), note, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn primary', onclick: async () => { b.marks = [...(b.marks || []), { ci, frac: fracNow(), note: note.value.trim(), at: Date.now() }].slice(-200); await bkSave(acct, b); close(); toast('Bookmarked.'); } }, 'Save')))); setTimeout(() => note.focus(), 30);
  };
  const settings = () => {
    const p = bkPrefs(); const row = (label, ...els) => h('div', { class: 'bk-row' }, h('span', {}, label), h('div', { class: 'bk-ctl' }, ...els));
    const seg = (key, opts) => opts.map(([v, l]) => h('button', { class: 'btn' + (bkPrefs()[key] === v ? ' primary' : ''), type: 'button', 'aria-pressed': String(bkPrefs()[key] === v), onclick: e => { bkSetPref(key, v); applyPrefs(); e.currentTarget.parentElement.querySelectorAll('button').forEach(x => { const on = x === e.currentTarget; x.classList.toggle('primary', on); x.setAttribute('aria-pressed', String(on)); }); later(); } }, l));
    const step = (key, d, min, max, label, unit) => { const out = h('b', {}, String(bkPrefs()[key])); return [h('button', { class: 'btn', type: 'button', 'aria-label': 'Smaller ' + label, onclick: () => { const v = Math.max(min, +(bkPrefs()[key] - d).toFixed(2)); bkSetPref(key, v); applyPrefs(); out.textContent = v; later(); } }, '−'), out, h('button', { class: 'btn', type: 'button', 'aria-label': 'Bigger ' + label, onclick: () => { const v = Math.min(max, +(bkPrefs()[key] + d).toFixed(2)); bkSetPref(key, v); applyPrefs(); out.textContent = v; later(); } }, '+')]; };
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Reading settings'), row('Text size', ...step('size', 1, 13, 32, 'text')), row('Line spacing', ...step('lh', 0.1, 1.3, 2.2, 'line spacing')),
      row('Font', ...seg('font', [['serif', 'Serif'], ['sans', 'Sans'], ['mono', 'Mono']])), row('Width', ...seg('width', [['narrow', 'Narrow'], ['medium', 'Medium'], ['wide', 'Wide']])),
      row('Page', ...seg('theme', [['app', 'App'], ['paper', 'Paper'], ['sepia', 'Sepia'], ['dark', 'Dark'], ['black', 'Black']])), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => close() }, 'Done'))));
  };
  const manage = () => {
    const title = h('input', { value: b.title, maxlength: 160, 'aria-label': 'Title' }), author = h('input', { value: b.author, maxlength: 120, 'aria-label': 'Author' });
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'About this book'), fieldEl('Title', title), fieldEl('Author', author),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: async () => { locked = true; clearTimeout(saveT); b.progress = 0; b.ci = 0; b.frac = 0; await bkSave(acct, b); close(); go('/apps/books'); } }, 'Mark as not started'), h('button', { class: 'btn', onclick: async () => { locked = true; clearTimeout(saveT); b.progress = 1; b.ci = b.chapters.length - 1; b.frac = 1; await bkSave(acct, b); close(); go('/apps/books'); } }, 'Mark as finished')),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn danger', onclick: () => { close(); const c2 = modal(h('div', { class: 'modal-body' }, h('p', {}, `Remove "${b.title}" from your shelf? There is no undo (you still have the original file).`), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => c2() }, 'Keep it'), h('button', { class: 'btn danger', onclick: async () => { locked = true; clearTimeout(saveT); for (const c of b.chapters) await deleteMedia(acct, c.mt); await appDelete(b.id); c2(); location.hash = '#/apps/books'; render(true); } }, 'Remove')))); } }, 'Remove book'), h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn primary', onclick: async () => { clearTimeout(saveT); b.title = title.value.trim() || b.title; b.author = author.value.trim(); await flush(); close(); render(true); } }, 'Save'))));
  };
  applyPrefs();
  page.append(h('div', { class: 'bk-bar' }, h('button', { class: 'btn', onclick: async () => { await flush(); go('/apps/books'); } }, '‹ Shelf'), h('b', { class: 'bk-title' }, b.title),
    h('div', { class: 'bk-tools' }, h('button', { class: 'btn', onclick: contents }, 'Contents'), h('button', { class: 'btn', onclick: searchIn }, 'Search'), h('button', { class: 'btn', onclick: addMark }, 'Bookmark'), h('button', { class: 'btn', 'aria-label': 'Reading settings', onclick: settings }, 'Aa'), h('button', { class: 'btn', 'aria-label': 'About this book', onclick: manage }, '⋯'))),
    article, meta);
  show(ci, b.frac);
  bkActive = { id: b.id, flush };
  return [back(b.title), page];
}

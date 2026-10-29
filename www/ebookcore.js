'use strict';
/* Books: the pure logic for an e-reader. Turns a book file (EPUB, text, Markdown, HTML, Word, OpenDocument) into chapters of
   plain blocks (headings and paragraphs) that the reader can show, and works out reading progress. Offline, no page. */
const EbookCore = (() => {
  const D = typeof DocxCore !== 'undefined' ? DocxCore : require('./docxcore.js');
  const TYPES = ['epub', 'txt', 'text', 'md', 'markdown', 'html', 'htm', 'xhtml', 'docx', 'odt'];
  const MAX_FILE = 80 * 1024 * 1024;
  const decode = s => D.decode(s);
  const clean = s => decode(String(s || '')).replace(/[ \t\u00a0\u200b]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();

  /* ---------- text -> chapters ---------- */
  // a paragraph of hard-wrapped lines becomes one line of text; a poem keeps its line breaks
  const paragraphs = text => {
    const out = []; let kind = 'p';
    for (const chunk of text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/)) {
      const lines = chunk.split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim());
      if (!lines.length) continue;
      const short = lines.filter(l => l.trim().length < 48).length;
      if (lines.length >= 3 && short / lines.length > 0.7) out.push(['v', lines.map(l => l.trim()).join('\n')]);
      else out.push([kind, lines.map(l => l.trim()).join(' ')]);
    }
    return out;
  };
  const HEAD = /^(chapter|book|part|section|canto|act|scene|letter|volume|stave|prologue|epilogue|preface|introduction|foreword|contents|appendix|epistle)\b[ .:\-–—]*[\dIVXLCDM]*[.:]?\s*.{0,70}$/i;
  const ROMAN = /^(?=[IVXLCDM]+\.?$)M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\.?$/;
  const isHeading = line => { const t = line.trim(); return t.length > 0 && t.length <= 80 && (HEAD.test(t) || ROMAN.test(t) || /^\d{1,3}\.?$/.test(t)); };

  // Project Gutenberg wraps books in a licence; keep the title and author, drop the wrapping
  const gutenberg = text => {
    const s = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i.exec(text), e = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.exec(text);
    if (!s) return { text, title: '', author: '' };
    const head = text.slice(0, s.index), title = (/^\s*Title:\s*(.+)$/im.exec(head) || [])[1] || '', author = (/^\s*Author:\s*(.+)$/im.exec(head) || [])[1] || '';
    return { text: text.slice(s.index + s[0].length, e ? e.index : undefined).replace(/^\s+|\s+$/g, ''), title: title.trim(), author: author.trim() };
  };
  const CHUNK = 30000;
  const splitText = text => {
    const lines = text.replace(/\r\n?/g, '\n').split('\n'), marks = [];
    lines.forEach((l, i) => { if (isHeading(l) && (i === 0 || !lines[i - 1].trim()) && (i === lines.length - 1 || !lines[i + 1].trim() || HEAD.test(l.trim()))) marks.push(i); });
    // headings that are only a roman numeral or number count only if there are several of them
    const real = marks.filter((i, k) => HEAD.test(lines[i].trim()) || marks.length >= 3);
    let chapters = [];
    if (real.length >= 3) {
      const first = real[0]; if (first > 0 && lines.slice(0, first).join('').trim().length > 200) chapters.push({ title: 'Beginning', text: lines.slice(0, first).join('\n') });
      real.forEach((at, k) => { const end = k + 1 < real.length ? real[k + 1] : lines.length; let title = lines[at].trim(), body = lines.slice(at + 1, end); if (ROMAN.test(title) || /^\d{1,3}\.?$/.test(title)) title = 'Chapter ' + title.replace(/\.$/, ''); else if (/^(chapter|book|part)\b[ .:\-]*[\dIVXLCDM]+[.:]?$/i.test(title) && body.length) { const nxt = body.findIndex(l => l.trim()); if (nxt >= 0 && nxt < 3 && body[nxt].trim().length <= 70) { title += ': ' + body[nxt].trim(); body = body.slice(nxt + 1); } } chapters.push({ title, text: lines[at].trim() === title ? body.join('\n') : body.join('\n') }); });
      chapters = chapters.filter(c => c.text.trim().length > 0 || c.title);
    } else {
      const paras = text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/); let cur = [], n = 0, len = 0;
      const flush = () => { if (cur.length) { n++; chapters.push({ title: 'Part ' + n, text: cur.join('\n\n') }); cur = []; len = 0; } };
      for (const p of paras) { cur.push(p); len += p.length; if (len >= CHUNK) flush(); } flush();
      if (chapters.length === 1) chapters[0].title = 'Text';
    }
    return chapters.map(c => ({ title: c.title.slice(0, 100), blocks: paragraphs(c.text) })).filter(c => c.blocks.length);
  };

  /* ---------- markup (HTML, XHTML) -> blocks ---------- */
  const htmlBlocks = html => {
    const body = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [0, html])[1].replace(/<(script|style|head|svg|nav)[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    const out = [];
    const re = /<(h[1-6]|p|li|blockquote|pre|div|tr|dt|dd|figcaption|caption)(\s[^>]*)?>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi; let m, last = 0;
    const add = (kind, inner) => { const t = clean(inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')); if (t) out.push([kind, t]); };
    // nested divs: flatten by repeatedly taking the innermost block text
    const flat = body.replace(/<\/?(div|section|article|main|body|html|header|footer|aside|figure|ul|ol|table|tbody|thead|span|a|em|strong|i|b|u|small|sup|sub|cite|abbr|code|font|center)(\s[^>]*)?>/gi, tag => /^<\/?(?:div|section|article|main|body|html|header|footer|aside|figure|ul|ol|table|tbody|thead)\b/i.test(tag) ? '\n' : '');
    const re2 = /<(h[1-6]|p|li|blockquote|pre|dt|dd|figcaption|caption)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
    let any = false;
    while ((m = re2.exec(flat))) { any = true; const tag = m[1].toLowerCase(); add(/^h[1-6]$/.test(tag) ? (tag === 'h1' ? 'h1' : tag === 'h2' ? 'h2' : 'h3') : tag === 'li' ? 'p' : tag === 'pre' ? 'v' : 'p', tag === 'li' ? '• ' + m[2] : m[2]); }
    if (!any) { const t = clean(flat.replace(/<[^>]+>/g, '\n')); if (t) for (const p of flat.replace(/<[^>]+>/g, '\n').split(/\n\s*\n+/)) { const x = clean(p); if (x) out.push(['p', x]); } }
    return out;
  };

  /* ---------- EPUB ---------- */
  const attr = (tag, name) => { const m = new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i').exec(tag); return m ? decode(m[2] ?? m[3]) : ''; };
  const join = (base, href) => { const parts = (base ? base.split('/') : []).slice(0, -1); for (const s of decodeURIComponent(href.split('#')[0]).split('/')) { if (s === '..') parts.pop(); else if (s && s !== '.') parts.push(s); } return parts.join('/'); };
  const tagText = (xml, name) => { const m = new RegExp('<(?:dc:)?' + name + '\\b[^>]*>([\\s\\S]*?)</(?:dc:)?' + name + '>', 'i').exec(xml); return m ? clean(m[1].replace(/<[^>]+>/g, '')) : ''; };

  const epub = async bytes => {
    const ents = D.entries(bytes), by = new Map(ents.map(e => [e.name, e])), text = async name => { const e = by.get(name); if (!e) throw new Error('missing ' + name); return D.utf8(await D.read(bytes, e)); };
    const container = await text('META-INF/container.xml'), opfPath = attr((/<rootfile\b[^>]*>/i.exec(container) || [''])[0], 'full-path');
    if (!opfPath) throw new Error('That EPUB has no package file.');
    const opf = await text(opfPath), items = new Map();
    for (const m of opf.matchAll(/<item\b[^>]*>/gi)) { const t = m[0]; items.set(attr(t, 'id'), { href: attr(t, 'href'), type: attr(t, 'media-type'), props: attr(t, 'properties') }); }
    const spine = [...opf.matchAll(/<itemref\b[^>]*>/gi)].map(m => attr(m[0], 'idref')).filter(id => items.has(id));
    const meta = { title: tagText(opf, 'title'), author: tagText(opf, 'creator'), lang: tagText(opf, 'language') };
    // contents: the EPUB 3 nav document, or the old toc.ncx
    const toc = new Map();
    try {
      const navItem = [...items.values()].find(i => /\bnav\b/.test(i.props)), ncx = [...items.values()].find(i => /ncx/.test(i.type));
      if (navItem) { const nx = await text(join(opfPath, navItem.href)); for (const m of nx.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) { const h = attr(m[1], 'href'); if (h) { const k = join(join(opfPath, navItem.href), h); if (!toc.has(k)) toc.set(k, clean(m[2].replace(/<[^>]+>/g, ''))); } } }
      else if (ncx) { const nx = await text(join(opfPath, ncx.href)); for (const m of nx.matchAll(/<navPoint\b[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\b([^>]*)>/gi)) { const k = join(join(opfPath, ncx.href), attr(m[2], 'src')); if (!toc.has(k)) toc.set(k, clean(m[1])); } }
    } catch { /* no contents list: titles come from headings */ }
    const chapters = [];
    for (const id of spine) {
      const it = items.get(id); if (!/html|xml/.test(it.type)) continue;
      const path = join(opfPath, it.href); let blocks; try { blocks = htmlBlocks(await text(path)); } catch { continue; }
      if (!blocks.length) continue;
      const head = blocks.find(b => b[0][0] === 'h'), tt = toc.get(path) || (head ? head[1] : '');
      chapters.push({ title: (tt || `Section ${chapters.length + 1}`).slice(0, 100), blocks });
    }
    if (!chapters.length) throw new Error('Nothing readable was found in that EPUB.');
    // the cover picture
    let cover = null;
    const cm = /<meta\b[^>]*name\s*=\s*["']cover["'][^>]*>/i.exec(opf), cid = cm ? attr(cm[0], 'content') : '';
    const ci = (cid && items.get(cid)) || [...items.values()].find(i => /cover-image/.test(i.props)) || [...items.values()].find(i => /^image\//.test(i.type) && /cover/i.test(i.href));
    if (ci) { try { const p = join(opfPath, ci.href), e = by.get(p); if (e) cover = { type: ci.type || 'image/jpeg', bytes: await D.read(bytes, e) }; } catch { /* no cover */ } }
    return { ...meta, chapters, cover };
  };

  /* ---------- any file -> a book ---------- */
  const kind = name => D.kind(name);
  const nameTitle = name => D.title(name);
  const fromFile = async (name, bytes) => {
    if (bytes.length > MAX_FILE) throw new Error('That file is over 80 MB.');
    const k = kind(name);
    if (k === 'epub') { const b = await epub(bytes); return { ...b, title: b.title || nameTitle(name) }; }
    if (k === 'html' || k === 'htm' || k === 'xhtml') { const blocks = htmlBlocks(new TextDecoder('utf-8').decode(bytes)); if (!blocks.length) throw new Error('Nothing readable in that page.'); const chapters = chunkBlocks(blocks); return { title: nameTitle(name), author: '', lang: '', chapters, cover: null }; }
    if (k === 'docx' || k === 'odt') { const n = await D.toNote(name, bytes); return { title: n.title, author: '', lang: '', chapters: splitText(n.body), cover: null }; }
    if (!TYPES.includes(k) && k !== '') throw new Error(`.${k} books are not supported. Try .epub, .txt, .md, .html, .docx or .odt.`);
    let text = D.plain(bytes); const g = gutenberg(text); text = g.text;
    const chapters = splitText(text); if (!chapters.length) throw new Error('There is no text in that file.');
    return { title: g.title || nameTitle(name), author: g.author, lang: '', chapters, cover: null };
  };
  // a long run of blocks becomes chapters at headings, or every ~400 blocks
  const chunkBlocks = blocks => { const out = []; let cur = null; for (const b of blocks) { if (b[0] === 'h1' || (b[0] === 'h2' && cur && cur.blocks.length > 25)) { cur = { title: b[1].slice(0, 100), blocks: [] }; out.push(cur); } if (!cur) { cur = { title: 'Start', blocks: [] }; out.push(cur); } cur.blocks.push(b); if (cur.blocks.length >= 400 && b[0] === 'p') cur = { title: `Part ${out.length + 1}`, blocks: [] }, out.push(cur); } return out.filter(c => c.blocks.length); };

  /* ---------- progress and the shelf ---------- */
  const chars = ch => ch.blocks.reduce((a, b) => a + b[1].length, 0);
  // fraction of the whole book read, from chapter lengths and how far into the chapter
  const progress = (lens, ci, frac) => { const total = lens.reduce((a, b) => a + b, 0) || 1; let before = 0; for (let i = 0; i < ci && i < lens.length; i++) before += lens[i]; return Math.max(0, Math.min(1, (before + (lens[ci] || 0) * Math.max(0, Math.min(1, frac || 0))) / total)); };
  const minutesLeft = (lens, ci, frac, wpm = 230) => { const total = lens.reduce((a, b) => a + b, 0), done = progress(lens, ci, frac) * total; return Math.max(0, Math.round((total - done) / 5.7 / wpm)); };
  const status = b => !b.progress || b.progress <= 0.005 ? 'unread' : b.progress >= 0.985 ? 'finished' : 'reading';
  const norm = r => ({ title: String((r && r.title) || 'Untitled book').slice(0, 160), author: String((r && r.author) || '').slice(0, 120), lang: String((r && r.lang) || '').slice(0, 12), ci: Math.max(0, Math.floor(+(r && r.ci) || 0)), frac: Math.max(0, Math.min(1, +(r && r.frac) || 0)), progress: Math.max(0, Math.min(1, +(r && r.progress) || 0)), lastRead: Number(r && r.lastRead) || 0 });
  const sort = (books, how) => { const t = b => (b.title || '').toLowerCase(), a = b => (b.author || '').toLowerCase(); return [...books].sort(how === 'title' ? (x, y) => t(x).localeCompare(t(y)) : how === 'author' ? (x, y) => a(x).localeCompare(a(y)) || t(x).localeCompare(t(y)) : how === 'added' ? (x, y) => (y.createdAt || 0) - (x.createdAt || 0) : (x, y) => (y.lastRead || y.createdAt || 0) - (x.lastRead || x.createdAt || 0)); };
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const search = (books, q) => { q = fold(q).trim(); return q ? books.filter(b => fold(b.title + ' ' + b.author).includes(q)) : books; };
  // hits for a phrase inside a chapter's blocks, with a little text around each
  const findIn = (chapter, q, limit = 5) => { q = fold(q).trim(); if (!q) return []; const out = []; chapter.blocks.forEach((b, i) => { const f = fold(b[1]); let at = f.indexOf(q); while (at >= 0 && out.length < limit) { out.push({ block: i, at, snippet: (at > 30 ? '…' : '') + b[1].slice(Math.max(0, at - 30), at + q.length + 50) + (b[1].length > at + q.length + 50 ? '…' : '') }); at = f.indexOf(q, at + q.length); } }); return out; };
  const CHAPTERS_MAX = 600;

  return { TYPES, MAX_FILE, paragraphs, gutenberg, splitText, htmlBlocks, epub, fromFile, chunkBlocks, chars, progress, minutesLeft, status, norm, sort, search, findIn, CHAPTERS_MAX, isHeading };
})();
if (typeof module !== 'undefined') module.exports = EbookCore;

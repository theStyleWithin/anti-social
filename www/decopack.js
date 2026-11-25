'use strict';
/* Decoration packs: your own nameplates, profile banners and avatar decorations, brought in from a file.
   A pack is a small JSON file (.asdeco) that Sudo Make Art writes, or that anyone can write by hand; a lone .svg works too.
   Everything here is plain functions with no page in sight, so the same code runs in the app and in tools/check-deco.js.

   The art is only ever drawn as a picture (a CSS background), where browsers do not run scripts or fetch anything.
   On top of that, every file is rebuilt from an allow-list on the way in: elements, attributes and links that are not
   on the list are dropped, so what gets stored is plain drawing and nothing else. */
const DecoPack = (() => {
  const FORMAT = 'anti-social-decorations', VERSION = 1;
  /* the three shapes. w/h is the size the art is drawn at, tol how far a file's shape may stray from it, max the biggest art allowed (bytes of SVG).
     A wreath keeps a clear circle in the middle for the picture: hole = { cx, cy, r } in the 144 box. */
  const KINDS = {
    plate: { label: 'Nameplate', w: 240, h: 44, tol: 0.15, rtol: 0.35, imgMax: 400000, max: 150000, par: 'xMidYMid slice', pre: 'cp_' },
    banner: { label: 'Profile banner', w: 1200, h: 200, tol: 0.15, rtol: 0.35, imgMax: 1500000, max: 700000, par: 'xMidYMid slice', pre: 'cb_' },
    wreath: { label: 'Avatar decoration', w: 144, h: 144, tol: 0.03, rtol: 0.05, imgMax: 600000, max: 300000, par: 'xMidYMid meet', pre: 'cw_', hole: { cx: 72, cy: 72, r: 50 } },
  };
  const LIMITS = { file: 16 * 1024 * 1024, video: 3 * 1024 * 1024, items: 40, library: 120, elements: 3000, depth: 30, name: 40, blurb: 100, credit: 60 };
  const SHAPES = new Set('svg g defs path rect circle ellipse line polyline polygon text tspan textPath image linearGradient radialGradient stop clipPath mask pattern use symbol filter feGaussianBlur feColorMatrix feOffset feMerge feMergeNode feFlood feComposite feBlend feDropShadow feMorphology feTurbulence feDisplacementMap feComponentTransfer feFuncR feFuncG feFuncB feFuncA animate animateTransform animateMotion set mpath title desc style'.split(' '));
  const MOTION = new Set(['animate', 'animateTransform', 'animateMotion', 'set']);
  const TEXTY = new Set(['text', 'tspan', 'textPath', 'title', 'desc', 'style']);
  const HREFY = new Set(['image', 'use', 'linearGradient', 'radialGradient', 'pattern', 'textPath', 'mpath']);

  const fnv = (s, seed) => { let h = seed >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const hex = n => n.toString(16).padStart(8, '0');
  const idOf = (kind, art) => KINDS[kind].pre + hex(fnv(art, 2166136261)).slice(0, 6) + hex(fnv(art, 40503)).slice(0, 4);
  const isId = id => /^c[pbw]_[0-9a-f]{10}$/.test(String(id || ''));
  const kindOfId = id => ({ cp: 'plate', cb: 'banner', cw: 'wreath' }[String(id || '').slice(0, 2)] || '');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const tidy = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

  // &amp; &lt; &gt; &quot; &apos; and numeric references are understood; anything else (a custom entity) makes the value unusable
  function decode(s) {
    const out = s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
      const l = e.toLowerCase();
      if (l === 'amp') return '&'; if (l === 'lt') return '<'; if (l === 'gt') return '>'; if (l === 'quot') return '"'; if (l === 'apos') return "'";
      const n = l[1] === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    });
    return /&[^;\s]{1,12};/.test(out) ? null : out;
  }

  /* ---------- a small XML reader: tags, attributes and text, nothing else ---------- */
  function read(src) {
    if (/<!DOCTYPE|<!ENTITY/i.test(src)) return { error: 'This file uses a DOCTYPE or custom entities, which are not allowed.' };
    const tok = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<\/([A-Za-z][\w:.-]*)\s*>|<([A-Za-z][\w:.-]*)((?:\s+[^\s=\/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>|([^<]+)/y;
    const root = { name: '#root', kids: [] }, stack = [root]; let m, count = 0, last = 0;
    while (tok.lastIndex < src.length) {
      last = tok.lastIndex; m = tok.exec(src);
      if (!m) return { error: 'The SVG is not well formed (stray "<" near character ' + last + ').' };
      const top = stack[stack.length - 1];
      if (m[1] !== undefined) top.kids.push({ text: esc(m[1]) });
      else if (m[2] !== undefined) { if (stack.length < 2 || top.name !== m[2]) return { error: 'The SVG is not well formed (</' + m[2] + '> does not match).' }; stack.pop(); }
      else if (m[3] !== undefined) {
        if (++count > LIMITS.elements * 2) return { error: 'The SVG has too many elements.' };
        const attrs = []; String(m[4] || '').replace(/([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g, (_, n, a, b) => { attrs.push([n, a !== undefined ? a : b !== undefined ? b : '']); return ''; });
        const node = { name: m[3], attrs, kids: [] }; top.kids.push(node);
        if (!m[5]) { stack.push(node); if (stack.length > LIMITS.depth + 2) return { error: 'The SVG is nested too deeply.' }; }
      } else if (m[6] !== undefined && m[0][0] !== '<') top.kids.push({ text: m[6] });
    }
    if (stack.length !== 1) return { error: 'The SVG is not well formed (a tag is never closed).' };
    const svg = root.kids.find(k => k.name);
    return svg && svg.name === 'svg' ? { svg } : { error: 'This is not an SVG picture.' };
  }

  /* ---------- the allow-list ---------- */
  const SAFE_NAME = /^[A-Za-z_][\w.-]*(?::[A-Za-z][\w.-]*)?$/;
  const hrefOk = (el, v) => HREFY.has(el) && (el === 'image' ? /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(v) : /^#[\w.-]+$/.test(v));
  const urlsOk = v => { for (const m of v.matchAll(/url\(\s*([^)]*)\)/gi)) { const u = m[1].trim().replace(/^['"]|['"]$/g, ''); if (!/^#[\w.-]+$/.test(u)) return false; } return !/expression\s*\(|@import|javascript:|behavior\s*:|-moz-binding/i.test(v); };
  const cssOk = css => { const c = css.replace(/\/\*[\s\S]*?\*\//g, ''); if (!/^\s*(@font-face\s*\{[^{}]*\}\s*)+$/.test(c)) return false; for (const m of c.matchAll(/url\(\s*([^)]*)\)/gi)) if (!/^['"]?data:(font|application)\/[\w.+-]+;base64,[A-Za-z0-9+/=\s]+['"]?$/.test(m[1].trim())) return false; return !/@import|javascript:|expression\s*\(/i.test(c); };

  function clean(node, o, st) {
    const n = node.name;
    if (!SHAPES.has(n)) { st.dropped.add(n); return ''; }
    if (MOTION.has(n) && !o.animate) return '';
    if (++st.count > LIMITS.elements) { st.over = true; return ''; }
    let attrs = '';
    for (const [k, raw] of node.attrs) {
      if (!SAFE_NAME.test(k) || /^on/i.test(k)) continue;
      if (/^xmlns/i.test(k) || /^(class|data-.*|id-.*)$/i.test(k)) continue;
      const lk = k.toLowerCase();
      if (k.includes(':') && !/^(xlink:href|xml:space)$/.test(k)) continue;
      const v = decode(raw); if (v === null || v.length > 800000) continue;
      if (k === 'href' || k === 'xlink:href') { if (!hrefOk(n, v.trim())) { st.dropped.add('a link'); continue; } attrs += ` xlink:href="${esc(v.trim())}"`; st.xlink = true; continue; }
      if (v.length > 6000 && lk !== 'd' && lk !== 'points' && lk !== 'values') continue;
      if (lk === 'attributename' && /^(xlink:)?href$|^on|^style$/i.test(v.trim())) { st.dropped.add('an animated link'); return ''; }
      if (/data:/i.test(v) || !urlsOk(v)) { st.dropped.add('a link'); continue; }
      if (lk === 'id') { if (!/^[\w.-]{1,60}$/.test(v)) continue; }
      attrs += ` ${k}="${esc(v)}"`;
    }
    if ((n === 'image' || n === 'use' || n === 'mpath') && !/xlink:href=/.test(attrs)) return '';   // a picture or reference with nothing safe to point at
    if (n === 'style') {
      const css = node.kids.map(c => c.text !== undefined ? c.text : '').join(''), d = decode(css);
      if (d === null || !cssOk(d)) { st.dropped.add('style'); return ''; }
      return `<style>${esc(d)}</style>`;
    }
    let inner = '';
    for (const c of node.kids) {
      if (c.text !== undefined) { if (TEXTY.has(n)) { const t = decode(c.text); inner += t === null ? '' : esc(t); } }
      else inner += clean(c, o, st);
    }
    return inner || n === 'svg' || /^(path|rect|circle|ellipse|line|polyline|polygon|stop|image|use|mpath|set|animate|animateTransform|animateMotion|feMergeNode|feFlood|feOffset|feGaussianBlur|feColorMatrix|feComposite|feBlend|feDropShadow|feMorphology|feTurbulence|feDisplacementMap|feFuncR|feFuncG|feFuncB|feFuncA)$/.test(n) ? `<${n}${attrs}>${inner}</${n}>` : '';
  }

  // an SVG text -> { ok, svg, shape } (svg at the size the kind wants), or { ok:false, error }
  function cleanSvg(text, kind, o = {}) {
    const K = KINDS[kind]; if (!K) return { ok: false, error: 'Unknown kind of decoration.' };
    text = String(text || ''); if (text.length > K.max * 2) return { ok: false, error: 'This picture is too big for a ' + K.label.toLowerCase() + '.' };
    const r = read(text); if (r.error) return { ok: false, error: r.error };
    const root = r.svg, at = Object.fromEntries(root.attrs.map(([k, v]) => [k, v]));
    let vb = String(at.viewBox || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(x => !Number.isFinite(x))) { const w = parseFloat(at.width), h = parseFloat(at.height); vb = w > 0 && h > 0 ? [0, 0, w, h] : null; }
    if (!vb || vb[2] <= 0 || vb[3] <= 0 || vb[2] > 1e5 || vb[3] > 1e5) return { ok: false, error: 'The picture has no usable size (it needs a viewBox).' };
    const shape = vb[2] / vb[3], want = K.w / K.h;
    if (Math.abs(shape / want - 1) > K.tol) return { ok: false, error: `Wrong shape for a ${K.label.toLowerCase()}: it is ${+vb[2].toFixed(1)} × ${+vb[3].toFixed(1)}, and should be about ${K.w} × ${K.h}.` };
    const st = { count: 0, dropped: new Set(), xlink: false, over: false };
    const body = root.kids.map(c => c.name ? clean(c, { animate: o.animate !== false }, st) : '').join('');
    if (st.over) return { ok: false, error: 'The SVG has too many elements.' };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"${st.xlink ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : ''} viewBox="${vb.map(x => +x.toFixed(3)).join(' ')}" width="${K.w}" height="${K.h}" preserveAspectRatio="${K.par}">${body}</svg>`;
    if (svg.length > K.max) return { ok: false, error: 'This picture is too big for a ' + K.label.toLowerCase() + ' (' + Math.round(svg.length / 1000) + ' KB; the limit is ' + Math.round(K.max / 1000) + ' KB).' };
    return { ok: true, svg, shape, dropped: [...st.dropped], moves: /<(animate|animateTransform|animateMotion|set)\b/.test(svg) };
  }


  /* ---------- pictures (PNG, GIF, WebP, JPEG) and video clips ---------- */
  const IMG_URI = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+\/=\s]+)$/, VID_URI = /^data:video\/(mp4|webm);base64,([A-Za-z0-9+\/=\s]+)$/;
  const bytesOf = b64 => { const bin = typeof atob === 'function' ? atob(b64.replace(/\s+/g, '')) : Buffer.from(b64, 'base64').toString('binary'); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const u16 = (b, i) => b[i] | b[i + 1] << 8, u24 = (b, i) => b[i] | b[i + 1] << 8 | b[i + 2] << 16, be32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const has4 = (b, tag) => { const t = [...tag].map(c => c.charCodeAt(0)); for (let i = 0; i + 4 <= b.length; i++) if (b[i] === t[0] && b[i + 1] === t[1] && b[i + 2] === t[2] && b[i + 3] === t[3]) return true; return false; };
  // the size and whether it moves, read from the file's own header (nothing is decoded or run)
  function imageInfo(uri) {
    const m = IMG_URI.exec(String(uri || '')); if (!m) return null; let b; try { b = bytesOf(m[2]); } catch { return null; }
    let w = 0, h = 0, moves = false;
    if (m[1] === 'png') { if (b.length < 24 || be32(b, 0) !== 0x89504e47) return null; w = be32(b, 16); h = be32(b, 20); moves = has4(b, 'acTL'); }
    else if (m[1] === 'gif') { if (b.length < 10 || b[0] !== 71 || b[1] !== 73 || b[2] !== 70) return null; w = u16(b, 6); h = u16(b, 8); let n = 0; for (let i = 0; i + 3 < b.length; i++) if (b[i] === 0x21 && b[i + 1] === 0xf9 && b[i + 2] === 4) n++; moves = n > 1; }
    else if (m[1] === 'webp') {
      if (b.length < 30 || be32(b, 0) !== 0x52494646 || be32(b, 8) !== 0x57454250) return null; const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
      if (tag === 'VP8X') { w = 1 + u24(b, 24); h = 1 + u24(b, 27); moves = !!(b[20] & 2); } else if (tag === 'VP8 ') { w = u16(b, 26) & 0x3fff; h = u16(b, 28) & 0x3fff; } else if (tag === 'VP8L') { w = 1 + (((b[22] & 0x3f) << 8) | b[21]); h = 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)); } else return null;
    } else { if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null; for (let i = 2; i + 9 < b.length;) { if (b[i] !== 0xff) { i++; continue; } const mk = b[i + 1]; if (mk >= 0xc0 && mk <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(mk)) { h = (b[i + 5] << 8) | b[i + 6]; w = (b[i + 7] << 8) | b[i + 8]; break; } i += 2 + ((b[i + 2] << 8) | b[i + 3]); } }
    return w >= 16 && h >= 16 && w <= 4096 && h <= 4096 ? { type: m[1], w, h, moves, bytes: b.length } : null;
  }
  const nearestKind = (w, h, key) => { const s = w / h; let best = '', gap = 9; for (const k of Object.keys(KINDS)) { const g = Math.abs(s / (KINDS[k].w / KINDS[k].h) - 1); if (g <= KINDS[k][key] && g < gap) { best = k; gap = g; } } return best; };

  function imageItem(kind, name, blurb, uri, still) {
    const K = KINDS[kind], i = imageInfo(uri); if (!i) return { error: 'This is not a usable PNG, GIF, WebP or JPEG picture (it must be between 16 and 4096 pixels).' };
    if (i.bytes > K.imgMax) return { error: 'This picture is too big for a ' + K.label.toLowerCase() + ' (' + Math.round(i.bytes / 1000) + ' KB; the limit is ' + Math.round(K.imgMax / 1000) + ' KB).' };
    if (Math.abs(i.w / i.h / (K.w / K.h) - 1) > K.rtol) return { error: `Wrong shape for a ${K.label.toLowerCase()}: it is ${i.w} × ${i.h}, and should be about ${K.w} × ${K.h} in shape (for example ${K.w * 4} × ${K.h * 4}).` };
    const st = still && imageInfo(still) && !imageInfo(still).moves ? still : '';
    return { item: { id: idOf(kind, uri.length + uri.slice(0, 2000) + uri.slice(-2000)), kind, mode: 'image', name: tidy(name, LIMITS.name) || K.label, blurb: tidy(blurb, LIMITS.blurb), art: uri.replace(/\s+/g, ''), still: st, moves: i.moves } };
  }
  // a video clip is kept as it came; the app turns it into a strip of frames when it is imported (that needs a page)
  function videoItem(kind, name, blurb, uri) {
    const K = KINDS[kind], m = VID_URI.exec(String(uri || '')); if (!m) return { error: 'This is not a usable MP4 or WebM video.' };
    const bytes = Math.floor(m[2].replace(/\s+/g, '').length * 3 / 4); if (bytes > LIMITS.video) return { error: 'This video is too big (' + (bytes / 1048576).toFixed(1) + ' MB; the limit is ' + (LIMITS.video / 1048576) + ' MB). A few seconds at a small size is plenty.' };
    return { item: { id: idOf(kind, uri.length + uri.slice(0, 2000) + uri.slice(-2000)), kind, mode: 'video', name: tidy(name, LIMITS.name) || K.label, blurb: tidy(blurb, LIMITS.blurb), art: '', src: uri.replace(/\s+/g, ''), still: '', moves: true } };
  }
  // a picture or video file already read as a data: URL -> one item (a video's kind is decided from its shape once the page has loaded it)
  function parseMedia(uri, fileName) {
    const name = String(fileName || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    if (VID_URI.test(uri)) { const r = videoItem('plate', name, '', uri); return r.error ? { ok: false, error: r.error } : { ok: true, items: [{ ...r.item, kind: '' }], skipped: [], name: '', author: '', license: '' }; }
    const i = imageInfo(uri); if (!i) return { ok: false, error: 'This is not a usable picture.' };
    const kind = nearestKind(i.w, i.h, 'rtol'); if (!kind) return { ok: false, error: `This picture is ${i.w} × ${i.h}. A nameplate is about 240 × 44 in shape, a banner 1200 × 200 and an avatar decoration square (144 × 144).` };
    const r = imageItem(kind, name, '', uri, ''); return r.error ? { ok: false, error: r.error } : { ok: true, items: [r.item], skipped: [], name: '', author: '', license: '' };
  }

  const guessKind = text => { const m = String(text).match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/); if (!m || !(+m[2] > 0)) return ''; const s = m[1] / m[2]; return Object.keys(KINDS).find(k => Math.abs(s / (KINDS[k].w / KINDS[k].h) - 1) <= KINDS[k].tol) || ''; };

  // one item as it is stored: { id, kind, mode: 'svg' | 'image' | 'video', name, blurb, art, still, moves, src? }
  function makeItem(kind, name, blurb, it) {
    if (it && typeof it.image === 'string') return imageItem(kind, name, blurb, it.image, it.still);
    if (it && typeof it.video === 'string') return videoItem(kind, name, blurb, it.video);
    const art = it && it.art, still = it && it.still;
    const a = cleanSvg(art, kind, { animate: true }); if (!a.ok) return { error: a.error };
    let s = still ? cleanSvg(still, kind, { animate: false }) : null; if (s && !s.ok) s = null;
    const stillArt = s ? s.svg : cleanSvg(art, kind, { animate: false }).svg;
    return { item: { id: idOf(kind, a.svg), kind, mode: 'svg', name: tidy(name, LIMITS.name) || KINDS[kind].label, blurb: tidy(blurb, LIMITS.blurb), art: a.svg, still: stillArt === a.svg ? '' : stillArt, moves: a.moves }, dropped: a.dropped };
  }

  // a file's text -> { ok, name, author, license, items, skipped } or { ok:false, error }
  function parseFile(text, fileName) {
    text = String(text || '').replace(/^﻿/, ''); if (text.length > LIMITS.file) return { ok: false, error: 'That file is too big.' };
    const t = text.trimStart(), items = [], skipped = [], seen = new Set();
    const add = (kind, name, blurb, src, label) => {
      if (!KINDS[kind]) { skipped.push({ name: label, why: 'unknown kind "' + tidy(kind, 20) + '"' }); return; }
      const r = makeItem(kind, name, blurb, src); if (r.error) { skipped.push({ name: label, why: r.error }); return; }
      if (seen.has(r.item.id)) return; seen.add(r.item.id); items.push({ ...r.item, dropped: r.dropped });
    };
    if (t[0] === '<') {                                                    // a lone picture
      const kind = guessKind(t); if (!kind) { const r = read(t); return { ok: false, error: r.error || 'The picture is not the shape of a nameplate (240 × 44), a banner (1200 × 200) or an avatar decoration (144 × 144).' }; }
      add(kind, String(fileName || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), '', { art: t }, 'picture');
      return items.length ? { ok: true, name: '', author: '', license: '', items, skipped } : { ok: false, error: skipped[0] ? skipped[0].why : 'Nothing to import.' };
    }
    let d; try { d = JSON.parse(t); } catch { return { ok: false, error: 'This is not a decoration pack (it is not JSON or SVG).' }; }
    if (!d || d.format !== FORMAT) return { ok: false, error: 'This is not an Anti-Social decoration pack.' };
    if (!(d.v >= 1) || d.v > VERSION) return { ok: false, error: 'This pack was made for a newer version of Anti-Social. Update the app and try again.' };
    if (!Array.isArray(d.items) || !d.items.length) return { ok: false, error: 'This pack has nothing in it.' };
    d.items.slice(0, LIMITS.items).forEach((it, i) => add(it && it.kind, it && it.name, it && it.blurb, it, tidy(it && it.name, 40) || 'item ' + (i + 1)));
    if (d.items.length > LIMITS.items) skipped.push({ name: 'the rest', why: 'a pack can hold ' + LIMITS.items + ' items at most' });
    return items.length ? { ok: true, name: tidy(d.name, LIMITS.name), author: tidy(d.author, LIMITS.credit), license: tidy(d.license, LIMITS.credit), items, skipped } : { ok: false, error: skipped.length ? skipped[0].name + ': ' + skipped[0].why : 'Nothing to import.' };
  }

  // stored records -> the pack file text
  function buildPack(meta, records) {
    const items = records.map(r => ({ kind: r.dkind, name: r.name, blurb: r.blurb || '', ...(r.mode === 'image' ? { image: r.art } : r.mode === 'sprite' ? { video: r.src } : { art: r.art }), ...(r.still && r.mode !== 'sprite' ? { still: r.still } : {}) }));
    return JSON.stringify({ format: FORMAT, v: VERSION, name: tidy(meta.name, LIMITS.name) || 'My decorations', author: tidy(meta.author, LIMITS.credit), license: tidy(meta.license, LIMITS.credit), items }, null, 1);
  }

  return { FORMAT, VERSION, KINDS, LIMITS, imageInfo, parseMedia, nearestKind, idOf, isId, kindOfId, cleanSvg, parseFile, buildPack, guessKind, tidy };
})();
if (typeof module !== 'undefined') module.exports = DecoPack;

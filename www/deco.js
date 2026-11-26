'use strict';
/* Profile decorations for the Chat Rooms look: member-list nameplates, a server banner and a server tag your profile wears.
   Nobody else will ever see them (there is nobody else); they are for you, and for showing someone your phone.
   Animated profile backgrounds and avatar wreaths come next and will live in the same record (see decocore.js). */
const Deco = (() => {
  const D = DecoCore;
  let active = { id: '', p: D.normProfile(null) };
  // called on every render: which account is "me", and how is it dressed (the avatar() helper reads this)
  // the nameplate is also kept on the account's plain record, so the account list can show it for every account, even one that is locked
  const planted = new Map();
  const rememberPlate = (id, plate) => { if (planted.get(id) === plate) return; planted.set(id, plate); db.get('accounts', id).then(raw => { if (raw && (raw.plate || 'none') !== plate) { const { plate: _p, ...rest } = raw; return db.put('accounts', plate === 'none' ? rest : { ...rest, plate }); } }).catch(() => {}); };
  const setActive = (acct, ctx) => { loadCustom(acct, ctx); active = { id: acct.id, p: D.normProfile((ctx.apps.deco || [])[0]) }; rememberPlate(acct.id, active.p.plate); cachePlate(acct, active.p.plate); const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); document.documentElement.dataset.decoAnim = active.p.animate && !calm ? 'on' : 'off'; };
  const wreathOf = a => (a && a.id && a.id === active.id && tplId() === 'chat' ? active.p.wreath : '');
  // the pictures behind the decorations are drawn (and animated) in decocore.js and handed to the page as CSS, once: a moving set and a still set
  (function injectArt() {
    let css = '';
    for (const an of [true, false]) {
      const art = D.buildArt(an), p = an ? 'html:not([data-deco-anim="off"])' : 'html[data-deco-anim="off"]';
      for (const id of Object.keys(art.wreath)) css += `${p} .avatar[data-wreath="${id}"]::after{background-image:${D.uri(art.wreath[id])}}\n`;
      for (const id of Object.keys(art.plate)) css += `${p} [data-plate="${id}"]::before{background:${D.uri(art.plate[id])} center/cover no-repeat;animation:none}\n`;
      for (const id of Object.keys(art.bg)) css += `${p} .banner[data-bg="${id}"] .bimg{background:${D.uri(art.bg[id])} center/cover no-repeat !important}\n`;
    }
    const el = document.createElement('style'); el.id = 'deco-art'; el.textContent = css; document.head.append(el);
  })();
  const mine = ctx => D.normProfile((ctx.apps.deco || [])[0]);
  const server = ctx => D.normServer((ctx.apps.srv || [])[0]);
  async function saveProfile(acct, ctx, patch) { const r = (ctx.apps.deco || [])[0], v = { ...D.normProfile(r), ...patch }; if ('plate' in patch) rememberPlate(acct.id, v.plate); return appSave(acct, { id: r ? r.id : 'deco' + acct.id, accountId: acct.id, kind: 'deco', plate: v.plate, bg: v.bg, wreath: v.wreath, animate: v.animate, updatedAt: Date.now() }); }
  async function saveServer(acct, ctx, patch) {
    const r = (ctx.apps.srv || [])[0], v = { ...D.normServer(r), ...patch };
    return appSave(acct, { id: r ? r.id : 'srv' + acct.id, accountId: acct.id, kind: 'srv', name: r ? r.name || '' : '', tag: v.tag, tagColor: v.tagColor, tagGlyph: v.tagGlyph, bannerPreset: v.bannerPreset, bannerImg: v.bannerImg, updatedAt: Date.now() });
  }
  // going back to the default server name keeps the tag and banner
  async function clearName(acct, ctx) { const r = (ctx.apps.srv || [])[0]; if (!r) return; const s = D.normServer(r); if (s.tag || s.bannerPreset || s.bannerImg) await appSave(acct, { ...r, name: '', updatedAt: Date.now() }); else await appDelete(r.id); }
  const tagEl = s => (s && s.tag ? h('span', { class: 'srv-tag', style: `--tag:${s.tagColor}`, title: 'Server tag' }, s.tagGlyph ? h('i', { 'aria-hidden': 'true' }, s.tagGlyph) : null, s.tag) : null);
  const plateAttrs = (id, animate) => (id && id !== 'none' ? { 'data-plate': id, 'data-anim': animate === false ? 'off' : 'on' } : {});
  const plated = id => !!id && id !== 'none';

  /* ----- your own decorations: nameplates, banners and avatar decorations brought in from a pack file (see decopack.js) ----- */
  const Pk = typeof DecoPack !== 'undefined' ? DecoPack : null;
  let ownRecs = [], seenRecs = [], ownSig = '', paintSig = '';
  const num = (v, lo, hi) => { const n = Math.round(Number(v)); return n >= lo && n <= hi ? n : 0; };
  // a stored record -> what the app uses, or null. Everything is checked again here, because a file you import with an account could say anything.
  const vet = r => {
    if (!Pk || !r || !Pk.KINDS[r.dkind] || !Pk.isId(r.did) || Pk.kindOfId(r.did) !== r.dkind || typeof r.art !== 'string') return null;
    const o = { id: r.did, rid: r.id, dkind: r.dkind, name: Pk.tidy(r.name, 40) || 'Mine', blurb: Pk.tidy(r.blurb, 100), author: Pk.tidy(r.author, 60), license: Pk.tidy(r.license, 60), pack: Pk.tidy(r.pack, 40), mode: r.mode === 'image' || r.mode === 'sprite' ? r.mode : 'svg', moves: !!r.moves, src: '', still: '' };
    if (o.mode === 'svg') {
      const a = Pk.cleanSvg(r.art, o.dkind, { animate: true }); if (!a.ok) return null;
      const st = r.still ? Pk.cleanSvg(r.still, o.dkind, { animate: false }) : null;
      o.art = a.svg; o.moves = a.moves; o.still = st && st.ok ? st.svg : Pk.cleanSvg(r.art, o.dkind, { animate: false }).svg; return o;
    }
    const i = Pk.imageInfo(r.art); if (!i) return null; o.art = r.art;
    if (o.mode === 'image') { o.moves = i.moves; o.still = r.still && Pk.imageInfo(r.still) ? r.still : ''; return o; }
    o.cols = num(r.cols, 1, 16); o.rows = num(r.rows, 1, 16); o.frames = num(r.frames, 1, o.cols * o.rows); o.dur = Math.min(12, Math.max(0.5, Number(r.dur) || 0)); o.moves = o.frames > 1;
    if (!o.cols || !o.rows || !o.frames || !o.dur) return null; o.src = typeof r.src === 'string' && r.src.length < 5e6 ? r.src : ''; return o;
  };
  // the CSS that draws one of them, in a moving version and a still one (the page picks by data-deco-anim, like the built-in art)
  const urlOf = (r, text) => (r.mode === 'svg' ? D.uri(text) : 'url("' + text + '")');
  function cssFor(r, an) {
    const p = an ? 'html:not([data-deco-anim="off"])' : 'html[data-deco-anim="off"]', imp = r.dkind === 'banner' ? ' !important' : '';
    const sel = r.dkind === 'wreath' ? `${p} .avatar[data-wreath="${r.id}"]::after` : r.dkind === 'plate' ? `${p} [data-plate="${r.id}"]::before` : `${p} .banner[data-bg="${r.id}"] .bimg`;
    const decl = d => d.map(x => x + imp).join(';');
    if (r.mode === 'sprite') {
      const at = k => `${r.cols > 1 ? (k % r.cols) / (r.cols - 1) * 100 : 0}% ${r.rows > 1 ? Math.floor(k / r.cols) / (r.rows - 1) * 100 : 0}%`, play = an && r.frames > 1;
      let kf = ''; if (play) { for (let k = 0; k < r.frames; k++) kf += `${+(k / r.frames * 100).toFixed(3)}%{background-position:${at(k)}}`; kf = `@keyframes dv_${r.id}{${kf}}\n`; }
      // !important would beat the animation, so the picture, size and repeat are important (to beat a banner picture set inline) and the moving position is not
      const keep = play ? [3, 4] : [];
      return kf + `${sel}{${[`background-image:${urlOf(r, r.art)}`, `background-size:${r.cols * 100}% ${r.rows * 100}%`, 'background-repeat:no-repeat', `background-position:${at(0)}`, play ? `animation:dv_${r.id} ${r.dur}s step-end infinite` : 'animation:none'].map((x, i) => x + (keep.includes(i) ? '' : imp)).join(';')}}\n`;
    }
    const url = urlOf(r, an ? r.art : r.still || r.art);
    return r.dkind === 'wreath' ? `${sel}{background-image:${url}}\n` : `${sel}{${decl([`background:${url} center/cover no-repeat`, ...(r.dkind === 'plate' ? ['animation:none'] : [])])}}\n`;
  }
  function paintCustom() {
    const recs = [...ownRecs, ...seenRecs], sig = recs.map(r => r.id + r.mode + (r.art || '').length).join();
    if (sig === paintSig) return; paintSig = sig;
    let el = document.getElementById('deco-custom'); if (!el) { el = document.createElement('style'); el.id = 'deco-custom'; document.head.append(el); }
    el.textContent = recs.map(r => cssFor(r, true) + cssFor(r, false)).join('');
  }
  // called from setActive: this account's own decorations join the catalogue
  function loadCustom(acct, ctx) {
    if (!Pk) return; const recs = ctx.apps.cdeco || [], sig = recs.map(r => r.id + (r.art || '').length + (r.mode || '')).join();
    if (sig !== ownSig) { ownSig = sig; ownRecs = recs.map(vet).filter(Boolean); }
    D.setCustom('own', ownRecs); paintCustom();
  }
  // the account list shows nameplates for accounts that are still locked, so the picture of a custom nameplate is kept small on the device
  const CACHE_MAX = 17000, cacheKey = id => 'as.cplate.' + id;
  function cachePlate(acct, plate) {
    try {
      const r = Pk && ownRecs.find(x => x.id === plate && x.dkind === 'plate' && x.mode === 'svg');
      if (r && r.art.length <= CACHE_MAX) localStorage.setItem(cacheKey(acct.id), JSON.stringify({ i: r.id, n: r.name, a: r.art })); else localStorage.removeItem(cacheKey(acct.id));
    } catch { /* not remembered */ }
  }
  function primeAccounts(list) {
    if (!Pk) return; const seen = [];
    for (const a of list || []) {
      if (!a || !Pk.isId(a.plate) || Pk.kindOfId(a.plate) !== 'plate') continue;
      try { const c = JSON.parse(localStorage.getItem(cacheKey(a.id)) || 'null'); const r = c && c.i === a.plate ? vet({ did: c.i, dkind: 'plate', name: c.n, art: c.a, mode: 'svg' }) : null; if (r) seen.push(r); } catch { /* skip */ }
    }
    seenRecs = seen; D.setCustom('own', ownRecs); D.setCustom('seen', seen); paintCustom();
  }
  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const dataUrlOf = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(new Error('read')); r.readAsDataURL(f); });
  const blobOfUri = uri => { const m = /^data:([^;]+);base64,(.*)$/s.exec(uri), bin = atob(m[2]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: m[1] }); };
  const waitFor = (el, ev, ms, msg) => new Promise((ok, no) => { const t = setTimeout(() => no(new Error(msg)), ms); el.addEventListener(ev, () => { clearTimeout(t); ok(); }, { once: true }); el.addEventListener('error', () => { clearTimeout(t); no(new Error(msg)); }, { once: true }); });
  // the first picture of an animated image, as a PNG (shown when "Animate decorations" is off)
  async function firstFrame(uri) {
    const img = new Image(); img.src = uri; await waitFor(img, 'load', 8000, 'That picture would not open.');
    const k = Math.min(1, 960 / img.naturalWidth), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv.toDataURL('image/png');
  }
  // a short video clip -> one PNG holding its frames in a grid, played back by CSS (no video player is needed anywhere in the app)
  async function videoToSprite(uri, kind, say) {
    const K = Pk.KINDS[kind], cell = { plate: [480, 88], banner: [600, 100], wreath: [216, 216] }[kind], url = URL.createObjectURL(blobOfUri(uri));
    try {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      await waitFor(v, 'loadedmetadata', 10000, 'This device cannot play that video.');
      const len = Math.min(6, v.duration && isFinite(v.duration) ? v.duration : 0); if (!(len > 0.2)) throw new Error('The video is too short or its length is unknown.');
      const n = Math.max(4, Math.min(48, Math.round(len * 8))), cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), [fw, fh] = cell;
      const cv = document.createElement('canvas'); cv.width = cols * fw; cv.height = rows * fh; const c = cv.getContext('2d');
      const k = Math.max(fw / v.videoWidth, fh / v.videoHeight), dw = v.videoWidth * k, dh = v.videoHeight * k;
      for (let i = 0; i < n; i++) {
        say && say(`Reading the video… ${i + 1} of ${n}`); const seeked = waitFor(v, 'seeked', 6000, 'The video would not seek.'); v.currentTime = Math.min(len - 0.01, i / n * len); await seeked;
        const x = (i % cols) * fw, y = Math.floor(i / cols) * fh; c.save(); c.beginPath(); c.rect(x, y, fw, fh); c.clip(); c.drawImage(v, x + (fw - dw) / 2, y + (fh - dh) / 2, dw, dh);
        if (kind === 'wreath') { c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(x + fw / 2, y + fh / 2, K.hole.r * fw / K.w, 0, Math.PI * 2); c.fill(); }   // the avatar shows through the middle
        c.restore();
      }
      const art = cv.toDataURL('image/png'); if (art.length > 9e6) throw new Error('That video makes too big a picture. Try a shorter or simpler clip.');
      return { art, cols, rows, frames: n, dur: +(len).toFixed(2), vw: v.videoWidth, vh: v.videoHeight };
    } finally { URL.revokeObjectURL(url); }
  }
  // items from a file -> items ready to keep (videos turned into frames, animated pictures given a still one); anything that fails goes in `skipped`
  async function prepare(items, skipped, say) {
    const out = [];
    for (const it of items) {
      try {
        if (it.mode === 'video') {
          const probe = await videoToSprite(it.src, it.kind || 'plate', null).catch(() => null);
          let kind = it.kind;
          if (!kind) { if (!probe) throw new Error('This device cannot play that video.'); const sh = probe.vw / probe.vh; kind = Object.keys(Pk.KINDS).reduce((b, k) => Math.abs(Math.log(sh / (Pk.KINDS[k].w / Pk.KINDS[k].h))) < Math.abs(Math.log(sh / (Pk.KINDS[b].w / Pk.KINDS[b].h))) ? k : b, 'plate'); }
          const sp = await videoToSprite(it.src, kind, say);
          out.push({ ...it, kind, id: Pk.idOf(kind, it.src.length + it.src.slice(0, 2000) + it.src.slice(-2000)), mode: 'sprite', art: sp.art, cols: sp.cols, rows: sp.rows, frames: sp.frames, dur: sp.dur, still: '' });
        } else if (it.mode === 'image' && it.moves && !it.still) out.push({ ...it, still: await firstFrame(it.art) });
        else out.push(it);
      } catch (e) { skipped.push({ name: it.name, why: e && e.message ? e.message : 'could not be read' }); }
    }
    return out;
  }
  const recOf = (acct, it) => ({ id: newId(), accountId: acct.id, kind: 'cdeco', did: it.id, dkind: it.kind, mode: it.mode, name: it.name, blurb: it.blurb || '', art: it.art, still: it.still || '', moves: !!it.moves, author: it.author || '', license: it.license || '', pack: it.pack || '', ...(it.mode === 'sprite' ? { cols: it.cols, rows: it.rows, frames: it.frames, dur: it.dur, src: it.src } : {}), createdAt: Date.now(), updatedAt: Date.now() });
  // a little picture of an item, for the lists
  function itemPreview(acct, it) {
    const sprite = it.mode === 'sprite', first = sprite ? { 'background-image': 'url("' + it.art + '")', 'background-repeat': 'no-repeat', 'background-size': `${it.cols * 100}% ${it.rows * 100}%`, 'background-position': '0 0' } : null;
    const face = cls => sprite ? h('span', { class: cls, style: Object.entries(first).map(([k, v]) => k + ':' + v).join(';') }) : h('img', { class: cls, src: it.mode === 'svg' ? 'data:image/svg+xml,' + encodeURIComponent(it.art) : it.art, alt: '' });
    if (it.kind === 'wreath') return h('span', { class: 'dcp-wr' }, avatar(acct, 'lg'), face('dcp-over'));
    return face('dcp-' + it.kind);
  }
  const KIND_LABEL = k => (Pk.KINDS[k] || {}).label || k;
  const creditLine = it => [it.author && 'by ' + it.author, it.license, it.pack && 'from ' + it.pack].filter(Boolean).join(' · ');

  function importDecorations(acct, ctx) {
    const inp = h('input', { type: 'file', accept: '.asdeco,.json,.svg,.png,.gif,.webp,.jpg,.jpeg,.mp4,.webm,image/*,video/mp4,video/webm', multiple: true, hidden: true });
    inp.addEventListener('change', async () => {
      const files = [...inp.files]; inp.remove(); if (!files.length) return;
      const close = modal(h('div', {}, h('div', { class: 'mh' }, h('b', {}, 'Reading your files…')), h('div', { class: 'mp' }, h('p', { class: 'fine', id: 'dcp-say' }, 'One moment.'))));
      const say = t => { const e = document.getElementById('dcp-say'); if (e) e.textContent = t; };
      const found = [], skipped = [];
      try {
        for (const f of files) {
          say(f.name); let r;
          try {
            if (f.size > Pk.LIMITS.file) r = { ok: false, error: 'That file is too big.' };
            else if (/\.(asdeco|json|svg)$/i.test(f.name) || /json|svg/.test(f.type)) r = Pk.parseFile(await f.text(), f.name);
            else r = Pk.parseMedia(await dataUrlOf(f), f.name);
          } catch { r = { ok: false, error: 'It could not be read.' }; }
          if (r.ok) { found.push(...r.items.map(i => ({ ...i, pack: r.name || '', author: r.author || '', license: r.license || '' }))); skipped.push(...r.skipped.map(x => ({ name: f.name + ': ' + x.name, why: x.why }))); } else skipped.push({ name: f.name, why: r.error });
        }
        const uniq = new Map(); for (const it of found) if (!uniq.has(it.id)) uniq.set(it.id, it);   // the same decoration in two files is listed once
        const ready = await prepare([...uniq.values()], skipped, say);
        close(); previewImport(acct, ctx, ready, skipped);
      } catch (e) { close(); toast('That could not be read.'); }
    });
    document.body.append(inp); inp.click();
  }
  function previewImport(acct, ctx, items, skipped) {
    if (!items.length) { const x = skipped[0]; toast(x ? x.name + ': ' + x.why : 'Nothing to import.'); return; }
    const have = new Set(ownRecs.map(r => r.id)), picks = new Map(items.map(it => [it.id, !have.has(it.id)]));
    const list = h('div', { class: 'dcp-list' }), msg = h('p', { class: 'fine' });
    const room = () => Pk.LIMITS.library - ownRecs.length;
    const paint = () => {
      list.replaceChildren(...items.map(it => h('label', { class: 'dcp-row' + (have.has(it.id) ? ' dim' : '') },
        h('input', { type: 'checkbox', checked: picks.get(it.id), disabled: have.has(it.id), onchange: e => { picks.set(it.id, e.target.checked); paint(); } }),
        h('span', { class: 'dcp-pv dcp-pv-' + it.kind }, itemPreview(acct, it)),
        h('span', { class: 'dcp-nm' }, h('b', {}, it.name), h('small', {}, KIND_LABEL(it.kind) + (it.mode === 'sprite' ? ' · from video' : it.moves ? ' · moves' : '') + (have.has(it.id) ? ' · already added' : '')), creditLine(it) ? h('small', {}, creditLine(it)) : null))));
      const n = [...picks.values()].filter(Boolean).length; add.disabled = !n; add.textContent = n ? `Add ${n} decoration${n === 1 ? '' : 's'}` : 'Nothing to add';
      msg.textContent = n > room() ? `Your library can hold ${Pk.LIMITS.library}, so only ${Math.max(0, room())} more will fit.` : '';
    };
    const add = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      add.disabled = true; let n = 0;
      for (const it of items) { if (!picks.get(it.id) || n >= room()) continue; if (!(await appSave(acct, recOf(acct, it)))) break; n++; }
      close(); toast(n ? (n === 1 ? 'Decoration added.' : n + ' decorations added.') : 'Nothing was added.'); render(true);
    } }, 'Add');
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add decorations')),
      h('div', { class: 'mp' }, h('p', { class: 'fine' }, 'Choose which to add. Only add decorations you made or have permission to use.'), list,
        skipped.length ? h('div', { class: 'dcp-skip' }, h('b', {}, `${skipped.length} not added`), h('ul', {}, skipped.map(x => h('li', {}, h('b', {}, x.name), ': ' + x.why)))) : null,
        msg, h('div', { class: 'btnrow' }, add, h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Cancel')))));
    paint();
  }
  function manageDecorations(acct, ctx) {
    const recs = (ctx.apps.cdeco || []).map(r => ({ r, v: vet(r) })).filter(x => x.v), list = h('div', { class: 'dcp-list' });
    const paint = () => list.replaceChildren(...recs.map(x => {
      let sure = false; const del = h('button', { class: 'btn', type: 'button', onclick: async () => { if (!sure) { sure = true; del.textContent = 'Really delete?'; return; } await appDelete(x.r.id); recs.splice(recs.indexOf(x), 1); toast('Deleted.'); paint(); render(true); } }, 'Delete');
      return h('div', { class: 'dcp-row' }, h('span', { class: 'dcp-pv dcp-pv-' + x.v.dkind }, itemPreview(acct, x.v)), h('span', { class: 'dcp-nm' }, h('b', {}, x.v.name), h('small', {}, KIND_LABEL(x.v.dkind) + (x.v.moves ? ' · moves' : '')), creditLine(x.v) ? h('small', {}, creditLine(x.v)) : null), del);
    }));
    const exportBtn = h('button', { class: 'btn', type: 'button', onclick: async () => {
      const out = recs.map(x => ({ dkind: x.v.dkind, name: x.v.name, blurb: x.v.blurb, art: x.v.art, mode: x.v.mode, still: x.v.still, src: x.v.src }));
      const res = await saveFile('my-decorations.asdeco', 'application/json', Pk.buildPack({ name: 'My decorations', author: acct.name || '', license: '' }, out));
      toast(res.ok ? 'Saved to ' + res.where + '.' : 'Could not save: ' + res.where);
    } }, 'Export all as a pack');
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'My decorations')),
      h('div', { class: 'mp' }, recs.length ? list : h('p', { class: 'fine' }, 'You have not added any yet.'), h('div', { class: 'btnrow' }, recs.length ? exportBtn : null, h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Done')))));
    paint();
  }

  /* ----- Settings: themes, nameplates, backgrounds and wreaths, filed by collection ----- */
  let view = (() => { try { const v = JSON.parse(localStorage.getItem('as.deco.view') || 'null'); if (v && typeof v === 'object') return { series: String(v.series || 'all'), kind: String(v.kind || 'all') }; } catch { /* default */ } return { series: 'all', kind: 'all' }; })();
  const setView = p => { view = { ...view, ...p }; try { localStorage.setItem('as.deco.view', JSON.stringify(view)); } catch { /* not remembered */ } render(true); };
  function settingsSection(acct, ctx) {
    const cur = mine(ctx), srv = server(ctx), set = async patch => { if (await saveProfile(acct, ctx, patch)) render(true); };
    const byId = list => Object.fromEntries(list.map(x => [x.id, x])), PL = byId(D.PLATES), BG = byId(D.BACKGROUNDS), WR = byId(D.WREATHS);
    const wreathAvatar = id => { const a = avatar(acct, 'lg'); if (id && id !== 'none') a.dataset.wreath = id; else delete a.dataset.wreath; return a; };
    const theme = t => { const lock = !D.isOpen(t.opens); return h('button', { class: 'theme-card' + (lock ? ' locked' : '') + (cur.plate === t.plate && cur.bg === t.bg && cur.wreath === t.wreath ? ' on' : ''), type: 'button', 'aria-disabled': String(lock), onclick: () => (lock ? toast('Unlocks ' + D.opensLabel(t.opens) + '.') : set({ plate: t.plate, bg: t.bg, wreath: t.wreath })) },
      h('span', { class: 'theme-av' }, wreathAvatar(t.wreath)), h('span', {}, h('b', {}, t.name), h('small', {}, lock ? '\u{1F512} Unlocks ' + D.opensLabel(t.opens) : t.blurb))); };
    const plate = p => h('button', { class: 'member plate-pick' + (D.plateOk(p.id) ? ' plated' : '') + (cur.plate === p.id ? ' on' : ''), type: 'button', 'aria-pressed': String(cur.plate === p.id), ...plateAttrs(p.id, cur.animate), onclick: () => set({ plate: p.id }) },
      h('span', { class: 'av-wrap' }, avatar(acct, 'sm'), h('i', { class: 'dot online' })), h('span', { class: 'names' }, h('b', {}, h('span', { class: 'nm' }, acct.name), tagEl(srv)), h('small', {}, p.name + ' · ' + p.blurb)));
    const bgPick = b => h('button', { class: 'bg-pick' + ((cur.bg || 'none') === b.id ? ' on' : ''), type: 'button', 'aria-pressed': String((cur.bg || 'none') === b.id), onclick: () => set({ bg: b.id === 'none' ? '' : b.id }) },
      b.id === 'none' ? h('span', { class: 'bg-prev none' }, 'None') : h('span', { class: 'banner bg-prev', 'data-bg': b.id }, h('span', { class: 'bimg' })), h('b', {}, b.name), h('small', {}, b.blurb));
    const wrPick = w => h('button', { class: 'wr-pick' + ((cur.wreath || 'none') === w.id ? ' on' : ''), type: 'button', 'aria-pressed': String((cur.wreath || 'none') === w.id), onclick: () => set({ wreath: w.id === 'none' ? '' : w.id }) },
      h('span', { class: 'wr-av' }, wreathAvatar(w.id)), h('b', {}, w.name), h('small', {}, w.blurb));
    const KINDS = [['plate', 'Nameplates', 'plate-grid', plate, PL], ['bg', 'Profile backgrounds', 'bg-grid', bgPick, BG], ['wreath', 'Avatar wreaths', 'wr-grid', wrPick, WR]];
    const mineIds = k => ownRecs.filter(r => r.dkind === k).map(r => r.id);
    const mineSeries = ownRecs.length ? { id: 'mine', name: 'My decorations', blurb: 'Brought in from files. Only you have them.', groups: [{ name: '', plate: mineIds('plate'), bg: mineIds('banner'), wreath: mineIds('wreath') }] } : null;
    const allSeries = mineSeries ? [mineSeries, ...D.SERIES] : D.SERIES, vs = view.series === 'mine' && !mineSeries ? 'all' : view.series;
    const want = k => view.kind === 'all' || view.kind === k;
    const chip = (label, on, fn) => h('button', { class: 'fp-chip' + (on ? ' on' : ''), type: 'button', 'aria-pressed': String(on), onclick: fn }, label);
    const wearing = [cur.plate !== 'none' ? 'Nameplate: ' + (PL[cur.plate] || {}).name : '', cur.bg ? 'Background: ' + (BG[cur.bg] || {}).name : '', cur.wreath ? 'Wreath: ' + (WR[cur.wreath] || {}).name : ''].filter(Boolean);
    // one collection: its themes, then its groups, each with the kinds you asked to see
    const seriesBlock = se => {
      const themes = D.THEMES.filter(t => D.seriesOfTheme(t.id) === se.id);
      const kinds = g => KINDS.filter(([k]) => want(k) && (g[k] || []).length).map(([k, label, cls, build, map]) => h('div', { class: 'dc-kind' }, h('h6', {}, label), h('div', { class: cls, role: 'group', 'aria-label': label }, g[k].map(id => build(map[id])))));
      const body = se.groups.map(g => {
        const ks = kinds(g); if (!ks.length) return null;
        const opens = g.opens || se.opens, lock = !D.isOpen(opens), inner = h('div', { class: 'dc-kinds' + (lock ? ' dc-teaser' : '') }, ks);
        if (lock) { inner.inert = true; inner.setAttribute('aria-hidden', 'true'); }      // a teaser: you can see the colours, not use it yet
        return h('div', { class: 'dc-group' + (lock ? ' locked' : '') }, g.name || lock ? h('h5', {}, g.name || '', lock ? h('span', { class: 'dc-unlock' }, '\u{1F512} Unlocks ' + D.opensLabel(opens)) : null) : null, inner);
      }).filter(Boolean);
      if (!body.length && !(view.kind === 'all' && themes.length)) return null;
      return h('section', { class: 'dc-series', 'aria-label': se.name }, h('h4', {}, se.name, h('small', {}, se.blurb), !D.isOpen(se.opens) ? h('span', { class: 'dc-unlock' }, '\u{1F512} Unlocks ' + D.opensLabel(se.opens)) : null), view.kind === 'all' && themes.length ? h('div', { class: 'theme-grid' }, themes.map(theme)) : null, body);
    };
    const shown = allSeries.filter(se => vs === 'all' || vs === se.id).map(seriesBlock).filter(Boolean);
    return h('section', {}, h('h3', {}, 'Profile decorations'),
      h('p', {}, 'Dress up your profile. Nobody else will see any of it, but you will, and so will anyone you show your phone to. Everything is filed by collection and kind, so pick a filter to narrow the list.'),
      (() => { const nx = D.nextOpening(); return nx ? h('p', { class: 'dc-next' }, '\u2728 Next up: ' + nx.name + ' \u00b7 ' + D.opensLabel(nx.opens)) : null; })(),
      h('div', { class: 'dc-wear' }, h('span', {}, wearing.length ? 'Wearing: ' + wearing.join(' · ') : 'Wearing: nothing yet'), wearing.length ? h('button', { class: 'btn', type: 'button', onclick: () => set({ plate: 'none', bg: '', wreath: '' }) }, 'Take it all off') : null),
      h('div', { class: 'dc-filters', role: 'group', 'aria-label': 'Collection' }, chip('All collections', vs === 'all', () => setView({ series: 'all' })), allSeries.map(se => chip(se.name, vs === se.id, () => setView({ series: se.id })))),
      h('div', { class: 'dc-filters', role: 'group', 'aria-label': 'Kind' }, chip('Everything', view.kind === 'all', () => setView({ kind: 'all' })), KINDS.map(([k, label]) => chip(label, view.kind === k, () => setView({ kind: k })))),
      h('div', { class: 'dc-none', role: 'group', 'aria-label': 'Take one off' }, want('plate') ? plate(PL.none) : null, want('bg') ? bgPick(BG.none) : null, want('wreath') ? wrPick(WR.none) : null),
      shown.length ? shown : h('p', { class: 'fine' }, 'Nothing in that collection for that kind.'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: cur.animate, onchange: e => set({ animate: e.target.checked }) }), ' ', h('span', {}, 'Animate decorations', h('small', { class: 'muted', style: 'display:block' }, 'Things move a little. Turned off automatically if your device asks for less motion.'))),
      h('p', { class: 'fine' }, 'Make your own nameplates, banners and avatar decorations in Sudo Make Art (Profile decorations), then add the file here. PNG, GIF and short MP4 clips work too.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => importDecorations(acct, ctx) }, 'Add my own decorations'), ownRecs.length ? h('button', { class: 'btn', type: 'button', onclick: () => manageDecorations(acct, ctx) }, 'My decorations (' + ownRecs.length + ')') : null, h('button', { class: 'btn', type: 'button', onclick: () => serverProfileModal(acct, ctx) }, 'Server tag and banner')));
  }

  /* ----- the server tag and banner ----- */
  function serverProfileModal(acct, ctx) {
    const start = server(ctx); let s = { ...start }, busy = false;
    const preview = h('div', { class: 'srv-prev' }), tagInput = h('input', { value: s.tag, maxlength: 4, placeholder: 'e.g. KOI', 'aria-label': 'Server tag', autocomplete: 'off', spellcheck: 'false' });
    const paint = () => {
      const t = D.tagOk(tagInput.value) ? D.cleanTag(tagInput.value) : '', css = D.bannerCss(s);
      preview.replaceChildren(h('div', { class: 'srv-prev-banner', style: css ? `background:${css}` : '' }, h('b', {}, TemplateCore.serverTitle(acct, ((ctx.apps.srv || [])[0] || {}).name))), h('div', { class: 'srv-prev-me' }, h('b', {}, acct.name, tagEl({ ...s, tag: t })), h('small', {}, t ? 'Wearing the ' + t + ' tag' : 'No tag')));
      swC.forEach((b, i) => b.setAttribute('aria-pressed', String(D.TAG_COLORS[i][0] === s.tagColor))); swG.forEach((b, i) => b.setAttribute('aria-pressed', String(D.TAG_GLYPHS[i][0] === s.tagGlyph))); bn.forEach(b => b.setAttribute('aria-pressed', String((b.dataset.id || '') === (s.bannerImg ? 'img' : s.bannerPreset))));
    };
    const swC = D.TAG_COLORS.map(([c, n]) => h('button', { class: 'ck-swatch', type: 'button', style: `background:${c}`, 'aria-label': n, title: n, onclick: () => { s.tagColor = c; paint(); } }));
    const swG = D.TAG_GLYPHS.map(([g, n]) => h('button', { class: 'btn glyph', type: 'button', 'aria-label': n, title: n, onclick: () => { s.tagGlyph = g; paint(); } }, g || '—'));
    const bn = [{ id: '', name: 'None', css: '' }, ...D.BANNERS].map(b => { const el = h('button', { class: 'bn-pick', type: 'button', 'data-id': b.id, 'aria-label': b.name, title: b.name, style: b.css ? `background:${b.css}` : '', onclick: () => { s.bannerPreset = b.id; s.bannerImg = ''; paint(); } }, b.id ? '' : 'None'); return el; });
    const upload = h('button', { class: 'btn', type: 'button', onclick: async () => { const d = await chooseImage(960, 540); if (d) { s.bannerImg = d; s.bannerPreset = ''; paint(); } } }, 'Use my own picture');
    tagInput.addEventListener('input', () => { tagInput.value = D.cleanTag(tagInput.value); paint(); });
    const save = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      if (busy) return; if (tagInput.value && !D.tagOk(tagInput.value)) { toast('A tag is 2 to 4 letters or numbers.'); return; }
      busy = true; const ok = await saveServer(acct, ctx, { tag: D.tagOk(tagInput.value) ? D.cleanTag(tagInput.value) : '', tagColor: s.tagColor, tagGlyph: s.tagGlyph, bannerPreset: s.bannerPreset, bannerImg: s.bannerImg }); busy = false;
      if (ok) { close(); toast('Saved.'); render(true); } } }, 'Save');
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Server tag and banner')),
      h('div', { class: 'mp' }, preview,
        h('label', { class: 'field' }, h('span', {}, 'Server tag (2 to 4 letters or numbers)'), tagInput),
        h('div', { class: 'deco-row', role: 'group', 'aria-label': 'Tag colour' }, swC), h('div', { class: 'deco-row', role: 'group', 'aria-label': 'Tag symbol' }, swG),
        h('h4', {}, 'Banner'), h('div', { class: 'deco-row bn-row', role: 'group', 'aria-label': 'Banner' }, bn), h('div', { class: 'btnrow' }, upload),
        h('p', { class: 'fine' }, 'Your profile wears the tag next to your name, and the banner sits at the top of the channel list. Nobody else can see them.'),
        h('div', { class: 'btnrow' }, save, h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Cancel')))));
    paint();
  }
  return { setActive, primeAccounts, wreathOf, mine, server, tagEl, plateAttrs, plated, settingsSection, serverProfileModal, clearName, saveServer };
})();
if (typeof module !== 'undefined') module.exports = Deco;

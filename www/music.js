'use strict';
/* Music Player: your own music, offline. Add files (or a whole folder) and they are kept inside the app on this device. Playlists, a queue,
   lyrics from .lrc files, a ten-band equalizer with bass, stereo and reverb, moving visualizers, a sleep timer, and a look you can change. */
const MC = MusicCore;
const MP = { acct: null, tracks: [], covers: {}, prefs: null, audio: null, queue: [], order: [], pos: -1, shuffle: false, repeat: 'off', cur: null, url: '', lyrics: null, sleep: null, saveT: 0, libT: 0, listeners: new Set(), seq: 0 };
const mpDefaults = () => ({ playlists: [], fav: [], plays: {}, recent: [], theme: { accent: '#fdc82f', bg: 'art', bgImage: '', blur: 18, dim: 45, art: 'disc', outline: true, viz: 'ring', scale: 1, tiles: ['tracks', 'albums', 'artists', 'folders', 'genres'] }, fx: { eqOn: true, gains: new Array(10).fill(0), bass: 0, virt: 0, reverb: 'none', preset: 'Normal', custom: {} }, vol: 1, last: null });
/* ----- where the music is kept: audio files and lyrics in their own small database ----- */
const mdb = (() => { let p = null; const open = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('anti-social-music', 1); r.onupgradeneeded = () => { r.result.createObjectStore('f'); r.result.createObjectStore('l'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (s, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(s, mode), q = fn(t.objectStore(s)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return { get: (s, k) => tx(s, 'readonly', o => o.get(k)), put: (s, k, v) => tx(s, 'readwrite', o => o.put(v, k)), del: (s, k) => tx(s, 'readwrite', o => o.delete(k)), keys: s => tx(s, 'readonly', o => o.getAllKeys()), clear: s => tx(s, 'readwrite', o => o.clear()) }; })();
const mpKey = id => MP.acct.id + ':' + id;
const mpTrack = id => MP.tracks.find(t => t.id === id);
const mpEmit = () => MP.listeners.forEach(f => { try { f(); } catch { /* a view went away */ } });
function mpSavePrefsSoon() { clearTimeout(MP.saveT); MP.saveT = setTimeout(() => { const a = MP.acct; if (a) appSave(a, { id: 'mprefs' + a.id, accountId: a.id, kind: 'mprefs', createdAt: Date.now(), ...MP.prefs }); }, 600); }
function mpSaveLibSoon() { clearTimeout(MP.libT); MP.libT = setTimeout(() => { const a = MP.acct; if (a) appSave(a, { id: 'mlib' + a.id, accountId: a.id, kind: 'mlib', createdAt: Date.now(), tracks: MP.tracks, covers: MP.covers }); }, 800); }
function mpLoad(acct, ctx) {
  if (MP.acct && MP.acct.id === acct.id) { MP.acct = acct; return; }
  if (MP.audio) { MP.audio.pause(); }
  Object.assign(MP, { acct, queue: [], order: [], pos: -1, cur: null, lyrics: null }); const lib = (ctx.apps.mlib || [])[0] || {}, pr = (ctx.apps.mprefs || [])[0] || {};
  MP.tracks = lib.tracks || []; MP.covers = lib.covers || []; if (Array.isArray(MP.covers)) MP.covers = {};
  const d = mpDefaults(); MP.prefs = { ...d, ...pr, theme: { ...d.theme, ...(pr.theme || {}) }, fx: { ...d.fx, ...(pr.fx || {}) } }; delete MP.prefs.id; delete MP.prefs.accountId; delete MP.prefs.kind; delete MP.prefs.createdAt; delete MP.prefs.updatedAt;
  if (!MP.audio) { MP.audio = new Audio(); MP.audio.preload = 'auto'; MP.audio.addEventListener('ended', () => mpEnded()); MP.audio.addEventListener('play', mpEmit); MP.audio.addEventListener('pause', mpEmit); MP.audio.addEventListener('error', () => { if (MP.cur) { toast('That file could not be played.'); } }); MP.audio.addEventListener('timeupdate', () => { if (MP.audio.currentTime - (MP.lastSave || 0) > 5 || MP.audio.currentTime < (MP.lastSave || 0)) { MP.lastSave = MP.audio.currentTime; if (MP.cur) { MP.prefs.last = { queue: MP.queue, pos: MP.pos, id: MP.cur.id, t: MP.audio.currentTime }; mpSavePrefsSoon(); } } }); }
  MP.audio.volume = MP.prefs.vol; MusicFx.set({ eqOn: MP.prefs.fx.eqOn, gains: MP.prefs.fx.gains.slice(), bass: MP.prefs.fx.bass, virt: MP.prefs.fx.virt, reverb: MP.prefs.fx.reverb });
  // pick up where you left off, paused
  const L = MP.prefs.last; if (L && L.queue && L.queue.every(id => mpTrack(id)) && L.queue.length) { MP.queue = L.queue; MP.pos = L.pos; MP.order = MP.queue.map((_, i) => i); mpLoadTrack(mpTrack(L.id), false, L.t); }
}
/* ----- playing ----- */
async function mpLoadTrack(t, play, at = 0) {
  if (!t) return; const my = ++MP.seq; MP.cur = t; MP.lyrics = null; mpEmit();
  const blob = await mdb.get('f', mpKey(t.id)); if (my !== MP.seq) return; if (!blob) { toast(`"${t.title}" is missing from this device. Remove it and add it again.`); return; }
  if (MP.url) URL.revokeObjectURL(MP.url); MP.url = URL.createObjectURL(blob); MP.audio.src = MP.url; if (at) MP.audio.currentTime = at;
  const lr = await mdb.get('l', mpKey(t.id)); if (my === MP.seq) { MP.lyrics = lr ? { text: lr, lines: MC.parseLrc(lr) } : null; mpEmit(); }
  if (play) { MusicFx.start(MP.audio); try { await MP.audio.play(); } catch (e) { /* needs a tap first */ } const s = MP.prefs.plays[t.id] || { n: 0, last: 0 }; MP.prefs.plays[t.id] = { n: s.n + 1, last: Date.now() }; MP.prefs.recent = [t.id, ...MP.prefs.recent.filter(x => x !== t.id)].slice(0, 60); mpSavePrefsSoon(); }
  mpMedia(); mpEmit();
}
function mpPlayList(ids, startId, shuffle) {
  MP.queue = ids.slice(); if (shuffle !== undefined) MP.shuffle = shuffle; const i = Math.max(0, startId ? MP.queue.indexOf(startId) : 0);
  MP.order = MP.shuffle ? MC.shuffleOrder(MP.queue.length, i) : MP.queue.map((_, k) => k); MP.pos = MP.shuffle ? 0 : i; mpLoadTrack(mpTrack(MP.queue[MP.order[MP.pos]]), true);
}
const mpCurIdx = () => (MP.pos >= 0 ? MP.order[MP.pos] : -1);
function mpStep(dir, auto) {
  if (!MP.queue.length) return; if (auto && MP.repeat === 'one') { MP.audio.currentTime = 0; MP.audio.play(); return; }
  let p = MP.pos + dir; if (p >= MP.order.length) { if (MP.repeat === 'all' || !auto) p = 0; else { MP.audio.pause(); MP.audio.currentTime = 0; mpEmit(); return; } } if (p < 0) p = MP.order.length - 1;
  MP.pos = p; mpLoadTrack(mpTrack(MP.queue[MP.order[p]]), true);
}
function mpEnded() { if (MP.sleep && MP.sleep.end) { MP.sleep = null; MP.audio.pause(); toast('Sleep timer: stopped after this song.'); mpEmit(); return; } mpStep(1, true); }
const mpToggle = () => { if (!MP.cur) return; MusicFx.start(MP.audio); MP.audio.paused ? MP.audio.play().catch(() => {}) : MP.audio.pause(); };
function mpCycleRepeat() { MP.repeat = { off: 'all', all: 'one', one: 'off' }[MP.repeat]; mpEmit(); }
function mpToggleShuffle() { MP.shuffle = !MP.shuffle; const cur = mpCurIdx(); MP.order = MP.shuffle ? MC.shuffleOrder(MP.queue.length, cur) : MP.queue.map((_, i) => i); MP.pos = MP.shuffle ? 0 : Math.max(0, cur); mpEmit(); }
function mpEnqueue(ids, next) { if (!MP.queue.length) { mpPlayList(ids); return; } const cur = mpCurIdx(); if (next) { MP.queue.splice(cur + 1, 0, ...ids); } else MP.queue.push(...ids); MP.order = MP.shuffle ? MC.shuffleOrder(MP.queue.length, cur >= 0 ? cur : 0) : MP.queue.map((_, i) => i); MP.pos = MP.shuffle ? 0 : Math.max(0, cur); toast(next ? 'Playing next.' : 'Added to the queue.'); mpEmit(); }
function mpSetSleep(min) {
  clearTimeout(MP.sleepT); clearInterval(MP.sleepI); if (!min) { MP.sleep = null; mpEmit(); return; }
  if (min === 'end') { MP.sleep = { end: true }; mpEmit(); return; }
  MP.sleep = { at: Date.now() + min * 60000 }; MP.sleepT = setTimeout(() => { const a = MP.audio, v0 = a.volume; let k = 0; const fade = setInterval(() => { k++; a.volume = Math.max(0, v0 * (1 - k / 20)); if (k >= 20) { clearInterval(fade); a.pause(); a.volume = v0; MP.sleep = null; mpEmit(); } }, 100); }, min * 60000); mpEmit();
}
function mpMedia() {
  try { const t = MP.cur; if (!t || !navigator.mediaSession) return; const cover = t.cover && MP.covers[t.cover]; navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: cover ? [{ src: cover, sizes: '300x300', type: 'image/jpeg' }] : [] });
    const ms = navigator.mediaSession; ms.setActionHandler('play', mpToggle); ms.setActionHandler('pause', mpToggle); ms.setActionHandler('nexttrack', () => mpStep(1)); ms.setActionHandler('previoustrack', () => mpStep(-1)); ms.setActionHandler('seekto', e => { MP.audio.currentTime = e.seekTime; }); } catch { /* not supported */ }
}
/* ----- adding music ----- */
const MP_AUDIO = /\.(mp3|m4a|m4b|aac|flac|ogg|oga|opus|wav|weba|webm|mp4)$/i;
async function mpThumb(bytes, mime) {
  try { const bmp = await createImageBitmap(new Blob([bytes], { type: mime })), s = 300 / Math.max(bmp.width, bmp.height), c = document.createElement('canvas'); c.width = Math.round(bmp.width * Math.min(1, s)); c.height = Math.round(bmp.height * Math.min(1, s)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.82); } catch { return ''; }
}
const mpDuration = blob => new Promise(res => { const a = new Audio(), u = URL.createObjectURL(blob), done = d => { URL.revokeObjectURL(u); a.removeAttribute('src'); res(isFinite(d) ? d : 0); }; a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); setTimeout(() => done(0), 5000); a.src = u; });
async function mpImport(files, onProgress) {
  const list = [...files], audio = list.filter(f => MP_AUDIO.test(f.name)), lrcs = list.filter(f => /\.(lrc|txt)$/i.test(f.name)); let added = 0, skipped = 0, done = 0;
  const have = new Set(MP.tracks.map(t => t.id));
  for (const f of audio) {
    onProgress && onProgress(done, audio.length, f.name); const id = MC.trackId(f); done++;
    if (have.has(id)) { skipped++; continue; }
    try {
      const head = new Uint8Array(await f.slice(0, /\.(m4a|mp4|m4b)$/i.test(f.name) && f.size < 40e6 ? f.size : Math.min(f.size, 4e6)).arrayBuffer()), folder = (f.webkitRelativePath || '').split('/').slice(-2, -1)[0] || '';
      const tg = MC.readTags(head, f.name, folder), dur = await mpDuration(f); let cover = '';
      if (tg.cover) { const ck = MC.key(tg.album) + '|' + MC.key(tg.artist); if (!MP.covers[ck]) { const th = await mpThumb(tg.cover.bytes, tg.cover.mime); if (th) MP.covers[ck] = th; } if (MP.covers[ck]) cover = ck; }
      else { const ck = MC.key(tg.album) + '|' + MC.key(tg.artist); if (MP.covers[ck]) cover = ck; }
      await mdb.put('f', mpKey(id), f); if (tg.lyrics) await mdb.put('l', mpKey(id), tg.lyrics);
      MP.tracks.push({ id, title: tg.title, artist: tg.artist, album: tg.album, albumArtist: tg.albumArtist, track: tg.track, year: tg.year, genre: tg.genre, folder: folder || 'Music', dur, size: f.size, added: Date.now(), cover }); have.add(id); added++;
    } catch (e) { console.warn('could not add', f.name, e); }
  }
  // lyrics files that sit beside songs (same name)
  for (const l of lrcs) { const base = l.name.replace(/\.[^.]+$/, '').toLowerCase(); const t = MP.tracks.find(x => { const f = audio.find(a => MC.trackId(a) === x.id); return f && f.name.replace(/\.[^.]+$/, '').toLowerCase() === base; }) || MP.tracks.find(x => (x.artist + ' - ' + x.title).toLowerCase() === base || x.title.toLowerCase() === base); if (t) { await mdb.put('l', mpKey(t.id), await l.text()); if (MP.cur && MP.cur.id === t.id) MP.lyrics = { text: await l.text(), lines: MC.parseLrc(await l.text()) }; } }
  mpSaveLibSoon(); mpEmit(); return { added, skipped, total: audio.length };
}
async function mpRemove(ids) { for (const id of ids) { await mdb.del('f', mpKey(id)); await mdb.del('l', mpKey(id)); delete MP.prefs.plays[id]; } const s = new Set(ids); MP.tracks = MP.tracks.filter(t => !s.has(t.id)); MP.prefs.fav = MP.prefs.fav.filter(x => !s.has(x)); MP.prefs.recent = MP.prefs.recent.filter(x => !s.has(x)); MP.prefs.playlists.forEach(p => { p.ids = p.ids.filter(x => !s.has(x)); }); if (MP.cur && s.has(MP.cur.id)) { MP.audio.pause(); MP.cur = null; MP.queue = []; MP.order = []; MP.pos = -1; } mpSaveLibSoon(); mpSavePrefsSoon(); mpEmit(); }

/* ===================== the pages ===================== */
const mpCoverUrl = t => (t && t.cover && MP.covers[t.cover]) || '';
function musicView(acct, ctx, back) {
  mpLoad(acct, ctx); const P = MP.prefs, T = P.theme;
  const root = h('div', { class: 'mp' }), bg = h('div', { class: 'mp-bg' }), page = h('div', { class: 'mp-page' }), mini = h('div', { class: 'mp-miniwrap' }); root.append(bg, page, mini);
  let stack = [{ v: 'home' }], raf = 0;
  const cur = () => stack[stack.length - 1], go = v => { stack.push(v); paint(); }, pop = () => { if (stack.length > 1) stack.pop(); paint(); };
  const applyTheme = () => { root.style.setProperty('--mp-accent', T.accent); root.style.setProperty('--mp-scale', String(T.scale)); root.classList.toggle('outline', !!T.outline);
    const art = mpCoverUrl(MP.cur); let img = ''; if (T.bg === 'art' && art) img = art; else if (T.bg === 'image' && T.bgImage) img = T.bgImage; bg.style.backgroundImage = img ? `url("${img}")` : ''; bg.style.filter = img ? `blur(${T.blur}px) brightness(${1 - T.dim / 100})` : ''; bg.classList.toggle('on', !!img); root.classList.toggle('has-bg', !!img); };
  const icoBtn = (name, label, fn, cls = '') => h('button', { class: 'mp-ico ' + cls, type: 'button', 'aria-label': label, title: label, onclick: fn }, icon(name));
  const thumb = t => { const u = mpCoverUrl(t); return h('div', { class: 'mp-thumb' }, u ? h('img', { src: u, alt: '' }) : icon('music')); };
  const total = ids => ids.reduce((s, id) => s + ((mpTrack(id) || {}).dur || 0), 0);

  /* a track's menu */
  function trackMenu(t, listIds, onChange) {
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, t.title)), h('div', { class: 'mp-menu' },
      [['Play next', () => mpEnqueue([t.id], true)], ['Add to queue', () => mpEnqueue([t.id], false)], [P.fav.includes(t.id) ? 'Remove from favorites' : 'Add to favorites', () => { toggleFav(t.id); }], ['Add to a playlist…', () => addToPlaylist([t.id])], ['Edit info…', () => editInfo(t)], ['Add lyrics…', () => lyricsDialog(t)],
        ['Remove from the library', async () => { if (confirm(`Remove "${t.title}" from this app? The original file is not touched.`)) { await mpRemove([t.id]); onChange && onChange(); paint(); } }]].map(([n, fn]) => h('button', { type: 'button', onclick: () => { close(); fn(); } }, n)))));
  }
  const toggleFav = id => { P.fav = P.fav.includes(id) ? P.fav.filter(x => x !== id) : [id, ...P.fav]; mpSavePrefsSoon(); mpEmit(); };
  function addToPlaylist(ids) {
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add to a playlist')), h('div', { class: 'mp-menu' }, P.playlists.map(p => h('button', { type: 'button', onclick: () => { p.ids = [...new Set([...p.ids, ...ids])]; mpSavePrefsSoon(); close(); toast(`Added to ${p.name}.`); } }, p.name)), h('button', { type: 'button', onclick: () => { close(); newPlaylist(ids); } }, '+ New playlist'))));
  }
  function newPlaylist(ids = []) {
    const name = h('input', { placeholder: 'Playlist name', 'aria-label': 'Playlist name', maxlength: 60 }); const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'New playlist')), h('div', { class: 'mp-pad' }, name, h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => { const n = name.value.trim(); if (!n) return; P.playlists.push({ id: uid(), name: n, ids: [...ids] }); mpSavePrefsSoon(); close(); paint(); } }, 'Create'))))); setTimeout(() => name.focus(), 30);
  }
  function editInfo(t) {
    const f = (l, k, type = 'text') => h('input', { 'aria-label': l, placeholder: l, value: t[k] || '', type }), ti = f('Title', 'title'), ar = f('Artist', 'artist'), al = f('Album', 'album'), ge = f('Genre', 'genre'), tr = f('Track number', 'track', 'number');
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Edit info')), h('div', { class: 'mp-pad' }, ti, ar, al, ge, tr, h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => { t.title = ti.value.trim() || t.title; t.artist = ar.value.trim() || 'Unknown artist'; t.album = al.value.trim() || 'Unknown album'; t.genre = ge.value.trim() || 'Unknown genre'; t.track = Number(tr.value) || 0; mpSaveLibSoon(); close(); mpEmit(); paint(); } }, 'Save')))));
  }
  function lyricsDialog(t) {
    const file = h('input', { type: 'file', accept: '.lrc,.txt,text/plain', hidden: true, onchange: async e => { const f = e.target.files[0]; if (!f) return; await mdb.put('l', mpKey(t.id), await f.text()); if (MP.cur && MP.cur.id === t.id) MP.lyrics = { text: await f.text(), lines: MC.parseLrc(await f.text()) }; close(); toast('Lyrics added.'); mpEmit(); } });
    const ta = h('textarea', { rows: 8, placeholder: 'Paste lyrics here (plain text, or with [mm:ss.xx] time stamps)', 'aria-label': 'Lyrics' });
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Lyrics for ' + t.title)), h('div', { class: 'mp-pad' }, h('button', { class: 'btn', onclick: () => file.click() }, 'Choose a .lrc or .txt file'), file, ta, h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: async () => { const s = ta.value.trim(); if (!s) return; await mdb.put('l', mpKey(t.id), s); if (MP.cur && MP.cur.id === t.id) MP.lyrics = { text: s, lines: MC.parseLrc(s) }; close(); mpEmit(); } }, 'Save pasted lyrics'), (MP.lyrics && MP.cur && MP.cur.id === t.id) ? h('button', { class: 'btn danger', onclick: async () => { await mdb.del('l', mpKey(t.id)); MP.lyrics = null; close(); mpEmit(); } }, 'Remove lyrics') : null))));
  }

  /* a list of songs */
  function trackList(ids, { title, sub, ctxName } = {}) {
    const q = h('input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search', oninput: () => draw() }), list = h('div', { class: 'mp-tracks' });
    const draw = () => { const tr = MC.searchTracks(ids.map(mpTrack).filter(Boolean), q.value); list.replaceChildren(...(tr.length ? tr.map(t => h('div', { class: 'mp-row' + (MP.cur && MP.cur.id === t.id ? ' now' : ''), role: 'button', tabindex: '0', onclick: () => mpPlayList(tr.map(x => x.id), t.id), onkeydown: e => { if (e.key === 'Enter') mpPlayList(tr.map(x => x.id), t.id); } }, thumb(t), h('div', { class: 'mp-row-t' }, h('b', {}, t.title), h('small', {}, `${t.artist} · ${t.album}`)), h('span', { class: 'mp-dur' }, MC.fmt(t.dur)), h('button', { class: 'mp-ico', type: 'button', 'aria-label': 'More for ' + t.title, onclick: e => { e.stopPropagation(); trackMenu(t, ids, draw); } }, icon('more')))) : [h('p', { class: 'mp-empty' }, ids.length ? 'Nothing matches.' : 'Nothing here yet.')])); };
    draw(); return h('div', {}, h('div', { class: 'mp-actions' }, h('button', { class: 'btn primary', disabled: !ids.length, onclick: () => mpPlayList(ids, null, false) }, 'Play'), h('button', { class: 'btn', disabled: !ids.length, onclick: () => mpPlayList(ids, null, true) }, 'Shuffle'), h('button', { class: 'btn', disabled: !ids.length, onclick: () => mpEnqueue(ids, false) }, 'Add to queue'), sub ? h('small', { class: 'mp-sub' }, sub) : null), q, list);
  }
  const header = (title, extra) => h('div', { class: 'mp-top' }, icoBtn('back', 'Back', pop), h('h2', {}, title), h('div', { class: 'mp-top-r' }, extra));
  const sorted = by => MC.group(MP.tracks, by);

  function home() {
    const counts = { tracks: MP.tracks.length, albums: sorted('albums').length, artists: sorted('artists').length, folders: sorted('folders').length, genres: sorted('genres').length };
    const tile = (id, label, ico) => h('button', { class: 'mp-tile', type: 'button', onclick: () => go({ v: 'list', by: id, label }) }, icon(ico), h('b', {}, label.toUpperCase()), h('small', {}, `(${counts[id]})`));
    const defs = { tracks: ['Tracks', 'music'], albums: ['Albums', 'disc'], artists: ['Artists', 'user'], folders: ['Folders', 'folder'], genres: ['Genres', 'tag'] };
    const smart = [['fav', 'My favorite', 'heart', P.fav.filter(mpTrack)], ['recentAdd', 'Recent add', 'clock', MP.tracks.slice().sort((a, b) => b.added - a.added).slice(0, 100).map(t => t.id)], ['recentPlay', 'Recent play', 'clock', P.recent.filter(mpTrack)], ['mostPlay', 'Most play', 'music', Object.entries(P.plays).filter(([id]) => mpTrack(id)).sort((a, b) => b[1].n - a[1].n).slice(0, 50).map(x => x[0])]];
    const row = (name, n, ico, fn, menu) => h('div', { class: 'mp-pl', role: 'button', tabindex: '0', onclick: fn, onkeydown: e => { if (e.key === 'Enter') fn(); } }, h('div', { class: 'mp-pl-i' }, icon(ico)), h('div', { class: 'mp-row-t' }, h('b', {}, name), h('small', {}, `${n} ${n === 1 ? 'track' : 'tracks'}`)), menu || null);
    return h('div', {},
      h('div', { class: 'mp-head' }, h('h2', {}, 'Music Player'), h('div', {}, icoBtn('search', 'Search all songs', () => go({ v: 'list', by: 'tracks', label: 'Tracks', focus: true })), icoBtn('plus', 'Add music', addMusic), icoBtn('menu', 'Look and settings', () => go({ v: 'settings' })))),
      MP.tracks.length ? null : h('div', { class: 'mp-welcome' }, h('b', {}, 'Your music goes here'), h('p', {}, 'Add songs from your device (or a whole folder). They are kept inside Anti-Social, play offline, and never leave your device.'), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: addMusic }, 'Add music'))),
      h('div', { class: 'mp-tiles' }, T.tiles.filter(k => defs[k]).map(k => tile(k, defs[k][0], defs[k][1]))),
      h('div', { class: 'mp-sec' }, h('b', {}, `Playlists (${smart.length + P.playlists.length})`), icoBtn('plus', 'New playlist', () => newPlaylist())),
      smart.map(([id, name, ico, ids]) => row(name, ids.length, ico, () => go({ v: 'playlist', id, name, ids }))),
      P.playlists.map(p => row(p.name, p.ids.filter(mpTrack).length, 'queue', () => go({ v: 'playlist', id: p.id, name: p.name, ids: p.ids.filter(mpTrack), custom: p }), icoBtn('more', 'Playlist options', e => { e.stopPropagation(); playlistMenu(p); }))),
      MP.tracks.length ? h('button', { class: 'mp-fab', type: 'button', 'aria-label': 'Shuffle all', onclick: () => mpPlayList(MP.tracks.map(t => t.id), null, true) }, icon('shuffle')) : null);
  }
  function playlistMenu(p) {
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, p.name)), h('div', { class: 'mp-menu' }, h('button', { type: 'button', onclick: () => { close(); const n = prompt('Rename the playlist', p.name); if (n && n.trim()) { p.name = n.trim().slice(0, 60); mpSavePrefsSoon(); paint(); } } }, 'Rename'), h('button', { type: 'button', onclick: () => { close(); if (confirm(`Delete the playlist "${p.name}"? The songs stay in your library.`)) { P.playlists = P.playlists.filter(x => x !== p); mpSavePrefsSoon(); paint(); } } }, 'Delete'))));
  }
  function addMusic() {
    const files = h('input', { type: 'file', multiple: true, accept: 'audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac,.lrc,.txt', hidden: true }), folder = h('input', { type: 'file', multiple: true, hidden: true }); folder.setAttribute('webkitdirectory', ''); folder.setAttribute('directory', '');
    const status = h('p', { class: 'fine', role: 'status' }, ''), bar = h('div', { class: 'lg-bar big' }, h('i', { style: 'width:0%' }));
    const run = async list => { if (!list.length) return; files.disabled = folder.disabled = true; bar.firstChild.style.width = '2%'; const r = await mpImport(list, (d, n, name) => { bar.firstChild.style.width = Math.round(d / Math.max(1, n) * 100) + '%'; status.textContent = `Adding ${d + 1} of ${n}: ${name}`; }); bar.firstChild.style.width = '100%'; status.textContent = `${r.added} added${r.skipped ? `, ${r.skipped} already here` : ''}${r.total - r.added - r.skipped ? `, ${r.total - r.added - r.skipped} could not be read` : ''}.`; files.disabled = folder.disabled = false; paint(); };
    files.addEventListener('change', e => run(e.target.files)); folder.addEventListener('change', e => run(e.target.files));
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add music')), h('div', { class: 'mp-pad' }, h('p', { class: 'muted' }, 'Pick songs, or a whole folder. A .lrc file with the same name as a song gives it lyrics. Songs are copied into this app on this device only.'), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => files.click() }, 'Choose songs'), h('button', { class: 'btn', onclick: () => folder.click() }, 'Choose a folder')), files, folder, bar, status)));
  }

  function list(by, label, focus) {
    if (by === 'tracks') { const el = trackList(MP.tracks.slice().sort(MC.byTitle).map(t => t.id)); if (focus) setTimeout(() => el.querySelector('input')?.focus(), 30); return h('div', {}, header(`${label} (${MP.tracks.length})`), el); }
    const groups = sorted(by);
    return h('div', {}, header(`${label} (${groups.length})`), groups.length ? h('div', { class: by === 'albums' ? 'mp-grid' : 'mp-groups' }, groups.map(g => by === 'albums'
      ? h('button', { class: 'mp-album', type: 'button', onclick: () => go({ v: 'group', g, by }) }, h('div', { class: 'mp-cover' }, g.cover && MP.covers[g.cover] ? h('img', { src: MP.covers[g.cover], alt: '' }) : icon('disc')), h('b', {}, g.name), h('small', {}, g.sub))
      : h('button', { class: 'mp-pl', type: 'button', onclick: () => go({ v: 'group', g, by }) }, h('div', { class: 'mp-pl-i' }, g.cover && MP.covers[g.cover] ? h('img', { src: MP.covers[g.cover], alt: '' }) : icon(by === 'artists' ? 'user' : by === 'folders' ? 'folder' : 'tag')), h('div', { class: 'mp-row-t' }, h('b', {}, g.name), h('small', {}, `${g.tracks.length} ${g.tracks.length === 1 ? 'track' : 'tracks'}`))))) : h('p', { class: 'mp-empty' }, 'Nothing here yet. Add some music first.'));
  }
  function group(g) { return h('div', {}, header(g.name), trackList(g.tracks.map(t => t.id), { sub: `${g.tracks.length} tracks · ${MC.fmt(total(g.tracks.map(t => t.id)))}` })); }
  function playlist(v) {
    const p = v.custom; const ids = p ? p.ids.filter(mpTrack) : v.ids; const el = trackList(ids);
    return h('div', {}, header(v.name, p ? icoBtn('more', 'Playlist options', () => playlistMenu(p)) : null), el, p ? h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { const have = new Set(p.ids), pick = MP.tracks.filter(t => !have.has(t.id)); addMany(p, pick); } }, 'Add songs…')) : null);
  }
  function addMany(p, pool) {
    const sel = new Set(), q = h('input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search songs' }), list = h('div', { class: 'mp-tracks pick' });
    const draw = () => list.replaceChildren(...MC.searchTracks(pool.slice().sort(MC.byTitle), q.value).slice(0, 200).map(t => h('label', { class: 'mp-row' }, h('input', { type: 'checkbox', checked: sel.has(t.id), onchange: e => { e.target.checked ? sel.add(t.id) : sel.delete(t.id); } }), h('div', { class: 'mp-row-t' }, h('b', {}, t.title), h('small', {}, t.artist)))));
    q.addEventListener('input', draw); draw(); const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add songs to ' + p.name)), h('div', { class: 'mp-pad' }, q, list, h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => { p.ids = [...p.ids, ...sel]; mpSavePrefsSoon(); close(); paint(); } }, 'Add selected')))));
  }

  /* ----- now playing ----- */
  function now() {
    const t = MP.cur; if (!t) { pop(); return h('div', {}); }
    const canvas = h('canvas', { class: 'mp-canvas', role: 'img', 'aria-label': 'Album art' }), lyr = h('div', { class: 'mp-lyrics' }), stage = h('div', { class: 'mp-stage' }, canvas); let showLyrics = !!stack[stack.length - 1].lyrics, vizOn = !!stack[stack.length - 1].viz;
    const seek = h('input', { class: 'mp-seek', type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Seek', oninput: e => { if (isFinite(MP.audio.duration)) MP.audio.currentTime = e.target.value / 1000 * MP.audio.duration; } }), tcur = h('span', {}, '00:00'), tend = h('span', {}, MC.fmt(t.dur));
    const heart = icoBtn('heart', 'Favorite', () => { toggleFav(t.id); heart.classList.toggle('on', P.fav.includes(t.id)); }, P.fav.includes(t.id) ? 'on' : '');
    const playBtn = h('button', { class: 'mp-play', type: 'button', 'aria-label': 'Play or pause', onclick: mpToggle }), repBtn = icoBtn('repeat', 'Repeat', mpCycleRepeat), shufBtn = icoBtn('shuffle', 'Shuffle', mpToggleShuffle);
    const sync = () => { playBtn.replaceChildren(icon(MP.audio.paused ? 'play' : 'pause')); repBtn.replaceChildren(icon(MP.repeat === 'one' ? 'repeat1' : 'repeat')); repBtn.classList.toggle('on', MP.repeat !== 'off'); shufBtn.classList.toggle('on', MP.shuffle); };
    const sleepBtn = icoBtn('timer', 'Sleep timer', sleepDialog, MP.sleep ? 'on' : '');
    const paintLyrics = () => { lyr.replaceChildren(); const L = MP.lyrics; if (!L) { lyr.append(h('div', { class: 'mp-nolyr' }, icon('lyrics'), h('b', {}, 'No lyrics yet'), h('button', { class: 'btn', onclick: () => lyricsDialog(t) }, 'Add lyrics'))); return; } if (MC.isSynced(L.lines)) L.lines.forEach((ln, i) => lyr.append(h('p', { 'data-i': String(i), onclick: () => { MP.audio.currentTime = ln.t; } }, ln.text || '♪'))); else L.text.split(/\r?\n/).forEach(s => lyr.append(h('p', { class: 'plain' }, s || ' '))); };
    const setMode = () => { stage.replaceChildren(showLyrics ? lyr : canvas); if (showLyrics) paintLyrics(); lyrBtn.classList.toggle('on', showLyrics); vizBtn.classList.toggle('on', vizOn); stack[stack.length - 1].lyrics = showLyrics; stack[stack.length - 1].viz = vizOn; };
    const lyrBtn = icoBtn('lyrics', 'Lyrics', () => { showLyrics = !showLyrics; setMode(); }), vizBtn = icoBtn('wave', 'Visualizer', () => { vizOn = !vizOn; setMode(); });
    const unsub = () => { MP.listeners.delete(onChange); }; const onChange = () => { if (!root.isConnected || cur().v !== 'now') return unsub(); if (MP.cur !== t) { paint(); return; } sync(); if (showLyrics) paintLyrics(); sleepBtn.classList.toggle('on', !!MP.sleep); }; MP.listeners.add(onChange); sync();
    let lastLine = -2; const img = new Image(); const art = mpCoverUrl(t); if (art) img.src = art; let spin = 0, last = performance.now();
    const frame = now => {
      if (!canvas.isConnected && !lyr.isConnected) { if (!root.isConnected) return; } if (!root.isConnected || cur().v !== 'now') return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now; const pl = !MP.audio.paused;
      const au = MP.audio, d = au.duration || t.dur || 0; if (document.activeElement !== seek && d) seek.value = String(au.currentTime / d * 1000); tcur.textContent = MC.fmt(au.currentTime); if (d && tend.textContent !== MC.fmt(d)) tend.textContent = MC.fmt(d);
      if (showLyrics && MP.lyrics && MC.isSynced(MP.lyrics.lines)) { const i = MC.lrcAt(MP.lyrics.lines, au.currentTime); if (i !== lastLine) { lastLine = i; lyr.querySelectorAll('p.cur').forEach(p => p.classList.remove('cur')); const p = lyr.querySelector(`p[data-i="${i}"]`); if (p) { p.classList.add('cur'); lyr.scrollTo({ top: p.offsetTop - lyr.clientHeight / 2 + p.clientHeight / 2, behavior: 'smooth' }); } } }
      if (!showLyrics) { const dpr = Math.min(2, devicePixelRatio || 1), w = Math.max(1, canvas.clientWidth), hh = Math.max(1, canvas.clientHeight); if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr); } const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hh);
        const r = Math.min(w, hh) * (vizOn && T.viz === 'bars' ? 0.26 : 0.36), cx = w / 2, cy = vizOn && (T.viz === 'bars' || T.viz === 'waves') ? hh * 0.34 : hh * 0.45, st = MusicFx.sample(32, pl); st.wave = MusicFx.wave(pl);
        if (pl) spin += dt * 0.35; const sc = 1 + st.bass * 0.05;
        if (T.viz) MusicFx.draw(T.viz, g, w, hh, cx, cy, r * sc, T.accent, st, now / 1000);
        g.save(); g.translate(cx, cy); if (T.art === 'disc') { g.rotate(spin); g.beginPath(); g.arc(0, 0, r * 0.96 * sc, 0, 6.283); g.clip(); } else { g.beginPath(); const s = r * 1.6 * sc; g.roundRect ? g.roundRect(-s / 2, -s / 2, s, s, 18) : g.rect(-s / 2, -s / 2, s, s); g.clip(); }
        if (art && img.complete && img.naturalWidth) { const s = r * 2 * sc, ar = img.naturalWidth / img.naturalHeight; g.drawImage(img, -s / 2 * Math.max(1, ar), -s / 2 * Math.max(1, 1 / ar), s * Math.max(1, ar), s * Math.max(1, 1 / ar)); } else { const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#3a3f4d'); gr.addColorStop(1, '#14161c'); g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `${r * 0.8}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', 0, 0); }
        g.restore(); if (T.art === 'disc') { g.strokeStyle = T.accent; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r * 1.02 * sc, 0, 6.283); g.stroke(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(cx, cy, r * 0.07, 0, 6.283); g.fill(); } }
      raf = requestAnimationFrame(frame); };
    stage.addEventListener('click', e => { if (e.target === canvas) { showLyrics = true; setMode(); } });
    lyr.addEventListener('dblclick', () => { showLyrics = false; setMode(); });
    setMode(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    return h('div', { class: 'mp-now' },
      h('div', { class: 'mp-top' }, icoBtn('back', 'Back', pop), h('div', { class: 'mp-nowtitle' }, h('b', {}, t.title), h('small', {}, t.artist)), h('div', { class: 'mp-top-r' }, vizBtn, icoBtn('queue', 'Playing queue', () => go({ v: 'queue' })))),
      stage,
      h('div', { class: 'mp-nowrow' }, heart, lyrBtn, h('span', { class: 'sp' }), sleepBtn, icoBtn('more', 'More', () => trackMenu(t, [t.id]))),
      h('div', { class: 'mp-seekrow' }, seek, h('div', { class: 'mp-times' }, tcur, tend)),
      h('div', { class: 'mp-transport' }, repBtn, icoBtn('prev', 'Previous', () => { if (MP.audio.currentTime > 4) MP.audio.currentTime = 0; else mpStep(-1); }, 'big'), playBtn, icoBtn('next', 'Next', () => mpStep(1), 'big'), icoBtn('sliders', 'Sound effects', () => go({ v: 'fx' }))));
  }
  function sleepDialog() {
    const opts = [[15, '15 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '1 hour'], [90, '90 minutes'], ['end', 'At the end of this song']];
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Sleep timer')), h('div', { class: 'mp-menu' }, MP.sleep ? h('p', { class: 'fine', style: 'padding:0 14px' }, MP.sleep.end ? 'Stopping at the end of this song.' : `Music stops in about ${Math.max(1, Math.round((MP.sleep.at - Date.now()) / 60000))} minutes.`) : null, opts.map(([m, n]) => h('button', { type: 'button', onclick: () => { close(); mpSetSleep(m); toast('Sleep timer set.'); } }, n)), MP.sleep ? h('button', { type: 'button', onclick: () => { close(); mpSetSleep(0); toast('Sleep timer cancelled.'); } }, 'Cancel the timer') : null)));
  }
  /* ----- the queue ----- */
  function queue() {
    const list = h('div', { class: 'mp-tracks q' }); const cur = mpCurIdx();
    const draw = () => { const c = mpCurIdx(); const upNext = MP.order.slice(MP.pos + 1); list.replaceChildren(...MP.order.map((qi, p) => { const t = mpTrack(MP.queue[qi]); if (!t) return null; return h('div', { class: 'mp-row' + (p === MP.pos ? ' now' : ''), 'data-p': String(p), onclick: () => { MP.pos = p; mpLoadTrack(t, true); draw(); } },
      h('span', { class: 'mp-grip', 'aria-label': 'Drag to reorder', title: 'Drag to reorder', 'data-grip': '1' }, '⋮⋮'), h('div', { class: 'mp-row-t' }, h('b', {}, t.title), h('small', {}, t.artist)), p === MP.pos ? h('span', { class: 'mp-eq' }, h('i'), h('i'), h('i')) : null, icoBtn('heart', 'Favorite', e => { e.stopPropagation(); toggleFav(t.id); e.currentTarget.classList.toggle('on', P.fav.includes(t.id)); }, P.fav.includes(t.id) ? 'on' : ''), icoBtn('x', 'Remove from the queue', e => { e.stopPropagation(); removeAt(p); })); }).filter(Boolean)); void cur; void upNext; };
    const removeAt = p => { const qi = MP.order[p]; MP.queue.splice(qi, 1); MP.order = MP.order.filter((_, i) => i !== p).map(x => (x > qi ? x - 1 : x)); if (p < MP.pos) MP.pos--; else if (p === MP.pos) { if (!MP.queue.length) { MP.audio.pause(); MP.cur = null; MP.pos = -1; pop(); return; } MP.pos = Math.min(MP.pos, MP.order.length - 1); mpLoadTrack(mpTrack(MP.queue[MP.order[MP.pos]]), !MP.audio.paused); } draw(); };
    // drag a row by its handle to a new place
    list.addEventListener('pointerdown', e => { const grip = e.target.closest('[data-grip]'); if (!grip) return; e.preventDefault(); const row = grip.closest('.mp-row'), from = Number(row.dataset.p); row.classList.add('drag'); const move = ev => { const rows = [...list.children]; const y = ev.clientY; let to = rows.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; }); if (to < 0) to = rows.length - 1; rows.forEach(r => r.classList.remove('over')); rows[to] && rows[to].classList.add('over'); row._to = to; }; const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); const to = row._to; if (to !== undefined && to !== from) { const cu = MP.order[MP.pos]; MP.order = MC.moveItem(MP.order, from, to); MP.pos = MP.order.indexOf(cu); } draw(); }; document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); });
    draw(); const n = MP.order.length;
    return h('div', {}, h('div', { class: 'mp-top' }, icoBtn('back', 'Back', pop), h('div', { class: 'mp-top-r' }, icoBtn(MP.repeat === 'one' ? 'repeat1' : 'repeat', 'Repeat', e => { mpCycleRepeat(); paint(); }, MP.repeat !== 'off' ? 'on' : ''), icoBtn('shuffle', 'Shuffle', () => { mpToggleShuffle(); paint(); }, MP.shuffle ? 'on' : ''), icoBtn('trash', 'Clear the queue', () => { if (!confirm('Clear the queue?')) return; MP.audio.pause(); MP.queue = []; MP.order = []; MP.pos = -1; MP.cur = null; pop(); mpEmit(); }))),
      h('h2', { class: 'mp-qtitle' }, 'Playing queue'), h('p', { class: 'mp-sub' }, `Track ${MP.pos + 1} of ${n} · ${MC.fmt(total(MP.queue))}`), list);
  }
  /* ----- sound effects ----- */
  function fx() {
    const F = P.fx, pushFx = () => { MusicFx.set({ eqOn: F.eqOn, gains: F.gains.slice(), bass: F.bass, virt: F.virt, reverb: F.reverb }); mpSavePrefsSoon(); };
    const presets = () => ({ ...MC.PRESETS, ...F.custom }); const preset = h('select', { 'aria-label': 'Equalizer preset', onchange: e => { F.preset = e.target.value; F.gains = presets()[F.preset].slice(); pushFx(); paint(); } }, Object.keys(presets()).map(n => h('option', { value: n }, n))); preset.value = presets()[F.preset] ? F.preset : 'Normal';
    const sliders = h('div', { class: 'mp-eq10' }, MC.BANDS.map((b, i) => { const lab = h('output', {}, String(F.gains[i])); const r = h('input', { type: 'range', min: -12, max: 12, step: 0.5, value: String(F.gains[i]), 'aria-label': MC.BAND_LABELS[i] + ' hertz', oninput: e => { F.gains[i] = Number(e.target.value); lab.textContent = String(F.gains[i]); F.preset = 'Custom'; if (!presets().Custom) preset.value = ''; pushFx(); } }); return h('div', { class: 'mp-band' }, lab, r, h('small', {}, MC.BAND_LABELS[i])); }));
    const eqOn = h('label', { class: 'mp-switch' }, h('input', { type: 'checkbox', checked: F.eqOn, 'aria-label': 'Equalizer on', onchange: e => { F.eqOn = e.target.checked; pushFx(); } }), h('i'));
    const knob = (label, key) => { let v = F[key]; const out = h('output', {}, Math.round(v * 100)), k = h('div', { class: 'mp-knob', role: 'slider', tabindex: '0', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(v * 100)) }, h('i')); const set = nv => { v = Math.max(0, Math.min(1, nv)); F[key] = v; k.style.setProperty('--a', (-135 + v * 270) + 'deg'); k.setAttribute('aria-valuenow', String(Math.round(v * 100))); out.textContent = String(Math.round(v * 100)); pushFx(); }; k.style.setProperty('--a', (-135 + v * 270) + 'deg');
      let y0 = 0, v0 = 0; k.addEventListener('pointerdown', e => { e.preventDefault(); k.setPointerCapture(e.pointerId); y0 = e.clientY; v0 = v; }); k.addEventListener('pointermove', e => { if (!k.hasPointerCapture(e.pointerId)) return; set(v0 + (y0 - e.clientY) / 140); }); k.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); set(v + 0.05); } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); set(v - 0.05); } });
      return h('div', { class: 'mp-knobbox' }, k, h('b', {}, label), out); };
    const rev = h('select', { 'aria-label': 'Reverb', onchange: e => { F.reverb = e.target.value; pushFx(); } }, MC.REVERBS.map(([id, n]) => h('option', { value: id }, n))); rev.value = F.reverb;
    const vol = h('input', { type: 'range', min: 0, max: 100, value: String(Math.round(P.vol * 100)), 'aria-label': 'Volume', oninput: e => { P.vol = e.target.value / 100; MP.audio.volume = P.vol; mpSavePrefsSoon(); } });
    return h('div', { class: 'mp-fx' }, h('div', { class: 'mp-top' }, icoBtn('back', 'Back', pop), h('h2', {}, 'Sound effect'), h('div', { class: 'mp-top-r' }, icoBtn('disc', 'Choose a visualizer', () => go({ v: 'viz' })))),
      h('div', { class: 'mp-eqhead' }, h('b', {}, 'EQUALIZER'), eqOn), h('div', { class: 'mp-eqrow' }, preset, icoBtn('trash', 'Delete this preset', () => { if (!F.custom[F.preset]) { toast('Only presets you saved can be deleted.'); return; } delete F.custom[F.preset]; F.preset = 'Normal'; F.gains = MC.PRESETS.Normal.slice(); pushFx(); paint(); }), icoBtn('plus', 'Save as a preset', () => { const n = prompt('Name this preset'); if (!n || !n.trim()) return; F.custom[n.trim().slice(0, 30)] = F.gains.slice(); F.preset = n.trim().slice(0, 30); mpSavePrefsSoon(); paint(); })), sliders,
      h('label', { class: 'mp-line' }, h('b', {}, 'Reverb'), rev), h('div', { class: 'mp-knobs' }, knob('Bass', 'bass'), knob('Virtualizer', 'virt')), h('div', { class: 'mp-line' }, h('b', {}, 'VOLUME'), vol),
      h('p', { class: 'fine' }, MusicFx.ready ? '' : 'The effects switch on when a song starts playing.'));
  }
  /* ----- visualizer gallery ----- */
  function viz() {
    const strip = h('div', { class: 'mp-vizstrip' }), cvs = []; const mk = ([id, name]) => { const c = h('canvas', { width: 300, height: 420 }); cvs.push([c, id]); return h('div', { class: 'mp-vizcard' + (T.viz === id ? ' on' : '') }, h('b', {}, name), c, h('button', { class: 'btn primary', type: 'button', onclick: () => { T.viz = id; mpSavePrefsSoon(); strip.querySelectorAll('.mp-vizcard').forEach(x => x.classList.remove('on')); c.closest('.mp-vizcard').classList.add('on'); toast(name + ' is on.'); } }, T.viz === id ? 'In use' : 'Apply')); };
    MusicFx.VIZ.forEach(v => strip.append(mk(v))); strip.append(h('div', { class: 'mp-vizcard' }, h('b', {}, 'None'), h('div', { class: 'mp-vizempty' }), h('button', { class: 'btn', type: 'button', onclick: () => { T.viz = ''; mpSavePrefsSoon(); toast('Visualizer off.'); } }, 'Turn off')));
    const img = new Image(); const art = mpCoverUrl(MP.cur); if (art) img.src = art; let tick = 0;
    const frame = now => { if (!root.isConnected || cur().v !== 'viz') return; const pl = !MP.audio.paused, st = MusicFx.sample(32, pl); st.wave = MusicFx.wave(pl);
      for (const [c, id] of cvs) { const r = c.getBoundingClientRect(); if (r.right < 0 || r.left > innerWidth) continue; const g = c.getContext('2d'), w = c.width, hh = c.height; g.clearRect(0, 0, w, hh); const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(30,32,42,.9)'); gr.addColorStop(1, 'rgba(10,11,16,.95)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
        const R = 70, cx = w / 2, cy = hh * 0.4; MusicFx.draw(id, g, w, hh, cx, cy, R, T.accent, st, now / 1000); g.save(); g.beginPath(); g.arc(cx, cy, R * 0.96, 0, 6.283); g.clip(); if (art && img.complete && img.naturalWidth) g.drawImage(img, cx - R, cy - R, R * 2, R * 2); else { g.fillStyle = '#2a2d38'; g.fillRect(cx - R, cy - R, R * 2, R * 2); } g.restore(); g.strokeStyle = T.accent; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R * 1.0, 0, 6.283); g.stroke(); } tick++; requestAnimationFrame(frame); };
    requestAnimationFrame(frame); void tick;
    return h('div', {}, h('div', { class: 'mp-top' }, icoBtn('back', 'Back', pop), h('h2', {}, 'Visualizer')), h('p', { class: 'mp-sub' }, 'Swipe to look through them. They move with whatever is playing.'), strip);
  }
  /* ----- looks ----- */
  function settings() {
    const swatches = ['#fdc82f', '#ff6b6b', '#ff8fd1', '#8b5cf6', '#38bdf8', '#34d399', '#f97316', '#e5e7eb'];
    const set = (k, v, redraw) => { T[k] = v; mpSavePrefsSoon(); applyTheme(); if (redraw) paint(); };
    const range = (label, key, min, max, step = 1) => { const out = h('output', {}, String(T[key])); return h('label', { class: 'mx-range' }, h('span', {}, label), h('input', { type: 'range', min, max, step, value: String(T[key]), 'aria-label': label, oninput: e => { set(key, Number(e.target.value)); out.textContent = e.target.value; } }), out); };
    const sel = (label, key, opts) => { const s = h('select', { 'aria-label': label, onchange: e => set(key, e.target.value, true) }, opts.map(([v, n]) => h('option', { value: v }, n))); s.value = T[key]; return h('label', { class: 'field' }, h('span', {}, label), s); };
    const pic = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async e => { const f = e.target.files[0]; if (!f) return; try { const bmp = await createImageBitmap(f), s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); T.bgImage = c.toDataURL('image/jpeg', 0.82); T.bg = 'image'; mpSavePrefsSoon(); applyTheme(); paint(); } catch { toast('That picture could not be used.'); } } });
    const tileOpts = [['tracks', 'Tracks'], ['albums', 'Albums'], ['artists', 'Artists'], ['folders', 'Folders'], ['genres', 'Genres']];
    const bytes = MP.tracks.reduce((s, t) => s + (t.size || 0), 0);
    return h('div', {}, h('div', { class: 'mp-top' }, icoBtn('back', 'Back', pop), h('h2', {}, 'Look and settings')),
      h('div', { class: 'mp-pad' }, h('h3', { class: 'lg-h2' }, 'Colour'), h('div', { class: 'ck-themes', role: 'radiogroup', 'aria-label': 'Accent colour' }, swatches.map(c => h('button', { class: 'ck-swatch' + (T.accent === c ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(T.accent === c), 'aria-label': c, style: `background:${c}`, onclick: () => set('accent', c, true) })), h('input', { type: 'color', value: T.accent, 'aria-label': 'Pick any colour', oninput: e => set('accent', e.target.value) })),
        h('h3', { class: 'lg-h2' }, 'Background'), sel('Background', 'bg', [['none', 'Plain'], ['art', 'The album art, blurred'], ['image', 'My own picture']]), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => pic.click() }, T.bgImage ? 'Change my picture' : 'Choose a picture'), T.bgImage ? h('button', { class: 'btn', onclick: () => { T.bgImage = ''; if (T.bg === 'image') T.bg = 'none'; mpSavePrefsSoon(); applyTheme(); paint(); } }, 'Remove it') : null), pic, range('Blur', 'blur', 0, 40), range('Darken', 'dim', 0, 80, 5),
        h('h3', { class: 'lg-h2' }, 'Now playing'), sel('Album art', 'art', [['disc', 'A spinning disc'], ['square', 'A square']]), h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: T.outline, onchange: e => set('outline', e.target.checked) }), ' Outline the text so it stays readable on busy pictures'), range('Text size', 'scale', 0.85, 1.4, 0.05), h('button', { class: 'btn', onclick: () => go({ v: 'viz' }) }, 'Choose a visualizer…'),
        h('h3', { class: 'lg-h2' }, 'Home screen'), h('div', { class: 'btnrow' }, tileOpts.map(([k, n]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: T.tiles.includes(k), onchange: e => { T.tiles = tileOpts.map(x => x[0]).filter(x => (x === k ? e.target.checked : T.tiles.includes(x))); mpSavePrefsSoon(); } }), ' ' + n))),
        h('h3', { class: 'lg-h2' }, 'Library'), h('p', { class: 'fine' }, `${MP.tracks.length} songs, ${(bytes / 1048576).toFixed(0)} MB kept in this app on this device.`), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: addMusic }, 'Add music'), h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Remove every song from this app? Your original files are not touched.')) return; await mpRemove(MP.tracks.map(t => t.id)); toast('Library cleared.'); paint(); } }, 'Remove everything'))));
  }

  /* ----- the small player along the bottom ----- */
  function miniBar() {
    mini.replaceChildren(); if (!MP.cur || cur().v === 'now' || cur().v === 'fx' || cur().v === 'viz') return; const t = MP.cur;
    const prog = h('i', { style: 'width:0%' }), play = h('button', { class: 'mp-ico', type: 'button', 'aria-label': 'Play or pause', onclick: e => { e.stopPropagation(); mpToggle(); } });
    const upd = () => play.replaceChildren(icon(MP.audio.paused ? 'play' : 'pause')); upd();
    const bar = h('div', { class: 'mp-mini', role: 'button', tabindex: '0', 'aria-label': 'Open the player', onclick: () => go({ v: 'now' }), onkeydown: e => { if (e.key === 'Enter') go({ v: 'now' }); } }, h('div', { class: 'mp-prog' }, prog), thumb(t), h('div', { class: 'mp-row-t' }, h('b', {}, t.title), h('small', {}, 'Swipe to change the song')), play, icoBtn('next', 'Next', e => { e.stopPropagation(); mpStep(1); }), icoBtn('queue', 'Playing queue', e => { e.stopPropagation(); go({ v: 'queue' }); }));
    let x0 = null; bar.addEventListener('pointerdown', e => { x0 = e.clientX; }); bar.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) { e.preventDefault(); bar.dataset.swiped = '1'; mpStep(dx < 0 ? 1 : -1); } }); bar.addEventListener('click', e => { if (bar.dataset.swiped) { e.stopImmediatePropagation(); delete bar.dataset.swiped; } }, true);
    const tick = () => { if (!bar.isConnected) return; const d = MP.audio.duration || t.dur || 0; prog.style.width = d ? (MP.audio.currentTime / d * 100) + '%' : '0%'; requestAnimationFrame(tick); }; requestAnimationFrame(tick); mini.append(bar);
    const onChange = () => { if (!bar.isConnected) { MP.listeners.delete(onChange); return; } upd(); if (MP.cur !== t) miniBar(); }; MP.listeners.add(onChange);
  }
  function paint() {
    cancelAnimationFrame(raf); const v = cur(); applyTheme(); let el;
    switch (v.v) { case 'list': el = list(v.by, v.label, v.focus); break; case 'group': el = group(v.g); break; case 'playlist': el = playlist(v); break; case 'now': el = now(); break; case 'queue': el = queue(); break; case 'fx': el = fx(); break; case 'viz': el = viz(); break; case 'settings': el = settings(); break; default: el = home(); }
    page.replaceChildren(el); miniBar(); root.dataset.view = v.v;
  }
  // when something changes under the lists (a song was added or removed elsewhere), keep the page in step
  let shownCur = MP.cur; const themeSync = () => { if (!root.isConnected) { MP.listeners.delete(themeSync); return; } applyTheme(); if (MP.cur !== shownCur) { shownCur = MP.cur; if (cur().v !== 'now') miniBar(); } }; MP.listeners.add(themeSync);
  paint();
  return [back(appName(acct, 'music')), root];
}

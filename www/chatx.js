'use strict';
/* Custom emoji, stickers and a soundboard for the Chat Rooms look. You upload your own pictures and sounds (they stay on this device),
   use emoji by typing :name: or from the picker beside the message box, send stickers and sounds as messages, and play sounds from the soundboard. */
const Chatx = (() => {
  const C = ChatxCore;
  let lists = { emoji: [], stickers: [], sounds: [] }, maps = { emoji: new Map(), stickers: new Map(), sounds: new Map() }, urls = new Map(), playing = null;
  const setLists = l => { lists = { emoji: l.emoji.slice(), stickers: l.stickers.slice(), sounds: l.sounds.slice() }; maps = { emoji: new Map(lists.emoji.map(e => [e.name, e])), stickers: new Map(lists.stickers.map(e => [e.id, e])), sounds: new Map(lists.sounds.map(e => [e.id, e])) }; };
  const setActive = ctx => setLists({ emoji: ctx.apps.cemoji || [], stickers: ctx.apps.csticker || [], sounds: ctx.apps.csound || [] });
  const on = () => tplId() === 'chat';

  /* ----- showing them in messages ----- */
  const emojiImg = (rec, cls = 'cemoji') => h('img', { class: cls, src: rec.img, alt: ':' + rec.name + ':', title: ':' + rec.name + ':', draggable: 'false' });
  // richText calls this for each piece of a message; it returns an element for a known :name: and null otherwise
  const token = part => { if (!on()) return null; const m = /^:([A-Za-z0-9_]{2,32}):$/.exec(part); const rec = m && maps.emoji.get(m[1].toLowerCase()); return rec ? emojiImg(rec) : null; };
  const hasEmoji = name => maps.emoji.has(name);
  function blobUrl(rec) {
    if (urls.has(rec.id)) return urls.get(rec.id);
    try { const [head, b64] = String(rec.audio).split(','); const type = (/data:([^;]+)/.exec(head) || [])[1] || 'audio/mpeg', bin = atob(b64), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); const u = URL.createObjectURL(new Blob([bytes], { type })); urls.set(rec.id, u); return u; } catch { return ''; }
  }
  function play(rec, btn) {
    try { if (playing) { playing.pause(); playing.el && playing.el.classList.remove('playing'); } } catch { /* fine */ }
    const u = blobUrl(rec); if (!u) { toast('That sound could not be played.'); return; }
    const a = new Audio(u); a.volume = C.volume(rec.volume); a.el = btn || null; playing = a; if (btn) btn.classList.add('playing');
    a.addEventListener('ended', () => btn && btn.classList.remove('playing')); a.play().catch(() => { btn && btn.classList.remove('playing'); toast('Tap again to play (the browser wants a tap first).'); });
  }
  // sticker and sound messages
  function extras(p) {
    if (!on() || !(p.sticker || p.sound)) return null;
    if (p.sticker) { const s = maps.stickers.get(p.sticker); return s ? h('img', { class: 'cx-sticker', src: s.img, alt: 'Sticker: ' + s.name, title: s.name }) : h('i', { class: 'muted' }, '(that sticker was removed)'); }
    const snd = maps.sounds.get(p.sound); if (!snd) return h('i', { class: 'muted' }, '(that sound was removed)');
    const b = h('button', { class: 'cx-sound', type: 'button', 'aria-label': 'Play ' + snd.name, onclick: () => play(snd, b) }, h('span', { class: 'cx-play' }, icon('play')), snd.emoji ? h('span', { class: 'cx-semo' }, snd.emoji) : null, h('b', {}, snd.name)); return b;
  }

  /* ----- sending ----- */
  async function send(acct, patch, channel, parentId) {
    try { await savePost(acct, { id: uid(), accountId: acct.id, text: '', images: [], createdAt: Date.now(), parentId: parentId || null, liked: false, reposted: false, ...(channel && channel !== 'general' ? { channel } : {}), ...patch }); render(true); } catch (e) { console.error(e); toast('That could not be saved.'); }
  }

  /* ----- the picker beside the message box ----- */
  const STANDARD = ['\u{1F600}', '\u{1F602}', '\u{1F970}', '\u{1F60E}', '\u{1F914}', '\u{1F62D}', '\u{1F621}', '\u{1F44D}', '\u{1F44E}', '\u{1F44F}', '❤️', '\u{1F494}', '\u{1F525}', '✨', '\u{1F389}', '\u{1F480}', '\u{1F440}', '\u{1F64F}', '\u{1F4AF}', '☕', '\u{1F355}', '\u{1F431}', '\u{1F436}', '\u{1F338}'];
  function composerTools(acct, ctx, { ta, channel, parentId }) {
    if (!on()) return [];
    const btn = h('button', { class: 'tool', type: 'button', 'aria-label': 'Emoji, stickers and sounds', title: 'Emoji, stickers and sounds', onclick: () => open() }, h('span', { class: 'cx-face' }, '\u{1F642}'));
    function open() {
      document.querySelector('.cx-picker')?.remove(); let tab = 'emoji';
      const insert = text => { const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? s; ta.setRangeText(text, s, e, 'end'); ta.dispatchEvent(new Event('input')); ta.focus(); };
      const body = h('div', { class: 'cx-body' }), tabs = h('div', { class: 'cx-tabs', role: 'tablist' });
      const close = () => { pop.remove(); document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc, true); };
      const outside = e => { if (!pop.contains(e.target) && !btn.contains(e.target)) close(); }, esc = e => { if (e.key === 'Escape') close(); };
      const empty = (what, tabId) => h('div', { class: 'cx-none' }, h('p', {}, `No ${what} yet.`), h('button', { class: 'btn', type: 'button', onclick: () => { close(); manage(acct, ctx, tabId); } }, 'Upload some'));
      const paint = () => {
        tabs.replaceChildren(...[['emoji', 'Emoji'], ['stickers', 'Stickers'], ['sounds', 'Sounds']].map(([id, label]) => h('button', { class: 'cx-tab' + (tab === id ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; paint(); } }, label)));
        if (tab === 'emoji') body.replaceChildren(lists.emoji.length ? h('div', {}, h('h5', {}, 'Your emoji'), h('div', { class: 'cx-grid' }, lists.emoji.map(e => h('button', { class: 'cx-cell', type: 'button', title: ':' + e.name + ':', 'aria-label': e.name, onclick: () => insert(':' + e.name + ': ') }, emojiImg(e, 'cx-eimg'))))) : null, h('h5', {}, 'Standard'), h('div', { class: 'cx-grid std' }, STANDARD.map(e => h('button', { class: 'cx-cell', type: 'button', 'aria-label': e, onclick: () => insert(e) }, e))), lists.emoji.length ? null : empty('custom emoji', 'emoji'));
        else if (tab === 'stickers') body.replaceChildren(lists.stickers.length ? h('div', { class: 'cx-grid st' }, lists.stickers.map(s => h('button', { class: 'cx-cell st', type: 'button', title: s.name, 'aria-label': 'Send sticker ' + s.name, onclick: async () => { close(); await send(acct, { sticker: s.id }, channel, parentId); } }, h('img', { src: s.img, alt: s.name }), h('small', {}, s.name)))) : empty('stickers', 'stickers'));
        else body.replaceChildren(lists.sounds.length ? h('div', { class: 'cx-sounds' }, lists.sounds.map(s => { const row = h('div', { class: 'cx-srow' }, h('button', { class: 'cx-splay', type: 'button', 'aria-label': 'Play ' + s.name, onclick: () => play(s, row) }, icon('play')), h('span', { class: 'cx-sname' }, s.emoji ? s.emoji + ' ' : '', s.name), h('button', { class: 'btn', type: 'button', title: 'Send it as a message', onclick: async () => { close(); await send(acct, { sound: s.id }, channel, parentId); } }, 'Send')); return row; })) : empty('sounds', 'sounds'));
      };
      const pop = h('div', { class: 'cx-picker popover', role: 'dialog', 'aria-label': 'Emoji, stickers and sounds' }, tabs, body, h('div', { class: 'cx-foot' }, h('button', { class: 'btn', type: 'button', onclick: () => { close(); manage(acct, ctx, tab); } }, 'Manage')));
      document.body.append(pop); paint();
      const r = btn.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(r.left - 120, innerWidth - pop.offsetWidth - 8)) + 'px'; pop.style.top = Math.max(8, r.top - pop.offsetHeight - 8) + 'px';
      document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', esc, true);
    }
    return [btn];
  }

  /* ----- uploading and managing ----- */
  const readData = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  // a small picture with its transparency kept; animated GIFs that are small enough stay as they are
  function toImage(file, max, keepGif) {
    return new Promise(async (res, rej) => {
      if (keepGif && file.type === 'image/gif' && file.size <= C.MAX_EMOJI_BYTES) { try { return res(await readData(file)); } catch (e) { return rej(e); } }
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/png')); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); }; img.src = url;
    });
  }
  function probeSound(file) {
    return new Promise(res => { const u = URL.createObjectURL(file), a = new Audio(); const done = d => { URL.revokeObjectURL(u); res(d); }; a.addEventListener('loadedmetadata', () => done(a.duration)); a.addEventListener('error', () => done(NaN)); setTimeout(() => done(NaN), 4000); a.src = u; });
  }
  function manage(acct, ctx, start = 'emoji') {
    let tab = start; const L = { emoji: lists.emoji.slice(), stickers: lists.stickers.slice(), sounds: lists.sounds.slice() };
    const sync = () => setLists(L);
    const body = h('div', { class: 'cx-manage' }), tabs = h('div', { class: 'cx-tabs big', role: 'tablist' }), msg = h('p', { class: 'err', role: 'alert' });
    const rec = (kind, data) => ({ id: uid(), accountId: acct.id, kind, createdAt: Date.now(), ...data });
    const save = async r => { if (await appSave(acct, r)) return true; return false; };
    const removeIt = async (listKey, r) => { await appDelete(r.id); L[listKey] = L[listKey].filter(x => x.id !== r.id); sync(); paint(); };
    async function addEmoji(files) {
      msg.textContent = ''; let added = 0, skipped = 0;
      for (const f of files) {
        if (L.emoji.length >= C.MAX_EMOJI) { msg.textContent = `That is the limit: ${C.MAX_EMOJI} emoji.`; break; }
        if (!/^image\//.test(f.type)) { skipped++; continue; }
        const base = C.cleanName(f.name) || 'emoji'; const name = C.uniqueName(base, L.emoji.map(e => e.name));
        try { const img = await toImage(f, 128, true), r = rec('cemoji', { name, img }); if (await save(r)) { L.emoji.push(r); added++; } } catch { skipped++; }
      }
      sync(); paint(); if (added) toast(added === 1 ? 'Emoji added.' : added + ' emoji added.'); if (skipped) toast(skipped + ' file' + (skipped === 1 ? '' : 's') + ' skipped (not a picture).');
    }
    const pickFiles = (accept, multiple, fn) => { const i = h('input', { type: 'file', accept, multiple, hidden: true }); i.addEventListener('change', () => { const fs = [...i.files]; i.remove(); if (fs.length) fn(fs); }); document.body.append(i); i.click(); };
    const rename = (listKey, r, input) => async () => { const others = L[listKey].filter(x => x.id !== r.id).map(x => x.name); const e = C.nameError(input.value, others); if (e) { msg.textContent = e; input.value = r.name; return; } const n = C.cleanName(input.value); if (n === r.name) return; msg.textContent = ''; const upd = { ...r, name: n, updatedAt: Date.now() }; if (await save(upd)) { L[listKey] = L[listKey].map(x => (x.id === r.id ? upd : x)); sync(); paint(); } };
    function emojiTab() {
      const zone = h('div', { class: 'cx-drop' }, h('b', {}, `${L.emoji.length} of ${C.MAX_EMOJI} emoji`), h('p', { class: 'fine' }, `Add up to ${C.MAX_EMOJI} custom emoji of your own. Use one by typing :name: in a message, or from the emoji button beside the message box.`),
        h('button', { class: 'btn primary', type: 'button', onclick: () => pickFiles('image/*', true, addEmoji) }, 'Upload Emoji'), h('p', { class: 'fine' }, 'To add several at once, drag and drop pictures onto this page. Each emoji is named from its file name.'));
      ['dragenter', 'dragover'].forEach(ev => body.addEventListener(ev, e => { if (tab !== 'emoji') return; e.preventDefault(); body.classList.add('drag'); })); body.addEventListener('dragleave', () => body.classList.remove('drag'));
      return [zone, L.emoji.length ? h('div', { class: 'cx-list' }, L.emoji.map(r => { const input = h('input', { value: r.name, maxlength: C.MAX_NAME, 'aria-label': 'Emoji name' }); const go = rename('emoji', r, input); input.addEventListener('change', go); return h('div', { class: 'cx-item' }, emojiImg(r, 'cx-big'), h('span', { class: 'cx-colon' }, ':'), input, h('span', { class: 'cx-colon' }, ':'), h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Delete ' + r.name, onclick: () => removeIt('emoji', r) }, icon('trash'))); })) : h('div', { class: 'cx-empty' }, h('b', {}, 'No emoji'), h('p', { class: 'muted' }, 'Get the party started by uploading an emoji.'))];
    }
    function stickerTab() {
      return [h('div', { class: 'cx-drop' }, h('b', {}, `${L.stickers.length} of ${C.MAX_STICKERS} stickers`), h('p', { class: 'fine' }, 'Stickers are bigger pictures you send as a whole message.'), h('button', { class: 'btn primary', type: 'button', onclick: () => stickerDialog() }, 'Upload Sticker')),
        h('div', { class: 'cx-slots' }, L.stickers.map(r => { const input = h('input', { value: r.name, maxlength: C.MAX_NAME, 'aria-label': 'Sticker name' }); input.addEventListener('change', rename('stickers', r, input)); return h('div', { class: 'cx-slot' }, h('img', { src: r.img, alt: r.name }), input, h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Delete ' + r.name, onclick: () => removeIt('stickers', r) }, icon('trash'))); }), Array.from({ length: Math.max(0, 5 - L.stickers.length) }, () => h('div', { class: 'cx-slot empty', 'aria-hidden': 'true' }, icon('image'))))];
    }
    function stickerDialog() {
      if (L.stickers.length >= C.MAX_STICKERS) { msg.textContent = `That is the limit: ${C.MAX_STICKERS} stickers.`; return; }
      let img = '', typed = false; const name = h('input', { maxlength: C.MAX_NAME, placeholder: 'Sticker name', 'aria-label': 'Sticker name' }), prev = h('div', { class: 'cx-prev' }, 'Choose a picture'), err = h('p', { class: 'err', role: 'alert' });
      name.addEventListener('input', () => { typed = true; });
      const choose = h('button', { class: 'btn', type: 'button', onclick: () => pickFiles('image/*', false, async fs => { try { img = await toImage(fs[0], 320, true); prev.replaceChildren(h('img', { src: img, alt: '' })); if (!typed) name.value = C.cleanName(fs[0].name); } catch { err.textContent = 'That is not a picture.'; } }) }, 'Browse');
      const up = h('button', { class: 'btn primary', type: 'button', onclick: async () => { const e = C.nameError(name.value, L.stickers.map(s => s.name)); if (!img) { err.textContent = 'Choose a picture first.'; return; } if (e) { err.textContent = e; return; } const r = rec('csticker', { name: C.cleanName(name.value), img }); if (await save(r)) { L.stickers.push(r); sync(); close2(); paint(); toast('Sticker added.'); } } }, 'Upload');
      const close2 = modal(h('div', {}, h('div', { class: 'mh' }, h('b', {}, 'Upload a sticker')), h('div', { class: 'mp' }, prev, choose, h('label', { class: 'field' }, h('span', {}, 'Sticker name'), name), err, h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => close2() }, 'Never mind'), up))));
    }
    function soundTab() {
      return [h('div', { class: 'cx-drop' }, h('b', {}, `${L.sounds.length} of ${C.MAX_SOUNDS} sounds`), h('p', { class: 'fine' }, `Upload short sounds (up to ${C.MAX_SOUND_SEC} seconds) to play from the soundboard or send as messages.`), h('button', { class: 'btn primary', type: 'button', onclick: () => soundDialog() }, 'Upload Sound')),
        L.sounds.length ? h('div', { class: 'cx-list' }, L.sounds.map(r => { const row = h('div', { class: 'cx-item' }, h('button', { class: 'cx-splay', type: 'button', 'aria-label': 'Play ' + r.name, onclick: () => play(r, row) }, icon('play')), h('b', { class: 'cx-sname' }, r.emoji ? r.emoji + ' ' : '', r.name), h('input', { type: 'range', min: 0, max: 100, value: String(Math.round(C.volume(r.volume) * 100)), 'aria-label': 'Volume of ' + r.name, onchange: async e => { const upd = { ...r, volume: Number(e.target.value) / 100, updatedAt: Date.now() }; if (await save(upd)) { L.sounds = L.sounds.map(x => (x.id === r.id ? upd : x)); sync(); } } }), h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Delete ' + r.name, onclick: () => removeIt('sounds', r) }, icon('trash'))); return row; })) : h('div', { class: 'cx-empty' }, h('b', {}, 'No Sounds'), h('p', { class: 'muted' }, 'Get the party started by uploading a sound.'))];
    }
    function soundDialog() {
      if (L.sounds.length >= C.MAX_SOUNDS) { msg.textContent = `That is the limit: ${C.MAX_SOUNDS} sounds.`; return; }
      let file = null, emoji = '', typed = false; const fileLbl = h('span', { class: 'cx-fname' }, 'Choose a file'), name = h('input', { maxlength: C.MAX_NAME, placeholder: 'Sound name', 'aria-label': 'Sound name' }), vol = h('input', { type: 'range', min: 0, max: 100, value: '100', 'aria-label': 'Sound volume' }), err = h('p', { class: 'err', role: 'alert' });
      const emo = h('button', { class: 'btn emoji-btn', type: 'button', 'aria-label': 'Related emoji', onclick: () => { grid.hidden = !grid.hidden; } }, '\u{1F642}'), grid = h('div', { class: 'emoji-grid', hidden: true }, ForumCore.REACTIONS.map(e => h('button', { type: 'button', 'aria-label': e, onclick: () => { emoji = e; emo.textContent = e; grid.hidden = true; } }, e)), h('button', { type: 'button', class: 'emoji-none', onclick: () => { emoji = ''; emo.textContent = '\u{1F642}'; grid.hidden = true; } }, 'None'));
      name.addEventListener('input', () => { typed = true; });
      const browse = h('button', { class: 'btn', type: 'button', onclick: () => pickFiles('audio/*', false, async fs => { file = fs[0]; fileLbl.textContent = file.name; if (!typed) name.value = C.cleanName(file.name); }) }, 'Browse');
      const up = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        if (!file) { err.textContent = 'Choose a sound file first.'; return; } const e = C.nameError(name.value, L.sounds.map(s => s.name)); if (e) { err.textContent = e; return; }
        up.disabled = true; const dur = await probeSound(file), bad = C.soundError({ size: file.size, duration: dur }); if (bad) { err.textContent = bad; up.disabled = false; return; }
        const r = rec('csound', { name: C.cleanName(name.value), emoji, volume: Number(vol.value) / 100, audio: await readData(file), duration: Math.round(dur * 10) / 10 });
        if (await save(r)) { L.sounds.push(r); sync(); close2(); paint(); toast('Sound added.'); } else up.disabled = false; } }, 'Upload');
      const close2 = modal(h('div', {}, h('div', { class: 'mh' }, h('b', {}, 'Upload a sound')), h('div', { class: 'mp' }, h('div', { class: 'field' }, h('span', {}, 'File *'), h('div', { class: 'cx-file' }, fileLbl, browse)), h('div', { class: 'cx-two' }, h('label', { class: 'field' }, h('span', {}, 'Sound name *'), name), h('div', { class: 'field' }, h('span', {}, 'Related emoji'), emo)), grid, h('label', { class: 'field' }, h('span', {}, 'Sound volume'), vol), err, h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => close2() }, 'Never mind'), up))));
    }
    function paint() {
      tabs.replaceChildren(...[['emoji', 'Emoji'], ['stickers', 'Stickers'], ['sounds', 'Soundboard']].map(([id, label]) => h('button', { class: 'cx-tab' + (tab === id ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; msg.textContent = ''; paint(); } }, label)));
      body.classList.remove('drag'); body.replaceChildren(...(tab === 'emoji' ? emojiTab() : tab === 'stickers' ? stickerTab() : soundTab()));
    }
    body.addEventListener('drop', e => { if (tab !== 'emoji') return; e.preventDefault(); body.classList.remove('drag'); addEmoji([...e.dataTransfer.files]); });
    const close = modal(h('div', { class: 'cx-modal' }, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => { close(); render(true); } }, icon('x')), h('b', {}, 'Emoji, stickers and sounds')), tabs, h('div', { class: 'cx-pad' }, msg, body)));
    paint();
  }
  return { setActive, token, hasEmoji, extras, composerTools, manage, play };
})();
if (typeof module !== 'undefined') module.exports = Chatx;

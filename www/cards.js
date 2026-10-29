'use strict';
/* Card Binder: a virtual binder for your trading cards. Photograph a card and the app reads it (on this device) and fills in
   what it can: name, Pokédex number, HP, card number, illustrator. Check it, fix anything, and it goes in your binder. */
const KD = CardCore;
let kdTab = 'binders', kdQuery = '', kdLang = '', kdGame = '', kdShown = 120;
const kdPageOf = {};                                        // binder id -> page being looked at
const kdBinders = ctx => ctx.apps.cbinder, kdCards = ctx => ctx.apps.ccard;
const kdSave = (acct, rec) => appSave(acct, { accountId: acct.id, createdAt: Date.now(), ...rec });
const kdPlural = n => `${n} ${n === 1 ? 'card' : 'cards'}`;
const kdSize = b => (b && KD.validSize(b.cols, b.rows) ? [b.cols, b.rows] : [3, 3]);
const kdDex = () => loadPokedex().then(D => D.national).catch(() => []);

function cardsView(acct, ctx, back, binderId) {
  const title = appName(acct, 'cards');
  if (binderId) {
    const b = kdBinders(ctx).find(x => x.id === binderId);
    return b ? kdBinderPage(acct, ctx, back, b) : [back(title), emptyState('Binder not found', 'That binder is gone.')];
  }
  const cards = kdCards(ctx), st = KD.stats(cards);
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(kdTab === k), class: kdTab === k ? 'active' : '', onclick: () => { kdTab = k; kdShown = 120; render(true); } }, label);
  return [back(title, { action: h('button', { class: 'btn primary', onclick: () => kdAdd(acct, ctx, '') }, 'Add a card') }),
    h('div', { class: 'tabs', role: 'tablist' }, tab('binders', 'Binders'), tab('all', 'All cards')),
    h('div', { class: 'app-pad kd-wrap' }, cards.length ? h('p', { class: 'fine', style: 'padding:0 0 8px' }, `${kdPlural(st.units)} · ${plural(st.species, 'Pokémon species').replace('Pokémon speciess', 'Pokémon species')}${st.value ? ' · worth ' + money(st.value) : ''}`) : null, ...(kdTab === 'binders' ? kdHome(acct, ctx) : kdAll(acct, ctx)))];
}

/* ---------- binders ---------- */
function kdHome(acct, ctx) {
  const binders = [...kdBinders(ctx)].sort((a, b) => a.createdAt - b.createdAt), cards = kdCards(ctx);
  if (!binders.length) return [emptyState('Your binder is empty', 'Take a photo of a card and it gets a place in your first binder.'), h('div', { class: 'btnrow', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: () => kdAdd(acct, ctx, '') }, 'Add your first card'))];
  return [h('div', { class: 'kd-binders' }, binders.map(b => {
    const mine = KD.order(cards.filter(c => c.binder === b.id)), cover = mine[0];
    return h('a', { class: 'kd-binder', href: '#/apps/cards/' + b.id, style: `--bc:${b.color || '#6d5dfc'}` }, h('div', { class: 'kd-cover' }, cover ? h('img', { src: cover.thumb, alt: '', loading: 'lazy' }) : h('span', { class: 'kd-empty', 'aria-hidden': 'true' }, '+')), h('b', {}, b.name), h('span', { class: 'muted' }, kdPlural(mine.length)));
  })), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => kdBinderEditor(acct, ctx, null) }, 'New binder'))];
}
const KD_COLORS = ['#6d5dfc', '#e5484d', '#f59e0b', '#22a06b', '#0ea5e9', '#d946ef', '#64748b'];
function kdBinderEditor(acct, ctx, b, after) {
  const rec = b ? { ...b } : { id: uid(), kind: 'cbinder', name: '', cols: 3, rows: 3, color: KD_COLORS[kdBinders(ctx).length % KD_COLORS.length] };
  const name = h('input', { value: rec.name, maxlength: 50, placeholder: 'e.g. Japanese Pokémon', 'aria-label': 'Binder name' }), err = h('p', { class: 'err' });
  const size = h('select', { 'aria-label': 'Cards per page' }, KD.PAGE_SIZES.map(([c, r]) => h('option', { value: `${c}x${r}` }, `${c} × ${r} (${c * r} per page)`))); size.value = `${kdSize(rec)[0]}x${kdSize(rec)[1]}`;
  const sw = h('div', { class: 'ck-themes', role: 'radiogroup', 'aria-label': 'Colour' }, KD_COLORS.map(c => { const bt = h('button', { type: 'button', class: 'ck-swatch' + (rec.color === c ? ' on' : ''), role: 'radio', 'aria-checked': String(rec.color === c), 'aria-label': c, style: `background:${c}`, onclick: () => { rec.color = c; sw.querySelectorAll('.ck-swatch').forEach(x => { x.classList.toggle('on', x === bt); x.setAttribute('aria-checked', String(x === bt)); }); } }); return bt; }));
  const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, b ? 'Binder' : 'New binder'), fieldEl('Name', name), fieldEl('Cards per page', size), sw, err,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn primary', onclick: async () => {
      const n = name.value.trim(); if (!n) return void (err.textContent = 'Give the binder a name.');
      const [c, r] = size.value.split('x').map(Number); if (await kdSave(acct, { ...rec, name: n, cols: c, rows: r })) { close(); if (after) after(rec.id); else render(true); }
    } }, 'Save'))));
  setTimeout(() => name.focus(), 30);
}

/* ---------- one binder: pages of sleeves ---------- */
function kdBinderPage(acct, ctx, back, b) {
  const [cols, rows] = kdSize(b), mine = kdCards(ctx).filter(c => c.binder === b.id), pgs = KD.pages(mine, cols, rows);
  let page = Math.min(kdPageOf[b.id] || 0, pgs.length - 1);
  const label = h('b', { 'aria-live': 'polite' }), slots = h('div', { class: 'kd-page', style: `--cols:${cols}` });
  const draw = () => {
    kdPageOf[b.id] = page; label.textContent = `Page ${page + 1} of ${pgs.length}`;
    slots.replaceChildren(...pgs[page].map((c, i) => c
      ? h('button', { class: 'kd-slot has', type: 'button', 'aria-label': `${KD.title(c)}${c.number ? ', ' + c.number : ''}`, onclick: () => kdDetail(acct, ctx, c, KD.order(mine)) }, h('img', { src: c.thumb, alt: '', loading: 'lazy', draggable: 'false' }), c.holo ? h('span', { class: 'kd-holo', 'aria-hidden': 'true' }) : null, c.qty > 1 ? h('span', { class: 'kd-qty' }, '×' + c.qty) : null)
      : h('button', { class: 'kd-slot', type: 'button', 'aria-label': 'Empty slot. Add a card', onclick: () => kdAdd(acct, ctx, b.id) }, h('span', { 'aria-hidden': 'true' }, '+'))));
  };
  const go2 = d => { page = Math.max(0, Math.min(pgs.length - 1, page + d)); draw(); };
  let x0 = null; slots.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true }); slots.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) go2(dx < 0 ? 1 : -1); });
  const sort = h('select', { 'aria-label': 'Sort this binder', onchange: async e => { const how = e.target.value; e.target.value = ''; for (const p of KD.sortBy(mine, how)) { const c = mine.find(x => x.id === p.id); if (c && c.pos !== p.pos) await kdSave(acct, { ...c, pos: p.pos }); } toast('Sorted.'); render(true); } },
    h('option', { value: '' }, 'Sort...'), h('option', { value: 'number' }, 'By Pokédex number'), h('option', { value: 'name' }, 'By name'), h('option', { value: 'added' }, 'By date added'), h('option', { value: 'value' }, 'By value'));
  const tools = h('div', { class: 'app-row kd-tools' }, h('button', { class: 'btn', onclick: () => kdBinderEditor(acct, ctx, b) }, 'Edit'), sort,
    h('button', { class: 'btn', disabled: !mine.length, onclick: () => saveFile(`anti-social-cards-${KD.fold(b.name).replace(/ /g, '-') || 'binder'}.csv`, 'text/csv', KD.csv(mine, [b])).then(r => toast(r.ok ? `Saved to ${r.where}. A spreadsheet can open it.` : r.where)) }, 'Export CSV'),
    h('button', { class: 'btn danger', onclick: () => kdConfirm(mine.length ? `Delete "${b.name}" and its ${kdPlural(mine.length)}? There is no undo.` : `Delete the empty binder "${b.name}"?`, async () => { for (const c of mine) { await deleteMedia(acct, c.mtoken); await appDelete(c.id); } await appDelete(b.id); location.hash = '#/apps/cards'; render(true); }) }, 'Delete'));
  draw();
  const keyNav = e => { if (!document.body.contains(slots)) return document.removeEventListener('keydown', keyNav); if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || document.querySelector('.modal-bg')) return; if (e.key === 'ArrowRight') go2(1); else if (e.key === 'ArrowLeft') go2(-1); };
  document.addEventListener('keydown', keyNav);
  return [back(b.name, { sub: kdPlural(mine.length), action: h('button', { class: 'btn primary', onclick: () => kdAdd(acct, ctx, b.id) }, 'Add') }),
    h('div', { class: 'app-pad kd-wrap', style: `--bc:${b.color || '#6d5dfc'}` }, h('a', { class: 'fine kd-up', href: '#/apps/cards' }, '‹ All binders'),
      h('div', { class: 'kd-book' }, slots),
      h('div', { class: 'kd-pager' }, h('button', { class: 'btn', 'aria-label': 'Previous page', onclick: () => go2(-1) }, '‹'), label, h('button', { class: 'btn', 'aria-label': 'Next page', onclick: () => go2(1) }, '›')), tools)];
}

/* ---------- every card ---------- */
function kdAll(acct, ctx) {
  const cards = kdCards(ctx); if (!cards.length) return [emptyState('No cards yet', 'Cards you add show up here, newest first.')];
  const bn = new Map(kdBinders(ctx).map(b => [b.id, b.name]));
  const q = h('input', { type: 'search', placeholder: 'Search name, number, set, illustrator', value: kdQuery, 'aria-label': 'Search cards' });
  const langs = [...new Set(cards.map(c => c.lang).filter(Boolean))].sort(), lsel = h('select', { 'aria-label': 'Language', onchange: e => { kdLang = e.target.value; kdShown = 120; draw(); } }, h('option', { value: '' }, 'Any language'), langs.map(l => h('option', { value: l }, l))); lsel.value = langs.includes(kdLang) ? kdLang : '';
  const area = h('div', {});
  const draw = () => {
    const list = KD.search(cards, kdQuery).filter(c => !kdLang || c.lang === kdLang).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), shown = list.slice(0, kdShown);
    area.replaceChildren(...(list.length ? [h('div', { class: 'kd-grid' }, shown.map((c, i) => h('button', { class: 'kd-tile', type: 'button', 'aria-label': KD.title(c), onclick: () => kdDetail(acct, ctx, c, list) }, h('img', { src: c.thumb, alt: '', loading: 'lazy' }), h('span', { class: 'kd-cap' }, h('b', {}, KD.title(c)), h('small', {}, [bn.get(c.binder), c.number].filter(Boolean).join(' · ')))))),
      list.length > shown.length ? h('div', { class: 'btnrow', style: 'justify-content:center' }, h('button', { class: 'btn', onclick: () => { kdShown += 120; draw(); } }, `Show more (${list.length - shown.length} left)`)) : null].filter(Boolean) : [emptyState('No matches', 'No card has those words.')]));
  };
  q.addEventListener('input', () => { kdQuery = q.value; kdShown = 120; draw(); }); draw();
  return [q, h('div', { class: 'app-row' }, lsel), area];
}

/* ---------- adding and editing ---------- */
const kdBlank = binder => ({ binder, ...KD.normCard({}), name: '' });
function kdAdd(acct, ctx, binderId) {
  const snap = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, 'aria-label': 'Take a photo of the card' }), pick = h('input', { type: 'file', accept: 'image/*', hidden: true, 'aria-label': 'Choose a photo of the card' });
  const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Add a card'), h('p', { class: 'muted' }, 'Take a clear photo of the front of the card, flat and in good light. The app reads it on this device and fills in what it can. You check it before it is saved.'),
    snap, pick, h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => snap.click() }, 'Take a photo'), h('button', { class: 'btn', onclick: () => pick.click() }, 'Choose a photo'), h('button', { class: 'btn', onclick: () => { close(); kdForm(acct, ctx, null, { binder: binderId }); } }, 'Type it in instead')),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'))));
  for (const inp of [snap, pick]) inp.addEventListener('change', () => { const f = inp.files[0]; inp.value = ''; if (f) { close(); kdForm(acct, ctx, null, { binder: binderId, file: f }); } });
}
// one form for a new card (with its photo) and for editing
async function kdForm(acct, ctx, card, opt = {}) {
  const isNew = !card, rec = card ? { ...card } : { id: uid(), kind: 'ccard', ...kdBlank(opt.binder || '') };
  let file = opt.file || null, thumb = rec.thumb || '', fromPhoto = new Set(), touched = new Set(), busy = false;
  const binders = [...kdBinders(ctx)].sort((a, b) => a.createdAt - b.createdAt);
  const f = {};
  const text = (k, label, ph, extra = {}) => { const el = h('input', { value: rec[k] ?? '', maxlength: extra.max || 80, placeholder: ph || '', 'aria-label': label, inputmode: extra.mode || null }); el.addEventListener('input', () => touched.add(k)); f[k] = el; return h('label', { class: 'field' }, h('span', {}, label, h('i', { class: 'kd-from', hidden: true, 'data-k': k }, ' · read from photo')), el); };
  const game = h('select', { 'aria-label': 'Game' }, KD.GAMES.map(([v, l]) => h('option', { value: v }, l))); game.value = rec.game;
  const langSel = h('select', { 'aria-label': 'Language' }, h('option', { value: '' }, 'Not sure'), KD.LANGS.map(l => h('option', { value: l }, l))); langSel.value = rec.lang; langSel.addEventListener('change', () => touched.add('lang'));
  const cond = h('select', { 'aria-label': 'Condition' }, h('option', { value: '' }, 'Not set'), KD.CONDITIONS.map(c => h('option', { value: c }, c))); cond.value = rec.condition;
  const binderSel = h('select', { 'aria-label': 'Binder' }, binders.map(b => h('option', { value: b.id }, b.name)), h('option', { value: '' }, binders.length ? '＋ A new binder…' : 'My binder (new)')); binderSel.value = binders.some(b => b.id === rec.binder) ? rec.binder : (binders[0] ? binders[0].id : '');
  const stageSel = h('select', { 'aria-label': 'Stage' }, h('option', { value: '' }, '—'), KD.STAGES.map(s => h('option', { value: s }, s))); stageSel.value = rec.stage; stageSel.addEventListener('change', () => touched.add('stage'));
  const qty = h('input', { type: 'number', min: 1, max: 9999, value: String(rec.qty), 'aria-label': 'How many you have' });
  const value = h('input', { value: rec.valueCents == null ? '' : (rec.valueCents / 100).toFixed(2), inputmode: 'decimal', placeholder: 'optional', 'aria-label': 'Value each' });
  const holo = h('input', { type: 'checkbox', checked: !!rec.holo, 'aria-label': 'Holographic' });
  const notes = h('textarea', { rows: 3, maxlength: 5000, 'aria-label': 'Notes' }, rec.notes || '');
  const status = h('p', { class: 'muted kd-status', role: 'status' }), err = h('p', { class: 'err' });
  const prev = h('img', { class: 'kd-preview', alt: 'Your card', hidden: !thumb }); if (thumb) prev.src = thumb;
  const fill = (k, v) => { if (v === undefined || v === '' || touched.has(k)) return; if (f[k]) f[k].value = String(v); else if (k === 'lang') langSel.value = v; else if (k === 'stage') stageSel.value = v; fromPhoto.add(k); const tag = document.querySelector(`.kd-from[data-k="${k}"]`); if (tag) tag.hidden = false; };
  const read = async () => {
    if (!file || game.value !== 'pokemon' || busy) return; busy = true; again.disabled = true; err.textContent = '';
    try {
      const nat = await kdDex(), r = await kdReadCard(file, nat, s => { status.textContent = s; }), x = r.fields;
      fill('name', x.name || x.nameGuess); fill('dex', x.dex); fill('hp', x.hp); fill('number', x.number); fill('type', x.type); fill('illustrator', x.illustrator); fill('setCode', x.setCode); fill('lang', x.lang); fill('stage', x.stage);
      const got = ['name', 'dex', 'hp', 'number', 'illustrator'].filter(k => x[k] || (k === 'name' && x.nameGuess));
      status.textContent = got.length ? `Read from the photo: ${got.map(k => ({ name: 'name', dex: 'Pokédex number', hp: 'HP', number: 'card number', illustrator: 'illustrator' })[k]).join(', ')}. Please check it.${x.conflict ? ' ' + x.conflict : ''}` : 'The photo could not be read clearly. Try better light, or type the details in.';
    } catch (e) { status.textContent = 'The card reader is not available here, so type the details in.'; console.error(e); }
    busy = false; again.disabled = false;
  };
  const again = h('button', { class: 'btn', type: 'button', onclick: () => read() }, 'Read the photo again');
  const photoBtn = h('button', { class: 'btn', type: 'button' }, thumb ? 'Replace the photo' : 'Add a photo'), photoIn = h('input', { type: 'file', accept: 'image/*', hidden: true, 'aria-label': 'Choose a photo of the card' });
  photoBtn.addEventListener('click', () => photoIn.click());
  photoIn.addEventListener('change', async () => { const nf = photoIn.files[0]; photoIn.value = ''; if (!nf) return; file = nf; prev.src = URL.createObjectURL(nf); prev.hidden = false; photoBtn.textContent = 'Replace the photo'; again.hidden = false; await read(); });
  again.hidden = !file;
  const save = h('button', { class: 'btn primary' }, isNew ? 'Save to binder' : 'Save');
  const body = h('div', { class: 'mp kd-form' },
    h('div', { class: 'kd-top' }, prev, h('div', { class: 'kd-actions' }, photoBtn, again, photoIn, h('label', { class: 'check' }, holo, ' Holographic'))), status,
    h('div', { class: 'two' }, fieldEl('Game', game), fieldEl('Language', langSel)),
    text('name', 'Name', 'e.g. Pichu', { max: 80 }), h('div', { class: 'two' }, text('dex', 'Pokédex number', 'e.g. 172', { mode: 'numeric', max: 4 }), text('hp', 'HP', 'e.g. 30', { mode: 'numeric', max: 3 })),
    h('div', { class: 'two' }, text('number', 'Card number', 'e.g. 025/165', { max: 20 }), text('type', 'Type', 'e.g. Electric', { max: 24 })), h('div', { class: 'two' }, fieldEl('Stage', stageSel), text('rarity', 'Rarity', 'e.g. Rare Holo', { max: 30 })),
    h('div', { class: 'two' }, text('setName', 'Set', 'e.g. Neo Genesis', { max: 80 }), text('setCode', 'Set code', 'e.g. SV2a', { max: 16 })), text('illustrator', 'Illustrator', 'e.g. Ken Sugimori', { max: 60 }),
    h('div', { class: 'two' }, fieldEl('Condition', cond), fieldEl('How many', qty)), h('div', { class: 'two' }, fieldEl('Value each (optional)', value), fieldEl('Binder', binderSel)),
    fieldEl('Notes', notes), err,
    h('div', { class: 'btnrow', style: 'margin-top:12px' }, save, !isNew && h('button', { class: 'btn danger', type: 'button', onclick: () => { close(); kdConfirmDelete(acct, rec); } }, 'Delete')));
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New card' : 'Edit card')), body));
  if (file) { prev.src = URL.createObjectURL(file); prev.hidden = false; setTimeout(read, 60); }
  save.addEventListener('click', async () => {
    const vt = value.value.trim(), vc = vt === '' ? null : AC.parseMoney(vt); if (vt !== '' && (vc === null || vc < 0)) return void (err.textContent = 'That value does not look like an amount. Leave it empty if you do not know.');
    save.disabled = true;
    const data = KD.normCard({ ...rec, game: game.value, lang: langSel.value, name: f.name.value.trim(), dex: parseInt(f.dex.value, 10) || 0, hp: parseInt(f.hp.value, 10) || 0, number: f.number.value.trim(), type: f.type.value.trim(), stage: stageSel.value, rarity: f.rarity.value.trim(), setName: f.setName.value.trim(), setCode: f.setCode.value.trim(), illustrator: f.illustrator.value.trim(), condition: cond.value, qty: parseInt(qty.value, 10) || 1, valueCents: vc, holo: holo.checked, notes: notes.value });
    let bid = binderSel.value;
    if (!bid) { const nb = { id: uid(), kind: 'cbinder', name: binders.length ? 'New binder' : 'My binder', cols: 3, rows: 3, color: KD_COLORS[binders.length % KD_COLORS.length] }; if (!(await kdSave(acct, nb))) { save.disabled = false; return; } bid = nb.id; }
    const out = { ...rec, ...data, binder: bid };
    if (file) {
      try {
        const t = await downscale(file, 360), full = await downscale(file, 1600), token = out.mtoken || uid();
        if (!(await kdSave(acct, { id: uid(), kind: 'photo', asset: out.id, f: full, m: token }))) { save.disabled = false; return; }
        if (out.mtoken && card) { /* the old photo goes once the new card record is saved */ }
        out.thumb = t; out.mtoken = token;
        if (card && card.mtoken) { const old = card.mtoken; out.mtoken = token; out._old = old; }
      } catch { err.textContent = 'That photo could not be used.'; save.disabled = false; return; }
    }
    if (isNew && out.pos === undefined) out.pos = Date.now();
    const old = out._old; delete out._old;
    if (!(await kdSave(acct, out))) { save.disabled = false; return; }
    if (old) await deleteMedia(acct, old);
    close(); toast(isNew ? 'Added to your binder.' : 'Saved.');
    if (isNew) kdPageOf[bid] = 1e6;       // open on the last page, where it landed
    if (isNew && location.hash.startsWith('#/apps/cards')) location.hash = '#/apps/cards/' + bid;
    render(true);
  });
  setTimeout(() => (f.name.value ? f.hp : f.name).focus({ preventScroll: true }), 80);
}

/* ---------- one card ---------- */
function kdDetail(acct, ctx, card, list) {
  let i = Math.max(0, list.findIndex(c => c.id === card.id)), token = 0;
  const bn = new Map(kdBinders(ctx).map(b => [b.id, b.name]));
  const img = h('img', { class: 'viewer-img kd-big', alt: '' }), info = h('div', { class: 'kd-info' }), actions = h('div', { class: 'btnrow' });
  const show = async () => {
    const c = list[i], my = ++token; img.src = c.thumb; img.alt = KD.title(c);
    const row = (k, v) => v ? h('div', { class: 'tool-line' }, h('span', { class: 'muted' }, k), h('span', {}, v)) : null;
    info.replaceChildren(h('h3', { style: 'margin:8px 0' }, KD.title(c)), row('Number', c.number), row('Pokédex', c.dex ? `No. ${c.dex}` : ''), row('Type', [c.type, c.stage].filter(Boolean).join(' · ')), row('HP', c.hp ? String(c.hp) : ''), row('Language', c.lang), row('Set', [c.setName, c.setCode].filter(Boolean).join(' · ')), row('Rarity', [c.rarity, c.holo ? 'Holographic' : ''].filter(Boolean).join(' · ')), row('Illustrator', c.illustrator), row('Condition', c.condition), row('Quantity', c.qty > 1 ? String(c.qty) : ''), row('Value each', c.valueCents != null ? money(c.valueCents) : ''), row('Binder', bn.get(c.binder)), row('Notes', c.notes));
    actions.replaceChildren(h('button', { class: 'btn primary', onclick: () => { close(); kdForm(acct, ctx, c); } }, 'Edit'),
      c.dex && c.game === 'pokemon' ? h('a', { class: 'btn', href: '#/apps/pokedex/national/' + c.dex, onclick: () => close() }, 'Pokédex entry') : null,
      h('button', { class: 'btn', disabled: !(c.binder), onclick: async () => { const ch = KD.moveBy(list.filter(x => x.binder === c.binder), c.id, -1); for (const p of ch) { const x = list.find(y => y.id === p.id); await kdSave(acct, { ...x, pos: p.pos }); } toast(ch.length ? 'Moved earlier.' : 'Already first.'); close(); render(true); } }, '‹ Earlier'),
      h('button', { class: 'btn', disabled: !(c.binder), onclick: async () => { const ch = KD.moveBy(list.filter(x => x.binder === c.binder), c.id, 1); for (const p of ch) { const x = list.find(y => y.id === p.id); await kdSave(acct, { ...x, pos: p.pos }); } toast(ch.length ? 'Moved later.' : 'Already last.'); close(); render(true); } }, 'Later ›'));
    try { const m = (await loadMedia(acct, c.mtoken))[0]; if (m && my === token) img.src = m.f; } catch { /* the small picture stays */ }
  };
  const step = d => { i = (i + d + list.length) % list.length; show(); };
  const root = h('div', { class: 'viewer', tabindex: '-1', onkeydown: e => { if (list.length > 1 && e.key === 'ArrowRight') step(1); else if (list.length > 1 && e.key === 'ArrowLeft') step(-1); } },
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Card')),
    h('div', { class: 'mp' }, h('div', { class: 'viewer-stage' }, h('div', { class: 'viewer-frame' }, list.length > 1 ? h('button', { class: 'viewer-nav prev', 'aria-label': 'Previous card', onclick: () => step(-1) }, icon('back')) : null, img, list.length > 1 ? h('button', { class: 'viewer-nav next flip', 'aria-label': 'Next card', onclick: () => step(1) }, icon('back')) : null)), info, actions));
  const close = modal(root); show(); setTimeout(() => root.focus(), 0);
}
function kdConfirm(text, yes) { const close = modal(h('div', { class: 'modal-body' }, h('p', {}, text), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Keep it'), h('button', { class: 'btn danger', onclick: () => { close(); yes(); } }, 'Delete')))); }
const kdConfirmDelete = (acct, c) => kdConfirm(`Delete ${KD.title(c)}? There is no undo.`, async () => { await deleteMedia(acct, c.mtoken); await appDelete(c.id); toast('Deleted.'); render(true); });

'use strict';
/* Pokémon Bank: banks of boxes for the Pokémon you keep, in the style of pkHouse (https://github.com/Insektaure/pkHouse, GPL-2.0).
   Two panels side by side so you can carry Pokémon between boxes and banks, a details bar, search, sorting, and bank and card files.
   Everything is typed in or imported by you; it never reads or changes a game's save file. */
const PK = PokeCore;
let pkSel = null, pkHold = null, pkLeft = { bank: '', box: 0 }, pkRight = { bank: '', box: 1 }, pkFilter = {}, pkDrag = null;
let pkDataP = null;
const loadPkData = () => pkDataP || (pkDataP = new Promise((res, rej) => {
  const done = () => { window.PkData.speciesNames = window.PokeDex ? window.PokeDex.national.map(e => e[0]) : []; res(PkmParse.make(window.PkData)); };
  if (window.PkData) return done();
  const sc = document.createElement('script'); sc.src = 'pokebank/data.js'; sc.onload = done; sc.onerror = () => { pkDataP = null; rej(new Error('pk data missing')); };
  document.head.append(sc);
}));
const pkBanks = ctx => [...ctx.apps.pkbank].sort((a, b) => a.createdAt - b.createdAt);
const pkMons = ctx => ctx.apps.pkm;
const pkSave = (acct, rec) => savePost(acct, { accountId: acct.id, createdAt: Date.now(), ...rec });
const pkFamilyName = f => (PK.FAMILIES[f] || { name: f }).name;
const pkSprite = (m, kind = 'icons') => pdImg(m.shiny && kind === 'icons' ? 'shiny' : kind, m.species);

function pokebankView(acct, ctx, back) {
  const parts = location.hash.split('/'), bankId = parts[3] || '';
  const title = appName(acct, 'pokebank');
  const box = h('div', {}, h('p', { class: 'muted', style: 'padding:16px' }, 'Loading...'));
  loadPokedex().then(D => {
    const banks = pkBanks(ctx), bank = banks.find(b => b.id === bankId);
    if (bankId && !bank) return box.replaceChildren(emptyState('Bank not found', 'That bank is gone.'));
    box.replaceChildren(...(bank ? pkBankView(acct, ctx, D, bank, banks) : pkHome(acct, ctx, D, banks)).filter(Boolean));
  }).catch(() => box.replaceChildren(h('p', { class: 'err', style: 'padding:16px' }, 'The Pokémon list could not be loaded.')));
  return [back(title), box];
}

/* ---------- the list of banks ---------- */
function pkHome(acct, ctx, D, banks) {
  const mons = pkMons(ctx), tiles = banks.map(b => {
    const f = PK.FAMILIES[b.family], n = PK.countIn(mons, b.id), pct = Math.round(n / (f.boxes * f.slots) * 100);
    return h('a', { class: 'pd-region pk-bank', href: '#/apps/pokebank/' + b.id }, h('b', {}, b.name), h('small', {}, pkFamilyName(b.family)),
      h('div', { class: 'pd-bar' }, h('i', { style: `width:${pct}%` })), h('div', { class: 'pd-r-num' }, `${n} Pokémon`, h('span', { class: 'muted' }, `${f.boxes} boxes of ${f.slots}`)));
  });
  const q = h('input', { type: 'search', placeholder: 'Search every bank', value: pkFilter.q || '', 'aria-label': 'Search every bank' });
  const res = h('div', { class: 'pd-results' });
  const paint = () => {
    pkFilter = { ...pkFilter, q: q.value };
    const hits = q.value.trim() ? PK.filterMons(mons, { q: q.value }, D.national) : [];
    res.replaceChildren(...(q.value.trim() ? [hits.length ? h('div', { class: 'pd-list' }, hits.slice(0, 50).map(m => pkResultRow(D, m, banks))) : h('p', { class: 'muted' }, 'No Pokémon like that in any bank.')] : []));
  };
  q.addEventListener('input', paint); paint();
  return [
    h('div', { class: 'app-pad' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'A bank is a set of boxes for one game family, like in the games. Keep your Pokémon here, move them between boxes and banks, and trade them by sending a card file.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => pkNewBank(acct, ctx) }, 'New bank'), h('button', { class: 'btn', type: 'button', onclick: () => pkImportBank(acct, ctx) }, 'Import bank file'), h('button', { class: 'btn', type: 'button', onclick: () => pkImportCard(acct, ctx, D, null) }, 'Import Pokémon card'), h('button', { class: 'btn', type: 'button', onclick: () => pkImportBin(acct, ctx) }, 'Import pkHouse bank (.bin)'), h('button', { class: 'btn', type: 'button', onclick: () => pkImportFiles(acct, ctx, D, null) }, 'Import game files')),
      banks.length ? [h('div', { style: 'height:12px' }), q, res] : null),
    banks.length ? h('div', { class: 'app-pad' }, h('div', { class: 'pd-regions' }, tiles)) : h('div', { class: 'app-pad' }, emptyState('No banks yet', 'Make your first bank, then add Pokémon one by one, or import a bank or card file.')),
    h('p', { class: 'fine pd-credit' }, 'Inspired by ', h('b', {}, 'pkHouse'), ' by Insektaure (GPL-2.0). This app does not read or change any game save file. Pokémon is a trademark of Nintendo, Creatures, GAME FREAK and The Pokémon Company; this app is not affiliated with them.'),
  ];
}
function pkResultRow(D, m, banks) {
  const b = banks.find(x => x.id === m.bank);
  return h('a', { class: 'pd-row', href: '#/apps/pokebank/' + m.bank, onclick: () => { pkLeft = { bank: m.bank, box: m.box }; pkSel = m.id; } },
    h('img', { src: pkSprite(m), alt: '', loading: 'lazy' }), h('span', {}, h('b', {}, PK.monName(m, D.national)), h('small', {}, ` Lv ${m.level} · ${b ? b.name : '?'} · ${PK.boxName(b, m.box)} · slot ${m.slot + 1}`)));
}
function pkNewBank(acct, ctx) {
  const name = h('input', { value: 'My Bank', maxlength: 40, 'aria-label': 'Bank name' });
  const fam = h('select', { 'aria-label': 'Game family' }, Object.entries(PK.FAMILIES).map(([k, f]) => h('option', { value: k }, f.name)));
  fam.value = 'sv';
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'New bank')),
    h('div', { class: 'mp' }, aiField('Name', name), aiField('Game family', fam, 'Sets the number of boxes and slots, like the games: 32 boxes of 30 for most, 40 of 25 for Let\'s Go.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        const id = uid(); await pkSave(acct, { id, kind: 'pkbank', name: PK.exportBank({ name: name.value, family: fam.value }, []).bank.name || 'My Bank', family: fam.value, boxNames: [] }); close(); go('/apps/pokebank/' + id);
      } }, 'Create bank')))));
  setTimeout(() => name.select(), 0);
}

/* ---------- one bank: two panels ---------- */
function pkBankView(acct, ctx, D, bank, banks) {
  const mons = pkMons(ctx), fam = PK.FAMILIES[bank.family];
  if (pkLeft.bank !== bank.id) { pkLeft = { bank: bank.id, box: 0 }; pkSel = null; }
  if (!banks.some(b => b.id === pkRight.bank)) pkRight = { bank: bank.id, box: Math.min(1, fam.boxes - 1) };
  const selMon = pkSel && mons.find(m => m.id === pkSel), holdMon = pkHold && mons.find(m => m.id === pkHold);
  if (pkHold && !holdMon) pkHold = null;
  const refresh = () => render(true);
  const place = async (panel, slot) => {
    const bk = banks.find(b => b.id === panel.bank), at = { bank: panel.bank, box: panel.box, slot }, there = PK.slotsOf(mons, bk, panel.box)[slot];
    if (holdMon) {
      if (there && there.id === holdMon.id) { pkHold = null; return refresh(); }
      const to = banks.find(b => b.id === at.bank);
      for (const c of PK.moveTo(mons, holdMon, at)) { const m = mons.find(x => x.id === c.id); await savePost(acct, { ...m, bank: c.bank, box: c.box, slot: c.slot }); }
      pkSel = holdMon.id; pkHold = null; toast(`Moved ${PK.monName(holdMon, D.national)} to ${to.name}, ${PK.boxName(to, at.box)}.`); return refresh();
    }
    if (there) { pkSel = there.id; return refresh(); }
    pkSel = null; pkEditor(acct, ctx, D, null, { bank: bk, box: panel.box, slot });
  };
  const panel = (st, side) => {
    const bk = banks.find(b => b.id === st.bank) || bank, f = PK.FAMILIES[bk.family];
    st.box = Math.max(0, Math.min(st.box, f.boxes - 1));
    const slots = PK.slotsOf(mons, bk, st.box);
    const bankSel = h('select', { 'aria-label': side + ' panel bank' }, banks.map(b => h('option', { value: b.id }, b.name))); bankSel.value = bk.id;
    bankSel.addEventListener('change', () => { st.bank = bankSel.value; st.box = 0; refresh(); });
    const boxSel = h('select', { 'aria-label': side + ' panel box' }, Array.from({ length: f.boxes }, (_, i) => h('option', { value: String(i) }, `${PK.boxName(bk, i)} (${PK.slotsOf(mons, bk, i).filter(Boolean).length}/${f.slots})`))); boxSel.value = String(st.box);
    boxSel.addEventListener('change', () => { st.box = Number(boxSel.value); refresh(); });
    const step = d => () => { st.box = (st.box + d + f.boxes) % f.boxes; refresh(); };
    const grid = h('div', { class: 'pk-grid', style: `--cols:${f.cols}`, role: 'grid', 'aria-label': `${bk.name}, ${PK.boxName(bk, st.box)}` }, slots.map((m, i) => {
      const held = holdMon && m && m.id === holdMon.id;
      const el = h('button', { class: 'pk-slot' + (m ? ' full' : '') + (selMon && m && m.id === selMon.id ? ' sel' : '') + (held ? ' held' : '') + (m && m.shiny ? ' shiny' : ''), type: 'button', role: 'gridcell', draggable: m ? 'true' : null,
        'aria-label': m ? `${PK.monName(m, D.national)}, level ${m.level}, slot ${i + 1}` : `Empty slot ${i + 1}`, title: m ? PK.monName(m, D.national) : 'Empty', onclick: () => place({ bank: bk.id, box: st.box }, i) },
        m ? [h('img', { src: pkSprite(m), alt: '', loading: 'lazy', draggable: 'false' }), m.egg ? h('span', { class: 'pk-egg' }, 'Egg') : h('span', { class: 'pk-lv' }, 'L' + m.level), m.shiny ? h('span', { class: 'pk-star', 'aria-hidden': 'true' }, '★') : null, m.alpha ? h('span', { class: 'pk-alpha', 'aria-hidden': 'true' }, 'α') : null] : null);
      el.addEventListener('dragstart', e => { pkDrag = m.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', m.id); });
      el.addEventListener('dragover', e => { if (pkDrag) { e.preventDefault(); el.classList.add('over'); } });
      el.addEventListener('dragleave', () => el.classList.remove('over'));
      el.addEventListener('drop', async e => {
        e.preventDefault(); el.classList.remove('over'); const dm = mons.find(x => x.id === pkDrag); pkDrag = null; if (!dm || (m && m.id === dm.id)) return;
        for (const c of PK.moveTo(mons, dm, { bank: bk.id, box: st.box, slot: i })) { const x = mons.find(y => y.id === c.id); await savePost(acct, { ...x, bank: c.bank, box: c.box, slot: c.slot }); }
        pkSel = dm.id; refresh();
      });
      return el;
    }));
    return h('section', { class: 'pk-panel', 'aria-label': side + ' panel' },
      h('div', { class: 'pk-phead' }, bankSel, h('div', { class: 'pk-boxnav' }, h('button', { class: 'btn', type: 'button', 'aria-label': 'Previous box', onclick: step(-1) }, '‹'), boxSel, h('button', { class: 'btn', type: 'button', 'aria-label': 'Next box', onclick: step(1) }, '›'),
        h('button', { class: 'btn', type: 'button', 'aria-label': 'Rename this box', title: 'Rename this box', onclick: () => pkRenameBox(acct, bk, st.box) }, icon('notes')))), grid);
  };
  const menu = h('div', { class: 'btnrow pk-menu' },
    h('button', { class: 'btn', type: 'button', onclick: () => pkSearchModal(acct, ctx, D, banks) }, 'Search'),
    h('button', { class: 'btn', type: 'button', onclick: () => pkSortModal(acct, ctx, D, bank, pkLeft.box) }, 'Sort'),
    h('button', { class: 'btn', type: 'button', onclick: () => pkImportCard(acct, ctx, D, bank) }, 'Import card'),
    h('button', { class: 'btn', type: 'button', onclick: () => pkImportFiles(acct, ctx, D, bank) }, 'Import game files'),
    h('button', { class: 'btn', type: 'button', onclick: () => pkExportBank(bank, mons) }, 'Export bank'),
    mons.some(m => m.bank === bank.id && m.raw && m.rawFmt === PkmParse.FAMILY_FORMAT[bank.family]) ? h('button', { class: 'btn', type: 'button', title: 'A pkHouse bank file (.bin) with the Pokémon that came from game files', onclick: () => pkExportBin(bank, mons) }, 'Export pkHouse bank') : null,
    h('button', { class: 'btn', type: 'button', onclick: () => pkRenameBank(acct, bank) }, 'Rename'),
    h('button', { class: 'btn danger', type: 'button', onclick: () => pkDeleteBank(acct, ctx, bank) }, 'Delete bank'));
  const banner = holdMon ? h('div', { class: 'pk-hold', role: 'status' }, h('img', { src: pkSprite(holdMon), alt: '' }), h('span', {}, `Holding ${PK.monName(holdMon, D.national)}. Choose a slot to put it down; an occupied slot swaps places.`), h('button', { class: 'btn', type: 'button', onclick: () => { pkHold = null; refresh(); } }, 'Cancel')) : null;
  return [
    h('div', { class: 'app-pad' }, h('div', { class: 'pd-head' }, h('div', {}, h('h2', { style: 'margin:0' }, bank.name), h('small', { class: 'muted' }, `${pkFamilyName(bank.family)} · ${PK.countIn(mons, bank.id)} Pokémon`)), h('a', { class: 'btn', href: '#/apps/pokebank' }, 'All banks')), menu),
    banner,
    h('div', { class: 'pk-panels' }, panel(pkLeft, 'Left'), panel(pkRight, 'Right')),
    pkDetails(acct, ctx, D, selMon, banks),
  ];
}

/* ---------- the details bar ---------- */
function pkDetails(acct, ctx, D, m, banks) {
  if (!m) return h('div', { class: 'pk-details empty' }, h('p', { class: 'muted' }, 'Choose a Pokémon to see its details, or an empty slot to add one.'));
  const sp = D.national[m.species - 1] || ['#' + m.species, ''], eff = PK.natureEffect(m.nature), b = banks.find(x => x.id === m.bank);
  const ev = PK.evTotal(m), field = (l, v) => v ? h('div', { class: 'pd-field' }, h('small', {}, l), h('div', {}, v)) : null;
  return h('div', { class: 'pk-details' },
    h('div', { class: 'pk-dhead' }, h('img', { src: pkSprite(m, 'full'), alt: sp[0], class: 'pk-big' }),
      h('div', {}, h('h3', { style: 'margin:0' }, PK.monName(m, D.national), m.shiny ? h('span', { class: 'pk-star-l', title: 'Shiny' }, ' ★') : null, m.alpha ? h('span', { class: 'badge' }, 'Alpha') : null, m.egg ? h('span', { class: 'badge' }, 'Egg') : null),
        h('div', { class: 'muted' }, `${m.nickname ? sp[0] + ' · ' : ''}#${PK.pad3(m.species)} · Lv ${m.level}${m.gender ? ' · ' + m.gender : ''}`),
        h('div', { class: 'pd-chips', style: 'margin-top:6px' }, PK.parseTypes(sp[1]).map(t => h('span', { class: 'type-pill', style: `background:${PK.TYPE_COLOR[t]};color:${PK.typeText(PK.TYPE_COLOR[t])}` }, t))))),
    h('div', { class: 'pk-dgrid' },
      field('Nature', m.nature >= 0 ? PK.NATURES[m.nature] + (eff ? ` (+${eff.up}, −${eff.down})` : '') : ''), field('Ability', m.ability), field('Held item', m.item), field('Ball', m.ball),
      m.moves.some(Boolean) ? h('div', { class: 'pd-field' }, h('small', {}, 'Moves'), h('div', { class: 'pk-moves' }, m.moves.filter(Boolean).map(x => h('span', { class: 'chip' }, x)))) : null,
      h('div', { class: 'pd-field' }, h('small', {}, `IVs · total ${PK.ivTotal(m)} · ${PK.perfectIvs(m)} perfect`), h('div', { class: 'pk-stats' }, PK.STATS.map((s, i) => h('span', { class: m.ivs[i] === 31 ? 'perfect' : '' }, `${s} ${m.ivs[i]}`)))),
      h('div', { class: 'pd-field' }, h('small', {}, `EVs · total ${ev}${ev > 510 ? ' (over 510)' : ''}`), h('div', { class: 'pk-stats' }, PK.STATS.map((s, i) => h('span', {}, `${s} ${m.evs[i]}`)))),
      m.raw ? h('div', { class: 'pd-field' }, h('small', {}, 'From a game file'), h('div', {}, 'Imported from a game file; it can be exported again as long as you do not edit it here.')) : null,
      field('Trainer', m.ot ? `${m.ot}${m.tid ? ' · ' + String(m.tid).padStart(6, '0') : ''}` : ''), field('Origin game', m.origin), field('Met at', m.met), field('Notes', m.notes ? h('span', { style: 'white-space:pre-wrap' }, m.notes) : '')),
    h('div', { class: 'btnrow' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { pkHold = m.id; render(true); } }, 'Pick up'),
      h('button', { class: 'btn', type: 'button', onclick: () => pkEditor(acct, ctx, D, m, null) }, 'Edit'),
      h('button', { class: 'btn', type: 'button', onclick: () => pkDuplicate(acct, ctx, D, m, b) }, 'Duplicate'),
      h('button', { class: 'btn', type: 'button', onclick: () => pkExportCard(m, b) }, 'Export card'),
      m.raw ? h('button', { class: 'btn', type: 'button', title: 'The original game file (.pk8, .pk9 ...), as PKHeX and pkHouse use', onclick: () => pkExportGameFile(m, D) }, 'Export game file') : null,
      h('a', { class: 'btn', href: `#/apps/pokedex/national/${m.species}` }, 'Pokédex page'),
      h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (!confirm(`Release ${PK.monName(m, D.national)}? There is no undo.`)) return; await db.del('posts', m.id); pkSel = null; toast('Released. Bye!'); render(true); } }, 'Release')));
}

/* ---------- adding and editing ---------- */
// from the Pokédex page: "Add to my Pokémon Bank"
function pkAddFromDex(acct, ctx, n) {
  loadPokedex().then(D => {
    const banks = pkBanks(ctx);
    if (!banks.length) { toast('Make a bank first in the Pokémon Bank app.'); go('/apps/pokebank'); return; }
    const sel = h('select', { 'aria-label': 'Bank' }, banks.map(b => h('option', { value: b.id }, `${b.name} (${pkFamilyName(b.family)})`)));
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add to which bank?')),
      h('div', { class: 'mp' }, aiField('Bank', sel), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { const bk = banks.find(b => b.id === sel.value), at = PK.firstFree(pkMons(ctx), bk); close(); if (!at) return toast('That bank is full.'); pkEditor(acct, ctx, D, null, { bank: bk, ...at }, n); } }, 'Continue')))));
  });
}
function pkEditor(acct, ctx, D, mon, at, presetSpecies) {
  const isNew = !mon, base = mon || PK.normMon({ species: presetSpecies || 25, level: 5 });
  const nm = D.national.map(e => e[0]);
  const spEl = h('input', { value: nm[base.species - 1], list: 'pk-species', 'aria-label': 'Species', autocomplete: 'off' }), dl = h('datalist', { id: 'pk-species' }, nm.map((n, i) => h('option', { value: n }, '#' + PK.pad3(i + 1))));
  const prev = h('img', { class: 'pk-big', alt: '', src: pdImg('full', base.species) });
  const species = () => { const v = spEl.value.trim().toLowerCase(), byName = nm.findIndex(x => x.toLowerCase() === v), n = byName >= 0 ? byName + 1 : Number(v.replace('#', '')); return Number.isInteger(n) && n >= 1 && n <= 1025 ? n : 0; };
  spEl.addEventListener('input', () => { const n = species(); if (n) prev.src = pdImg((shiny.checked ? 'shiny' : 'full'), n); });
  const text = (v, max, label, extra = {}) => h('input', { value: v || '', maxlength: max, 'aria-label': label, ...extra });
  const nick = text(base.nickname, PK.LIMITS.nickname, 'Nickname', { placeholder: 'Same as species' }), lvl = h('input', { type: 'number', min: '1', max: '100', value: String(base.level), 'aria-label': 'Level' });
  const gender = h('select', { 'aria-label': 'Gender' }, PK.GENDERS.map(g => h('option', { value: g }, g || 'Unknown'))); gender.value = base.gender;
  const shiny = h('input', { type: 'checkbox', checked: base.shiny, 'aria-label': 'Shiny' }), alpha = h('input', { type: 'checkbox', checked: base.alpha, 'aria-label': 'Alpha' }), egg = h('input', { type: 'checkbox', checked: base.egg, 'aria-label': 'Egg' });
  shiny.addEventListener('change', () => { const n = species(); if (n) prev.src = pdImg(shiny.checked ? 'shiny' : 'full', n); });
  const nature = h('select', { 'aria-label': 'Nature' }, h('option', { value: '-1' }, 'Unknown'), PK.NATURES.map((n, i) => { const e = PK.natureEffect(i); return h('option', { value: String(i) }, e ? `${n} (+${e.up}, −${e.down})` : n); })); nature.value = String(base.nature);
  const ability = text(base.ability, PK.LIMITS.text, 'Ability'), item = text(base.item, PK.LIMITS.text, 'Held item');
  const ball = h('select', { 'aria-label': 'Ball' }, h('option', { value: '' }, 'Unknown'), PK.BALLS.map(b => h('option', { value: b }, b))); ball.value = base.ball;
  const moves = base.moves.map((m, i) => text(m, PK.LIMITS.text, 'Move ' + (i + 1)));
  const numRow = (vals, hi, label) => PK.STATS.map((s, i) => h('label', { class: 'pk-num' }, h('span', {}, s), h('input', { type: 'number', min: '0', max: String(hi), value: String(vals[i]), 'aria-label': `${label} ${s}` })));
  const ivs = numRow(base.ivs, 31, 'IV'), evs = numRow(base.evs, 252, 'EV');
  const vals = els => els.map(l => Number(l.querySelector('input').value));
  const ot = text(base.ot, PK.LIMITS.ot, 'Trainer name'), tid = h('input', { type: 'number', min: '0', max: '999999', value: String(base.tid), 'aria-label': 'Trainer ID' });
  const origin = text(base.origin, PK.LIMITS.text, 'Origin game', { list: 'pk-origins' }), originList = h('datalist', { id: 'pk-origins' }, Object.values(PK.FAMILIES).map(f => h('option', { value: f.name })));
  const met = text(base.met, PK.LIMITS.text, 'Met at'), notes = h('textarea', { rows: 3, maxlength: PK.LIMITS.notes, 'aria-label': 'Notes' }, base.notes);
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary', type: 'button' }, isNew ? 'Add Pokémon' : 'Save');
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'Add a Pokémon' : 'Edit Pokémon')),
    h('div', { class: 'mp pk-edit' }, dl, originList, base.raw ? h('p', { class: 'fine', style: 'padding:0 0 8px' }, 'This Pokémon came from a game file. If you change anything here it stops being exportable as a game file; the details are kept either way.') : null,
      h('div', { class: 'pk-ehead' }, prev, h('div', { style: 'flex:1' }, aiField('Species', spEl, 'Type a name or a number.'), aiField('Nickname', nick))),
      h('div', { class: 'two' }, aiField('Level', lvl), aiField('Gender', gender)),
      h('div', { class: 'pk-checks' }, h('label', { class: 'field check' }, shiny, h('span', {}, 'Shiny')), h('label', { class: 'field check' }, alpha, h('span', {}, 'Alpha')), h('label', { class: 'field check' }, egg, h('span', {}, 'Egg'))),
      h('div', { class: 'two' }, aiField('Nature', nature), aiField('Ball', ball)), h('div', { class: 'two' }, aiField('Ability', ability), aiField('Held item', item)),
      h('div', { class: 'two' }, aiField('Move 1', moves[0]), aiField('Move 2', moves[1])), h('div', { class: 'two' }, aiField('Move 3', moves[2]), aiField('Move 4', moves[3])),
      h('div', { class: 'field' }, h('span', {}, 'IVs (0 to 31)'), h('div', { class: 'pk-nums' }, ivs)), h('div', { class: 'field' }, h('span', {}, 'EVs (0 to 252 each, 510 at most in the games)'), h('div', { class: 'pk-nums' }, evs)),
      h('div', { class: 'two' }, aiField('Trainer name', ot), aiField('Trainer ID', tid)), h('div', { class: 'two' }, aiField('Origin game', origin), aiField('Met at', met)), aiField('Notes', notes),
      err, h('div', { class: 'btnrow' }, save))));
  save.addEventListener('click', async () => {
    const n = species(); if (!n) { err.textContent = 'Pick a species from the list, or type its number (1 to 1025).'; return; }
    const norm = PK.normMon({ species: n, nickname: nick.value.trim(), level: lvl.value, gender: gender.value, shiny: shiny.checked, alpha: alpha.checked, egg: egg.checked, nature: Number(nature.value), ability: ability.value.trim(), item: item.value.trim(), ball: ball.value,
      moves: moves.map(x => x.value.trim()), ivs: vals(ivs), evs: vals(evs), ot: ot.value.trim(), tid: tid.value, origin: origin.value.trim(), met: met.value.trim(), notes: notes.value });
    if (isNew) { const id = uid(); await pkSave(acct, { id, kind: 'pkm', bank: at.bank.id, box: at.box, slot: at.slot, ...norm }); pkSel = id; }
    else { const { raw, rawFmt, ...was } = PK.normMon(mon), { raw: r2, rawFmt: f2, ...now } = norm; await savePost(acct, { ...mon, ...norm, ...(JSON.stringify(was) === JSON.stringify(now) && mon.raw ? { raw: mon.raw, rawFmt: mon.rawFmt } : { raw: '', rawFmt: '' }) }); }
    close(); toast(isNew ? `${norm.nickname || nm[n - 1]} was added.` : 'Saved.'); render(true);
  });
  setTimeout(() => spEl.focus(), 0);
}
async function pkDuplicate(acct, ctx, D, m, bank) {
  const at = PK.firstFree(pkMons(ctx), bank, m.box); if (!at) return toast('That bank is full.');
  const { id, ...rest } = m; const nid = uid(); await savePost(acct, { ...rest, id: nid, box: at.box, slot: at.slot, createdAt: Date.now() }); pkSel = nid; toast('Copied to the next free slot.'); render(true);
}

/* ---------- boxes and banks ---------- */
function pkRenameBox(acct, bank, i) {
  const input = h('input', { value: (bank.boxNames || [])[i] || '', maxlength: 20, placeholder: 'Box ' + (i + 1), 'aria-label': 'Box name' });
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Rename box')),
    h('div', { class: 'mp' }, aiField('Name', input, 'Leave it empty to go back to "Box ' + (i + 1) + '".'), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      const names = [...(bank.boxNames || [])]; names[i] = input.value.trim().slice(0, 20); while (names.length && !names[names.length - 1]) names.pop();
      await savePost(acct, { ...bank, boxNames: names.map(n => n || '') }); close(); render(true);
    } }, 'Save')))));
  setTimeout(() => input.select(), 0);
}
function pkRenameBank(acct, bank) {
  const input = h('input', { value: bank.name, maxlength: 40, 'aria-label': 'Bank name' });
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Rename bank')),
    h('div', { class: 'mp' }, aiField('Name', input), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => { const n = input.value.trim(); if (!n) return; await savePost(acct, { ...bank, name: n.slice(0, 40) }); close(); render(true); } }, 'Save')))));
  setTimeout(() => input.select(), 0);
}
async function pkDeleteBank(acct, ctx, bank) {
  const mine = pkMons(ctx).filter(m => m.bank === bank.id);
  if (!confirm(mine.length ? `Delete "${bank.name}" and the ${plural(mine.length, 'Pokémon')} in it? Export it first if you want a copy. There is no undo.` : `Delete the empty bank "${bank.name}"?`)) return;
  for (const m of mine) await db.del('posts', m.id);
  await db.del('posts', bank.id); pkSel = null; pkHold = null; toast('Bank deleted.'); go('/apps/pokebank');
}
function pkSortModal(acct, ctx, D, bank, box) {
  const key = h('select', { 'aria-label': 'Sort by' }, Object.entries(PK.SORTS).map(([k, l]) => h('option', { value: k }, l)));
  const scope = h('select', { 'aria-label': 'What to sort' }, h('option', { value: 'box' }, `Only ${PK.boxName(bank, box)}`), h('option', { value: 'all' }, 'The whole bank'));
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Sort')),
    h('div', { class: 'mp' }, aiField('Sort by', key), aiField('Sort', scope, 'Sorting packs the Pokémon together from the first slot.'), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      const mons = pkMons(ctx), plan = PK.sortPlan(mons, bank, key.value, D.national, scope.value === 'box' ? box : null);
      for (const c of plan) { const m = mons.find(x => x.id === c.id); if (m.box !== c.box || m.slot !== c.slot) await savePost(acct, { ...m, box: c.box, slot: c.slot }); }
      close(); toast('Sorted.'); render(true);
    } }, 'Sort')))));
}
function pkSearchModal(acct, ctx, D, banks) {
  const q = h('input', { type: 'search', placeholder: 'Name, nickname, trainer or notes', value: pkFilter.q || '', 'aria-label': 'Search text' });
  const shiny = h('input', { type: 'checkbox', checked: !!pkFilter.shiny, 'aria-label': 'Only shiny' }), alpha = h('input', { type: 'checkbox', checked: !!pkFilter.alpha, 'aria-label': 'Only alpha' }), egg = h('input', { type: 'checkbox', checked: !!pkFilter.egg, 'aria-label': 'Only eggs' });
  const minIv = h('select', { 'aria-label': 'Minimum IV total' }, [0, 90, 120, 150, 180, 186].map(v => h('option', { value: String(v) }, v ? `${v} or more` : 'Any'))); minIv.value = String(pkFilter.minIv || 0);
  const ball = h('select', { 'aria-label': 'Ball' }, h('option', { value: '' }, 'Any'), PK.BALLS.map(b => h('option', { value: b }, b))); ball.value = pkFilter.ball || '';
  const out = h('div', { class: 'pd-results' });
  const run = () => {
    pkFilter = { q: q.value, shiny: shiny.checked, alpha: alpha.checked, egg: egg.checked, minIv: Number(minIv.value), ball: ball.value };
    const hits = PK.filterMons(pkMons(ctx), pkFilter, D.national);
    out.replaceChildren(hits.length ? h('div', { class: 'pd-list' }, hits.slice(0, 80).map(m => { const r = pkResultRow(D, m, banks); r.addEventListener('click', () => { document.querySelector('.modal-bg')?.remove(); }); return r; })) : h('p', { class: 'muted' }, 'Nothing matches.'), hits.length > 80 ? h('p', { class: 'fine' }, `Showing 80 of ${hits.length}.`) : null);
  };
  [q, shiny, alpha, egg, minIv, ball].forEach(el => el.addEventListener(el === q ? 'input' : 'change', run)); run();
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Search every bank')),
    h('div', { class: 'mp' }, q, h('div', { class: 'pk-checks' }, h('label', { class: 'field check' }, shiny, h('span', {}, 'Shiny')), h('label', { class: 'field check' }, alpha, h('span', {}, 'Alpha')), h('label', { class: 'field check' }, egg, h('span', {}, 'Egg'))),
      h('div', { class: 'two' }, aiField('IV total', minIv), aiField('Ball', ball)), out)));
  setTimeout(() => q.focus(), 0);
}

/* ---------- files: banks and cards ---------- */
const pkFile = s => (s.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'pokemon');
async function pkExportBank(bank, mons) {
  const r = await saveFile(pkFile(bank.name) + '.bank.json', 'application/json', JSON.stringify(PK.exportBank(bank, mons.filter(m => m.bank === bank.id)), null, 1));
  toast(r.ok ? `Saved to ${r.where}.` : r.where);
}
async function pkExportCard(m, bank) {
  const r = await saveFile(pkFile(PK.monName(m, window.PokeDex ? window.PokeDex.national : [])) + '.pkm.json', 'application/json', JSON.stringify(PK.exportCard(m, bank && bank.family), null, 1));
  toast(r.ok ? `Saved to ${r.where}. Send the file to a friend and they can import it.` : r.where);
}
function pkPickFile(accept, then, multiple = false) {
  const input = h('input', { type: 'file', accept, hidden: true, multiple });
  input.addEventListener('change', async () => { const fs = [...input.files]; input.remove(); if (fs.length) then(multiple ? fs : fs[0]); });
  input.addEventListener('cancel', () => input.remove());
  document.body.append(input); input.click();
}
function pkImportBank(acct, ctx) {
  pkPickFile('.json,application/json', async f => {
    if (f.size > 20 * 1024 * 1024) return toast('That file is too big to be a bank.');
    const r = PK.importBank(await f.text()); if (!r.ok) return toast(r.error);
    const id = uid(), t = Date.now(); await pkSave(acct, { id, kind: 'pkbank', name: r.bank.name, family: r.bank.family, boxNames: r.bank.boxNames });
    for (const e of r.mons) await savePost(acct, { id: uid(), accountId: acct.id, kind: 'pkm', bank: id, box: e.box, slot: e.slot, createdAt: t, ...e.mon });
    toast(`Imported ${r.bank.name} with ${plural(r.mons.length, 'Pokémon')}${r.skipped ? ` (${r.skipped} could not be used)` : ''}.`); go('/apps/pokebank/' + id);
  });
}
function pkImportCard(acct, ctx, D, bank) {
  const banks = pkBanks(ctx); if (!banks.length) return toast('Make a bank first.');
  pkPickFile('.json,application/json', async f => {
    if (f.size > 1024 * 1024) return toast('That file is too big to be a card.');
    const r = PK.importCard(await f.text()); if (!r.ok) return toast(r.error);
    const target = bank || banks.find(b => b.family === r.family) || banks[0], at = PK.firstFree(pkMons(ctx), target);
    if (!at) return toast(`${target.name} is full.`);
    const id = uid(); await pkSave(acct, { id, kind: 'pkm', bank: target.id, ...at, ...r.mon }); pkSel = id; pkLeft = { bank: target.id, box: at.box };
    toast(`${PK.monName(r.mon, D.national)} was added to ${target.name}.`); go('/apps/pokebank/' + target.id);
  });
}

/* ---------- game files: .pk8 / .pk9 / ... and pkHouse bank files (.bin) ---------- */
const GAME_EXTS = '.pk3,.pb7,.pk8,.pb8,.pa8,.pk9,.pa9';
const bytesOf = async f => new Uint8Array(await f.arrayBuffer());
const extOf = n => (/\.([A-Za-z0-9]+)$/.exec(n) || [])[1] || '';
function pkImportFiles(acct, ctx, D, bank) {
  const banks = pkBanks(ctx); if (!banks.length) return toast('Make a bank first.');
  pkPickFile(GAME_EXTS, async files => {
    const X = await loadPkData(); let added = 0, bad = 0, full = 0, target = bank, last = null;
    for (const f of files.slice(0, 200)) {
      if (f.size > 1024) { bad++; continue; }
      const bytes = await bytesOf(f), fmt = X.detect(bytes, extOf(f.name));
      const tb = target || banks.find(b => PkmParse.FAMILY_FORMAT[b.family] === fmt) || banks[0];
      if (!fmt) { bad++; continue; }
      const p = X.parse(bytes, fmt, PkmParse.FAMILY_FORMAT[tb.family] === fmt ? tb.family : ({ pk3: 'frlg', pb7: 'lgpe', pk8: 'swsh', pa8: 'la', pa9: 'sv' })[fmt]);
      if (!p) { bad++; continue; }
      const free = PK.firstFree(await pkLive(acct, tb), tb); if (!free) { full++; continue; }
      const id = uid(); await pkSave(acct, { id, kind: 'pkm', bank: tb.id, ...free, ...PK.normMon({ ...p.mon, raw: p.raw, rawFmt: p.fmt }) }); added++; last = { id, tb };
    }
    toast([added ? `Added ${plural(added, 'Pokémon')}.` : '', bad ? `${bad} file${bad === 1 ? ' was' : 's were'} not a readable Pokémon file.` : '', full ? 'The bank is full.' : ''].filter(Boolean).join(' ') || 'Nothing was added.');
    if (last) { pkSel = last.id; pkLeft = { bank: last.tb.id, box: 0 }; go('/apps/pokebank/' + last.tb.id); }
  }, true);
}
const pkLive = async (acct, bank) => (await loadPosts(acct)).filter(p => p.kind === 'pkm');
function pkImportBin(acct, ctx) {
  pkPickFile('.bin,application/octet-stream', async f => {
    const X = await loadPkData(), bytes = await bytesOf(f), parsed = X.parseBank(bytes);
    if (!parsed.ok) return toast(parsed.error);
    const choose = parsed.families.length > 1 ? await new Promise(res => {
      const sel = h('select', { 'aria-label': 'Which game' }, parsed.families.map(k => h('option', { value: k }, pkFamilyName(k)))); sel.value = parsed.defaultFamily;
      const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => { close(); res(null); } }, icon('x')), h('b', {}, 'Which game is this bank for?')),
        h('div', { class: 'mp' }, h('p', { class: 'muted', style: 'margin-top:0' }, 'pkHouse uses the same file layout for several games. Pick the one it belongs to.'), aiField('Game', sel), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); res(sel.value); } }, 'Import')))));
    }) : parsed.families[0];
    if (!choose) return;
    const r = X.readBank(parsed, choose), id = uid(), t = Date.now();
    await pkSave(acct, { id, kind: 'pkbank', name: f.name.replace(/\.bin$/i, '').slice(0, 40) || 'pkHouse bank', family: choose, boxNames: r.boxNames });
    for (const e of r.entries) await savePost(acct, { id: uid(), accountId: acct.id, kind: 'pkm', bank: id, box: e.box, slot: e.slot, createdAt: t, ...PK.normMon({ ...e.mon, raw: e.raw, rawFmt: e.fmt }) });
    toast(`Imported ${plural(r.entries.length, 'Pokémon')}${r.skipped ? ` (${r.skipped} slots could not be read)` : ''}.`); go('/apps/pokebank/' + id);
  });
}
async function pkExportGameFile(m, D) {
  const bytes = PkmParse.unb64(m.raw), name = pkFile(PK.monName(m, D.national)) + '.' + PkmParse.fileExt(m.rawFmt);
  const r = await saveFile(name, 'application/octet-stream', bytes); toast(r.ok ? `Saved to ${r.where}. PKHeX and pkHouse can open it.` : r.where);
}
async function pkExportBin(bank, mons) {
  const mine = mons.filter(m => m.bank === bank.id), built = PkmParse.buildBank(bank.family, mine.map(m => ({ box: m.box, slot: m.slot, raw: m.raw, fmt: m.rawFmt })), bank.boxNames || []);
  const r = await saveFile(pkFile(bank.name) + '.bin', 'application/octet-stream', built.bytes);
  toast(r.ok ? `Saved ${plural(built.written, 'Pokémon')} to ${r.where}.${mine.length > built.written ? ` ${mine.length - built.written} that were typed in by hand are not in it.` : ''}` : r.where);
}

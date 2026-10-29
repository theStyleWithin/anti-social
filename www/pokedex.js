'use strict';
/* Pokédex: browse every Pokémon by game region, see each one's page, and keep track of what you have caught.
   Data and pictures come from pkDex (https://github.com/Insektaure/pkDex, GPL-2.0). Everything works offline. */
const PC = PokeCore;
let pdQuery = '', pdFilter = 'all', pdMulti = false, pdSel = new Set(), pdShiny = false, pdLoadP = null, pdShown = 120;
const loadPokedex = () => pdLoadP || (pdLoadP = new Promise((res, rej) => {
  if (window.PokeDex) return res(window.PokeDex);
  const s = document.createElement('script'); s.src = 'pokedex/data.js';
  s.onload = () => res(window.PokeDex); s.onerror = () => { pdLoadP = null; rej(new Error('pokedex data missing')); };
  document.head.append(s);
}));
let palLoadP = null;
const loadPals = () => palLoadP || (palLoadP = new Promise((res, rej) => {
  if (window.PalDex) return res(window.PalDex);
  const s = document.createElement('script'); s.src = 'palworld/data.js';
  s.onload = () => res(window.PalDex); s.onerror = () => { palLoadP = null; rej(new Error('paldeck data missing')); };
  document.head.append(s);
}));
const RARITY_COLOR = { Common: '#8a8f98', Rare: '#3b82f6', Epic: '#a855f7', Legendary: '#e0a100' };
const pdImg = (kind, n) => `pokedex/img/${kind}/${PC.pad3(n)}.png`;
const pdMarks = ctx => PC.normMarks(ctx.apps.dexmark[0] && ctx.apps.dexmark[0].marks);
const pdSaveMarks = async (acct, marks) => { await savePost(acct, { id: 'dexmark' + acct.id, accountId: acct.id, kind: 'dexmark', marks, createdAt: 1 }); render(true); };
const pdStateIcon = k => h('img', { class: 'pd-state ' + k, src: `pokedex/img/states/${{ caught: 'pokeball', shiny: 'shiny', alpha: 'alpha', shinyAlpha: 'shiny_alpha' }[k]}.png`, alt: '', draggable: 'false' });

// the species of one region (or all of them), as plain rows
function pdRows(D, rid) {
  if (rid === 'palworld') return window.PalDex.pals.map(([name, num, rar], i) => ({ n: i + 1, reg: num === '—' ? '' : num, name, type: rar, sl: 0, pal: true, img: `palworld/img/${PC.pad3(i + 1)}.webp` }));
  if (rid === 'national') return D.national.map((e, i) => ({ n: i + 1, reg: '', name: e[0], type: e[1], sl: 0 }));
  return (D.dex[rid] || []).map(r => ({ n: r[0], reg: r[1], name: D.national[r[0] - 1][0], type: D.national[r[0] - 1][1], sl: r[2], evo: r[3], loc: r[4], ex: r[5] }));
}
const pdRegion = (D, rid) => rid === 'palworld' ? { id: 'palworld', name: 'Paldeck', game: 'Palworld · every Pal', alpha: 0, dlc: 0, child: 0, pal: true } : rid === 'national' ? { id: 'national', name: 'National Pokédex', game: 'Every Pokémon, 1 to 1025', alpha: 0, dlc: 0, child: 0 } : D.regions.find(r => r.id === rid);
// everything the data says about one species, across all regions
const pdInfo = (D, n) => D.regions.map(r => { const row = (D.dex[r.id] || []).find(x => x[0] === n); return row ? { region: r, reg: row[1], sl: row[2], evo: row[3], loc: row[4], ex: row[5] } : null; }).filter(Boolean);

function pokedexView(acct, ctx, back, arg) {
  const parts = location.hash.split('/'), rid = parts[3] || '', n = Number(parts[4]) || 0;
  const title = appName(acct, 'pokedex');
  const box = h('div', {}, h('p', { class: 'muted', style: 'padding:16px' }, 'Loading...'));
  loadPokedex().then(async D => {
    await loadPals().catch(() => null);
    const marks = pdMarks(ctx);
    if (rid && !pdRegion(D, rid)) return box.replaceChildren(emptyState('No such region', 'That Pokédex is not here.'));
    box.replaceChildren(...(rid && n ? pdDetail(acct, ctx, D, marks, rid, n) : rid ? pdRegionView(acct, ctx, D, marks, rid) : pdHome(acct, ctx, D, marks)).filter(Boolean));
  }).catch(() => box.replaceChildren(h('p', { class: 'err', style: 'padding:16px' }, 'The Pokédex could not be loaded.')));
  return [back(title), box];
}

/* ---------- the list of regions ---------- */
function pdHome(acct, ctx, D, marks) {
  const tile = r => {
    const ns = pdRows(D, r.id).map(x => x.n), p = PC.progress(marks, r.id, ns), pct = Math.round(p.caught / p.total * 100);
    return h('a', { class: 'pd-region', href: '#/apps/pokedex/' + r.id },
      h('div', { class: 'pd-r-top' }, h('b', {}, r.name), r.dlc ? h('span', { class: 'badge' }, 'DLC') : null),
      h('small', {}, r.game),
      h('div', { class: 'pd-bar', role: 'progressbar', 'aria-valuenow': String(p.caught), 'aria-valuemax': String(p.total), 'aria-label': `${r.name} progress` }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'pd-r-num' }, `${p.caught} / ${p.total}`, p.shiny ? h('span', { class: 'pd-shiny-n' }, pdStateIcon('shiny'), p.shiny) : null));
  };
  const input = h('input', { type: 'search', placeholder: 'Search every Pokémon by name, number or type', value: pdQuery, 'aria-label': 'Search every Pokémon' });
  const results = h('div', { class: 'pd-results' });
  const all = pdRows(D, 'national');
  const paint = () => {
    const q = input.value; pdQuery = q;
    if (!q.trim()) { results.replaceChildren(); return; }
    const hits = PC.search(all, q);
    results.replaceChildren(hits.length ? h('div', { class: 'pd-list' }, hits.slice(0, 60).map(x => h('a', { class: 'pd-row', href: `#/apps/pokedex/national/${x.n}` }, h('img', { src: pdImg('icons', x.n), alt: '', loading: 'lazy' }), h('span', {}, h('b', {}, x.name), h('small', {}, ` #${PC.pad3(x.n)} · ${x.type}`))))) : h('p', { class: 'muted' }, 'Nothing by that name.'), hits.length > 60 ? h('p', { class: 'fine' }, `Showing 60 of ${hits.length}. Keep typing.`) : null);
  };
  input.addEventListener('input', paint); paint();
  const natProg = PC.progress(marks, 'national', all.map(x => x.n));
  return [
    h('div', { class: 'app-pad' },
      h('p', { class: 'muted', style: 'margin-top:0' }, `${natProg.caught} of ${natProg.total} caught in the National Pokédex. Pick a game to see its Pokémon and mark what you have.`),
      input, results),
    h('div', { class: 'app-pad' }, h('h3', {}, 'Pokédexes'), h('div', { class: 'pd-regions' }, tile({ id: 'national', name: 'National Pokédex', game: 'All 1025 species', dlc: 0 }), D.regions.filter(r => !r.dlc).map(tile))),
    h('div', { class: 'app-pad' }, h('h3', {}, 'Expansions (DLC)'), h('div', { class: 'pd-regions' }, D.regions.filter(r => r.dlc).map(tile))),
    window.PalDex ? h('div', { class: 'app-pad' }, h('h3', {}, 'Palworld'), h('div', { class: 'pd-regions' }, tile(pdRegion(D, 'palworld')))) : null,
    pdCredit(),
  ];
}
const pdCredit = () => h('p', { class: 'fine pd-credit' }, 'Pokédex data and pictures come from ', h('b', {}, 'pkDex'), ' by Insektaure (GPL-2.0). Pokémon and its names, artwork and trademarks belong to Nintendo, Creatures, GAME FREAK and The Pokémon Company. This app is not affiliated with or endorsed by them.');

/* ---------- one region ---------- */
function pdRegionView(acct, ctx, D, marks, rid) {
  const region = pdRegion(D, rid), rows = pdRows(D, rid), flags = PC.flagsFor(region).map(([k, l]) => [k, region.pal && k === 'shiny' ? 'Lucky' : l]);
  const prog = PC.progress(marks, rid, rows.map(r => r.n));
  const FILTERS = [['all', 'All'], ['caught', 'Caught'], ['missing', 'Not caught'], ['shiny', region.pal ? 'Lucky' : 'Shiny'], ['noshiny', region.pal ? 'Caught, not lucky' : 'Caught, not shiny'], ...(region.alpha ? [['alpha', 'Alpha']] : [])];
  if (!FILTERS.some(f => f[0] === pdFilter)) pdFilter = 'all';
  const passes = r => { const v = PC.getMark(marks, rid, r.n); return pdFilter === 'all' || (pdFilter === 'caught' && v & 1) || (pdFilter === 'missing' && !(v & 1)) || (pdFilter === 'shiny' && v & 10) || (pdFilter === 'noshiny' && v & 1 && !(v & 10)) || (pdFilter === 'alpha' && v & 12); };
  let list = PC.search(rows, pdQuery).filter(passes);
  const total = list.length; list = list.slice(0, pdShown);
  const search = h('input', { type: 'search', placeholder: 'Search this Pokédex', value: pdQuery, 'aria-label': 'Search this Pokédex' });
  let t; search.addEventListener('input', () => { pdQuery = search.value; pdShown = 120; clearTimeout(t); t = setTimeout(() => render(true).then(() => { const el = document.querySelector('.pd-tools input[type=search]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }), 200); });
  const filter = h('select', { 'aria-label': 'Show' }, FILTERS.map(([v, l]) => h('option', { value: v }, l))); filter.value = pdFilter;
  filter.addEventListener('change', () => { pdFilter = filter.value; pdShown = 120; render(true); });
  const mark = (n, flag, on) => pdSaveMarks(acct, PC.setMark(marks, rid, n, flag, on));
  const tile = r => {
    const v = PC.getMark(marks, rid, r.n), sel = pdSel.has(r.n);
    return h('div', { class: 'pd-tile' + (v & 1 ? ' got' : '') + (sel ? ' sel' : '') },
      h('a', { class: 'pd-open', href: `#/apps/pokedex/${rid}/${r.n}`, 'aria-label': `${r.name}, number ${PC.pad3(r.n)}`, onclick: e => { if (pdMulti) { e.preventDefault(); pdSel.has(r.n) ? pdSel.delete(r.n) : pdSel.add(r.n); render(true); } } },
        h('img', { src: r.img || pdImg('icons', r.n), alt: '', loading: 'lazy', draggable: 'false' }), h('span', { class: 'pd-num' }, '#' + (r.reg || PC.pad3(r.n))), h('span', { class: 'pd-name' }, r.name)),
      h('span', { class: 'pd-marks' }, v & 1 ? pdStateIcon('caught') : null, v & 2 ? pdStateIcon('shiny') : null, v & 4 ? pdStateIcon('alpha') : null, v & 8 ? pdStateIcon('shinyAlpha') : null),
      pdMulti ? h('span', { class: 'pd-check', 'aria-hidden': 'true' }, sel ? icon('check') : null) : h('button', { class: 'pd-quick', type: 'button', 'aria-label': (v & 1 ? 'Unmark ' : 'Mark ') + r.name + ' as caught', 'aria-pressed': String(!!(v & 1)), title: v & 1 ? 'Caught' : 'Mark as caught', onclick: () => mark(r.n, 'caught', !(v & 1)) }, icon('check')));
  };
  const multiBar = pdMulti ? h('div', { class: 'pd-multi', role: 'toolbar', 'aria-label': 'Selected Pokémon' },
    h('b', {}, `${pdSel.size} selected`),
    h('button', { class: 'btn', type: 'button', onclick: () => { list.forEach(r => pdSel.add(r.n)); render(true); } }, 'Select shown'),
    h('button', { class: 'btn', type: 'button', onclick: () => { pdSel.clear(); render(true); } }, 'Select none'),
    flags.map(([k, l]) => h('span', { class: 'pd-pair' }, h('button', { class: 'btn', type: 'button', disabled: !pdSel.size, onclick: () => pdSaveMarks(acct, PC.setMany(marks, rid, [...pdSel], k, true)) }, '+ ' + l), h('button', { class: 'btn', type: 'button', disabled: !pdSel.size, 'aria-label': 'Clear ' + l, onclick: () => pdSaveMarks(acct, PC.setMany(marks, rid, [...pdSel], k, false)) }, '− ' + l)))) : null;
  return [
    h('div', { class: 'app-pad' },
      h('div', { class: 'pd-head' }, h('div', {}, h('h2', { style: 'margin:0' }, region.name), h('small', { class: 'muted' }, region.game)), h('div', { class: 'pd-sum' }, h('b', {}, `${prog.caught} / ${prog.total}`), ' caught', prog.shiny ? [' · ', h('b', {}, prog.shiny), region.pal ? ' lucky' : ' shiny'] : null, region.alpha && prog.alpha + prog.shinyAlpha ? [' · ', h('b', {}, prog.alpha + prog.shinyAlpha), ' alpha'] : null)),
      h('div', { class: 'pd-bar big', role: 'progressbar', 'aria-valuenow': String(prog.caught), 'aria-valuemax': String(prog.total), 'aria-label': 'Progress' }, h('i', { style: `width:${prog.total ? Math.round(prog.caught / prog.total * 100) : 0}%` })),
      h('div', { class: 'pd-tools' }, search, filter,
        h('button', { class: 'btn' + (pdMulti ? ' primary' : ''), type: 'button', 'aria-pressed': String(pdMulti), onclick: () => { pdMulti = !pdMulti; pdSel.clear(); render(true); } }, 'Multi-select'),
        h('button', { class: 'btn', type: 'button', onclick: () => pdBulk(acct, marks, region, rows, flags) }, 'Bulk actions'))),
    multiBar,
    list.length ? h('div', { class: 'pd-grid' }, list.map(tile)) : emptyState(pdQuery || pdFilter !== 'all' ? 'Nothing matches' : 'Empty', pdQuery || pdFilter !== 'all' ? 'Try another search or filter.' : 'This Pokédex has no entries.'),
    total > list.length ? h('div', { class: 'btnrow', style: 'padding:12px 16px' }, h('button', { class: 'btn', type: 'button', onclick: () => { pdShown += 120; render(true); } }, `Show more (${total - list.length} left)`)) : null,
    pdCredit(),
  ];
}
function pdBulk(acct, marks, region, rows, flags) {
  const ns = rows.map(r => r.n);
  const act = (k, l, on) => h('button', { class: 'btn' + (on ? '' : ' danger'), type: 'button', onclick: async () => {
    if (!on && !confirm(`Clear "${l}" for all ${ns.length} Pokémon in ${region.name} (${region.game})?`)) return;
    close(); await pdSaveMarks(acct, PC.setMany(marks, region.id, ns, k, on)); toast(on ? `Marked everything as ${l.toLowerCase()}.` : `Cleared ${l.toLowerCase()}.`);
  } }, (on ? 'Mark all ' : 'Clear all ') + l.toLowerCase());
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Bulk actions')),
    h('div', { class: 'mp' }, h('p', { class: 'muted', style: 'margin-top:0' }, `This changes every Pokémon in ${region.name} (${region.game}), not just the ones on screen.`),
      flags.map(([k, l]) => h('div', { class: 'btnrow', style: 'margin-bottom:8px' }, act(k, l, true), act(k, l, false))),
      h('div', { class: 'btnrow', style: 'margin-top:12px' }, h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (!confirm(`Forget everything you marked in ${region.name} (${region.game})?`)) return; close(); await pdSaveMarks(acct, PC.clearRegion(marks, region.id)); toast('Cleared.'); } }, 'Reset this Pokédex')))));
}

/* ---------- one Pokémon ---------- */
function pdDetail(acct, ctx, D, marks, rid, n) {
  if (rid === 'palworld') return pdPalDetail(acct, D, marks, n);
  const region = pdRegion(D, rid), rows = pdRows(D, rid), i = rows.findIndex(r => r.n === n);
  if (i < 0) return [emptyState('Not in this Pokédex', `${D.national[n - 1] ? D.national[n - 1][0] : 'That Pokémon'} is not in ${region.name}.`), h('div', { class: 'btnrow', style: 'padding:0 16px' }, h('a', { class: 'btn', href: `#/apps/pokedex/national/${n}` }, 'See it in the National Pokédex'))];
  const row = rows[i], info = rid === 'national' ? pdInfo(D, n) : null, v = PC.getMark(marks, rid, n), flags = PC.flagsFor(region);
  const types = PC.parseTypes(row.type), prev = rows[i - 1], next = rows[i + 1], names = D.national.map(e => e[0]);
  const go = x => `#/apps/pokedex/${rid}/${x.n}`;
  const sprite = h('img', { class: 'pd-sprite', alt: row.name, src: pdImg(pdShiny ? 'shiny' : 'full', n), draggable: 'false' });
  const regular = h('button', { class: 'btn' + (!pdShiny ? ' primary' : ''), type: 'button', 'aria-pressed': String(!pdShiny), onclick: () => { pdShiny = false; render(true); } }, 'Regular');
  const shiny = h('button', { class: 'btn' + (pdShiny ? ' primary' : ''), type: 'button', 'aria-pressed': String(pdShiny), onclick: () => { pdShiny = true; render(true); } }, 'Shiny');
  const linked = text => PC.linkNames(text, names).map(p => {
    if (!p.mon) return p.t;
    const to = D.national.findIndex(e => e[0] === p.mon) + 1, inRegion = rows.find(r => r.n === to);
    return to && to !== n ? h('a', { class: 'pd-link', href: inRegion ? go(inRegion) : `#/apps/pokedex/national/${to}` }, p.t) : p.t;
  });
  const field = (label, value) => value && value !== '-' ? h('div', { class: 'pd-field' }, h('small', {}, label), h('div', {}, value)) : null;
  const games = info && info.length ? h('div', { class: 'pd-field' }, h('small', {}, 'Found in'), h('div', { class: 'pd-chips' }, info.map(x => h('a', { class: 'chip', href: `#/apps/pokedex/${x.region.id}/${n}` }, x.region.tag)))) : null;
  return [
    h('div', { class: 'pd-detail' },
      h('div', { class: 'pd-nav' }, prev ? h('a', { class: 'btn', href: go(prev), 'aria-label': 'Previous: ' + prev.name }, '‹ ' + prev.name) : h('span'), h('a', { class: 'btn', href: '#/apps/pokedex/' + rid }, region.name), next ? h('a', { class: 'btn', href: go(next), 'aria-label': 'Next: ' + next.name }, next.name + ' ›') : h('span')),
      h('div', { class: 'pd-card' },
        h('div', { class: 'pd-art' }, sprite, h('div', { class: 'btnrow center' }, regular, shiny)),
        h('div', { class: 'pd-info' },
          h('h2', { style: 'margin:0' }, row.name), h('div', { class: 'muted' }, `National #${PC.pad3(n)}`, row.reg ? ` · ${region.name} #${row.reg}` : ''),
          h('div', { class: 'pd-chips', style: 'margin:8px 0' }, types.map(t => h('span', { class: 'type-pill', style: `background:${PC.TYPE_COLOR[t]};color:${PC.typeText(PC.TYPE_COLOR[t])}` }, t)), row.type && !types.length ? h('span', { class: 'muted' }, row.type) : null),
          row.sl ? h('div', { class: 'pd-lock' }, pdStateIcon('shiny'), ' Shiny locked in this game') : null,
          field('Exclusive to', row.ex), field('Evolution', row.evo ? linked(row.evo) : ''), field('Where to find it', row.loc), games,
          !row.evo && !row.loc && rid === 'national' && !(info && info.length) ? h('p', { class: 'muted' }, 'None of the supported games lists this Pokémon.') : null,
          info && info.length ? info.map(x => h('div', { class: 'pd-field' }, h('small', {}, x.region.game), h('div', {}, x.loc || ''), x.ex && x.ex !== '-' ? h('div', { class: 'muted' }, 'Exclusive to ' + x.ex) : null)) : null)),
      h('div', { class: 'pd-status' }, h('h3', { style: 'margin:0 0 8px' }, 'Your Pokédex'),
        h('div', { class: 'btnrow' }, flags.map(([k, l]) => h('button', { class: 'btn' + (v & PC.FLAG[k] ? ' primary' : ''), type: 'button', 'aria-pressed': String(!!(v & PC.FLAG[k])), disabled: !!(k !== 'caught' && row.sl && (k === 'shiny' || k === 'shinyAlpha')), onclick: () => pdSaveMarks(acct, PC.setMark(marks, rid, n, k, !(v & PC.FLAG[k]))) }, pdStateIcon(k), ' ', l))),
        typeof pkAddFromDex === 'function' ? h('div', { class: 'btnrow', style: 'margin-top:10px' }, h('button', { class: 'btn', type: 'button', onclick: () => pkAddFromDex(acct, ctx, n) }, 'Add to my Pokémon Bank')) : null)),
    pdCredit(),
  ];
}

/* ---------- Palworld ---------- */
function pdPalDetail(acct, D, marks, n) {
  const rows = pdRows(D, 'palworld'), i = rows.findIndex(r => r.n === n);
  if (i < 0) return [emptyState('No such Pal', 'That Pal is not in the Paldeck.')];
  const row = rows[i], v = PC.getMark(marks, 'palworld', n), prev = rows[i - 1], next = rows[i + 1], go = x => `#/apps/pokedex/palworld/${x.n}`;
  const color = RARITY_COLOR[row.type] || '#8a8f98', variant = /[A-Z]$/.test(row.reg), base = variant ? rows.find(r => r.reg === row.reg.slice(0, -1)) : null;
  return [
    h('div', { class: 'pd-detail' },
      h('div', { class: 'pd-nav' }, prev ? h('a', { class: 'btn', href: go(prev), 'aria-label': 'Previous: ' + prev.name }, '‹ ' + prev.name) : h('span'), h('a', { class: 'btn', href: '#/apps/pokedex/palworld' }, 'Paldeck'), next ? h('a', { class: 'btn', href: go(next), 'aria-label': 'Next: ' + next.name }, next.name + ' ›') : h('span')),
      h('div', { class: 'pd-card' },
        h('div', { class: 'pd-art' }, h('img', { class: 'pd-sprite', alt: row.name, src: row.img, draggable: 'false' })),
        h('div', { class: 'pd-info' }, h('h2', { style: 'margin:0' }, row.name), h('div', { class: 'muted' }, row.reg ? `Paldeck #${row.reg}` : 'Not numbered yet'),
          h('div', { class: 'pd-chips', style: 'margin:8px 0' }, h('span', { class: 'type-pill', style: `background:${color};color:${PC.typeText(color)}` }, row.type)),
          base ? h('div', { class: 'pd-field' }, h('small', {}, 'Variant of'), h('a', { class: 'pd-link', href: go(base) }, base.name)) : null,
          !row.reg ? h('p', { class: 'muted' }, 'This one has no name or number yet in the list this Paldeck came from.') : null)),
      h('div', { class: 'pd-status' }, h('h3', { style: 'margin:0 0 8px' }, 'Your Paldeck'),
        h('div', { class: 'btnrow' }, [['caught', 'Caught'], ['shiny', 'Lucky']].map(([k, l]) => h('button', { class: 'btn' + (v & PC.FLAG[k] ? ' primary' : ''), type: 'button', 'aria-pressed': String(!!(v & PC.FLAG[k])), onclick: () => pdSaveMarks(acct, PC.setMark(marks, 'palworld', n, k, !(v & PC.FLAG[k]))) }, pdStateIcon(k), ' ', l))))),
    h('p', { class: 'fine pd-credit' }, 'Pal names, numbers, rarity and icons come from a Paldeck list made from palworld.gg. Palworld and its Pals belong to Pocketpair, Inc.; this app is not affiliated with or endorsed by them.'),
  ];
}

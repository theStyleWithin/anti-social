'use strict';
/* Achievements: keep your video game achievements and score, offline. Add games and achievements by hand, paste a list,
   or bring in a Steam or RetroAchievements reply you saved as JSON (or a CSV). Nothing here goes online. */
const AV = AchCore;
let avTab = 'games', avQuery = '', avPlat = '', avSort = 'recent', avFilter = 'all', avAq = '', avAsort = 'order', avShown = 150;
const avGames = ctx => ctx.apps.agame, avAchs = ctx => ctx.apps.ach;
const avDate = t => t ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'date unknown';
const avBatch = async (items, fn, size = 25) => { for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn)); };
const avSave = (acct, rec) => savePost(acct, { accountId: acct.id, createdAt: Date.now(), ...rec });
const avPlatBadge = g => h('span', { class: 'av-plat', style: `--c:${AV.platform(g.platform).color}` }, g.platform === 'ra' && g.console ? g.console : AV.platform(g.platform).name);
function avCover(g, cls = '') {
  const c = AV.platform(g.platform).color;
  return g.coverImg ? h('img', { class: 'av-cover ' + cls, src: g.coverImg, alt: '', loading: 'lazy' }) : h('div', { class: 'av-cover letter ' + cls, style: `background:${c}`, 'aria-hidden': 'true' }, (g.name || '?')[0].toUpperCase());
}
const avBar = (pct, label) => h('div', { class: 'pd-bar', role: 'progressbar', 'aria-valuenow': String(Math.round(pct)), 'aria-valuemax': '100', 'aria-label': label || 'Progress' }, h('i', { style: `width:${Math.min(100, pct)}%` }));

function achievementsView(acct, ctx, back) {
  const gameId = location.hash.split('/')[3] || '', game = gameId && avGames(ctx).find(g => g.id === gameId);
  const title = appName(acct, 'achv');
  if (gameId && !game) return [back(title), emptyState('Game not found', 'That game is gone.')];
  return game ? avGameView(acct, ctx, back, game) : avHome(acct, ctx, back, title);
}

/* ---------- home ---------- */
function avHome(acct, ctx, back, title) {
  const games = avGames(ctx), achs = avAchs(ctx), ov = AV.overall(games, achs), by = AV.byGame(achs);
  const hero = h('div', { class: 'av-hero' },
    [[ov.unlocked.toLocaleString(), `of ${ov.total.toLocaleString()} achievements`], [ov.earned.toLocaleString(), `of ${ov.points.toLocaleString()} points`], [ov.complete, ov.complete === 1 ? 'game completed' : 'games completed'], [ov.avgPct + '%', 'average completion']].map(([n, l]) => h('div', { class: 'av-stat' }, h('b', {}, n), h('small', {}, l))));
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['games', 'Games'], ['recent', 'Recent'], ['stats', 'Stats']].map(([k, l]) => h('button', { role: 'tab', 'aria-selected': String(avTab === k), class: avTab === k ? 'active' : '', onclick: () => { avTab = k; render(true); } }, l)));
  const bar = back(title, { action: h('button', { class: 'btn primary', type: 'button', onclick: () => avGameEditor(acct, ctx, null) }, 'Add game') });
  if (!games.length) return [bar, h('div', { class: 'app-pad' }, emptyState('No games yet', 'Add a game, then its achievements: type them, paste a list, or import a Steam or RetroAchievements file. It all stays on this device.'),
    h('div', { class: 'btnrow center' }, h('button', { class: 'btn primary', type: 'button', onclick: () => avGameEditor(acct, ctx, null) }, 'Add a game'), h('button', { class: 'btn', type: 'button', onclick: () => avImport(acct, ctx, null) }, 'Import a file')))];
  return [bar, hero, tabs, ...(avTab === 'recent' ? avRecent(ctx) : avTab === 'stats' ? avStats(ctx, ov) : avGameList(acct, ctx, games, achs, by))];
}
function avGameList(acct, ctx, games, achs, by) {
  const q = h('input', { type: 'search', placeholder: 'Search your games', value: avQuery, 'aria-label': 'Search your games' });
  let t; q.addEventListener('input', () => { avQuery = q.value; clearTimeout(t); t = setTimeout(() => render(true).then(() => { const el = document.querySelector('.av-tools input[type=search]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }), 200); });
  const plat = h('select', { 'aria-label': 'Platform' }, h('option', { value: '' }, 'All platforms'), AV.PLATFORMS.filter(p => games.some(g => g.platform === p.id)).map(p => h('option', { value: p.id }, p.name))); plat.value = avPlat;
  plat.addEventListener('change', () => { avPlat = plat.value; render(true); });
  const sort = h('select', { 'aria-label': 'Sort games' }, Object.entries(AV.GAME_SORTS).map(([k, l]) => h('option', { value: k }, 'Sort: ' + l))); sort.value = avSort;
  sort.addEventListener('change', () => { avSort = sort.value; render(true); });
  const list = AV.sortGames(AV.filterGames(games, avQuery, avPlat), achs, avSort);
  const card = g => {
    const s = AV.gameStats(by.get(g.id) || []);
    return h('a', { class: 'av-game' + (s.complete ? ' complete' : ''), href: '#/apps/achv/' + g.id, 'aria-label': `${g.name}, ${s.unlocked} of ${s.total} achievements` },
      avCover(g), h('div', { class: 'av-gbody' }, h('b', {}, g.name), avPlatBadge(g), avBar(s.pct, g.name + ' progress'),
        h('div', { class: 'av-gnum' }, h('span', {}, `${s.unlocked} / ${s.total}`), h('span', { class: 'muted' }, `${s.pct}%`), s.points > 1 && s.total !== s.points ? h('span', { class: 'muted' }, `${s.earned} / ${s.points} pts`) : null)),
      s.complete ? h('span', { class: 'av-done', title: 'Completed' }, icon('trophy')) : null);
  };
  return [h('div', { class: 'app-pad av-tools' }, q, plat, sort,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => avImport(acct, ctx, null) }, 'Import a file'), h('button', { class: 'btn', type: 'button', onclick: () => avExport(games, achs) }, 'Export everything'))),
    list.length ? h('div', { class: 'av-grid' }, list.map(card)) : emptyState('No games match', 'Try another search or platform.')];
}
function avRecent(ctx) {
  const g = new Map(avGames(ctx).map(x => [x.id, x])), r = AV.recent(avAchs(ctx), 60);
  if (!r.length) return [emptyState('Nothing unlocked with a date yet', 'Unlock an achievement in a game and it shows up here, newest first.')];
  return [h('div', { class: 'app-pad' }, r.map(a => { const game = g.get(a.game); return game ? h('a', { class: 'av-row', href: '#/apps/achv/' + game.id }, avCover(game, 'sm'), h('div', { class: 'who' }, h('b', {}, a.name), h('small', {}, `${game.name} · ${avDate(a.at)}${a.hardcore ? ' · hardcore' : ''}`)), h('span', { class: 'av-pts' }, a.points > 1 ? a.points + ' pts' : '')) : null; }))];
}
function avStats(ctx, ov) {
  const achs = avAchs(ctx), games = avGames(ctx), months = AV.monthly(achs), top = Math.max(1, ...months.map(m => m.n)), g = new Map(games.map(x => [x.id, x]));
  const plats = Object.entries(ov.platforms).sort((a, b) => b[1].unlocked - a[1].unlocked), rare = AV.rarest(achs, 8);
  const done = games.filter(x => AV.gameStats(AV.byGame(achs).get(x.id) || []).complete);
  return [
    h('div', { class: 'app-pad' }, h('h3', {}, 'By platform'), plats.map(([id, p]) => h('div', { class: 'av-plrow' }, h('span', { class: 'av-plat', style: `--c:${AV.platform(id).color}` }, AV.platform(id).name), avBar(p.total ? p.unlocked / p.total * 100 : 0, AV.platform(id).name),
      h('small', { class: 'muted' }, `${plural(p.games, 'game')} · ${p.unlocked} / ${p.total} · ${p.earned} pts${p.complete ? ' · ' + p.complete + ' complete' : ''}`)))),
    h('div', { class: 'app-pad' }, h('h3', {}, 'Unlocked per month'), h('div', { class: 'av-months', role: 'img', 'aria-label': 'Achievements unlocked in each of the last 12 months' }, months.map(m => h('div', { class: 'av-month', title: `${new Date(m.y, m.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}: ${m.n}` }, h('i', { style: `height:${Math.round(m.n / top * 100)}%` }), h('small', {}, new Date(m.y, m.m, 1).toLocaleDateString(undefined, { month: 'short' })[0]), h('span', {}, m.n || '')))),
      h('p', { class: 'fine' }, 'Counted from the dates you unlocked them. Unlocks without a date are not in this chart.')),
    done.length ? h('div', { class: 'app-pad' }, h('h3', {}, `Completed (${done.length})`), done.map(x => h('a', { class: 'av-row', href: '#/apps/achv/' + x.id }, avCover(x, 'sm'), h('div', { class: 'who' }, h('b', {}, x.name), h('small', {}, `${AV.platform(x.platform).name} · ${AV.gameStats(AV.byGame(achs).get(x.id)).total} achievements`)), icon('trophy')))) : null,
    rare.length ? h('div', { class: 'app-pad' }, h('h3', {}, 'Your rarest'), rare.map(a => { const x = g.get(a.game); return x ? h('a', { class: 'av-row', href: '#/apps/achv/' + x.id }, avCover(x, 'sm'), h('div', { class: 'who' }, h('b', {}, a.name), h('small', {}, x.name)), h('span', { class: 'av-pts' }, a.rarity + '%')) : null; })) : null,
  ];
}

/* ---------- one game ---------- */
function avGameView(acct, ctx, back, game) {
  const achs = avAchs(ctx).filter(a => a.game === game.id), s = AV.gameStats(achs), plat = AV.platform(game.platform);
  const list = AV.filterAchs(achs, { filter: avFilter, q: avAq, sort: avAsort }), shown = list.slice(0, avShown);
  const toggle = async a => { await savePost(acct, { ...a, done: !a.done, at: a.done ? 0 : Date.now() }); render(true); };
  const q = h('input', { type: 'search', placeholder: 'Search achievements', value: avAq, 'aria-label': 'Search achievements' });
  let t; q.addEventListener('input', () => { avAq = q.value; avShown = 150; clearTimeout(t); t = setTimeout(() => render(true).then(() => { const el = document.querySelector('.av-tools input[type=search]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }), 200); });
  const chips = h('div', { class: 'av-chips', role: 'group', 'aria-label': 'Show' }, AV.ACH_FILTERS.map(([k, l]) => h('button', { class: 'chip' + (avFilter === k ? ' on' : ''), type: 'button', 'aria-pressed': String(avFilter === k), onclick: () => { avFilter = k; avShown = 150; render(true); } }, l)));
  const sort = h('select', { 'aria-label': 'Sort achievements' }, [['order', 'Game order'], ['points', 'Points'], ['date', 'Date unlocked'], ['name', 'Name']].map(([k, l]) => h('option', { value: k }, 'Sort: ' + l))); sort.value = avAsort; sort.addEventListener('change', () => { avAsort = sort.value; render(true); });
  const row = a => h('div', { class: 'av-ach' + (a.done ? ' done' : '') },
    h('button', { class: 'av-check', type: 'button', role: 'checkbox', 'aria-checked': String(a.done), 'aria-label': (a.done ? 'Unlock ' : 'Unlock ') + a.name, title: a.done ? 'Unlocked. Click to lock again' : 'Mark as unlocked', onclick: () => toggle(a) }, a.done ? icon('check') : null),
    h('div', { class: 'av-abody' }, h('div', { class: 'av-aname' }, h('b', {}, a.name), a.hidden ? h('span', { class: 'badge' }, 'Hidden') : null, a.hardcore ? h('span', { class: 'badge' }, 'Hardcore') : null),
      a.desc ? h('div', { class: 'muted' }, a.desc) : null, a.note ? h('div', { class: 'fine', style: 'padding:2px 0 0' }, a.note) : null,
      h('div', { class: 'av-ameta' }, a.done ? h('span', {}, 'Unlocked ' + avDate(a.at)) : null, a.rarity != null ? h('span', {}, a.rarity + '% of players') : null)),
    h('div', { class: 'av-aright' }, h('span', { class: 'av-pts' }, a.points + (a.points === 1 ? ' pt' : ' pts')), h('button', { class: 'btn', type: 'button', 'aria-label': 'Edit ' + a.name, onclick: () => avAchEditor(acct, ctx, game, a) }, icon('notes'))));
  return [
    back(game.name, { sub: plat.name }),
    h('div', { class: 'app-pad' }, h('div', { class: 'av-ghead' }, avCover(game, 'lg'), h('div', { style: 'flex:1;min-width:0' }, h('h2', { style: 'margin:0' }, game.name), avPlatBadge(game), game.hours ? h('small', { class: 'muted' }, ` ${game.hours} hours`) : null,
      avBar(s.pct, 'Progress'), h('div', { class: 'av-gnum' }, h('b', {}, `${s.unlocked} / ${s.total}`), h('span', { class: 'muted' }, `${s.pct}%`), h('span', { class: 'muted' }, `${s.earned} / ${s.points} pts`), s.complete ? h('span', { class: 'av-done inline' }, icon('trophy'), ' Completed') : null))),
      game.notes ? h('p', { style: 'white-space:pre-wrap', class: 'muted' }, game.notes) : null,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => avBulkAdd(acct, ctx, game) }, 'Add achievements'), h('button', { class: 'btn', type: 'button', onclick: () => avAchEditor(acct, ctx, game, null) }, 'Add one'), h('button', { class: 'btn', type: 'button', onclick: () => avImport(acct, ctx, game) }, 'Import a file'),
        h('button', { class: 'btn', type: 'button', onclick: () => avGameEditor(acct, ctx, game) }, 'Edit game'), h('button', { class: 'btn', type: 'button', onclick: () => avExport([game], achs, game.name) }, 'Export'))),
    achs.length ? [h('div', { class: 'app-pad av-tools' }, q, sort, chips), h('div', { class: 'app-pad av-list' }, shown.length ? shown.map(row) : h('p', { class: 'muted' }, 'Nothing matches.'),
      list.length > shown.length ? h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => { avShown += 150; render(true); } }, `Show more (${list.length - shown.length} left)`)) : null),
      h('div', { class: 'app-pad' }, h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => avMarkAll(acct, achs, true) }, 'Mark all unlocked'), h('button', { class: 'btn', type: 'button', onclick: () => avMarkAll(acct, achs, false) }, 'Lock all again')))]
      : h('div', { class: 'app-pad' }, emptyState('No achievements yet', 'Add them one by one, paste a list (one per line), or import a Steam or RetroAchievements file.')),
  ].flat();
}
async function avMarkAll(acct, achs, on) {
  const todo = achs.filter(a => a.done !== on); if (!todo.length) return toast(on ? 'Everything is already unlocked.' : 'Nothing is unlocked.');
  if (!confirm(on ? `Mark ${plural(todo.length, 'achievement')} as unlocked, today?` : `Lock ${plural(todo.length, 'achievement')} again? Their dates are forgotten.`)) return;
  const now = Date.now(); await avBatch(todo, a => savePost(acct, { ...a, done: on, at: on ? (a.at || now) : 0 })); render(true);
}

/* ---------- editors ---------- */
function avGameEditor(acct, ctx, game) {
  const isNew = !game, base = game || AV.normGame({}), plats = AV.PLATFORMS;
  let cover = base.coverImg || null;
  const name = h('input', { value: base.name, maxlength: 80, 'aria-label': 'Game name', placeholder: 'Half-Life' }), plat = h('select', { 'aria-label': 'Platform' }, plats.map(p => h('option', { value: p.id }, p.name))); plat.value = base.platform;
  const cons = h('input', { value: base.console || '', maxlength: 40, 'aria-label': 'Console', placeholder: 'e.g. NES/Famicom' }), hours = h('input', { type: 'number', min: '0', max: '99999', value: String(base.hours || ''), 'aria-label': 'Hours played', placeholder: '0' });
  const notes = h('textarea', { rows: 3, maxlength: 2000, 'aria-label': 'Notes' }, base.notes || '');
  const prev = h('div', { class: 'av-cover-edit' }); const paint = () => prev.replaceChildren(avCover({ name: name.value || '?', platform: plat.value, coverImg: cover }, 'lg'));
  name.addEventListener('input', paint); plat.addEventListener('change', paint); paint();
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary', type: 'button' }, isNew ? 'Add game' : 'Save');
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'Add a game' : 'Edit game')),
    h('div', { class: 'mp' }, prev, h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: async () => { const d = await chooseImage(300, 300); if (d) { cover = d; paint(); } } }, 'Choose a cover'), h('button', { class: 'btn', type: 'button', onclick: () => { cover = null; paint(); } }, 'No cover')),
      aiField('Name', name), h('div', { class: 'two' }, aiField('Platform', plat), aiField('Console (RetroAchievements)', cons)), aiField('Hours played', hours), aiField('Notes', notes), err,
      h('div', { class: 'btnrow' }, save, !isNew && h('button', { class: 'btn danger', type: 'button', onclick: async () => {
        const mine = avAchs(ctx).filter(a => a.game === game.id);
        if (!confirm(`Delete "${game.name}" and its ${plural(mine.length, 'achievement')}? Export it first if you want a copy. There is no undo.`)) return;
        await avBatch(mine, a => db.del('posts', a.id)); await db.del('posts', game.id); close(); toast('Game deleted.'); go('/apps/achv');
      } }, 'Delete game')))));
  save.addEventListener('click', async () => {
    const norm = AV.normGame({ name: name.value, platform: plat.value, notes: notes.value, hours: hours.value, console: cons.value });
    if (!norm.name) { err.textContent = 'Give the game a name.'; return; }
    const id = game ? game.id : uid(); await avSave(acct, { ...(game || {}), id, kind: 'agame', ...norm, coverImg: cover }); close(); toast(isNew ? 'Game added.' : 'Saved.');
    if (isNew) go('/apps/achv/' + id); else render(true);
  });
  setTimeout(() => name.focus(), 0);
}
const avLocal = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
function avAchEditor(acct, ctx, game, a) {
  const isNew = !a, base = a || AV.normAch({});
  const name = h('input', { value: base.name, maxlength: 120, 'aria-label': 'Achievement name' }), desc = h('textarea', { rows: 2, maxlength: 500, 'aria-label': 'Description' }, base.desc);
  const pts = h('input', { type: 'number', min: '0', max: '100000', value: String(base.points), 'aria-label': 'Points' }), rar = h('input', { type: 'number', min: '0', max: '100', step: '0.1', value: base.rarity == null ? '' : String(base.rarity), 'aria-label': 'Percent of players who have it', placeholder: 'optional' });
  const hid = h('input', { type: 'checkbox', checked: base.hidden, 'aria-label': 'Hidden' }), done = h('input', { type: 'checkbox', checked: base.done, 'aria-label': 'Unlocked' }), hc = h('input', { type: 'checkbox', checked: base.hardcore, 'aria-label': 'Hardcore' });
  const when = h('input', { type: 'datetime-local', value: base.at ? avLocal(base.at) : '', 'aria-label': 'When you unlocked it' }), note = h('input', { value: base.note, maxlength: 300, 'aria-label': 'Note' });
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary', type: 'button' }, isNew ? 'Add' : 'Save');
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'Add an achievement' : 'Edit achievement')),
    h('div', { class: 'mp' }, aiField('Name', name), aiField('Description', desc), h('div', { class: 'two' }, aiField('Points', pts, 'Every achievement counts 1 unless you say otherwise.'), aiField('Rarity (%)', rar)),
      h('div', { class: 'pk-checks' }, h('label', { class: 'field check' }, done, h('span', {}, 'Unlocked')), h('label', { class: 'field check' }, hid, h('span', {}, 'Hidden')), h('label', { class: 'field check' }, hc, h('span', {}, 'Hardcore'))),
      aiField('Unlocked on', when, 'Leave it empty if you do not know the date.'), aiField('Note', note), err,
      h('div', { class: 'btnrow' }, save, !isNew && h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (!confirm(`Delete "${a.name}"?`)) return; await db.del('posts', a.id); close(); render(true); } }, 'Delete')))));
  save.addEventListener('click', async () => {
    if (!name.value.trim()) { err.textContent = 'Give it a name.'; return; }
    const t = when.value ? new Date(when.value).getTime() : 0, order = isNew ? Math.max(-1, ...avAchs(ctx).filter(x => x.game === game.id).map(x => x.order)) + 1 : base.order;
    const norm = AV.normAch({ ...base, name: name.value, desc: desc.value, points: pts.value, rarity: rar.value, hidden: hid.checked, done: done.checked, hardcore: hc.checked, at: done.checked ? (Number.isFinite(t) ? t : 0) : 0, note: note.value, order });
    await avSave(acct, { ...(a || {}), id: a ? a.id : uid(), kind: 'ach', game: game.id, ...norm }); close(); render(true);
  });
  setTimeout(() => name.focus(), 0);
}
function avBulkAdd(acct, ctx, game) {
  const ta = h('textarea', { rows: 10, 'aria-label': 'Achievements, one per line', placeholder: 'First Steps | Take a step | 5\nSecond Wind | Heal at low health\nBoss Slayer - Beat the boss - 25' });
  const count = h('p', { class: 'fine', style: 'padding:6px 0' }, 'Nothing yet.'); ta.addEventListener('input', () => { const n = AV.parseBulk(ta.value).length; count.textContent = n ? `${plural(n, 'achievement')} will be added.` : 'Nothing yet.'; });
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add achievements')),
    h('div', { class: 'mp' }, h('p', { class: 'muted', style: 'margin-top:0' }, 'One per line: the name, then (optionally) a description and points, separated by | or a tab or " - ". A number at the end is the points; without one it is 1.'), ta, count,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        const list = AV.parseBulk(ta.value); if (!list.length) return;
        const have = avAchs(ctx).filter(a => a.game === game.id), start = Math.max(-1, ...have.map(a => a.order)) + 1, names = new Set(have.map(a => a.name.toLowerCase())), fresh = list.filter(a => !names.has(a.name.toLowerCase()));
        if (have.length + fresh.length > AV.MAX_ACH) return toast(`A game can hold ${AV.MAX_ACH} achievements.`);
        await avBatch(fresh, (a, i) => avSave(acct, { id: uid(), kind: 'ach', game: game.id, ...a, order: start + fresh.indexOf(a) })); close(); toast(`Added ${plural(fresh.length, 'achievement')}${list.length > fresh.length ? ` (${list.length - fresh.length} were already there)` : ''}.`); render(true);
      } }, 'Add them')))));
  setTimeout(() => ta.focus(), 0);
}

/* ---------- files ---------- */
async function avExport(games, achs, name) {
  const r = await saveFile((name ? name.replace(/[^\p{L}\p{N}_-]+/gu, '_') : 'achievements') + '.achievements.json', 'application/json', JSON.stringify(AV.exportAll(games, achs), null, 1));
  toast(r.ok ? `Saved to ${r.where}.` : r.where);
}
function avImport(acct, ctx, game) {
  const input = h('input', { type: 'file', accept: '.json,.csv,.txt,application/json,text/csv', hidden: true });
  input.addEventListener('change', async () => {
    const f = input.files[0]; input.remove(); if (!f) return;
    if (f.size > 20 * 1024 * 1024) return toast('That file is too big.');
    const r = AV.detect(await f.text()); if (!r.ok) return toast(r.error);
    avImportPlan(acct, ctx, game, r, f.name.replace(/\.[^.]+$/, ''));
  });
  input.addEventListener('cancel', () => input.remove());
  document.body.append(input); input.click();
}
// Show what a file holds and what will happen, then do it.
function avImportPlan(acct, ctx, game, r, fileName) {
  const games = avGames(ctx), achs = avAchs(ctx);
  const sources = r.kind === 'export' ? r.export.games.map(g => ({ name: g.name, platform: g.platform, console: g.console, notes: g.notes, hours: g.hours, achs: (g.achs || []).slice(0, AV.MAX_ACH).map(AV.normAch) })) : [{ name: r.name || fileName, platform: r.platform, console: r.console, achs: r.achs }];
  const nameIn = h('input', { value: game ? game.name : sources[0].name, maxlength: 80, 'aria-label': 'Game name', disabled: !!game || sources.length > 1 });
  const platSel = h('select', { 'aria-label': 'Platform', disabled: !!game || sources.length > 1 }, AV.PLATFORMS.map(p => h('option', { value: p.id }, p.name))); platSel.value = game ? game.platform : (sources[0].platform || 'steam');
  const label = { steam: 'a Steam file', retroachievements: 'a RetroAchievements file', csv: 'a CSV list', export: 'an Achievements export' }[r.kind];
  const sum = sources.map(s => `${s.name || 'Untitled'}: ${plural(s.achs.length, 'achievement')}, ${s.achs.filter(a => a.done).length} unlocked`);
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Import ' + label)),
    h('div', { class: 'mp' }, h('ul', { class: 'sd-lines' }, sum.slice(0, 8).map(x => h('li', {}, x)), sum.length > 8 ? h('li', {}, `and ${sum.length - 8} more games`) : null),
      game ? h('p', { class: 'muted' }, `These are merged into "${game.name}". Achievements you already have are kept, and nothing you unlocked is ever locked again.`) : sources.length === 1 ? [aiField('Game name', nameIn), aiField('Platform', platSel)] : h('p', { class: 'muted' }, 'Games with the same name and platform are merged; the rest are added.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        close(); let added = 0, updated = 0, created = 0, target = game;
        for (const [i, s] of sources.entries()) {
          const plat = sources.length === 1 && !game ? platSel.value : (s.platform || (game ? game.platform : 'other')), nm = sources.length === 1 && !game ? nameIn.value.trim() || 'Untitled' : s.name || 'Untitled';
          let g = game || games.find(x => x.name.toLowerCase() === nm.toLowerCase() && x.platform === plat);
          if (!g) { g = { id: uid(), kind: 'agame', accountId: acct.id, createdAt: Date.now() + i, ...AV.normGame({ name: nm, platform: plat, console: s.console, notes: s.notes, hours: s.hours }) }; await savePost(acct, g); created++; games.push(g); }
          const have = achs.filter(a => a.game === g.id), m = AV.merge(have, s.achs), start = Math.max(-1, ...have.map(a => a.order)) + 1;
          if (have.length + m.add.length > AV.MAX_ACH) { toast(`"${g.name}" would pass ${AV.MAX_ACH} achievements, so it was skipped.`); continue; }
          await avBatch(m.add, a => avSave(acct, { id: uid(), kind: 'ach', game: g.id, ...a, order: a.order || start + m.add.indexOf(a) }));
          await avBatch(m.update, u => { const e = have.find(x => x.id === u.id); return savePost(acct, { ...e, ...u.patch }); });
          added += m.add.length; updated += m.update.length; target = target || g;
        }
        toast(`Imported: ${plural(added, 'achievement')} added${updated ? `, ${updated} updated` : ''}${created ? `, ${plural(created, 'game')} created` : ''}.`);
        if (!game && sources.length === 1 && target) go('/apps/achv/' + target.id); else render(true);
      } }, 'Import'), h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Cancel')))));
}

'use strict';
/* Achievements: keep your video game achievements and score, offline. Add games and achievements by hand, by pasting a list,
   or by pasting the achievement list you copied from a game's page on RetroAchievements or Steam. Nothing here goes online. */
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

let avLastCtx = null;
function achievementsView(acct, ctx, back) {
  avLastCtx = ctx;
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
  if (!games.length) return [bar, h('div', { class: 'app-pad' }, emptyState('No games yet', 'Add a game, then its achievements: type them, paste a list, paste the list you copied from a RetroAchievements or Steam page, or (optionally) fetch a game from RetroAchievements with your API key. Everything is kept on this device.'),
    h('div', { class: 'btnrow center' }, h('button', { class: 'btn primary', type: 'button', onclick: () => avGameEditor(acct, ctx, null) }, 'Add a game'), h('button', { class: 'btn', type: 'button', onclick: () => avRaAdd(acct, ctx) }, 'Add from RetroAchievements'), h('button', { class: 'btn', type: 'button', onclick: () => avRestore(acct, ctx) }, 'Restore a backup')))];
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
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => avRaAdd(acct, ctx) }, 'Add from RetroAchievements'), h('button', { class: 'btn', type: 'button', onclick: () => avRestore(acct, ctx) }, 'Restore a backup'), h('button', { class: 'btn', type: 'button', onclick: () => avExport(games, achs) }, 'Export everything'))),
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
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => avBulkAdd(acct, ctx, game) }, 'Add achievements'), h('button', { class: 'btn', type: 'button', onclick: () => avAchEditor(acct, ctx, game, null) }, 'Add one'),         game.raId ? h('button', { class: 'btn', type: 'button', disabled: !!avRaBusy, onclick: () => avRaUpdate(acct, ctx, game) }, 'Update from RetroAchievements') : null,
        h('button', { class: 'btn', type: 'button', onclick: () => avGameEditor(acct, ctx, game) }, 'Edit game'), h('button', { class: 'btn', type: 'button', onclick: () => avExport([game], achs, game.name) }, 'Export'))),
    achs.length ? [h('div', { class: 'app-pad av-tools' }, q, sort, chips), h('div', { class: 'app-pad av-list' }, shown.length ? shown.map(row) : h('p', { class: 'muted' }, 'Nothing matches.'),
      list.length > shown.length ? h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => { avShown += 150; render(true); } }, `Show more (${list.length - shown.length} left)`)) : null),
      h('div', { class: 'app-pad' }, h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => avMarkAll(acct, achs, true) }, 'Mark all unlocked'), h('button', { class: 'btn', type: 'button', onclick: () => avMarkAll(acct, achs, false) }, 'Lock all again')))]
      : h('div', { class: 'app-pad' }, emptyState('No achievements yet', 'Paste the list you copied from the game\'s page on RetroAchievements or Steam, type a list (one per line), or add them one by one.')),
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
  const ta = h('textarea', { rows: 10, 'aria-label': 'Achievements', placeholder: 'Paste the achievement list from the game\'s page,\nor type one per line:\nFirst Steps | Take a step | 5\nBoss Slayer - Beat the boss - 25' });
  const what = h('p', { class: 'fine', style: 'padding:6px 0', role: 'status' }, 'Nothing yet.');
  const read = () => { const page = AV.parsePage(ta.value); return page.ok ? { kind: page.kind, list: page.achs } : { kind: 'typed', list: AV.parseBulk(ta.value) }; };
  ta.addEventListener('input', () => {
    const r = read(), un = r.list.filter(a => a.done).length;
    what.textContent = !r.list.length ? 'Nothing yet.' : r.kind === 'typed' ? `${plural(r.list.length, 'achievement')} typed.` : `Found ${plural(r.list.length, 'achievement')} from a ${r.kind === 'retroachievements' ? 'RetroAchievements' : 'Steam'} page${un ? `, ${un} unlocked` : ''}, with points, dates and rarity where the page had them.`;
  });
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add achievements')),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, h('b', {}, 'From a website: '), 'open the game\'s page on RetroAchievements (or the Steam achievements page), press Ctrl+A then Ctrl+C (on a phone: select all, then copy), and paste it here. Points, the dates you unlocked them and how rare each one is come along. Paste it again later to update what you have unlocked.'),
      h('p', { class: 'muted' }, h('b', {}, 'Typed: '), 'one per line: the name, then (optionally) a description and points, separated by | or a tab or " - ". A number at the end is the points.'), ta, what,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        const r = read(); if (!r.list.length) return;
        const have = avAchs(ctx).filter(a => a.game === game.id), m = AV.merge(have, r.list), start = Math.max(-1, ...have.map(a => a.order)) + 1;
        if (have.length + m.add.length > AV.MAX_ACH) return toast(`A game can hold ${AV.MAX_ACH} achievements.`);
        await avBatch(m.add, a => avSave(acct, { id: uid(), kind: 'ach', game: game.id, ...a, order: start + m.add.indexOf(a) }));
        await avBatch(m.update, u => savePost(acct, { ...have.find(x => x.id === u.id), ...u.patch }));
        close(); toast(`${plural(m.add.length, 'achievement')} added${m.update.length ? `, ${m.update.length} updated` : ''}${m.same ? `, ${m.same} already up to date` : ''}.`); render(true);
      } }, 'Add them')))));
  setTimeout(() => ta.focus(), 0);
}

/* ---------- files: your own backups ---------- */
async function avExport(games, achs, name) {
  const r = await saveFile((name ? name.replace(/[^\p{L}\p{N}_-]+/gu, '_') : 'achievements') + '.achievements.json', 'application/json', JSON.stringify(AV.exportAll(games, achs), null, 1));
  toast(r.ok ? `Saved to ${r.where}.` : r.where);
}
function avRestore(acct, ctx) {
  const input = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  input.addEventListener('change', async () => {
    const f = input.files[0]; input.remove(); if (!f) return;
    if (f.size > 40 * 1024 * 1024) return toast('That file is too big.');
    const r = AV.detect(await f.text()); if (!r.ok) return toast(r.error);
    avRestorePlan(acct, ctx, r.export);
  });
  input.addEventListener('cancel', () => input.remove());
  document.body.append(input); input.click();
}
// Show what a backup holds, then bring it in. A game with the same name and platform is merged; nothing unlocked is ever locked again.
function avRestorePlan(acct, ctx, ex) {
  const games = avGames(ctx), achs = avAchs(ctx), sources = ex.games.map(g => ({ ...g, achs: (g.achs || []).slice(0, AV.MAX_ACH).map(AV.normAch) }));
  const sum = sources.map(s => `${s.name || 'Untitled'}: ${plural(s.achs.length, 'achievement')}, ${s.achs.filter(a => a.done).length} unlocked`);
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Restore a backup')),
    h('div', { class: 'mp' }, h('ul', { class: 'sd-lines' }, sum.slice(0, 8).map(x => h('li', {}, x)), sum.length > 8 ? h('li', {}, `and ${sum.length - 8} more games`) : null),
      h('p', { class: 'muted' }, 'Games with the same name and platform are merged; the rest are added. Nothing you unlocked is ever locked again.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        close(); let added = 0, updated = 0, created = 0, last = null;
        for (const [i, s] of sources.entries()) {
          const norm = AV.normGame(s), nm = norm.name || 'Untitled';
          let g = games.find(x => x.name.toLowerCase() === nm.toLowerCase() && x.platform === norm.platform);
          if (!g) { g = { id: uid(), kind: 'agame', accountId: acct.id, createdAt: Date.now() + i, ...norm, name: nm }; await savePost(acct, g); created++; games.push(g); }
          const have = achs.filter(a => a.game === g.id), m = AV.merge(have, s.achs), start = Math.max(-1, ...have.map(a => a.order)) + 1;
          if (have.length + m.add.length > AV.MAX_ACH) { toast(`"${g.name}" would pass ${AV.MAX_ACH} achievements, so it was skipped.`); continue; }
          await avBatch(m.add, a => avSave(acct, { id: uid(), kind: 'ach', game: g.id, ...a, order: start + m.add.indexOf(a) }));
          await avBatch(m.update, u => savePost(acct, { ...have.find(x => x.id === u.id), ...u.patch }));
          added += m.add.length; updated += m.update.length; last = g;
        }
        toast(`Restored: ${plural(added, 'achievement')} added${updated ? `, ${updated} updated` : ''}${created ? `, ${plural(created, 'game')} created` : ''}.`);
        if (sources.length === 1 && last) go('/apps/achv/' + last.id); else render(true);
      } }, 'Restore'), h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Cancel')))));
}


/* ---------- RetroAchievements (optional: only when you ask, with your own API key) ---------- */
let avRaBusy = '';
const avRaStored = () => { try { const v = JSON.parse(localStorage.getItem('as.ra') || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
const avRaCfg = ctx => { const rec = ctx.apps.rakey[0]; return rec ? { user: rec.user || '', key: rec.key || '', locked: true } : { user: avRaStored().user || '', key: avRaStored().key || '', locked: false }; };
async function avRaCall(ctx, call, extra) {
  const cfg = avRaCfg(ctx);
  if (!cfg.user || !cfg.key) throw new Error('Add your RetroAchievements username and API key first.');
  const r = await window.AntiSocialRA.get(call, { z: cfg.user, y: cfg.key, ...extra });
  if (r.status === 401 || r.status === 403) throw new Error('RetroAchievements did not accept that username and API key. Check them (retroachievements.org, Settings, Keys).');
  if (r.status === 429) throw new Error('RetroAchievements says you are going too fast. Try again in a minute.');
  if (r.status === 404) throw new Error('RetroAchievements could not find that.');
  if (r.status >= 500) throw new Error('RetroAchievements is having trouble right now. Try again later.');
  let d; try { d = JSON.parse(r.text); } catch { throw new Error('RetroAchievements sent something unexpected.'); }
  if (d && typeof d === 'object' && !Array.isArray(d) && d.Error) throw new Error('RetroAchievements: ' + String(d.Error).slice(0, 160));
  return d;
}
function avRaAccount(acct, ctx, then) {
  const cfg = avRaCfg(ctx), rec = ctx.apps.rakey[0];
  const user = h('input', { value: cfg.user, maxlength: 40, 'aria-label': 'RetroAchievements username', autocapitalize: 'none', spellcheck: 'false' });
  const key = h('input', { type: 'password', value: cfg.key, maxlength: 64, 'aria-label': 'RetroAchievements API key', autocomplete: 'off', spellcheck: 'false', placeholder: 'Paste your Web API key' });
  const lock = h('input', { type: 'checkbox', checked: !!rec, 'aria-label': 'Lock the key with my passcode' });
  const status = h('p', { class: 'fine', style: 'padding:6px 0', role: 'status' });
  const valid = () => /^[A-Za-z0-9_.-]{1,40}$/.test(user.value.trim()) && /^[A-Za-z0-9]{8,64}$/.test(key.value.trim());
  const persist = async () => {
    const u = user.value.trim(), k = key.value.trim();
    if (acct.vault && lock.checked) { await savePost(acct, { id: 'rakey' + acct.id, accountId: acct.id, kind: 'rakey', user: u, key: k, createdAt: 1 }); localStorage.setItem('as.ra', JSON.stringify({ user: u })); }
    else { if (rec) await db.del('posts', rec.id); localStorage.setItem('as.ra', JSON.stringify({ user: u, key: k })); }
  };
  const check = h('button', { class: 'btn', type: 'button' }, 'Check it');
  check.addEventListener('click', async () => {
    if (!valid()) { status.textContent = 'The username and key do not look right.'; return; }
    check.disabled = true; status.textContent = 'Asking RetroAchievements...';
    try { const r = await window.AntiSocialRA.get('API_GetUserProfile', { z: user.value.trim(), y: key.value.trim(), u: user.value.trim() }); const d = JSON.parse(r.text || 'null');
      status.textContent = r.status === 200 && d && (d.User || d.UserPic !== undefined || d.TotalPoints !== undefined) ? `Connected as ${d.User || user.value.trim()}${d.TotalPoints != null ? `, ${Number(d.TotalPoints).toLocaleString()} points` : ''}.` : r.status === 401 || r.status === 403 ? 'RetroAchievements did not accept that username and key.' : 'RetroAchievements answered, but not with a profile. Check the username.'; }
    catch (e) { status.textContent = e.message || 'The check failed.'; } finally { check.disabled = false; }
  });
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'RetroAchievements account')),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'Optional. With your username and Web API key (retroachievements.org, Settings, Keys) this app can fetch a game\'s achievements and what you have unlocked. A lookup sends your username and key to retroachievements.org, and nothing else leaves this device. Without a key, you can still paste a game\'s page or type achievements in.'),
      aiField('Username', user), aiField('Web API key', key, 'Kept on this device. It is not part of an exported backup.'),
      acct.vault ? h('label', { class: 'field check' }, lock, h('span', {}, 'Lock the key with my passcode (encrypted in the vault)')) : null,
      h('div', { class: 'btnrow' }, check), status,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => { if (!valid()) { status.textContent = 'The username and key do not look right.'; return; } await persist(); close(); toast('Saved.'); await render(true); if (then) then(); } }, 'Save'),
        cfg.key ? h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (rec) await db.del('posts', rec.id); localStorage.removeItem('as.ra'); close(); toast('Removed.'); render(true); } }, 'Remove my key') : null))));
  setTimeout(() => user.focus(), 0);
}
// Put a game fetched from RetroAchievements into the app: a new game, or merged into the one you already have.
async function avRaApply(acct, ctx, data, existing) {
  const games = avGames(ctx), achs = avAchs(ctx);
  let g = existing || games.find(x => x.raId && x.raId === data.raId) || games.find(x => x.platform === 'ra' && x.name.toLowerCase() === data.name.toLowerCase());
  const isNew = !g;
  if (!g) { g = { id: uid(), kind: 'agame', accountId: acct.id, createdAt: Date.now(), ...AV.normGame({ name: data.name, platform: 'ra', console: data.console, raId: data.raId }) }; }
  else if (!g.raId || (data.console && !g.console)) g = { ...g, raId: g.raId || data.raId, console: g.console || data.console };
  if (isNew || g !== existing) await savePost(acct, g);
  const have = achs.filter(a => a.game === g.id), m = AV.merge(have, data.achs), start = Math.max(-1, ...have.map(a => a.order)) + 1;
  if (have.length + m.add.length > AV.MAX_ACH) throw new Error(`That would pass ${AV.MAX_ACH} achievements.`);
  await avBatch(m.add, a => avSave(acct, { id: uid(), kind: 'ach', game: g.id, ...a, order: have.length ? start + m.add.indexOf(a) : a.order }));
  await avBatch(m.update, u => savePost(acct, { ...have.find(x => x.id === u.id), ...u.patch }));
  return { game: g, isNew, added: m.add.length, updated: m.update.length, total: data.achs.length, unlocked: data.achs.filter(a => a.done).length };
}
async function avRaFetchGame(ctx, raId) {
  const d = await avRaCall(ctx, 'API_GetGameInfoAndUserProgress', { u: avRaCfg(ctx).user, g: raId, a: 1 });
  const r = AV.fromRaGame(d); if (!r.ok) throw new Error(r.error); if (!r.achs.length) throw new Error('That game has no achievements on RetroAchievements.');
  return { ...r, raId: r.raId || raId };
}
async function avRaUpdate(acct, ctx, game) {
  if (avRaBusy) return; avRaBusy = 'x';
  try { toast('Asking RetroAchievements...'); const data = await avRaFetchGame(ctx, game.raId), r = await avRaApply(acct, ctx, data, game); toast(`Updated: ${r.added} new, ${r.updated} changed, ${r.unlocked} of ${r.total} unlocked.`); }
  catch (e) { toast(e.message || String(e)); } finally { avRaBusy = ''; render(true); }
}
function avRaAdd(acct, ctx) {
  const cfg = avRaCfg(ctx);
  if (!cfg.user || !cfg.key) return avRaAccount(acct, ctx, () => avRaAdd(acct, avLastCtx));
  const id = h('input', { 'aria-label': 'Game number or link', placeholder: 'e.g. 669, or https://retroachievements.org/game/669', autocapitalize: 'none', spellcheck: 'false' });
  const status = h('p', { class: 'fine', style: 'padding:6px 0', role: 'status' }), list = h('div', { class: 'pd-list' });
  let mine = null;
  const add = async raId => {
    if (!raId) { status.textContent = 'Type the game\'s number (the digits in its address on RetroAchievements) or paste its link.'; return; }
    status.textContent = 'Asking RetroAchievements...';
    try {
      const data = await avRaFetchGame(ctx, raId), r = await avRaApply(acct, ctx, data, null);
      close(); toast(`${r.isNew ? 'Added' : 'Updated'} ${r.game.name}: ${r.added} new, ${r.updated} changed, ${r.unlocked} of ${r.total} unlocked.`); go('/apps/achv/' + r.game.id);
    } catch (e) { status.textContent = e.message || String(e); }
  };
  const have = new Set(avGames(ctx).map(g => g.raId).filter(Boolean));
  const q = h('input', { type: 'search', placeholder: 'Filter your games', 'aria-label': 'Filter your RetroAchievements games', hidden: true });
  const paint = () => {
    const f = q.value.trim().toLowerCase(), rows = (mine || []).filter(g => !f || g.name.toLowerCase().includes(f) || g.console.toLowerCase().includes(f)).slice(0, 100);
    list.replaceChildren(...(rows.length ? rows.map(g => h('div', { class: 'person-row' }, h('div', { class: 'who' }, h('b', {}, g.name), h('small', {}, `${g.console} · ${g.earned} / ${g.total} unlocked${have.has(g.raId) ? ' · already in your list' : ''}`)), h('button', { class: 'btn', type: 'button', onclick: () => add(g.raId) }, have.has(g.raId) ? 'Update' : 'Add'))) : [h('p', { class: 'muted' }, mine ? 'No games match.' : '')]));
  };
  q.addEventListener('input', paint);
  const load = h('button', { class: 'btn', type: 'button' }, 'Show my games');
  load.addEventListener('click', async () => {
    load.disabled = true; status.textContent = 'Asking RetroAchievements...';
    try { mine = AV.fromRaGames(await avRaCall(ctx, 'API_GetUserCompletedGames', { u: cfg.user })); status.textContent = mine.length ? `${plural(mine.length, 'game')} with achievements on your account.` : 'Your account has no games with achievements yet.'; q.hidden = !mine.length; paint(); }
    catch (e) { status.textContent = e.message || String(e); } finally { load.disabled = false; }
  });
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add from RetroAchievements')),
    h('div', { class: 'mp' }, h('p', { class: 'muted', style: 'margin-top:0' }, `Signed in as ${cfg.user}. A lookup sends your username and key to retroachievements.org.`),
      aiField('Game number or link', id, 'The number is in the game\'s address, like retroachievements.org/game/669.'), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => add(AV.raGameId(id.value)) }, 'Look it up and add'), h('button', { class: 'btn', type: 'button', onclick: () => { close(); avRaAccount(acct, ctx, () => avRaAdd(acct, avLastCtx)); } }, 'Account')),
      h('h3', {}, 'Or choose from your games'), h('div', { class: 'btnrow' }, load), q, status, list)));
  id.addEventListener('keydown', e => { if (e.key === 'Enter') add(AV.raGameId(id.value)); });
  setTimeout(() => id.focus(), 0);
}

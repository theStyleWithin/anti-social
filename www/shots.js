'use strict';
/* Screenshots: a gallery for your gameplay screenshots, kept in a folder for each game. Find anything by the game's title.
   Pictures are shrunk and stored on this device only. Not connected to the Achievements app. */
const SH = ShotCore;
let ssTab = 'games', ssQuery = '', ssAllQuery = '', ssFilter = '', ssSort = 'new', ssSelect = false, ssSel = new Set(), ssShown = 120, ssBusy = false;
const ssGames = ctx => ctx.apps.shotgame, ssShots = ctx => ctx.apps.shot;
const ssSave = (acct, rec) => appSave(acct, { accountId: acct.id, createdAt: Date.now(), ...rec });
const ssPlural = n => `${n} ${n === 1 ? 'screenshot' : 'screenshots'}`;
const ssLetter = g => h('div', { class: 'ss-cover letter', 'aria-hidden': 'true', style: `background:hsl(${[...g.name].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360},45%,42%)` }, (g.name[0] || '?').toUpperCase());

function shotsView(acct, ctx, back, gameId) {
  const title = appName(acct, 'shots');
  if (gameId) {
    const game = ssGames(ctx).find(g => g.id === gameId);
    return game ? ssGamePage(acct, ctx, back, game) : [back(title), emptyState('Game not found', 'That game folder is gone.')];
  }
  const games = ssGames(ctx), shots = ssShots(ctx), st = SH.stats(games, shots);
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(ssTab === k), class: ssTab === k ? 'active' : '', onclick: () => { ssTab = k; ssShown = 120; render(true); } }, label);
  return [back(title, { action: h('button', { class: 'btn primary', onclick: () => ssImport(acct, ctx, '') }, 'Add screenshots') }),
    h('div', { class: 'tabs', role: 'tablist' }, tab('games', 'Games'), tab('all', 'All screenshots')),
    h('div', { class: 'app-pad ss-wrap' }, st.shots ? h('p', { class: 'fine', style: 'padding:0 0 8px' }, `${ssPlural(st.shots)} in ${plural(st.withShots, 'game')}`) : null, ssTab === 'games' ? ssGamesTab(acct, ctx) : ssAllTab(acct, ctx))];
}

/* ---------- the folders ---------- */
function ssGamesTab(acct, ctx) {
  const games = ssGames(ctx), shots = ssShots(ctx);
  if (!games.length) return [emptyState('No screenshots yet', 'Add some, and name the game. Each game gets its own folder.'), h('div', { class: 'btnrow', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: () => ssImport(acct, ctx, '') }, 'Add screenshots'))];
  const grid = h('div', { class: 'ss-folders' });
  const q = h('input', { type: 'search', placeholder: 'Find a game by title', value: ssQuery, 'aria-label': 'Find a game by title' });
  const fill = () => {
    const fs = SH.folders(games, shots, ssQuery);
    grid.replaceChildren(...(fs.length ? fs.map(f => h('a', { class: 'ss-folder', href: '#/apps/shots/' + f.game.id },
      f.cover ? h('img', { class: 'ss-cover', src: f.cover.thumb, alt: '', loading: 'lazy' }) : ssLetter(f.game),
      h('b', {}, f.game.name), h('span', { class: 'muted' }, ssPlural(f.count)))) : [emptyState('No game with that title', 'Try fewer letters.')]));
  };
  q.addEventListener('input', () => { ssQuery = q.value; fill(); });
  fill();
  return [q, grid];
}

/* ---------- every screenshot ---------- */
function ssAllTab(acct, ctx) {
  const games = ssGames(ctx), shots = ssShots(ctx);
  if (!shots.length) return [emptyState('Nothing here yet', 'Screenshots you add will show up here, newest first.')];
  const sel = h('select', { 'aria-label': 'Show one game', onchange: e => { ssFilter = e.target.value; ssShown = 120; render(true); } }, h('option', { value: '' }, 'All games'), SH.byTitle(games).map(g => h('option', { value: g.id }, g.name)));
  sel.value = ssFilter;
  const srt = h('select', { 'aria-label': 'Order', onchange: e => { ssSort = e.target.value; render(true); } }, h('option', { value: 'new' }, 'Newest first'), h('option', { value: 'old' }, 'Oldest first')); srt.value = ssSort;
  const q = h('input', { type: 'search', placeholder: 'Search by game title or caption', value: ssAllQuery, 'aria-label': 'Search screenshots' });
  const area = h('div', {});
  const fill = () => {
    const list = SH.sortShots(SH.filterShots(shots, games, { game: ssFilter, query: ssAllQuery }), ssSort);
    area.replaceChildren(...ssGrid(acct, ctx, list, { showGame: !ssFilter }).filter(Boolean));
  };
  q.addEventListener('input', () => { ssAllQuery = q.value; ssShown = 120; fill(); });
  fill();
  return [q, h('div', { class: 'app-row' }, sel, srt, h('button', { class: 'btn' + (ssSelect ? ' primary' : ''), onclick: () => { ssSelect = !ssSelect; ssSel.clear(); render(true); } }, ssSelect ? 'Done' : 'Select')), area];
}

// the thumbnails, with "show more", and the select bar
function ssGrid(acct, ctx, list, { showGame }) {
  const games = new Map(ssGames(ctx).map(g => [g.id, g.name]));
  if (!list.length) return [emptyState('No matches', 'No screenshot has that title or caption.')];
  const shown = list.slice(0, ssShown), bar = h('div', { class: 'ss-bar' });
  const drawBar = () => {
    bar.hidden = !ssSelect; if (!ssSelect) return;
    bar.replaceChildren(h('b', {}, `${ssSel.size} selected`), h('button', { class: 'btn', disabled: !ssSel.size, onclick: () => ssMove(acct, ctx, [...ssSel]) }, 'Move to game'), h('button', { class: 'btn danger', disabled: !ssSel.size, onclick: () => ssConfirmDelete(acct, ctx, [...ssSel]) }, 'Delete'),
      h('button', { class: 'btn', onclick: () => { ssSel = new Set(list.map(s => s.id)); render(true); } }, 'All ' + list.length));
  };
  const tiles = shown.map((s, i) => {
    const on = ssSel.has(s.id);
    const b = h('button', { class: 'ss-tile' + (on ? ' on' : ''), type: 'button', 'aria-label': `${games.get(s.game) || 'Screenshot'}${s.caption ? ': ' + s.caption : ''}`, 'aria-pressed': ssSelect ? String(on) : null,
      onclick: () => { if (ssSelect) { ssSel.has(s.id) ? ssSel.delete(s.id) : ssSel.add(s.id); b.classList.toggle('on', ssSel.has(s.id)); b.setAttribute('aria-pressed', String(ssSel.has(s.id))); drawBar(); } else ssViewer(acct, ctx, list, i); } },
      h('img', { src: s.thumb, alt: '', loading: 'lazy' }), showGame ? h('span', { class: 'ss-label' }, games.get(s.game) || '') : null, ssSelect ? h('span', { class: 'ss-check' }, on ? '✓' : '') : null);
    return b;
  });
  drawBar();
  return [bar, h('div', { class: 'ss-grid' }, tiles), list.length > shown.length ? h('div', { class: 'btnrow', style: 'justify-content:center;margin-top:12px' }, h('button', { class: 'btn', onclick: () => { ssShown += 120; render(true); } }, `Show more (${list.length - shown.length} left)`)) : null];
}

/* ---------- one game ---------- */
function ssGamePage(acct, ctx, back, game) {
  const all = SH.shotsOf(ssShots(ctx), game.id), list = SH.sortShots(all, ssSort);
  const srt = h('select', { 'aria-label': 'Order', onchange: e => { ssSort = e.target.value; render(true); } }, h('option', { value: 'new' }, 'Newest first'), h('option', { value: 'old' }, 'Oldest first')); srt.value = ssSort;
  return [back(game.name, { sub: ssPlural(all.length), action: h('button', { class: 'btn primary', onclick: () => ssImport(acct, ctx, game.id) }, 'Add') }),
    h('div', { class: 'app-pad ss-wrap' },
      h('a', { class: 'fine ss-up', href: '#/apps/shots' }, '‹ All games'),
      h('div', { class: 'app-row' }, srt, all.length ? h('button', { class: 'btn' + (ssSelect ? ' primary' : ''), onclick: () => { ssSelect = !ssSelect; ssSel.clear(); render(true); } }, ssSelect ? 'Done' : 'Select') : null,
        h('button', { class: 'btn', onclick: () => ssRename(acct, ctx, game) }, 'Rename'), h('button', { class: 'btn danger', onclick: () => ssDeleteGame(acct, ctx, game, all) }, 'Delete game')),
      ...(all.length ? ssGrid(acct, ctx, list, { showGame: false }) : [emptyState('Empty folder', 'Add screenshots to this game.')]))];
}

/* ---------- adding ---------- */
// a game picker: pick one of yours, or type a new title
function ssGamePicker(ctx, preset, { allowNone = false } = {}) {
  const games = SH.byTitle(ssGames(ctx));
  const sel = h('select', { 'aria-label': 'Game' }, ...games.map(g => h('option', { value: g.id }, g.name)), h('option', { value: '' }, games.length ? '＋ A new game…' : 'Type the game title'));
  const title = h('input', { maxlength: 80, placeholder: 'Game title, like Hades', 'aria-label': 'New game title', autocomplete: 'off' });
  sel.value = games.some(g => g.id === preset) ? preset : games.length ? games[0].id : '';
  const sync = () => { title.hidden = sel.value !== ''; };
  sel.addEventListener('change', sync); sync();
  return { el: h('div', { class: 'ss-pick' }, sel, title), sel, title, focus: () => (sel.value === '' ? title : sel).focus(),
    resolve: async acct => {
      if (sel.value) return sel.value;
      const name = SH.cleanTitle(title.value); if (!name) return null;
      const dup = SH.findGame(ssGames(ctx), name); if (dup) return dup.id;
      const rec = { id: uid(), kind: 'shotgame', ...SH.normGame({ name }) };
      return (await ssSave(acct, rec)) ? rec.id : null;
    } };
}
function ssImport(acct, ctx, preset) {
  if (ssBusy) return;
  const picker = ssGamePicker(ctx, preset), err = h('p', { class: 'err' }), info = h('p', { class: 'muted' }, 'No pictures chosen yet.');
  let files = [];
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, 'aria-label': 'Choose screenshots' });
  input.addEventListener('change', () => { files = [...input.files]; input.value = ''; info.textContent = files.length ? `${plural(files.length, 'picture')} chosen.` : 'No pictures chosen yet.'; go2.disabled = !files.length; });
  const go2 = h('button', { class: 'btn primary', disabled: true }, 'Add them');
  const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Add screenshots'), h('p', { class: 'muted' }, 'Pick the game, then choose pictures from your device. They are shrunk a little and kept only here.'),
    picker.el, input, h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => input.click() }, 'Choose pictures')), info, err,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), go2)));
  go2.addEventListener('click', async () => {
    err.textContent = '';
    const gid = await picker.resolve(acct); if (!gid) return void (err.textContent = 'Name the game first.');
    ssBusy = true; go2.disabled = true; let n = 0, skipped = 0;
    for (const [i, f] of files.entries()) {
      info.textContent = `Adding ${i + 1} of ${files.length}...`;
      const blocked = await pictureBlocked(f); if (blocked) { err.textContent = blocked; break; }
      try {
        const thumb = await downscale(f, 360), full = await downscale(f, 1920), token = uid(), id = uid();
        if (!(await ssSave(acct, { id: uid(), kind: 'photo', asset: id, f: full, m: token }))) break;
        if (!(await ssSave(acct, { ...SH.normShot({ caption: '', at: SH.takenAt(f.name, f.lastModified) }), id, kind: 'shot', game: gid, thumb, mtoken: token }))) { await deleteMedia(acct, token); break; }
        n++;
      } catch { skipped++; }
    }
    ssBusy = false; close();
    toast(n ? `Added ${plural(n, 'screenshot')}.${skipped ? ` ${plural(skipped, 'file')} could not be read.` : ''}` : skipped ? 'Those files could not be read as pictures.' : 'Nothing was added.');
    if (n) { ssTab = 'games'; location.hash = '#/apps/shots/' + gid; }
    render(true);
  });
}

/* ---------- organising ---------- */
function ssMove(acct, ctx, ids) {
  const picker = ssGamePicker(ctx, ''), err = h('p', { class: 'err' });
  const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, `Move ${ssPlural(ids.length)}`), picker.el, err,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn primary', onclick: async () => {
      const gid = await picker.resolve(acct); if (!gid) return void (err.textContent = 'Name the game first.');
      for (const id of ids) { const s = ssShots(ctx).find(x => x.id === id); if (s && s.game !== gid && !(await ssSave(acct, { ...s, game: gid }))) return; }
      close(); ssSel.clear(); ssSelect = false; toast(`Moved ${ssPlural(ids.length)}.`); render(true);
    } }, 'Move'))));
}
function ssConfirmDelete(acct, ctx, ids) {
  const close = modal(h('div', { class: 'modal-body' }, h('p', {}, `Delete ${ssPlural(ids.length)}? There is no undo.`), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Keep'), h('button', { class: 'btn danger', onclick: async () => {
    for (const id of ids) { const s = ssShots(ctx).find(x => x.id === id); if (s) { await deleteMedia(acct, s.mtoken); await appDelete(s.id); } }
    close(); ssSel.clear(); ssSelect = false; toast('Deleted.'); render(true);
  } }, 'Delete'))));
}
function ssRename(acct, ctx, game) {
  const input = h('input', { value: game.name, maxlength: 80, 'aria-label': 'Game title' }), err = h('p', { class: 'err' });
  const done = async () => {
    const name = SH.cleanTitle(input.value); if (!name) return void (err.textContent = 'A game needs a title.');
    const dup = SH.findGame(ssGames(ctx), name); if (dup && dup.id !== game.id) return void (err.textContent = `You already have a folder called "${dup.name}". Move the screenshots into it instead.`);
    if (await ssSave(acct, { ...game, name })) { close(); render(true); }
  };
  const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, 'Rename game'), input, err, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn primary', onclick: done }, 'Save'))));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') done(); }); setTimeout(() => input.focus(), 30);
}
function ssDeleteGame(acct, ctx, game, shots) {
  const close = modal(h('div', { class: 'modal-body' }, h('p', {}, shots.length ? `Delete "${game.name}" and its ${ssPlural(shots.length)}? There is no undo.` : `Delete the empty folder "${game.name}"?`),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Keep it'), h('button', { class: 'btn danger', onclick: async () => {
      for (const s of shots) { await deleteMedia(acct, s.mtoken); await appDelete(s.id); }
      await appDelete(game.id); close(); toast('Deleted.'); location.hash = '#/apps/shots'; render(true);
    } }, 'Delete'))));
}

/* ---------- looking at one ---------- */
function ssViewer(acct, ctx, list, start) {
  let i = start, token = 0;
  const games = new Map(ssGames(ctx).map(g => [g.id, g.name]));
  const img = h('img', { class: 'viewer-img', alt: '' }), meta = h('div', { class: 'muted ss-meta' }), cap = h('input', { maxlength: 500, placeholder: 'Add a caption', 'aria-label': 'Caption' });
  const cur = () => list[i];
  const show = async () => {
    const s = cur(), my = ++token;
    img.src = s.thumb; img.alt = s.caption || games.get(s.game) || 'Screenshot';
    meta.textContent = `${games.get(s.game) || ''} · ${SH.dayLabel(s.at)} · ${i + 1} of ${list.length}`; cap.value = s.caption || '';
    try { const m = (await loadMedia(acct, s.mtoken))[0]; if (m && my === token) img.src = m.f; } catch { /* the thumbnail stays */ }
  };
  const step = n => { saveCap(); i = (i + n + list.length) % list.length; show(); };
  const saveCap = () => { const s = cur(); if (s && cap.value.trim() !== (s.caption || '')) { s.caption = cap.value.trim(); ssSave(acct, { ...s }); } };
  const root = h('div', { class: 'viewer', tabindex: '-1', onkeydown: e => { if (e.target === cap) return; if (list.length > 1 && e.key === 'ArrowRight') step(1); else if (list.length > 1 && e.key === 'ArrowLeft') step(-1); } },
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => { saveCap(); close(); render(true); } }, icon('x')), h('b', {}, 'Screenshot')),
    h('div', { class: 'mp' }, h('div', { class: 'viewer-stage' }, h('div', { class: 'viewer-frame' },
      list.length > 1 ? h('button', { class: 'viewer-nav prev', 'aria-label': 'Previous screenshot', onclick: () => step(-1) }, icon('back')) : null, img,
      list.length > 1 ? h('button', { class: 'viewer-nav next flip', 'aria-label': 'Next screenshot', onclick: () => step(1) }, icon('back')) : null), meta),
      cap.parentNode ? null : h('div', { style: 'padding:8px 0' }, cap),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: () => { saveCap(); const s = cur(); close(); ssMove(acct, ctx, [s.id]); } }, 'Move to game'),
        h('button', { class: 'btn', onclick: async () => { const s = cur(), m = (await loadMedia(acct, s.mtoken))[0], bytes = SH.dataBytes(m ? m.f : s.thumb); if (!bytes) return toast('That could not be saved.'); const r = await saveFile(SH.fileName(games.get(s.game), s, i + 1), 'image/jpeg', bytes); toast(r.ok ? `Saved to ${r.where}.` : r.where); } }, 'Save a copy'),
        h('button', { class: 'btn danger', onclick: () => { const s = cur(); close(); ssConfirmDelete(acct, ctx, [s.id]); } }, 'Delete'))));
  const close = modal(root); show(); setTimeout(() => root.focus(), 0);
}

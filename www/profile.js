'use strict';
/* The profile page's extras: a status ("What are you currently obsessed with?") and a Board of widgets (favorite game, games you like...).
   You type everything in yourself; suggestions come only from the games already in your own Achievements and Screenshots apps. */
const Prof = (() => {
  const P = ProfCore;
  const rec = ctx => (ctx.apps.pprof || [])[0];
  const mine = ctx => P.normProfile(rec(ctx));
  async function save(acct, ctx, patch) { const r = rec(ctx), cur = mine(ctx), v = { status: cur.status, widgets: cur.widgets, ...patch }; return appSave(acct, { id: r ? r.id : 'pprof' + acct.id, accountId: acct.id, kind: 'pprof', status: v.status, widgets: v.widgets, updatedAt: Date.now() }); }
  const statusText = ctx => { const s = mine(ctx).status; return s ? ((s.emoji ? s.emoji + ' ' : '') + s.text).trim() : ''; };

  /* ----- status ----- */
  function statusModal(acct, ctx) {
    const cur = mine(ctx).status || { text: '', emoji: '', until: 0 }; let emoji = cur.emoji, clear = 'never';
    const input = h('input', { value: cur.text, maxlength: P.MAX_STATUS, placeholder: 'What are you currently obsessed with?', 'aria-label': 'Status' });
    const emo = h('button', { class: 'btn emoji-btn', type: 'button', 'aria-label': 'Choose an emoji', onclick: () => { grid.hidden = !grid.hidden; } }, emoji || '\u{1F642}');
    const grid = h('div', { class: 'emoji-grid', hidden: true }, P.EMOJI.map(e => h('button', { type: 'button', 'aria-label': e, onclick: () => { emoji = e; emo.textContent = e; grid.hidden = true; paint(); } }, e)), h('button', { type: 'button', class: 'emoji-none', onclick: () => { emoji = ''; emo.textContent = '\u{1F642}'; grid.hidden = true; paint(); } }, 'None'));
    const sel = h('select', { 'aria-label': 'Clear after', onchange: e => { clear = e.target.value; } }, P.CLEARS.map(([v, l]) => h('option', { value: v }, l)));
    const preview = h('div', { class: 'status-bubble static' });
    const paint = () => { const t = P.cleanText(input.value); preview.replaceChildren(emoji ? h('span', { class: 'sb-emo' }, emoji) : null, t ? t : h('i', {}, 'What are you currently obsessed with?')); };
    input.addEventListener('input', paint);
    const done = async v => { if (await save(acct, ctx, { status: v })) { close(); toast(v ? 'Status saved.' : 'Status cleared.'); render(true); } };
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Set your status')),
      h('div', { class: 'mp' }, preview, h('div', { class: 'status-row' }, emo, input), grid,
        h('label', { class: 'field' }, h('span', {}, 'Clear status'), sel),
        h('p', { class: 'fine' }, 'Your status shows on your profile and next to your name in the member list. Only you will see it.'),
        h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { const text = P.cleanText(input.value); done(text || emoji ? { text, emoji, until: P.untilFor(clear) } : null); } }, 'Save'), cur.text || cur.emoji ? h('button', { class: 'btn', type: 'button', onclick: () => done(null) }, 'Clear it now') : null, h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Cancel')))));
    paint(); setTimeout(() => input.focus(), 0);
  }
  const statusBubble = (acct, ctx) => { const s = mine(ctx).status; return h('button', { class: 'status-bubble' + (s ? '' : ' empty'), type: 'button', 'aria-label': s ? 'Change your status' : 'Set a status', onclick: () => statusModal(acct, ctx) }, s ? [s.emoji ? h('span', { class: 'sb-emo' }, s.emoji) : null, s.text] : [h('span', { class: 'sb-plus' }, '+'), h('i', {}, 'What are you currently obsessed with?')]); };

  /* ----- the Board ----- */
  const hue = t => { let x = 0; for (const c of t) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };
  const tile = (it, onRemove) => h('div', { class: 'pw-tile', title: it.t },
    h('div', { class: 'pw-cover', style: it.img ? `background:url("${it.img}") center / cover` : `background:linear-gradient(160deg,hsl(${hue(it.t)} 55% 38%),hsl(${(hue(it.t) + 50) % 360} 60% 24%))` }, it.img ? null : h('b', {}, it.t.slice(0, 1).toUpperCase())),
    h('span', { class: 'pw-name' }, it.t), onRemove ? h('button', { class: 'pw-x', type: 'button', 'aria-label': 'Remove ' + it.t, onclick: onRemove }, icon('x')) : null);
  // games already in your own apps, to pick from (nothing is fetched from anywhere)
  const mySuggestions = ctx => { const seen = new Set(), out = []; for (const g of [...(ctx.apps.agame || []), ...(ctx.apps.shotgame || [])]) { const t = String(g.name || '').trim(); if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push({ t, img: g.coverImg || '' }); } } return out.slice(0, 24); };
  function addGameModal(acct, ctx, type) {
    const info = P.widgetInfo(type); let img = '';
    const name = h('input', { maxlength: P.MAX_TITLE, placeholder: 'Game name', 'aria-label': 'Game name' }), prev = h('div', { class: 'pw-cover pw-prev' }, '+');
    const setImg = d => { img = d; prev.style.background = d ? `url("${d}") center / cover` : ''; prev.textContent = d ? '' : '+'; };
    const have = new Set(((mine(ctx).widgets.find(w => w.type === type) || {}).items || []).map(i => i.t.toLowerCase()));
    const add = async item => { const r = P.addItem(mine(ctx).widgets, type, item); if (r.error) { toast(r.error); return false; } if (await save(acct, ctx, { widgets: r.widgets })) { render(true); return true; } return false; };
    const sug = mySuggestions(ctx).filter(s => !have.has(s.t.toLowerCase()));
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add to ' + info.name)),
      h('div', { class: 'mp' }, h('div', { class: 'pw-add' }, h('button', { class: 'pw-pick', type: 'button', 'aria-label': 'Choose a cover picture', title: 'Choose a cover picture', onclick: async () => { const d = await chooseImage(180, 240); if (d) setImg(d); } }, prev), h('div', {}, h('label', { class: 'field' }, h('span', {}, 'Name'), name), h('p', { class: 'fine' }, 'A cover picture is optional. It stays on this device.'))),
        h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => { if (await add({ t: name.value, img })) close(); } }, 'Add'), h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Done')),
        sug.length ? h('div', {}, h('h4', {}, 'From your own apps'), h('p', { class: 'fine' }, 'Games you already keep in Achievements and Screenshots.'), h('div', { class: 'pw-sug' }, sug.map(s => h('button', { class: 'pw-sug-b', type: 'button', onclick: async e => { const btn = e.currentTarget; if (await add(s)) { btn.remove(); if (info.max === 1) close(); } } }, tile(s))))) : null)));
    setTimeout(() => name.focus(), 0);
  }
  function addWidgetModal(acct, ctx) {
    const have = new Set(mine(ctx).widgets.map(w => w.type)), left = P.WIDGETS.filter(w => !have.has(w.id));
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add a widget')),
      h('div', { class: 'mp' }, left.length ? left.map(w => h('button', { class: 'pw-choice', type: 'button', onclick: async () => { if (await save(acct, ctx, { widgets: P.addWidget(mine(ctx).widgets, w.id) })) { close(); render(true); } } }, h('b', {}, w.name), h('small', {}, w.blurb))) : h('p', {}, 'Every widget is already on your board.'),
        h('p', { class: 'fine' }, 'Widgets are things you type in yourself. There are none that connect to an online game or account, and there never will be.'))));
  }
  function board(acct, ctx) {
    const cur = mine(ctx), setW = async w => { if (await save(acct, ctx, { widgets: w })) render(true); };
    const card = (w, i) => {
      const info = P.widgetInfo(w.type), full = w.items.length >= info.max;
      return h('section', { class: 'pw-card' + (info.max === 1 ? ' single' : ''), 'aria-label': info.name },
        h('div', { class: 'pw-head' }, h('b', {}, info.name), h('small', { class: 'muted' }, info.max === 1 ? '' : `${w.items.length} of ${info.max}`), h('span', { class: 'pw-spacer' }),
          h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Move up', disabled: i === 0, onclick: () => setW(P.moveWidget(cur.widgets, w.type, -1)) }, icon('arrowup')), h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Move down', disabled: i === cur.widgets.length - 1, onclick: () => setW(P.moveWidget(cur.widgets, w.type, 1)) }, icon('arrowdown')),
          h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Add to ' + info.name, title: info.max === 1 && full ? 'Replace it' : 'Add a game', onclick: () => addGameModal(acct, ctx, w.type) }, icon('plus')),
          h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Remove the ' + info.name + ' widget', title: 'Remove this widget', onclick: () => setW(P.removeWidget(cur.widgets, w.type)) }, icon('trash'))),
        w.items.length ? h('div', { class: 'pw-grid' }, w.items.map(it => tile(it, () => setW(P.removeItem(cur.widgets, w.type, it.t))))) : h('p', { class: 'fine pw-empty' }, `${info.blurb} This widget stays hidden until you add one.`));
    };
    return h('div', { class: 'board' },
      h('div', { class: 'board-head' }, h('b', {}, 'Your board'), h('button', { class: 'btn', type: 'button', onclick: () => addWidgetModal(acct, ctx) }, '+ Add widget')),
      cur.widgets.length ? cur.widgets.map(card) : h('div', { class: 'pw-none' }, h('p', {}, 'Customize your profile with widgets.'), h('p', { class: 'fine' }, 'Share the games you love, are playing or want to play. Everything is typed in by you and stays on this device.'), h('button', { class: 'btn primary', type: 'button', onclick: () => addWidgetModal(acct, ctx) }, 'Add your first widget')));
  }
  return { mine, statusText, statusBubble, statusModal, board };
})();
if (typeof module !== 'undefined') module.exports = Prof;

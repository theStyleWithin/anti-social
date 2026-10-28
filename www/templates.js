'use strict';
/* Templates: the pieces that make Anti-Social look like a different kind of social app. Appearance only: your data,
   your accounts and every feature stay exactly the same. Chat Rooms is a server with channels and a member list. */
const TP = TemplateCore;

// How a time is written in the current template.
function stamp(ts) {
  const id = tplId();
  if (id === 'chat') {
    const d = new Date(ts), now = new Date();
    const t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(now) - day(d)) / 864e5);
    return diff === 0 ? `Today at ${t}` : diff === 1 ? `Yesterday at ${t}` : `${d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' })} ${t}`;
  }
  return '· ' + timeAgo(ts);
}

/* ---------- Chat Rooms ---------- */
function drawer(side) { document.querySelector('.shell')?.classList.toggle(side + '-open'); }
const closeDrawers = () => document.querySelector('.shell')?.classList.remove('left-open', 'right-open');

function shellChat(acct, route, main, ctx, chId) {
  const chans = [...ctx.apps.chan].sort((a, b) => a.createdAt - b.createdAt);
  const home = route === 'home';
  const cur = home ? (chans.find(c => c.id === chId) ? chId : 'general') : '';
  const railBtn = (href, label, ic, on) => h('a', { class: 'rail-btn' + (on ? ' active' : ''), href: '#' + href, title: label, 'aria-label': label, 'aria-current': on ? 'page' : null, onclick: closeDrawers }, icon(ic));
  const rail = h('nav', { class: 'rail', 'aria-label': 'Servers' },
    h('a', { class: 'rail-btn server' + (['home', 'profile', 'post', 'u'].includes(route) ? ' active' : ''), href: '#/', title: TP.serverName(acct), 'aria-label': TP.serverName(acct), onclick: closeDrawers }, TP.initials(acct.name || acct.handle)),
    h('div', { class: 'rail-sep' }),
    railBtn('/apps', W('navApps'), 'grid', route === 'apps'), railBtn('/explore', W('navExplore'), 'compass', route === 'explore'), railBtn('/notifications', W('navNotifications'), 'bell', route === 'notifications'),
    h('button', { class: 'rail-btn add', type: 'button', title: 'Add a server', 'aria-label': 'Add a server', onclick: () => toast('There is no one to invite. Servers need other people.') }, icon('plus')));
  const chanRow = c => {
    const id = c ? c.id : 'general';
    return h('div', { class: 'chan-row' + (cur === id ? ' active' : '') },
      h('a', { href: c ? '#/channel/' + c.id : '#/', 'aria-current': cur === id ? 'page' : null, onclick: closeDrawers }, icon('hash'), h('span', {}, c ? c.name : 'general')),
      c ? h('button', { class: 'chan-gear', type: 'button', 'aria-label': `Edit #${c.name}`, title: 'Edit channel', onclick: () => channelEditor(acct, ctx, c) }, icon('settings')) : null);
  };
  const voice = name => h('button', { class: 'chan-row voice', type: 'button', onclick: () => toast('Nobody to talk to. Voice is just you, breathing.') }, icon('speaker'), h('span', {}, name));
  const userbar = h('div', { class: 'userbar' },
    h('button', { class: 'who', type: 'button', 'aria-haspopup': 'menu', 'aria-label': 'Accounts', onclick: e => openAccountMenu(e.currentTarget, acct) },
      h('span', { class: 'av-wrap' }, avatar(acct, 'sm'), h('i', { class: 'dot online' })), h('span', { class: 'names' }, h('b', {}, acct.name), h('small', {}, 'Online'))),
    [['mic', 'Mute'], ['headset', 'Deafen']].map(([ic, label]) => h('button', { class: 'ub', type: 'button', 'aria-label': label, 'aria-pressed': 'false', title: label, onclick: e => { const b = e.currentTarget; const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); toast(on ? `${label}d. Nobody noticed.` : `${label} off.`); } }, icon(ic))),
    h('a', { class: 'ub', href: '#/settings', 'aria-label': W('navSettings'), title: W('navSettings'), onclick: closeDrawers }, icon('settings')));
  const left = h('div', { class: 'chat-left' }, rail,
    h('aside', { class: 'chan-col', 'aria-label': 'Channels' },
      h('button', { class: 'server-head', type: 'button', 'aria-haspopup': 'menu', onclick: e => serverMenu(e.currentTarget, acct, ctx) }, h('b', {}, TP.serverName(acct)), icon('chevron')),
      h('div', { class: 'chan-scroll' },
        h('div', { class: 'chan-cat' }, h('span', {}, 'Text channels'), h('button', { type: 'button', 'aria-label': 'Create channel', title: 'Create channel', onclick: () => channelEditor(acct, ctx, null) }, icon('plus'))),
        chanRow(null), chans.map(chanRow),
        h('div', { class: 'chan-cat' }, h('span', {}, 'Voice channels')), voice('Lounge'), voice('AFK')),
      userbar));
  const showMembers = home;
  return h('div', { class: 'shell chat' + (showMembers ? '' : ' no-members') },
    left,
    h('main', { class: 'main' + (home ? ' chat-page' : '') }, main),
    showMembers ? memberPanel(acct, ctx) : null,
    h('div', { class: 'chat-backdrop', onclick: closeDrawers }));
}

function serverMenu(anchor, acct, ctx) {
  document.querySelector('.popover')?.remove();
  const close = () => { pop.remove(); document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc, true); };
  const outside = e => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const row = (label, ic, fn) => h('button', { class: 'pop-row', role: 'menuitem', onclick: () => { close(); fn(); } }, h('span', { class: 'pop-plus' }, icon(ic)), h('b', {}, label));
  const pop = h('div', { class: 'popover server-menu', role: 'menu', 'aria-label': 'Server' },
    row('Create channel', 'plus', () => channelEditor(acct, ctx, null)), row(W('navProfile'), 'user', () => go('/profile')), row(W('navSettings'), 'settings', () => go('/settings')));
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left + 8, innerWidth - pop.offsetWidth - 8)) + 'px'; pop.style.top = (r.bottom + 4) + 'px';
  document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', esc, true);
}

// The member list: you, plus (in Populated mode) generated people. Nobody on it is real.
function memberPanel(acct, ctx) {
  const rows = [];
  const row = (who, opts = {}) => h('a', { class: 'member' + (opts.online === false ? ' off' : ''), href: who.id ? '#/u/' + who.id : '#/profile', onclick: closeDrawers },
    h('span', { class: 'av-wrap' }, who.id ? ghostAvatar(who, 'sm') : avatar(acct, 'sm'), h('i', { class: 'dot ' + (opts.online === false ? 'offline' : 'online') })),
    h('span', { class: 'names' }, h('b', { class: opts.role ? 'role-' + opts.role.toLowerCase() : '' }, who.name, opts.crown ? h('span', { class: 'crown', title: 'Server owner' }, icon('crown')) : null), who.activity ? h('small', {}, who.activity) : null));
  rows.push(h('div', { class: 'member-cat' }, 'Owner — 1'), row(acct, { crown: true, role: 'Admin' }));
  let note;
  if (populated()) {
    const list = Ghost.members(worldSeed(), 80, { ...poolOpts(), now: Date.now() });
    const groups = TP.memberGroups(list);
    for (const g of groups) {
      rows.push(h('div', { class: 'member-cat' }, `${g.name} — ${g.list.length}`), g.list.map(m => row(m, { role: g.name === 'Admin' || g.name === 'Moderator' ? g.name : '', online: m.online })));
    }
    note = list.length ? `Showing ${list.length} members. They are generated, and none of them are real.` : 'Nobody has joined yet.';
  } else note = 'It is just you. Turn on Populated mode in Settings to fill the member list with people who are not real.';
  return h('aside', { class: 'members', 'aria-label': 'Members' }, h('div', { class: 'members-scroll' }, rows, h('p', { class: 'fine' }, note)));
}

function chatHome(acct, ctx, chId) {
  const chans = ctx.apps.chan;
  const ch = chId && chId !== 'general' ? chans.find(c => c.id === chId) : null;
  if (chId && chId !== 'general' && !ch) return [topbar('Channel not found', { back: true }), emptyState('That channel is gone', 'It may have been deleted. Nobody will miss it.')];
  const cid = ch ? ch.id : 'general', name = ch ? ch.name : 'general';
  const mine = ctx.posts.filter(p => !p.parentId && TP.inChannel(p, cid));
  const crowdHere = TP.crowdMayPost(cid) && populated();          // only #general ever hears from the generated members
  let items = [], older = false;
  if (crowdHere) {
    const crowd = GW.feed(worldSeed(), Date.now(), feedCount);
    const cutoff = crowd.length ? crowd[crowd.length - 1].ts : 0;
    items = [...crowd.map(g => ({ ts: g.ts, el: () => ghostPostEl(g, acct, ctx) })), ...mine.filter(p => p.createdAt >= cutoff).map(p => ({ ts: p.createdAt, el: () => postEl(p, acct, ctx) }))];
    older = feedCount < FEED_MAX && crowd.length >= feedCount;
  } else items = mine.map(p => ({ ts: p.createdAt, el: () => postEl(p, acct, ctx) }));
  items = TP.messageOrder(items);
  const topic = ch ? (ch.topic || '') : 'Where everyone is, and nobody talks.';
  const head = h('div', { class: 'chat-head' },
    h('button', { class: 'hamburger', type: 'button', 'aria-label': 'Open channels', onclick: () => drawer('left') }, icon('menu')),
    h('span', { class: 'hash' }, icon('hash')), h('h1', {}, name), topic && h('span', { class: 'topic' }, topic),
    h('span', { style: 'margin-left:auto' }),
    acct.vault && h('button', { class: 'ub', type: 'button', 'aria-label': 'Lock vault', title: 'Lock vault', onclick: () => { lockVault(); render(); } }, icon('lock')),
    ch && h('button', { class: 'ub', type: 'button', 'aria-label': 'Edit channel', title: 'Edit channel', onclick: () => channelEditor(acct, ctx, ch) }, icon('settings')),
    h('button', { class: 'ub members-btn', type: 'button', 'aria-label': 'Show members', title: 'Member list', onclick: () => drawer('right') }, icon('users')));
  const welcome = h('div', { class: 'chat-welcome' }, h('div', { class: 'big-hash' }, icon('hash')), h('h2', {}, `Welcome to #${name}!`),
    h('p', {}, `This is the start of the #${name} channel.`), !crowdHere && h('p', { class: 'muted' }, ch ? (populated() ? 'Only you can post here. The server members only talk in #general.' : 'Only you can post here.') : 'Nobody has said anything here yet. Say something. Nobody will read it.'));
  const list = h('div', { class: 'chat-list', role: 'log', 'aria-label': `Messages in #${name}`, 'aria-live': 'off' },
    older ? h('div', { class: 'empty-note' }, h('button', { class: 'btn', onclick: () => { feedCount += 25; render(true); } }, 'Load older messages')) : welcome,
    items.map(x => x.el()));
  const vaultNote = !acct.vault && !ls('as.hidenote.' + acct.id) && h('div', { class: 'vault-note' }, h('span', {}, "Your messages aren't encrypted. That's fine for a local app, or you can lock them with a passcode."),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => passcodeModal(acct) }, 'Set up vault'), h('button', { class: 'btn', onclick: () => { ls('as.hidenote.' + acct.id, '1'); render(true); } }, 'No thanks')));
  return [head, vaultNote, list, composer(acct, { placeholder: `Message #${name}`, channel: ch ? ch.id : null, enterSends: true, label: W('send'), onDone: () => render(true) })];
}

// Create, rename or delete a channel. Deleting a channel deletes the messages you wrote in it.
function channelEditor(acct, ctx, ch) {
  const isNew = !ch, others = ctx.apps.chan.filter(c => !ch || c.id !== ch.id);
  const name = h('input', { value: ch ? ch.name : '', maxlength: 40, placeholder: 'new-channel', 'aria-label': 'Channel name', autocapitalize: 'none' });
  const topic = h('input', { value: ch ? ch.topic || '' : '', maxlength: 120, placeholder: 'What is this channel about?', 'aria-label': 'Channel topic' });
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary' }, isNew ? 'Create channel' : 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'Create channel' : 'Edit channel')),
    h('div', { class: 'mp' },
      h('p', { class: 'fine', style: 'padding:0 0 10px' }, 'Only you can post in channels you make. The generated server members only ever talk in #general.'),
      h('label', { class: 'field' }, h('span', {}, 'Channel name'), name), h('label', { class: 'field' }, h('span', {}, 'Topic (optional)'), topic), err,
      h('div', { class: 'btnrow' }, save, !isNew && h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Delete #${ch.name} and every message you wrote in it? There is no undo.`)) return;
        const doomed = new Set(ctx.posts.filter(p => p.channel === ch.id).map(p => p.id));
        for (let grew = true; grew;) { grew = false; for (const q of ctx.posts) if (q.parentId && doomed.has(q.parentId) && !doomed.has(q.id)) { doomed.add(q.id); grew = true; } }
        for (const id of doomed) await db.del('posts', id);
        await appDelete(ch.id); close(); toast(`#${ch.name} was deleted.`); go('/');
      } }, 'Delete channel')))));
  save.addEventListener('click', async () => {
    const msg = TP.channelError(name.value, others);
    if (msg) { err.textContent = msg; return; }
    save.disabled = true;
    const rec = ch ? { ...ch } : { id: uid(), accountId: acct.id, kind: 'chan', createdAt: Date.now() };
    Object.assign(rec, { name: TP.channelName(name.value), topic: topic.value.trim().slice(0, 120), updatedAt: Date.now() });
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    close(); go('/channel/' + rec.id);
  });
  setTimeout(() => name.focus(), 0);
}

/* ---------- the picker in Settings ---------- */
const TPL_ART = {
  default: '<rect x="2" y="2" width="96" height="62" rx="4" class="a-bg"/><rect x="6" y="8" width="9" height="40" rx="3" class="a-nav"/><rect x="20" y="8" width="50" height="9" rx="2" class="a-bar"/><rect x="20" y="21" width="50" height="9" rx="2" class="a-card"/><rect x="20" y="34" width="50" height="9" rx="2" class="a-card"/><rect x="20" y="47" width="50" height="9" rx="2" class="a-card"/><rect x="75" y="8" width="19" height="16" rx="3" class="a-nav"/><rect x="75" y="28" width="19" height="16" rx="3" class="a-nav"/>',
  chat: '<rect x="2" y="2" width="96" height="62" rx="4" class="a-chat"/><rect x="2" y="2" width="11" height="62" rx="4" class="a-rail"/><circle cx="7.5" cy="12" r="3.5" class="a-acc"/><circle cx="7.5" cy="24" r="3.5" class="a-nav"/><rect x="14" y="2" width="22" height="62" class="a-chan"/><rect x="18" y="10" width="14" height="3" rx="1.5" class="a-bar"/><rect x="18" y="17" width="14" height="3" rx="1.5" class="a-bar"/><rect x="18" y="24" width="14" height="3" rx="1.5" class="a-bar"/><circle cx="44" cy="15" r="3.5" class="a-acc"/><rect x="50" y="12" width="22" height="3" rx="1.5" class="a-bar"/><rect x="50" y="17" width="30" height="3" rx="1.5" class="a-card"/><circle cx="44" cy="29" r="3.5" class="a-nav"/><rect x="50" y="26" width="18" height="3" rx="1.5" class="a-bar"/><rect x="50" y="31" width="26" height="3" rx="1.5" class="a-card"/><rect x="41" y="52" width="38" height="7" rx="3" class="a-chan"/><rect x="82" y="2" width="16" height="62" class="a-chan"/><circle cx="86" cy="12" r="2.5" class="a-acc"/><rect x="90" y="11" width="6" height="2.5" rx="1" class="a-bar"/><circle cx="86" cy="21" r="2.5" class="a-nav"/><rect x="90" y="20" width="6" height="2.5" rx="1" class="a-bar"/>',
  blue: '<rect x="2" y="2" width="96" height="62" rx="4" class="a-gray"/><rect x="2" y="2" width="96" height="9" rx="3" class="a-blue"/><rect x="6" y="5" width="16" height="3" rx="1.5" class="a-white"/><rect x="26" y="4" width="26" height="5" rx="1" class="a-white2"/><rect x="6" y="16" width="20" height="3" rx="1.5" class="a-bar"/><rect x="6" y="22" width="20" height="3" rx="1.5" class="a-bar"/><rect x="6" y="28" width="20" height="3" rx="1.5" class="a-bar"/><rect x="31" y="15" width="40" height="10" rx="1.5" class="a-white"/><rect x="31" y="28" width="40" height="14" rx="1.5" class="a-white"/><rect x="31" y="45" width="40" height="14" rx="1.5" class="a-white"/><rect x="76" y="15" width="19" height="14" rx="1.5" class="a-white"/><rect x="76" y="32" width="19" height="14" rx="1.5" class="a-white"/>',
};
function templateSection() {
  const cur = tplId();
  const card = t => {
    const art = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    art.setAttribute('viewBox', '0 0 100 66'); art.setAttribute('class', 'tpl-art tpl-' + t.id); art.setAttribute('aria-hidden', 'true'); art.innerHTML = TPL_ART[t.id];
    return h('button', { class: 'tpl-card' + (cur === t.id ? ' on' : ''), type: 'button', 'aria-pressed': String(cur === t.id),
      onclick: () => { ls('as.template', t.id === 'default' ? null : t.id); applyTheme(); toast(t.id === 'default' ? 'Back to the original look.' : `${t.name} is on. Only the look changed.`); render(true); } },
      art, h('b', {}, t.name), h('span', { class: 'muted' }, t.blurb));
  };
  return h('section', {}, h('h3', {}, 'Template'), h('p', {}, 'Change how the whole app looks and what things are called. Your posts and apps do not change, and it works with your color theme.'),
    h('div', { class: 'tpl-grid' }, TP.TEMPLATES.map(card)));
}

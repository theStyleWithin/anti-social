'use strict';
/* Anti-Social: a social network with nobody on it.
   Everything lives in this browser's IndexedDB. There is no server. */

/* ---------- tiny helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}

const ICONS = {
  logo: '<circle cx="12" cy="12" r="9"/><path d="M5.6 18.4L18.4 5.6"/>',
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  reply: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.2A8 8 0 1 1 21 12z"/>',
  repost: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  compose: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  chart: '<path d="M3 20h18M7 20V10M12 20V4M17 20v-7"/>',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name]; // static strings only
  return s;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function ls(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
  } catch { /* storage blocked */ }
  return null;
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  const d = new Date(ts);
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}

const PALETTE = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];
const colorFor = handle => PALETTE[[...handle].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

/* ---------- storage ---------- */
let dbp;
function openDb() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('anti-social', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('accounts', { keyPath: 'id' });
      r.result.createObjectStore('posts', { keyPath: 'id' }).createIndex('accountId', 'accountId');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const store = async (name, mode = 'readonly') => (await openDb()).transaction(name, mode).objectStore(name);
const db = {
  all: async n => req((await store(n)).getAll()),
  get: async (n, k) => req((await store(n)).get(k)),
  put: async (n, v) => req((await store(n, 'readwrite')).put(v)),
  del: async (n, k) => req((await store(n, 'readwrite')).delete(k)),
  clear: async n => req((await store(n, 'readwrite')).clear()),
  postsOf: async id => req((await store('posts')).index('accountId').getAll(id)),
};

/* ---------- state ---------- */
let renderId = 0;
let authMode = { mode: 'pick' };
let profileTab = 'posts';
let exploreQuery = '';
let installPrompt = null;
let session = ls('as.session');

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });

function applyTheme() {
  const t = ls('as.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#000000' : '#ffffff');
}

const TOASTS = [
  'Posted. Seen by: no one.',
  'Posted to an audience of zero.',
  'Your take has been safely ignored.',
  'Delivered to nobody.',
  'Hot take secured. No witnesses.',
  'Posted. Not even the algorithm cares.',
];
function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

function go(path) {
  if (location.hash === '#' + path) render(); else location.hash = path;
}

/* ---------- modal ---------- */
function modal(content) {
  const bg = h('div', { class: 'modal-bg', onclick: e => { if (e.target === bg) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, content));
  const close = () => bg.remove();
  document.body.append(bg);
  return close;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') [...document.querySelectorAll('.modal-bg')].pop()?.remove();
});

/* ---------- images ---------- */
function downscale(file, max = 1280) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

/* ---------- components ---------- */
function avatar(a, size = '') {
  const e = h('div', { class: 'avatar ' + size }, (a.name || a.handle)[0].toUpperCase());
  e.style.background = a.color || colorFor(a.handle);
  return e;
}

function richText(text) {
  return text.split(/(#\w+|@\w+|https?:\/\/[^\s]+)/g).map(part => {
    if (/^https?:\/\//.test(part)) return h('a', { href: part, target: '_blank', rel: 'noopener noreferrer' }, part);
    if (/^[#@]\w+/.test(part)) return h('span', { class: 'tag' }, part);
    return part;
  });
}

function mediaGrid(images) {
  if (!images?.length) return null;
  return h('div', { class: 'media n' + images.length }, images.map(src => h('img', { src, alt: 'Attached image', loading: 'lazy' })));
}

function topbar(title, { back = false, sub = '' } = {}) {
  return h('div', { class: 'topbar' },
    back && h('button', { class: 'back', 'aria-label': 'Back', onclick: () => history.length > 1 ? history.back() : go('/') }, icon('back')),
    h('div', {}, h('h1', {}, title), sub && h('div', { class: 'sub' }, sub)));
}

function composer(acct, { placeholder, parentId = null, onDone, autofocus = false, label = 'Post' }) {
  let images = [];
  const ta = h('textarea', { placeholder, rows: 1, 'aria-label': placeholder });
  const previews = h('div', { class: 'previews' });
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const submit = h('button', { class: 'btn primary', disabled: true }, label);

  const sync = () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    submit.disabled = !ta.value.trim() && !images.length;
    previews.replaceChildren(...images.map((src, i) => h('div', { class: 'pv' },
      h('img', { src, alt: '' }),
      h('button', { class: 'rm', 'aria-label': 'Remove image', onclick: () => { images.splice(i, 1); sync(); } }, icon('x')))));
  };
  const send = async () => {
    if (submit.disabled) return;
    submit.disabled = true;
    await db.put('posts', { id: uid(), accountId: acct.id, text: ta.value.trim(), images, createdAt: Date.now(), parentId, liked: false, reposted: false });
    toast(pick(TOASTS));
    onDone?.();
  };
  ta.addEventListener('input', sync);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
  submit.addEventListener('click', send);
  file.addEventListener('change', async () => {
    for (const f of [...file.files].slice(0, 4 - images.length)) {
      try { images.push(await downscale(f)); } catch { toast("That doesn't look like an image."); }
    }
    file.value = '';
    sync();
  });

  const el = h('div', { class: 'composer' }, avatar(acct),
    h('div', { class: 'body' }, ta, previews,
      h('div', { class: 'row' },
        h('button', { class: 'tool', 'aria-label': 'Add image', onclick: () => images.length < 4 && file.click() }, icon('image')),
        file, h('span', { style: 'margin-left:auto' }), submit)));
  if (autofocus) setTimeout(() => ta.focus(), 0);
  return el;
}

function postEl(p, acct, ctx, { detail = false } = {}) {
  const replies = ctx.replyCount.get(p.id) || 0;
  const parent = p.parentId && ctx.byId.get(p.parentId);
  const refresh = () => render(true);
  const patch = async fields => { await db.put('posts', { ...p, ...fields }); refresh(); };
  const remove = async () => {
    if (!confirm('Delete this post? (Nobody saw it, but still.)')) return;
    const doomed = new Set([p.id]);
    for (let grew = true; grew;) {
      grew = false;
      for (const q of ctx.posts) if (q.parentId && doomed.has(q.parentId) && !doomed.has(q.id)) { doomed.add(q.id); grew = true; }
    }
    for (const id of doomed) await db.del('posts', id);
    if (detail) go(p.parentId ? '/post/' + p.parentId : '/'); else refresh();
  };
  const act = (name, count, label, onclick, cls = '', on = false) =>
    h('button', { class: `act ${cls}${on ? ' on' : ''}`, 'aria-label': label, 'aria-pressed': cls === 'like' || cls === 'repost' ? String(on) : null, onclick: e => { e.stopPropagation(); onclick(); } },
      icon(name), count ? String(count) : '');

  const actions = h('div', { class: 'actions' },
    act('reply', replies, 'Reply', () => detail ? $('.composer textarea')?.focus() : go('/post/' + p.id)),
    act('repost', p.reposted ? 1 : 0, 'Repost', () => patch({ reposted: !p.reposted }), 'repost', p.reposted),
    act('heart', p.liked ? 1 : 0, 'Like', () => patch({ liked: !p.liked }), 'like', p.liked),
    h('span', { class: 'act views', title: 'Views', 'aria-label': '0 views' }, icon('chart'), '0'),
    act('trash', 0, 'Delete post', remove, 'del'));

  const name = h('span', { class: 'name' }, acct.name);
  const handle = h('span', { class: 'handle' }, '@' + acct.handle);

  if (detail) {
    const when = new Date(p.createdAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' });
    return h('article', { class: 'post detail' },
      h('div', { style: 'display:flex;gap:12px;align-items:center' }, avatar(acct),
        h('div', {}, h('div', {}, name), h('div', {}, handle))),
      p.reposted && h('div', { class: 'replying' }, 'You reposted yourself'),
      parent && h('div', { class: 'replying' }, 'Replying to yourself, as usual'),
      p.text && h('div', { class: 'text' }, richText(p.text)),
      mediaGrid(p.images),
      h('div', { class: 'muted', style: 'margin-top:12px' }, `${when} · `, h('b', { style: 'color:var(--fg)' }, '0'), ' Views'),
      h('div', { class: 'stats' },
        h('span', {}, h('b', {}, replies), ' Replies'),
        h('span', {}, h('b', {}, p.reposted ? 1 : 0), ' Reposts'),
        h('span', {}, h('b', {}, p.liked ? 1 : 0), ' Likes')),
      actions);
  }

  return h('article', { class: 'post', onclick: e => { if (!e.target.closest('button,a')) go('/post/' + p.id); } },
    avatar(acct),
    h('div', { class: 'content' },
      p.reposted && h('div', { class: 'replying' }, 'You reposted yourself'),
      h('div', { class: 'head' }, name, handle, h('span', { class: 'time' }, '· ' + timeAgo(p.createdAt))),
      parent && h('div', { class: 'replying' }, 'Replying to @' + acct.handle),
      p.text && h('div', { class: 'text' }, richText(p.text)),
      mediaGrid(p.images),
      actions));
}

function emptyState(title, text) {
  return h('div', { class: 'empty' }, h('h2', {}, title), h('p', {}, text));
}

/* ---------- views ---------- */
function homeView(acct, ctx) {
  const top = ctx.posts.filter(p => !p.parentId).sort((a, b) => b.createdAt - a.createdAt);
  return [
    topbar('Home'),
    composer(acct, { placeholder: "What's happening?", onDone: () => render(true) }),
    top.length
      ? [...top.map(p => postEl(p, acct, ctx)), h('div', { class: 'empty-note' }, "You're all caught up. Nobody else posted. Nobody else exists.")]
      : emptyState('Welcome to nowhere', 'Your timeline is empty. So is everyone else\'s. Go on, post something.'),
  ];
}

function exploreView(acct, ctx) {
  const q = exploreQuery.trim().toLowerCase();
  const hits = q ? ctx.posts.filter(p => p.text.toLowerCase().includes(q)).sort((a, b) => b.createdAt - a.createdAt) : [];
  const input = h('input', { type: 'search', placeholder: 'Search your own posts', value: exploreQuery, 'aria-label': 'Search your own posts' });
  input.addEventListener('input', () => {
    exploreQuery = input.value;
    clearTimeout(input._t);
    input._t = setTimeout(() => render(true).then(() => $('.topbar input')?.focus()), 200);
  });
  return [
    h('div', { class: 'topbar' }, icon('search'), input),
    q
      ? (hits.length ? hits.map(p => postEl(p, acct, ctx)) : emptyState('No results', `Nothing matches "${exploreQuery}". The whole internet is you.`))
      : [h('div', { class: 'card', style: 'margin:16px' }, h('h3', {}, 'Trending'), h('p', {}, 'Nothing is trending. Nobody is here to trend.')),
         h('div', { class: 'card', style: 'margin:16px' }, h('h3', {}, 'Who to follow'), h('p', {}, 'No one. There is no one.'))],
  ];
}

function notificationsView() {
  return [
    topbar('Notifications'),
    emptyState('Nothing to see here', 'Literally no one has liked, replied to, or noticed you. No one can. That is the whole point.'),
  ];
}

function postView(acct, ctx, id) {
  const p = ctx.byId.get(id);
  if (!p) return [topbar('Post', { back: true }), emptyState('Post not found', 'It may have been deleted. Nobody will miss it.')];
  const chain = [];
  for (let c = ctx.byId.get(p.parentId); c; c = ctx.byId.get(c.parentId)) chain.unshift(c);
  const replies = ctx.posts.filter(r => r.parentId === p.id).sort((a, b) => a.createdAt - b.createdAt);
  return [
    topbar('Post', { back: true }),
    chain.map(c => postEl(c, acct, ctx)),
    postEl(p, acct, ctx, { detail: true }),
    composer(acct, { placeholder: 'Post your reply (to yourself)', parentId: p.id, label: 'Reply', onDone: () => render(true) }),
    replies.map(r => postEl(r, acct, ctx)),
  ];
}

function profileView(acct, ctx) {
  const mine = ctx.posts.filter(p => !p.parentId);
  const list = {
    posts: mine,
    replies: ctx.posts.filter(p => p.parentId),
    media: ctx.posts.filter(p => p.images?.length),
  }[profileTab].sort((a, b) => b.createdAt - a.createdAt);
  const joined = new Date(acct.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['posts', 'Posts'], ['replies', 'Replies'], ['media', 'Media']].map(([k, label]) =>
    h('button', { role: 'tab', 'aria-selected': String(profileTab === k), class: profileTab === k ? 'active' : '', onclick: () => { profileTab = k; render(true); } }, label)));
  return [
    topbar(acct.name, { back: true, sub: plural(ctx.posts.length, 'post') }),
    h('div', { class: 'banner' }),
    h('div', { class: 'pinfo' },
      h('div', { class: 'top' }, avatar(acct, 'lg'), h('button', { class: 'btn', onclick: () => editProfile(acct) }, 'Edit profile')),
      h('h2', {}, acct.name),
      h('div', { class: 'muted' }, '@' + acct.handle),
      h('div', { class: 'bio' }, acct.bio || 'No bio. No audience either.'),
      h('div', { class: 'meta' }, 'Joined ' + joined + ' · Location: your device'),
      h('div', { class: 'follow' }, h('span', {}, h('b', {}, 0), ' Following'), h('span', {}, h('b', {}, 0), ' Followers'))),
    tabs,
    list.length ? list.map(p => postEl(p, acct, ctx)) : emptyState('Nothing here yet', 'Not that it matters. Nobody is checking.'),
  ];
}

function settingsView(acct) {
  const theme = ls('as.theme') || 'auto';
  const themeBtn = (v, label) => h('button', { class: 'btn' + (theme === v ? ' primary' : ''), onclick: () => { ls('as.theme', v === 'auto' ? null : v); applyTheme(); render(true); } }, label);
  return [
    topbar('Settings'),
    h('div', { class: 'settings' },
      h('section', {}, h('h3', {}, 'Display'), h('p', {}, 'Pick a theme. Nobody will see it.'),
        h('div', { class: 'btnrow' }, themeBtn('auto', 'Auto'), themeBtn('light', 'Light'), themeBtn('dark', 'Dark'))),
      h('section', {}, h('h3', {}, 'Install'), h('p', {}, 'Put Anti-Social on your home screen or desktop. It works offline, because there is nothing to connect to.'),
        installPrompt
          ? h('button', { class: 'btn primary', onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(true); } }, 'Install app')
          : h('p', { class: 'fine', style: 'padding:0' }, 'Use your browser menu: "Install app" or "Add to Home Screen".')),
      h('section', {}, h('h3', {}, 'Your data'), h('p', {}, 'It lives in this browser, on this device, and nowhere else. Clearing site data deletes it. There is no recovery because there is no one to recover it.'),
        h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: exportData }, 'Export everything (JSON)'))),
      h('section', {}, h('h3', {}, 'Account'),
        h('div', { class: 'btnrow' },
          h('button', { class: 'btn', onclick: logout }, 'Switch account'),
          h('button', { class: 'btn danger', onclick: () => deleteAccount(acct) }, 'Delete this account'),
          h('button', { class: 'btn danger', onclick: wipeEverything }, 'Delete all data on this device'))),
      h('section', {}, h('h3', {}, 'Terms of Use'), h('p', {}, 'TOUCH GRASS.'),
        h('p', { class: 'fine', style: 'padding:0' }, 'No servers. No tracking. No audience. Go outside.'))),
  ];
}

/* ---------- account actions ---------- */
function logout() { session = null; ls('as.session', null); authMode = { mode: 'pick' }; go('/'); }

async function deleteAccount(acct) {
  if (!confirm(`Delete @${acct.handle} and every post? This cannot be undone. Nobody can help you.`)) return;
  for (const p of await db.postsOf(acct.id)) await db.del('posts', p.id);
  await db.del('accounts', acct.id);
  logout();
}

async function wipeEverything() {
  if (!confirm('Delete ALL accounts and posts on this device? There are no backups. There is no one.')) return;
  await db.clear('posts'); await db.clear('accounts');
  logout();
}

async function exportData() {
  const accounts = (await db.all('accounts')).map(({ salt, hash, ...a }) => a);
  const posts = await db.all('posts');
  const blob = new Blob([JSON.stringify({ app: 'anti-social', exportedAt: new Date().toISOString(), accounts, posts }, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'anti-social-export.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Exported. Now you have a copy of everything nobody saw.');
}

function editProfile(acct) {
  const name = h('input', { value: acct.name, maxlength: 50 });
  const bio = h('textarea', { rows: 3, maxlength: 160 }, acct.bio || '');
  const color = h('input', { type: 'color', value: acct.color || colorFor(acct.handle) });
  const err = h('p', { class: 'err' });
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Edit profile')),
    h('div', { class: 'mp' },
      h('label', { class: 'field' }, h('span', {}, 'Name'), name),
      h('label', { class: 'field' }, h('span', {}, 'Bio'), bio),
      h('label', { class: 'field' }, h('span', {}, 'Avatar color'), color),
      err,
      h('button', { class: 'btn primary', onclick: async () => {
        if (!name.value.trim()) { err.textContent = 'You need a name, even here.'; return; }
        await db.put('accounts', { ...acct, name: name.value.trim(), bio: bio.value.trim(), color: color.value });
        close(); render(true);
      } }, 'Save'))));
}

function composeModal(acct) {
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x'))),
    composer(acct, { placeholder: "What's happening?", autofocus: true, onDone: () => { close(); render(true); } })));
}

/* ---------- auth ---------- */
async function authView() {
  const accounts = (await db.all('accounts')).sort((a, b) => a.createdAt - b.createdAt);
  if (!accounts.length && authMode.mode === 'pick') authMode = { mode: 'signup' };
  const wrap = body => h('div', { class: 'auth' }, h('div', { class: 'box' },
    h('div', { class: 'logo' }, icon('logo')), h('h1', {}, 'Anti-Social'),
    h('p', { class: 'tag' }, 'Social media with nobody on it.'), body));
  const loginAs = async a => { session = a.id; ls('as.session', a.id); go('/'); };

  if (authMode.mode === 'unlock') {
    const a = authMode.account;
    const pass = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Passcode' });
    const err = h('p', { class: 'err' });
    const submit = async e => {
      e.preventDefault();
      if (await sha256(a.salt + pass.value) === a.hash) loginAs(a); else { err.textContent = 'Wrong passcode. Nobody is going to help you.'; pass.select(); }
    };
    setTimeout(() => pass.focus(), 0);
    return wrap(h('form', { onsubmit: submit },
      h('label', { class: 'field' }, h('span', {}, `Passcode for @${a.handle}`), pass), err,
      h('div', { class: 'stack' }, h('button', { class: 'btn primary' }, 'Unlock'),
        h('button', { type: 'button', class: 'btn', onclick: () => { authMode = { mode: 'pick' }; render(); } }, 'Back'))));
  }

  if (authMode.mode === 'signup') {
    const name = h('input', { autocomplete: 'name', maxlength: 50, required: true });
    const handle = h('input', { autocapitalize: 'none', autocomplete: 'username', maxlength: 15, required: true });
    const pass = h('input', { type: 'password', autocomplete: 'new-password' });
    const err = h('p', { class: 'err' });
    const submit = async e => {
      e.preventDefault();
      const hd = handle.value.trim().replace(/^@/, '');
      if (!/^\w{1,15}$/.test(hd)) { err.textContent = 'Handle: 1-15 letters, numbers or underscores.'; return; }
      if (accounts.some(a => a.handle.toLowerCase() === hd.toLowerCase())) { err.textContent = 'That handle is taken. By you. Earlier.'; return; }
      const a = { id: uid(), name: name.value.trim(), handle: hd, bio: '', color: colorFor(hd), createdAt: Date.now(), salt: null, hash: null };
      if (pass.value) {
        try { a.salt = uid(); a.hash = await sha256(a.salt + pass.value); }
        catch { err.textContent = 'Passcodes need a secure context (https or localhost).'; return; }
      }
      await db.put('accounts', a);
      loginAs(a);
    };
    return wrap(h('form', { onsubmit: submit },
      h('label', { class: 'field' }, h('span', {}, 'Name'), name),
      h('label', { class: 'field' }, h('span', {}, 'Handle'), handle),
      h('label', { class: 'field' }, h('span', {}, 'Passcode (optional, only locks this device)'), pass),
      err,
      h('div', { class: 'stack' }, h('button', { class: 'btn primary' }, 'Create account'),
        accounts.length > 0 && h('button', { type: 'button', class: 'btn', onclick: () => { authMode = { mode: 'pick' }; render(); } }, 'Back')),
      h('p', { class: 'fine', style: 'padding:12px 0 0' }, 'No email needed. There is nobody to send it.')));
  }

  return wrap(h('div', { class: 'stack' },
    accounts.map(a => h('button', { class: 'acct', onclick: () => a.hash ? (authMode = { mode: 'unlock', account: a }, render()) : loginAs(a) },
      avatar(a, 'sm'), h('div', {}, h('b', {}, a.name), h('div', { class: 'muted' }, '@' + a.handle)))),
    h('button', { class: 'btn primary', onclick: () => { authMode = { mode: 'signup' }; render(); } }, 'Create account')));
}

/* ---------- shell ---------- */
function shell(acct, route, main) {
  const link = (path, name, label) => h('a', { href: '#' + path, class: route === name ? 'active' : '', 'aria-label': label, 'aria-current': route === name ? 'page' : null }, icon({ profile: 'user', explore: 'search', notifications: 'bell' }[name] || name), h('span', {}, label));
  return h('div', { class: 'shell' },
    h('nav', { class: 'nav', 'aria-label': 'Main' },
      h('a', { class: 'brand', href: '#/', 'aria-label': 'Anti-Social home' }, icon('logo')),
      link('/', 'home', 'Home'), link('/explore', 'explore', 'Explore'), link('/notifications', 'notifications', 'Notifications'),
      link('/profile', 'profile', 'Profile'), link('/settings', 'settings', 'Settings'),
      h('button', { class: 'postbtn', 'aria-label': 'Post', onclick: () => composeModal(acct) }, icon('compose'), h('span', {}, 'Post')),
      h('button', { class: 'me', onclick: () => go('/profile') }, avatar(acct, 'sm'),
        h('div', { class: 'who' }, h('b', {}, acct.name), h('div', { class: 'muted' }, '@' + acct.handle)))),
    h('main', { class: 'main' }, main),
    h('aside', { class: 'side' },
      h('div', { class: 'search' }, icon('search'), h('span', {}, 'Search is in Explore. It only finds you.')),
      h('div', { class: 'card' }, h('h3', {}, "What's happening"), h('p', {}, 'Nothing. Nobody is here.')),
      h('div', { class: 'card' }, h('h3', {}, 'Who to follow'), h('p', {}, 'No one. There is no one.')),
      h('p', { class: 'fine' }, 'No servers · No tracking · No audience · Terms: TOUCH GRASS')));
}

async function render(keepScroll = false) {
  const my = ++renderId;
  const y = scrollY;
  const root = $('#app');
  try {
    const acct = session && await db.get('accounts', session);
    if (my !== renderId) return;
    if (!acct) { session = null; ls('as.session', null); document.title = 'Anti-Social'; root.replaceChildren(await authView()); return; }
    const posts = await db.postsOf(acct.id);
    if (my !== renderId) return;
    const ctx = { posts, byId: new Map(posts.map(p => [p.id, p])), replyCount: new Map() };
    for (const p of posts) if (p.parentId) ctx.replyCount.set(p.parentId, (ctx.replyCount.get(p.parentId) || 0) + 1);

    const [, r = '', arg] = location.hash.split('/');
    const route = { notifications: 'notifications', explore: 'explore', profile: 'profile', settings: 'settings', post: 'post' }[r] || 'home';
    const main = {
      home: () => homeView(acct, ctx), explore: () => exploreView(acct, ctx), notifications: notificationsView,
      profile: () => profileView(acct, ctx), settings: () => settingsView(acct), post: () => postView(acct, ctx, arg),
    }[route]();
    document.title = route === 'home' ? 'Home / Anti-Social' : route[0].toUpperCase() + route.slice(1) + ' / Anti-Social';
    root.replaceChildren(shell(acct, route, main));
    scrollTo(0, keepScroll ? y : 0);
  } catch (e) {
    console.error(e);
    root.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'box' },
      h('h1', {}, 'Storage unavailable'),
      h('p', { class: 'tag' }, 'Anti-Social keeps everything in your browser, and this browser is not letting it. Private mode can do this. Try a normal window.'))));
  }
}

window.addEventListener('hashchange', () => render());
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
render();

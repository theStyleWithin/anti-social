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
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
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

db.batch = async (accounts, posts) => {
  const d = await openDb();
  return new Promise((res, rej) => {
    const t = d.transaction(['accounts', 'posts'], 'readwrite');
    for (const a of accounts) t.objectStore('accounts').put(a);
    for (const p of posts) t.objectStore('posts').put(p);
    t.oncomplete = () => res();
    t.onerror = t.onabort = () => rej(t.error);
  });
};

/* ---------- vault ----------
   Passcode -> PBKDF2-SHA256 (600k rounds) -> AES-256-GCM key, held in memory only.
   Every post (text, images, flags, timestamps) and the profile (name, bio, avatar, banner)
   is stored as ciphertext. Only the id, handle and account id stay readable, so the account
   picker and the database index still work. The passcode and key are never stored. */
const VAULT_ITER = 600000;
const MIN_PASSCODE = 8;
const te = new TextEncoder();
const td = new TextDecoder();
const vault = { id: null, key: null };
const postCache = new Map();
const PROFILE_KEYS = ['name', 'bio', 'color', 'avatarImg', 'bannerImg', 'duress'];

async function deriveKey(pass, salt, iter) {
  const base = await crypto.subtle.importKey('raw', te.encode(pass.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key, obj, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(aad) }, key, te.encode(JSON.stringify(obj)));
  return { iv, ct };
}
async function unseal(key, rec, aad) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv, additionalData: te.encode(aad) }, key, rec.ct);
  return JSON.parse(td.decode(pt));
}
// Every vault carries a duress slot, set or not, so its mere presence tells an inspector nothing.
const randBytes = n => crypto.getRandomValues(new Uint8Array(n));
const decoyAlt = () => ({ salt: randBytes(16), iter: VAULT_ITER, check: { iv: randBytes(12), ct: randBytes(23).buffer } });
async function makeAlt(id, pin) {
  const salt = randBytes(16);
  const key = await deriveKey(pin, salt, VAULT_ITER);
  return { salt, iter: VAULT_ITER, check: await seal(key, { d: 1 }, 'duress:' + id) };
}
async function matchesDuress(raw, pin) {
  try {
    const key = await deriveKey(pin, raw.vault.alt.salt, raw.vault.alt.iter);
    await unseal(key, raw.vault.alt.check, 'duress:' + raw.id);
    return true;
  } catch { return false; }
}
// Erase everything the app stores. The vault salt goes with it, so any ciphertext left on disk is unreadable.
async function panicWipe() {
  lockVault();
  session = null;
  try { await db.clear('posts'); await db.clear('accounts'); } catch { /* wipe on regardless */ }
  try { (await dbp).close(); } catch { /* already closed */ }
  dbp = undefined;
  await new Promise(res => { const r = indexedDB.deleteDatabase('anti-social'); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  for (const k of ['as.session', 'as.lockAfter', 'as.theme']) ls(k, null);
  authMode = { mode: 'signup' };
  history.replaceState(null, '', location.pathname + location.search);
  applyTheme();
  render();
}

async function makeVault(id, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pass, salt, VAULT_ITER);
  return { key, meta: { v: 1, salt, iter: VAULT_ITER, check: await seal(key, { ok: 1 }, 'check:' + id), alt: decoyAlt() } };
}
async function openVault(raw, pass) {
  try {
    const key = await deriveKey(pass, raw.vault.salt, raw.vault.iter);
    await unseal(key, raw.vault.check, 'check:' + raw.id);
    return key;
  } catch { return null; }
}
function lockVault() {
  vault.id = null; vault.key = null; postCache.clear();
}

// The account as the app uses it: profile fields decrypted and merged in.
async function loadAccount(id) {
  const raw = await db.get('accounts', id);
  if (!raw) return null;
  if (!raw.vault) return raw;
  if (vault.id !== id) return { ...raw, locked: true };
  return { ...raw, ...(await unseal(vault.key, raw.profile, 'profile:' + id)) };
}
async function updateAccount(id, fields) {
  const raw = await db.get('accounts', id);
  if (!raw.vault) return db.put('accounts', { ...raw, ...fields });
  const cur = await unseal(vault.key, raw.profile, 'profile:' + id);
  return db.put('accounts', { ...raw, profile: await seal(vault.key, { ...cur, ...fields }, 'profile:' + id) });
}
async function savePost(acct, post) {
  if (!acct.vault) return db.put('posts', post);
  const { iv, ct } = await seal(vault.key, post, `post:${acct.id}:${post.id}`);
  postCache.delete(post.id);
  return db.put('posts', { id: post.id, accountId: acct.id, v: 1, iv, ct });
}
async function loadPosts(acct) {
  const raw = await db.postsOf(acct.id);
  if (!acct.vault) return raw;
  const out = [];
  out.bad = 0;
  for (const r of raw) {
    const ck = r.id + ':' + r.iv.join(',');
    try {
      let p = postCache.get(ck);
      if (!p) { p = await unseal(vault.key, r, `post:${acct.id}:${r.id}`); postCache.set(ck, p); }
      out.push(p);
    } catch { out.bad++; }
  }
  return out;
}
// Re-encrypt the whole account (and every post) under a new passcode, in a single transaction,
// so a crash can never leave half the posts under the old key.
async function rekeyAccount(acct, pass) {
  const posts = await loadPosts(acct);
  if (posts.bad) throw new Error('unreadable posts');
  const raw = await db.get('accounts', acct.id);
  const { key, meta } = await makeVault(acct.id, pass);
  const profile = Object.fromEntries(PROFILE_KEYS.map(k => [k, acct[k] ?? null]));
  const account = { id: raw.id, handle: raw.handle, createdAt: raw.createdAt, vault: { ...meta, alt: raw.vault?.alt || meta.alt }, profile: await seal(key, profile, 'profile:' + raw.id) };
  const recs = [];
  for (const p of posts) {
    const { iv, ct } = await seal(key, p, `post:${acct.id}:${p.id}`);
    recs.push({ id: p.id, accountId: acct.id, v: 1, iv, ct });
  }
  await db.batch([account], recs);
  vault.id = acct.id; vault.key = key; postCache.clear();
}

/* ---------- state ---------- */
let renderId = 0;
let authMode = { mode: 'pick' };
let profileTab = 'posts';
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

function cropImage(file, w, hgt) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = hgt;
      const k = Math.max(w / img.width, hgt / img.height);
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, w, hgt);
      g.drawImage(img, (w - img.width * k) / 2, (hgt - img.height * k) / 2, img.width * k, img.height * k);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

function chooseImage(w, hgt) {
  return new Promise(res => {
    const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
    input.addEventListener('change', async () => {
      const f = input.files[0];
      input.remove();
      if (!f) return res(null);
      try { res(await cropImage(f, w, hgt)); } catch { toast("That doesn't look like an image."); res(null); }
    });
    input.addEventListener('cancel', () => { input.remove(); res(null); });
    document.body.append(input);
    input.click();
  });
}

async function setProfileImage(acctId, field, w, hgt) {
  const data = await chooseImage(w, hgt);
  if (!data) return;
  await updateAccount(acctId, { [field]: data });
  render(true);
}

/* ---------- components ---------- */
function paintImage(el, data) {
  if (!data) return;
  el.style.backgroundImage = `url("${data}")`;
  el.style.backgroundSize = 'cover';
  el.style.backgroundPosition = 'center';
}

function avatar(a, size = '') {
  const e = h('div', { class: 'avatar ' + size }, a.avatarImg ? '' : (a.name || a.handle)[0].toUpperCase());
  e.style.background = a.color || colorFor(a.handle);
  paintImage(e, a.avatarImg);
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

function topbar(title, { back = false, sub = '', action = null } = {}) {
  return h('div', { class: 'topbar' },
    back && h('button', { class: 'back', 'aria-label': 'Back', onclick: () => history.length > 1 ? history.back() : go('/') }, icon('back')),
    h('div', {}, h('h1', {}, title), sub && h('div', { class: 'sub' }, sub)),
    action && h('div', { class: 'tbact' }, action));
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
    await savePost(acct, { id: uid(), accountId: acct.id, text: ta.value.trim(), images, createdAt: Date.now(), parentId, liked: false, reposted: false });
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
  const patch = async fields => { await savePost(acct, { ...p, ...fields }); refresh(); };
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
    topbar('Home', { action: acct.vault && h('button', { class: 'back', 'aria-label': 'Lock vault', title: 'Lock vault', onclick: () => { lockVault(); render(); } }, icon('lock')) }),
    !acct.vault && h('div', { class: 'vault-note' }, h('span', {}, "Your posts aren't encrypted yet."), h('button', { class: 'btn primary', onclick: () => passcodeModal(acct) }, 'Set up vault')),
    composer(acct, { placeholder: "What's happening?", onDone: () => render(true) }),
    top.length
      ? [...top.map(p => postEl(p, acct, ctx)), h('div', { class: 'empty-note' }, "You're all caught up. Nobody else posted. Nobody else exists.")]
      : emptyState('Welcome to nowhere', 'Your timeline is empty. So is everyone else\'s. Go on, post something.'),
  ];
}

const SEARCH_JOKES = [
  'Searched 0 users. Found 0 users.',
  'Have you tried going outside? People are there.',
  'Your people are not on here. That is why they are your people.',
  'Checked the server. There is no server.',
  'Narrowed it down to nobody.',
  'Asked the algorithm. The algorithm left.',
  'Result: just you, wearing a different hat.',
  'Try searching for someone you actually know. Then text them.',
];
let searchAttempts = 0;

function exploreView() {
  const line = h('p', { class: 'search-line' }, 'Searching for people...');
  const tries = h('div', { class: 'search-tries' });
  const again = h('button', { class: 'btn' }, 'Search again');
  again.addEventListener('click', () => {
    searchAttempts++;
    line.textContent = SEARCH_JOKES[(searchAttempts - 1) % SEARCH_JOKES.length];
    tries.textContent = plural(searchAttempts, 'attempt') + ', 0 people';
  });
  return [
    topbar('Explore'),
    h('div', { class: 'empty search-empty' },
      h('div', { class: 'stuck', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': 'Searching for people' }, h('span', {})),
      h('h2', {}, 'Nobody found'),
      line, tries, again),
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
    h('button', { class: 'banner', 'aria-label': 'Change banner image', onclick: () => setProfileImage(acct.id, 'bannerImg', 1500, 500) },
      acct.bannerImg && (() => { const d = h('span', { class: 'bimg' }); paintImage(d, acct.bannerImg); return d; })(),
      h('span', { class: 'cam' }, icon('camera'))),
    h('div', { class: 'pinfo' },
      h('div', { class: 'top' },
        h('button', { class: 'avbtn', 'aria-label': 'Change avatar image', onclick: () => setProfileImage(acct.id, 'avatarImg', 256, 256) }, avatar(acct, 'lg'), h('span', { class: 'cam' }, icon('camera'))),
        h('button', { class: 'btn', onclick: () => editProfile(acct) }, 'Edit profile')),
      h('h2', {}, acct.name),
      h('div', { class: 'muted' }, '@' + acct.handle),
      h('div', { class: 'bio' }, acct.bio || 'No bio. No audience either.'),
      h('div', { class: 'meta' }, 'Joined ' + joined + ' · Location: your device'),
      h('div', { class: 'follow' }, h('span', {}, h('b', {}, 0), ' Following'), h('span', {}, h('b', {}, 0), ' Followers'))),
    tabs,
    list.length ? list.map(p => postEl(p, acct, ctx)) : emptyState('Nothing here yet', 'Not that it matters. Nobody is checking.'),
  ];
}

const LOCK_CHOICES = [['0', 'Right away'], ['60', 'After 1 minute'], ['300', 'After 5 minutes'], ['never', 'Never']];
const lockAfter = () => ls('as.lockAfter') ?? '60';

function passcodeModal(acct) {
  const changing = !!acct.vault;
  const cur = changing && h('input', { type: 'password', autocomplete: 'current-password' });
  const p1 = h('input', { type: 'password', autocomplete: 'new-password' });
  const p2 = h('input', { type: 'password', autocomplete: 'new-password' });
  const err = h('p', { class: 'err' });
  const go_ = h('button', { class: 'btn primary' }, changing ? 'Change passcode' : 'Encrypt everything');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, changing ? 'Change passcode' : 'Set up the vault')),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'Everything is locked with this passcode: posts, images, avatar, banner and profile. There is no recovery. Forget it and your posts are gone for good, for everyone, including me.'),
      changing && h('label', { class: 'field' }, h('span', {}, 'Current passcode'), cur),
      h('label', { class: 'field' }, h('span', {}, `New passcode (at least ${MIN_PASSCODE} characters)`), p1),
      h('label', { class: 'field' }, h('span', {}, 'Type it again'), p2),
      err, go_)));
  go_.addEventListener('click', async () => {
    err.textContent = '';
    if (changing && !(await openVault(await db.get('accounts', acct.id), cur.value))) { err.textContent = 'Current passcode is wrong.'; return; }
    if (p1.value.length < MIN_PASSCODE) { err.textContent = `Use at least ${MIN_PASSCODE} characters.`; return; }
    if (p1.value !== p2.value) { err.textContent = "Those don't match."; return; }
    go_.disabled = true;
    go_.textContent = 'Encrypting...';
    try {
      await rekeyAccount(acct, p1.value);
      close();
      toast(changing ? 'Passcode changed.' : 'Vault ready. Everything is encrypted.');
      render(true);
    } catch (e) {
      console.error(e);
      err.textContent = e.message === 'unreadable posts' ? "Some posts can't be read, so nothing was changed." : 'Something went wrong, so nothing was changed.';
      go_.disabled = false;
      go_.textContent = changing ? 'Change passcode' : 'Encrypt everything';
    }
  });
}

function duressModal(acct) {
  const cur = h('input', { type: 'password', autocomplete: 'current-password' });
  const p1 = h('input', { type: 'password', autocomplete: 'off' });
  const p2 = h('input', { type: 'password', autocomplete: 'off' });
  const err = h('p', { class: 'err' });
  const btn = h('button', { class: 'btn danger' }, acct.duress ? 'Change duress PIN' : 'Set duress PIN');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Duress PIN')),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'At the unlock screen this PIN looks like any wrong passcode attempt, but it silently and permanently erases ALL Anti-Social data on this device: every account, post and image. No confirmation, no undo. Your real passcode is unaffected. Copies you exported or backed up elsewhere are not touched.'),
      h('label', { class: 'field' }, h('span', {}, 'Your real passcode'), cur),
      h('label', { class: 'field' }, h('span', {}, 'Duress PIN (at least 4 characters, different from your passcode)'), p1),
      h('label', { class: 'field' }, h('span', {}, 'Type it again'), p2),
      err, btn)));
  btn.addEventListener('click', async () => {
    err.textContent = '';
    const raw = await db.get('accounts', acct.id);
    if (!(await openVault(raw, cur.value))) { err.textContent = 'Your real passcode is wrong.'; return; }
    if (p1.value.length < 4) { err.textContent = 'Use at least 4 characters.'; return; }
    if (p1.value === cur.value) { err.textContent = 'It has to be different from your passcode.'; return; }
    if (p1.value !== p2.value) { err.textContent = "Those don't match."; return; }
    btn.disabled = true;
    try {
      const alt = await makeAlt(acct.id, p1.value);
      const profile = { ...(await unseal(vault.key, raw.profile, 'profile:' + acct.id)), duress: true };
      await db.batch([{ ...raw, vault: { ...raw.vault, alt }, profile: await seal(vault.key, profile, 'profile:' + acct.id) }], []);
      close(); toast('Duress PIN set. Test it somewhere you can afford to lose.'); render(true);
    } catch (e) { console.error(e); err.textContent = 'Something went wrong, so nothing was changed.'; btn.disabled = false; }
  });
}

async function removeDuress(acct) {
  const raw = await db.get('accounts', acct.id);
  const profile = { ...(await unseal(vault.key, raw.profile, 'profile:' + acct.id)), duress: false };
  await db.batch([{ ...raw, vault: { ...raw.vault, alt: decoyAlt() }, profile: await seal(vault.key, profile, 'profile:' + acct.id) }], []);
  toast('Duress PIN removed.'); render(true);
}

function settingsView(acct) {
  const theme = ls('as.theme') || 'auto';
  const themeBtn = (v, label) => h('button', { class: 'btn' + (theme === v ? ' primary' : ''), onclick: () => { ls('as.theme', v === 'auto' ? null : v); applyTheme(); render(true); } }, label);
  return [
    topbar('Settings'),
    h('div', { class: 'settings' },
      h('section', {}, h('h3', {}, 'Display'), h('p', {}, 'Pick a theme. Nobody will see it.'),
        h('div', { class: 'btnrow' }, themeBtn('auto', 'Auto'), themeBtn('light', 'Light'), themeBtn('dark', 'Dark'))),
      installPrompt && h('section', {}, h('h3', {}, 'Install'), h('p', {}, 'Put Anti-Social on your home screen or desktop. It works offline, because there is nothing to connect to.'),
        h('button', { class: 'btn primary', onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(true); } }, 'Install app')),
      h('section', {}, h('h3', {}, 'Vault'),
        acct.vault
          ? [h('p', {}, 'Your posts, images and profile are encrypted with your passcode (AES-256). The passcode is never stored, and there is no recovery.'),
             h('div', { class: 'btnrow' },
               h('button', { class: 'btn', onclick: () => { lockVault(); render(); } }, 'Lock now'),
               h('button', { class: 'btn', onclick: () => passcodeModal(acct) }, 'Change passcode')),
             h('p', { style: 'margin:14px 0 4px' }, h('b', {}, 'Duress PIN: '), acct.duress ? 'on.' : 'off.', ' A second PIN that looks like a normal unlock but secretly erases everything. Know the law where you live: destroying data you are legally required to keep can be a crime.'),
             h('div', { class: 'btnrow' },
               h('button', { class: 'btn', onclick: () => duressModal(acct) }, acct.duress ? 'Change duress PIN' : 'Set duress PIN'),
               acct.duress && h('button', { class: 'btn', onclick: () => removeDuress(acct) }, 'Remove it')),
             h('p', { style: 'margin:14px 0 8px' }, 'Lock automatically after I leave the app:'),
             h('div', { class: 'btnrow' }, LOCK_CHOICES.map(([v, label]) =>
               h('button', { class: 'btn' + (lockAfter() === v ? ' primary' : ''), onclick: () => { ls('as.lockAfter', v); render(true); } }, label)))]
          : [h('p', {}, 'Your posts and profile are stored unencrypted on this device. Set up the vault to lock all of it behind a passcode.'),
             h('button', { class: 'btn primary', onclick: () => passcodeModal(acct) }, 'Set up vault')]),
      h('section', {}, h('h3', {}, 'Your data'), h('p', {}, 'It lives in this browser, on this device, and nowhere else. Clearing site data deletes it. There is no recovery because there is no one to recover it.'),
        h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => exportData(acct) }, 'Export my data (JSON)'))),
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
function logout() { lockVault(); session = null; ls('as.session', null); authMode = { mode: 'pick' }; go('/'); }

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

async function exportData(acct) {
  if (acct.vault && !confirm('The export file is NOT encrypted. Anyone who gets it can read your posts. Export anyway?')) return;
  const { salt, hash, vault: _v, profile: _p, locked, ...account } = acct;
  const posts = await loadPosts(acct);
  const blob = new Blob([JSON.stringify({ app: 'anti-social', exportedAt: new Date().toISOString(), account, posts }, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'anti-social-export.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Exported. Now you have a copy of everything nobody saw.');
}

function editProfile(acct) {
  let avatarImg = acct.avatarImg || null;
  let bannerImg = acct.bannerImg || null;
  const name = h('input', { value: acct.name, maxlength: 50 });
  const bio = h('textarea', { rows: 3, maxlength: 160 }, acct.bio || '');
  const color = h('input', { type: 'color', value: acct.color || colorFor(acct.handle) });
  const err = h('p', { class: 'err' });
  const banner = h('div', { class: 'banner edit' });
  const av = h('div', { class: 'avatar lg' });
  const paint = () => {
    banner.style.backgroundImage = bannerImg ? `url("${bannerImg}")` : '';
    banner.style.backgroundSize = 'cover';
    banner.style.backgroundPosition = 'center';
    av.style.background = color.value;
    av.style.backgroundImage = '';
    av.textContent = avatarImg ? '' : (name.value.trim() || acct.handle)[0].toUpperCase();
    paintImage(av, avatarImg);
  };
  color.addEventListener('input', paint);
  name.addEventListener('input', paint);
  paint();
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Edit profile')),
    h('div', { class: 'mp' },
      banner,
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: async () => { const d = await chooseImage(1500, 500); if (d) { bannerImg = d; paint(); } } }, 'Change banner'),
        h('button', { class: 'btn', onclick: () => { bannerImg = null; paint(); } }, 'Remove banner')),
      h('div', { style: 'margin:12px 0' }, av),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: async () => { const d = await chooseImage(256, 256); if (d) { avatarImg = d; paint(); } } }, 'Change avatar'),
        h('button', { class: 'btn', onclick: () => { avatarImg = null; paint(); } }, 'Remove avatar')),
      h('label', { class: 'field', style: 'margin-top:16px' }, h('span', {}, 'Name'), name),
      h('label', { class: 'field' }, h('span', {}, 'Bio'), bio),
      h('label', { class: 'field' }, h('span', {}, 'Avatar color (used when there is no image)'), color),
      err,
      h('button', { class: 'btn primary', onclick: async () => {
        if (!name.value.trim()) { err.textContent = 'You need a name, even here.'; return; }
        await updateAccount(acct.id, { name: name.value.trim(), bio: bio.value.trim(), color: color.value, avatarImg, bannerImg });
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
  const loginAs = a => { session = a.id; ls('as.session', a.id); go('/'); };

  if (authMode.mode === 'unlock') {
    const a = authMode.account;
    const pass = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Passcode' });
    const err = h('p', { class: 'err' });
    const btn = h('button', { class: 'btn primary' }, 'Unlock');
    const submit = async e => {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Unlocking...';
      let ok = false;
      try {
        if (a.vault) {
          // Always do both derivations so the duress slot costs the same time whether or not it is set.
          const key = await openVault(a, pass.value);
          const duress = await matchesDuress(a, pass.value);
          if (duress) return panicWipe();
          if (key) { vault.id = a.id; vault.key = key; ok = true; }
        } else {
          ok = await sha256(a.salt + pass.value) === a.hash;
        }
      } catch { /* fall through to the error */ }
      if (ok) return loginAs(a);
      err.textContent = 'Wrong passcode. Nobody is going to help you.';
      btn.disabled = false;
      btn.textContent = 'Unlock';
      pass.select();
    };
    setTimeout(() => pass.focus(), 0);
    return wrap(h('form', { onsubmit: submit },
      h('label', { class: 'field' }, h('span', {}, `Passcode for @${a.handle}`), pass), err,
      h('div', { class: 'stack' }, btn,
        h('button', { type: 'button', class: 'btn', onclick: () => logout() }, accounts.length > 1 ? 'Switch account' : 'Back'))));
  }

  if (authMode.mode === 'signup') {
    const name = h('input', { autocomplete: 'name', maxlength: 50, required: true });
    const handle = h('input', { autocapitalize: 'none', autocomplete: 'username', maxlength: 15, required: true });
    const pass = h('input', { type: 'password', autocomplete: 'new-password', required: true });
    const pass2 = h('input', { type: 'password', autocomplete: 'new-password', required: true });
    const err = h('p', { class: 'err' });
    const btn = h('button', { class: 'btn primary' }, 'Create account');
    const submit = async e => {
      e.preventDefault();
      err.textContent = '';
      const hd = handle.value.trim().replace(/^@/, '');
      if (!/^\w{1,15}$/.test(hd)) { err.textContent = 'Handle: 1-15 letters, numbers or underscores.'; return; }
      if (accounts.some(a => a.handle.toLowerCase() === hd.toLowerCase())) { err.textContent = 'That handle is taken. By you. Earlier.'; return; }
      if (pass.value.length < MIN_PASSCODE) { err.textContent = `Passcode: at least ${MIN_PASSCODE} characters.`; return; }
      if (pass.value !== pass2.value) { err.textContent = "Those passcodes don't match."; return; }
      btn.disabled = true;
      btn.textContent = 'Locking the vault...';
      try {
        const id = uid();
        const { key, meta } = await makeVault(id, pass.value);
        const profile = { name: name.value.trim(), bio: '', color: colorFor(hd), avatarImg: null, bannerImg: null };
        await db.put('accounts', { id, handle: hd, createdAt: Date.now(), vault: meta, profile: await seal(key, profile, 'profile:' + id) });
        vault.id = id; vault.key = key;
        loginAs({ id });
      } catch (e2) {
        console.error(e2);
        err.textContent = 'Encryption needs a secure context (https, localhost or the installed app).';
        btn.disabled = false;
        btn.textContent = 'Create account';
      }
    };
    return wrap(h('form', { onsubmit: submit },
      h('label', { class: 'field' }, h('span', {}, 'Name'), name),
      h('label', { class: 'field' }, h('span', {}, 'Handle'), handle),
      h('label', { class: 'field' }, h('span', {}, `Passcode (at least ${MIN_PASSCODE} characters)`), pass),
      h('label', { class: 'field' }, h('span', {}, 'Type it again'), pass2),
      err,
      h('div', { class: 'stack' }, btn,
        accounts.length > 0 && h('button', { type: 'button', class: 'btn', onclick: () => { authMode = { mode: 'pick' }; render(); } }, 'Back')),
      h('p', { class: 'fine', style: 'padding:12px 0 0' }, 'Everything you post is encrypted with this passcode. There is no recovery: forget it and your posts are gone. No email needed. There is nobody to send it.')));
  }

  return wrap(h('div', { class: 'stack' },
    accounts.map(a => h('button', { class: 'acct', onclick: () => a.vault || a.hash ? (authMode = { mode: 'unlock', account: a }, render()) : loginAs(a) },
      avatar(a, 'sm'),
      h('div', {}, h('b', {}, a.name || '@' + a.handle), h('div', { class: 'muted' }, a.name ? '@' + a.handle : 'Locked')),
      (a.vault || a.hash) && h('span', { class: 'muted', style: 'margin-left:auto;display:flex' }, icon('lock')))),
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
      h('div', { class: 'search' }, icon('search'), h('span', {}, 'Search for people in Explore. Good luck.')),
      h('div', { class: 'card' }, h('h3', {}, "What's happening"), h('p', {}, 'Nothing. Nobody is here.')),
      h('div', { class: 'card' }, h('h3', {}, 'Who to follow'), h('p', {}, 'No one. There is no one.')),
      h('p', { class: 'fine' }, 'No servers · No tracking · No audience · Terms: TOUCH GRASS')));
}

async function render(keepScroll = false) {
  const my = ++renderId;
  const y = scrollY;
  const root = $('#app');
  try {
    const acct = session && await loadAccount(session);
    if (my !== renderId) return;
    if (acct?.locked) {
      if (authMode.mode !== 'unlock' || authMode.account?.id !== acct.id) authMode = { mode: 'unlock', account: acct };
      document.title = 'Anti-Social';
      root.replaceChildren(await authView());
      return;
    }
    if (!acct) { session = null; ls('as.session', null); document.title = 'Anti-Social'; root.replaceChildren(await authView()); return; }
    const posts = await loadPosts(acct);
    if (my !== renderId) return;
    if (posts.bad) console.warn(`${posts.bad} post(s) could not be decrypted`);
    const ctx = { posts, byId: new Map(posts.map(p => [p.id, p])), replyCount: new Map() };
    for (const p of posts) if (p.parentId) ctx.replyCount.set(p.parentId, (ctx.replyCount.get(p.parentId) || 0) + 1);

    const [, r = '', arg] = location.hash.split('/');
    const route = { notifications: 'notifications', explore: 'explore', profile: 'profile', settings: 'settings', post: 'post' }[r] || 'home';
    const main = {
      home: () => homeView(acct, ctx), explore: exploreView, notifications: notificationsView,
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

// Auto-lock when the app goes to the background (minimised window, other app, locked phone).
let hiddenAt = 0;
let lockTimer;
document.addEventListener('visibilitychange', () => {
  clearTimeout(lockTimer);
  const lim = lockAfter();
  if (document.hidden) {
    hiddenAt = Date.now();
    if (vault.id && lim !== 'never') lockTimer = setTimeout(() => { lockVault(); render(); }, Number(lim) * 1000);
  } else if (vault.id && lim !== 'never' && Date.now() - hiddenAt >= Number(lim) * 1000) {
    lockVault();
    render();
  }
});

// The service worker is only for the plain-browser build. The installed apps ship their own files.
const nativeApp = !!window.Capacitor || /; wv\)/.test(navigator.userAgent);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  if (nativeApp) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
    if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
  } else {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
render();

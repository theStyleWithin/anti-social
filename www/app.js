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
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  pot: '<path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1M16 16h0"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1"/>',
  notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  speaker: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="2"/><rect x="17" y="14" width="4" height="6" rx="2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  scroll: '<path d="M6 4h12v13a3 3 0 0 0 3 3H9a3 3 0 0 1-3-3z"/><path d="M6 4a2 2 0 0 0-2 2v1h2M10 9h6M10 13h6"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  pin: '<path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3z"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>',
  tasks: '<path d="M9 6h11M9 12h11M9 18h11M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 10M3.5 18l1.5 1.5L7.5 16"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
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
  keys: async n => req((await store(n)).getAllKeys()),
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
  for (const k of ['as.session', 'as.lockAfter', 'as.theme', 'as.skin', 'as.skin.custom', 'as.skin.veil']) ls(k, null);
  applyBg(null);
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
// Records with an `m` token are bulky media (item photos). The token is random and says only which
// records belong together; what they are stays inside the ciphertext. Normal loads skip them, so
// big photos are never held in memory unless something asks for them.
async function savePost(acct, post) {
  if (!acct.vault) return db.put('posts', post);
  const { iv, ct } = await seal(vault.key, post, `post:${acct.id}:${post.id}`);
  postCache.delete(post.id);
  return db.put('posts', { id: post.id, accountId: acct.id, v: 1, iv, ct, ...(post.m ? { m: post.m } : {}) });
}
async function loadPosts(acct, opts = {}) {
  const raw = (await db.postsOf(acct.id)).filter(r => !r.m || opts.media || r.m === opts.m);
  if (!acct.vault) { raw.bad = 0; return raw; }
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
// Just the media records that share one token (an item's full-size photos), decrypted on demand and never cached.
async function loadMedia(acct, token) {
  const raw = (await db.postsOf(acct.id)).filter(r => r.m && r.m === token);
  if (!acct.vault) return raw;
  const out = [];
  for (const r of raw) { try { out.push(await unseal(vault.key, r, `post:${acct.id}:${r.id}`)); } catch { /* skip unreadable */ } }
  return out;
}
async function deleteMedia(acct, token) {
  if (!token) return;
  for (const r of (await db.postsOf(acct.id)).filter(x => x.m === token)) await db.del('posts', r.id);
}

// Re-encrypt the whole account (and every post) under a new passcode, in a single transaction,
// so a crash can never leave half the posts under the old key.
async function rekeyAccount(acct, pass) {
  const posts = await loadPosts(acct, { media: true });
  if (posts.bad) throw new Error('unreadable posts');
  const raw = await db.get('accounts', acct.id);
  const { key, meta } = await makeVault(acct.id, pass);
  const profile = Object.fromEntries(PROFILE_KEYS.map(k => [k, acct[k] ?? null]));
  const account = { id: raw.id, handle: raw.handle, createdAt: raw.createdAt, ...AcctCore.flagsOf(raw), vault: { ...meta, alt: raw.vault?.alt || meta.alt }, profile: await seal(key, profile, 'profile:' + raw.id) };
  const recs = [];
  for (const p of posts) {
    const { iv, ct } = await seal(key, p, `post:${acct.id}:${p.id}`);
    recs.push({ id: p.id, accountId: acct.id, v: 1, iv, ct, ...(p.m ? { m: p.m } : {}) });
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
let currentAcct = null;
const tplId = () => TemplateCore.valid(ls('as.template'));      // which template is on (this device)
const W = key => TemplateCore.word(tplId(), key);                // the template's word for something

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });

const SKIN_VARS = ['--bg', '--fg', '--muted', '--line', '--hover', '--card', '--accent', '--accent-fg'];
// A chosen color theme paints over the plain light/dark look. Returns true when one is active.
function applySkin() {
  const root = document.documentElement;
  const vars = ThemeCore.resolve(ls('as.skin'), ThemeCore.parseCustom(ls('as.skin.custom')));
  for (const k of SKIN_VARS) root.style.removeProperty(k);
  root.style.colorScheme = '';
  if (!vars) return false;
  for (const k of SKIN_VARS) root.style.setProperty(k, vars[k]);
  root.dataset.theme = vars.dark ? 'dark' : 'light';
  root.style.colorScheme = vars.dark ? 'dark' : 'light';
  $('meta[name="theme-color"]').setAttribute('content', vars['--bg']);
  return true;
}
// The background picture belongs to the account (it is saved, and encrypted, like your posts).
const bgOf = all => all.find(p => p.kind === 'bg');
function applyBg(rec) {
  const root = document.documentElement;
  let el = document.getElementById('skinbg');
  if (!rec || !/^data:image\/(jpeg|png|webp);base64,/.test(rec.data || '')) { el?.remove(); root.classList.remove('has-bg'); return; }
  if (!el) { el = document.createElement('div'); el.id = 'skinbg'; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
  if (el.dataset.v !== rec.id + rec.updatedAt) { el.style.backgroundImage = `url("${rec.data}")`; el.dataset.v = rec.id + rec.updatedAt; }
  root.style.setProperty('--veil', ThemeCore.clampVeil(ls('as.skin.veil')) + '%');
  root.classList.add('has-bg');
}

function applyTemplate() {
  const id = tplId(), root = document.documentElement;
  if (id === 'default') delete root.dataset.tpl; else root.dataset.tpl = id;
}
function applyTheme() {
  applyTemplate();
  if (applySkin()) return;
  document.documentElement.removeAttribute('data-theme');
  const t = ls('as.theme') || TemplateCore.get(tplId()).mode;     // a template starts in its own look until you pick Light or Dark
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
  document.querySelectorAll('.toast').forEach(t => t.remove());
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

/* ---------- storage safeguards ----------
   The generated crowd is never saved, so it costs no disk. Only your own posts and pictures
   take space, and pictures are the big part, so those are the ones we limit. */
const MB = 1024 * 1024;
const DEFAULT_CAP_MB = 1024;        // default limit; you can change it in Settings
const storageCap = () => { const v = Number(ls('as.capmb')); return (v >= 50 ? v : DEFAULT_CAP_MB) * MB; };
const MIN_FREE = 100 * MB;          // always leave this much of the browser's allowance free
const MAX_SOURCE = 40 * MB;         // refuse absurdly large source images (they can exhaust memory)

async function storageInfo() {
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage || 0, quota: e.quota || 0 };
  } catch { return null; }
}
const fmtMB = n => n < MB ? Math.max(0.1, Math.round(n / 1024 * 10) / 10 / 1024).toFixed(1) + ' MB' : (n >= 1024 * MB ? (n / 1024 / MB).toFixed(2) + ' GB' : Math.round(n / MB) + ' MB');

// Returns a message if a new picture should be refused, otherwise null.
async function pictureBlocked(file) {
  if (file.size > MAX_SOURCE) return 'That image is over 40 MB. Pick a smaller one.';
  const s = await storageInfo();
  if (!s) return null;
  if (s.usage + file.size / 4 >= storageCap()) return `You have reached your storage limit of ${fmtMB(storageCap())}, so new pictures are paused. Delete some posts or raise the limit in Settings.`;
  if (s.quota && s.quota - s.usage < MIN_FREE + 8 * MB) return 'Your device is nearly out of space, so new pictures are paused to keep it from filling up.';
  return null;
}
const isQuotaError = e => e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''));

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
      const blocked = await pictureBlocked(f);
      if (blocked) { toast(blocked); return res(null); }
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
    tplId() === 'chat' && !back && h('button', { class: 'hamburger', 'aria-label': 'Open channels', onclick: () => drawer('left') }, icon('menu')),
    !back && currentAcct && h('button', { class: 'tb-me', 'aria-haspopup': 'menu', 'aria-label': 'Accounts', onclick: e => openAccountMenu(e.currentTarget, currentAcct) }, avatar(currentAcct, 'sm')),
    back && h('button', { class: 'back', 'aria-label': 'Back', onclick: () => history.length > 1 ? history.back() : go('/') }, icon('back')),
    h('div', {}, h('h1', {}, title), sub && h('div', { class: 'sub' }, sub)),
    action && h('div', { class: 'tbact' }, action));
}

function composer(acct, { placeholder, parentId = null, onDone, autofocus = false, label = W('send'), channel = null, enterSends = false }) {
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
    const s = await storageInfo();
    if (s && s.usage >= storageCap()) {
      toast(`You have reached your storage limit of ${fmtMB(storageCap())}, so nothing new is saved. Delete some posts or raise the limit in Settings.`);
      submit.disabled = false;
      return;
    }
    try {
      await savePost(acct, { id: uid(), accountId: acct.id, text: ta.value.trim(), images, createdAt: Date.now(), parentId, liked: false, reposted: false, ...(channel && channel !== 'general' ? { channel } : {}) });
    } catch (e) {
      console.error(e);
      toast(isQuotaError(e) ? 'Out of space, so that post was not saved. Free some room and try again.' : 'That post could not be saved.');
      submit.disabled = false;
      return;
    }
    toast(pick(TOASTS));
    onDone?.();
  };
  ta.addEventListener('input', sync);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (enterSends && !e.shiftKey && !e.isComposing))) { e.preventDefault(); send(); } });
  submit.addEventListener('click', send);
  file.addEventListener('change', async () => {
    for (const f of [...file.files].slice(0, 4 - images.length)) {
      const blocked = await pictureBlocked(f);
      if (blocked) { toast(blocked); break; }
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
  const gp = Ghost.parsePostId(p.parentId);
  const gParent = gp && GW.person(gp.seed, gp.i).handle;
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
    h('button', { class: `act ${cls}${on ? ' on' : ''}`, 'aria-label': label, 'data-label': label, 'aria-pressed': cls === 'like' || cls === 'repost' ? String(on) : null, onclick: e => { e.stopPropagation(); onclick(); } },
      icon(name), count ? String(count) : '');

  const actions = h('div', { class: 'actions' },
    act('reply', replies, W('actReply'), () => detail ? $('.composer textarea')?.focus() : go('/post/' + p.id)),
    act('repost', p.reposted ? 1 : 0, W('actRepost'), () => patch({ reposted: !p.reposted }), 'repost', p.reposted),
    act('heart', p.liked ? 1 : 0, W('actLike'), () => patch({ liked: !p.liked }), 'like', p.liked),
    h('span', { class: 'act views', title: 'Views', 'aria-label': '0 views' }, icon('chart'), '0'),
    act('trash', 0, W('actDelete'), remove, 'del'));

  const name = h('span', { class: 'name' }, acct.name);
  const handle = h('span', { class: 'handle' }, '@' + acct.handle);

  if (detail) {
    const when = new Date(p.createdAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' });
    return h('article', { class: 'post detail' },
      h('div', { style: 'display:flex;gap:12px;align-items:center' }, avatar(acct),
        h('div', {}, h('div', {}, name), h('div', {}, handle))),
      p.reposted && h('div', { class: 'replying' }, W('youReposted')),
      parent && h('div', { class: 'replying' }, W('replyingSelf')),
      gParent && h('div', { class: 'replying' }, W('replyingTo') + ' @' + gParent),
      p.text && h('div', { class: 'text' }, richText(p.text)),
      mediaGrid(p.images),
      h('div', { class: 'muted', style: 'margin-top:12px' }, `${when} · `, h('b', { style: 'color:var(--fg)' }, '0'), ' Views'),
      h('div', { class: 'stats' },
        h('span', {}, h('b', {}, replies), ' ' + W('statReplies')),
        h('span', {}, h('b', {}, p.reposted ? 1 : 0), ' ' + W('statReposts')),
        h('span', {}, h('b', {}, p.liked ? 1 : 0), ' ' + W('statLikes'))),
      actions);
  }

  return h('article', { class: 'post', onclick: e => { if (!e.target.closest('button,a')) go('/post/' + p.id); } },
    avatar(acct),
    h('div', { class: 'content' },
      p.reposted && h('div', { class: 'replying' }, W('youReposted')),
      h('div', { class: 'head' }, name, handle, h('span', { class: 'time' }, stamp(p.createdAt))),
      parent && h('div', { class: 'replying' }, W('replyingTo') + ' @' + acct.handle),
      gParent && h('div', { class: 'replying' }, W('replyingTo') + ' @' + gParent),
      p.text && h('div', { class: 'text' }, richText(p.text)),
      mediaGrid(p.images),
      p.liked && tplId() === 'chat' && h('div', { class: 'reactions' }, h('button', { class: 'reaction on', 'aria-label': 'Remove your reaction', onclick: e => { e.stopPropagation(); patch({ liked: false }); } }, '\u2764\ufe0f 1')),
      actions));
}

function emptyState(title, text) {
  return h('div', { class: 'empty' }, h('h2', {}, title), h('p', {}, text));
}

/* ---------- populated mode ---------- */
const crowdOn = () => ls('as.populated') === '1';     // the generated crowd
const castOn = () => ls('as.cast') === '1';            // the characters you made
const populated = () => crowdOn() || castOn();
let castMap = new Map();                                // person id -> what you changed or created (set on every render)
const MAX_CAST = 60;
const people = n => n === 1 ? '1 person' : `${n.toLocaleString()} people`;
const poolOpts = () => ({ cast: castMap, crowd: crowdOn(), chars: castOn() });
const GW = {
  person: (seed, i) => Ghost.person(seed, i, castMap),
  post: (seed, i, m) => Ghost.post(seed, i, m, castMap),
  profilePosts: (seed, i, now, n) => Ghost.profilePosts(seed, i, now, n, castMap),
  feed: (seed, now, n) => Ghost.feed(seed, now, n, poolOpts()),
  suggestions: (seed, now, n) => Ghost.suggestions(seed, now, n, poolOpts()),
};
function worldSeed() {
  let s = ls('as.seed');
  if (!s) { s = Ghost.newSeed(); ls('as.seed', s); }
  return s;
}
let homeTab = 'foryou';
let feedCount = 25;
let ghostPostCount = 12;
const FEED_MAX = 500;      // the on-screen crowd is capped, so memory and time stay small
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K' : String(n);

const actBtn = (name, count, label, onclick, cls = '', on = false) =>
  h('button', { class: `act ${cls}${on ? ' on' : ''}`, 'aria-label': label, 'data-label': label, 'aria-pressed': cls === 'like' || cls === 'repost' ? String(on) : null, onclick: e => { e.stopPropagation(); onclick(); } },
    icon(name), count ? String(count) : '');

// Your reaction to a generated post or person (like, repost, follow). Stored like any post, so the vault covers it.
// The record id is random on purpose: ids are stored in the clear, and which stranger you liked must stay inside the ciphertext.
async function setReaction(acct, ctx, target, field) {
  const cur = ctx.reactions.get(target) || { id: uid(), accountId: acct.id, kind: 'ghost', target, liked: false, reposted: false, followed: false, createdAt: Date.now() };
  try { await savePost(acct, { ...cur, [field]: !cur[field] }); } catch (e) { console.error(e); toast(isQuotaError(e) ? 'Out of space.' : 'That could not be saved.'); return; }
  render(true);
}

const ghostAvatar = (p, size = '') => avatar({ name: p.name, handle: p.handle, color: p.color, avatarImg: p.avatarImg }, size);

function ghostPostEl(g, acct, ctx, { detail = false } = {}) {
  const who = GW.person(g.seed, g.i);
  const rx = ctx.reactions.get(g.id) || {};
  const replies = ctx.replyCount.get(g.id) || 0;     // only your own replies exist
  const reposts = g.reposts + (rx.reposted ? 1 : 0), likes = g.likes + (rx.liked ? 1 : 0);
  const actions = h('div', { class: 'actions' },
    actBtn('reply', replies, W('actReply'), () => detail ? $('.composer textarea')?.focus() : go('/post/' + g.id)),
    actBtn('repost', fmt(reposts), W('actRepost'), () => setReaction(acct, ctx, g.id, 'reposted'), 'repost', !!rx.reposted),
    actBtn('heart', fmt(likes), W('actLike'), () => setReaction(acct, ctx, g.id, 'liked'), 'like', !!rx.liked),
    h('span', { class: 'act views', title: 'Views', 'aria-label': fmt(g.views) + ' views' }, icon('chart'), fmt(g.views)));
  const name = h('a', { class: 'name' + (tplId() === 'chat' ? ' role-' + TemplateCore.roleFor(who.id).toLowerCase() : ''), href: '#/u/' + who.id }, who.name);
  const handle = h('a', { class: 'handle', href: '#/u/' + who.id }, '@' + who.handle);

  if (detail) {
    const when = new Date(g.ts).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' });
    return h('article', { class: 'post detail ghost-post', 'data-ghost': g.id },
      h('div', { style: 'display:flex;gap:12px;align-items:center' }, h('a', { href: '#/u/' + who.id }, ghostAvatar(who)),
        h('div', {}, h('div', {}, name), h('div', {}, handle))),
      h('div', { class: 'text' }, richText(g.text)),
      g.image && mediaGrid([g.image]),
      h('div', { class: 'muted', style: 'margin-top:12px' }, `${when} · `, h('b', { style: 'color:var(--fg)' }, fmt(g.views)), ' Views'),
      h('div', { class: 'stats' },
        h('span', {}, h('b', {}, replies), ' ' + W('statReplies')),
        h('span', {}, h('b', {}, fmt(reposts)), ' ' + W('statReposts')),
        h('span', {}, h('b', {}, fmt(likes)), ' ' + W('statLikes'))),
      actions);
  }
  return h('article', { class: 'post ghost-post', 'data-ghost': g.id, onclick: e => { if (!e.target.closest('button,a')) go('/post/' + g.id); } },
    h('a', { href: '#/u/' + who.id, 'aria-label': who.name }, ghostAvatar(who)),
    h('div', { class: 'content' },
      h('div', { class: 'head' }, name, handle, h('span', { class: 'time' }, stamp(g.ts))),
      h('div', { class: 'text' }, richText(g.text)),
      g.image && mediaGrid([g.image]),
      actions));
}

function ghostProfileView(acct, ctx, ref) {
  const pr = Ghost.parsePersonRef(ref);
  if (!pr) return [topbar('Profile', { back: true }), emptyState('Nobody here', 'That is not a person this world knows about.')];
  const who = GW.person(pr.seed, pr.i);
  const rx = ctx.reactions.get('u:' + who.id) || {};
  const list = GW.profilePosts(pr.seed, pr.i, Date.now(), ghostPostCount);
  return [
    topbar(who.name, { back: true, sub: fmt(who.baseline + list[0].m % 50) + ' posts' }),
    who.custom
      ? h('div', { class: 'gen-tag', role: 'note' }, h('b', {}, 'Custom character'), ' · made by you')
      : h('div', { class: 'gen-tag', role: 'note' }, h('b', {}, 'Procedurally generated'), (who.edited ? ' · edited by you' : '') + ` · seed ${pr.seed} · account ${pr.i.toLocaleString()} of ${Ghost.WORLD.toLocaleString()}`),
    (() => { const b = h('div', { class: 'banner ghost' }); b.style.background = who.banner; paintImage(b, who.bannerImg); return b; })(),
    h('div', { class: 'pinfo' },
      h('div', { class: 'top' },
        h('div', { class: 'avwrap' }, ghostAvatar(who, 'lg')),
        h('div', { class: 'btnrow', style: 'margin-top:12px' },
          h('button', { class: 'btn', onclick: () => personEditor(acct, who.id) }, 'Edit this person'),
          h('button', { class: 'btn' + (rx.followed ? '' : ' primary'), 'aria-pressed': String(!!rx.followed), onclick: () => setReaction(acct, ctx, 'u:' + who.id, 'followed') }, rx.followed ? W('unfollow') : W('follow')))),
      h('h2', {}, who.name),
      h('div', { class: 'muted' }, '@' + who.handle),
      h('div', { class: 'bio' }, who.bio),
      h('div', { class: 'meta' }, 'Joined ' + who.joined),
      !who.custom && pr.i >= Ghost.POP && h('div', { class: 'meta' }, 'Far from the busy part of the world. Discovered by you.'),
      h('div', { class: 'follow' }, h('span', {}, h('b', {}, fmt(who.following)), ' ' + W('following')), h('span', {}, h('b', {}, fmt(who.followers + (rx.followed ? 1 : 0))), ' ' + W('followers')))),
    h('div', { class: 'tabs', role: 'tablist' }, h('button', { role: 'tab', 'aria-selected': 'true', class: 'active' }, W('tabPosts'))),
    list.map(g => ghostPostEl(g, acct, ctx)),
    ghostPostCount < 120 ? h('div', { class: 'empty-note' }, h('button', { class: 'btn', onclick: () => { ghostPostCount += 12; render(true); } }, 'Show more')) : h('div', { class: 'empty-note' }, 'That is everything they have posted lately.'),
  ];
}

/* ---------- views ---------- */
function homeView(acct, ctx, chId) {
  if (tplId() === 'chat') return chatHome(acct, ctx, chId);
  const top = ctx.posts.filter(p => !p.parentId).sort((a, b) => b.createdAt - a.createdAt);
  const pop = populated();
  const head = [
    topbar(W('titleHome'), { action: acct.vault && h('button', { class: 'back', 'aria-label': 'Lock vault', title: 'Lock vault', onclick: () => { lockVault(); render(); } }, icon('lock')) }),
    pop && h('div', { class: 'tabs', role: 'tablist' }, [['foryou', W('tabForYou')], ['mine', W('tabYours')]].map(([k, label]) =>
      h('button', { role: 'tab', 'aria-selected': String(homeTab === k), class: homeTab === k ? 'active' : '', onclick: () => { homeTab = k; render(true); } }, label))),
    !acct.vault && !ls('as.hidenote.' + acct.id) && h('div', { class: 'vault-note' }, h('span', {}, "Your posts aren't encrypted. That's fine for a local app, or you can lock them with a passcode."),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn primary', onclick: () => passcodeModal(acct) }, 'Set up vault'),
        h('button', { class: 'btn', onclick: () => { ls('as.hidenote.' + acct.id, '1'); render(true); } }, 'No thanks'))),
    composer(acct, { placeholder: W('composePlaceholder'), onDone: () => render(true) }),
  ];
  if (pop && homeTab === 'foryou') {
    const crowd = GW.feed(worldSeed(), Date.now(), feedCount);
    const cutoff = crowd.length ? crowd[crowd.length - 1].ts : 0;
    if (!crowd.length) return [...head, emptyState('Nobody here yet', crowdOn() ? 'Nothing to show.' : 'Your cast is empty. Add characters in Settings, Characters, or turn on Populated mode for a whole crowd.')];
    const items = [
      ...crowd.map(g => ({ ts: g.ts, el: () => ghostPostEl(g, acct, ctx) })),
      ...top.filter(p => p.createdAt >= cutoff).map(p => ({ ts: p.createdAt, el: () => postEl(p, acct, ctx) })),
    ].sort((a, b) => b.ts - a.ts);
    return [...head, items.map(x => x.el()),
      feedCount < FEED_MAX
        ? h('div', { class: 'empty-note' }, h('button', { class: 'btn', onclick: () => { feedCount += 25; render(true); } }, 'Show more'))
        : h('div', { class: 'empty-note' }, "That's all the crowd has to say for now. None of them are real.")];
  }
  return [...head,
    top.length
      ? [...top.map(p => postEl(p, acct, ctx)), h('div', { class: 'empty-note' }, W('caughtUp'))]
      : emptyState(W('emptyFeedTitle'), W('emptyFeedText')),
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

function exploreCrowdView(acct, ctx) {
  const seed = worldSeed(), now = Date.now();
  const trends = Ghost.trending(seed, now, 5), who = GW.suggestions(seed, now, 4);
  return [
    topbar(W('titleExplore')),
    h('div', { class: 'explore-block' }, h('h3', {}, W('sideTrending')),
      trends.map((t, k) => h('div', { class: 'trend' }, h('div', { class: 'muted' }, `${k + 1} · ${W('sideTrending')}`), h('b', {}, t.tag ? '#' + t.tag : t.topic), h('div', { class: 'muted' }, fmt(t.posts) + ' posts')))),
    who.length > 0 && h('div', { class: 'explore-block' }, h('h3', {}, W('sideWho')),
      who.map(p => {
        const rx = ctx.reactions.get('u:' + p.id) || {};
        return h('div', { class: 'suggest' },
          h('a', { href: '#/u/' + p.id, class: 'suggest-who' }, ghostAvatar(p, 'sm'), h('div', {}, h('b', {}, p.name), h('div', { class: 'muted' }, '@' + p.handle))),
          h('button', { class: 'btn' + (rx.followed ? '' : ' primary'), onclick: () => setReaction(acct, ctx, 'u:' + p.id, 'followed') }, rx.followed ? W('unfollow') : W('follow')));
      })),
    crowdOn() && h('div', { class: 'explore-block' }, h('h3', {}, W('exploreDiscover')),
      h('p', { class: 'muted', style: 'margin:0 0 12px' }, `Pick a stranger from ${Ghost.WORLD.toLocaleString()} possible accounts. All generated, none real.`),
      h('button', { class: 'btn primary', onclick: () => go('/u/' + seed + '.' + Ghost.discover()) }, W('discoverBtn'))),
  ];
}

function exploreView(acct, ctx) {
  if (populated()) return exploreCrowdView(acct, ctx);
  const line = h('p', { class: 'search-line' }, W('exploreSearching'));
  const tries = h('div', { class: 'search-tries' });
  const again = h('button', { class: 'btn' }, W('searchAgain'));
  again.addEventListener('click', () => {
    searchAttempts++;
    line.textContent = SEARCH_JOKES[(searchAttempts - 1) % SEARCH_JOKES.length];
    tries.textContent = plural(searchAttempts, 'attempt') + ', 0 people';
  });
  return [
    topbar(W('titleExplore')),
    h('div', { class: 'empty search-empty' },
      h('div', { class: 'stuck', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': 'Searching for people' }, h('span', {})),
      h('h2', {}, W('exploreEmptyTitle')),
      line, tries, again),
  ];
}

function notificationsView() {
  return [
    topbar(W('titleNotifications')),
    populated()
      ? emptyState('Still nothing', 'There is a whole crowd now, and not one of them can notice you. That is by design.')
      : emptyState(W('notifTitle'), W('notifText')),
  ];
}

function postView(acct, ctx, id) {
  const gp = Ghost.parsePostId(id);
  if (gp) {
    const g = GW.post(gp.seed, gp.i, gp.m);
    const replies = ctx.posts.filter(r => r.parentId === g.id).sort((a, b) => a.createdAt - b.createdAt);
    return [
      topbar(W('titlePost'), { back: true }),
      ghostPostEl(g, acct, ctx, { detail: true }),
      composer(acct, { placeholder: W('replyGhostPlaceholder'), parentId: g.id, label: W('reply'), onDone: () => render(true) }),
      replies.map(r => postEl(r, acct, ctx)),
    ];
  }
  const p = ctx.byId.get(id);
  if (!p) return [topbar(W('titlePost'), { back: true }), emptyState(W('postNotFound'), 'It may have been deleted. Nobody will miss it.')];
  const chain = [];
  for (let c = ctx.byId.get(p.parentId); c; c = ctx.byId.get(c.parentId)) chain.unshift(c);
  const rootGp = Ghost.parsePostId((chain[0] || p).parentId);
  const rootGhost = rootGp && GW.post(rootGp.seed, rootGp.i, rootGp.m);
  const replies = ctx.posts.filter(r => r.parentId === p.id).sort((a, b) => a.createdAt - b.createdAt);
  return [
    topbar(W('titlePost'), { back: true }),
    rootGhost && ghostPostEl(rootGhost, acct, ctx),
    chain.map(c => postEl(c, acct, ctx)),
    postEl(p, acct, ctx, { detail: true }),
    composer(acct, { placeholder: W('replySelfPlaceholder'), parentId: p.id, label: W('reply'), onDone: () => render(true) }),
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
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['posts', W('tabPosts')], ['replies', W('tabReplies')], ['media', W('tabMedia')]].map(([k, label]) =>
    h('button', { role: 'tab', 'aria-selected': String(profileTab === k), class: profileTab === k ? 'active' : '', onclick: () => { profileTab = k; render(true); } }, label)));
  return [
    topbar(acct.name, { back: true, sub: plural(ctx.posts.length, 'post') }),
    h('button', { class: 'banner', 'aria-label': 'Change banner image', onclick: () => setProfileImage(acct.id, 'bannerImg', 1500, 500) },
      acct.bannerImg && (() => { const d = h('span', { class: 'bimg' }); paintImage(d, acct.bannerImg); return d; })(),
      h('span', { class: 'cam' }, icon('camera'))),
    h('div', { class: 'pinfo' },
      h('div', { class: 'top' },
        h('button', { class: 'avbtn', 'aria-label': 'Change avatar image', onclick: () => setProfileImage(acct.id, 'avatarImg', 256, 256) }, avatar(acct, 'lg'), h('span', { class: 'cam' }, icon('camera'))),
        h('button', { class: 'btn', onclick: () => editProfile(acct) }, W('editProfile'))),
      h('h2', {}, acct.name),
      h('div', { class: 'muted' }, '@' + acct.handle),
      h('div', { class: 'bio' }, acct.bio || 'No bio. No audience either.'),
      h('div', { class: 'meta' }, 'Joined ' + joined + ' · Location: your device'),
      h('div', { class: 'follow' }, h('span', {}, h('b', {}, ctx.following || 0), ' ' + W('following')), h('span', {}, h('b', {}, 0), ' ' + W('followers')))),
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

async function removeVault(acct) {
  const posts = await loadPosts(acct, { media: true });
  if (posts.bad) throw new Error('unreadable posts');
  const raw = await db.get('accounts', acct.id);
  const account = { id: raw.id, handle: raw.handle, createdAt: raw.createdAt, ...AcctCore.flagsOf(raw), salt: null, hash: null,
    ...Object.fromEntries(PROFILE_KEYS.filter(k => k !== 'duress').map(k => [k, acct[k] ?? null])) };
  await db.batch([account], posts);
  lockVault();
}

function removeVaultModal(acct) {
  const cur = h('input', { type: 'password', autocomplete: 'current-password' });
  const err = h('p', { class: 'err' });
  const btn = h('button', { class: 'btn danger' }, 'Remove passcode and encryption');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Remove the vault')),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'Your posts and profile will be stored unencrypted on this device and the app will open without a passcode. The duress PIN is removed too, since it needs the vault.'),
      h('label', { class: 'field' }, h('span', {}, 'Your passcode'), cur), err, btn)));
  btn.addEventListener('click', async () => {
    err.textContent = '';
    if (!(await openVault(await db.get('accounts', acct.id), cur.value))) { err.textContent = 'Wrong passcode.'; return; }
    btn.disabled = true;
    try { await removeVault(acct); close(); toast('Vault removed. Nothing is encrypted now.'); render(true); }
    catch (e) { console.error(e); err.textContent = e.message === 'unreadable posts' ? "Some posts can't be read, so nothing was changed." : 'Something went wrong, so nothing was changed.'; btn.disabled = false; }
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

let settingsTab = 'general';

/* ---------- characters: edit anyone in the crowd, or add people of your own ---------- */
let popQuery = '';
let popShown = 20;

const toHex = css => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#000000'; c.fillStyle = css; return c.fillStyle; };

function personRow(acct, p) {
  return h('div', { class: 'person-row' },
    h('a', { href: '#/u/' + p.id, class: 'suggest-who' }, ghostAvatar(p, 'sm'), h('div', {}, h('b', {}, p.name), h('div', { class: 'muted' }, '@' + p.handle))),
    p.custom ? h('span', { class: 'badge' }, 'Character') : p.edited ? h('span', { class: 'badge' }, 'Edited') : null,
    h('button', { class: 'btn', onclick: () => personEditor(acct, p.id) }, 'Edit'));
}

function charactersTab(acct) {
  const seed = worldSeed();
  const mine = [...castMap.values()].filter(r => r.injected).sort((a, b) => a.createdAt - b.createdAt);
  const q = popQuery.trim().toLowerCase();
  const everyone = Array.from({ length: Ghost.POP }, (_, i) => GW.person(seed, i));
  const hits = q ? everyone.filter(p => p.name.toLowerCase().includes(q) || p.handle.includes(q)) : everyone;
  const search = h('input', { type: 'search', placeholder: 'Search the population', value: popQuery, 'aria-label': 'Search the population' });
  search.addEventListener('input', () => {
    popQuery = search.value; popShown = 20;
    clearTimeout(search._t);
    search._t = setTimeout(() => render(true).then(() => { const el = $('.settings input[type=search]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }), 200);
  });
  return [
    h('section', {}, h('h3', {}, 'Your cast: ' + (castOn() ? 'showing' : 'hidden')),
      h('p', {}, 'Characters are people you invent. Show them and they join the feed, Explore and the side column, either on their own or alongside the generated crowd (turn the crowd on or off in General, Populated mode). Like everyone here they can never reply, like, follow or message anyone.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn' + (castOn() ? ' primary' : ''), 'aria-pressed': String(castOn()), onclick: () => {
        if (castOn()) { ls('as.cast', null); toast('Cast hidden.'); } else { worldSeed(); ls('as.cast', '1'); toast(mine.length ? 'Your cast has joined the feed.' : 'Cast on. Add a character to give it someone.'); }
        render(true);
      } }, castOn() ? 'Hide my cast' : 'Show my cast')),
      h('p', { class: 'fine', style: 'padding:8px 0 0' }, `Crowd: ${crowdOn() ? 'on' : 'off'} · Cast: ${castOn() ? 'on' : 'off'}`)),
    h('section', {}, h('h3', {}, `Add a character (${mine.length} of ${MAX_CAST})`),
      h('p', {}, 'Invent a person: their name, handle, bio, avatar, banner, numbers, how often they post and how they sound, or write their posts yourself.'),
      mine.map(rec => personRow(acct, GW.person(rec.seed, 0))),
      h('div', { class: 'btnrow', style: 'margin-top:10px' }, h('button', { class: 'btn primary', disabled: mine.length >= MAX_CAST, onclick: () => personEditor(acct, null) }, 'Add a character'))),
    h('section', {}, h('h3', {}, 'Population'),
      h('p', {}, `${people(Ghost.POP)} in the crowd, every one of them editable. Change someone's look and it updates everywhere. Change their posting style and their posts from now on use it; what they already said stays as it was.`),
      search,
      h('p', { class: 'fine', style: 'padding:8px 0' }, `${people(hits.length)}${q ? (hits.length === 1 ? ' matches' : ' match') : ''}${[...castMap.values()].filter(r => !r.injected).length ? ` · ${plural([...castMap.values()].filter(r => !r.injected).length, 'edit')} so far` : ''}`),
      hits.slice(0, popShown).map(p => personRow(acct, p)),
      hits.length > popShown && h('div', { class: 'btnrow', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => { popShown += 20; render(true); } }, 'Show more'))),
  ];
}

function personEditor(acct, ref) {
  const isNew = !ref;
  let seed, idx;
  if (isNew) { seed = Ghost.newCharacterSeed(); idx = 0; ref = `${seed}.0`; }
  else { const pr = Ghost.parsePersonRef(ref); if (!pr) return; seed = pr.seed; idx = pr.i; }
  if (isNew && [...castMap.values()].filter(r => r.injected).length >= MAX_CAST) return toast(`That is the most characters allowed (${MAX_CAST}).`);
  const existing = castMap.get(ref) || null;
  const cur = GW.person(seed, idx);
  let avatarImg = cur.avatarImg || null, bannerImg = cur.bannerImg || null, colorTouched = !!existing?.color, bannerTouched = !!existing?.bannerColor;

  const name = h('input', { value: cur.name, maxlength: 40 });
  const handle = h('input', { value: cur.handle, maxlength: 15, autocapitalize: 'none', spellcheck: 'false' });
  const bio = h('textarea', { rows: 2, maxlength: 160 }, cur.bio);
  const joined = h('input', { value: cur.joined, maxlength: 30 });
  const followers = h('input', { type: 'number', min: '0', value: String(cur.followers) });
  const following = h('input', { type: 'number', min: '0', value: String(cur.following) });
  const color = h('input', { type: 'color', value: toHex(cur.color) });
  const bannerColor = h('input', { type: 'color', value: existing?.bannerColor || toHex(cur.color) });
  const style = h('select', { 'aria-label': 'Posting style' }, h('option', { value: '' }, 'Original mix'), Ghost.STYLES.map(x => h('option', { value: x.id }, x.label)));
  style.value = existing?.style || '';
  const every = h('input', { type: 'number', min: '1', max: '168', step: '1', placeholder: 'auto', value: existing?.every ? String(existing.every) : (isNew ? '8' : '') });
  const lines = h('textarea', { rows: 5, placeholder: 'One post per line. They will go through these in order, again and again.', 'aria-label': 'Their posts' }, (existing?.lines || []).join('\n'));
  const err = h('p', { class: 'err' });
  const banner = h('div', { class: 'banner edit' });
  const av = h('div', { class: 'avatar lg' });
  const paint = () => {
    banner.style.background = bannerTouched ? `linear-gradient(135deg, ${bannerColor.value}, color-mix(in srgb, ${bannerColor.value} 55%, #8b5cf6))` : cur.banner;
    banner.style.backgroundImage = ''; paintImage(banner, bannerImg);
    av.style.background = colorTouched ? color.value : cur.color; av.style.backgroundImage = '';
    av.textContent = avatarImg ? '' : (name.value.trim() || '?')[0].toUpperCase(); paintImage(av, avatarImg);
  };
  color.addEventListener('input', () => { colorTouched = true; paint(); });
  bannerColor.addEventListener('input', () => { bannerTouched = true; paint(); });
  name.addEventListener('input', paint);
  paint();

  const field = (label, el) => h('label', { class: 'field' }, h('span', {}, label), el);
  const save = h('button', { class: 'btn primary' }, isNew ? 'Add character' : 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New character' : 'Edit this person')),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, isNew ? 'They will be marked "Custom character, made by you" and can never respond to anything.' : 'Their look changes everywhere straight away. A new posting style applies to what they post from now on.'),
      banner,
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: async () => { const d = await chooseImage(1500, 500); if (d) { bannerImg = d; paint(); } } }, 'Change banner'),
        h('button', { class: 'btn', onclick: () => { bannerImg = null; paint(); } }, 'Remove banner')),
      h('div', { style: 'margin:12px 0' }, av),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: async () => { const d = await chooseImage(256, 256); if (d) { avatarImg = d; paint(); } } }, 'Change avatar'),
        h('button', { class: 'btn', onclick: () => { avatarImg = null; paint(); } }, 'Remove avatar')),
      h('div', { style: 'height:12px' }),
      field('Name', name), field('Handle', handle), field('Bio', bio), field('Joined', joined),
      h('div', { class: 'two' }, field('Followers', followers), field('Following', following)),
      h('div', { class: 'two' }, field('Avatar color (no image)', color), field('Banner color (no image)', bannerColor)),
      h('div', { class: 'two' }, field('Posting style', style), field('Posts every ~hours', every)),
      field('Write their posts (optional)', lines),
      err,
      h('div', { class: 'btnrow' },
        save,
        existing && !isNew && !existing.injected && h('button', { class: 'btn', onclick: async () => { await db.del('posts', existing.id); close(); toast('Back to the original.'); render(true); } }, 'Restore original'),
        existing && existing.injected && h('button', { class: 'btn danger', onclick: async () => { if (!confirm(`Delete ${cur.name}? They will vanish from the population.`)) return; await db.del('posts', existing.id); close(); toast('Character deleted.'); render(true); } }, 'Delete character')))));

  save.addEventListener('click', async () => {
    err.textContent = '';
    const nm = name.value.trim(), hd = handle.value.trim().toLowerCase().replace(/^@/, '');
    if (!nm) return void (err.textContent = 'Everyone needs a name.');
    if (!/^[a-z0-9_]{1,15}$/.test(hd)) return void (err.textContent = 'Handle: 1-15 letters, numbers or underscores.');
    const fo = Number(followers.value), fg = Number(following.value);
    if (!(fo >= 0 && fo <= 999999999) || !(fg >= 0 && fg <= 999999999)) return void (err.textContent = 'Follower numbers are 0 to 999,999,999.');
    const ev = every.value === '' ? null : Number(every.value);
    if (ev !== null && !(ev >= 1 && ev <= 168)) return void (err.textContent = 'Posting frequency is every 1 to 168 hours.');
    const ls_ = lines.value.split('\n').map(x => x.trim()).filter(Boolean);
    if (ls_.length > 100 || ls_.some(x => x.length > 280)) return void (err.textContent = 'Up to 100 posts, 280 characters each.');
    const info = await storageInfo();
    if (info && info.usage >= storageCap()) return void (err.textContent = `You have reached your storage limit of ${fmtMB(storageCap())}. Raise it in Settings or delete some posts.`);
    const changedVoice = JSON.stringify([style.value, ls_]) !== JSON.stringify([existing?.style || '', existing?.lines || []]);
    const rec = {
      id: existing?.id || uid(), accountId: acct.id, kind: 'cast', ref, seed, injected: isNew || !!existing?.injected,
      createdAt: existing?.createdAt || Date.now(),
      name: nm, handle: hd, bio: bio.value.trim(), joined: joined.value.trim(), followers: Math.floor(fo), following: Math.floor(fg),
      color: colorTouched ? color.value : (existing?.color || null), bannerColor: bannerTouched ? bannerColor.value : (existing?.bannerColor || null),
      avatarImg, bannerImg, style: style.value || null, every: ev, lines: ls_,
      since: isNew || existing?.injected ? 0 : (changedVoice ? Date.now() : (existing?.since || 0)),
    };
    save.disabled = true;
    try { await savePost(acct, rec); }
    catch (e) { console.error(e); err.textContent = isQuotaError(e) ? 'Out of space.' : 'That could not be saved.'; save.disabled = false; return; }
    close();
    toast(isNew ? `${nm} has joined the population.` : 'Saved.');
    if (isNew) { ls('as.cast', '1'); settingsTab = 'characters'; go('/settings/characters'); }
    render(true);
  });
}

function populatedSection() {
  const on = crowdOn();
  const input = h('input', { value: ls('as.seed') || '', maxlength: 16, 'aria-label': 'World seed', placeholder: 'seed', spellcheck: 'false' });
  return h('section', {}, h('h3', {}, 'Populated mode: ' + (on ? 'on' : 'off')),
    h('p', {}, 'Fills Home, Explore and the side column with a procedurally generated crowd. They are scenery: nobody in it can reply, like, follow or message you, ever. Nothing is saved for them. The crowd is calculated on screen from a seed, so it costs no storage.'),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn' + (on ? ' primary' : ''), 'aria-pressed': String(on), onclick: () => {
      if (on) { ls('as.populated', null); toast('Back to nobody.'); }
      else { worldSeed(); ls('as.populated', '1'); toast(`Populated mode on. ${Ghost.POP} people, 0 of them real.`); }
      render(true);
    } }, on ? 'Turn off' : 'Turn on')),
    on && h('div', { style: 'margin-top:14px' },
      h('p', { style: 'margin:0 0 6px' }, 'World seed. The same seed always gives the same people. Share yours and a friend sees the same crowd, and still not you.'),
      h('div', { class: 'btnrow' }, input,
        h('button', { class: 'btn', onclick: () => { const v = Ghost.cleanSeed(input.value); if (!v) return toast('A seed is letters, numbers, - or _.'); ls('as.seed', v); toast('New world loaded.'); render(true); } }, 'Apply'),
        h('button', { class: 'btn', onclick: () => { ls('as.seed', Ghost.newSeed()); toast('New world loaded.'); render(true); } }, 'Randomize'))));
}

function storageSection() {
  const note = h('p', {}, 'Checking...');
  const bar = h('div', { class: 'storage-bar', hidden: true }, h('span', {}));
  const capMB = storageCap() / MB;
  const num = h('input', { type: 'number', min: '1', step: 'any', value: String(capMB >= 1024 && capMB % 1024 === 0 ? capMB / 1024 : capMB), 'aria-label': 'Storage limit' });
  const unit = h('select', { 'aria-label': 'Unit' }, h('option', { value: 'MB' }, 'MB'), h('option', { value: 'GB' }, 'GB'));
  unit.value = capMB >= 1024 && capMB % 1024 === 0 ? 'GB' : 'MB';
  const save = () => {
    const mb = Math.round(Number(num.value) * (unit.value === 'GB' ? 1024 : 1));
    if (!(mb >= 50)) return toast('The smallest limit is 50 MB.');
    ls('as.capmb', String(mb));
    toast(`Limit set to ${fmtMB(mb * MB)}.`);
    render(true);
  };
  storageInfo().then(s => {
    if (!s) { note.textContent = 'This device does not report storage use.'; return; }
    const cap = storageCap(), pct = Math.min(100, s.usage / cap * 100);
    const free = s.quota ? ` Your device has about ${fmtMB(Math.max(0, s.quota - s.usage))} of room left for it.` : '';
    note.textContent = `Anti-Social is using ${fmtMB(s.usage)} of your ${fmtMB(cap)} limit.` + (s.usage >= cap ? ' You have hit the limit, so new posts are paused.' : pct >= 80 ? ' You are close to the limit.' : '') + free;
    bar.hidden = false; bar.firstChild.style.width = Math.max(2, pct) + '%';
    bar.classList.toggle('warn', pct >= 80);
  });
  return h('section', {}, h('h3', {}, 'Storage'), note, bar,
    h('p', { style: 'margin:12px 0 6px' }, 'Stop saving new posts when Anti-Social reaches:'),
    h('div', { class: 'btnrow' }, num, unit, h('button', { class: 'btn', onclick: save }, 'Set limit')),
    h('p', { class: 'fine', style: 'padding:8px 0 0' }, 'The meter is approximate. Pictures are shrunk before they are saved and are most of the space. Posts pause at your limit, or sooner if your device is nearly full. The generated crowd is never saved, so it costs nothing. Deleting posts frees space.'));
}

function settingsView(acct, ctxBg) {
  const theme = ls('as.theme') || 'auto';
  const skin = ls('as.skin') || '';
  const pickMode = v => { ls('as.skin', null); ls('as.theme', v === 'auto' ? null : v); applyTheme(); render(true); };
  const themeBtn = (v, label) => h('button', { class: 'btn' + (!skin && theme === v ? ' primary' : ''), onclick: () => pickMode(v) }, label);
  const swatch = (id, name, bg, accent) => h('button', { class: 'skin-opt' + (skin === id ? ' on' : ''), type: 'button', title: name, 'aria-label': name + ' theme', 'aria-pressed': String(skin === id),
    onclick: () => { ls('as.skin', id); applyTheme(); render(true); } },
    h('i', { style: `background:linear-gradient(135deg, ${bg} 55%, ${accent} 55%)` }), h('span', {}, name));
  const custom = ThemeCore.parseCustom(ls('as.skin.custom'));
  const colorIn = (label, key) => {
    const el = h('input', { type: 'color', value: custom[key], 'aria-label': label });
    el.addEventListener('input', () => { custom[key] = el.value; ls('as.skin.custom', JSON.stringify(custom)); ls('as.skin', 'custom'); applyTheme(); });
    el.addEventListener('change', () => render(true));
    return h('label', { class: 'colorpick' }, h('span', {}, label), el);
  };
  const themeFile = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  themeFile.addEventListener('change', async () => {
    const f = themeFile.files[0]; themeFile.value = '';
    if (!f) return;
    const t = f.size < 4096 ? ThemeCore.importTheme(await f.text()) : null;
    if (!t) { toast('That is not an Anti-Social theme file.'); return; }
    ls('as.skin.custom', JSON.stringify({ bg: t.bg, accent: t.accent })); ls('as.skin', 'custom'); applyTheme(); toast(`Loaded "${t.name}" as your custom theme.`); render(true);
  });
  const bgRec = ctxBg;
  const bgFile = h('input', { type: 'file', accept: 'image/*', hidden: true });
  bgFile.addEventListener('change', async () => {
    const f = bgFile.files[0]; bgFile.value = '';
    if (!f) return;
    const blocked = await pictureBlocked(f);
    if (blocked) { toast(blocked); return; }
    let data;
    try { data = await downscale(f, 1600); } catch { toast('That picture could not be read.'); return; }
    if (await appSave(acct, { id: 'bg' + acct.id, accountId: acct.id, kind: 'bg', data, updatedAt: Date.now() })) { toast('Background set.'); render(true); }
  });
  const veil = h('input', { type: 'range', min: 30, max: 100, step: 5, value: ThemeCore.clampVeil(ls('as.skin.veil')), 'aria-label': 'How much the theme color covers the picture' });
  veil.addEventListener('input', () => { ls('as.skin.veil', veil.value); document.documentElement.style.setProperty('--veil', veil.value + '%'); });

  const general = [
    h('section', {}, h('h3', {}, 'Display'), h('p', {}, 'Pick a look. Nobody will see it.'),
      h('div', { class: 'btnrow' }, themeBtn('auto', 'Auto'), themeBtn('light', 'Light'), themeBtn('dark', 'Dark'))),
    templateSection(),
    h('section', {}, h('h3', {}, 'Color themes'), h('p', {}, 'The text color is picked for you so it always stays readable.'),
      h('div', { class: 'skins' }, ThemeCore.PRESETS.map(p => swatch(p.id, p.name, p.bg, p.accent)), swatch('custom', 'Custom', custom.bg, custom.accent))),
    h('section', {}, h('h3', {}, 'Make your own'), h('p', {}, 'Choose two colors. Everything else follows.'),
      h('div', { class: 'btnrow' }, colorIn('Background', 'bg'), colorIn('Accent', 'accent')),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: () => saveFile('anti-social-theme.json', 'application/json', ThemeCore.exportTheme('My theme', custom.bg, custom.accent)).then(r => toast(r.ok ? `Saved to ${r.where}.` : r.where)) }, 'Export theme'),
        h('button', { class: 'btn', onclick: () => themeFile.click() }, 'Import theme'), themeFile)),
    h('section', {}, h('h3', {}, 'Background picture'), h('p', {}, bgRec ? 'Your picture is saved on this device' + (acct.vault ? ', encrypted with your passcode.' : '.') : 'Use one of your own pictures behind the app. It stays on this device.'),
      bgRec && h('div', { class: 'bgprev', style: `background-image:url("${bgRec.data}")` }),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn primary', onclick: () => bgFile.click() }, bgRec ? 'Change picture' : 'Choose a picture'),
        bgRec && h('button', { class: 'btn', onclick: async () => { await appDelete(bgRec.id); toast('Background removed.'); render(true); } }, 'Remove'), bgFile),
      bgRec && h('label', { class: 'colorpick wide' }, h('span', {}, 'More picture'), veil, h('span', {}, 'More color'))),
    h('section', {}, h('h3', {}, 'Apps'), h('p', {}, 'Show or hide each app, and call it whatever you like (up to 30 characters). Hiding an app keeps its data. Clear the name to go back to the original.'),
      h('div', { class: 'toggles' }, APP_LIST.map(([id, label]) => {
        const box = h('input', { type: 'checkbox', checked: !hiddenApps(acct).has(id), 'aria-label': 'Show ' + label });
        box.addEventListener('change', () => { const hid = hiddenApps(acct); if (box.checked) hid.delete(id); else hid.add(id); ls(hiddenKey(acct), JSON.stringify([...hid])); toast(`${appName(acct, id)} is ${box.checked ? 'shown' : 'hidden'}.`); });
        const name = h('input', { class: 'appname', value: customNames(acct)[id] || '', placeholder: label, maxlength: 30, 'aria-label': `Name for ${label}` });
        name.addEventListener('change', () => { setAppName(acct, id, name.value); name.value = customNames(acct)[id] || ''; toast(`Now called ${appName(acct, id)}.`); });
        return h('div', { class: 'check' }, box, name);
      }))),
    populatedSection(),
    storageSection(),
    installPrompt && h('section', {}, h('h3', {}, 'Install'), h('p', {}, 'Put Anti-Social on your home screen or desktop. It works offline, because there is nothing to connect to.'),
      h('button', { class: 'btn primary', onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(true); } }, 'Install app')),
    h('section', {}, h('h3', {}, 'Your data'), h('p', {}, 'It lives on this device and nowhere else. Clearing the app or site data deletes it. There is no recovery because there is no one to recover it.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => exportData(acct) }, 'Export my data (JSON)'),
        h('button', { class: 'btn', onclick: () => ejectAccount(acct) }, 'Eject account'))),
    h('section', {}, h('h3', {}, 'Account'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: logout }, 'Switch account'),
        h('button', { class: 'btn', onclick: () => addAccount(acct) }, 'Add account'),
        h('button', { class: 'btn danger', onclick: () => deleteAccount(acct) }, 'Delete this account'),
        h('button', { class: 'btn danger', onclick: wipeEverything }, 'Delete all data on this device'))),
    acct.guest ? h('section', {}, h('h3', {}, 'Guest account'), h('p', {}, 'You walked in as a guest: no handle chosen, no passcode. Anyone who opens this device can open this account. Make it a real account to pick a name and handle, and a passcode if you want one.'), h('button', { class: 'btn primary', onclick: () => claimGuest(acct) }, 'Make this a real account')) : null,
    accountListSection(acct),
    h('section', {}, h('h3', {}, 'Terms of Use'), h('p', {}, 'TOUCH GRASS.'),
      h('p', { class: 'fine', style: 'padding:0' }, 'No servers. No tracking. No audience. Go outside.')),
  ];

  const security = acct.vault
    ? [
      h('section', {}, h('h3', {}, 'Passcode: on'),
        h('p', {}, 'Your posts, images and profile are encrypted with your passcode (AES-256). The passcode is never stored, and there is no recovery.'),
        h('div', { class: 'btnrow' },
          h('button', { class: 'btn', onclick: () => { lockVault(); render(); } }, 'Lock now'),
          h('button', { class: 'btn', onclick: () => passcodeModal(acct) }, 'Change passcode'),
          h('button', { class: 'btn', onclick: () => removeVaultModal(acct) }, 'Remove passcode'))),
      h('section', {}, h('h3', {}, 'Auto-lock'), h('p', {}, 'Lock automatically after I leave the app:'),
        h('div', { class: 'btnrow' }, LOCK_CHOICES.map(([v, label]) =>
          h('button', { class: 'btn' + (lockAfter() === v ? ' primary' : ''), onclick: () => { ls('as.lockAfter', v); render(true); } }, label)))),
      h('section', {}, h('h3', {}, 'Duress PIN: ' + (acct.duress ? 'on' : 'off')),
        h('p', {}, 'A second PIN that looks like a normal unlock but secretly erases everything. Know the law where you live: destroying data you are legally required to keep can be a crime.'),
        h('div', { class: 'btnrow' },
          h('button', { class: 'btn', onclick: () => duressModal(acct) }, acct.duress ? 'Change duress PIN' : 'Set duress PIN'),
          acct.duress && h('button', { class: 'btn', onclick: () => removeDuress(acct) }, 'Remove it'))),
    ]
    : [
      h('section', {}, h('h3', {}, 'Passcode: off'),
        h('p', {}, 'You skipped the passcode, and that is fine. Your posts and profile are stored unencrypted on this device and the app opens straight away. You can add a passcode any time.'),
        h('button', { class: 'btn primary', onclick: () => passcodeModal(acct) }, 'Set a passcode')),
      h('section', {}, h('h3', {}, 'What a passcode adds'),
        h('p', { style: 'margin-bottom:4px' }, 'Posts, images, avatar, banner and profile locked with AES-256 encryption.'),
        h('p', { style: 'margin-bottom:4px' }, 'The app locks itself when you leave it.'),
        h('p', {}, 'Optional duress PIN: a second PIN that secretly erases everything. No recovery if you forget the passcode.')),
    ];

  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(settingsTab === k), class: settingsTab === k ? 'active' : '', onclick: () => { settingsTab = k; render(true); } }, label);
  return [
    topbar('Settings'),
    h('div', { class: 'tabs', role: 'tablist' }, tab('general', 'General'), tab('characters', 'Characters'), tab('security', 'Privacy & Security')),
    h('div', { class: 'settings' }, settingsTab === 'security' ? security : settingsTab === 'characters' ? charactersTab(acct) : general),
  ];
}

function extraAccountJoke(existing) {
  if (existing <= 1) return 'You really need a second account on an app with no people?';
  if (existing === 2) return 'A third account? There is nobody here to avoid.';
  return `Account number ${existing + 1}. You are the entire user base, and you want to be more of it.`;
}
function extraAccountToast(n) {
  return `Account number ${n} created. Followers across all of them: still 0.`;
}

/* ---------- accounts: switch and add ---------- */
function switchAccount(raw) {
  lockVault();
  if (raw.vault || raw.hash) {
    session = null; ls('as.session', null);
    authMode = { mode: 'unlock', account: raw };
  } else {
    session = raw.id; ls('as.session', raw.id);
    authMode = { mode: 'pick' };
  }
  go('/');
}

async function addAccount(acct) {
  const raw = await db.get('accounts', acct.id);
  const from = { raw, view: { name: acct.name || null, handle: acct.handle, color: acct.color, avatarImg: acct.avatarImg || null } };
  lockVault();
  session = null; ls('as.session', null);
  authMode = { mode: 'signup', from };
  go('/');
}

async function openAccountMenu(anchor, acct) {
  document.querySelector('.popover')?.remove();
  const accounts = AcctCore.listed((await db.all('accounts')).sort((a, b) => a.createdAt - b.createdAt));
  if (!accounts.some(a => a.id === acct.id)) accounts.push(acct);
  const close = () => { pop.remove(); document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc, true); };
  const outside = e => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const row = a => {
    const current = a.id === acct.id;
    const view = current ? acct : a;
    return h('button', { class: 'pop-row', role: 'menuitem', onclick: () => { close(); if (!current) switchAccount(a); } },
      avatar(view, 'sm'),
      h('div', { class: 'who' }, h('b', {}, view.name || '@' + view.handle), h('div', { class: 'muted' }, view.name ? '@' + view.handle : 'Locked')),
      h('span', { class: 'pop-mark' }, current ? icon('check') : (a.vault || a.hash) ? icon('lock') : null));
  };
  const pop = h('div', { class: 'popover', role: 'menu', 'aria-label': 'Accounts' },
    h('div', { class: 'pop-head' }, plural(accounts.length, 'account') + ' on this device'),
    accounts.map(row),
    h('button', { class: 'pop-row add', role: 'menuitem', onclick: () => { close(); addAccount(acct); } }, h('span', { class: 'pop-plus' }, icon('plus')), h('b', {}, 'Add account')),
    h('div', { class: 'pop-foot' }, 'Followers across all accounts: 0'));
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px';
  if (r.top < innerHeight / 2) pop.style.top = (r.bottom + 8) + 'px';
  else pop.style.bottom = (innerHeight - r.top + 8) + 'px';
  document.addEventListener('mousedown', outside, true);
  document.addEventListener('keydown', esc, true);
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
    composer(acct, { placeholder: W('composePlaceholder'), autofocus: true, onDone: () => { close(); render(true); } })));
}

/* ---------- auth ---------- */
async function authView() {
  const everyone = (await db.all('accounts')).sort((a, b) => a.createdAt - b.createdAt);
  const accounts = AcctCore.listed(everyone);          // hidden accounts are left out of the list
  if (!accounts.length && authMode.mode === 'pick') authMode = { mode: 'signup' };
  const wrap = (body, top) => h('div', { class: 'auth' }, h('div', { class: 'box' },
    top,
    h('div', { class: 'logo' }, icon('logo')), h('h1', {}, 'Anti-Social'),
    h('p', { class: 'tag' }, 'Social media with nobody on it.'), body));
  const loginAs = a => { session = a.id; ls('as.session', a.id); authMode = { mode: 'pick' }; go('/'); };

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
    const from = authMode.from;   // set when adding an account from inside the app
    const pass = h('input', { type: 'password', autocomplete: 'new-password' });
    const pass2 = h('input', { type: 'password', autocomplete: 'new-password' });
    const err = h('p', { class: 'err' });
    const btn = h('button', { class: 'btn primary' }, 'Create account');
    const submit = async e => {
      e.preventDefault();
      err.textContent = '';
      const hd = handle.value.trim().replace(/^@/, '');
      if (!/^\w{1,15}$/.test(hd)) { err.textContent = 'Handle: 1-15 letters, numbers or underscores.'; return; }
      if (everyone.some(a => a.handle.toLowerCase() === hd.toLowerCase())) { err.textContent = 'That handle is taken. By you. Earlier.'; return; }
      if (!pass.value && !pass2.value) {
        // No passcode: a plain local account. Nothing is encrypted and the app opens straight away.
        const id = uid();
        await db.put('accounts', { id, name: name.value.trim(), handle: hd, bio: '', color: colorFor(hd), createdAt: Date.now(), salt: null, hash: null });
        toast(from ? extraAccountToast(accounts.length + 1) : 'No passcode set. Add one any time in Settings, Privacy & Security.');
        return loginAs({ id });
      }
      if (pass.value.length < MIN_PASSCODE) { err.textContent = `Passcode: at least ${MIN_PASSCODE} characters, or leave both boxes empty for none.`; return; }
      if (pass.value !== pass2.value) { err.textContent = "Those passcodes don't match."; return; }
      btn.disabled = true;
      btn.textContent = 'Locking the vault...';
      try {
        const id = uid();
        const { key, meta } = await makeVault(id, pass.value);
        const profile = { name: name.value.trim(), bio: '', color: colorFor(hd), avatarImg: null, bannerImg: null };
        await db.put('accounts', { id, handle: hd, createdAt: Date.now(), vault: meta, profile: await seal(key, profile, 'profile:' + id) });
        vault.id = id; vault.key = key;
        if (from) toast(extraAccountToast(accounts.length + 1));
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
      h('label', { class: 'field' }, h('span', {}, `Passcode, optional (at least ${MIN_PASSCODE} characters)`), pass),
      h('label', { class: 'field' }, h('span', {}, 'Type it again'), pass2),
      err,
      h('div', { class: 'stack' }, btn,
        h('button', { type: 'button', class: 'btn', onclick: () => startGuest() }, 'Continue as guest'),
        importAccountButton(),
        !from && accounts.length > 0 && h('button', { type: 'button', class: 'btn', onclick: () => { authMode = { mode: 'pick' }; render(); } }, 'Back')),
      h('p', { class: 'fine', style: 'padding:12px 0 0' }, 'Leave the passcode blank and the app just opens, with nothing encrypted. Set one and everything you post is encrypted with it, with no recovery if you forget it. You can add or remove it later in Settings. No email needed. There is nobody to send it.'),
      from && h('div', { class: 'was-on' },
        h('p', { class: 'fine', style: 'padding:0 0 6px' }, 'You were just on:'),
        h('button', { type: 'button', class: 'acct', onclick: () => switchAccount(from.raw) },
          avatar(from.view, 'sm'),
          h('div', {}, h('b', {}, from.view.name || '@' + from.view.handle), h('div', { class: 'muted' }, from.view.name ? '@' + from.view.handle : 'Locked')),
          (from.raw.vault || from.raw.hash) && h('span', { class: 'muted', style: 'margin-left:auto;display:flex' }, icon('lock')))),
    ), from && h('div', { class: 'joke', role: 'note' }, extraAccountJoke(accounts.length)));
  }

  return wrap(h('div', { class: 'stack' },
    accounts.map(a => h('button', { class: 'acct', onclick: () => a.vault || a.hash ? (authMode = { mode: 'unlock', account: a }, render()) : loginAs(a) },
      avatar(a, 'sm'),
      h('div', {}, h('b', {}, a.name || '@' + a.handle), h('div', { class: 'muted' }, a.name ? '@' + a.handle : 'Locked')),
      (a.vault || a.hash) && h('span', { class: 'muted', style: 'margin-left:auto;display:flex' }, icon('lock')))),
    h('button', { class: 'btn primary', onclick: () => { authMode = { mode: 'signup' }; render(); } }, 'Create account'),
    h('button', { type: 'button', class: 'btn', onclick: () => startGuest() }, 'Continue as guest'), importAccountButton()));
}

/* ---------- shell ---------- */
function shell(acct, route, main, ctx, chId) {
  const id = tplId();
  if (id === 'chat') return shellChat(acct, route, main, ctx, chId);
  return shellDefault(acct, route, main);
}
function shellDefault(acct, route, main) {
  const link = (path, name, label) => h('a', { href: '#' + path, class: route === name ? 'active' : '', 'aria-label': label, 'aria-current': route === name ? 'page' : null }, icon({ profile: 'user', explore: 'search', notifications: 'bell', apps: 'grid' }[name] || name), h('span', {}, label));
  return h('div', { class: 'shell' },
    h('nav', { class: 'nav', 'aria-label': 'Main' },
      h('a', { class: 'brand', href: '#/', 'aria-label': 'Anti-Social home' }, icon('logo')),
      link('/', 'home', W('navHome')), link('/apps', 'apps', W('navApps')), link('/explore', 'explore', W('navExplore')), link('/notifications', 'notifications', W('navNotifications')),
      link('/profile', 'profile', W('navProfile')), link('/settings', 'settings', W('navSettings')),
      h('button', { class: 'postbtn', 'aria-label': 'Post', onclick: () => composeModal(acct) }, icon('compose'), h('span', {}, 'Post')),
      h('button', { class: 'me', 'aria-haspopup': 'menu', 'aria-label': 'Accounts', onclick: e => openAccountMenu(e.currentTarget, acct) }, avatar(acct, 'sm'),
        h('div', { class: 'who' }, h('b', {}, acct.name), h('div', { class: 'muted' }, '@' + acct.handle)))),
    h('main', { class: 'main' }, main),
    h('aside', { class: 'side' },
      h('div', { class: 'search' }, icon('search'), h('span', {}, W('searchBlurb'))),
      populated()
        ? [h('div', { class: 'card' }, h('h3', {}, W('sideHappening')),
            Ghost.trending(worldSeed(), Date.now(), 3).map((t, k) => h('div', { class: 'side-trend' }, h('div', { class: 'muted' }, `${k + 1} · ${W('sideTrending')}`), h('b', {}, t.tag ? '#' + t.tag : t.topic), h('div', { class: 'muted' }, fmt(t.posts) + ' posts')))),
           h('div', { class: 'card' }, h('h3', {}, W('sideWho')),
            GW.suggestions(worldSeed(), Date.now(), 3).map(p => h('a', { class: 'side-who', href: '#/u/' + p.id }, ghostAvatar(p, 'sm'), h('div', {}, h('b', {}, p.name), h('div', { class: 'muted' }, '@' + p.handle)))))]
        : [h('div', { class: 'card' }, h('h3', {}, W('sideHappening')), h('p', {}, W('sideEmptyHappening'))),
           h('div', { class: 'card' }, h('h3', {}, W('sideWho')), h('p', {}, W('sideEmptyWho')))],
      h('p', { class: 'fine' }, 'No servers · No tracking · No audience · Terms: TOUCH GRASS')));
}

async function render(keepScroll = false) {
  const my = ++renderId;
  const oldPane = tplId() === 'chat' ? $('.main') : null, oldList = $('.chat-list');
  const y = oldPane ? oldPane.scrollTop : scrollY;
  const stick = oldList ? oldList.scrollHeight - oldList.scrollTop - oldList.clientHeight < 60 : true, listTop = oldList ? oldList.scrollTop : 0;
  const root = $('#app');
  try {
    const acct = session && await loadAccount(session);
    if (my !== renderId) return;
    if (!acct || acct.locked) { currentAcct = null; applyBg(null); }
    if (acct?.locked) {
      if (authMode.mode !== 'unlock' || authMode.account?.id !== acct.id) authMode = { mode: 'unlock', account: acct };
      document.title = 'Anti-Social';
      root.replaceChildren(await authView());
      return;
    }
    if (!acct) { applyBg(null); session = null; ls('as.session', null); document.title = 'Anti-Social'; root.replaceChildren(await authView()); return; }
    const all = await loadPosts(acct);
    if (my !== renderId) return;
    currentAcct = acct;
    applyBg(bgOf(all));
    if (all.bad) console.warn(`${all.bad} post(s) could not be decrypted`);
    // Your likes, reposts and follows of generated accounts live beside your posts but are not posts.
    const posts = all.filter(p => !p.kind);                 // real posts only; everything else is a record of some other kind
    const apps = { note: [], diary: [], event: [], txn: [], acct: [], asset: [], groc: [], glist: [], chore: [], done: [], bg: [], bible: [], bstate: [], bbook: [], place: [], recipe: [], cstate: [], chan: [] };
    for (const p of all) if (apps[p.kind]) apps[p.kind].push(p);
    castMap = new Map(all.filter(p => p.kind === 'cast').map(p => [p.ref, p]));
    const reactions = new Map(all.filter(p => p.kind === 'ghost').map(p => [p.target, p]));
    const ctx = { posts, apps, reactions, following: [...reactions.values()].filter(x => x.followed).length, byId: new Map(posts.map(p => [p.id, p])), replyCount: new Map() };
    for (const p of posts) if (p.parentId) ctx.replyCount.set(p.parentId, (ctx.replyCount.get(p.parentId) || 0) + 1);

    const [, r = '', arg, arg2] = location.hash.split('/');
    const route = { notifications: 'notifications', explore: 'explore', profile: 'profile', settings: 'settings', post: 'post', u: 'u', apps: 'apps', channel: 'home' }[r] || 'home';
    const chId = r === 'channel' ? arg : '';
    const main = {
      home: () => homeView(acct, ctx, chId), apps: () => appsView(acct, ctx, arg, arg2), explore: () => exploreView(acct, ctx), notifications: notificationsView, u: () => ghostProfileView(acct, ctx, arg),
      profile: () => profileView(acct, ctx), settings: () => { if (arg === 'security' || arg === 'characters') settingsTab = arg; return settingsView(acct, ctx.apps.bg[0]); }, post: () => postView(acct, ctx, arg),
    }[route]();
    document.title = route === 'home' ? 'Home / Anti-Social' : route[0].toUpperCase() + route.slice(1) + ' / Anti-Social';
    root.replaceChildren(shell(acct, route, main, ctx, chId));
    if (tplId() === 'chat') {
      // in the chat layout the panes scroll, not the page; the message list sticks to the newest message
      const list = $('.chat-list'), pane = $('.main');
      if (list) list.scrollTop = keepScroll && !stick ? listTop : list.scrollHeight;
      else if (pane) pane.scrollTop = keepScroll ? y : 0;
    } else scrollTo(0, keepScroll ? y : 0);
  } catch (e) {
    console.error(e);
    root.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'box' },
      h('h1', {}, 'Storage unavailable'),
      h('p', { class: 'tag' }, 'Anti-Social keeps everything in your browser, and this browser is not letting it. Private mode can do this. Try a normal window.'))));
  }
}

window.addEventListener('hashchange', () => { feedCount = 25; ghostPostCount = 12; render(); });
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

'use strict';
/* Accounts: pure logic for exporting an account to a file, reading one back safely, guests and hidden accounts.
   Nothing here touches the page or the network. An export file is untrusted input, so it is checked hard. */
const AcctCore = (() => {
  const FORMAT = 2;
  const MAX_FILE = 400 * 1024 * 1024, MAX_RECORDS = 300000, MAX_IMAGE = 8 * 1024 * 1024, MAX_PREF = 20000;
  const PREF_PREFIXES = ['as.apporder.', 'as.hiddenapps.', 'as.appnames.'];
  const ACCOUNT_TEXT = { name: 50, bio: 500 };
  const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const validHandle = h => typeof h === 'string' && /^\w{1,15}$/.test(h);
  const validId = id => typeof id === 'string' && /^[\w.:-]{1,64}$/.test(id);
  const dataImage = v => typeof v === 'string' && v.length <= MAX_IMAGE && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : null;

  const stamp = d => d.toISOString().slice(0, 10);
  const fileName = (handle, when = new Date()) => `anti-social-${String(handle).replace(/\W/g, '')}-${stamp(when)}.json`;
  const prefKeys = id => PREF_PREFIXES.map(p => p + id);

  // The file you keep. Only known account fields go in (never the salt, hash, vault or duress slot).
  const buildExport = (acct, posts, prefs, when = new Date()) => ({
    app: 'anti-social', format: FORMAT, exportedAt: when.toISOString(),
    account: { id: acct.id, handle: acct.handle, name: acct.name || '', bio: acct.bio || '', color: acct.color || null, createdAt: acct.createdAt || Date.now(),
      avatarImg: acct.avatarImg || null, bannerImg: acct.bannerImg || null, ...(acct.guest ? { guest: true } : {}) },
    posts, prefs: prefs || {},
  });

  // Reads a file's text. Returns {ok:true, data:{account, posts, prefs}} or {ok:false, error}.
  const parseExport = text => {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'That file is empty.' };
    if (text.length > MAX_FILE) return { ok: false, error: 'That file is too big.' };
    let d;
    try { d = JSON.parse(text); } catch { return { ok: false, error: 'That is not an Anti-Social export file.' }; }
    if (!d || typeof d !== 'object' || d.app !== 'anti-social' || !d.account || typeof d.account !== 'object') return { ok: false, error: 'That is not an Anti-Social export file.' };
    if (d.format !== undefined && !(Number.isInteger(d.format) && d.format >= 1 && d.format <= FORMAT)) return { ok: false, error: 'That file is from a newer version of Anti-Social. Update the app and try again.' };
    const a = d.account;
    if (!validHandle(a.handle)) return { ok: false, error: "That file has no valid handle, so it can't be an account." };
    if (!Array.isArray(d.posts)) return { ok: false, error: 'That file has no data in it.' };
    if (d.posts.length > MAX_RECORDS) return { ok: false, error: 'That file has too many items.' };
    const seen = new Set(), posts = [];
    for (const p of d.posts) {
      if (!p || typeof p !== 'object' || Array.isArray(p) || !validId(p.id)) return { ok: false, error: 'That file has a damaged item in it, so it was not imported.' };
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const { iv, ct, v, accountId, ...rest } = p;                   // never trust encryption fields from a file
      if (rest.m !== undefined && typeof rest.m !== 'string') return { ok: false, error: 'That file has a damaged item in it, so it was not imported.' };
      posts.push(rest);
    }
    const account = {
      id: validId(a.id) ? a.id : null, handle: a.handle, name: str(a.name, ACCOUNT_TEXT.name), bio: str(a.bio, ACCOUNT_TEXT.bio),
      color: typeof a.color === 'string' && /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : null,
      createdAt: Number.isFinite(a.createdAt) && a.createdAt > 0 && a.createdAt < 4e12 ? a.createdAt : Date.now(),
      avatarImg: dataImage(a.avatarImg), bannerImg: dataImage(a.bannerImg), guest: a.guest === true,
    };
    const prefs = {};
    if (d.prefs && typeof d.prefs === 'object' && !Array.isArray(d.prefs)) {
      for (const [k, val] of Object.entries(d.prefs)) if (PREF_PREFIXES.some(p => k.startsWith(p)) && typeof val === 'string' && val.length <= MAX_PREF && k.length < 100) prefs[k] = val;
    }
    return { ok: true, data: { account, posts, prefs, exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt.slice(0, 40) : '' } };
  };
  // Settings saved under another account's id are moved to the new id.
  const remapPrefs = (prefs, oldId, newId) => {
    const out = {};
    for (const [k, v] of Object.entries(prefs || {})) { const p = PREF_PREFIXES.find(x => k.startsWith(x)); if (p && k === p + oldId) out[p + newId] = v; }
    return out;
  };

  // ---- guests
  const guestHandle = (taken, rnd = Math.random) => {
    const used = new Set([...taken].map(h => String(h).toLowerCase()));
    for (let i = 0; i < 50; i++) { const h = 'guest_' + Math.floor(rnd() * 36 ** 6).toString(36).padStart(6, '0'); if (!used.has(h)) return h; }
    return 'guest_' + Date.now().toString(36).slice(-8);
  };
  const isGuest = a => !!(a && a.guest);

  // ---- hidden accounts: a hidden one is left out of the account list. You need at least one other visible account.
  const visible = list => list.filter(a => !a.hidden);
  const hidden = list => list.filter(a => a.hidden);
  const canHide = (list, a) => !!a && !a.hidden && visible(list).filter(x => x.id !== a.id).length >= 1;
  // What the sign-in screen shows: visible accounts, or everything if every account is hidden (so you are never locked out).
  const listed = list => visible(list).length ? visible(list) : list;
  const flagsOf = raw => ({ ...(raw && raw.hidden ? { hidden: true } : {}), ...(raw && raw.guest ? { guest: true } : {}) });

  return { FORMAT, PREF_PREFIXES, validHandle, validId, fileName, prefKeys, buildExport, parseExport, remapPrefs, guestHandle, isGuest, visible, hidden, canHide, listed, flagsOf };
})();
if (typeof module !== 'undefined') module.exports = AcctCore;

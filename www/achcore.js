'use strict';
/* Achievements: the pure logic. Games and their achievements, scoring, completion, and reading the files people keep
   (Steam and RetroAchievements API replies saved as JSON, CSV, or this app's own export). It never goes online: you put
   the data in by hand or from a file, and it adds it up for you. */
const AchCore = (() => {
  const PLATFORMS = [
    { id: 'steam', name: 'Steam', color: '#66c0f4' }, { id: 'ra', name: 'RetroAchievements', color: '#e6a117' }, { id: 'psn', name: 'PlayStation', color: '#3b82f6' }, { id: 'xbox', name: 'Xbox', color: '#22a355' },
    { id: 'switch', name: 'Nintendo Switch', color: '#e4332f' }, { id: 'epic', name: 'Epic Games', color: '#9aa0a6' }, { id: 'gog', name: 'GOG', color: '#a855f7' }, { id: 'other', name: 'Other', color: '#8a8f98' },
  ];
  const platform = id => PLATFORMS.find(p => p.id === id) || PLATFORMS[PLATFORMS.length - 1];
  const str = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max) : '';
  const int = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
  const MAX_ACH = 5000;

  const normGame = raw => ({ name: str(raw && raw.name, 80).trim(), platform: PLATFORMS.some(p => p.id === (raw && raw.platform)) ? raw.platform : 'other', notes: str(raw && raw.notes, 2000), hours: int(raw && raw.hours, 0, 99999, 0), console: str(raw && raw.console, 40) });
  const normAch = raw => ({
    key: str(raw && raw.key, 64), name: str(raw && raw.name, 120).trim(), desc: str(raw && raw.desc, 500), points: int(raw && raw.points, 0, 100000, 1), hidden: !!(raw && raw.hidden),
    rarity: raw && raw.rarity != null && raw.rarity !== '' && Number.isFinite(Number(raw.rarity)) ? Math.max(0, Math.min(100, Math.round(Number(raw.rarity) * 10) / 10)) : null,
    done: !!(raw && raw.done), at: int(raw && raw.at, 0, 8.64e15, 0), hardcore: !!(raw && raw.hardcore), order: int(raw && raw.order, 0, 1e6, 0), note: str(raw && raw.note, 300),
  });

  /* ---------- the numbers ---------- */
  const gameStats = (achs) => {
    let unlocked = 0, points = 0, earned = 0, last = 0, hidden = 0;
    for (const a of achs) { points += a.points; if (a.hidden) hidden++; if (a.done) { unlocked++; earned += a.points; if (a.at > last) last = a.at; } }
    const total = achs.length;
    return { total, unlocked, points, earned, pct: total ? Math.round(unlocked / total * 1000) / 10 : 0, complete: total > 0 && unlocked === total, last, hidden };
  };
  const byGame = achs => { const m = new Map(); for (const a of achs) { if (!m.has(a.game)) m.set(a.game, []); m.get(a.game).push(a); } return m; };
  const overall = (games, achs) => {
    const g = byGame(achs), out = { games: games.length, total: 0, unlocked: 0, points: 0, earned: 0, complete: 0, avgPct: 0, platforms: {} };
    let pctSum = 0, counted = 0;
    for (const game of games) {
      const s = gameStats(g.get(game.id) || []), p = out.platforms[game.platform] || (out.platforms[game.platform] = { games: 0, total: 0, unlocked: 0, earned: 0, complete: 0 });
      out.total += s.total; out.unlocked += s.unlocked; out.points += s.points; out.earned += s.earned; if (s.complete) out.complete++;
      p.games++; p.total += s.total; p.unlocked += s.unlocked; p.earned += s.earned; if (s.complete) p.complete++;
      if (s.total) { pctSum += s.pct; counted++; }
    }
    out.avgPct = counted ? Math.round(pctSum / counted * 10) / 10 : 0;
    return out;
  };
  const GAME_SORTS = { recent: 'Recent activity', name: 'Name', pct: 'Completion', earned: 'Score', unlocked: 'Most unlocked' };
  const sortGames = (games, achs, key) => {
    const g = byGame(achs), st = new Map(games.map(x => [x.id, gameStats(g.get(x.id) || [])]));
    const f = { recent: (a, b) => (st.get(b.id).last || b.createdAt) - (st.get(a.id).last || a.createdAt), name: (a, b) => a.name.localeCompare(b.name), pct: (a, b) => st.get(b.id).pct - st.get(a.id).pct || a.name.localeCompare(b.name),
      earned: (a, b) => st.get(b.id).earned - st.get(a.id).earned, unlocked: (a, b) => st.get(b.id).unlocked - st.get(a.id).unlocked }[key] || (() => 0);
    return [...games].sort(f);
  };
  const filterGames = (games, q, plat) => { q = String(q || '').trim().toLowerCase(); return games.filter(g => (!plat || g.platform === plat) && (!q || g.name.toLowerCase().includes(q))); };
  const ACH_FILTERS = [['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'Locked'], ['hidden', 'Hidden'], ['rare', 'Rarest first']];
  const filterAchs = (achs, { filter = 'all', q = '', sort = 'order' } = {}) => {
    q = String(q || '').trim().toLowerCase();
    let out = achs.filter(a => (filter === 'all' || filter === 'rare' || (filter === 'unlocked' && a.done) || (filter === 'locked' && !a.done) || (filter === 'hidden' && a.hidden)) && (!q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)));
    const key = filter === 'rare' ? 'rare' : sort;
    const f = { order: (a, b) => a.order - b.order || a.name.localeCompare(b.name), points: (a, b) => b.points - a.points || a.order - b.order, date: (a, b) => (b.at || 0) - (a.at || 0) || a.order - b.order,
      name: (a, b) => a.name.localeCompare(b.name), rare: (a, b) => (a.rarity == null ? 101 : a.rarity) - (b.rarity == null ? 101 : b.rarity) || a.order - b.order }[key];
    return f ? out.sort(f) : out;
  };
  // newest unlocks across every game
  const recent = (achs, n = 30) => achs.filter(a => a.done && a.at > 0).sort((a, b) => b.at - a.at).slice(0, n);
  // unlocks per month, oldest first, for the last `months` months ending at `now`
  const monthly = (achs, now = Date.now(), months = 12) => {
    const d = new Date(now), out = [];
    for (let i = months - 1; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ y: m.getFullYear(), m: m.getMonth(), n: 0 }); }
    for (const a of achs) if (a.done && a.at > 0) { const t = new Date(a.at), e = out.find(x => x.y === t.getFullYear() && x.m === t.getMonth()); if (e) e.n++; }
    return out;
  };
  const rarest = (achs, n = 5) => achs.filter(a => a.done && a.rarity != null).sort((a, b) => a.rarity - b.rarity).slice(0, n);

  /* ---------- typing a list in ---------- */
  // "Name | description | points" per line (a tab or " - " also works); a number at the end is the points
  const parseBulk = text => {
    const out = [];
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim(); if (!line) continue;
      let parts = line.includes('|') ? line.split('|') : line.includes('\t') ? line.split('\t') : line.split(/\s+[-–—]\s+/);
      parts = parts.map(s => s.trim());
      let points = 1;
      if (parts.length > 1 && /^\d{1,6}$/.test(parts[parts.length - 1]) && (parts.length > 2 || /^\d+$/.test(parts[1]))) { points = Number(parts.pop()); }
      if (!parts[0]) continue;
      out.push(normAch({ name: parts[0], desc: parts.slice(1).join(' - '), points }));
      if (out.length >= MAX_ACH) break;
    }
    return out;
  };

  /* ---------- files people have ---------- */
  const epochMs = v => { const n = Number(v); return n > 0 ? (n < 1e11 ? n * 1000 : n) : 0; };
  const raDate = s => { if (!s || typeof s !== 'string') return 0; const t = Date.parse(s.trim().replace(' ', 'T') + (/Z|[+-]\d\d:?\d\d$/.test(s.trim()) ? '' : 'Z')); return Number.isFinite(t) ? t : 0; };
  const asObj = x => { if (typeof x === 'string') { try { return JSON.parse(x); } catch { return null; } } return x && typeof x === 'object' ? x : null; };
  // Steam: GetSchemaForGame (names, descriptions, hidden) and GetPlayerAchievements (what you unlocked), saved as JSON
  const steamSchema = d => { const g = d && d.game, list = g && g.availableGameStats && g.availableGameStats.achievements; return Array.isArray(list) ? { name: str(g.gameName, 80), achs: list.map((a, i) => ({ key: a.name, name: a.displayName || a.name, desc: a.description || '', hidden: !!a.hidden, order: i, points: 1 })) } : null; };
  const steamPlayer = d => { const p = d && d.playerstats, list = p && p.achievements; return Array.isArray(list) ? { name: str(p.gameName, 80), achs: list.map((a, i) => ({ key: a.apiname, name: a.name || a.apiname, desc: a.description || '', done: !!a.achieved, at: a.achieved ? epochMs(a.unlocktime) : 0, order: i, points: 1 })) } : null; };
  // RetroAchievements: API_GetGameInfoAndUserProgress
  const raGame = d => {
    if (!d || typeof d !== 'object' || !d.Achievements || typeof d.Achievements !== 'object' || !('Title' in d)) return null;
    const players = Number(d.NumDistinctPlayers || d.NumDistinctPlayersCasual) || 0;
    const achs = Object.values(d.Achievements).map((a, i) => {
      const hc = raDate(a.DateEarnedHardcore), sc = raDate(a.DateEarned), at = hc || sc;
      return { key: String(a.ID), name: a.Title, desc: a.Description || '', points: a.Points, done: !!at, at, hardcore: !!hc, order: Number.isFinite(Number(a.DisplayOrder)) ? Number(a.DisplayOrder) : i, rarity: players && Number(a.NumAwarded) >= 0 ? Math.min(100, Number(a.NumAwarded) / players * 100) : null };
    });
    return { name: str(d.Title, 80), platform: 'ra', console: str(d.ConsoleName, 40), achs };
  };
  const csvRows = text => {
    const rows = []; let row = [], cur = '', q = false; const s = String(text || '').replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) { const c = s[i];
      if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ',' || c === ';') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  };
  const truthy = v => /^(1|true|yes|y|x|done|unlocked|achieved)$/i.test(String(v || '').trim());
  const csvAchs = text => {
    const rows = csvRows(text); if (rows.length < 2) return null;
    const head = rows[0].map(h => h.trim().toLowerCase()), col = (...names) => head.findIndex(h => names.includes(h));
    const cn = col('name', 'title', 'achievement'), cd = col('description', 'desc'), cp = col('points', 'score', 'gamerscore'), cu = col('unlocked', 'done', 'achieved', 'earned'), ct = col('date', 'unlocked date', 'date unlocked', 'unlocked at', 'dateearned'), ch = col('hidden', 'secret'), cr = col('rarity', 'percent', 'global %');
    if (cn < 0) return null;
    const achs = rows.slice(1, MAX_ACH + 1).map((r, i) => {
      const t = ct >= 0 ? Date.parse(String(r[ct] || '').trim()) : NaN, at = Number.isFinite(t) ? t : 0;
      return { name: r[cn], desc: cd >= 0 ? r[cd] : '', points: cp >= 0 && r[cp] !== '' ? r[cp] : 1, done: cu >= 0 ? truthy(r[cu]) || at > 0 : at > 0, at, hidden: ch >= 0 && truthy(r[ch]), rarity: cr >= 0 ? String(r[cr] || '').replace('%', '') : null, order: i };
    }).filter(a => a.name && a.name.trim());
    return achs.length ? { name: '', achs } : null;
  };
  const EXPORT_FORMAT = 'anti-social-achievements';
  // Work out what a file is. Returns {ok, kind, name, platform, console, achs} or {ok:false, error}.
  const detect = input => {
    const d = asObj(input);
    if (d) {
      if (d.format === EXPORT_FORMAT && Array.isArray(d.games)) return { ok: true, kind: 'export', export: d };
      const ra = raGame(d); if (ra) return { ok: true, kind: 'retroachievements', ...ra, achs: ra.achs.slice(0, MAX_ACH).map(normAch) };
      const sp = steamPlayer(d); if (sp) return { ok: true, kind: 'steam', platform: 'steam', ...sp, achs: sp.achs.slice(0, MAX_ACH).map(normAch) };
      const ss = steamSchema(d); if (ss) return { ok: true, kind: 'steam', platform: 'steam', ...ss, achs: ss.achs.slice(0, MAX_ACH).map(normAch) };
      return { ok: false, error: 'That JSON is not a Steam or RetroAchievements reply, or an Achievements export.' };
    }
    if (typeof input === 'string') { const c = csvAchs(input); if (c) return { ok: true, kind: 'csv', platform: null, ...c, achs: c.achs.map(normAch) }; }
    return { ok: false, error: 'That file is not JSON or a CSV with a "name" column.' };
  };
  const matchKey = a => a.key ? 'k:' + a.key : 'n:' + a.name.toLowerCase();
  // Put incoming achievements into a game that already has some. Never takes an unlock away.
  const merge = (existing, incoming) => {
    const idx = new Map(); for (const e of existing) { idx.set(matchKey(e), e); idx.set('n:' + e.name.toLowerCase(), e); }
    const add = [], update = [], seen = new Set();
    for (const a of incoming) {
      const e = idx.get(matchKey(a)) || idx.get('n:' + a.name.toLowerCase());
      if (!e) { add.push(a); continue; }
      if (seen.has(e.id)) continue; seen.add(e.id);
      const patch = {};
      if (a.key && !e.key) patch.key = a.key;
      if (a.desc && a.desc !== e.desc && !e.desc) patch.desc = a.desc;
      if (a.hidden && !e.hidden) patch.hidden = true;
      if (a.rarity != null && a.rarity !== e.rarity) patch.rarity = a.rarity;
      if (a.done && !e.done) { patch.done = true; patch.at = a.at; if (a.hardcore) patch.hardcore = true; }
      else if (a.done && e.done && a.at > 0 && (!e.at || a.at < e.at)) patch.at = a.at;
      if (Object.keys(patch).length) update.push({ id: e.id, patch });
    }
    return { add, update, same: incoming.length - add.length - update.length };
  };
  const exportAll = (games, achs) => ({ format: EXPORT_FORMAT, version: 1, games: games.map(g => ({ ...normGame(g), id: g.id, achs: achs.filter(a => a.game === g.id).map(a => normAch(a)) })) });

  return { PLATFORMS, platform, MAX_ACH, normGame, normAch, gameStats, byGame, overall, GAME_SORTS, sortGames, filterGames, ACH_FILTERS, filterAchs, recent, monthly, rarest, parseBulk, detect, merge, exportAll, EXPORT_FORMAT, csvRows };
})();
if (typeof module !== 'undefined') module.exports = AchCore;

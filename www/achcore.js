'use strict';
/* Achievements: the pure logic. Games and their achievements, scoring, completion, reading a list pasted from a game's page
   (RetroAchievements or Steam) and this app's own backup files. It never goes online: you put the data in by hand or by
   pasting, and it adds it up for you. */
const AchCore = (() => {
  const PLATFORMS = [
    { id: 'steam', name: 'Steam', color: '#66c0f4' }, { id: 'ra', name: 'RetroAchievements', color: '#e6a117' }, { id: 'psn', name: 'PlayStation', color: '#3b82f6' }, { id: 'xbox', name: 'Xbox', color: '#22a355' },
    { id: 'switch', name: 'Nintendo Switch', color: '#e4332f' }, { id: 'epic', name: 'Epic Games', color: '#9aa0a6' }, { id: 'gog', name: 'GOG', color: '#a855f7' }, { id: 'other', name: 'Other', color: '#8a8f98' },
  ];
  const platform = id => PLATFORMS.find(p => p.id === id) || PLATFORMS[PLATFORMS.length - 1];
  const str = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max) : '';
  const int = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
  const MAX_ACH = 5000;

  const normGame = raw => ({ name: str(raw && raw.name, 80).trim(), platform: PLATFORMS.some(p => p.id === (raw && raw.platform)) ? raw.platform : 'other', notes: str(raw && raw.notes, 2000), hours: int(raw && raw.hours, 0, 99999, 0), console: str(raw && raw.console, 40), raId: int(raw && raw.raId, 0, 1e9, 0) });
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

  /* ---------- pasting from a website ---------- */
  // Text copied from a game's page on RetroAchievements (select all, copy):
  //   My Shield (1) (1)            <- title, points, and the points with the site's multiplier
  //   Acquire the standard shield from Tarin.
  //   Unlocked Jun 1, 2024 1:06 AM  <- only on achievements you have
  //   8,783 (3,919) of 9,109
  //   96.42% unlock rate            <- the share of players who have it
  const RA_TITLE = /^(.{1,120}?)\s*\((\d{1,6})\)(?:\s*\((\d{1,7})\))?\s*$/;
  const when = line => { const m = /^unlocked\b[:\s]*(?:\(?hardcore\)?\s*)?(.*)$/i.exec(line); if (!m) return null; const t = Date.parse(m[1].replace(/\s+/g, ' ').trim()); return { at: Number.isFinite(t) ? t : 0, hardcore: /hardcore/i.test(line) }; };
  const parseRaText = lines => {
    const out = []; let cur = null;
    const finish = () => { if (cur && cur.name) out.push(cur); cur = null; };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], t = RA_TITLE.exec(l);
      const next = lines[i + 1] || '';
      if (t && next && !RA_TITLE.test(next) && !when(next) && !/unlock rate/i.test(next) && !/^[\d,.\s()of]+$/.test(l)) { finish(); cur = { name: t[1].trim(), points: Number(t[2]), desc: next, done: false, at: 0, rarity: null, hardcore: false }; i++; continue; }
      if (!cur) continue;
      const w = when(l); if (w) { cur.done = true; cur.at = w.at; cur.hardcore = w.hardcore; continue; }
      const r = /([\d.,]+)\s*%\s*unlock rate/i.exec(l); if (r) { const v = parseFloat(r[1].replace(/,/g, '')); if (Number.isFinite(v)) cur.rarity = Math.min(100, v); }
    }
    finish(); return out;
  };
  // Steam's global achievement page, copied: a percent on its own line, then the name, then the description
  const parseSteamText = lines => {
    const out = []; const pct = l => /^\d{1,3}(?:\.\d+)?\s*%$/.test(l);
    for (let i = 0; i < lines.length - 1; i++) {
      if (!pct(lines[i]) || pct(lines[i + 1])) continue;
      const name = lines[i + 1], desc = lines[i + 2] && !pct(lines[i + 2]) ? lines[i + 2] : '';
      out.push({ name, desc, points: 1, done: false, at: 0, rarity: parseFloat(lines[i]), hardcore: false }); i += desc ? 2 : 1;
    }
    return out;
  };
  // returns {ok, kind, achs} or {ok:false, error}
  const parsePage = text => {
    const lines = String(text || '').replace(/ /g, ' ').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const ra = parseRaText(lines), steam = ra.length ? [] : parseSteamText(lines);
    const found = ra.length ? ra : steam, kind = ra.length ? 'retroachievements' : steam.length ? 'steam' : null;
    if (!kind) return { ok: false, error: 'No achievements were found in that text. Copy the whole achievement list from the game\'s page and paste it again.' };
    return { ok: true, kind, achs: found.slice(0, MAX_ACH).map((a, i) => normAch({ ...a, order: i })) };
  };

  /* ---------- RetroAchievements web API ---------- */
  const raDate = s => { if (!s || typeof s !== 'string') return 0; const t = Date.parse(s.trim().replace(' ', 'T') + (/Z|[+-]\d\d:?\d\d$/.test(s.trim()) ? '' : 'Z')); return Number.isFinite(t) ? t : 0; };
  // "669", "game/669", "https://retroachievements.org/game/669" -> 669 (or 0)
  const raGameId = input => { const m = /(?:\/game\/|^\s*)(\d{1,9})\s*(?:[/?#].*)?$/.exec(String(input || '')); return m ? Number(m[1]) : 0; };
  // API_GetGameInfoAndUserProgress -> {ok, raId, name, console, achs}
  const fromRaGame = d => {
    if (!d || typeof d !== 'object' || !d.Achievements || typeof d.Achievements !== 'object' || !('Title' in d)) return { ok: false, error: 'RetroAchievements did not send a game back. Check the game number.' };
    const players = Number(d.NumDistinctPlayers || d.NumDistinctPlayersCasual) || 0;
    const list = Array.isArray(d.Achievements) ? d.Achievements : Object.values(d.Achievements);
    const achs = list.slice(0, MAX_ACH).map((a, i) => {
      const hc = raDate(a.DateEarnedHardcore), sc = raDate(a.DateEarned), at = hc || sc;
      return normAch({ key: String(a.ID), name: a.Title, desc: a.Description || '', points: a.Points, done: !!at, at, hardcore: !!hc, order: Number.isFinite(Number(a.DisplayOrder)) ? Number(a.DisplayOrder) : i, rarity: players && Number(a.NumAwarded) >= 0 ? Number(a.NumAwarded) / players * 100 : null });
    });
    return { ok: true, raId: Number(d.ID) || 0, name: str(d.Title, 80), console: str(d.ConsoleName, 40), achs };
  };
  // API_GetUserCompletedGames -> [{raId, name, console, total, earned}] (the same game can be listed once for casual and once for hardcore)
  const fromRaGames = d => {
    if (!Array.isArray(d)) return [];
    const m = new Map();
    for (const g of d) { const id = Number(g && g.GameID); if (!id) continue; const earned = Math.max(Number(g.NumAwarded) || 0, Number(g.NumAwardedHardcore) || 0), prev = m.get(id); if (!prev || earned > prev.earned) m.set(id, { raId: id, name: str(g.Title, 80), console: str(g.ConsoleName, 40), total: Number(g.MaxPossible) || 0, earned }); }
    return [...m.values()].filter(g => g.total > 0).sort((a, b) => a.name.localeCompare(b.name));
  };
  const EXPORT_FORMAT = 'anti-social-achievements';
  // A backup made by this app's Export. Returns {ok, export} or {ok:false, error}.
  const detect = input => {
    let d = input; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
    return d && typeof d === 'object' && d.format === EXPORT_FORMAT && Array.isArray(d.games) ? { ok: true, kind: 'export', export: d } : { ok: false, error: 'That is not a backup made by Achievements (use Export to make one).' };
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

  return { PLATFORMS, platform, MAX_ACH, normGame, normAch, gameStats, byGame, overall, GAME_SORTS, sortGames, filterGames, ACH_FILTERS, filterAchs, recent, monthly, rarest, parseBulk, detect, merge, exportAll, EXPORT_FORMAT, parsePage, raGameId, fromRaGame, fromRaGames };
})();
if (typeof module !== 'undefined') module.exports = AchCore;

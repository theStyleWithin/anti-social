'use strict';
/* Screenshots: the pure logic for a gameplay screenshot gallery sorted by game. Titles, grouping, searching, dates from
   file names. No page, no images in here. */
const ShotCore = (() => {
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const cleanTitle = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  // an existing game with the same title (ignoring case, accents and punctuation)
  const findGame = (games, title) => { const f = fold(title); return f ? games.find(g => fold(g.name) === f) || null : null; };
  const byTitle = games => [...games].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

  const shotsOf = (shots, gameId) => shots.filter(s => s.game === gameId);
  const newest = (a, b) => (b.at || 0) - (a.at || 0) || (b.createdAt || 0) - (a.createdAt || 0);
  const oldest = (a, b) => -newest(a, b);
  const sortShots = (list, how = 'new') => [...list].sort(how === 'old' ? oldest : newest);
  // one line per game: count and the newest shot (for the cover)
  const folders = (games, shots, query = '') => {
    const q = fold(query), by = new Map();
    for (const s of shots) { const e = by.get(s.game) || { count: 0, cover: null }; e.count++; if (!e.cover || newest(s, e.cover) < 0) e.cover = s; by.set(s.game, e); }
    return byTitle(games).filter(g => !q || fold(g.name).includes(q)).map(g => ({ game: g, count: (by.get(g.id) || { count: 0 }).count, cover: (by.get(g.id) || {}).cover || null }));
  };
  // all shots, optionally one game and a search in captions and titles
  const filterShots = (shots, games, { game = '', query = '' } = {}) => {
    const q = fold(query), name = new Map(games.map(g => [g.id, fold(g.name)]));
    return shots.filter(s => (!game || s.game === game) && (!q || fold(s.caption).includes(q) || (name.get(s.game) || '').includes(q)));
  };
  const stats = (games, shots) => ({ games: games.length, shots: shots.length, withShots: new Set(shots.map(s => s.game)).size });

  // Screenshot_20240305-123456.jpg, 2024-03-05 12.34.56.png, IMG_20240305_...  -> milliseconds, or 0
  const parseNameDate = name => {
    const m = /(?:^|[^0-9])((?:19|20)\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?:[-_. T]?([01]\d|2[0-3])[-_.:]?([0-5]\d)(?:[-_.:]?([0-5]\d))?)?(?!\d)/.exec(String(name || ''));
    if (!m) return 0;
    const t = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
    return t > Date.now() + 864e5 ? 0 : t;
  };
  // when a screenshot was taken: from its name if it says, else when the file was last changed, else now
  const takenAt = (name, lastModified, now = Date.now()) => parseNameDate(name) || (lastModified > 0 && lastModified <= now + 864e5 ? lastModified : now);
  const dayLabel = t => t ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  // a gentle default name for downloads
  const fileName = (game, shot, i = 1) => `${cleanTitle(game).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-') || 'screenshot'}-${i}.jpg`;
  // data: URL -> bytes
  const dataBytes = url => { const m = /^data:[^;,]*;base64,(.*)$/.exec(url || ''); if (!m) return null; const bin = typeof atob === 'function' ? atob(m[1]) : Buffer.from(m[1], 'base64').toString('binary'); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
  const normGame = r => ({ name: cleanTitle(r && r.name) || 'Untitled game' });
  const normShot = r => ({ game: String((r && r.game) || ''), caption: String((r && r.caption) || '').slice(0, 500), at: Number(r && r.at) > 0 ? Number(r.at) : 0, w: Math.max(0, Math.round(Number(r && r.w) || 0)), h: Math.max(0, Math.round(Number(r && r.h) || 0)) });
  const groupByDay = shots => { const out = []; for (const s of shots) { const k = dayLabel(s.at); const last = out[out.length - 1]; if (last && last.day === k) last.shots.push(s); else out.push({ day: k, shots: [s] }); } return out; };

  return { fold, cleanTitle, findGame, byTitle, shotsOf, sortShots, folders, filterShots, stats, parseNameDate, takenAt, dayLabel, fileName, dataBytes, normGame, normShot, groupByDay };
})();
if (typeof module !== 'undefined') module.exports = ShotCore;

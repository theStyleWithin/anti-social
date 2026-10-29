'use strict';
/* Digital Clock: the pure logic. Times in any time zone (from the device's own time zone data, no network),
   world clock labels, the stopwatch and the timer. No page. */
const ClockCore = (() => {
  const FALLBACK_ZONES = ['UTC', 'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'America/Halifax', 'America/Sao_Paulo', 'Atlantic/Azores', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Athens', 'Europe/Moscow', 'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'];
  // some engines still list only the old names (Asia/Calcutta), so offer the current ones too when they work
  const MODERN = ['Asia/Kolkata', 'Europe/Kyiv', 'Asia/Ho_Chi_Minh', 'Asia/Kathmandu', 'America/Nuuk'];
  const zones = () => { try { let z = Intl.supportedValuesOf('timeZone'); z = [...MODERN.filter(m => !z.includes(m) && validZone(m)), ...z]; return z.includes('UTC') ? z : ['UTC', ...z]; } catch { return FALLBACK_ZONES; } };
  const validZone = tz => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return typeof tz === 'string' && tz.length < 60; } catch { return false; } };
  const localZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_/]+/g, ' ').trim();
  // "America/New_York" -> "New York"
  const city = tz => String(tz).split('/').pop().replace(/_/g, ' ');
  const region = tz => tz.includes('/') ? tz.split('/')[0].replace(/_/g, ' ') : '';
  const searchZones = (q, list = zones(), limit = 8) => {
    q = fold(q); if (!q) return [];
    const hit = list.filter(z => fold(z).includes(q));
    return hit.sort((a, b) => (fold(city(a)).startsWith(q) ? 0 : 1) - (fold(city(b)).startsWith(q) ? 0 : 1) || city(a).localeCompare(city(b))).slice(0, limit);
  };

  const parts = (date, tz) => {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    const o = {}; for (const p of f.formatToParts(date)) o[p.type] = p.value;
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  };
  const pad = n => String(n).padStart(2, '0');
  // { text: '3:07', sec: '09', ampm: 'PM' } for the zone; h24 true gives '15:07' and no ampm
  const clock = (date, tz, h24 = false) => {
    const p = parts(date, tz), h = h24 ? pad(p.h) : String(p.h % 12 || 12);
    return { text: `${h}:${pad(p.mi)}`, sec: pad(p.s), ampm: h24 ? '' : (p.h < 12 ? 'AM' : 'PM'), hour: p.h };
  };
  const dateText = (date, tz, opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) => new Intl.DateTimeFormat(undefined, { timeZone: tz, ...opts }).format(date);
  // minutes east of UTC for the zone at that moment
  const offsetMin = (date, tz) => { const p = parts(date, tz); return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000); };
  const offsetText = min => { const s = min < 0 ? '-' : '+', a = Math.abs(min); return 'UTC' + s + Math.floor(a / 60) + (a % 60 ? ':' + pad(a % 60) : ''); };
  // -1 yesterday, 0 today, 1 tomorrow, compared with `home` zone's calendar day
  const dayDiff = (date, tz, home) => { const a = parts(date, tz), b = parts(date, home); return Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(b.y, b.mo - 1, b.d)) / 864e5); };
  const dayWord = d => d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === -1 ? 'Yesterday' : (d > 0 ? '+' : '') + d + ' days';
  const hoursAhead = (date, tz, home) => { const m = offsetMin(date, tz) - offsetMin(date, home); const a = Math.abs(m); return m === 0 ? 'Same time' : `${Math.floor(a / 60)}${a % 60 ? ':' + pad(a % 60) : ''} h ${m > 0 ? 'ahead' : 'behind'}`; };
  const isDay = hour => hour >= 6 && hour < 18;

  /* ---------- prefs ---------- */
  const THEMES = [['green', 'Green', '#39ff7a'], ['amber', 'Amber', '#ffb000'], ['red', 'Red', '#ff4136'], ['cyan', 'Cyan', '#35e0ff'], ['white', 'White', '#f2f2f2'], ['pink', 'Pink', '#ff5fb2']];
  const MAX_ZONES = 24;
  const normCfg = raw => {
    const c = raw && typeof raw === 'object' ? raw : {};
    return { h24: !!c.h24, seconds: c.seconds !== false, date: c.date !== false, theme: THEMES.some(t => t[0] === c.theme) ? c.theme : 'green', zones: [...new Set((Array.isArray(c.zones) ? c.zones : []).filter(z => typeof z === 'string' && validZone(z)))].slice(0, MAX_ZONES) };
  };

  /* ---------- stopwatch and timer ---------- */
  // 1:02:03.45 (or 02:03.45 under an hour)
  const fmtWatch = ms => { ms = Math.max(0, Math.floor(ms)); const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s) + '.' + pad(cs); };
  const fmtTimer = ms => { ms = Math.max(0, Math.ceil(ms / 1000) * 1000); const s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000); return (h ? h + ':' : '') + pad(h ? m : m) + ':' + pad(s); };
  const watch = (st, now) => (st.running ? now - st.startAt : 0) + (st.base || 0);
  const normWatch = raw => ({ running: !!(raw && raw.running), startAt: Number(raw && raw.startAt) || 0, base: Math.max(0, Number(raw && raw.base) || 0), laps: (Array.isArray(raw && raw.laps) ? raw.laps : []).map(Number).filter(n => Number.isFinite(n) && n >= 0).slice(-200) });
  // laps are stored as running totals; split = difference to the one before
  const lapRows = laps => { const splits = laps.map((t, i) => t - (i ? laps[i - 1] : 0)); const best = splits.length > 1 ? Math.min(...splits) : null, worst = splits.length > 1 ? Math.max(...splits) : null; return laps.map((t, i) => ({ n: i + 1, total: t, split: splits[i], best: splits[i] === best, worst: splits[i] === worst && best !== worst })).reverse(); };
  const timerMs = (h, m, s) => Math.max(0, Math.min(99 * 3600000 + 59 * 60000 + 59000, ((+h || 0) * 3600 + (+m || 0) * 60 + (+s || 0)) * 1000));
  const normTimer = raw => ({ endAt: Number(raw && raw.endAt) || 0, left: Math.max(0, Number(raw && raw.left) || 0), total: Math.max(0, Number(raw && raw.total) || 0), running: !!(raw && raw.running) });
  const timerLeft = (t, now) => t.running ? Math.max(0, t.endAt - now) : t.left;

  return { zones, validZone, localZone, city, region, searchZones, parts, clock, dateText, offsetMin, offsetText, dayDiff, dayWord, hoursAhead, isDay, THEMES, MAX_ZONES, normCfg, fmtWatch, fmtTimer, watch, normWatch, lapRows, timerMs, normTimer, timerLeft };
})();
if (typeof module !== 'undefined') module.exports = ClockCore;

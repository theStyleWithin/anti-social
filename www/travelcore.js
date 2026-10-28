'use strict';
/* Travel Log: pure logic for the map and the places. No page, no network.
   Map math uses the usual web map projection (Mercator); positions are kept as plain latitude and longitude. */
const TravelCore = (() => {
  const MAX_LAT = 85.0511;
  const clampLat = v => Math.max(-MAX_LAT, Math.min(MAX_LAT, v));
  // world position 0..1 (x east, y south) <-> degrees
  const project = (lat, lng) => ({ x: (lng + 180) / 360, y: 0.5 - Math.log(Math.tan(Math.PI / 4 + clampLat(lat) * Math.PI / 360)) / (2 * Math.PI) });
  const unproject = (x, y) => ({ lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI, lng: x * 360 - 180 });

  // ---- the view: z is the zoom, cx and cy the world position at the centre of the screen
  const worldPx = z => 256 * Math.pow(2, z);
  const minZoom = (w, h) => Math.max(0, Math.log2(Math.max(w, h, 256) / 256));
  const MAX_ZOOM = 9;
  const clampView = (v, w, h) => {
    const z = Math.max(minZoom(w, h), Math.min(MAX_ZOOM, v.z)), W = worldPx(z);
    const clampAxis = (c, size) => size >= W ? 0.5 : Math.max(size / 2 / W, Math.min(1 - size / 2 / W, c));
    return { z, cx: clampAxis(v.cx, w), cy: clampAxis(v.cy, h) };
  };
  const toScreen = (v, w, h, x, y) => { const W = worldPx(v.z); return { x: (x - v.cx) * W + w / 2, y: (y - v.cy) * W + h / 2 }; };
  const fromScreen = (v, w, h, sx, sy) => { const W = worldPx(v.z); return { x: (sx - w / 2) / W + v.cx, y: (sy - h / 2) / W + v.cy }; };
  // Zoom so the point under (sx, sy) stays put.
  const zoomAt = (v, w, h, sx, sy, dz) => {
    const before = fromScreen(v, w, h, sx, sy), z = Math.max(minZoom(w, h), Math.min(MAX_ZOOM, v.z + dz)), W = worldPx(z);
    return clampView({ z, cx: before.x - (sx - w / 2) / W, cy: before.y - (sy - h / 2) / W }, w, h);
  };
  const panBy = (v, w, h, dx, dy) => { const W = worldPx(v.z); return clampView({ z: v.z, cx: v.cx - dx / W, cy: v.cy - dy / W }, w, h); };
  // A view that shows these places (or the whole world when there are none).
  const fitView = (pts, w, h) => {
    if (!pts.length) return clampView({ z: 0, cx: 0.5, cy: 0.5 }, w, h);
    const ps = pts.map(p => project(p.lat, p.lng));
    const x0 = Math.min(...ps.map(p => p.x)), x1 = Math.max(...ps.map(p => p.x)), y0 = Math.min(...ps.map(p => p.y)), y1 = Math.max(...ps.map(p => p.y));
    const span = Math.max((x1 - x0) * 1.5, (y1 - y0) * 1.5, 0.02) ;
    const z = Math.log2(Math.min(w, h) / (256 * span));
    return clampView({ z: Math.min(z, 5), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }, w, h);
  };

  // ---- geography
  const rad = d => d * Math.PI / 180;
  const km = (a, b) => {
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(s)));
  };
  // Ray casting on a flat [lng*100, lat*100, ...] ring.
  const inRing = (ring, lng, lat) => {
    let inside = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i] / 100, yi = ring[i + 1] / 100, xj = ring[j] / 100, yj = ring[j + 1] / 100;
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const bbox = ring => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let i = 0; i < ring.length; i += 2) { const x = ring[i] / 100, y = ring[i + 1] / 100; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } return [a, b, c, d]; };
  const boxes = new WeakMap();
  // Index of the country containing this point, or -1 (open sea, or a place too small for the outline).
  const countryAt = (map, lat, lng) => {
    for (let i = 0; i < map.countries.length; i++) {
      for (const ring of map.countries[i][2]) {
        let bb = boxes.get(ring); if (!bb) boxes.set(ring, bb = bbox(ring));
        if (lng < bb[0] || lng > bb[2] || lat < bb[1] || lat > bb[3]) continue;
        if (inRing(ring, lng, lat)) return i;
      }
    }
    return -1;
  };
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  // Cities are [name, countryIndex, lat*100, lng*100, population], biggest first.
  const searchCities = (map, query, limit = 8) => {
    const q = fold(query);
    if (q.length < 2) return [];
    const out = [];
    for (const c of map.cities) {
      const n = fold(c[0]);
      const rank = n === q ? 0 : n.startsWith(q) ? 1 : n.split(' ').some(w => w.startsWith(q)) ? 2 : n.includes(q) ? 3 : -1;
      if (rank >= 0) out.push({ rank, c });
    }
    out.sort((a, b) => a.rank - b.rank || b.c[4] - a.c[4]);
    return out.slice(0, limit).map(({ c }) => ({ name: c[0], country: c[1] >= 0 ? map.countries[c[1]][0] : '', lat: c[2] / 100, lng: c[3] / 100 }));
  };
  const nearestCity = (map, lat, lng, maxKm = 50) => {
    let best = null, bd = maxKm;
    for (const c of map.cities) { const d = km({ lat, lng }, { lat: c[2] / 100, lng: c[3] / 100 }); if (d < bd) { bd = d; best = c; } }
    return best ? { name: best[0], country: best[1] >= 0 ? map.countries[best[1]][0] : '', lat: best[2] / 100, lng: best[3] / 100, km: Math.round(bd) } : null;
  };

  // ---- text in, text out
  const num = '[-+]?\\d+(?:\\.\\d+)?';
  // "35.68, 139.69"  "35.68 N 139.69 E"  "35°40'48\"N 139°41'30\"E"
  const parseCoords = text => {
    const t = String(text || '').trim().replace(/[°º]/g, ' ').replace(/[′’']/g, ' ').replace(/[″"”]/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ');
    const m = new RegExp(`^(${num})(?: (\\d+(?:\\.\\d+)?))?(?: (\\d+(?:\\.\\d+)?))? ?([NSns])?[ ;/]+(${num})(?: (\\d+(?:\\.\\d+)?))?(?: (\\d+(?:\\.\\d+)?))? ?([EWew])?$`).exec(t);
    if (!m) return null;
    const part = (d, mi, s, hemi, neg) => { let v = Math.abs(parseFloat(d)) + (mi ? parseFloat(mi) / 60 : 0) + (s ? parseFloat(s) / 3600 : 0); if (parseFloat(d) < 0 || (hemi && hemi.toUpperCase() === neg)) v = -v; return v; };
    const lat = part(m[1], m[2], m[3], m[4], 'S'), lng = part(m[5], m[6], m[7], m[8], 'W');
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 } : null;
  };
  const fmtCoords = (lat, lng) => `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(2)}° ${lng < 0 ? 'W' : 'E'}`;
  const validPlace = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;

  // ---- dates ("YYYY-MM-DD" strings, either may be blank)
  const rangeLabel = (a, b, fmt) => !a && !b ? '' : a && b && a !== b ? `${fmt(a)} to ${fmt(b)}` : fmt(a || b);
  const sortPlaces = ps => [...ps].sort((a, b) => (b.from || b.to || '').localeCompare(a.from || a.to || '') || (b.createdAt || 0) - (a.createdAt || 0));
  // Whole days from the first to the last day, counting both ends.
  const daysIn = (a, b) => { if (!a) return 0; const d = (new Date((b || a) + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5; return Number.isFinite(d) && d >= 0 ? Math.round(d) + 1 : 0; };
  const stats = places => {
    const countries = new Map();
    let photos = 0, days = 0;
    for (const p of places) {
      if (p.country) countries.set(p.country, (countries.get(p.country) || 0) + 1);
      photos += (p.photoIds || []).length; days += daysIn(p.from, p.to);
    }
    return { places: places.length, countries: countries.size, byCountry: [...countries].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), photos, days };
  };

  return { MAX_LAT, MAX_ZOOM, project, unproject, worldPx, minZoom, clampView, toScreen, fromScreen, zoomAt, panBy, fitView, km, inRing, countryAt, searchCities, nearestCity, parseCoords, fmtCoords, validPlace, rangeLabel, sortPlaces, daysIn, stats, fold };
})();
if (typeof module !== 'undefined') module.exports = TravelCore;

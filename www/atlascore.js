'use strict';
/* World Map: the pure logic for the atlas. Country facts, search, distances and drawing helpers. No page, no network.
   Uses the same bundled outlines as the Travel Log (map/world.js) and TravelCore for the map maths. */
const AtlasCore = (() => {
  const TC = typeof TravelCore !== 'undefined' ? TravelCore : require('./travelcore.js');
  const fold = TC.fold;
  const flag = iso => /^[A-Za-z]{2}$/.test(iso || '') ? String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';
  const rad = d => d * Math.PI / 180;
  // area of a ring ([lng*100, lat*100, ...]) in square km, by the spherical polygon formula
  const ringArea = ring => {
    let s = 0; const n = ring.length / 2;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, l1 = rad(ring[2 * i] / 100), l2 = rad(ring[2 * j] / 100), p1 = rad(ring[2 * i + 1] / 100), p2 = rad(ring[2 * j + 1] / 100); s += (l2 - l1) * (2 + Math.sin(p1) + Math.sin(p2)); }
    return Math.abs(s) * 6371.0088 ** 2 / 2;
  };
  const ringBox = ring => { let w = 1e9, s = 1e9, e = -1e9, n = -1e9; for (let i = 0; i < ring.length; i += 2) { const x = ring[i] / 100, y = ring[i + 1] / 100; if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; } return [w, s, e, n]; };
  const areaKm2 = rings => rings.reduce((a, r) => a + ringArea(r), 0);
  const biggest = rings => rings.reduce((b, r) => !b || r.length > b.length ? r : b, null);
  // [west, south, east, north] of the main body of the country (far islands are ignored so the view stays useful)
  const mainBox = rings => { const r = biggest(rings); return r ? ringBox(r) : [-180, -85, 180, 85]; };
  const center = rings => { const b = mainBox(rings); return { lat: (b[1] + b[3]) / 2, lng: (b[0] + b[2]) / 2 }; };
  const boxSpanWorld = rings => { const b = mainBox(rings); return (b[2] - b[0]) / 360; };

  // a view that shows a lat/lng box with some room round it
  const fitBox = (b, w, h, pad = 1.25) => {
    const a = TC.project(b[3], b[0]), c = TC.project(b[1], b[2]);
    const dx = Math.max(c.x - a.x, 0.002) * pad, dy = Math.max(c.y - a.y, 0.002) * pad;
    return TC.clampView({ z: Math.log2(Math.min(w / (256 * dx), h / (256 * dy))), cx: (a.x + c.x) / 2, cy: (a.y + c.y) / 2 }, w, h);
  };
  const viewAt = (lat, lng, z, w, h) => { const p = TC.project(lat, lng); return TC.clampView({ z, cx: p.x, cy: p.y }, w, h); };

  // the outline data has no code for a few countries (France, Norway...) and no country for some of their cities
  const ISO_FIX = { France: 'FR', Norway: 'NO', Kosovo: 'XK', Taiwan: 'TW' };
  const isoOf = c => /^[A-Za-z]{2}$/.test(c[1] || '') ? c[1] : ISO_FIX[c[0]] || '';
  const owners = new WeakMap();
  const cityOwners = map => {
    let o = owners.get(map);
    if (!o) { o = map.cities.map(c => c[1] >= 0 ? c[1] : TC.countryAt(map, c[2] / 100, c[3] / 100)); owners.set(map, o); }
    return o;
  };
  const countryFacts = (map, i) => {
    const c = map.countries[i], own = cityOwners(map), cities = map.cities.filter((x, k) => own[k] === i);
    return { index: i, name: c[0], iso: isoOf(c), flag: flag(isoOf(c)), area: areaKm2(c[2]), cities: cities.length, top: cities.slice(0, 40).map(x => ({ name: x[0], lat: x[2] / 100, lng: x[3] / 100, pop: x[4] })) };
  };
  const alphabetical = map => map.countries.map((c, i) => ({ i, name: c[0], iso: isoOf(c) })).sort((a, b) => a.name.localeCompare(b.name));

  // countries by name or two-letter code, then cities, as one list
  const searchAll = (map, query, limit = 8) => {
    const q = fold(query); if (!q) return [];
    const cs = [];
    map.countries.forEach((c, i) => { const n = fold(c[0]), rank = n === q || fold(isoOf(c)) === q ? 0 : n.startsWith(q) ? 1 : n.split(' ').some(w => w.startsWith(q)) ? 2 : n.includes(q) ? 3 : -1; if (rank >= 0) cs.push({ rank, i }); });
    cs.sort((a, b) => a.rank - b.rank || map.countries[a.i][0].localeCompare(map.countries[b.i][0]));
    const out = cs.slice(0, limit).map(({ i }) => ({ type: 'country', i, name: map.countries[i][0], sub: 'Country', flag: flag(isoOf(map.countries[i])) }));
    for (const c of TC.searchCities(map, query, limit)) if (out.length < limit) out.push({ type: 'city', name: c.name, sub: c.country || 'City', lat: c.lat, lng: c.lng });
    return out;
  };

  /* ---------- distance ---------- */
  const KM_PER_MI = 1.609344;
  const fmtDist = (km, unit = 'km') => { const v = unit === 'mi' ? km / KM_PER_MI : km; return (v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' ' + unit; };
  const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const bearing = (a, b) => { const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lng - a.lng); const t = Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)); return (t * 180 / Math.PI + 360) % 360; };
  const compass = deg => COMPASS[Math.round(deg / 45) % 8];
  // n+1 points along the great circle
  const greatCircle = (a, b, n = 64) => {
    const p1 = rad(a.lat), l1 = rad(a.lng), p2 = rad(b.lat), l2 = rad(b.lng);
    const d = 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2)));
    if (d < 1e-9) return [{ lat: a.lat, lng: a.lng }];
    const out = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2), y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2), z = A * Math.sin(p1) + B * Math.sin(p2);
      out.push({ lat: Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI, lng: Math.atan2(y, x) * 180 / Math.PI });
    }
    return out;
  };

  /* ---------- drawing helpers ---------- */
  const graticuleStep = z => z < 1.5 ? 30 : z < 3 ? 15 : z < 4.5 ? 5 : z < 6 ? 2 : 1;
  // a scale bar: nice length in km that fits in maxPx
  const scaleBar = (lat, z, maxPx = 110, unit = 'km') => {
    const perPx = 40075.017 * Math.cos(rad(Math.max(-85, Math.min(85, lat)))) / TC.worldPx(z) / (unit === 'mi' ? KM_PER_MI : 1);
    const raw = perPx * maxPx, pow = 10 ** Math.floor(Math.log10(raw)), f = raw / pow, nice = (f >= 5 ? 5 : f >= 2 ? 2 : 1) * pow;
    return { value: nice, px: nice / perPx, unit };
  };
  const HUES = [205, 38, 110, 330, 18, 165, 275, 58];
  const hue = i => HUES[i % HUES.length];
  // how many cities to name at a zoom: the smallest population worth showing, or Infinity for none
  const cityMinPop = z => z < 2.4 ? Infinity : z < 3.2 ? 8e6 : z < 4 ? 3e6 : z < 4.8 ? 1e6 : z < 5.8 ? 3e5 : 0;
  const fmtPop = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' million' : n >= 1e3 ? Math.round(n / 1e3).toLocaleString('en-US') + ',000' : String(n);
  const fmtArea = (km2, unit = 'km') => { const v = unit === 'mi' ? km2 / (KM_PER_MI ** 2) : km2; return (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)) + (unit === 'mi' ? ' sq mi' : ' km²'); };

  return { isoOf, cityOwners, flag, ringArea, areaKm2, mainBox, center, boxSpanWorld, fitBox, viewAt, countryFacts, alphabetical, searchAll, KM_PER_MI, fmtDist, bearing, compass, greatCircle, graticuleStep, scaleBar, hue, cityMinPop, fmtPop, fmtArea };
})();
if (typeof module !== 'undefined') module.exports = AtlasCore;

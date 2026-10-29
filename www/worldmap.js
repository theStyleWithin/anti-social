'use strict';
/* World Map: a plain offline atlas. Countries, borders, names, cities, search and a distance ruler.
   Drawn on your device from the outlines bundled with the app (Natural Earth, public domain). Nothing is downloaded. */
const AT = AtlasCore;
let wmTab = 'map', wmView = null, wmFocus = null, wmListQuery = '', wmSel = null, wmPts = [], wmMeasure = false;
const wmDefaults = { colour: true, labels: true, grid: false, unit: 'km' };
const wmOpts = () => { try { const o = JSON.parse(localStorage.getItem('as.worldmap') || 'null') || {}; return { colour: o.colour !== false, labels: o.labels !== false, grid: !!o.grid, unit: o.unit === 'mi' ? 'mi' : 'km' }; } catch { return { ...wmDefaults }; } };
const wmSetOpt = (k, v) => { try { localStorage.setItem('as.worldmap', JSON.stringify({ ...wmOpts(), [k]: v })); } catch { /* not remembered */ } };

function worldMapView(acct, ctx, back) {
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(wmTab === k), class: wmTab === k ? 'active' : '', onclick: () => { wmTab = k; render(true); } }, label);
  return [back(appName(acct, 'worldmap')), h('div', { class: 'tabs', role: 'tablist' }, tab('map', 'Map'), tab('countries', 'Countries')), h('div', { class: 'app-pad' }, wmTab === 'map' ? wmMap() : wmCountries())];
}

function wmCountries() {
  const box = h('div', { class: 'wm-list' }), q = h('input', { type: 'search', placeholder: 'Search countries', value: wmListQuery, 'aria-label': 'Search countries' });
  const fill = map => {
    const f = wmListQuery.trim() ? AtlasCore.searchAll(map, wmListQuery, 300).filter(x => x.type === 'country').map(x => ({ i: x.i, name: x.name, iso: AT.isoOf(map.countries[x.i]) })) : AT.alphabetical(map);
    box.replaceChildren(...(f.length ? f.map(c => h('button', { class: 'wm-crow', onclick: () => { wmFocus = { country: c.i }; wmTab = 'map'; render(true); } }, h('span', { class: 'wm-flag', 'aria-hidden': 'true' }, AT.flag(c.iso) || '🏳'), h('b', {}, c.name), h('span', { class: 'muted' }, c.iso))) : [emptyState('No matches', 'No country has that name.')]));
  };
  let map = null;
  q.addEventListener('input', () => { wmListQuery = q.value; if (map) fill(map); });
  loadWorld().then(m => { map = m; fill(m); }).catch(() => box.replaceChildren(h('p', { class: 'err' }, 'The map data could not be loaded.')));
  return [q, h('p', { class: 'fine', style: 'padding:8px 0' }, 'Tap a country to see it on the map.'), box];
}

function wmMap() {
  let map = null, v = wmView, raf = 0, hits = [], opts = wmOpts(), meta = null, facts = null;
  const wrap = h('div', { class: 'travel-map wm-map', tabindex: '0', role: 'application', 'aria-label': 'World map. Arrow keys move, plus and minus zoom. Use the search box to find a country or city.' });
  const cv = h('canvas', { 'aria-hidden': 'true' });
  const sheet = h('div', { class: 'travel-sheet wm-sheet', 'aria-live': 'polite' });
  const size = () => ({ w: Math.max(1, cv.clientWidth), h: Math.max(1, cv.clientHeight) });
  const btn = (label, text, fn, pressed) => h('button', { class: 'btn map-btn' + (pressed ? ' on' : ''), type: 'button', 'aria-label': label, 'aria-pressed': pressed === undefined ? null : String(pressed), onclick: fn }, text);
  const cache = new WeakMap();
  const proj = ring => {
    let c = cache.get(ring);
    if (!c) { const xy = new Float32Array(ring.length); let x0 = 9, y0 = 9, x1 = -9, y1 = -9; for (let i = 0; i < ring.length; i += 2) { const q = TC.project(ring[i + 1] / 100, ring[i] / 100); xy[i] = q.x; xy[i + 1] = q.y; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); } cache.set(ring, c = { xy, box: [x0, y0, x1, y1] }); }
    return c;
  };
  const draw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
  const dark = bg => { const n = parseInt(bg.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 128; };

  function paint() {
    if (!map || !v) return;
    const { w, h: hh } = size(), dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); v = TC.clampView(v, w, hh); }
    wmView = v;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = themeColor('--bg', '#ffffff'), fg = themeColor('--fg', '#0f1419'), accent = themeColor('--accent', '#8b5cf6'), night = dark(bg);
    g.fillStyle = night ? 'hsl(212,38%,15%)' : 'hsl(205,55%,90%)'; g.fillRect(0, 0, w, hh);
    const W = TC.worldPx(v.z), ox = w / 2 - v.cx * W, oy = hh / 2 - v.cy * W;
    const vis = [v.cx - w / 2 / W, v.cy - hh / 2 / W, v.cx + w / 2 / W, v.cy + hh / 2 / W];
    const trace = ring => {
      const c = proj(ring), b = c.box;
      if (b[2] < vis[0] || b[0] > vis[2] || b[3] < vis[1] || b[1] > vis[3]) return false;
      for (let i = 0; i < c.xy.length; i += 2) { const x = c.xy[i] * W + ox, y = c.xy[i + 1] * W + oy; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); return true;
    };
    g.lineJoin = 'round';
    map.countries.forEach((c, i) => {
      g.fillStyle = opts.colour ? `hsl(${AT.hue(i)},${night ? 28 : 42}%,${night ? 30 : 78}%)` : (night ? '#3a3f46' : '#e9e6df');
      g.beginPath(); let any = false; for (const r of c[2]) any = trace(r) || any; if (any) g.fill();
    });
    if (wmSel && wmSel.t === 'country') { g.fillStyle = accent; g.globalAlpha = 0.45; g.beginPath(); for (const r of map.countries[wmSel.i][2]) trace(r); g.fill(); g.globalAlpha = 1; }
    g.strokeStyle = night ? 'rgba(255,255,255,.4)' : 'rgba(40,40,40,.55)'; g.lineWidth = 0.7; g.beginPath();
    for (const c of map.countries) for (const r of c[2]) trace(r);
    g.stroke();
    if (wmSel && wmSel.t === 'country') { g.strokeStyle = accent; g.lineWidth = 2.2; g.beginPath(); for (const r of map.countries[wmSel.i][2]) trace(r); g.stroke(); }
    // graticule
    if (opts.grid) {
      const step = AT.graticuleStep(v.z); g.strokeStyle = night ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.fillStyle = night ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.55)'; g.font = '10px system-ui, sans-serif'; g.textBaseline = 'top';
      for (let lat = -80; lat <= 80; lat += step) { const y = TC.project(lat, 0).y * W + oy; if (y < 0 || y > hh) continue; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); g.fillText(lat + '°', 3, y + 2); }
      for (let lng = -180; lng <= 180; lng += step) { const x = (lng + 180) / 360 * W + ox; if (x < 0 || x > w) continue; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); g.fillText(lng + '°', x + 3, hh - 14); }
    }
    const placed = [];
    const free = (x, y, tw) => { const r = [x - 2, y - 8, x + tw + 2, y + 8]; if (placed.some(p => !(r[2] < p[0] || r[0] > p[2] || r[3] < p[1] || r[1] > p[3]))) return false; placed.push(r); return true; };
    const label = (text, x, y, size2, weight, color, halo) => { g.font = `${weight} ${size2}px system-ui, sans-serif`; g.lineWidth = 3; g.strokeStyle = halo; g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y); };
    // country names
    if (opts.labels) {
      g.textBaseline = 'middle'; g.textAlign = 'center';
      const halo = night ? 'rgba(10,15,25,.75)' : 'rgba(255,255,255,.8)';
      if (!meta) meta = map.countries.map(c => { const ce = AT.center(c[2]), p = TC.project(ce.lat, ce.lng); return { x: p.x, y: p.y, span: AT.boxSpanWorld(c[2]) }; });
      const order = map.countries.map((c, i) => i).sort((a, b) => meta[b].span - meta[a].span);
      for (const i of order) {
        const m = meta[i], name = map.countries[i][0], tw = name.length * 6.2, sel = wmSel && wmSel.t === 'country' && wmSel.i === i;
        if (!sel && m.span * W < tw + 10) continue;
        const x = m.x * W + ox, y = m.y * W + oy; if (x < -40 || y < -10 || x > w + 40 || y > hh + 10) continue;
        if (!sel && !free(x - tw / 2, y, tw)) continue;
        label(name, x, y, 11, 600, night ? '#f1f1f1' : '#222', halo);
      }
      g.textAlign = 'left';
    }
    // cities
    hits = [];
    const minPop = AT.cityMinPop(v.z);
    if (minPop !== Infinity) {
      g.textBaseline = 'middle'; g.textAlign = 'left'; let n = 0; const halo = night ? 'rgba(10,15,25,.75)' : 'rgba(255,255,255,.85)';
      for (let k = 0; k < map.cities.length; k++) {
        const c = map.cities[k]; if (c[4] < minPop) break;
        const q = TC.project(c[2] / 100, c[3] / 100), x = q.x * W + ox, y = q.y * W + oy; if (x < 0 || y < 0 || x > w || y > hh) continue;
        g.beginPath(); g.arc(x, y, c[4] > 5e6 ? 3.4 : 2.6, 0, 6.3); g.fillStyle = night ? '#fff' : '#111'; g.fill(); g.lineWidth = 1; g.strokeStyle = night ? '#000' : '#fff'; g.stroke();
        hits.push({ k, x, y });
        if (v.z >= 3.2 && free(x + 5, y, c[0].length * 5.8)) label(c[0], x + 6, y, 10.5, 500, night ? '#ddd' : '#333', halo);
        if (++n > 120) break;
      }
    }
    // selected city
    if (wmSel && wmSel.t === 'city') { const q = TC.project(wmSel.lat, wmSel.lng), x = q.x * W + ox, y = q.y * W + oy; g.beginPath(); g.arc(x, y, 8, 0, 6.3); g.lineWidth = 3; g.strokeStyle = accent; g.stroke(); }
    // ruler
    if (wmPts.length) {
      const sp = p => { const q = TC.project(p.lat, p.lng); return { x: q.x * W + ox, y: q.y * W + oy, wx: q.x }; };
      if (wmPts.length === 2) {
        g.beginPath(); g.setLineDash([7, 5]); g.strokeStyle = accent; g.lineWidth = 3; let prev = null;
        for (const p of AT.greatCircle(wmPts[0], wmPts[1], 96)) { const s = sp(p); if (prev === null || Math.abs(s.wx - prev) > 0.5) g.moveTo(s.x, s.y); else g.lineTo(s.x, s.y); prev = s.wx; }
        g.stroke(); g.setLineDash([]);
      }
      wmPts.forEach((p, i) => { const s = sp(p); g.beginPath(); g.arc(s.x, s.y, 7, 0, 6.3); g.fillStyle = accent; g.fill(); g.lineWidth = 2.5; g.strokeStyle = bg; g.stroke(); g.fillStyle = bg; g.font = '700 9px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AB'[i], s.x, s.y + 0.5); g.textAlign = 'left'; });
    }
    // scale bar
    const sb = AT.scaleBar(TC.unproject(v.cx, v.cy).lat, v.z, 110, opts.unit), txt = sb.value.toLocaleString('en-US') + ' ' + sb.unit;
    g.font = '11px system-ui, sans-serif'; const tw = g.measureText(txt).width;
    g.fillStyle = night ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.75)'; g.fillRect(8, hh - 28, sb.px + tw + 22, 22);
    g.strokeStyle = night ? '#fff' : '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, hh - 14); g.lineTo(14, hh - 10); g.lineTo(14 + sb.px, hh - 10); g.lineTo(14 + sb.px, hh - 14); g.stroke();
    g.fillStyle = night ? '#fff' : '#111'; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillText(txt, 20 + sb.px, hh - 12);
  }

  function showSheet() {
    sheet.classList.toggle('wm-measure', wmMeasure);
    if (wmMeasure || wmPts.length) {
      const [a, b] = wmPts;
      if (!a) return sheet.replaceChildren(h('b', {}, 'Ruler'), h('span', { class: 'muted' }, 'Tap the first point.'), h('button', { class: 'btn', onclick: stopMeasure }, 'Done'));
      if (!b) return sheet.replaceChildren(h('b', {}, 'Ruler'), h('span', { class: 'muted' }, `A is ${TC.fmtCoords(a.lat, a.lng)}. Tap the second point.`), h('button', { class: 'btn', onclick: stopMeasure }, 'Done'));
      const d = TC.km(a, b), br = AT.bearing(a, b);
      return sheet.replaceChildren(h('b', { class: 'wm-dist' }, AT.fmtDist(d, opts.unit)), h('span', { class: 'muted' }, `${AT.fmtDist(d, opts.unit === 'km' ? 'mi' : 'km')} · heading ${AT.compass(br)} (${Math.round(br)}°), straight over the globe`),
        h('button', { class: 'btn', onclick: () => { wmPts = []; showSheet(); draw(); } }, 'Clear'), h('button', { class: 'btn', onclick: stopMeasure }, 'Done'));
    }
    if (!wmSel) return sheet.replaceChildren(h('span', { class: 'muted' }, 'Tap a country or a city for details. Search for any place above.'));
    if (wmSel.t === 'country') {
      const f = AT.countryFacts(map, wmSel.i);
      return sheet.replaceChildren(h('span', { class: 'wm-flag big', 'aria-hidden': 'true' }, f.flag || '🏳'), h('div', { class: 'wm-info' }, h('b', {}, f.name), h('span', { class: 'muted' }, [f.iso, `About ${AT.fmtArea(f.area, opts.unit)}`, plural(f.cities, 'city').replace('citys', 'cities') + ' on the map'].filter(Boolean).join(' · '))),
        f.cities ? h('button', { class: 'btn', onclick: () => cityList(f) }, 'Cities') : null,
        h('button', { class: 'btn', onclick: () => { const { w, h: hh } = size(); v = AT.fitBox(AT.mainBox(map.countries[f.index][2]), w, hh); draw(); } }, 'Zoom to'));
    }
    const c = wmSel, own = AT.cityOwners(map)[c.k], country = own >= 0 ? map.countries[own][0] : '';
    sheet.replaceChildren(h('div', { class: 'wm-info' }, h('b', {}, c.name), h('span', { class: 'muted' }, [country, c.pop ? `${AT.fmtPop(c.pop)} people` : '', TC.fmtCoords(c.lat, c.lng)].filter(Boolean).join(' · '))),
      h('button', { class: 'btn', onclick: () => { wmMeasure = true; wmPts = [{ lat: c.lat, lng: c.lng }]; wmSel = null; syncCtl(); showSheet(); draw(); } }, 'Measure from here'));
  }
  function cityList(f) {
    const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, `${f.flag} ${f.name}`), h('p', { class: 'muted' }, `Largest of ${plural(f.cities, 'city').replace('citys', 'cities')} on the map`),
      h('div', { class: 'wm-clist' }, f.top.map(c => h('button', { class: 'wm-crow', onclick: () => { close(); flyCity(c); } }, h('b', {}, c.name), h('span', { class: 'muted' }, c.pop ? AT.fmtPop(c.pop) : '')))), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Close'))));
  }
  function flyCity(c) {
    const { w, h: hh } = size(); const k = map.cities.findIndex(x => x[0] === c.name && Math.abs(x[2] / 100 - c.lat) < 0.01 && Math.abs(x[3] / 100 - c.lng) < 0.01);
    wmSel = { t: 'city', k, name: c.name, lat: c.lat, lng: c.lng, pop: k >= 0 ? map.cities[k][4] : 0 };
    v = AT.viewAt(c.lat, c.lng, Math.max(5.2, Math.min(v ? v.z : 0, 7)) , w, hh); showSheet(); draw();
  }
  function flyCountry(i) { const { w, h: hh } = size(); wmSel = { t: 'country', i }; v = AT.fitBox(AT.mainBox(map.countries[i][2]), w, hh); showSheet(); draw(); }
  function stopMeasure() { wmMeasure = false; wmPts = []; syncCtl(); showSheet(); draw(); }

  const zoomBy = dz => { const { w, h: hh } = size(); v = TC.zoomAt(v, w, hh, w / 2, hh / 2, dz); draw(); };
  const ruler = btn('Measure a distance', '📏', () => { wmMeasure = !wmMeasure; if (!wmMeasure) wmPts = []; else wmSel = null; syncCtl(); showSheet(); draw(); }, wmMeasure);
  function syncCtl() { ruler.classList.toggle('on', wmMeasure); ruler.setAttribute('aria-pressed', String(wmMeasure)); }
  wrap.append(cv, h('div', { class: 'map-ctl' }, btn('Zoom in', '+', () => zoomBy(0.8)), btn('Zoom out', '−', () => zoomBy(-0.8)), btn('Show the whole world', '⌂', () => { const s = size(); v = TC.fitView([], s.w, s.h); wmSel = null; showSheet(); draw(); }), ruler));

  // search
  const q = h('input', { type: 'search', placeholder: 'Search a country or city', 'aria-label': 'Search the map', autocomplete: 'off' }), found = h('div', { class: 'wm-found', role: 'listbox' });
  q.addEventListener('input', () => {
    if (!map) return;
    found.replaceChildren(...AT.searchAll(map, q.value, 7).map(r => h('button', { class: 'wm-hit', role: 'option', type: 'button', onclick: () => { q.value = ''; found.replaceChildren(); if (r.type === 'country') flyCountry(r.i); else flyCity(r); } },
      h('span', { class: 'wm-flag', 'aria-hidden': 'true' }, r.type === 'country' ? r.flag || '🏳' : '📍'), h('b', {}, r.name), h('span', { class: 'muted' }, r.sub))));
  });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') found.querySelector('button')?.click(); });

  // pointers
  const ptrs = new Map(); let moved = 0, t0 = 0, pinch = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) { moved = 0; t0 = Date.now(); } pinch = 0; wrap.focus({ preventScroll: true }); });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p || !v) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    const { w, h: hh } = size(), r = cv.getBoundingClientRect();
    if (ptrs.size === 1) { moved += Math.abs(dx) + Math.abs(dy); v = TC.panBy(v, w, hh, dx, dy); }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); moved += 99; if (pinch) v = TC.zoomAt(v, w, hh, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, Math.log2(d / pinch)); pinch = d; }
    draw();
  });
  const lift = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); pinch = 0; if (e.type === 'pointerup' && !ptrs.size && moved < 8 && Date.now() - t0 < 700) tap(e); };
  cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
  function tap(e) {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, { w, h: hh } = size();
    const at = TC.unproject(...Object.values(TC.fromScreen(v, w, hh, sx, sy)));
    if (wmMeasure) { const pt = { lat: at.lat, lng: at.lng }, near = hits.filter(c => Math.hypot(c.x - sx, c.y - sy) < 14)[0]; if (near) { const c = map.cities[near.k]; pt.lat = c[2] / 100; pt.lng = c[3] / 100; } wmPts = wmPts.length >= 2 ? [pt] : [...wmPts, pt]; showSheet(); draw(); return; }
    const hit = hits.filter(c => Math.hypot(c.x - sx, c.y - sy) < 14).sort((a, b) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy))[0];
    if (hit) { const c = map.cities[hit.k]; wmSel = { t: 'city', k: hit.k, name: c[0], lat: c[2] / 100, lng: c[3] / 100, pop: c[4] }; }
    else { const i = TC.countryAt(map, at.lat, at.lng); wmSel = i >= 0 ? { t: 'country', i } : null; }
    showSheet(); draw();
  }
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), { w, h: hh } = size(); v = TC.zoomAt(v, w, hh, e.clientX - r.left, e.clientY - r.top, -e.deltaY * (e.ctrlKey ? 0.01 : 0.002)); draw(); }, { passive: false });
  cv.addEventListener('dblclick', e => { const r = cv.getBoundingClientRect(), { w, h: hh } = size(); v = TC.zoomAt(v, w, hh, e.clientX - r.left, e.clientY - r.top, 1); draw(); });
  wrap.addEventListener('keydown', e => {
    const { w, h: hh } = size(), step = 60, k = e.key;
    if (k === '+' || k === '=') zoomBy(0.6); else if (k === '-' || k === '_') zoomBy(-0.6);
    else if (k === 'ArrowLeft') v = TC.panBy(v, w, hh, step, 0); else if (k === 'ArrowRight') v = TC.panBy(v, w, hh, -step, 0);
    else if (k === 'ArrowUp') v = TC.panBy(v, w, hh, 0, step); else if (k === 'ArrowDown') v = TC.panBy(v, w, hh, 0, -step);
    else return;
    e.preventDefault(); draw();
  });
  if (window.ResizeObserver) new ResizeObserver(() => { if (map && v) { const { w, h: hh } = size(); v = TC.clampView(v, w, hh); draw(); } }).observe(wrap);

  const opt = (label, key) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!opts[key], onchange: e => { opts[key] = e.target.checked; wmSetOpt(key, opts[key]); draw(); } }), ' ' + label);
  const unit = h('select', { 'aria-label': 'Distance unit', onchange: e => { opts.unit = e.target.value; wmSetOpt('unit', opts.unit); showSheet(); draw(); } }, h('option', { value: 'km' }, 'Kilometres'), h('option', { value: 'mi' }, 'Miles'));
  unit.value = opts.unit;

  loadWorld().then(m => {
    map = m; const { w, h: hh } = size();
    v = v ? TC.clampView(v, w, hh) : TC.fitView([], w, hh);
    if (wmFocus) { const i = wmFocus.country; wmFocus = null; flyCountry(i); } else { showSheet(); paint(); }
    requestAnimationFrame(() => { const s = size(); if (s.w !== w || s.h !== hh) { v = v && TC.clampView(v, s.w, s.h); draw(); } });
  }).catch(() => sheet.replaceChildren(h('span', { class: 'err' }, 'The map could not be loaded.')));
  sheet.replaceChildren(h('span', { class: 'muted' }, 'Loading the map...'));
  return h('div', {}, h('div', { class: 'wm-search' }, q, found), wrap, sheet,
    h('div', { class: 'ck-opts' }, opt('Colour the countries', 'colour'), opt('Country names', 'labels'), opt('Grid lines', 'grid'), unit),
    h('p', { class: 'fine' }, 'Outlines are from Natural Earth (public domain). The map is drawn on your device; nothing is downloaded. Borders are shown as the data has them and are not an opinion on any dispute.'));
}

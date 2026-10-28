'use strict';
/* Travel Log: an offline world map, the places you have been, your photos and your notes. The map is drawn from
   public-domain outlines bundled with the app, so there is no network and no tiles. You can rename this app. */
const TC = TravelCore;
let travelTab = 'map';
let travelView_ = null;            // the map view survives re-renders while the app is open
let worldLoad = null;
const loadWorld = () => worldLoad || (worldLoad = new Promise((res, rej) => {
  if (window.WorldMap) return res(window.WorldMap);
  const s = document.createElement('script'); s.src = 'map/world.js';
  s.onload = () => res(window.WorldMap); s.onerror = () => { worldLoad = null; rej(new Error('map missing')); };
  document.head.append(s);
}));
const themeColor = (name, fallback) => ThemeCore.clean(getComputedStyle(document.documentElement).getPropertyValue(name), fallback);
const placeDates = p => TC.rangeLabel(p.from, p.to, shortDate);
const countryFor = (map, lat, lng) => { const i = TC.countryAt(map, lat, lng); if (i >= 0) return map.countries[i][0]; const c = TC.nearestCity(map, lat, lng, 120); return c ? c.country : ''; };

function travelView(acct, ctx, back, arg) {
  const places = ctx.apps.place;
  if (arg) return placePage(acct, ctx, back, places.find(p => p.id === arg));
  const st = TC.stats(places);
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(travelTab === k), class: travelTab === k ? 'active' : '', onclick: () => { travelTab = k; render(true); } }, label);
  const stat = (n, label) => h('div', { class: 'tstat' }, h('b', {}, String(n)), h('span', { class: 'muted' }, label));
  return [back(appName(acct, 'travel'), { action: h('button', { class: 'btn primary', onclick: () => placeEditor(acct, ctx, null, {}) }, 'Add place') }),
    h('div', { class: 'tstats' }, stat(st.places, st.places === 1 ? 'place' : 'places'), stat(st.countries, st.countries === 1 ? 'country' : 'countries'), stat(st.photos, st.photos === 1 ? 'photo' : 'photos'), st.days ? stat(st.days, st.days === 1 ? 'day' : 'days') : null),
    h('div', { class: 'tabs', role: 'tablist' }, tab('map', 'Map'), tab('places', 'Places'), tab('countries', 'Countries')),
    travelTab === 'map' ? mapPanel(acct, ctx, places, st) : travelTab === 'places' ? placeList(places) : countryList(places, st)];
}

/* ---------- lists ---------- */
function placeList(places) {
  if (!places.length) return emptyState('No places yet', 'Tap the map, or press Add place, to log somewhere you have been.');
  return h('div', { class: 'app-pad' }, TC.sortPlaces(places).map(p => h('a', { class: 'tplace', href: '#/apps/travel/' + p.id },
    p.thumbs?.[0] ? h('img', { class: 'asset-thumb', src: p.thumbs[0], alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'asset-thumb ph' }, icon('globe')),
    h('div', { class: 'tplace-main' }, h('b', {}, p.name), h('span', { class: 'muted' }, [p.country, placeDates(p)].filter(Boolean).join(' · ') || TC.fmtCoords(p.lat, p.lng)),
      p.notes ? h('span', { class: 'muted tplace-note' }, p.notes.replace(/\s+/g, ' ').slice(0, 120)) : null))));
}
function countryList(places, st) {
  if (!st.byCountry.length) return emptyState('No countries yet', 'Countries you log places in show up here, and light up on the map.');
  return h('div', { class: 'app-pad' }, st.byCountry.map(([name, n]) => h('div', { class: 'tcountry' }, h('b', {}, name), h('span', { class: 'muted' }, plural(n, 'place')),
    h('div', { class: 'tcountry-places' }, TC.sortPlaces(places.filter(p => p.country === name)).map(p => h('a', { href: '#/apps/travel/' + p.id }, p.name))))));
}

/* ---------- the map ---------- */
function mapPanel(acct, ctx, places, st) {
  const wrap = h('div', { class: 'travel-map', tabindex: '0', role: 'application', 'aria-label': `World map with ${plural(places.length, 'place')}. Arrow keys move, plus and minus zoom. The Places tab lists them all.` });
  const cv = h('canvas', { 'aria-hidden': 'true' });
  const sheet = h('div', { class: 'travel-sheet', 'aria-live': 'polite' }, h('span', { class: 'muted' }, 'Tap the map to drop a pin. Tap a pin to open it.'));
  const btn = (label, text, fn) => h('button', { class: 'btn map-btn', type: 'button', 'aria-label': label, onclick: fn }, text);
  wrap.append(cv, h('div', { class: 'map-ctl' }, btn('Zoom in', '+', () => zoomBy(0.8)), btn('Zoom out', '−', () => zoomBy(-0.8)), btn('Show all my places', '⌂', () => { v = TC.fitView(places, size().w, size().h); draw(); })));
  const visited = new Set(st.byCountry.map(c => c[0]));
  let map = null, v = travelView_, sel = null, raf = 0, pins = [], hover = null;
  const size = () => ({ w: Math.max(1, cv.clientWidth), h: Math.max(1, cv.clientHeight) });
  const cache = new WeakMap();
  const proj = ring => {      // a ring in world coordinates (0..1), worked out once
    let c = cache.get(ring);
    if (!c) {
      const xy = new Float32Array(ring.length); let x0 = 9, y0 = 9, x1 = -9, y1 = -9;
      for (let i = 0; i < ring.length; i += 2) { const q = TC.project(ring[i + 1] / 100, ring[i] / 100); xy[i] = q.x; xy[i + 1] = q.y; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      cache.set(ring, c = { xy, box: [x0, y0, x1, y1] });
    }
    return c;
  };
  const draw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
  function paint() {
    if (!map || !v) return;
    const { w, h: hh } = size(), dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); v = TC.clampView(v, w, hh); }
    travelView_ = v;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = themeColor('--bg', '#ffffff'), fg = themeColor('--fg', '#0f1419'), accent = themeColor('--accent', '#8b5cf6');
    g.fillStyle = ThemeCore.mix(bg, fg, 0.05); g.fillRect(0, 0, w, hh);
    const W = TC.worldPx(v.z), ox = w / 2 - v.cx * W, oy = hh / 2 - v.cy * W;
    const vis = [v.cx - w / 2 / W, v.cy - hh / 2 / W, v.cx + w / 2 / W, v.cy + hh / 2 / W];
    const trace = ring => {
      const c = proj(ring), b = c.box;
      if (b[2] < vis[0] || b[0] > vis[2] || b[3] < vis[1] || b[1] > vis[3]) return false;
      for (let i = 0; i < c.xy.length; i += 2) { const x = c.xy[i] * W + ox, y = c.xy[i + 1] * W + oy; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); return true;
    };
    g.lineJoin = 'round';
    g.fillStyle = ThemeCore.mix(bg, fg, 0.16); g.beginPath();
    for (const c of map.countries) for (const r of c[2]) trace(r);
    g.fill();
    if (visited.size) { g.fillStyle = accent; g.globalAlpha = 0.5; g.beginPath(); for (const c of map.countries) if (visited.has(c[0])) for (const r of c[2]) trace(r); g.fill(); g.globalAlpha = 1; }
    g.strokeStyle = ThemeCore.mix(bg, fg, 0.38); g.lineWidth = 0.6; g.beginPath();
    for (const c of map.countries) for (const r of c[2]) trace(r);
    g.stroke();
    // cities, only as many as are useful at this zoom
    if (v.z >= 3.6) {
      const minPop = v.z < 4.5 ? 1500000 : v.z < 5.5 ? 400000 : 0; let n = 0;
      g.font = '11px system-ui, sans-serif'; g.fillStyle = ThemeCore.mix(bg, fg, 0.7); g.textBaseline = 'middle';
      for (const c of map.cities) {
        if (c[4] < minPop) break;
        const q = TC.project(c[2] / 100, c[3] / 100), x = q.x * W + ox, y = q.y * W + oy;
        if (x < 0 || y < 0 || x > w || y > hh) continue;
        g.beginPath(); g.arc(x, y, 2, 0, 6.3); g.fill(); g.fillText(c[0], x + 5, y); if (++n > 60) break;
      }
    }
    // pins
    pins = places.filter(TC.validPlace).map(p => { const q = TC.project(p.lat, p.lng); return { p, x: q.x * W + ox, y: q.y * W + oy }; });
    g.font = '600 12px system-ui, sans-serif'; g.textBaseline = 'alphabetic';
    for (const pin of pins) {
      if (pin.x < -20 || pin.y < -20 || pin.x > w + 20 || pin.y > hh + 20) continue;
      const on = sel && sel.type === 'place' && sel.id === pin.p.id;
      g.beginPath(); g.arc(pin.x, pin.y, on ? 9 : 7, 0, 6.3); g.fillStyle = accent; g.fill(); g.lineWidth = 2.5; g.strokeStyle = bg; g.stroke();
      if (v.z >= 3 || on) { g.lineWidth = 3; g.strokeStyle = bg; g.strokeText(pin.p.name, pin.x + 12, pin.y + 4); g.fillStyle = fg; g.fillText(pin.p.name, pin.x + 12, pin.y + 4); }
    }
    if (sel && sel.type === 'drop') { const q = TC.project(sel.lat, sel.lng), x = q.x * W + ox, y = q.y * W + oy; g.beginPath(); g.arc(x, y, 8, 0, 6.3); g.lineWidth = 3; g.strokeStyle = accent; g.stroke(); g.beginPath(); g.arc(x, y, 2.5, 0, 6.3); g.fillStyle = accent; g.fill(); }
  }
  function zoomBy(dz) { const { w, h: hh } = size(); v = TC.zoomAt(v, w, hh, w / 2, hh / 2, dz); draw(); }
  function showSheet() {
    if (!sel) { sheet.replaceChildren(h('span', { class: 'muted' }, 'Tap the map to drop a pin. Tap a pin to open it.')); return; }
    if (sel.type === 'place') {
      const p = places.find(x => x.id === sel.id); if (!p) return;
      sheet.replaceChildren(h('b', {}, p.name), h('span', { class: 'muted' }, [p.country, placeDates(p)].filter(Boolean).join(' · ') || TC.fmtCoords(p.lat, p.lng)), h('a', { class: 'btn primary', href: '#/apps/travel/' + p.id }, 'Open'));
      return;
    }
    const near = TC.nearestCity(map, sel.lat, sel.lng, 80), country = countryFor(map, sel.lat, sel.lng);
    sheet.replaceChildren(h('b', {}, TC.fmtCoords(sel.lat, sel.lng)), h('span', { class: 'muted' }, [near ? `Near ${near.name}` : '', country].filter(Boolean).join(', ') || 'Open water'),
      h('button', { class: 'btn primary', onclick: () => placeEditor(acct, ctx, null, { lat: sel.lat, lng: sel.lng, name: near && near.km < 25 ? near.name : '', country }) }, 'Add a place here'));
  }
  // ---- pointers: drag to pan, pinch to zoom, tap to pick
  const ptrs = new Map(); let moved = 0, t0 = 0, pinch = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) { moved = 0; t0 = Date.now(); } pinch = 0; wrap.focus({ preventScroll: true }); });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p || !v) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    const { w, h: hh } = size(), r = cv.getBoundingClientRect();
    if (ptrs.size === 1) { moved += Math.abs(dx) + Math.abs(dy); v = TC.panBy(v, w, hh, dx, dy); }
    else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); moved += 99;
      if (pinch) v = TC.zoomAt(v, w, hh, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, Math.log2(d / pinch));
      pinch = d;
    }
    draw();
  });
  const lift = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); pinch = 0;
    if (e.type === 'pointerup' && !ptrs.size && moved < 8 && Date.now() - t0 < 700) tap(e);
  };
  cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
  function tap(e) {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, { w, h: hh } = size();
    const hit = pins.filter(p => Math.hypot(p.x - sx, p.y - sy) < 20).sort((a, b) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy))[0];
    if (hit) sel = { type: 'place', id: hit.p.id };
    else { const q = TC.unproject(...Object.values(TC.fromScreen(v, w, hh, sx, sy))); sel = { type: 'drop', lat: Math.round(q.lat * 1e4) / 1e4, lng: Math.round(q.lng * 1e4) / 1e4 }; }
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
  loadWorld().then(m => {
    map = m;
    const { w, h: hh } = size();
    v = v ? TC.clampView(v, w, hh) : TC.fitView(places, w, hh);
    showSheet(); paint();
    if (!wrap.isConnected) return;
    requestAnimationFrame(() => { const s = size(); if (s.w !== w || s.h !== hh) { v = v && TC.clampView(v, s.w, s.h); draw(); } });
  }).catch(() => sheet.replaceChildren(h('span', { class: 'err' }, 'The map could not be loaded.')));
  return h('div', { class: 'app-pad' }, wrap, sheet, h('p', { class: 'fine', style: 'padding:8px 0 0' }, 'Outlines are from Natural Earth (public domain). The map is drawn on your device; nothing is downloaded.'));
}

/* ---------- one place ---------- */
function placePage(acct, ctx, back, p) {
  if (!p) return [back(appName(acct, 'travel')), emptyState('Place not found', 'That place is not on this device.')];
  const fact = (k, v) => v ? h('div', { class: 'tool-line' }, h('span', { class: 'muted' }, k), h('span', {}, v)) : null;
  const ids = p.photoIds || [], thumbs = p.thumbs || [];
  return [back(p.name, { action: h('button', { class: 'btn', onclick: () => placeEditor(acct, ctx, p, {}) }, 'Edit') }),
    h('div', { class: 'app-pad' },
      h('div', { class: 'tool-lines' }, fact('Country', p.country), fact('When', placeDates(p)), fact('Days', TC.daysIn(p.from, p.to) > 1 ? String(TC.daysIn(p.from, p.to)) : ''), fact('Where', TC.fmtCoords(p.lat, p.lng))),
      p.notes ? h('p', { class: 'viewer-note', style: 'white-space:pre-wrap' }, p.notes) : h('p', { class: 'muted' }, 'No notes yet.'),
      ids.length ? h('div', { class: 'ph-grid tgallery' }, thumbs.map((t, k) => h('button', { type: 'button', class: 'ph-tile', 'aria-label': `Photo ${k + 1} of ${ids.length}`, onclick: () => photoViewer(acct, p, k) }, h('img', { src: t, alt: `${p.name}, photo ${k + 1}` })))) : null,
      h('div', { class: 'btnrow', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: () => { const q = TC.project(p.lat, p.lng); travelTab = 'map'; travelView_ = { z: 5, cx: q.x, cy: q.y }; go('/apps/travel'); } }, 'Show on the map')))];
}
function photoViewer(acct, p, start) {
  const ids = p.photoIds || [], thumbs = p.thumbs || [], full = {};
  let idx = start || 0;
  const main = h('img', { class: 'viewer-img', alt: '' }), count = h('span', { class: 'muted viewer-count' });
  const draw = () => { main.src = full[ids[idx]] || thumbs[idx]; main.alt = `${p.name}, photo ${idx + 1} of ${ids.length}`; count.textContent = `${idx + 1} of ${ids.length}`; };
  const step = n => { idx = (idx + n + ids.length) % ids.length; draw(); };
  const root = h('div', { class: 'viewer', tabindex: '-1', onkeydown: e => { if (ids.length > 1 && e.key === 'ArrowRight') step(1); else if (ids.length > 1 && e.key === 'ArrowLeft') step(-1); } },
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, p.name)),
    h('div', { class: 'mp' }, h('div', { class: 'viewer-stage' }, h('div', { class: 'viewer-frame' },
      ids.length > 1 ? h('button', { class: 'viewer-nav prev', 'aria-label': 'Previous photo', onclick: () => step(-1) }, icon('back')) : null, main,
      ids.length > 1 ? h('button', { class: 'viewer-nav next flip', 'aria-label': 'Next photo', onclick: () => step(1) }, icon('back')) : null), count)));
  const close = modal(root); draw(); setTimeout(() => root.focus(), 0);
  if (p.mtoken) loadMedia(acct, p.mtoken).then(list => { for (const r of list) full[r.id] = r.f; draw(); }).catch(() => {});
}

/* ---------- add or edit a place ---------- */
async function placeEditor(acct, ctx, p, prefill) {
  let map; try { map = await loadWorld(); } catch { toast('The map data could not be loaded.'); return; }
  const isNew = !p;
  const rec = p ? { ...p } : { id: uid(), accountId: acct.id, kind: 'place', name: prefill.name || '', lat: prefill.lat, lng: prefill.lng, country: prefill.country || '', from: '', to: '', notes: '', createdAt: Date.now() };
  const originalIds = p ? [...(p.photoIds || [])] : [];
  let photos = (rec.thumbs || []).map((t, k) => ({ id: (rec.photoIds || [])[k], t }));
  const name = h('input', { value: rec.name, maxlength: 100, placeholder: 'Where was it?', 'aria-label': 'Place name' });
  const find = h('input', { type: 'search', placeholder: 'Search for a city (optional)', 'aria-label': 'Search for a city', autocomplete: 'off' });
  const found = h('div', { class: 'tfound' });
  const coords = h('input', { value: TC.validPlace(rec) ? `${rec.lat}, ${rec.lng}` : '', inputmode: 'text', placeholder: 'Latitude, longitude  e.g. 35.68, 139.69', 'aria-label': 'Coordinates' });
  const country = h('input', { value: rec.country || '', maxlength: 60, list: 'tcountries', placeholder: 'Country', 'aria-label': 'Country' });
  const dl = h('datalist', { id: 'tcountries' }, map.countries.map(c => h('option', { value: c[0] })));
  const from = h('input', { type: 'date', value: rec.from || '', 'aria-label': 'From' }), to = h('input', { type: 'date', value: rec.to || '', 'aria-label': 'Until' });
  const notes = h('textarea', { rows: 6, 'aria-label': 'Notes', placeholder: 'What did you do there? No length limit.' }, rec.notes || '');
  const err = h('p', { class: 'err' }), hint = h('p', { class: 'fine', style: 'padding:4px 0 0' });
  const setCoords = (lat, lng, auto) => {
    coords.value = `${lat}, ${lng}`;
    if (auto || !country.value) country.value = countryFor(map, lat, lng);
    hint.textContent = '';
  };
  find.addEventListener('input', () => {
    const rs = TC.searchCities(map, find.value);
    found.replaceChildren(...rs.map(c => h('button', { type: 'button', class: 'tfound-item', onclick: () => { name.value = name.value || c.name; setCoords(c.lat, c.lng, true); if (!name.value) name.value = c.name; find.value = ''; found.replaceChildren(); } }, h('b', {}, c.name), h('span', { class: 'muted' }, c.country))));
  });
  coords.addEventListener('change', () => { const c = TC.parseCoords(coords.value); if (c) { setCoords(c.lat, c.lng, true); } else if (coords.value.trim()) hint.textContent = 'Try "35.68, 139.69" or "35.68 N 139.69 E".'; });
  // ---- photos
  const grid = h('div', { class: 'ph-grid' }), phCount = h('span', { class: 'muted' });
  const drawPhotos = () => {
    phCount.textContent = `${photos.length} of ${MAX_PHOTOS}`;
    grid.replaceChildren(...photos.map((ph, k) => h('div', { class: 'ph-tile' + (k === 0 ? ' cover' : '') }, h('img', { src: ph.t, alt: `Photo ${k + 1}` }), k === 0 ? h('span', { class: 'ph-badge' }, 'Cover') : null,
      h('button', { type: 'button', class: 'ph-btn x', 'aria-label': `Remove photo ${k + 1}`, onclick: () => { photos.splice(k, 1); drawPhotos(); } }, icon('x')))));
  };
  const addFiles = async files => {
    for (const f of [...files]) {
      if (photos.length >= MAX_PHOTOS) { toast(`Up to ${MAX_PHOTOS} photos per place.`); break; }
      const blocked = await pictureBlocked(f); if (blocked) { toast(blocked); break; }
      try { photos.push({ t: await downscale(f, 360), f: await downscale(f, 1100) }); drawPhotos(); } catch { toast("That doesn't look like an image."); }
    }
  };
  const pick = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, 'aria-label': 'Choose photos' });
  const snap = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, 'aria-label': 'Take a photo' });
  for (const inp of [pick, snap]) inp.addEventListener('change', async () => { const fs_ = [...inp.files]; inp.value = ''; await addFiles(fs_); });
  drawPhotos();
  const save = h('button', { class: 'btn primary' }, isNew ? 'Add place' : 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New place' : 'Edit place')),
    h('div', { class: 'mp' }, dl, fieldEl('Find a city', find), found, fieldEl('Name', name), fieldEl('Coordinates', coords), hint, fieldEl('Country', country),
      h('div', { class: 'two' }, fieldEl('From', from), fieldEl('Until', to)), fieldEl('Notes', notes),
      h('div', { class: 'ph-head' }, h('b', {}, 'Photos'), phCount), grid,
      h('div', { class: 'btnrow', style: 'margin-bottom:14px' }, h('button', { type: 'button', class: 'btn', onclick: () => photos.length < MAX_PHOTOS ? snap.click() : toast(`Up to ${MAX_PHOTOS} photos per place.`) }, 'Take photo'), h('button', { type: 'button', class: 'btn', onclick: () => pick.click() }, 'Choose photos'), pick, snap),
      err, h('div', { class: 'btnrow', style: 'margin-top:12px' }, save,
        !isNew && h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this place and its photos? There is no undo.')) return; await deleteMedia(acct, rec.mtoken); await appDelete(rec.id); close(); if (location.hash.startsWith('#/apps/travel/')) go('/apps/travel'); else render(true); } }, 'Delete')))));
  save.addEventListener('click', async () => {
    const c = TC.parseCoords(coords.value);
    if (!name.value.trim()) return void (err.textContent = 'Give it a name.');
    if (!c) return void (err.textContent = 'Add coordinates: search for a city, tap the map first, or type them like 35.68, 139.69.');
    if (from.value && !AC.isKey(from.value) || to.value && !AC.isKey(to.value)) return void (err.textContent = 'Those dates are not valid.');
    if (from.value && to.value && to.value < from.value) return void (err.textContent = '"Until" is before "From".');
    save.disabled = true;
    const token = rec.mtoken || uid(), made = [];
    for (const ph of photos.filter(x => !x.id)) {
      const id = uid();
      if (!(await appSave(acct, { id, accountId: acct.id, kind: 'photo', asset: rec.id, f: ph.f, createdAt: Date.now(), m: token }))) { for (const m of made) await appDelete(m); save.disabled = false; return; }
      ph.id = id; made.push(id);
    }
    Object.assign(rec, { name: name.value.trim(), lat: c.lat, lng: c.lng, country: country.value.trim(), from: from.value || '', to: to.value || '', notes: notes.value, photoIds: photos.map(x => x.id), thumbs: photos.map(x => x.t), mtoken: photos.length ? token : '', updatedAt: Date.now() });
    if (!(await appSave(acct, rec))) { for (const m of made) await appDelete(m); save.disabled = false; return; }
    for (const id of originalIds.filter(id => !photos.some(x => x.id === id))) await appDelete(id);
    close(); render(true);
  });
  setTimeout(() => (isNew && !rec.name ? find : name).focus(), 0);
}

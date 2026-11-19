'use strict';
/* Profile content (pure data, no page): your status and the widgets on your profile's Board. Everything is typed in by you; there are no
   connectors to games, stores or accounts anywhere, so nothing here ever goes online. */
const ProfCore = (() => {
  const MAX_STATUS = 128, MAX_TITLE = 60, MAX_IMG = 120000;
  const CLEARS = [['never', 'Don\'t clear'], ['30m', 'In 30 minutes'], ['1h', 'In 1 hour'], ['4h', 'In 4 hours'], ['today', 'Today'], ['week', 'This week']];
  const EMOJI = ['\u{1F600}', '\u{1F60E}', '\u{1F970}', '\u{1F634}', '\u{1F914}', '\u{1F62D}', '\u{1F525}', '✨', '\u{1F3AE}', '\u{1F4DA}', '\u{1F3A7}', '\u{1F35C}', '☕', '\u{1F338}', '\u{1F327}️', '\u{1F4BB}', '\u{1F3CB}️', '\u{1F3A8}', '\u{1F3AC}', '\u{1F6CC}', '\u{1F9D8}', '\u{1F680}', '\u{1F431}', '\u{1F436}'];
  // when a status clears itself, as a time in milliseconds (or 0 for never)
  function untilFor(key, now = Date.now()) {
    const d = new Date(now), end = new Date(now); end.setHours(23, 59, 59, 999);
    switch (key) { case '30m': return now + 30 * 60e3; case '1h': return now + 3600e3; case '4h': return now + 4 * 3600e3; case 'today': return end.getTime(); case 'week': return end.getTime() + (6 - ((d.getDay() + 6) % 7)) * 86400e3; default: return 0; }
  }
  const cleanText = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, MAX_STATUS);
  const firstEmoji = s => { const m = String(s || '').match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u); return m ? m[0] : ''; };
  // the status you see right now: null when empty or when its time has passed
  function status(r, now = Date.now()) {
    const s = r && r.status; if (!s) return null; const text = cleanText(s.text), emoji = firstEmoji(s.emoji); const until = +s.until || 0;
    if (!text && !emoji) return null; if (until && until <= now) return null; return { text, emoji, until };
  }
  const WIDGETS = [
    { id: 'fav', name: 'Favorite Game', max: 1, blurb: 'The one game you would take anywhere.' },
    { id: 'like', name: 'Games I Like', max: 20, blurb: 'Up to 20 games you enjoy.' },
    { id: 'rot', name: 'Games in Rotation', max: 5, blurb: 'What you are playing these days (up to 5).' },
    { id: 'want', name: 'Want to Play', max: 20, blurb: 'A wishlist of games you have not played yet.' },
  ];
  const widgetInfo = id => WIDGETS.find(w => w.id === id) || null;
  const cleanItem = it => { const t = String((it && it.t) || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE); if (!t) return null; const img = it && typeof it.img === 'string' && it.img.startsWith('data:image/') && it.img.length <= MAX_IMG ? it.img : ''; return img ? { t, img } : { t }; };
  function normWidgets(list) {
    const seen = new Set(), out = [];
    for (const w of Array.isArray(list) ? list : []) { const info = w && widgetInfo(w.type); if (!info || seen.has(info.id)) continue; seen.add(info.id); const items = []; for (const it of Array.isArray(w.items) ? w.items : []) { const c = cleanItem(it); if (c && !items.some(x => x.t.toLowerCase() === c.t.toLowerCase()) && items.length < info.max) items.push(c); } out.push({ type: info.id, items }); }
    return out;
  }
  const normProfile = (r, now) => ({ status: status(r, now), widgets: normWidgets(r && r.widgets) });
  // the widgets people can see on your Board: ones with nothing in them stay hidden, like a widget you have not filled in yet
  const visibleWidgets = w => w.filter(x => x.items.length);
  function addItem(widgets, type, item) {
    const info = widgetInfo(type), it = cleanItem(item); if (!info) return { error: 'Unknown widget.' }; if (!it) return { error: 'Type a name.' };
    const w = widgets.find(x => x.type === type), items = w ? w.items : [];
    if (items.some(x => x.t.toLowerCase() === it.t.toLowerCase())) return { error: 'That one is already here.' };
    if (info.max === 1) return { widgets: normWidgets(widgets.map(x => (x.type === type ? { type, items: [it] } : x)).concat(w ? [] : [{ type, items: [it] }])) };
    if (items.length >= info.max) return { error: `Up to ${info.max} here.` };
    return { widgets: normWidgets(w ? widgets.map(x => (x.type === type ? { type, items: [...items, it] } : x)) : [...widgets, { type, items: [it] }]) };
  }
  const removeItem = (widgets, type, title) => normWidgets(widgets.map(x => (x.type === type ? { type, items: x.items.filter(i => i.t !== title) } : x)));
  const addWidget = (widgets, type) => (widgetInfo(type) && !widgets.some(x => x.type === type) ? normWidgets([...widgets, { type, items: [] }]) : widgets);
  const removeWidget = (widgets, type) => widgets.filter(x => x.type !== type);
  function moveWidget(widgets, type, d) { const i = widgets.findIndex(x => x.type === type), j = i + d; if (i < 0 || j < 0 || j >= widgets.length) return widgets; const a = widgets.slice(); [a[i], a[j]] = [a[j], a[i]]; return a; }
  return { MAX_STATUS, CLEARS, EMOJI, untilFor, cleanText, firstEmoji, status, WIDGETS, widgetInfo, cleanItem, normWidgets, normProfile, visibleWidgets, addItem, removeItem, addWidget, removeWidget, moveWidget };
})();
if (typeof module !== 'undefined') module.exports = ProfCore;

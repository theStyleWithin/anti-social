'use strict';
/* Desktop layout (the Windows and Linux app, default look): drag either wall of the timeline to make it wider or narrower,
   and, if you like, pin a built-in app in the empty space on each side. Both are optional; nothing changes until you use them. */
const Desk = (() => {
  const KEY = 'as.layout', MIN = 420, DEF = 600, SIDE_MIN = 280, MENU = 260, TRENDS = 330;   // the menu, and the right column (search, trends, who to follow) that a pinned app on the right replaces
  let hideTrends = false;
  const chrome = () => MENU + (hideTrends ? 0 : TRENDS);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const enabled = () => { try { return (window.AntiSocialAI && window.AntiSocialAI.kind === 'desktop') || localStorage.getItem('as.desk') === '1'; } catch { return false; } };
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null') || {}; return { tw: clamp(+v.tw || DEF, MIN, 4000), left: typeof v.left === 'string' ? v.left : '', right: typeof v.right === 'string' ? v.right : '' }; } catch { return { tw: DEF, left: '', right: '' }; } };
  const L = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* not remembered */ } };
  const args = { left: '', right: '' };     // which part of the pinned app is showing (a note, a book...), until you leave it
  let busy = null;                          // which pane you last touched, so an app that jumps to one of its own pages stays in its pane
  const anyPane = () => !!(L.left || L.right);
  const maxTw = () => Math.max(MIN, innerWidth - chrome() - (anyPane() ? 2 * (SIDE_MIN + 24) : 24));
  const width = () => clamp(L.tw, MIN, maxTw());
  const apply = () => { document.documentElement.style.setProperty('--tl-w', width() + 'px'); fit(); };
  function fit() { const d = document.querySelector('.desk'); if (!d) return; const spare = (innerWidth - chrome() - width()) / 2; d.classList.toggle('pane-off', spare < SIDE_MIN + 24); }
  window.addEventListener('resize', apply);

  /* ----- dragging the walls ----- */
  const grip = side => {
    const g = h('div', { class: 'tl-grip ' + side, role: 'separator', 'aria-orientation': 'vertical', tabindex: '0', 'aria-label': 'Timeline width', title: 'Drag to make the timeline wider or narrower. Double-click to reset.' });
    let x0 = 0, w0 = 0;
    const sign = side === 'r' ? 1 : -1;
    g.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); x0 = e.clientX; w0 = width(); g.setPointerCapture(e.pointerId); g.classList.add('drag'); document.body.classList.add('tl-dragging'); });
    g.addEventListener('pointermove', e => { if (!g.hasPointerCapture(e.pointerId)) return; L.tw = clamp(w0 + 2 * sign * (e.clientX - x0), MIN, maxTw()); apply(); });
    const end = e => { if (!g.classList.contains('drag')) return; g.classList.remove('drag'); document.body.classList.remove('tl-dragging'); try { g.releasePointerCapture(e.pointerId); } catch { /* fine */ } save(); };
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
    g.addEventListener('dblclick', () => { L.tw = DEF; apply(); save(); });
    g.addEventListener('keydown', e => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) { if (e.key === 'Home') { e.preventDefault(); L.tw = DEF; apply(); save(); } return; } e.preventDefault(); L.tw = clamp(width() + k * sign * (e.shiftKey ? 80 : 20), MIN, maxTw()); apply(); save(); });
    return g;
  };

  /* ----- pinned apps ----- */
  const choices = acct => { const hid = hiddenApps(acct); return APP_LIST.filter(([id]) => !hid.has(id)).map(([id]) => [id, appName(acct, id)]); };
  const valid = (acct, id) => !!id && choices(acct).some(c => c[0] === id);
  function setApp(side, id) {
    const other = side === 'left' ? 'right' : 'left'; L[side] = id || ''; args[side] = ''; if (id && L[other] === id) { L[other] = ''; args[other] = ''; }   // the same app is never open twice
    save(); apply(); render(true);
  }
  function navigate(side, path) {
    const [, , app, arg, arg2] = path.split('/');
    if (app && app !== L[side]) { setApp(side, app); args[side] = arg2 ? arg + '/' + arg2 : arg || ''; render(true); return; }
    args[side] = app ? (arg || '') : ''; render(true);
  }
  function pane(side, acct, ctx) {
    const id = L[side];
    if (!valid(acct, id)) return h('div', { class: 'pane-slot', 'aria-hidden': 'true' });
    const sel = h('select', { 'aria-label': (side === 'left' ? 'Left' : 'Right') + ' side app', onchange: e => setApp(side, e.target.value) }, h('option', { value: '' }, 'None (empty space)'), choices(acct).map(([i, n]) => h('option', { value: i }, n))); sel.value = id;
    let nodes; window.__inPane = side;
    try { nodes = appsView(acct, ctx, id, args[side] || undefined); } catch (e) { console.error(e); nodes = h('p', { class: 'muted', style: 'padding:16px' }, 'This app could not be shown here.'); } finally { window.__inPane = null; }
    const body = h('div', { class: 'pane-body' }, nodes);
    const el = h('section', { class: 'pane pane-' + side, 'data-side': side, 'data-root': args[side] ? null : '1', role: 'region', 'aria-label': appName(acct, id) },
      h('div', { class: 'pane-head' }, icon(APP_ICONS[id] || 'grid'), sel, h('button', { class: 'pane-x', type: 'button', 'aria-label': 'Remove this app from the side', title: 'Remove', onclick: () => setApp(side, '') }, icon('x'))), body);
    // anything inside the pane that wants to open one of the app's own pages stays in the pane instead of moving the timeline
    el.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href^="#/apps"]'); if (a) { e.preventDefault(); e.stopPropagation(); navigate(side, a.getAttribute('href').slice(1)); return; }
      const b = e.target.closest && e.target.closest('.topbar button.back[aria-label="Back"]'); if (b) { e.preventDefault(); e.stopPropagation(); args[side] = ''; render(true); }
    }, true);
    return el;
  }
  for (const ev of ['pointerdown', 'keydown', 'change', 'submit']) document.addEventListener(ev, e => {
    const t = e.target; if (!t || !t.closest) return; if (t.closest('.modal-bg, .popover')) return;   // a dialog belongs to whatever opened it
    const p = t.closest('.pane'); busy = p ? p.dataset.side : null;
  }, true);

  /* ----- the page ----- */
  function wrap(shellEl, acct, ctx) {
    if (!enabled()) return shellEl;
    const main = shellEl.querySelector('.main'); if (main) main.append(grip('l'), grip('r'));
    hideTrends = valid(acct, L.right);
    const desk = h('div', { class: 'desk' + (anyPane() ? ' has-panes' : '') + (hideTrends ? ' pin-right' : '') }, pane('left', acct, ctx), shellEl, pane('right', acct, ctx));
    apply(); return desk;
  }
  const scrolls = () => { const o = {}; document.querySelectorAll('.pane-body').forEach(b => { o[b.parentElement.dataset.side] = b.scrollTop; }); return o; };
  const restore = o => { document.querySelectorAll('.pane-body').forEach(b => { const v = o && o[b.parentElement.dataset.side]; if (v) b.scrollTop = v; }); };
  // go() asks first: if the last thing you touched was a pinned app, its jumps stay in that pane
  const route = path => { if (busy && /^\/apps(\/|$)/.test(path) && enabled()) { navigate(busy, path); return true; } return false; };

  /* ----- Settings ----- */
  function settingsSection(acct) {
    if (!enabled()) return null;
    const pick = side => { const s = h('select', { 'aria-label': (side === 'left' ? 'Left' : 'Right') + ' side app', onchange: e => setApp(side, e.target.value) }, h('option', { value: '' }, 'None (leave it empty)'), choices(acct).map(([i, n]) => h('option', { value: i }, n))); s.value = valid(acct, L[side]) ? L[side] : ''; return h('label', { class: 'field' }, h('span', {}, side === 'left' ? 'Left of the timeline' : 'Right of the timeline'), s); };
    const out = h('output', {}, width() + ' px');
    const range = h('input', { type: 'range', min: MIN, max: Math.max(MIN + 20, maxTw()), step: 10, value: String(width()), 'aria-label': 'Timeline width', oninput: e => { L.tw = Number(e.target.value); apply(); out.textContent = width() + ' px'; }, onchange: save });
    return h('section', {}, h('h3', {}, 'Desktop layout'),
      h('p', {}, 'On a wide screen you can make the timeline wider or narrower by dragging the line on either side of it, and pin an app into the empty space on each side. Both are optional.' + (tplId() === 'default' ? '' : ' This works with the default look.')),
      h('div', { class: 'tool-fields' }, pick('left'), pick('right')),
      h('label', { class: 'mx-range' }, h('span', {}, 'Timeline width'), range, out),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { L.tw = DEF; L.left = ''; L.right = ''; save(); apply(); render(true); } }, 'Reset the layout')));
  }
  /* ----- drag an app card from the Apps page into the empty space ----- */
  function dragZones(acct) {
    if (!enabled() || tplId() !== 'default' || innerWidth < chrome() + MIN + 2 * (SIDE_MIN + 24)) return null;
    const w = Math.max(SIDE_MIN, Math.round((innerWidth - chrome() - width()) / 2)), els = {};
    for (const side of ['left', 'right']) {
      const cur = valid(acct, L[side]) ? appName(acct, L[side]) : '';
      els[side] = h('div', { class: 'pin-zone ' + side, 'aria-hidden': 'true', style: `width:${w - 24}px` }, h('div', {}, icon('pin'), h('b', {}, cur ? 'Replace ' + cur : 'Pin it here'), h('small', {}, 'Let go to keep it on this side')));
      document.body.append(els[side]);
    }
    requestAnimationFrame(() => Object.values(els).forEach(e => e.classList.add('show')));
    return { hit: x => (x < w ? 'left' : x > innerWidth - w ? 'right' : ''), hot: side => { els.left.classList.toggle('hot', side === 'left'); els.right.classList.toggle('hot', side === 'right'); }, done: () => Object.values(els).forEach(e => e.remove()) };
  }
  const pin = (side, id) => setApp(side, id);
  apply();
  return { enabled, dragZones, pin, wrap, route, scrolls, restore, settingsSection };
})();

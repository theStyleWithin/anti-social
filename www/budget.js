'use strict';
/* Budget: a monthly budget laid out like the spreadsheet. Plan each line (projected), note what really happened (actual),
   and see the difference and your balance. Months are separate; copy one forward to start the next. All on this device. */
const BU = BudgetCore;
let buTab = 'month', buMonth = null, buYear = null, buSaveT = null, buOpen = new Map();
const buCents = s => { s = String(s).trim(); if (s === '') return { ok: true, v: null }; const c = AC.parseMoney(s); return c === null ? { ok: false } : { ok: true, v: c }; };
const buInput = c => c === null ? '' : (c / 100).toFixed(2);
const buCls = n => n > 0 ? 'pos' : n < 0 ? 'neg' : '';
const buSigned = c => (c > 0 ? '+' : '') + money(c);
const buLabel = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };

function budgetView(acct, ctx, back) {
  if (!buMonth) buMonth = ymOf(todayKey());
  if (!buYear) buYear = Number(buMonth.slice(0, 4));
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(buTab === k), class: buTab === k ? 'active' : '', onclick: () => { buTab = k; render(true); } }, label);
  const recs = ctx.apps.budget;
  return [back(appName(acct, 'budget')), h('div', { class: 'tabs', role: 'tablist' }, tab('month', 'Month'), tab('year', 'Year')), h('div', { class: 'app-pad bu-wrap' }, buTab === 'month' ? buMonthView(acct, recs) : buYearView(recs))];
}

function buNav(prev, next, title) {
  return h('div', { class: 'cal-head' },
    h('button', { class: 'back', 'aria-label': 'Previous', onclick: prev }, icon('back')), h('h2', {}, title),
    h('button', { class: 'back flip', 'aria-label': 'Next', onclick: next }, icon('back')));
}

function buMonthView(acct, recs) {
  const nav = buNav(() => { buMonth = BU.shift(buMonth, -1); render(true); }, () => { buMonth = BU.shift(buMonth, 1); render(true); }, buLabel(buMonth));
  let rec = recs.find(r => r.month === buMonth);
  if (!rec) {
    const prev = BU.previous(recs, buMonth), start = async data => { if (await appSave(acct, { id: uid(), accountId: acct.id, kind: 'budget', month: buMonth, createdAt: Date.now(), ...data })) render(true); };
    return [nav, h('div', { class: 'bank-card' }, h('h3', {}, `Plan ${buLabel(buMonth)}`),
      h('p', { class: 'muted' }, 'A budget has your income, then the things you spend on, in groups. For each line you write what you plan to spend (projected) and what you actually spent. The app does the sums.'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn primary', onclick: () => start(BU.template()) }, 'Start with the standard lines'),
        prev ? h('button', { class: 'btn', onclick: () => start(BU.carryOver(BU.norm(prev))) }, `Copy the plan from ${buLabel(prev.month)}`) : null))];
  }
  let data = BU.norm(rec); const paints = [];
  const paint = () => paints.forEach(f => f());
  const flush = async () => { clearTimeout(buSaveT); buSaveT = null; rec = { ...rec, ...data }; return appSave(acct, rec); };
  const later = () => { clearTimeout(buSaveT); buSaveT = setTimeout(() => { buSaveT = null; rec = { ...rec, ...data }; appSave(acct, rec); }, 400); };
  const edit = async fn => { data = fn(data); if (await flush()) render(true); };
  const lineOf = id => data.income.find(l => l.id === id) || data.cats.flatMap(c => c.lines).find(l => l.id === id) || { proj: null, act: null };
  const set = (id, patch) => { data = BU.setLine(data, id, patch); paint(); later(); };
  const num = (id, key, label) => {
    const el = h('input', { class: 'bu-num', inputmode: 'decimal', placeholder: '0.00', value: buInput(lineOf(id)[key]), 'aria-label': label });
    el.addEventListener('change', () => { const r = buCents(el.value); el.setAttribute('aria-invalid', String(!r.ok)); if (!r.ok) return void toast('Type an amount like 120 or 120.50.'); el.value = buInput(r.v); set(id, { [key]: r.v }); });
    return el;
  };
  const row = (l, label, isIncome) => {
    const name = h('input', { class: 'bu-name', value: l.name, maxlength: 60, placeholder: 'Name', 'aria-label': l.name ? `${l.name} name` : `Line name (${label})` });
    name.addEventListener('change', () => set(l.id, { name: name.value.trim() }));
    const d = h('span', { class: 'bu-diff' });
    paints.push(() => { const x = lineOf(l.id), v = isIncome ? (x.act || 0) - (x.proj || 0) : BU.diff(x); d.textContent = x.proj === null && x.act === null ? '' : buSigned(v); d.className = 'bu-diff ' + buCls(v); });
    return h('div', { class: 'bu-row' }, name, num(l.id, 'proj', `${l.name || 'Line'} projected`), num(l.id, 'act', `${l.name || 'Line'} actual`), d,
      h('button', { class: 'bu-x', type: 'button', 'aria-label': `Remove ${l.name || 'line'}`, title: 'Remove', onclick: () => edit(m => BU.removeLine(m, l.id)) }, '×'));
  };
  const head = (a, b, c) => h('div', { class: 'bu-row bu-head' }, h('span', {}, ''), h('span', {}, a), h('span', {}, b), h('span', {}, c), h('span', {}));
  const totalRow = (getLines, isIncome) => {
    const p = h('b', {}), a = h('b', {}), d = h('b', {});
    paints.push(() => { const t = BU.totals(getLines()), v = isIncome ? t.act - t.proj : t.diff; p.textContent = money(t.proj); a.textContent = money(t.act); d.textContent = buSigned(v); d.className = buCls(v); });
    return h('div', { class: 'bu-row bu-total' }, h('b', {}, 'Total'), p, a, d, h('span', {}));
  };

  // the sums at the top
  const bigs = ['Projected balance', 'Actual balance', 'Difference'].map(t => { const v = h('b', { class: 'bu-big' }); return { v, el: h('div', { class: 'bu-stat' }, h('small', {}, t), v) }; });
  const inc = h('div', { class: 'bu-line' }), cost = h('div', { class: 'bu-line' });
  paints.push(() => {
    const s = BU.summary(data);
    bigs[0].v.textContent = money(s.projBalance); bigs[1].v.textContent = money(s.actBalance); bigs[2].v.textContent = buSigned(s.balanceDiff);
    bigs[0].v.className = 'bu-big ' + (s.projBalance < 0 ? 'neg' : ''); bigs[1].v.className = 'bu-big ' + (s.actBalance < 0 ? 'neg' : ''); bigs[2].v.className = 'bu-big ' + buCls(s.balanceDiff);
    inc.textContent = `Income: planned ${money(s.projIncome)}, actual ${money(s.actIncome)}`; cost.textContent = `Costs: planned ${money(s.projCost)}, actual ${money(s.actCost)}`;
  });
  const summary = h('div', { class: 'bu-summary' }, h('div', { class: 'bu-stats' }, bigs.map(b => b.el)), inc, cost);

  // income
  const incomeCard = h('div', { class: 'bu-card' }, h('h3', {}, 'Income'), head('Projected', 'Actual', 'Diff'),
    data.income.map(l => row(l, 'Income', true)), totalRow(() => data.income, true),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => edit(m => BU.addLine(m, 'income', 'Income')) }, 'Add income')));

  const catCard = c => {
    const d = h('details', { class: 'bu-cat', open: buOpen.has(c.name + c.id) ? buOpen.get(c.name + c.id) : c.lines.some(l => l.proj !== null || l.act !== null) });
    d.addEventListener('toggle', () => buOpen.set(c.name + c.id, d.open));
    const tp = h('span', { class: 'muted' }), td = h('b', {});
    paints.push(() => { const cat = data.cats.find(x => x.id === c.id); if (!cat) return; const t = BU.totals(cat.lines); tp.textContent = `${money(t.proj)} planned · ${money(t.act)} spent`; td.textContent = buSigned(t.diff); td.className = buCls(t.diff); });
    const i = data.cats.findIndex(x => x.id === c.id);
    d.append(h('summary', {}, h('b', { class: 'bu-cname' }, c.name || 'Untitled'), tp, td),
      head('Projected', 'Actual', 'Diff'), ...c.lines.map(l => row(l, c.name, false)), totalRow(() => (data.cats.find(x => x.id === c.id) || { lines: [] }).lines, false),
      h('div', { class: 'btnrow bu-actions' },
        h('button', { class: 'btn', onclick: () => { buOpen.set(c.name + c.id, true); edit(m => BU.addLine(m, c.id, '')); } }, 'Add a line'),
        h('button', { class: 'btn', onclick: () => buRename(c, name => edit(m => BU.renameCategory(m, c.id, name))) }, 'Rename'),
        h('button', { class: 'btn', disabled: i === 0, 'aria-label': `Move ${c.name} up`, onclick: () => edit(m => BU.moveCategory(m, c.id, -1)) }, '↑'),
        h('button', { class: 'btn', disabled: i === data.cats.length - 1, 'aria-label': `Move ${c.name} down`, onclick: () => edit(m => BU.moveCategory(m, c.id, 1)) }, '↓'),
        h('button', { class: 'btn danger', onclick: () => buConfirm(`Delete "${c.name}" and its ${plural(c.lines.length, 'line')}?`, () => edit(m => BU.removeCategory(m, c.id))) }, 'Delete')));
    return d;
  };

  // where the money went
  const bars = h('div', { class: 'cat-bars' });
  paints.push(() => {
    const rows = data.cats.map(c => { const t = BU.totals(c.lines); return { name: c.name, v: t.act }; }).filter(r => r.v > 0).sort((a, b) => b.v - a.v), max = Math.max(1, ...rows.map(r => r.v));
    bars.replaceChildren(...(rows.length ? [h('h3', {}, 'Where it went'), ...rows.map(r => h('div', { class: 'cat-row' }, h('span', {}, r.name), h('div', { class: 'cat-bar' }, h('i', { style: `width:${Math.max(3, r.v / max * 100)}%` })), h('b', {}, money(r.v))))] : []));
  });

  const cur = h('select', { 'aria-label': 'Currency', onchange: e => { ls('as.currency', e.target.value); render(true); } }, AC.CURRENCIES.map(c => h('option', { value: c }, c)));
  cur.value = currencyNow();
  const next = BU.shift(buMonth, 1);
  const toolbar = h('div', { class: 'btnrow' },
    h('button', { class: 'btn', onclick: async () => { await flush(); if (recs.some(r => r.month === next)) { buMonth = next; return void render(true); } if (await appSave(acct, { id: uid(), accountId: acct.id, kind: 'budget', month: next, createdAt: Date.now(), ...BU.carryOver(data) })) { buMonth = next; toast(`Copied the plan to ${buLabel(next)}.`); render(true); } } }, `Copy plan to ${buLabel(next).split(' ')[0]}`),
    h('button', { class: 'btn', onclick: () => saveFile(`anti-social-budget-${buMonth}.csv`, 'text/csv', AC.toCsv(BU.rowsFor(data, buLabel(buMonth)))).then(r => toast(r.ok ? `Saved to ${r.where}. A spreadsheet can open it.` : r.where)) }, 'Export CSV'),
    cur, h('button', { class: 'btn danger', onclick: () => buConfirm(`Delete the whole budget for ${buLabel(buMonth)}?`, async () => { clearTimeout(buSaveT); await appDelete(rec.id); render(true); }) }, 'Delete month'));
  const node = h('div', {}, nav, summary, incomeCard, data.cats.map(catCard),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => buRename({ name: '' }, name => edit(m => BU.addCategory(m, name || 'New category')), 'New category') }, 'Add a category')),
    bars, toolbar,
    h('p', { class: 'fine' }, 'Difference is projected minus actual on spending, so a plus means you spent less than planned. It saves as you type, only on this device.'));
  paint();
  return [node];
}

function buRename(c, done, title = 'Rename') {
  const input = h('input', { value: c.name, maxlength: 60, 'aria-label': 'Category name' });
  const close = modal(h('div', { class: 'modal-body' }, h('h3', {}, title), input, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn primary', onclick: () => { close(); done(input.value.trim()); } }, 'Save'))));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { close(); done(input.value.trim()); } }); setTimeout(() => input.focus(), 30);
}
function buConfirm(text, yes) {
  const close = modal(h('div', { class: 'modal-body' }, h('p', {}, text), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Keep it'), h('button', { class: 'btn danger', onclick: () => { close(); yes(); } }, 'Delete'))));
}

function buYearView(recs) {
  const rows = BU.yearRows(recs, buYear), t = BU.yearTotals(rows), max = Math.max(1, ...rows.map(r => Math.max(r.actIncome, r.actCost)));
  return [buNav(() => { buYear--; render(true); }, () => { buYear++; render(true); }, String(buYear)),
    h('div', { class: 'bu-stats' }, [['Income', t.actIncome, ''], ['Costs', t.actCost, ''], ['Left over', t.actIncome - t.actCost, buCls(t.actIncome - t.actCost)]].map(([l, v, c]) => h('div', { class: 'bu-stat' }, h('small', {}, l + ' (actual)'), h('b', { class: 'bu-big ' + c }, money(v))))),
    h('div', { class: 'bu-year' }, rows.map(r => h('button', { class: 'bu-yrow' + (r.has ? '' : ' empty'), onclick: () => { buMonth = r.month; buTab = 'month'; render(true); } },
      h('span', { class: 'bu-ym' }, new Date(buYear, Number(r.month.slice(5)) - 1, 1).toLocaleDateString(undefined, { month: 'short' })),
      h('span', { class: 'bu-bars' }, h('i', { class: 'in', style: `width:${r.actIncome / max * 100}%` }), h('i', { class: 'out', style: `width:${r.actCost / max * 100}%` })),
      h('b', { class: buCls(r.actBalance) }, r.has ? buSigned(r.actBalance) : '—')))),
    h('p', { class: 'fine' }, 'Green bars are income, the other bars are spending. Tap a month to open it.')];
}

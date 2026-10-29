'use strict';
/* Budget: the pure maths for a personal monthly budget, laid out like the familiar spreadsheet.
   Every line has a projected cost (what you plan) and an actual cost (what happened). Difference is projected minus actual,
   so a positive difference means you came in under. Money is whole cents; a blank is null. No page here. */
const BudgetCore = (() => {
  const MAX_CATS = 40, MAX_LINES = 60;
  const rid = () => Math.random().toString(36).slice(2, 10);
  const DEFAULT_INCOME = ['Income 1', 'Extra income'];
  const DEFAULT_CATEGORIES = [
    ['Housing', ['Mortgage or rent', 'Phone', 'Electricity', 'Gas', 'Water and sewer', 'Cable', 'Waste removal', 'Maintenance or repairs', 'Supplies', 'Other']],
    ['Transportation', ['Vehicle payment', 'Bus/taxi fare', 'Insurance', 'Licensing', 'Fuel', 'Maintenance', 'Other']],
    ['Insurance', ['Home', 'Health', 'Life', 'Other']],
    ['Food', ['Groceries', 'Dining out', 'Other']],
    ['Pets', ['Food', 'Medical', 'Grooming', 'Toys', 'Other']],
    ['Personal care', ['Medical', 'Hair/nails', 'Clothing', 'Dry cleaning', 'Health club', 'Organization dues or fees', 'Other']],
    ['Entertainment', ['Video/DVD', 'CDs', 'Movies', 'Concerts', 'Sporting events', 'Live theater', 'Other']],
    ['Loans', ['Personal', 'Student', 'Credit card', 'Credit card', 'Credit card', 'Other']],
    ['Taxes', ['Federal', 'State', 'Local', 'Other']],
    ['Savings or investments', ['Retirement account', 'Investment account', 'Other']],
    ['Gifts and donations', ['Charity 1', 'Charity 2', 'Charity 3']],
    ['Legal', ['Attorney', 'Alimony', 'Payments on lien or judgment', 'Other']],
  ];
  const line = name => ({ id: rid(), name, proj: null, act: null });
  const template = () => ({ income: DEFAULT_INCOME.map(line), cats: DEFAULT_CATEGORIES.map(([name, lines]) => ({ id: rid(), name, lines: lines.map(line) })) });

  const cents = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : Math.max(-1e12, Math.min(1e12, Math.round(+v)));
  const text = (v, d) => (typeof v === 'string' ? v : d).slice(0, 60);
  const normLine = l => ({ id: typeof (l && l.id) === 'string' && l.id ? l.id.slice(0, 24) : rid(), name: text(l && l.name, ''), proj: cents(l && l.proj), act: cents(l && l.act) });
  // Make anything stored or imported safe to use
  const norm = raw => {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
      income: (Array.isArray(r.income) ? r.income : []).slice(0, MAX_LINES).map(normLine),
      cats: (Array.isArray(r.cats) ? r.cats : []).slice(0, MAX_CATS).map(c => ({ id: typeof (c && c.id) === 'string' && c.id ? c.id.slice(0, 24) : rid(), name: text(c && c.name, ''), lines: (Array.isArray(c && c.lines) ? c.lines : []).slice(0, MAX_LINES).map(normLine) })),
    };
  };

  /* ---------- the sums ---------- */
  const n = v => v || 0;
  const sumBy = (lines, k) => lines.reduce((a, l) => a + n(l[k]), 0);
  const diff = l => n(l.proj) - n(l.act);                         // projected minus actual
  const totals = lines => { const proj = sumBy(lines, 'proj'), act = sumBy(lines, 'act'); return { proj, act, diff: proj - act }; };
  const summary = m => {
    const inc = totals(m.income), costs = m.cats.map(c => totals(c.lines));
    const projCost = costs.reduce((a, c) => a + c.proj, 0), actCost = costs.reduce((a, c) => a + c.act, 0);
    const projBalance = inc.proj - projCost, actBalance = inc.act - actCost;
    return { projIncome: inc.proj, actIncome: inc.act, incomeDiff: inc.act - inc.proj, projCost, actCost, costDiff: projCost - actCost, projBalance, actBalance, balanceDiff: actBalance - projBalance };
  };
  // how a line is doing, for colour: under / over / on / none  (nothing planned or spent yet is "none")
  const status = l => { if (l.proj === null && l.act === null) return 'none'; const d = diff(l); return d > 0 ? 'under' : d < 0 ? 'over' : 'on'; };
  const hasData = m => m.income.some(l => l.proj !== null || l.act !== null) || m.cats.some(c => c.lines.some(l => l.proj !== null || l.act !== null));

  /* ---------- editing (each returns a new month) ---------- */
  const mapLine = (m, id, fn) => ({ income: m.income.map(l => l.id === id ? fn(l) : l), cats: m.cats.map(c => ({ ...c, lines: c.lines.map(l => l.id === id ? fn(l) : l) })) });
  const setLine = (m, id, patch) => mapLine(m, id, l => normLine({ ...l, ...patch }));
  const addLine = (m, catId, name = '') => catId === 'income'
    ? (m.income.length >= MAX_LINES ? m : { ...m, income: [...m.income, line(name)] })
    : { ...m, cats: m.cats.map(c => c.id === catId && c.lines.length < MAX_LINES ? { ...c, lines: [...c.lines, line(name)] } : c) };
  const removeLine = (m, id) => ({ income: m.income.filter(l => l.id !== id), cats: m.cats.map(c => ({ ...c, lines: c.lines.filter(l => l.id !== id) })) });
  const addCategory = (m, name) => m.cats.length >= MAX_CATS ? m : { ...m, cats: [...m.cats, { id: rid(), name: text(name, 'New category') || 'New category', lines: [line('Other')] }] };
  const renameCategory = (m, id, name) => ({ ...m, cats: m.cats.map(c => c.id === id ? { ...c, name: text(name, c.name) } : c) });
  const removeCategory = (m, id) => ({ ...m, cats: m.cats.filter(c => c.id !== id) });
  const moveCategory = (m, id, d) => { const i = m.cats.findIndex(c => c.id === id), j = i + d; if (i < 0 || j < 0 || j >= m.cats.length) return m; const cats = [...m.cats]; [cats[i], cats[j]] = [cats[j], cats[i]]; return { ...m, cats }; };
  // next month: the same lines and plan; actuals start empty
  const carryOver = (m, { keepActual = false } = {}) => { const f = l => ({ id: rid(), name: l.name, proj: l.proj, act: keepActual ? l.act : null }); return { income: m.income.map(f), cats: m.cats.map(c => ({ id: rid(), name: c.name, lines: c.lines.map(f) })) }; };

  /* ---------- months and years ---------- */
  const monthKey = (y, m1) => `${y}-${String(m1).padStart(2, '0')}`;
  const validMonth = k => /^\d{4}-(0[1-9]|1[0-2])$/.test(k || '');
  const shift = (ym, d) => { const [y, m] = ym.split('-').map(Number), t = (y * 12 + m - 1) + d; return monthKey(Math.floor(t / 12), t % 12 + 1); };
  // the latest budget before this month, to copy from
  const previous = (records, ym) => records.filter(r => validMonth(r.month) && r.month < ym).sort((a, b) => b.month.localeCompare(a.month))[0] || null;
  const yearRows = (records, year) => Array.from({ length: 12 }, (_, i) => { const key = monthKey(year, i + 1), r = records.find(x => x.month === key); return { month: key, has: !!(r && hasData(norm(r))), ...(r ? summary(norm(r)) : summary({ income: [], cats: [] })) }; });
  const yearTotals = rows => rows.reduce((a, r) => ({ actIncome: a.actIncome + r.actIncome, actCost: a.actCost + r.actCost, projIncome: a.projIncome + r.projIncome, projCost: a.projCost + r.projCost }), { actIncome: 0, actCost: 0, projIncome: 0, projCost: 0 });

  /* ---------- CSV, laid out like the spreadsheet ---------- */
  const fmt = c => c === null ? '' : (c / 100).toFixed(2);
  const rowsFor = (m, label) => {
    const out = [['Personal Monthly Budget', label], []]; const s = summary(m);
    out.push(['INCOME', 'Projected', 'Actual', 'Difference (actual minus projected)']);
    const blank = l => l.proj === null && l.act === null;
    for (const l of m.income) out.push([l.name, fmt(l.proj), fmt(l.act), blank(l) ? '' : fmt(n(l.act) - n(l.proj))]);
    out.push(['Total income', fmt(s.projIncome), fmt(s.actIncome), fmt(s.incomeDiff)], []);
    for (const c of m.cats) {
      const t = totals(c.lines); out.push([c.name.toUpperCase(), 'Projected Cost', 'Actual Cost', 'Difference']);
      for (const l of c.lines) out.push([l.name, fmt(l.proj), fmt(l.act), blank(l) ? '' : fmt(diff(l))]);
      out.push(['Total', fmt(t.proj), fmt(t.act), fmt(t.diff)], []);
    }
    out.push(['TOTAL COST', fmt(s.projCost), fmt(s.actCost), fmt(s.costDiff)], ['BALANCE (income minus cost)', fmt(s.projBalance), fmt(s.actBalance), fmt(s.balanceDiff)]);
    return out;
  };

  return { MAX_CATS, MAX_LINES, DEFAULT_CATEGORIES, template, norm, totals, summary, diff, status, hasData, setLine, addLine, removeLine, addCategory, renameCategory, removeCategory, moveCategory, carryOver, monthKey, validMonth, shift, previous, yearRows, yearTotals, rowsFor };
})();
if (typeof module !== 'undefined') module.exports = BudgetCore;

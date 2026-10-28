'use strict';
/* Apps: small tools that work with no network, in the spirit of being anti-social productively.
   Calendar, calculator, banking (receipts and math), notes and a diary.

   Everything is stored as records beside your posts, so it follows the account, counts toward the
   storage limit, and is encrypted with the passcode when there is one. This first half is plain logic
   with no screen in it, so it can be tested on its own. */
const AppsCore = (() => {
  /* ---------- dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '') && dateKey(parseKey(k)) === k;
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
  const dim = (y, m0) => new Date(y, m0 + 1, 0).getDate();
  const diffDays = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 86400000);

  // Six weeks of cells covering a month. weekStart: 0 = Sunday, 1 = Monday.
  function monthGrid(y, m0, weekStart = 0) {
    const offset = (new Date(y, m0, 1).getDay() - weekStart + 7) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(y, m0, 1 - offset + i);
      return { key: dateKey(d), inMonth: d.getMonth() === m0, day: d.getDate() };
    });
  }

  // Does this event land on that day? Repeats start on the event's own date.
  function occursOn(ev, key) {
    if (!ev || !isKey(ev.date) || !isKey(key) || key < ev.date) return false;
    const rep = ev.repeat || 'none';
    if (rep === 'none') return key === ev.date;
    if (rep === 'weekly') return diffDays(key, ev.date) % 7 === 0;
    const e = parseKey(ev.date), k = parseKey(key);
    if (rep === 'monthly') return k.getDate() === Math.min(e.getDate(), dim(k.getFullYear(), k.getMonth()));
    if (rep === 'yearly') return e.getMonth() === k.getMonth() && k.getDate() === Math.min(e.getDate(), dim(k.getFullYear(), k.getMonth()));
    return false;
  }
  const eventsOn = (events, key) => events.filter(e => occursOn(e, key))
    .sort((a, b) => (a.time || '').localeCompare(b.time || '') || String(a.title).localeCompare(String(b.title)));
  function upcoming(events, fromKey, days = 14, limit = 6) {
    const out = [];
    for (let i = 0; i <= days && out.length < limit; i++) {
      const key = addDays(fromKey, i);
      for (const ev of eventsOn(events, key)) { if (out.length < limit) out.push({ key, ev }); }
    }
    return out;
  }

  /* ---------- diary ---------- */
  const MOODS = [
    { id: 'great', label: 'Great', color: '#10b981' },
    { id: 'good', label: 'Good', color: '#84cc16' },
    { id: 'okay', label: 'Okay', color: '#f59e0b' },
    { id: 'low', label: 'Low', color: '#f97316' },
    { id: 'rough', label: 'Rough', color: '#ef4444' },
  ];
  const PROMPTS = [
    'What made today feel like today?', 'One small thing that went fine.', 'What are you quietly proud of?',
    'What is on your mind that nobody asked about?', 'Describe the weather inside your head.', 'Something you noticed on the way.',
    'What would you tell yesterday-you?', 'What did you eat, and was it good?', 'Who crossed your mind today?',
    'What are you putting off, and why?', 'A thing that made you laugh.', 'What do you need more of? Less of?',
    'Write down one thing you want to remember.', 'What would a good tomorrow look like?',
  ];
  const promptFor = key => PROMPTS[Math.abs([...key].reduce((a, c) => a + c.charCodeAt(0), 0)) % PROMPTS.length];
  // Consecutive days with an entry, ending today (or yesterday if today is still blank).
  function streak(dates, todayKey) {
    let k = dates.has(todayKey) ? todayKey : addDays(todayKey, -1), n = 0;
    while (dates.has(k)) { n++; k = addDays(k, -1); }
    return n;
  }

  /* ---------- money (always whole hundredths, never floats) ---------- */
  const CATEGORIES = ['Groceries', 'Dining', 'Transport', 'Home', 'Bills', 'Health', 'Fun', 'Shopping', 'Travel', 'Other'];
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'SEK', 'NOK', 'DKK', 'NZD', 'KRW', 'PLN', 'ZAR', 'SGD', 'HKD'];
  function parseMoney(str) {
    const s = String(str ?? '').trim().replace(/[\s,$€£¥₹]/g, '');
    const m = /^(-)?(\d+)?(?:\.(\d{1,2}))?$/.exec(s);
    if (!m || (m[2] === undefined && m[3] === undefined)) return null;
    const cents = Number(m[2] || 0) * 100 + Number((m[3] || '').padEnd(2, '0'));
    if (!Number.isSafeInteger(cents) || cents > 1e13) return null;
    return m[1] ? -cents : cents;
  }
  function fmtMoney(cents, currency = 'USD', locale) {
    try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100); }
    catch { return (cents / 100).toFixed(2) + ' ' + currency; }
  }
  const sum = a => a.reduce((x, y) => x + y, 0);
  const balance = (startCents, txns) => (startCents || 0) + sum(txns.map(t => t.cents));
  function summarize(txns, ym) {
    const m = txns.filter(t => String(t.date).startsWith(ym));
    const income = sum(m.filter(t => t.cents > 0).map(t => t.cents));
    const spending = -sum(m.filter(t => t.cents < 0).map(t => t.cents));
    const by = {};
    for (const t of m) if (t.cents < 0) by[t.category || 'Other'] = (by[t.category || 'Other'] || 0) - t.cents;
    return { income, spending, net: income - spending, count: m.length, byCategory: Object.entries(by).map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents) };
  }

  /* ---------- everyday money math ---------- */
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const tipSplit = (bill, tipPct, people) => { const total = bill * (1 + tipPct / 100), n = Math.max(1, Math.floor(people) || 1); return { tip: r2(bill * tipPct / 100), total: r2(total), each: r2(total / n) }; };
  const taxDiscount = (price, taxPct, discPct) => { const after = price * (1 - discPct / 100), tax = after * taxPct / 100; return { saved: r2(price - after), after: r2(after), tax: r2(tax), total: r2(after + tax) }; };
  const percentChange = (a, b) => a === 0 ? null : (b - a) / Math.abs(a) * 100;
  function loanPayment(principal, aprPct, years) {
    const n = Math.round(years * 12);
    if (!(principal > 0) || !(n > 0)) return { monthly: 0, total: 0, interest: 0 };
    const r = aprPct / 1200;
    const monthly = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
    return { monthly: r2(monthly), total: r2(monthly * n), interest: r2(monthly * n - principal) };
  }
  function growth(start, monthly, aprPct, years) {
    const n = Math.round(years * 12), r = aprPct / 1200;
    let bal = start;
    for (let i = 0; i < n; i++) bal = bal * (1 + r) + monthly;
    const contributed = start + monthly * n;
    return { final: r2(bal), contributed: r2(contributed), interest: r2(bal - contributed) };
  }

  /* ---------- household inventory ---------- */
  const ASSET_CATEGORIES = ['Appliances', 'Electronics', 'Furniture', 'Tools', 'Decor', 'Kitchenware', 'Clothing', 'Sports', 'Jewelry', 'Books and media', 'Other'];
  const ROOMS = ['Kitchen', 'Living room', 'Bedroom', 'Bathroom', 'Office', 'Garage', 'Basement', 'Outdoors', 'Storage', 'Other'];
  const unitsOf = it => Math.max(1, Math.floor(Number(it.qty) || 1));
  // What one unit is worth today. A value you typed wins. Otherwise a straight-line guess from age and
  // useful life if you gave both, otherwise what you paid.
  function unitValue(it, todayKey) {
    if (Number.isSafeInteger(it.valueCents) && it.valueCents >= 0) return it.valueCents;
    if (it.lifeYears > 0 && isKey(it.date) && isKey(todayKey)) {
      const age = Math.max(0, diffDays(todayKey, it.date)) / 365.25;
      return Math.round(it.cents * Math.max(0, 1 - age / it.lifeYears));
    }
    return it.cents || 0;
  }
  const paidOf = it => (it.cents || 0) * unitsOf(it);
  const worthOf = (it, todayKey) => unitValue(it, todayKey) * unitsOf(it);
  const assetTotals = (items, todayKey) => ({ lines: items.length, units: sum(items.map(unitsOf)), paid: sum(items.map(paidOf)), worth: sum(items.map(i => worthOf(i, todayKey))) });
  function groupTotals(items, field, todayKey) {
    const by = {};
    for (const it of items) {
      const k = (it[field] || '').trim() || 'Unsorted';
      const g = by[k] || (by[k] = { key: k, paid: 0, worth: 0, units: 0, lines: 0 });
      g.paid += paidOf(it); g.worth += worthOf(it, todayKey); g.units += unitsOf(it); g.lines++;
    }
    return Object.values(by).sort((a, b) => b.paid - a.paid || a.key.localeCompare(b.key));
  }
  // Warranties that end soon (or already ended), soonest first.
  function warranties(items, todayKey, days = 90) {
    const soon = [], ended = [];
    for (const it of items) {
      if (!isKey(it.warrantyEnd)) continue;
      const left = diffDays(it.warrantyEnd, todayKey);
      if (left < 0) ended.push({ it, left }); else if (left <= days) soon.push({ it, left });
    }
    return { soon: soon.sort((a, b) => a.left - b.left), ended: ended.sort((a, b) => b.left - a.left) };
  }

  /* ---------- csv (for exporting your own receipts) ---------- */
  const csvCell = v => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;     // stop spreadsheet formulas
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const toCsv = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

  /* ---------- groceries ---------- */
  const AISLES = ['Produce', 'Dairy and eggs', 'Meat and fish', 'Bakery', 'Pantry', 'Frozen', 'Drinks', 'Snacks', 'Household', 'Health and beauty', 'Other'];
  const AISLE_WORDS = {
    'Produce': ['apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berr', 'strawberr', 'blueberr', 'raspberr', 'blackberr', 'cranberr', 'avocado', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'lettuce', 'spinach', 'kale', 'cucumber', 'pepper', 'broccoli', 'cauliflower', 'celery', 'mushroom', 'corn', 'zucchini', 'squash', 'pear', 'peach', 'melon', 'mango', 'pineapple', 'pea', 'cilantro', 'parsley', 'basil', 'ginger', 'cabbage', 'salad', 'herbs', 'plum', 'cherr', 'asparagus', 'beet', 'radish', 'leek', 'pumpkin'],
    'Dairy and eggs': ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'margarine', 'cottage', 'kefir'],
    'Meat and fish': ['chicken', 'beef', 'pork', 'bacon', 'sausage', 'ham', 'turkey', 'steak', 'mince', 'salmon', 'tuna', 'fish', 'shrimp', 'prawn', 'lamb', 'cod', 'meatball', 'hot dog'],
    'Bakery': ['bread', 'bagel', 'bun', 'roll', 'tortilla', 'croissant', 'muffin', 'cake', 'pita', 'baguette', 'donut', 'doughnut', 'sourdough'],
    'Pantry': ['rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'vinegar', 'sauce', 'beans', 'lentil', 'cereal', 'oats', 'spice', 'honey', 'jam', 'peanut butter', 'soup', 'stock', 'broth', 'noodle', 'canned', 'nuts', 'syrup', 'ketchup', 'mustard', 'mayo', 'baking', 'yeast', 'chickpea', 'tinned', 'salsa', 'olive'],
    'Frozen': ['frozen', 'ice cream', 'fries', 'popsicle', 'gelato', 'sorbet'],
    'Drinks': ['water', 'juice', 'soda', 'cola', 'beer', 'wine', 'coffee', 'tea', 'sparkling', 'lemonade', 'whiskey', 'vodka', 'kombucha', 'cider', 'energy drink'],
    'Snacks': ['chip', 'cracker', 'cookie', 'chocolate', 'candy', 'popcorn', 'pretzel', 'granola', 'biscuit', 'gum', 'jerky', 'snack'],
    'Household': ['paper towel', 'toilet paper', 'tissue', 'detergent', 'soap', 'sponge', 'trash bag', 'bin liner', 'foil', 'cling', 'bleach', 'cleaner', 'battery', 'batteries', 'light bulb', 'candle', 'laundry', 'dish', 'napkin', 'garbage bag', 'ziploc', 'wrap'],
    'Health and beauty': ['shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'razor', 'lotion', 'vitamin', 'medicine', 'bandage', 'floss', 'sunscreen', 'tampon', 'pad', 'aspirin', 'ibuprofen', 'cough'],
  };
  const AISLE_INDEX = Object.entries(AISLE_WORDS).flatMap(([aisle, words]) => words.map(w => [w, aisle])).sort((a, b) => b[0].length - a[0].length);
  // The name of the thing is usually its last word ("orange juice" is juice, "potato chips" are chips,
  // "tomato sauce" is sauce). So: a known two-word phrase first, then the last word, then any word in
  // the name, with longer keywords beating shorter ones ("peanut butter" is pantry, plain "butter" is dairy).
  const WORD_HIT = (kw, text) => new RegExp('[ ]' + kw.replace(/ /g, '[ ]')).test(text);
  function guessAisle(name) {
    const words = String(name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) return 'Other';
    // Words like these decide the aisle no matter what follows: frozen peas, canned tomatoes.
    if (words.includes('frozen')) return 'Frozen';
    if (words.includes('canned') || words.includes('tinned')) return 'Pantry';
    const phrase = ' ' + words.slice(-2).join(' '), last = ' ' + words[words.length - 1], all = ' ' + words.join(' ');
    if (words.length > 1) for (const [w, aisle] of AISLE_INDEX) if (w.includes(' ') && WORD_HIT(w, phrase)) return aisle;
    for (const [w, aisle] of AISLE_INDEX) if (!w.includes(' ') && WORD_HIT(w, last)) return aisle;
    for (const [w, aisle] of AISLE_INDEX) if (WORD_HIT(w, all)) return aisle;
    return 'Other';
  }
  const UNITS = ['lb', 'lbs', 'kg', 'g', 'oz', 'l', 'ml', 'dozen', 'pack', 'packs', 'bag', 'bags', 'can', 'cans', 'box', 'boxes', 'bottle', 'bottles', 'jar', 'jars', 'loaf', 'loaves', 'bunch', 'bunches', 'pint', 'quart', 'gallon', 'carton', 'tub', 'tubs'];
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  // "2 apples", "3x eggs", "milk x2", "2 lb apples", "1 dozen eggs", "bread"
  function parseQuickAdd(text) {
    let t = String(text ?? '').trim().replace(/\s+/g, ' '), qty = 1, unit = '', m;
    if (!t) return null;
    if ((m = /^(\d+(?:\.\d+)?)\s*[x×]\s+(.+)$/i.exec(t)) || (m = /^(\d+(?:\.\d+)?)[x×](.+)$/i.exec(t))) { qty = Number(m[1]); t = m[2]; }
    else if ((m = /^(.+?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i.exec(t))) { qty = Number(m[2]); t = m[1]; }
    else if ((m = /^(\d+(?:\.\d+)?)\s*([a-z]+)\s+(.+)$/i.exec(t)) && UNITS.includes(m[2].toLowerCase())) { qty = Number(m[1]); unit = m[2].toLowerCase(); t = m[3]; }
    else if ((m = /^(\d+(?:\.\d+)?)\s+(.+)$/.exec(t))) { qty = Number(m[1]); t = m[2]; }
    t = t.trim();
    if (!t || !(qty > 0) || qty > 999) { qty = 1; unit = ''; t = String(text).trim().replace(/\s+/g, ' '); }
    return { name: cap1(t), qty, unit };
  }
  const groceryTotal = items => sum(items.filter(i => Number.isSafeInteger(i.priceCents)).map(i => Math.round(i.priceCents * (Number(i.qty) || 1))));
  const qtyText = i => { const q = Number(i.qty) || 1; return (q === 1 && !i.unit ? '' : `${q}${i.unit ? ' ' + i.unit : ''}`); };
  // The still-to-buy items as plain text, grouped by aisle, ready to paste into a message.
  function groceryText(items, title = 'Groceries') {
    const need = items.filter(i => !i.checked);
    const out = [title];
    for (const aisle of AISLES) {
      const here = need.filter(i => (i.aisle || 'Other') === aisle).sort((a, b) => a.name.localeCompare(b.name));
      if (here.length) { out.push('', aisle); for (const i of here) out.push(`- ${qtyText(i) ? qtyText(i) + ' ' : ''}${i.name}`); }
    }
    return out.join('\n') + '\n';
  }

  /* ---------- chores ---------- */
  const REPEATS = [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'], ['yearly', 'Every year'], ['days', 'Every N days']];
  // Adds months but keeps landing on the right day: the 31st becomes the 28th, then back to the 31st.
  function addMonths(key, n, anchorDay) {
    const d = parseKey(key), day = anchorDay || d.getDate();
    const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    t.setDate(Math.min(day, dim(t.getFullYear(), t.getMonth())));
    return dateKey(t);
  }
  function stepDue(key, ch) {
    switch (ch.repeat) {
      case 'daily': return addDays(key, 1);
      case 'weekly': return addDays(key, 7);
      case 'biweekly': return addDays(key, 14);
      case 'monthly': return addMonths(key, 1, ch.anchorDay);
      case 'yearly': return addMonths(key, 12, ch.anchorDay);
      case 'days': return addDays(key, Math.max(1, Math.floor(Number(ch.everyDays)) || 1));
      default: return null;
    }
  }
  // The next due date after finishing a chore on doneKey, or null if it does not repeat.
  // It is never left sitting in the past, even if you were weeks late.
  function nextDue(ch, doneKey) {
    if (!ch.repeat || ch.repeat === 'none') return null;
    let next = stepDue(ch.repeatFrom === 'done' || !isKey(ch.due) ? doneKey : ch.due, ch), guard = 0;
    while (next && next <= doneKey && guard++ < 2000) next = stepDue(next, ch);
    return next;
  }
  function choreStatus(ch, today) {
    if (!isKey(ch.due)) return 'none';
    const d = diffDays(ch.due, today);
    return d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 7 ? 'soon' : 'later';
  }
  function dueLabel(ch, today) {
    if (!isKey(ch.due)) return 'No due date';
    const d = diffDays(ch.due, today);
    if (d < 0) return d === -1 ? 'Overdue by 1 day' : `Overdue by ${-d} days`;
    if (d === 0) return 'Due today';
    if (d === 1) return 'Due tomorrow';
    if (d <= 7) return `Due in ${d} days`;
    return 'Due ' + parseKey(ch.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const repeatLabel = ch => ch.repeat === 'days' ? `Every ${Math.max(1, Math.floor(Number(ch.everyDays)) || 1)} days` : (REPEATS.find(r => r[0] === (ch.repeat || 'none')) || REPEATS[0])[1];
  const choreSort = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title);
  function choreStats(done, ym) {
    const by = {};
    for (const d of done) if (String(d.date).startsWith(ym)) { const k = (d.who || '').trim() || 'Anyone'; by[k] = (by[k] || 0) + 1; }
    return Object.entries(by).map(([who, count]) => ({ who, count })).sort((a, b) => b.count - a.count || a.who.localeCompare(b.who));
  }

  /* ---------- the order of the apps on the launcher ---------- */
  // Your saved order wins. Apps that do not exist any more are ignored, repeats are dropped, and
  // anything new (an app added in a later version) is placed at the end in its usual order.
  function orderApps(defaults, saved) {
    const out = [], seen = new Set();
    for (const id of Array.isArray(saved) ? saved : []) if (defaults.includes(id) && !seen.has(id)) { seen.add(id); out.push(id); }
    for (const id of defaults) if (!seen.has(id)) out.push(id);
    return out;
  }
  // Move one id earlier (-1) or later (+1), stopping at the ends.
  function moveId(list, id, delta) {
    const i = list.indexOf(id), j = Math.max(0, Math.min(list.length - 1, i + delta));
    if (i < 0 || i === j) return [...list];
    const out = [...list]; out.splice(i, 1); out.splice(j, 0, id);
    return out;
  }
  // Where to drop a dragged card, given the pointer and the other cards' boxes: next to the nearest one.
  // rects: [{id, left, top, width, height}]. Returns {id, before} or null.
  function dropTarget(rects, x, y) {
    let best = null, bd = Infinity;
    for (const r of rects) { const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)); if (d < bd) { bd = d; best = r; } }
    if (!best) return null;
    const cy = best.top + best.height / 2, cx = best.left + best.width / 2, band = best.height * 0.25;
    return { id: best.id, before: y < cy - band || (Math.abs(y - cy) <= band && x < cx) };
  }

  /* ---------- calculator: a real parser, no eval ---------- */
  function fmtNum(x) {
    if (!Number.isFinite(x)) return 'Error';
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-9) return x.toExponential(8).replace(/\.?0+e/, 'e').replace('e+', 'e');
    return String(parseFloat(x.toPrecision(12)));
  }
  function tokenize(src) {
    const s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/√/g, 'sqrt').replace(/π/g, 'pi').toLowerCase();
    const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)|([a-z]+)|(.))/y;
    const out = [];
    for (let m; re.lastIndex < s.length && (m = re.exec(s));) {
      if (m[1] !== undefined) out.push({ t: 'num', v: parseFloat(m[1]) });
      else if (m[2]) out.push({ t: 'id', v: m[2] });
      else if (m[3] !== undefined && m[3].trim()) {
        if (!'+-*/^()%!'.includes(m[3])) throw new Error('syntax');
        out.push({ t: 'op', v: m[3] });
      }
    }
    return out;
  }
  const clean = x => Math.abs(x) < 1e-12 ? 0 : x;
  function evaluate(src, opts = {}) {
    const deg = opts.degrees !== false, ans = Number.isFinite(opts.ans) ? opts.ans : 0;
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p], isOp = (t, v) => t && t.t === 'op' && t.v === v;
    const fn = {
      sin: x => clean(Math.sin(deg ? x * Math.PI / 180 : x)), cos: x => clean(Math.cos(deg ? x * Math.PI / 180 : x)),
      tan: x => { if (deg ? ((x % 180) + 180) % 180 === 90 : Math.abs(Math.cos(x)) < 1e-15) throw new Error('domain'); return clean(Math.tan(deg ? x * Math.PI / 180 : x)); },
      asin: x => { if (Math.abs(x) > 1) throw new Error('domain'); const r = Math.asin(x); return deg ? r * 180 / Math.PI : r; },
      acos: x => { if (Math.abs(x) > 1) throw new Error('domain'); const r = Math.acos(x); return deg ? r * 180 / Math.PI : r; },
      atan: x => { const r = Math.atan(x); return deg ? r * 180 / Math.PI : r; },
      sqrt: x => { if (x < 0) throw new Error('domain'); return Math.sqrt(x); }, cbrt: Math.cbrt,
      ln: x => { if (x <= 0) throw new Error('domain'); return Math.log(x); }, log: x => { if (x <= 0) throw new Error('domain'); return Math.log10(x); },
      exp: Math.exp, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
    };
    const startsPrimary = t => t && (t.t === 'num' || t.t === 'id' || isOp(t, '('));
    function expr() {
      let left = term();
      while (isOp(peek(), '+') || isOp(peek(), '-')) {
        const op = toks[p++].v, r = term();
        const delta = r.pct ? left.v * r.v : r.v;          // 50 + 10% is 55
        left = { v: op === '+' ? left.v + delta : left.v - delta, pct: false };
      }
      return left;
    }
    function term() {
      let left = unary();
      for (;;) {
        const t = peek();
        if (isOp(t, '*') || isOp(t, '/')) {
          p++;
          const r = unary();
          if (t.v === '/') { if (r.v === 0) throw new Error('div0'); left = { v: left.v / r.v, pct: false }; }
          else left = { v: left.v * r.v, pct: false };
        } else if (startsPrimary(t)) { left = { v: left.v * unary().v, pct: false }; }   // 2(3+4), 2pi
        else break;
      }
      return left;
    }
    function unary() {
      const t = peek();
      if (isOp(t, '-') || isOp(t, '+')) { p++; const x = unary(); return { v: t.v === '-' ? -x.v : x.v, pct: false }; }
      return power();
    }
    function power() {
      const base = postfix();
      if (isOp(peek(), '^')) { p++; return { v: Math.pow(base.v, unary().v), pct: false }; }
      return base;
    }
    function postfix() {
      let x = primary();
      for (;;) {
        if (isOp(peek(), '!')) {
          p++;
          if (!Number.isInteger(x.v) || x.v < 0 || x.v > 170) throw new Error('domain');
          let f = 1; for (let i = 2; i <= x.v; i++) f *= i;
          x = { v: f, pct: false };
        } else if (isOp(peek(), '%')) { p++; x = { v: x.v / 100, pct: true }; }
        else return x;
      }
    }
    function closeParen() { if (isOp(peek(), ')')) p++; else if (p < toks.length) throw new Error('syntax'); }   // a missing ) at the end is fine
    function primary() {
      const t = toks[p++];
      if (!t) throw new Error('syntax');
      if (t.t === 'num') return { v: t.v, pct: false };
      if (isOp(t, '(')) { const x = expr(); closeParen(); return { v: x.v, pct: false }; }
      if (t.t === 'id') {
        if (t.v === 'pi') return { v: Math.PI, pct: false };
        if (t.v === 'e') return { v: Math.E, pct: false };
        if (t.v === 'ans') return { v: ans, pct: false };
        if (fn[t.v]) {
          let arg;
          if (isOp(peek(), '(')) { p++; arg = expr(); closeParen(); } else arg = unary();
          return { v: fn[t.v](arg.v), pct: false };
        }
      }
      throw new Error('syntax');
    }
    if (!toks.length) throw new Error('syntax');
    const r = expr();
    if (p < toks.length) throw new Error('syntax');
    if (!Number.isFinite(r.v)) throw new Error('domain');
    return r.v;
  }
  const calcError = e => e && e.message === 'div0' ? "Can't divide by zero" : e && e.message === 'domain' ? 'That has no answer' : 'Check the expression';

  return {
    dateKey, parseKey, isKey, addDays, dim, diffDays, monthGrid, occursOn, eventsOn, upcoming,
    MOODS, PROMPTS, promptFor, streak,
    CATEGORIES, CURRENCIES, parseMoney, fmtMoney, sum, balance, summarize,
    r2, tipSplit, taxDiscount, percentChange, loanPayment, growth, csvCell, toCsv,
    ASSET_CATEGORIES, ROOMS, unitsOf, unitValue, paidOf, worthOf, assetTotals, groupTotals, warranties,
    orderApps, moveId, dropTarget,
    AISLES, guessAisle, parseQuickAdd, groceryTotal, qtyText, groceryText,
    REPEATS, addMonths, stepDue, nextDue, choreStatus, dueLabel, repeatLabel, choreSort, choreStats,
    fmtNum, evaluate, calcError,
  };
})();
if (typeof module !== 'undefined') module.exports = AppsCore;

/* ======================================================================
   Screens. These use the app's own helpers (h, icon, topbar, savePost, ...).
   ====================================================================== */
const AC = AppsCore;
const todayKey = () => AC.dateKey(new Date());
const longDate = k => AC.parseKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const shortDate = k => AC.parseKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const monthTitle = (y, m0) => new Date(y, m0, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const ymOf = k => k.slice(0, 7);
const validId = id => /^[a-z0-9]{6,24}$/.test(id || '');

// Saves a record beside your posts, respecting the storage limit. Returns true if it was saved.
async function appSave(acct, rec) {
  const info = await storageInfo();
  if (info && info.usage >= storageCap()) { toast(`You have reached your storage limit of ${fmtMB(storageCap())}. Raise it in Settings or delete something.`); return false; }
  try { await savePost(acct, rec); return true; }
  catch (e) { console.error(e); toast(isQuotaError(e) ? 'Out of space, so that was not saved.' : 'That could not be saved.'); return false; }
}
const appDelete = id => db.del('posts', id);
function autosaver(statusEl, saveFn) {
  let t;
  return () => { statusEl.textContent = 'Saving...'; clearTimeout(t); t = setTimeout(async () => { statusEl.textContent = (await saveFn()) ? 'Saved' : 'Not saved'; }, 450); };
}
const fieldEl = (label, el) => h('label', { class: 'field' }, h('span', {}, label), el);

/* ---------- the Apps screen ---------- */
const currencyNow = () => ls('as.currency') || (() => {
  const region = (navigator.language || 'en-US').split('-')[1] || 'US';
  return ({ GB: 'GBP', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', PT: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', IN: 'INR', MX: 'MXN', BR: 'BRL', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', ZA: 'ZAR', SG: 'SGD', HK: 'HKD', KR: 'KRW', CN: 'CNY' })[region] || 'USD';
})();
const money = cents => AC.fmtMoney(cents, currencyNow());

function appsHome(acct, ctx) {
  const A = ctx.apps, today = todayKey();
  const todayN = AC.eventsOn(A.event, today).length;
  const dset = new Set(A.diary.filter(d => (d.body || '').trim()).map(d => d.date));
  const st = AC.streak(dset, today);
  const total = A.acct.length ? AC.sum(A.acct.map(a => AC.balance(a.startCents, A.txn.filter(t => t.acctId === a.id)))) : null;
  const hidden = hiddenApps(acct);
  const cards = [
    ['calendar', 'calendar', 'Calendar', todayN ? `${plural(todayN, 'event')} today` : 'Nothing today'],
    ['calc', 'calc', 'Calculator', 'Plain and scientific'],
    ['bank', 'wallet', 'Banking', total === null ? 'Receipts and math, offline' : `Balance ${money(total)}`],
    ['inventory', 'box', 'Household', A.asset.length ? `${plural(AC.assetTotals(A.asset, today).units, 'thing')} · ${money(AC.assetTotals(A.asset, today).paid)}` : 'What you own, and what it cost'],
    ['groceries', 'cart', 'Groceries', (() => { const n = A.groc.filter(i => !i.archived && !i.checked).length; return n ? `${n} to buy` : 'Nothing to buy'; })()],
    ['chores', 'tasks', 'Chores', (() => { const act = A.chore.filter(c => !c.archived); if (!act.length) return 'No chores yet'; const d = act.filter(c => ['overdue', 'today'].includes(AC.choreStatus(c, today))).length; return d ? `${d} to do today` : 'All caught up'; })()],
    ['notes', 'notes', 'Notes', A.note.length ? plural(A.note.length, 'note') : 'Nothing written yet'],
    ['bible', 'scroll', 'Bible', A.bible.length ? plural(A.bible.length, 'Bible') + ' on this device' : 'Bring your own Bible'],
    ['diary', 'book', 'Diary', st ? `${plural(st, 'day')} in a row` : dset.size ? plural(dset.size, 'entry').replace('entrys', 'entries') : 'A page for today'],
    ['travel', 'globe', 'Travel Log', (() => { const t = TravelCore.stats(A.place); return t.places ? `${plural(t.places, 'place')} · ${plural(t.countries, 'country').replace('countrys', 'countries')}` : 'Mark where you have been'; })()],
    ['cookbook', 'pot', 'Cookbook', A.recipe.length ? `${plural(A.recipe.length, 'recipe')} of yours, plus the classics` : 'American favorites, then the world'],
  ];
  cards.splice(0, cards.length, ...cards.filter(c => !hidden.has(c[0])));
  // your own order (saved per account on this device), with anything new tacked on the end
  document.querySelectorAll('.app-drag-clone').forEach(x => x.remove());
  let saved = null;
  try { const v = JSON.parse(ls(appOrderKey(acct)) || 'null'); saved = Array.isArray(v) ? v : null; } catch { /* use the default */ }
  const order = AC.orderApps(cards.map(c => c[0]), saved);
  const sorted = order.map(id => cards.find(c => c[0] === id));
  const move = (id, delta) => {
    const next = AC.moveId(order, id, delta);
    ls(appOrderKey(acct), JSON.stringify(next));
    toast(`${appName(acct, id)} is now number ${next.indexOf(id) + 1} of ${next.length}.`);
    render(true).then(() => { const sel = `.move[data-for="${id}"][data-dir="${delta}"]`; (document.querySelector(sel + ':not([disabled])') || document.querySelector(`.move[data-for="${id}"]:not([disabled])`))?.focus(); });
  };
  const grid = h('div', { class: 'apps-grid' + (appsReorder ? ' reorder' : ''), role: 'list', 'aria-label': 'Apps' }, sorted.map(([id, ic, name, line], k) => {
    const inner = [h('span', { class: 'app-ico' }, icon(ic)), h('b', {}, appName(acct, id)), h('span', { class: 'muted' }, line)];
    if (!appsReorder) return h('a', { class: 'app-card', role: 'listitem', href: '#/apps/' + id, 'data-app': id, draggable: 'false' }, ...inner);
    return h('div', { class: 'app-card', role: 'listitem', 'data-app': id }, ...inner,
      h('div', { class: 'app-move' },
        h('button', { class: 'move', type: 'button', 'data-for': id, 'data-dir': '-1', 'aria-label': `Move ${appName(acct, id)} earlier`, disabled: k === 0, onclick: () => move(id, -1) }, icon('back')),
        h('span', { class: 'handle', 'aria-hidden': 'true', title: 'Drag me' }, icon('grid')),
        h('button', { class: 'move flip', type: 'button', 'data-for': id, 'data-dir': '1', 'aria-label': `Move ${appName(acct, id)} later`, disabled: k === sorted.length - 1, onclick: () => move(id, 1) }, icon('back'))));
  }));
  enableAppDrag(grid, acct);
  const custom = saved && order.join() !== cards.map(c => c[0]).join();
  return [
    topbar('Apps', { action: h('button', { class: 'btn' + (appsReorder ? ' primary' : ''), 'aria-pressed': String(appsReorder), onclick: () => { appsReorder = !appsReorder; render(true); } }, appsReorder ? 'Done' : 'Reorder') }),
    h('div', { class: 'apps-intro' }, 'If you are going to be anti-social, you might as well get something done. Everything here works offline, stays on this device, and is encrypted too if you use a passcode.',
      h('div', { class: 'fine', style: 'padding:6px 0 0' }, appsReorder ? 'Drag a card, or use the arrows, to put the apps in your order.' : 'Tip: drag any app to rearrange them (on a phone, touch and hold first).')),
    grid,
    appsReorder && custom ? h('div', { class: 'btnrow', style: 'padding:0 16px 16px' }, h('button', { class: 'btn', onclick: () => { ls(appOrderKey(acct), null); toast('Back to the original order.'); render(true); } }, 'Reset order')) : null,
  ];
}

/* ---- rearranging the launcher: drag with a mouse, or touch and hold on a phone ---- */
let appsReorder = false;
// Every app, for the Settings list that shows or hides them. The Bible starts hidden; turn it on if you want it.
const APP_LIST = [['calendar', 'Calendar'], ['calc', 'Calculator'], ['bank', 'Banking'], ['inventory', 'Household'], ['groceries', 'Groceries'], ['chores', 'Chores'], ['notes', 'Notes'], ['bible', 'Bible'], ['diary', 'Diary'], ['travel', 'Travel Log'], ['cookbook', 'Cookbook']];
const hiddenKey = acct => 'as.hiddenapps.' + acct.id;
// Every app can be given your own name (per account). An empty name means the original one.
const namesKey = acct => 'as.appnames.' + acct.id;
function customNames(acct) {
  try { const v = JSON.parse(ls(namesKey(acct)) || 'null'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
const defaultName = id => (APP_LIST.find(a => a[0] === id) || [id, id])[1];
const appName = (acct, id) => { const n = customNames(acct)[id]; return typeof n === 'string' && n.trim() ? n.trim().slice(0, 30) : defaultName(id); };
function setAppName(acct, id, name) {
  const all = customNames(acct), n = String(name || '').trim().slice(0, 30);
  if (n && n !== defaultName(id)) all[id] = n; else delete all[id];
  ls(namesKey(acct), Object.keys(all).length ? JSON.stringify(all) : null);
}
function hiddenApps(acct) {
  let v = null;
  try { v = JSON.parse(ls(hiddenKey(acct)) || 'null'); } catch { /* use the default */ }
  return new Set(Array.isArray(v) ? v.filter(x => typeof x === 'string') : ['bible']);
}
const appOrderKey = acct => 'as.apporder.' + acct.id;
function enableAppDrag(grid, acct) {
  let st = null, suppress = false;
  const cardsNow = () => [...grid.querySelectorAll('.app-card')];
  const cleanup = () => {
    if (st) { clearTimeout(st.timer); st.clone?.remove(); st.card.classList.remove('ghosted'); document.body.classList.remove('app-dragging'); }
    st = null;
    document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); document.removeEventListener('touchmove', onTouchMove);
  };
  const activate = () => {
    st.active = true;
    const r = st.card.getBoundingClientRect();
    st.offX = st.x - r.left; st.offY = st.y - r.top;
    st.clone = st.card.cloneNode(true); st.clone.classList.add('app-drag-clone'); st.clone.removeAttribute('href');
    Object.assign(st.clone.style, { width: r.width + 'px', height: r.height + 'px' });
    document.body.append(st.clone); st.card.classList.add('ghosted'); document.body.classList.add('app-dragging');
    try { navigator.vibrate?.(12); } catch { /* not supported */ }
    place();
  };
  const place = () => {
    st.clone.style.transform = `translate(${st.x - st.offX}px, ${st.y - st.offY}px) scale(1.04)`;
    const others = cardsNow().filter(c => c !== st.card);
    const t = AC.dropTarget(others.map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.app, left: r.left, top: r.top, width: r.width, height: r.height }; }), st.x, st.y);
    if (!t) return;
    const target = others.find(c => c.dataset.app === t.id), ref = t.before ? target : target.nextElementSibling;
    if (ref === st.card || target.nextElementSibling === st.card && !t.before) return;
    const first = new Map(cardsNow().map(c => [c, c.getBoundingClientRect()]));
    grid.insertBefore(st.card, ref);
    for (const c of cardsNow()) {   // slide the others into place instead of jumping
      if (c === st.card) continue;
      const a = first.get(c), z = c.getBoundingClientRect(), dx = a.left - z.left, dy = a.top - z.top;
      if (dx || dy) { c.style.transition = 'none'; c.style.transform = `translate(${dx}px, ${dy}px)`; requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = 'transform .18s ease'; c.style.transform = ''; })); }
    }
  };
  // While a press is in progress we listen on the whole page, so the drag keeps working even when a
  // card is re-inserted (which makes the browser let go of the pointer) or the finger leaves the grid.
  const onMove = e => {
    if (!st || e.pointerId !== st.id) return;
    st.x = e.clientX; st.y = e.clientY;
    if (!st.active) {
      const moved = Math.hypot(st.x - st.x0, st.y - st.y0);
      if (st.touch && !appsReorder) { if (moved > 9) cleanup(); return; }   // a swipe before the hold: let the page scroll
      if (moved > 5) activate(); else return;
    }
    e.preventDefault(); place();
  };
  const onTouchMove = e => { if (st && st.active) e.preventDefault(); };   // no scrolling while dragging
  const end = e => {
    if (!st || e.pointerId !== st.id) return;
    const was = st.active;
    if (was) {
      const ids = cardsNow().map(c => c.dataset.app);
      if (e.type !== 'pointercancel') ls(appOrderKey(acct), JSON.stringify(ids));
      suppress = true; setTimeout(() => { suppress = false; }, 80);
    }
    cleanup();
    if (was && e.type === 'pointercancel') render(true);
  };
  grid.addEventListener('pointerdown', e => {
    const card = e.target.closest('.app-card');
    if (!card || e.button > 0 || e.target.closest('.move')) return;
    cleanup();
    st = { card, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', active: false, id: e.pointerId };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    if (st.touch) { if (appsReorder) activate(); else st.timer = setTimeout(() => { if (st && !st.active) activate(); }, 380); }
  });
  grid.addEventListener('contextmenu', e => { if (st) e.preventDefault(); });                                // no link menu on a long press
  grid.addEventListener('dragstart', e => e.preventDefault());
  grid.addEventListener('click', e => { if (e.target.closest('.move')) return; if (suppress || appsReorder) { e.preventDefault(); e.stopPropagation(); } }, true);
}

function appsView(acct, ctx, sub, arg) {
  const back = (title, extra) => topbar(sub && title === defaultName(sub) ? appName(acct, sub) : title, { back: true, ...extra });
  switch (sub) {
    case 'calendar': return calendarView(acct, ctx, back);
    case 'calc': return calculatorView(back);
    case 'bank': return bankView(acct, ctx, back);
    case 'inventory': return inventoryView(acct, ctx, back);
    case 'groceries': return groceryView(acct, ctx, back);
    case 'chores': return choresView(acct, ctx, back);
    case 'notes': return notesView(acct, ctx, back, arg);
    case 'diary': return diaryView(acct, ctx, back, arg);
    case 'bible': return bibleView(acct, ctx, back, arg);
    case 'travel': return travelView(acct, ctx, back, arg);
    case 'cookbook': return cookbookView(acct, ctx, back, arg);
    default: return appsHome(acct, ctx);
  }
}

/* ---------- Notes ---------- */
let notesQuery = '';
function notesView(acct, ctx, back, id) {
  if (id) return noteEditor(acct, ctx, back, id);
  const notes = [...ctx.apps.note].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
  const list = h('div', { class: 'note-list' });
  const search = h('input', { type: 'search', placeholder: 'Search notes', value: notesQuery, 'aria-label': 'Search notes' });
  const draw = () => {
    const q = notesQuery.trim().toLowerCase();
    const hits = q ? notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q)) : notes;
    list.replaceChildren(...(hits.length ? hits.map(n => h('a', { class: 'note-item', href: '#/apps/notes/' + n.id },
      h('div', { class: 'note-title' }, n.pinned ? icon('pin') : null, h('b', {}, n.title.trim() || 'Untitled note')),
      h('div', { class: 'muted note-prev' }, (n.body || '').replace(/\s+/g, ' ').slice(0, 110) || 'No text'),
      h('div', { class: 'muted note-date' }, new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })))) : [emptyState(q ? 'No matches' : 'No notes yet', q ? 'Nothing has those words.' : 'Write one. It stays here, and only here.')]));
  };
  search.addEventListener('input', () => { notesQuery = search.value; draw(); });
  draw();
  return [back('Notes'), h('div', { class: 'app-pad' }, h('div', { class: 'app-row' }, search, h('button', { class: 'btn primary', onclick: () => go('/apps/notes/' + uid()) }, 'New note')), list)];
}

function noteEditor(acct, ctx, back, id) {
  if (!validId(id)) return [back('Note'), emptyState('Note not found', 'That link is not a note.')];
  const existing = ctx.apps.note.find(n => n.id === id);
  const rec = existing ? { ...existing } : { id, accountId: acct.id, kind: 'note', title: '', body: '', pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
  const status = h('span', { class: 'muted app-status' }, existing ? 'Saved' : '');
  const title = h('input', { class: 'note-title-in', placeholder: 'Title', value: rec.title, maxlength: 120, 'aria-label': 'Title' });
  const body = h('textarea', { class: 'note-body-in', placeholder: 'Write something...', 'aria-label': 'Note text' }, rec.body);
  const grow = () => { body.style.height = 'auto'; body.style.height = Math.max(260, body.scrollHeight) + 'px'; };
  let saved = !!existing;
  const save = async () => {
    if (!saved && !rec.title.trim() && !rec.body.trim()) return true;     // never store a blank new note
    rec.updatedAt = Date.now();
    const ok = await appSave(acct, rec);
    if (ok) saved = true;
    return ok;
  };
  const queue = autosaver(status, save);
  title.addEventListener('input', () => { rec.title = title.value; queue(); });
  body.addEventListener('input', () => { rec.body = body.value; grow(); queue(); });
  const pin = h('button', { class: 'btn' + (rec.pinned ? ' primary' : ''), 'aria-pressed': String(rec.pinned), onclick: async e => { rec.pinned = !rec.pinned; e.currentTarget.classList.toggle('primary', rec.pinned); e.currentTarget.setAttribute('aria-pressed', String(rec.pinned)); status.textContent = (await save()) ? 'Saved' : 'Not saved'; } }, 'Pin');
  setTimeout(() => { grow(); if (!existing) title.focus(); }, 0);
  return [back('Note', { action: status }),
    h('div', { class: 'app-pad' }, title, body,
      h('div', { class: 'btnrow', style: 'margin-top:12px' }, pin,
        h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this note? There is no undo.')) return; if (saved) await appDelete(rec.id); go('/apps/notes'); } }, 'Delete')))];
}

/* ---------- Diary ---------- */
let diaryQuery = '';
function diaryView(acct, ctx, back, key) {
  if (key) return diaryEntry(acct, ctx, back, key);
  const today = todayKey();
  const entries = ctx.apps.diary.filter(d => (d.body || '').trim() || d.mood).sort((a, b) => b.date.localeCompare(a.date));
  const set = new Set(entries.filter(d => (d.body || '').trim()).map(d => d.date));
  const todayRec = ctx.apps.diary.find(d => d.date === today);
  const st = AC.streak(set, today);
  const thisMonth = entries.filter(d => d.date.startsWith(ymOf(today))).length;
  const list = h('div', { class: 'note-list' });
  const search = h('input', { type: 'search', placeholder: 'Search the diary', value: diaryQuery, 'aria-label': 'Search the diary' });
  const draw = () => {
    const q = diaryQuery.trim().toLowerCase();
    const hits = q ? entries.filter(d => (d.body || '').toLowerCase().includes(q)) : entries;
    list.replaceChildren(...(hits.length ? hits.map(d => {
      const mood = AC.MOODS.find(m => m.id === d.mood);
      return h('a', { class: 'note-item', href: '#/apps/diary/' + d.date },
        h('div', { class: 'note-title' }, mood ? h('span', { class: 'mood-dot', style: `background:${mood.color}`, title: mood.label }) : null, h('b', {}, longDate(d.date))),
        h('div', { class: 'muted note-prev' }, (d.body || '').replace(/\s+/g, ' ').slice(0, 120) || 'No words, just a mood'));
    }) : [emptyState(q ? 'No matches' : 'No entries yet', q ? 'Nothing has those words.' : 'Your first page is waiting. Nobody will read it.')]));
  };
  search.addEventListener('input', () => { diaryQuery = search.value; draw(); });
  draw();
  return [back('Diary'),
    h('div', { class: 'app-pad' },
      h('div', { class: 'diary-today' },
        h('div', {}, h('b', {}, longDate(today)), h('div', { class: 'muted' }, (todayRec?.body || '').trim() ? 'You have written today.' : AC.promptFor(today))),
        h('a', { class: 'btn primary', href: '#/apps/diary/' + today }, (todayRec?.body || '').trim() ? 'Open today' : 'Write today')),
      h('div', { class: 'stat-row' },
        h('div', {}, h('b', {}, entries.length), h('span', { class: 'muted' }, ' entries')),
        h('div', {}, h('b', {}, st), h('span', { class: 'muted' }, ' day streak')),
        h('div', {}, h('b', {}, thisMonth), h('span', { class: 'muted' }, ' this month'))),
      h('div', { class: 'app-row' }, search), list)];
}

function diaryEntry(acct, ctx, back, key) {
  if (!AC.isKey(key)) return [back('Diary'), emptyState('Not a date', 'That link is not a day.')];
  const today = todayKey();
  if (key > today) return [back('Diary'), emptyState('Not yet', 'Diary pages open on the day. Come back then.')];
  const existing = ctx.apps.diary.find(d => d.date === key);
  const rec = existing ? { ...existing } : { id: uid(), accountId: acct.id, kind: 'diary', date: key, mood: null, body: '', createdAt: Date.now(), updatedAt: Date.now() };
  const status = h('span', { class: 'muted app-status' }, existing ? 'Saved' : '');
  let saved = !!existing;
  const save = async () => {
    const empty = !rec.mood && !rec.body.trim();
    if (empty) { if (saved) { await appDelete(rec.id); saved = false; } return true; }
    rec.updatedAt = Date.now();
    const ok = await appSave(acct, rec);
    if (ok) saved = true;
    return ok;
  };
  const queue = autosaver(status, save);
  const body = h('textarea', { class: 'note-body-in', placeholder: AC.promptFor(key), 'aria-label': 'Diary entry' }, rec.body);
  const grow = () => { body.style.height = 'auto'; body.style.height = Math.max(300, body.scrollHeight) + 'px'; };
  body.addEventListener('input', () => { rec.body = body.value; grow(); queue(); });
  const moods = h('div', { class: 'mood-row', role: 'radiogroup', 'aria-label': 'Mood' }, AC.MOODS.map(m => {
    const b = h('button', { type: 'button', class: 'mood-chip' + (rec.mood === m.id ? ' on' : ''), role: 'radio', 'aria-checked': String(rec.mood === m.id), style: `--c:${m.color}`, onclick: () => {
      rec.mood = rec.mood === m.id ? null : m.id;
      for (const x of moods.children) { const on = x.dataset.m === rec.mood; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }
      queue();
    } }, h('span', { class: 'mood-dot', style: `background:${m.color}` }), m.label);
    b.dataset.m = m.id;
    return b;
  }));
  setTimeout(() => { grow(); if (!existing) body.focus(); }, 0);
  const nav = h('div', { class: 'day-nav' },
    h('button', { class: 'back', 'aria-label': 'Previous day', onclick: () => go('/apps/diary/' + AC.addDays(key, -1)) }, icon('back')),
    h('b', {}, longDate(key)),
    h('button', { class: 'back flip', 'aria-label': 'Next day', disabled: key >= today, onclick: () => go('/apps/diary/' + AC.addDays(key, 1)) }, icon('back')));
  return [back('Diary', { action: status }),
    h('div', { class: 'app-pad' }, nav, h('p', { class: 'muted', style: 'margin:0 0 8px' }, 'How was it?'), moods, body,
      h('div', { class: 'btnrow', style: 'margin-top:12px' },
        h('button', { class: 'btn', onclick: () => go('/apps/diary') }, 'All entries'),
        existing && h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this entry? There is no undo.')) return; await appDelete(rec.id); go('/apps/diary'); } }, 'Delete entry')))];
}

/* ---------- Calendar ---------- */
let calCursor = null, calSel = null;
const EVENT_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
function calendarView(acct, ctx, back) {
  const now = new Date(), today = todayKey();
  if (!calCursor) calCursor = { y: now.getFullYear(), m: now.getMonth() };
  if (!calSel) calSel = today;
  const monStart = ls('as.weekstart') === '1';
  const events = ctx.apps.event;
  const diaryDays = new Set(ctx.apps.diary.filter(d => (d.body || '').trim()).map(d => d.date));
  const shift = n => { const d = new Date(calCursor.y, calCursor.m + n, 1); calCursor = { y: d.getFullYear(), m: d.getMonth() }; render(true); };
  const wk = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + ((i + (monStart ? 1 : 0)) % 7)).toLocaleDateString(undefined, { weekday: 'short' }));
  const cells = AC.monthGrid(calCursor.y, calCursor.m, monStart ? 1 : 0).map(c => {
    const evs = AC.eventsOn(events, c.key);
    return h('button', { class: `cal-cell${c.inMonth ? '' : ' out'}${c.key === today ? ' today' : ''}${c.key === calSel ? ' sel' : ''}`, 'aria-label': longDate(c.key) + (evs.length ? `, ${plural(evs.length, 'event')}` : ''), 'aria-pressed': String(c.key === calSel), 'data-key': c.key,
      onclick: () => { calSel = c.key; if (!c.inMonth) { const d = AC.parseKey(c.key); calCursor = { y: d.getFullYear(), m: d.getMonth() }; } render(true); } },
      h('span', { class: 'cal-num' }, String(c.day)),
      h('span', { class: 'cal-dots' }, evs.slice(0, 3).map(e => h('i', { style: `background:${e.color || EVENT_COLORS[0]}` })), diaryDays.has(c.key) ? h('i', { class: 'diary-pip' }) : null));
  });
  const dayEvents = AC.eventsOn(events, calSel);
  const up = AC.upcoming(events, today, 30, 5);
  return [back('Calendar', { action: h('button', { class: 'btn', onclick: () => { ls('as.weekstart', monStart ? null : '1'); render(true); } }, monStart ? 'Week: Mon' : 'Week: Sun') }),
    h('div', { class: 'app-pad' },
      h('div', { class: 'cal-head' },
        h('button', { class: 'back', 'aria-label': 'Previous month', onclick: () => shift(-1) }, icon('back')),
        h('h2', {}, monthTitle(calCursor.y, calCursor.m)),
        h('button', { class: 'back flip', 'aria-label': 'Next month', onclick: () => shift(1) }, icon('back')),
        h('button', { class: 'btn', onclick: () => { calCursor = { y: now.getFullYear(), m: now.getMonth() }; calSel = today; render(true); } }, 'Today')),
      h('div', { class: 'cal-grid cal-week' }, wk.map(d => h('span', {}, d))),
      h('div', { class: 'cal-grid', role: 'grid' }, cells),
      h('div', { class: 'cal-day' },
        h('div', { class: 'app-row' }, h('h3', {}, longDate(calSel)), h('button', { class: 'btn primary', onclick: () => eventEditor(acct, null, calSel) }, 'Add event')),
        dayEvents.length ? dayEvents.map(e => h('button', { class: 'event-row', onclick: () => eventEditor(acct, e, calSel) },
          h('i', { style: `background:${e.color || EVENT_COLORS[0]}` }), h('span', { class: 'event-time' }, e.time || 'All day'), h('b', {}, e.title), e.repeat && e.repeat !== 'none' ? h('span', { class: 'badge' }, e.repeat) : null))
          : h('p', { class: 'muted' }, 'Nothing planned. Suspicious.'),
        diaryDays.has(calSel) || calSel <= today ? h('a', { class: 'btn', href: '#/apps/diary/' + calSel, style: 'margin-top:8px;display:inline-block' }, diaryDays.has(calSel) ? 'Read this day in the diary' : 'Write this day in the diary') : null),
      up.length > 0 && h('div', { class: 'cal-day' }, h('h3', {}, 'Coming up'),
        up.map(({ key, ev }) => h('button', { class: 'event-row', onclick: () => { calSel = key; const d = AC.parseKey(key); calCursor = { y: d.getFullYear(), m: d.getMonth() }; render(true); } },
          h('i', { style: `background:${ev.color || EVENT_COLORS[0]}` }), h('span', { class: 'event-time' }, shortDate(key)), h('b', {}, ev.title)))))];
}

function eventEditor(acct, ev, dateKey) {
  const isNew = !ev;
  const rec = ev ? { ...ev } : { id: uid(), accountId: acct.id, kind: 'event', date: dateKey, time: '', title: '', notes: '', color: EVENT_COLORS[0], repeat: 'none', createdAt: Date.now() };
  const title = h('input', { value: rec.title, maxlength: 80, placeholder: 'What is happening?', 'aria-label': 'Event title' });
  const date = h('input', { type: 'date', value: rec.date });
  const time = h('input', { type: 'time', value: rec.time || '' });
  const repeat = h('select', { 'aria-label': 'Repeat' }, [['none', 'Does not repeat'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['yearly', 'Every year']].map(([v, l]) => h('option', { value: v }, l)));
  repeat.value = rec.repeat || 'none';
  const notes = h('textarea', { rows: 3, maxlength: 5000, 'aria-label': 'Notes' }, rec.notes || '');
  const err = h('p', { class: 'err' });
  const swatches = h('div', { class: 'swatches' }, EVENT_COLORS.map(c => h('button', { type: 'button', class: 'swatch' + (rec.color === c ? ' on' : ''), style: `background:${c}`, 'aria-label': 'Color ' + c, onclick: e => { rec.color = c; for (const s of swatches.children) s.classList.toggle('on', s === e.currentTarget); } })));
  const save = h('button', { class: 'btn primary' }, 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New event' : 'Edit event')),
    h('div', { class: 'mp' }, fieldEl('Title', title), h('div', { class: 'two' }, fieldEl('Date', date), fieldEl('Time (optional)', time)), fieldEl('Repeat', repeat), h('div', { class: 'field' }, h('span', {}, 'Color'), swatches), fieldEl('Notes', notes), err,
      h('div', { class: 'btnrow' }, save, !isNew && h('button', { class: 'btn danger', onclick: async () => { await appDelete(rec.id); close(); render(true); } }, 'Delete')))));
  save.addEventListener('click', async () => {
    if (!title.value.trim()) return void (err.textContent = 'Give it a title.');
    if (!AC.isKey(date.value)) return void (err.textContent = 'Pick a date.');
    Object.assign(rec, { title: title.value.trim(), date: date.value, time: time.value || '', repeat: repeat.value, notes: notes.value.trim() });
    save.disabled = true;
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    calSel = rec.date; const d = AC.parseKey(rec.date); calCursor = { y: d.getFullYear(), m: d.getMonth() };
    close(); render(true);
  });
  setTimeout(() => title.focus(), 0);
}

/* ---------- Calculator ---------- */
let calcHist = [], calcDeg = true, calcSci = false, calcAns = 0, calcExpr = '';
function calculatorView(back) {
  const input = h('input', { class: 'calc-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Expression', value: calcExpr, placeholder: '0' });
  const out = h('div', { class: 'calc-out', 'aria-live': 'polite' });
  const hist = h('div', { class: 'calc-hist' });
  const preview = () => {
    calcExpr = input.value; out.classList.remove('bad');
    if (!input.value.trim()) { out.textContent = ''; return; }
    try { out.textContent = '= ' + AC.fmtNum(AC.evaluate(input.value, { degrees: calcDeg, ans: calcAns })); } catch { out.textContent = ''; }
  };
  const drawHist = () => hist.replaceChildren(...calcHist.slice(0, 15).map(x => h('button', { class: 'hist-item', onclick: () => { input.value = x.result; preview(); input.focus(); } }, h('span', { class: 'muted' }, x.expr), h('b', {}, '= ' + x.result))));
  const equals = () => {
    if (!input.value.trim()) return;
    try {
      const v = AC.evaluate(input.value, { degrees: calcDeg, ans: calcAns }), s = AC.fmtNum(v);
      calcHist.unshift({ expr: input.value, result: s }); calcHist = calcHist.slice(0, 40);
      calcAns = v; input.value = s; out.textContent = ''; calcExpr = s; drawHist();
    } catch (e) { out.textContent = AC.calcError(e); out.classList.add('bad'); }
  };
  const insert = text => {
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + text + input.value.slice(b);
    const pos = a + text.length; input.setSelectionRange(pos, pos); preview(); input.focus();
  };
  const press = k => {
    if (k === 'C') { input.value = ''; out.textContent = ''; calcExpr = ''; input.focus(); }
    else if (k === '⌫') { const a = input.selectionStart ?? input.value.length; if (a > 0) { input.value = input.value.slice(0, a - 1) + input.value.slice(input.selectionEnd ?? a); input.setSelectionRange(a - 1, a - 1); } preview(); input.focus(); }
    else if (k === '=') equals();
    else insert(k);
  };
  input.addEventListener('input', preview);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); equals(); } });
  const btn = (label, key = label, cls = '') => h('button', { type: 'button', class: 'calc-btn ' + cls, 'aria-label': label, onclick: () => press(key) }, label);
  const sci = calcSci ? [['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['ln', 'ln('], ['log', 'log('], ['√', 'sqrt('], ['x²', '^2'], ['xʸ', '^'], ['π', 'pi'], ['e', 'e'], ['n!', '!'], ['ans', 'ans']] : [];
  const keys = [['C', 'C', 'fn'], ['(', '(', 'fn'], [')', ')', 'fn'], ['÷', '/', 'op'], ['7'], ['8'], ['9'], ['×', '*', 'op'], ['4'], ['5'], ['6'], ['−', '-', 'op'], ['1'], ['2'], ['3'], ['+', '+', 'op'], ['0'], ['.'], ['%', '%', 'fn'], ['=', '=', 'eq']];
  drawHist(); preview();
  setTimeout(() => input.focus(), 0);
  return [back('Calculator'),
    h('div', { class: 'app-pad calc' },
      h('div', { class: 'calc-screen' }, input, out),
      h('div', { class: 'btnrow', style: 'margin-bottom:10px' },
        h('button', { class: 'btn' + (calcSci ? ' primary' : ''), 'aria-pressed': String(calcSci), onclick: () => { calcExpr = input.value; calcSci = !calcSci; render(true); } }, 'Scientific'),
        h('button', { class: 'btn', onclick: () => { calcExpr = input.value; calcDeg = !calcDeg; render(true); } }, calcDeg ? 'Degrees' : 'Radians'),
        h('button', { class: 'btn', onclick: () => press('⌫') }, '⌫ Delete'),
        h('button', { class: 'btn', onclick: async () => { const t = input.value || calcExpr; try { await navigator.clipboard.writeText(t); toast('Copied.'); } catch { toast('Could not copy.'); } } }, 'Copy')),
      sci.length > 0 && h('div', { class: 'calc-keys sci' }, sci.map(([l, k]) => btn(l, k, 'fn'))),
      h('div', { class: 'calc-keys' }, keys.map(([l, k, c]) => btn(l, k || l, c || ''))),
      h('div', { class: 'app-row', style: 'margin-top:16px' }, h('h3', {}, 'History'), h('button', { class: 'btn', onclick: () => { calcHist = []; drawHist(); } }, 'Clear')),
      hist, h('p', { class: 'fine', style: 'padding:6px 0' }, 'You can type with your keyboard too. 50 + 10% is 55.'))];
}

/* ---------- Banking: receipts and math, offline ---------- */
let bankTab = 'overview', bankMonth = null, bankAcct = 'all', bankQuery = '';
function bankView(acct, ctx, back) {
  if (!bankMonth) bankMonth = ymOf(todayKey());
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(bankTab === k), class: bankTab === k ? 'active' : '', onclick: () => { bankTab = k; render(true); } }, label);
  const body = bankTab === 'transactions' ? bankTransactions(acct, ctx) : bankTab === 'math' ? bankMath() : bankOverview(acct, ctx);
  return [back('Banking'),
    h('div', { class: 'tabs', role: 'tablist' }, tab('overview', 'Overview'), tab('transactions', 'Receipts'), tab('math', 'Math')),
    h('div', { class: 'app-pad' }, body)];
}
const monthShift = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = ym => { const [y, m] = ym.split('-').map(Number); return monthTitle(y, m - 1); };
const monthNav = () => h('div', { class: 'cal-head' },
  h('button', { class: 'back', 'aria-label': 'Previous month', onclick: () => { bankMonth = monthShift(bankMonth, -1); render(true); } }, icon('back')),
  h('h2', {}, monthLabel(bankMonth)),
  h('button', { class: 'back flip', 'aria-label': 'Next month', onclick: () => { bankMonth = monthShift(bankMonth, 1); render(true); } }, icon('back')));

function bankOverview(acct, ctx) {
  const A = ctx.apps;
  const cur = h('select', { 'aria-label': 'Currency', onchange: e => { ls('as.currency', e.target.value); render(true); } }, AC.CURRENCIES.map(c => h('option', { value: c }, c)));
  cur.value = currencyNow();
  if (!A.acct.length) {
    const name = h('input', { value: 'Cash', maxlength: 40, 'aria-label': 'Account name' });
    const start = h('input', { value: '0', inputmode: 'decimal', 'aria-label': 'Starting balance' });
    const err = h('p', { class: 'err' });
    return [h('div', { class: 'bank-card' }, h('h3', {}, 'Start a ledger'),
      h('p', { class: 'muted' }, 'This is a notebook, not a bank. Nothing connects to anything. Track receipts and balances, and do the math. Make an account for wherever your money lives.'),
      fieldEl('Account name', name), fieldEl('Starting balance', start), fieldEl('Currency', cur), err,
      h('button', { class: 'btn primary', onclick: async () => {
        const cents = AC.parseMoney(start.value);
        if (!name.value.trim()) return void (err.textContent = 'Name the account.');
        if (cents === null) return void (err.textContent = 'Starting balance like 250 or 250.50.');
        if (await appSave(acct, { id: uid(), accountId: acct.id, kind: 'acct', name: name.value.trim(), startCents: cents, createdAt: Date.now() })) render(true);
      } }, 'Create account'))];
  }
  const balances = A.acct.map(a => ({ a, bal: AC.balance(a.startCents, A.txn.filter(t => t.acctId === a.id)) }));
  const total = AC.sum(balances.map(b => b.bal));
  const sm = AC.summarize(A.txn, bankMonth);
  const max = Math.max(1, ...sm.byCategory.map(c => c.cents));
  return [
    h('div', { class: 'bank-total' }, h('span', { class: 'muted' }, 'Total across accounts'), h('div', { class: 'bank-big' }, money(total))),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => txnEditor(acct, ctx, null) }, 'Add a receipt'), h('button', { class: 'btn', onclick: () => accountEditor(acct, ctx, null) }, 'Add account'), cur),
    balances.map(({ a, bal }) => h('div', { class: 'bank-acct' }, h('div', {}, h('b', {}, a.name), h('div', { class: 'muted' }, plural(A.txn.filter(t => t.acctId === a.id).length, 'receipt'))), h('b', { class: bal < 0 ? 'neg' : '' }, money(bal)), h('button', { class: 'btn', onclick: () => accountEditor(acct, ctx, a) }, 'Edit'))),
    monthNav(),
    h('div', { class: 'stat-row' },
      h('div', {}, h('span', { class: 'muted' }, 'In '), h('b', { class: 'pos' }, money(sm.income))),
      h('div', {}, h('span', { class: 'muted' }, 'Out '), h('b', { class: 'neg' }, money(sm.spending))),
      h('div', {}, h('span', { class: 'muted' }, 'Net '), h('b', { class: sm.net < 0 ? 'neg' : 'pos' }, money(sm.net)))),
    sm.byCategory.length
      ? h('div', { class: 'cat-bars' }, h('h3', {}, 'Where it went'), sm.byCategory.map(c => h('div', { class: 'cat-row' }, h('span', {}, c.category), h('div', { class: 'cat-bar' }, h('i', { style: `width:${Math.max(3, c.cents / max * 100)}%` })), h('b', {}, money(c.cents)))))
      : h('p', { class: 'muted' }, 'No spending recorded this month.'),
  ];
}

function bankTransactions(acct, ctx) {
  const A = ctx.apps;
  if (!A.acct.length) return [h('p', { class: 'muted' }, 'Create an account on the Overview tab first.')];
  const q = bankQuery.trim().toLowerCase();
  const accName = id => A.acct.find(a => a.id === id)?.name || '';
  const rows = A.txn.filter(t => t.date.startsWith(bankMonth) && (bankAcct === 'all' || t.acctId === bankAcct) && (!q || `${t.merchant} ${t.category} ${t.note || ''}`.toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const sel = h('select', { 'aria-label': 'Account filter', onchange: e => { bankAcct = e.target.value; render(true); } }, h('option', { value: 'all' }, 'All accounts'), A.acct.map(a => h('option', { value: a.id }, a.name)));
  sel.value = bankAcct;
  const search = h('input', { type: 'search', placeholder: 'Search receipts', value: bankQuery, 'aria-label': 'Search receipts' });
  search.addEventListener('input', () => { bankQuery = search.value; clearTimeout(search._t); search._t = setTimeout(() => render(true).then(() => { const el = $('input[aria-label="Search receipts"]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }), 250); });
  const exportCsv = () => {
    const all = A.txn.filter(t => bankAcct === 'all' || t.acctId === bankAcct).sort((a, b) => a.date.localeCompare(b.date));
    const csv = AC.toCsv([['Date', 'Account', 'Merchant', 'Category', 'Amount', 'Note'], ...all.map(t => [t.date, accName(t.acctId), t.merchant, t.category, (t.cents / 100).toFixed(2), t.note || ''])]);
    saveFile('anti-social-receipts.csv', 'text/csv', csv).then(r => toast(r.ok ? `Saved to ${r.where}. A spreadsheet can open it.` : r.where));
  };
  const net = AC.sum(rows.map(t => t.cents));
  return [monthNav(),
    h('div', { class: 'app-row' }, sel, h('button', { class: 'btn primary', onclick: () => txnEditor(acct, ctx, null) }, 'Add a receipt')), search,
    h('p', { class: 'fine', style: 'padding:8px 0' }, `${plural(rows.length, 'receipt')} · net ${money(net)}`),
    rows.length ? rows.map(t => h('button', { class: 'txn-row', onclick: () => txnEditor(acct, ctx, t) },
      h('span', { class: 'txn-date muted' }, AC.parseKey(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      h('span', { class: 'txn-main' }, h('b', {}, t.merchant || 'Untitled'), h('span', { class: 'muted' }, t.category + (A.acct.length > 1 ? ' · ' + accName(t.acctId) : ''))),
      t.receiptImg ? h('span', { class: 'muted', title: 'Has a receipt photo' }, icon('image')) : null,
      h('b', { class: t.cents < 0 ? 'neg' : 'pos' }, money(t.cents)))) : [emptyState('No receipts here', 'Nothing recorded for this month.')],
    h('div', { class: 'btnrow', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: exportCsv }, 'Export CSV'))];
}

function accountEditor(acct, ctx, a) {
  const isNew = !a;
  const rec = a ? { ...a } : { id: uid(), accountId: acct.id, kind: 'acct', name: '', startCents: 0, createdAt: Date.now() };
  const name = h('input', { value: rec.name, maxlength: 40, 'aria-label': 'Account name' });
  const start = h('input', { value: (rec.startCents / 100).toFixed(2), inputmode: 'decimal', 'aria-label': 'Starting balance' });
  const err = h('p', { class: 'err' });
  const save = h('button', { class: 'btn primary' }, 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New account' : 'Edit account')),
    h('div', { class: 'mp' }, fieldEl('Name', name), fieldEl('Starting balance', start), err,
      h('div', { class: 'btnrow' }, save, !isNew && h('button', { class: 'btn danger', onclick: async () => {
        const mine = ctx.apps.txn.filter(t => t.acctId === rec.id);
        if (!confirm(`Delete ${rec.name}${mine.length ? ` and its ${plural(mine.length, 'receipt')}` : ''}? There is no undo.`)) return;
        for (const t of mine) await appDelete(t.id);
        await appDelete(rec.id);
        if (bankAcct === rec.id) bankAcct = 'all';
        close(); render(true);
      } }, 'Delete')))));
  save.addEventListener('click', async () => {
    const cents = AC.parseMoney(start.value);
    if (!name.value.trim()) return void (err.textContent = 'Name the account.');
    if (cents === null) return void (err.textContent = 'Starting balance like 250 or 250.50.');
    rec.name = name.value.trim(); rec.startCents = cents;
    save.disabled = true;
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    close(); render(true);
  });
}

function txnEditor(acct, ctx, t) {
  const isNew = !t;
  const A = ctx.apps;
  if (!A.acct.length) return toast('Create an account first.');
  const rec = t ? { ...t } : { id: uid(), accountId: acct.id, kind: 'txn', acctId: bankAcct !== 'all' ? bankAcct : A.acct[0].id, date: bankMonth === ymOf(todayKey()) ? todayKey() : bankMonth + '-01', cents: 0, merchant: '', category: 'Groceries', note: '', receiptImg: null, createdAt: Date.now() };
  let income = rec.cents > 0;
  const amount = h('input', { value: rec.cents ? (Math.abs(rec.cents) / 100).toFixed(2) : '', inputmode: 'decimal', placeholder: '0.00', 'aria-label': 'Amount' });
  const merchant = h('input', { value: rec.merchant, maxlength: 60, placeholder: 'Where?', 'aria-label': 'Merchant' });
  const date = h('input', { type: 'date', value: rec.date });
  const category = h('select', { 'aria-label': 'Category' }, [...AC.CATEGORIES, 'Income'].map(c => h('option', { value: c }, c)));
  category.value = rec.category;
  const account = h('select', { 'aria-label': 'Account' }, A.acct.map(a => h('option', { value: a.id }, a.name)));
  account.value = rec.acctId;
  const note = h('textarea', { rows: 2, maxlength: 2000, 'aria-label': 'Note' }, rec.note || '');
  const err = h('p', { class: 'err' });
  const preview = h('div', { class: 'receipt-prev' });
  const drawPrev = () => preview.replaceChildren(...(rec.receiptImg ? [h('img', { src: rec.receiptImg, alt: 'Receipt' })] : []));
  drawPrev();
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files[0]; file.value = '';
    if (!f) return;
    const blocked = await pictureBlocked(f);
    if (blocked) return toast(blocked);
    try { rec.receiptImg = await downscale(f, 1100); drawPrev(); } catch { toast("That doesn't look like an image."); }
  });
  const kind = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Type' }, [['Expense', false], ['Income', true]].map(([l, inc]) =>
    h('button', { type: 'button', role: 'radio', class: 'btn' + (income === inc ? ' primary' : ''), 'aria-checked': String(income === inc), onclick: e => { income = inc; for (const b of kind.children) { const on = b === e.currentTarget; b.classList.toggle('primary', on); b.setAttribute('aria-checked', String(on)); } if (inc) category.value = 'Income'; else if (category.value === 'Income') category.value = 'Other'; } }, l)));
  const save = h('button', { class: 'btn primary' }, 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'Add a receipt' : 'Edit receipt')),
    h('div', { class: 'mp' }, kind, fieldEl('Amount', amount), fieldEl('Merchant', merchant), h('div', { class: 'two' }, fieldEl('Date', date), fieldEl('Category', category)),
      A.acct.length > 1 && fieldEl('Account', account), fieldEl('Note', note), preview,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => file.click() }, rec.receiptImg ? 'Change photo' : 'Add receipt photo'), file, rec.receiptImg && h('button', { class: 'btn', onclick: () => { rec.receiptImg = null; drawPrev(); } }, 'Remove photo')),
      err, h('div', { class: 'btnrow', style: 'margin-top:12px' }, save, !isNew && h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this receipt?')) return; await appDelete(rec.id); close(); render(true); } }, 'Delete')))));
  save.addEventListener('click', async () => {
    const cents = AC.parseMoney(amount.value);
    if (cents === null || cents === 0) return void (err.textContent = 'Enter an amount like 12.50.');
    if (cents < 0) return void (err.textContent = 'Leave the minus off. Pick Expense or Income instead.');
    if (!AC.isKey(date.value)) return void (err.textContent = 'Pick a date.');
    Object.assign(rec, { cents: income ? cents : -cents, merchant: merchant.value.trim(), date: date.value, category: category.value, acctId: account.value || rec.acctId, note: note.value.trim() });
    save.disabled = true;
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    bankMonth = ymOf(rec.date);
    close(); render(true);
  });
  setTimeout(() => amount.focus(), 0);
}

function bankMath() {
  const cur = () => currencyNow();
  const fm = x => AC.fmtMoney(Math.round(x * 100), cur());
  const num = el => { const v = parseFloat(String(el.value).replace(/,/g, '')); return Number.isFinite(v) ? v : NaN; };
  const tool = (title, desc, fields, compute) => {
    const els = fields.map(([label, val, extra]) => h('input', { value: val, inputmode: 'decimal', 'aria-label': label, ...(extra || {}) }));
    const out = h('div', { class: 'tool-out', 'aria-live': 'polite' });
    const run = () => { const v = els.map(num); out.replaceChildren(...(v.some(Number.isNaN) ? [h('span', { class: 'muted' }, 'Fill in the numbers.')] : compute(...v))); };
    els.forEach(e => e.addEventListener('input', run)); run();
    return h('div', { class: 'bank-card' }, h('h3', {}, title), h('p', { class: 'muted', style: 'margin-top:0' }, desc),
      h('div', { class: 'tool-fields' }, fields.map(([label], i) => fieldEl(label, els[i]))), out);
  };
  const line = (k, v, strong) => h('div', { class: 'tool-line' }, h('span', { class: 'muted' }, k), strong ? h('b', {}, v) : h('span', {}, v));
  return [
    tool('Tip and split', 'Who owes what.', [['Bill', '84.50'], ['Tip %', '18'], ['People', '3']], (b, t, p) => { const r = AC.tipSplit(b, t, p); return [line('Tip', fm(r.tip)), line('Total', fm(r.total)), line('Each', fm(r.each), true)]; }),
    tool('Sales tax and discount', 'What it really costs.', [['Price', '120'], ['Sales tax %', '8.25'], ['Discount %', '15']], (p, tx, d) => { const r = AC.taxDiscount(p, tx, d); return [line('You save', fm(r.saved)), line('After discount', fm(r.after)), line('Tax', fm(r.tax)), line('Total', fm(r.total), true)]; }),
    tool('Percent change', 'Up or down, and by how much.', [['From', '50'], ['To', '65']], (a, b) => { const r = AC.percentChange(a, b); return [line('Change', r === null ? 'Cannot start from 0' : `${r >= 0 ? '+' : ''}${AC.fmtNum(Math.round(r * 100) / 100)}%`, true)]; }),
    tool('Loan payment', 'The monthly cost of borrowing.', [['Amount', '20000'], ['Interest rate % (yearly)', '6.5'], ['Years', '5']], (p, r, y) => { const x = AC.loanPayment(p, r, y); return [line('Monthly payment', fm(x.monthly), true), line('Total paid', fm(x.total)), line('Total interest', fm(x.interest))]; }),
    tool('Savings growth', 'What steady saving turns into.', [['Starting amount', '1000'], ['Add each month', '150'], ['Interest rate % (yearly)', '4'], ['Years', '10']], (s, m, r, y) => { const x = AC.growth(s, m, r, y); return [line('You put in', fm(x.contributed)), line('Interest earned', fm(x.interest)), line('End balance', fm(x.final), true)]; }),
    tool('Convert an amount', 'Type today\'s rate yourself. There is no internet here to look it up.', [['Amount', '100'], ['Rate (1 of yours is worth)', '0.92']], (a, r) => [line('Result', AC.fmtNum(Math.round(a * r * 100) / 100), true)]),
  ];
}

/* ---------- Household: what you own, what it cost, and what it looks like ---------- */
// Each item keeps small thumbnails inside its own record (cheap to list). The full-size photos are
// separate media records, opened only when you view the item, so a house full of photos stays fast.
const MAX_PHOTOS = 6;
let invTab = 'overview', invRoom = 'all', invCat = 'all', invQuery = '', invSort = 'recent', invPhotos = 'all';
const invView = () => ls('as.invview') === 'gallery' ? 'gallery' : 'list';
const photoCount = i => (i.photoIds || []).length;
function inventoryView(acct, ctx, back) {
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(invTab === k), class: invTab === k ? 'active' : '', onclick: () => { invTab = k; render(true); } }, label);
  return [back('Household'),
    h('div', { class: 'tabs', role: 'tablist' }, tab('overview', 'Overview'), tab('items', 'Items')),
    h('div', { class: 'app-pad' }, invTab === 'items' ? invItems(acct, ctx) : invOverview(acct, ctx))];
}

function invBars(groups, key) {
  const max = Math.max(1, ...groups.map(g => g.paid));
  return groups.map(g => h('div', { class: 'cat-row inv-row' },
    h('button', { class: 'linkish', onclick: () => { invTab = 'items'; if (key === 'room') { invRoom = g.key === 'Unsorted' ? 'none' : g.key; invCat = 'all'; } else { invCat = g.key === 'Unsorted' ? 'none' : g.key; invRoom = 'all'; } invQuery = ''; invPhotos = 'all'; render(true); } }, g.key),
    h('div', { class: 'cat-bar' }, h('i', { style: `width:${Math.max(3, g.paid / max * 100)}%` })),
    h('b', {}, money(g.paid))));
}

function invExport(items) {
  const today = todayKey();
  const csv = AC.toCsv([['Item', 'Room', 'Category', 'Quantity', 'Price each', 'Total paid', 'Purchase date', 'Store', 'Serial or model', 'Warranty ends', 'Value each', 'Total value', 'Photos', 'Notes'],
    ...[...items].sort((a, b) => (a.room || '').localeCompare(b.room || '') || a.name.localeCompare(b.name)).map(i => [i.name, i.room || '', i.category || '', AC.unitsOf(i), (i.cents / 100).toFixed(2), (AC.paidOf(i) / 100).toFixed(2), i.date || '', i.store || '', i.serial || '', i.warrantyEnd || '', (AC.unitValue(i, today) / 100).toFixed(2), (AC.worthOf(i, today) / 100).toFixed(2), photoCount(i), i.note || ''])]);
  saveFile('anti-social-household.csv', 'text/csv', csv).then(r => toast(r.ok ? `Saved to ${r.where}. Handy for an insurance list.` : r.where));
}

function invOverview(acct, ctx) {
  const items = ctx.apps.asset, today = todayKey();
  if (!items.length) return [h('div', { class: 'bank-card' }, h('h3', {}, 'Nothing logged yet'), h('p', { class: 'muted' }, 'Note what you own, what it cost, where it lives, and snap a photo of it. Start with the room you are in. It all stays on this device.'), h('button', { class: 'btn primary', onclick: () => assetEditor(acct, ctx, null) }, 'Add your first item'))];
  const t = AC.assetTotals(items, today), w = AC.warranties(items, today, 90);
  const top = [...items].sort((a, b) => AC.paidOf(b) - AC.paidOf(a)).slice(0, 5);
  const shot = items.filter(i => photoCount(i) > 0).length, photos = AC.sum(items.map(photoCount));
  return [
    h('div', { class: 'bank-total' }, h('span', { class: 'muted' }, 'Everything here cost you'), h('div', { class: 'bank-big' }, money(t.paid))),
    h('div', { class: 'stat-row' },
      h('div', {}, h('span', { class: 'muted' }, 'Worth now (estimate) '), h('b', {}, money(t.worth))),
      h('div', {}, h('b', {}, t.units.toLocaleString()), h('span', { class: 'muted' }, t.units === 1 ? ' thing' : ' things')),
      h('div', {}, h('b', {}, AC.groupTotals(items, 'room', today).length), h('span', { class: 'muted' }, ' rooms'))),
    h('div', { class: 'photo-cover' },
      h('div', {}, h('b', {}, `${shot} of ${items.length}`), h('span', { class: 'muted' }, ` ${items.length === 1 ? 'item has' : 'items have'} photos · ${plural(photos, 'photo')} in all`)),
      h('div', { class: 'cat-bar' }, h('i', { style: `width:${shot / items.length * 100}%` })),
      shot < items.length ? h('button', { class: 'linkish', onclick: () => { invTab = 'items'; invPhotos = 'without'; invRoom = 'all'; invCat = 'all'; invQuery = ''; render(true); } }, `Show the ${items.length - shot} without photos`) : null),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => assetEditor(acct, ctx, null) }, 'Add an item'), h('button', { class: 'btn', onclick: () => { invTab = 'items'; ls('as.invview', 'gallery'); render(true); } }, 'Photo gallery'), h('button', { class: 'btn', onclick: () => invExport(items) }, 'Export CSV')),
    h('div', { class: 'cat-bars' }, h('h3', {}, 'By room'), invBars(AC.groupTotals(items, 'room', today), 'room')),
    h('div', { class: 'cat-bars' }, h('h3', {}, 'By category'), invBars(AC.groupTotals(items, 'category', today), 'category')),
    (w.soon.length || w.ended.length) ? h('div', { class: 'cat-bars' }, h('h3', {}, 'Warranties'),
      w.soon.map(({ it, left }) => h('button', { class: 'txn-row', onclick: () => assetDetail(acct, ctx, it) }, h('span', { class: 'txn-main' }, h('b', {}, it.name), h('span', { class: 'muted' }, (it.room || 'Unsorted'))), h('b', { class: 'warn' }, left === 0 ? 'Ends today' : `${plural(left, 'day')} left`))),
      w.ended.length ? h('p', { class: 'fine', style: 'padding:6px 0' }, `${plural(w.ended.length, 'warranty').replace('warrantys', 'warranties')} already ended.`) : null) : null,
    h('div', { class: 'cat-bars' }, h('h3', {}, 'Most expensive'),
      top.map(i => h('button', { class: 'txn-row', onclick: () => assetDetail(acct, ctx, i) }, h('span', { class: 'txn-main' }, h('b', {}, i.name), h('span', { class: 'muted' }, `${i.room || 'Unsorted'}${AC.unitsOf(i) > 1 ? ' · ×' + AC.unitsOf(i) : ''}`)), h('b', {}, money(AC.paidOf(i)))))),
  ];
}

function invItems(acct, ctx) {
  const items = ctx.apps.asset, today = todayKey(), view = invView();
  const rooms = [...new Set(items.map(i => (i.room || '').trim()).filter(Boolean))].sort();
  const cats = [...new Set(items.map(i => (i.category || '').trim()).filter(Boolean))].sort();
  const sel = (label, value, opts, set) => { const el = h('select', { 'aria-label': label, onchange: e => { set(e.target.value); render(true); } }, opts.map(([v, l]) => h('option', { value: v }, l))); el.value = value; return el; };
  const q = invQuery.trim().toLowerCase();
  let rows = items.filter(i => (invRoom === 'all' || (invRoom === 'none' ? !(i.room || '').trim() : (i.room || '').trim() === invRoom)) && (invCat === 'all' || (invCat === 'none' ? !(i.category || '').trim() : (i.category || '').trim() === invCat))
    && (invPhotos === 'all' || (invPhotos === 'with' ? photoCount(i) > 0 : photoCount(i) === 0))
    && (!q || `${i.name} ${i.room} ${i.category} ${i.store || ''} ${i.serial || ''} ${i.note || ''}`.toLowerCase().includes(q)));
  const sorters = { recent: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0), name: (a, b) => a.name.localeCompare(b.name), price: (a, b) => AC.paidOf(b) - AC.paidOf(a), value: (a, b) => AC.worthOf(b, today) - AC.worthOf(a, today) };
  rows = rows.sort(sorters[invSort] || sorters.recent);
  const search = h('input', { type: 'search', placeholder: 'Search your things', value: invQuery, 'aria-label': 'Search your things' });
  search.addEventListener('input', () => { invQuery = search.value; clearTimeout(search._t); search._t = setTimeout(() => render(true).then(() => { const el = $('input[aria-label="Search your things"]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }), 250); });
  const t = AC.assetTotals(rows, today);
  const toggle = h('div', { class: 'seg view-toggle', role: 'group', 'aria-label': 'View' }, [['list', 'List'], ['gallery', 'Gallery']].map(([k, l]) =>
    h('button', { type: 'button', class: 'btn' + (view === k ? ' primary' : ''), 'aria-pressed': String(view === k), onclick: () => { ls('as.invview', k === 'list' ? null : k); render(true); } }, l)));
  const card = i => h('button', { class: 'gal-card', onclick: () => assetDetail(acct, ctx, i) },
    h('span', { class: 'gal-img' }, i.thumbs?.[0] ? h('img', { src: i.thumbs[0], alt: i.name, loading: 'lazy', decoding: 'async' }) : h('span', { class: 'gal-none' }, icon('camera'), h('span', {}, 'No photo yet')), photoCount(i) > 1 ? h('span', { class: 'gal-n' }, icon('image'), String(photoCount(i))) : null),
    h('b', {}, i.name), h('span', { class: 'muted' }, `${money(AC.paidOf(i))}${AC.unitsOf(i) > 1 ? ' · ×' + AC.unitsOf(i) : ''}`));
  let body;
  if (!rows.length) body = [emptyState(items.length ? 'No matches' : 'Nothing here yet', items.length ? 'Nothing fits those filters.' : 'Add the first thing you own.')];
  else if (view === 'gallery') {
    const groups = AC.groupTotals(rows, 'room', today);
    body = groups.map(g => {
      const list = rows.filter(i => ((i.room || '').trim() || 'Unsorted') === g.key);
      return h('div', { class: 'gal-room' }, h('div', { class: 'app-row' }, h('h3', {}, g.key), h('span', { class: 'muted' }, `${plural(g.units, 'thing')} · ${money(g.paid)}`)), h('div', { class: 'gal-grid' }, list.map(card)));
    });
  } else body = rows.map(i => h('button', { class: 'txn-row asset-row', onclick: () => assetDetail(acct, ctx, i) },
    i.thumbs?.[0] ? h('img', { class: 'asset-thumb', src: i.thumbs[0], alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'asset-thumb ph' }, icon('box')),
    h('span', { class: 'txn-main' }, h('b', {}, i.name), h('span', { class: 'muted' }, `${i.room || 'No room'} · ${i.category || 'No category'}${AC.unitsOf(i) > 1 ? ' · ×' + AC.unitsOf(i) : ''}`)),
    photoCount(i) > 1 ? h('span', { class: 'muted pcount', title: `${photoCount(i)} photos` }, icon('image'), String(photoCount(i))) : null,
    h('b', {}, money(AC.paidOf(i)))));
  return [
    h('div', { class: 'app-row' }, toggle, h('button', { class: 'btn primary', onclick: () => assetEditor(acct, ctx, null) }, 'Add an item')),
    h('div', { class: 'filters', style: 'margin-bottom:10px' },
      sel('Room', invRoom, [['all', 'All rooms'], ...rooms.map(r => [r, r]), ['none', 'No room']], v => { invRoom = v; }),
      sel('Category', invCat, [['all', 'All categories'], ...cats.map(c => [c, c]), ['none', 'No category']], v => { invCat = v; }),
      sel('Photos', invPhotos, [['all', 'Any photos'], ['with', 'With photos'], ['without', 'No photos yet']], v => { invPhotos = v; }),
      sel('Sort', invSort, [['recent', 'Recent'], ['name', 'Name'], ['price', 'Price, high to low'], ['value', 'Value, high to low']], v => { invSort = v; })),
    search,
    h('p', { class: 'fine', style: 'padding:8px 0' }, `${plural(rows.length, 'listing')} · ${plural(t.units, 'thing')} · paid ${money(t.paid)} · worth about ${money(t.worth)}`),
    body,
    items.length > 0 && h('div', { class: 'btnrow', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: () => invExport(rows) }, 'Export this list (CSV)'))];
}

// A closer look at one item: its photos (swipe, arrows or the thumbnail strip) and every detail.
function assetDetail(acct, ctx, it) {
  const today = todayKey();
  const ids = it.photoIds || [], thumbs = it.thumbs || [];
  const full = {};
  let idx = 0;
  const main = h('img', { class: 'viewer-img', alt: it.name });
  const count = h('span', { class: 'muted viewer-count' });
  const strip = h('div', { class: 'viewer-strip' });
  const draw = () => {
    if (!ids.length) return;
    main.src = full[ids[idx]] || thumbs[idx];
    main.alt = `${it.name}, photo ${idx + 1} of ${ids.length}`;
    count.textContent = `${idx + 1} of ${ids.length}`;
    [...strip.children].forEach((c, k) => c.classList.toggle('on', k === idx));
  };
  const go_ = n => { idx = (idx + n + ids.length) % ids.length; draw(); };
  ids.forEach((_, k) => strip.append(h('button', { class: 'viewer-thumb', 'aria-label': `Photo ${k + 1}`, onclick: () => { idx = k; draw(); } }, h('img', { src: thumbs[k], alt: '' }))));
  const fact = (k, v) => v ? h('div', { class: 'tool-line' }, h('span', { class: 'muted' }, k), h('span', {}, v)) : null;
  const paid = AC.paidOf(it), worth = AC.worthOf(it, today);
  const w = isKeyOk(it.warrantyEnd) ? AC.diffDays(it.warrantyEnd, today) : null;
  const root = h('div', { class: 'viewer', tabindex: '-1', onkeydown: e => { if (ids.length > 1 && e.key === 'ArrowRight') go_(1); else if (ids.length > 1 && e.key === 'ArrowLeft') go_(-1); } },
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, it.name)),
    h('div', { class: 'mp' },
      ids.length
        ? h('div', { class: 'viewer-stage' },
            h('div', { class: 'viewer-frame' },
              ids.length > 1 ? h('button', { class: 'viewer-nav prev', 'aria-label': 'Previous photo', onclick: () => go_(-1) }, icon('back')) : null,
              main,
              ids.length > 1 ? h('button', { class: 'viewer-nav next flip', 'aria-label': 'Next photo', onclick: () => go_(1) }, icon('back')) : null),
            count, ids.length > 1 ? strip : null)
        : h('div', { class: 'viewer-empty' }, icon('camera'), h('span', {}, 'No photos yet.'), h('button', { class: 'btn primary', onclick: () => { close(); assetEditor(acct, ctx, it); } }, 'Add photos')),
      h('div', { style: 'margin-top:14px' },
        fact('Room', it.room), fact('Category', it.category), fact('Quantity', AC.unitsOf(it) > 1 ? String(AC.unitsOf(it)) : ''),
        fact('Price', `${money(it.cents)}${AC.unitsOf(it) > 1 ? ' each' : ''}`), AC.unitsOf(it) > 1 ? fact('Total paid', money(paid)) : null,
        fact('Worth now (estimate)', money(worth)), fact('Bought', it.date ? shortDate(it.date) : ''), fact('Store', it.store), fact('Model or serial', it.serial),
        fact('Warranty', w === null ? '' : w < 0 ? `Ended ${shortDate(it.warrantyEnd)}` : w === 0 ? 'Ends today' : `Until ${shortDate(it.warrantyEnd)} (${plural(w, 'day')} left)`)),
      it.note ? h('p', { class: 'viewer-note' }, it.note) : null,
      h('div', { class: 'btnrow', style: 'margin-top:12px' }, h('button', { class: 'btn primary', onclick: () => { close(); assetEditor(acct, ctx, it); } }, 'Edit'))));
  const close = modal(root);
  draw();
  setTimeout(() => root.focus(), 0);
  if (ids.length && it.mtoken) {
    loadMedia(acct, it.mtoken).then(list => { for (const r of list) full[r.id] = r.f; draw(); }).catch(() => {});
    let x0 = null;
    main.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', e => { if (x0 === null || ids.length < 2) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go_(dx < 0 ? 1 : -1); });
  }
}
const isKeyOk = k => !!k && AC.isKey(k);

function assetEditor(acct, ctx, it, prefill) {
  const isNew = !it;
  const base = it || prefill;
  const rec = base ? { ...base } : { name: '', room: invRoom !== 'all' && invRoom !== 'none' ? invRoom : '', category: 'Furniture', qty: 1, cents: 0, date: '', store: '', serial: '', warrantyEnd: '', valueCents: null, lifeYears: null, note: '' };
  if (isNew) Object.assign(rec, { id: uid(), accountId: acct.id, kind: 'asset', createdAt: Date.now() });
  const originalIds = it ? [...(it.photoIds || [])] : [];
  // working copy of the photos: existing ones have an id and a thumbnail, new ones carry both images
  let photos = (prefill && !it ? [] : (rec.thumbs || []).map((t, k) => ({ id: (rec.photoIds || [])[k], t })));
  const roomsUsed = [...new Set([...AC.ROOMS, ...ctx.apps.asset.map(i => (i.room || '').trim()).filter(Boolean)])];
  const dl = h('datalist', { id: 'rooms-list' }, roomsUsed.map(r => h('option', { value: r })));
  const name = h('input', { value: rec.name, maxlength: 80, placeholder: 'What is it?', 'aria-label': 'Item name' });
  const room = h('input', { value: rec.room || '', maxlength: 40, list: 'rooms-list', placeholder: 'Which room?', 'aria-label': 'Room' });
  const category = h('select', { 'aria-label': 'Item category' }, AC.ASSET_CATEGORIES.map(c => h('option', { value: c }, c)));
  category.value = AC.ASSET_CATEGORIES.includes(rec.category) ? rec.category : 'Other';
  const qty = h('input', { type: 'number', min: '1', max: '9999', step: '1', value: String(AC.unitsOf(rec)), 'aria-label': 'Quantity' });
  const price = h('input', { value: rec.cents ? (rec.cents / 100).toFixed(2) : (isNew ? '' : '0.00'), inputmode: 'decimal', placeholder: '0.00', 'aria-label': 'Price each' });
  const date = h('input', { type: 'date', value: rec.date || '', 'aria-label': 'Purchase date' });
  const store = h('input', { value: rec.store || '', maxlength: 60, placeholder: 'Where from?', 'aria-label': 'Store' });
  const serial = h('input', { value: rec.serial || '', maxlength: 60, placeholder: 'Model or serial number', 'aria-label': 'Serial or model' });
  const warranty = h('input', { type: 'date', value: rec.warrantyEnd || '', 'aria-label': 'Warranty ends' });
  const value = h('input', { value: rec.valueCents == null ? '' : (rec.valueCents / 100).toFixed(2), inputmode: 'decimal', placeholder: 'Leave blank to estimate', 'aria-label': 'Current value each' });
  const life = h('input', { type: 'number', min: '0.5', max: '100', step: '0.5', value: rec.lifeYears ? String(rec.lifeYears) : '', placeholder: 'e.g. 10', 'aria-label': 'Useful life in years' });
  const note = h('textarea', { rows: 3, maxlength: 5000, 'aria-label': 'Item notes' }, rec.note || '');
  const err = h('p', { class: 'err' });

  // ---- photos
  const grid = h('div', { class: 'ph-grid' });
  const phCount = h('span', { class: 'muted' });
  const drawPhotos = () => {
    phCount.textContent = `${photos.length} of ${MAX_PHOTOS}`;
    grid.replaceChildren(...photos.map((p, k) => h('div', { class: 'ph-tile' + (k === 0 ? ' cover' : '') },
      h('img', { src: p.t, alt: `Photo ${k + 1}` }),
      k === 0 ? h('span', { class: 'ph-badge' }, 'Cover') : h('button', { type: 'button', class: 'ph-btn star', 'aria-label': 'Make this the cover photo', title: 'Make cover', onclick: () => { photos.unshift(photos.splice(k, 1)[0]); drawPhotos(); } }, icon('check')),
      h('button', { type: 'button', class: 'ph-btn x', 'aria-label': `Remove photo ${k + 1}`, title: 'Remove', onclick: () => { photos.splice(k, 1); drawPhotos(); } }, icon('x')))));
  };
  const addFiles = async files => {
    for (const f of [...files]) {
      if (photos.length >= MAX_PHOTOS) { toast(`Up to ${MAX_PHOTOS} photos per item.`); break; }
      const blocked = await pictureBlocked(f);
      if (blocked) { toast(blocked); break; }
      try { photos.push({ t: await downscale(f, 360), f: await downscale(f, 1100) }); drawPhotos(); }
      catch { toast("That doesn't look like an image."); }
    }
  };
  const pick = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, 'aria-label': 'Choose photos' });
  const snap = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, 'aria-label': 'Take a photo' });
  for (const inp of [pick, snap]) inp.addEventListener('change', async () => { const fs_ = [...inp.files]; inp.value = ''; await addFiles(fs_); });
  drawPhotos();

  const save = h('button', { class: 'btn primary' }, isNew ? 'Add item' : 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New item' : 'Edit item')),
    h('div', { class: 'mp' }, dl,
      h('div', { class: 'ph-head' }, h('b', {}, 'Photos'), phCount),
      grid,
      h('div', { class: 'btnrow', style: 'margin-bottom:14px' }, h('button', { type: 'button', class: 'btn', onclick: () => photos.length < MAX_PHOTOS ? snap.click() : toast(`Up to ${MAX_PHOTOS} photos per item.`) }, 'Take photo'), h('button', { type: 'button', class: 'btn', onclick: () => photos.length < MAX_PHOTOS ? pick.click() : toast(`Up to ${MAX_PHOTOS} photos per item.`) }, 'Add photos'), pick, snap),
      fieldEl('Name', name), h('div', { class: 'two' }, fieldEl('Room', room), fieldEl('Category', category)),
      h('div', { class: 'two' }, fieldEl('Quantity', qty), fieldEl('Price each', price)),
      h('div', { class: 'two' }, fieldEl('Bought on', date), fieldEl('Warranty ends', warranty)),
      fieldEl('Store', store), fieldEl('Model or serial number', serial),
      h('div', { class: 'two' }, fieldEl('Worth now, each (optional)', value), fieldEl('Useful life, years (optional)', life)),
      h('p', { class: 'fine', style: 'padding:0 0 10px' }, 'Leave "worth now" blank and give a useful life, and the app estimates the value by spreading the price evenly over those years.'),
      fieldEl('Notes', note),
      err, h('div', { class: 'btnrow', style: 'margin-top:12px' }, save,
        !isNew && h('button', { class: 'btn', onclick: () => { close(); const { id, createdAt, photoIds, thumbs, mtoken, ...copy } = rec; assetEditor(acct, ctx, null, { ...copy, name: rec.name + ' (copy)' }); } }, 'Duplicate'),
        !isNew && h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this item and its photos?')) return; await deleteMedia(acct, rec.mtoken); await appDelete(rec.id); close(); render(true); } }, 'Delete')))));
  save.addEventListener('click', async () => {
    const cents = AC.parseMoney(price.value);
    const q = Number(qty.value), vc = value.value.trim() === '' ? null : AC.parseMoney(value.value), ly = life.value.trim() === '' ? null : Number(life.value);
    if (!name.value.trim()) return void (err.textContent = 'Give it a name.');
    if (cents === null || cents < 0) return void (err.textContent = 'Price like 49 or 49.99. Use 0 for a gift.');
    if (!Number.isInteger(q) || q < 1 || q > 9999) return void (err.textContent = 'Quantity is a whole number from 1 to 9,999.');
    if (vc !== null && vc < 0) return void (err.textContent = 'Worth now cannot be negative.');
    if (ly !== null && !(ly >= 0.5 && ly <= 100)) return void (err.textContent = 'Useful life is 0.5 to 100 years.');
    if (date.value && !AC.isKey(date.value)) return void (err.textContent = 'That purchase date is not a date.');
    if (warranty.value && !AC.isKey(warranty.value)) return void (err.textContent = 'That warranty date is not a date.');
    save.disabled = true;
    // 1) new full-size photos go in as their own records, tied together by a private token
    const token = rec.mtoken || uid(), made = [];
    for (const p of photos.filter(x => !x.id)) {
      const id = uid();
      if (!(await appSave(acct, { id, accountId: acct.id, kind: 'photo', asset: rec.id, f: p.f, createdAt: Date.now(), m: token }))) { for (const m of made) await appDelete(m); save.disabled = false; return; }
      p.id = id; made.push(id);
    }
    // 2) then the item itself, holding the thumbnails and the order
    Object.assign(rec, { name: name.value.trim(), room: room.value.trim(), category: category.value, qty: q, cents, date: date.value || '', store: store.value.trim(), serial: serial.value.trim(), warrantyEnd: warranty.value || '', valueCents: vc, lifeYears: ly, note: note.value.trim(), updatedAt: Date.now(), mtoken: photos.length ? token : (rec.mtoken || null), photoIds: photos.map(p => p.id), thumbs: photos.map(p => p.t) });
    if (!(await appSave(acct, rec))) { for (const m of made) await appDelete(m); save.disabled = false; return; }
    // 3) finally forget photos you removed
    for (const id of originalIds.filter(id => !photos.some(p => p.id === id))) await appDelete(id);
    close(); render(true);
  });
  setTimeout(() => name.focus(), 0);
}

/* ---------- Groceries ---------- */
let grocList = 'default';
function groceryView(acct, ctx, back) {
  const A = ctx.apps;
  const lists = [{ id: 'default', name: 'Groceries' }, ...[...A.glist].sort((a, b) => a.createdAt - b.createdAt)];
  if (!lists.some(l => l.id === grocList)) grocList = 'default';
  const cur = lists.find(l => l.id === grocList);
  const items = A.groc.filter(i => (i.list || 'default') === grocList);
  const live = items.filter(i => !i.archived);
  const need = live.filter(i => !i.checked), cart = live.filter(i => i.checked);
  const input = h('input', { class: 'groc-input', placeholder: 'Add an item. Try "2 lb apples" or "milk, eggs, bread"', 'aria-label': 'Add an item', list: 'groc-names', autocomplete: 'off', maxlength: 400 });
  const names = [...new Set(items.map(i => i.name))];
  const dl = h('datalist', { id: 'groc-names' }, names.map(n => h('option', { value: n })));
  const refocus = () => render(true).then(() => $('.groc-input')?.focus());
  const addText = async text => {
    let changed = 0;
    for (const part of String(text).split(/[,\n]/)) {
      const p = AC.parseQuickAdd(part);
      if (!p) continue;
      const match = items.find(i => i.name.toLowerCase() === p.name.toLowerCase());
      let rec;
      if (match && !match.archived && !match.checked) rec = { ...match, qty: Math.min(999, (Number(match.qty) || 1) + p.qty), unit: match.unit || p.unit, updatedAt: Date.now() };
      else if (match) rec = { ...match, archived: false, checked: false, qty: p.qty, unit: p.unit || match.unit || '', uses: (match.uses || 1) + 1, updatedAt: Date.now() };
      else rec = { id: uid(), accountId: acct.id, kind: 'groc', list: grocList, name: p.name, qty: p.qty, unit: p.unit, aisle: AC.guessAisle(p.name), priceCents: null, note: '', checked: false, archived: false, uses: 1, createdAt: Date.now(), updatedAt: Date.now() };
      if (!(await appSave(acct, rec))) return changed;
      const at = items.findIndex(i => i.id === rec.id); if (at >= 0) items[at] = rec; else items.push(rec);
      changed++;
    }
    return changed;
  };
  const submit = async () => { const t = input.value; if (!t.trim()) return; input.disabled = true; if (await addText(t)) { input.value = ''; } input.disabled = false; refocus(); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  const toggle = async i => { if (await appSave(acct, { ...i, checked: !i.checked, updatedAt: Date.now() })) render(true); };
  const row = i => h('div', { class: 'groc-row' + (i.checked ? ' done' : '') },
    h('button', { class: 'groc-check', role: 'checkbox', 'aria-checked': String(!!i.checked), 'aria-label': `${i.checked ? 'Put back' : 'Got'} ${i.name}`, onclick: () => toggle(i) }, i.checked ? icon('check') : null),
    h('span', { class: 'groc-name' }, AC.qtyText(i) ? h('b', { class: 'groc-qty' }, AC.qtyText(i)) : null, ' ', i.name, i.note ? h('span', { class: 'muted groc-note' }, ' · ' + i.note) : null),
    Number.isSafeInteger(i.priceCents) ? h('span', { class: 'muted' }, money(Math.round(i.priceCents * (Number(i.qty) || 1)))) : null,
    h('button', { class: 'groc-edit', 'aria-label': `Edit ${i.name}`, onclick: () => groceryEditor(acct, i) }, icon('compose')));
  const groups = AC.AISLES.map(a => [a, need.filter(i => (i.aisle || 'Other') === a).sort((x, y) => x.name.localeCompare(y.name))]).filter(([, l]) => l.length);
  const total = AC.groceryTotal(live);
  const frequent = items.filter(i => i.archived).sort((a, b) => (b.uses || 1) - (a.uses || 1) || b.updatedAt - a.updatedAt).slice(0, 12);
  const copy = async () => { try { await navigator.clipboard.writeText(AC.groceryText(live, cur.name)); toast('List copied. Paste it anywhere.'); } catch { toast('Could not copy.'); } };
  const clearCart = async () => { for (const i of cart) if (!(await appSave(acct, { ...i, checked: false, archived: true, updatedAt: Date.now() }))) break; render(true); };
  const uncheckAll = async () => { for (const i of cart) if (!(await appSave(acct, { ...i, checked: false, updatedAt: Date.now() }))) break; render(true); };
  return [back(cur.name), h('div', { class: 'app-pad' }, dl,
    h('div', { class: 'chips', role: 'tablist', 'aria-label': 'Lists' }, lists.map(l => h('button', { class: 'chip' + (l.id === grocList ? ' on' : ''), role: 'tab', 'aria-selected': String(l.id === grocList), onclick: () => { grocList = l.id; render(true); } }, l.name)), h('button', { class: 'chip add', onclick: () => listEditor(acct, null) }, '+ New list')),
    h('div', { class: 'groc-add' }, input, h('button', { class: 'btn primary', onclick: submit }, 'Add')),
    frequent.length ? h('div', { class: 'chips freq', 'aria-label': 'Add again' }, frequent.map(i => h('button', { class: 'chip', title: 'Add again', onclick: async () => { if (await addText(i.name)) render(true); } }, '+ ' + i.name))) : null,
    live.length ? h('div', { class: 'groc-progress' }, h('span', { class: 'muted' }, `${cart.length} of ${live.length} in the cart`), h('div', { class: 'cat-bar' }, h('i', { style: `width:${live.length ? cart.length / live.length * 100 : 0}%` }))) : null,
    !live.length ? emptyState('Nothing to buy', 'Add the first thing above. Commas add several at once.') : null,
    groups.map(([aisle, list]) => h('div', { class: 'aisle' }, h('h4', {}, aisle, h('span', { class: 'muted' }, ' ' + list.length)), list.map(row))),
    cart.length ? h('div', { class: 'aisle in-cart' }, h('h4', {}, 'In the cart', h('span', { class: 'muted' }, ' ' + cart.length)), cart.map(row)) : null,
    live.length ? h('p', { class: 'fine', style: 'padding:10px 0' }, total ? `Estimated total ${money(total)} (for items with a price)` : 'Add prices in an item\'s editor to see an estimated total.') : null,
    h('div', { class: 'btnrow', style: 'margin-top:8px' },
      cart.length ? h('button', { class: 'btn primary', onclick: clearCart }, 'Clear the cart') : null,
      cart.length ? h('button', { class: 'btn', onclick: uncheckAll }, 'Put everything back') : null,
      live.length ? h('button', { class: 'btn', onclick: copy }, 'Copy list') : null,
      grocList !== 'default' ? h('button', { class: 'btn', onclick: () => listEditor(acct, A.glist.find(l => l.id === grocList)) }, 'Rename or delete list') : null))];
}

function groceryEditor(acct, i) {
  const rec = { ...i };
  const name = h('input', { value: rec.name, maxlength: 80, 'aria-label': 'Item' });
  const qty = h('input', { type: 'number', min: '0.01', max: '999', step: 'any', value: String(Number(rec.qty) || 1), 'aria-label': 'Quantity' });
  const unit = h('input', { value: rec.unit || '', maxlength: 20, placeholder: 'lb, dozen, can...', 'aria-label': 'Unit' });
  const aisle = h('select', { 'aria-label': 'Aisle' }, AC.AISLES.map(a => h('option', { value: a }, a)));
  aisle.value = rec.aisle || 'Other';
  const price = h('input', { value: Number.isSafeInteger(rec.priceCents) ? (rec.priceCents / 100).toFixed(2) : '', inputmode: 'decimal', placeholder: 'optional', 'aria-label': 'Price each' });
  const note = h('input', { value: rec.note || '', maxlength: 120, placeholder: 'brand, size, anything', 'aria-label': 'Note' });
  const err = h('p', { class: 'err' });
  const save = h('button', { class: 'btn primary' }, 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Edit item')),
    h('div', { class: 'mp' }, fieldEl('Item', name), h('div', { class: 'two' }, fieldEl('Quantity', qty), fieldEl('Unit', unit)), h('div', { class: 'two' }, fieldEl('Aisle', aisle), fieldEl('Price each', price)), fieldEl('Note', note), err,
      h('div', { class: 'btnrow' }, save, h('button', { class: 'btn danger', onclick: async () => { await appDelete(rec.id); close(); render(true); } }, 'Remove')))));
  save.addEventListener('click', async () => {
    const q = Number(qty.value), pc = price.value.trim() === '' ? null : AC.parseMoney(price.value);
    if (!name.value.trim()) return void (err.textContent = 'Give it a name.');
    if (!(q > 0 && q <= 999)) return void (err.textContent = 'Quantity is between 0 and 999.');
    if (pc !== null && pc < 0) return void (err.textContent = 'Price like 2.49.');
    Object.assign(rec, { name: AC.parseQuickAdd(name.value)?.name || name.value.trim(), qty: q, unit: unit.value.trim(), aisle: aisle.value, priceCents: pc, note: note.value.trim(), updatedAt: Date.now() });
    save.disabled = true;
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    close(); render(true);
  });
}

function listEditor(acct, l) {
  const rec = l ? { ...l } : { id: uid(), accountId: acct.id, kind: 'glist', name: '', createdAt: Date.now() };
  const name = h('input', { value: rec.name, maxlength: 40, placeholder: 'Costco, Pharmacy, Party...', 'aria-label': 'List name' });
  const err = h('p', { class: 'err' });
  const save = h('button', { class: 'btn primary' }, l ? 'Save' : 'Create list');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, l ? 'Rename list' : 'New list')),
    h('div', { class: 'mp' }, fieldEl('Name', name), err,
      h('div', { class: 'btnrow' }, save, l && h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Delete the list "${rec.name}" and everything on it?`)) return;
        const all = await loadPosts(acct); for (const i of all.filter(x => x.kind === 'groc' && x.list === rec.id)) await appDelete(i.id);
        await appDelete(rec.id); grocList = 'default'; close(); render(true);
      } }, 'Delete list')))));
  save.addEventListener('click', async () => {
    if (!name.value.trim()) return void (err.textContent = 'Name the list.');
    rec.name = name.value.trim();
    save.disabled = true;
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    grocList = rec.id; close(); render(true);
  });
  setTimeout(() => name.focus(), 0);
}

/* ---------- Chores ---------- */
let choreTab = 'today', choreWho = 'all';
function choresView(acct, ctx, back) {
  const A = ctx.apps, today = todayKey();
  const active = A.chore.filter(c => !c.archived);
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(choreTab === k), class: choreTab === k ? 'active' : '', onclick: () => { choreTab = k; render(true); } }, label);
  const people = [...new Set([...A.chore.map(c => (c.assignee || '').trim()), ...A.done.map(d => (d.who || '').trim())].filter(Boolean))].sort();
  let body;
  if (choreTab === 'upcoming') body = choreUpcoming(acct, ctx, active, today);
  else if (choreTab === 'all') body = choreAll(acct, ctx, active, today, people);
  else if (choreTab === 'history') body = choreHistory(acct, ctx, today);
  else body = choreToday(acct, ctx, active, today);
  return [back('Chores', { action: h('button', { class: 'btn primary', onclick: () => choreEditor(acct, ctx, null) }, 'Add chore') }),
    h('div', { class: 'tabs', role: 'tablist' }, tab('today', 'Today'), tab('upcoming', 'Upcoming'), tab('all', 'All'), tab('history', 'History')),
    h('div', { class: 'app-pad' }, body)];
}

async function completeChore(acct, ch) {
  const today = todayKey(), next = AC.nextDue(ch, today);
  const log = { id: uid(), accountId: acct.id, kind: 'done', chore: ch.id, title: ch.title, who: ch.assignee || '', date: today, ts: Date.now(), prev: { due: ch.due || '', lastDone: ch.lastDone || '', doneCount: ch.doneCount || 0, archived: !!ch.archived } };
  if (!(await appSave(acct, log))) return;
  const upd = { ...ch, lastDone: today, doneCount: (ch.doneCount || 0) + 1, updatedAt: Date.now() };
  if (next) upd.due = next; else upd.archived = true;
  if (!(await appSave(acct, upd))) { await appDelete(log.id); return; }
  toast(next ? `Done. Next one: ${AC.parseKey(next).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.` : 'Done. Crossed off for good.');
  render(true);
}
async function undoChore(acct, ctx, log) {
  const ch = ctx.apps.chore.find(c => c.id === log.chore);
  if (ch && log.prev) await appSave(acct, { ...ch, due: log.prev.due, lastDone: log.prev.lastDone, doneCount: log.prev.doneCount, archived: log.prev.archived, updatedAt: Date.now() });
  await appDelete(log.id); toast('Undone.'); render(true);
}
const choreSnooze = async (acct, ch) => { const t = todayKey(); if (await appSave(acct, { ...ch, due: AC.addDays(ch.due && ch.due > t ? ch.due : t, 1), updatedAt: Date.now() })) { toast('Pushed to tomorrow.'); render(true); } };
const choreSkip = async (acct, ch) => { const next = AC.nextDue(ch, todayKey()); if (await appSave(acct, next ? { ...ch, due: next, updatedAt: Date.now() } : { ...ch, archived: true, updatedAt: Date.now() })) { toast(next ? 'Skipped this one.' : 'Dropped.'); render(true); } };

function choreRow(acct, ctx, ch, today, actions = true) {
  const st = AC.choreStatus(ch, today);
  return h('div', { class: `chore-row ${st}` },
    h('button', { class: 'chore-check', 'aria-label': `Mark ${ch.title} done`, title: 'Done', onclick: () => completeChore(acct, ch) }, icon('check')),
    h('button', { class: 'chore-main', onclick: () => choreEditor(acct, ctx, ch) },
      h('b', {}, ch.title),
      h('span', { class: 'muted' }, [AC.dueLabel(ch, today), ch.repeat && ch.repeat !== 'none' ? AC.repeatLabel(ch) : null, ch.assignee ? '@ ' + ch.assignee : null].filter(Boolean).join(' · '))),
    actions ? h('div', { class: 'chore-acts' }, h('button', { class: 'btn', onclick: () => choreSnooze(acct, ch) }, 'Tomorrow'), h('button', { class: 'btn', onclick: () => choreSkip(acct, ch) }, 'Skip')) : null);
}

function choreToday(acct, ctx, active, today) {
  const over = active.filter(c => AC.choreStatus(c, today) === 'overdue').sort(AC.choreSort);
  const now = active.filter(c => AC.choreStatus(c, today) === 'today').sort(AC.choreSort);
  if (!over.length && !now.length) return [emptyState(active.length ? 'All caught up' : 'No chores yet', active.length ? 'Nothing is due today. Enjoy it.' : 'Add the first one. Repeating chores come back on their own.')];
  return [over.length ? h('div', { class: 'aisle' }, h('h4', { class: 'bad' }, 'Overdue', h('span', { class: 'muted' }, ' ' + over.length)), over.map(c => choreRow(acct, ctx, c, today))) : null,
    now.length ? h('div', { class: 'aisle' }, h('h4', {}, 'Due today', h('span', { class: 'muted' }, ' ' + now.length)), now.map(c => choreRow(acct, ctx, c, today))) : null];
}
function choreUpcoming(acct, ctx, active, today) {
  const soon = active.filter(c => c.due && c.due > today && AC.diffDays(c.due, today) <= 14).sort(AC.choreSort);
  if (!soon.length) return [emptyState('Nothing coming up', 'No chores in the next two weeks.')];
  const days = [...new Set(soon.map(c => c.due))];
  return days.map(d => h('div', { class: 'aisle' }, h('h4', {}, longDate(d)), soon.filter(c => c.due === d).map(c => choreRow(acct, ctx, c, today, false))));
}
function choreAll(acct, ctx, active, today, people) {
  const sel = h('select', { 'aria-label': 'Who', onchange: e => { choreWho = e.target.value; render(true); } }, h('option', { value: 'all' }, 'Everyone'), people.map(p => h('option', { value: p }, p)));
  sel.value = people.includes(choreWho) ? choreWho : 'all';
  const list = active.filter(c => choreWho === 'all' || (c.assignee || '').trim() === choreWho).sort(AC.choreSort);
  return [people.length ? h('div', { class: 'app-row' }, sel) : null, list.length ? list.map(c => choreRow(acct, ctx, c, today, false)) : [emptyState('No chores', 'Nothing here.')]];
}
function choreHistory(acct, ctx, today) {
  const done = [...ctx.apps.done].sort((a, b) => b.ts - a.ts);
  const stats = AC.choreStats(done, ymOf(today)), max = Math.max(1, ...stats.map(s => s.count));
  if (!done.length) return [emptyState('Nothing done yet', 'Finished chores show up here.')];
  const days = [...new Set(done.slice(0, 80).map(d => d.date))];
  return [stats.length ? h('div', { class: 'cat-bars' }, h('h3', {}, 'This month'), stats.map(s => h('div', { class: 'cat-row' }, h('span', {}, s.who), h('div', { class: 'cat-bar' }, h('i', { style: `width:${Math.max(6, s.count / max * 100)}%` })), h('b', {}, String(s.count))))) : null,
    days.map(d => h('div', { class: 'aisle' }, h('h4', {}, longDate(d)), done.filter(x => x.date === d).map(x => h('div', { class: 'groc-row' }, h('span', { class: 'groc-name' }, x.title, x.who ? h('span', { class: 'muted' }, ' · ' + x.who) : null), h('button', { class: 'btn', onclick: () => undoChore(acct, ctx, x) }, 'Undo')))))];
}

function choreEditor(acct, ctx, ch) {
  const isNew = !ch;
  const rec = ch ? { ...ch } : { id: uid(), accountId: acct.id, kind: 'chore', title: '', due: todayKey(), repeat: 'none', repeatFrom: 'due', everyDays: 7, assignee: '', notes: '', doneCount: 0, createdAt: Date.now() };
  const people = [...new Set([...ctx.apps.chore.map(c => (c.assignee || '').trim()), ...ctx.apps.done.map(d => (d.who || '').trim())].filter(Boolean))];
  const title = h('input', { value: rec.title, maxlength: 80, placeholder: 'What needs doing?', 'aria-label': 'Chore' });
  const due = h('input', { type: 'date', value: rec.due || '', 'aria-label': 'Due date' });
  const repeat = h('select', { 'aria-label': 'Repeat' }, AC.REPEATS.map(([v, l]) => h('option', { value: v }, l)));
  repeat.value = rec.repeat || 'none';
  const every = h('input', { type: 'number', min: '1', max: '365', step: '1', value: String(rec.everyDays || 7), 'aria-label': 'Days between' });
  const from = h('select', { 'aria-label': 'Repeat from' }, h('option', { value: 'due' }, 'The due date (fixed schedule)'), h('option', { value: 'done' }, 'When I finish it'));
  from.value = rec.repeatFrom || 'due';
  const who = h('input', { value: rec.assignee || '', maxlength: 40, list: 'chore-people', placeholder: 'Anyone', 'aria-label': 'Assigned to' });
  const dl = h('datalist', { id: 'chore-people' }, people.map(p => h('option', { value: p })));
  const notes = h('textarea', { rows: 3, maxlength: 2000, 'aria-label': 'Chore notes' }, rec.notes || '');
  const err = h('p', { class: 'err' });
  const everyField = fieldEl('Every how many days?', every);
  const sync = () => { everyField.hidden = repeat.value !== 'days'; fromField.hidden = repeat.value === 'none'; };
  const fromField = fieldEl('Repeat from', from);
  repeat.addEventListener('change', sync);
  const save = h('button', { class: 'btn primary' }, isNew ? 'Add chore' : 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New chore' : 'Edit chore')),
    h('div', { class: 'mp' }, dl, fieldEl('Chore', title), h('div', { class: 'two' }, fieldEl('Due', due), fieldEl('Assigned to', who)), fieldEl('Repeat', repeat), everyField, fromField, fieldEl('Notes', notes), err,
      h('div', { class: 'btnrow' }, save, !isNew && h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this chore? Its history stays.')) return; await appDelete(rec.id); close(); render(true); } }, 'Delete')))));
  sync();
  save.addEventListener('click', async () => {
    const n = Number(every.value);
    if (!title.value.trim()) return void (err.textContent = 'Name the chore.');
    if (due.value && !AC.isKey(due.value)) return void (err.textContent = 'That is not a date.');
    if (repeat.value === 'days' && !(Number.isInteger(n) && n >= 1 && n <= 365)) return void (err.textContent = 'Days between is 1 to 365.');
    const dueKey = due.value || (repeat.value !== 'none' ? todayKey() : '');
    Object.assign(rec, { title: title.value.trim(), due: dueKey, repeat: repeat.value, repeatFrom: from.value, everyDays: repeat.value === 'days' ? n : (rec.everyDays || 7), assignee: who.value.trim(), notes: notes.value.trim(), anchorDay: dueKey ? AC.parseKey(dueKey).getDate() : null, archived: false, updatedAt: Date.now() });
    save.disabled = true;
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    close(); render(true);
  });
  setTimeout(() => title.focus(), 0);
}

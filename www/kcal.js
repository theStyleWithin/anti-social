'use strict';
/* Calorie Counter: a food diary with daily targets, built-in foods and your own. Everything stays on this device. */
const KC = KcalCore;
let kcDate = KC.dayKey(), kcTab = 'today';
const kcDefaultProf = acct => ({ id: 'calprof' + acct.id, accountId: acct.id, kind: 'calprof', createdAt: Date.now(), sex: 'female', age: 30, cm: 170, kg: 70, units: 'metric', activity: 'light', goalType: 'keep', split: 'balanced', goal: 2000, custom: [], recent: [], weights: [] });
const kcDayId = (acct, date) => 'calday' + acct.id + date;
const kcBlankDay = (acct, date) => ({ id: kcDayId(acct, date), accountId: acct.id, kind: 'calday', createdAt: Date.now(), date, items: [], ex: [], water: 0 });
const kcUid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
// other apps (push-ups) add an exercise line to today's diary
async function kcalAddExercise(acct, name, kcal, date = KC.dayKey()) {
  const all = await loadPosts(acct); let day = all.find(p => p.kind === 'calday' && p.date === date) || kcBlankDay(acct, date);
  day = { ...day, ex: [...(day.ex || []), { id: kcUid(), name, kcal: Math.round(kcal) }], updatedAt: Date.now() }; return appSave(acct, day);
}

function kcalView(acct, ctx, back) {
  const prof = Object.assign(kcDefaultProf(acct), ctx.apps.calprof[0] || {}), days = new Map((ctx.apps.calday || []).map(d => [d.date, d]));
  const root = h('div', { class: 'app-pad kc' }), foods = () => KcalData.foods.concat(prof.custom.map(c => ({ ...c, cat: 'My foods' })));
  const saveProf = async () => { prof.updatedAt = Date.now(); await appSave(acct, prof); };
  const dayOf = date => days.get(date) || kcBlankDay(acct, date);
  const saveDay = async d => { d.updatedAt = Date.now(); days.set(d.date, d); await appSave(acct, d); };
  const kgOf = () => prof.kg, fmtW = kg => (prof.units === 'imperial' ? KC.round(KC.kgToLb(kg), 1) + ' lb' : KC.round(kg, 1) + ' kg');
  const nf = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* ----- the diary ----- */
  function today() {
    const d = dayOf(kcDate), t = KC.totals(d), goal = prof.goal, left = KC.remaining(goal, t), pct = Math.max(0, Math.min(1, goal ? (t.kcal - t.burned) / goal : 0)), over = left < 0;
    const mt = KC.macroTargets(goal, (KC.SPLITS.find(s => s[0] === prof.split) || KC.SPLITS[0])[2]);
    const dateNav = h('div', { class: 'kc-date' }, h('button', { class: 'btn', 'aria-label': 'Previous day', onclick: () => { kcDate = KC.shiftDay(kcDate, -1); draw(); } }, icon('back')), h('div', {}, h('b', {}, kcDate === KC.dayKey() ? 'Today' : new Date(kcDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })), kcDate === KC.dayKey() ? h('small', {}, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })) : null),
      h('button', { class: 'btn flip', 'aria-label': 'Next day', disabled: kcDate >= KC.dayKey(), onclick: () => { kcDate = KC.shiftDay(kcDate, 1); draw(); } }, icon('back')));
    const R = 54, C = 2 * Math.PI * R, ring = h('div', { class: 'kc-ring' + (over ? ' over' : '') });
    ring.innerHTML = `<svg viewBox="0 0 130 130" role="img" aria-label="${nf(Math.abs(left))} calories ${over ? 'over' : 'left'}"><circle cx="65" cy="65" r="${R}" class="bg"/><circle cx="65" cy="65" r="${R}" class="fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.min(1, pct))}" transform="rotate(-90 65 65)"/></svg>`;
    ring.append(h('div', { class: 'kc-ring-in' }, h('b', {}, nf(Math.abs(left))), h('small', {}, over ? 'over' : 'left')));
    const stat = (n, label) => h('div', { class: 'kc-stat' }, h('b', {}, nf(n)), h('small', {}, label));
    const macro = (name, v, tgt, cls) => h('div', { class: 'kc-macro' }, h('div', { class: 'kc-macro-top' }, h('span', {}, name), h('small', {}, `${KC.round(v)} / ${tgt} g`)), h('div', { class: 'lg-bar' }, h('i', { class: cls, style: `width:${Math.min(100, tgt ? v / tgt * 100 : 0)}%` })));
    const sections = KC.MEALS.map(([id, label]) => {
      const items = d.items.filter(i => i.meal === id);
      return h('section', { class: 'kc-meal' }, h('div', { class: 'kc-meal-top' }, h('b', {}, label), h('small', {}, `${nf(t.byMeal[id] || 0)} kcal`), h('button', { class: 'btn', onclick: () => addFood(id) }, '+ Add')),
        items.length ? items.map(i => h('button', { class: 'kc-item', type: 'button', onclick: () => editItem(i) }, h('span', { class: 'kc-item-n' }, h('b', {}, i.name), h('small', {}, i.serv || '')), h('span', { class: 'kc-item-k' }, nf(i.kcal)))) : h('p', { class: 'fine kc-empty' }, 'Nothing here yet.'));
    });
    const exSec = h('section', { class: 'kc-meal' }, h('div', { class: 'kc-meal-top' }, h('b', {}, 'Exercise'), h('small', {}, `${nf(t.burned)} kcal burned`), h('button', { class: 'btn', onclick: addExercise }, '+ Add')),
      d.ex.length ? d.ex.map(e => h('div', { class: 'kc-item static' }, h('span', { class: 'kc-item-n' }, h('b', {}, e.name)), h('span', { class: 'kc-item-k' }, '−' + nf(e.kcal)), h('button', { class: 'kc-x', type: 'button', 'aria-label': 'Remove ' + e.name, onclick: async () => { d.ex = d.ex.filter(x => x.id !== e.id); await saveDay(d); draw(); } }, icon('x')))) : h('p', { class: 'fine kc-empty' }, 'Push-ups from the Push-Up Counter show up here by themselves.'));
    const water = h('section', { class: 'kc-meal' }, h('div', { class: 'kc-meal-top' }, h('b', {}, 'Water'), h('small', {}, `${d.water} ${d.water === 1 ? 'glass' : 'glasses'} of 8`), h('div', { class: 'btnrow' }, h('button', { class: 'btn', 'aria-label': 'One less glass', disabled: !d.water, onclick: async () => { d.water = Math.max(0, d.water - 1); await saveDay(d); draw(); } }, '−'), h('button', { class: 'btn', 'aria-label': 'One more glass', onclick: async () => { d.water++; await saveDay(d); draw(); } }, '+'))));
    return h('div', {}, dateNav,
      h('div', { class: 'kc-sum' }, ring, h('div', { class: 'kc-sum-r' }, stat(goal, 'Goal'), stat(t.kcal, 'Food'), stat(t.burned, 'Exercise'))),
      h('div', { class: 'kc-macros' }, macro('Protein', t.p, mt.p, 'p'), macro('Carbs', t.c, mt.c, 'c'), macro('Fat', t.f, mt.f, 'f')),
      sections, exSec, water, h('p', { class: 'fine' }, 'Calories for foods are typical values and real products differ, so check the label when you can.'));
  }

  /* picking a food, then how much of it */
  function addFood(meal) {
    let q = ''; const list = h('div', { class: 'kc-list' }), input = h('input', { type: 'search', placeholder: 'Search foods (try “chicken” or “pizza”)', 'aria-label': 'Search foods', autocomplete: 'off', oninput: e => { q = e.target.value; paint(); } });
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add to ' + KC.MEALS.find(m => m[0] === meal)[1])), h('div', { class: 'mp' }, input, list,
      h('div', { class: 'btnrow', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => { close(); quickAdd(meal); } }, 'Just add calories'), h('button', { class: 'btn', onclick: () => { close(); makeFood(meal); } }, 'Create a food')))));
    const paint = () => {
      const all = foods(), recent = prof.recent.map(id => all.find(f => f.id === id)).filter(Boolean);
      const res = q.trim() ? KC.search(all, q).slice(0, 60) : recent.concat(prof.custom.map(c => ({ ...c, cat: 'My foods' })).filter(c => !recent.some(r => r.id === c.id))).slice(0, 25);
      list.replaceChildren(...(res.length ? res.map(f => h('button', { class: 'kc-food', type: 'button', onclick: () => { close(); portion(meal, f); } }, h('span', {}, h('b', {}, f.name), h('small', {}, f.serving)), h('span', { class: 'kc-item-k' }, nf(f.kcal)))) : [h('p', { class: 'muted' }, q.trim() ? 'No match. Create it as your own food.' : 'Search the built-in foods, or create your own.')]));
    };
    paint(); setTimeout(() => input.focus(), 30);
  }
  function portion(meal, f, editing) {
    let qty = editing ? editing.qty : 1; const sp = qty => KC.portion(f, qty);
    const qIn = h('input', { type: 'number', min: '0.1', step: '0.25', value: String(qty), 'aria-label': 'Servings', inputmode: 'decimal' }), gIn = f.g > 0 ? h('input', { type: 'number', min: '1', step: '5', value: String(KC.round(f.g * qty)), 'aria-label': 'Grams', inputmode: 'decimal' }) : null, out = h('div', { class: 'kc-port' });
    const show = () => { const v = sp(qty); out.replaceChildren(h('b', {}, `${nf(v.kcal)} kcal`), h('small', {}, `Protein ${v.p} g · Carbs ${v.c} g · Fat ${v.f} g`)); };
    qIn.addEventListener('input', () => { qty = Math.max(0, Number(qIn.value) || 0); if (gIn) gIn.value = String(KC.round(f.g * qty)); show(); });
    if (gIn) gIn.addEventListener('input', () => { qty = KC.qtyFromGrams(f, Math.max(0, Number(gIn.value) || 0)); qIn.value = String(KC.round(qty, 2)); show(); });
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, f.name)), h('div', { class: 'mp' }, h('p', { class: 'muted' }, `One serving: ${f.serving}`),
      h('div', { class: 'tool-fields' }, h('label', { class: 'field' }, h('span', {}, 'Servings'), qIn), gIn ? h('label', { class: 'field' }, h('span', {}, 'Or grams'), gIn) : null), out,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: async () => {
        if (!(qty > 0)) { toast('Enter an amount.'); return; } const d = dayOf(kcDate), v = sp(qty), item = { id: editing ? editing.id : kcUid(), meal: editing ? editing.meal : meal, name: f.name, serv: `${KC.round(qty, 2)} × ${f.serving}`, qty, fid: f.id, ...v };
        d.items = editing ? d.items.map(i => (i.id === editing.id ? item : i)) : d.items.concat(item);
        prof.recent = [f.id, ...prof.recent.filter(x => x !== f.id)].slice(0, 20); close(); await saveDay(d); saveProf(); draw(); } }, editing ? 'Save' : 'Add'),
        editing ? h('button', { class: 'btn danger', onclick: async () => { const d = dayOf(kcDate); d.items = d.items.filter(i => i.id !== editing.id); close(); await saveDay(d); draw(); } }, 'Remove') : null))));
    show(); setTimeout(() => qIn.select(), 30);
  }
  function editItem(i) { const f = foods().find(x => x.id === i.fid) || { id: i.fid || 'x', name: i.name, serving: 'serving', g: 0, kcal: i.qty ? i.kcal / i.qty : i.kcal, p: i.qty ? i.p / i.qty : i.p, c: i.qty ? i.c / i.qty : i.c, f: i.qty ? i.f / i.qty : i.f }; portion(i.meal, f, i); }
  function quickAdd(meal) {
    const name = h('input', { placeholder: 'What was it? (optional)', 'aria-label': 'Name' }), kc = h('input', { type: 'number', min: '1', placeholder: 'Calories', 'aria-label': 'Calories', inputmode: 'numeric' });
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add calories')), h('div', { class: 'mp' }, h('label', { class: 'field' }, h('span', {}, 'Name'), name), h('label', { class: 'field' }, h('span', {}, 'Calories'), kc),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: async () => { const n = Number(kc.value); if (!(n > 0)) { toast('Enter the calories.'); return; } const d = dayOf(kcDate); d.items.push({ id: kcUid(), meal, name: name.value.trim() || 'Quick add', serv: '', qty: 1, kcal: Math.round(n), p: 0, c: 0, f: 0 }); close(); await saveDay(d); draw(); } }, 'Add')))));
    setTimeout(() => kc.focus(), 30);
  }
  function makeFood(meal, then) {
    const fld = (label, ph, type = 'text', step) => h('input', { 'aria-label': label, placeholder: ph, type, step, inputmode: type === 'number' ? 'decimal' : null }), n = fld('Name', 'Name'), s = fld('Serving', 'One serving is… (1 cup, 1 slice)'), g = fld('Grams', 'Grams in a serving (optional)', 'number'), k = fld('Calories', 'Calories', 'number'), p = fld('Protein', 'Protein g', 'number', '0.1'), c = fld('Carbs', 'Carbs g', 'number', '0.1'), f = fld('Fat', 'Fat g', 'number', '0.1');
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Create a food')), h('div', { class: 'mp' }, h('div', { class: 'tool-fields' }, n, s, g, k, p, c, f),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: async () => { if (!n.value.trim() || !(Number(k.value) >= 0) || k.value === '') { toast('A name and the calories are needed.'); return; } const food = { id: 'u:' + kcUid(), name: n.value.trim().slice(0, 60), serving: s.value.trim() || '1 serving', g: Number(g.value) || 0, kcal: Number(k.value), p: Number(p.value) || 0, c: Number(c.value) || 0, f: Number(f.value) || 0 }; prof.custom.push(food); await saveProf(); close(); if (meal) portion(meal, { ...food, cat: 'My foods' }); else if (then) then(); } }, 'Save')))));
    setTimeout(() => n.focus(), 30);
  }
  function addExercise() {
    const name = h('input', { placeholder: 'What did you do?', 'aria-label': 'Exercise' }), kc = h('input', { type: 'number', min: '1', placeholder: 'Calories burned', 'aria-label': 'Calories burned', inputmode: 'numeric' });
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add exercise')), h('div', { class: 'mp' }, h('label', { class: 'field' }, h('span', {}, 'Exercise'), name), h('label', { class: 'field' }, h('span', {}, 'Calories burned'), kc), h('p', { class: 'fine' }, 'Burned calories raise how much you can eat that day.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: async () => { const n = Number(kc.value); if (!(n > 0)) { toast('Enter the calories burned.'); return; } const d = dayOf(kcDate); d.ex.push({ id: kcUid(), name: name.value.trim() || 'Exercise', kcal: Math.round(n) }); close(); await saveDay(d); draw(); } }, 'Add')))));
    setTimeout(() => name.focus(), 30);
  }

  /* ----- progress ----- */
  function progress() {
    const keys = Array.from({ length: 14 }, (_, i) => KC.shiftDay(KC.dayKey(), i - 13)), vals = keys.map(k => { const d = days.get(k); return d && d.items.length ? KC.totals(d) : null; }), logged = vals.filter(Boolean);
    const avg = logged.length ? Math.round(logged.reduce((a, t) => a + t.kcal, 0) / logged.length) : 0, max = Math.max(prof.goal * 1.2, ...logged.map(t => t.kcal), 1);
    const W = 320, H = 130, bw = W / 14, chart = h('div', { class: 'kc-chart' });
    chart.innerHTML = `<svg viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Calories for the last 14 days">${vals.map((t, i) => { if (!t) return `<rect x="${i * bw + 3}" y="${H - 2}" width="${bw - 6}" height="2" class="none"/>`; const hh = Math.max(2, t.kcal / max * H); return `<rect x="${i * bw + 3}" y="${H - hh}" width="${bw - 6}" height="${hh}" rx="3" class="${t.kcal > prof.goal + t.burned ? 'over' : 'ok'}"/>`; }).join('')}<line x1="0" x2="${W}" y1="${H - prof.goal / max * H}" y2="${H - prof.goal / max * H}" class="goal"/>${keys.map((k, i) => (i % 3 === 0 ? `<text x="${i * bw + bw / 2}" y="${H + 14}" text-anchor="middle">${k.slice(8)}</text>` : '')).join('')}</svg>`;
    const ws = prof.weights.slice().sort((a, b) => a.date.localeCompare(b.date)), wIn = h('input', { type: 'number', step: '0.1', inputmode: 'decimal', placeholder: prof.units === 'imperial' ? 'Weight in lb' : 'Weight in kg', 'aria-label': 'Weight' });
    const wchart = h('div', { class: 'kc-chart' }); if (ws.length >= 2) { const vs = ws.map(w => w.kg), lo = Math.min(...vs) - 1, hi = Math.max(...vs) + 1, pts = ws.slice(-30).map((w, i, a) => `${(i / Math.max(1, a.length - 1)) * (W - 20) + 10},${H - ((w.kg - lo) / (hi - lo)) * (H - 10) - 5}`).join(' '); wchart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time"><polyline points="${pts}" class="line"/></svg>`; }
    return h('div', {}, h('h3', { class: 'lg-h2' }, 'Last 14 days'), chart, h('p', { class: 'fine' }, logged.length ? `You logged food on ${logged.length} of the last 14 days, about ${nf(avg)} calories on those days. The line is your goal.` : 'Log some food and the chart fills in.'),
      h('h3', { class: 'lg-h2' }, 'Weight'), h('div', { class: 'app-row' }, wIn, h('button', { class: 'btn primary', onclick: async () => { const v = Number(wIn.value); if (!(v > 0)) { toast('Enter your weight.'); return; } const kg = prof.units === 'imperial' ? KC.lbToKg(v) : v; prof.weights = prof.weights.filter(w => w.date !== KC.dayKey()).concat({ date: KC.dayKey(), kg: KC.round(kg, 2) }); prof.kg = KC.round(kg, 1); await saveProf(); draw(); } }, 'Log today')),
      ws.length >= 2 ? wchart : h('p', { class: 'fine' }, 'Log your weight on two different days to see a line.'),
      ws.length ? h('div', { class: 'kc-wlist' }, ws.slice(-8).reverse().map(w => h('div', { class: 'kc-item static' }, h('span', { class: 'kc-item-n' }, h('b', {}, new Date(w.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))), h('span', { class: 'kc-item-k' }, fmtW(w.kg)), h('button', { class: 'kc-x', type: 'button', 'aria-label': 'Delete this weight', onclick: async () => { prof.weights = prof.weights.filter(x => x.date !== w.date); await saveProf(); draw(); } }, icon('x'))))) : null);
  }

  /* ----- goals ----- */
  function goals() {
    const imp = prof.units === 'imperial', sel = (label, key, opts, after) => { const s = h('select', { 'aria-label': label, onchange: e => { prof[key] = e.target.value; saveProf(); if (after) after(); calc(); } }, opts.map(([v, n]) => h('option', { value: v }, n))); s.value = prof[key]; return h('label', { class: 'field' }, h('span', {}, label), s); };
    const num = (label, get, set, step = '1') => { const i = h('input', { type: 'number', step, value: String(get()), inputmode: 'decimal', 'aria-label': label, oninput: e => { const v = Number(e.target.value); if (v > 0) { set(v); saveProf(); calc(); } } }); return h('label', { class: 'field' }, h('span', {}, label), i); };
    const out = h('div', { class: 'kc-plan' }); let tgt;
    const calc = () => { const p = KC.plan({ sex: prof.sex, kg: prof.kg, cm: prof.cm, age: prof.age, activity: prof.activity, goal: prof.goalType }); const m = KC.macroTargets(p.goal, (KC.SPLITS.find(s => s[0] === prof.split) || KC.SPLITS[0])[2]);
      out.replaceChildren(h('div', { class: 'kc-stats3' }, h('div', { class: 'kc-stat' }, h('b', {}, nf(p.bmr)), h('small', {}, 'at rest')), h('div', { class: 'kc-stat' }, h('b', {}, nf(p.tdee)), h('small', {}, 'to stay the same')), h('div', { class: 'kc-stat' }, h('b', {}, nf(p.goal)), h('small', {}, 'suggested goal'))),
        h('p', { class: 'fine' }, `That is about ${m.p} g protein, ${m.c} g carbs and ${m.f} g fat a day.` + (p.low ? ` The goal was raised to ${p.floor}, the lowest amount that is generally considered safe without a doctor's advice.` : '')),
        h('button', { class: 'btn primary', onclick: () => { prof.goal = p.goal; saveProf(); if (tgt) tgt.value = String(p.goal); toast(`Your daily goal is now ${nf(p.goal)} calories.`); } }, 'Use this as my goal')); };
    tgt = h('input', { type: 'number', min: '800', step: '50', value: String(prof.goal), inputmode: 'numeric', 'aria-label': 'Daily calorie goal', oninput: e => { const v = Number(e.target.value); if (v >= 500) { prof.goal = v; saveProf(); } } });
    const height = imp ? h('div', { class: 'tool-fields' }, num('Feet', () => Math.floor(KC.cmToIn(prof.cm) / 12), v => { prof.cm = KC.inToCm(v * 12 + (KC.cmToIn(prof.cm) % 12)); }), num('Inches', () => KC.round(KC.cmToIn(prof.cm) % 12, 1), v => { prof.cm = KC.inToCm(Math.floor(KC.cmToIn(prof.cm) / 12) * 12 + v); }, '0.5')) : num('Height (cm)', () => KC.round(prof.cm), v => { prof.cm = v; });
    const el = h('div', {}, h('p', { class: 'fine' }, 'Tell it a little about you and it suggests a daily calorie goal. These are estimates (the Mifflin-St Jeor formula), not medical advice, and nothing leaves this device.'),
      h('div', { class: 'tool-fields' }, sel('Sex used for the estimate', 'sex', [['female', 'Female'], ['male', 'Male']]), num('Age', () => prof.age, v => { prof.age = Math.round(v); }), sel('Units', 'units', [['metric', 'Metric (kg, cm)'], ['imperial', 'Imperial (lb, ft)']], () => goalsRedraw())),
      h('div', { class: 'tool-fields' }, height, imp ? num('Weight (lb)', () => KC.round(KC.kgToLb(prof.kg), 1), v => { prof.kg = KC.lbToKg(v); }, '0.5') : num('Weight (kg)', () => KC.round(prof.kg, 1), v => { prof.kg = v; }, '0.5')),
      sel('How active are you?', 'activity', KC.ACTIVITY.map(a => [a[0], a[1]])), sel('What do you want to do?', 'goalType', KC.GOALS.map(g => [g[0], g[1]])), sel('Split of protein, carbs and fat', 'split', KC.SPLITS.map(s => [s[0], s[1]])), out,
      h('h3', { class: 'lg-h2' }, 'My daily goal'), h('label', { class: 'field' }, h('span', {}, 'Calories a day'), tgt),
      h('h3', { class: 'lg-h2' }, 'My foods'), prof.custom.length ? prof.custom.map(c => h('div', { class: 'kc-item static' }, h('span', { class: 'kc-item-n' }, h('b', {}, c.name), h('small', {}, c.serving)), h('span', { class: 'kc-item-k' }, nf(c.kcal)), h('button', { class: 'kc-x', type: 'button', 'aria-label': 'Delete ' + c.name, onclick: async () => { prof.custom = prof.custom.filter(x => x.id !== c.id); await saveProf(); goalsRedraw(); } }, icon('x')))) : h('p', { class: 'fine' }, 'Foods you create show up here.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => makeFood(null, goalsRedraw) }, 'Create a food')));
    calc(); return el;
  }
  const goalsRedraw = () => draw();
  function draw() {
    const tabs = [['today', 'Diary'], ['progress', 'Progress'], ['goals', 'Goals']];
    root.replaceChildren(h('div', { class: 'aq-tabs', role: 'tablist' }, tabs.map(([id, n]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(kcTab === id), onclick: () => { kcTab = id; draw(); } }, n))), kcTab === 'today' ? today() : kcTab === 'progress' ? progress() : goals());
  }
  draw();
  return [back(appName(acct, 'kcal')), root];
}

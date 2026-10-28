'use strict';
/* Cookbook: American favorites first, then dishes from around the world, plus recipes you add yourself.
   Scale the servings, tick things off as you cook, and send the ingredients to your Groceries list. */
const CK = CookCore;
let cbQuery = '', cbCat = '', cbCuisine = '', cbOnly = '';     // '' | 'fav' | 'mine'
const cbServings = {};                                         // recipe id -> servings picked while the app is open
let cbLoad = null;
const loadCookbook = () => cbLoad || (cbLoad = new Promise((res, rej) => {
  if (window.Cookbook) return res(window.Cookbook);
  const s = document.createElement('script'); s.src = 'cookbook/recipes.js';
  s.onload = () => res(window.Cookbook); s.onerror = () => { cbLoad = null; rej(new Error('recipes missing')); };
  document.head.append(s);
}));
const cbState = (acct, ctx) => { const r = ctx.apps.cstate[0]; return r ? { ...r, fav: { ...r.fav } } : { id: 'cstate' + acct.id, accountId: acct.id, kind: 'cstate', fav: {} }; };
const cbAll = (bundled, ctx) => [...bundled.map(r => ({ ...r, builtin: true })), ...ctx.apps.recipe.map(r => ({ ...r, mine: true }))];

function cookbookView(acct, ctx, back, arg) {
  const box = h('div', {}, h('p', { class: 'muted', style: 'padding:16px' }, 'Loading...'));
  const title = appName(acct, 'cookbook');
  loadCookbook().then(bundled => {
    const all = cbAll(bundled, ctx);
    box.replaceChildren(...(arg ? cbRecipe(acct, ctx, all, arg) : cbHome(acct, ctx, all)));
    if (arg) window.scrollTo(0, 0);
  }).catch(() => box.replaceChildren(h('p', { class: 'err', style: 'padding:16px' }, 'The recipes could not be loaded.')));
  return arg ? [back(title), box] : [back(title, { action: h('button', { class: 'btn primary', onclick: () => recipeEditor(acct, ctx, null) }, 'New recipe') }), box];
}

/* ---------- browsing ---------- */
function cbHome(acct, ctx, all) {
  const st = cbState(acct, ctx);
  const q = h('input', { type: 'search', placeholder: 'Search recipes or ingredients', value: cbQuery, 'aria-label': 'Search recipes', autocomplete: 'off' });
  const cat = h('select', { 'aria-label': 'Category' }, h('option', { value: '' }, 'All categories'), CK.CATEGORIES.map(c => h('option', { value: c }, c)));
  const cuisines = ['American', ...[...new Set(all.map(r => r.k).filter(k => k && k !== 'American'))].sort()];
  const cui = h('select', { 'aria-label': 'Cuisine' }, h('option', { value: '' }, 'All cuisines'), cuisines.map(c => h('option', { value: c }, c)));
  cat.value = cbCat; cui.value = cbCuisine;
  const only = (k, label) => h('button', { class: 'btn' + (cbOnly === k ? ' primary' : ''), type: 'button', 'aria-pressed': String(cbOnly === k), onclick: () => { cbOnly = cbOnly === k ? '' : k; render(true); } }, label);
  const list = h('div', { class: 'cb-list' }), count = h('p', { class: 'fine', style: 'padding:4px 16px' });
  const draw = () => {
    let rs = CK.search(all, cbQuery);
    if (cbCat) rs = rs.filter(r => r.c === cbCat);
    if (cbCuisine) rs = rs.filter(r => r.k === cbCuisine);
    if (cbOnly === 'fav') rs = rs.filter(r => st.fav[r.id]); else if (cbOnly === 'mine') rs = rs.filter(r => r.mine);
    rs = CK.order(rs);
    count.textContent = rs.length === 1 ? '1 recipe' : `${rs.length} recipes`;
    const out = []; let last = null;
    for (const r of rs) {
      if (r.k !== last) { last = r.k; out.push(h('h3', { class: 'cb-group' }, r.k)); }
      out.push(h('a', { class: 'cb-card', href: '#/apps/cookbook/' + r.id },
        h('b', {}, r.n), h('span', { class: 'muted' }, [r.c, r.r, CK.timeLabel(r.t), `serves ${r.s}`].filter(Boolean).join(' · ')),
        st.fav[r.id] ? h('span', { class: 'cb-fav', 'aria-label': 'Favorite' }, '★') : null, r.mine ? h('span', { class: 'cb-mine' }, 'Mine') : null));
    }
    list.replaceChildren(...(out.length ? out : [emptyState(cbOnly === 'fav' ? 'No favorites yet' : cbOnly === 'mine' ? 'No recipes of your own yet' : 'No recipes match', cbOnly === 'mine' ? 'Press New recipe to add one.' : 'Try fewer words, or clear the filters.')]));
  };
  q.addEventListener('input', () => { cbQuery = q.value; draw(); });
  cat.addEventListener('change', () => { cbCat = cat.value; draw(); });
  cui.addEventListener('change', () => { cbCuisine = cui.value; draw(); });
  draw();
  return [h('div', { class: 'app-pad' }, h('div', { class: 'app-row' }, q), h('div', { class: 'btnrow', style: 'margin:8px 0' }, cat, cui, only('fav', 'Favorites'), only('mine', 'Mine'))), count, list,
    h('p', { class: 'fine', style: 'padding:12px 16px' }, 'These recipes were written for Anti-Social. Cook meat, poultry and eggs thoroughly and check temperatures with a thermometer.')];
}

/* ---------- one recipe ---------- */
function cbRecipe(acct, ctx, all, id) {
  const r = all.find(x => x.id === id);
  if (!r) return [emptyState('Recipe not found', 'That recipe is not here.')];
  const st = cbState(acct, ctx);
  let serves = cbServings[r.id] || r.s;
  const factor = () => CK.factorFor(serves, r.s);
  const num = h('output', { class: 'cb-serves-n', 'aria-live': 'polite' });
  const ing = h('ul', { class: 'cb-ing' }), note = h('span', { class: 'muted' });
  const draw = () => {
    cbServings[r.id] = serves;
    num.textContent = String(serves);
    note.textContent = serves === r.s ? '' : `Original: ${r.s}`;
    ing.replaceChildren(...r.i.map(i => h('li', {}, h('label', { class: 'check' }, h('input', { type: 'checkbox' }), h('span', {}, CK.ingredientLine(i, factor()))))));
  };
  const bump = d => { serves = Math.max(1, Math.min(200, serves + d)); draw(); };
  const fav = h('button', { class: 'btn' + (st.fav[r.id] ? ' primary' : ''), type: 'button', 'aria-pressed': String(!!st.fav[r.id]), onclick: async () => { if (st.fav[r.id]) delete st.fav[r.id]; else st.fav[r.id] = 1; if (await appSave(acct, { ...st, updatedAt: Date.now() })) render(true); } }, st.fav[r.id] ? '★ Favorite' : '☆ Favorite');
  draw();
  return [h('div', { class: 'app-pad' },
    h('h2', { class: 'cb-title' }, r.n),
    h('p', { class: 'muted' }, [r.k, r.r, r.c, CK.timeLabel(r.t)].filter(Boolean).join(' · ')),
    h('div', { class: 'cb-serves' }, h('b', {}, 'Servings'),
      h('button', { class: 'btn', type: 'button', 'aria-label': 'Fewer servings', onclick: () => bump(-1) }, '−'), num, h('button', { class: 'btn', type: 'button', 'aria-label': 'More servings', onclick: () => bump(1) }, '+'), note),
    h('h3', {}, 'Ingredients'), ing,
    h('div', { class: 'btnrow', style: 'margin:8px 0 16px' }, h('button', { class: 'btn primary', type: 'button', onclick: () => groceryPrompt(acct, ctx, r, factor()) }, 'Add to Groceries'), fav),
    h('h3', {}, 'Steps'), h('ol', { class: 'cb-steps' }, r.d.map(s => h('li', { onclick: e => e.currentTarget.classList.toggle('done') }, s))),
    r.notes ? [h('h3', {}, 'Notes'), h('p', { class: 'viewer-note', style: 'white-space:pre-wrap' }, r.notes)] : null,
    h('div', { class: 'btnrow', style: 'margin-top:16px' },
      h('button', { class: 'btn', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(CK.textOf(r, factor())); toast('Recipe copied.'); } catch { toast('Could not copy.'); } } }, 'Copy recipe'),
      r.builtin && h('button', { class: 'btn', type: 'button', onclick: () => recipeEditor(acct, ctx, null, { n: r.n + ' (my version)', c: r.c, k: r.k, t: r.t, s: serves, i: r.i.map(x => CK.parseIngredientLine(CK.ingredientLine(x, factor()))), d: r.d }) }, 'Save a copy to edit'),
      r.mine && h('button', { class: 'btn', type: 'button', onclick: () => recipeEditor(acct, ctx, r) }, 'Edit')))];
}

// Sends the ingredients to the Groceries list. Pantry things like salt and oil are left out unless you ask.
function groceryPrompt(acct, ctx, r, f) {
  const pantry = h('input', { type: 'checkbox', id: 'cb-pantry' });
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Add to Groceries')),
    h('div', { class: 'mp' }, h('p', {}, `Add the ingredients for ${r.n} (${plural(Math.round(r.s * f), 'serving')}) to your Groceries list.`),
      h('label', { class: 'check' }, pantry, ' Include pantry staples (salt, pepper, oil, spices)'),
      h('div', { class: 'btnrow', style: 'margin-top:12px' }, h('button', { class: 'btn primary', onclick: async e => {
        e.currentTarget.disabled = true;
        const n = await addToGroceries(acct, ctx, CK.groceryAdds(r, f, pantry.checked));
        close(); toast(n ? `Added ${plural(n, 'item')} to Groceries.` : 'Nothing was added.');
      } }, 'Add'), h('a', { class: 'btn', href: '#/apps/groceries', onclick: () => close() }, 'Open Groceries')))));
}
async function addToGroceries(acct, ctx, adds) {
  const items = ctx.apps.groc.filter(i => (i.list || 'default') === 'default');
  let n = 0;
  for (const a of adds) {
    const match = items.find(i => i.name.toLowerCase() === a.name.toLowerCase());
    const note = [match && match.note, a.note].filter(Boolean).join('; ').slice(0, 400);
    let rec;
    if (match && !match.archived && !match.checked) rec = { ...match, qty: Math.min(999, (Number(match.qty) || 1) + (match.unit === a.unit ? a.qty : 0)), unit: match.unit || a.unit, note, updatedAt: Date.now() };
    else if (match) rec = { ...match, archived: false, checked: false, qty: a.qty, unit: a.unit || match.unit || '', note: a.note, uses: (match.uses || 1) + 1, updatedAt: Date.now() };
    else rec = { id: uid(), accountId: acct.id, kind: 'groc', list: 'default', name: a.name, qty: a.qty, unit: a.unit, aisle: AC.guessAisle(a.name), priceCents: null, note: a.note, checked: false, archived: false, uses: 1, createdAt: Date.now(), updatedAt: Date.now() };
    if (!(await appSave(acct, rec))) return n;
    const at = items.findIndex(i => i.id === rec.id); if (at >= 0) items[at] = rec; else items.push(rec);
    n++;
  }
  return n;
}

/* ---------- your own recipes ---------- */
function recipeEditor(acct, ctx, r, prefill) {
  const isNew = !r;
  const base = r || prefill || {};
  const rec = r ? { ...r } : { id: uid(), accountId: acct.id, kind: 'recipe', createdAt: Date.now() };
  const title = h('input', { value: base.n || '', maxlength: 100, placeholder: 'Recipe name', 'aria-label': 'Recipe name' });
  const cat = h('select', { 'aria-label': 'Category' }, CK.CATEGORIES.map(c => h('option', { value: c }, c))); cat.value = CK.CATEGORIES.includes(base.c) ? base.c : 'Mains';
  const cuisine = h('input', { value: base.k || 'American', maxlength: 40, list: 'cb-cuisines', 'aria-label': 'Cuisine' });
  const dl = h('datalist', { id: 'cb-cuisines' }, ['American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai', 'French', 'Greek', 'Korean', 'Family recipe'].map(c => h('option', { value: c })));
  const time = h('input', { type: 'number', min: '1', max: '5000', step: '1', value: base.t ? String(base.t) : '', placeholder: 'Minutes', 'aria-label': 'Total minutes' });
  const serves = h('input', { type: 'number', min: '1', max: '200', step: '1', value: String(base.s || 4), 'aria-label': 'Servings' });
  const ings = h('textarea', { rows: 8, placeholder: '2 cups flour\n1 1/2 tsp salt\n3 eggs\n1 lb ground beef', 'aria-label': 'Ingredients, one per line' }, (base.i || []).map(i => CK.ingredientLine(i, 1)).join('\n'));
  const steps = h('textarea', { rows: 8, placeholder: 'One step per line.', 'aria-label': 'Steps, one per line' }, (base.d || []).join('\n'));
  const notes = h('textarea', { rows: 4, 'aria-label': 'Notes', placeholder: 'Anything to remember. No length limit.' }, base.notes || '');
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary' }, isNew ? 'Save recipe' : 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New recipe' : 'Edit recipe')),
    h('div', { class: 'mp' }, dl, fieldEl('Name', title), h('div', { class: 'two' }, fieldEl('Category', cat), fieldEl('Cuisine', cuisine)), h('div', { class: 'two' }, fieldEl('Total minutes', time), fieldEl('Servings', serves)),
      fieldEl('Ingredients (one per line)', ings), h('p', { class: 'fine', style: 'padding:0 0 10px' }, 'Start each line with an amount and a unit if it has one, like "1 1/2 cups flour" or "3 eggs". The amounts can then be scaled.'),
      fieldEl('Steps (one per line)', steps), fieldEl('Notes', notes), err,
      h('div', { class: 'btnrow', style: 'margin-top:12px' }, save,
        !isNew && h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this recipe? There is no undo.')) return; await appDelete(rec.id); close(); go('/apps/cookbook'); } }, 'Delete')))));
  save.addEventListener('click', async () => {
    const i = ings.value.split('\n').map(CK.parseIngredientLine).filter(Boolean), d = steps.value.split('\n').map(s => s.trim()).filter(Boolean);
    const t = time.value.trim() === '' ? 0 : Number(time.value), s = Number(serves.value);
    if (!title.value.trim()) return void (err.textContent = 'Give it a name.');
    if (!i.length) return void (err.textContent = 'Add at least one ingredient.');
    if (!d.length) return void (err.textContent = 'Add at least one step.');
    if (!Number.isInteger(s) || s < 1 || s > 200) return void (err.textContent = 'Servings is a whole number from 1 to 200.');
    if (!(t >= 0 && t <= 5000)) return void (err.textContent = 'Minutes is a number from 1 to 5,000.');
    save.disabled = true;
    Object.assign(rec, { n: title.value.trim(), c: cat.value, k: cuisine.value.trim() || 'Family recipe', r: '', t: Math.round(t), s, i, d, notes: notes.value, updatedAt: Date.now() });
    if (!(await appSave(acct, rec))) { save.disabled = false; return; }
    close(); isNew ? go('/apps/cookbook/' + rec.id) : render(true);
  });
  setTimeout(() => title.focus(), 0);
}

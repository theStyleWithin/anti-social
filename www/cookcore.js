'use strict';
/* Cookbook: pure logic for recipes. Scaling servings, fractions, reading ingredient lines you type, searching,
   and turning a recipe into grocery items. Nothing here touches the page or the network.
   An ingredient is [amount, unit, text, 'p' if pantry]. Text may say "egg|eggs" (singular|plural; the plural runs to the
   first comma). A known unit is shown with the amount; anything else in the unit slot is ignored and the text carries the noun. */
const CookCore = (() => {
  const UNITS = ['cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'can', 'clove', 'slice', 'stick', 'pinch', 'dash', 'sprig', 'stalk', 'bunch', 'bottle', 'box', 'bag', 'head', 'rack', 'package', 'jar', 'pint', 'quart', 'gallon'];
  const FIXED = new Set(['tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l']);        // these never take an "s"
  const CATEGORIES = ['Breakfast', 'Mains', 'Soups & Stews', 'Salads', 'Sides', 'Snacks & Apps', 'Bread & Baking', 'Desserts', 'Drinks'];
  const plural = (u, amt) => FIXED.has(u) || !(amt > 1) ? u : u + (/(ch|sh|s|x)$/.test(u) ? 'es' : 's');
  const wordRe = u => new RegExp(`\\b${u}(?:e?s)?\\b`, 'i');

  // ---- amounts
  const FR = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, '']];
  const fmtAmount = x => {
    if (!(x > 0)) return '';
    if (x >= 10) return String(Math.round(x));
    let whole = Math.floor(x), frac = x - whole, best = FR[0];
    for (const f of FR) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
    if (Math.abs(best[0] - frac) > 0.03) return String(Math.round(x * 10) / 10);
    if (best[0] === 1) { whole += 1; best = FR[0]; }
    if (!whole && !best[1]) return '⅛';
    return [whole || '', best[1]].filter(v => v !== '').join(' ');
  };

  // ---- one ingredient
  const normalize = ing => {
    const amt = Number(ing[0]) > 0 ? Number(ing[0]) : 0, text = String(ing[2] || '');
    let unit = String(ing[1] || '').toLowerCase(), self = false;
    if (!UNITS.includes(unit)) unit = '';
    if (unit && wordRe(unit).test(text.split(',')[0].replace(/\|.*$/, '') + ' ' + (text.split('|')[1] || '').split(',')[0])) { self = true; unit = ''; }
    return { amt, unit, text, self, pantry: ing[3] === 'p', count: !unit };
  };
  const pickForm = (text, amt) => {
    const bar = text.indexOf('|');
    if (bar < 0) return null;
    const left = text.slice(0, bar), rest = text.slice(bar + 1), comma = rest.indexOf(',');
    return (amt === 1 ? left : comma < 0 ? rest : rest.slice(0, comma)) + (comma < 0 ? '' : rest.slice(comma));
  };
  const itemText = (n, amt) => {
    const form = pickForm(n.text, amt);
    if (form !== null) return form;
    if (n.self && amt > 1) { const m = /^(\S+)(.*)$/s.exec(n.text); if (m) return plural(m[1].toLowerCase() === m[1] ? m[1] : m[1], 2) + m[2]; }
    return n.text;
  };
  // Counted things (eggs, cloves, cans) round to a half; measured things keep their fractions.
  const scaled = (n, f) => { let a = n.amt * f; if (a > 0 && n.count) a = a < 10 ? Math.max(0.5, Math.round(a * 2) / 2) : Math.round(a); return a; };
  const ingredientLine = (ing, f = 1) => {
    const n = normalize(ing), a = scaled(n, f);
    return [a > 0 ? fmtAmount(a) : '', n.unit && a > 0 ? plural(n.unit, a) : '', itemText(n, a)].filter(Boolean).join(' ');
  };

  // ---- ingredient lines you type: "1 1/2 cups flour", "2 eggs", "salt to taste"
  const GLYPH = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  const ALIAS = { cups: 'cup', c: 'cup', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp', ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb', gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg', milliliter: 'ml', milliliters: 'ml', liter: 'l', liters: 'l', litre: 'l', litres: 'l', pkg: 'package' };
  const unitOf = w => { w = w.toLowerCase().replace(/\.$/, ''); if (ALIAS[w]) return ALIAS[w]; if (UNITS.includes(w)) return w; const s = w.replace(/(?:e?s)$/, ''); return UNITS.includes(s) ? s : ''; };
  const parseNumber = s => {
    s = s.trim();
    let m;
    if ((m = /^(\d+)?\s*([¼-¾⅐-⅞])$/.exec(s))) return (m[1] ? +m[1] : 0) + (GLYPH[m[2]] || 0);
    if ((m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s))) return +m[3] ? +m[1] + m[2] / m[3] : NaN;
    if ((m = /^(\d+)\/(\d+)$/.exec(s))) return +m[2] ? m[1] / m[2] : NaN;
    if ((m = /^\d+(?:\.\d+)?$/.exec(s))) return parseFloat(s);
    return NaN;
  };
  const parseIngredientLine = line => {
    const t = String(line || '').trim().replace(/\s+/g, ' ');
    if (!t) return null;
    const m = /^((?:\d+\s+\d+\/\d+)|(?:\d+\s*[¼-¾⅐-⅞])|(?:[¼-¾⅐-⅞])|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?))(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?\s*(.*)$/.exec(t);
    if (!m) return [0, '', t.slice(0, 200)];
    const amt = parseNumber(m[1]);
    if (!(amt > 0) || amt > 9999) return [0, '', t.slice(0, 200)];
    const rest = m[2], w = /^(\S+)\s*(.*)$/.exec(rest);
    const u = w ? unitOf(w[1]) : '';
    if (u && w[2]) return [amt, u, w[2].slice(0, 200)];
    return [amt, '', rest.slice(0, 200)];
  };

  // ---- recipes
  const timeLabel = m => !(m > 0) ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
  const factorFor = (servings, base) => servings > 0 && base > 0 ? servings / base : 1;
  const textOf = (r, f = 1) => [r.n, `${r.k}${r.r ? ', ' + r.r : ''}${r.t ? ' · ' + timeLabel(r.t) : ''}`, '', 'Ingredients', ...r.i.map(i => '- ' + ingredientLine(i, f)), '', 'Steps', ...r.d.map((s, k) => `${k + 1}. ${s}`)].join('\n');
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Every word of the query must appear in the name, cuisine, region, category or an ingredient.
  const search = (list, query) => {
    const words = fold(query).split(/\s+/).filter(Boolean).slice(0, 8);
    if (!words.length) return list;
    return list.filter(r => { const hay = fold([r.n, r.k, r.r, r.c, ...r.i.map(i => String(i[2]).replace(/\|/g, ' '))].join(' ')); return words.every(w => hay.includes(w)); });
  };
  // American first, then the rest by cuisine, then name.
  const order = list => [...list].sort((a, b) => (b.k === 'American') - (a.k === 'American') || a.k.localeCompare(b.k) || a.n.localeCompare(b.n));

  // Ready for the grocery list: [{name, qty, unit, note}]. Things measured in cups and spoons are noted, not counted.
  const BUY = new Set(['lb', 'oz', 'g', 'kg', 'ml', 'l', 'can', 'bottle', 'box', 'bag', 'jar', 'pint', 'quart', 'gallon', 'bunch', 'package']);
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  const groceryAdds = (r, f = 1, pantry = false) => {
    const out = [];
    for (const ing of r.i) {
      const n = normalize(ing);
      if (n.pantry && !pantry) continue;
      const a = scaled(n, f);
      let name = itemText(n, a || 2).replace(/\([^)]*\)/g, ' ').split(',')[0].replace(/\s+/g, ' ').trim();
      let unit = n.unit, qty = a || 1;
      if (n.self) { const m = /^(\S+)\s*(.*)$/.exec(name); const w = m && unitOf(m[1]); if (w && m[2]) { unit = w; name = m[2]; } }
      if (!name) continue;
      const note = `${ingredientLine(ing, f)} (${r.n})`.slice(0, 200);
      if (!BUY.has(unit)) { out.push({ name: cap1(name), qty: n.count ? Math.max(1, Math.ceil(qty)) : 1, unit: '', note }); continue; }
      out.push({ name: cap1(name), qty: Math.round(qty * 100) / 100, unit: unit === 'package' ? 'pack' : unit, note });
    }
    return out;
  };

  return { UNITS, CATEGORIES, fmtAmount, normalize, ingredientLine, parseIngredientLine, parseNumber, timeLabel, factorFor, textOf, search, order, groceryAdds, plural, pickForm, fold };
})();
if (typeof module !== 'undefined') module.exports = CookCore;

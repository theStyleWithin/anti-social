'use strict';
/* Calorie Counter: the pure part. Daily targets from a few body measurements, portion maths and day totals. These are estimates for
   everyday use, not medical advice, and nothing here leaves the device. */
const KcalCore = (() => {
  const ACTIVITY = [['sedentary', 'Mostly sitting', 1.2], ['light', 'Light: walks or exercise 1 to 3 days a week', 1.375], ['moderate', 'Moderate: exercise 3 to 5 days a week', 1.55], ['active', 'Very active: hard exercise most days', 1.725]];
  const GOALS = [['lose2', 'Lose about 1 kg (2 lb) a week', -1000], ['lose', 'Lose about 0.5 kg (1 lb) a week', -500], ['keep', 'Keep my weight', 0], ['gain', 'Gain about 0.25 kg (0.5 lb) a week', 275]];
  const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snacks']];
  const SPLITS = [['balanced', 'Balanced (30 / 40 / 30)', [30, 40, 30]], ['highp', 'High protein (35 / 35 / 30)', [35, 35, 30]], ['lowc', 'Lower carb (30 / 25 / 45)', [30, 25, 45]], ['lowf', 'Lower fat (25 / 55 / 20)', [25, 55, 20]]];
  const round = (v, d = 0) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };
  const lbToKg = lb => lb * 0.45359237, kgToLb = kg => kg / 0.45359237, inToCm = i => i * 2.54, cmToIn = c => c / 2.54;
  const bmr = ({ sex, kg, cm, age }) => 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
  // returns { bmr, tdee, goal, floor, low } where low means the target was raised to a safer minimum
  function plan(p) {
    const b = bmr(p), act = (ACTIVITY.find(a => a[0] === p.activity) || ACTIVITY[0])[2], tdee = b * act, delta = (GOALS.find(g => g[0] === p.goal) || GOALS[2])[2];
    const floor = p.sex === 'male' ? 1500 : 1200; let goal = tdee + delta, low = false; if (goal < floor) { goal = floor; low = true; }
    return { bmr: round(b), tdee: round(tdee), goal: round(goal / 10) * 10, floor, low };
  }
  const macroTargets = (kcal, split) => ({ p: round(kcal * split[0] / 100 / 4), c: round(kcal * split[1] / 100 / 4), f: round(kcal * split[2] / 100 / 9) });
  const portion = (food, qty) => ({ kcal: round(food.kcal * qty), p: round(food.p * qty, 1), c: round(food.c * qty, 1), f: round(food.f * qty, 1) });
  const qtyFromGrams = (food, g) => (food.g > 0 ? g / food.g : 1);
  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const shiftDay = (key, n) => dayKey(new Date(key + 'T12:00:00').getTime() + n * 86400000);
  function totals(day) {
    const t = { kcal: 0, p: 0, c: 0, f: 0, burned: 0, byMeal: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 } };
    for (const i of (day && day.items) || []) { t.kcal += i.kcal || 0; t.p += i.p || 0; t.c += i.c || 0; t.f += i.f || 0; t.byMeal[i.meal] = (t.byMeal[i.meal] || 0) + (i.kcal || 0); }
    for (const e of (day && day.ex) || []) t.burned += e.kcal || 0;
    t.kcal = round(t.kcal); t.p = round(t.p); t.c = round(t.c); t.f = round(t.f); t.burned = round(t.burned); return t;
  }
  const remaining = (goal, t) => goal - t.kcal + t.burned;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function search(list, q) {
    const words = norm(q).split(/\s+/).filter(Boolean); if (!words.length) return list;
    return list.map(f => { const n = norm(f.name), c = norm(f.cat || ''); let s = 0; for (const w of words) { if (n.startsWith(w)) s += 3; else if (n.includes(' ' + w)) s += 2; else if (n.includes(w)) s += 1.5; else if (c.includes(w)) s += 0.5; else return null; } return [f, s]; }).filter(Boolean).sort((a, b) => b[1] - a[1] || a[0].name.length - b[0].name.length).map(x => x[0]);
  }
  // a rough burn for push-ups: about a third of a calorie each for a 70 kg person, scaling with weight
  const pushupKcal = (reps, kg) => round(reps * 0.32 * ((kg || 70) / 70), 1);
  return { ACTIVITY, GOALS, MEALS, SPLITS, round, lbToKg, kgToLb, inToCm, cmToIn, bmr, plan, macroTargets, portion, qtyFromGrams, dayKey, shiftDay, totals, remaining, search, pushupKcal };
})();
if (typeof module !== 'undefined') module.exports = KcalCore;

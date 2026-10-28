'use strict';
/* Pokédex and Pokémon Bank: the pure logic. Caught marks, type colours, evolution text, bank layout, moving things
   between slots, sorting, and the files that banks and cards are saved in. No page, no network.
   The Pokédex data and the bank ideas come from pkDex and pkHouse (https://github.com/Insektaure, GPL-2.0). */
const PokeCore = (() => {
  /* ---------- types ---------- */
  const TYPE_COLOR = { Normal: '#a8a77a', Fire: '#ee8130', Water: '#6390f0', Electric: '#f7d02c', Grass: '#7ac74c', Ice: '#96d9d6', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#e2bf65', Flying: '#a98ff3', Psychic: '#f95587', Bug: '#a6b91a', Rock: '#b6a136', Ghost: '#735797', Dragon: '#6f35fc', Dark: '#705746', Steel: '#b7b7ce', Fairy: '#d685ad' };
  const parseTypes = s => String(s || '').split('/').map(x => x.trim()).filter(x => TYPE_COLOR[x]);
  const typeText = c => { const l = (hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)); })(c); return l > 150 ? '#1b1b1b' : '#ffffff'; };

  /* ---------- the Pokédex tracker ---------- */
  // one number per species: 1 caught, 2 shiny, 4 alpha, 8 shiny alpha
  const FLAG = { caught: 1, shiny: 2, alpha: 4, shinyAlpha: 8 };
  const FLAG_LIST = [['caught', 'Caught'], ['shiny', 'Shiny'], ['alpha', 'Alpha'], ['shinyAlpha', 'Shiny Alpha']];
  const flagsFor = region => FLAG_LIST.filter(([k]) => region && region.alpha ? true : (k === 'caught' || k === 'shiny'));
  const getMark = (marks, region, n) => ((marks && marks[region] && marks[region][n]) | 0);
  const setMark = (marks, region, n, flag, on) => {
    const out = { ...(marks || {}) }, r = { ...(out[region] || {}) }, v = on ? (r[n] | 0) | FLAG[flag] : (r[n] | 0) & ~FLAG[flag];
    if (v) r[n] = v; else delete r[n];
    out[region] = r; return out;
  };
  // apply one flag to many species (the bulk and multi-select buttons)
  const setMany = (marks, region, ns, flag, on) => ns.reduce((m, n) => setMark(m, region, n, flag, on), marks || {});
  const clearRegion = (marks, region) => { const out = { ...(marks || {}) }; delete out[region]; return out; };
  const progress = (marks, region, ns) => {
    const r = (marks && marks[region]) || {}, c = { total: ns.length, caught: 0, shiny: 0, alpha: 0, shinyAlpha: 0 };
    for (const n of ns) { const v = r[n] | 0; if (v & 1) c.caught++; if (v & 2) c.shiny++; if (v & 4) c.alpha++; if (v & 8) c.shinyAlpha++; }
    return c;
  };
  const normMarks = raw => {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [rid, m] of Object.entries(raw)) {
      if (!/^[a-z_]{1,32}$/.test(rid) || !m || typeof m !== 'object') continue;
      const r = {};
      for (const [n, v] of Object.entries(m)) { const k = Number(n), f = Number(v) & 15; if (Number.isInteger(k) && k >= 1 && k <= 1025 && f) r[k] = f; }
      out[rid] = r;
    }
    return out;
  };
  // the evolution line from the data ("A – Lvl 16 → B | C → D") split into plain text pieces and species names
  const linkNames = (text, names) => {
    const re = new RegExp('(?<![\\p{L}\\p{N}])(' + names.slice().sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
    const out = []; let last = 0, m;
    while ((m = re.exec(text))) { if (m.index > last) out.push({ t: text.slice(last, m.index) }); out.push({ t: m[1], mon: m[1] }); last = m.index + m[1].length; }
    if (last < text.length) out.push({ t: text.slice(last) });
    return out;
  };
  const search = (rows, q) => {
    q = String(q || '').trim().toLowerCase(); if (!q) return rows;
    const num = q.replace(/^#/, '');
    return rows.filter(r => r.name.toLowerCase().includes(q) || String(r.n) === num || String(r.n).padStart(3, '0') === num || (r.reg && r.reg === num.padStart(3, '0')) || r.type.toLowerCase().includes(q));
  };

  /* ---------- Pokémon in the bank ---------- */
  const NATURES = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
  const STAT5 = ['Attack', 'Defense', 'Speed', 'Sp. Atk', 'Sp. Def'];
  const natureEffect = i => (i >= 0 && i < 25 && Math.floor(i / 5) !== i % 5) ? { up: STAT5[Math.floor(i / 5)], down: STAT5[i % 5] } : null;
  const BALLS = ['Poké Ball', 'Great Ball', 'Ultra Ball', 'Master Ball', 'Safari Ball', 'Net Ball', 'Dive Ball', 'Nest Ball', 'Repeat Ball', 'Timer Ball', 'Luxury Ball', 'Premier Ball', 'Dusk Ball', 'Heal Ball', 'Quick Ball', 'Cherish Ball', 'Fast Ball', 'Level Ball', 'Lure Ball', 'Heavy Ball', 'Love Ball', 'Friend Ball', 'Moon Ball', 'Sport Ball', 'Dream Ball', 'Beast Ball', 'Strange Ball', 'Feather Ball', 'Wing Ball', 'Jet Ball', 'Leaden Ball', 'Gigaton Ball', 'Origin Ball'];
  const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
  const GENDERS = ['', 'Male', 'Female', 'Genderless'];
  const RAW_FORMATS = ['pk3', 'pb7', 'pk8', 'pa8', 'pa9'];
  const LIMITS = { nickname: 12, ot: 12, text: 40, notes: 500 };
  const str = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';
  const num = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
  const arr6 = (v, hi, def) => Array.from({ length: 6 }, (_, i) => num(Array.isArray(v) ? v[i] : undefined, 0, hi, def));
  const normMon = raw => ({
    species: num(raw && raw.species, 1, 1025, 25), nickname: str(raw && raw.nickname, LIMITS.nickname), level: num(raw && raw.level, 1, 100, 1),
    gender: GENDERS.includes(raw && raw.gender) ? raw.gender : '', shiny: !!(raw && raw.shiny), alpha: !!(raw && raw.alpha), egg: !!(raw && raw.egg),
    nature: Number.isInteger(raw && raw.nature) && raw.nature >= 0 && raw.nature < 25 ? raw.nature : -1,
    ability: str(raw && raw.ability, LIMITS.text), item: str(raw && raw.item, LIMITS.text), ball: BALLS.includes(raw && raw.ball) ? raw.ball : '',
    moves: Array.from({ length: 4 }, (_, i) => str(raw && Array.isArray(raw.moves) ? raw.moves[i] : '', LIMITS.text)),
    ivs: arr6(raw && raw.ivs, 31, 0), evs: arr6(raw && raw.evs, 252, 0),
    ot: str(raw && raw.ot, LIMITS.ot), tid: num(raw && raw.tid, 0, 999999, 0), origin: str(raw && raw.origin, LIMITS.text), met: str(raw && raw.met, LIMITS.text), notes: str(raw && raw.notes, LIMITS.notes),
    // the game file's own bytes, when it came from one (lets it go back into a game file unchanged)
    ...((raw && typeof raw.raw === 'string' && /^[A-Za-z0-9+/]{20,600}={0,2}$/.test(raw.raw) && RAW_FORMATS.includes(raw.rawFmt)) ? { raw: raw.raw, rawFmt: raw.rawFmt } : { raw: '', rawFmt: '' }),
  });
  const ivTotal = m => m.ivs.reduce((a, b) => a + b, 0), evTotal = m => m.evs.reduce((a, b) => a + b, 0), perfectIvs = m => m.ivs.filter(v => v === 31).length;
  const monName = (m, national) => m.nickname || (national[m.species - 1] || ['#' + m.species])[0];
  const pad3 = n => String(n).padStart(3, '0');

  /* ---------- banks: boxes and slots ---------- */
  // how many boxes and slots each game family has (as in the games)
  const FAMILIES = {
    lgpe: { name: "Let's Go Pikachu / Eevee", boxes: 40, slots: 25, cols: 5 }, swsh: { name: 'Sword / Shield', boxes: 32, slots: 30, cols: 6 }, bdsp: { name: 'Brilliant Diamond / Shining Pearl', boxes: 40, slots: 30, cols: 6 },
    la: { name: 'Legends: Arceus', boxes: 32, slots: 30, cols: 6 }, sv: { name: 'Scarlet / Violet', boxes: 32, slots: 30, cols: 6 }, za: { name: 'Legends: Z-A', boxes: 32, slots: 30, cols: 6 }, frlg: { name: 'FireRed / LeafGreen', boxes: 14, slots: 30, cols: 6 },
  };
  const boxName = (bank, i) => str(bank && bank.boxNames && bank.boxNames[i], 20) || 'Box ' + (i + 1);
  const inBank = (mons, bankId) => mons.filter(m => m.bank === bankId);
  const slotsOf = (mons, bank, box) => { const fam = FAMILIES[bank.family], out = Array(fam.slots).fill(null); for (const m of mons) if (m.bank === bank.id && m.box === box && m.slot >= 0 && m.slot < fam.slots) out[m.slot] = m; return out; };
  const countIn = (mons, bankId) => mons.filter(m => m.bank === bankId).length;
  const firstFree = (mons, bank, fromBox = 0) => {
    const fam = FAMILIES[bank.family], taken = new Set(mons.filter(m => m.bank === bank.id).map(m => m.box * 1000 + m.slot));
    for (let b = fromBox; b < fam.boxes; b++) for (let s = 0; s < fam.slots; s++) if (!taken.has(b * 1000 + s)) return { box: b, slot: s };
    for (let b = 0; b < Math.min(fromBox, fam.boxes); b++) for (let s = 0; s < fam.slots; s++) if (!taken.has(b * 1000 + s)) return { box: b, slot: s };
    return null;
  };
  // Put `mon` at `to` ({bank, box, slot}). An occupied slot swaps places with it. Returns [{id, bank, box, slot}] to save.
  const moveTo = (mons, mon, to) => {
    const there = mons.find(m => m.id !== mon.id && m.bank === to.bank && m.box === to.box && m.slot === to.slot);
    const out = [{ id: mon.id, bank: to.bank, box: to.box, slot: to.slot }];
    if (there) out.push({ id: there.id, bank: mon.bank, box: mon.box, slot: mon.slot });
    return out;
  };
  const SORTS = { dex: 'Pokédex number', level: 'Level (highest first)', name: 'Name', ivs: 'IV total (highest first)', recent: 'Newest first' };
  const sortKey = (key, national) => ({
    dex: (a, b) => a.species - b.species || (b.shiny - a.shiny) || a.createdAt - b.createdAt,
    level: (a, b) => b.level - a.level || a.species - b.species, name: (a, b) => monName(a, national).localeCompare(monName(b, national)) || a.species - b.species,
    ivs: (a, b) => ivTotal(b) - ivTotal(a) || a.species - b.species, recent: (a, b) => b.createdAt - a.createdAt,
  }[key] || ((a, b) => a.species - b.species));
  // Pack a whole bank (or one box) in a new order from the first slot.
  const sortPlan = (mons, bank, key, national, onlyBox) => {
    const fam = FAMILIES[bank.family], mine = mons.filter(m => m.bank === bank.id && (onlyBox == null || m.box === onlyBox)).sort(sortKey(key, national));
    const base = onlyBox == null ? 0 : onlyBox * fam.slots;
    return mine.map((m, i) => { const at = base + i; return { id: m.id, bank: bank.id, box: Math.floor(at / fam.slots), slot: at % fam.slots }; });
  };
  const filterMons = (mons, f, national) => {
    const q = String(f.q || '').trim().toLowerCase();
    return mons.filter(m => (!q || monName(m, national).toLowerCase().includes(q) || (national[m.species - 1] || [''])[0].toLowerCase().includes(q) || m.ot.toLowerCase().includes(q) || m.notes.toLowerCase().includes(q))
      && (!f.shiny || m.shiny) && (!f.alpha || m.alpha) && (!f.egg || m.egg) && (!f.species || m.species === f.species) && (!f.ball || m.ball === f.ball) && (!f.minIv || ivTotal(m) >= f.minIv));
  };

  /* ---------- files: banks and cards ---------- */
  const BANK_FORMAT = 'anti-social-bank', CARD_FORMAT = 'anti-social-pkm';
  const exportBank = (bank, mons) => ({ format: BANK_FORMAT, version: 1, bank: { name: str(bank.name, 40), family: bank.family, boxNames: (bank.boxNames || []).map(n => str(n, 20)) }, mons: mons.map(m => ({ box: m.box, slot: m.slot, mon: normMon(m) })) });
  const importBank = input => {
    let d = input; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return { ok: false, error: 'That is not a bank file.' }; } }
    if (!d || d.format !== BANK_FORMAT || !d.bank || !FAMILIES[d.bank.family] || !Array.isArray(d.mons)) return { ok: false, error: 'That is not a bank file from this app.' };
    const fam = FAMILIES[d.bank.family], seen = new Set(), mons = [];
    for (const e of d.mons.slice(0, fam.boxes * fam.slots)) {
      if (!e || !Number.isInteger(e.box) || !Number.isInteger(e.slot) || e.box < 0 || e.box >= fam.boxes || e.slot < 0 || e.slot >= fam.slots || seen.has(e.box * 1000 + e.slot)) continue;
      seen.add(e.box * 1000 + e.slot); mons.push({ box: e.box, slot: e.slot, mon: normMon(e.mon) });
    }
    return { ok: true, bank: { name: str(d.bank.name, 40) || 'Imported bank', family: d.bank.family, boxNames: Array.isArray(d.bank.boxNames) ? d.bank.boxNames.slice(0, fam.boxes).map(n => str(n, 20)) : [] }, mons, skipped: d.mons.length - mons.length };
  };
  const exportCard = (m, family) => ({ format: CARD_FORMAT, version: 1, family: FAMILIES[family] ? family : null, mon: normMon(m) });
  const importCard = input => {
    let d = input; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return { ok: false, error: 'That is not a Pokémon card.' }; } }
    if (!d || d.format !== CARD_FORMAT || !d.mon) return { ok: false, error: 'That is not a Pokémon card from this app.' };
    return { ok: true, mon: normMon(d.mon), family: FAMILIES[d.family] ? d.family : null };
  };

  return { TYPE_COLOR, parseTypes, typeText, FLAG, FLAG_LIST, flagsFor, getMark, setMark, setMany, clearRegion, progress, normMarks, linkNames, search,
    NATURES, STAT5, natureEffect, BALLS, STATS, GENDERS, LIMITS, normMon, ivTotal, evTotal, perfectIvs, monName, pad3,
    FAMILIES, boxName, inBank, slotsOf, countIn, firstFree, moveTo, SORTS, sortPlan, filterMons, BANK_FORMAT, CARD_FORMAT, exportBank, importBank, exportCard, importCard };
})();
if (typeof module !== 'undefined') module.exports = PokeCore;
// "1 Pokémon", "3 Pokémon" (the word does not take an s)
const pkCount = n => (n === 1 ? '1' : Number(n).toLocaleString()) + ' Pokémon';

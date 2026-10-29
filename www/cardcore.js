'use strict';
/* Card Binder: the pure logic. Turns the text an OCR engine read off a photo of a trading card into card details
   (name, Pokédex number, HP, card number, illustrator, language...), and lays cards out on binder pages. No page, no OCR here. */
const CardCore = (() => {
  const CONDITIONS = ['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];
  const LANGS = ['Japanese', 'English', 'Korean', 'Chinese', 'German', 'French', 'Italian', 'Spanish', 'Portuguese', 'Other'];
  const GAMES = [['pokemon', 'Pokémon'], ['other', 'Another card game']];
  const STAGES = ['Basic', 'Stage 1', 'Stage 2', 'Baby', 'V', 'VMAX', 'VSTAR', 'GX', 'EX', 'ex', 'Trainer', 'Energy', 'Other'];
  const MAX_DEX = 1025;

  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const CJK = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
  // OCR puts a space between Japanese characters; take them out again
  const tidy = text => String(text || '').replace(/\r/g, '').replace(/([぀-ヿ㐀-鿿ｦ-ﾟ、。「」・ー])\s+(?=[぀-ヿ㐀-鿿ｦ-ﾟ、。「」・ー])/g, '$1').replace(/[ \t]+/g, ' ').trim();
  const lang = text => { const n = (text.match(/[぀-ヿ㐀-鿿ｦ-ﾟ]/g) || []).length, latin = (text.match(/[A-Za-z]/g) || []).length; return n >= 10 && n * 2 >= latin * 0.4 ? 'Japanese' : latin >= 20 ? 'English' : n >= 4 ? 'Japanese' : ''; };

  const edit = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m - n) > 1) return 2; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };

  // which species does this text name? names from the Pokédex data ([name, types]); exact words first, then one typo
  const findSpecies = (text, nat) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean), head = fold(lines.slice(0, 4).join(' ')), all = fold(text), toks = new Set(head.split(' ').filter(t => t.length >= 4));
    let best = null;
    for (let i = 0; i < nat.length; i++) {
      const f = fold(nat[i][0]); if (f.length < 3) continue;
      const exactHead = (' ' + head + ' ').includes(' ' + f + ' '), exactAll = (' ' + all + ' ').includes(' ' + f + ' ');
      let score = exactHead ? 100 + f.length : exactAll && f.length >= 5 ? 40 + f.length : 0;
      if (!score && f.length >= 5 && !f.includes(' ')) for (const t of toks) if (edit(t, f) <= 1) { score = 60 + f.length; break; }
      if (score && (!best || score > best.score)) best = { n: i + 1, score };
    }
    return best;
  };

  // everything we can tell from the OCR text. Returns { fields, found } where found lists the fields that came off the photo.
  const parse = (raw, nat = []) => {
    const text = tidy(raw), out = {}, found = [];
    const set = (k, v) => { if (v !== undefined && v !== null && v !== '') { out[k] = v; found.push(k); } };
    set('lang', lang(text));
    const hp = /\bHP\s*[:.]?\s*(\d{2,3})\b/i.exec(text) || /\b(\d{2,3})\s*HP\b/i.exec(text) || /\bH\s?P\s*(\d{2,3})\b/.exec(text);
    if (hp && +hp[1] >= 10 && +hp[1] <= 400) set('hp', +hp[1]);
    let dex = null; for (const m of text.matchAll(/\bN[o0O]\s*[.:]?\s*(\d{1,4})\b/gi)) { const n = +m[1]; if (n >= 1 && n <= MAX_DEX) dex = n; }
    const num = /\b(\d{1,3})\s*\/\s*(\d{2,3})\b/.exec(text); if (num && +num[2] >= +num[1] * 0.5) set('number', `${num[1].padStart(3, '0')}/${num[2].padStart(3, '0')}`);
    const code = /\b(SV\d{1,2}[a-zA-Z]?|SV-P|S\d{1,2}[a-zA-Z]?|S-P|SM\d{1,2}[a-zA-Z]?|SM-P|XY\d{1,2}|BW\d{1,2}|SWSH\d{2,3}|SVP)\b/.exec(text); if (code) set('setCode', code[1]);
    const ill = /Illus\.?\s*[:：]?\s*([A-Z][A-Za-z.'’\- ]{2,40}?)(?=\s{2,}|\s+No\b|\s+\d|\n|$)/.exec(text) || /Illus\.?\s*[:：]?\s*([A-Z][A-Za-z.'’\-]+(?: [A-Z][A-Za-z.'’\-]+){0,2})/.exec(text); if (ill) set('illustrator', ill[1].trim());
    const stage = /\b(VMAX|VSTAR|BASIC|STAGE\s*[12])\b/i.exec(text); if (stage) set('stage', stage[1].toUpperCase().replace(/STAGE\s*(\d)/, 'Stage $1').replace('BASIC', 'Basic').replace('VMAX', 'VMAX').replace('VSTAR', 'VSTAR'));
    else if (/ベイビィ|ベイビー/.test(text)) set('stage', 'Baby'); else if (/たね/.test(text)) set('stage', 'Basic'); else if (/1\s*進化/.test(text)) set('stage', 'Stage 1'); else if (/2\s*進化/.test(text)) set('stage', 'Stage 2');
    const byName = nat.length ? findSpecies(text, nat) : null;
    let sp = null, how = '';
    if (byName && dex && byName.n !== dex) { sp = byName.n; how = 'name'; set('conflict', `The name looks like #${byName.n} but the number reads ${dex}.`); }
    else if (byName) { sp = byName.n; how = 'name'; }
    else if (dex && nat[dex - 1]) { sp = dex; how = 'number'; }
    if (sp) { set('dex', sp); if (nat[sp - 1]) { set('name', nat[sp - 1][0]); set('type', (nat[sp - 1][1] || '').split('/')[0].split(' ')[0]); } out.how = how; }
    else if (dex) set('dex', dex);
    if (!out.name) { const first = text.split('\n').map(l => l.trim()).find(l => l.length >= 2 && l.length <= 24 && /[\p{L}]/u.test(l) && !/^HP|^LV/i.test(l)); if (first && !/^\W+$/.test(first)) { const cleaned = first.replace(/\bHP\s*\d+.*$/i, '').replace(/\bLV\.?\s*\d+.*$/i, '').replace(/\s*(BASIC|STAGE\s*\d|Pok[eé]mon)\b.*$/i, '').trim(); if (cleaned.length >= 2) set('nameGuess', cleaned); } }
    return { fields: out, found, text };
  };

  /* ---------- records ---------- */
  const normCard = r => ({
    game: r && r.game === 'other' ? 'other' : 'pokemon', name: String((r && r.name) || '').slice(0, 80), lang: LANGS.includes(r && r.lang) ? r.lang : (r && r.lang ? 'Other' : ''),
    number: String((r && r.number) || '').slice(0, 20), dex: Number.isInteger(+(r && r.dex)) && +(r && r.dex) >= 1 && +(r && r.dex) <= MAX_DEX ? +r.dex : 0, hp: Math.max(0, Math.min(999, Math.round(+(r && r.hp) || 0))),
    type: String((r && r.type) || '').slice(0, 24), stage: String((r && r.stage) || '').slice(0, 24), setName: String((r && r.setName) || '').slice(0, 80), setCode: String((r && r.setCode) || '').slice(0, 16), rarity: String((r && r.rarity) || '').slice(0, 30),
    illustrator: String((r && r.illustrator) || '').slice(0, 60), condition: CONDITIONS.includes(r && r.condition) ? r.condition : '', qty: Math.max(1, Math.min(9999, Math.floor(+(r && r.qty)) || 1)),
    valueCents: Number.isSafeInteger(r && r.valueCents) && r.valueCents >= 0 ? r.valueCents : null, holo: !!(r && r.holo), notes: String((r && r.notes) || '').slice(0, 5000),
  });
  const title = c => c.name || (c.dex ? `No. ${c.dex}` : 'Unnamed card');

  /* ---------- binder pages ---------- */
  const PAGE_SIZES = [[2, 2], [3, 3], [4, 3], [4, 4]];
  const validSize = (c, r) => PAGE_SIZES.some(s => s[0] === c && s[1] === r);
  const order = cards => [...cards].sort((a, b) => (a.pos ?? a.createdAt ?? 0) - (b.pos ?? b.createdAt ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const pages = (cards, cols, rows, minPages = 1) => { const per = cols * rows, list = order(cards), n = Math.max(minPages, Math.ceil(list.length / per) || 1); return Array.from({ length: n }, (_, p) => Array.from({ length: per }, (_, i) => list[p * per + i] || null)); };
  // positions after moving one card by d places (returns [{id, pos}] for the cards that changed)
  const moveBy = (cards, id, d) => { const list = order(cards), i = list.findIndex(c => c.id === id), j = Math.max(0, Math.min(list.length - 1, i + d)); if (i < 0 || i === j) return []; const [c] = list.splice(i, 1); list.splice(j, 0, c); return list.map((x, k) => ({ id: x.id, pos: k })).filter(x => (cards.find(c2 => c2.id === x.id).pos) !== x.pos); };
  const sortBy = (cards, how) => { const key = { name: c => fold(c.name || ''), number: c => (c.dex || 9999) * 1e4 + (parseInt(c.number) || 0), added: c => c.createdAt || 0, value: c => -(c.valueCents || 0) }[how] || (c => c.createdAt || 0); return [...cards].sort((a, b) => { const x = key(a), y = key(b); return typeof x === 'string' ? x.localeCompare(y) : x - y; }).map((c, k) => ({ id: c.id, pos: k })); };

  const search = (cards, q) => { q = fold(q); return q ? cards.filter(c => fold([c.name, c.number, c.setName, c.setCode, c.illustrator, c.type, c.lang, c.rarity, c.notes, c.dex ? 'no ' + c.dex : ''].join(' ')).includes(q)) : cards; };
  const stats = cards => { const units = cards.reduce((a, c) => a + (c.qty || 1), 0), species = new Set(cards.filter(c => c.dex).map(c => c.dex)), value = cards.reduce((a, c) => a + (c.valueCents || 0) * (c.qty || 1), 0); const byLang = {}; for (const c of cards) byLang[c.lang || 'Unknown'] = (byLang[c.lang || 'Unknown'] || 0) + (c.qty || 1); return { cards: cards.length, units, species: species.size, value, byLang }; };
  const csv = (cards, binders) => { const bn = new Map(binders.map(b => [b.id, b.name])); const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; return [['Binder', 'Name', 'Game', 'Language', 'Card number', 'Pokédex no.', 'HP', 'Type', 'Stage', 'Set', 'Set code', 'Rarity', 'Illustrator', 'Condition', 'Quantity', 'Value each', 'Holo', 'Notes'], ...cards.map(c => [bn.get(c.binder) || '', c.name, c.game, c.lang, c.number, c.dex || '', c.hp || '', c.type, c.stage, c.setName, c.setCode, c.rarity, c.illustrator, c.condition, c.qty, c.valueCents === null || c.valueCents === undefined ? '' : (c.valueCents / 100).toFixed(2), c.holo ? 'yes' : '', c.notes])].map(r => r.map(q).join(',')).join('\r\n') + '\r\n'; };

  return { CONDITIONS, LANGS, GAMES, STAGES, PAGE_SIZES, fold, tidy, lang, findSpecies, parse, normCard, title, validSize, order, pages, moveBy, sortBy, search, stats, csv };
})();
if (typeof module !== 'undefined') module.exports = CardCore;

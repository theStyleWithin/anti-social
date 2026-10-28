'use strict';
/* Reading and writing Pokémon files: the decrypted ".pk*" files that PKHeX and pkHouse use, and pkHouse's bank files (".bin").
   The layouts are ported from pkHouse (https://github.com/Insektaure/pkHouse, GPL-2.0), which ports them from PKHeX.
   It only reads what a file says; it never touches a game's save. */
const PkmParse = (() => {
  // formats: one per generation of the games. Offsets: see the table in pkHouse's include/pokemon.h.
  const KEYS = ['species', 'held', 'pid', 'nature', 'fateful', 'fatefulBit', 'genderByte', 'genderShift', 'form', 'formShift', 'ball', 'ability', 'abilityU8', 'ev', 'tid', 'sid', 'move', 'iv32', 'nick', 'ot', 'level', 'exp', 'alpha', 'alphaNZ', 'lang', 'formArg', 'gmax', 'hScalar', 'wScalar', 'ht', 'metDate', 'metLoc', 'version'];
  const row = a => Object.fromEntries(KEYS.map((k, i) => [k, a[i]]));
  const FORMATS = {
    pk3: { stored: 80, party: 100, o: row([0x20, 0x22, 0x00, -1, -1, 31, -1, 0, -1, 0, -1, -1, false, 0x38, 0x04, 0x06, 0x2C, 0x48, -1, -1, -1, 0x24, -1, false, 0x12, -1, -1, -1, -1, -1, -1, -1, -1]) },
    pb7: { stored: 0xE8, party: 0x104, o: row([0x08, 0x0A, 0x18, 0x1C, 0x1D, 0, 0x1D, 1, 0x1D, 3, 0xDC, 0x14, true, 0x1E, 0x0C, 0x0E, 0x5A, 0x74, 0x40, 0xB0, 0xEC, -1, -1, false, 0xE3, 0x3C, -1, 0x3A, 0x3B, 0x78, 0xD4, 0xDA, 0xDF]) },
    pk8: { stored: 0x148, party: 0x158, o: row([0x08, 0x0A, 0x1C, 0x20, 0x22, 0, 0x22, 2, 0x24, 0, 0x124, 0x14, false, 0x26, 0x0C, 0x0E, 0x72, 0x8C, 0x58, 0xF8, 0x148, -1, -1, false, 0xE2, 0xE4, 0x16, -1, -1, 0xA8, 0x11C, 0x122, 0xDE]) },
    pa8: { stored: 0x168, party: 0x178, o: row([0x08, 0x0A, 0x1C, 0x20, 0x22, 0, 0x22, 2, 0x24, 0, 0x137, 0x14, false, 0x26, 0x0C, 0x0E, 0x54, 0x94, 0x60, 0x110, -1, 0x10, 0x16, false, 0xF2, 0xE4, -1, -1, -1, 0xB8, 0x134, 0x13A, 0xEE]) },
    pa9: { stored: 0x148, party: 0x158, o: row([0x08, 0x0A, 0x1C, 0x20, 0x22, 0, 0x22, 1, 0x24, 0, 0x124, 0x14, false, 0x26, 0x0C, 0x0E, 0x72, 0x8C, 0x58, 0xF8, 0x148, -1, 0x23, true, 0xD5, 0xD0, -1, -1, -1, 0xA8, 0x11C, 0x122, 0xCE]) },
  };
  // which layout each game family uses, and which file extensions mean which layout
  const FAMILY_FORMAT = { frlg: 'pk3', lgpe: 'pb7', swsh: 'pk8', bdsp: 'pk8', la: 'pa8', sv: 'pa9', za: 'pa9' };
  const EXT_FORMAT = { pk3: 'pk3', pb7: 'pb7', pk8: 'pk8', pb8: 'pk8', pa8: 'pa8', pk9: 'pa9', pa9: 'pa9' };
  const EXT_OF = { pk3: 'pk3', pb7: 'pb7', pk8: 'pk8', pa8: 'pa8', pa9: 'pk9' };
  const BANK_MAGIC = 'PKHOUSE\0', BANK_HEADER = 16, BOX_NAME = 16;
  // bank file versions: [boxes, bytes per slot, slots per box]
  const BANK_VERSIONS = { 1: ['sv', 32, 0x158, 30, ['swsh', 'sv', 'za']], 2: ['bdsp', 40, 0x158, 30, ['bdsp']], 3: ['la', 32, 0x178, 30, ['la']], 4: ['lgpe', 40, 0x104, 25, ['lgpe']], 5: ['frlg', 14, 80, 30, ['frlg']] };
  const BALLS = ['', 'Master Ball', 'Ultra Ball', 'Great Ball', 'Poké Ball', 'Safari Ball', 'Net Ball', 'Dive Ball', 'Nest Ball', 'Repeat Ball', 'Timer Ball', 'Luxury Ball', 'Premier Ball', 'Dusk Ball', 'Heal Ball', 'Quick Ball', 'Cherish Ball', 'Fast Ball', 'Level Ball', 'Lure Ball', 'Heavy Ball', 'Love Ball', 'Friend Ball', 'Moon Ball', 'Sport Ball', 'Dream Ball', 'Beast Ball', 'Strange Ball', 'Poké Ball', 'Great Ball', 'Ultra Ball', 'Feather Ball', 'Wing Ball', 'Jet Ball', 'Heavy Ball', 'Leaden Ball', 'Gigaton Ball', 'Origin Ball'];
  const VERSIONS = { 1: 'Sapphire', 2: 'Ruby', 3: 'Emerald', 4: 'FireRed', 5: 'LeafGreen', 7: 'HeartGold', 8: 'SoulSilver', 10: 'Diamond', 11: 'Pearl', 12: 'Platinum', 15: 'Colosseum/XD', 16: 'Battle Revolution', 20: 'White', 21: 'Black', 22: 'White 2', 23: 'Black 2', 24: 'X', 25: 'Y', 26: 'Alpha Sapphire', 27: 'Omega Ruby', 30: 'Sun', 31: 'Moon', 32: 'Ultra Sun', 33: 'Ultra Moon', 34: 'GO', 35: 'Red', 36: 'Green', 37: 'Blue', 38: 'Yellow', 39: 'Gold', 40: 'Silver', 41: 'Crystal', 42: "Let's Go Pikachu", 43: "Let's Go Eevee", 44: 'Sword', 45: 'Shield', 47: 'Legends: Arceus', 48: 'Brilliant Diamond', 49: 'Shining Pearl', 50: 'Scarlet', 51: 'Violet', 52: 'Legends: Z-A' };

  const u8 = (d, o) => d[o], u16 = (d, o) => d[o] | (d[o + 1] << 8), u32 = (d, o) => (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0;
  const utf16 = (d, o, n) => { let s = ''; for (let i = 0; i < n; i++) { const c = u16(d, o + i * 2); if (!c) break; s += String.fromCharCode(c); } return s; };
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(bytes).toString('base64'); };
  const unb64 = s => { if (typeof atob === 'function') { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; } return Uint8Array.from(Buffer.from(s, 'base64')); };

  const make = D => {
    const g3str = (d, o, n, jp) => { const t = jp ? D.g3jp : D.g3en; let s = ''; for (let i = 0; i < n; i++) { const b = d[o + i]; if (b === 0xFF) break; const c = t[b]; if (!c) break; s += String.fromCharCode(c); } return s; };
    const national9 = raw => { const k = raw - 917; return k >= 0 && k < D.sv9.length ? raw + D.sv9[k] : raw; };
    const national3 = raw => { if (raw < 277) return raw; const k = raw - 277; return k < D.g3int.length ? raw + D.g3int[k] : raw; };
    const levelFromExp = (exp, growth) => { const g = growth > 5 ? 0 : growth, t = D.exp.slice(g * 100, g * 100 + 100); if (exp >= t[99]) return 100; let lv = 1; while (lv < 100 && exp >= t[lv]) lv++; return lv; };
    const name = (list, i) => { const v = list[i]; return typeof v === 'string' && v && v !== '—' && v !== '———' && v !== 'None' ? v : ''; };

    // Read one Pokémon. `bytes` is decrypted data of the format's stored or party size. Returns null for an empty slot.
    const parse = (bytes, fmt, family) => {
      const F = FORMATS[fmt]; if (!F) return null;
      const d = new Uint8Array(F.party); d.set(bytes.subarray(0, Math.min(bytes.length, F.party)));
      const o = F.o, speciesInternal = u16(d, o.species);
      if (u32(d, 0) === 0 && speciesInternal === 0) return null;
      const species = fmt === 'pk3' ? national3(speciesInternal) : fmt === 'pa9' ? national9(speciesInternal) : speciesInternal;
      if (species < 1 || species > 1025) return null;
      const pid = u32(d, o.pid), tid = u16(d, o.tid), sid = u16(d, o.sid), iv32 = u32(d, o.iv32);
      const gen3 = fmt === 'pk3';
      let gender;
      if (o.genderByte < 0) { const r = species >= 387 ? 0xFF : D.frlgGender[species]; gender = r === 0xFF ? 2 : r === 0xFE ? 1 : r === 0 ? 0 : ((pid & 0xFF) >= r ? 0 : 1); } else gender = (d[o.genderByte] >> o.genderShift) & 3;
      let level;
      if (o.level >= 0) level = d[o.level]; else if (gen3) level = levelFromExp(u32(d, o.exp), species < 387 ? D.frlgGrowth[species] : 0); else level = levelFromExp(u32(d, o.exp), speciesInternal < 1276 ? D.laGrowth[speciesInternal] : 0);
      const levelKnown = level >= 1 && level <= 100;
      const xor = ((pid >>> 16) ^ (pid & 0xFFFF) ^ tid ^ sid) >>> 0;
      const ballId = o.ball >= 0 ? d[o.ball] : (u16(d, 0x46) >> 11) & 0xF;
      const nature = o.nature >= 0 ? d[o.nature] : pid % 25;
      const abilityId = o.ability < 0 ? 0 : o.abilityU8 ? d[o.ability] : u16(d, o.ability);
      const jp = gen3 && d[o.lang] === 1;
      const nickname = gen3 ? g3str(d, 0x08, 10, jp) : utf16(d, o.nick, 13), ot = gen3 ? g3str(d, 0x14, 7, jp) : utf16(d, o.ot, 13);
      const nicknamed = gen3 ? true : ((iv32 >>> 31) & 1) === 1, speciesName = (D.speciesNames && D.speciesNames[species - 1]) || '';
      const ver = o.version >= 0 ? d[o.version] : (u16(d, 0x46) >> 7) & 0xF;
      const metId = o.metLoc >= 0 ? u16(d, o.metLoc) : d[0x45];
      const alpha = o.alpha < 0 ? false : o.alphaNZ ? d[o.alpha] !== 0 : ((d[o.alpha] >> 5) & 1) === 1;
      const ivs = [iv32 & 31, (iv32 >>> 5) & 31, (iv32 >>> 10) & 31, (iv32 >>> 20) & 31, (iv32 >>> 25) & 31, (iv32 >>> 15) & 31];     // HP Atk Def SpA SpD Spe
      const e = o.ev, evs = [d[e], d[e + 1], d[e + 2], d[e + 4], d[e + 5], d[e + 3]];
      const ballName = (BALLS[ballId] || '');
      const mon = {
        species, nickname: nicknamed && nickname && nickname.toLowerCase() !== speciesName.toLowerCase() ? nickname : '', level: levelKnown ? level : 1, gender: ['Male', 'Female', 'Genderless', ''][gender] || '',
        shiny: gen3 ? xor === 0 : xor < 16, alpha, egg: ((iv32 >>> 30) & 1) === 1, nature: nature >= 0 && nature < 25 ? nature : -1, ability: name(D.abilities, abilityId), item: name(D.items, u16(d, o.held)), ball: ballName,
        moves: [0, 1, 2, 3].map(i => name(D.moves, u16(d, o.move + i * 2))), ivs, evs, ot,
        tid: gen3 ? tid : (((sid * 65536) + tid) >>> 0) % 1000000, origin: VERSIONS[ver] || '', met: (D.locations[family] || {})[metId] || '',
        notes: levelKnown ? '' : 'The file has no level information, so the level was set to 1.',
      };
      return { mon, raw: b64(d), fmt };
    };
    const detect = (bytes, ext) => { const f = EXT_FORMAT[String(ext || '').toLowerCase().replace(/^\./, '')]; return f && (bytes.length === FORMATS[f].stored || bytes.length === FORMATS[f].party) ? f : null; };

    // pkHouse's bank files
    const parseBank = bytes => {
      if (bytes.length < BANK_HEADER || String.fromCharCode(...bytes.subarray(0, 8)) !== BANK_MAGIC) return { ok: false, error: 'That is not a pkHouse bank file.' };
      const ver = u32(bytes, 8), L = BANK_VERSIONS[ver];
      if (!L) return { ok: false, error: 'That bank file is from a version this app does not know.' };
      const [defFam, boxes, size, per, families] = L;
      return { ok: true, version: ver, boxes, size, per, families, defaultFamily: defFam, bytes };
    };
    // Turn a parsed bank file into entries for the family chosen.
    const readBank = (parsed, family) => {
      const fmt = FAMILY_FORMAT[family], b = parsed.bytes, out = [], names = [];
      let skipped = 0;
      for (let i = 0; i < parsed.boxes * parsed.per; i++) {
        const off = BANK_HEADER + i * parsed.size; if (off + 4 > b.length) break;
        const slice = b.subarray(off, Math.min(off + parsed.size, b.length)), p = parse(slice, fmt, family);
        if (p) out.push({ box: Math.floor(i / parsed.per), slot: i % parsed.per, ...p }); else if (slice.some(x => x)) skipped++;
      }
      const nOff = BANK_HEADER + parsed.boxes * parsed.per * parsed.size;
      for (let i = 0; i < parsed.boxes; i++) { const o = nOff + i * BOX_NAME; if (o + BOX_NAME > b.length) break; let n = ''; for (let k = 0; k < BOX_NAME && b[o + k]; k++) n += String.fromCharCode(b[o + k]); names.push(n); }
      return { entries: out, boxNames: names, skipped };
    };
    return { parse, detect, parseBank, readBank };
  };

  // Write a pkHouse bank file from entries that still hold their original data ({box, slot, raw (base64), fmt}).
  const buildBank = (family, entries, boxNames) => {
    const ver = Number(Object.keys(BANK_VERSIONS).find(k => BANK_VERSIONS[k][0] === family || BANK_VERSIONS[k][4].includes(family)));
    const [, boxes, size, per] = BANK_VERSIONS[ver], out = new Uint8Array(BANK_HEADER + boxes * per * size + boxes * BOX_NAME);
    for (let i = 0; i < 8; i++) out[i] = BANK_MAGIC.charCodeAt(i);
    out[8] = ver & 255;
    let written = 0;
    for (const e of entries) {
      if (!e.raw || e.fmt !== FAMILY_FORMAT[family] || e.box >= boxes || e.slot >= per) continue;
      const bytes = unb64(e.raw); out.set(bytes.subarray(0, size), BANK_HEADER + (e.box * per + e.slot) * size); written++;
    }
    const nOff = BANK_HEADER + boxes * per * size;
    for (let i = 0; i < boxes; i++) { const n = (boxNames && boxNames[i] || ''); for (let k = 0; k < Math.min(BOX_NAME, n.length); k++) out[nOff + i * BOX_NAME + k] = n.charCodeAt(k) & 0x7f; }
    return { bytes: out, written };
  };
  const fileExt = fmt => EXT_OF[fmt] || 'pk';

  return { FORMATS, FAMILY_FORMAT, EXT_FORMAT, BANK_VERSIONS, BALLS, VERSIONS, make, buildBank, fileExt, b64, unb64 };
})();
if (typeof module !== 'undefined') module.exports = PkmParse;

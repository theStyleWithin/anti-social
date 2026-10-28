'use strict';
/* The Switch SD card: finding pkHouse's banks and save backups (and JKSV / Checkpoint backups of the Pokémon games) on a
   card plugged into this device, and copying them to and from other places. The logic here is pure; folders are reached
   through a small bridge (list, read, write) that each app provides. The title IDs and folder names come from pkHouse
   (https://github.com/Insektaure/pkHouse, GPL-2.0).
   A Switch keeps its game saves inside the console, not on the SD card, so what can be found here is only what a tool
   (pkHouse, JKSV, Checkpoint) copied onto the card. */
const SdCore = (() => {
  const TITLES = [
    { id: '0100F43008C44000', save: 'main', name: 'Pokemon Legends: Z-A', group: 'Legends: Z-A', folder: 'LegendsZA', path: 'LegendsZA' },
    { id: '0100A3D008C5C000', save: 'main', name: 'Pokemon Scarlet', group: 'Scarlet / Violet', folder: 'ScarletViolet', path: 'Scarlet' },
    { id: '01008F6008C5E000', save: 'main', name: 'Pokemon Violet', group: 'Scarlet / Violet', folder: 'ScarletViolet', path: 'Violet' },
    { id: '0100ABF008968000', save: 'main', name: 'Pokemon Sword', group: 'Sword / Shield', folder: 'SwordShield', path: 'Sword' },
    { id: '01008DB008C2C000', save: 'main', name: 'Pokemon Shield', group: 'Sword / Shield', folder: 'SwordShield', path: 'Shield' },
    { id: '0100000011D90000', save: 'SaveData.bin', name: 'Pokemon Brilliant Diamond', group: 'Brilliant Diamond / Shining Pearl', folder: 'BDSP', path: 'BrilliantDiamond' },
    { id: '010018E011D92000', save: 'SaveData.bin', name: 'Pokemon Shining Pearl', group: 'Brilliant Diamond / Shining Pearl', folder: 'BDSP', path: 'ShiningPearl' },
    { id: '01001F5010DFA000', save: 'main', name: 'Pokemon Legends: Arceus', group: 'Legends: Arceus', folder: 'LegendsArceus', path: 'LegendsArceus' },
    { id: '010003F003A34000', save: 'savedata.bin', name: 'Pokemon Let\'s Go Pikachu', group: 'Let\'s Go Pikachu / Let\'s Go Eevee', folder: 'LetsGo', path: 'LetsGoPikachu' },
    { id: '0100187003A36000', save: 'savedata.bin', name: 'Pokemon Let\'s Go Eevee', group: 'Let\'s Go Pikachu / Let\'s Go Eevee', folder: 'LetsGo', path: 'LetsGoEevee' },
    { id: '0100554023408000', save: 'FireRed_e.sav', name: 'Pokemon FireRed', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'FireRed' },
    { id: '010034D02340E000', save: 'LeafGreen_e.sav', name: 'Pokemon LeafGreen', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'LeafGreen' },
    { id: '0100EB702342C000', save: 'FireRed_s.sav', name: 'Pokemon FireRed (ES)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'FireRed_ES' },
    { id: '01002B5023434000', save: 'LeafGreen_s.sav', name: 'Pokemon LeafGreen (ES)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'LeafGreen_ES' },
    { id: '01007F8023416000', save: 'FireRed_d.sav', name: 'Pokemon FireRed (DE)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'FireRed_DE' },
    { id: '0100FD6023430000', save: 'LeafGreen_d.sav', name: 'Pokemon LeafGreen (DE)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'LeafGreen_DE' },
    { id: '010092302342A000', save: 'FireRed_i.sav', name: 'Pokemon FireRed (IT)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'FireRed_IT' },
    { id: '01005C7023432000', save: 'LeafGreen_i.sav', name: 'Pokemon LeafGreen (IT)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'LeafGreen_IT' },
    { id: '01004B3023412000', save: 'FireRed_f.sav', name: 'Pokemon FireRed (FR)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'FireRed_FR' },
    { id: '010087C02342E000', save: 'LeafGreen_f.sav', name: 'Pokemon LeafGreen (FR)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'LeafGreen_FR' },
    { id: '01006FA0233F8000', save: 'FireRed_j.sav', name: 'Pokemon FireRed (JA)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'FireRed_JA' },
    { id: '0100F1E0233FA000', save: 'LeafGreen_j.sav', name: 'Pokemon LeafGreen (JA)', group: 'FireRed / LeafGreen', folder: 'FireRedLeafGreen', path: 'LeafGreen_JA' }
  ];
  const FOLDER_FAMILY = { LetsGo: 'lgpe', SwordShield: 'swsh', BDSP: 'bdsp', LegendsArceus: 'la', ScarletViolet: 'sv', LegendsZA: 'za', FireRedLeafGreen: 'frlg' };
  const FAMILY_FOLDER = Object.fromEntries(Object.entries(FOLDER_FAMILY).map(([k, v]) => [v, k]));
  const SAVE_FILES = new Set(['main', 'savedata.bin', 'SaveData.bin'.toLowerCase()]);
  const LIMITS = { files: 300, depth: 5, bytes: 64 * 1024 * 1024, bankBytes: 40 * 1024 * 1024 };
  const lc = s => String(s || '').toLowerCase();
  const find = (entries, name, dir) => (entries || []).find(e => lc(e.name) === lc(name) && (dir === undefined || !!e.dir === dir));
  const isSave = name => SAVE_FILES.has(lc(name)) || /\.sav$/i.test(name);
  const plain = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // a folder name from JKSV or Checkpoint: which Pokémon game is it? (by title id or by name)
  const matchTitle = name => {
    const n = plain(name), hex = (n.match(/[0-9a-f]{16}/) || [''])[0].toUpperCase();
    if (hex) { const t = TITLES.find(x => x.id === hex); if (t) return t; }
    if (!/pokemon/.test(n)) return null;
    const q = n.replace(/pokemon/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const score = t => { const w = plain(t.name).replace('pokemon', '').replace(/[^a-z0-9]+/g, ' ').trim(); return w && q.includes(w) ? w.length : 0; };
    let best = null, top = 0; for (const t of TITLES) { const s = score(t); if (s > top) { top = s; best = t; } }
    return best;
  };
  const dateOf = name => { const m = /(\d{4})-(\d{2})-(\d{2})[_ T](\d{2})[-:](\d{2})[-:](\d{2})/.exec(name); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : 0; };
  const clean = (s, max = 32) => String(s || '').replace(/[^A-Za-z0-9 _.-]/g, '').replace(/^\.+/, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const pad = n => String(n).padStart(2, '0');
  const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const join = (...p) => p.filter(Boolean).join('/');
  const safeRel = rel => typeof rel === 'string' && !rel.startsWith('/') && !/(^|\/)\.\.(\/|$)/.test(rel) && !/[\\\u0000]/.test(rel);

  const tryList = async (fs, id, rel) => { try { return await fs.list(id, rel); } catch { return []; } };
  // every file under a folder: [{rel, size}], skipping dot files, with limits so a wrong folder cannot run forever
  const walk = async (fs, id, rel, depth = 0, out = [], base = rel) => {
    if (depth > LIMITS.depth || out.length > LIMITS.files) return out;
    for (const e of await tryList(fs, id, rel)) {
      if (e.name.startsWith('.')) continue;
      if (e.dir) await walk(fs, id, join(rel, e.name), depth + 1, out, base); else if (out.length <= LIMITS.files) out.push({ rel: join(rel, e.name).slice(base.length ? base.length + 1 : 0), size: e.size || 0 });
    }
    return out;
  };
  const sizeOf = files => files.reduce((a, f) => a + (f.size || 0), 0);

  // Look through a card (a handle on its top folder) for what this app knows how to use.
  const scan = async (fs, id) => {
    const res = { banks: [], backups: [], pkFiles: [], other: [], profiles: [], hasSwitch: false, notes: [] };
    const root = await tryList(fs, id, '');
    const sw = find(root, 'switch', true); res.hasSwitch = !!sw || !!find(root, 'Nintendo', true);
    const swList = sw ? await tryList(fs, id, sw.name) : [];
    const ph = find(swList, 'pkHouse', true);
    if (ph) {
      const base = join(sw.name, ph.name), baseList = await tryList(fs, id, base);
      const banks = find(baseList, 'banks', true);
      if (banks) for (const fd of await tryList(fs, id, join(base, banks.name))) {
        if (!fd.dir || !FOLDER_FAMILY[fd.name]) continue;
        for (const f of await tryList(fs, id, join(base, banks.name, fd.name))) if (!f.dir && /\.bin$/i.test(f.name) && f.size > 16) res.banks.push({ path: join(base, banks.name, fd.name, f.name), name: f.name.replace(/\.bin$/i, ''), folder: fd.name, family: FOLDER_FAMILY[fd.name], size: f.size, mtime: f.mtime || 0 });
      }
      const bk = find(baseList, 'backups', true);
      if (bk) for (const prof of await tryList(fs, id, join(base, bk.name))) {
        if (!prof.dir) continue; res.profiles.push(prof.name);
        for (const g of await tryList(fs, id, join(base, bk.name, prof.name))) {
          const title = g.dir ? TITLES.find(t => t.path === g.name) : null; if (!title) continue;
          for (const b of await tryList(fs, id, join(base, bk.name, prof.name, g.name))) {
            if (!b.dir) continue; const dir = join(base, bk.name, prof.name, g.name, b.name), files = await walk(fs, id, dir);
            if (!files.length) continue;
            res.backups.push({ source: 'pkHouse', path: dir, profile: prof.name, title, name: b.name, date: dateOf(b.name) || b.mtime || 0, files, size: sizeOf(files), hasSave: files.some(f => isSave(f.rel.split('/').pop())), checked: !!(await tryList(fs, id, dir)).find(x => x.name === '.pkhouse_backup') });
          }
        }
      }
      const ex = find(baseList, 'export', true);
      if (ex) for (const fd of await tryList(fs, id, join(base, ex.name))) if (fd.dir) for (const f of await tryList(fs, id, join(base, ex.name, fd.name))) if (!f.dir && /\.(pk3|pb7|pk8|pb8|pa8|pk9|pa9)$/i.test(f.name) && f.size < 1024) res.pkFiles.push({ path: join(base, ex.name, fd.name, f.name), name: f.name, size: f.size });
    }
    // other save managers: Checkpoint and JKSV keep one folder per game, with one folder (or zip) per backup
    const managers = [];
    const cp = find(swList, 'Checkpoint', true); if (cp) { const cl = await tryList(fs, id, join(sw.name, cp.name)), sv = find(cl, 'saves', true); if (sv) managers.push(['Checkpoint', join(sw.name, cp.name, sv.name)]); }
    const jk = find(root, 'JKSV', true); if (jk) managers.push(['JKSV', jk.name]);
    for (const [source, dir] of managers) for (const g of await tryList(fs, id, dir)) {
      if (!g.dir) continue; const title = matchTitle(g.name); if (!title) continue;
      for (const b of await tryList(fs, id, join(dir, g.name))) {
        const path = join(dir, g.name, b.name);
        if (b.dir) { const files = await walk(fs, id, path); if (files.length) res.other.push({ source, path, title, name: b.name, date: dateOf(b.name) || b.mtime || 0, files, size: sizeOf(files), hasSave: files.some(f => isSave(f.rel.split('/').pop())), dir: true }); }
        else if (/\.zip$/i.test(b.name)) res.other.push({ source, path, title, name: b.name, date: dateOf(b.name) || b.mtime || 0, files: [{ rel: b.name, size: b.size || 0 }], size: b.size || 0, hasSave: true, dir: false, zip: true });
      }
    }
    res.backups.sort((a, b) => b.date - a.date); res.other.sort((a, b) => b.date - a.date);
    res.profiles = [...new Set(res.profiles)];
    return res;
  };

  // Copy a backup folder out of a card into another folder (for an emulator or PKHeX). Never deletes anything.
  const copyOut = async (fs, srcId, srcDir, dstId, dstDir, files, onStep) => {
    let done = 0, bytes = 0;
    for (const f of files) {
      if (!safeRel(f.rel)) throw new Error('A file name in the backup is not safe: ' + f.rel);
      if (f.size > LIMITS.bytes) throw new Error(f.rel + ' is too big to copy.');
      const data = await fs.read(srcId, join(srcDir, f.rel)); await fs.write(dstId, join(dstDir, f.rel), data); done++; bytes += data.length; if (onStep) onStep(done, files.length);
    }
    return { files: done, bytes };
  };
  // Where a save folder from elsewhere goes on the card so pkHouse can restore it.
  const backupDirFor = (profile, title, date) => { const p = clean(profile) || 'Unknown'; return join('switch', 'pkHouse', 'backups', p, title.path, `${p}_${stamp(date)}`); };
  const bankPathFor = (folder, name) => join('switch', 'pkHouse', 'banks', folder, (clean(name, 32) || 'Bank') + '.bin');
  const hasMainFile = (files, title) => files.some(f => f.rel.split('/').pop() === title.save);

  return { TITLES, FOLDER_FAMILY, FAMILY_FOLDER, LIMITS, matchTitle, dateOf, clean, stamp, safeRel, walk, scan, copyOut, backupDirFor, bankPathFor, hasMainFile, isSave };
})();
if (typeof module !== 'undefined') module.exports = SdCore;

'use strict';
/* Pokémon Bank, Switch SD card: find pkHouse's banks and save backups on a Switch SD card plugged into this device, bring
   banks into the app, copy a save backup out for an emulator or PKHeX, and send banks or save folders back onto the card.
   Nothing here reads a game's save; it copies files, and it asks before it writes anything. */
const SD = SdCore;
let sdCard = null, sdScan = null, sdBusy = '', sdErr = '', sdFound = null;
const sdFS = () => window.AntiSocialFS || null;
const sdSize = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';
const sdDate = t => t ? new Date(t).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'unknown date';

async function sdUse(card) {
  sdCard = card; sdScan = null; sdErr = ''; sdBusy = 'Looking through the card...'; render(true);
  try { sdScan = await SD.scan(sdFS(), card.id); } catch (e) { sdErr = 'The card could not be read: ' + (e && e.message || e); }
  sdBusy = ''; render(true);
}
async function sdFind() {
  sdBusy = 'Looking for a Switch SD card...'; sdErr = ''; render(true);
  try { sdFound = await sdFS().detect(); } catch (e) { sdFound = []; sdErr = String(e && e.message || e); }
  sdBusy = ''; render(true);
  if (sdFound.length === 1) sdUse(sdFound[0]);
}
async function sdPickCard() { try { const c = await sdFS().pick('Choose the Switch SD card (the top folder, with "switch" inside)'); if (c) sdUse(c); } catch (e) { toast(String(e && e.message || e)); } }

// a window that lists what is about to be written and waits for a yes
function sdConfirm(title, lines, action) {
  return new Promise(res => {
    const done = v => { close(); res(v); };
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => done(false) }, icon('x')), h('b', {}, title)),
      h('div', { class: 'mp' }, h('ul', { class: 'sd-lines' }, lines.map(l => h('li', {}, l))), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => done(true) }, action), h('button', { class: 'btn', type: 'button', onclick: () => done(false) }, 'Cancel')))));
  });
}
const sdRun = async (label, fn) => {
  if (sdBusy) return; sdBusy = label; render(true);
  try { await fn(); } catch (e) { console.error(e); toast('Something went wrong: ' + (e && e.message || e)); } finally { sdBusy = ''; render(true); }
};

/* ---------- actions ---------- */
async function sdImportBank(acct, b) {
  await sdRun('Reading the bank...', async () => {
    const bytes = await sdFS().read(sdCard.id, b.path), id = await pkImportBinBytes(acct, bytes, b.name, b.family);
    if (id) go('/apps/pokebank/' + id);
  });
}
async function sdCopyBackupOut(b) {
  const fs = sdFS(); let dest;
  try { dest = await fs.pick(`Choose where to copy ${b.title.name} (an emulator's save folder, or any folder)`); } catch (e) { return toast(String(e && e.message || e)); }
  if (!dest) return;
  const files = b.zip ? b.files : b.files.filter(f => !f.rel.endsWith('/'));
  const exist = []; for (const f of files) if (await fs.exists(dest.id, b.zip ? f.rel : f.rel)) exist.push(f.rel);
  const ok = await sdConfirm('Copy this backup?', [
    `${b.title.name}, ${sdDate(b.date)}${b.profile ? ' (' + b.profile + ')' : ''}`, `${plural(files.length, 'file')}, ${sdSize(b.size)}, copied into "${dest.label}".`,
    exist.length ? `Replaces ${plural(exist.length, 'file')} that are already there: ${exist.slice(0, 4).join(', ')}${exist.length > 4 ? '...' : ''}. Make a copy of that folder first if it matters.` : 'Nothing there will be replaced.',
    'The original on the SD card is not touched.'], 'Copy');
  if (!ok) return;
  await sdRun('Copying...', async () => {
    const r = b.zip ? await SD.copyOut(fs, sdCard.id, b.path.split('/').slice(0, -1).join('/'), dest.id, '', files) : await SD.copyOut(fs, sdCard.id, b.path, dest.id, '', files);
    toast(`Copied ${plural(r.files, 'file')} (${sdSize(r.bytes)}).`);
  });
}
async function sdImportPkFiles(acct, ctx, D, banks) {
  if (!banks.length) return toast('Make a bank first.');
  const sel = h('select', { 'aria-label': 'Bank' }, banks.map(b => h('option', { value: b.id }, `${b.name} (${pkFamilyName(b.family)})`)));
  const target = await new Promise(res => { const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => { close(); res(null); } }, icon('x')), h('b', {}, 'Import into which bank?')), h('div', { class: 'mp' }, aiField('Bank', sel), h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); res(banks.find(b => b.id === sel.value)); } }, 'Import'))))); });
  if (!target) return;
  await sdRun('Importing...', async () => {
    const X = await loadPkData(); let added = 0, bad = 0, full = 0;
    for (const f of sdScan.pkFiles) {
      const bytes = await sdFS().read(sdCard.id, f.path), fmt = X.detect(bytes, extOf(f.name)), p = fmt && X.parse(bytes, fmt, PkmParse.FAMILY_FORMAT[target.family] === fmt ? target.family : ({ pk3: 'frlg', pb7: 'lgpe', pk8: 'swsh', pa8: 'la', pa9: 'sv' })[fmt]);
      if (!p) { bad++; continue; }
      const free = PK.firstFree(await pkLive(acct, target), target); if (!free) { full++; continue; }
      await pkSave(acct, { id: uid(), kind: 'pkm', bank: target.id, ...free, ...PK.normMon({ ...p.mon, raw: p.raw, rawFmt: p.fmt }) }); added++;
    }
    toast([added ? `Added ${pkCount(added)}.` : '', bad ? `${bad} could not be read.` : '', full ? 'The bank is full.' : ''].filter(Boolean).join(' '));
  });
}
async function sdSendBank(acct, ctx, bank) {
  const mons = pkMons(ctx).filter(m => m.bank === bank.id), usable = mons.filter(m => m.raw && m.rawFmt === PkmParse.FAMILY_FORMAT[bank.family]);
  if (!usable.length) return toast('None of the Pokémon in that bank came from a game file, so there is nothing a Switch could read. Import game files or a pkHouse bank first.');
  const folder = SD.FAMILY_FOLDER[bank.family], path = SD.bankPathFor(folder, bank.name), fs = sdFS(), exists = await fs.exists(sdCard.id, path);
  const ok = await sdConfirm('Put this bank on the SD card?', [`${bank.name}: ${pkCount(usable.length)} go into a pkHouse bank file.`, mons.length > usable.length ? `${pkCount(mons.length - usable.length)} you typed in by hand are left out, because a game could not read them.` : 'Every Pokémon in it goes.',
    `It is written to ${path} on the card.`, exists ? 'A bank with that name is already there. The old one is kept next to it, renamed with .old and the date.' : 'Nothing is replaced.'], 'Write to the card');
  if (!ok) return;
  await sdRun('Writing to the card...', async () => {
    if (exists) { const old = await fs.read(sdCard.id, path); await fs.write(sdCard.id, path.replace(/\.bin$/, '') + '.' + SD.stamp() + '.old', old); }
    const built = PkmParse.buildBank(bank.family, usable.map(m => ({ box: m.box, slot: m.slot, raw: m.raw, fmt: m.rawFmt })), bank.boxNames || []);
    await fs.write(sdCard.id, path, built.bytes);
    toast(`Wrote ${pkCount(built.written)} to the card. Put the card back in the Switch and open it in pkHouse.`);
    sdScan = await SD.scan(fs, sdCard.id);
  });
}
async function sdSendSave(gameId, profile) {
  const fs = sdFS(), title = SD.TITLES.find(t => t.id === gameId); if (!title) return;
  let src; try { src = await fs.pick(`Choose the folder that holds the ${title.name} save files (like "${title.save}")`); } catch (e) { return toast(String(e && e.message || e)); }
  if (!src) return;
  const files = await SD.walk(fs, src.id, '');
  if (!files.length) return toast('That folder is empty.');
  if (!SD.hasMainFile(files, title)) { if (!await sdConfirm('This does not look like that game\'s save', [`The save file "${title.save}" is not in "${src.label}". Are you sure it is a ${title.name} save folder?`], 'Use it anyway')) return; }
  const dir = SD.backupDirFor(profile, title), ok = await sdConfirm('Put this save on the SD card as a backup?', [
    `${plural(files.length, 'file')} (${sdSize(files.reduce((a, f) => a + f.size, 0))}) from "${src.label}".`, `They are written as a new backup: ${dir}`, 'Nothing already on the card is replaced or deleted, and your Switch keeps its current save.',
    `Then, in pkHouse on the Switch, choose ${title.name} and press Y to see its backups, and restore this one. That replaces the Switch's save, so back it up first.`], 'Write to the card');
  if (!ok) return;
  await sdRun('Writing to the card...', async () => { const r = await SD.copyOut(fs, src.id, '', sdCard.id, dir, files); toast(`Wrote ${plural(r.files, 'file')} to the card.`); sdScan = await SD.scan(fs, sdCard.id); });
}

/* ---------- the screen ---------- */
function pkSdView(acct, ctx, D, banks) {
  const fs = sdFS();
  const head = h('div', { class: 'app-pad' }, h('div', { class: 'pd-head' }, h('div', {}, h('h2', { style: 'margin:0' }, 'Switch SD card'), h('small', { class: 'muted' }, 'Find your pkHouse banks and save backups, and move them to and from this device')), h('a', { class: 'btn', href: '#/apps/pokebank' }, 'All banks')),
    h('p', { class: 'muted' }, 'A Switch keeps its game saves inside the console, not on the SD card. What the card holds is what pkHouse (or JKSV or Checkpoint) copied onto it: your banks, and the save backups pkHouse makes whenever you open a game. Plug the card into this device (on a phone, with a card reader), then find it here.'));
  if (!fs) return [head, h('div', { class: 'app-pad' }, emptyState('This browser cannot open folders', 'Use the Windows, Linux or Android app, or a browser like Chrome or Edge. You can still bring files in with "Import game files" and "Import pkHouse bank (.bin)" on the Pokémon Bank page.'))];
  const find = h('div', { class: 'app-pad' }, h('div', { class: 'btnrow' },
    fs.kind !== 'android' ? h('button', { class: 'btn primary', type: 'button', disabled: !!sdBusy, onclick: sdFind }, 'Find my SD card') : null,
    h('button', { class: 'btn' + (fs.kind === 'android' ? ' primary' : ''), type: 'button', disabled: !!sdBusy, onclick: sdPickCard }, 'Choose the SD card folder')),
    sdFound && !sdFound.length && !sdCard ? h('p', { class: 'muted' }, 'No Switch SD card was found. Plug it in and try again, or choose its folder yourself.') : null,
    sdFound && sdFound.length > 1 ? h('div', { class: 'btnrow', style: 'margin-top:8px' }, sdFound.map(c => h('button', { class: 'btn', type: 'button', onclick: () => sdUse(c) }, 'Use ' + c.label))) : null,
    sdBusy ? h('p', { class: 'muted', role: 'status' }, sdBusy) : null, sdErr ? h('p', { class: 'err' }, sdErr) : null);
  if (!sdCard) return [head, find, h('div', { class: 'app-pad' }, h('p', { class: 'fine' }, 'Always keep a copy of your saves before changing them with any tool. This app asks before it writes, and never deletes anything on the card.'))];
  const r = sdScan;
  const row = (title, sub, actions) => h('div', { class: 'person-row' }, h('div', { class: 'who' }, h('b', {}, title), h('small', {}, sub)), actions);
  const sections = [];
  if (r) {
    sections.push(h('div', { class: 'app-pad' }, h('div', { class: 'pd-head' }, h('div', {}, h('b', {}, sdCard.label), h('small', { class: 'muted' }, r.hasSwitch ? ' · looks like a Switch card' : ' · no "switch" folder here. Is this the top folder of the card?')), h('button', { class: 'btn', type: 'button', disabled: !!sdBusy, onclick: () => sdUse(sdCard) }, 'Scan again'))));
    sections.push(h('div', { class: 'app-pad' }, h('h3', {}, `Banks (${r.banks.length})`), r.banks.length ? r.banks.map(b => row(b.name, `${pkFamilyName(b.family)} · ${sdSize(b.size)}${b.mtime ? ' · ' + sdDate(b.mtime) : ''}`, h('button', { class: 'btn', type: 'button', disabled: !!sdBusy, onclick: () => sdImportBank(acct, b) }, 'Import'))) : h('p', { class: 'muted' }, 'No pkHouse banks found (they live in switch/pkHouse/banks).')));
    const backups = [...r.backups, ...r.other];
    sections.push(h('div', { class: 'app-pad' }, h('h3', {}, `Save backups (${backups.length})`),
      h('p', { class: 'fine', style: 'padding:0 0 8px' }, 'Copy one to a folder to use it in an emulator (open the game\'s save folder in the emulator, then choose that folder here) or in PKHeX. The original stays on the card.'),
      backups.length ? backups.slice(0, 40).map(b => row(`${b.title.name}${b.profile ? ' · ' + b.profile : ''}`, `${b.source} · ${sdDate(b.date)} · ${b.zip ? 'zip, ' : plural(b.files.length, 'file') + ', '}${sdSize(b.size)}${b.checked ? ' · checked by pkHouse' : ''}${!b.hasSave ? ' · no save file found' : ''}`, h('button', { class: 'btn', type: 'button', disabled: !!sdBusy, onclick: () => sdCopyBackupOut(b) }, 'Copy to a folder'))) : h('p', { class: 'muted' }, 'No Pokémon save backups found. pkHouse makes one each time you open a game in it; JKSV and Checkpoint can too.'),
      backups.length > 40 ? h('p', { class: 'fine' }, `Showing the newest 40 of ${backups.length}.`) : null));
    if (r.pkFiles.length) sections.push(h('div', { class: 'app-pad' }, h('h3', {}, `Pokémon files (${r.pkFiles.length})`), h('p', { class: 'fine', style: 'padding:0 0 8px' }, 'Pokémon pkHouse exported (.pk8, .pk9 ...).'), h('button', { class: 'btn', type: 'button', disabled: !!sdBusy, onclick: () => sdImportPkFiles(acct, ctx, D, banks) }, 'Import them into a bank')));
    // the other direction
    const gameSel = h('select', { 'aria-label': 'Game' }, SD.TITLES.filter((t, i, a) => a.findIndex(x => x.path === t.path) === i).map(t => h('option', { value: t.id }, t.name)));
    const profSel = h('select', { 'aria-label': 'Profile' }, [...r.profiles.map(p => h('option', { value: p }, p)), h('option', { value: '' }, 'Another name...')]);
    const profIn = h('input', { placeholder: 'Profile name on the Switch', maxlength: 32, 'aria-label': 'Profile name', hidden: r.profiles.length > 0 });
    profSel.addEventListener('change', () => { profIn.hidden = profSel.value !== ''; });
    const bankSel = h('select', { 'aria-label': 'Bank to send' }, banks.map(b => h('option', { value: b.id }, `${b.name} (${pkFamilyName(b.family)})`)));
    sections.push(h('div', { class: 'app-pad' }, h('h3', {}, 'Put things on the card'),
      h('p', { class: 'fine', style: 'padding:0 0 8px' }, 'Put a bank back so pkHouse on the Switch can use it:'),
      banks.length ? h('div', { class: 'btnrow' }, bankSel, h('button', { class: 'btn', type: 'button', disabled: !!sdBusy, onclick: () => sdSendBank(acct, ctx, banks.find(b => b.id === bankSel.value)) }, 'Send this bank')) : h('p', { class: 'muted' }, 'You have no banks yet.'),
      h('p', { class: 'fine', style: 'padding:14px 0 8px' }, 'Or send a save folder (from an emulator or a computer) as a backup that pkHouse can restore on the Switch:'),
      aiField('Game', gameSel), aiField('Your profile on the Switch', profSel), profIn,
      h('button', { class: 'btn', type: 'button', disabled: !!sdBusy, onclick: () => sdSendSave(gameSel.value, profSel.value || profIn.value) }, 'Choose the save folder...')));
  }
  return [head, find, ...sections, h('p', { class: 'fine pd-credit' }, 'Always keep a copy of your saves before changing them with any tool. This app asks before it writes, and never deletes anything on the card.')];
}

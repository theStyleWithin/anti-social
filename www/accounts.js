'use strict';
/* Accounts: save a file, export, eject, import, guest mode, hidden accounts.
   Nothing here touches the network. The logic that checks a file lives in acctcore.js. */
const AX = AcctCore;

/* ---------- saving a file ----------
   In the Android app a download link does nothing, so the app hands the file to a small native helper that
   writes it into Downloads. Everywhere else a normal download is used. Returns {ok, where, sure}. */
async function saveFile(name, mime, text) {
  const saver = window.AntiSocialSaver;
  if (saver) {
    try {
      const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
      const opened = String(saver.open(name, mime));
      if (!opened.startsWith('ok')) return { ok: false, where: opened.replace(/^error:/, '') };
      for (let i = 0; i < bytes.length; i += 600 * 1024) {
        let bin = '';
        const part = bytes.subarray(i, i + 600 * 1024);
        for (let j = 0; j < part.length; j += 0x8000) bin += String.fromCharCode.apply(null, part.subarray(j, j + 0x8000));
        const w = String(saver.write(btoa(bin)));
        if (!w.startsWith('ok')) { saver.abort(); return { ok: false, where: w.replace(/^error:/, '') }; }
      }
      const done = String(saver.close());
      return done.startsWith('ok:') ? { ok: true, sure: true, where: done.slice(3) } : { ok: false, where: done.replace(/^error:/, '') };
    } catch (e) { return { ok: false, where: String(e && e.message || e) }; }
  }
  try {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return { ok: true, sure: false, where: 'your Downloads folder' };
  } catch (e) { return { ok: false, where: String(e && e.message || e) }; }
}

/* ---------- export ---------- */
async function accountExportFile(acct) {
  const posts = await loadPosts(acct, { media: true });
  if (posts.bad) throw new Error('unreadable');
  const prefs = {};
  for (const k of AX.prefKeys(acct.id)) { const v = ls(k); if (v) prefs[k] = v; }
  const text = JSON.stringify(AX.buildExport(acct, posts, prefs));
  return { name: AX.fileName(acct.handle), text, bytes: new TextEncoder().encode(text).length };
}
const sizeLabel = n => n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB';

async function exportData(acct) {
  if (acct.vault && !confirm('The export file is NOT encrypted. Anyone who gets it can read your posts. Export anyway?')) return;
  let f;
  try { f = await accountExportFile(acct); } catch { toast("Some posts can't be read, so nothing was exported."); return; }
  const r = await saveFile(f.name, 'application/json', f.text);
  toast(r.ok ? `Saved ${f.name} to ${r.where}. Now you have a copy of everything nobody saw.` : `Could not save the file: ${r.where}`);
}

/* ---------- eject: export everything, then take the account off this device ---------- */
function ejectAccount(acct) {
  const body = h('div', { class: 'mp' });
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Eject account')), body));
  const first = () => body.replaceChildren(
    h('p', { style: 'margin-top:0' }, `Eject takes @${acct.handle} off this device. First it saves everything (posts, photos, notes, apps and settings) to a file.`),
    h('p', {}, 'This is not a delete. Import the file on the create-account screen, on this device or another, and the account comes back. Without the file, it cannot.'),
    acct.vault ? h('p', { class: 'fine', style: 'padding:0 0 10px' }, 'The file is NOT encrypted, so keep it somewhere safe. When you import it you can set a passcode again. Your duress PIN is not saved.') : null,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: e => run(e.currentTarget) }, 'Save my data'), h('button', { class: 'btn', onclick: () => close() }, 'Cancel')));
  const run = async btn => {
    btn.disabled = true; btn.textContent = 'Saving...';
    let f;
    try { f = await accountExportFile(acct); } catch { toast("Some posts can't be read, so nothing was changed."); first(); return; }
    // check the file reads back before offering to remove anything
    if (!AX.parseExport(f.text).ok) { toast('The file did not check out, so nothing was changed.'); first(); return; }
    const r = await saveFile(f.name, 'application/json', f.text);
    if (!r.ok) { toast(`Could not save the file, so nothing was removed: ${r.where}`); first(); return; }
    second(f, r);
  };
  const second = (f, r) => {
    const sure = h('input', { type: 'checkbox', id: 'eject-ok' }), go_ = h('button', { class: 'btn danger', disabled: true }, 'Remove account from this device');
    sure.addEventListener('change', () => { go_.disabled = !sure.checked; });
    go_.addEventListener('click', async () => {
      go_.disabled = true; go_.textContent = 'Removing...';
      for (const p of await db.postsOf(acct.id)) await db.del('posts', p.id);
      await db.del('accounts', acct.id);
      for (const k of AX.prefKeys(acct.id)) ls(k, null);
      postCache.clear(); close(); toast(`@${acct.handle} was ejected. Import ${f.name} to bring it back.`);
      logout();
    });
    body.replaceChildren(
      h('p', { style: 'margin-top:0' }, h('b', {}, f.name), ` (${sizeLabel(f.bytes)}) ${r.sure ? 'was saved to' : 'should now be in'} ${r.where}.`),
      !r.sure ? h('p', { class: 'fine', style: 'padding:0 0 10px' }, 'Your browser or system did the download, so look in the Downloads folder to be sure it is there before you go on.') : null,
      h('label', { class: 'check' }, sure, ' I have the file and I know where it is.'),
      h('div', { class: 'btnrow', style: 'margin-top:12px' }, go_, h('button', { class: 'btn', onclick: () => saveFile(f.name, 'application/json', f.text).then(x => toast(x.ok ? 'Saved again.' : x.where)) }, 'Save again'), h('button', { class: 'btn', onclick: () => close() }, 'Keep the account')));
  };
  first();
}

/* ---------- import ---------- */
const passOk = async (raw, pass) => raw.vault ? !!(await openVault(raw, pass)) : raw.hash ? await sha256(raw.salt + pass) === raw.hash : true;

async function importAccountFiles(files) {
  const file = files[0];
  if (!file) return;
  if (file.size > 400 * 1024 * 1024) { toast('That file is too big.'); return; }
  let text;
  try { text = await file.text(); } catch { toast('Could not read that file.'); return; }
  const r = AX.parseExport(text);
  if (!r.ok) { toast(r.error); return; }
  const d = r.data, existing = await db.all('accounts');
  if (d.account.id && existing.some(a => a.id === d.account.id)) { modal(h('div', {}, h('div', { class: 'mp' }, h('p', { style: 'margin-top:0' }, `@${d.account.handle} is already on this device. To restore from this file, eject or delete that account first.`)))); return; }
  const have = new Set(await db.keys('posts'));
  if (d.posts.some(p => have.has(p.id))) { toast('Some of the items in that file already exist on this device, so it was not imported.'); return; }
  const taken = h_ => existing.some(a => a.handle.toLowerCase() === h_.toLowerCase());
  const handle = h('input', { value: taken(d.account.handle) ? d.account.handle.slice(0, 12) + '_2' : d.account.handle, maxlength: 15, autocapitalize: 'none', 'aria-label': 'Handle' });
  const p1 = h('input', { type: 'password', autocomplete: 'new-password', 'aria-label': 'Passcode' }), p2 = h('input', { type: 'password', autocomplete: 'new-password', 'aria-label': 'Passcode again' });
  const err = h('p', { class: 'err' }), go_ = h('button', { class: 'btn primary' }, 'Import');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Import account')),
    h('div', { class: 'mp' },
      h('p', { style: 'margin-top:0' }, h('b', {}, d.account.name || '@' + d.account.handle), ` · ${plural(d.posts.length, 'item')}`, d.exportedAt ? ` · saved ${d.exportedAt.slice(0, 10)}` : ''),
      taken(d.account.handle) ? h('p', { class: 'fine', style: 'padding:0 0 8px' }, `The handle @${d.account.handle} is already used here, so pick another.`) : null,
      fieldEl('Handle', handle),
      fieldEl(`Passcode, optional (at least ${MIN_PASSCODE} characters)`, p1), fieldEl('Type it again', p2),
      h('p', { class: 'fine', style: 'padding:0 0 8px' }, 'Leave the passcode blank for none. Set one and everything is encrypted with it, with no recovery if you forget it.'), err, go_)));
  go_.addEventListener('click', async () => {
    err.textContent = '';
    const hd = handle.value.trim().replace(/^@/, '');
    if (!AX.validHandle(hd)) { err.textContent = 'Handle: 1-15 letters, numbers or underscores.'; return; }
    if (taken(hd)) { err.textContent = 'That handle is taken. By you. Earlier.'; return; }
    const pass = p1.value;
    if (pass || p2.value) {
      if (pass.length < MIN_PASSCODE) { err.textContent = `Passcode: at least ${MIN_PASSCODE} characters, or leave both boxes empty for none.`; return; }
      if (pass !== p2.value) { err.textContent = "Those passcodes don't match."; return; }
    }
    go_.disabled = true;
    const id = d.account.id || uid(), saved = [];
    const undo = async () => { for (const k of saved) { try { await db.del('posts', k); } catch { /* already gone */ } } };
    try {
      let key = null, meta = null;
      if (pass) { go_.textContent = 'Locking the vault...'; ({ key, meta } = await makeVault(id, pass)); vault.id = id; vault.key = key; }
      const stub = { id, vault: meta };
      let n = 0;
      for (const p of d.posts) {
        await savePost(stub, { ...p, accountId: id }); saved.push(p.id);
        if (++n % 25 === 0) go_.textContent = `Importing ${n} of ${d.posts.length}...`;
      }
      const base = { id, handle: hd, createdAt: d.account.createdAt };
      const profile = { name: d.account.name, bio: d.account.bio, color: d.account.color || colorFor(hd), avatarImg: d.account.avatarImg, bannerImg: d.account.bannerImg };
      await db.put('accounts', pass
        ? { ...base, ...(d.account.guest ? { guest: true } : {}), vault: meta, profile: await seal(key, profile, 'profile:' + id) }
        : { ...base, ...profile, salt: null, hash: null, ...(d.account.guest ? { guest: true } : {}) });
      for (const [k, v] of Object.entries(AX.remapPrefs(d.prefs, d.account.id, id))) ls(k, v);
    } catch (e) {
      console.error(e); await undo(); lockVault();
      err.textContent = isQuotaError(e) ? 'Not enough space on this device for that account.' : 'Something went wrong, so nothing was imported.';
      go_.disabled = false; go_.textContent = 'Import'; return;
    }
    close(); toast(`Welcome back, @${hd}.`);
    session = id; ls('as.session', id); authMode = { mode: 'pick' }; go('/');
  });
  setTimeout(() => (taken(d.account.handle) ? handle : p1).focus(), 0);
}
// A button that opens the file picker.
function importAccountButton() {
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, 'aria-label': 'Choose an Anti-Social export file' });
  file.addEventListener('change', () => { const fs_ = [...file.files]; file.value = ''; importAccountFiles(fs_); });
  return [h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'Import account'), file];
}

/* ---------- guest mode: walk straight in, no handle and no passcode ---------- */
async function startGuest() {
  const all = await db.all('accounts');
  const handle = AX.guestHandle(all.map(a => a.handle)), id = uid();
  await db.put('accounts', { id, name: 'Guest', handle, bio: '', color: colorFor(handle), createdAt: Date.now(), salt: null, hash: null, guest: true });
  session = id; ls('as.session', id); authMode = { mode: 'pick' };
  toast('Guest mode: no handle, no passcode, nothing encrypted. Claim it as a real account any time in Settings.');
  go('/');
}
function claimGuest(acct) {
  const name = h('input', { value: '', maxlength: 50, 'aria-label': 'Name' }), handle = h('input', { maxlength: 15, autocapitalize: 'none', 'aria-label': 'Handle' });
  const p1 = h('input', { type: 'password', autocomplete: 'new-password', 'aria-label': 'Passcode' }), p2 = h('input', { type: 'password', autocomplete: 'new-password', 'aria-label': 'Passcode again' });
  const err = h('p', { class: 'err' }), go_ = h('button', { class: 'btn primary' }, 'Claim it');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Make this a real account')),
    h('div', { class: 'mp' }, h('p', { style: 'margin-top:0' }, 'Everything you have posted stays. You are just giving the account a name and handle, and a passcode if you want one.'),
      fieldEl('Name', name), fieldEl('Handle', handle), fieldEl(`Passcode, optional (at least ${MIN_PASSCODE} characters)`, p1), fieldEl('Type it again', p2), err, go_)));
  go_.addEventListener('click', async () => {
    err.textContent = '';
    const hd = handle.value.trim().replace(/^@/, '');
    if (!name.value.trim()) { err.textContent = 'Give it a name.'; return; }
    if (!AX.validHandle(hd)) { err.textContent = 'Handle: 1-15 letters, numbers or underscores.'; return; }
    if ((await db.all('accounts')).some(a => a.id !== acct.id && a.handle.toLowerCase() === hd.toLowerCase())) { err.textContent = 'That handle is taken. By you. Earlier.'; return; }
    if (p1.value || p2.value) {
      if (p1.value.length < MIN_PASSCODE) { err.textContent = `Passcode: at least ${MIN_PASSCODE} characters, or leave both boxes empty for none.`; return; }
      if (p1.value !== p2.value) { err.textContent = "Those passcodes don't match."; return; }
    }
    go_.disabled = true; go_.textContent = 'Saving...';
    try {
      const raw = await db.get('accounts', acct.id);
      const { guest: _g, ...rest } = raw;
      await db.put('accounts', { ...rest, handle: hd, ...(raw.vault ? {} : { name: name.value.trim() }) });
      if (raw.vault) await updateAccount(acct.id, { name: name.value.trim() });
      if (p1.value && !raw.vault) await rekeyAccount(await loadAccount(acct.id), p1.value);
      close(); toast('Done. This is a real account now.'); render(true);
    } catch (e) { console.error(e); err.textContent = 'Something went wrong.'; go_.disabled = false; go_.textContent = 'Claim it'; }
  });
  setTimeout(() => name.focus(), 0);
}

/* ---------- hidden accounts ---------- */
async function hideAccount(acct) {
  if (!confirm(`Hide @${acct.handle}? It disappears from the account list on this device. Find it again in Settings, under Hidden accounts, in any other account.`)) return;
  const raw = await db.get('accounts', acct.id);
  await db.put('accounts', { ...raw, hidden: true });
  toast('Hidden. You are being switched out of it.');
  logout();
}
function unhideAccount(raw, done) {
  const finish = async () => { const cur = await db.get('accounts', raw.id); const { hidden: _h, ...rest } = cur; await db.put('accounts', rest); toast(`@${raw.handle} is back in the account list.`); done(); };
  if (!raw.vault && !raw.hash) return void finish();
  const pass = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Passcode' }), err = h('p', { class: 'err' }), go_ = h('button', { class: 'btn primary' }, 'Unhide');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, `Unhide @${raw.handle}`)),
    h('div', { class: 'mp' }, h('p', { style: 'margin-top:0' }, 'This account has a passcode, so enter it to show the account again.'), fieldEl('Passcode', pass), err, go_)));
  go_.addEventListener('click', async () => {
    go_.disabled = true; err.textContent = '';
    let ok = false; try { ok = await passOk(raw, pass.value); } catch { ok = false; }
    if (!ok) { err.textContent = 'Wrong passcode.'; go_.disabled = false; pass.select(); return; }
    close(); finish();
  });
  setTimeout(() => pass.focus(), 0);
}
// The Settings bits that need the list of accounts: hide this one, and the hidden ones.
function accountListSection(acct) {
  const box = h('div', {});
  db.all('accounts').then(all => {
    const list = all.sort((a, b) => a.createdAt - b.createdAt), hid = AX.hidden(list).filter(a => a.id !== acct.id);
    box.replaceChildren(
      acct.hidden ? h('section', {}, h('h3', {}, 'This account is hidden'), h('p', {}, 'It is not in the account list. Unhide it to put it back.'), h('button', { class: 'btn', onclick: () => unhideAccount(all.find(a => a.id === acct.id), () => render(true)) }, 'Unhide this account'))
        : AX.canHide(list, acct) ? h('section', {}, h('h3', {}, 'Hide this account'), h('p', {}, 'Keep it off the account list on this device. It is still here, and you can unhide it below, from any other account.'), h('button', { class: 'btn', onclick: () => hideAccount(acct) }, 'Hide this account')) : null,
      hid.length ? h('section', {}, h('h3', {}, 'Hidden accounts'), h('p', {}, 'These are not shown when you pick or switch accounts.'),
        h('div', { class: 'hidden-list' }, hid.map(a => h('div', { class: 'hidden-row' }, avatar(a, 'sm'), h('div', { class: 'who' }, h('b', {}, '@' + a.handle), (a.vault || a.hash) ? h('div', { class: 'muted' }, 'Passcode needed to unhide') : null), h('button', { class: 'btn', onclick: () => unhideAccount(a, () => render(true)) }, 'Unhide'))))) : null);
  }).catch(() => {});
  return box;
}

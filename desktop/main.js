const { app, BrowserWindow, Menu, shell, ipcMain, dialog, utilityProcess, net } = require('electron');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

const isWeb = url => /^https?:/i.test(url);

/* ---------- the AI engine (its own process; see ai-engine.mjs) ---------- */
let engine = null, seq = 0;
const waiting = new Map();           // request id -> {resolve, reject}
const tokenSinks = new Map();        // generate id -> webContents
function engineProc() {
  if (engine) return engine;
  engine = utilityProcess.fork(path.join(__dirname, 'ai-engine.mjs'), [], { serviceName: 'Anti-Social AI', stdio: 'ignore' });
  engine.on('message', m => {
    if (m.t === 'token') { const wc = tokenSinks.get(m.id); if (wc && !wc.isDestroyed()) wc.send('ai:token', m.id, m.text); }
    else if (m.t === 'result') { const w = waiting.get(m.id); if (w) { waiting.delete(m.id); m.ok ? w.resolve(m.value) : w.reject(new Error(m.error)); } }
  });
  engine.on('exit', () => {
    engine = null;
    for (const [, w] of waiting) w.reject(new Error('The AI engine stopped. Try again.'));
    waiting.clear();
  });
  return engine;
}
const ask = msg => new Promise((resolve, reject) => { const id = ++seq; waiting.set(id, { resolve, reject }); engineProc().postMessage({ ...msg, id }); });
const fromApp = e => { try { return new URL(e.senderFrame.url).protocol === 'file:'; } catch { return false; } };
const guard = fn => async (e, ...a) => { if (!fromApp(e)) throw new Error('Not allowed.'); return fn(e, ...a); };
const isGguf = p => { try { const fd = fs.openSync(p, 'r'), b = Buffer.alloc(4); fs.readSync(fd, b, 0, 4, 0); fs.closeSync(fd); return b.toString('latin1') === 'GGUF'; } catch { return false; } };

ipcMain.handle('ai:pick', guard(async e => {
  const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), { title: 'Choose a model file', properties: ['openFile'], filters: [{ name: 'GGUF model files', extensions: ['gguf'] }, { name: 'All files', extensions: ['*'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = r.filePaths[0];
  if (!isGguf(p)) throw new Error('That is not a GGUF model file.');
  return { path: p, name: path.basename(p), size: fs.statSync(p).size };
}));
ipcMain.handle('ai:status', guard(async () => engine ? ask({ t: 'status' }) : { loaded: false }));
ipcMain.handle('ai:info', guard(async () => ask({ t: 'info' })));
ipcMain.handle('ai:load', guard(async (_e, cfg) => {
  if (!isGguf(cfg.path)) throw new Error('That model file is missing or is not a GGUF file.');
  return ask({ t: 'load', path: cfg.path, ctx: cfg.ctx, gpu: cfg.gpu });
}));
ipcMain.handle('ai:unload', guard(async () => engine ? ask({ t: 'unload' }) : { loaded: false }));
ipcMain.handle('ai:cancel', guard(async (_e, id) => { if (engine) await ask({ t: 'cancel', target: id }); }));
ipcMain.handle('ai:generate', guard(async (e, req) => {
  tokenSinks.set(req.id, e.sender);
  try { return await ask({ t: 'generate', ...req }); } finally { tokenSinks.delete(req.id); }
}));


/* ---------- folders the person chose (the Switch SD card, an emulator's save folder) ---------- */
// The page never gets a path. It gets an id for a folder somebody picked (or a drive they clicked), and every file
// call is checked to stay inside that folder.
const folders = new Map();           // id -> absolute folder
const MAX_FILE = 64 * 1024 * 1024;
const addFolder = dir => { const id = crypto.randomBytes(8).toString('hex'); folders.set(id, fs.realpathSync(dir)); return id; };
function inside(id, rel, mustExist) {
  const root = folders.get(id);
  if (!root) throw new Error('That folder is not open any more. Choose it again.');
  if (typeof rel !== 'string' || rel.startsWith('/') || rel.startsWith('\\') || rel.includes('\0') || /(^|[\\/])\.\.([\\/]|$)/.test(rel)) throw new Error('That path is not allowed.');
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error('That path is not allowed.');
  // follow links: the nearest part that exists must still be inside the folder
  let probe = full; while (!fs.existsSync(probe) && probe !== root) probe = path.dirname(probe);
  const real = fs.realpathSync(probe);
  if (real !== root && !real.startsWith(root + path.sep)) throw new Error('That path leads outside the folder.');
  if (mustExist && !fs.existsSync(full)) throw new Error('Not found.');
  return full;
}
// removable drives that look like a Switch SD card (they have a "switch" or "Nintendo" folder at the top)
function cardCandidates() {
  const roots = [];
  if (process.platform === 'win32') for (const L of 'DEFGHIJKLMNOPQRSTUVWXYZ') roots.push(L + ':\\');
  else {
    const user = os.userInfo().username, parents = process.platform === 'darwin' ? ['/Volumes'] : [`/run/media/${user}`, `/media/${user}`, '/media', '/mnt'];
    for (const p of parents) { try { for (const n of fs.readdirSync(p)) roots.push(path.join(p, n)); } catch { /* not there */ } }
  }
  const out = [];
  for (const r of roots) {
    try { if (fs.statSync(r).isDirectory() && ['switch', 'Nintendo'].some(n => { try { return fs.statSync(path.join(r, n)).isDirectory(); } catch { return false; } })) out.push(r); } catch { /* not a drive */ }
  }
  return [...new Set(out)];
}
ipcMain.handle('fs:detect', guard(async () => cardCandidates().map(dir => ({ id: addFolder(dir), label: dir }))));
ipcMain.handle('fs:pick', guard(async (e, title) => {
  const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), { title: String(title || 'Choose a folder').slice(0, 100), properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  return { id: addFolder(r.filePaths[0]), label: r.filePaths[0] };
}));
ipcMain.handle('fs:list', guard(async (_e, id, rel) => {
  const dir = inside(id, rel || '.', true), out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    try { const st = fs.statSync(path.join(dir, d.name)); out.push({ name: d.name, dir: st.isDirectory(), size: st.isDirectory() ? 0 : st.size, mtime: st.mtimeMs }); } catch { /* vanished or unreadable */ }
  }
  return out;
}));
ipcMain.handle('fs:read', guard(async (_e, id, rel) => {
  const full = inside(id, rel, true), st = fs.statSync(full);
  if (!st.isFile() || st.size > MAX_FILE) throw new Error('That file is too big to open.');
  return new Uint8Array(fs.readFileSync(full));
}));
ipcMain.handle('fs:write', guard(async (_e, id, rel, bytes) => {
  const full = inside(id, rel, false);
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_FILE) throw new Error('That file is too big to write.');
  fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, bytes);
  if (fs.statSync(full).size !== bytes.length) throw new Error('The file was not written completely. Is the card full?');
  return true;
}));
ipcMain.handle('fs:exists', guard(async (_e, id, rel) => { try { return fs.existsSync(inside(id, rel, false)); } catch { return false; } }));

/* ---------- RetroAchievements (optional, only when the person asks) ---------- */
// The page can ask for one of a few read-only API calls. The address, the call names and the shape of every value are
// fixed here, so the page can not use this to reach anything else.
const RA_BASE = (!app.isPackaged && process.env.ANTISOCIAL_RA_BASE) || 'https://retroachievements.org/API/';
const RA_CALLS = { API_GetGameInfoAndUserProgress: ['z', 'y', 'u', 'g', 'a'], API_GetUserCompletedGames: ['z', 'y', 'u'], API_GetUserProfile: ['z', 'y', 'u'] };
const RA_VALUE = { z: /^[A-Za-z0-9_.-]{1,40}$/, u: /^[A-Za-z0-9_.-]{1,40}$/, y: /^[A-Za-z0-9]{8,64}$/, g: /^\d{1,9}$/, a: /^[01]$/ };
ipcMain.handle('ra:get', guard(async (_e, call, params) => {
  if (!RA_CALLS[call]) throw new Error('That call is not allowed.');
  const url = new URL(RA_BASE + call + '.php');
  for (const [k, v] of Object.entries(params || {})) {
    if (!RA_CALLS[call].includes(k) || !RA_VALUE[k].test(String(v))) throw new Error('A value in that request is not allowed.');
    url.searchParams.set(k, String(v));
  }
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await net.fetch(url.toString(), { signal: ctl.signal, headers: { 'User-Agent': 'Anti-Social', Accept: 'application/json' } });
    const text = await res.text();
    if (text.length > 12 * 1024 * 1024) throw new Error('The reply was too big.');
    return { status: res.status, text };
  } catch (e) { if (e && e.name === 'AbortError') throw new Error('RetroAchievements took too long to answer.'); throw new Error('Could not reach RetroAchievements. Check your internet connection.'); }
  finally { clearTimeout(timer); }
}));

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 360,
    backgroundColor: '#000000',
    title: 'Anti-Social',
    icon: path.join(__dirname, 'www', 'icons', 'icon-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') },
  });

  // Links in posts open in the system browser; the app itself never leaves its own files.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWeb(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file://')) return;
    e.preventDefault();
    if (isWeb(url)) shell.openExternal(url);
  });

  win.loadFile(path.join(__dirname, 'www', 'index.html'));
}

app.whenReady().then(() => {
  // The only permission the app ever uses is the microphone, for the Sound Meter. Nothing else is granted, and it is audio only.
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => cb(permission === 'media' && (details.mediaTypes || []).every(t => t === 'audio') && String(details.requestingUrl || '').startsWith('file://')));
  session.defaultSession.setPermissionCheckHandler((wc, permission) => permission === 'media');
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('before-quit', () => { if (engine) engine.kill(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

const { app, BrowserWindow, Menu, shell, ipcMain, dialog, utilityProcess } = require('electron');
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
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('before-quit', () => { if (engine) engine.kill(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

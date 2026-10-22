const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const isWeb = url => /^https?:/i.test(url);

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 360,
    backgroundColor: '#000000',
    title: 'Anti-Social',
    icon: path.join(__dirname, 'www', 'icons', 'icon-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
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

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

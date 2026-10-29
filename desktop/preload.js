// The one door between the app's page and the AI engine. The page can ask for a model file, load it, and ask for
// replies. It cannot reach anything else of the computer.
const { contextBridge, ipcRenderer } = require('electron');
const listeners = new Map();
ipcRenderer.on('ai:token', (_e, id, text) => { const f = listeners.get(id); if (f) f(text); });
contextBridge.exposeInMainWorld('AntiSocialAI', {
  kind: 'desktop',
  status: () => ipcRenderer.invoke('ai:status'),
  systemInfo: () => ipcRenderer.invoke('ai:info'),
  pickModel: () => ipcRenderer.invoke('ai:pick'),
  load: cfg => ipcRenderer.invoke('ai:load', { path: String(cfg.path), ctx: Number(cfg.ctx), gpu: cfg.gpu === 'cpu' ? 'cpu' : 'auto' }),
  unload: () => ipcRenderer.invoke('ai:unload'),
  cancel: id => ipcRenderer.invoke('ai:cancel', String(id)),
  async generate(req, { onToken } = {}) {
    const id = String(req.id);
    if (onToken) listeners.set(id, onToken);
    try {
      return await ipcRenderer.invoke('ai:generate', { id, system: String(req.system || ''), prompt: String(req.prompt || ''), maxTokens: Number(req.maxTokens) || 200, temperature: Number(req.temperature), stop: Array.isArray(req.stop) ? req.stop.map(String).slice(0, 12) : [] });
    } finally { listeners.delete(id); }
  },
});

// Folders the person picks (the Switch SD card, an emulator's save folder): ids, never paths.
contextBridge.exposeInMainWorld('AntiSocialFS', {
  kind: 'desktop',
  detect: () => ipcRenderer.invoke('fs:detect'),
  pick: title => ipcRenderer.invoke('fs:pick', String(title || '')),
  list: (id, rel) => ipcRenderer.invoke('fs:list', String(id), String(rel || '')),
  read: (id, rel) => ipcRenderer.invoke('fs:read', String(id), String(rel)),
  write: (id, rel, bytes) => ipcRenderer.invoke('fs:write', String(id), String(rel), bytes),
  exists: (id, rel) => ipcRenderer.invoke('fs:exists', String(id), String(rel)),
});

// Optional lookups on retroachievements.org (a few fixed, read-only calls), only when the person asks for one.
contextBridge.exposeInMainWorld('AntiSocialRA', {
  kind: 'desktop',
  get: (call, params) => ipcRenderer.invoke('ra:get', String(call), Object.fromEntries(Object.entries(params || {}).map(([k, v]) => [String(k), String(v)]))),
});

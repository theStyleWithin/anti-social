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

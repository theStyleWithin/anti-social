'use strict';
/* Folder access for the Switch SD card feature, seen from the page as window.AntiSocialFS:
   {kind, detect(), pick(title), list(id, rel), read(id, rel), write(id, rel, bytes), exists(id, rel)}.
   The desktop apps provide it themselves. Here it is built from the Android app's native side, or, in a browser that
   has it, from the File System Access API. Folders are only ever reached after the person picks them. */
(() => {
  if (window.AntiSocialFS) return;
  const n = window.AntiSocialFSNative;
  if (n) {
    const pend = new Map(); let seq = 0;
    window.__asfs = { done(rid, ok, payload) { const p = pend.get(rid); if (!p) return; pend.delete(rid); if (!ok) return p.rej(new Error(payload || 'The folder could not be used.')); try { p.res(p.map ? p.map(payload) : payload); } catch (e) { p.rej(e); } } };
    const call = (fn, map, ...args) => new Promise((res, rej) => { const rid = 'f' + (++seq); pend.set(rid, { res, rej, map }); try { n[fn](rid, ...args); } catch (e) { pend.delete(rid); rej(e); } });
    const json = s => s ? JSON.parse(s) : null;
    const unb64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
    const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    window.AntiSocialFS = {
      kind: 'android',
      detect: () => call('detect', json),
      pick: () => call('pick', json),
      list: (id, rel) => call('list', json, String(id), String(rel || '')),
      read: (id, rel) => call('read', unb64, String(id), String(rel)),
      write: (id, rel, bytes) => call('write', () => true, String(id), String(rel), b64(bytes)),
      exists: (id, rel) => call('exists', s => s === 'true', String(id), String(rel)),
    };
    return;
  }
  if (typeof window.showDirectoryPicker === 'function') {
    const dirs = new Map(); let seq = 0;
    const walkTo = async (root, rel, create) => { let d = root; for (const seg of String(rel || '').split('/').filter(Boolean)) { if (seg === '..' || seg === '.') throw new Error('That path is not allowed.'); d = await d.getDirectoryHandle(seg, { create }); } return d; };
    const split = rel => { const p = String(rel).split('/').filter(Boolean); if (!p.length || p.includes('..') || p.includes('.')) throw new Error('That path is not allowed.'); return [p.slice(0, -1).join('/'), p[p.length - 1]]; };
    const root = id => { const d = dirs.get(id); if (!d) throw new Error('That folder is not open any more. Choose it again.'); return d; };
    window.AntiSocialFS = {
      kind: 'browser',
      detect: async () => [],
      async pick(title) { try { const h = await window.showDirectoryPicker({ mode: 'readwrite' }); const id = 'b' + (++seq); dirs.set(id, h); return { id, label: h.name }; } catch (e) { if (e && e.name === 'AbortError') return null; throw e; } },
      async list(id, rel) { const d = await walkTo(root(id), rel, false), out = []; for await (const [name, h] of d.entries()) { let size = 0, mtime = 0; if (h.kind === 'file') { const f = await h.getFile(); size = f.size; mtime = f.lastModified; } out.push({ name, dir: h.kind === 'directory', size, mtime }); } return out; },
      async read(id, rel) { const [dir, name] = split(rel), f = await (await (await walkTo(root(id), dir, false)).getFileHandle(name)).getFile(); if (f.size > 64 * 1024 * 1024) throw new Error('That file is too big to open.'); return new Uint8Array(await f.arrayBuffer()); },
      async write(id, rel, bytes) { const [dir, name] = split(rel), fh = await (await walkTo(root(id), dir, true)).getFileHandle(name, { create: true }), w = await fh.createWritable(); await w.write(bytes); await w.close(); return true; },
      async exists(id, rel) { try { const [dir, name] = split(rel); const d = await walkTo(root(id), dir, false); try { await d.getFileHandle(name); return true; } catch { try { await d.getDirectoryHandle(name); return true; } catch { return false; } } } catch { return false; } },
    };
  }
})();

'use strict';
/* The Android app's AI engine, seen from the page: the same window.AntiSocialAI the desktop app provides.
   The native side answers asynchronously, so each call waits for window.__asai.done(). */
(() => {
  const n = window.AntiSocialAINative;
  if (!n || window.AntiSocialAI) return;
  const pend = new Map(), sinks = new Map();
  let seq = 0;
  window.__asai = {
    done(rid, ok, payload) {
      const p = pend.get(rid); if (!p) return; pend.delete(rid);
      if (!ok) return p.rej(new Error(payload || 'The AI engine failed.'));
      try { p.res(payload ? JSON.parse(payload) : null); } catch (e) { p.rej(e); }
    },
    tok(rid, text) { const f = sinks.get(rid); if (f) f(text); },
  };
  const call = (fn, ...args) => new Promise((res, rej) => {
    const rid = 'a' + (++seq);
    pend.set(rid, { res, rej });
    try { n[fn](rid, ...args); } catch (e) { pend.delete(rid); rej(e); }
  });
  window.AntiSocialAI = {
    kind: 'android',
    status: () => call('status'),
    systemInfo: () => call('info'),
    pickModel: () => call('pick'),
    load: cfg => call('load', JSON.stringify({ path: String(cfg.path), ctx: Number(cfg.ctx) || 2048, gpu: cfg.gpu === 'cpu' ? 'cpu' : 'auto' })),
    unload: () => call('unload'),
    cancel: () => { try { n.cancel(); } catch { /* engine gone */ } },
    generate(req, { onToken } = {}) {
      const rid = 'a' + (++seq);
      return new Promise((res, rej) => {
        pend.set(rid, { res, rej });
        if (onToken) sinks.set(rid, onToken);
        try { n.generate(rid, JSON.stringify({ system: String(req.system || ''), prompt: String(req.prompt || ''), maxTokens: Number(req.maxTokens) || 200, temperature: Number(req.temperature), stop: Array.isArray(req.stop) ? req.stop.map(String).slice(0, 12) : [] })); }
        catch (e) { pend.delete(rid); rej(e); }
      }).finally(() => sinks.delete(rid));
    },
  };
})();

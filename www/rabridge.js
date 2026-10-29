'use strict';
/* RetroAchievements lookups, seen from the page as window.AntiSocialRA.get(call, params) -> {status, text}.
   The desktop apps provide it themselves; the Android app provides a native side that this wraps; a plain browser
   falls back to asking retroachievements.org directly. It is only ever used when the person asks for a lookup. */
(() => {
  if (window.AntiSocialRA) return;
  const n = window.AntiSocialRANative;
  if (n) {
    const pend = new Map(); let seq = 0;
    window.__asra = { done(rid, ok, payload) { const p = pend.get(rid); if (!p) return; pend.delete(rid); if (!ok) return p.rej(new Error(payload || 'The lookup failed.')); try { p.res(JSON.parse(payload)); } catch (e) { p.rej(e); } } };
    window.AntiSocialRA = { kind: 'android', get: (call, params) => new Promise((res, rej) => { const rid = 'r' + (++seq); pend.set(rid, { res, rej }); try { n.get(rid, String(call), JSON.stringify(params || {})); } catch (e) { pend.delete(rid); rej(e); } }) };
    return;
  }
  window.AntiSocialRA = {
    kind: 'browser',
    async get(call, params) {
      const url = new URL('https://retroachievements.org/API/' + call + '.php');
      for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, String(v));
      try { const res = await fetch(url.toString(), { credentials: 'omit', referrerPolicy: 'no-referrer' }); return { status: res.status, text: await res.text() }; }
      catch { throw new Error('Could not reach RetroAchievements. This browser may block it; the desktop and Android apps do not.'); }
    },
  };
})();

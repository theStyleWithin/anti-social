'use strict';
/* Optional online provider for AI members: TokenReply, an OpenAI-style service. Off unless you switch it on in
   Settings, AI members, and it only ever talks to the one address below. When it is on, the text of the chat, the
   character's description and your API key leave this device for that service. The model files on this device
   never do. */
const AIOnline = (() => {
  const BASE = 'https://api.tokenreply.com/v1';
  const jobs = new Map();
  const cfg = () => { try { const c = JSON.parse(localStorage.getItem('as.ai') || '{}'); return c && c.online || {}; } catch { return {}; } };
  const fail = (code, message) => Object.assign(new Error(message), { code });
  const why = async res => {
    let detail = ''; try { const j = await res.json(); detail = (j.error && (j.error.message || j.error)) || j.message || ''; } catch { /* no body */ }
    detail = typeof detail === 'string' ? detail.slice(0, 160) : '';
    if (res.status === 401 || res.status === 403) return fail('online-key', 'TokenReply did not accept the API key. Check it in Settings, AI members.');
    if (res.status === 429) return fail('online-limit', 'TokenReply says you are going too fast or are out of free messages. Try again in a bit.');
    if (res.status === 404) return fail('online-model', 'TokenReply does not know that model any more. Pick another one in Settings, AI members.');
    return fail('online-http', `TokenReply answered with an error (${res.status})${detail ? ': ' + detail : ''}.`);
  };
  const reach = e => (e && e.name === 'AbortError') ? e : fail('online-net', 'Could not reach TokenReply. Check your internet connection.');
  // Which models can this key use? [{id, free}] sorted with free ones first.
  const models = async key => {
    let res; try { res = await fetch(BASE + '/models', { headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer' }); } catch (e) { throw reach(e); }
    if (!res.ok) throw await why(res);
    const j = await res.json(), list = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : [];
    const zero = v => v === 0 || v === '0' || v === '0.0' || v === '0.00';
    return list.filter(m => m && typeof m.id === 'string').map(m => ({ id: m.id, name: m.name || m.id, free: !!(m.free || m.is_free || /:free$|-free$/i.test(m.id) || (m.pricing && (zero(m.pricing.prompt) && zero(m.pricing.completion) || zero(m.pricing.input) && zero(m.pricing.output)))) }))
      .sort((a, b) => (b.free - a.free) || a.id.localeCompare(b.id));
  };
  const generate = async (req, { onToken } = {}) => {
    const c = cfg(); if (!c.key || !c.model) throw fail('no-model', 'Add your TokenReply API key and choose a model first: Settings, AI members.');
    const ctl = new AbortController(); jobs.set(req.id, ctl);
    try {
      let res;
      try {
        res = await fetch(BASE + '/chat/completions', { method: 'POST', signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.key },
          body: JSON.stringify({ model: c.model, stream: true, max_tokens: req.maxTokens, temperature: req.temperature, ...(req.stop && req.stop.length ? { stop: req.stop.slice(0, 4) } : {}), messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }] }) });
      } catch (e) { throw reach(e); }
      if (!res.ok) throw await why(res);
      const ct = res.headers.get('content-type') || '';
      if (!res.body || !/event-stream/.test(ct)) {                                  // a service that ignores streaming
        const j = await res.json(), t = j.choices && j.choices[0] && (j.choices[0].message && j.choices[0].message.content || j.choices[0].text) || '';
        if (t && onToken) onToken(t); return t;
      }
      const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '', out = '';
      for (;;) {
        let r; try { r = await rd.read(); } catch (e) { if (ctl.signal.aborted) break; throw reach(e); }
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim(); if (d === '[DONE]') return out;
          try { const j = JSON.parse(d), t = j.choices && j.choices[0] && (j.choices[0].delta && j.choices[0].delta.content || j.choices[0].text) || ''; if (t) { out += t; onToken && onToken(t); } } catch { /* a partial line */ }
        }
      }
      return out;
    } catch (e) { if (e && e.name === 'AbortError') return ''; throw e; } finally { jobs.delete(req.id); }
  };
  return {
    kind: 'online', BASE, models, generate,
    async status() { const c = cfg(); return { loaded: !!(c.key && c.model), path: 'online:' + (c.model || ''), backend: 'TokenReply' }; },
    async load() {}, async unload() {}, async systemInfo() { return null; },
    cancel(id) { const c = jobs.get(id); if (c) c.abort(); },
  };
})();

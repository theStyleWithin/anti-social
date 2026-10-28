'use strict';
/* AI members: the pure logic. Names and @mentions, where a bot may speak, who answers next, the prompt a model is
   given, cleaning what comes back, the away-mode scheduler, and character cards (JSON and PNG). No page, no network.
   Bots only ever run on this device. */
const AICore = (() => {
  /* ---------- names and @mentions ---------- */
  const MAX_NAME = 32;
  const WORD = /[\p{L}\p{N}_]/u;
  const isWord = c => !!c && WORD.test(c);
  // letters, numbers, spaces, underscore, dash, apostrophe; no leading or trailing space; spaces collapsed
  const cleanName = raw => String(raw == null ? '' : raw).replace(/[^\p{L}\p{N} _'’-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
  const sameName = (a, b) => cleanName(a).toLowerCase() === cleanName(b).toLowerCase();
  const nameError = (raw, bots, selfId) => {
    const n = cleanName(raw);
    if (!n) return 'Give them a name (letters, numbers, spaces, dashes).';
    if (!/[\p{L}\p{N}]/u.test(n)) return 'A name needs at least one letter or number.';
    if (bots.some(b => b.id !== selfId && sameName(b.name, n))) return `There is already a bot called ${n}.`;
    return '';
  };
  // "@Nova hi", "hey @Captain Nova!" -> the bots named exactly that (any capitals). A misspelled name matches nothing.
  const findMentions = (text, bots) => {
    text = String(text || '');
    const sorted = bots.filter(b => b && b.name).sort((a, b) => b.name.length - a.name.length), lower = text.toLowerCase(), out = [], seen = new Set();
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== '@' || isWord(text[i - 1])) continue;                  // "me@nova.com" is not a mention
      for (const b of sorted) {
        const n = b.name.toLowerCase();
        if (lower.startsWith(n, i + 1) && !isWord(text[i + 1 + n.length])) { if (!seen.has(b.id)) { seen.add(b.id); out.push({ bot: b, index: i }); } i += n.length; break; }
      }
    }
    return out;
  };
  // While typing "@No" -> {start, query:'No'}; used to offer the exact names so nobody has to spell them.
  const mentionQuery = (text, caret) => {
    text = String(text || ''); caret = Math.min(caret == null ? text.length : caret, text.length);
    for (let j = caret - 1; j >= 0 && caret - j <= MAX_NAME + 2; j--) {
      const c = text[j];
      if (c === '\n') return null;
      if (c === '@') return j === 0 || !isWord(text[j - 1]) ? { start: j, query: text.slice(j + 1, caret) } : null;
    }
    return null;
  };
  const suggest = (bots, query, limit = 6) => {
    const q = String(query || '').toLowerCase();
    return bots.filter(b => b.name.toLowerCase().startsWith(q)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
  };

  /* ---------- where a bot may speak ---------- */
  const DM = id => 'dm:' + id;
  const isDm = ch => typeof ch === 'string' && ch.startsWith('dm:');
  // allowed: {mode:'all'} | {mode:'only', channels:[...]} | {mode:'except', channels:[...]}. #general is the id 'general'.
  const normPerm = p => {
    const mode = p && ['all', 'only', 'except'].includes(p.mode) ? p.mode : 'all';
    return { mode, channels: mode === 'all' ? [] : [...new Set((p && Array.isArray(p.channels) ? p.channels : []).filter(c => typeof c === 'string' && c.length <= 64))].slice(0, 100) };
  };
  const mayAnswer = (bot, channel) => {
    if (!bot || bot.enabled === false) return false;
    if (isDm(channel)) return channel === DM(bot.id);                      // a private chat is always allowed, but only with that bot
    const p = normPerm(bot.allowed), ch = channel || 'general';
    return p.mode === 'all' ? true : p.mode === 'only' ? p.channels.includes(ch) : !p.channels.includes(ch);
  };
  const permLabel = (bot, channelNames) => {
    const p = normPerm(bot.allowed), nm = id => '#' + (channelNames[id] || id);
    return p.mode === 'all' ? 'Speaks everywhere' : p.mode === 'only' ? (p.channels.length ? 'Only in ' + p.channels.map(nm).join(', ') : 'Nowhere yet') : (p.channels.length ? 'Everywhere except ' + p.channels.map(nm).join(', ') : 'Speaks everywhere');
  };

  /* ---------- who answers ---------- */
  // Mention mode: the bots named in the message (and allowed here), in the order they were named.
  const planMention = (text, bots, channel) => {
    const m = findMentions(text, bots), turns = [], blocked = [];
    for (const { bot } of m) (mayAnswer(bot, channel) ? turns : blocked).push(bot);
    return { turns, blocked };
  };
  // Group chat: the chosen bots take turns, for the chosen number of rounds.
  const planGroup = (scene, bots, channel) => {
    const rounds = Math.max(1, Math.min(10, Math.floor(Number(scene && scene.rounds) || 1)));
    const order = (scene && Array.isArray(scene.botIds) ? scene.botIds : []).map(id => bots.find(b => b.id === id)).filter(b => b && mayAnswer(b, channel));
    const turns = [];
    for (let r = 0; r < rounds; r++) turns.push(...order);
    return { turns, skipped: (scene && scene.botIds || []).filter(id => !order.some(b => b.id === id)) };
  };
  // A bot that pings another bot in its reply can start that one, a couple of hops at most.
  const MAX_CHAIN = 2;
  const followUps = (reply, bots, speaker, channel, depth) => depth >= MAX_CHAIN ? [] : findMentions(reply, bots.filter(b => !speaker || b.id !== speaker.id)).map(m => m.bot).filter(b => mayAnswer(b, channel));

  /* ---------- the prompt ---------- */
  const macros = (s, bot, owner) => String(s || '').replace(/\{\{\s*char\s*\}\}/gi, bot.name).replace(/\{\{\s*user\s*\}\}/gi, owner || 'the owner');
  const LIMITS = { persona: 8000, scenario: 2000, greeting: 1000, examples: 4000, bio: 300 };
  // history: [{who, text}] oldest first (who is a display name). Trimmed from the oldest end to fit the budget (characters).
  const buildPrompt = ({ bot, owner, server, channel, others = [], history = [], budget = 8000 }) => {
    const o = owner || 'the owner', lines = [];
    lines.push(`You are ${bot.name}, a member of a private chat server called "${server || 'the server'}". You are chatting in ${isDm(channel) ? 'a private one-to-one chat with ' + o : '#' + (channel || 'general')}.`);
    if (others.length) lines.push(`Other AI members here: ${others.join(', ')}. ${o} is the server owner and the only human.`);
    if (bot.persona) lines.push(macros(bot.persona, bot, owner).slice(0, LIMITS.persona));
    if (bot.scenario) lines.push('Scenario: ' + macros(bot.scenario, bot, owner).slice(0, LIMITS.scenario));
    if (bot.examples) lines.push('Examples of how you talk:\n' + macros(bot.examples, bot, owner).slice(0, LIMITS.examples));
    lines.push(`Stay in character as ${bot.name}. Write only ${bot.name}'s next chat message: short and natural, like a message in a chat. Do not write lines for anyone else and do not start with your own name.`);
    const system = lines.join('\n\n');
    const fixed = system.length + 200;
    let keep = [], used = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const line = `${history[i].who}: ${String(history[i].text).slice(0, 1500)}`;
      if (used + line.length > Math.max(400, budget - fixed) && keep.length >= 2) break;
      keep.unshift(line); used += line.length + 1;
    }
    const transcript = keep.length ? keep.join('\n') : `(${o} has just joined the chat.)`;
    return { system, prompt: `Conversation so far:\n${transcript}\n\nReply as ${bot.name}.`, historyUsed: keep.length };
  };
  // What a model gave back, tidied: no "Name:" prefix, nothing after it starts speaking for someone else.
  const cleanReply = (raw, bot, speakers = []) => {
    let t = String(raw == null ? '' : raw).replace(/\r/g, '').trim();
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp('^(?:' + esc(bot.name) + ')\\s*[:\\uff1a]\\s*', 'i'), '');
    const names = speakers.filter(n => n && n.toLowerCase() !== bot.name.toLowerCase());
    if (names.length) { const cut = new RegExp('\\n\\s*(?:' + names.map(esc).join('|') + ')\\s*[:\\uff1a]', 'i').exec(t); if (cut) t = t.slice(0, cut.index); }
    t = t.replace(/^["“](.*)["”]$/s, '$1').trim();
    return t.slice(0, 2000) || '...';
  };
  const stopsFor = (bot, speakers) => ['\n\n\n', ...speakers.filter(n => n.toLowerCase() !== bot.name.toLowerCase()).map(n => `\n${n}:`)].slice(0, 12);

  /* ---------- away mode ("free chat") ---------- */
  const FREE_DEFAULTS = { paceMin: 20, paceMax: 90, maxPerHour: 30, onlyCharging: true, minBattery: 30, catchUp: false, catchUpMax: 12 };
  const normFree = c => {
    const n = x => Number.isFinite(Number(x)) ? Number(x) : NaN, d = FREE_DEFAULTS, clamp = (v, lo, hi, def) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
    const paceMin = clamp(n(c && c.paceMin), 5, 3600, d.paceMin), paceMax = clamp(n(c && c.paceMax), paceMin, 7200, Math.max(paceMin, d.paceMax));
    return { botIds: (c && Array.isArray(c.botIds) ? c.botIds : []).filter(x => typeof x === 'string').slice(0, 12), paceMin, paceMax, maxPerHour: Math.round(clamp(n(c && c.maxPerHour), 1, 600, d.maxPerHour)), onlyCharging: !(c && c.onlyCharging === false), minBattery: Math.round(clamp(n(c && c.minBattery), 0, 90, d.minBattery)), catchUp: !!(c && c.catchUp), catchUpMax: Math.round(clamp(n(c && c.catchUpMax), 1, 60, d.catchUpMax)), enabled: !!(c && c.enabled) };
  };
  // battery: {charging, level 0..1} or null when the device does not say. Returns '' when fine, else why not.
  const powerBlock = (cfg, battery) => {
    if (!battery) return cfg.onlyCharging ? 'power' : '';
    if (cfg.onlyCharging && !battery.charging) return 'unplugged';
    if (!battery.charging && battery.level * 100 < cfg.minBattery) return 'battery';
    return '';
  };
  // Decide the next move: {action:'speak', bot, delayMs} | {action:'wait', delayMs, reason} | {action:'stop', reason}
  const freeNext = ({ cfg, bots, channel, lastSpeakerId, sent = [], now = Date.now(), rnd = Math.random, battery = undefined }) => {
    cfg = normFree(cfg);
    if (!cfg.enabled) return { action: 'stop', reason: 'off' };
    const pool = cfg.botIds.map(id => bots.find(b => b.id === id)).filter(b => b && mayAnswer(b, channel));
    if (pool.length < 2) return { action: 'stop', reason: 'need-two' };
    const block = battery === undefined ? '' : powerBlock(cfg, battery);
    if (block) return { action: 'wait', delayMs: 60000, reason: block };
    const recent = sent.filter(t => now - t < 3600000);
    if (recent.length >= cfg.maxPerHour) return { action: 'wait', delayMs: Math.max(1000, Math.min(...recent) + 3600000 - now), reason: 'hourly-cap' };
    const choices = pool.filter(b => b.id !== lastSpeakerId), bot = choices[Math.floor(rnd() * choices.length)] || pool[0];
    return { action: 'speak', bot, delayMs: Math.round((cfg.paceMin + rnd() * (cfg.paceMax - cfg.paceMin)) * 1000) };
  };
  // After being away: how many messages to fill in, and when each one "was sent".
  const catchUpPlan = ({ cfg, awayMs, now = Date.now(), minAwayMs = 600000 }) => {
    cfg = normFree(cfg);
    if (!cfg.enabled || !cfg.catchUp || awayMs < minAwayMs) return [];
    const avg = (cfg.paceMin + cfg.paceMax) / 2 * 1000, cap = Math.min(cfg.catchUpMax, Math.floor(awayMs / avg), Math.floor(awayMs / 3600000 * cfg.maxPerHour) + 1);
    if (cap < 1) return [];
    const start = now - awayMs, step = awayMs / (cap + 1);
    return Array.from({ length: cap }, (_, i) => Math.round(start + step * (i + 1)));
  };

  /* ---------- characters (bots) ---------- */
  const str = (v, max) => typeof v === 'string' ? v.replace(/\u0000/g, '').slice(0, max) : '';
  const normBot = raw => ({
    name: cleanName(raw && raw.name), bio: str(raw && raw.bio, LIMITS.bio), persona: str(raw && raw.persona, LIMITS.persona), scenario: str(raw && raw.scenario, LIMITS.scenario),
    greeting: str(raw && raw.greeting, LIMITS.greeting), examples: str(raw && raw.examples, LIMITS.examples),
    color: typeof (raw && raw.color) === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : null,
    temperature: Math.max(0, Math.min(2, Number.isFinite(Number(raw && raw.temperature)) && raw.temperature !== '' && raw.temperature != null ? Number(raw.temperature) : 0.8)),
    maxTokens: Math.max(16, Math.min(1024, Math.round(Number(raw && raw.maxTokens) || 200))), allowed: normPerm(raw && raw.allowed), enabled: !(raw && raw.enabled === false),
  });
  // Character cards (the common "chara_card_v2" format used by other chat tools).
  const exportCard = bot => ({ spec: 'chara_card_v2', spec_version: '2.0', data: {
    name: bot.name, description: bot.persona || '', personality: '', scenario: bot.scenario || '', first_mes: bot.greeting || '', mes_example: bot.examples || '', creator_notes: bot.bio || '',
    system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [], creator: '', character_version: '1', extensions: { anti_social: { temperature: bot.temperature, max_tokens: bot.maxTokens } } } });
  const importCard = input => {
    let d = input;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return { ok: false, error: 'That is not a character card.' }; } }
    if (!d || typeof d !== 'object') return { ok: false, error: 'That is not a character card.' };
    const c = (d.spec === 'chara_card_v2' || d.spec === 'chara_card_v3' || d.data) && d.data && typeof d.data === 'object' ? d.data : d;
    const name = cleanName(c.name || c.char_name);
    if (!name) return { ok: false, error: 'That card has no usable name.' };
    const join = (...p) => p.filter(x => typeof x === 'string' && x.trim()).join('\n\n');
    const ext = c.extensions && c.extensions.anti_social || {};
    const bot = normBot({ name, bio: c.creator_notes || '', persona: join(c.description || c.char_persona, c.personality, c.system_prompt), scenario: c.scenario || c.world_scenario, greeting: c.first_mes || c.char_greeting, examples: c.mes_example || c.example_dialogue, temperature: ext.temperature, maxTokens: ext.max_tokens });
    return { ok: true, bot };
  };
  /* PNG cards: the card JSON rides in a "chara" text chunk as base64, and the picture is the character's avatar. */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b, c0 = 0xffffffff) => { let c = c0; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return c; };
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  const isPng = b => b && b.length > 12 && SIG.every((v, i) => b[i] === v);
  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const chunks = b => { const out = []; let o = 8; while (o + 12 <= b.length) { const len = u32(b, o); if (o + 12 + len > b.length) break; out.push({ type: String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]), start: o, end: o + 12 + len, data: b.subarray(o + 8, o + 8 + len) }); o += 12 + len; } return out; };
  const latin1 = a => { let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return s; };
  const b64decode = s => { if (typeof atob === 'function') { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; } return Uint8Array.from(Buffer.from(s, 'base64')); };
  const b64encode = u => { if (typeof btoa === 'function') { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); } return Buffer.from(u).toString('base64'); };
  const utf8 = s => typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8'));
  const unutf8 = u => typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(u) : Buffer.from(u).toString('utf8');
  const cardFromPng = bytes => {
    if (!isPng(bytes)) return null;
    for (const ch of chunks(bytes)) {
      if (ch.type === 'tEXt') {
        const z = ch.data.indexOf(0); if (z < 0) continue;
        const key = latin1(ch.data.subarray(0, z));
        if (key === 'chara' || key === 'ccv3') { try { return unutf8(b64decode(latin1(ch.data.subarray(z + 1)).replace(/\s+/g, ''))); } catch { return null; } }
      } else if (ch.type === 'iTXt') {
        const z = ch.data.indexOf(0); if (z < 0) continue;
        const key = latin1(ch.data.subarray(0, z));
        if ((key === 'chara' || key === 'ccv3') && ch.data[z + 1] === 0) {
          let o = z + 3; for (let i = 0; i < 2; i++) { const e = ch.data.indexOf(0, o); if (e < 0) return null; o = e + 1; }
          try { return unutf8(b64decode(unutf8(ch.data.subarray(o)).replace(/\s+/g, ''))); } catch { return null; }
        }
      }
    }
    return null;
  };
  const cardToPng = (pngBytes, json) => {
    if (!isPng(pngBytes)) throw new Error('not a png');
    const keep = chunks(pngBytes).filter(c => !((c.type === 'tEXt' || c.type === 'iTXt') && /^(chara|ccv3)\0/.test(latin1(c.data.subarray(0, 8)))));
    const text = latin1(utf8(b64encode(utf8(json)))), body = new Uint8Array(6 + text.length);
    body.set(utf8('chara'), 0); body[5] = 0; for (let i = 0; i < text.length; i++) body[6 + i] = text.charCodeAt(i);
    const mk = (type, data) => { const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer); dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i); out.set(data, 8); const c = crc32(out.subarray(4, 8 + data.length)) ^ 0xffffffff; dv.setUint32(8 + data.length, c >>> 0); return out; };
    const parts = [Uint8Array.from(SIG)];
    for (const c of keep) { if (c.type === 'IEND') parts.push(mk('tEXt', body)); parts.push(pngBytes.subarray(c.start, c.end)); }
    const total = parts.reduce((n, p) => n + p.length, 0), out = new Uint8Array(total); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };

  return { MAX_NAME, MAX_CHAIN, LIMITS, FREE_DEFAULTS, cleanName, sameName, nameError, findMentions, mentionQuery, suggest, DM, isDm, normPerm, mayAnswer, permLabel, planMention, planGroup, followUps, buildPrompt, cleanReply, stopsFor, normFree, powerBlock, freeNext, catchUpPlan, normBot, exportCard, importCard, isPng, cardFromPng, cardToPng, crc32 };
})();
if (typeof module !== 'undefined') module.exports = AICore;

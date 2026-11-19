'use strict';
/* Custom emoji, stickers and sounds for the Chat Rooms look (pure rules, no page). Everything is your own upload, kept on this device. */
const ChatxCore = (() => {
  const MAX_EMOJI = 50, MAX_STICKERS = 30, MAX_SOUNDS = 24, MAX_NAME = 32, MAX_SOUND_SEC = 8, MAX_SOUND_BYTES = 600000, MAX_EMOJI_BYTES = 262144;
  // "Cool Cat!!.png" -> "cool_cat". Empty if nothing usable is left. Names are 2 to 32 letters, numbers or underscores.
  const cleanName = raw => { const n = String(raw == null ? '' : raw).replace(/\.[^.]+$/, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_ -]/g, '').trim().replace(/[\s-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''); return n.length >= 2 ? n.slice(0, MAX_NAME) : ''; };
  // a name nobody else has: "cat", "cat_2", "cat_3"...
  function uniqueName(name, taken) { const t = taken instanceof Set ? taken : new Set(taken); if (!t.has(name)) return name; for (let i = 2; i < 1000; i++) { const c = name.slice(0, MAX_NAME - String(i).length - 1) + '_' + i; if (!t.has(c)) return c; } return name; }
  function nameError(raw, takenByOthers) { const n = cleanName(raw); if (!n) return 'Use at least 2 letters or numbers.'; if (new Set(takenByOthers).has(n)) return 'That name is already used.'; return null; }
  // split a message into plain text and :name: emoji that exist in the map
  function tokens(text, has) {
    const out = []; let last = 0; const re = /:([A-Za-z0-9_]{2,32}):/g, s = String(text == null ? '' : text); let m;
    while ((m = re.exec(s))) { const name = m[1].toLowerCase(); if (!has(name)) continue; if (m.index > last) out.push({ text: s.slice(last, m.index) }); out.push({ emoji: name }); last = m.index + m[0].length; }
    if (last < s.length) out.push({ text: s.slice(last) }); return out;
  }
  const volume = v => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1; };
  const soundError = ({ size, duration }) => (size > MAX_SOUND_BYTES ? `Sounds can be up to ${Math.round(MAX_SOUND_BYTES / 1000)} KB.` : duration > MAX_SOUND_SEC ? `Sounds can be up to ${MAX_SOUND_SEC} seconds.` : !(duration > 0) ? 'That file does not look like a sound.' : null);
  const firstEmoji = s => { const m = String(s || '').match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u); return m ? m[0] : ''; };
  return { MAX_EMOJI, MAX_STICKERS, MAX_SOUNDS, MAX_NAME, MAX_SOUND_SEC, MAX_SOUND_BYTES, MAX_EMOJI_BYTES, cleanName, uniqueName, nameError, tokens, volume, soundError, firstEmoji };
})();
if (typeof module !== 'undefined') module.exports = ChatxCore;

'use strict';
/* Music Player: the pure part. Reads the tags inside audio files (ID3, MP4 and FLAC), parses lyric files, sorts and groups the library,
   and holds the equalizer presets and the play-queue rules. Nothing here touches the page. */
const MusicCore = (() => {
  const td = (enc, b) => { try { return new TextDecoder(enc).decode(b); } catch { return ''; } };
  const clean = s => String(s || '').replace(/\u0000+$/g, '').replace(/^﻿/, '').trim();
  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const syncsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
  const decodeText = (b, enc) => clean(enc === 1 ? (b[0] === 0xFE && b[1] === 0xFF ? td('utf-16be', b.subarray(2)) : td('utf-16le', b[0] === 0xFF ? b.subarray(2) : b)) : enc === 2 ? td('utf-16be', b) : enc === 3 ? td('utf-8', b) : td('latin1', b));
  /* ----- ID3v2 (the tag at the start of most MP3 files) ----- */
  function id3Size(b) { if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0; return 10 + syncsafe(b, 6); }
  function readId3(b) {
    const out = {}; if (!id3Size(b)) return out; const ver = b[3], end = Math.min(b.length, id3Size(b)); let o = 10;
    if (b[5] & 0x40) { const ex = ver === 4 ? syncsafe(b, o) : u32(b, o); o += ex + (ver === 4 ? 0 : 4); }
    while (o + (ver === 2 ? 6 : 10) <= end) {
      const id = ver === 2 ? td('latin1', b.subarray(o, o + 3)) : td('latin1', b.subarray(o, o + 4)); if (!/^[A-Z0-9]+$/.test(id)) break;
      const size = ver === 2 ? (b[o + 3] << 16) | (b[o + 4] << 8) | b[o + 5] : ver === 4 ? syncsafe(b, o + 4) : u32(b, o + 4), hdr = ver === 2 ? 6 : 10, body = b.subarray(o + hdr, o + hdr + size); o += hdr + size; if (size <= 0 || o > end + 10) { if (size <= 0) continue; break; }
      const text = () => decodeText(body.subarray(1), body[0]);
      switch (id) {
        case 'TIT2': case 'TT2': out.title = text(); break; case 'TPE1': case 'TP1': out.artist = text(); break; case 'TALB': case 'TAL': out.album = text(); break;
        case 'TPE2': case 'TP2': out.albumArtist = text(); break; case 'TRCK': case 'TRK': out.track = parseInt(text(), 10) || 0; break;
        case 'TYER': case 'TDRC': case 'TYE': out.year = parseInt(text(), 10) || 0; break;
        case 'TCON': case 'TCO': out.genre = text().replace(/^\((\d+)\)/, (m, n) => GENRES[+n] || '').replace(/^\d+$/, n => GENRES[+n] || n); break;
        case 'USLT': case 'ULT': { const enc = body[0], rest = body.subarray(4); let i = 0; if (enc === 1 || enc === 2) { while (i + 1 < rest.length && !(rest[i] === 0 && rest[i + 1] === 0)) i += 2; i += 2; } else { while (i < rest.length && rest[i] !== 0) i++; i += 1; } out.lyrics = decodeText(rest.subarray(i), enc); break; }
        case 'APIC': case 'PIC': { const enc = body[0]; let i = 1, mime = ''; if (id === 'PIC') { mime = 'image/' + td('latin1', body.subarray(1, 4)).toLowerCase().replace('jpg', 'jpeg'); i = 4; } else { const s = i; while (i < body.length && body[i] !== 0) i++; mime = td('latin1', body.subarray(s, i)); i++; } i++; // the picture type
          if (enc === 1 || enc === 2) { while (i + 1 < body.length && !(body[i] === 0 && body[i + 1] === 0)) i += 2; i += 2; } else { while (i < body.length && body[i] !== 0) i++; i++; }
          if (body.length - i > 100 && !out.cover) out.cover = { mime: /^image\//.test(mime) ? mime : 'image/jpeg', bytes: body.slice(i) }; break; }
        default: break;
      }
    }
    return out;
  }
  const GENRES = ['Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise', 'Alt Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta', 'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock'];
  function readId3v1(b) { if (b.length < 128 || b[b.length - 128] !== 0x54 || b[b.length - 127] !== 0x41 || b[b.length - 126] !== 0x47) return {}; const t = b.subarray(b.length - 128), f = (a, z) => clean(td('latin1', t.subarray(a, z))); return { title: f(3, 33), artist: f(33, 63), album: f(63, 93), year: parseInt(f(93, 97), 10) || 0, genre: GENRES[t[127]] || '', track: t[125] === 0 ? t[126] : 0 }; }
  /* ----- MP4 / M4A ----- */
  function readMp4(b) {
    const out = {}, dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const walk = (s, e, path) => { let o = s; while (o + 8 <= e) { let size = dv.getUint32(o), type = td('latin1', b.subarray(o + 4, o + 8)); let hdr = 8; if (size === 1) { size = Number(dv.getBigUint64(o + 8)); hdr = 16; } else if (size === 0) size = e - o; if (size < hdr || o + size > e + 8) break;
      const body = o + hdr, endBox = Math.min(e, o + size);
      if (['moov', 'udta', 'ilst', 'trak'].includes(type)) walk(body, endBox, path + '/' + type); else if (type === 'meta') walk(body + 4, endBox, path + '/meta');
      else if (path.endsWith('ilst')) { const d = findData(body, endBox); if (d) { const key = type === '©nam' ? 'title' : type === '©ART' ? 'artist' : type === '©alb' ? 'album' : type === 'aART' ? 'albumArtist' : type === '©gen' ? 'genre' : type === '©day' ? 'year' : type === 'trkn' ? 'track' : type === 'covr' ? 'cover' : '';
        if (key === 'cover') out.cover = { mime: d.flag === 14 ? 'image/png' : 'image/jpeg', bytes: d.bytes.slice() }; else if (key === 'track') out.track = d.bytes.length >= 4 ? (d.bytes[2] << 8) | d.bytes[3] : 0; else if (key === 'year') out.year = parseInt(td('utf-8', d.bytes), 10) || 0; else if (key) out[key] = clean(td('utf-8', d.bytes)); } }
      o += size; } };
    const findData = (s, e) => { let o = s; while (o + 16 <= e) { const size = dv.getUint32(o); if (size < 16) break; if (td('latin1', b.subarray(o + 4, o + 8)) === 'data') return { flag: dv.getUint32(o + 8) & 0xFFFFFF, bytes: b.subarray(o + 16, o + size) }; o += size; } return null; };
    walk(0, b.length, ''); return out;
  }
  /* ----- FLAC ----- */
  function readFlac(b) {
    const out = {}; if (td('latin1', b.subarray(0, 4)) !== 'fLaC') return out; let o = 4;
    while (o + 4 <= b.length) { const last = b[o] & 0x80, type = b[o] & 0x7F, len = (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3], body = b.subarray(o + 4, o + 4 + len); o += 4 + len;
      if (type === 4) Object.assign(out, vorbisComments(body, 0)); else if (type === 6 && !out.cover) { const dv = new DataView(body.buffer, body.byteOffset, body.byteLength); let i = 4; const ml = dv.getUint32(i); i += 4; const mime = td('latin1', body.subarray(i, i + ml)); i += ml; const dl = dv.getUint32(i); i += 4 + dl + 16; const pl = dv.getUint32(i); i += 4; out.cover = { mime: mime || 'image/jpeg', bytes: body.slice(i, i + pl) }; }
      if (last) break; }
    return out;
  }
  function vorbisComments(b, o) {
    const out = {}, dv = new DataView(b.buffer, b.byteOffset, b.byteLength), vl = dv.getUint32(o, true); o += 4 + vl; const n = dv.getUint32(o, true); o += 4;
    for (let i = 0; i < n && o + 4 <= b.length; i++) { const l = dv.getUint32(o, true); o += 4; const s = td('utf-8', b.subarray(o, o + l)); o += l; const eq = s.indexOf('='); if (eq < 0) continue; const k = s.slice(0, eq).toUpperCase(), v = clean(s.slice(eq + 1));
      if (k === 'TITLE') out.title = v; else if (k === 'ARTIST') out.artist = v; else if (k === 'ALBUM') out.album = v; else if (k === 'ALBUMARTIST') out.albumArtist = v; else if (k === 'GENRE') out.genre = v; else if (k === 'DATE' || k === 'YEAR') out.year = parseInt(v, 10) || 0; else if (k === 'TRACKNUMBER') out.track = parseInt(v, 10) || 0; else if (k === 'LYRICS' || k === 'UNSYNCEDLYRICS') out.lyrics = v; }
    return out;
  }
  // From a filename like "03 - Artist - Title.mp3" or "Artist - Title.flac"
  function fromName(name, folder) {
    let base = String(name).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim(), track = 0; const m = base.match(/^(\d{1,3})\s*[-._)]\s*(.+)$/) || base.match(/^(\d{2,3})\s+(\D.*)$/); if (m) { track = +m[1]; base = m[2]; }
    const parts = base.split(/\s+-\s+/); const out = { track };
    if (parts.length >= 2) { out.artist = parts[0].trim(); out.title = parts.slice(1).join(' - ').trim(); } else out.title = base || name;
    if (folder) out.album = folder; return out;
  }
  // everything we can learn from the start (and, for old MP3s, the end) of a file
  function readTags(bytes, name, folder) {
    let t = {}; const ext = (String(name).match(/\.([^.]+)$/) || [])[1]; const e = (ext || '').toLowerCase();
    try { if (id3Size(bytes)) t = readId3(bytes); else if (e === 'flac' || td('latin1', bytes.subarray(0, 4)) === 'fLaC') t = readFlac(bytes); else if (['m4a', 'mp4', 'm4b', 'aac'].includes(e) || td('latin1', bytes.subarray(4, 8)) === 'ftyp') t = readMp4(bytes); } catch { t = {}; }
    if (!t.title && !t.artist) { try { const v1 = readId3v1(bytes); if (v1.title) t = { ...t, ...v1 }; } catch { /* none */ } }
    const f = fromName(name, folder);
    return { tagged: !!(t.title || t.artist), title: t.title || f.title, artist: t.artist || t.albumArtist || f.artist || 'Unknown artist', album: t.album || f.album || 'Unknown album', albumArtist: t.albumArtist || '', track: t.track || f.track || 0, year: t.year || 0, genre: t.genre || 'Unknown genre', cover: t.cover || null, lyrics: t.lyrics || '' };
  }
  /* ----- lyrics ----- */
  function parseLrc(text) {
    const lines = [], all = String(text || ''), om = all.match(/^\[offset:\s*(-?\d+)\]/im), offset = om ? +om[1] / 1000 : 0;
    for (const raw of all.split(/\r?\n/)) {
      if (/^\[offset:/i.test(raw)) continue;
      const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)]; if (!stamps.length) continue; const txt = raw.replace(/\[[^\]]*\]/g, '').replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
      for (const s of stamps) lines.push({ t: (+s[1]) * 60 + (+s[2]) + (s[3] ? +('0.' + s[3].padEnd(3, '0').slice(0, 3)) : 0) + offset, text: txt });
    }
    return lines.sort((a, b) => a.t - b.t);
  }
  const isSynced = lines => lines.length > 1;
  const lrcAt = (lines, t) => { let lo = 0, hi = lines.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (lines[m].t <= t + 0.15) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
  /* ----- the library ----- */
  const key = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const collator = (typeof Intl !== 'undefined') ? new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }) : { compare: (a, b) => (a < b ? -1 : a > b ? 1 : 0) };
  const byTitle = (a, b) => collator.compare(a.title, b.title);
  const byAlbumOrder = (a, b) => collator.compare(a.album, b.album) || (a.disc || 0) - (b.disc || 0) || (a.track || 0) - (b.track || 0) || byTitle(a, b);
  function group(tracks, by) {
    const m = new Map();
    for (const t of tracks) { const name = by === 'albums' ? t.album : by === 'artists' ? t.artist : by === 'genres' ? t.genre : (t.folder || 'Music'); const k = by === 'albums' ? key(t.album) + '|' + key(t.albumArtist || t.artist) : key(name); let g = m.get(k); if (!g) { g = { key: k, name, sub: by === 'albums' ? (t.albumArtist || t.artist) : '', tracks: [], cover: t.cover || '' }; m.set(k, g); } g.tracks.push(t); if (!g.cover && t.cover) g.cover = t.cover; }
    const out = [...m.values()]; out.forEach(g => g.tracks.sort(by === 'albums' ? byAlbumOrder : byTitle)); return out.sort((a, b) => collator.compare(a.name, b.name));
  }
  const searchTracks = (tracks, q) => { const w = key(q).split(/\s+/).filter(Boolean); if (!w.length) return tracks; return tracks.filter(t => { const h = key(t.title + ' ' + t.artist + ' ' + t.album); return w.every(x => h.includes(x)); }); };
  /* ----- equalizer and effects ----- */
  const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000], BAND_LABELS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
  const PRESETS = { Normal: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'Bass boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0], 'Treble boost': [0, 0, 0, 0, 0, 1, 3, 5, 6, 6], Rock: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5], Pop: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2], Jazz: [3, 2, 1, 2, -2, -2, 0, 1, 3, 4], Classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4], Dance: [6, 5, 3, 0, 0, -2, -3, -2, 2, 3], Vocal: [-2, -2, -1, 2, 4, 4, 3, 1, 0, -1], 'Hip hop': [5, 5, 2, 3, -1, -1, 2, 0, 2, 3], Loudness: [5, 3, 0, 0, -1, 0, -1, 0, 3, 4], Acoustic: [4, 3, 2, 1, 2, 1, 2, 3, 3, 2], Electronic: [4, 3, 1, -1, -2, 1, 0, 1, 4, 5], 'Small speakers': [5, 4, 3, 2, 1, 0, -1, -2, -2, -3] };
  const REVERBS = [['none', 'Off', 0, 0], ['small', 'Small room', 0.45, 0.22], ['large', 'Large room', 1.2, 0.3], ['plate', 'Plate', 1.6, 0.3], ['hall', 'Concert hall', 2.6, 0.34], ['cathedral', 'Cathedral', 4, 0.38]];   // id, name, seconds of tail, wet level
  const clampDb = v => Math.max(-12, Math.min(12, Math.round(v * 2) / 2));
  /* ----- the queue ----- */
  const shuffleOrder = (n, first, rnd = Math.random) => { const a = Array.from({ length: n }, (_, i) => i).filter(i => i !== first); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return first >= 0 ? [first, ...a] : a; };
  const moveItem = (arr, from, to) => { const a = arr.slice(); const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };
  const fmt = s => { if (!isFinite(s) || s < 0) s = 0; s = Math.floor(s); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const trackId = f => { let h = 2166136261; const s = f.name + '|' + f.size + '|' + (f.lastModified || 0); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return 't' + h.toString(36) + f.size.toString(36); };
  return { readTags, readId3, readFlac, readMp4, id3Size, fromName, parseLrc, isSynced, lrcAt, group, searchTracks, key, BANDS, BAND_LABELS, PRESETS, REVERBS, clampDb, shuffleOrder, moveItem, fmt, trackId, byTitle, byAlbumOrder };
})();
if (typeof module !== 'undefined') module.exports = MusicCore;

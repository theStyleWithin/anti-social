'use strict';
/* Reading text out of documents you import as notes: plain text, Markdown, Word (.docx) and OpenDocument (.odt).
   A .docx is a zip file with the words in word/document.xml, so this reads the zip itself. Offline, nothing uploaded. */
const DocxCore = (() => {
  const MAX_FILE = 40 * 1024 * 1024, MAX_XML = 80 * 1024 * 1024;
  const u16 = (b, o) => b[o] | (b[o + 1] << 8), u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const utf8 = b => new TextDecoder('utf-8').decode(b);

  // every file in the zip: { name, method, csize, usize, offset }
  const entries = b => {
    let e = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('not a zip');
    const n = u16(b, e + 10); let p = u32(b, e + 16); const out = [];
    for (let i = 0; i < n; i++) {
      if (u32(b, p) !== 0x02014b50) throw new Error('bad zip');
      const nl = u16(b, p + 28), el = u16(b, p + 30), cl = u16(b, p + 32);
      out.push({ name: utf8(b.subarray(p + 46, p + 46 + nl)), method: u16(b, p + 10), csize: u32(b, p + 20), usize: u32(b, p + 24), offset: u32(b, p + 42) });
      p += 46 + nl + el + cl;
    }
    return out;
  };
  const inflate = async (data, limit) => {
    const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter();
    w.write(data).catch(() => {}); w.close().catch(() => {});
    const r = ds.readable.getReader(), parts = []; let size = 0;
    for (;;) { const { done, value } = await r.read(); if (done) break; size += value.length; if (size > limit) { try { await r.cancel(); } catch { /* stop */ } throw new Error('too large'); } parts.push(value); }
    const out = new Uint8Array(size); let o = 0; for (const x of parts) { out.set(x, o); o += x.length; }
    return out;
  };
  const read = async (b, ent) => {
    if (ent.usize > MAX_XML) throw new Error('too large');
    if (u32(b, ent.offset) !== 0x04034b50) throw new Error('bad zip');
    const start = ent.offset + 30 + u16(b, ent.offset + 26) + u16(b, ent.offset + 28), data = b.subarray(start, start + ent.csize);
    if (ent.method === 0) return data;
    if (ent.method === 8) return inflate(data, MAX_XML);
    throw new Error('unsupported zip');
  };

  const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, c) => { c = c.toLowerCase(); if (c === 'amp') return '&'; if (c === 'lt') return '<'; if (c === 'gt') return '>'; if (c === 'quot') return '"'; if (c === 'apos') return "'"; const n = c[1] === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10); try { return String.fromCodePoint(n); } catch { return ''; } });

  // Word: paragraphs, tabs, line breaks, bullets and table cells
  const wordText = xml => {
    const paras = xml.match(/<w:p[ >\/][\s\S]*?<\/w:p>|<w:p\/>/g) || [], out = [];
    for (const p of paras) {
      let line = p.includes('<w:numPr>') ? '• ' : '';
      const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)\b[^>]*\/>|<\/w:tc>/g; let m;
      while ((m = re.exec(p))) { if (m[0].startsWith('<w:t>') || m[0].startsWith('<w:t ')) line += decode(m[1]); else if (m[0].startsWith('<w:tab')) line += '\t'; else if (m[0] === '</w:tc>') line += '\t'; else line += '\n'; }
      out.push(line.replace(/\t+$/, ''));
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  // OpenDocument: paragraphs and headings
  const odfText = xml => {
    const body = (/<office:text[^>]*>([\s\S]*)<\/office:text>/.exec(xml) || [0, xml])[1];
    return decode(body.replace(/<text:line-break\s*\/>/g, '\n').replace(/<text:tab\s*\/>/g, '\t').replace(/<text:s(?:\s+text:c="(\d+)")?\s*\/>/g, (m, n) => ' '.repeat(+n || 1)).replace(/<text:list-item[^>]*>\s*<text:p[^>]*>/g, '• ').replace(/<\/text:(?:p|h)>/g, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim();
  };

  const plain = b => { if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) b = b.subarray(3); try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/\r\n?/g, '\n'); } catch { return new TextDecoder('windows-1252').decode(b).replace(/\r\n?/g, '\n'); } };
  const kind = name => { const e = (/\.([a-z0-9]+)$/i.exec(name || '') || [])[1]; return (e || '').toLowerCase(); };
  const TYPES = ['txt', 'md', 'markdown', 'text', 'csv', 'docx', 'odt'];
  const title = name => String(name || 'Imported note').replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 120) || 'Imported note';

  // { title, body } from the bytes of a file
  const toNote = async (name, bytes) => {
    if (bytes.length > MAX_FILE) throw new Error('That file is over 40 MB.');
    const k = kind(name); let body;
    if (k === 'docx') { const ent = entries(bytes).find(e => e.name === 'word/document.xml'); if (!ent) throw new Error('That is not a Word document.'); body = wordText(utf8(await read(bytes, ent))); }
    else if (k === 'odt') { const ent = entries(bytes).find(e => e.name === 'content.xml'); if (!ent) throw new Error('That is not an OpenDocument text file.'); body = odfText(utf8(await read(bytes, ent))); }
    else if (TYPES.includes(k) || k === '') body = plain(bytes);
    else throw new Error(`.${k} files are not supported. Try .txt, .md, .docx or .odt.`);
    return { title: title(name), body };
  };
  return { toNote, entries, wordText, odfText, plain, title, kind, TYPES, MAX_FILE };
})();
if (typeof module !== 'undefined') module.exports = DocxCore;

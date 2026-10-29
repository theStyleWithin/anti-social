'use strict';
/* Matrix Viewer: the pure part. Columns of falling digits, each a little stream whose head moves down and leaves a fading trail.
   Nothing here touches the page, so it can be tested with a fixed random source. */
const MatrixCore = (() => {
  const CHARSETS = {
    binary: ['Ones and zeros', '01'],
    hex: ['Hexadecimal', '0123456789ABCDEF'],
    kana: ['Katakana', 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ'],
    mixed: ['Mixed', '0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ:.=*+-<>¦'],
  };
  const PALETTES = [['green', 'Green', '#3dff72'], ['cyan', 'Cyan', '#35e0ff'], ['red', 'Red', '#ff4a4a'], ['amber', 'Amber', '#ffb000'], ['white', 'White', '#e8e8e8'], ['purple', 'Purple', '#b57bff']];
  const DEFAULTS = { chars: 'binary', color: 'green', speed: 1, size: 26, trail: 1, glow: true };
  const clamp = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  const normCfg = raw => {
    const r = raw && typeof raw === 'object' ? raw : {};
    return { chars: CHARSETS[r.chars] ? r.chars : DEFAULTS.chars, color: PALETTES.some(p => p[0] === r.color) ? r.color : DEFAULTS.color, speed: clamp(r.speed, 0.2, 3, 1), size: Math.round(clamp(r.size, 14, 48, 26)), trail: clamp(r.trail, 0.3, 3, 1), glow: r.glow !== false };
  };
  const hexOf = id => (PALETTES.find(p => p[0] === id) || PALETTES[0])[2];
  const glyph = (cfg, rnd) => { const set = [...CHARSETS[cfg.chars][1]]; return set[Math.floor(rnd() * set.length)]; };

  // one column: its cells (a glyph and how bright it still is) and up to two streams heading down
  const makeColumn = (rows, cfg, rnd) => ({ cells: Array.from({ length: rows }, () => ({ ch: glyph(cfg, rnd), b: 0 })), streams: [newStream(rows, rnd, true)] });
  const newStream = (rows, rnd, first) => ({ y: first ? -rnd() * rows * 1.5 : -rnd() * 4, speed: 5 + rnd() * 9, glow: rnd() < 0.18 });
  const makeColumns = (cols, rows, cfg, rnd = Math.random) => Array.from({ length: cols }, () => makeColumn(rows, cfg, rnd));

  // move everything on by dt seconds
  const step = (columns, dt, cfg, rnd = Math.random) => {
    const rows = columns.length ? columns[0].cells.length : 0, fade = dt / (1.8 * cfg.trail);
    for (const col of columns) {
      for (const c of col.cells) { if (c.b > 0) { c.b = Math.max(0, c.b - fade); if (c.b > 0.1 && rnd() < dt * 0.25) c.ch = glyph(cfg, rnd); } }
      col.streams.forEach((s, i) => {
        const from = Math.floor(s.y); s.y += s.speed * cfg.speed * dt; const to = Math.floor(s.y);
        for (let r = Math.max(0, from + 1); r <= to && r < rows; r++) { const c = col.cells[r]; c.ch = glyph(cfg, rnd); c.b = 1; c.glow = s.glow; c.head = true; if (r > 0) col.cells[r - 1].head = false; }
        if (s.y - 1 > rows) col.streams[i] = newStream(rows, rnd, false);
      });
      if (col.streams.length < 2 && rnd() < dt * 0.15) col.streams.push(newStream(rows, rnd, false));
      if (col.streams.length > 1) col.streams = col.streams.filter((s, i) => i === 0 || s.y < rows + 1);
    }
    return columns;
  };
  // grow or shrink to a new grid, keeping what is there
  const resize = (columns, cols, rows, cfg, rnd = Math.random) => {
    const out = columns.slice(0, cols).map(c => ({ ...c, cells: c.cells.length === rows ? c.cells : Array.from({ length: rows }, (_, i) => c.cells[i] || { ch: glyph(cfg, rnd), b: 0 }) }));
    while (out.length < cols) out.push(makeColumn(rows, cfg, rnd));
    return out;
  };
  // a seeded random source for tests
  const seeded = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  return { CHARSETS, PALETTES, DEFAULTS, normCfg, hexOf, glyph, makeColumns, step, resize, seeded };
})();
if (typeof module !== 'undefined') module.exports = MatrixCore;

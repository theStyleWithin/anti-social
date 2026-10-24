'use strict';
/* Color themes. A theme is just a background color and an accent color; everything else (text, borders,
   cards, hover) is worked out from those two so the text is always readable. Pure logic, no DOM. */
const ThemeCore = (() => {
  const HEX = /^#[0-9a-f]{6}$/i;
  const clean = (v, fallback) => {
    let s = String(v == null ? '' : v).trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + [...s.slice(1)].map(c => c + c).join('');
    return HEX.test(s) ? s : fallback;
  };
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const hex = ([r, g, b]) => '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const DARK_TEXT = '#0f1419', LIGHT_TEXT = '#ffffff';
  const textOn = bg => contrast(bg, DARK_TEXT) >= contrast(bg, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
  // Nudge an accent toward the text color until it is clearly visible against the background (links and icons use it).
  const visibleAccent = (accent, bg, fg) => { let a = accent, i = 0; while (contrast(a, bg) < 3 && i++ < 20) a = mix(a, fg, 0.1); return a; };

  const derive = (bgIn, accentIn) => {
    let bg = clean(bgIn, '#000000'), fg = textOn(bg);
    // A mid-tone background can't carry readable text either way, so nudge it lighter or darker until it can.
    for (let i = 0; contrast(fg, bg) < 4.5 && i < 20; i++) { bg = mix(bg, fg === DARK_TEXT ? '#ffffff' : '#000000', 0.06); fg = textOn(bg); }
    const accent = visibleAccent(clean(accentIn, '#8b5cf6'), bg, fg);
    const [r, g, b] = rgb(fg);
    return {
      '--bg': bg, '--fg': fg, '--muted': mix(fg, bg, 0.42), '--line': mix(bg, fg, 0.16),
      '--hover': `rgba(${r}, ${g}, ${b}, 0.07)`, '--card': mix(bg, fg, 0.07),
      '--accent': accent, '--accent-fg': textOn(accent), dark: lum(bg) < 0.4,
    };
  };

  const PRESETS = [
    { id: 'midnight', name: 'Midnight', bg: '#0b1020', accent: '#7c9cff' },
    { id: 'forest', name: 'Forest', bg: '#0e1a14', accent: '#4ade80' },
    { id: 'sunset', name: 'Sunset', bg: '#1f1416', accent: '#fb923c' },
    { id: 'ocean', name: 'Ocean', bg: '#06202b', accent: '#22d3ee' },
    { id: 'grape', name: 'Grape', bg: '#1a1030', accent: '#c084fc' },
    { id: 'terminal', name: 'Terminal', bg: '#000000', accent: '#22c55e' },
    { id: 'paper', name: 'Paper', bg: '#f6f1e7', accent: '#b45309' },
    { id: 'rose', name: 'Rose', bg: '#fff1f2', accent: '#e11d48' },
    { id: 'mint', name: 'Mint', bg: '#effaf4', accent: '#0f9d6c' },
    { id: 'mono', name: 'Mono', bg: '#ffffff', accent: '#111111' },
  ];
  const find = id => PRESETS.find(p => p.id === id) || null;
  // The variables for a saved choice ('custom' uses the saved colors). Returns null for the default look.
  const resolve = (id, custom) => {
    if (id === 'custom') return derive(custom && custom.bg, custom && custom.accent);
    const p = find(id);
    return p ? derive(p.bg, p.accent) : null;
  };
  const parseCustom = raw => { try { const v = JSON.parse(raw); return { bg: clean(v.bg, '#14110f'), accent: clean(v.accent, '#f59e0b') }; } catch { return { bg: '#14110f', accent: '#f59e0b' }; } };
  const clampVeil = v => { v = Number(v); return Number.isFinite(v) ? Math.max(30, Math.min(100, Math.round(v))) : 85; };
  // Theme file sharing: only colors travel, never anything else.
  const exportTheme = (name, bg, accent) => JSON.stringify({ antiSocialTheme: 1, name: String(name || 'My theme').slice(0, 40), bg: clean(bg, '#000000'), accent: clean(accent, '#8b5cf6') });
  const importTheme = raw => { try { const v = JSON.parse(raw); if (v && v.antiSocialTheme === 1 && clean(v.bg, null) && clean(v.accent, null)) return { name: String(v.name || 'Imported').slice(0, 40), bg: clean(v.bg), accent: clean(v.accent) }; } catch { /* not a theme file */ } return null; };

  return { clean, mix, lum, contrast, textOn, visibleAccent, derive, PRESETS, find, resolve, parseCustom, clampVeil, exportTheme, importTheme };
})();
if (typeof module !== 'undefined') module.exports = ThemeCore;

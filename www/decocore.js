'use strict';
/* Profile decorations (pure data, no page): the nameplates, server tag colours and glyphs, server banners. All the art is drawn with CSS and tiny
   inline SVG in style.css, so nothing is downloaded and nothing is copied from anywhere. The record shape leaves room for the next kinds,
   animated profile backgrounds (`bg`) and avatar wreaths (`wreath`), which stay empty until they are built. */
const DecoCore = (() => {
  // nameplates: the art behind your row in the member list (see `.plated[data-plate=...]` in style.css)
  const PLATES = [
    { id: 'none', name: 'None', blurb: 'The plain member row.' },
    { id: 'embers', name: 'Embers', blurb: 'Glowing coals, with sparks drifting up.', anim: true },
    { id: 'aurora', name: 'Aurora', blurb: 'Slow green and violet light.', anim: true },
    { id: 'tide', name: 'Tide', blurb: 'Waves rolling past your name.', anim: true },
    { id: 'sakura', name: 'Sakura', blurb: 'Petals on a pink evening.', anim: true },
    { id: 'circuit', name: 'Circuit', blurb: 'A quiet board with a pulse.', anim: true },
    { id: 'starfield', name: 'Starfield', blurb: 'A small piece of night sky.', anim: true },
    { id: 'parchment', name: 'Parchment', blurb: 'Old paper and ink.' },
    { id: 'neon', name: 'Neon grid', blurb: 'A retro grid that scrolls forever.', anim: true },
    { id: 'slime', name: 'Slime', blurb: 'Green, drippy, a bit alive.', anim: true },
    { id: 'prism', name: 'Prism', blurb: 'Every colour, one after another.', anim: true },
  ];
  const TAG_COLORS = [['#5865f2', 'Blurple'], ['#23a55a', 'Green'], ['#f0b232', 'Gold'], ['#f23f43', 'Red'], ['#eb459e', 'Pink'], ['#06b6d4', 'Cyan'], ['#f97316', 'Orange'], ['#7c3aed', 'Violet']];
  const TAG_GLYPHS = [['', 'None'], ['★', 'Star'], ['⚡', 'Bolt'], ['♥', 'Heart'], ['☠', 'Skull'], ['❀', 'Flower'], ['♦', 'Diamond'], ['♛', 'Crown']];
  // server banners: a picture or a pattern across the top of the channel list
  const BANNERS = [
    { id: 'dusk', name: 'Dusk', css: 'linear-gradient(135deg,#1e1b4b,#7c3aed 55%,#f472b6)' },
    { id: 'ember', name: 'Ember', css: 'linear-gradient(135deg,#1c0a05,#9a3412 55%,#fbbf24)' },
    { id: 'lagoon', name: 'Lagoon', css: 'linear-gradient(135deg,#042f2e,#0e7490 55%,#67e8f9)' },
    { id: 'forest', name: 'Forest', css: 'linear-gradient(135deg,#052e16,#15803d 55%,#bef264)' },
    { id: 'rose', name: 'Rose', css: 'linear-gradient(135deg,#4c0519,#be123c 55%,#fda4af)' },
    { id: 'slate', name: 'Slate', css: 'linear-gradient(135deg,#0f172a,#334155 60%,#94a3b8)' },
    { id: 'dots', name: 'Dots', css: 'radial-gradient(circle at 20% 30%,rgba(255,255,255,.25) 0 6px,transparent 7px),radial-gradient(circle at 70% 60%,rgba(255,255,255,.18) 0 10px,transparent 11px),linear-gradient(135deg,#0c4a6e,#1d4ed8)' },
    { id: 'stripes', name: 'Stripes', css: 'repeating-linear-gradient(120deg,rgba(255,255,255,.12) 0 14px,transparent 14px 28px),linear-gradient(135deg,#581c87,#db2777)' },
  ];
  const has = (list, id) => list.some(x => x.id === id);
  const plate = id => PLATES.find(p => p.id === id) || PLATES[0];
  const banner = id => BANNERS.find(b => b.id === id) || null;
  const cleanTag = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const tagOk = s => /^[A-Z0-9]{2,4}$/.test(cleanTag(s));
  const color = c => (TAG_COLORS.some(x => x[0] === c) ? c : TAG_COLORS[0][0]);
  const glyph = g => (TAG_GLYPHS.some(x => x[0] === g) ? g : '');
  // your profile decorations (one record per account)
  const normProfile = r => ({ plate: r && has(PLATES, r.plate) ? r.plate : 'none', bg: r && typeof r.bg === 'string' ? r.bg : '', wreath: r && typeof r.wreath === 'string' ? r.wreath : '', animate: !(r && r.animate === false) });
  // the server's look and the tag a profile can wear (kept on the server record)
  const normServer = r => ({ tag: r && tagOk(r.tag) ? cleanTag(r.tag) : '', tagColor: color(r && r.tagColor), tagGlyph: glyph(r && r.tagGlyph), bannerPreset: r && banner(r.bannerPreset) ? r.bannerPreset : '', bannerImg: r && typeof r.bannerImg === 'string' && r.bannerImg.startsWith('data:image/') ? r.bannerImg : '' });
  const bannerCss = s => (s.bannerImg ? `url("${s.bannerImg}") center / cover` : s.bannerPreset ? banner(s.bannerPreset).css : '');
  // generated members get a nameplate or a tag now and then (scenery, same seed gives the same people)
  const hash = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const ghostPlate = id => { const n = hash('plate' + id); return n % 100 < 28 ? PLATES[1 + (n >>> 8) % (PLATES.length - 1)].id : 'none'; };
  const ghostTag = id => { const n = hash('tag' + id); if (n % 100 >= 22) return null; const words = ['MOON', 'FOX', 'KOI', 'ZEN', 'ASH', 'OWL', 'IVY', 'NOVA', 'RAIN', 'JAZZ']; return { tag: words[(n >>> 8) % words.length], tagColor: TAG_COLORS[(n >>> 12) % TAG_COLORS.length][0], tagGlyph: TAG_GLYPHS[(n >>> 16) % TAG_GLYPHS.length][0] }; };
  return { PLATES, TAG_COLORS, TAG_GLYPHS, BANNERS, plate, banner, cleanTag, tagOk, normProfile, normServer, bannerCss, ghostPlate, ghostTag };
})();
if (typeof module !== 'undefined') module.exports = DecoCore;

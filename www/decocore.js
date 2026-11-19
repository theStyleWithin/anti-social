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
    { id: 'bubbletea', name: 'Bubble Tea', blurb: 'Pink milk tea with pearls drifting by.', anim: true },
    { id: 'hexcandy', name: 'Hex Candy', blurb: 'Pastel honeycomb with a little sparkle.', anim: true },
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
    { id: 'boba', name: 'Boba', css: 'radial-gradient(circle at 22% 70%,#42296b 0 9px,transparent 10px),radial-gradient(circle at 40% 82%,#42296b 0 7px,transparent 8px),radial-gradient(circle at 78% 76%,#42296b 0 10px,transparent 11px),linear-gradient(160deg,#ffe3f1,#ffa6d0 60%,#f27fb6)' },
    { id: 'stripes', name: 'Stripes', css: 'repeating-linear-gradient(120deg,rgba(255,255,255,.12) 0 14px,transparent 14px 28px),linear-gradient(135deg,#581c87,#db2777)' },
  ];

  // profile backgrounds (animated, behind your profile picture and name on the profile page) and avatar wreaths (frames around your picture)
  const BACKGROUNDS = [
    { id: 'none', name: 'None', blurb: 'Your own banner picture, or the plain colours.' },
    { id: 'boba', name: 'Bubble Tea Bliss', blurb: 'Pink milk tea, pearls bobbing, sparkles.', anim: true },
  ];
  const WREATHS = [
    { id: 'none', name: 'None', blurb: 'Just your picture.' },
    { id: 'bobacup', name: 'Boba Cup', blurb: 'Your picture in a bubble tea dome, with a straw.', anim: true },
    { id: 'sprout', name: 'Sprout', blurb: 'A little seedling growing on top.', anim: true },
    { id: 'catphones', name: 'Cat-ear Headphones', blurb: 'Pink cat ears and a tiny microphone.', anim: true },
    { id: 'pearlring', name: 'Pearl Garland', blurb: 'Pearls and flowers, slowly turning.', anim: true },
  ];
  // a theme sets a nameplate, a background and a wreath together
  const THEMES = [{ id: 'boba', name: 'Kawaii Boba Tea', blurb: 'Pink milk tea, pearls and sparkles.', plate: 'bubbletea', bg: 'boba', wreath: 'bobacup' }];

  /* ---- the art: drawn here as SVG (with its own tiny animations) and handed to the page as CSS (see deco.js). Everything is original.
     buildArt(true) is the moving version; buildArt(false) is the same picture standing still, used when animation is off or reduced motion is asked for. ---- */
  const uri = svgText => 'url("data:image/svg+xml,' + encodeURIComponent(svgText) + '")';
  const svg = (w, hh, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}">${defs ? '<defs>' + defs + '</defs>' : ''}${body}</svg>`;
  const f1 = n => Math.round(n * 10) / 10;
  function buildArt(an) {
    const A = s => (an ? s : '');
    const anim = (attr, values, dur, begin = 0, extra = '') => A(`<animate attributeName="${attr}" values="${values}" dur="${dur}s" begin="${-begin}s" repeatCount="indefinite" ${extra}/>`);
    const move = (type, values, dur, begin = 0, extra = '') => A(`<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}s" begin="${-begin}s" repeatCount="indefinite" ${extra}/>`);
    const twinkle = (dur, begin = 0, lo = .2) => anim('opacity', `1;${lo};1`, dur, begin);
    const bob = (amp, dur, begin = 0) => move('translate', `0 0;0 ${-amp};0 0`, dur, begin);
    const grad = (id, a, b, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    const pearl = (x, y, r, o = {}) => `<g>${o.bob ? bob(o.bob, o.dur || 3, o.begin || 0) : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="#3f2a63"/><circle cx="${f1(x - r * .15)}" cy="${f1(y - r * .15)}" r="${f1(r * .72)}" fill="#5d3b96"/><ellipse cx="${f1(x - r * .38)}" cy="${f1(y - r * .42)}" rx="${f1(r * .3)}" ry="${f1(r * .17)}" fill="#fff" fill-opacity=".9" transform="rotate(-35 ${f1(x - r * .38)} ${f1(y - r * .42)})"/><circle cx="${f1(x + r * .35)}" cy="${f1(y + r * .4)}" r="${f1(r * .12)}" fill="#fff" fill-opacity=".5"/></g>`;
    const star = (x, y, sz, c, o = {}) => `<path d="M${x} ${y - sz}Q${x} ${y} ${x + sz} ${y}Q${x} ${y} ${x} ${y + sz}Q${x} ${y} ${x - sz} ${y}Q${x} ${y} ${x} ${y - sz}Z" fill="${c}">${o.tw ? twinkle(o.tw, o.begin || 0, .15) : ''}${o.spin ? A(`<animateTransform attributeName="transform" type="rotate" values="0 ${x} ${y};90 ${x} ${y}" dur="${o.spin}s" begin="${-(o.begin || 0)}s" repeatCount="indefinite"/>`) : ''}</path>`;
    const flower = (x, y, r, petal, mid, o = {}) => { let p = ''; for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; p += `<circle cx="${f1(Math.sin(a) * r * .62)}" cy="${f1(-Math.cos(a) * r * .62)}" r="${f1(r * .42)}" fill="${petal}"/>`; } return `<g transform="translate(${x} ${y})"><g>${o.spin ? move('rotate', '0;360', o.spin, o.begin || 0) : ''}${o.pulse ? move('scale', '1;1.18;1', o.pulse, o.begin || 0) : ''}${p}<circle r="${f1(r * .3)}" fill="${mid}"/></g></g>`; };
    const hexP = (x, y, r, fill, o = {}) => { const pts = []; for (let i = 0; i < 6; i++) { const a = (60 * i - 30) * Math.PI / 180; pts.push(f1(x + r * Math.cos(a)) + ',' + f1(y + r * Math.sin(a))); } return `<polygon points="${pts.join(' ')}" fill="${fill}">${o.pulse ? anim('opacity', `${o.lo || .55};1;${o.lo || .55}`, o.pulse, o.begin || 0) : ''}</polygon>`; };
    const heart = (x, y, sz, c) => `<path d="M${x} ${f1(y + sz * .9)}C${f1(x - sz * 1.5)} ${f1(y - sz * .1)} ${f1(x - sz * .6)} ${f1(y - sz * 1.1)} ${x} ${f1(y - sz * .35)}C${f1(x + sz * .6)} ${f1(y - sz * 1.1)} ${f1(x + sz * 1.5)} ${f1(y - sz * .1)} ${x} ${f1(y + sz * .9)}Z" fill="${c}"/>`;
    // a kawaii face: blinking eyes, rosy cheeks and a little smile
    const face = (x, y, sz, o = {}) => `<g transform="translate(${x} ${y})"><ellipse cx="${f1(-sz * .85)}" cy="0" rx="${f1(sz * .26)}" ry="${f1(sz * .36)}" fill="#3b1f4d">${anim('ry', `${f1(sz * .36)};${f1(sz * .36)};${f1(sz * .04)};${f1(sz * .36)};${f1(sz * .36)}`, o.blink || 4.2, o.begin || 0, 'keyTimes="0;.9;.94;.98;1"')}</ellipse><ellipse cx="${f1(sz * .85)}" cy="0" rx="${f1(sz * .26)}" ry="${f1(sz * .36)}" fill="#3b1f4d">${anim('ry', `${f1(sz * .36)};${f1(sz * .36)};${f1(sz * .04)};${f1(sz * .36)};${f1(sz * .36)}`, o.blink || 4.2, o.begin || 0, 'keyTimes="0;.9;.94;.98;1"')}</ellipse><circle cx="${f1(-sz * 1.5)}" cy="${f1(sz * .5)}" r="${f1(sz * .4)}" fill="#ff7fa8" fill-opacity=".6"/><circle cx="${f1(sz * 1.5)}" cy="${f1(sz * .5)}" r="${f1(sz * .4)}" fill="#ff7fa8" fill-opacity=".6"/><path d="M${f1(-sz * .4)} ${f1(sz * .5)}Q0 ${f1(sz * 1.0)} ${f1(sz * .4)} ${f1(sz * .5)}" fill="none" stroke="#3b1f4d" stroke-width="${f1(Math.max(1, sz * .17))}" stroke-linecap="round"/></g>`;
    const rise = (x, y0, y1, r, dur, begin, c = '#fff', o = .8) => `<circle cx="${x}" cy="${y0}" r="${r}" fill="${c}" fill-opacity="${o}">${anim('cy', `${y0};${y1}`, dur, begin)}${anim('opacity', '0;1;0', dur, begin)}</circle>`;
    const note = (x, y, dur, begin) => `<g transform="translate(${x} ${y})"><g>${move('translate', '0 0;4 -26', dur, begin)}${anim('opacity', '0;1;0', dur, begin)}<ellipse rx="3.2" ry="2.3" transform="rotate(-20)" fill="#ff4f9a"/><path d="M2.7 -.6V-9.5L7 -8" fill="none" stroke="#ff4f9a" stroke-width="1.6" stroke-linecap="round"/></g></g>`;

    /* ----- wreaths: a 144 box with the picture in the middle (a circle of radius 50 around 72,72 stays clear) ----- */
    const wreath = {};
    wreath.bobacup = svg(144, 144,
      `<g><g clip-path="url(#in)"><g>${move('translate', '0 0;-144 0', 3.4)}<path d="M0 100Q18 92 36 100T72 100T108 100T144 100T180 100T216 100T252 100T288 100V150H0Z" fill="url(#tea)" fill-opacity=".62"/></g><g>${move('translate', '-144 0;0 0', 4.6)}<path d="M0 106Q18 99 36 106T72 106T108 106T144 106T180 106T216 106T252 106T288 106V150H0Z" fill="#ff8fc7" fill-opacity=".5"/></g></g></g>`
      + `<circle cx="72" cy="72" r="54" fill="none" stroke="#bfe3ff" stroke-opacity=".5" stroke-width="8"/><circle cx="72" cy="72" r="58.5" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.6"/><circle cx="72" cy="72" r="49.6" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>`
      + `<path d="M30 54A47 47 0 0 1 58 27" fill="none" stroke="#fff" stroke-opacity=".92" stroke-width="5" stroke-linecap="round">${anim('stroke-opacity', '.92;.55;.92', 3.6)}</path><circle cx="26" cy="68" r="2.6" fill="#fff" fill-opacity=".9"/><path d="M118 96A47 47 0 0 1 104 112" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>`
      + [[36, 113, 9, 4, 2.6, 0], [52, 125, 9.5, 5, 3.1, .8], [72, 130, 10, 4, 2.8, 1.5], [92, 125, 9.5, 5, 3.3, .3], [108, 113, 9, 4, 2.5, 1.1], [26, 97, 7, 3, 3.4, .6], [118, 97, 7, 3, 2.9, 1.8], [62, 135, 6, 3, 2.7, 2.1], [84, 135, 6, 3, 3, .4]].map(p => pearl(p[0], p[1], p[2], { bob: p[3], dur: p[4], begin: p[5] })).join('')
      + rise(46, 112, 84, 2.4, 3.2, 0) + rise(66, 120, 86, 1.8, 2.7, 1.1) + rise(96, 116, 88, 2.2, 3.5, 2) + rise(112, 104, 82, 1.6, 2.4, .6)
      + `<g transform="translate(100 34)"><g>${move('rotate', '-4;4;-4', 3.2)}<g transform="translate(-100 -34)"><path d="M96 30L113 5 122 10 106 36Z" fill="#ffb347"/><path d="M99 26L104 18 109 21 104 30Z" fill="#ff7eb6"/><path d="M104 18L109 10 113 12 108 21Z" fill="#fff" fill-opacity=".7"/><path d="M113 5l9 5" stroke="#e08a24" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="117" cy="7.5" rx="6" ry="2.6" fill="#ffd36e" transform="rotate(27 117 7.5)"/></g></g></g>`
      + `<g transform="translate(24 120)"><g>${bob(3, 2.9)}<circle r="12" fill="#ffd3e8" stroke="#ff9fcb" stroke-width="2"/><ellipse cx="-4" cy="-5" rx="3.4" ry="2" fill="#fff" fill-opacity=".85" transform="rotate(-35 -4 -5)"/>${face(0, 1, 3.4, { blink: 3.8, begin: .5 })}</g></g>`
      + star(20, 28, 7, '#ffd75e', { tw: 2.2 }) + star(124, 62, 5, '#fff', { tw: 2.8, begin: .7 }) + star(122, 112, 4, '#ffd75e', { tw: 2.4, begin: 1.2 }) + star(40, 14, 3.4, '#fff', { tw: 3, begin: 1.7 })
      + `<g transform="translate(130 86)"><g>${move('translate', '0 0;-3 -22', 4, 0)}${anim('opacity', '0;1;0', 4)}${heart(0, 0, 4.4, '#ff6fae')}</g></g>`,
      `<clipPath id="in"><circle cx="72" cy="72" r="52"/></clipPath>` + grad('tea', '#ffd6ea', '#ff8fc7'));
    wreath.sprout = svg(144, 144,
      `<circle cx="72" cy="72" r="55" fill="none" stroke="#1d1530" stroke-opacity=".55" stroke-width="7"/><circle cx="72" cy="72" r="58.5" fill="none" stroke="#8ee8a0" stroke-opacity=".45" stroke-width="2">${anim('stroke-opacity', '.15;.6;.15', 3)}</circle><circle cx="72" cy="72" r="50.6" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.4"/>`
      + `<g transform="translate(72 18)"><g>${move('rotate', '-5;5;-5', 3.2)}<path d="M0 0Q0 -6 0 -10" stroke="#3aa65a" stroke-width="3.2" stroke-linecap="round" fill="none"/><g transform="translate(0 -10)"><g>${move('rotate', '-8;8;-8', 2.4, .5)}<ellipse cx="-11" cy="-1" rx="12" ry="6" fill="#7be07a" transform="rotate(-24 -11 -1)"/><path d="M-20 -3Q-12 -7 -3 -2" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"/></g><g>${move('rotate', '8;-8;8', 2.7)}<ellipse cx="11" cy="-1" rx="12" ry="6" fill="#4fc46b" transform="rotate(24 11 -1)"/><path d="M20 -4Q13 -7 6 -3" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" fill="none" stroke-linecap="round"/></g><g transform="translate(0 -8)"><g>${move('scale', '.2;1.2;1;1;.2', 5.2)}${flower(0, 0, 5, '#ff9fcb', '#ffd75e')}</g></g></g></g></g>`
      + [[22, 44, 2.4, 0], [122, 54, 2, .8], [30, 112, 2.2, 1.4], [116, 108, 2.6, 2], [74, 134, 1.8, 1.1]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="#d9ff7a">${anim('cy', `${p[1]};${p[1] - 6};${p[1]}`, 3.4, p[3])}${anim('opacity', '.2;1;.2', 2.2, p[3])}</circle>`).join('')
      + star(112, 26, 4, '#fff', { tw: 2.6 }) + star(30, 30, 3.4, '#fff', { tw: 3, begin: 1 }));
    wreath.catphones = svg(144, 144,
      `<g transform="translate(40 38)"><g>${move('rotate', '0;0;-7;0;0', 4.8, 0, 'keyTimes="0;.7;.76;.84;1"')}<g transform="translate(-40 -38)"><path d="M32 40L25 8 58 25Z" fill="#ff9fcb" stroke="#f25fa8" stroke-width="3" stroke-linejoin="round"/><path d="M35 33L31 17 49 26Z" fill="#ffd3e8"/></g></g></g>`
      + `<g transform="translate(104 38)"><g>${move('rotate', '0;0;7;0;0', 5.6, 1.4, 'keyTimes="0;.7;.76;.84;1"')}<g transform="translate(-104 -38)"><path d="M112 40L119 8 86 25Z" fill="#ff9fcb" stroke="#f25fa8" stroke-width="3" stroke-linejoin="round"/><path d="M109 33L113 17 95 26Z" fill="#ffd3e8"/></g></g></g>`
      + `<path d="M16 74C16 12 128 12 128 74" fill="none" stroke="#f25fa8" stroke-width="10" stroke-linecap="round"/><path d="M16 74C16 12 128 12 128 74" fill="none" stroke="#ffb4d6" stroke-width="3.5" stroke-linecap="round"/><path d="M16 74C16 12 128 12 128 74" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="9 260" stroke-dashoffset="${an ? 0 : 150}">${anim('stroke-dashoffset', '268;0', 3.2)}</path>`
      + `<rect x="4" y="60" width="24" height="44" rx="11" fill="#f25fa8"/><rect x="9" y="66" width="14" height="32" rx="7" fill="#ffd3e8"/><g transform="translate(16 82)"><g>${move('scale', '1;1.3;1', 1.2)}${heart(0, 0, 4.4, '#ff4f9a')}</g></g><rect x="116" y="60" width="24" height="44" rx="11" fill="#f25fa8"/><rect x="121" y="66" width="14" height="32" rx="7" fill="#ffd3e8"/><g transform="translate(128 82)"><g>${move('scale', '1;1.3;1', 1.2, .6)}${heart(0, 0, 4.4, '#ff4f9a')}</g></g>`
      + `<path d="M130 104Q132 128 104 128" fill="none" stroke="#f25fa8" stroke-width="4" stroke-linecap="round"/><circle cx="101" cy="128" r="6" fill="#ffd75e" stroke="#e8b33a" stroke-width="2"/><circle cx="101" cy="128" r="2.4" fill="#fff6c8">${anim('opacity', '1;.2;1', 1.6)}</circle>`
      + note(12, 56, 3.6, 0) + note(132, 56, 4.2, 1.6) + star(40, 124, 4, '#fff', { tw: 2.4 }) + star(20, 122, 3, '#ffd75e', { tw: 3, begin: .8 }) + star(72, 6, 3, '#fff', { tw: 2.6, begin: 1.2 }));
    wreath.pearlring = svg(144, 144,
      `<circle cx="72" cy="72" r="54" fill="none" stroke="#ff9fcb" stroke-opacity=".45" stroke-width="4"/><g transform="translate(72 72)"><g>${move('rotate', '0;360', 46)}<g transform="translate(-72 -72)">`
      + Array.from({ length: 14 }, (_, i) => { const a = i * 360 / 14 * Math.PI / 180, x = f1(72 + Math.sin(a) * 54), y = f1(72 - Math.cos(a) * 54); return i % 2 ? flower(x, y, 11, '#ff8fc7', '#ffd75e', { pulse: 2.6, begin: i * .25 }) : pearl(x, y, 7.5, { bob: 1.6, dur: 2.4, begin: i * .2 }); }).join('')
      + `</g></g></g>` + star(14, 40, 4, '#ffd75e', { tw: 2.4 }) + star(130, 100, 4, '#fff', { tw: 2.8, begin: .9 }) + star(30, 130, 3, '#fff', { tw: 3, begin: 1.7 }) + star(122, 26, 3.4, '#ffd75e', { tw: 2.2, begin: 1.1 }));

    /* ----- the profile background: a whole scene of tea, pearls, bubbles and sparkles ----- */
    const bgPearls = [[70, 150, 15, 6, 3.4, 0], [150, 172, 12, 5, 2.8, .7], [230, 146, 17, 7, 3.8, 1.3], [310, 176, 11, 5, 2.6, .2], [390, 152, 14, 6, 3.2, 1.9], [500, 174, 13, 5, 3, .9], [590, 146, 16, 7, 3.6, 1.5], [680, 172, 12, 5, 2.7, .4], [760, 150, 15, 6, 3.3, 2.2], [850, 176, 11, 5, 2.9, 1.1], [940, 148, 16, 7, 3.5, .6], [1030, 172, 13, 5, 3.1, 1.7], [1170, 160, 12, 5, 2.8, 2.5], [30, 182, 9, 4, 2.9, 1.1]];
    const bgWaves = (y, fill, op, dur, dir) => { let d = `M-400 ${y}`; for (let x = -400, k = 0; x < 1600; x += 100, k++) d += `Q${x + 50} ${y + (k % 2 ? 12 : -12)} ${x + 100} ${y}`; return `<g>${move('translate', dir > 0 ? '0 0;400 0' : '400 0;0 0', dur)}<path d="${d}V210H-400Z" fill="${fill}" fill-opacity="${op}"/></g>`; };
    const bg = {};
    bg.boba = svg(1200, 200,
      `<rect width="1200" height="200" fill="url(#sky)"/>`
      + [[90, 40, 26, '#fff', .35], [330, 26, 20, '#ffd3e8', .5], [560, 52, 28, '#fff', .28], [790, 30, 22, '#f5c6ff', .5], [980, 56, 24, '#fff', .35], [1140, 30, 18, '#ffd3e8', .5]].map((hx, k) => `<g>${move('translate', '0 0;18 -6;0 0', 7 + k, k)}${hexP(hx[0], hx[1], hx[2], '#fff', {})}<polygon points="${[0, 1, 2, 3, 4, 5].map(m => { const a = (60 * m - 30) * Math.PI / 180; return f1(hx[0] + (hx[2] - 5) * Math.cos(a)) + ',' + f1(hx[1] + (hx[2] - 5) * Math.sin(a)); }).join(' ')}" fill="${hx[3]}" fill-opacity="${hx[4]}"/></g>`).join('')
      + `<g transform="translate(1110 -10)"><g>${move('rotate', '-3;3;-3', 5, 0)}<g transform="translate(0 10)"><path d="M0 0H28L36 230H-8Z" fill="#ffb347"/><path d="M5 0H10L13 230H0Z" fill="#ff7eb6"/><path d="M18 0H23L28 230H16Z" fill="#ff7eb6"/><path d="M0 0H28" stroke="#fff" stroke-opacity=".5" stroke-width="3"/></g></g></g>`
      + bgWaves(92, '#ff9ecb', .75, 10, 1) + bgWaves(104, '#ffc2df', .8, 13, -1) + `<rect x="0" y="116" width="1200" height="84" fill="url(#tea)"/>` + bgWaves(112, '#fff', .35, 16, 1)
      + bgPearls.map(p => pearl(p[0], p[1], p[2], { bob: p[3], dur: p[4], begin: p[5] })).join('')
      + `<g transform="translate(440 138)"><g>${bob(8, 3.6, .5)}<circle r="24" fill="#ffe0ef" stroke="#ff9fcb" stroke-width="3"/><ellipse cx="-8" cy="-10" rx="6.5" ry="3.8" fill="#fff" fill-opacity=".85" transform="rotate(-35 -8 -10)"/>${face(0, 3, 6.4, { begin: .2 })}</g></g>`
      + `<g transform="translate(870 146)"><g>${bob(7, 3.1, 1.2)}<circle r="20" fill="#4a2f73"/><circle cx="-2" cy="-2" r="14.5" fill="#6a43ad"/><ellipse cx="-7" cy="-8" rx="5.5" ry="3.1" fill="#fff" fill-opacity=".85" transform="rotate(-35 -7 -8)"/>${face(0, 3.6, 5.4, { begin: 1, blink: 3.6 })}</g></g>`
      + [[40, 200, 110, 4, 6, 0], [130, 200, 120, 3, 5, 1.4], [210, 200, 100, 5, 7, 2.6], [290, 200, 125, 3, 5.4, .8], [380, 200, 108, 4, 6.4, 3.1], [470, 200, 118, 3, 5, 1.9], [560, 200, 104, 5, 6.8, 2.2], [650, 200, 122, 3, 5.6, .5], [740, 200, 106, 2.4, 4.8, 3.4], [820, 200, 118, 2.6, 5.2, 4], [910, 200, 112, 4, 6.2, 1.2], [1000, 200, 124, 3, 5.4, 2.9], [1080, 200, 104, 4, 6.6, .3], [1160, 200, 118, 3, 5.2, 3.6]].map(b => rise(b[0], b[1], b[2], b[3], b[4], b[5])).join('')
      + [[60, 24, 8, 2.4, 0], [180, 60, 6, 2.8, .6], [270, 18, 9, 2.2, 1.1], [470, 22, 7, 3, 1.7], [640, 70, 6, 2.6, .3], [720, 18, 8, 2.4, 1.4], [900, 24, 7, 3.2, 2.2], [1050, 70, 5, 2.7, .9], [1180, 20, 7, 2.9, 1.8]].map(p => star(p[0], p[1], p[2], p[0] % 2 ? '#ffd75e' : '#fff', { tw: p[3], begin: p[4], spin: 8 })).join('')
      + [[150, 48, 9, 7, 0], [420, 34, 8, 6, 2], [840, 56, 10, 8, 4], [1000, 30, 8, 6, 1]].map(p => flower(p[0], p[1], p[2], '#fff', '#ffd75e', { spin: p[3] * 4, begin: p[4] })).join('')
      + [[230, 100, 0], [600, 96, 2.5], [960, 100, 5]].map(p => `<g transform="translate(${p[0]} ${p[1]})"><g>${move('translate', '0 0;10 -70', 7, p[2])}${anim('opacity', '0;.9;0', 7, p[2])}${heart(0, 0, 8, '#ff6fae')}</g></g>`).join(''),
      grad('sky', '#fff0f8', '#ffc9e4') + grad('tea', '#ff9ecb', '#ee6fae'));

    /* ----- nameplates (a 240 x 44 strip that is stretched to fill the row) ----- */
    const plate = {};
    plate.bubbletea = svg(240, 44,
      `<rect width="240" height="44" fill="url(#milk)"/><g>${move('translate', '0 0;-60 0', 9)}<path d="M-60 34Q-45 26 -30 34T0 34T30 34T60 34T90 34T120 34T150 34T180 34T210 34T240 34T270 34V44H-60Z" fill="#ff9ecb" fill-opacity=".45"/></g>`
      + `<g>${move('translate', '0 0;-60 0', 14)}${Array.from({ length: 10 }, (_, i) => pearl(i * 30 + 8, 37 + (i % 3), 5.2 + (i % 2), {})).join('')}</g>`
      + [[20, 44, 6, 2.6, 4.2, 0], [60, 44, 10, 1.8, 3.4, 1.1], [110, 44, 4, 2.4, 4.8, 2.3], [160, 44, 8, 2, 3.8, .6], [205, 44, 5, 2.6, 4.4, 1.7]].map(b => rise(b[0], b[1], b[2], b[3], b[4], b[5])).join('')
      + star(30, 12, 3.6, '#fff', { tw: 2.4 }) + star(98, 30, 3, '#ffd75e', { tw: 2.9, begin: .8 }) + star(150, 10, 3.6, '#fff', { tw: 2.2, begin: 1.4 }) + star(214, 22, 3.2, '#ffd75e', { tw: 3, begin: .3 })
      + `<g transform="translate(228 4)"><g>${move('rotate', '-4;4;-4', 3, 0)}<path d="M-2 0L6 -10 10 -8 2 4Z" fill="#ffb347"/><path d="M0 0L3 -5 6 -3 3 2Z" fill="#ff7eb6"/></g></g>`,
      grad('milk', '#ffe1f0', '#f7b3d2'));
    plate.hexcandy = svg(240, 44,
      `<rect width="240" height="44" fill="#2b1b3d"/>`
      + Array.from({ length: 24 }, (_, i) => { const row = Math.floor(i / 8), col = i % 8, cols = ['#ff8fc7', '#b69cff', '#8ee8d0', '#ffd75e', '#ff8fc7', '#b69cff']; const x = col * 33 + (row % 2 ? 16 : 0), y = row * 17 + 6; return hexP(x, y, 14.5, cols[(col + row * 2) % cols.length], { pulse: 2.4 + (i % 4) * .5, begin: i * .31, lo: .45 }); }).join('')
      + `<g>${move('translate', '-240 0;0 0', 11)}<rect x="0" y="0" width="30" height="44" fill="#fff" fill-opacity=".14" transform="skewX(-20)"/></g>`
      + star(26, 10, 4, '#fff', { tw: 2.2 }) + star(120, 24, 3.4, '#ffd75e', { tw: 2.6, begin: .9 }) + star(204, 12, 4, '#fff', { tw: 2, begin: 1.5 }) + star(70, 36, 3, '#fff', { tw: 3, begin: .4 }));
    return { wreath, bg, plate };
  }
  const has = (list, id) => list.some(x => x.id === id);
  const plate = id => PLATES.find(p => p.id === id) || PLATES[0];
  const plateOk = id => !!id && id !== 'none' && has(PLATES, id);
  const banner = id => BANNERS.find(b => b.id === id) || null;
  const cleanTag = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const tagOk = s => /^[A-Z0-9]{2,4}$/.test(cleanTag(s));
  const color = c => (TAG_COLORS.some(x => x[0] === c) ? c : TAG_COLORS[0][0]);
  const glyph = g => (TAG_GLYPHS.some(x => x[0] === g) ? g : '');
  // your profile decorations (one record per account)
  const normProfile = r => ({ plate: r && has(PLATES, r.plate) ? r.plate : 'none', bg: r && has(BACKGROUNDS, r.bg) && r.bg !== 'none' ? r.bg : '', wreath: r && has(WREATHS, r.wreath) && r.wreath !== 'none' ? r.wreath : '', animate: !(r && r.animate === false) });
  // the server's look and the tag a profile can wear (kept on the server record)
  const normServer = r => ({ tag: r && tagOk(r.tag) ? cleanTag(r.tag) : '', tagColor: color(r && r.tagColor), tagGlyph: glyph(r && r.tagGlyph), bannerPreset: r && banner(r.bannerPreset) ? r.bannerPreset : '', bannerImg: r && typeof r.bannerImg === 'string' && r.bannerImg.startsWith('data:image/') ? r.bannerImg : '' });
  const bannerCss = s => (s.bannerImg ? `url("${s.bannerImg}") center / cover` : s.bannerPreset ? banner(s.bannerPreset).css : '');
  // generated members get a nameplate or a tag now and then (scenery, same seed gives the same people)
  const hash = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const ghostPlate = id => { const n = hash('plate' + id); return n % 100 < 28 ? PLATES[1 + (n >>> 8) % (PLATES.length - 1)].id : 'none'; };
  const ghostTag = id => { const n = hash('tag' + id); if (n % 100 >= 22) return null; const words = ['MOON', 'FOX', 'KOI', 'ZEN', 'ASH', 'OWL', 'IVY', 'NOVA', 'RAIN', 'JAZZ']; return { tag: words[(n >>> 8) % words.length], tagColor: TAG_COLORS[(n >>> 12) % TAG_COLORS.length][0], tagGlyph: TAG_GLYPHS[(n >>> 16) % TAG_GLYPHS.length][0] }; };
  const ghostWreath = id => { const n = hash('wreath' + id); return n % 100 < 16 ? WREATHS[1 + (n >>> 8) % (WREATHS.length - 1)].id : ''; };
  return { buildArt, plateOk, uri, BACKGROUNDS, WREATHS, THEMES, ghostWreath, PLATES, TAG_COLORS, TAG_GLYPHS, BANNERS, plate, banner, cleanTag, tagOk, normProfile, normServer, bannerCss, ghostPlate, ghostTag };
})();
if (typeof module !== 'undefined') module.exports = DecoCore;

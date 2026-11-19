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
    { id: 'lanternglow', name: 'Lantern Glow', blurb: 'Red silk, gold waves and tiny swaying lanterns.', anim: true },
    { id: 'goldwaves', name: 'Gold Waves', blurb: 'Rolling gold waves on deep red.', anim: true },
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
    { id: 'lunar', name: 'Lunar', css: 'radial-gradient(circle at 80% 30%,rgba(255,214,102,.9) 0 14px,transparent 15px),repeating-radial-gradient(circle at 20% 120%,rgba(255,200,80,.25) 0 6px,transparent 6px 12px),linear-gradient(160deg,#4a0609,#b3121b 60%,#e5412c)' },
    { id: 'stripes', name: 'Stripes', css: 'repeating-linear-gradient(120deg,rgba(255,255,255,.12) 0 14px,transparent 14px 28px),linear-gradient(135deg,#581c87,#db2777)' },
  ];

  // profile backgrounds (animated, behind your profile picture and name on the profile page) and avatar wreaths (frames around your picture)
  const BACKGROUNDS = [
    { id: 'none', name: 'None', blurb: 'Your own banner picture, or the plain colours.' },
    { id: 'boba', name: 'Bubble Tea Bliss', blurb: 'Pink milk tea, pearls bobbing, sparkles.', anim: true },
    { id: 'lantern', name: 'Lantern Festival Night', blurb: 'Swaying lanterns, fireworks and golden petals.', anim: true },
  ];
  const WREATHS = [
    { id: 'none', name: 'None', blurb: 'Just your picture.' },
    { id: 'bobacup', name: 'Boba Cup', blurb: 'Your picture in a bubble tea dome, with a straw.', anim: true },
    { id: 'sprout', name: 'Sprout', blurb: 'A little seedling growing on top.', anim: true },
    { id: 'catphones', name: 'Cat-ear Headphones', blurb: 'Pink cat ears and a tiny microphone.', anim: true },
    { id: 'pearlring', name: 'Pearl Garland', blurb: 'Pearls and flowers, slowly turning.', anim: true },
    { id: 'redlantern', name: 'Red Lantern', blurb: 'A glowing paper lantern with a swaying tassel.', anim: true },
    { id: 'lotus', name: 'Lotus Flower', blurb: 'Petals that slowly open and close.', anim: true },
    { id: 'koi', name: 'Koi Pond', blurb: 'Two koi swimming in circles.', anim: true },
    { id: 'firecrackers', name: 'Firecrackers', blurb: 'A string of crackers with popping sparks.', anim: true },
    { id: 'envelopes', name: 'Lucky Envelopes', blurb: 'Red envelopes and spinning gold coins.', anim: true },
    { id: 'dragon', name: 'Dragon\'s Smile', blurb: 'A friendly dragon with swaying whiskers.', anim: true },
  ];
  // a theme sets a nameplate, a background and a wreath together
  const THEMES = [
    { id: 'boba', name: 'Kawaii Boba Tea', blurb: 'Pink milk tea, pearls and sparkles.', plate: 'bubbletea', bg: 'boba', wreath: 'bobacup' },
    { id: 'lunar', name: 'Lunar New Year', blurb: 'Red lanterns, gold waves and fireworks.', plate: 'lanternglow', bg: 'lantern', wreath: 'redlantern' },
  ];

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

    /* ===== Lunar New Year: red, gold, lanterns, waves, koi, fireworks ===== */
    const GOLD = '#ffcf4a', GOLD2 = '#e9a21d', RED = '#d2181f', RED2 = '#8e0a12';
    const coin = (x, y, r, o = {}) => `<g transform="translate(${x} ${y})"><g>${o.spin ? A(`<animateTransform attributeName="transform" type="scale" values="1 1;.15 1;1 1" dur="${o.spin}s" begin="${-(o.begin || 0)}s" repeatCount="indefinite"/>`) : ''}<circle r="${r}" fill="${GOLD}" stroke="${GOLD2}" stroke-width="${f1(r * .16)}"/><rect x="${f1(-r * .3)}" y="${f1(-r * .3)}" width="${f1(r * .6)}" height="${f1(r * .6)}" fill="${RED2}"/><path d="M${f1(-r * .6)} ${f1(-r * .5)}A${r} ${r} 0 0 1 ${f1(r * .1)} ${f1(-r * .85)}" stroke="#fff" stroke-opacity=".7" stroke-width="${f1(r * .13)}" fill="none" stroke-linecap="round"/></g></g>`;
    const tassel = (x, y, len, w, c = GOLD) => { let t = ''; for (let i = -2; i <= 2; i++) t += `<path d="M${f1(i * w * .22)} 0Q${f1(i * w * .34)} ${f1(len * .6)} ${f1(i * w * .3)} ${len}" stroke="${c}" stroke-width="${f1(w * .16)}" fill="none" stroke-linecap="round"/>`; return `<g transform="translate(${x} ${y})"><g>${move('rotate', '-6;6;-6', 2.6, x % 3)}<circle r="${f1(w * .3)}" fill="${GOLD2}"/><rect x="${f1(-w * .26)}" y="${f1(w * .16)}" width="${f1(w * .52)}" height="${f1(w * .3)}" fill="${GOLD}"/>${t}</g></g>`; };
    // a small paper lantern, hung from its string at (x,y) (the top of the string is the origin of the sway)
    const lantern = (x, y, sz, sw, o = {}) => `<g transform="translate(${x} ${y})"><g>${move('rotate', `${-sw};${sw};${-sw}`, o.dur || 3.4, o.begin || 0)}<path d="M0 0V${f1(sz * .55)}" stroke="${GOLD2}" stroke-width="1.6"/><g transform="translate(0 ${f1(sz * .55)})"><rect x="${f1(-sz * .22)}" y="0" width="${f1(sz * .44)}" height="${f1(sz * .1)}" rx="2" fill="${GOLD}"/><ellipse cx="0" cy="${f1(sz * .5)}" rx="${f1(sz * .5)}" ry="${f1(sz * .42)}" fill="url(#lan)">${o.glow ? anim('opacity', '.85;1;.85', 2.4, o.begin || 0) : ''}</ellipse><ellipse cx="0" cy="${f1(sz * .5)}" rx="${f1(sz * .2)}" ry="${f1(sz * .42)}" fill="none" stroke="${GOLD}" stroke-opacity=".8" stroke-width="1.2"/><path d="M${f1(-sz * .5)} ${f1(sz * .5)}H${f1(sz * .5)}" stroke="${GOLD}" stroke-opacity=".5" stroke-width="1"/><rect x="${f1(-sz * .22)}" y="${f1(sz * .86)}" width="${f1(sz * .44)}" height="${f1(sz * .1)}" rx="2" fill="${GOLD}"/><g transform="translate(0 ${f1(sz * .96)})">${tassel(0, 0, sz * .5, sz * .3).replace(/^<g transform="translate\(0 0\)">/, '<g>')}</g></g></g></g>`;
    const burst = (x, y, r, c, dur, begin) => `<g transform="translate(${x} ${y})"><g>${move('scale', '.1;1.15', dur, begin)}${anim('opacity', '0;1;1;0', dur, begin, 'keyTimes="0;.15;.6;1"')}${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180, c1 = Math.cos(a), s1 = Math.sin(a); return `<path d="M${f1(c1 * r * .35)} ${f1(s1 * r * .35)}L${f1(c1 * r * .8)} ${f1(s1 * r * .8)}" stroke="${c}" stroke-width="2" stroke-linecap="round"/><circle cx="${f1(c1 * r)}" cy="${f1(s1 * r)}" r="2.2" fill="${i % 2 ? '#fff' : c}"/>`; }).join('')}</g></g>`;
    // overlapping scale-like waves, drawn as one small repeating tile so the picture stays light
    let sgN = 0;
    const seigaiha = (w, hh, c, op) => { const id = 'sg' + (++sgN), r = 14, st = r * .55; let d = ''; for (let k = -1; k <= 4; k++) for (let cx = -r * 2; cx <= r * 4; cx += r * 2) { const x = cx + (k % 2 ? r : 0), y = r + k * st; for (const q of [r, r * .7, r * .4]) d += `M${f1(x - q)} ${f1(y)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x + q)} ${f1(y)}`; } return `<pattern id="${id}" width="${r * 2}" height="${f1(st * 2)}" patternUnits="userSpaceOnUse"><path d="${d}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="1.2"/></pattern><rect x="0" y="0" width="${w + 60}" height="${hh + 20}" fill="url(#${id})"/>`; };
    const lanDefs = `<radialGradient id="lan" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ff7a5c"/><stop offset=".6" stop-color="#d2181f"/><stop offset="1" stop-color="#8e0a12"/></radialGradient>`;

    wreath.redlantern = svg(144, 144,
      `<g transform="translate(72 10)"><g>${move('rotate', '-1.5;1.5;-1.5', 4)}<g transform="translate(-72 -10)"><path d="M72 0V10" stroke="${GOLD2}" stroke-width="2.4"/><rect x="48" y="10" width="48" height="10" rx="3" fill="${GOLD}" stroke="${GOLD2}" stroke-width="1.4"/><path d="M8 70A64 56 0 1 0 136 70A64 56 0 1 0 8 70ZM22 72A50 50 0 1 0 122 72A50 50 0 1 0 22 72Z" fill="url(#lan)" fill-rule="evenodd">${anim('opacity', '.92;1;.92', 2.6)}</path>`
      + [-44, -22, 22, 44].map(dx => `<path d="M${72 + dx * 1.45} ${70 - Math.sqrt(Math.max(0, 1 - (dx * 1.45 / 64) ** 2)) * 56}Q${72 + dx * 1.7} 70 ${72 + dx * 1.45} ${70 + Math.sqrt(Math.max(0, 1 - (dx * 1.45 / 64) ** 2)) * 56}" fill="none" stroke="${GOLD}" stroke-opacity=".75" stroke-width="1.6"/>`).join('')
      + `<circle cx="72" cy="72" r="50.8" fill="none" stroke="${GOLD}" stroke-width="2.4"/><path d="M12 56Q72 40 132 56M12 90Q72 106 132 90" fill="none" stroke="${GOLD}" stroke-opacity=".5" stroke-width="1.2"/><rect x="48" y="124" width="48" height="9" rx="3" fill="${GOLD}" stroke="${GOLD2}" stroke-width="1.4"/><path d="M26 30L36 42M118 30L108 42" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/></g></g></g>`
      + `<g transform="translate(72 133)">${tassel(0, 0, 11, 16).replace(/^<g transform="translate\(0 0\)">/, '<g>')}</g>`
      + `<g transform="translate(15 38)"><g>${move('rotate', '-7;7;-7', 3, .4)}<path d="M0 0V16" stroke="${GOLD2}" stroke-width="1.4"/>${coin(0, 22, 7)}</g></g><g transform="translate(129 44)"><g>${move('rotate', '7;-7;7', 3.4, 1.1)}<path d="M0 0V14" stroke="${GOLD2}" stroke-width="1.4"/>${coin(0, 20, 6)}</g></g>`
      + star(24, 22, 4, '#fff', { tw: 2.4 }) + star(122, 20, 3.4, GOLD, { tw: 2.9, begin: .8 }) + star(130, 112, 3.4, '#fff', { tw: 2.6, begin: 1.4 }), lanDefs);
    wreath.lotus = svg(144, 144,
      `<g transform="translate(72 72)"><g>${move('scale', '1;1.045;1', 4.4)}` + Array.from({ length: 12 }, (_, i) => `<g transform="rotate(${i * 30 + 15})"><path d="M0 -51Q10 -62 0 -71Q-10 -62 0 -51Z" fill="url(#pl1)" stroke="#f08aa8" stroke-width="1"/></g>`).join('')
      + Array.from({ length: 9 }, (_, i) => `<g transform="rotate(${i * 40})"><path d="M0 -50Q8 -59 0 -66Q-8 -59 0 -50Z" fill="url(#pl2)" stroke="#ff9fb8" stroke-width=".8"/><path d="M0 -52V-62" stroke="#fff" stroke-opacity=".6" stroke-width="1"/></g>`).join('') + `</g></g>`
      + `<circle cx="72" cy="72" r="50.4" fill="none" stroke="#ffe6ee" stroke-opacity=".7" stroke-width="1.6"/>` + `<g>${move('translate', '0 0;0 2;0 0', 3.2)}<ellipse cx="42" cy="126" rx="16" ry="5.5" fill="#3aa65a"/><ellipse cx="102" cy="128" rx="14" ry="5" fill="#4fc46b"/><path d="M42 126L52 124M102 128L112 126" stroke="#2c8a49" stroke-width="1.4"/></g>`
      + `<circle cx="72" cy="72" r="64" fill="none" stroke="#9be7ff" stroke-opacity=".4" stroke-width="1.6" stroke-dasharray="3 7">${anim('stroke-opacity', '.1;.5;.1', 3.4)}</circle>` + star(16, 40, 3.4, '#fff', { tw: 2.4 }) + star(128, 38, 3.2, '#ffd75e', { tw: 2.8, begin: 1 }) + star(72, 138, 3, '#fff', { tw: 2.2, begin: .5 }),
      `<linearGradient id="pl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd6e2"/><stop offset="1" stop-color="#ff9db8"/></linearGradient><linearGradient id="pl2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0f4"/><stop offset="1" stop-color="#ffb3c8"/></linearGradient>`);
    const koi = (fill, spots) => `<g><path d="M-26 0Q-22 -7 -14 -3L-14 3Q-22 7 -26 0Z" fill="${fill}" fill-opacity=".85"><animate attributeName="d" values="M-26 0Q-22 -7 -14 -3L-14 3Q-22 7 -26 0Z;M-26 -5Q-22 -8 -14 -3L-14 3Q-22 4 -26 -5Z;M-26 0Q-22 -7 -14 -3L-14 3Q-22 7 -26 0Z" dur="1.1s" repeatCount="indefinite"/></path><path d="M-14 0C-8 -8 8 -8 16 0C8 8 -8 8 -14 0Z" fill="${fill}"/><path d="M2 -6Q7 -13 -5 -10Z" fill="${fill}" fill-opacity=".8"/><path d="M2 6Q7 13 -5 10Z" fill="${fill}" fill-opacity=".8"/>${spots}<circle cx="11" cy="-2.4" r="2" fill="#fff"/><circle cx="11.6" cy="-2.4" r="1" fill="#222"/></g>`;
    wreath.koi = svg(144, 144,
      `<circle cx="72" cy="72" r="56" fill="#0e4a6b" fill-opacity=".35"/><circle cx="72" cy="72" r="58" fill="none" stroke="#9be7ff" stroke-opacity=".5" stroke-width="2.4"/><circle cx="72" cy="72" r="52.6" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>`
      + [[72, 72, 54, 0], [72, 72, 54, 1]].map((c, k) => `<circle cx="72" cy="72" r="${54 - k * 0}" fill="none" stroke="#fff" stroke-opacity="${k ? 0 : .0}"/>`).join('')
      + [0, 1, 2].map(k => `<circle cx="72" cy="72" r="52" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4">${anim('r', '52;64', 4, k * 1.33)}${anim('stroke-opacity', '.5;0', 4, k * 1.33)}</circle>`).join('')
      + `<g transform="translate(72 72)"><g>${move('rotate', '0;360', 15)}<g transform="translate(0 -56) rotate(0)">${koi('#ff7a2e', '<ellipse cx="-1" cy="-1" rx="6" ry="3.4" fill="#fff"/><circle cx="4" cy="1" r="2.2" fill="#d2181f"/>')}</g><g transform="rotate(180) translate(0 -56)">${koi('#ffb347', '<ellipse cx="-3" cy="0" rx="5" ry="3" fill="#fff"/><circle cx="3" cy="-1" r="2" fill="#ff5a2e"/>')}</g></g></g>`
      + `<g transform="translate(124 120)"><g>${bob(2, 3)}<ellipse rx="9" ry="4.4" fill="#3aa65a" transform="rotate(-18)"/><path d="M0 0L7 -3" stroke="#1d7a3a" stroke-width="1.2"/></g></g><g transform="translate(18 24)"><g>${bob(2, 3.6, 1)}<ellipse rx="7" ry="3.4" fill="#4fc46b" transform="rotate(20)"/></g></g>`);
    const cracker = (a) => `<g transform="translate(${f1(72 + 57 * Math.sin(a * Math.PI / 180))} ${f1(72 - 57 * Math.cos(a * Math.PI / 180))}) rotate(${a - 90})"><rect x="-4.6" y="-9" width="9.2" height="18" rx="2.4" fill="${RED}" stroke="${RED2}" stroke-width="1"/><rect x="-4.6" y="-9" width="9.2" height="3.4" fill="${GOLD}"/><rect x="-4.6" y="5.6" width="9.2" height="3.4" fill="${GOLD}"/><path d="M-2.4 -3.4H2.4M-2.4 0H2.4M-2.4 3.4H2.4" stroke="${GOLD}" stroke-opacity=".7" stroke-width="1"/></g>`;
    wreath.firecrackers = svg(144, 144,
      `<circle cx="72" cy="72" r="55" fill="none" stroke="#1d0a0a" stroke-opacity=".5" stroke-width="3"/><g transform="translate(28 16)"><g>${move('rotate', '-3;3;-3', 3.2)}<g transform="translate(-28 -16)"><path d="M28 16Q10 60 40 112Q56 134 84 132" fill="none" stroke="${GOLD2}" stroke-width="1.8"/>`
      + [-52, -72, -92, -112, -132, -152, -172].map(cracker).join('')
      + `<g transform="translate(28 16)"><circle r="9.6" fill="${RED}" stroke="${GOLD}" stroke-width="2.4"/><path d="M-4 -4L4 4M4 -4L-4 4" stroke="${GOLD}" stroke-width="1.8"/><path d="M-3 9L-4 17M0 9V18M3 9L4 17" stroke="${GOLD}" stroke-width="1.4"/></g>`
      + `<g transform="translate(86 133)"><circle r="2.6" fill="#ffd75e">${anim('r', '1.6;3.6;1.6', .5)}</circle>${burst(0, 0, 11, '#ffd75e', 1.4, 0).replace(/^<g transform="translate\(0 0\)">/, '<g>')}</g></g></g></g>`
      + burst(112, 30, 13, '#ff7a5c', 2.8, 0) + burst(124, 108, 10, '#ffd75e', 3.2, 1.2) + star(120, 60, 3.4, '#fff', { tw: 2.4 }) + star(50, 140, 3, '#ffd75e', { tw: 2.8, begin: .8 }));
    const envelope = (x, y, rot, sc) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><rect x="-13" y="-18" width="26" height="36" rx="3" fill="${RED}" stroke="${RED2}" stroke-width="1.4"/><path d="M-13 -14Q0 -2 13 -14" fill="none" stroke="${GOLD}" stroke-width="1.6"/><path d="M0 -3L6 3 0 9-6 3Z" fill="${GOLD}"/><path d="M-9 -16H9" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/></g>`;
    wreath.envelopes = svg(144, 144,
      `<circle cx="72" cy="72" r="54" fill="none" stroke="${RED}" stroke-opacity=".5" stroke-width="3"/><circle cx="72" cy="72" r="56" fill="none" stroke="${GOLD}" stroke-opacity=".45" stroke-width="1.6"/>`
      + `<g>${bob(3, 3)}${envelope(26, 106, -14, 1.2)}</g><g>${bob(3, 3.6, 1)}${envelope(48, 116, 8, 1.1)}</g><g>${bob(2.4, 3.2, .5)}${envelope(120, 38, 18, .8)}</g>`
      + coin(70, 130, 8, { spin: 3.4 }) + coin(88, 126, 7, { spin: 3, begin: 1 }) + coin(104, 134, 6.4, { spin: 3.8, begin: 2 }) + coin(18, 60, 6, { spin: 3.6, begin: .6 })
      + star(14, 30, 4, '#fff', { tw: 2.4 }) + star(132, 76, 4, GOLD, { tw: 2.8, begin: .9 }) + star(60, 8, 3.4, '#fff', { tw: 2.6, begin: 1.5 }) + star(112, 128, 3, '#fff', { tw: 2.2, begin: .3 }));
    wreath.dragon = svg(144, 144,
      `<g><g>${move('rotate', '-3;3;-3', 2.8)}<path d="M50 24Q36 6 14 10Q30 14 40 32" fill="none" stroke="${GOLD}" stroke-width="3.6" stroke-linecap="round"/><path d="M96 24Q110 6 130 10Q114 14 104 32" fill="none" stroke="${GOLD}" stroke-width="3.6" stroke-linecap="round"/></g></g>`
      + `<path d="M72 8Q96 8 108 26L100 40Q72 30 44 40L36 26Q48 8 72 8Z" fill="${RED}" stroke="${RED2}" stroke-width="2"/><path d="M52 14Q72 6 92 14" fill="none" stroke="${GOLD}" stroke-width="2.4"/><ellipse cx="72" cy="20" rx="13" ry="8" fill="#ff9fb0"/><circle cx="67" cy="20" r="2.2" fill="#8e0a12"/><circle cx="77" cy="20" r="2.2" fill="#8e0a12"/>`
      + `<g transform="translate(52 34)"><circle r="6.4" fill="#fff"/><circle cx="1" cy="1" r="3.2" fill="#222"><animate attributeName="r" values="3.2;3.2;.5;3.2;3.2" keyTimes="0;.88;.92;.96;1" dur="4s" repeatCount="indefinite"/></circle></g><g transform="translate(92 34)"><circle r="6.4" fill="#fff"/><circle cx="-1" cy="1" r="3.2" fill="#222"><animate attributeName="r" values="3.2;3.2;.5;3.2;3.2" keyTimes="0;.88;.92;.96;1" dur="4s" repeatCount="indefinite"/></circle></g>`
      + `<path d="M20 70A52 52 0 0 1 20 74Z" fill="none"/><circle cx="72" cy="74" r="53" fill="none" stroke="${RED}" stroke-width="9"/><circle cx="72" cy="74" r="58" fill="none" stroke="${GOLD}" stroke-width="2.4"/><circle cx="72" cy="74" r="48.6" fill="none" stroke="${GOLD}" stroke-opacity=".6" stroke-width="1.4"/>`
      + [-26, -10, 10, 26].map(dx => `<path d="M${72 + dx - 5} 44L${72 + dx} 56L${72 + dx + 5} 44Z" fill="#fff" stroke="#e6d7b0" stroke-width=".8"/>`).join('') + [-34, -14, 14, 34].map(dx => `<path d="M${72 + dx - 5} 130L${72 + dx} 118L${72 + dx + 5} 130Z" fill="#fff" stroke="#e6d7b0" stroke-width=".8"/>`).join('')
      + `<g transform="translate(18 82)"><g>${move('rotate', '-8;8;-8', 2.6, .3)}<path d="M0 0Q-12 8 -6 24Q-14 14 -2 34" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/></g></g><g transform="translate(126 82)"><g>${move('rotate', '8;-8;8', 2.6, 1)}<path d="M0 0Q12 8 6 24Q14 14 2 34" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/></g></g>`
      + `<g transform="translate(72 128)"><g>${move('rotate', '-4;4;-4', 3)}<path d="M-14 0Q-12 12 0 16Q12 12 14 0" fill="${GOLD}" stroke="${GOLD2}" stroke-width="1.2"/><path d="M-8 2Q0 12 8 2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/></g></g>`
      + `<circle cx="64" cy="14" r="2" fill="#fff" fill-opacity=".6">${anim('cy', '14;2', 2.4)}${anim('opacity', '.7;0', 2.4)}</circle><circle cx="80" cy="14" r="2" fill="#fff" fill-opacity=".6">${anim('cy', '14;2', 2.4, 1.2)}${anim('opacity', '.7;0', 2.4, 1.2)}</circle>` + star(14, 50, 3.4, GOLD, { tw: 2.4 }) + star(130, 54, 3.4, GOLD, { tw: 2.8, begin: .9 }));

    bg.lantern = svg(1200, 200,
      `<rect width="1200" height="200" fill="url(#night)"/>` + `<g>${move('translate', '0 0;-56 0', 40)}${seigaiha(1400, 220, GOLD, .16)}</g>`
      + `<g transform="translate(980 62)"><circle r="34" fill="#ffe6a8" fill-opacity=".18">${anim('r', '32;38;32', 5)}</circle><circle r="24" fill="#ffefc2" fill-opacity=".85"/><circle cx="-6" cy="-4" r="20" fill="#fff8e0" fill-opacity=".5"/></g>`
      + burst(240, 70, 38, '#ffd75e', 4.2, 0) + burst(560, 56, 44, '#ff7a5c', 5.1, 1.7) + burst(800, 80, 34, '#fff', 4.6, 3) + burst(120, 120, 28, '#ff9fb0', 3.8, 2.4) + burst(1090, 130, 30, '#ffd75e', 4.4, .8) + burst(400, 40, 30, '#ffb347', 5.4, 3.6)
      + [[70, 28, 1], [190, 20, 0], [330, 34, 2], [470, 18, 1.4], [640, 30, .6], [760, 16, 2.2], [900, 34, 1.1], [1060, 22, 0.3], [1150, 36, 2.6]].map((l, i) => lantern(l[0], 0, 34 + (i % 3) * 10, 3 + (i % 2) * 1.5, { dur: 3 + i * .3, begin: l[2], glow: true })).join('')
      + `<g>${move('translate', '0 0;0 0', 10)}</g>`
      + Array.from({ length: 16 }, (_, i) => { const x = 40 + i * 74 + (i % 3) * 16, y0 = -10 - (i % 5) * 20, dur = 9 + (i % 4) * 2, b = i * 1.3; return `<g transform="translate(${x} 0)"><g>${move('translate', `0 ${y0};${(i % 2 ? 14 : -14)} 220`, dur, b)}${i % 3 ? `<ellipse rx="3.4" ry="2.2" fill="${GOLD}" transform="rotate(${i * 25})"/>` : coin(0, 0, 5.4, { spin: 2.4 + (i % 3) * .4, begin: i * .3 })}</g></g>`; }).join('')
      + [[110, 150], [480, 168], [700, 160], [1010, 150], [300, 172]].map((p, i) => star(p[0], p[1], 4 + i % 2, i % 2 ? GOLD : '#fff', { tw: 2.2 + i * .3, begin: i * .7, spin: 9 })).join(''),
      `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0306"/><stop offset=".6" stop-color="#8e0a12"/><stop offset="1" stop-color="#c8281c"/></linearGradient>` + lanDefs);
    plate.lanternglow = svg(240, 44,
      `<rect width="240" height="44" fill="url(#silk)"/><g>${move('translate', '0 0;-56 0', 26)}${seigaiha(320, 60, GOLD, .22)}</g>`
      + `<rect width="240" height="44" fill="url(#shade)"/>` + lantern(206, 0, 22, 5, { dur: 3, begin: 0, glow: true }) + lantern(228, 0, 17, 6, { dur: 3.6, begin: 1.2, glow: true })
      + star(30, 12, 3.6, GOLD, { tw: 2.4 }) + star(110, 30, 3, '#fff', { tw: 2.8, begin: .8 }) + star(160, 10, 3.4, GOLD, { tw: 2.2, begin: 1.4 }) + coin(80, 20, 4.6, { spin: 3.2 }),
      `<linearGradient id="silk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b0710"/><stop offset=".6" stop-color="#b3121b"/><stop offset="1" stop-color="#e5412c"/></linearGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>` + lanDefs);
    plate.goldwaves = svg(240, 44,
      `<rect width="240" height="44" fill="#4a0609"/><g>${move('translate', '0 0;-56 0', 18)}${seigaiha(320, 60, GOLD, .55)}</g><g>${move('translate', '-56 0;0 0', 24)}${seigaiha(320, 60, '#ffe9a8', .3)}</g>`
      + `<rect width="240" height="44" fill="url(#vig)"/>` + star(40, 14, 3.4, '#fff', { tw: 2.4 }) + star(150, 30, 3, GOLD, { tw: 2.9, begin: .9 }) + star(214, 12, 3.4, '#fff', { tw: 2.2, begin: 1.5 }),
      `<linearGradient id="vig" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a0306" stop-opacity=".55"/><stop offset=".35" stop-color="#2a0306" stop-opacity="0"/><stop offset=".8" stop-color="#2a0306" stop-opacity="0"/><stop offset="1" stop-color="#2a0306" stop-opacity=".5"/></linearGradient>`);
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

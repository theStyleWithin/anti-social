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
    { id: 'sparkleanime', name: 'Sparkle Streak', blurb: 'A violet glow with a shooting star.', anim: true },
    { id: 'mangapanel', name: 'Manga Panel', blurb: 'Halftone dots, speed lines and a POW.', anim: true },
    { id: 'heartneon', name: 'Heart Neon', blurb: 'Glowing outline hearts on deep magenta.', anim: true },
    { id: 'angrybar', name: 'Angry Row', blurb: 'A trembling red row with a popping vein.', anim: true },
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
    { id: 'anime', name: 'Anime', css: 'radial-gradient(circle at 78% 30%,rgba(255,255,255,.9) 0 3px,transparent 4px),radial-gradient(circle at 30% 60%,rgba(255,255,255,.7) 0 2px,transparent 3px),linear-gradient(160deg,#1b1250,#6d28d9 55%,#f472b6)' },
    { id: 'stripes', name: 'Stripes', css: 'repeating-linear-gradient(120deg,rgba(255,255,255,.12) 0 14px,transparent 14px 28px),linear-gradient(135deg,#581c87,#db2777)' },
  ];

  // profile backgrounds (animated, behind your profile picture and name on the profile page) and avatar wreaths (frames around your picture)
  const BACKGROUNDS = [
    { id: 'none', name: 'None', blurb: 'Your own banner picture, or the plain colours.' },
    { id: 'boba', name: 'Bubble Tea Bliss', blurb: 'Pink milk tea, pearls bobbing, sparkles.', anim: true },
    { id: 'lantern', name: 'Lantern Festival Night', blurb: 'Swaying lanterns, fireworks and golden petals.', anim: true },
    { id: 'animenight', name: 'Anime Night', blurb: 'Starry violet sky, shooting stars and drifting blossoms.', anim: true },
    { id: 'neonhearts', name: 'Neon Hearts', blurb: 'Glowing pixel hearts in pink and cyan.', anim: true },
    { id: 'cometnight', name: 'Comet Night', blurb: 'A blue night with a comet sweeping past.', anim: true },
    { id: 'goldendust', name: 'Golden Dust', blurb: 'Warm light with drifting golden sparks.', anim: true },
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
    { id: 'angry', name: 'Angry', blurb: 'Throbbing red lines and a popping vein.', anim: true },
    { id: 'shy', name: 'Shy', blurb: 'Two bashful hands and floating hearts.', anim: true },
    { id: 'rumbling', name: 'Rumbling', blurb: 'Shaking speed lines and loud marks.', anim: true },
    { id: 'magicgirl', name: 'Magical Girl', blurb: 'A swirling ribbon of stars and hearts.', anim: true },
    { id: 'scholar', name: 'Sakura Scholar', blurb: 'A sailor collar, a red scarf and petals.', anim: true },
    { id: 'sushi', name: 'Sushi Roll', blurb: 'Rice, seaweed and a slice of salmon.', anim: true },
    { id: 'ramen', name: 'Ramen Bowl', blurb: 'A steaming bowl with wiggling noodles.', anim: true },
    { id: 'energy', name: 'Radiating Energy', blurb: 'A purple aura with crackling bolts.', anim: true },
    { id: 'catonesie', name: 'Cat Onesie', blurb: 'A cosy cat hood with twitching ears.', anim: true },
    { id: 'nervous', name: 'Nervous', blurb: 'Sweat drops and a confused question mark.', anim: true },
    { id: 'ghost', name: 'Little Ghost', blurb: 'A shy ghost floating beside you.', anim: true },
    { id: 'sunburst', name: 'Sunburst', blurb: 'Golden rays pulsing outward.', anim: true },
    { id: 'heartbloom', name: 'Heartbloom', blurb: 'Hearts and blossoms in full bloom.', anim: true },
    { id: 'starryeyed', name: 'Starry Eyed', blurb: 'Big gold stars and shining rays.', anim: true },
    { id: 'shocked', name: 'Shocked', blurb: 'Jumpy shock lines and a gasp bubble.', anim: true },
    { id: 'inlove', name: 'In Love', blurb: 'Heart eyes and hearts floating up.', anim: true },
    { id: 'kienergy', name: 'Ki Energy', blurb: 'Blue lightning around a fiery swirl.', anim: true },
    { id: 'intears', name: 'In Tears', blurb: 'Big shiny teardrops.', anim: true },
    { id: 'dismay', name: 'Dismay', blurb: 'A gloomy blue ring with trickling drops.', anim: true },
    { id: 'catears', name: 'Cat Ears', blurb: 'White kitty ears and whiskers.', anim: true },
  ];
  // a theme sets a nameplate, a background and a wreath together
  const THEMES = [
    { id: 'boba', name: 'Kawaii Boba Tea', blurb: 'Pink milk tea, pearls and sparkles.', plate: 'bubbletea', bg: 'boba', wreath: 'bobacup' },
    { id: 'lunar', name: 'Lunar New Year', blurb: 'Red lanterns, gold waves and fireworks.', plate: 'lanternglow', bg: 'lantern', wreath: 'redlantern' },
    { id: 'anime', name: 'Anime', blurb: 'Sparkles, shooting stars and magical ribbons.', plate: 'sparkleanime', bg: 'animenight', wreath: 'magicgirl' },
    { id: 'animehearts', name: 'Anime Hearts', blurb: 'Neon hearts, blossoms and a lot of feelings.', plate: 'heartneon', bg: 'neonhearts', wreath: 'heartbloom' },
    { id: 'animecosmos', name: 'Anime Cosmos', blurb: 'A comet, crackling ki and a night sky.', plate: 'angrybar', bg: 'cometnight', wreath: 'kienergy' },
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
    const koi = (fill, spots) => `<g><path d="M-26 0Q-22 -7 -14 -3L-14 3Q-22 7 -26 0Z" fill="${fill}" fill-opacity=".85">${A('<animate attributeName="d" values="M-26 0Q-22 -7 -14 -3L-14 3Q-22 7 -26 0Z;M-26 -5Q-22 -8 -14 -3L-14 3Q-22 4 -26 -5Z;M-26 0Q-22 -7 -14 -3L-14 3Q-22 7 -26 0Z" dur="1.1s" repeatCount="indefinite"/>')}</path><path d="M-14 0C-8 -8 8 -8 16 0C8 8 -8 8 -14 0Z" fill="${fill}"/><path d="M2 -6Q7 -13 -5 -10Z" fill="${fill}" fill-opacity=".8"/><path d="M2 6Q7 13 -5 10Z" fill="${fill}" fill-opacity=".8"/>${spots}<circle cx="11" cy="-2.4" r="2" fill="#fff"/><circle cx="11.6" cy="-2.4" r="1" fill="#222"/></g>`;
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
      + `<g transform="translate(52 34)"><circle r="6.4" fill="#fff"/><circle cx="1" cy="1" r="3.2" fill="#222">${A('<animate attributeName="r" values="3.2;3.2;.5;3.2;3.2" keyTimes="0;.88;.92;.96;1" dur="4s" repeatCount="indefinite"/>')}</circle></g><g transform="translate(92 34)"><circle r="6.4" fill="#fff"/><circle cx="-1" cy="1" r="3.2" fill="#222">${A('<animate attributeName="r" values="3.2;3.2;.5;3.2;3.2" keyTimes="0;.88;.92;.96;1" dur="4s" repeatCount="indefinite"/>')}</circle></g>`
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

    /* ===== Anime: manga-style effects, sparkles, magical ribbons, food and cute creatures ===== */
    const INK = '#241633', PINK = '#ff7eb6', VIOLET = '#8b5cf6';
    const sparkleBig = (x, y, sz, c, o = {}) => `<g transform="translate(${x} ${y})"><g>${move('scale', '.6;1.15;.6', o.dur || 2.2, o.begin || 0)}${move('rotate', '0;45;0', o.dur || 2.2, o.begin || 0)}<path d="M0 ${-sz}Q${f1(sz * .18)} ${f1(-sz * .18)} ${sz} 0Q${f1(sz * .18)} ${f1(sz * .18)} 0 ${sz}Q${f1(-sz * .18)} ${f1(sz * .18)} ${-sz} 0Q${f1(-sz * .18)} ${f1(-sz * .18)} 0 ${-sz}Z" fill="${c}"/></g></g>`;
    const bubbleMark = (x, y, r, glyph, dur, begin) => `<g transform="translate(${x} ${y})"><g>${bob(2.4, dur || 2.6, begin || 0)}<circle r="${r}" fill="#fff" stroke="${INK}" stroke-width="1.6"/>${glyph}</g></g>`;
    const exclaim = r => `<rect x="${f1(-r * .13)}" y="${f1(-r * .6)}" width="${f1(r * .26)}" height="${f1(r * .75)}" rx="1" fill="${INK}"/><circle cy="${f1(r * .45)}" r="${f1(r * .17)}" fill="${INK}"/>`;
    const veinMark = (x, y, sz, c) => `<g transform="translate(${x} ${y})"><g>${move('scale', '1;1.3;1', .7)}${move('rotate', '-8;8;-8', .5)}${[0, 90, 180, 270].map(a => `<path transform="rotate(${a})" d="M${f1(sz * .22)} ${f1(-sz * .22)}Q${f1(sz * .22)} ${-sz} ${sz} ${-sz}Q${sz} ${f1(-sz * .22)} ${f1(sz * .22)} ${f1(-sz * .22)}Z" fill="${c}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}</g></g>`;
    wreath.angry = svg(144, 144,
      [-1, 1].map(sd => `<path d="M${72 + sd * 50} 46A56 56 0 0 ${sd > 0 ? 1 : 0} ${72 + sd * 50} 98" fill="none" stroke="#e5322d" stroke-width="4.5" stroke-linecap="round">${anim('stroke-opacity', '1;.25;1', .8)}</path><path d="M${72 + sd * 58} 52A62 62 0 0 ${sd > 0 ? 1 : 0} ${72 + sd * 58} 92" fill="none" stroke="#ff7a6a" stroke-width="2.6" stroke-linecap="round">${anim('stroke-opacity', '.2;.9;.2', .8, .4)}</path>`).join('')
      + veinMark(116, 26, 13, '#e5322d') + veinMark(128, 78, 8, '#ff5a4a') + bubbleMark(20, 118, 9, exclaim(9), 2.2, 0) + bubbleMark(38, 132, 6, exclaim(6), 2.6, .7), '');
    const hand = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="17" ry="8.4" fill="#f7b3c2" stroke="#e58aa0" stroke-width="1.4"/><path d="M-6 -7V-1M0 -8V0M6 -7V-1" stroke="#e58aa0" stroke-width="1.2" stroke-linecap="round"/></g>`;
    wreath.shy = svg(144, 144,
      `<g>${move('translate', '0 0;2.2 0;0 0', 2.4)}${hand(55, 128, 16)}</g><g>${move('translate', '0 0;-2.2 0;0 0', 2.4)}${hand(89, 128, -16)}</g>`
      + [[22, 40, 3.2, 0], [124, 34, 2.8, .9], [12, 90, 2.4, 1.6], [132, 100, 3, 2.2]].map(p => `<g>${move('translate', '0 0;0 -5;0 0', 2.8, p[3])}${heart(p[0], p[1], p[2], '#ff7eb6')}</g>`).join('')
      + `<ellipse cx="46" cy="104" rx="7" ry="3.6" fill="#ff7eb6" fill-opacity=".45">${anim('fill-opacity', '.25;.6;.25', 2.4)}</ellipse><ellipse cx="98" cy="104" rx="7" ry="3.6" fill="#ff7eb6" fill-opacity=".45">${anim('fill-opacity', '.25;.6;.25', 2.4)}</ellipse>` + star(30, 14, 3.4, '#fff', { tw: 2.4 }) + star(116, 12, 3, '#ffd6e8', { tw: 2.8, begin: 1 }));
    const sfx = (x, y, rot, sc) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><path d="M-14 -8L10 -12 6 -2 16 -4 -6 10 -2 0Z" fill="${INK}" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></g>`;
    wreath.rumbling = svg(144, 144,
      `<g>${move('translate', '0 0;1.6 -1.2;-1.6 1.2;0 0', .35)}` + Array.from({ length: 28 }, (_, i) => { const a = i * 360 / 28 * Math.PI / 180, r1 = 55, r2 = 62 + (i % 3) * 4, cl = ['#ff3b30', '#ffb02e', '#fff176'][i % 3]; return `<path d="M${f1(72 + Math.sin(a) * r1)} ${f1(72 - Math.cos(a) * r1)}L${f1(72 + Math.sin(a) * r2)} ${f1(72 - Math.cos(a) * r2)}" stroke="${cl}" stroke-width="2.6" stroke-linecap="round">${anim('stroke-opacity', '1;.3;1', .9, i * .07)}</path>`; }).join('') + `</g>`
      + `<g>${move('translate', '0 0;1.2 .8;-1.2 -.8;0 0', .25)}${sfx(112, 24, -8, 1.1)}${sfx(110, 40, 6, .9)}${sfx(26, 118, -10, 1.1)}${sfx(36, 132, 8, .9)}</g>`);
    wreath.magicgirl = svg(144, 144,
      `<circle cx="72" cy="72" r="56" fill="none" stroke="#c4a1ff" stroke-opacity=".3" stroke-width="8">${anim('stroke-opacity', '.15;.45;.15', 2.8)}</circle><g transform="translate(72 72)"><g>${move('rotate', '0;360', 9)}<g transform="translate(-72 -72)"><path d="M22 72A50 50 0 0 1 72 22A50 50 0 0 1 120 56" fill="none" stroke="url(#rib)" stroke-width="9" stroke-linecap="round"/><path d="M122 84A50 50 0 0 1 72 122A50 50 0 0 1 26 96" fill="none" stroke="url(#rib2)" stroke-width="7" stroke-linecap="round"/>${heart(120, 52, 7, '#ff5fa8')}${heart(24, 100, 5, '#ffb3d6')}${star(72, 20, 5, '#fff')}${star(124, 86, 4, '#ffe58a')}</g></g></g>`
      + sparkleBig(124, 22, 11, '#fff', { dur: 2.6 }) + sparkleBig(18, 120, 8, '#ffe58a', { dur: 2.2, begin: .8 }) + star(14, 30, 3.4, '#ffd6e8', { tw: 2, begin: .4 }) + star(130, 120, 3.4, '#fff', { tw: 2.6, begin: 1.2 }),
      `<linearGradient id="rib" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#f472b6"/></linearGradient><linearGradient id="rib2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f472b6"/><stop offset="1" stop-color="#6d28d9"/></linearGradient>`);
    wreath.scholar = svg(144, 144,
      `<path d="M26 104Q72 136 118 104L108 122Q72 146 36 122Z" fill="#1f7a5a" stroke="#14553e" stroke-width="2" stroke-linejoin="round"/><path d="M30 112Q72 140 114 112" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M34 119Q72 145 110 119" fill="none" stroke="#fff" stroke-width="1.4"/>`
      + `<g transform="translate(72 124)"><g>${move('rotate', '-3;3;-3', 3)}<path d="M0 0L-16 14L-8 18L0 8L8 18L16 14Z" fill="#d2181f" stroke="#8e0a12" stroke-width="1.4" stroke-linejoin="round"/><circle r="5.4" fill="#e5322d" stroke="#8e0a12" stroke-width="1.4"/></g></g>`
      + Array.from({ length: 7 }, (_, i) => `<g transform="translate(${14 + i * 19} 0)"><g>${move('translate', `0 -10;${i % 2 ? 10 : -10} 150`, 6 + (i % 3), i * 1.1)}<g>${A(`<animateTransform attributeName="transform" type="rotate" values="0;360" dur="${3 + i % 3}s" repeatCount="indefinite"/>`)}<path d="M0 -4Q4 -4 4 0Q4 4 0 5Q-4 4 -4 0Q-4 -4 0 -4Z" fill="#ffb3d1" transform="rotate(${i * 30})"/></g></g></g>`).join('')
      + star(18, 40, 3.2, '#fff', { tw: 2.4 }) + star(128, 50, 3, '#ffd6e8', { tw: 2.8, begin: .8 }));
    const grains = n => Array.from({ length: n }, (_, i) => { const a = i * 360 / n * Math.PI / 180, r = 60 + (i % 2 ? 1.5 : -1.5); return `<ellipse cx="${f1(72 + Math.sin(a) * r)}" cy="${f1(72 - Math.cos(a) * r)}" rx="3.4" ry="2.2" fill="#f1efe4" stroke="#d8d4c4" stroke-width=".6" transform="rotate(${f1(i * 360 / n)} ${f1(72 + Math.sin(a) * r)} ${f1(72 - Math.cos(a) * r)})"/>`; }).join('');
    wreath.sushi = svg(144, 144,
      `<circle cx="72" cy="72" r="60" fill="none" stroke="#fbfaf2" stroke-width="13"/>${grains(26)}<circle cx="72" cy="72" r="53" fill="none" stroke="#1f3a2e" stroke-width="5"/><circle cx="72" cy="72" r="50.6" fill="none" stroke="#2f5a46" stroke-width="1.2" stroke-opacity=".7"/>`
      + `<g>${bob(1.6, 3.2)}<path d="M26 28Q72 -6 118 28Q122 40 100 38Q72 26 44 38Q22 40 26 28Z" fill="#ff8a4c" stroke="#e8632a" stroke-width="1.6" stroke-linejoin="round"/><path d="M40 26Q72 6 104 26M48 32Q72 16 96 32M58 20Q72 12 86 20" fill="none" stroke="#ffe0cf" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".9"/><path d="M42 18Q60 8 72 8" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round">${anim('stroke-opacity', '.2;.7;.2', 2.6)}</path></g>`
      + star(14, 120, 3.4, '#fff', { tw: 2.4 }) + star(130, 112, 3, '#ffd75e', { tw: 2.8, begin: 1 }));
    wreath.ramen = svg(144, 144,
      `<path d="M14 100H130Q128 138 72 142Q16 138 14 100Z" fill="#d94b3c" stroke="#8e2a20" stroke-width="2"/><path d="M20 124Q72 142 124 124" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><ellipse cx="72" cy="100" rx="58" ry="8" fill="#f3d78a" stroke="#8e2a20" stroke-width="2"/>`
      + `<g>${move('translate', '0 0;6 0;0 0', 2.6)}${[-30, -14, 2, 18, 34].map((dx, i) => `<path d="M${72 + dx} 100Q${72 + dx + 6} 94 ${72 + dx + 2} 88Q${72 + dx - 4} 82 ${72 + dx + 2} 78" fill="none" stroke="#ffd96b" stroke-width="3" stroke-linecap="round"/>`).join('')}</g>`
      + `<g transform="translate(100 98)"><circle r="9" fill="#fff" stroke="#8e2a20" stroke-width="1.6"/><path d="M-5 0Q0 -6 5 0Q0 6 -5 0" fill="none" stroke="#ff7eb6" stroke-width="2.2"/></g>`
      + `<path d="M18 112L58 92" stroke="#7a4a22" stroke-width="3" stroke-linecap="round"/><path d="M24 118L62 96" stroke="#9a6a38" stroke-width="3" stroke-linecap="round"/>`
      + [[34, 0], [110, 1.2], [72, 2.2]].map(p => `<g>${move('translate', '0 0;0 -12', 2.6, p[1])}<path d="M${p[0]} 92Q${p[0] + 6} 82 ${p[0]} 72Q${p[0] - 6} 62 ${p[0]} 52" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-opacity="${an ? 0 : .45}">${anim('stroke-opacity', '0;.7;0', 2.6, p[1])}</path></g>`).join('')
      + star(20, 26, 3.2, '#fff', { tw: 2.4 }) + star(126, 30, 3, '#ffd75e', { tw: 2.8, begin: .9 }));
    const bolt = (x, y, rot, sc, cl) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><path d="M0 -14L-6 0H0L-3 14L8 -2H1L5 -14Z" fill="${cl}" stroke="#4c1d95" stroke-width="1" stroke-linejoin="round"/></g>`;
    wreath.energy = svg(144, 144,
      `<circle cx="72" cy="72" r="56" fill="none" stroke="#a855f7" stroke-width="7" stroke-opacity=".75">${anim('r', '54;60;54', 1.4)}${anim('stroke-opacity', '.9;.35;.9', 1.4)}</circle><circle cx="72" cy="72" r="62" fill="none" stroke="#7c3aed" stroke-width="3" stroke-opacity=".5">${anim('r', '60;66;60', 1.4, .5)}</circle><circle cx="72" cy="72" r="50.8" fill="none" stroke="#e9d5ff" stroke-width="1.6"/>`
      + [[16, 26, -30, 1.2, 0], [124, 22, 30, 1.2, .4], [130, 100, 60, 1, .9], [14, 108, -50, 1, 1.3], [72, 8, 0, .9, .2]].map(p => `<g>${anim('opacity', '0;1;0;0;1;0', 1.8, p[4], 'keyTimes="0;.1;.2;.6;.7;.8"')}${bolt(p[0], p[1], p[2], p[3], '#fff176')}</g>`).join('')
      + star(40, 128, 3.4, '#e9d5ff', { tw: 1.8 }) + star(112, 132, 3, '#e9d5ff', { tw: 2.2, begin: .7 }));
    wreath.catonesie = svg(144, 144,
      `<g transform="translate(38 36)"><g>${move('rotate', '0;0;-8;0;0', 4.4, 0, 'keyTimes="0;.7;.76;.84;1"')}<g transform="translate(-38 -36)"><path d="M22 52L22 14 56 32Z" fill="#34384a" stroke="#1d2030" stroke-width="2.4" stroke-linejoin="round"/><path d="M27 42L27 24 45 33Z" fill="#ff9fb8"/></g></g></g><g transform="translate(106 36)"><g>${move('rotate', '0;0;8;0;0', 5.2, 1.6, 'keyTimes="0;.7;.76;.84;1"')}<g transform="translate(-106 -36)"><path d="M122 52L122 14 88 32Z" fill="#34384a" stroke="#1d2030" stroke-width="2.4" stroke-linejoin="round"/><path d="M117 42L117 24 99 33Z" fill="#ff9fb8"/></g></g></g>`
      + `<circle cx="72" cy="72" r="56" fill="none" stroke="#34384a" stroke-width="13"/><circle cx="72" cy="72" r="62" fill="none" stroke="#1d2030" stroke-width="1.6"/><circle cx="72" cy="72" r="50" fill="none" stroke="#1d2030" stroke-width="1.6"/><path d="M30 38Q36 30 44 28M114 38Q108 30 100 28" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2.4" stroke-linecap="round"/>`
      + `<g transform="translate(72 132)"><path d="M-14 -4Q0 6 14 -4" fill="none" stroke="#d2181f" stroke-width="3.4" stroke-linecap="round"/><g>${move('rotate', '-10;10;-10', 2)}<circle cy="4" r="6.6" fill="#ffcf4a" stroke="#e0a21a" stroke-width="1.6"/><path d="M-3 2H3M0 2V8" stroke="#e0a21a" stroke-width="1.2"/></g></g>`
      + star(18, 24, 3, '#fff', { tw: 2.6 }) + star(128, 26, 3, '#fff', { tw: 3, begin: .9 }));
    wreath.nervous = svg(144, 144,
      [-1, 1].map((sd, k) => `<path d="M${72 + sd * 56} 40Q${72 + sd * 62} 56 ${72 + sd * 56} 72Q${72 + sd * 50} 88 ${72 + sd * 56} 104" fill="none" stroke="#5aa8ff" stroke-width="2.6" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;${sd * 2} 0;0 0;${-sd * 2} 0;0 0" dur=".5s" repeatCount="indefinite"/></path>`.replace(/<animateTransform[^>]*\/>/, an ? '$&' : '')).join('')
      + [[104, 18, 0], [122, 30, .8]].map(p => `<g transform="translate(${p[0]} ${p[1]})"><g>${move('translate', '0 0;0 18', 1.8, p[2])}${anim('opacity', '1;1;0', 1.8, p[2])}<path d="M0 -9Q8 2 0 8Q-8 2 0 -9Z" fill="#6bb6ff" stroke="#2f7fd6" stroke-width="1.4"/><ellipse cx="-2" cy="1" rx="1.6" ry="3" fill="#fff" fill-opacity=".7"/></g></g>`).join('')
      + bubbleMark(24, 122, 12, `<path d="M-4.4 -3Q-4.4 -7.6 0 -7.6Q4.4 -7.6 4.4 -3Q4.4 -.4 0 1V3.4" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><circle cy="7" r="1.5" fill="${INK}"/>`, 2.4, 0) + star(126, 100, 3, '#fff', { tw: 2.4 }));
    wreath.ghost = svg(144, 144,
      `<circle cx="72" cy="72" r="54" fill="none" stroke="#ffffff" stroke-opacity=".2" stroke-width="3"/><g>${move('translate', '0 0;4 -6;0 0', 3.4)}<path d="M8 40Q8 12 28 12Q48 12 48 40V70Q44 64 40 70Q36 76 32 70Q28 64 24 70Q20 76 16 70Q12 64 8 70Z" fill="#fff" stroke="#cfcfe8" stroke-width="1.6" transform="translate(-2 0)"/><ellipse cx="20" cy="38" rx="3" ry="2.2" fill="#ff9fb8" fill-opacity=".7"/><ellipse cx="38" cy="38" rx="3" ry="2.2" fill="#ff9fb8" fill-opacity=".7"/><path d="M15 32Q18 28 21 32M33 32Q36 28 39 32" fill="none" stroke="#4a3a66" stroke-width="2" stroke-linecap="round"/><path d="M24 40Q28 45 32 40" fill="none" stroke="#4a3a66" stroke-width="1.8" stroke-linecap="round"/><path d="M12 52Q-2 58 4 70" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round">${anim('stroke-opacity', '.2;.7;.2', 2)}</path></g>`
      + star(120, 32, 3.4, '#fff', { tw: 2.4 }) + star(126, 112, 3, '#d8d0ff', { tw: 2.8, begin: .9 }) + star(60, 134, 3, '#fff', { tw: 2.2, begin: 1.4 }));
    wreath.sunburst = svg(144, 144,
      `<g transform="translate(72 72)"><g>${move('scale', '.94;1.08;.94', 1.6)}` + Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180, r1 = 54, r2 = i % 2 ? 62 : 70, cl = i % 3 ? '#ffb02e' : '#fff176'; return `<path d="M${f1(Math.sin(a) * r1)} ${f1(-Math.cos(a) * r1)}L${f1(Math.sin(a) * r2)} ${f1(-Math.cos(a) * r2)}" stroke="${cl}" stroke-width="${i % 2 ? 1.8 : 3}" stroke-linecap="round"/>`; }).join('') + `</g></g><circle cx="72" cy="72" r="51.5" fill="none" stroke="#fff3b0" stroke-width="2.4" stroke-opacity=".8">${anim('stroke-opacity', '.4;1;.4', 1.6)}</circle>` + sparkleBig(124, 24, 8, '#fff', { dur: 1.8 }) + sparkleBig(20, 118, 7, '#fff176', { dur: 2.1, begin: .6 }));

    // the profile background
    bg.animenight = svg(1200, 200,
      `<rect width="1200" height="200" fill="url(#an)"/><circle cx="170" cy="52" r="40" fill="#fff8d8" fill-opacity=".92"/><circle cx="188" cy="44" r="36" fill="url(#an)"/>`
      + Array.from({ length: 46 }, (_, i) => { const x = (i * 197) % 1200, y = (i * 83) % 150; return star(x + 6, y + 6, 1.8 + (i % 3) * .9, i % 4 ? '#fff' : '#ffe58a', { tw: 1.6 + (i % 5) * .5, begin: i * .23 }); }).join('')
      + [[0, 20, 6.5, 0], [0, 60, 8, 2.4], [0, 100, 7, 4.8]].map(p => `<g transform="translate(0 ${p[1]}) rotate(-24)"><g>${move('translate', '1300 -300;-300 400', p[2], p[3])}<path d="M0 0H160" stroke="url(#shoot)" stroke-width="2.6" stroke-linecap="round"/><circle cx="0" cy="0" r="3.2" fill="#fff"/></g></g>`).join('')
      + `<path d="M0 14Q120 0 200 30T380 24" fill="none" stroke="#2b1b3a" stroke-width="8" stroke-linecap="round"/>`
      + [[60, 14], [140, 20], [220, 32], [300, 22], [360, 26]].map((p, i) => `<g>${move('translate', '0 0;3 2;0 0', 3 + i * .4, i * .5)}${flower(p[0], p[1], 9 - (i % 2) * 2, '#ffc2dd', '#ff7eb6', { pulse: 3 + i * .3, begin: i })}</g>`).join('')
      + Array.from({ length: 22 }, (_, i) => { const x = (i * 59) % 1200; return `<g transform="translate(${x} 0)"><g>${move('translate', `0 ${-10 - (i % 5) * 16};${(i % 2 ? 24 : -24)} 215`, 8 + (i % 4) * 1.6, i * .9)}<path d="M0 -4Q4 -4 4 0Q4 4 0 5Q-4 4 -4 0Q-4 -4 0 -4Z" fill="${i % 3 ? '#ffc2dd' : '#fff'}" transform="rotate(${i * 27})"><animateTransform attributeName="transform" type="rotate" values="${i * 27};${i * 27 + 360}" dur="${3 + i % 4}s" repeatCount="indefinite"/></path></g></g>`.replace(/<animateTransform[^>]*\/>/, an ? '$&' : ''); }).join('')
      + [[520, 120, 0], [760, 140, 3], [950, 110, 5.5]].map(p => `<g transform="translate(${p[0]} ${p[1]})"><g>${move('translate', '0 0;8 -64', 7, p[2])}${anim('opacity', '0;.95;0', 7, p[2])}${heart(0, 0, 9, '#ff7eb6')}</g></g>`).join('')
      + `<g transform="translate(1090 78)">${Array.from({ length: 14 }, (_, i) => { const a = i * 360 / 14 * Math.PI / 180; return `<path d="M${f1(Math.sin(a) * 14)} ${f1(-Math.cos(a) * 14)}L${f1(Math.sin(a) * (44 + (i % 2) * 20))} ${f1(-Math.cos(a) * (44 + (i % 2) * 20))}" stroke="#fff" stroke-opacity=".85" stroke-width="2.4" stroke-linecap="round">${anim('stroke-opacity', '.9;.2;.9', 1.8, i * .12)}</path>`; }).join('')}</g>` + sparkleBig(1090, 78, 34, '#fff', { dur: 2.4 }) + sparkleBig(1010, 40, 14, '#ffe58a', { dur: 2.1, begin: .5 }) + sparkleBig(1160, 140, 12, '#ffd6f0', { dur: 2.7, begin: 1 }),
      `<linearGradient id="an" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#150b3d"/><stop offset=".55" stop-color="#5b21b6"/><stop offset="1" stop-color="#f472b6"/></linearGradient><linearGradient id="shoot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`);

    plate.sparkleanime = svg(240, 44,
      `<rect width="240" height="44" fill="url(#sa)"/><g transform="translate(0 6) rotate(-14)"><g>${move('translate', '-120 30;300 -10', 5.5)}<path d="M0 0H110" stroke="url(#sh2)" stroke-width="3" stroke-linecap="round"/></g></g>`
      + [[22, 12, 4], [64, 30, 3], [110, 10, 3.6], [160, 28, 4], [206, 14, 3.4], [234, 32, 3]].map((p, i) => star(p[0], p[1], p[2], i % 2 ? '#ffe58a' : '#fff', { tw: 1.8 + i * .3, begin: i * .4, spin: 6 })).join('') + sparkleBig(196, 22, 8, '#fff', { dur: 2.4 }) + heart(130, 22, 3.6, '#ff9ccb'),
      `<linearGradient id="sa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1170"/><stop offset=".55" stop-color="#7c3aed"/><stop offset="1" stop-color="#f472b6"/></linearGradient><linearGradient id="sh2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`);
    plate.mangapanel = svg(240, 44,
      `<rect width="240" height="44" fill="#fbfaf6"/><g>${move('translate', '0 0;-24 0', 6)}${Array.from({ length: 18 }, (_, c) => Array.from({ length: 3 }, (_, r) => `<circle cx="${c * 12 + (r % 2 ? 6 : 0)}" cy="${r * 14 + 6}" r="${f1(Math.max(.6, 3.2 - c * .17))}" fill="#9a9aa6" fill-opacity=".55"/>`).join('')).join('')}</g>`
      + `<g>${move('translate', '0 0;-30 0', 1.2)}${[6, 14, 24, 33, 40].map((y, i) => `<path d="M${120 + i * 7} ${y}H${230 - i * 6}" stroke="${INK}" stroke-opacity=".5" stroke-width="${i % 2 ? 1 : 1.8}"/>`).join('')}</g>`
      + `<g transform="translate(206 22)"><g>${move('scale', '.9;1.12;.9', .9)}${move('rotate', '-4;4;-4', .9)}<path d="M0 -20L5 -9 16 -14 11 -4 24 0 11 4 16 14 5 9 0 20-5 9-16 14-11 4-24 0-11-4-16-14-5-9Z" fill="#ffe14d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M-9 -3L-3 -5 0 2 4 -5 9 -3 4 5H-4Z" fill="#e5322d"/></g></g>`
      + `<rect x="1" y="1" width="238" height="42" fill="none" stroke="${INK}" stroke-width="2"/>`);

    /* ===== more Anime: feelings, energy and moods ===== */
    const heartOutline = (x, y, sz, c, o = {}) => `<g transform="translate(${x} ${y})"><g>${o.pulse ? move('scale', '1;1.15;1', o.pulse, o.begin || 0) : ''}${anim('opacity', '1;.55;1', o.pulse || 2, o.begin || 0)}<path d="M0 ${f1(sz * .9)}C${f1(-sz * 1.5)} ${f1(-sz * .1)} ${f1(-sz * .6)} ${f1(-sz * 1.1)} 0 ${f1(-sz * .35)}C${f1(sz * .6)} ${f1(-sz * 1.1)} ${f1(sz * 1.5)} ${f1(-sz * .1)} 0 ${f1(sz * .9)}Z" fill="${o.fill || 'none'}" stroke="${c}" stroke-width="${o.w || 2.4}" stroke-linejoin="round"/></g></g>`;
    const floatUp = (x, y, dist, dur, begin, inner) => `<g transform="translate(${x} ${y})"><g>${move('translate', `0 0;${f1(dist * .12)} ${-dist}`, dur, begin)}${anim('opacity', '0;1;1;0', dur, begin, 'keyTimes="0;.15;.7;1"')}${inner}</g></g>`;
    const drop = (x, y, sz, c = '#6bb6ff') => `<path d="M${x} ${y - sz}Q${x + sz * .9} ${y + sz * .2} ${x} ${y + sz * .8}Q${x - sz * .9} ${y + sz * .2} ${x} ${y - sz}Z" fill="${c}" stroke="#2f7fd6" stroke-width="1.2"/><ellipse cx="${f1(x - sz * .25)}" cy="${f1(y + sz * .1)}" rx="${f1(sz * .16)}" ry="${f1(sz * .3)}" fill="#fff" fill-opacity=".7"/>`;
    wreath.heartbloom = svg(144, 144,
      `<circle cx="72" cy="72" r="54" fill="none" stroke="#ffd6e8" stroke-opacity=".28" stroke-width="5"/>`
      + [[26, 108, 11, 2.2, 0], [44, 124, 8, 2.6, .5], [14, 90, 7, 2.4, 1.1], [58, 134, 5, 2, .8], [28, 128, 5, 2.8, 1.5]].map(p => `<g>${move('translate', '0 0;0 -3;0 0', p[3] + 1, p[4])}${heart(p[0], p[1], p[2], p[2] > 8 ? '#ff4f9a' : '#ff8fc0')}</g>`).join('')
      + flower(112, 30, 13, '#ffd6e8', '#ff7eb6', { spin: 18 }) + flower(128, 52, 9, '#fff', '#ffd75e', { spin: 14, begin: 3 }) + flower(98, 16, 7, '#ffb3d1', '#ff7eb6', { spin: 12, begin: 6 }) + flower(126, 112, 8, '#ffd6e8', '#ff7eb6', { pulse: 2.6 })
      + sparkleBig(120, 74, 7, '#fff', { dur: 2 }) + sparkleBig(18, 70, 6, '#ffe58a', { dur: 2.4, begin: .7 }) + star(70, 8, 3, '#fff', { tw: 2.2 }));
    wreath.starryeyed = svg(144, 144,
      `<g transform="translate(72 72)"><g>${move('scale', '.95;1.08;.95', 1.8)}` + Array.from({ length: 32 }, (_, i) => { const a = i * 360 / 32 * Math.PI / 180, r1 = 54, r2 = i % 2 ? 62 : 70; return `<path d="M${f1(Math.sin(a) * r1)} ${f1(-Math.cos(a) * r1)}L${f1(Math.sin(a) * r2)} ${f1(-Math.cos(a) * r2)}" stroke="#e9a21d" stroke-width="${i % 2 ? 1.4 : 2.2}" stroke-linecap="round" stroke-opacity=".85"/>`; }).join('') + `</g></g>`
      + sparkleBig(30, 28, 15, '#ffd23a', { dur: 1.8 }) + sparkleBig(116, 60, 13, '#ffd23a', { dur: 2.1, begin: .5 }) + sparkleBig(24, 112, 11, '#ffe58a', { dur: 2.4, begin: 1 }) + sparkleBig(120, 116, 8, '#fff', { dur: 2, begin: .3 }) + sparkleBig(96, 14, 7, '#fff', { dur: 2.3, begin: .9 }));
    wreath.shocked = svg(144, 144,
      `<g>${move('translate', '0 0;0 -2.4;0 0', .5)}` + [[42, 10, -34], [58, 4, -14], [86, 4, 14], [102, 10, 34]].map(p => `<g transform="translate(${p[0]} ${p[1]}) rotate(${p[2]})"><path d="M0 0L5 14" stroke="#ff2e93" stroke-width="5" stroke-linecap="round"/></g>`).join('') + `</g>`
      + bubbleMark(24, 118, 13, `<path d="M-5 -6L5 -6M0 -6V3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" fill="none"/><circle cy="7" r="1.8" fill="${INK}"/>`, .9, 0)
      + star(124, 32, 3.4, '#ff9ccb', { tw: 1.4 }) + star(126, 110, 3, '#fff', { tw: 1.8, begin: .5 }));
    wreath.inlove = svg(144, 144,
      `<g transform="translate(26 22)"><g>${bob(3, 2.4)}<circle r="17" fill="#fff" stroke="${INK}" stroke-width="1.8"/>${heart(-7, -3, 5.5, '#ff2e63')}${heart(7, -3, 5.5, '#ff2e63')}<path d="M-6 7Q0 13 6 7Q0 9 -6 7Z" fill="#ff2e63" stroke="#c4123b" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="-12" cy="5" rx="3" ry="1.8" fill="#ff9fb8" fill-opacity=".8"/><ellipse cx="12" cy="5" rx="3" ry="1.8" fill="#ff9fb8" fill-opacity=".8"/></g></g>`
      + floatUp(112, 100, 52, 3.2, 0, heart(0, 0, 8, '#ff2e63')) + floatUp(126, 88, 46, 3.6, 1.2, heart(0, 0, 5, '#ff7eb6')) + floatUp(24, 112, 50, 3.4, .6, heart(0, 0, 7, '#ff8fc0')) + floatUp(44, 130, 44, 3, 1.8, heart(0, 0, 5, '#ffb3d6'))
      + star(122, 22, 3.4, '#fff', { tw: 2 }));
    const zag = (pts, c, w, begin) => `<path d="M${pts.map(p => p.join(' ')).join('L')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${anim('stroke-opacity', '1;.1;1;.1;1', .9, begin)}</path>`;
    wreath.kienergy = svg(144, 144,
      `<circle cx="72" cy="72" r="56" fill="none" stroke="#38bdf8" stroke-opacity=".25" stroke-width="8">${anim('stroke-opacity', '.1;.4;.1', 1.4)}</circle><g transform="translate(72 72)"><g>${move('rotate', '0;360', 3.2)}<path d="M0 -58A58 58 0 0 1 58 0" fill="none" stroke="url(#ki)" stroke-width="9" stroke-linecap="round"/><path d="M0 58A58 58 0 0 1 -58 0" fill="none" stroke="url(#ki)" stroke-width="7" stroke-linecap="round"/></g></g>`
      + zag([[20, 58], [28, 50], [24, 42], [34, 34], [30, 26]], '#7de3ff', 3, 0) + zag([[120, 40], [112, 48], [118, 56], [108, 62]], '#bff3ff', 2.6, .3) + zag([[26, 104], [34, 112], [30, 120], [40, 126]], '#7de3ff', 2.6, .6) + zag([[116, 100], [108, 108], [114, 116], [104, 124]], '#bff3ff', 3, .9) + zag([[60, 14], [66, 8], [74, 14], [82, 6]], '#fff', 2.4, .5)
      + sparkleBig(124, 22, 8, '#fff', { dur: 1.6 }) + star(14, 122, 3, '#7de3ff', { tw: 1.4 }),
      `<linearGradient id="ki" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf4a" stop-opacity="0"/><stop offset=".5" stop-color="#ff9a2e"/><stop offset="1" stop-color="#fff0a8"/></linearGradient>`);
    const bigDrop = (x, y, r, begin) => `<g transform="translate(${x} ${y})"><g>${move('scale', '1;1.08;1', 2.6, begin)}<circle r="${r}" fill="#9fd4ff" fill-opacity=".55" stroke="#5aa8ff" stroke-width="1.6"/><ellipse cx="${f1(-r * .3)}" cy="${f1(-r * .35)}" rx="${f1(r * .38)}" ry="${f1(r * .2)}" fill="#fff" fill-opacity=".85" transform="rotate(-30 ${f1(-r * .3)} ${f1(-r * .35)})"/></g></g>`;
    wreath.intears = svg(144, 144,
      `<circle cx="72" cy="72" r="54" fill="none" stroke="#9fd4ff" stroke-opacity=".3" stroke-width="5"/>`
      + bigDrop(26, 24, 10, 0) + bigDrop(46, 14, 7, .8) + bigDrop(114, 20, 8, 1.5) + bigDrop(128, 38, 6, .4) + bigDrop(18, 46, 6, 2) + bigDrop(100, 8, 5, 1.1)
      + floatUp(30, 40, -34, 2.4, 0, drop(0, 0, 5)) + floatUp(118, 42, -36, 2.8, 1, drop(0, 0, 5)) + star(70, 134, 3, '#fff', { tw: 2.2 }));
    wreath.dismay = svg(144, 144,
      `<circle cx="72" cy="72" r="56" fill="none" stroke="url(#gl)" stroke-width="12"/><circle cx="72" cy="72" r="50.8" fill="none" stroke="#a6d0f0" stroke-opacity=".35" stroke-width="1.4"/>`
      + [[22, 70, 0], [124, 74, 1.1], [34, 100, .6], [112, 104, 1.7], [18, 92, 2.1]].map(p => `<g transform="translate(${p[0]} ${p[1]})"><g>${move('translate', '0 0;0 24', 2.4, p[2])}${anim('opacity', '1;1;0', 2.4, p[2])}${drop(0, 0, 4.4, '#7cc4ff')}</g></g>`).join('')
      + `<path d="M24 40Q36 28 52 24M120 40Q108 28 92 24" fill="none" stroke="#7fb4e0" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round">${anim('stroke-opacity', '.2;.6;.2', 3)}</path>`,
      `<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16324f"/><stop offset="1" stop-color="#2e6a9a"/></linearGradient>`);
    wreath.catears = svg(144, 144,
      `<g transform="translate(38 34)"><g>${move('rotate', '0;0;-7;0;0', 4.6, 0, 'keyTimes="0;.7;.76;.84;1"')}<g transform="translate(-38 -34)"><path d="M20 52L20 12 58 30Z" fill="#fff" stroke="#d6cfe6" stroke-width="2" stroke-linejoin="round"/><path d="M26 42L26 22 46 31Z" fill="#ffb3cd"/></g></g></g><g transform="translate(106 34)"><g>${move('rotate', '0;0;7;0;0', 5.2, 1.4, 'keyTimes="0;.7;.76;.84;1"')}<g transform="translate(-106 -34)"><path d="M124 52L124 12 86 30Z" fill="#fff" stroke="#d6cfe6" stroke-width="2" stroke-linejoin="round"/><path d="M118 42L118 22 98 31Z" fill="#ffb3cd"/></g></g></g>`
      + `<circle cx="72" cy="72" r="54" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="5"/>`
      + [-1, 1].map(sd => [[0, -8], [6, 0], [0, 8]].map((p, i) => `<path d="M${72 + sd * 58} ${72 + i * 8 - 6}L${72 + sd * (70 + i * 1)} ${72 + (i - 1) * 9 - 4}" stroke="#3a3350" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 ${72 + sd * 58} ${72 + i * 8 - 6};${sd * 4} ${72 + sd * 58} ${72 + i * 8 - 6};0 ${72 + sd * 58} ${72 + i * 8 - 6}" dur="2.4s" repeatCount="indefinite"/></path>`.replace(/<animateTransform[^>]*\/>/, an ? '$&' : '')).join('')).join('')
      + star(18, 24, 3, '#fff', { tw: 2.6 }) + star(126, 24, 3, '#ffd6e8', { tw: 3, begin: .9 }));

    bg.neonhearts = svg(1200, 200,
      `<rect width="1200" height="200" fill="url(#nh)"/>` + Array.from({ length: 16 }, (_, i) => `<circle cx="${(i * 163) % 1200}" cy="${30 + (i * 59) % 150}" r="${14 + (i % 4) * 8}" fill="${i % 2 ? '#ff4fd8' : '#4fd8ff'}" fill-opacity=".1">${anim('fill-opacity', '.05;.18;.05', 3 + (i % 3), i * .4)}</circle>`).join('')
      + [[110, 100, 34, '#ff4fd8', 2.2, 0], [330, 70, 26, '#4fd8ff', 2.6, .6], [560, 110, 40, '#ff4fd8', 2.4, 1.2], [790, 80, 30, '#4fd8ff', 2.8, .3], [1000, 108, 38, '#ff4fd8', 2.3, .9], [1150, 60, 22, '#fff', 2.5, 1.5]].map(p => heartOutline(p[0], p[1], p[2], p[3], { pulse: p[4], begin: p[5], w: 3 })).join('')
      + `<g>${move('translate', '-300 0;1500 0', 7)}<rect x="0" y="0" width="60" height="200" fill="url(#sc)" transform="skewX(-18)"/></g>`
      + Array.from({ length: 26 }, (_, i) => star((i * 79) % 1200 + 8, (i * 41) % 190 + 6, 2 + (i % 3), i % 2 ? '#fff' : '#ffd1f4', { tw: 1.6 + (i % 4) * .4, begin: i * .21 })).join('')
      + sparkleBig(240, 140, 12, '#fff', { dur: 2.2 }) + sparkleBig(900, 150, 14, '#fff', { dur: 2.6, begin: .8 }),
      `<linearGradient id="nh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b0764"/><stop offset=".5" stop-color="#a21caf"/><stop offset="1" stop-color="#4c1d95"/></linearGradient><linearGradient id="sc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
    bg.cometnight = svg(1200, 200,
      `<rect width="1200" height="200" fill="url(#cn)"/>` + Array.from({ length: 50 }, (_, i) => star((i * 211) % 1200 + 4, (i * 67) % 140 + 4, 1.4 + (i % 3) * .8, '#fff', { tw: 1.8 + (i % 5) * .5, begin: i * .19 })).join('')
      + [[0, 14, 5.5, 0, 1], [0, 54, 7.5, 2.8, .8], [0, 98, 6.5, 5, .7]].map(p => `<g transform="translate(0 ${p[1]}) rotate(-20)"><g>${move('translate', '1400 -420;-500 420', p[2], p[3])}<path d="M0 0L420 -10" stroke="url(#ct)" stroke-width="${f1(7 * p[4])}" stroke-linecap="round"/><path d="M0 0L300 -6" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/><circle r="${f1(9 * p[4])}" fill="#fff"/><circle r="${f1(16 * p[4])}" fill="#bfe6ff" fill-opacity=".4"/></g></g>`).join('')
      + `<g>${move('translate', '0 0;-120 0', 40)}<path d="M-120 200V150Q-60 120 0 150T120 140T240 150T360 138T480 152T600 140T720 150T840 136T960 150T1080 140T1200 150T1320 138V200Z" fill="#0b1633" fill-opacity=".85"/></g><g>${move('translate', '-120 0;0 0', 55)}<path d="M-120 200V170Q-40 150 40 172T200 164T360 174T520 162T680 172T840 160T1000 172T1160 164T1320 170V200Z" fill="#070d22"/></g>`
      + sparkleBig(1080, 50, 12, '#cfeaff', { dur: 2.4 }) + sparkleBig(180, 90, 9, '#fff', { dur: 2 }),
      `<linearGradient id="cn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a24"/><stop offset=".6" stop-color="#14296b"/><stop offset="1" stop-color="#2d5fa8"/></linearGradient><linearGradient id="ct" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#7ccaff" stop-opacity=".7"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient>`);
    bg.goldendust = svg(1200, 200,
      `<rect width="1200" height="200" fill="url(#gd)"/><g>${anim('opacity', '.55;.95;.55', 4)}<path d="M600 -10L470 200H730Z" fill="url(#beam)" fill-opacity=".5"/><path d="M360 -10L250 200H430Z" fill="url(#beam)" fill-opacity=".3"/><path d="M860 -10L800 200H1000Z" fill="url(#beam)" fill-opacity=".3"/></g>`
      + Array.from({ length: 60 }, (_, i) => { const x = (i * 97) % 1200, y = 40 + (i * 53) % 160, r = 1 + (i % 4) * .7; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 3 ? '#ffd76a' : '#fff4c2'}"><animate attributeName="cy" values="${y};${y - 30 - (i % 5) * 8}" dur="${5 + (i % 5)}s" begin="${-(i * .6)}s" repeatCount="indefinite"/>${anim('opacity', '0;1;0', 5 + (i % 5), i * .6)}</circle>`.replace(/<animate attributeName="cy"[^>]*\/>/, an ? '$&' : ''); }).join('')
      + sparkleBig(180, 60, 10, '#fff3b0', { dur: 2.2 }) + sparkleBig(1020, 90, 13, '#fff3b0', { dur: 2.6, begin: .9 }) + sparkleBig(620, 30, 9, '#fff', { dur: 2, begin: .4 }),
      `<linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1c05"/><stop offset=".6" stop-color="#a8560e"/><stop offset="1" stop-color="#f0a030"/></linearGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></linearGradient>`);
    plate.heartneon = svg(240, 44,
      `<rect width="240" height="44" fill="url(#hn)"/>` + [[24, 22, 12, '#ff4fd8', 2, 0], [74, 14, 8, '#4fd8ff', 2.4, .5], [118, 28, 14, '#ff4fd8', 2.2, 1], [168, 14, 9, '#fff', 2.6, .3], [214, 26, 12, '#4fd8ff', 2.3, .8]].map(p => heartOutline(p[0], p[1], p[2], p[3], { pulse: p[4], begin: p[5], w: 2.2 })).join('')
      + star(46, 32, 3, '#fff', { tw: 2 }) + star(96, 8, 3, '#ffd1f4', { tw: 2.4, begin: .6 }) + star(190, 36, 3.4, '#fff', { tw: 2.2, begin: 1.1 }) + `<g>${move('translate', '-80 0;320 0', 5)}<rect x="0" width="30" height="44" fill="#fff" fill-opacity=".14" transform="skewX(-18)"/></g>`,
      `<linearGradient id="hn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b0764"/><stop offset=".5" stop-color="#a21caf"/><stop offset="1" stop-color="#4c1d95"/></linearGradient>`);
    plate.angrybar = svg(240, 44,
      `<g>${move('translate', '0 0;1 .6;-1 -.6;0 0', .3)}<rect width="240" height="44" fill="url(#ab)"/><rect x="40" y="16" width="130" height="12" rx="6" fill="#fff" fill-opacity=".1"/><circle cx="20" cy="22" r="11" fill="#fff" fill-opacity=".14"/></g>`
      + `<g transform="translate(208 22)"><g>${move('scale', '1;1.3;1', .6)}${move('rotate', '-8;8;-8', .45)}${[0, 90, 180, 270].map(a => `<path transform="rotate(${a})" d="M4 -4Q4 -15 15 -15Q15 -4 4 -4Z" fill="#ff3b30" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`).join('')}</g></g>`
      + `<g transform="translate(176 12)"><g>${bob(2, 1.6)}<circle r="7" fill="#fff" stroke="${INK}" stroke-width="1.4"/><rect x="-1.2" y="-4" width="2.4" height="5.4" rx="1" fill="${INK}"/><circle cy="3.8" r="1.3" fill="${INK}"/></g></g>`
      + `<g stroke="#ff5a4a" stroke-width="2.4" stroke-linecap="round"><path d="M4 8V36">${anim('stroke-opacity', '1;.2;1', .8)}</path><path d="M10 12V32">${anim('stroke-opacity', '.2;1;.2', .8)}</path></g>`,
      `<linearGradient id="ab" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b0a0a"/><stop offset=".7" stop-color="#8e1414"/><stop offset="1" stop-color="#c81e1e"/></linearGradient>`);
    return { wreath, bg, plate };
  }
  // the collections the decorations are filed under, so you can find one without scrolling through everything
  const SERIES = [
    { id: 'classic', name: 'Classic', blurb: 'Plain, handsome nameplates.', groups: [{ plate: ['embers', 'aurora', 'tide', 'sakura', 'circuit', 'starfield', 'parchment', 'neon', 'slime', 'prism'] }] },
    { id: 'boba', name: 'Kawaii Boba Tea', blurb: 'Pink milk tea, pearls and sparkles.', groups: [{ plate: ['bubbletea', 'hexcandy'], bg: ['boba'], wreath: ['bobacup', 'sprout', 'catphones', 'pearlring'] }] },
    { id: 'lunar', name: 'Lunar New Year', blurb: 'Red lanterns, gold waves, koi and fireworks.', groups: [{ plate: ['lanternglow', 'goldwaves'], bg: ['lantern'], wreath: ['redlantern', 'lotus', 'koi', 'firecrackers', 'envelopes', 'dragon'] }] },
    { id: 'anime', name: 'Anime', blurb: 'Manga moods, magical girls and sparkles.', groups: [
      { name: 'Sparkle & hearts', plate: ['sparkleanime', 'heartneon'], bg: ['animenight', 'neonhearts'], wreath: ['magicgirl', 'starryeyed', 'heartbloom', 'inlove'] },
      { name: 'Feelings', plate: ['mangapanel', 'angrybar'], wreath: ['angry', 'shy', 'shocked', 'nervous', 'intears', 'dismay', 'ghost'] },
      { name: 'Power & energy', bg: ['cometnight', 'goldendust'], wreath: ['energy', 'kienergy', 'rumbling', 'sunburst'] },
      { name: 'Style & snacks', wreath: ['sushi', 'ramen', 'scholar', 'catonesie', 'catears'] },
    ] },
  ];
  const seriesOfTheme = id => ({ boba: 'boba', lunar: 'lunar', anime: 'anime', animehearts: 'anime', animecosmos: 'anime' }[id] || '');
  const has = (list, id) => list.some(x => x.id === id);
  /* your own decorations (imported from a pack file) are added to the same lists while they are in use: the ones in this
     account, plus the nameplates of other accounts so the account list can draw them. They are marked custom and never
     come up in the "other people" the app makes up (the ghosts). */
  const mine = { own: [], seen: [] };
  const LISTS = { plate: PLATES, banner: BACKGROUNDS, wreath: WREATHS };
  function setCustom(which, records) {
    mine[which] = (records || []).filter(r => r && LISTS[r.dkind] && typeof r.id === 'string');
    for (const list of Object.values(LISTS)) for (let i = list.length - 1; i >= 0; i--) if (list[i].custom) list.splice(i, 1);
    for (const r of [...mine.own, ...mine.seen]) { const list = LISTS[r.dkind]; if (!has(list, r.id)) list.push({ id: r.id, name: r.name || 'Mine', blurb: r.blurb || 'Imported from a file.', anim: !!r.moves, custom: true }); }
  }
  const builtin = list => list.filter(x => !x.custom);
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
  const ghostPlate = id => { const n = hash('plate' + id); return n % 100 < 28 ? builtin(PLATES)[1 + (n >>> 8) % (builtin(PLATES).length - 1)].id : 'none'; };
  const ghostTag = id => { const n = hash('tag' + id); if (n % 100 >= 22) return null; const words = ['MOON', 'FOX', 'KOI', 'ZEN', 'ASH', 'OWL', 'IVY', 'NOVA', 'RAIN', 'JAZZ']; return { tag: words[(n >>> 8) % words.length], tagColor: TAG_COLORS[(n >>> 12) % TAG_COLORS.length][0], tagGlyph: TAG_GLYPHS[(n >>> 16) % TAG_GLYPHS.length][0] }; };
  const ghostWreath = id => { const n = hash('wreath' + id); return n % 100 < 16 ? builtin(WREATHS)[1 + (n >>> 8) % (builtin(WREATHS).length - 1)].id : ''; };
  return { setCustom, SERIES, seriesOfTheme, buildArt, plateOk, uri, BACKGROUNDS, WREATHS, THEMES, ghostWreath, PLATES, TAG_COLORS, TAG_GLYPHS, BANNERS, plate, banner, cleanTag, tagOk, normProfile, normServer, bannerCss, ghostPlate, ghostTag };
})();
if (typeof module !== 'undefined') module.exports = DecoCore;

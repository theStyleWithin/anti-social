#!/usr/bin/env node
'use strict';
/* Checks the decoration-pack importer (www/decopack.js): good files come in, bad shapes and unsafe parts do not.
   Run: node tools/check-deco.js (the Checks workflow runs it on every push). */
const P = require('../www/decopack.js');
let bad = 0; const t = (name, cond, extra) => { if (cond) console.log('ok    ' + name); else { bad++; console.log('FAIL  ' + name + (extra ? '\n        ' + extra : '')); } };
const svg = (w, h, body, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${attrs}>${body}</svg>`;
const pack = items => JSON.stringify({ format: P.FORMAT, v: 1, name: 'Test', author: 'Me', license: 'CC0', items });

/* good files */
const plate = svg(960, 176, '<defs><linearGradient id="g"><stop offset="0" stop-color="#f0f"/><stop offset="1" stop-color="#0ff"/></linearGradient></defs><rect width="960" height="176" fill="url(#g)"><animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite"/></rect><text x="20" y="100" font-size="40">hi &amp; bye</text>');
let r = P.parseFile(pack([{ kind: 'plate', name: 'Neon', art: plate }, { kind: 'wreath', name: 'Ring', art: svg(576, 576, '<circle cx="288" cy="288" r="260" fill="none" stroke="gold" stroke-width="30"/>') }, { kind: 'banner', name: 'Sky', art: svg(2400, 400, '<rect width="2400" height="400" fill="navy"/>') }]), 'x.asdeco');
t('a pack with a nameplate, a wreath and a banner comes in', r.ok && r.items.length === 3 && r.skipped.length === 0, JSON.stringify(r).slice(0, 300));
const it = r.ok ? r.items[0] : {};
t('art is rebuilt at the size the app draws it', /width="240" height="44"/.test(it.art || '') && /viewBox="0 0 960 176"/.test(it.art || ''));
t('a moving nameplate keeps its motion and gets a still version', it.moves && /<animate /.test(it.art) && it.still && !/<animate/.test(it.still));
t('text keeps its words', /hi &amp; bye/.test(it.art || ''));
t('ids are stable and say what kind they are', r.ok && P.isId(it.id) && P.kindOfId(it.id) === 'plate' && P.parseFile(pack([{ kind: 'plate', name: 'again', art: plate }]), 'y').items[0].id === it.id);
const lone = P.parseFile(svg(144, 144, '<circle cx="72" cy="72" r="60" fill="red"/>'), 'my-ring.svg');
t('a lone .svg is recognised by its shape', lone.ok && lone.items[0].kind === 'wreath' && lone.items[0].name === 'my ring');
const back = P.parseFile(P.buildPack({ name: 'Round trip' }, r.items.map(x => ({ dkind: x.kind, name: x.name, blurb: x.blurb, art: x.art, still: x.still }))), 'z');
t('a pack written by the app reads back the same', back.ok && back.items.length === 3 && back.items.every((x, i) => x.id === r.items[i].id));


/* pictures, animated pictures and video */
const b64 = a => 'base64,' + Buffer.from(a).toString('base64');
const png = (w, h, extra = []) => 'data:image/png;' + b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, w >>> 24, w >>> 16 & 255, w >>> 8 & 255, w & 255, h >>> 24, h >>> 16 & 255, h >>> 8 & 255, h & 255, 8, 6, 0, 0, 0, ...extra]);
const gif = (w, h, frames) => 'data:image/gif;' + b64([71, 73, 70, 56, 57, 97, w & 255, w >> 8, h & 255, h >> 8, 0, 0, 0, ...Array.from({ length: frames }, () => [0x21, 0xf9, 4, 0, 10, 0, 0, 0]).flat()]);
r = P.parseFile(pack([{ kind: 'plate', name: 'Pic', image: png(960, 176) }, { kind: 'wreath', name: 'Spin', image: gif(512, 512, 6) }, { kind: 'banner', name: 'Still gif', image: gif(1200, 200, 1) }]), 'm.asdeco');
t('a pack can hold PNG and GIF pictures', r.ok && r.items.length === 3 && r.items.every(i => i.mode === 'image'), JSON.stringify(r).slice(0, 200));
t('an animated GIF is known to move, a one-frame GIF and a PNG do not', r.ok && r.items[1].moves && !r.items[0].moves && !r.items[2].moves);
t('an APNG is known to move', P.parseFile(pack([{ kind: 'plate', name: 'a', image: png(960, 176, [0, 0, 0, 8, 0x61, 0x63, 0x54, 0x4c]) }])).items[0].moves);
t('a picture of the wrong shape is refused with the shape to use', (() => { const x = P.parseFile(pack([{ kind: 'wreath', name: 'w', image: png(400, 100) }])); return !x.ok && /144/.test(x.error); })());
t('a banner can be a different shape and is cropped to fit, within reason', P.parseFile(pack([{ kind: 'banner', name: 'b', image: png(1600, 300) }])).ok && !P.parseFile(pack([{ kind: 'banner', name: 'b', image: png(500, 500) }])).ok);
t('a picture that is not really a picture is refused', !P.parseFile(pack([{ kind: 'plate', name: 'x', image: 'data:image/png;base64,AAAA' }])).ok && !P.parseFile(pack([{ kind: 'plate', name: 'x', image: 'data:text/html;base64,PGI+' }])).ok);
t('a huge picture is refused', !P.parseFile(pack([{ kind: 'plate', name: 'x', image: png(960, 176, new Array(500000).fill(0)) }])).ok);
t('a video is kept for the app to turn into frames', (() => { const x = P.parseFile(pack([{ kind: 'banner', name: 'Clip', video: 'data:video/mp4;' + b64([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]) }])); return x.ok && x.items[0].mode === 'video' && x.items[0].moves && x.items[0].src.startsWith('data:video/mp4'); })());
t('a video that is too big is refused', !P.parseFile(pack([{ kind: 'banner', name: 'Clip', video: 'data:video/mp4;' + b64(new Array(3.5 * 1048576).fill(1)) }])).ok);
t('a picture file is recognised by its shape', P.parseMedia(png(1024, 1024), 'ring.png').items[0].kind === 'wreath' && P.parseMedia(png(2400, 400), 'sky.png').items[0].kind === 'banner' && !P.parseMedia(png(300, 900), 'tall.png').ok);
t('a pack with pictures reads back the same after writing', (() => { const rec = r.items.map(x => ({ dkind: x.kind, name: x.name, blurb: '', art: x.art, mode: x.mode, still: x.still })); const b = P.parseFile(P.buildPack({ name: 'rt' }, rec), 'z'); return b.ok && b.items.length === 3 && b.items.every((x, i) => x.id === r.items[i].id); })());

/* wrong shapes and wrong files */
t('a nameplate that is square is refused, with the size to use', (() => { const x = P.parseFile(pack([{ kind: 'plate', name: 'x', art: svg(100, 100, '<rect width="100" height="100"/>') }])); return !x.ok && /240 × 44/.test(x.error); })());
t('a wreath that is not square is refused', !P.parseFile(pack([{ kind: 'wreath', name: 'x', art: svg(200, 100, '<rect width="1" height="1"/>') }])).ok);
t('some bad items do not stop the good ones', (() => { const x = P.parseFile(pack([{ kind: 'plate', name: 'ok', art: plate }, { kind: 'plate', name: 'bad', art: 'nope' }, { kind: 'cat', name: 'odd', art: plate }])); return x.ok && x.items.length === 1 && x.skipped.length === 2; })());
t('other JSON is refused', !P.parseFile('{"a":1}').ok && !P.parseFile('hello').ok);
t('a newer pack version asks for an update', /newer/.test(P.parseFile(JSON.stringify({ format: P.FORMAT, v: 9, items: [1] })).error));

/* unsafe parts */
const evil = svg(240, 44, '<script>alert(1)</script><foreignObject><div>hi</div></foreignObject><rect width="240" height="44" fill="red" onclick="alert(1)" style="fill:url(http://evil.test/x)"/><image href="https://evil.test/a.png" width="10" height="10"/><image href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" width="10" height="10"/><use href="http://evil.test/x.svg#a"/><a href="javascript:alert(1)"><rect width="5" height="5"/></a><circle r="5" fill="url(&#104;ttp://evil.test/x)"/><animate attributeName="href" to="javascript:alert(1)"/><style>@import url(http://evil.test/x.css); rect{fill:red}</style>');
const e = P.cleanSvg(evil, 'plate');
t('scripts, foreign content, handlers, links and imports are all dropped', e.ok && !/script|foreignObject|onclick|evil|javascript|@import|<a\b|<use|<style|<image|href/i.test(e.svg), e.svg);
t('a rectangle is still there after the cleaning', e.ok && /<rect /.test(e.svg));
t('a DOCTYPE or entity trick is refused', !P.cleanSvg('<!DOCTYPE svg [<!ENTITY a "aaaa">]>' + svg(240, 44, '<text>&a;</text>'), 'plate').ok);
t('a broken tag is refused', !P.cleanSvg('<svg viewBox="0 0 240 44"><rect></svg>', 'plate').ok);
t('an unknown entity is not let through', (() => { const x = P.cleanSvg(svg(240, 44, '<text>a&zzz;b</text>'), 'plate'); return x.ok && !/zzz/.test(x.svg); })());
t('an embedded picture (png data) is allowed', P.cleanSvg(svg(240, 44, '<image href="data:image/png;base64,iVBORw0KGgo=" width="240" height="44"/>'), 'plate').svg.includes('data:image/png;base64'));
t('a font embedded as data is allowed, other css is not', (() => { const a = P.cleanSvg(svg(240, 44, '<style>@font-face{font-family:A;src:url(data:font/woff2;base64,AAAA)}</style>'), 'plate'), b = P.cleanSvg(svg(240, 44, '<style>rect{fill:red}</style>'), 'plate'); return /@font-face/.test(a.svg) && !/<style/.test(b.svg); })());
t('far too big a picture is refused', !P.cleanSvg(svg(240, 44, '<text>' + 'x'.repeat(400000) + '</text>'), 'plate').ok);

/* the built-in decorations (www/decocore.js): every one has art in a moving and a still version, at the right shape */
const D = require('../www/decocore.js'), moving = D.buildArt(true), still = D.buildArt(false);
const lists = [['plate', D.PLATES, 'plate', 240, 44], ['bg', D.BACKGROUNDS, 'bg', 1200, 200], ['wreath', D.WREATHS, 'wreath', 144, 144]];
for (const [name, list, key, w, h] of lists) {
  const classic = new Set(D.SERIES.find(x => x.id === 'classic').groups.flatMap(g => g.plate || []));      // the Classic nameplates are drawn in CSS (style.css), not SVG
  const ids = list.filter(x => x.id !== 'none' && !x.custom && !classic.has(x.id)).map(x => x.id);
  const noArt = ids.filter(id => !moving[key][id] || !still[key][id]);
  const noSize = ids.filter(id => moving[key][id] && !new RegExp(`viewBox="0 0 ${w} ${h}"`).test(moving[key][id]));
  const moves = ids.filter(id => /<animate/.test(still[key][id] || ''));
  t(name + ' decorations all have art in both versions (' + ids.length + ')', !noArt.length, noArt.join());
  t(name + ' decorations are all ' + w + ' × ' + h, !noSize.length, noSize.join());
  t(name + ' still versions have no animation', !moves.length, moves.join());
}
const listed = new Set(D.SERIES.flatMap(se => se.groups.flatMap(g => [...(g.plate || []), ...(g.bg || []), ...(g.wreath || [])])));
const all = [...D.PLATES, ...D.BACKGROUNDS, ...D.WREATHS].filter(x => x.id !== 'none' && !x.custom).map(x => x.id);
t('every built-in decoration is in a collection, and every collection entry exists', all.every(id => listed.has(id)) && [...listed].every(id => all.includes(id)), 'missing: ' + all.filter(id => !listed.has(id)).join() + ' unknown: ' + [...listed].filter(id => !all.includes(id)).join());
t('every theme points at real decorations', D.THEMES.every(th => D.PLATES.some(x => x.id === th.plate) && D.BACKGROUNDS.some(x => x.id === th.bg) && D.WREATHS.some(x => x.id === th.wreath) && D.seriesOfTheme(th.id)));
t('the Vibrant Pumpkin and Gobble Gobble Turkey sets each have three nameplates, three banners and three avatar decorations', ['vibrantpumpkin', 'gobblegobble'].every(id => { const g = D.SERIES.find(x => x.id === id).groups[0]; return g.plate.length === 3 && g.bg.length === 3 && g.wreath.length === 3; }));

/* the holiday sets: two Christmas sets of 3/3/3, and eight nights of Hanukkah, each with its own nameplate, banner and avatar decoration */
t('the two Christmas sets each have three nameplates, three banners and three avatar decorations', ['cosychristmas', 'santasparkle'].every(id => { const g = D.SERIES.find(x => x.id === id).groups[0]; return g.plate.length === 3 && g.bg.length === 3 && g.wreath.length === 3; }));
const hk = D.SERIES.find(x => x.id === 'hanukkah');
t('Hanukkah has eight nights, each with one nameplate, one banner and one avatar decoration', hk.groups.length === 8 && hk.groups.every((g, i) => g.plate.join() === 'hk' + (i + 1) && g.bg.join() === 'hk' + (i + 1) && g.wreath.join() === 'hk' + (i + 1)));
t('each night has its own theme', Array.from({ length: 8 }, (_, i) => D.THEMES.find(x => x.id === 'hanukkah' + (i + 1))).every((th, i) => th && th.plate === 'hk' + (i + 1) && th.bg === 'hk' + (i + 1) && th.wreath === 'hk' + (i + 1) && D.seriesOfTheme(th.id) === 'hanukkah'));
// night N lights N candles plus the shamash (the inner flame colour #fffbe0 appears once per flame; night 7 also has three oil-jar flames)
const flames = svg => (svg.match(/fill="#fffbe0"/g) || []).length;
t('every nameplate shows the right number of lit candles (night N: N and the shamash)', Array.from({ length: 8 }, (_, i) => i + 1).every(n => flames(moving.plate['hk' + n]) === n + 1 + (n === 7 ? 3 : 0)), Array.from({ length: 8 }, (_, i) => flames(moving.plate['hk' + (i + 1)])).join());
t('every Hanukkah banner shows the right number of lit candles', Array.from({ length: 8 }, (_, i) => i + 1).every(n => flames(moving.bg['hk' + n]) >= n + 1), Array.from({ length: 8 }, (_, i) => flames(moving.bg['hk' + (i + 1)])).join());
t('every Hanukkah avatar decoration has a straight hanukkiah with the right number of lit candles (night N: N and the shamash), not a ring of candles', Array.from({ length: 8 }, (_, i) => i + 1).every(n => flames(moving.wreath['hk' + n]) === n + 1 + (n === 7 ? 7 : n === 8 ? 1 : 0)), Array.from({ length: 8 }, (_, i) => flames(moving.wreath['hk' + (i + 1)])).join());
t('night 6 is "Light in the Window", with a hanukkiah in a window', D.SERIES.find(x => x.id === 'hanukkah').groups[5].name === 'Night 6: Light in the Window' && !/Star of David/.test(JSON.stringify(D.SERIES)));
t('the Hanukkah dreidels carry the four Hebrew letters', /נ/.test(moving.plate.hk2) && /ג/.test(moving.bg.hk2) && /ה/.test(moving.bg.hk2) && /ש/.test(moving.bg.hk2));
console.log(bad ? `\n${bad} problem${bad === 1 ? '' : 's'}` : '\nall good'); process.exit(bad ? 1 : 0);

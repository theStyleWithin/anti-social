'use strict';
/* Profile decorations for the Chat Rooms look: member-list nameplates, a server banner and a server tag your profile wears.
   Nobody else will ever see them (there is nobody else); they are for you, and for showing someone your phone.
   Animated profile backgrounds and avatar wreaths come next and will live in the same record (see decocore.js). */
const Deco = (() => {
  const D = DecoCore;
  const mine = ctx => D.normProfile((ctx.apps.deco || [])[0]);
  const server = ctx => D.normServer((ctx.apps.srv || [])[0]);
  async function saveProfile(acct, ctx, patch) { const r = (ctx.apps.deco || [])[0], v = { ...D.normProfile(r), ...patch }; return appSave(acct, { id: r ? r.id : 'deco' + acct.id, accountId: acct.id, kind: 'deco', plate: v.plate, bg: v.bg, wreath: v.wreath, animate: v.animate, updatedAt: Date.now() }); }
  async function saveServer(acct, ctx, patch) {
    const r = (ctx.apps.srv || [])[0], v = { ...D.normServer(r), ...patch };
    return appSave(acct, { id: r ? r.id : 'srv' + acct.id, accountId: acct.id, kind: 'srv', name: r ? r.name || '' : '', tag: v.tag, tagColor: v.tagColor, tagGlyph: v.tagGlyph, bannerPreset: v.bannerPreset, bannerImg: v.bannerImg, updatedAt: Date.now() });
  }
  // going back to the default server name keeps the tag and banner
  async function clearName(acct, ctx) { const r = (ctx.apps.srv || [])[0]; if (!r) return; const s = D.normServer(r); if (s.tag || s.bannerPreset || s.bannerImg) await appSave(acct, { ...r, name: '', updatedAt: Date.now() }); else await appDelete(r.id); }
  const tagEl = s => (s && s.tag ? h('span', { class: 'srv-tag', style: `--tag:${s.tagColor}`, title: 'Server tag' }, s.tagGlyph ? h('i', { 'aria-hidden': 'true' }, s.tagGlyph) : null, s.tag) : null);
  const plateAttrs = (id, animate) => (id && id !== 'none' ? { 'data-plate': id, 'data-anim': animate === false ? 'off' : 'on' } : {});
  const plated = id => !!id && id !== 'none';

  /* ----- Settings: nameplates ----- */
  function settingsSection(acct, ctx) {
    const cur = mine(ctx), srv = server(ctx);
    const pick = p => h('button', { class: 'member plate-pick' + (plated(p.id) ? ' plated' : '') + (cur.plate === p.id ? ' on' : ''), type: 'button', 'aria-pressed': String(cur.plate === p.id), ...plateAttrs(p.id, cur.animate),
      onclick: async () => { if (await saveProfile(acct, ctx, { plate: p.id })) render(true); } },
      h('span', { class: 'av-wrap' }, avatar(acct, 'sm'), h('i', { class: 'dot online' })), h('span', { class: 'names' }, h('b', {}, acct.name, tagEl(srv)), h('small', {}, p.name + ' · ' + p.blurb)));
    return h('section', {}, h('h3', {}, 'Profile decorations'),
      h('p', {}, 'Dress up your row in the member list with a nameplate. Nobody else will see it, but you will.'),
      h('div', { class: 'plate-grid', role: 'group', 'aria-label': 'Nameplates' }, D.PLATES.map(pick)),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: cur.animate, onchange: async e => { if (await saveProfile(acct, ctx, { animate: e.target.checked })) render(true); } }), ' ', h('span', {}, 'Animate decorations', h('small', { class: 'muted', style: 'display:block' }, 'Nameplates move a little. Turned off automatically if your device asks for less motion.'))),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => serverProfileModal(acct, ctx) }, 'Server tag and banner')),
      h('p', { class: 'fine' }, 'Animated profile backgrounds and avatar wreaths are planned next.'));
  }

  /* ----- the server tag and banner ----- */
  function serverProfileModal(acct, ctx) {
    const start = server(ctx); let s = { ...start }, busy = false;
    const preview = h('div', { class: 'srv-prev' }), tagInput = h('input', { value: s.tag, maxlength: 4, placeholder: 'e.g. KOI', 'aria-label': 'Server tag', autocomplete: 'off', spellcheck: 'false' });
    const paint = () => {
      const t = D.tagOk(tagInput.value) ? D.cleanTag(tagInput.value) : '', css = D.bannerCss(s);
      preview.replaceChildren(h('div', { class: 'srv-prev-banner', style: css ? `background:${css}` : '' }, h('b', {}, TemplateCore.serverTitle(acct, ((ctx.apps.srv || [])[0] || {}).name))), h('div', { class: 'srv-prev-me' }, h('b', {}, acct.name, tagEl({ ...s, tag: t })), h('small', {}, t ? 'Wearing the ' + t + ' tag' : 'No tag')));
      swC.forEach((b, i) => b.setAttribute('aria-pressed', String(D.TAG_COLORS[i][0] === s.tagColor))); swG.forEach((b, i) => b.setAttribute('aria-pressed', String(D.TAG_GLYPHS[i][0] === s.tagGlyph))); bn.forEach(b => b.setAttribute('aria-pressed', String((b.dataset.id || '') === (s.bannerImg ? 'img' : s.bannerPreset))));
    };
    const swC = D.TAG_COLORS.map(([c, n]) => h('button', { class: 'ck-swatch', type: 'button', style: `background:${c}`, 'aria-label': n, title: n, onclick: () => { s.tagColor = c; paint(); } }));
    const swG = D.TAG_GLYPHS.map(([g, n]) => h('button', { class: 'btn glyph', type: 'button', 'aria-label': n, title: n, onclick: () => { s.tagGlyph = g; paint(); } }, g || '—'));
    const bn = [{ id: '', name: 'None', css: '' }, ...D.BANNERS].map(b => { const el = h('button', { class: 'bn-pick', type: 'button', 'data-id': b.id, 'aria-label': b.name, title: b.name, style: b.css ? `background:${b.css}` : '', onclick: () => { s.bannerPreset = b.id; s.bannerImg = ''; paint(); } }, b.id ? '' : 'None'); return el; });
    const upload = h('button', { class: 'btn', type: 'button', onclick: async () => { const d = await chooseImage(960, 540); if (d) { s.bannerImg = d; s.bannerPreset = ''; paint(); } } }, 'Use my own picture');
    tagInput.addEventListener('input', () => { tagInput.value = D.cleanTag(tagInput.value); paint(); });
    const save = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      if (busy) return; if (tagInput.value && !D.tagOk(tagInput.value)) { toast('A tag is 2 to 4 letters or numbers.'); return; }
      busy = true; const ok = await saveServer(acct, ctx, { tag: D.tagOk(tagInput.value) ? D.cleanTag(tagInput.value) : '', tagColor: s.tagColor, tagGlyph: s.tagGlyph, bannerPreset: s.bannerPreset, bannerImg: s.bannerImg }); busy = false;
      if (ok) { close(); toast('Saved.'); render(true); } } }, 'Save');
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Server tag and banner')),
      h('div', { class: 'mp' }, preview,
        h('label', { class: 'field' }, h('span', {}, 'Server tag (2 to 4 letters or numbers)'), tagInput),
        h('div', { class: 'deco-row', role: 'group', 'aria-label': 'Tag colour' }, swC), h('div', { class: 'deco-row', role: 'group', 'aria-label': 'Tag symbol' }, swG),
        h('h4', {}, 'Banner'), h('div', { class: 'deco-row bn-row', role: 'group', 'aria-label': 'Banner' }, bn), h('div', { class: 'btnrow' }, upload),
        h('p', { class: 'fine' }, 'Your profile wears the tag next to your name, and the banner sits at the top of the channel list. Nobody else can see them.'),
        h('div', { class: 'btnrow' }, save, h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Cancel')))));
    paint();
  }
  return { mine, server, tagEl, plateAttrs, plated, settingsSection, serverProfileModal, clearName, saveServer };
})();
if (typeof module !== 'undefined') module.exports = Deco;

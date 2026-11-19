'use strict';
/* Forum channels for the Chat Rooms look: a channel whose posts have a title, a message, pictures and tags, laid out as cards or a list.
   Open a post and it shows next to the list, with its replies. Everything is yours and stays on this device. */
const Forum = (() => {
  const F = ForumCore;
  let tagFilter = '', query = '', seen = '', startOpen = true;
  const rel = ts => { const s = Math.max(0, (Date.now() - ts) / 1000); if (s < 45) return 'just now'; if (s < 3600) return Math.round(s / 60) + 'm ago'; if (s < 86400) return Math.round(s / 3600) + 'h ago'; return Math.round(s / 86400) + 'd ago'; };
  const posts = (ctx, cid) => (ctx.apps.fpost || []).filter(f => f.channel === cid);
  const repliesOf = (ctx, fp) => ctx.posts.filter(p => p.parentId === fp.id).sort((a, b) => a.createdAt - b.createdAt);
  const saveChan = (acct, ch, patch) => appSave(acct, { ...ch, ...patch, updatedAt: Date.now() });
  const savePostRec = (acct, fp, patch) => appSave(acct, { ...fp, ...patch, updatedAt: Date.now() });

  function menu(anchor, rows) {
    document.querySelector('.popover')?.remove();
    const close = () => { pop.remove(); document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc, true); };
    const outside = e => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); }, esc = e => { if (e.key === 'Escape') close(); };
    const pop = h('div', { class: 'popover forum-menu', role: 'menu' }, rows.map(r => r.head ? h('div', { class: 'pop-head' }, r.head) : h('button', { class: 'pop-row', role: 'menuitemradio', 'aria-checked': String(!!r.on), onclick: () => { close(); r.fn(); } }, h('span', { class: 'pop-plus' }, r.on ? icon('check') : ''), h('b', {}, r.label))));
    document.body.append(pop); const r = anchor.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px'; pop.style.top = (r.bottom + 4) + 'px';
    document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', esc, true);
  }
  const emojiPicker = (value, onPick) => {
    const wrap = h('div', { class: 'emoji-grid' }, F.REACTIONS.map(e => h('button', { type: 'button', 'aria-label': e, class: value === e ? 'on' : '', onclick: () => onPick(e) }, e)), h('button', { type: 'button', class: 'emoji-none', onclick: () => onPick('') }, 'None'));
    return wrap;
  };

  /* ----- the list ----- */
  function card(acct, ctx, ch, c, fp, replies) {
    const open = () => go(`/channel/${ch.id}/${fp.id}`), tags = (fp.tags || []).map(id => c.tags.find(t => t.id === id)).filter(Boolean);
    const chips = tags.length ? h('div', { class: 'fp-tags' }, tags.map(t => h('span', { class: 'fp-tag' }, t.name))) : null;
    const counts = h('div', { class: 'fp-counts' }, h('span', {}, icon('reply'), String(replies.length)), fp.reacted ? h('span', { class: 'fp-react on' }, c.reaction || '\u{1F44D}', ' 1') : null);
    const head = h('div', { class: 'fp-meta' }, h('b', {}, acct.name), h('span', {}, 'Posted ' + rel(fp.createdAt)), fp.pinned ? h('span', { class: 'fp-pin', title: 'Pinned' }, icon('pin')) : null);
    if (c.layout === 'list') return h('button', { class: 'fp-row' + (ctx.openPost === fp.id ? ' on' : ''), type: 'button', onclick: open }, head, h('h3', {}, fp.title), h('p', {}, F.excerpt(fp.text)), chips, counts);
    const prev = fp.images && fp.images[0] ? h('div', { class: 'fp-prev img', style: `background:url("${fp.images[0]}") center / cover` }) : h('div', { class: 'fp-prev' }, F.excerpt(fp.text, 220));
    return h('button', { class: 'fp-card' + (ctx.openPost === fp.id ? ' on' : ''), type: 'button', onclick: open }, head, h('h3', {}, fp.title), prev, chips, counts);
  }
  function startCard(acct, ctx, ch, c, count) {
    const { items, done } = F.startItems(ch, count), total = items.length, open = startOpen && done < total;
    const fix = id => { if (id === 'post') newPost(acct, ctx, ch, c); else settings(acct, ctx, ch); };
    return h('section', { class: 'fp-start' }, h('div', { class: 'fp-start-head' }, h('b', {}, `Get Started (${done} of ${total} completed)`), h('span', { class: 'pw-spacer' }), h('small', { class: 'muted' }, 'Only you can see this'),
      h('button', { class: 'pw-ico', type: 'button', 'aria-label': open ? 'Collapse' : 'Expand', onclick: () => { startOpen = !open; render(true); } }, icon(open ? 'arrowup' : 'arrowdown')),
      h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Hide this checklist', onclick: async () => { if (await saveChan(acct, ch, { hideStart: true })) render(true); } }, icon('x'))),
      open ? items.map(i => h('button', { class: 'fp-step' + (i.done ? ' done' : ''), type: 'button', onclick: () => fix(i.id) }, h('span', { class: 'fp-check' }, i.done ? icon('check') : ''), h('span', {}, h('b', {}, i.label), h('small', {}, i.hint)))) : null);
  }

  /* ----- a post and its replies ----- */
  function thread(acct, ctx, ch, c, fp) {
    const replies = repliesOf(ctx, fp), emoji = c.reaction || '\u{1F642}';
    const patch = async p => { if (await savePostRec(acct, fp, p)) render(true); };
    const del = async () => {
      if (!confirm(`Delete the post "${fp.title}" and its replies? There is no undo.`)) return;
      const doomed = new Set(replies.map(r => r.id)); for (let grew = true; grew;) { grew = false; for (const q of ctx.posts) if (q.parentId && doomed.has(q.parentId) && !doomed.has(q.id)) { doomed.add(q.id); grew = true; } }
      for (const id of doomed) await db.del('posts', id); await appDelete(fp.id); toast('Post deleted.'); go('/channel/' + ch.id);
    };
    const more = h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Post options', onclick: e => menu(e.currentTarget, [{ label: fp.pinned ? 'Unpin post' : 'Pin post', fn: () => patch({ pinned: !fp.pinned }) }, { label: 'Delete post', fn: del }]) }, icon('more'));
    const tags = (fp.tags || []).map(id => c.tags.find(t => t.id === id)).filter(Boolean);
    return h('section', { class: 'forum-thread', 'aria-label': fp.title },
      h('div', { class: 'ft-head' }, h('b', {}, fp.title), h('span', { class: 'pw-spacer' }), more, h('button', { class: 'pw-ico', type: 'button', 'aria-label': 'Close post', onclick: () => go('/channel/' + ch.id) }, icon('x'))),
      h('div', { class: 'ft-body' },
        h('div', { class: 'ft-title' }, h('span', { class: 'ft-ico' }, icon('speak')), h('h2', {}, fp.title), tags.length ? h('div', { class: 'fp-tags' }, tags.map(t => h('span', { class: 'fp-tag' }, t.name))) : null),
        h('div', { class: 'ft-day' }, h('span', {}, new Date(fp.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }))),
        h('div', { class: 'ft-op' }, avatar(acct, 'sm'), h('div', { class: 'ft-op-body' }, h('div', { class: 'ft-op-meta' }, h('b', {}, acct.name), Deco.tagEl(Deco.server(ctx)), h('span', { class: 'op-badge' }, 'OP'), h('time', {}, new Date(fp.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))), fp.text ? h('div', { class: 'text' }, richText(fp.text)) : null, mediaGrid(fp.images))),
        replies.map(r => postEl(r, acct, ctx))),
      h('div', { class: 'ft-bar' }, h('button', { class: 'btn ft-react' + (fp.reacted ? ' on' : ''), type: 'button', 'aria-pressed': String(!!fp.reacted), onclick: () => patch({ reacted: !fp.reacted }) }, emoji, fp.reacted ? ' 1' : ' React to Post'),
        h('span', { class: 'pw-spacer' }), h('button', { class: 'btn ft-follow' + (fp.following === false ? '' : ' on'), type: 'button', 'aria-pressed': String(fp.following !== false), onclick: () => patch({ following: fp.following === false }) }, fp.following === false ? 'Follow' : '✓ Following')),
      composer(acct, { placeholder: `Send a message in "${F.excerpt(fp.title, 40)}"`, parentId: fp.id, channel: ch.id, enterSends: true, label: W('send'), onDone: () => render(true) }));
  }

  /* ----- the whole forum channel ----- */
  function home(acct, ctx, ch, postId) {
    const c = F.normChannel(ch); if (seen !== ch.id) { seen = ch.id; tagFilter = ''; query = ''; startOpen = true; }
    const all = posts(ctx, ch.id), fp = postId ? all.find(f => f.id === postId) : null; ctx.openPost = fp ? fp.id : '';
    const arranged = F.arrange(all, f => repliesOf(ctx, f), { sort: c.sort, tag: tagFilter, q: query });
    const head = h('div', { class: 'chat-head' },
      h('button', { class: 'hamburger', type: 'button', 'aria-label': 'Open channels', onclick: () => drawer('left') }, icon('menu')),
      h('span', { class: 'hash' }, icon('speak')), h('h1', {}, ch.name), ch.topic && h('span', { class: 'topic' }, ch.topic), h('span', { style: 'margin-left:auto' }),
      acct.vault && h('button', { class: 'ub', type: 'button', 'aria-label': 'Lock vault', title: 'Lock vault', onclick: () => { lockVault(); render(); } }, icon('lock')),
      h('button', { class: 'ub', type: 'button', 'aria-label': 'Edit channel', title: 'Edit channel', onclick: () => settings(acct, ctx, ch) }, icon('settings')),
      h('button', { class: 'ub members-btn', type: 'button', 'aria-label': 'Show members', title: 'Member list', onclick: () => drawer('right') }, icon('users')));
    const search = h('input', { type: 'search', value: query, placeholder: 'Search or create a post…', 'aria-label': 'Search posts' });
    let t = 0; search.addEventListener('input', () => { query = search.value; clearTimeout(t); t = setTimeout(() => { render(true); setTimeout(() => { const el = document.querySelector('.forum-list input[type=search]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0); }, 250); });
    const setView = async p => { if (await saveChan(acct, ch, p)) render(true); };
    const sv = h('button', { class: 'btn fp-sv', type: 'button', onclick: e => menu(e.currentTarget, [{ head: 'Sort by' }, { label: 'Recently active', on: c.sort === 'active', fn: () => setView({ sort: 'active' }) }, { label: 'Date posted', on: c.sort === 'date', fn: () => setView({ sort: 'date' }) }, { head: 'View as' }, { label: 'Gallery', on: c.layout === 'gallery', fn: () => setView({ layout: 'gallery' }) }, { label: 'List', on: c.layout === 'list', fn: () => setView({ layout: 'list' }) }]) }, icon('sliders'), ' Sort & View');
    const chip = (id, name) => h('button', { class: 'fp-chip' + (tagFilter === id ? ' on' : ''), type: 'button', 'aria-pressed': String(tagFilter === id), onclick: () => { tagFilter = id; render(true); } }, name);
    const section = (title, list) => list.length ? [title ? h('h4', { class: 'fp-sec' }, title) : null, h('div', { class: 'fp-grid ' + c.layout }, list.map(f => card(acct, ctx, ch, c, f, repliesOf(ctx, f))))] : [];
    const shown = arranged.pinned.length + arranged.rest.length;
    const list = h('div', { class: 'forum-list' },
      h('div', { class: 'fp-bar' }, h('div', { class: 'fp-search' }, icon('search'), search), h('button', { class: 'btn primary', type: 'button', onclick: () => newPost(acct, ctx, ch, c) }, icon('speak'), ' New Post')),
      h('div', { class: 'fp-filters' }, sv, h('span', { class: 'fp-div' }), chip('', 'All'), c.tags.map(tg => chip(tg.id, tg.name))),
      c.hideStart ? null : startCard(acct, ctx, ch, c, all.length),
      c.guidelines.trim() ? h('details', { class: 'fp-guide' }, h('summary', {}, 'Post guidelines'), h('p', {}, richText(c.guidelines))) : null,
      shown ? [section(arranged.pinned.length ? 'Pinned Posts' : '', arranged.pinned), section(arranged.pinned.length && arranged.rest.length ? 'Posts' : '', arranged.rest)] : h('div', { class: 'fp-empty' }, h('div', { class: 'big-hash' }, icon('speak')), h('h3', {}, all.length ? 'No posts match' : 'No posts yet'), h('p', { class: 'muted' }, all.length ? 'Try a different tag or search.' : 'Start the first conversation. Nobody will reply, but the thread is yours.'), !all.length && h('button', { class: 'btn primary', type: 'button', onclick: () => newPost(acct, ctx, ch, c) }, 'New Post')));
    return [head, h('div', { class: 'forum' + (fp ? ' has-thread' : '') }, list, fp ? thread(acct, ctx, ch, c, fp) : null)];
  }

  /* ----- making a post ----- */
  function newPost(acct, ctx, ch, c) {
    c = c || F.normChannel(ch); let images = [], picked = new Set();
    const title = h('input', { maxlength: F.MAX_TITLE, placeholder: 'Title', 'aria-label': 'Post title' }), body = h('textarea', { rows: 6, placeholder: 'Write your post', 'aria-label': 'Message' });
    const prev = h('div', { class: 'previews' }), err = h('p', { class: 'err', role: 'alert' });
    const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    const paintImgs = () => prev.replaceChildren(...images.map((src, i) => h('div', { class: 'pv' }, h('img', { src, alt: '' }), h('button', { class: 'rm', type: 'button', 'aria-label': 'Remove image', onclick: () => { images.splice(i, 1); paintImgs(); } }, icon('x')))));
    file.addEventListener('change', async () => { for (const f of [...file.files].slice(0, 4 - images.length)) { try { images.push(await downscale(f)); } catch { /* not an image */ } } file.value = ''; paintImgs(); });
    const chips = h('div', { class: 'fp-chips' }, c.tags.map(tg => h('button', { class: 'fp-chip', type: 'button', 'aria-pressed': 'false', onclick: e => { picked.has(tg.id) ? picked.delete(tg.id) : picked.add(tg.id); e.currentTarget.classList.toggle('on', picked.has(tg.id)); e.currentTarget.setAttribute('aria-pressed', String(picked.has(tg.id))); } }, tg.name)));
    const go2 = h('button', { class: 'btn primary', type: 'button' }, 'Post');
    go2.addEventListener('click', async () => {
      const post = { title: title.value, text: body.value.trim(), images, tags: [...picked] }, msg = F.postError(post, c); if (msg) { err.textContent = msg; return; }
      go2.disabled = true; const rec = { id: uid(), accountId: acct.id, kind: 'fpost', channel: ch.id, title: F.cleanTitle(post.title), text: post.text, images, tags: post.tags, pinned: false, reacted: false, following: true, createdAt: Date.now() };
      if (!(await appSave(acct, rec))) { go2.disabled = false; return; } close(); toast('Posted.'); go(`/channel/${ch.id}/${rec.id}`);
    });
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'New post in #' + ch.name)),
      h('div', { class: 'mp' }, c.guidelines.trim() ? h('details', { class: 'fp-guide', open: true }, h('summary', {}, 'Post guidelines'), h('p', {}, c.guidelines)) : null,
        h('label', { class: 'field' }, h('span', {}, 'Title'), title), h('label', { class: 'field' }, h('span', {}, 'Message'), body),
        c.tags.length ? h('div', {}, h('h4', {}, c.requireTags ? 'Tags (pick at least one)' : 'Tags'), chips) : null,
        prev, err, h('div', { class: 'btnrow' }, go2, h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, icon('image'), ' Add pictures'), h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Cancel'), file))));
    setTimeout(() => title.focus(), 0);
  }

  /* ----- forum settings (the channel's Overview) ----- */
  function settings(acct, ctx, ch) {
    const c = F.normChannel(ch); let tags = c.tags.slice(), reaction = c.reaction;
    const name = h('input', { value: ch.name, maxlength: 40, 'aria-label': 'Channel name', autocapitalize: 'none' }), topic = h('input', { value: ch.topic || '', maxlength: 120, placeholder: 'What is this forum about?', 'aria-label': 'Channel topic' });
    const guide = h('textarea', { rows: 6, maxlength: F.MAX_GUIDE, placeholder: 'Let everyone know how to use this channel!', 'aria-label': 'Post guidelines' }, c.guidelines), left = h('small', { class: 'muted' });
    const upd = () => { left.textContent = String(F.MAX_GUIDE - guide.value.length) + ' left'; }; guide.addEventListener('input', upd); upd();
    const chipsEl = h('div', { class: 'fp-chips' }), tagIn = h('input', { maxlength: F.MAX_TAG, placeholder: 'New tag', 'aria-label': 'New tag' }), err = h('p', { class: 'err', role: 'alert' });
    const paintTags = () => chipsEl.replaceChildren(...tags.map(t => h('span', { class: 'fp-chip static' }, t.name, h('button', { type: 'button', 'aria-label': 'Remove tag ' + t.name, onclick: () => { tags = F.removeTag(tags, t.id); paintTags(); } }, icon('x')))));
    const addTag = () => { const r = F.addTag(tags, tagIn.value, uid()); if (r.error) { err.textContent = r.error; return; } err.textContent = ''; tags = r.tags; tagIn.value = ''; paintTags(); };
    tagIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }); paintTags();
    const req = h('input', { type: 'checkbox', checked: c.requireTags }), layout = h('select', { 'aria-label': 'Default layout' }, h('option', { value: 'gallery' }, 'Gallery view'), h('option', { value: 'list' }, 'List view')); layout.value = c.layout;
    const emo = h('div', {}), paintEmo = () => emo.replaceChildren(h('div', { class: 'fp-reactprev' }, h('span', { class: 'big' }, reaction || '\u{1F642}'), h('span', { class: 'muted' }, reaction ? 'Members react to posts with this.' : 'No default reaction yet.')), emojiPicker(reaction, e => { reaction = e; paintEmo(); }));
    paintEmo();
    const save = h('button', { class: 'btn primary', type: 'button' }, 'Save');
    save.addEventListener('click', async () => {
      const others = ctx.apps.chan.filter(x => x.id !== ch.id), msg = TP.channelError(name.value, others); if (msg) { err.textContent = msg; return; }
      save.disabled = true; const rec = { ...ch, name: TP.channelName(name.value), topic: topic.value.trim().slice(0, 120), type: 'forum', guidelines: guide.value.slice(0, F.MAX_GUIDE), tags, requireTags: req.checked, reaction, layout: layout.value, updatedAt: Date.now() };
      if (!(await appSave(acct, rec))) { save.disabled = false; return; } close(); toast('Saved.'); render(true);
    });
    const del = h('button', { class: 'btn danger', type: 'button', onclick: async () => {
      if (!confirm(`Delete #${ch.name}, every post in it and every reply you wrote? There is no undo.`)) return;
      const fps = posts(ctx, ch.id), doomed = new Set(ctx.posts.filter(p => p.channel === ch.id).map(p => p.id)); for (const f of fps) for (const r of repliesOf(ctx, f)) doomed.add(r.id);
      for (let grew = true; grew;) { grew = false; for (const q of ctx.posts) if (q.parentId && doomed.has(q.parentId) && !doomed.has(q.id)) { doomed.add(q.id); grew = true; } }
      for (const id of doomed) await db.del('posts', id); for (const f of fps) await appDelete(f.id); await appDelete(ch.id); close(); toast(`#${ch.name} was deleted.`); go('/');
    } }, 'Delete channel');
    const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Forum settings')),
      h('div', { class: 'mp forum-set' }, h('label', { class: 'field' }, h('span', {}, 'Channel name'), name), h('label', { class: 'field' }, h('span', {}, 'Topic (optional)'), topic),
        h('label', { class: 'field' }, h('span', {}, 'Post guidelines'), guide, left),
        h('h4', {}, 'Tags'), h('p', { class: 'fine' }, 'Help organize posts into subcategories by creating tags.'), chipsEl, h('div', { class: 'fp-addtag' }, tagIn, h('button', { class: 'btn', type: 'button', onclick: addTag }, 'Add tag')),
        h('label', { class: 'check' }, req, ' ', h('span', {}, 'Require a tag when posting')),
        h('h4', {}, 'Default reaction'), emo,
        h('h4', {}, 'Default layout'), h('p', { class: 'fine' }, 'Gallery shows cards with a picture or text preview, list shows rows. You can switch any time from Sort & View.'), layout,
        err, h('div', { class: 'btnrow' }, save, del))));
  }
  return { home, settings, newPost };
})();
if (typeof module !== 'undefined') module.exports = Forum;

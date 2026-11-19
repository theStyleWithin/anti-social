'use strict';
/* Forum channels (Chat Rooms look): pure rules, no page. A forum channel holds posts with a title, a message, optional pictures and tags;
   people (well, you) reply inside each post. This file has the tag rules, sorting and filtering, and the "Get Started" checklist. */
const ForumCore = (() => {
  const MAX_TAGS = 20, MAX_TAG = 20, MAX_TITLE = 100, MAX_GUIDE = 4096;
  const REACTIONS = ['\u{1F44D}', '❤️', '\u{1F602}', '\u{1F62E}', '\u{1F389}', '\u{1F525}', '\u{1F440}', '✨', '\u{1F4AF}', '\u{1F642}'];
  const str = s => (typeof s === 'string' ? s : '');
  const cleanTagName = s => str(s).replace(/\s+/g, ' ').trim().slice(0, MAX_TAG);
  const firstEmoji = s => { const m = str(s).match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u); return m ? m[0] : ''; };
  function normTags(list) {
    const seen = new Set(), out = [];
    for (const t of Array.isArray(list) ? list : []) { const name = cleanTagName(t && t.name); const key = name.toLowerCase(); if (!name || seen.has(key) || out.length >= MAX_TAGS) continue; seen.add(key); out.push({ id: str(t.id) || 't' + out.length + key.replace(/[^a-z0-9]/g, '').slice(0, 8), name }); }
    return out;
  }
  const isForum = c => !!c && c.type === 'forum';
  // a channel record's forum settings, with defaults filled in
  const normChannel = c => ({ type: isForum(c) ? 'forum' : 'text', guidelines: str(c && c.guidelines).slice(0, MAX_GUIDE), tags: normTags(c && c.tags), requireTags: !!(c && c.requireTags), reaction: firstEmoji(c && c.reaction), layout: c && c.layout === 'list' ? 'list' : 'gallery', sort: c && c.sort === 'date' ? 'date' : 'active', hideStart: !!(c && c.hideStart) });
  function addTag(tags, name, uid) {
    const n = cleanTagName(name); if (!n) return { error: 'Type a tag name.' };
    if (tags.some(t => t.name.toLowerCase() === n.toLowerCase())) return { error: 'That tag already exists.' };
    if (tags.length >= MAX_TAGS) return { error: `Up to ${MAX_TAGS} tags.` };
    return { tags: [...tags, { id: uid || 't' + Date.now().toString(36) + tags.length, name: n }] };
  }
  const removeTag = (tags, id) => tags.filter(t => t.id !== id);
  const cleanTitle = s => str(s).replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE);
  // null when the post is fine, otherwise what to tell the person
  function postError(p, channel) {
    if (!cleanTitle(p.title)) return 'Give the post a title.';
    if (!str(p.text).trim() && !(p.images && p.images.length)) return 'Write a message or attach a picture.';
    if (channel.requireTags && !(p.tags && p.tags.length)) return 'Pick at least one tag for this post.';
    return null;
  }
  // the moment a post last moved: when it was made, or when its newest reply was
  const activeAt = (fp, replies) => replies.reduce((m, r) => Math.max(m, r.createdAt || 0), fp.createdAt || 0);
  // posts to show: filtered by tag and search words, pinned ones first, then newest first (by activity or by date posted)
  function arrange(fps, repliesOf, { sort = 'active', tag = '', q = '' } = {}) {
    const words = str(q).toLowerCase().split(/\s+/).filter(Boolean);
    const keep = fps.filter(f => (!tag || (f.tags || []).includes(tag)) && words.every(w => (str(f.title) + ' ' + str(f.text)).toLowerCase().includes(w)));
    const key = f => (sort === 'date' ? f.createdAt || 0 : activeAt(f, repliesOf(f)));
    const by = (a, b) => key(b) - key(a);
    return { pinned: keep.filter(f => f.pinned).sort(by), rest: keep.filter(f => !f.pinned).sort(by) };
  }
  // the "Get Started" checklist for a new forum
  function startItems(ch, postCount) {
    const c = normChannel(ch);
    const items = [{ id: 'guide', label: 'Create post guidelines', hint: 'Make rules for posts to follow.', done: !!c.guidelines.trim() }, { id: 'tags', label: 'Create tags', hint: 'Help sort posts into subcategories.', done: c.tags.length > 0 }, { id: 'react', label: 'Set a default reaction for posts', hint: 'Choose the emoji used to react to a post.', done: !!c.reaction }, { id: 'post', label: 'Make the first post', hint: 'Start the conversation.', done: postCount > 0 }];
    return { items, done: items.filter(i => i.done).length };
  }
  const excerpt = (s, n = 160) => { const t = str(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  return { MAX_TAGS, MAX_TAG, MAX_TITLE, MAX_GUIDE, REACTIONS, isForum, normChannel, normTags, addTag, removeTag, cleanTitle, postError, activeAt, arrange, startItems, excerpt, firstEmoji };
})();
if (typeof module !== 'undefined') module.exports = ForumCore;

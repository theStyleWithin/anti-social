'use strict';
/* AI members for Chat Rooms: characters you make that live on your private server and talk to you. Every reply is made by
   a model file on this device (the desktop app now, the Android app later). Nothing here uses the network. */
const AI = AICore;

/* ---------- the engine on this device ---------- */
// window.AntiSocialAI is provided by the app's native side: {kind, status(), pickModel(), systemInfo(), load(cfg), unload(), generate(req, {onToken}), cancel(id)}
const aiOnlineOn = () => aiConfig().provider === 'online';
const aiEngine = () => aiOnlineOn() ? AIOnline : (window.AntiSocialAI || null);
const aiConfig = () => { try { const c = JSON.parse(ls('as.ai') || 'null'); return c && typeof c === 'object' ? c : {}; } catch { return {}; } };
const aiSaveConfig = c => ls('as.ai', JSON.stringify(c));
const aiErr = (code, message) => Object.assign(new Error(message), { code });
let aiLoading = false;
async function aiEnsure() {
  const e = aiEngine();
  if (!e) throw aiErr('no-engine', 'This device has no AI engine. Use a model file in the Windows, Linux or Android app, or switch to TokenReply in Settings, AI members.');
  const c = aiConfig();
  if (aiOnlineOn()) {
    if (!c.online || !c.online.key) throw aiErr('no-model', 'Add your TokenReply API key first: Settings, AI members.');
    if (!c.online.model) throw aiErr('no-model', 'Choose a TokenReply model first: Settings, AI members.');
    return e;
  }
  if (!c.model || !c.model.path) throw aiErr('no-model', 'Choose a model file first: Settings, AI members.');
  const want = { path: c.model.path, ctx: c.ctx || 4096, gpu: c.gpu || 'auto' };
  const st = await e.status();
  if (!st.loaded || st.path !== want.path || st.ctx !== want.ctx || st.gpu !== want.gpu) {
    aiLoading = true; aiRefresh();
    try { await e.load(want); } catch (err) { throw aiErr('load-failed', 'The model could not be loaded: ' + (err && err.message || err)); } finally { aiLoading = false; }
  }
  return e;
}

/* ---------- who and what ---------- */
const aiBots = ctx => [...ctx.apps.bot].sort((a, b) => a.createdAt - b.createdAt);
const botFace = b => ({ name: b.name, handle: b.name, color: b.color || colorFor(b.name), avatarImg: b.avatarImg || null });
const botAvatar = (b, size = '') => avatar(botFace(b), size);
const botTag = () => h('span', { class: 'bot-tag', title: 'An AI member running on this device' }, 'BOT');
const channelNames = ctx => ({ general: 'general', ...Object.fromEntries(ctx.apps.chan.map(c => [c.id, c.name])) });
// the channel the screen is showing right now ('general', a channel id, 'dm:<bot id>' or '')
const aiHereChannel = () => {
  const [, r = '', arg] = location.hash.split('/');
  return r === 'channel' ? arg : r === 'dm' ? AI.DM(arg) : r === '' ? 'general' : '';
};
const aiRefresh = () => { try { if (currentAcct && tplId() === 'chat') render(true); } catch { /* not ready */ } };

/* ---------- running replies, one at a time ---------- */
let aiRun = null;            // {id, bot, channel, text, loading}
let aiNotice = null;         // {channel, text}: why nothing happened, shown at the bottom of the list
let aiQueue = Promise.resolve(), aiAbort = 0;
const aiSay = (channel, text) => { aiNotice = { channel, text }; aiRefresh(); };
async function aiHistory(acct, channel, all) {
  const names = new Map(all.filter(p => p.kind === 'bot').map(b => [b.id, b.name])), items = [];
  for (const p of all) {
    if (p.kind === 'aimsg' && p.channel === channel) items.push({ ts: p.createdAt, who: p.from === 'user' ? acct.name : (names.get(p.from) || 'Someone'), text: p.text });
    else if (!p.kind && !p.parentId && !AI.isDm(channel) && p.text && TemplateCore.inChannel(p, channel)) items.push({ ts: p.createdAt, who: acct.name, text: p.text });
  }
  return items.sort((a, b) => a.ts - b.ts);
}
// One reply from one bot. Saves it as a message and returns its text.
async function aiReply(acct, botId, channel, { createdAt, myAbort = aiAbort } = {}) {
  const all = await loadPosts(acct), bots = all.filter(p => p.kind === 'bot'), bot = bots.find(b => b.id === botId);
  if (!bot || !AI.mayAnswer(bot, channel)) return null;
  const cfg = aiConfig(), ctxTokens = cfg.ctx || 4096;
  const history = await aiHistory(acct, channel, all), server = (all.find(p => p.kind === 'srv') || {}).name || TemplateCore.serverName(acct);
  const others = bots.filter(b => b.id !== bot.id && AI.mayAnswer(b, channel)).map(b => b.name), speakers = [acct.name, ...bots.map(b => b.name)];
  const chName = AI.isDm(channel) ? channel : (channelNames({ apps: { chan: all.filter(p => p.kind === 'chan') } })[channel] || 'general');
  const { system, prompt } = AI.buildPrompt({ bot, owner: acct.name, server, channel: chName, others, history, budget: Math.max(2000, (ctxTokens - bot.maxTokens - 300) * 3) });
  const id = uid();
  aiRun = { id, bot, channel, text: '', loading: true };
  aiRefresh();
  let text = '';
  try {
    const e = await aiEnsure();
    if (myAbort !== aiAbort) return null;
    aiRun.loading = false; aiRefresh();
    text = await e.generate({ id, system, prompt, maxTokens: bot.maxTokens, temperature: bot.temperature, stop: AI.stopsFor(bot, speakers) }, {
      onToken: t => { if (!aiRun || aiRun.id !== id) return; aiRun.text += t; aiPaintTyping(); } });
    text = aiRun && aiRun.id === id && aiRun.text ? aiRun.text : text;
  } finally { if (aiRun && aiRun.id === id) { /* cleared below */ } }
  const partial = myAbort !== aiAbort;
  aiRun = null;
  if (partial && !text.trim()) { aiRefresh(); return null; }
  const clean = AI.cleanReply(text, bot, speakers);
  await savePost(acct, { id: uid(), accountId: acct.id, kind: 'aimsg', channel, from: bot.id, text: clean, createdAt: createdAt || Date.now() });
  aiRefresh();
  return clean;
}
let aiPending = 0;
const aiEnqueue = task => { aiPending++; const run = () => Promise.resolve().then(task).finally(() => { aiPending--; }); const q = aiQueue.then(run, run); aiQueue = q.catch(() => {}); return q; };
function aiStop() { aiAbort++; const e = aiEngine(); if (aiRun && e && e.cancel) e.cancel(aiRun.id); }
function aiFail(channel, err) {
  console.error(err); aiRun = null;
  aiSay(channel, err && err.code ? err.message : 'The AI member could not answer: ' + (err && err.message || err));
}
// Runs bot turns in order. Each turn sees the replies before it. Pings in replies can start more turns (a couple of hops at most).
async function aiRunTurns(acct, turns, channel, depth = 0, budget = { left: 8 }) {
  const myAbort = aiAbort;
  for (const b of turns) {
    if (myAbort !== aiAbort || budget.left <= 0) return;
    budget.left--;
    let reply;
    try { reply = await aiReply(acct, b.id, channel, { myAbort }); } catch (e) { aiFail(channel, e); return; }
    if (reply && myAbort === aiAbort && !AI.isDm(channel)) {
      const all = await loadPosts(acct), bots = all.filter(p => p.kind === 'bot');
      const more = AI.followUps(reply, bots, b, channel, depth);
      if (more.length) await aiRunTurns(acct, more, channel, depth + 1, budget);
    }
  }
}
// After you send a message in a channel: who answers?
async function aiAfterUser(acct, channel, text) {
  const all = await loadPosts(acct), bots = all.filter(p => p.kind === 'bot');
  if (!bots.length) return;
  aiNotice = null;
  const rec = all.find(p => p.kind === 'aimode' && p.channel === channel), mode = rec ? rec.mode : 'mention';
  const m = AI.planMention(text, bots, channel);
  let turns = m.turns;
  if (mode === 'group') { const g = AI.planGroup({ botIds: rec.botIds, rounds: rec.rounds }, bots, channel); turns = [...m.turns.filter(b => !g.turns.some(x => x.id === b.id)), ...g.turns]; }
  if (m.blocked.length) aiSay(channel, `${m.blocked.map(b => b.name).join(', ')} ${m.blocked.length === 1 ? "isn't" : "aren't"} allowed to speak in ${AI.isDm(channel) ? 'this chat' : '#' + (channelNames({ apps: { chan: all.filter(p => p.kind === 'chan') } })[channel] || 'general')}. You can change that on ${m.blocked.length === 1 ? 'their' : 'their'} profile.`);
  if (!turns.length) return;
  return aiEnqueue(() => aiRunTurns(acct, turns, channel));
}
async function aiDmSend(acct, botId, text) {
  await savePost(acct, { id: uid(), accountId: acct.id, kind: 'aimsg', channel: AI.DM(botId), from: 'user', text, createdAt: Date.now() });
  aiNotice = null; aiRefresh();
  return aiEnqueue(() => aiRunTurns(acct, [{ id: botId }], AI.DM(botId)));
}

/* ---------- how a bot's messages look ---------- */
function aiTypingRow() {
  if (!aiRun) return null;
  const b = aiRun.bot;
  return h('article', { class: 'post ai-post ai-typing', 'data-bot': b.id },
    botAvatar(b),
    h('div', { class: 'content' }, h('div', { class: 'head' }, h('span', { class: 'name role-bot' }, b.name), botTag(), h('span', { class: 'time' }, aiRun.loading && aiLoading ? 'loading the model...' : aiRun.loading ? 'getting ready...' : 'typing...')),
      h('div', { class: 'text' }, aiRun.text || h('span', { class: 'dots', 'aria-label': 'typing' }, h('i'), h('i'), h('i'))),
      h('button', { class: 'btn ai-stop', type: 'button', onclick: aiStop }, 'Stop')));
}
function aiPaintTyping() {
  const el = document.querySelector('.ai-typing .text'); if (!el || !aiRun) return;
  el.textContent = aiRun.text;
  const t = document.querySelector('.ai-typing .time'); if (t) t.textContent = 'typing...';
  const list = document.querySelector('.chat-list'); if (list && list.scrollHeight - list.scrollTop - list.clientHeight < 160) list.scrollTop = list.scrollHeight;
}
function aiNoticeRow(channel) {
  return aiNotice && aiNotice.channel === channel ? h('div', { class: 'ai-note', role: 'status' }, icon('lock'), h('span', {}, aiNotice.text), h('button', { class: 'back', type: 'button', 'aria-label': 'Dismiss', onclick: () => { aiNotice = null; aiRefresh(); } }, icon('x'))) : null;
}
const aiMsgTime = m => stamp(m.createdAt);
function botMsgEl(acct, ctx, m, bot, last) {
  const run = fn => async () => { try { await fn(); } catch (e) { aiFail(m.channel, e); } };
  const actions = h('div', { class: 'actions' },
    last && h('button', { class: 'act', type: 'button', 'aria-label': 'Regenerate', 'data-label': 'Regenerate', title: 'Write it again', onclick: run(async () => { await db.del('posts', m.id); aiRefresh(); await aiEnqueue(() => aiRunTurns(acct, [bot], m.channel)); }) }, icon('repost')),
    h('button', { class: 'act', type: 'button', 'aria-label': 'Edit message', 'data-label': 'Edit', title: 'Edit', onclick: () => aiEditMessage(acct, m) }, icon('notes')),
    h('button', { class: 'act del', type: 'button', 'aria-label': 'Delete message', 'data-label': 'Delete', title: 'Delete', onclick: async () => { await db.del('posts', m.id); aiRefresh(); } }, icon('trash')));
  return h('article', { class: 'post ai-post', 'data-bot': bot.id },
    h('a', { href: '#/bot/' + bot.id, 'aria-label': bot.name }, botAvatar(bot)),
    h('div', { class: 'content' }, h('div', { class: 'head' }, h('a', { class: 'name role-bot', href: '#/bot/' + bot.id }, bot.name), botTag(), h('span', { class: 'time' }, aiMsgTime(m), m.edited ? ' (edited)' : '')),
      h('div', { class: 'text' }, richText(m.text)), actions));
}
function dmUserEl(acct, m) {
  return h('article', { class: 'post' },
    avatar(acct),
    h('div', { class: 'content' }, h('div', { class: 'head' }, h('span', { class: 'name' }, acct.name), h('span', { class: 'time' }, aiMsgTime(m), m.edited ? ' (edited)' : '')),
      h('div', { class: 'text' }, richText(m.text)),
      h('div', { class: 'actions' },
        h('button', { class: 'act', type: 'button', 'aria-label': 'Edit message', 'data-label': 'Edit', title: 'Edit', onclick: () => aiEditMessage(acct, m) }, icon('notes')),
        h('button', { class: 'act del', type: 'button', 'aria-label': 'Delete message', 'data-label': 'Delete', title: 'Delete', onclick: async () => { await db.del('posts', m.id); aiRefresh(); } }, icon('trash')))));
}
function aiEditMessage(acct, m) {
  const ta = h('textarea', { rows: 5, 'aria-label': 'Message text' }, m.text), save = h('button', { class: 'btn primary' }, 'Save');
  const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Edit message')), h('div', { class: 'mp' }, ta, h('div', { class: 'btnrow', style: 'margin-top:12px' }, save))));
  save.addEventListener('click', async () => { const t = ta.value.trim(); if (!t) return; await savePost(acct, { ...m, text: t.slice(0, 4000), edited: true }); close(); aiRefresh(); });
  setTimeout(() => ta.focus(), 0);
}
// Bot messages for one channel, as list items for the chat column.
function aiMessageItems(acct, ctx, cid) {
  const bots = new Map(aiBots(ctx).map(b => [b.id, b]));
  const mine = ctx.apps.aimsg.filter(m => m.channel === cid && bots.has(m.from)).sort((a, b) => a.createdAt - b.createdAt), lastId = mine.length ? mine[mine.length - 1].id : null;
  return mine.map(m => ({ ts: m.createdAt, el: () => botMsgEl(acct, ctx, m, bots.get(m.from), m.id === lastId) }));
}

/* ---------- @mention suggestions in the message box ---------- */
function attachMentions(ta, getBots) {
  const pop = h('div', { class: 'mention-pop', role: 'listbox', hidden: true });
  let list = [], at = 0, q = null;
  const hide = () => { pop.hidden = true; list = []; q = null; };
  const show = () => {
    q = AI.mentionQuery(ta.value, ta.selectionStart);
    list = q ? AI.suggest(getBots(), q.query) : [];
    if (!list.length) return hide();
    at = Math.min(at, list.length - 1);
    pop.replaceChildren(...list.map((b, i) => h('button', { class: 'mention-opt' + (i === at ? ' on' : ''), type: 'button', role: 'option', 'aria-selected': String(i === at), onmousedown: e => { e.preventDefault(); pick(b); } }, botAvatar(b, 'sm'), h('span', {}, b.name), botTag())));
    pop.hidden = false;
  };
  const pick = b => {
    if (!q) return;
    const before = ta.value.slice(0, q.start), after = ta.value.slice(ta.selectionStart), ins = '@' + b.name + ' ';
    ta.value = before + ins + after; const pos = (before + ins).length; ta.setSelectionRange(pos, pos); hide(); ta.dispatchEvent(new Event('input')); ta.focus();
  };
  ta.addEventListener('input', () => { at = 0; show(); }); ta.addEventListener('click', show); ta.addEventListener('blur', () => setTimeout(hide, 120));
  ta.addEventListener('keydown', e => {
    if (pop.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); at = (at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; show(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); pick(list[at]); }
    else if (e.key === 'Escape') { e.preventDefault(); hide(); }
  }, true);
  return pop;
}

/* ---------- the member list and channel column ---------- */
function aiMemberRows(acct, ctx) {
  const bots = aiBots(ctx), rows = [h('div', { class: 'member-cat' }, `AI members — ${bots.length}`)];
  for (const b of bots) rows.push(h('a', { class: 'member' + (b.enabled === false ? ' off' : ''), href: '#/bot/' + b.id },
    h('span', { class: 'av-wrap' }, botAvatar(b, 'sm'), h('i', { class: 'dot ' + (b.enabled === false ? 'offline' : 'online') })),
    h('span', { class: 'names' }, h('b', {}, b.name, botTag()), h('small', {}, b.enabled === false ? 'Switched off' : b.bio || 'AI member'))));
  rows.push(h('button', { class: 'member add-ai', type: 'button', onclick: () => botEditor(acct, ctx, null) }, h('span', { class: 'add-plus' }, icon('plus')), h('span', { class: 'names' }, h('b', {}, 'Add an AI member'))));
  return rows;
}
function aiDmRows(acct, ctx, activeId) {
  const bots = aiBots(ctx); if (!bots.length) return [];
  return [h('div', { class: 'chan-cat' }, h('span', {}, 'Direct messages')),
    ...bots.map(b => h('div', { class: 'chan-row dm' + (activeId === b.id ? ' active' : '') }, h('a', { href: '#/dm/' + b.id, onclick: closeDrawers }, botAvatar(b, 'xs'), h('span', {}, b.name))))];
}

/* ---------- a private chat with one bot ---------- */
function dmView(acct, ctx, botId) {
  const bot = aiBots(ctx).find(b => b.id === botId);
  if (!bot) return [topbar('Direct message', { back: true }), emptyState('Nobody here', 'That AI member is gone.')];
  const cid = AI.DM(bot.id), msgs = ctx.apps.aimsg.filter(m => m.channel === cid).sort((a, b) => a.createdAt - b.createdAt);
  if (!msgs.length && bot.greeting && !aiRun) {
    // the first time you open the chat, they say hello
    savePost(acct, { id: uid(), accountId: acct.id, kind: 'aimsg', channel: cid, from: bot.id, text: AI.cleanReply(bot.greeting.replace(/\{\{\s*user\s*\}\}/gi, acct.name).replace(/\{\{\s*char\s*\}\}/gi, bot.name), bot), createdAt: Date.now() }).then(aiRefresh);
  }
  const lastBot = [...msgs].reverse().find(m => m.from !== 'user');
  const items = msgs.map(m => m.from === 'user' ? dmUserEl(acct, m) : botMsgEl(acct, ctx, m, bot, lastBot && m.id === lastBot.id));
  const head = h('div', { class: 'chat-head' },
    h('button', { class: 'hamburger', type: 'button', 'aria-label': 'Open channels', onclick: () => drawer('left') }, icon('menu')),
    botAvatar(bot, 'xs'), h('h1', {}, bot.name), botTag(), h('span', { class: 'topic' }, bot.bio || 'Private chat'),
    h('span', { style: 'margin-left:auto' }),
    h('a', { class: 'ub', href: '#/bot/' + bot.id, title: 'Profile', 'aria-label': 'Profile' }, icon('user')),
    h('button', { class: 'ub', type: 'button', title: 'Clear this chat', 'aria-label': 'Clear this chat', onclick: async () => { if (!confirm(`Clear your chat with ${bot.name}? There is no undo.`)) return; for (const m of msgs) await db.del('posts', m.id); aiRefresh(); } }, icon('trash')));
  const list = h('div', { class: 'chat-list', role: 'log', 'aria-label': `Chat with ${bot.name}` },
    h('div', { class: 'chat-welcome' }, h('div', { class: 'big-av' }, botAvatar(bot, 'lg')), h('h2', {}, bot.name), h('p', {}, bot.bio || `This is the start of your private chat with ${bot.name}.`), h('p', { class: 'muted' }, 'Only the two of you, and the model on this device.')),
    items, aiRun && aiRun.channel === cid ? aiTypingRow() : null, aiNoticeRow(cid));
  const comp = composer(acct, { placeholder: `Message ${bot.name}`, enterSends: true, label: W('send'), customSave: async ({ text }) => { await aiDmSend(acct, bot.id, text); }, onDone: () => aiRefresh() });
  return [head, list, comp];
}

/* ---------- a bot's profile ---------- */
function botPage(acct, ctx, botId) {
  const bot = aiBots(ctx).find(b => b.id === botId);
  if (!bot) return [topbar('AI member', { back: true }), emptyState('Not found', 'That AI member is gone.')];
  const banner = h('div', { class: 'banner ghost' }); if (bot.bannerImg) paintImage(banner, bot.bannerImg); else banner.style.background = `linear-gradient(135deg, ${botFace(bot).color}, color-mix(in srgb, ${botFace(bot).color} 40%, #000))`;
  const names = channelNames(ctx);
  return [topbar(bot.name, { back: true, sub: 'AI member' }),
    h('div', { class: 'gen-tag', role: 'note' }, h('b', {}, 'AI member'), ' · runs on a model file on this device, not on anyone else\'s computer'),
    banner,
    h('div', { class: 'pinfo' },
      h('div', { class: 'top' }, h('div', { class: 'avwrap' }, botAvatar(bot, 'lg')),
        h('div', { class: 'btnrow', style: 'margin-top:12px' }, h('a', { class: 'btn primary', href: '#/dm/' + bot.id }, 'Message'), h('button', { class: 'btn', type: 'button', onclick: () => botEditor(acct, ctx, bot) }, 'Edit'))),
      h('h2', {}, bot.name, botTag()), h('div', { class: 'muted' }, bot.enabled === false ? 'Switched off' : 'Online'),
      h('div', { class: 'bio' }, bot.bio || 'No bio.'),
      h('div', { class: 'meta' }, AI.permLabel(bot, names)),
      h('div', { class: 'meta' }, `Answers when you write @${bot.name} (spelled exactly), or in a private chat.`),
      h('div', { class: 'btnrow', style: 'margin-top:12px' },
        h('button', { class: 'btn', type: 'button', onclick: async () => { await savePost(acct, { ...bot, enabled: bot.enabled === false }); render(true); } }, bot.enabled === false ? 'Switch on' : 'Switch off'),
        h('button', { class: 'btn', type: 'button', onclick: () => botExport(bot) }, 'Export character card'),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (!confirm(`Delete ${bot.name} and every message they wrote? There is no undo.`)) return; await botDelete(acct, bot); toast(`${bot.name} was deleted.`); go('/'); } }, 'Delete'))),
    bot.persona ? h('div', { class: 'app-pad' }, h('h3', {}, 'How they talk'), h('p', { style: 'white-space:pre-wrap' }, bot.persona)) : null,
  ];
}
async function botDelete(acct, bot) {
  for (const p of await db.postsOf(acct.id)) {
    if ((p.kind === 'aimsg' && (p.from === bot.id || p.channel === AI.DM(bot.id))) || p.id === bot.id) await db.del('posts', p.id);
  }
  if (aiRun && aiRun.bot.id === bot.id) aiStop();
}

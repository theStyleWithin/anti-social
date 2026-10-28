'use strict';
/* AI members: the editor, character cards, the Settings tab, the channel mode window, and away ("go nuts") chat.
   Everything runs on this device. */

const aiField = (label, el, hint) => h('label', { class: 'field' }, h('span', {}, label), el, hint ? h('small', { class: 'hint' }, hint) : null);
const aiChannels = ctx => [{ id: 'general', name: 'general' }, ...[...ctx.apps.chan].sort((a, b) => a.createdAt - b.createdAt).map(c => ({ id: c.id, name: c.name }))];
const aiSaveBot = (acct, rec) => savePost(acct, { accountId: acct.id, createdAt: Date.now(), ...rec, kind: 'bot' });

/* ---------- making and editing a character ---------- */
function botEditor(acct, ctx, bot, seed) {
  const isNew = !bot, base = bot || seed || AI.normBot({ name: '' });
  const bots = aiBots(ctx), chans = aiChannels(ctx), perm = AI.normPerm(base.allowed);
  let avatarImg = base.avatarImg || null, bannerImg = base.bannerImg || null, colorTouched = !!base.color;
  const name = h('input', { value: base.name || '', maxlength: AI.MAX_NAME, placeholder: 'Nova', 'aria-label': 'Name', autocapitalize: 'off', spellcheck: 'false' });
  const bio = h('textarea', { rows: 2, maxlength: AI.LIMITS.bio, 'aria-label': 'Bio' }, base.bio || '');
  const persona = h('textarea', { rows: 6, maxlength: AI.LIMITS.persona, placeholder: 'Who they are and how they talk. For example: "Nova is a cheerful space pilot who ends every message with a pun."', 'aria-label': 'How they talk' }, base.persona || '');
  const scenario = h('textarea', { rows: 2, maxlength: AI.LIMITS.scenario, 'aria-label': 'Scenario' }, base.scenario || '');
  const greeting = h('textarea', { rows: 2, maxlength: AI.LIMITS.greeting, placeholder: 'What they say first in a private chat.', 'aria-label': 'Greeting' }, base.greeting || '');
  const examples = h('textarea', { rows: 4, maxlength: AI.LIMITS.examples, placeholder: 'A few lines in their voice (optional).', 'aria-label': 'Example messages' }, base.examples || '');
  const color = h('input', { type: 'color', value: toHex(base.color || colorFor(base.name || 'bot')), 'aria-label': 'Color' });
  const temp = h('input', { type: 'number', min: '0', max: '2', step: '0.1', value: String(base.temperature ?? 0.8), 'aria-label': 'Creativity' });
  const maxTok = h('input', { type: 'number', min: '16', max: '1024', step: '16', value: String(base.maxTokens ?? 200), 'aria-label': 'Reply length' });
  const enabled = h('input', { type: 'checkbox', checked: base.enabled !== false, 'aria-label': 'Switched on' });
  const mode = h('select', { 'aria-label': 'Where can they talk' }, h('option', { value: 'all' }, 'Everywhere'), h('option', { value: 'only' }, 'Only in the channels I tick'), h('option', { value: 'except' }, 'Everywhere except the channels I tick'));
  mode.value = perm.mode;
  const ticks = chans.map(c => ({ c, box: h('input', { type: 'checkbox', checked: perm.channels.includes(c.id), 'aria-label': '#' + c.name }) }));
  const chanBox = h('div', { class: 'perm-list' }, ticks.map(t => h('label', { class: 'perm-row' }, t.box, h('span', {}, '#' + t.c.name))));
  const syncPerm = () => { chanBox.hidden = mode.value === 'all'; };
  mode.addEventListener('change', syncPerm); syncPerm();
  const banner = h('div', { class: 'banner edit' }), av = h('div', { class: 'avatar lg' });
  const paint = () => {
    const c = color.value;
    banner.style.background = `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 40%, #000))`; banner.style.backgroundImage = ''; paintImage(banner, bannerImg);
    av.style.background = c; av.style.backgroundImage = ''; av.textContent = avatarImg ? '' : (name.value.trim() || '?')[0].toUpperCase(); paintImage(av, avatarImg);
  };
  color.addEventListener('input', () => { colorTouched = true; paint(); }); name.addEventListener('input', () => { if (!colorTouched) color.value = toHex(colorFor(name.value || 'bot')); paint(); });
  paint();
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary' }, isNew ? 'Add AI member' : 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, isNew ? 'New AI member' : 'Edit ' + base.name)),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'They live on your private server and answer only when you write @ and their name exactly, or in a private chat. A model file on this device writes every word.'),
      banner,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: async () => { const d = await chooseImage(1500, 500); if (d) { bannerImg = d; paint(); } } }, 'Change banner'), h('button', { class: 'btn', type: 'button', onclick: () => { bannerImg = null; paint(); } }, 'Remove banner')),
      h('div', { style: 'margin:12px 0' }, av),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: async () => { const d = await chooseImage(256, 256); if (d) { avatarImg = d; paint(); } } }, 'Change picture'), h('button', { class: 'btn', type: 'button', onclick: () => { avatarImg = null; paint(); } }, 'Remove picture')),
      h('div', { style: 'height:12px' }),
      aiField('Name', name, 'This is how you ping them: @' + (name.value || 'Name') + ' (spelled exactly)'),
      aiField('Bio', bio), aiField('How they talk (personality)', persona), aiField('Scenario (optional)', scenario), aiField('Greeting', greeting), aiField('Example messages (optional)', examples),
      h('div', { class: 'two' }, aiField('Color', color), aiField('Creativity (0 to 2)', temp)),
      h('div', { class: 'two' }, aiField('Longest reply (tokens)', maxTok), h('label', { class: 'field check' }, enabled, h('span', {}, 'Switched on'))),
      aiField('Where they may talk', mode), chanBox,
      err, h('div', { class: 'btnrow' }, save))));
  save.addEventListener('click', async () => {
    const msg = AI.nameError(name.value, bots, bot && bot.id);
    if (msg) { err.textContent = msg; return; }
    const norm = AI.normBot({ name: name.value, bio: bio.value, persona: persona.value, scenario: scenario.value, greeting: greeting.value, examples: examples.value, color: colorTouched ? color.value : null, temperature: temp.value, maxTokens: maxTok.value, enabled: enabled.checked,
      allowed: { mode: mode.value, channels: ticks.filter(t => t.box.checked).map(t => t.c.id) } });
    await aiSaveBot(acct, { ...(bot || {}), id: bot ? bot.id : uid(), ...norm, avatarImg, bannerImg });
    close(); toast(isNew ? `${norm.name} joined the server.` : 'Saved.'); render(true);
  });
  setTimeout(() => name.focus(), 0);
}

/* ---------- character cards ---------- */
async function botCardPng(bot) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = bot.color || colorFor(bot.name); g.fillRect(0, 0, 512, 512);
  if (bot.avatarImg) {
    const img = new Image(); img.src = bot.avatarImg; await img.decode();
    const s = Math.max(512 / img.width, 512 / img.height); g.drawImage(img, (512 - img.width * s) / 2, (512 - img.height * s) / 2, img.width * s, img.height * s);
  } else { g.fillStyle = '#fff'; g.font = 'bold 280px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(bot.name[0].toUpperCase(), 256, 280); }
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return AI.cardToPng(new Uint8Array(await blob.arrayBuffer()), JSON.stringify(AI.exportCard(bot)));
}
function botExport(bot) {
  const file = bot.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'character';
  const done = r => toast(r.ok ? `Saved to ${r.where}.` : r.where);
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'Export ' + bot.name)),
    h('div', { class: 'mp' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'A character card is a small file other chat apps can open too. It holds their name, bio, personality, scenario, greeting and examples. The picture card also carries their picture.'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn primary', type: 'button', onclick: async () => { close(); try { done(await saveFile(file + '.png', 'image/png', await botCardPng(bot))); } catch (e) { toast('The card could not be made.'); } } }, 'Picture card (.png)'),
        h('button', { class: 'btn', type: 'button', onclick: async () => { close(); done(await saveFile(file + '.json', 'application/json', JSON.stringify(AI.exportCard(bot), null, 2))); } }, 'Text card (.json)')))));
}
async function botImport(acct, ctx) {
  const input = h('input', { type: 'file', accept: '.json,.png,image/png,application/json', hidden: true });
  input.addEventListener('change', async () => {
    const f = input.files[0]; input.remove(); if (!f) return;
    try {
      if (f.size > 12 * 1024 * 1024) return toast('That file is too big to be a character card.');
      const bytes = new Uint8Array(await f.arrayBuffer()), png = AI.isPng(bytes);
      const json = png ? AI.cardFromPng(bytes) : new TextDecoder().decode(bytes);
      const r = json == null ? { ok: false, error: 'That picture has no character card inside it.' } : AI.importCard(json);
      if (!r.ok) return toast(r.error);
      const bots = aiBots(ctx), nm = base => { let n = base, i = 2; while (bots.some(b => AI.sameName(b.name, n))) n = AI.cleanName(base.slice(0, AI.MAX_NAME - 3)) + ' ' + i++; return n; };
      const bot = { ...r.bot, name: nm(r.bot.name) };
      let avatarImg = null;
      if (png) { try { avatarImg = await cropImage(f, 256, 256); } catch { /* a card without a usable picture */ } }
      botEditor(acct, ctx, null, { ...bot, avatarImg });
      toast('Check the card, then press Add AI member.');
    } catch (e) { console.error(e); toast('That file could not be read as a character card.'); }
  });
  input.addEventListener('cancel', () => input.remove());
  document.body.append(input); input.click();
}

/* ---------- Settings: AI members ---------- */
const AI_CTX = [2048, 4096, 8192, 16384, 32768];
function aiLocalPanel(acct) {
  const e = window.AntiSocialAI || null, cfg = aiConfig();
  if (!e) return h('section', {}, h('h3', {}, 'Model on this device'), h('p', {}, 'This copy of Anti-Social cannot run models. The Windows, Linux and Android apps can. Your AI members and their messages are saved either way, and they will talk again as soon as you open the account in an app with an engine.'));
  const state = h('p', { class: 'fine', style: 'padding:8px 0 0' }, 'Checking...'), info = h('p', { class: 'fine', style: 'padding:0' }, '');
  const model = h('p', { class: 'ai-model' }, cfg.model ? [h('b', {}, cfg.model.name || cfg.model.path), cfg.model.size ? ` · ${fmtMB(cfg.model.size)}` : ''] : 'No model chosen yet.');
  const ctxSel = h('select', { 'aria-label': 'Memory length' }, AI_CTX.map(n => h('option', { value: String(n) }, `${n.toLocaleString()} tokens`))); ctxSel.value = String(cfg.ctx || 4096);
  const gpuSel = h('select', { 'aria-label': 'Processor' }, h('option', { value: 'auto' }, 'Graphics card if there is one (automatic)'), h('option', { value: 'cpu' }, 'Processor only'));
  gpuSel.value = cfg.gpu === 'cpu' ? 'cpu' : 'auto';
  const store = () => aiSaveConfig({ ...aiConfig(), ctx: Number(ctxSel.value), gpu: gpuSel.value });
  ctxSel.addEventListener('change', store); gpuSel.addEventListener('change', store);
  const refresh = async () => {
    try {
      const st = await e.status(); state.textContent = st.loaded ? `Loaded: ${(st.path || '').split(/[\\/]/).pop()}${st.backend ? ' · ' + st.backend : ''}` : 'No model is loaded. It loads by itself the first time someone answers.';
      const si = e.systemInfo ? await e.systemInfo() : null;
      info.textContent = si ? `This computer: ${si.ramGB ? si.ramGB + ' GB memory' : ''}${si.gpu ? ' · ' + si.gpu : ''}${si.cpus ? ' · ' + si.cpus + ' processor threads' : ''}` : '';
    } catch { state.textContent = 'The engine did not answer.'; }
  };
  refresh();
  return h('section', {}, h('h3', {}, 'Model on this device'),
    h('p', {}, 'Download a model file yourself (a ".gguf" file) and point Anti-Social at it. The app never connects to the internet, so it cannot fetch one for you. Bigger models write better and need more memory: phones do well with small ones (1 to 3 billion parameters), computers can run much larger ones.'),
    model,
    h('div', { class: 'btnrow' },
      h('button', { class: 'btn primary', type: 'button', onclick: async () => { try { const m = await e.pickModel(); if (!m) return; aiSaveConfig({ ...aiConfig(), model: m }); toast('Model chosen.'); render(true); } catch (x) { toast('That file could not be used: ' + (x && x.message || x)); } } }, cfg.model ? 'Choose a different model' : 'Choose model file'),
      cfg.model && h('button', { class: 'btn', type: 'button', onclick: async () => { try { await aiEnsure(); await refresh(); toast('Model loaded.'); } catch (x) { toast(x.message); } } }, 'Load now'),
      h('button', { class: 'btn', type: 'button', onclick: async () => { try { await e.unload(); await refresh(); toast('Model unloaded. Memory is free again.'); } catch (x) { toast(String(x && x.message || x)); } } }, 'Unload')),
    aiField('Memory length', ctxSel, 'How much of the conversation a character can remember. Longer uses more memory.'), aiField('Run on', gpuSel),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: async () => {
      try {
        const start = Date.now(); let n = 0; const id = uid();
        toast('Testing...'); const en = await aiEnsure();
        const out = await en.generate({ id, system: 'You are a friendly test.', prompt: 'Say hello in a few words.', maxTokens: 24, temperature: 0.7, stop: [] }, { onToken: () => { n++; } });
        const secs = Math.max(0.1, (Date.now() - start) / 1000);
        toast(`It works: ${n} words in ${secs.toFixed(1)} seconds. It said: ${String(out).trim().slice(0, 60) || '(nothing)'}`);
      } catch (x) { toast(x.message || String(x)); }
    } }, 'Test it')),
    state, info);
}
let aiModelList = null, aiModelErr = '';
function aiOnlinePanel() {
  const cfg = aiConfig(), on = cfg.online || {};
  const keep = patch => aiSaveConfig({ ...aiConfig(), online: { ...(aiConfig().online || {}), ...patch } });
  const key = h('input', { type: 'password', value: on.key || '', placeholder: 'Paste your TokenReply API key', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'TokenReply API key' });
  const freeOnly = h('input', { type: 'checkbox', checked: on.freeOnly !== false, 'aria-label': 'Only free models' });
  const sel = h('select', { 'aria-label': 'Model' });
  const status = h('p', { class: 'fine', style: 'padding:6px 0 0' }, aiModelErr || (on.model ? '' : 'Paste your key, then press "Load models".'));
  const fill = () => {
    const list = (aiModelList || []).filter(m => !freeOnly.checked || m.free);
    const cur = (aiConfig().online || {}).model;
    sel.replaceChildren(h('option', { value: '' }, list.length ? 'Choose a model...' : (aiModelList ? 'No models match' : (cur ? cur : 'Load models first'))),
      ...list.map(m => h('option', { value: m.id }, m.id + (m.free ? ' (free)' : ''))));
    if (cur && !list.some(m => m.id === cur) && !aiModelList) sel.value = '';
    sel.value = cur && list.some(m => m.id === cur) ? cur : '';
    if (cur && !aiModelList) { sel.replaceChildren(h('option', { value: cur }, cur)); sel.value = cur; }
  };
  fill();
  key.addEventListener('change', () => { keep({ key: key.value.trim() }); aiModelList = null; aiModelErr = ''; });
  freeOnly.addEventListener('change', () => { keep({ freeOnly: freeOnly.checked }); fill(); });
  sel.addEventListener('change', () => { keep({ model: sel.value }); if (sel.value) toast('Model chosen.'); });
  const load = h('button', { class: 'btn primary', type: 'button' }, 'Load models');
  load.addEventListener('click', async () => {
    keep({ key: key.value.trim() }); if (!key.value.trim()) { status.textContent = 'Paste your API key first.'; return; }
    load.disabled = true; status.textContent = 'Asking TokenReply...';
    try { aiModelList = await AIOnline.models(key.value.trim()); aiModelErr = ''; const free = aiModelList.filter(m => m.free).length; status.textContent = `${aiModelList.length} models found${free ? `, ${free} free` : ''}.`; if (!free && freeOnly.checked) { freeOnly.checked = false; keep({ freeOnly: false }); status.textContent += ' None are marked free, so all are shown.'; } fill(); }
    catch (e) { aiModelErr = e.message; status.textContent = e.message; } finally { load.disabled = false; }
  });
  return h('section', {}, h('h3', {}, 'TokenReply (online)'),
    h('p', {}, 'Optional. Instead of a model file, your AI members can be answered by TokenReply, which is handy on a phone. Everything the character says to the model goes over the internet to ' + AIOnline.BASE + ' and nowhere else: your API key, the character\'s description and the recent chat. Nothing else in Anti-Social ever goes online. Switch back to "On this device" and nothing is sent.'),
    aiField('API key', key, 'Kept on this device only. It is not part of your exported account file.'),
    h('div', { class: 'btnrow' }, load),
    h('label', { class: 'field check' }, freeOnly, h('span', {}, 'Only show free models')),
    aiField('Model', sel), status);
}
function aiEnginePanel(acct) {
  const cfg = aiConfig(), online = cfg.provider === 'online';
  const pick = h('select', { 'aria-label': 'Where the AI runs' }, h('option', { value: 'local' }, 'On this device (a model file; nothing is sent anywhere)'), h('option', { value: 'online' }, 'TokenReply (online, optional)'));
  pick.value = online ? 'online' : 'local';
  pick.addEventListener('change', () => {
    if (pick.value === 'online' && !confirm('With TokenReply on, the chat text, the character descriptions and your API key are sent over the internet to api.tokenreply.com so it can write the replies. Turn it on?')) { pick.value = 'local'; return; }
    aiSaveConfig({ ...aiConfig(), provider: pick.value }); render(true);
  });
  return [h('section', {}, h('h3', {}, 'Where the AI runs'), aiField('Provider', pick, online ? 'Online: replies are written by TokenReply.' : 'Local: replies are written by a model file on this device.')), online ? aiOnlinePanel() : aiLocalPanel(acct)];
}
function aiTab(acct, ctx) {
  const bots = aiBots(ctx), names = channelNames(ctx);
  return [
    ...aiEnginePanel(acct),
    h('section', {}, h('h3', {}, `AI members (${bots.length})`),
      h('p', {}, 'Characters you make for your private server. They answer when you ping them with @ and their name spelled exactly right, and in a private chat. Each one has its own personality and rules about where it may talk. Use the sparkle button in a channel to set up taking turns or away chat.'),
      bots.map(b => h('div', { class: 'person-row' }, h('a', { href: '#/bot/' + b.id, 'aria-label': b.name }, botAvatar(b, 'sm')),
        h('div', { class: 'who' }, h('b', {}, b.name), h('small', {}, (b.enabled === false ? 'Switched off · ' : '') + AI.permLabel(b, names))),
        h('button', { class: 'btn', type: 'button', onclick: () => botEditor(acct, ctx, b) }, 'Edit'))),
      h('div', { class: 'btnrow', style: 'margin-top:10px' }, h('button', { class: 'btn primary', type: 'button', onclick: () => botEditor(acct, ctx, null) }, 'Add an AI member'), h('button', { class: 'btn', type: 'button', onclick: () => botImport(acct, ctx) }, 'Import character card'))),
    h('section', {}, h('h3', {}, 'Away chat and battery'),
      h('p', {}, 'Away chat lets your AI members keep talking to each other while you do something else. Running a model uses the processor or graphics card hard, so on a laptop or phone it drains the battery quickly. By default it only runs while charging, stops below 30% battery, waits between messages and never sends more than 30 an hour. You can change all of that per channel. It pauses when the vault locks.'),
      h('p', { class: 'fine', style: 'padding:0' }, 'Android may pause the app when the screen is off. The app asks Android to keep it running only while away chat is on and charging.')),
  ];
}

/* ---------- a channel's AI window: pings, taking turns, away chat ---------- */
const aiModeRec = (ctx, cid) => ctx.apps.aimode.find(m => m.channel === cid) || null;
function channelAiModal(acct, ctx, cid, chName) {
  const bots = aiBots(ctx).filter(b => AI.mayAnswer(b, cid)), rec = aiModeRec(ctx, cid);
  const cur = rec ? rec.mode : 'mention', f = AI.normFree({ ...AI.FREE_DEFAULTS, ...(rec && rec.free || {}), enabled: rec && rec.free ? rec.free.enabled : false });
  if (!aiBots(ctx).length) { toast('Add an AI member first (member list, "Add an AI member").'); return; }
  const modeSel = h('select', { 'aria-label': 'Mode' },
    h('option', { value: 'mention' }, 'One at a time: they answer when pinged'), h('option', { value: 'group' }, 'Take turns: the ones I pick answer every message'), h('option', { value: 'free' }, 'Away chat: they chat with each other, even when I am away'));
  modeSel.value = cur;
  const pickBots = (ids) => bots.map(b => ({ b, box: h('input', { type: 'checkbox', checked: (ids || []).includes(b.id), 'aria-label': b.name }) }));
  const gp = pickBots(rec && rec.botIds), fp = pickBots(f.botIds);
  const list = ps => h('div', { class: 'perm-list' }, ps.length ? ps.map(p => h('label', { class: 'perm-row' }, p.box, botAvatar(p.b, 'xs'), h('span', {}, p.b.name))) : h('p', { class: 'fine' }, 'No AI member is allowed to talk in this channel. Change that on their profile.'));
  const num = (v, min, max, label) => h('input', { type: 'number', min: String(min), max: String(max), value: String(v), 'aria-label': label });
  const rounds = num((rec && rec.rounds) || 1, 1, 10, 'Rounds');
  const pMin = num(f.paceMin, 5, 3600, 'Fastest'), pMax = num(f.paceMax, 5, 7200, 'Slowest'), cap = num(f.maxPerHour, 1, 600, 'Messages per hour'), minBat = num(f.minBattery, 0, 100, 'Stop below battery'), cuMax = num(f.catchUpMax, 1, 50, 'Catch up with at most');
  const charging = h('input', { type: 'checkbox', checked: f.onlyCharging }), catchUp = h('input', { type: 'checkbox', checked: f.catchUp });
  const groupBox = h('div', {}, h('p', { class: 'fine', style: 'padding:0 0 8px' }, 'Pick the AI members. Each time you send a message in this channel they reply in the order of the member list. Pings still work as usual.'), list(gp), aiField('Rounds', rounds, 'How many times each one speaks per message (1 to 10).'));
  const freeBox = h('div', {}, h('p', { class: 'fine', style: 'padding:0 0 8px' }, 'Pick at least two. They will talk to each other here while this window is open or minimised. Your own message is optional. Stop it any time with the Stop button or by choosing a different mode.'),
    list(fp), h('div', { class: 'two' }, aiField('Fastest (seconds between messages)', pMin), aiField('Slowest', pMax)), aiField('Never more than this many an hour', cap),
    h('label', { class: 'field check' }, charging, h('span', {}, 'Only while charging')), aiField('Stop when battery is below (%)', minBat),
    h('label', { class: 'field check' }, catchUp, h('span', {}, 'When I come back after a while, fill in what they would have said')), aiField('Catch up with at most this many messages', cuMax));
  const sync = () => { groupBox.hidden = modeSel.value !== 'group'; freeBox.hidden = modeSel.value !== 'free'; };
  modeSel.addEventListener('change', sync); sync();
  const err = h('p', { class: 'err' }), save = h('button', { class: 'btn primary' }, 'Save');
  const close = modal(h('div', {},
    h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => close() }, icon('x')), h('b', {}, 'AI members in #' + chName)),
    h('div', { class: 'mp' }, aiField('How they talk in this channel', modeSel), groupBox, freeBox, err, h('div', { class: 'btnrow' }, save))));
  save.addEventListener('click', async () => {
    const mode = modeSel.value, gIds = gp.filter(p => p.box.checked).map(p => p.b.id), fIds = fp.filter(p => p.box.checked).map(p => p.b.id);
    if (mode === 'group' && !gIds.length) { err.textContent = 'Pick at least one AI member.'; return; }
    if (mode === 'free' && fIds.length < 2) { err.textContent = 'Away chat needs at least two AI members.'; return; }
    const free = AI.normFree({ botIds: fIds, paceMin: pMin.value, paceMax: pMax.value, maxPerHour: cap.value, onlyCharging: charging.checked, minBattery: minBat.value, catchUp: catchUp.checked, catchUpMax: cuMax.value, enabled: mode === 'free' });
    await savePost(acct, { id: 'aimode-' + cid, accountId: acct.id, kind: 'aimode', channel: cid, mode, botIds: gIds, rounds: Math.max(1, Math.min(10, Number(rounds.value) || 1)), free, createdAt: rec ? rec.createdAt : Date.now() });
    close(); toast(mode === 'free' ? 'Away chat is on for this channel.' : 'Saved.'); aiFreeKick(); render(true);
  });
}

/* ---------- away chat: runs on a timer while the app is open ---------- */
let aiFree = null;
const aiBattery = async () => {
  if (aiFree.battery !== undefined) return aiFree.battery;
  if (!navigator.getBattery) return (aiFree.battery = null);
  try { aiFree.battery = await navigator.getBattery(); } catch { aiFree.battery = null; }
  return aiFree.battery;
};
const aiPower = async () => { const b = await aiBattery(); return b ? { charging: !!b.charging, level: b.level } : null; };
const aiMarkSeen = () => { try { ls('as.ai.seen', String(Date.now())); } catch { /* ignore */ } };
async function aiFreeTick() {
  if (aiFree.busy) return;
  aiFree.busy = true;
  try {
    const acct = currentAcct; if (!acct || acct.locked || !aiEngine() || tplId() !== 'chat') return;
    const all = await loadPosts(acct), bots = all.filter(p => p.kind === 'bot');
    for (const rec of all.filter(p => p.kind === 'aimode' && p.mode === 'free' && p.free && p.free.enabled)) {
      const ch = rec.channel, now = Date.now();
      if (aiRun || aiPending > 0) continue;
      const sent = (aiFree.sent[ch] = (aiFree.sent[ch] || []).filter(t => now - t < 3600000));
      const plan = AI.freeNext({ cfg: rec.free, bots, channel: ch, lastSpeakerId: aiFree.last.get(ch), sent, now, battery: await aiPower() });
      if (plan.action === 'stop') { aiFree.status.set(ch, plan.reason); continue; }
      if (plan.action === 'wait') { aiFree.status.set(ch, plan.reason); aiFree.next.delete(ch); continue; }
      aiFree.status.set(ch, '');
      if (!aiFree.next.has(ch)) { aiFree.next.set(ch, now + plan.delayMs); continue; }
      if (now < aiFree.next.get(ch)) continue;
      aiFree.next.delete(ch); aiFree.last.set(ch, plan.bot.id);
      sent.push(now); ls('as.ai.sent', JSON.stringify(aiFree.sent));
      await aiEnqueue(() => aiRunTurns(acct, [plan.bot], ch, 9, { left: 1 }));          // depth 9: no pings chain off away chat
      break;
    }
  } catch (e) { console.error(e); } finally { aiFree.busy = false; }
}
function aiFreeKick() { clearTimeout(aiFree.timer); aiFree.timer = setTimeout(async () => { await aiFreeTick(); aiFreeKick(); }, 4000); }
// Fill in conversation for the time you were away (phones pause the app, so this stands in for what they would have said).
async function aiCatchUp() {
  const acct = currentAcct; if (!acct || acct.locked || !aiEngine() || tplId() !== 'chat') return;
  const seen = Number(ls('as.ai.seen')) || 0, now = Date.now(); if (!seen) return;
  const all = await loadPosts(acct), bots = all.filter(p => p.kind === 'bot');
  for (const rec of all.filter(p => p.kind === 'aimode' && p.mode === 'free' && p.free && p.free.enabled && p.free.catchUp)) {
    const lastAi = Math.max(0, ...all.filter(m => m.kind === 'aimsg' && m.channel === rec.channel).map(m => m.createdAt));
    const awayMs = now - Math.max(seen, lastAi), stamps = AI.catchUpPlan({ cfg: rec.free, awayMs, now });
    let last = aiFree.last.get(rec.channel);
    for (const ts of stamps) {
      const plan = AI.freeNext({ cfg: rec.free, bots, channel: rec.channel, lastSpeakerId: last, sent: [], now });
      if (plan.action !== 'speak') break;
      last = plan.bot.id;
      try { await aiEnqueue(() => aiReply(acct, plan.bot.id, rec.channel, { createdAt: ts })); } catch (e) { aiFail(rec.channel, e); break; }
    }
    aiFree.last.set(rec.channel, last);
  }
  aiMarkSeen();
}
function aiInit() {
  let sent = {}; try { sent = JSON.parse(ls('as.ai.sent') || '{}') || {}; } catch { /* fresh */ }
  aiFree = { next: new Map(), last: new Map(), sent, battery: undefined, busy: false, status: new Map(), timer: 0 };
  document.addEventListener('visibilitychange', () => { if (document.hidden) aiMarkSeen(); else aiCatchUp(); });
  setInterval(() => { if (!document.hidden) aiMarkSeen(); }, 30000);
  aiMarkSeen();
  aiFreeKick();
}

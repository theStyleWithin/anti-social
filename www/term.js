'use strict';
/* Terminal Practice: a pretend Linux terminal for learning. Nothing here runs a real command or touches your real files.
   It works on a small made-up file system that is saved with your account. */
const TX = TermCore, TL = TermLessons;
let txTab = 'terminal', txSt = null, txProgress = {}, txFor = null, txLines = [], txHistIdx = -1, txDraft = '', txViaHist = false, txSaveT = null, txRec = null, txInsert = '', txShowHint = false, txLastTab = '', txRef = null;
const TX_GROUPS = [
  ['Move around', ['pwd', 'ls', 'cd']], ['Make, copy, move, delete', ['mkdir', 'touch', 'cp', 'mv', 'rm', 'rmdir']], ['Look inside files', ['cat', 'head', 'tail', 'wc', 'sort', 'uniq']],
  ['Search', ['grep', 'find']], ['Permissions and admin', ['chmod', 'chown', 'sudo', 'apt', 'whoami', 'id']], ['Text tricks', ['echo', 'cut', 'tr', 'sed', 'tee']],
  ['Shortcuts and help', ['man', 'help', 'history', 'alias', 'export', 'env', 'which', 'clear']], ['About the computer', ['uname', 'date', 'uptime', 'df', 'du', 'free', 'ps', 'hostname']],
];
const TX_KEYS = [['Tab', 'Press Tab to finish a file or command name.'], ['↑  ↓', 'Older and newer commands.'], ['Ctrl+C', 'Cancel what you are typing.'], ['Ctrl+L', 'Clear the screen.'], ['Ctrl+U', 'Delete the whole line.'], ['!!', 'Run the last command again.'], ['|', 'Pipe: send one command into the next.'], ['>   >>', 'Write output to a file (replace, or add).'], ['&&', 'Run the next only if the first worked.'], ['*', 'Wildcard: *.txt means every .txt file.'], ['~', 'Your home folder.'], ['..', 'The folder above.']];

function txLoad(acct, ctx) {
  if (txFor === acct.id && txSt) return;
  txRec = ctx.apps.termstate[0] || null; txFor = acct.id;
  txSt = TX.restore(txRec && txRec.state); txProgress = TL.normProgress(txRec && txRec.progress); txLines = [];
  txLines.push({ t: 'sys', s: 'Practice Terminal. This is pretend: nothing you type here can harm anything.\nType help to see commands, or open the Lessons tab to be guided.\n' });
}
function txSaveSoon(acct) {
  clearTimeout(txSaveT);
  txSaveT = setTimeout(() => { txSaveT = null; txRec = { id: 'termstate' + acct.id, accountId: acct.id, kind: 'termstate', createdAt: Date.now(), state: TX.snapshot(txSt), progress: txProgress }; appSave(acct, txRec); }, 600);
}
// text with colour codes -> a fragment of spans
function txAnsi(text) {
  const frag = document.createDocumentFragment(), re = /\x1b\[([0-9;]*)m/g; let cls = '', last = 0, m;
  const put = s => { if (!s) return; const sp = document.createElement('span'); if (cls) sp.className = cls; sp.textContent = s; frag.append(sp); };
  while ((m = re.exec(text))) { put(text.slice(last, m.index)); last = re.lastIndex; const c = m[1]; cls = c === '' || c === '0' ? '' : c === '1;34' ? 'tx-dir' : c === '1;32' ? 'tx-exe' : c === '1;31' ? 'tx-red' : c === '1;36' ? 'tx-cyan' : c === '2' ? 'tx-dim' : c === '1' ? 'tx-bold' : ''; }
  put(text.slice(last)); return frag;
}

function terminalView(acct, ctx, back) {
  txLoad(acct, ctx);
  const tab = (k, label) => h('button', { role: 'tab', 'aria-selected': String(txTab === k), class: txTab === k ? 'active' : '', onclick: () => { txTab = k; render(true); } }, label);
  const body = { terminal: txTerminal, lessons: txLessons, cheat: txCheat }[txTab](acct);
  return [back(appName(acct, 'terminal')), h('div', { class: 'tabs', role: 'tablist' }, tab('terminal', 'Terminal'), tab('lessons', 'Lessons'), tab('cheat', 'Cheat sheet')), h('div', { class: 'app-pad tx-wrap' }, body)];
}

/* ---------- the terminal itself ---------- */
function txTerminal(acct) {
  const screen = h('div', { class: 'tx-screen', role: 'log', 'aria-label': 'Terminal output' });
  const promptEl = h('span', { class: 'tx-prompt' }), input = h('input', { class: 'tx-input', 'aria-label': 'Type a command', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'send' });
  const line = h('div', { class: 'tx-line' }, promptEl, input);
  const box = h('div', { class: 'tx-box', onclick: e => { if (!window.getSelection().toString()) input.focus(); } }, screen, line);
  const strip = h('div', { class: 'tx-strip' });
  const addLine = e => {
    const d = h('div', { class: 'tx-out' });
    if (e.t === 'cmd') { d.append(h('span', { class: 'tx-prompt' }, e.p), document.createTextNode(e.s)); }
    else d.append(txAnsi(e.s.replace(/\n$/, '')));
    screen.append(d);
  };
  const drawAll = () => { screen.replaceChildren(); txLines.slice(-400).forEach(addLine); promptEl.textContent = TX.prompt(txSt); screen.scrollTop = screen.scrollHeight; };
  const push = e => { txLines.push(e); if (txLines.length > 600) txLines.splice(0, txLines.length - 600); addLine(e); screen.scrollTop = screen.scrollHeight; };
  const drawStrip = () => {
    const cur = TL.current(txProgress), st = TL.stats(txProgress);
    strip.replaceChildren(...(cur ? [
      h('div', { class: 'tx-step' }, h('b', {}, cur.lesson.title), h('span', { class: 'muted' }, ` · step ${cur.lesson.steps.indexOf(cur.step) + 1} of ${cur.lesson.steps.length}`)),
      h('div', {}, cur.step.text), txShowHint ? h('code', { class: 'tx-hint' }, cur.step.hint) : null,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { txShowHint = !txShowHint; drawStrip(); } }, txShowHint ? 'Hide hint' : 'Show hint'), h('button', { class: 'btn', onclick: () => { txTab = 'lessons'; render(true); } }, `Lessons (${st.done}/${st.total})`))
    ] : [h('div', { class: 'tx-step' }, h('b', {}, 'All lessons done. Well done!')), h('div', { class: 'muted' }, 'Keep practising here, or reset the lessons to go again.')]).filter(Boolean));
  };
  const run = text => {
    push({ t: 'cmd', p: TX.prompt(txSt), s: text });
    const before = TX.prompt(txSt);
    const r = TX.run(txSt, text);
    if (r.clear) { txLines = []; screen.replaceChildren(); } else if (r.out) push({ t: 'out', s: r.out });
    const ev = TL.evaluate(txProgress, { st: txSt, line: text, hist: txSt.history, viaHistory: txViaHist });
    if (ev.changed) {
      const cur0 = TL.current(txProgress); txProgress = ev.done; const cur1 = TL.current(txProgress);
      push({ t: 'sys', s: cur0 && (!cur1 || cur1.lesson.id !== cur0.lesson.id) ? `✔ Lesson complete: ${cur0.lesson.title}\n` : '✔ Step done\n', ok: true });
      txShowHint = false; drawStrip();
    }
    promptEl.textContent = TX.prompt(txSt); txViaHist = false; txHistIdx = -1; txDraft = '';
    txSaveSoon(acct); screen.scrollTop = screen.scrollHeight;
  };
  const key = k => {
    if (k === 'Tab') { const r = TX.complete(txSt, input.value); if (r.text !== input.value) { input.value = r.text; txLastTab = ''; } else if (r.options.length && txLastTab === input.value) { push({ t: 'cmd', p: TX.prompt(txSt), s: input.value }); push({ t: 'out', s: r.options.join('  ') + '\n' }); } txLastTab = input.value; return; }
    if (k === 'Up' || k === 'Down') {
      const h2 = txSt.history; if (!h2.length) return;
      if (k === 'Up') { if (txHistIdx === -1) { txDraft = input.value; txHistIdx = h2.length - 1; } else if (txHistIdx > 0) txHistIdx--; input.value = h2[txHistIdx]; txViaHist = true; }
      else if (txHistIdx !== -1) { txHistIdx++; if (txHistIdx >= h2.length) { txHistIdx = -1; input.value = txDraft; txViaHist = false; } else input.value = h2[txHistIdx]; }
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0); return;
    }
    if (k === 'Ctrl+C') { push({ t: 'cmd', p: TX.prompt(txSt), s: input.value + '^C' }); input.value = ''; txHistIdx = -1; return; }
    if (k === 'Ctrl+L') { txLines = []; screen.replaceChildren(); return; }
    if (k === 'Ctrl+U') { input.value = ''; return; }
    if (k) { const at = input.selectionStart ?? input.value.length; input.value = input.value.slice(0, at) + k + input.value.slice(input.selectionEnd ?? at); input.focus(); input.setSelectionRange(at + k.length, at + k.length); }
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); const t = input.value; input.value = ''; if (t.trim()) run(t); else push({ t: 'cmd', p: TX.prompt(txSt), s: '' }); return; }
    if (e.key === 'Tab') { e.preventDefault(); key('Tab'); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); key('Up'); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); key('Down'); return; }
    if (e.ctrlKey && !e.shiftKey && !e.altKey) { const k = e.key.toLowerCase(); if (k === 'c' && input.selectionStart === input.selectionEnd) { e.preventDefault(); key('Ctrl+C'); } else if (k === 'l') { e.preventDefault(); key('Ctrl+L'); } else if (k === 'u') { e.preventDefault(); key('Ctrl+U'); } }
  });
  input.addEventListener('input', () => { txViaHist = false; });
  const quick = h('div', { class: 'tx-quick', role: 'toolbar', 'aria-label': 'Handy keys' }, [['Tab', 'Tab'], ['↑', 'Up'], ['↓', 'Down'], ['Ctrl+C', 'Ctrl+C'], ['|', '|'], ['~', '~'], ['/', '/'], ['-', '-'], ['>', '>'], ['*', '*']].map(([label, k]) => h('button', { type: 'button', class: 'btn', onmousedown: e => e.preventDefault(), onclick: () => key(k) }, label)));
  drawAll(); drawStrip();
  if (txInsert) { input.value = txInsert; txInsert = ''; }
  setTimeout(() => { if (txTab === 'terminal') input.focus({ preventScroll: true }); }, 30);
  const actions = h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => key('Ctrl+L') }, 'Clear screen'),
    h('button', { class: 'btn danger', onclick: () => txConfirm('Reset the pretend computer? Its files go back to how they started. Your lesson progress stays.', () => { txSt = TX.restore(null); txLines = [{ t: 'sys', s: 'The pretend computer was reset.\n' }]; txSaveSoon(acct); render(true); }) }, 'Reset the computer'));
  return [strip, box, quick, actions, h('p', { class: 'fine' }, 'Nothing here is real. The files, the programs and the "internet" are all pretend, and are saved only on this device. Real Linux has more commands and more options, but this is the same way of thinking.')];
}
function txConfirm(text, yes) { const close = modal(h('div', { class: 'modal-body' }, h('p', {}, text), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), h('button', { class: 'btn danger', onclick: () => { close(); yes(); } }, 'Reset')))); }

/* ---------- lessons ---------- */
function txLessons(acct) {
  const st = TL.stats(txProgress), cur = TL.current(txProgress);
  return [h('div', { class: 'tx-overall' }, h('b', {}, `${st.done} of ${st.total} steps done`), h('div', { class: 'pd-bar', role: 'progressbar', 'aria-valuenow': String(st.done), 'aria-valuemax': String(st.total) }, h('i', { style: `width:${st.done / st.total * 100}%` }))),
    ...TL.LESSONS.map(l => {
      const ls_ = TL.lessonStats(l, txProgress), d = h('details', { class: 'tx-lesson', open: !!(cur && cur.lesson.id === l.id) });
      d.append(h('summary', {}, h('b', {}, l.title), h('span', { class: 'muted' }, ls_.done === ls_.total ? '✔ done' : `${ls_.done}/${ls_.total}`)), h('p', { class: 'muted' }, l.intro),
        ...l.steps.map((s, i) => h('div', { class: 'tx-stepline' + (txProgress[s.id] ? ' done' : '') }, h('span', { class: 'tx-mark', 'aria-hidden': 'true' }, txProgress[s.id] ? '✔' : String(i + 1)), h('div', {}, h('div', {}, s.text), h('code', { class: 'tx-hint' }, s.hint)))),
        h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => { txTab = 'terminal'; render(true); } }, 'Go to the terminal')));
      return d;
    }),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn danger', onclick: () => txConfirm('Reset all lesson progress?', () => { txProgress = {}; txSaveSoon(acct); render(true); }) }, 'Reset lessons'))];
}

/* ---------- cheat sheet ---------- */
function txCheat() {
  const tryIt = ex => { txInsert = ex; txTab = 'terminal'; render(true); };
  return [h('p', { class: 'muted' }, 'Tap an example to try it in the terminal.'),
    ...TX_GROUPS.map(([title, cmds]) => h('div', { class: 'tx-group' }, h('h3', {}, title), cmds.map(c => { const m = TX.META[c]; return m ? h('div', { class: 'tx-cmd' }, h('div', {}, h('b', { class: 'tx-name' }, c), h('span', { class: 'muted' }, ' ' + m[0])), h('code', {}, m[1]), h('div', { class: 'tx-ex' }, m[3].map(ex => h('button', { class: 'btn', type: 'button', onclick: () => tryIt(ex) }, ex)))) : null; }))),
    h('div', { class: 'tx-group' }, h('h3', {}, 'Keys and symbols'), TX_KEYS.map(([k, d]) => h('div', { class: 'tx-keyrow' }, h('code', {}, k), h('span', {}, d))))];
}

'use strict';
/* Terminal Practice: a pretend Linux shell for learning. It never runs anything real. Commands work on a small made-up
   file system that lives in memory (and is saved with your account). Pure logic: no page, no real files, no network. */
const TermCore = (() => {
  const NOW0 = Date.UTC(2025, 0, 15, 9, 30);
  let clock = () => Date.now();
  const setClock = f => { clock = f; };
  const MAX_NODES = 800, MAX_FILE = 50000, MAX_TOTAL = 400000;
  const dir = (c = {}, o = {}) => ({ t: 'd', mode: 0o755, owner: 'user', mtime: NOW0, c, ...o });
  const file = (d = '', o = {}) => ({ t: 'f', mode: 0o644, owner: 'user', mtime: NOW0, d, ...o });

  const initialFs = () => dir({
    home: dir({
      user: dir({
        Documents: dir({ 'report.txt': file('Quarterly report\nSales were up.\nCosts were down.\nSales target met.\n'), 'recipes.txt': file('pancakes\nomelette\nsoup\npancakes with syrup\n') }),
        Downloads: dir({ 'installer.sh': file('#!/bin/bash\necho "Installing..."\n', { mode: 0o644 }), 'photo.jpg': file('(pretend this is a photo)\n') }),
        Pictures: dir({ 'holiday.png': file('(pretend image)\n'), 'cat.png': file('(pretend image)\n') }),
        Music: dir({}), Desktop: dir({}),
        projects: dir({ 'hello.sh': file('#!/bin/bash\necho "Hello from a script"\n', { mode: 0o755 }), 'README.md': file('# My project\n\nA place to practise.\n') }),
        'notes.txt': file('Remember to learn the terminal.\nThe terminal is not scary.\nLinux is fun.\n'),
        'todo.txt': file('buy milk\ncall mum\nlearn linux\nwater plants\n'),
        '.bashrc': file('# ~/.bashrc: runs for every new terminal\nalias ll=\'ls -alF\'\n'),
        '.secret': file('A hidden file. ls does not show it unless you use -a.\n'),
      }, { mtime: NOW0 }),
    }),
    etc: dir({ hostname: file('anti-social\n'), passwd: file('root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:user:/home/user:/bin/bash\n'), shadow: file('root:!:19000:0:99999:7:::\n', { mode: 0o640, owner: 'root' }), 'os-release': file('NAME="Practice Linux"\nVERSION="1.0"\nID=practice\n') }),
    var: dir({ log: dir({ syslog: file('Jan 15 09:30:01 anti-social systemd[1]: Started practice session.\nJan 15 09:30:05 anti-social sshd[411]: Server listening on 0.0.0.0 port 22.\nJan 15 09:31:12 anti-social kernel: error: pretend disk warning\nJan 15 09:32:40 anti-social cron[512]: job finished\n', { mode: 0o644 }) }) }),
    tmp: dir({}, { mode: 0o777 }),
    root: dir({ 'private.txt': file('only root may read this\n', { owner: 'root', mode: 0o600 }) }, { mode: 0o700, owner: 'root' }),
    usr: dir({ bin: dir({}), local: dir({}) }), bin: dir({}), dev: dir({ null: file('', { mode: 0o666 }) }),
  }, { owner: 'root' });

  // system folders belong to root; only your home belongs to you
  const own = (n, o) => { n.owner = o; if (n.t === 'd') for (const c of Object.values(n.c)) own(c, o); return n; };
  const buildFs = () => { const fs = initialFs(); for (const [k, v] of Object.entries(fs.c)) if (k !== 'home') own(v, 'root'); fs.c.tmp.mode = 0o777; fs.c.dev.c.null.mode = 0o666; fs.c.home.owner = 'root'; return fs; };
  const newState = () => ({ fs: buildFs(), cwd: '/home/user', user: 'user', host: 'anti-social', history: [], aliases: { ll: 'ls -alF', la: 'ls -A' }, env: { HOME: '/home/user', USER: 'user', SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin', LANG: 'en_US.UTF-8', EDITOR: 'nano' }, pkgs: [], status: 0 });

  /* ---------- paths and the tree ---------- */
  const normalize = p => { const out = []; for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); } return '/' + out.join('/'); };
  const resolve = (st, p) => normalize(p.startsWith('/') ? p : p === '~' || p.startsWith('~/') ? (st.env.HOME || '/home/user') + p.slice(1) : st.cwd + '/' + p);
  const walk = (st, abs) => { let n = st.fs; for (const s of abs.split('/').filter(Boolean)) { if (!n || n.t !== 'd' || !Object.prototype.hasOwnProperty.call(n.c, s)) return null; n = n.c[s]; } return n; };
  const split = abs => { const i = abs.lastIndexOf('/'); return [i <= 0 ? '/' : abs.slice(0, i), abs.slice(i + 1)]; };
  const can = (st, n, bit) => { if (st.user === 'root') return true; const m = n.owner === st.user ? (n.mode >> 6) & 7 : n.mode & 7; return !!(m & ({ r: 4, w: 2, x: 1 })[bit]); };
  const count = n => n.t === 'd' ? 1 + Object.values(n.c).reduce((a, c) => a + count(c), 0) : 1;
  const total = n => n.t === 'd' ? Object.values(n.c).reduce((a, c) => a + total(c), 0) : n.d.length;
  const sizeOf = n => n.t === 'd' ? 4096 : n.d.length;
  const clone = n => n.t === 'd' ? { ...n, c: Object.fromEntries(Object.entries(n.c).map(([k, v]) => [k, clone(v)])) } : { ...n };
  const shown = (st, abs) => abs.startsWith(st.env.HOME + '/') ? '~' + abs.slice(st.env.HOME.length) : abs === st.env.HOME ? '~' : abs;
  const prompt = st => `${st.user}@${st.host}:${shown(st, st.cwd)}${st.user === 'root' ? '#' : '$'} `;

  const modeStr = n => (n.t === 'd' ? 'd' : '-') + [6, 3, 0].map(s => ((n.mode >> s) & 4 ? 'r' : '-') + ((n.mode >> s) & 2 ? 'w' : '-') + ((n.mode >> s) & 1 ? 'x' : '-')).join('');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const p2 = n => String(n).padStart(2, '0');
  const when = t => { const d = new Date(t); return `${MON[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
  const human = n => n < 1024 ? String(n) : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0).replace(/\.0$/, '') + 'K' : (n / 1048576).toFixed(1) + 'M';

  // colours only when the output goes to the screen
  const C = { dir: s => `\x1b[1;34m${s}\x1b[0m`, exe: s => `\x1b[1;32m${s}\x1b[0m`, red: s => `\x1b[1;31m${s}\x1b[0m`, dim: s => `\x1b[2m${s}\x1b[0m`, cyan: s => `\x1b[1;36m${s}\x1b[0m`, bold: s => `\x1b[1m${s}\x1b[0m` };
  const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');

  /* ---------- globbing ---------- */
  const globRe = pat => new RegExp('^' + pat.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  const hasGlob = s => /[*?]|\[[^\]]+\]/.test(s);
  const globRe2 = pat => { let r = ''; for (let i = 0; i < pat.length; i++) { const c = pat[i]; if (c === '*') r += '[^/]*'; else if (c === '?') r += '[^/]'; else if (c === '[') { const j = pat.indexOf(']', i + 1); if (j > i) { r += '[' + pat.slice(i + 1, j).replace(/^!/, '^') + ']'; i = j; } else r += '\\['; } else r += c.replace(/[.+^${}()|\\]/g, '\\$&'); } return new RegExp('^' + r + '$'); };
  const glob = (st, pat) => {
    const abs = pat.startsWith('/'), parts = pat.split('/').filter(Boolean);
    let bases = [abs ? '' : null];
    const res = [];
    const rec = (base, i) => {
      if (i === parts.length) { res.push(base); return; }
      const seg = parts[i], dirPath = base === null ? st.cwd : base === '' ? '/' : base, n = walk(st, dirPath);
      if (!n || n.t !== 'd') return;
      if (!hasGlob(seg)) { if (walk(st, normalize(dirPath + '/' + seg))) rec((base === null ? '' : base) + (base === null ? '' : '/') + seg, i + 1); return; }
      const re = globRe2(seg);
      for (const name of Object.keys(n.c).sort()) { if (name.startsWith('.') && !seg.startsWith('.')) continue; if (re.test(name)) rec(base === null ? name : base + '/' + name, i + 1); }
    };
    rec(abs ? '' : null, 0);
    return res.map(r => abs && !r.startsWith('/') ? '/' + r : r);
  };

  /* ---------- reading a command line ---------- */
  // returns tokens: {op:'|'} or {w:[{q,s}...]}
  const lex = line => {
    const toks = []; let i = 0;
    const n = line.length;
    while (i < n) {
      const c = line[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '#') break;
      const two = line.slice(i, i + 2), three = line.slice(i, i + 3);
      if (three === '2>>') { toks.push({ op: '2>>' }); i += 3; continue; }
      if (line.slice(i, i + 4) === '2>&1') { toks.push({ op: '2>&1' }); i += 4; continue; }
      if (two === '2>') { toks.push({ op: '2>' }); i += 2; continue; }
      if (two === '&&' || two === '||' || two === '>>') { toks.push({ op: two }); i += 2; continue; }
      if (c === '|' || c === ';' || c === '>' || c === '<') { toks.push({ op: c }); i++; continue; }
      if (c === '&') { i++; continue; }
      const segs = []; let cur = '', q = 'n';
      const flush = () => { if (cur !== '' || q !== 'n') segs.push({ q, s: cur }); cur = ''; };
      while (i < n) {
        const d = line[i];
        if (q === 'n' && (d === ' ' || d === '\t' || '|;<>&'.includes(d))) break;
        if (q === 'n' && d === '2' && false) break;
        if (d === "'" && q !== 'd') { if (q === 's') { flush(); q = 'n'; } else { flush(); q = 's'; } i++; continue; }
        if (d === '"' && q !== 's') { if (q === 'd') { flush(); q = 'n'; } else { flush(); q = 'd'; } i++; continue; }
        if (d === '\\' && q !== 's' && i + 1 < n) { const e = line[i + 1]; cur += q === 'd' && !'$"\\`'.includes(e) ? '\\' + e : e; if (q === 'n') { flush(); segs[segs.length - 1].lit = true; } i += 2; continue; }
        if (d === '$' && line[i + 1] === '(' && q !== 's') { let depth = 0, j = i + 1; for (; j < n; j++) { if (line[j] === '(') depth++; else if (line[j] === ')') { depth--; if (!depth) break; } } cur += line.slice(i, j + 1); i = j + 1; continue; }
        cur += d; i++;
      }
      if (q !== 'n') return { error: `unexpected EOF while looking for matching \`${q === 's' ? "'" : '"'}'` };
      flush();
      toks.push({ w: segs });
    }
    return { toks };
  };

  const expandText = (sh, s, q, first) => {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '~' && q === 'n' && first && i === 0 && (s.length === 1 || s[1] === '/')) { out += sh.st.env.HOME || '/home/user'; continue; }
      if (c === '$') {
        if (s[i + 1] === '(') { let depth = 0, j = i + 1; for (; j < s.length; j++) { if (s[j] === '(') depth++; else if (s[j] === ')') { depth--; if (!depth) break; } } const r = exec(sh.st, s.slice(i + 2, j), { capture: true, depth: (sh.depth || 0) + 1 }); out += r.out.replace(/\n+$/, ''); i = j; continue; }
        if (s[i + 1] === '?') { out += String(sh.st.status); i++; continue; }
        const m = /^\{(\w+)\}|^(\w+)/.exec(s.slice(i + 1));
        if (m) { const name = m[1] || m[2]; out += name === 'PWD' ? sh.st.cwd : name === 'USER' ? sh.st.user : sh.st.env[name] ?? ''; i += m[0].length; continue; }
      }
      out += c;
    }
    return out;
  };
  // a token into the words it becomes (glob expansion included)
  const expandWord = (sh, segs) => {
    let text = '', globbable = false;
    segs.forEach((g, k) => { if (g.q === 's') { text += g.s; return; } const v = expandText(sh, g.s, g.q, k === 0); text += v; if (g.q === 'n' && !g.lit && hasGlob(v)) globbable = true; });
    if (globbable) { const hits = glob(sh.st, text); if (hits.length) return hits; }
    return [text];
  };

  /* ---------- running ---------- */
  const ok = out => ({ out: out || '', err: '', code: 0 });
  const bad = (err, code = 1) => ({ out: '', err, code });
  const fileErr = (cmd, name, why) => `${cmd}: ${name}: ${why}`;

  const exec = (st, line, opts = {}) => {
    const sh = { st, depth: opts.depth || 0 }; const capture = !!opts.capture;
    if (sh.depth > 4) return { out: '', err: 'too much nesting', code: 1 };
    const lx = lex(line); if (lx.error) { st.status = 2; return { out: '', err: `bash: ${lx.error}`, code: 2 }; }
    // split into pipelines joined by ; && ||
    const items = []; let cur = [], conn = ';';
    for (const t of lx.toks) { if (t.op === ';' || t.op === '&&' || t.op === '||') { items.push({ conn, toks: cur }); cur = []; conn = t.op; } else cur.push(t); }
    items.push({ conn, toks: cur });
    let out = '', err = '', code = st.status, clear = false;
    for (const it of items) {
      if (!it.toks.length) { if (it.conn !== ';' || items.length > 1 && it === items[items.length - 1] && false) continue; continue; }
      if (it.conn === '&&' && code !== 0) continue;
      if (it.conn === '||' && code === 0) continue;
      const r = runPipeline(sh, it.toks, capture);
      out += r.out; err += r.err; code = r.code; st.status = code; clear = clear || r.clear;
      if (r.exit) break;
    }
    return { out, err, code, clear };
  };

  const runPipeline = (sh, toks, capture) => {
    const cmds = [[]]; for (const t of toks) { if (t.op === '|') cmds.push([]); else cmds[cmds.length - 1].push(t); }
    let stdin = null, err = '', last = ok(''), clear = false, exit = false;
    for (let k = 0; k < cmds.length; k++) {
      const ts = cmds[k], words = [], redir = {};
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i];
        if (t.w) { words.push(...expandWord(sh, t.w)); continue; }
        if (t.op === '2>&1') { redir.merge = true; continue; }
        const target = ts[i + 1] && ts[i + 1].w ? expandWord(sh, ts[i + 1].w)[0] : null;
        if (target === null) return { out: '', err: "bash: syntax error near unexpected token `newline'", code: 2 };
        if (t.op === '>') redir.out = { p: target, add: false }; else if (t.op === '>>') redir.out = { p: target, add: true }; else if (t.op === '2>') redir.err = { p: target, add: false }; else if (t.op === '2>>') redir.err = { p: target, add: true }; else if (t.op === '<') redir.in = target;
        i++;
      }
      if (!words.length) { last = ok(''); continue; }
      let input = stdin;
      if (redir.in !== undefined) { const abs = resolve(sh.st, redir.in), n = walk(sh.st, abs); if (!n) return { out: '', err: `bash: ${redir.in}: No such file or directory`, code: 1 }; if (n.t === 'f' && !can(sh.st, n, 'r')) return { out: '', err: `bash: ${redir.in}: Permission denied`, code: 1 }; input = n.t === 'f' ? n.d : ''; }
      const isLast = k === cmds.length - 1;
      const tty = isLast && !capture && !redir.out;
      last = runCommand(sh, words, input, tty);
      if (last.clear) clear = true; if (last.exit) exit = true;
      let o = last.out, e = last.err;
      if (redir.merge) { o += e; e = ''; }
      if (redir.err) { const w = writeTarget(sh.st, redir.err, e); if (w) e = w; else e = ''; }
      if (redir.out) { const w = writeTarget(sh.st, redir.out, strip(o)); o = ''; if (w) { e += (e && !e.endsWith('\n') ? '\n' : '') + w; last = { ...last, code: 1 }; } }
      if (isLast) { last = { ...last, out: o, err: err + e, clear, exit }; } else { stdin = o; if (e) err += e + (e.endsWith('\n') ? '' : '\n'); }
    }
    return last;
  };

  // output to a file for > and >>; returns an error message or ''
  const writeTarget = (st, r, text) => {
    if (r.p === '/dev/null') return '';
    const abs = resolve(st, r.p), [par, name] = split(abs), pn = walk(st, par);
    if (!pn || pn.t !== 'd') return `bash: ${r.p}: No such file or directory`;
    const ex = pn.c[name];
    if (ex && ex.t === 'd') return `bash: ${r.p}: Is a directory`;
    if (ex ? !can(st, ex, 'w') : !can(st, pn, 'w')) return `bash: ${r.p}: Permission denied`;
    const data = (r.add && ex ? ex.d : '') + text;
    if (data.length > MAX_FILE || (!ex && count(st.fs) >= MAX_NODES) || total(st.fs) - (ex ? ex.d.length : 0) + data.length > MAX_TOTAL) return `bash: ${r.p}: No space left on device`;
    if (ex) { ex.d = data; ex.mtime = clock(); } else pn.c[name] = file(data, { owner: st.user, mtime: clock() });
    pn.mtime = clock();
    return '';
  };

  const runCommand = (sh, words, stdin, tty) => {
    const st = sh.st;
    let name = words[0], args = words.slice(1);
    if (st.aliases[name] && !sh.aliased) { const re = exec(st, st.aliases[name] + (args.length ? ' ' + args.map(q => /[^\w./=-]/.test(q) ? `'${q.replace(/'/g, "'\\''")}'` : q).join(' ') : ''), { capture: !tty, depth: sh.depth + 1 }); return { ...re }; }
    if (/^\w+=/.test(name) && words.length === 1) { const [k, ...v] = name.split('='); st.env[k] = v.join('='); return ok(''); }
    const fn = CMDS[name];
    if (!fn) {
      if (name.includes('/')) { const abs = resolve(st, name), n = walk(st, abs); if (!n) return bad(`bash: ${name}: No such file or directory`, 127); if (n.t === 'd') return bad(`bash: ${name}: Is a directory`, 126); if (!(n.mode & 0o111) && st.user !== 'root') return bad(`bash: ${name}: Permission denied`, 126); return runScript(sh, n, args, abs); }
      if (OPTIONAL[name]) return bad(`Command '${name}' not found, but can be installed with:\n  sudo apt install ${name}`, 127);
      return bad(`${name}: command not found`, 127);
    }
    if (OPTIONAL[name] && !st.pkgs.includes(name)) return bad(`Command '${name}' not found, but can be installed with:\n  sudo apt install ${name}`, 127);
    try { return fn({ st, tty, sh }, args, stdin) || ok(''); } catch (e) { return bad(`${name}: something went wrong`, 1); }
  };
  // a shell script: each line is run, nothing more fancy
  const runScript = (sh, n, args, abs) => {
    if (!can(sh.st, n, 'r')) return bad(`bash: ${abs}: Permission denied`, 126);
    let out = '', err = '', code = 0;
    for (const l of n.d.split('\n')) { if (!l.trim() || l.startsWith('#')) continue; const r = exec(sh.st, l, { capture: true, depth: sh.depth + 1 }); out += r.out; err += r.err; code = r.code; }
    return { out, err, code };
  };

  /* ---------- the commands ---------- */
  const optParse = (args, spec = '') => { // short flags only; spec lists flags that take a value
    const flags = {}, rest = []; let done = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (done || a === '-' || !a.startsWith('-') || /^-\d+$/.test(a) && spec.includes('#')) { rest.push(a); continue; }
      if (a === '--') { done = true; continue; }
      if (a.startsWith('--')) { flags[a.slice(2)] = true; continue; }
      for (let j = 1; j < a.length; j++) { const f = a[j]; if (spec.includes(f + ':')) { flags[f] = a.slice(j + 1) || args[++i]; break; } flags[f] = true; }
    }
    return { flags, rest };
  };
  const nodeAt = (st, p) => { const abs = resolve(st, p); return { abs, n: walk(st, abs) }; };
  const readFile = (c, cmd, p) => {
    const { n } = nodeAt(c.st, p);
    if (!n) return { err: fileErr(cmd, p, 'No such file or directory') };
    if (n.t === 'd') return { err: fileErr(cmd, p, 'Is a directory') };
    if (!can(c.st, n, 'r')) return { err: fileErr(cmd, p, 'Permission denied') };
    return { text: n.d };
  };
  // lines of text from files or stdin
  const inputs = (c, cmd, files, stdin) => {
    if (!files.length) return { text: stdin || '', err: '' };
    let text = '', err = '';
    for (const f of files) { const r = readFile(c, cmd, f); if (r.err) err += r.err + '\n'; else text += r.text; }
    return { text, err };
  };
  const lines = t => { const l = t.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; };
  const nl = a => a.length ? a.join('\n') + '\n' : '';

  const lsOne = (c, p, f, multi, virtual) => {
    const { n, abs } = virtual ? { n: virtual, abs: '' } : nodeAt(c.st, p);
    if (!n) return { err: `ls: cannot access '${p}': No such file or directory\n` };
    const entry = (name, node) => ({ name, node });
    let list;
    if (n.t === 'd' && f.d) list = [entry(p, n)];
    else if (n.t === 'd') {
      if (!can(c.st, n, 'r')) return { err: `ls: cannot open directory '${p}': Permission denied\n` };
      list = Object.keys(n.c).filter(k => f.a || f.A ? true : !k.startsWith('.')).map(k => entry(k, n.c[k]));
      if (f.a) list.unshift(entry('..', n), entry('.', n));
    } else if (!f.d || n.t !== 'd') list = [entry(p, n)];
    if (f.t) list.sort((a, b) => b.node.mtime - a.node.mtime || a.name.localeCompare(b.name)); else if (f.S) list.sort((a, b) => sizeOf(b.node) - sizeOf(a.node)); else list.sort((a, b) => a.name.replace(/^\./, '').toLowerCase().localeCompare(b.name.replace(/^\./, '').toLowerCase()));
    if (f.r) list.reverse();
    const label = (e, plain) => { const isDir = e.node.t === 'd', exe = !isDir && (e.node.mode & 0o111); let s = e.name; if (c.tty && !plain) s = isDir ? C.dir(s) : exe ? C.exe(s) : s; if (f.F) s += isDir ? '/' : exe ? '*' : ''; return s; };
    let out = '';
    if ((multi || f.R) && !virtual) out += (n.t === 'd' ? p : '') + (n.t === 'd' ? ':\n' : '');
    if (f.l) {
      if (n.t === 'd' && !virtual && !f.d) out += `total ${Math.ceil(list.reduce((a, e) => a + Math.max(4, Math.ceil(sizeOf(e.node) / 1024)), 0))}\n`;
      const w = Math.max(1, ...list.map(e => (f.h ? human(sizeOf(e.node)) : String(sizeOf(e.node))).length));
      out += list.map(e => `${modeStr(e.node)} ${e.node.t === 'd' ? 2 : 1} ${e.node.owner.padEnd(5)} ${e.node.owner.padEnd(5)} ${(f.h ? human(sizeOf(e.node)) : String(sizeOf(e.node))).padStart(w)} ${when(e.node.mtime)} ${label(e)}`).join('\n') + (list.length ? '\n' : '');
    } else out += list.length ? (f['1'] || !c.tty ? list.map(e => label(e)).join('\n') : list.map(e => label(e)).join('  ')) + '\n' : '';
    if (f.R && n.t === 'd') for (const e of list) if (e.node.t === 'd' && e.name !== '.' && e.name !== '..') { const sub = lsOne(c, (p === '/' ? '' : p) + '/' + e.name, f, false); out += '\n' + sub.out; }
    return { out, err: '' };
  };

  const treeOf = (c, n, prefix, f, counts) => {
    let out = ''; const names = Object.keys(n.c).filter(k => f.a || !k.startsWith('.')).sort();
    names.forEach((k, i) => { const ch = n.c[k], last = i === names.length - 1; out += prefix + (last ? '└── ' : '├── ') + (ch.t === 'd' && c.tty ? C.dir(k) : k) + '\n'; if (ch.t === 'd') { counts.d++; out += treeOf(c, ch, prefix + (last ? '    ' : '│   '), f, counts); } else counts.f++; });
    return out;
  };

  const copyNode = (st, src, destAbs, force) => { const [pp, nm] = split(destAbs); const pn = walk(st, pp); pn.c[nm] = clone(src); pn.c[nm].owner = st.user; pn.c[nm].mtime = clock(); pn.mtime = clock(); };
  const rmNode = (st, abs) => { const [pp, nm] = split(abs); const pn = walk(st, pp); delete pn.c[nm]; pn.mtime = clock(); };

  const META = {
    ls: ['list what is in a folder', 'ls [-laAhtrRF1] [FILE]...', [['-l', 'long list: permissions, owner, size, date'], ['-a', 'show hidden files (names starting with .)'], ['-h', 'sizes people can read (with -l)'], ['-t', 'newest first'], ['-R', 'go into folders too']], ['ls', 'ls -la', 'ls Documents']],
    cd: ['go to another folder', 'cd [DIRECTORY]', [['..', 'go up one folder'], ['~', 'go home'], ['-', 'go back to the last folder']], ['cd Documents', 'cd ..', 'cd']],
    pwd: ['print where you are', 'pwd', [], ['pwd']],
    cat: ['show what is in a file', 'cat [-n] FILE...', [['-n', 'number the lines']], ['cat notes.txt']],
    echo: ['print words (and write files with >)', 'echo [-ne] TEXT...', [['-n', 'no new line at the end'], ['-e', 'understand \\n and \\t']], ['echo hello', 'echo hi > greeting.txt']],
    mkdir: ['make a folder', 'mkdir [-p] DIRECTORY...', [['-p', 'make parent folders too']], ['mkdir practice', 'mkdir -p a/b/c']],
    rmdir: ['remove an empty folder', 'rmdir DIRECTORY...', [], ['rmdir old']],
    touch: ['make an empty file (or update its date)', 'touch FILE...', [], ['touch new.txt']],
    rm: ['delete files', 'rm [-rf] FILE...', [['-r', 'delete folders and what is inside'], ['-f', 'do not complain if it is not there']], ['rm old.txt', 'rm -r folder']],
    cp: ['copy', 'cp [-r] SOURCE DEST', [['-r', 'copy folders']], ['cp a.txt b.txt', 'cp -r docs backup']],
    mv: ['move or rename', 'mv SOURCE DEST', [], ['mv old.txt new.txt', 'mv file.txt Documents/']],
    head: ['first lines of a file', 'head [-n N] [FILE]', [['-n N', 'how many lines (default 10)']], ['head -n 3 notes.txt']],
    tail: ['last lines of a file', 'tail [-n N] [FILE]', [['-n N', 'how many lines (default 10)']], ['tail -n 2 /var/log/syslog']],
    wc: ['count lines, words and letters', 'wc [-lwc] [FILE]...', [['-l', 'lines'], ['-w', 'words'], ['-c', 'bytes']], ['wc -l todo.txt', 'ls | wc -l']],
    sort: ['sort lines', 'sort [-rnu] [FILE]', [['-r', 'backwards'], ['-n', 'as numbers'], ['-u', 'remove repeats']], ['sort todo.txt']],
    uniq: ['remove repeated neighbouring lines', 'uniq [-c]', [['-c', 'count them']], ['sort file | uniq -c']],
    grep: ['search for text', 'grep [-inrcvlw] PATTERN [FILE]...', [['-i', 'ignore capital letters'], ['-n', 'show line numbers'], ['-v', 'lines that do NOT match'], ['-r', 'search inside folders'], ['-c', 'count matches']], ['grep sales Documents/report.txt', 'grep -i linux notes.txt']],
    find: ['look for files', 'find [PATH] [-name PATTERN] [-type f|d]', [['-name', 'match the name (use quotes for *)'], ['-type', 'f for files, d for folders']], ['find . -name "*.txt"']],
    tree: ['draw a folder as a tree (needs installing)', 'tree [-a] [DIRECTORY]', [], ['sudo apt install tree', 'tree']],
    chmod: ['change who can read, write or run', 'chmod MODE FILE...', [['755', 'owner all, everyone else read and run'], ['644', 'owner read and write, others read'], ['+x', 'allow running'], ['u+w', 'let the owner write']], ['chmod +x installer.sh', 'chmod 600 notes.txt']],
    chown: ['change who owns a file (root only)', 'sudo chown OWNER FILE...', [], ['sudo chown root notes.txt']],
    whoami: ['print your user name', 'whoami', [], ['whoami']], id: ['print who you are', 'id', [], ['id']],
    hostname: ['print the computer name', 'hostname', [], ['hostname']], uname: ['print system information', 'uname [-a]', [], ['uname -a']],
    date: ['print the date and time', 'date', [], ['date']], uptime: ['how long the computer has been on', 'uptime', [], ['uptime']],
    clear: ['clear the screen', 'clear (or Ctrl+L)', [], ['clear']], history: ['commands you have typed', 'history [-c]', [['-c', 'forget them']], ['history']],
    man: ['read the manual for a command', 'man COMMAND', [], ['man ls']], help: ['list what you can type', 'help', [], ['help']],
    which: ['where a command lives', 'which COMMAND', [], ['which ls']], alias: ['make a shortcut', "alias NAME='COMMAND'", [], ["alias gs='ls -la'"]], unalias: ['remove a shortcut', 'unalias NAME', [], ['unalias ll']],
    export: ['set an environment variable', 'export NAME=VALUE', [], ['export GREETING=hello', 'echo $GREETING']], env: ['show environment variables', 'env', [], ['env']],
    sudo: ['run one command as the administrator (root)', 'sudo COMMAND', [], ['sudo apt update']], apt: ['install and remove programs (pretend)', 'sudo apt update | install NAME | remove NAME | list --installed', [], ['sudo apt install tree']],
    df: ['disk space', 'df [-h]', [], ['df -h']], du: ['how big a folder is', 'du [-sh] [PATH]', [], ['du -sh Documents']], free: ['memory', 'free [-h]', [], ['free -h']], ps: ['running programs', 'ps [aux]', [], ['ps']],
    cut: ['cut columns out of lines', "cut -d DELIM -f FIELD", [], ["cut -d ':' -f 1 /etc/passwd"]], tr: ['swap or delete letters', "tr 'a-z' 'A-Z'", [], ["echo hi | tr 'a-z' 'A-Z'"]], sed: ['replace text in a stream', "sed 's/old/new/g'", [], ["echo hello | sed 's/l/L/g'"]],
    tee: ['show and save at once', 'tee FILE', [], ['ls | tee list.txt']], basename: ['file name without folders', 'basename PATH', [], ['basename /etc/passwd']], dirname: ['folders without the file name', 'dirname PATH', [], ['dirname /etc/passwd']],
    stat: ['details about a file', 'stat FILE', [], ['stat notes.txt']], file: ['guess what a file is', 'file FILE', [], ['file notes.txt']], xargs: ['turn lines into arguments', 'xargs COMMAND', [], ['ls | xargs echo']],
    ping: ['check a connection (pretend)', 'ping HOST', [], ['ping example.com']], kill: ['stop a program (pretend)', 'kill PID', [], ['kill 1234']], sleep: ['wait (instant here)', 'sleep N', [], ['sleep 1']],
    cowsay: ['a talking cow (install it first)', 'cowsay TEXT', [], ['sudo apt install cowsay', 'cowsay moo']], neofetch: ['show system info (install it first)', 'neofetch', [], ['neofetch']],
  };
  const OPTIONAL = { tree: 1, cowsay: 1, neofetch: 1 };
  const PACKAGES = { tree: 'tree', cowsay: 'cowsay', neofetch: 'neofetch', htop: 'htop', git: 'git', vim: 'vim', curl: 'curl', python3: 'python3', nano: 'nano' };

  const FAKE_PS = ['  PID TTY          TIME CMD', ' 1204 pts/0    00:00:00 bash', ' 1311 pts/0    00:00:00 ps'];
  const catErr = (r, acc) => { acc.err += r.err + '\n'; };

  const CMDS = {
    pwd: c => ok(c.st.cwd + '\n'),
    cd: (c, a) => {
      const st = c.st; let p = a[0];
      if (p === undefined) p = st.env.HOME; if (p === '-') { p = st.env.OLDPWD; if (!p) return bad('bash: cd: OLDPWD not set'); }
      const { abs, n } = nodeAt(st, p);
      if (!n) return bad(`bash: cd: ${a[0]}: No such file or directory`);
      if (n.t !== 'd') return bad(`bash: cd: ${a[0]}: Not a directory`);
      if (!can(st, n, 'x')) return bad(`bash: cd: ${a[0]}: Permission denied`);
      st.env.OLDPWD = st.cwd; st.cwd = abs; return ok(a[0] === '-' ? abs + '\n' : '');
    },
    ls: (c, a) => {
      const { flags, rest } = optParse(a); const f = { ...flags }; if (flags.all) f.a = true; if (flags.human) f.h = true;
      const targets = rest.length ? rest : ['.']; let out = '', err = '', code = 0;
      const files = {}, dirs = [];
      for (const t of targets) { const { n } = nodeAt(c.st, t); if (!n) { err += `ls: cannot access '${t}': No such file or directory\n`; code = 2; } else if (n.t === 'd') dirs.push(t); else files[t] = n; }
      if (Object.keys(files).length) { const r = lsOne(c, '', { ...f, a: false }, false, { t: 'd', mode: 0o755, owner: 'user', mtime: 0, c: files }); out += r.out; }
      dirs.sort().forEach(t => { const r = lsOne(c, t, f, targets.length > 1); out += (out ? '\n' : '') + r.out; if (r.err) { err += r.err; code = 2; } });
      return { out, err: err.replace(/\n$/, ''), code };
    },
    cat: (c, a, stdin) => {
      const { flags, rest } = optParse(a); const r = inputs(c, 'cat', rest, stdin);
      let t = r.text; if (flags.n) t = lines(t).map((l, i) => `${String(i + 1).padStart(6)}  ${l}`).join('\n') + (t ? '\n' : '');
      return { out: t, err: r.err.replace(/\n$/, ''), code: r.err ? 1 : 0 };
    },
    echo: (c, a) => {
      const { flags, rest } = (() => { let i = 0; const f = {}; while (a[i] && /^-[neE]+$/.test(a[i])) { for (const ch of a[i].slice(1)) f[ch] = true; i++; } return { flags: f, rest: a.slice(i) }; })();
      let t = rest.join(' '); if (flags.e) t = t.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'); return ok(t + (flags.n ? '' : '\n'));
    },
    mkdir: (c, a) => {
      const { flags, rest } = optParse(a); if (!rest.length) return bad('mkdir: missing operand'); let err = '';
      for (const p of rest) {
        const abs = resolve(c.st, p), parts = abs.split('/').filter(Boolean); let n = c.st.fs, path = '';
        for (let i = 0; i < parts.length; i++) {
          path += '/' + parts[i]; const last = i === parts.length - 1, ex = Object.prototype.hasOwnProperty.call(n.c, parts[i]) ? n.c[parts[i]] : null;
          if (ex) { if (last && !flags.p) { err += `mkdir: cannot create directory '${p}': File exists\n`; } n = ex; continue; }
          if (!last && !flags.p) { err += `mkdir: cannot create directory '${p}': No such file or directory\n`; break; }
          if (!can(c.st, n, 'w')) { err += `mkdir: cannot create directory '${p}': Permission denied\n`; break; }
          if (count(c.st.fs) >= MAX_NODES) { err += `mkdir: cannot create directory '${p}': No space left on device\n`; break; }
          n.c[parts[i]] = dir({}, { owner: c.st.user, mtime: clock() }); n.mtime = clock(); n = n.c[parts[i]];
        }
      }
      return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    rmdir: (c, a) => { let err = ''; for (const p of a) { const { abs, n } = nodeAt(c.st, p); if (!n) err += `rmdir: failed to remove '${p}': No such file or directory\n`; else if (n.t !== 'd') err += `rmdir: failed to remove '${p}': Not a directory\n`; else if (Object.keys(n.c).length) err += `rmdir: failed to remove '${p}': Directory not empty\n`; else if (!can(c.st, walk(c.st, split(abs)[0]), 'w')) err += `rmdir: failed to remove '${p}': Permission denied\n`; else rmNode(c.st, abs); } return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 }; },
    touch: (c, a) => {
      if (!a.length) return bad('touch: missing file operand'); let err = '';
      for (const p of a) {
        const abs = resolve(c.st, p), [pp, nm] = split(abs), pn = walk(c.st, pp), ex = pn && pn.t === 'd' && pn.c[nm];
        if (!pn || pn.t !== 'd') err += `touch: cannot touch '${p}': No such file or directory\n`;
        else if (ex) { if (!can(c.st, ex, 'w')) err += `touch: cannot touch '${p}': Permission denied\n`; else ex.mtime = clock(); }
        else if (!can(c.st, pn, 'w')) err += `touch: cannot touch '${p}': Permission denied\n`;
        else if (count(c.st.fs) >= MAX_NODES) err += `touch: cannot touch '${p}': No space left on device\n`;
        else { pn.c[nm] = file('', { owner: c.st.user, mtime: clock() }); pn.mtime = clock(); }
      }
      return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    rm: (c, a) => {
      const { flags, rest } = optParse(a); if (!rest.length && !flags.f) return bad('rm: missing operand'); let err = '';
      for (const p of rest) {
        const { abs, n } = nodeAt(c.st, p);
        if (!n) { if (!flags.f) err += `rm: cannot remove '${p}': No such file or directory\n`; continue; }
        if (abs === '/' || abs === c.st.env.HOME) { err += `rm: it is dangerous to operate recursively on '${p}'\nrm: this practice terminal refuses, just like a real one often does\n`; continue; }
        if (n.t === 'd' && !flags.r && !flags.R) { err += `rm: cannot remove '${p}': Is a directory\n`; continue; }
        const par = walk(c.st, split(abs)[0]);
        if (!can(c.st, par, 'w')) { err += `rm: cannot remove '${p}': Permission denied\n`; continue; }
        rmNode(c.st, abs);
      }
      return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    cp: (c, a) => {
      const { flags, rest } = optParse(a); if (rest.length < 2) return bad(rest.length ? `cp: missing destination file operand after '${rest[0]}'` : 'cp: missing file operand');
      const dest = rest[rest.length - 1], srcs = rest.slice(0, -1), d = nodeAt(c.st, dest); let err = '';
      if (srcs.length > 1 && !(d.n && d.n.t === 'd')) return bad(`cp: target '${dest}' is not a directory`);
      for (const s of srcs) {
        const { abs: sa, n: sn } = nodeAt(c.st, s);
        if (!sn) { err += `cp: cannot stat '${s}': No such file or directory\n`; continue; }
        if (sn.t === 'd' && !flags.r && !flags.R) { err += `cp: -r not specified; omitting directory '${s}'\n`; continue; }
        if (sn.t === 'f' && !can(c.st, sn, 'r')) { err += `cp: cannot open '${s}' for reading: Permission denied\n`; continue; }
        const target = d.n && d.n.t === 'd' ? normalize(d.abs + '/' + split(sa)[1]) : d.abs, tp = walk(c.st, split(target)[0]);
        if (!tp || tp.t !== 'd') { err += `cp: cannot create regular file '${dest}': No such file or directory\n`; continue; }
        if (!can(c.st, tp, 'w')) { err += `cp: cannot create regular file '${dest}': Permission denied\n`; continue; }
        if (target === sa) { err += `cp: '${s}' and '${dest}' are the same file\n`; continue; }
        if (target.startsWith(sa + '/')) { err += `cp: cannot copy a directory, '${s}', into itself\n`; continue; }
        if (count(c.st.fs) + count(sn) > MAX_NODES) { err += `cp: cannot create '${dest}': No space left on device\n`; continue; }
        copyNode(c.st, sn, target);
      }
      return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    mv: (c, a) => {
      if (a.length < 2) return bad(a.length ? `mv: missing destination file operand after '${a[0]}'` : 'mv: missing file operand');
      const dest = a[a.length - 1], srcs = a.slice(0, -1), d = nodeAt(c.st, dest); let err = '';
      if (srcs.length > 1 && !(d.n && d.n.t === 'd')) return bad(`mv: target '${dest}' is not a directory`);
      for (const s of srcs) {
        const { abs: sa, n: sn } = nodeAt(c.st, s);
        if (!sn) { err += `mv: cannot stat '${s}': No such file or directory\n`; continue; }
        const target = d.n && d.n.t === 'd' ? normalize(d.abs + '/' + split(sa)[1]) : d.abs, tp = walk(c.st, split(target)[0]);
        if (!tp || tp.t !== 'd') { err += `mv: cannot move '${s}' to '${dest}': No such file or directory\n`; continue; }
        if (!can(c.st, tp, 'w') || !can(c.st, walk(c.st, split(sa)[0]), 'w')) { err += `mv: cannot move '${s}' to '${dest}': Permission denied\n`; continue; }
        if (target === sa) { err += `mv: '${s}' and '${dest}' are the same file\n`; continue; }
        if (target.startsWith(sa + '/')) { err += `mv: cannot move '${s}' to a subdirectory of itself, '${dest}'\n`; continue; }
        const [pp, nm] = split(target); const n2 = sn; rmNode(c.st, sa); walk(c.st, pp).c[nm] = n2; walk(c.st, pp).mtime = clock();
      }
      return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    head: (c, a, stdin) => headTail(c, a, stdin, true),
    tail: (c, a, stdin) => headTail(c, a, stdin, false),
    wc: (c, a, stdin) => {
      const { flags, rest } = optParse(a), all = !flags.l && !flags.w && !flags.c; let out = '', err = '', tl = 0, tw = 0, tc = 0;
      const row = (t, name) => { const l = (t.match(/\n/g) || []).length, w = t.split(/\s+/).filter(Boolean).length, b = t.length; tl += l; tw += w; tc += b; return [all || flags.l ? l : null, all || flags.w ? w : null, all || flags.c ? b : null].filter(x => x !== null).map(x => String(x).padStart(rest.length > 1 || all ? 7 : 0)).join(' ').replace(/^ +/, rest.length || all ? ' ' : '') + (name ? ' ' + name : ''); };
      if (!rest.length) return ok(row(stdin || '', '').replace(/^ +/, '') + '\n');
      const rows = []; for (const f of rest) { const r = readFile(c, 'wc', f); if (r.err) err += r.err + '\n'; else rows.push(row(r.text, f)); }
      if (rest.length > 1) rows.push([all || flags.l ? tl : null, all || flags.w ? tw : null, all || flags.c ? tc : null].filter(x => x !== null).map(x => String(x).padStart(7)).join(' ') + ' total');
      return { out: nl(rows), err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    sort: (c, a, stdin) => {
      const { flags, rest } = optParse(a), r = inputs(c, 'sort', rest, stdin); let l = lines(r.text);
      l.sort(flags.n ? (x, y) => parseFloat(x) - parseFloat(y) || x.localeCompare(y) : (x, y) => x.localeCompare(y, 'en', { sensitivity: 'variant' })); if (flags.r) l.reverse(); if (flags.u) l = l.filter((x, i) => i === 0 || x !== l[i - 1]);
      return { out: nl(l), err: r.err.replace(/\n$/, ''), code: r.err ? 1 : 0 };
    },
    uniq: (c, a, stdin) => {
      const { flags, rest } = optParse(a), r = inputs(c, 'uniq', rest, stdin), out = [];
      for (const l of lines(r.text)) { if (out.length && out[out.length - 1][0] === l) out[out.length - 1][1]++; else out.push([l, 1]); }
      return ok(nl(out.map(([l, n]) => flags.c ? `${String(n).padStart(7)} ${l}` : l)));
    },
    grep: (c, a, stdin) => {
      const { flags, rest } = optParse(a); if (!rest.length) return bad('Usage: grep [OPTION]... PATTERNS [FILE]...', 2);
      const pat = rest[0], files = rest.slice(1); let re;
      try { re = new RegExp(flags.F ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pat.replace(/\\\|/g, '|'), (flags.i ? 'i' : '') + 'g'); } catch { return bad(`grep: Invalid regular expression`, 2); }
      if (flags.w) re = new RegExp('\\b(?:' + re.source + ')\\b', re.flags);
      const targets = []; let err = '';
      const add = (p, shownName) => { const { abs, n } = nodeAt(c.st, p); if (!n) { err += `grep: ${p}: No such file or directory\n`; return; } if (n.t === 'd') { if (!flags.r && !flags.R) { err += `grep: ${p}: Is a directory\n`; return; } for (const k of Object.keys(n.c).sort()) add((p === '.' ? '.' : p.replace(/\/$/, '')) + '/' + k); return; } if (!can(c.st, n, 'r')) { err += `grep: ${p}: Permission denied\n`; return; } targets.push({ name: p, text: n.d }); };
      if (!files.length) { if (flags.r) add('.'); else targets.push({ name: '(standard input)', text: stdin || '' }); } else files.forEach(f => add(f));
      const multi = targets.length > 1 || flags.r || files.length > 1; let out = '', any = false;
      for (const t of targets) {
        let cnt = 0, rows = [];
        lines(t.text).forEach((l, i) => { re.lastIndex = 0; const hit = re.test(l); if (hit !== !!flags.v) { cnt++; let show = l; if (c.tty && !flags.v) { re.lastIndex = 0; show = l.replace(re, m => C.red(m)); } rows.push((multi ? (c.tty ? C.cyan(t.name) : t.name) + ':' : '') + (flags.n ? `${i + 1}:` : '') + show); } });
        if (cnt) any = true;
        if (flags.l) { if (cnt) out += t.name + '\n'; } else if (flags.c) out += (multi ? t.name + ':' : '') + cnt + '\n'; else out += nl(rows);
      }
      return { out, err: err.replace(/\n$/, ''), code: any ? 0 : 1 };
    },
    find: (c, a) => {
      let start = '.'; const rest = [...a]; if (rest[0] && !rest[0].startsWith('-')) start = rest.shift();
      let nameRe = null, type = '', err = '';
      for (let i = 0; i < rest.length; i++) { if (rest[i] === '-name' || rest[i] === '-iname') { nameRe = new RegExp(globRe2(rest[i + 1] || '').source, rest[i] === '-iname' ? 'i' : ''); i++; } else if (rest[i] === '-type') { type = rest[++i]; } }
      const { abs, n } = nodeAt(c.st, start); if (!n) return bad(`find: '${start}': No such file or directory`);
      const out = []; const rec = (p, node, nm) => { if ((!type || (type === 'd' ? node.t === 'd' : node.t === 'f')) && (!nameRe || nameRe.test(nm))) out.push(p); if (node.t === 'd' && can(c.st, node, 'r')) for (const k of Object.keys(node.c).sort()) rec((p === '/' ? '' : p) + '/' + k, node.c[k], k); else if (node.t === 'd') err += `find: '${p}': Permission denied\n`; };
      rec(start.replace(/(.)\/$/, '$1'), n, split(abs)[1]);
      return { out: nl(out), err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    tree: (c, a) => { const { flags, rest } = optParse(a), { n } = nodeAt(c.st, rest[0] || '.'); if (!n || n.t !== 'd') return bad(`${rest[0] || '.'} [error opening dir]`); const counts = { d: 0, f: 0 }; const body = treeOf(c, n, '', flags, counts); return ok((rest[0] || '.') + '\n' + body + `\n${counts.d} director${counts.d === 1 ? 'y' : 'ies'}, ${counts.f} file${counts.f === 1 ? '' : 's'}\n`); },
    chmod: (c, a) => {
      if (a.length < 2) return bad(a.length ? `chmod: missing operand after '${a[0]}'` : 'chmod: missing operand'); const spec = a[0]; let err = '';
      const apply = old => {
        if (/^[0-7]{3,4}$/.test(spec)) return parseInt(spec.slice(-3), 8);
        const m = /^([ugoa]*)([+\-=])([rwx]+)$/.exec(spec); if (!m) return null;
        const who = m[1] || 'a', bits = [...m[3]].reduce((x, ch) => x | ({ r: 4, w: 2, x: 1 })[ch], 0); let mode = old;
        for (const w of who === 'a' ? 'ugo' : who) { const sh = ({ u: 6, g: 3, o: 0 })[w], mask = bits << sh; mode = m[2] === '+' ? mode | mask : m[2] === '-' ? mode & ~mask : (mode & ~(7 << sh)) | mask; }
        return mode;
      };
      if (apply(0o644) === null) return bad(`chmod: invalid mode: '${spec}'`);
      for (const p of a.slice(1)) { const { n } = nodeAt(c.st, p); if (!n) { err += `chmod: cannot access '${p}': No such file or directory\n`; continue; } if (n.owner !== c.st.user && c.st.user !== 'root') { err += `chmod: changing permissions of '${p}': Operation not permitted\n`; continue; } n.mode = apply(n.mode); }
      return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
    },
    chown: (c, a) => { if (a.length < 2) return bad('chown: missing operand'); if (c.st.user !== 'root') return bad(`chown: changing ownership of '${a[1]}': Operation not permitted`); const o = a[0].split(':')[0]; let err = ''; for (const p of a.slice(1)) { const { n } = nodeAt(c.st, p); if (!n) err += `chown: cannot access '${p}': No such file or directory\n`; else n.owner = o === 'root' || o === 'user' ? o : n.owner; } return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 }; },
    whoami: c => ok(c.st.user + '\n'),
    id: c => ok(c.st.user === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)\n' : 'uid=1000(user) gid=1000(user) groups=1000(user),27(sudo)\n'),
    hostname: c => ok(c.st.host + '\n'),
    uname: (c, a) => ok(a.includes('-a') ? `Linux ${c.st.host} 6.1.0-practice #1 SMP x86_64 GNU/Linux\n` : 'Linux\n'),
    date: () => { const d = new Date(clock()); return ok(`${DAY[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}\n`); },
    uptime: () => ok(' 09:30:00 up 3 days,  4:12,  1 user,  load average: 0.08, 0.03, 0.01\n'),
    clear: () => ({ out: '', err: '', code: 0, clear: true }),
    exit: () => ({ out: 'There is nothing to exit: this is only a practice terminal. Go back with the arrow at the top.\n', err: '', code: 0 }),
    history: (c, a) => { if (a[0] === '-c') { c.st.history = []; return ok(''); } return ok(c.st.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n') + (c.st.history.length ? '\n' : '')); },
    help: c => ok(C.bold('Commands you can try') + '\n' + Object.keys(META).filter(k => !OPTIONAL[k] || c.st.pkgs.includes(k)).sort().map(k => `  ${k.padEnd(10)} ${META[k][0]}`).join('\n') + '\n\nType "man COMMAND" for details. Press Tab to finish a name, and the up arrow for older commands.\n'),
    man: (c, a) => {
      if (!a[0]) return bad('What manual page do you want?\nFor example, try \'man ls\'.');
      const m = META[a[0]]; if (!m) return bad(`No manual entry for ${a[0]}`);
      return ok(`${C.bold(a[0].toUpperCase())}(1)\n\n${C.bold('NAME')}\n    ${a[0]} - ${m[0]}\n\n${C.bold('SYNOPSIS')}\n    ${m[1]}\n` + (m[2].length ? `\n${C.bold('OPTIONS')}\n` + m[2].map(([o, d]) => `    ${o.padEnd(10)} ${d}`).join('\n') + '\n' : '') + `\n${C.bold('EXAMPLES')}\n` + m[3].map(e => '    ' + e).join('\n') + '\n\n(This is a short practice manual. Real ones are longer.)\n');
    },
    which: (c, a) => { let out = '', code = 0; for (const n of a) { if (CMDS[n] && (!OPTIONAL[n] || c.st.pkgs.includes(n))) out += (['cd', 'alias', 'export', 'history', 'unalias', 'exit'].includes(n) ? '' : '/usr/bin/' + n + '\n'); else code = 1; } return { out, err: '', code }; },
    alias: (c, a) => { if (!a.length) return ok(Object.entries(c.st.aliases).map(([k, v]) => `alias ${k}='${v}'`).join('\n') + '\n'); for (const x of a) { const i = x.indexOf('='); if (i > 0) c.st.aliases[x.slice(0, i)] = x.slice(i + 1); else if (c.st.aliases[x]) return ok(`alias ${x}='${c.st.aliases[x]}'\n`); else return bad(`bash: alias: ${x}: not found`); } return ok(''); },
    unalias: (c, a) => { let err = ''; for (const x of a) { if (c.st.aliases[x]) delete c.st.aliases[x]; else err += `bash: unalias: ${x}: not found\n`; } return { out: '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 }; },
    export: (c, a) => { for (const x of a) { const i = x.indexOf('='); if (i > 0) c.st.env[x.slice(0, i)] = x.slice(i + 1); } return ok(''); },
    unset: (c, a) => { for (const x of a) delete c.st.env[x]; return ok(''); },
    env: c => ok(Object.entries({ ...c.st.env, USER: c.st.user, PWD: c.st.cwd }).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'),
    printenv: (c, a) => { const e = { ...c.st.env, USER: c.st.user, PWD: c.st.cwd }; return a.length ? (e[a[0]] !== undefined ? ok(e[a[0]] + '\n') : { out: '', err: '', code: 1 }) : CMDS.env(c); },
    sudo: (c, a, stdin) => {
      if (!a.length) return bad('usage: sudo COMMAND');
      if (c.st.user === 'root') return runCommand(c.sh, a, stdin, c.tty);
      const prev = c.st.user, prevHome = c.st.env.HOME; c.st.user = 'root';
      try { return runCommand(c.sh, a, stdin, c.tty); } finally { c.st.user = prev; c.st.env.HOME = prevHome; }
    },
    apt: (c, a) => aptCmd(c, a), 'apt-get': (c, a) => aptCmd(c, a),
    df: (c, a) => ok('Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        40G  9.1G   29G  24% /\ntmpfs           2.0G     0  2.0G   0% /dev/shm\n'),
    free: (c, a) => ok(a.includes('-h') ? '               total        used        free      shared  buff/cache   available\nMem:           3.8Gi       1.1Gi       1.9Gi        21Mi       860Mi       2.5Gi\nSwap:          2.0Gi          0B       2.0Gi\n' : '               total        used        free\nMem:         3984352     1153024     1990112\nSwap:        2097148           0     2097148\n'),
    ps: () => ok(FAKE_PS.join('\n') + '\n'),
    kill: (c, a) => a.length ? bad(`bash: kill: (${a[a.length - 1]}) - No such process`) : bad('kill: usage: kill [-s sigspec] pid'),
    sleep: () => ok(''),
    ping: (c, a) => { const h = a.find(x => !x.startsWith('-')); if (!h) return bad('ping: usage error: Destination address required', 2); return ok(`PING ${h} (93.184.216.34) 56(84) bytes of data.\n64 bytes from ${h}: icmp_seq=1 ttl=56 time=11.2 ms\n64 bytes from ${h}: icmp_seq=2 ttl=56 time=10.8 ms\n64 bytes from ${h}: icmp_seq=3 ttl=56 time=11.0 ms\n\n--- ${h} ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss\n(These replies are pretend. This app never uses the network.)\n`); },
    du: (c, a) => { const { flags, rest } = optParse(a), p = rest[0] || '.', { n } = nodeAt(c.st, p); if (!n) return bad(`du: cannot access '${p}': No such file or directory`); const sz = n.t === 'd' ? Math.max(4096, Math.ceil(total(n) / 4096) * 4096 + 4096) : Math.max(4096, Math.ceil(n.d.length / 4096) * 4096); return ok(`${flags.h ? human(sz) : Math.ceil(sz / 1024)}\t${p}\n`); },
    cut: (c, a, stdin) => { const { flags, rest } = optParse(a, 'd:f:c:'), d = flags.d === undefined ? '\t' : flags.d, r = inputs(c, 'cut', rest, stdin); if (!flags.f && !flags.c) return bad('cut: you must specify a list of bytes, characters, or fields'); const idx = String(flags.f || flags.c).split(',').flatMap(x => { const m = /^(\d+)-(\d*)$/.exec(x); return m ? Array.from({ length: (m[2] ? +m[2] : 20) - +m[1] + 1 }, (_, i) => +m[1] + i) : [+x]; }); return ok(nl(lines(r.text).map(l => flags.c ? [...l].filter((_, i) => idx.includes(i + 1)).join('') : l.split(d).filter((_, i) => idx.includes(i + 1)).join(d)))); },
    tr: (c, a, stdin) => { const { flags, rest } = optParse(a); const exp = s => s.replace(/(.)-(.)/g, (m, x, y) => { let o = ''; for (let k = x.charCodeAt(0); k <= y.charCodeAt(0); k++) o += String.fromCharCode(k); return o; }); const set1 = exp(rest[0] || ''), set2 = exp(rest[1] || ''); let t = stdin || ''; if (flags.d) t = [...t].filter(ch => !set1.includes(ch)).join(''); else t = [...t].map(ch => { const i = set1.indexOf(ch); return i < 0 ? ch : set2[Math.min(i, set2.length - 1)] ?? ch; }).join(''); return ok(t); },
    sed: (c, a, stdin) => { const { rest } = optParse(a); const m = /^s(.)(.*?)\1(.*?)\1([gi]*)$/.exec(rest[0] || ''); if (!m) return bad("sed: only s/old/new/ is supported in this practice terminal"); const r = inputs(c, 'sed', rest.slice(1), stdin); let re; try { re = new RegExp(m[2], m[4]); } catch { return bad('sed: invalid pattern'); } return ok(nl(lines(r.text).map(l => l.replace(re, m[3])))); },
    tee: (c, a, stdin) => { let err = ''; for (const p of a.filter(x => !x.startsWith('-'))) { const e = writeTarget(c.st, { p, add: a.includes('-a') }, stdin || ''); if (e) err += e.replace(/^bash: /, 'tee: ') + '\n'; } return { out: stdin || '', err: err.replace(/\n$/, ''), code: err ? 1 : 0 }; },
    basename: (c, a) => ok((a[0] || '').replace(/\/+$/, '').split('/').pop() + '\n'),
    dirname: (c, a) => ok((a[0] && a[0].includes('/') ? (a[0].replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/') : '.') + '\n'),
    stat: (c, a) => { const { n } = nodeAt(c.st, a[0] || ''); if (!a[0]) return bad('stat: missing operand'); if (!n) return bad(`stat: cannot statx '${a[0]}': No such file or directory`); return ok(`  File: ${a[0]}\n  Size: ${sizeOf(n)}\t${n.t === 'd' ? 'directory' : 'regular file'}\nAccess: (${(n.mode & 0o777).toString(8).padStart(4, '0')}/${modeStr(n)})  Uid: (${n.owner === 'root' ? 0 : 1000}/${n.owner})\nModify: ${new Date(n.mtime).toISOString().replace('T', ' ').slice(0, 19)}\n`); },
    file: (c, a) => ok(a.map(p => { const { n } = nodeAt(c.st, p); return `${p}: ` + (!n ? 'cannot open (No such file or directory)' : n.t === 'd' ? 'directory' : !n.d ? 'empty' : n.d.startsWith('#!') ? 'script, ASCII text executable' : 'ASCII text'); }).join('\n') + '\n'),
    xargs: (c, a, stdin) => { const items = (stdin || '').split(/\s+/).filter(Boolean); if (!a.length) a = ['echo']; return runCommand(c.sh, [...a, ...items], '', c.tty); },
    cowsay: (c, a) => { const t = a.join(' ') || 'Moo'; return ok(` ${'_'.repeat(t.length + 2)}\n< ${t} >\n ${'-'.repeat(t.length + 2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||\n`); },
    neofetch: c => ok(`${C.cyan(c.st.user + '@' + c.st.host)}\n-----------------\n${C.cyan('OS')}: Practice Linux x86_64\n${C.cyan('Kernel')}: 6.1.0-practice\n${C.cyan('Shell')}: bash\n${C.cyan('Packages')}: ${120 + c.st.pkgs.length}\n`),
    curl: () => bad('curl: (6) Could not resolve host. This practice terminal has no network, on purpose.', 6),
    wget: () => bad('wget: unable to resolve host. This practice terminal has no network, on purpose.', 4),
    ssh: () => bad('ssh: this practice terminal cannot connect to other computers.', 255),
    su: () => bad('su: Authentication failure (use "sudo" in this practice terminal)', 1),
    passwd: () => bad('passwd: this practice terminal does not change real passwords.', 1),
    nano: () => bad('This practice terminal has no text editor. To write a file, use:\n  echo "some text" > file.txt\n  echo "more text" >> file.txt', 1),
    vim: () => bad('This practice terminal has no text editor. To write a file, use:\n  echo "some text" > file.txt', 1), vi: () => CMDS.vim(), emacs: () => CMDS.vim(),
    top: () => ok('top - 09:30:00 up 3 days,  1 user,  load average: 0.08, 0.03, 0.01\nTasks:   2 total,   1 running\n  PID USER      %CPU %MEM COMMAND\n 1204 user       0.3  0.1 bash\n 1311 user       0.0  0.0 top\n(A real top keeps updating. This one shows a single picture.)\n'),
    htop: () => CMDS.top(),
    true: () => ({ out: '', err: '', code: 0 }), false: () => ({ out: '', err: '', code: 1 }),
    test: () => ({ out: '', err: '', code: 0 }),
  };
  function headTail(c, a, stdin, head) {
    let n = 10; const rest = [];
    for (let i = 0; i < a.length; i++) { if (a[i] === '-n') { n = parseInt(a[++i], 10); } else if (/^-n\d+$/.test(a[i])) n = parseInt(a[i].slice(2), 10); else if (/^-\d+$/.test(a[i])) n = parseInt(a[i].slice(1), 10); else rest.push(a[i]); }
    if (!(n >= 0)) return bad(`${head ? 'head' : 'tail'}: invalid number of lines`);
    let out = '', err = '';
    const one = t => { const l = lines(t); return nl(head ? l.slice(0, n) : n ? l.slice(-n) : []); };
    if (!rest.length) return ok(one(stdin || ''));
    rest.forEach((f, i) => { const r = readFile(c, head ? 'head' : 'tail', f); if (r.err) err += r.err.replace(/^(head|tail): /, `${head ? 'head' : 'tail'}: cannot open '${f}' for reading: `).replace(`: ${f}: `, ': ') + '\n'; else out += (rest.length > 1 ? (i ? '\n' : '') + `==> ${f} <==\n` : '') + one(r.text); });
    return { out, err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
  }
  function aptCmd(c, a) {
    const sub = a.find(x => !x.startsWith('-')), names = a.filter(x => !x.startsWith('-')).slice(1);
    if (!sub) return ok('apt 2.6 (practice)\nUsage: sudo apt update | install NAME | remove NAME | list --installed | search WORD\n');
    if (sub === 'search') { const w = names[0] || ''; return ok(Object.keys(PACKAGES).filter(p => p.includes(w)).map(p => `${p}/stable 1.0 amd64\n  a pretend package called ${p}\n`).join('\n')); }
    if (sub === 'list') return ok('Listing... Done\n' + ['bash', 'coreutils', 'grep', 'sed', ...c.st.pkgs].map(p => `${p}/stable,now 1.0 amd64 [installed]`).join('\n') + '\n');
    if (!['update', 'upgrade', 'install', 'remove', 'purge'].includes(sub)) return bad(`E: Invalid operation ${sub}`, 100);
    if (c.st.user !== 'root') return bad('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?\n(Try again with sudo in front.)', 100);
    if (sub === 'update') return ok('Hit:1 http://deb.practice.example stable InRelease\nReading package lists... Done\nAll packages are up to date. (pretend)\n');
    if (sub === 'upgrade') return ok('Reading package lists... Done\n0 upgraded, 0 newly installed, 0 to remove.\n');
    if (!names.length) return bad(`E: No packages specified`, 100);
    let out = '';
    for (const nm of names) {
      if (!PACKAGES[nm]) return bad(`E: Unable to locate package ${nm}`, 100);
      if (sub === 'install') { if (c.st.pkgs.includes(nm)) out += `${nm} is already the newest version.\n`; else { c.st.pkgs.push(nm); out += `Reading package lists... Done\nThe following NEW packages will be installed:\n  ${nm}\nSetting up ${nm} (1.0) ...\n(This is a pretend install. Nothing real was downloaded.)\n`; } }
      else { c.st.pkgs = c.st.pkgs.filter(p => p !== nm); out += `Removing ${nm} (1.0) ...\n`; }
    }
    return ok(out);
  }

  /* ---------- tab completion ---------- */
  const complete = (st, line) => {
    const m = /(\S*)$/.exec(line), word = m[1], before = line.slice(0, line.length - word.length), first = !before.trim() || /[|;&]\s*$/.test(before);
    let cands = [];
    if (first && !word.includes('/')) { cands = [...new Set([...Object.keys(CMDS).filter(k => !OPTIONAL[k] || st.pkgs.includes(k)), ...Object.keys(st.aliases)])].filter(k => k.startsWith(word)).sort(); }
    else {
      const slash = word.lastIndexOf('/'), dirPart = slash >= 0 ? word.slice(0, slash + 1) : '', base = word.slice(slash + 1), dn = walk(st, resolve(st, dirPart || '.'));
      if (dn && dn.t === 'd' && can(st, dn, 'r')) cands = Object.keys(dn.c).filter(k => k.startsWith(base) && (base.startsWith('.') || !k.startsWith('.'))).sort().map(k => dirPart + k + (dn.c[k].t === 'd' ? '/' : ''));
    }
    if (!cands.length) return { text: line, options: [] };
    let common = cands[0]; for (const x of cands) { while (!x.startsWith(common)) common = common.slice(0, -1); }
    const single = cands.length === 1 ? (cands[0].endsWith('/') ? '' : ' ') : '';
    return { text: before + common + single, options: cands.length > 1 ? cands.map(x => x.split('/').filter(Boolean).pop() + (x.endsWith('/') ? '/' : '')) : [] };
  };

  /* ---------- the public side ---------- */
  const MAX_HISTORY = 200;
  const run = (st, line) => {
    const t = line.replace(/\s+$/, '');
    if (!t.trim()) return { out: '', clear: false };
    if (st.history[st.history.length - 1] !== t) st.history.push(t); if (st.history.length > MAX_HISTORY) st.history.splice(0, st.history.length - MAX_HISTORY);
    const hist = /^!!$/.test(t.trim()) ? st.history[st.history.length - 2] : null;
    const r = exec(st, hist || t);
    let out = r.out; if (r.err) out += (out && !out.endsWith('\n') ? '\n' : '') + r.err + (r.err.endsWith('\n') ? '' : '\n');
    return { out, clear: !!r.clear, code: r.code };
  };

  // saved state sanity: anything stored is checked before use
  const restore = raw => {
    try {
      const base = newState(); if (!raw || typeof raw !== 'object' || !raw.fs || raw.fs.t !== 'd') return base;
      const okNode = (n, d = 0) => n && (n.t === 'd' ? d < 20 && n.c && typeof n.c === 'object' && Object.values(n.c).every(x => okNode(x, d + 1)) : n.t === 'f' && typeof n.d === 'string');
      if (!okNode(raw.fs) || count(raw.fs) > MAX_NODES * 2) return base;
      const st = { ...base, fs: raw.fs, cwd: typeof raw.cwd === 'string' ? raw.cwd : base.cwd, history: Array.isArray(raw.history) ? raw.history.filter(x => typeof x === 'string').slice(-MAX_HISTORY) : [], aliases: raw.aliases && typeof raw.aliases === 'object' ? Object.fromEntries(Object.entries(raw.aliases).filter(([k, v]) => typeof v === 'string')) : base.aliases, env: raw.env && typeof raw.env === 'object' ? Object.fromEntries(Object.entries({ ...base.env, ...raw.env }).filter(([k, v]) => typeof v === 'string')) : base.env, pkgs: Array.isArray(raw.pkgs) ? raw.pkgs.filter(x => PACKAGES[x]) : [] };
      const w = walk(st, st.cwd); if (!w || w.t !== 'd') st.cwd = base.cwd;
      st.user = 'user'; return st;
    } catch { return newState(); }
  };
  const snapshot = st => ({ fs: st.fs, cwd: st.cwd, history: st.history, aliases: st.aliases, env: st.env, pkgs: st.pkgs });

  return { newState, run, complete, prompt, restore, snapshot, strip, walk, resolve, setClock, META, CMDS, PACKAGES, count, total };
})();
if (typeof module !== 'undefined') module.exports = TermCore;

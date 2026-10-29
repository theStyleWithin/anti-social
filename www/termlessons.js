'use strict';
/* Terminal Practice: short lessons. Each step is checked from what you typed and the state of the pretend file system. */
const TermLessons = (() => {
  const T = typeof TermCore !== 'undefined' ? TermCore : require('./termcore.js');
  const node = (st, p) => T.walk(st, p);
  const file = (st, p) => { const n = node(st, p); return n && n.t === 'f' ? n : null; };
  const ran = (line, re) => re.test(line.trim());
  // every check gets { st, line, hist, viaHistory }: the state, the command just typed, everything typed so far, and whether it came back from the up arrow
  const L = (id, title, intro, steps) => ({ id, title, intro, steps: steps.map((s, i) => ({ id: `${id}.${i + 1}`, ...s })) });
  const LESSONS = [
    L('where', '1. Finding your way', 'The terminal is a way to talk to the computer with typing. You are always "in" a folder. These commands show you where you are and let you move around.', [
      { text: 'Print where you are with pwd.', hint: 'Type pwd and press Enter.', check: ({ line }) => ran(line, /^pwd$/) },
      { text: 'List what is in this folder with ls.', hint: 'Type ls', check: ({ line }) => ran(line, /^ls$/) },
      { text: 'Go into the Documents folder with cd.', hint: 'cd Documents', check: ({ st }) => st.cwd === '/home/user/Documents' },
      { text: 'Go back up one folder. Two dots mean "the folder above".', hint: 'cd ..', check: ({ st, line }) => st.cwd === '/home/user' && ran(line, /^cd\s+\.\.\/?$/) },
      { text: 'Show hidden files too. Hidden names start with a dot.', hint: 'ls -a', check: ({ line }) => ran(line, /^ls\s+(-\w*a\w*|--all)(\s|$)/) },
    ]),
    L('files', '2. Making files and folders', 'Folders hold files. You can make both without ever touching a mouse.', [
      { text: 'Make a folder called practice.', hint: 'mkdir practice', check: ({ st }) => node(st, '/home/user/practice') && node(st, '/home/user/practice').t === 'd' },
      { text: 'Go into it.', hint: 'cd practice', check: ({ st }) => st.cwd === '/home/user/practice' },
      { text: 'Make an empty file called hello.txt.', hint: 'touch hello.txt', check: ({ st }) => !!file(st, '/home/user/practice/hello.txt') },
      { text: 'Write a line into it. The > sign sends words into a file.', hint: 'echo "Hello, Linux" > hello.txt', check: ({ st }) => { const f = file(st, '/home/user/practice/hello.txt'); return !!f && /\S/.test(f.d); } },
      { text: 'Read it back with cat.', hint: 'cat hello.txt', check: ({ line }) => ran(line, /^cat\s+(\.\/)?hello\.txt$/) },
    ]),
    L('move', '3. Copy, move and delete', 'Copying makes a second file. Moving changes where it lives, which is also how you rename. Deleting is final: there is no bin.', [
      { text: 'Copy hello.txt to copy.txt (do this inside the practice folder).', hint: 'cp hello.txt copy.txt', check: ({ st }) => !!file(st, '/home/user/practice/copy.txt') },
      { text: 'Rename copy.txt to renamed.txt with mv.', hint: 'mv copy.txt renamed.txt', check: ({ st }) => !!file(st, '/home/user/practice/renamed.txt') && !file(st, '/home/user/practice/copy.txt') },
      { text: 'Delete renamed.txt with rm.', hint: 'rm renamed.txt', check: ({ st, hist }) => !file(st, '/home/user/practice/renamed.txt') && hist.some(h => /^mv\b/.test(h)) },
      { text: 'Make a folder called docs and copy hello.txt into it.', hint: 'mkdir docs   then   cp hello.txt docs/', check: ({ st }) => !!file(st, '/home/user/practice/docs/hello.txt') },
    ]),
    L('look', '4. Looking inside files', 'Often you do not want the whole file, just a piece of it, or a count.', [
      { text: 'Show the first 2 lines of todo.txt (it is in your home folder, ~).', hint: 'head -n 2 ~/todo.txt', check: ({ line }) => ran(line, /^head\s+(-n\s*2|-2)\s+\S*todo\.txt$/) },
      { text: 'Show the last 2 lines of /var/log/syslog.', hint: 'tail -n 2 /var/log/syslog', check: ({ line }) => ran(line, /^tail\s+(-n\s*2|-2)\s+\/var\/log\/syslog$/) },
      { text: 'Count the lines in ~/notes.txt.', hint: 'wc -l ~/notes.txt', check: ({ line }) => ran(line, /^wc\s+-l\s+\S*notes\.txt$/) },
      { text: 'Search ~/notes.txt for the word linux, ignoring capital letters.', hint: 'grep -i linux ~/notes.txt', check: ({ line }) => ran(line, /^grep\s+(-\w*i\w*)\s+linux\s+\S*notes\.txt$/) },
      { text: 'Find every .txt file below your home folder.', hint: 'find ~ -name "*.txt"', check: ({ line }) => ran(line, /^find\s+\S+\s+-name\s+["']?\*\.txt["']?$/) },
    ]),
    L('pipes', '5. Pipes: joining commands', 'The | sign feeds the output of one command into the next. Small tools, joined together, do big jobs.', [
      { text: 'Count how many things are in your home folder: list them, then pipe to wc -l.', hint: 'ls ~ | wc -l', check: ({ line }) => ran(line, /^ls\s+(-\w+\s+)?(~|\/home\/user)?\s*\|\s*wc\s+-l$/) },
      { text: 'Sort the lines of ~/todo.txt alphabetically.', hint: 'sort ~/todo.txt', check: ({ line }) => ran(line, /^sort\s+\S*todo\.txt$/) || ran(line, /^cat\s+\S*todo\.txt\s*\|\s*sort$/) },
      { text: 'Search the recipes for pancakes and count how many lines match: cat, then grep, then wc -l.', hint: 'cat ~/Documents/recipes.txt | grep pancakes | wc -l', check: ({ line }) => /\|.*grep.*\|.*wc/.test(line) && /pancakes/.test(line) },
      { text: 'Save a listing into a file with >.', hint: 'ls ~ > ~/listing.txt', check: ({ st }) => !!file(st, '/home/user/listing.txt') },
    ]),
    L('perms', '6. Permissions and sudo', 'Every file says who may read (r), write (w) and run (x) it. The administrator, root, can do anything, so ask carefully with sudo.', [
      { text: 'See the permissions of the files in Downloads with ls -l.', hint: 'ls -l ~/Downloads', check: ({ line }) => ran(line, /^ls\s+-\w*l\w*\s+\S*Downloads\/?$/) },
      { text: 'Make installer.sh runnable.', hint: 'chmod +x ~/Downloads/installer.sh', check: ({ st }) => { const f = file(st, '/home/user/Downloads/installer.sh'); return !!f && !!(f.mode & 0o100); } },
      { text: 'Run it. A ./ in front means "the program right here".', hint: '~/Downloads/installer.sh   or   cd ~/Downloads then ./installer.sh', check: ({ line }) => ran(line, /installer\.sh$/) && !/^(ls|cat|chmod)/.test(line) },
      { text: 'Try to read /root/private.txt. It will say permission denied. That is the point.', hint: 'cat /root/private.txt', check: ({ line }) => ran(line, /^cat\s+\/root\/private\.txt$/) },
      { text: 'Now read it as the administrator with sudo.', hint: 'sudo cat /root/private.txt', check: ({ line }) => ran(line, /^sudo\s+cat\s+\/root\/private\.txt$/) },
    ]),
    L('apt', '7. Installing software', 'Linux programs come from a package manager. On Debian and Ubuntu it is called apt. Installing needs sudo. (Here it is all pretend: nothing is downloaded.)', [
      { text: 'Refresh the list of packages.', hint: 'sudo apt update', check: ({ line }) => ran(line, /^sudo\s+apt(-get)?\s+update$/) },
      { text: 'Install a tiny program called tree.', hint: 'sudo apt install tree', check: ({ st }) => st.pkgs.includes('tree') },
      { text: 'Use it to draw your Documents folder.', hint: 'tree ~/Documents', check: ({ line }) => ran(line, /^tree(\s|$)/) },
      { text: 'Install cowsay, then make the cow say something.', hint: 'sudo apt install cowsay    then    cowsay hello', check: ({ st, line }) => st.pkgs.includes('cowsay') && ran(line, /^cowsay\b/) },
    ]),
    L('power', '8. Speed tricks', 'Real terminals are fast because you hardly type. Try these habits.', [
      { text: 'Type  ls Doc  and press the Tab key. It finishes the name for you. Then press Enter.', hint: 'ls Doc then Tab then Enter', check: ({ line }) => ran(line, /^ls\s+Documents\/?$/) },
      { text: 'Press the up arrow to bring back an older command, then press Enter.', hint: 'Up arrow, then Enter', check: ({ viaHistory }) => !!viaHistory },
      { text: 'Show everything you have typed with history.', hint: 'history', check: ({ line }) => ran(line, /^history$/) },
      { text: 'Make a shortcut: alias hi="echo hello", then use it.', hint: 'alias hi="echo hello"   then   hi', check: ({ line, st }) => !!st.aliases.hi && ran(line, /^hi$/) },
      { text: 'Make a variable and print it: export NAME=Tux, then echo $NAME.', hint: 'export NAME=Tux   then   echo $NAME', check: ({ line, st }) => st.env.NAME !== undefined && ran(line, /^echo\s+.*\$\{?NAME\}?/) },
    ]),
  ];
  const stepsAll = () => LESSONS.flatMap(l => l.steps);
  // after a command: which steps newly pass? (only the first unfinished step of each lesson counts, so steps go in order)
  const evaluate = (progress, ctx) => {
    const done = { ...progress }; let changed = false;
    for (const l of LESSONS) {
      for (const s of l.steps) {
        if (done[s.id]) continue;
        let pass = false; try { pass = !!s.check(ctx); } catch { pass = false; }
        if (pass) { done[s.id] = true; changed = true; } else break;
      }
    }
    return { done, changed };
  };
  const stats = progress => { const all = stepsAll(); return { done: all.filter(s => progress[s.id]).length, total: all.length }; };
  const lessonStats = (l, progress) => ({ done: l.steps.filter(s => progress[s.id]).length, total: l.steps.length });
  const current = progress => { for (const l of LESSONS) for (const s of l.steps) if (!progress[s.id]) return { lesson: l, step: s }; return null; };
  const normProgress = raw => { const ids = new Set(stepsAll().map(s => s.id)); return Object.fromEntries(Object.keys(raw && typeof raw === 'object' ? raw : {}).filter(k => ids.has(k) && raw[k] === true).map(k => [k, true])); };
  return { LESSONS, evaluate, stats, lessonStats, current, normProgress };
})();
if (typeof module !== 'undefined') module.exports = TermLessons;

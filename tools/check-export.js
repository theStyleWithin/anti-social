#!/usr/bin/env node
'use strict';
/* Keeps "your account travels" true as features are added. Run: node tools/check-export.js (the Checks workflow runs it on every push).
   1. The export rules in www/acctcore.js do what they say (nothing secret leaks, nothing per-account gets lost).
   2. Every setting the app keeps in localStorage is filed in acctcore.js: per-account, look, or device-only.
      A new key that is not filed fails this check, so a new feature cannot quietly leave your setup behind when you eject. */
const fs = require('fs'), path = require('path');
const A = require('../www/acctcore.js');
let bad = 0; const fail = m => { bad++; console.log('FAIL  ' + m); }, ok = m => console.log('ok    ' + m);

/* ---- 1. the rules ---- */
const acct = { id: 'abc123', handle: 'alex', name: 'Alex' };
const file = A.buildExport(acct, [{ id: 'p1', kind: 'fpost' }], { 'as.clock.color.abc123': 'amber', 'as.session': 'x', 'as.other.zzz': 'y' }, new Date(), { 'as.template': 'chat', 'as.session': 'leak', 'as.lockAfter': '0', 'as.ra': 'secret', 'as.sound.mode': 'a' });
const r = A.parseExport(JSON.stringify(file));
r.ok ? ok('an export reads back') : fail('an export did not read back: ' + r.error);
if (r.ok) {
  JSON.stringify(Object.keys(r.data.prefs)) === '["as.clock.color.abc123"]' ? ok('only this account\'s settings travel with it') : fail('prefs: ' + JSON.stringify(r.data.prefs));
  JSON.stringify(Object.keys(r.data.look).sort()) === '["as.sound.mode","as.template"]' ? ok('the look travels; sessions, locks and keys do not') : fail('look: ' + JSON.stringify(r.data.look));
  JSON.stringify(A.remapPrefs(r.data.prefs, 'abc123', 'new9')) === '{"as.clock.color.new9":"amber"}' ? ok('settings move to the new account id on import') : fail('remap broke');
}
const acctJs = fs.readFileSync(path.join(__dirname, '../www/accounts.js'), 'utf8');
(acctJs.match(/p\.kind !== '(\w+)'/g) || []).map(x => x.match(/'(\w+)'/)[1]).sort().join() === 'aikey,rakey' ? ok('only the API-key records are left out of an export') : fail('accounts.js leaves out a different set of records than aikey and rakey: records must travel by default');

/* ---- 2. every localStorage key is filed ---- */
const dir = path.join(__dirname, '../www'); const unknown = new Map();
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
  fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/['`](as\.[A-Za-z0-9_.-]+)['`]?/g)) {
      const k = m[1];
      const filed = A.LOOK_KEYS.includes(k) || A.DEVICE_ONLY.includes(k) || A.LOOK_PREFIXES.some(p => k === p || k.startsWith(p));
      const perAccount = k.endsWith('.') && /\bid\b/.test(line);       // 'as.thing.' + acct.id
      if (!filed && !perAccount) unknown.set(k + '  (' + f + ':' + (i + 1) + ')', 1);
    }
  });
}
// the page also names these in text (for example in comments); ignore anything that is not used as a storage key
const used = [...unknown.keys()].filter(k => !/^as\.(com|org|net)\b/.test(k));
used.length ? used.forEach(k => fail('a setting is not filed in www/acctcore.js: ' + k + '\n        add it to LOOK_KEYS (comes with your account), DEVICE_ONLY (stays on this device) or name it as.<what>.<account id>')) : ok('every saved setting is filed (' + 'per-account, look or device-only' + ')');
console.log(bad ? `\n${bad} problem${bad === 1 ? '' : 's'}` : '\nall good');
process.exit(bad ? 1 : 0);

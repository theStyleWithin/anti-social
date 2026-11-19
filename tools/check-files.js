#!/usr/bin/env node
'use strict';
/* Keeps "Anti-Social never touches your own files" true. Run: node tools/check-files.js (the Checks workflow runs it on every push).
   Your files are the music folders you point it at and the notes, books and pictures you import. They are only ever read.
   Only the Switch SD-card tools (pokesd.js, sdcore.js) may write to a folder, and only after you pick that folder for that job. */
const fs = require('fs'), path = require('path');
const www = path.join(__dirname, '../www'); let bad = 0; const fail = m => { bad++; console.log('FAIL  ' + m); }, ok = m => console.log('ok    ' + m);
const read = f => fs.readFileSync(path.join(www, f), 'utf8');
const files = fs.readdirSync(www).filter(n => n.endsWith('.js'));

// 1. nothing but the SD-card tools writes to or deletes from a folder you picked
const WRITERS = ['pokesd.js', 'sdcore.js', 'fsbridge.js'];
const offenders = files.filter(f => !WRITERS.includes(f) && /(AntiSocialFS|\bfs)\s*\.\s*(write|remove|delete|rename|mkdir)\s*\(/.test(read(f)));
offenders.length ? fail('these files write to a folder: ' + offenders.join(', ')) : ok('only the SD-card tools can write to a folder');

// 2. the music folder is picked read-only
/AntiSocialFS\.pick\('Choose your music folder', \{ readOnly: true \}\)/.test(read('music.js')) ? ok('the music folder is opened read-only') : fail('music.js must pick its folder with { readOnly: true }');

// 3. eject and delete only touch the app's own data
const strip = s => s.replace(/\/\/.*$/gm, '');
const ejectBody = strip(read('accounts.js')).slice(read('accounts.js').indexOf('function ejectAccount'), read('accounts.js').indexOf('/* ---------- import'));
const delBody = strip(read('app.js')).slice(read('app.js').indexOf('async function deleteAccount'), read('app.js').indexOf('function editProfile'));
/AntiSocialFS/.test(ejectBody + delBody) ? fail('eject or delete reaches into your folders') : ok('eject and delete never reach into your folders');

// 4. the desktop app refuses writes to a read-only folder
const main = fs.readFileSync(path.join(__dirname, '../desktop/main.js'), 'utf8');
/readOnly\.has\(id\)\) throw/.test(main) ? ok('the desktop app refuses writes to a read-only folder') : fail('desktop/main.js must refuse fs:write for read-only folders');
// 5. on Android the read-only pick keeps only the read permission
const java = fs.readFileSync(path.join(__dirname, '../mobile/android/app/src/main/java/com/antisocial/app/FsBridge.java'), 'utf8');
/readOnly \? Intent\.FLAG_GRANT_READ_URI_PERMISSION :/.test(java) ? ok('on Android a read-only folder is granted read permission only') : fail('FsBridge.java must grant only read permission for a read-only pick');
console.log(bad ? `\n${bad} problem${bad === 1 ? '' : 's'}` : '\nall good'); process.exit(bad ? 1 : 0);

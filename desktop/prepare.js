// Copy the shared web app into this package so electron-builder can bundle it.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'www');
const dest = path.join(__dirname, 'www');
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
fs.copyFileSync(path.join(src, 'icons', 'icon-512.png'), path.join(__dirname, 'build', 'icon.png'));

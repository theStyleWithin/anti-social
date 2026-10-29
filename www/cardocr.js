'use strict';
/* Card Binder: reading a card photo on this device. Uses Tesseract (open source OCR, Apache-2.0) with English and Japanese
   language data that ship inside the app. The photo never leaves the device and nothing is downloaded. */
let kdWorker = null, kdWorkerP = null, kdIdle = 0, kdScript = null;
const kdRoot = () => new URL('vendor/tesseract/', location.href).href;
const kdLoadScript = () => kdScript || (kdScript = new Promise((res, rej) => {
  if (window.Tesseract) return res();
  const s = document.createElement('script'); s.src = kdRoot() + 'tesseract.min.js'; s.onload = () => res(); s.onerror = () => { kdScript = null; rej(new Error('The reader could not be loaded.')); };
  document.head.append(s);
}));
async function kdEngine(onStatus) {
  clearTimeout(kdIdle);
  if (!kdWorkerP) kdWorkerP = (async () => {
    await kdLoadScript(); onStatus && onStatus('Starting the reader...');
    const root = kdRoot();
    return Tesseract.createWorker(['eng', 'jpn'], 1, { workerPath: root + 'worker.min.js', corePath: root + 'core', langPath: root + 'lang', gzip: false, workerBlobURL: false, cacheMethod: 'none',
      logger: m => { if (onStatus && m && m.status === 'recognizing text') onStatus(`Reading the card... ${Math.round((m.progress || 0) * 100)}%`); } });
  })().catch(e => { kdWorkerP = null; throw e; });
  kdWorker = await kdWorkerP;
  return kdWorker;
}
// let the engine go after a while so it is not holding memory
const kdRelease = () => { clearTimeout(kdIdle); kdIdle = setTimeout(async () => { const p = kdWorkerP; kdWorkerP = null; kdWorker = null; try { (await p).terminate(); } catch { /* already gone */ } }, 90000); };

// the photo, a bit sharper and no bigger than the reader needs
function kdPrepare(file, max = 1800) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.filter = 'grayscale(1) contrast(1.35)'; g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That does not look like a picture.')); };
    img.src = url;
  });
}
// the text on the card. A second, looser pass runs when the key numbers were not found the first time.
async function kdReadCard(file, nat, onStatus) {
  const w = await kdEngine(onStatus), canvas = await kdPrepare(file);
  try {
    await w.setParameters({ tessedit_pageseg_mode: '3' });
    let text = (await w.recognize(canvas)).data.text, r = CardCore.parse(text, nat);
    if (!r.fields.hp || !r.fields.dex) { onStatus && onStatus('Looking a bit closer...'); await w.setParameters({ tessedit_pageseg_mode: '11' }); text += '\n' + (await w.recognize(canvas)).data.text; r = CardCore.parse(text, nat); }
    return r;
  } finally { kdRelease(); }
}

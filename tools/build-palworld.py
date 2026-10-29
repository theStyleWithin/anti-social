#!/usr/bin/env python3
"""Builds www/palworld/ from a "Palworld Full Paldeck" PDF (names, Paldeck numbers, rarity and 128 px icons).
Usage: python3 tools/build-palworld.py /path/to/Palworld_Full_Paldeck.pdf
Needs pdftotext and pdfimages (poppler) and Pillow."""
import json, os, re, subprocess, sys, tempfile
from PIL import Image

pdf = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'www', 'palworld')
os.makedirs(os.path.join(out, 'img'), exist_ok=True)
text = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True, check=True).stdout
lines = [l.replace('\f', '').strip() for l in text.split('\n')]
lines = [l for l in lines if l and 'Palworld Full Paldeck' not in l and not l.startswith('All ') and not l.startswith('Source:') and not l.startswith('Images and data')]
split = lambda l: re.split(r'\s{2,}', l)
is_num = lambda l: all(re.fullmatch(r'#(\d+[A-Z]?|—)', t) for t in split(l))
pals = []
for i, l in enumerate(lines):
    if is_num(l):
        names, nums, rar = split(lines[i - 1]), split(l), split(lines[i + 1])
        if not (len(names) == len(nums) == len(rar)):
            raise SystemExit('cells do not line up near: ' + lines[i - 1])
        pals += list(zip(names, nums, rar))
tmp = tempfile.mkdtemp()
subprocess.run(['pdfimages', '-png', '-p', pdf, os.path.join(tmp, 'im')], check=True)
files = sorted(f for f in os.listdir(tmp) if f.endswith('.png'))
# each icon is an RGB image followed by its soft mask: (page, num) order from pdfimages -list
lst = subprocess.run(['pdfimages', '-list', pdf], capture_output=True, text=True, check=True).stdout.split('\n')[2:]
rows = [l.split() for l in lst if l.strip()]
assert len(rows) == len(files), (len(rows), len(files))
imgs, masks = [], []
for r, f in zip(rows, files):
    (masks if r[2] == 'smask' else imgs).append(os.path.join(tmp, f))
assert len(imgs) == len(masks) == len(pals), (len(imgs), len(masks), len(pals))
import shutil; shutil.rmtree(os.path.join(out, 'img'), ignore_errors=True); os.makedirs(os.path.join(out, 'img'))
# the last few cards in the list are placeholders (name "Unknown", no number, empty picture): leave them out
keep = [i for i, p in enumerate(pals) if p[0] != 'Unknown']
imgs, masks, pals = [imgs[i] for i in keep], [masks[i] for i in keep], [pals[i] for i in keep]
for i, (a, m) in enumerate(zip(imgs, masks), 1):
    im = Image.open(a).convert('RGB'); alpha = Image.open(m).convert('L').resize(im.size)
    im.putalpha(alpha); im.save(os.path.join(out, 'img', '%03d.webp' % i), 'WEBP', quality=88, method=6)
data = [[n, num.lstrip('#'), r] for n, num, r in pals]
with open(os.path.join(out, 'data.js'), 'w', encoding='utf-8') as f:
    f.write('/* Palworld Paldeck: names, numbers, rarity (from a Paldeck PDF made from palworld.gg). Built by tools/build-palworld.py. */\nwindow.PalDex = ')
    json.dump({'pals': data}, f, ensure_ascii=False, separators=(',', ':')); f.write(';\n')
print(len(pals), 'pals;', sum(os.path.getsize(os.path.join(out, 'img', x)) for x in os.listdir(os.path.join(out, 'img'))) // 1024, 'KB of icons')

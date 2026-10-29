#!/usr/bin/env python3
"""Builds www/nexomon/data.js from a Markdown table of the Nexomon list (number, name, type, rarity).
Usage: python3 tools/build-nexomon.py /path/to/nexomon_database.md"""
import json, os, re, sys

rows = []
for line in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'^\|\s*(\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$', line)
    if m:
        rows.append((int(m.group(1)), m.group(2), m.group(3), m.group(4).replace(' / ', '/')))
nums = [r[0] for r in rows]
if nums != list(range(1, len(rows) + 1)):
    raise SystemExit('numbers are not 1..N in order')
types = sorted({r[2] for r in rows}); rar = []
for r in rows:
    if r[3] not in rar: rar.append(r[3])
out = os.path.join(os.path.dirname(__file__), '..', 'www', 'nexomon')
os.makedirs(out, exist_ok=True)
data = {'types': types, 'rarities': rar, 'mons': [[r[1], r[2], r[3]] for r in rows]}
with open(os.path.join(out, 'data.js'), 'w', encoding='utf-8') as f:
    f.write('/* Nexomon (the original game): names, types and rarity, from a list made from nexomon.fandom.com. Built by tools/build-nexomon.py. */\nwindow.NexoDex = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(rows), 'Nexomon;', types, rar)

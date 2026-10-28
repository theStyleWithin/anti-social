#!/usr/bin/env python3
"""Builds www/pokebank/data.js from a checkout of https://github.com/Insektaure/pkHouse (GPL-2.0).
Usage: python3 tools/build-pkmdata.py /path/to/pkhouse
Names (moves, abilities, items, met locations) and the tables needed to read decrypted Pokemon files."""
import json, os, re, sys

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'www', 'pokebank')
os.makedirs(out, exist_ok=True)
read = lambda p: open(os.path.join(src, p), encoding='utf-8').read()
lines = lambda p: [l.rstrip('\r') for l in read(p).split('\n')][:-1 if read(p).endswith('\n') else None]

def table(text, name):
    m = re.search(r'\b' + re.escape(name) + r'\s*(?:\[[^\]]*\])+\s*=\s*\{(.*?)\n\};', text, re.S)
    if not m:
        raise SystemExit('table not found: ' + name)
    body = re.sub(r'//[^\n]*', '', m.group(1))
    return [int(x, 0) for x in re.findall(r'-?0x[0-9A-Fa-f]+|-?\d+', body)]

pk = read('source/pokemon.cpp'); sc = read('source/species_converter.cpp')
data = {
    'exp': table(pk, 'EXP_TABLE'), 'laGrowth': table(pk, 'LA_GROWTH_RATES'), 'frlgGrowth': table(pk, 'FRLG_GROWTH_RATES'), 'frlgGender': table(pk, 'FRLG_GENDER_RATIOS'),
    'g3en': table(pk, 'G3_EN'), 'g3jp': table(pk, 'G3_JP'), 'sv9': table(sc, 'TABLE_9_INTERNAL_TO_NATIONAL'), 'g3int': table(sc, 'TABLE_3_INTERNAL_TO_NATIONAL'),
    'moves': lines('romfs/data/moves_en.txt'), 'abilities': lines('romfs/data/abilities_en.txt'), 'items': lines('romfs/data/items_en.txt'),
}
assert len(data['exp']) == 600 and len(data['laGrowth']) == 1276 and len(data['frlgGrowth']) == 387 and len(data['frlgGender']) == 387 and len(data['g3en']) == 256 and len(data['g3jp']) == 256, {k: len(v) for k, v in data.items()}
fam = {'bdsp': 'BDSP', 'frlg': 'FireRedLeafGreen', 'la': 'LegendsArceus', 'za': 'LegendsZA', 'lgpe': 'LetsGo', 'sv': 'ScarletViolet', 'swsh': 'SwordShield'}
loc = {}
for k, f in fam.items():
    d = {}
    for l in lines('romfs/data/locations_%s_en.txt' % f):
        if '\t' in l:
            i, name = l.split('\t', 1)
            if i.isdigit(): d[int(i)] = name
    loc[k] = d
data['locations'] = loc
with open(os.path.join(out, 'data.js'), 'w', encoding='utf-8') as f:
    f.write('/* Names and tables for reading Pokemon files, from pkHouse (https://github.com/Insektaure/pkHouse, GPL-2.0). Built by tools/build-pkmdata.py. */\nwindow.PkData = ')
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print({k: (len(v) if hasattr(v, '__len__') else v) for k, v in data.items()}, os.path.getsize(os.path.join(out, 'data.js')))

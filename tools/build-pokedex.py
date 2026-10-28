#!/usr/bin/env python3
"""Builds www/pokedex/ from a checkout of https://github.com/Insektaure/pkDex (GPL-2.0).
Usage: python3 tools/build-pokedex.py /path/to/pkdex
Copies the sprites and condenses the regional data (and the national list) into one script file."""
import json, os, shutil, sys

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'www', 'pokedex')
data = os.path.join(src, 'resources', 'data')
i18n = json.load(open(os.path.join(src, 'resources', 'i18n', 'en-US', 'pkdex.json')))['regions']
order = [  # id, child (a sub-list of another), alpha forms exist, dlc
    ('kanto', 0, 0, 0), ('kanto_frlg', 1, 0, 0), ('sinnoh', 0, 0, 0), ('sinnoh_arceus', 1, 1, 0), ('galar', 0, 0, 0), ('isle_armor', 1, 0, 1), ('crown_tundra', 1, 0, 1),
    ('paldea', 0, 0, 0), ('kitakami', 1, 0, 1), ('blueberry_academy', 1, 0, 1), ('kalos_lza', 0, 1, 0), ('hyperspace_lumiose', 1, 1, 1)]
names = {}
for line in open(os.path.join(src, 'tools', 'pokemon_names_en_de.csv'), encoding='utf-8').read().splitlines():
    pass
nat_names = [l.rsplit(':', 1)[0] if l.count(':') > 1 else l.split(':')[0] for l in open(os.path.join(src, 'tools', 'pokemon_names_en_de.csv'), encoding='utf-8').read().splitlines()]
# species that none of the games' regional lists above include (typing only; no game notes)
EXTRA = {165: 'Bug / Flying', 166: 'Bug / Flying', 243: 'Electric', 244: 'Fire', 245: 'Water', 249: 'Psychic / Flying', 250: 'Fire / Flying', 251: 'Psychic / Grass', 276: 'Normal / Flying', 277: 'Normal / Flying',
         300: 'Normal', 301: 'Normal', 327: 'Normal', 351: 'Normal', 366: 'Water', 367: 'Water', 368: 'Water', 385: 'Steel / Psychic', 386: 'Psychic', 494: 'Psychic / Fire', 643: 'Dragon / Fire',
         644: 'Dragon / Electric', 646: 'Dragon / Ice', 785: 'Electric / Fairy', 786: 'Psychic / Fairy', 787: 'Grass / Fairy', 788: 'Water / Fairy', 789: 'Psychic', 790: 'Psychic', 791: 'Psychic / Steel',
         792: 'Psychic / Ghost', 793: 'Rock / Poison', 794: 'Bug / Fighting', 795: 'Bug / Fighting', 796: 'Electric', 797: 'Steel / Flying', 798: 'Grass / Steel', 799: 'Dark / Dragon', 800: 'Psychic',
         803: 'Poison', 804: 'Poison / Dragon', 805: 'Rock / Steel', 806: 'Fire / Ghost'}
national = {}
dex = {}
for rid, child, alpha, dlc in order:
    d = json.load(open(os.path.join(data, rid + '.json')))
    rows = []
    for p in d['pokemon']:
        n = int(p['id'])
        national[n] = [p['name'], p['type']]
        rows.append([n, p.get('regionalDexNumber', ''), 1 if p.get('shinyLocked') else 0, p.get('evolution', ''), p.get('locations', ''), p.get('exclusiveVersion', '-')])
    dex[rid] = rows
for n in range(1, 1026):
    if n not in national:
        national[n] = [nat_names[n - 1], EXTRA.get(n, '')]
regions = [{'id': rid, 'name': i18n[rid]['name'], 'game': i18n[rid]['game'], 'side': i18n[rid]['sidebar'], 'tag': i18n[rid]['tag'], 'child': child, 'alpha': alpha, 'dlc': dlc} for rid, child, alpha, dlc in order]
os.makedirs(out, exist_ok=True)
body = {'regions': regions, 'national': [national[n] for n in range(1, 1026)], 'dex': dex}
with open(os.path.join(out, 'data.js'), 'w', encoding='utf-8') as f:
    f.write('/* Pokedex data from pkDex (https://github.com/Insektaure/pkDex, GPL-2.0). Built by tools/build-pokedex.py. */\nwindow.PokeDex = ')
    json.dump(body, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
for sub in ('full', 'icons', 'shiny'):
    dst = os.path.join(out, 'img', sub)
    shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(os.path.join(src, 'resources', 'img', 'pokemon', sub), dst)
st = os.path.join(out, 'img', 'states'); shutil.rmtree(st, ignore_errors=True)
shutil.copytree(os.path.join(src, 'resources', 'img', 'states'), st)
print('species:', len(national), 'regions:', len(regions), 'data.js bytes:', os.path.getsize(os.path.join(out, 'data.js')))

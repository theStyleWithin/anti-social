# Notices

Anti-Social is created by Gamehopper, Copyright (C) 2026 Gamehopper, and from version 0.17.0 is licensed under the
**GNU General Public License, version 2** (see `LICENSE`).

It switched from 0BSD to GPL-2.0 because it now includes data, pictures and code ideas from two GPL-2.0 projects.
Releases up to 0.16.0 contain none of that material and stay available under 0BSD.

## Included from other projects

- **pkDex** by Insektaure, GPL-2.0, https://github.com/Insektaure/pkDex: the Pokédex data (regions, types, evolutions,
  locations, exclusive versions) and the Pokémon pictures in `www/pokedex/`, built by `tools/build-pokedex.py`.
- **pkHouse** by Insektaure, GPL-2.0, https://github.com/Insektaure/pkHouse: the idea and layout of the Pokémon Bank, the
  names and tables used to read Pokémon files in `www/pokebank/data.js` (built by `tools/build-pkmdata.py`), and the
  file layouts ported to `www/pkmparse.js`. pkHouse in turn ports its layouts from PKHeX (GPL-3.0).
- **llama.cpp** (MIT) and **node-llama-cpp** (MIT): the AI engine for AI members.
- **Electron** (MIT) and **Capacitor** (MIT): the desktop and Android shells.

- **Palworld Paldeck** (names, Paldeck numbers, rarity and icons in `www/palworld/`): taken from a "Palworld Full Paldeck" list that was made from palworld.gg and marked "for personal reference use", built by `tools/build-palworld.py`. It is not GPL material and is not covered by this project's licence.
- **Nexomon (beta library in the Pokédex)** (names, numbers, types and rarity in `www/nexomon/`): taken from a list of the original Nexomon game made from the Nexomon database on nexomon.fandom.com. No artwork is included. Nexomon and its monsters belong to VEWO Interactive. This app is not affiliated with or endorsed by them.

- **Card Binder's card reader** (`www/vendor/tesseract/`): Tesseract.js and Tesseract.js-Core (Apache-2.0, https://github.com/naptha/tesseract.js), which run the Tesseract OCR engine (Apache-2.0, https://github.com/tesseract-ocr/tesseract) in WebAssembly, and the English and Japanese "fast" language data from tessdata_fast (Apache-2.0, https://github.com/tesseract-ocr/tessdata_fast). The licence texts are in that folder. Photos are read on your device and are never uploaded.

## Trademarks

Pokémon and its names, characters, artwork and trademarks belong to Nintendo, Creatures, GAME FREAK and The Pokémon
Company. Anti-Social is not affiliated with or endorsed by them. The Pokédex and Pokémon Bank do not read or change any
game's save data.

## GNU Unifont (console builds)
The Switch, Wii U and 3DS builds draw text with glyphs from GNU Unifont, which is licensed under the GNU GPL version 2 or later with the font embedding exception (and the SIL OFL 1.1). See https://unifoundry.com/unifont/.

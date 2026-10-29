# Anti-Social on game consoles

Native builds (not a web app) for the Nintendo Switch, Wii U and 3DS. They have the same idea as the main app, a social network with nobody on it, but are
a smaller set of apps: Timeline, Notes, Calculator, Clock (with stopwatch and timer), Matrix and About. Everything is kept on the SD card.

| Console | Files | Screens | Data folder on the SD card |
|---|---|---|---|
| Switch | `.nro` | one screen, 640x360 drawn, doubled to 1280x720 | `switch/anti-social/` |
| Wii U | `.rpx`, `.wuhb` | TV 640x360 (content) + GamePad 427x240 (touch controls) | `wiiu/anti-social/` |
| 3DS | `.3dsx`, `.cia` | top 400x240 (content) + bottom 320x240 (touch controls) | `3ds/anti-social/` |

The layouts are made for each console. On the Switch everything is on one screen, with big touch buttons. On the Wii U and 3DS the top or TV screen shows what you
are reading and the touch screen carries the keyboard, keypad, app tiles and buttons.

## How it is built

* `common/` is the whole app in C++11. It draws into plain pixel buffers (`gfx.cpp`), so it needs no console libraries. Every screen can draw a main picture
  and, with `drawSub`, a second picture for the touch screen.
* `switch/`, `wiiu/`, `3ds/` are the thin platform layers: open the screens, read buttons and touch, copy the pixels out, and a Makefile for the packaging.
* `host/` is a test build for a normal computer. `make -C consoles/host test` runs the calculator check, and
  `antisocial-host 3ds <datadir> <outdir> "A,DOWN,wait:1,tap:sub:60:100,shot:name"` plays a button script and saves the screens as PPM files.
* `tools/build-console-font.py` makes `common/font.h` (GNU Unifont, 8x16).

## Making a release

The GitHub workflow `consoles.yml` builds all of it in the devkitPro containers (Switch: devkita64 + libnx, Wii U: devkitppc + wut, 3DS: devkitarm + libctru).
`build.yml` runs it and adds the files to the release, named `Anti-Social-<version>-switch.nro`, `-wiiu.rpx`, `-wiiu.wuhb`, `-3ds.3dsx` and `-3ds.cia`.
If a console build fails, the Windows, Linux and Android release still goes out. To test only the consoles, push to the `consoles` branch or run
"Build consoles" by hand in the Actions tab.

The package formats follow the Homebrew App Store and Nimbus builds, which are the same kinds of files:

* Switch: `.nro` made with `elf2nro` from the program, an icon (256x256 jpg) and a `.nacp` (name, author, version).
* Wii U: `.rpx` made with `elf2rpl`, and a `.wuhb` bundle made with `wuhbtool` (name, author, icon, TV and GamePad splash images) for the Aroma menu.
* 3DS: `.3dsx` made with `smdhtool` + `3dsxtool`, and a `.cia` made with `bannertool` and `makerom` (banner, icon, `app.rsf`), installed with FBI.

To port to another console, add a folder with a platform layer and a Makefile, then a job in `consoles.yml` and a line in the release step of `build.yml`.

## Installing

* Switch: copy `anti-social.nro` into `switch/` on the SD card and start it from the Homebrew Menu.
* Wii U: copy the `.wuhb` into `wiiu/apps/` (Aroma) or run the `.rpx` from the Homebrew Launcher.
* 3DS: copy the `.3dsx` into `3ds/` for the Homebrew Launcher, or install the `.cia` with FBI.

These need a console that runs homebrew. Nothing here has been tested on real hardware yet: the layouts were checked with the computer test build and the programs
compile in CI, so expect rough edges and please report them.

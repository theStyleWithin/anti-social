# Anti-Social

**Social media with nobody on it.**

> get offline

Sign up. Post your hottest takes. Post your nudes. Post your 3 a.m. thoughts about
whether a hot dog is a sandwich.

**No one will ever see any of it.** There is no server. There is no one.
Your account lives on your device, your posts live on your device, and your audience
is a flat, unblinking **0**.

## Features

- Create an account (no email, because who would we send it to)
- Post text and up to 4 images
- Like, repost and reply to your own posts
- A profile with **0 followers** and **0 views** on everything
- A notifications tab that is, and always will be, empty
- A search-for-people page that never finds anyone
- Light, dark or auto theme
- Export everything as JSON, or nuke it all
- Installable on phone, tablet and desktop. Works offline. Obviously.

## Always offline

Anti-Social never touches the internet. The page ships with a rule that blocks
every network request (`connect-src 'none'`), so it *can't* phone home even if it wanted to.
You can download this folder and double-click `index.html` with Wi-Fi off. It works.

## Get the apps

| Platform | File |
|---|---|
| Windows | `Anti-Social-*-win-x64.exe` (installer) or the portable `.exe` |
| Linux | `.AppImage` (any distro) or `.deb` (Debian/Ubuntu) |
| Android | `.apk` (sideload: allow "install unknown apps") |

The Android app has no internet permission at all. It could not go online if it tried.

## Build it yourself

The web app lives in `www/` (plain HTML/CSS/JS, no dependencies). Open `www/index.html` in a
browser and it works.

```sh
# desktop (Windows / Linux)
cd desktop && npm install && npm start        # run
cd desktop && npm run dist                    # build installers into desktop/dist

# android (needs JDK 17 + Android SDK)
cd mobile && npm install && npx cap sync android
cd android && ./gradlew assembleDebug
```

Or let GitHub build everything: run the **Build apps** workflow (Actions tab) and it publishes a
release with every installer attached.

## Future

A hosted web version. Currently skipped because hosting costs money and nobody is here anyway.

## Privacy policy

There is nothing to leak. Data lives in your browser's IndexedDB. Clearing site data
deletes everything, and there is no recovery, because there is no one to recover it.

## Terms of Use

**TOUCH GRASS.**

(Seriously, get offline.)

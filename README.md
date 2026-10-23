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
- **Encrypted vault (optional):** set a passcode and every post, image and your whole profile is locked (AES-256). Reopen the app, enter the passcode, and it is all there. Skip the passcode and the app just opens
- **Duress PIN** (needs the vault): a second PIN that looks like a normal unlock but silently erases everything
- Avatar and banner images
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
| Windows | `Anti-Social-Setup-*.exe` (installer) or `Anti-Social-*-portable.exe` (no install) |
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

## Privacy

There is nothing to leak: no server, no accounts anywhere but your device, no network access.

**The vault (optional).** Leave the passcode blank when you sign up and nothing is encrypted; you can add or remove it any time in Settings. If you do set one, your passcode is stretched with PBKDF2 (600,000 rounds) into an AES-256-GCM key that lives only in memory.
Posts, images and the profile are stored as ciphertext; only the handle is readable. The passcode and key are never
saved. The app locks when you leave it (you choose how soon). **There is no recovery.** Forget the passcode and the
posts are gone for everyone, including the developer. Old accounts from v0.1.0 can be upgraded in Settings, Privacy & Security.

**The duress PIN.** Set one in Settings. Typing it at the unlock screen looks like any failed attempt but erases every
account and post on the device, including the vault salt, so leftover scraps can't be unlocked either. No confirmation, no
undo. It does not touch exports or backups you made elsewhere. Test it with throwaway data first.

*Know the law where you live.* You generally have the right to decline a search and to ask for a warrant and a lawyer.
Destroying data you are legally required to keep (a court order, a preservation demand, an active investigation) can
be a crime, and so can lying to officers about what a PIN does. This is a privacy tool, not legal advice.

**Honest limits.** Encryption protects data at rest. It can't protect you if someone watches you type the passcode, if
malware is on the device, or if you pick a weak passcode. Exported JSON files are not encrypted. Deleted data can linger
as unreadable ciphertext in disk blocks until the system reuses them.

## Terms of Use

**TOUCH GRASS.**

(Seriously, get offline.)

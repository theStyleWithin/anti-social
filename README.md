# Anti-Social

**Social media with nobody on it.**

> get offline

## Status: full featured and complete

Anti-Social v0.5.0 is feature complete. It is a finished app, not a work in progress.

**Tested by the developer** (Android and Linux by hand through v0.4.0; Characters, new in v0.5.0, is covered by automated tests and a run of the Linux desktop app):
- **Android:** installed and used on a real phone, including account switching, Populated mode and the storage limit.
- **Features:** sign-up with and without a passcode, posting with images, likes, reposts and replies, avatar and banner images, the empty notifications tab, the Explore page that never finds anyone, themes, export and delete.
- **Vault and duress PIN:** checked end to end. Data on disk is unreadable, it comes back after you unlock, a wrong passcode is rejected, and the duress PIN erases everything.
- **Linux desktop:** installed and used on a real Linux desktop, including account switching, Populated mode and the storage limit.
- **Windows desktop:** built and packaged, but **not tested on a real Windows machine**, because the developer runs Linux. **Windows testers wanted:** please try the installer or portable `.exe` and report what you find by opening an issue on this repo. Windows may show a "protected your PC" warning because the app isn't signed with a paid certificate: choose More info, then Run anyway.

The v0.4.0 Android APK was scanned on VirusTotal with 0 detections. Check the SHA-256 on the release page against any file you download.

Sign up. Post your hottest takes. Post your nudes. Post your 3 a.m. thoughts about
whether a hot dog is a sandwich.

**No one will ever see any of it.** There is no server. There is no one.
Your account lives on your device, your posts live on your device, and your audience
is a flat, unblinking **0**.

## Features

- Create an account (no email, because who would we send it to)
- Post text and up to 4 images
- Like, repost and reply to your own posts, and to anyone in Populated mode. Nobody ever answers
- A profile with **0 followers** and **0 views** on everything, and avatar and banner images you can click to change
- A notifications tab that is, and always will be, empty
- A search-for-people page that never finds anyone (unless you turn on Populated mode, and even then they can't find you)
- **Manage your posting limit:** Settings, General, Storage has a meter of how much space Anti-Social is using and a limit you choose in MB or GB (say 30 GB). When you reach it, new posts pause until you free up room or raise the limit
- **Encrypted vault (optional):** set a passcode and every post, image and your whole profile is locked (AES-256). Reopen the app, enter the passcode, and it is all there. Skip the passcode and the app just opens. Add or remove it any time in Settings, Privacy & Security
- **Auto-lock** when you leave the app, with a delay you choose
- **Duress PIN** (needs the vault): a second PIN that looks like a normal unlock but silently erases everything
- **Populated mode (optional):** a procedurally generated crowd fills Home, Explore and the side column, in the spirit of No Man's Sky. One seed makes the whole world, nothing is saved for it, and nobody in it can ever reply, like, follow or message you. Every generated profile carries a "Procedurally generated" tag above its banner. Share a seed and a friend sees the same crowd
- **Characters:** Settings, Characters lets you shape the population. Add people of your own (name, handle, bio, avatar, banner, follower numbers, how often they post, how they sound, or write their posts yourself), and edit anyone in the generated crowd with **Edit this person**: their look changes everywhere at once, and a new posting style applies to what they post from then on. Show your cast alongside the crowd or on its own. Custom characters are tagged "Custom character · made by you", edited strangers "Procedurally generated · edited by you", and none of them can ever respond to anything
- **Multiple accounts:** click your account at the bottom left on desktop, or your avatar at the top left on a phone, to switch or add one, with a joke about it
- Light, dark or auto theme
- Export your data as JSON, or delete it all
- Native apps for Windows, Linux and Android. Works offline. Obviously.

## Version history

- **v0.5.0:** Characters: edit anyone in the population, add people of your own, a searchable Population list, eight posting styles
- **v0.4.0:** Populated mode, and a posting limit you control with a storage meter
- **v0.3.x:** account switching on desktop and phone, with jokes
- **v0.2.x:** the encrypted vault (optional passcode), duress PIN, auto-lock, Privacy & Security settings
- **v0.1.0:** the first release. Post to nobody

## Always offline

Anti-Social never touches the internet. The page ships with a rule that blocks
every network request (`connect-src 'none'`), so it *can't* phone home even if it wanted to.
You can download this folder and double-click `index.html` with Wi-Fi off. It works. The Android app has no internet permission at all, and the desktop apps only hand a link to your own browser if you click one.

## Get the apps

| Platform | File |
|---|---|
| Windows | `Anti-Social-Setup-*.exe` (installer) or `Anti-Social-*-portable.exe` (no install) |
| Linux | `.AppImage` (any distro) or `.deb` (Debian/Ubuntu) |
| Android | `.apk` (sideload: allow "install unknown apps") |

Grab them from the Releases page of this repo. Check the SHA-256 shown there against your download.

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

**Populated mode.** The crowd is calculated on screen from a short seed code (same seed, same people) and is never written to disk, so it uses no storage. Generated accounts are scenery: they have no way to respond to anything. You can reply to, like and follow them, and nothing ever comes back. Your own replies, likes and follows are saved like any post, so with a passcode they are encrypted too, including which stranger you reacted to.

**Characters.** Your characters and your edits to generated people are saved like your posts, so with a passcode they are encrypted too: names, bios, pictures and the fact that they exist. Characters are private to the account that made them. Images you add count toward your storage limit. Characters cannot be shared or exported to anyone but yourself, and they never carry the "procedurally generated" label, so a custom character can never pass as a generated stranger or a real person.

**Storage and your posting limit.** Settings, General, Storage shows how much space Anti-Social is using and lets you set your own limit in MB or GB. New posts pause when you reach it, or sooner if your device is nearly full, and you can raise it or delete posts to carry on. Pictures are shrunk before saving and anything over 40 MB is refused. The meter is approximate. Data stays in each app's own private storage on the device; choosing a different drive is not supported.

**Honest limits.** Encryption protects data at rest. It can't protect you if someone watches you type the passcode, if
malware is on the device, or if you pick a weak passcode. Exported JSON files are not encrypted. Deleted data can linger
as unreadable ciphertext in disk blocks until the system reuses them.

## Terms of Use

**TOUCH GRASS.**

(Seriously, get offline.)

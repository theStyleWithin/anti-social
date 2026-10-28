# Anti-Social

**Social media with nobody on it.**

> get offline

## Status: fully featured and complete

Anti-Social v0.16.0 is feature complete. It is a finished app, not a work in progress.

**Tested by the developer** (Android and Linux by hand through v0.7.0, including all the Apps (drag-to-reorder, themes, the Bible, Travel Log, Cookbook and the v0.12.0 account features are automated-test verified, awaiting a hand test; the Android file saver in v0.12.0 is new native code and has not yet been run on a real phone); plus automated tests):
- **Android:** installed and used on a real phone, including account switching, Populated mode, Characters, the storage limit and the Apps.
- **Features:** sign-up with and without a passcode, posting with images, likes, reposts and replies, avatar and banner images, the empty notifications tab, the Explore page that never finds anyone, themes, export and delete.
- **Vault and duress PIN:** checked end to end. Data on disk is unreadable, it comes back after you unlock, a wrong passcode is rejected, and the duress PIN erases everything.
- **Linux desktop:** installed and used on a real Linux desktop, including account switching, Populated mode, Characters, the storage limit and the Apps.
- **Windows desktop:** built and packaged, but **not tested on a real Windows machine**, because the developer runs Linux. **Windows testers wanted:** please try the installer or portable `.exe` and report what you find by opening an issue on this repo. Windows may show a "protected your PC" warning because the app isn't signed with a paid certificate: choose More info, then Run anyway.

The v0.7.0 Android APK was scanned on VirusTotal with 0 detections. Check the SHA-256 on the release page against any file you download.

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
- **Apps (offline, between Home and Explore):** be anti-social productively. Eight small tools that never touch the network:
  - **Calendar:** month view, events with times, colors and weekly/monthly/yearly repeats, and dots for days you wrote in the diary
  - **Calculator:** plain and scientific, typed or tapped, with history. A real parser, no `eval`, so it can't run code. `50 + 10%` is 55
  - **Banking:** a notebook, not a bank. Accounts, receipts (with photos), monthly in/out and category bars, CSV export, plus tip and split, tax and discount, percent change, loan payment, savings growth and a manual currency converter. Money is stored in whole cents, so it never drifts
  - **Household:** a home inventory. Log what you own, where it lives, what it cost, serial numbers and warranties, and add up to six photos per item (or take one with your phone camera). Totals by room and category, an estimate of what it is worth now, warranty reminders, a gallery grouped by room, a swipeable photo viewer and an insurance-friendly CSV
  - **Groceries:** type "2 lb apples" or paste "milk, eggs, bread" and each item is quantity-parsed and filed under its aisle. Tap to put it in the cart, copy the list as text, keep several lists (Costco, pharmacy...), and re-add past items with one tap. Optional prices give an estimated total
  - **Chores:** Today, Upcoming, All and History tabs. Chores repeat on a schedule (daily, weekly, every N days, monthly on the same date...), either from the due date or from when you finish. Assign them to people, mark done, push to tomorrow, skip, undo, and see who has done what this month. No nagging: there are no reminders or notifications, just the lists
  - **Notes:** pin, search, autosave. **No length limit** on the text
  - **Diary:** one page a day with a mood, a gentle prompt, a streak, search and no length limit
- **Multiple accounts:** click your account at the bottom left on desktop, or your avatar at the top left on a phone, to switch or add one, with a joke about it
- Light, dark or auto theme
- Export your data as JSON, or delete it all
- Native apps for Windows, Linux and Android. Works offline. Obviously.

## Version history

- **v0.16.0:** the Android app can now run AI members on the phone itself: pick a small `.gguf` model file (1 to 3 billion parameters works best) in Settings, AI members; llama.cpp runs it on the processor, with no network. Away chat on a phone runs while the app is open and can fill in what you missed when you return. Also: the README now explains antivirus false alarms, and Android no longer includes app data in automatic cloud backups (so an API key is never copied there)
- **v0.15.0:** AI members in Chat Rooms. Make characters (picture, banner, bio, personality, greeting) that live on your private server. They answer only when you write `@Name` spelled exactly, and always in their own private chat; you choose which channels each may speak in. Modes per channel: one at a time, taking turns, or away chat where they talk to each other while you are gone (with pace, an hourly cap, charging and battery guards). Character cards export and import (JSON, or a PNG with the card inside, compatible with other chat tools). Desktop apps run model files (.gguf) you download yourself, fully on your computer (llama.cpp, in its own process with no network access). Optional: use TokenReply instead (see below)
- **v0.14.1:** in Chat Rooms the server now has its own name, separate from your account. It starts as "<you>'s Server"; right-click the name (or the server icon) to rename it, or use Rename server in its menu. Clear the name to go back to the default
- **v0.14.0:** a second template, Classic Blue: a blue bar on top with a search box, a shortcuts column on the left (your apps are listed there too), a News Feed with an Update Status box, Like / Comment / Share links, a Timeline profile with a cover photo, and People You May Know on the right. Wording changes with it (Explore becomes Find Friends, Follow becomes Add Friend, Likes become Unlike when you press them) and times read the old way ("about an hour ago", "Yesterday at 3:04pm"). It has a light and a dark version and works with color themes
- **v0.13.0:** Templates (Settings, above Color themes). Chat Rooms makes the app look like a chat server: a server rail, channels you can create, a chat column where posts become messages (oldest first, Enter to send), and a member list. In Populated mode the generated people become server members, and they only ever talk in #general, however many channels you add; your own channels hold only your messages. Wording changes too (Explore becomes Discover, Notifications becomes Inbox, Like becomes React). It is appearance only, your data does not change, and it combines with color themes
- **v0.12.0:** accounts get more ways in and out. Import an account from a file on the create-account screen; Eject account (Settings, next to Export) saves everything to a file and takes the account off the device, and it comes back whenever you import the file; Continue as guest skips the handle and passcode (claim it as a real account later in Settings); and with two or more accounts you can hide one, then unhide it from the Hidden accounts list in Settings. On Android, exports now really save into Downloads (the old download link did nothing in the Android app), and so do the CSV and theme exports
- **v0.11.0:** a Cookbook app with 69 starter recipes, American favorites first and then dishes from Italy, Mexico, India, Thailand, China, Japan, Korea, Greece, France, Spain, West Africa, the UK and more. Search by dish or ingredient, scale the servings, tick ingredients and steps off as you cook, add the ingredients to your Groceries list, mark favorites, and write your own recipes (encrypted with your passcode). Rename it like any other app
- **v0.10.0:** a Travel Log app with a built-in offline world map: tap the map or search a city to log a place, add dates, notes of any length and your own photos, see countries light up, and browse your places and countries. You can rename it ("Captain's Log", say) like any other app
- **v0.9.1:** the Bible app no longer ships any Bible text. You bring your own file, so it is exactly the edition you (or your congregation) trust. It reads right-to-left Hebrew files too, and skips chapters that have no text
- **v0.9.0:** a Bible app (hidden until you turn it on in Settings): the whole Tanakh in Hebrew and the public-domain 1917 JPS English, side by side or one at a time, with search, highlights and notes; or import your own Bible file (USFM, OSIS, JSON, plain text). You can now show or hide any app and rename any of them (call Diary "Captain's Log" if you like)
- **v0.8.0:** color themes (ten presets plus your own two-color custom theme, shareable as a tiny file) and your own picture as the app background, saved on your device and encrypted with your passcode; text is always kept readable
- **v0.7.1:** drag the Apps around however you like (mouse drag, or touch and hold on a phone), or use Reorder mode with arrow buttons for keyboard and precision; per-account, with a Reset order button
- **v0.7.0:** Apps gets Groceries (aisles, several lists, quick re-add) and Chores (repeating schedules, assignees, history, undo)
- **v0.6.0:** Apps: Calendar, Calculator, Banking, Household (with photos and a gallery), Notes and Diary, all offline
- **v0.5.0:** Characters: edit anyone in the population, add people of your own, a searchable Population list, eight posting styles
- **v0.4.0:** Populated mode, and a posting limit you control with a storage meter
- **v0.3.x:** account switching on desktop and phone, with jokes
- **v0.2.x:** the encrypted vault (optional passcode), duress PIN, auto-lock, Privacy & Security settings
- **v0.1.0:** the first release. Post to nobody

## Always offline (unless you choose otherwise)

Anti-Social does not touch the internet. The page ships with a rule that blocks
every network request except one optional address, so it *can't* phone home even if it wanted to.
You can download this folder and double-click `index.html` with Wi-Fi off. It works. The desktop apps only hand a link to your own browser if you click one.

The one exception is off until you turn it on: in Chat Rooms, Settings, AI members, you can let a service called
TokenReply write your AI members' replies instead of a model file on your device. The page's rule allows exactly
`https://api.tokenreply.com` and nothing else. If you turn it on, your API key, the character's description and the recent
chat are sent there; switch back to "On this device" and nothing is sent. Your key stays on your device and is not part of exported accounts.
Because of this, the Android app now carries the internet permission; it is used for nothing else.
If your account has a vault passcode, you can also lock the API key with it: it is then stored encrypted inside the vault, readable only while the vault is open, and never included in exported files.

## About antivirus warnings

The Windows apps are not code-signed (a certificate costs money), and they bundle an AI engine (llama.cpp) as native
libraries. Unsigned Electron apps with native code are a common source of false alarms on scanners like VirusTotal:
one or two engines out of seventy may complain about the installer or the engine libraries. The source is all in this repository:
there is no obfuscated code, no downloader, no remote code, and the only address the page may contact is the optional
`api.tokenreply.com`. The AI engine process is deliberately cut off from the network (this is done by disabling network
functions inside it, which can look like "hooking" to a heuristic scanner, but it only blocks). If a scanner flags a download,
compare its hash with the one on the release page, and report it to the vendor as a false positive.

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

**Apps.** Everything in Apps is saved like your posts, so with a passcode it is encrypted too: notes, diary entries, events, receipts, household items and their photos, grocery lists, chores and their history. Household photos are stored as separate records tied to their item by a random token. The token shows that some records belong together, nothing about what they are. Apps use only your own device and count toward your storage limit. The Banking app is a notebook and connects to nothing.

**Characters.** Your characters and your edits to generated people are saved like your posts, so with a passcode they are encrypted too: names, bios, pictures and the fact that they exist. Characters are private to the account that made them. Images you add count toward your storage limit. There is no way to share a character with anyone else; they are included only in your own data export. A custom character never carries the "procedurally generated" label, so it can never pass as a generated stranger.

**Storage and your posting limit.** Settings, General, Storage shows how much space Anti-Social is using and lets you set your own limit in MB or GB. New posts pause when you reach it, or sooner if your device is nearly full, and you can raise it or delete posts to carry on. Pictures are shrunk before saving and anything over 40 MB is refused. The meter is approximate. Data stays in each app's own private storage on the device; choosing a different drive is not supported.

**Honest limits.** Encryption protects data at rest. It can't protect you if someone watches you type the passcode, if
malware is on the device, or if you pick a weak passcode. Exported JSON files are not encrypted. Deleted data can linger
as unreadable ciphertext in disk blocks until the system reuses them.

## Terms of Use

**TOUCH GRASS.**

(Seriously, get offline.)

## License

Anti-Social is created by Gamehopper. Licensed under [0BSD](LICENSE). Use it, copy it, change it, fork it, ship it. No credit needed, no questions asked.

Forks and modified versions are not made, reviewed or endorsed by the original author, and the original author does not track or know about them. Anything you download from anywhere else is used at your own risk.

## The Bible app

Anti-Social does not include any Bible text. In Apps, turn on Bible in Settings, then import your own file: USFM, OSIS XML, JSON, or plain text lines such as `John 3:16 For God so loved...`. That way the text is exactly the edition you trust, whether that is a translation you own or a Hebrew Tanakh your temple has checked. You confirm you have the right to use each file you import, and it stays on your device (encrypted if you use a passcode).

v0.9.0 shipped with a Hebrew and 1917 English Tanakh bundled in. v0.9.1 removes it, so there is nothing in the app to verify.

## Map data

The Travel Log map is drawn from [Natural Earth](https://www.naturalearthdata.com/) country outlines and populated places, which are public domain. `tools/build-map.py` rebuilds `www/map/world.js`. It is simplified to about 1 km, so it is a travel map, not a survey. The map is drawn on your device and never downloads anything.

## Recipes

The starter recipes in the Cookbook were written for Anti-Social (the lists of ingredients are common knowledge, and the instructions are original). Cook meat, poultry and eggs thoroughly and check temperatures with a food thermometer. The recipes call for poultry to reach 165°F (74°C) and ground meat 160°F (71°C). They are a starting point, not professional advice, and anyone with food allergies must check every ingredient themselves.

## Accounts: export, eject, import, guests, hidden

- **Export** (Settings, Your data) saves your account as one file: posts, photos, notes, every app's data and your app settings. The file is not encrypted, even for a passcode account, so keep it somewhere safe.
- **Eject account** does an export and then removes the account from this device. It is not a delete: **Import account** (on the create-account screen) puts it all back, on this or another device. Eject only removes the account after the file saved and you confirm you have it. A passcode account comes back without its passcode or duress PIN, and you can set a new passcode while importing. Importing never overwrites an account already on the device.
- **Continue as guest** makes an account with no handle and no passcode. Anyone who opens the device can open it, and nothing is encrypted. Settings has "Make this a real account" to claim it later.
- **Hide this account** (Settings, once you have two or more accounts) leaves it out of the account list. It still holds its handle. Settings in any other account has a Hidden accounts list to unhide it, and a hidden account with a passcode asks for the passcode before it comes back. If every account ends up hidden, the sign-in list shows them all so you are never locked out.

## Templates

A template changes how the whole app looks and what things are called. It never changes where your data lives or what the app can do, and you can switch back any time in Settings. The in-app names are generic on purpose (the look is inspired by familiar apps, but nothing here uses their names or logos).

- **Chat Rooms:** a server with channels, a chat column and a member list. The generated members (Populated mode) are not real, and they only post in #general; extra channels you create hold only your own messages. Deleting a channel deletes the messages you wrote in it. Voice channels and "Add a server" are for show.
- **Classic Blue:** an early-2010s social network look. Appearance and wording only; everything else works the same, and the generated friends in Populated mode are still not real.

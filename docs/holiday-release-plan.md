# Holiday decorations: release plan (2026)

Everything is built and lives on the branch `feat/holiday-decor`. It ships as **one app release before Hanukkah**; the sets then open by themselves, one day at a time, using the device's own clock. Nobody has to update on the day.

## Unlock timetable (local midnight on each date, device clock)

| Date | What opens |
|---|---|
| Fri Dec 4 | Hanukkah Night 1: First Light (first candle is lit that evening) |
| Sat Dec 5 | Night 2: Dreidel Spin |
| Sun Dec 6 | Night 3: Gold Gelt |
| Mon Dec 7 | Night 4: Latke Night |
| Tue Dec 8 | Night 5: Sufganiyot Sparkle |
| Wed Dec 9 | Night 6: Light in the Window |
| Thu Dec 10 | Night 7: A Little Oil |
| Fri Dec 11 | Night 8: Festival of Lights |
| Fri Dec 18 | Cosy Christmas and Santa & Sparkle (a week before Christmas) |

Until a set's day it shows as a blurred teaser with a "Unlocks <date>" badge, and Settings has a "Next up" line. Once a date has passed the set stays open for good.

## The one manual release

1. Get the Hanukkah art looked over by someone who celebrates (details in the Hanukkah pass: lights in a straight row, shamash set apart, candles added from the right, dreidel letters נ ג ה ש).
2. Around **Tue Dec 1**: merge `feat/holiday-decor` into `main`, bump the version to 0.30.0 (updcore.js, desktop/package.json, mobile/package.json, build.gradle versionName and versionCode, sw.js cache, README headline and version history), push.
3. Publish **v0.30.0** on GitHub: Releases, Draft a new release, tag `v0.30.0`, target `main`, Publish. The build takes about 3 minutes.
4. Check the downloads are all attached (Android, Windows x2, Linux x2, Switch, Wii U x2, 3DS x2). If the Wii U job fails on a devkitPro download error, re-run only the failed job.

Releasing around Dec 1 leaves a few days for people to update before the 4th.

## Notes

- The schedule is defined once, in `www/decocore.js` (`opens` dates on the collections and themes). Dates are for 2026 only; they stay open afterwards.
- It uses the device's clock, so changing the date shows a set early. That only affects cosmetics.
- The made-up members never wear a set that is still locked.
- `node tools/check-deco.js` checks the dates, the one-night-per-day rhythm, the "Next up" line, and the lit candles on every night.

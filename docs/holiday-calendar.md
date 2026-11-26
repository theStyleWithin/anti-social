# Holiday decoration calendar

Seasonal decoration sets open and close by the calendar, every year, with nothing to download or update. The rules live in one place, `www/decocore.js` (the `season` of each collection and theme, and the `WINDOW` table).

| Collection | Open from | Open until |
|---|---|---|
| Vibrant Pumpkin and Gobble Gobble Turkey (Thanksgiving) | 7 days before the 4th Thursday of November | 7 days after it |
| Hanukkah, night N | the evening of night N (night 1 is the evening before 25 Kislev, from the Hebrew calendar) | 7 days after night 8, for all nights |
| Cosy Christmas and Santa & Sparkle | 18 December (a week before Christmas) | 6 January |

For example, in 2026: Thanksgiving is 19 Nov to 3 Dec; Hanukkah night 1 opens Fri 4 Dec, night 8 on Fri 11 Dec, and all close after Fri 18 Dec; Christmas runs 18 Dec to 6 Jan 2027. In 2027 Hanukkah's first night is 24 December, and so on: the Hebrew calendar is computed in the app and checked against the system calendar for every year from 1990 to 2100.

- A set opens at midnight, on the device's clock, on its first day.
- Outside its window a set is a blurred teaser with the date it next opens (with the year when that is next year), and its themes cannot be picked.
- A "Next up" line in Settings appears when a set opens within six weeks.
- What you are already wearing stays on when its season ends. The window only decides what you can pick.
- The made-up members never wear a locked set.
- Changing the device's date reveals a set early. That only affects cosmetics.

To add another holiday: give its collection a `season` (and its themes), and add a rule to `WINDOW` in `www/decocore.js`. `node tools/check-deco.js` checks the rules.

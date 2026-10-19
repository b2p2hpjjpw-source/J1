# Heat Check 🌡️🔥❄️

A behavior thermometer for two brothers. Each boy has his own thermometer, side by side, from **−100°** to **+100°**. Good choices heat it up. Bad choices freeze it. Every day starts fresh at 0°, and each day's temperature goes into his **bank of heat points**, which he spends on prizes.

## Today 🌡️
- Two thermometers side by side. The mercury glides up or down and changes color, from icy blue through silver to orange and fire red.
- **Zones:** 🌋 MAX HEAT (100) · 🔥 ON FIRE (75+) · 🌶️ HOT (40+) · ☀️ WARM (10+) · 🌤️ ROOM TEMP · 🌬️ CHILLY · ❄️ FREEZING (−40) · 🧊 DEEP FREEZE (−75) · 🦣 ICE AGE (−100).
- Hot zones get flames at the bulb, a glowing pulsing card and a rattling thermometer at 100. Cold zones get falling snow, icicles dropping from the top, a shivering face, and at −100 the whole thermometer is frozen in an ice block. When someone is on fire the screen glows orange from below. When someone is in a deep freeze, frost creeps in from the screen edges.
- Tap a thermometer or **🌡️ Points** to open the points pad: big **🔥 Heat it up** and **❄️ Cool it down** buttons, plus "Something else…" for any amount and reason. Every tap shows an **Undo** for a few seconds.

### Sounds and announcements
| What happens | Sound | Announcer says |
|---|---|---|
| Any good choice | Sizzle, crackle, rising sparkle | "Sizzling, [name]!" |
| Climbs into HOT | Fire whoosh | "Heating up!" |
| Climbs into ON FIRE | Big fire roar | "[name] is on fire!" |
| Hits +100 | Fire and fanfare, fire confetti | "Maximum heat!" |
| Climbs back above 0 | Melting drips | "Thawing out! Great comeback!" |
| Any bad choice | Cold wind whoosh, cracking ice | "Brrr! Getting colder!" |
| Drops below 0 | Two-tone alarm | "Warning! Warning! It's getting colder!" |
| Drops into FREEZING | Howling wind, alarm | "Freeze warning! Turn it around!" |
| Drops into DEEP FREEZE | Whooping siren, red/blue strobe, screen shake | "Deep freeze alert! Your points are disappearing!" |
| Hits −100 | Siren and shattering ice | "Ice age! Points are disappearing!" |
| Points leave the bank | Coins drain away, sad "wah-wah", 🪙 fly off | |

Sounds are made by the phone (no files to download). The announcer uses the phone's voice (low and robotic for alarms, excited for cheers) unless you record your own.

### 🎙️ Your voice
In *Grown-ups → Your voice*, record yourself saying any of the 14 announcer lines (every row in the table above, plus "already maxed out", "bad choice while at −100°" and "cashes in a prize"). The boys then hear you instead of the phone.
- **👦👦 Both** records one version for both boys. Pick a boy's name to record his own version, so you can say his name ("Deep freeze alert! Jack, your points are disappearing!"). His own recording plays first, then the one for both, then the phone's voice.
- Each line shows a script to read, a ▶ Play button to hear what plays now, and 🗑️ to go back to the phone's voice. Recording stops by itself after 12 seconds, and silence at the start and end is trimmed off.
- Recordings stay on the phone they were made on. They aren't shared by family sync or saved in the backup file, so record on each phone. The phone asks for microphone permission the first time.

## Points and the bank 🔥
- Each day's final temperature is added to (or taken from) the bank. A +60° day adds 60 points. A −30° day takes 30 away.
- The thermometer stops at ±100, but points past the end still count: at −100, every extra bad choice comes straight out of the bank.
- **🌊 Heat Wave bonus:** if *both* boys finish the day at 50° or hotter, each gets +10 bonus points. It rewards teaming up instead of competing.
- **🔥 Heat streak:** days in a row that finished at 50°+.
- The bank can go below zero (🧊 "frozen bank"). Prizes need a positive balance.

## Prizes 🎁
Pick a boy to see his bank and every prize with a progress bar. Tapping a prize he can afford asks a grown-up question, then "Prize unlocked!" plays with confetti, and the cost comes out of his bank. Starting prizes: 30 min extra screen time (50), pick dinner (75), pick the family movie (80), stay up 30 min late (100), ice cream trip (150), $5 cash (250), new game or toy (500).

## Forecast 📅
A 14-day chart for each boy (bars up for hot days, down for cold), with heat streak, hottest day, days on fire and deep freezes. Tap a day to see what happened. Grown-ups can ✕ a mistake.

## 🔒 Grown-ups
Unlocked by a multiplication question (like 47 × 8). The unlock lasts 15 minutes. The 🔓 in the top corner locks it again right away.
- The boys' names and pictures.
- **Lock giving points** (on by default): the boys can look, but only a grown-up can give or take points.
- Sound effects, announcer voice and Heat Wave bonus on/off.
- **🎙️ Your voice:** record the announcer lines yourself (see above).
- Edit, add or remove good choices, bad choices and prizes (emoji, words, points).
- **Adjust a bank:** add or take points without moving today's thermometer (a starting balance, or a fix).
- **Family sync**, backup download/restore, erase everything.

## Putting it on the phone
With GitHub Pages on for this repo, it's at `https://<your-username>.github.io/<repo>/heat-check/`. Open it on the phone, then:
- iPhone: Safari → Share → *Add to Home Screen*
- Android: Chrome → ⋮ → *Install app*

It opens full-screen and works offline. Sign in under *Grown-ups → Family sync* on each phone to share the scores (see [../FAMILY-SYNC.md](../FAMILY-SYNC.md)).

To try it on a computer: `npx http-server .` from the repo root and open `/heat-check/` at phone size.

If you change files after installing, bump `CACHE` in `sw.js` so phones pick up the update.

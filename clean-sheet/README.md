# Clean Sheet

An Arsenal-themed phone app for getting sober. Each night he blows into the breathalyzer and logs the reading. A night where every reading is zero is a **clean sheet**, and the money that would have gone on whiskey ($30 by default) goes into his savings kitty.

## What it does

**Tonight**
- Log 1 to 3 breathalyzer readings a night. Tap **Blew 0.000**, or type the number on the screen (like `0.02`).
- Every reading at or under the pass mark: **Clean sheet!** The full-time whistle blows, confetti flies and $30 is banked.
- Any reading over: "Whiskey scored". No savings that night, the unbeaten run resets, and the message is about getting back up tomorrow.
- A reading before 6 a.m. counts toward the night before.
- A season scoreboard (*Mike 20 – 1 Whiskey*), his own "why I'm doing this", and a nightly team talk.
- **Craving? Take a half-time break:** a 15-minute timer, things to do while the craving passes, and the free 24/7 SAMHSA helpline.

**Season:** form guide for the last 10 nights, clean sheets, current and best unbeaten run, win rate, and a monthly calendar. Tap any night to add a forgotten reading or remove a typo.

**Savings:** the kitty total, a goal with a progress bar and a projected date (default: a trip to London for a match at the Emirates), a chart of money saved, and what a week, month, season and year sober is worth. When the goal is paid for, **Cash it in** and pick the next one.

**Date nights:** every $500 saved earns a date night. A "Date night earned!" screen pops up the moment he crosses each $500, Tonight shows a reminder while one is waiting, and Savings tracks progress to the next one. After you go, tap **We had our date night**. Date nights are a bonus, so they don't come out of the kitty. (The amount is `DATE_NIGHT_EVERY` at the top of `app.js`.)

**Trophies:** 14 trophies, from *First Clean Sheet* and *Hat-trick* to *Invincible* (49 in a row) and *Legend* (a full year), plus money milestones.

**Settings (gear icon):** name, nightly whiskey money, pass mark (0.000, 0.010 or 0.020), first night, his reason, whistle sound, and backup / restore / erase.

## Putting it on the phone

Same as the other apps in this repo: host the repo on GitHub Pages (or any static host), then open `https://<your-username>.github.io/<repo>/clean-sheet/` on his phone and **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android: ⋮ → Install app).

Data is saved only on that phone. Use **Settings → Download backup** now and then.

If you change any files after it's installed, bump `CACHE` in `sw.js` (e.g. `clean-sheet-v2`).

## A note on safety

Stopping heavy daily drinking all at once can cause alcohol withdrawal, which can be dangerous. It's worth a call to a doctor before or as he starts. SAMHSA National Helpline (US, free, 24/7): 1-800-662-4357.

This is an unofficial fan-made app. It isn't connected to Arsenal Football Club.

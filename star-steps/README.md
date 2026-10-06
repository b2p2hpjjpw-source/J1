# Star Steps ⭐⛰️

A phone app for a 3-year-old to track daily allergy immunotherapy doses and earn stars toward a prize.

## For the kid (big pictures, a talking buddy, no reading needed)
- **🏠 Today:** two giant buttons: **FULL** (a whole smiley circle) or **HALF** (a half smiley circle). Tapping one plays sounds and confetti, and a star flies into his star count. The buddy says what happened out loud (tap the buddy or 🔊 to hear it again).
- A week strip shows a smiley for each day he took his dose. Filling all 7 days lights up the bonus 🌟.
- **🎁 Prize:** a photo or picture of the prize and one star slot for each star needed, filling up as he earns them. Below that is a calendar of every dose.
- **⛰️ Steps:** a mountain path with his buddy standing on his current step (starts at 7 of 13) and a trophy at the top.

## Stars
| Earn | Stars |
|---|---|
| Each daily dose (full or half) | 1 ⭐ |
| Every day of a week (Mon–Sun) | +1 bonus ⭐ |
| Moving up to the next step | +1 bonus ⭐ |

## 🔒 Grown-ups (unlock by answering a simple addition question)
- **Moved up a step!**: gives the bonus star with a celebration. There's also "Undo last move up", plus +/− to fix the step number or the total number of steps without giving a star.
- **Prize:** name it, pick a picture or **take or choose a photo of the real prize**, and set how many stars it costs. Tap **Prize given!** to spend the stars and start the next prize.
- **Calendar:** tap any past day to set Full, Half or None (for a forgotten day or a wrong tap).
- Child's name, buddy animal, sounds and talking buddy on/off, backup download/restore, erase.

## Putting it on the phone
It's a plain web app. If GitHub Pages is on for this repo, it's at `https://<your-username>.github.io/<repo>/star-steps/`. Open that link on the phone and:
- iPhone: Share → *Add to Home Screen*
- Android: ⋮ → *Install app*

It then opens full-screen with its own icon and works offline. Data is saved only on that phone, so use *Grown-ups → Download* now and then for a backup.

To try it on a computer: `npx http-server star-steps` and open the link at phone size.

If you change files after installing, bump `CACHE` in `sw.js` so phones pick up the update. The week starts on Monday. Change `WEEK_START` in `app.js` to `0` for Sunday.

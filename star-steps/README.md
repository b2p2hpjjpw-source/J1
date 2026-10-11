# Star Steps ⭐🐴

A horse-and-farm themed phone app for Lucas (3) to track daily allergy immunotherapy (OIT) doses and earn stars toward a prize, plus a potty-training dino tracker.

## For the kid (big pictures, a talking buddy, no reading needed)
- **🏠 Today:** two giant buttons: **FULL** (a whole smiley circle) or **HALF** (a half smiley circle). Tapping one plays sounds and confetti, and a star flies into his star count. The buddy says what happened out loud (tap the buddy or 🔊 to hear it again).
- A week strip shows a smiley for each day he took his dose. Filling all 7 days lights up the bonus 🌟.
- **🎁 Prize:** a photo or picture of the prize and one star slot for each star needed, filling up as he earns them. Below that is a calendar of every dose.
- **🐎 Steps:** a dirt trail through a farm field (sunflowers, sheep, chickens, carrots) with his horse buddy standing on his current step (starts at 7 of 13), riding up to a red barn at the top.
- Farm touches everywhere: a horse buddy (he can pick other farm animals), clip-clop sounds when he earns a star, a horse whinny for big celebrations, cheers like "Yee-haw!" and "Giddy-up!", and horses, carrots and sunflowers in the confetti.

## 🦖 Potty dinos
- **🦖 Potty tab:** two big buttons, **DRY!** (a dino) or **OOPS** (a water drop). A dry day means he didn't pee on the rug, the couch or anywhere else in the apartment. A dry day earns a dino with a roar and dino confetti. An accident gets a kind "That's okay! Try again tomorrow!" with no dino.
- **🚽 Grow a dino:** big **PEE** and **POOP** buttons for each time he goes in the potty. Every trip grows a dino: trip 1, Mommy dino lays an egg 🥚. Trip 2, the egg hatches into a baby dino. Trip 3, it grows into a toddler dino. Trip 4, a kid dino. Trip 5, it's a grown-up dino and joins his dino count (+1 🦖). Then Mommy lays a new egg. Each pee and each poop counts as a trip. Tapping the same button again within 2 minutes doesn't count, so taps can't pile up. Grown-ups can add a missed trip or delete a wrong one.
- If yesterday wasn't logged, there's a smaller "What about yesterday?" question, for nights when you check in the next morning.
- Dinos fill up a collection of 30 colorful dino spots toward **a new Lucas book**. At 30 there's a big celebration. A grown-up taps **Prize given!**, and the next 30 start.
- Dinos are separate from the OIT stars. The count in the top corner shows 🦖 on the Potty tab and ⭐ everywhere else.
- Grown-ups can change the prize name or the number of dinos needed, and fix any day in the **Potty days** calendar.

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
- **🎙️ Your voice:** record yourself saying each line the buddy says (OIT time, after a full/half dose, already done today, weekly bonus, step up, last step, prize, keep going). Lucas then hears you instead of the phone's voice. Lines you don't record use the phone's voice. Recordings stay on the phone and aren't in the backup file.
- Child's name (set to Lucas), buddy animal, sounds and talking buddy on/off, backup download/restore, erase.

## Putting it on the phone
It's a plain web app. If GitHub Pages is on for this repo, it's at `https://<your-username>.github.io/<repo>/star-steps/`. Open that link on the phone and:
- iPhone: Share → *Add to Home Screen*
- Android: ⋮ → *Install app*

It then opens full-screen with its own icon and works offline. Data is saved only on that phone, so use *Grown-ups → Download* now and then for a backup.

To try it on a computer: `npx http-server star-steps` and open the link at phone size.

If you change files after installing, bump `CACHE` in `sw.js` so phones pick up the update. The week starts on Monday. Change `WEEK_START` in `app.js` to `0` for Sunday.

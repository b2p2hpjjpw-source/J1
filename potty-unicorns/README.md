# Potty Unicorns 🦄✨

A sparkly potty training app for a little girl. Every time she goes pee or poop in the potty, her baby unicorn grows. Every 5 trips makes one grown-up unicorn, and 5 grown-up unicorns earn a prize her mom picks.

## For her (big pictures, a talking voice, no reading needed)
- Two giant buttons: **PEE** (a yellow drop) and **POOP**. Each tap plays a twinkly chime, shoots sparkly glitter confetti out of the button, and says what happened out loud.
- **How the unicorn grows:**
  1. Trip 1: Mommy Unicorn lays an egg 🥚
  2. Trip 2: the egg hatches, and a baby unicorn peeks out of its shell
  3. Trip 3: the baby grows into a toddler unicorn
  4. Trip 4: the toddler becomes a kid unicorn
  5. Trip 5: the kid unicorn is all grown up. A big glitter shower, and it joins her unicorn family (+1 🦄). Then Mommy Unicorn is ready to lay a new egg.
- Each pee and each poop counts as a trip. Tapping the same button again within 2 minutes doesn't count, so excited taps can't pile up.
- Five steps along the bottom (Egg, Hatch, Toddler, Kid, Grown-up) show how close the next unicorn is.
- **My unicorn family:** 5 spots that fill with unicorns, each in its own colors. When all 5 are filled there's a giant glitter celebration for the prize.
- Tap the meadow or the unicorn family to hear the line again.

## 🔒 Grown-ups (unlock by answering an addition question)
- Child's name.
- **Prize:** the name, a picture (pick one, or take/choose a **photo of the real prize**), and how many unicorns it takes (5 to start). Tap **Prize given!** to start the next 5.
- **Potty trips:** add a trip she forgot to tap, or delete a wrong one.
- **🎙️ Your voice:** record yourself saying each line (egg, hatch, toddler, kid, grown-up, prize, and a few others). She then hears you instead of the phone's voice. Lines you don't record use the phone's voice. Recordings stay on the phone.
- Sounds and talking on/off, and start over.

The first time the app opens, it asks for her name and the prize.

## Putting it on the phone
It's a plain web app. With GitHub Pages on for this repo, it's at `https://<your-username>.github.io/<repo>/potty-unicorns/`. Send that link to her mom. On the phone:
- iPhone: open it in Safari, Share → *Add to Home Screen*
- Android: open it in Chrome, ⋮ → *Install app*

It then opens full-screen with its own icon and works offline. Progress is saved only on that phone. Recording needs the microphone, so the phone will ask for permission the first time she records.

To try it on a computer: `npx http-server .` from the repo root and open `/potty-unicorns/` at phone size.

If you change files after installing, bump `CACHE` in `sw.js` so phones pick up the update.

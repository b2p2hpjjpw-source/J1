# Build-a-Plate 🍽️

A phone app where the kids build **tomorrow's breakfast** the night before by putting a main dish, sides and a drink on a plate. Grown-ups see the orders in the morning.

**Orders switch over at 1 pm Eastern time**, not midnight. From 1 pm ET the kids order for the next day's breakfast. Until 1 pm ET the next day, that order still shows (✓ Ordered) so everyone can see it at breakfast. This uses Eastern time even if the phone is set to another time zone. To change it, edit `RESET_HOUR` and `RESET_TZ` at the top of `app.js`.

## For the kids (big pictures, a talking buddy, almost no reading)
- **Who's ordering?** Each child taps their own big picture card. The card shows "Ordered ✓" and their food once they're done.
- **Build your plate:** a big plate with a spot in the middle for the **main dish**, spots along the top for **sides**, and a cup beside it for the **drink**.
  - Tap a food on the shelf, or drag it up onto the plate.
  - The tabs (🥞 Main, 🍓 Sides, 🥛 Drinks) have dots that fill up. When one part is full, the app moves on to the next by itself.
  - Tap a food on the plate to take it off. Picking again when a part is full swaps out the oldest pick.
  - **Extra sides (optional):** there are two gold **+** spots on the plate for up to **2 more sides** if they want them. When the plate is ready the buddy offers them ("Or add an extra side if you want!"). They're never needed to finish. Grown-ups can set 0, 1 or 2 extra sides under *What fits on a plate*.
  - The buddy reads every food name and instruction out loud (tap the speech bubble to hear it again).
- **I'm done!** sends the order with a celebration. A main dish is needed. If they skipped sides or a drink, the buddy reminds them once ("Don't forget a drink!").
- Foods a grown-up has switched off are greyed out with a **Not today** sticker. They wiggle and say "Sorry, no waffles tomorrow" if tapped.

### Themes (one per child)
| Theme | Buddy | Feel |
|---|---|---|
| **Mario-style** (Julien and Lucas) | 🍄 | Blue sky, ? blocks and bricks, green pipe, gold coin counter, coin "bling" sounds, power-up sound and coin confetti |
| Farm | 🐴 | Sky, hills and a fence, a wooden shelf, clip-clop sounds and a horse whinny |
| Space, Unicorn, Ocean, Dinosaurs | 🚀 🦄 🐬 🦖 | For any other children you add |

Both boys' pictures are a **super star** (Julien's card is red, Lucas's is green, so they're easy to tell apart). The super star and the gold coin are drawn pictures in `art/`, so they look the same on every phone. The Mario-style theme uses look-alike scenery and pictures, not Nintendo's characters or artwork.

## 🔒 Grown-ups (unlock by answering a multiplication question, e.g. 23 × 7)
- **Breakfast orders:** switch between the breakfast being ordered now and the one before it. Each child shows ✓ Ordered, Still building or Not yet, with their food. A **To make** list totals everything (e.g. Pancakes ×2). An ordered food that has since been switched off is flagged ⚠️.
- **Menu:** grouped into Main, Sides and Drinks.
  - Switch an item **off** when you've run out. The kids still see it, but greyed out. "Mark everything available again" turns them all back on.
  - **✕** removes an item for good. **+ Add** creates a new one.
  - Tap a name to rename it, move it to another group, or change its picture: an emoji, a drawn picture (there are **bagel with smoked salmon**, **banana bread** and **fruit salad** pictures, which have no emoji), or a **photo of the real food**. The menu starts with "Salmon bagel" and "Banana bread" main dishes and a "Fruit salad" side.
- **Children:** add, edit or remove a child, and pick their name, picture and theme.
- **Allergies:** in a child's Edit screen, tap the foods they can't have. Those foods are hidden from that child completely, and the other children still see them. **Lucas is set up to never see Eggs.** In the menu, those items say "hidden for Lucas". New foods you add are not hidden automatically, so mark them in his Edit screen.
- **What fits on a plate:** how many main dishes (1–2), sides (0–4) and drinks (0–2).
- **🎙️ Your voice:** record yourself so the kids hear you instead of the phone's voice. Tap ● next to a line, say it, and tap Done (it stops by itself after 10 seconds). Then ▶ plays it back and 🗑 deletes it. There are three groups:
  - **Hello for each child** ("Hi Lucas! Let's build your breakfast!")
  - **Buddy lines** ("Pick your main dish!", "Pick two sides!", "Yummy!", "Bye-bye!", "Sorry, that's all gone…", "Hooray! Your breakfast is ordered!" and more)
  - **Food names**: record each food once ("Pancakes!") and it's joined to the lines, so a child hears "Pancakes!" + "Yummy!" in your voice. After an order is sent, your "Hooray!" plays followed by the names of the foods they picked.

  Anything you don't record uses the phone's voice. Recordings stay on that phone and aren't in the backup file. The phone asks for microphone permission the first time.
- Sounds and the talking buddy on/off, backup download/restore, erase everything.

## Putting it on the phone
It's a plain web app. If GitHub Pages is on for this repo, it's at `https://<your-username>.github.io/<repo>/breakfast/`. Open that link on the phone and:
- iPhone: Share → *Add to Home Screen*
- Android: ⋮ → *Install app*

It then opens full-screen with its own icon and works offline. Data is saved only on that phone, so both kids order on the same phone or tablet. Use *Grown-ups → Download backup* now and then.

To try it on a computer: `npx http-server breakfast`, then open the link at phone size.

If you change files after installing, bump `CACHE` in `sw.js` so phones pick up the update. The starting menu, children, themes and drawn food pictures (`ART`, with the images in `art/`) are at the top of `app.js`.

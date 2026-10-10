# Homework Hero 🦸⭐

A fun phone app for a 7-year-old to check off nightly homework and track whether he gets to school on time.

## What it does

**📝 Homework (Monday–Friday)**
- Monday–Thursday: three big buttons to tap: **🔢 Math**, **📚 Reading (20 minutes)** and **🔤 Word Study**.
- Friday: just **📚 Reading (20 minutes)**.
- A rocket flies toward the moon as he checks each one off, with confetti and sounds.
- A built-in **20-minute reading timer** checks off Reading on its own when time is up. It keeps counting if the phone is locked or the app is closed.
- When all three are done, a big "HOMEWORK HERO!" celebration plays.
- Weekends show a "No homework, go play!" screen.
- Grown-ups can mark a night as "no homework" (holiday, sick day) so it doesn't break the streak.
- The ◀ ▶ arrows let you go back and fix a night you forgot to log.

**🏆 My Stars**
- Homework: 1 ⭐ per assignment, plus a bonus ⭐ for finishing all three (4 stars Mon–Thu, 1 star for Friday reading).
- School: 1 ⭐ for every on-time day, plus a bonus ⭐ for a perfect week (on time every school day; "No school" days don't count against it).
- A 🔥 streak of nights in a row, total "hero nights", this week at a glance and a monthly calendar.
- 16 badges to unlock (Bookworm, Math Whiz, Spelling Bee, Full Week, Perfect Week, Early Bird…).
- An optional **prize goal** a grown-up sets (e.g. "Ice cream trip, 25 ⭐"), with a progress bar.

**🏫 School**
- Each school day (Mon–Fri): tap **⏰ On time!** or **🐢 A little late** (or "No school today").
- Shows his on-time streak, on-time percentage, this week at a glance and a monthly calendar.

**🔒 Grown-ups** (locked behind a two-digit × one-digit multiplication question, like 47 × 8)
- Child's name and buddy avatar, sound on/off.
- Set the prize, and mark it as given (this spends the stars).
- Download or restore a backup file, or erase all progress.

## Putting it on the phone

The app is a plain web app (HTML/CSS/JS, nothing to build). You can add it to the home screen and it works offline.

1. **Host it.** The easiest free option is GitHub Pages: in the repo, go to *Settings → Pages*, pick this branch and the `/ (root)` folder, and save. After a minute it's live at `https://<your-username>.github.io/<repo>/`. Any static host (Netlify, Cloudflare Pages, …) also works.
2. **Open that link on the phone** in Safari (iPhone/iPad) or Chrome (Android).
3. **Add to Home Screen:**
   - iPhone: tap the Share button → *Add to Home Screen*.
   - Android: tap ⋮ → *Install app* / *Add to Home screen*.

After that it opens full-screen with its own icon, like a regular app.

### About saved data
Progress is saved on the phone, in the browser's storage. To share it between both parents' phones, sign in under *Grown-ups → Family sync*. This works for every app in this repo; see [FAMILY-SYNC.md](FAMILY-SYNC.md). You can also use *Grown-ups → Download backup* every so often. The same backup file can be restored on another phone.

## Trying it on a computer

```sh
npx http-server -p 8080 .
# then open http://localhost:8080 (use your browser's device mode to see it at phone size)
```

## Changing the homework

The assignments, homework days and school days are set at the top of `app.js`:

```js
const TASKS = [ { id: 'math', name: 'Math', emoji: '🔢', days: [1, 2, 3, 4], ... }, ... ]; // days: 0 = Sunday
const HOMEWORK_DAYS = [1, 2, 3, 4, 5]; // days with any homework
const SCHOOL_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
```

If you change any files after the app is installed, bump `CACHE` in `sw.js` (e.g. `homework-hero-v4`) so phones pick up the new version.

---

**Also in this repo:** [Star Steps](star-steps/), a daily allergy-medicine star chart for a 3-year-old. See [star-steps/README.md](star-steps/README.md).

**Also in this repo:** [Build-a-Plate](breakfast/), where the kids order tomorrow's breakfast the night before. See [breakfast/README.md](breakfast/README.md).

**Also in this repo:** [Clean Sheet](clean-sheet/), an Arsenal-themed sobriety tracker with a nightly breathalyzer log and savings kitty. See [clean-sheet/README.md](clean-sheet/README.md).

**Also in this repo:** [Utopia](utopia/), a Silo-inspired job application tracker where every application sent refills the silo's supplies. See [utopia/README.md](utopia/README.md).

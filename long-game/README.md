# Long Game

A weekly tracker for cutting refined carbs, processed food and the other foods most linked to a shorter life. Each food on the list gets a weekly allowance: 0 means cut it completely, or allow it a set number of times a week.

- **The week at a glance:** how many foods are within their allowance, and a dot for each day: green for a clean day, red for a day where something went over its allowance. Tap a day to log for it.
- **Log what you had:** tap **+** every time you have a serving (use **−** to undo). Each food shows a bar of its weekly servings, how many are left, and a better swap once you've used them up. The ‹ › arrows let you log a day you forgot.
- **Stats:** clean-day streak, servings logged this week, foods cut to zero, and servings over allowance.
- **Your list:** raise or lower any food's weekly allowance, read why it's on the list, go back to the suggested number, remove it, add more from the guidance list (alcohol, diet soda, sweetened yogurt, protein bars, pizza, margarine), or add your own.
- **Past weeks:** clean days, foods on track and servings over, for the last 8 weeks.
- **Family sync** and **Backup**, same as the other apps (see [../FAMILY-SYNC.md](../FAMILY-SYNC.md)).

The starting list and suggested allowances are set in `GUIDE` at the top of `app.js`. They follow broad guidance (WHO on processed meat, the American Heart Association on added sugar, Harvard's Healthy Eating Plate, and studies of long-lived populations). It's general advice, not medical advice.

Open `https://<your-username>.github.io/<repo>/long-game/` on the phone and **Add to Home Screen**. If you change any files after it's installed, bump `CACHE` in `sw.js`.

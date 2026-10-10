# Utopia

A job application tracker for a phone, inspired by the TV series *Silo*. His current job is the silo. Each application he sends keeps the silo alive while he looks for the way out, toward a better job.

## How it works

**Five core rooms** keep the silo alive: **Oxygen** (Air Handling), **Water** (Water Treatment), **Food** (Hydroponics), **Power** (Generator Room) and **Medicine** (Infirmary). Each room has a supply tank that drains in real time:

| Room state | Supplies run out |
|---|---|
| No posting assigned | 2 weeks after the room's last refill |
| A posting assigned | 1 week after the date the job was found (the application deadline) |

**Submitting an application refills that room to 100%.** The room then starts its 2-week clock again, so he needs to find its next posting before it runs dry. That's 2 weeks to find a job plus 1 week to apply, so the five rooms ask for **at least 5 applications every 3 weeks or so**.

**Bonus storerooms:** if he finds more postings than he has free rooms, each extra one goes into its own storeroom in the Supply Depot. It has the same deadline. Once it's sent, it becomes a sealed cache that never needs refilling.

**Each posting has four phases:**
1. **Identify the job.** Done when he adds it. This starts the countdown.
2. **Tailor the resume.** Aim to finish by about 40% of the way through the window (day 3 of 7).
3. **Cover letter & materials.** By about 75% (day 5 of 7).
4. **Submit the application.** By the deadline, which is the end of day 7. This refills the room, with confetti.

Every posting and room shows a live countdown (days, hours, minutes, seconds). A room's status goes from Stable to Low, then Critical, then Depleted. The status bar at the top shows overall life support.

**Postings tab:** what's in progress (soonest deadline first), what's been sent, and what's been set aside. On a sent application, tap **Interview!** when he hears back. That's a *signal from outside*.

**The Climb tab:** total applications sent, progress toward 5 this cycle, applications per week, interviews, the on-time rate, average days from finding a job to sending it, and 8 badges.

**Settings (gear icon):** his name, the turnaround (3, 4, 5, 7, 10 or 14 days; default 7), how long empty rooms last (10, 14 or 21 days; default 14), sound, and backup, restore and erase. Changing the turnaround moves every open deadline right away.

### On the turnaround

We recommend **5 days**. A posting gets the most attention in its first few days. Recruiters often start screening the first batch right away, and many roles close or fill within 2 to 3 weeks. 3–5 days keeps him near the front of the line and still leaves time to tailor the resume and letter properly. A week works well as an upper limit.

## Putting it on the phone

It works the same way as the other apps in this repo. Host the repo on GitHub Pages (or any static host), open `https://<your-username>.github.io/<repo>/utopia/` on his phone, and choose **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android: ⋮ → Install app).

Data is saved only on that phone. Use **Settings → Download backup** now and then.

If you change any files after it's installed, bump `CACHE` in `sw.js` (e.g. `utopia-v2`).

---

This is an unofficial, fan-made app inspired by *Silo*. It isn't connected to the show or its makers.

# Utopia

A job application tracker for a phone, inspired by the TV series *Silo*. His current job is the silo: 144 levels underground, one spiral staircase, and a screen in the cafeteria showing hills that look dead. Each application he sends keeps the silo alive, cleans the lens and climbs a flight of stairs toward the airlock and a better job.

## The Silo touches

- **The Pact.** The first screen lays out the rules as six articles on a parchment-colored card. He taps *I accept the Pact* to start.
- **The view.** The top of the Silo screen is the cafeteria wall screen. With no applications sent, the lens is filthy: a brown sky, dead hills, a bare tree and a dark city on the horizon. Each application sent this cycle cleans the lens 20%. At 5, the sky is blue, the hills are green, the tree is in leaf and the city's lights are on. If he stops applying, the dust settles back over 3 weeks.
- **The stairs.** The Climb tab draws the silo from the side: Up Top, Mid and Down Deep, with the spiral stairs as 24 flights. He starts on level 144 by Mechanical. Each application climbs one flight (6 levels), and each interview climbs two more. Marking an application **Offer!** opens the airlock: *Welcome outside.* His level shows in the header.
- **Departments.** Rooms are labeled with where they are in the silo: Air Handling (Up Top), Hydroponics and Medical (Mid), Water Treatment and Mechanical (Down Deep). Extra postings are **porter runs** that deliver crates to Supply.
- **Badges** include First Flight, Clean Lens, Porter, Mid Levels, Up Top, Signal From Outside and Utopia.

## How it works

**Five core rooms** keep the silo alive: **Oxygen** (Air Handling), **Water** (Water Treatment), **Food** (Hydroponics), **Power** (Generator Room) and **Medicine** (Infirmary). Each room has a supply tank that drains in real time:

| Room state | Supplies run out |
|---|---|
| No posting assigned | 2 weeks after the room's last refill |
| A posting assigned | 1 week after the date the job was found (the application deadline) |

**Submitting an application refills that room to 100%.** The room then starts its 2-week clock again, so he needs to find its next posting before it runs dry. That's 2 weeks to find a job plus 1 week to apply, so the five rooms ask for **at least 5 applications every 3 weeks or so**.

**Porter runs (bonus):** if he finds more postings than he has free rooms, each extra one becomes a porter run to Supply. It has the same deadline. Once it's sent, its crate is stocked for good and never needs refilling.

**Each posting has four phases:**
1. **Identify the job.** Done when he adds it. This starts the countdown.
2. **Tailor the resume.** Aim to finish by about 40% of the way through the window (day 3 of 7).
3. **Cover letter & materials.** By about 75% (day 5 of 7).
4. **Submit the application.** By the deadline, which is the end of day 7. This refills the room, with confetti.

Every posting and room shows a live countdown (days, hours, minutes, seconds). A room's status goes from Stable to Low, then Critical, then Depleted. The status bar at the top shows overall life support.

**Postings tab:** what's in progress (soonest deadline first), what's been sent, and what's been set aside. On a sent application, tap **Interview!** when he hears back (a *signal from outside*) or **Offer!** when he lands it (the airlock opens).

**The Climb tab:** his level on the stairs, total applications sent, progress toward 5 this cycle, applications per week, interviews, the on-time rate, average days from finding a job to sending it, and 8 badges.

**Settings (gear icon):** his name, the turnaround (3, 4, 5, 7, 10 or 14 days; default 7), how long empty rooms last (10, 14 or 21 days; default 14), sound, and backup, restore and erase. Changing the turnaround moves every open deadline right away.

### On the turnaround

We recommend **5 days**. A posting gets the most attention in its first few days. Recruiters often start screening the first batch right away, and many roles close or fill within 2 to 3 weeks. 3–5 days keeps him near the front of the line and still leaves time to tailor the resume and letter properly. A week works well as an upper limit.

## Putting it on the phone

It works the same way as the other apps in this repo. Host the repo on GitHub Pages (or any static host), open `https://<your-username>.github.io/<repo>/utopia/` on his phone, and choose **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android: ⋮ → Install app).

Data is saved only on that phone. Use **Settings → Download backup** now and then.

If you change any files after it's installed, bump `CACHE` in `sw.js` (e.g. `utopia-v2`).

---

This is an unofficial, fan-made app inspired by *Silo*. It isn't connected to the show or its makers.

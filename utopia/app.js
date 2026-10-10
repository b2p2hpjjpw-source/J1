/* Utopia — a Silo-inspired job application tracker.
 * The current job is the silo. Every application sent refills one of its supplies, on the way to somewhere better.
 * Five core rooms (oxygen, water, food, power, medicine) drain over 2 weeks with no posting in them,
 * or over the turnaround window (1 week by default) once a posting is assigned. Submitting refills the room.
 * Bonus storerooms hold extra postings: same deadline, but once sent they're a sealed cache that never needs refilling.
 * Everything is stored on this phone in localStorage. No accounts, no servers. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'utopia-v1';
  const DAY = 86400000;
  const DEFAULT_TURNAROUND = 7;  // days from finding a posting to sending it
  const DEFAULT_DRAIN = 14;      // days an empty core room lasts after its last refill
  const TURNAROUND_CHOICES = [3, 4, 5, 7, 10, 14];
  const DRAIN_CHOICES = [10, 14, 21];
  const CYCLE_DAYS = 21;         // 2 weeks to find + 1 week to apply: one full supply cycle
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const NEEDS = [
    { id: 'oxygen', name: 'Oxygen', place: 'Air Handling' },
    { id: 'water', name: 'Water', place: 'Water Treatment' },
    { id: 'food', name: 'Food', place: 'Hydroponics' },
    { id: 'power', name: 'Power', place: 'Generator Room' },
    { id: 'medicine', name: 'Medicine', place: 'Infirmary' },
  ];
  const needOf = id => NEEDS.find(n => n.id === id);

  // The four phases between finding a posting and getting it in front of a hiring manager.
  // `by` is how far through the turnaround window each step should ideally be done.
  const PHASES = [
    { id: 'found', n: 'Phase 1', t: 'Identify the job', by: 0 },
    { id: 'resume', n: 'Phase 2', t: 'Tailor the resume', by: 0.4 },
    { id: 'cover', n: 'Phase 3', t: 'Cover letter & materials', by: 0.75 },
    { id: 'submitted', n: 'Phase 4', t: 'Submit the application', by: 1 },
  ];

  // Transmissions from outside: one a day.
  const TRANSMISSIONS = [
    'The silo is not the whole world. It only feels that way from the inside.',
    'Every application is a lens cleaned. A little more of outside comes into view.',
    'You don’t have to reach the top today. Just the next landing.',
    'Hope is a supply too. Refill it.',
    'Somewhere out there is a place with sky in it. Keep climbing.',
    'The stairs are long. So is every career that was worth having.',
    'One posting. One tailored resume. One letter. One submit. That’s the whole machine.',
    'They say don’t ask about outside. Ask anyway.',
    'A “no” is just a door that wasn’t the airlock. Try the next one.',
    'Mechanical keeps the silo running. You keep the search running.',
    'Supplies don’t wait, and neither do hiring managers. Send it while it’s fresh.',
    'Fix what’s broken. Then go find what’s better.',
    'Nobody climbs out in one day. Everybody who got out kept climbing.',
    'Good enough to send beats perfect and sitting in a drawer.',
    'The view from the top is earned one step at a time.',
  ];

  const BADGES = [
    { id: 'first', n: 'First Breath', d: 'First application sent' },
    { id: 'quick', n: 'Quick Hands', d: 'Sent within 2 days of finding it' },
    { id: 'full', n: 'Full Life Support', d: 'All 5 rooms refilled within 3 weeks' },
    { id: 'bonus', n: 'Stockpiler', d: 'First bonus cache sealed' },
    { id: 'ten', n: 'Ten Landings', d: '10 applications sent' },
    { id: 'signal', n: 'Signal From Outside', d: 'First interview' },
    { id: 'quarter', n: 'Quarter Century', d: '25 applications sent' },
    { id: 'fifty', n: 'Top of the Stairs', d: '50 applications sent' },
  ];

  // ---------- Helpers ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => keyOf(new Date());
  const niceDate = t => { const d = new Date(t); return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const icon = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}" /></svg>`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp01 = x => Math.max(0, Math.min(1, x));

  // "4d 07:12:33". Past a deadline it counts up (the words around it say "overdue").
  function fmtLeft(ms) {
    let s = Math.floor(Math.abs(ms) / 1000);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 1,
    name: '',
    started: 0,                      // when he first opened the app
    turnaround: DEFAULT_TURNAROUND,
    drain: DEFAULT_DRAIN,
    sound: true,
    welcomed: false,
    rooms: {},                       // needId -> { refilled: timestamp }
    jobs: [],                        // see newJob()
    seenBadges: [],
  };

  function load() {
    let s;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { s = null; }
    s = Object.assign(structuredClone(DEFAULT_STATE), s || {});
    if (!s.started) s.started = Date.now();
    NEEDS.forEach(n => { if (!s.rooms[n.id]) s.rooms[n.id] = { refilled: s.started }; });
    return s;
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Couldn’t save on this phone. Download a backup from Settings.'); }
  }

  // ---------- The rules ----------
  // A posting must be sent by the end of the day `turnaround` days after it was found.
  const deadlineOf = j => addDays(fromKey(j.found), state.turnaround + 1).getTime() - 1;
  const phaseTarget = (j, p) => addDays(fromKey(j.found), Math.round(state.turnaround * p.by)).getTime();
  const activeJobs = () => state.jobs.filter(j => j.status === 'active');
  const jobInRoom = id => activeJobs().find(j => j.room === id);
  const sentJobs = () => state.jobs.filter(j => j.status === 'submitted').sort((a, b) => a.steps.submitted - b.steps.submitted);

  // How much is left in a core room right now.
  function roomInfo(id, now = Date.now()) {
    const job = jobInRoom(id);
    const deadline = job ? deadlineOf(job) : state.rooms[id].refilled + state.drain * DAY;
    const total = (job ? state.turnaround : state.drain) * DAY;
    const left = deadline - now;
    const pct = clamp01(left / total);
    const st = left <= 0 ? 'out' : pct < 0.25 ? 'crit' : pct < 0.5 ? 'low' : 'ok';
    return { job, deadline, left, pct, st };
  }
  const ST_LABEL = { ok: '● Stable', low: '▲ Low', crit: '◆ Critical', out: '✕ Depleted' };

  function nextPhase(j) {
    return PHASES.find(p => p.id !== 'found' && !j.steps[p.id]);
  }

  function stats() {
    const sent = sentJobs();
    const now = Date.now();
    const inCycle = sent.filter(j => j.steps.submitted > now - CYCLE_DAYS * DAY);
    const coreInCycle = new Set(inCycle.filter(j => j.room !== 'bonus').map(j => j.room)).size;
    const interviews = state.jobs.filter(j => j.outcome === 'interview').length;
    const onTime = sent.filter(j => j.steps.submitted <= deadlineOf(j)).length;
    const avgDays = sent.length ? sent.reduce((a, j) => a + Math.max(0, (j.steps.submitted - fromKey(j.found)) / DAY), 0) / sent.length : 0;
    const caches = sent.filter(j => j.room === 'bonus').length;
    // Full life support: at some point, all 5 core rooms were refilled inside one 3-week window.
    let full = false;
    const core = sent.filter(j => j.room !== 'bonus');
    core.forEach(j => {
      const w = core.filter(k => k.steps.submitted <= j.steps.submitted && k.steps.submitted > j.steps.submitted - CYCLE_DAYS * DAY);
      if (new Set(w.map(k => k.room)).size === NEEDS.length) full = true;
    });
    const quick = sent.some(j => j.steps.submitted < addDays(fromKey(j.found), 3).getTime());
    return { sent, inCycle, coreInCycle, interviews, onTime, avgDays, caches, full, quick };
  }

  function earnedBadges(s = stats()) {
    const n = s.sent.length;
    return BADGES.filter(b => ({
      first: n >= 1, quick: s.quick, full: s.full, bonus: s.caches >= 1, ten: n >= 10,
      signal: s.interviews >= 1, quarter: n >= 25, fifty: n >= 50,
    })[b.id]).map(b => b.id);
  }

  function checkBadges() {
    const fresh = earnedBadges().filter(id => !state.seenBadges.includes(id));
    if (!fresh.length) return;
    state.seenBadges.push(...fresh); save();
    const b = BADGES.find(x => x.id === fresh[0]);
    setTimeout(() => toast(`Badge unlocked: ${b.n}`), 1800);
  }

  // ---------- Rendering ----------
  let view = 'silo';
  function renderAll() {
    renderTop();
    if (view === 'silo') renderSilo();
    if (view === 'missions') renderMissions();
    if (view === 'climb') renderClimb();
  }

  function renderTop() {
    const day = Math.floor((fromKey(todayKey()) - fromKey(keyOf(new Date(state.started)))) / DAY) + 1;
    $('hello').textContent = `${state.name ? state.name + ' · ' : ''}Day ${day} in the silo`;
  }

  function lifeSupport() {
    const infos = NEEDS.map(n => roomInfo(n.id));
    const avg = infos.reduce((a, r) => a + r.pct, 0) / infos.length;
    const worst = infos.some(r => r.st === 'out' || r.st === 'crit') ? 'crit' : infos.some(r => r.st === 'low') ? 'low' : 'ok';
    return { avg, worst, infos };
  }

  function statusMessage(ls) {
    const out = NEEDS.filter((n, i) => ls.infos[i].st === 'out');
    if (out.length) return `${out.map(n => n.name).join(', ')} ${out.length > 1 ? 'are' : 'is'} out. Send one application and the lights come back on.`;
    if (ls.worst === 'crit') return 'A room is running on fumes. Today’s the day to send one.';
    if (ls.worst === 'low') return 'Supplies are getting low. Scout a posting or finish the one you’ve got.';
    return 'All systems holding. Keep the search moving.';
  }

  function roomCard(n) {
    const r = roomInfo(n.id);
    const j = r.job;
    let body;
    if (j) {
      const done = PHASES.filter(p => p.id === 'found' || j.steps[p.id]).length;
      const nx = nextPhase(j);
      body = `
        <div class="room-line"><span class="tag ${r.st}">${ST_LABEL[r.st]}</span>
          <span>${r.left > 0 ? 'Send in' : 'Overdue'} <span class="clock ${r.left <= 0 ? 'over' : ''}" data-dl="${r.deadline}">${fmtLeft(r.left)}</span></span></div>
        <div class="job-mini"><b>${esc(j.title)}</b>${j.company ? ` <span class="co">· ${esc(j.company)}</span>` : ''}</div>
        <div class="pips">${PHASES.map((p, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</div>
        ${nx ? `<div class="next">Next: ${nx.t.toLowerCase()} · aim for ${niceDate(phaseTarget(j, nx))}</div>` : ''}`;
    } else {
      body = `
        <div class="room-line"><span class="tag ${r.st}">${ST_LABEL[r.st]}</span>
          <span>No posting · ${r.left > 0 ? 'lasts' : 'empty for'} <span class="clock ${r.left <= 0 ? 'over' : ''}" data-dl="${r.deadline}">${fmtLeft(r.left)}</span></span></div>
        <div class="scout">${icon('plus')} Scout a job for this room</div>`;
    }
    return `
      <button class="card room st-${r.st}" data-room="${n.id}">
        <div class="ico">${icon(n.id)}</div>
        <div>
          <div class="room-head"><span class="room-name">${n.name}</span><span class="room-place">${n.place}</span>
            <span class="room-pct" data-pct="${n.id}">${Math.round(r.pct * 100)}%</span></div>
          <div class="tank"><i data-tank="${n.id}" style="width:${r.pct * 100}%"></i></div>
          ${body}
        </div>
      </button>`;
  }

  function bonusCard(j) {
    const left = deadlineOf(j) - Date.now();
    const done = PHASES.filter(p => p.id === 'found' || j.steps[p.id]).length;
    const nx = nextPhase(j);
    return `
      <button class="card room" data-job="${j.id}">
        <div class="ico">${icon('crate')}</div>
        <div>
          <div class="room-head"><span class="room-name">Storeroom</span><span class="room-place">Bonus supplies</span></div>
          <div class="room-line" style="margin-top:6px">${left > 0 ? 'Send in' : 'Overdue'} <span class="clock ${left <= 0 ? 'over' : ''}" data-dl="${deadlineOf(j)}">${fmtLeft(left)}</span></div>
          <div class="job-mini"><b>${esc(j.title)}</b>${j.company ? ` <span class="co">· ${esc(j.company)}</span>` : ''}</div>
          <div class="pips">${PHASES.map((p, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</div>
          ${nx ? `<div class="next">Next: ${nx.t.toLowerCase()} · aim for ${niceDate(phaseTarget(j, nx))}</div>` : ''}
        </div>
      </button>`;
  }

  function renderSilo() {
    const ls = lifeSupport();
    const bonus = activeJobs().filter(j => j.room === 'bonus').sort((a, b) => deadlineOf(a) - deadlineOf(b));
    const caches = sentJobs().filter(j => j.room === 'bonus').length;
    const dayIdx = Math.floor(fromKey(todayKey()).getTime() / DAY);
    $('view-silo').innerHTML = `
      <div class="status ${ls.worst}">
        <span class="lamp" aria-hidden="true"></span>
        <div>
          <div class="lbl">Life support</div>
          <div class="big" data-ls>${Math.round(ls.avg * 100)}%</div>
        </div>
        <div class="msg">${statusMessage(ls)}</div>
      </div>

      <h2 class="sec">Core supplies <span class="count">${NEEDS.filter(n => jobInRoom(n.id)).length}/5 with a posting</span></h2>
      <div class="rooms">${NEEDS.map(roomCard).join('')}</div>

      <h2 class="sec">Supply depot <span class="count">bonus</span></h2>
      <div class="rooms">${bonus.map(bonusCard).join('')}</div>
      <div class="card depot-cache" style="margin-top:${bonus.length ? 10 : 0}px">
        <div style="flex:1">
          <div class="room-name" style="font-size:15px">Sealed caches: <span class="mono">${caches}</span></div>
          <div class="hint" style="margin:2px 0 0">Found more postings than rooms? Each extra one gets its own storeroom. Same deadline, but once it’s sent it never needs refilling.</div>
          ${caches ? `<div class="crates" style="margin-top:8px">${icon('crate').repeat(Math.min(caches, 40))}</div>` : ''}
          <button class="btn small ghost add-bonus" id="addBonus">${icon('plus')} Open a storeroom</button>
        </div>
      </div>

      <div class="transmission">
        <div>&gt; ${esc(TRANSMISSIONS[dayIdx % TRANSMISSIONS.length])}</div>
        <div class="from">— transmission from outside</div>
      </div>

      <button class="btn fab" id="fab">${icon('plus')} New posting</button>`;

    document.querySelectorAll('#view-silo [data-room]').forEach(el => el.onclick = () => {
      const j = jobInRoom(el.dataset.room);
      j ? openJob(j.id) : editJob(null, el.dataset.room);
    });
    document.querySelectorAll('#view-silo [data-job]').forEach(el => el.onclick = () => openJob(el.dataset.job));
    $('addBonus').onclick = () => editJob(null, 'bonus');
    $('fab').onclick = () => editJob(null);
  }

  function itemRow(j, right) {
    const ic = j.room === 'bonus' ? 'crate' : j.room;
    const where = j.room === 'bonus' ? 'Storeroom' : needOf(j.room).name;
    return `
      <button class="card item" data-job="${j.id}">
        <div class="ico">${icon(ic)}</div>
        <div class="body"><div class="t">${esc(j.title)}</div><div class="s">${esc(j.company || '—')} · ${where}</div></div>
        <div class="r">${right}</div>
      </button>`;
  }

  function renderMissions() {
    const act = activeJobs().sort((a, b) => deadlineOf(a) - deadlineOf(b));
    const sent = sentJobs().reverse();
    const aside = state.jobs.filter(j => j.status === 'dropped').sort((a, b) => b.droppedAt - a.droppedAt);
    const outTxt = j => j.outcome === 'interview' ? `<span class="tag ok">${icon('signal')} Interview</span>` : j.outcome === 'no' ? '<span class="tag neutral">Closed</span>' : 'Waiting';
    $('view-missions').innerHTML = `
      <h2 class="sec">In progress <span class="count">${act.length}</span></h2>
      <div class="list">${act.length ? act.map(j => {
        const left = deadlineOf(j) - Date.now();
        return itemRow(j, `${left <= 0 ? 'Overdue ' : ''}<span class="clock ${left <= 0 ? 'over' : ''}" data-dl="${deadlineOf(j)}">${fmtLeft(left)}</span><br>${left <= 0 ? 'was due' : 'by'} ${niceDate(deadlineOf(j))}`);
      }).join('') : '<div class="empty">No postings in progress. Tap <b>New posting</b> on the Silo screen when you find one.</div>'}</div>

      <h2 class="sec">Sent <span class="count">${sent.length}</span></h2>
      <div class="list">${sent.length ? sent.map(j => itemRow(j, `${niceDate(j.steps.submitted)}<br>${outTxt(j)}`)).join('') : '<div class="empty">Nothing sent yet. The first one is the hardest.</div>'}</div>

      ${aside.length ? `<h2 class="sec">Set aside <span class="count">${aside.length}</span></h2>
      <div class="list">${aside.map(j => itemRow(j, `Set aside<br>${niceDate(j.droppedAt)}`)).join('')}</div>` : ''}`;
    document.querySelectorAll('#view-missions [data-job]').forEach(el => el.onclick = () => openJob(el.dataset.job));
  }

  // Applications sent per week, last 8 weeks (weeks start Monday). Single series, so no legend.
  function weeklyChart(sent) {
    const mon = fromKey(todayKey()); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = addDays(mon, -7 * i).getTime(); const end = addDays(mon, -7 * i + 7).getTime();
      weeks.push({ start, n: sent.filter(j => j.steps.submitted >= start && j.steps.submitted < end).length });
    }
    const W = 320, H = 130, top = 18, bottom = 22, gap = 10, bw = (W - gap * 9) / 8;
    const max = Math.max(5, ...weeks.map(w => w.n));
    const bars = weeks.map((w, i) => {
      const x = gap + i * (bw + gap); const h = (H - top - bottom) * w.n / max; const y = H - bottom - h;
      const d = new Date(w.start);
      const lbl = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
      return `<g><title>Week of ${lbl}: ${w.n} sent</title>
        ${w.n ? `<path class="bar" d="M${x},${H - bottom} V${y + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${H - bottom} Z" />
        <text class="val" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle">${w.n}</text>` : ''}
        <rect x="${x}" y="${top}" width="${bw}" height="${H - top - bottom}" fill="transparent" />
        <text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${i === 7 ? 'now' : lbl.split(' ')[1]}</text></g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Applications sent per week, last 8 weeks">
      <line class="base" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" />${bars}</svg>`;
  }

  function renderClimb() {
    const s = stats();
    const got = earnedBadges(s);
    const goal = NEEDS.length;
    $('view-climb').innerHTML = `
      <div class="card hero">
        <div class="num">${s.sent.length}</div>
        <div class="cap">Applications sent</div>
      </div>

      <h2 class="sec">This supply cycle <span class="count">last 3 weeks</span></h2>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span class="room-name" style="font-size:16px">${Math.min(s.inCycle.length, goal)} of ${goal} sent</span>
          <span class="mono" style="color:var(--muted);font-size:14px">${s.inCycle.length} total</span>
        </div>
        <div class="cycle">${Array.from({ length: goal }, (_, i) => `<i class="${i < s.inCycle.length ? 'on' : ''}">${i < s.inCycle.length ? icon('check') : ''}</i>`).join('')}</div>
        <div class="hint">Five rooms × one refill each, every ~3 weeks (2 weeks to find a posting, 1 to send it) = at least 5 applications per cycle. ${s.inCycle.length >= goal ? 'Cycle target met. Anything more is a bonus.' : `${goal - s.inCycle.length} to go.`}</div>
      </div>

      <h2 class="sec">Sent per week</h2>
      <div class="card chart">${weeklyChart(s.sent)}</div>

      <h2 class="sec">Logbook</h2>
      <div class="tiles">
        <div class="card tile"><div class="v">${s.interviews}</div><div class="k">Interviews (signals)</div></div>
        <div class="card tile"><div class="v">${s.sent.length ? Math.round(100 * s.onTime / s.sent.length) + '%' : '—'}</div><div class="k">Sent on time</div></div>
        <div class="card tile"><div class="v">${s.sent.length ? s.avgDays.toFixed(1) + 'd' : '—'}</div><div class="k">Avg find → send</div></div>
        <div class="card tile"><div class="v">${s.caches}</div><div class="k">Bonus caches sealed</div></div>
      </div>

      <h2 class="sec">Badges <span class="count">${got.length}/${BADGES.length}</span></h2>
      <div class="badges">${BADGES.map(b => `
        <div class="card badge ${got.includes(b.id) ? 'got' : ''}">
          <div class="medal">${icon(b.id === 'signal' ? 'signal' : b.id === 'bonus' ? 'crate' : 'stairs')}</div>
          <div><div class="n">${b.n}</div><div class="d">${b.d}</div></div>
        </div>`).join('')}</div>`;
  }

  // Every second: tick the clocks and drain the tanks. Every minute: full redraw (statuses change).
  function tick() {
    const now = Date.now();
    document.querySelectorAll('[data-dl]').forEach(el => {
      const left = +el.dataset.dl - now;
      el.textContent = fmtLeft(left);
      el.classList.toggle('over', left <= 0);
    });
    if (view === 'silo') {
      NEEDS.forEach(n => {
        const r = roomInfo(n.id, now);
        const t = document.querySelector(`[data-tank="${n.id}"]`); if (t) t.style.width = `${r.pct * 100}%`;
        const p = document.querySelector(`[data-pct="${n.id}"]`); if (p) p.textContent = `${Math.round(r.pct * 100)}%`;
      });
    }
  }
  setInterval(tick, 1000);
  setInterval(() => { if ($('modal').classList.contains('hidden')) renderAll(); }, 60000);

  // ---------- Modal ----------
  let onModalClose = null;
  function openModal(html, onClose) {
    $('modalCard').innerHTML = html; $('modal').classList.remove('hidden'); onModalClose = onClose || null;
  }
  function closeModal() {
    $('modal').classList.add('hidden'); $('modalCard').innerHTML = '';
    const f = onModalClose; onModalClose = null; if (f) f();
    renderAll();
  }
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) closeModal(); });

  function confirmBox(title, body, yes, fn, danger) {
    openModal(`<h3>${title}</h3><p class="sub">${body}</p>
      <div class="row"><button class="btn ghost" id="cNo">Cancel</button><button class="btn ${danger ? 'danger' : ''}" id="cYes">${yes}</button></div>`);
    $('cNo').onclick = closeModal;
    $('cYes').onclick = () => { fn(); };
  }

  // ---------- Add / edit a posting ----------
  function roomOptions(current) {
    const free = NEEDS.filter(n => !jobInRoom(n.id) || n.id === current);
    // Suggest the emptiest free room first.
    free.sort((a, b) => roomInfo(a.id).pct - roomInfo(b.id).pct);
    return free.map(n => `<option value="${n.id}">${n.name} · ${n.place} (${Math.round(roomInfo(n.id).pct * 100)}% left)</option>`).join('') +
      `<option value="bonus">Bonus storeroom (extra supplies)</option>`;
  }

  function editJob(id, room) {
    const j = id ? state.jobs.find(x => x.id === id) : null;
    const cur = j ? j.room : room;
    openModal(`
      <button class="close-x" id="mX" aria-label="Close">×</button>
      <h3>${j ? 'Edit posting' : 'New posting found'}</h3>
      <p class="sub">${j ? 'Change the details.' : `Phase 1 done. The clock starts now: send it within ${state.turnaround} days.`}</p>
      <label class="field"><span>Job title</span><input id="fT" required maxlength="120" placeholder="e.g. Operations Manager" value="${esc(j?.title)}" /></label>
      <label class="field"><span>Company</span><input id="fC" maxlength="120" placeholder="e.g. Northwind" value="${esc(j?.company)}" /></label>
      <label class="field"><span>Link to posting</span><input id="fL" type="url" inputmode="url" placeholder="https://" value="${esc(j?.link)}" /></label>
      <label class="field"><span>Date found</span><input id="fD" type="date" max="${todayKey()}" value="${j ? j.found : todayKey()}" /></label>
      <label class="field"><span>Which supply does it refill?</span><select id="fR">${roomOptions(j ? j.room : null)}</select></label>
      <label class="field"><span>Notes</span><textarea id="fN" placeholder="Why it’s a fit, who to contact, salary range…">${esc(j?.notes)}</textarea></label>
      <div class="row"><button class="btn ghost" id="mCancel">Cancel</button><button class="btn" id="mSave">${j ? 'Save' : 'Post to the silo'}</button></div>`);
    if (cur) $('fR').value = cur;
    $('mX').onclick = $('mCancel').onclick = closeModal;
    $('mSave').onclick = () => {
      const title = $('fT').value.trim();
      if (!title) { $('fT').focus(); toast('Give it a job title.'); return; }
      let found = $('fD').value || todayKey();
      if (found > todayKey()) found = todayKey();
      const link = $('fL').value.trim();
      const data = { title, company: $('fC').value.trim(), link: link && !/^https?:\/\//i.test(link) ? 'https://' + link : link, found, room: $('fR').value, notes: $('fN').value.trim() };
      if (j) Object.assign(j, data);
      else state.jobs.push({ id: uid(), status: 'active', created: Date.now(), steps: { resume: 0, cover: 0, submitted: 0 }, outcome: null, ...data });
      save();
      const newId = j ? j.id : state.jobs[state.jobs.length - 1].id;
      onModalClose = null;
      if (!j) toast(data.room === 'bonus' ? 'Storeroom opened. Clock is ticking.' : `${needOf(data.room).name} room has a posting. Clock is ticking.`);
      openJob(newId);
    };
    if (!j) setTimeout(() => $('fT')?.focus(), 250);
  }

  // ---------- A posting's four phases ----------
  function openJob(id) {
    const j = state.jobs.find(x => x.id === id);
    if (!j) return closeModal();
    const dl = deadlineOf(j);
    const where = j.room === 'bonus' ? 'Bonus storeroom' : `${needOf(j.room).name} · ${needOf(j.room).place}`;
    const active = j.status === 'active';
    const phaseRow = p => {
      const done = p.id === 'found' || !!j.steps[p.id];
      const when = p.id === 'found' ? `Found ${niceDate(fromKey(j.found))}`
        : done ? `Done ${niceDate(j.steps[p.id])}`
        : `Aim for ${niceDate(phaseTarget(j, p))}`;
      const late = !done && Date.now() > addDays(phaseTarget(j, p), 1).getTime();
      const dis = p.id === 'found' || (p.id === 'submitted' && j.status === 'dropped');
      return `<button class="phase ${done ? 'done' : ''} ${p.id === 'submitted' ? 'final' : ''}" data-phase="${p.id}" ${dis ? 'disabled' : ''}>
        <span class="box">${icon('check')}</span>
        <span><span class="pn">${p.n}</span><div class="pt">${p.t}</div><div class="pd ${late ? 'late' : ''}">${when}${late ? ' · behind' : ''}</div></span>
      </button>`;
    };
    const left = dl - Date.now();
    openModal(`
      <button class="close-x" id="mX" aria-label="Close">×</button>
      <h3>${esc(j.title)}</h3>
      <p class="sub">${j.company ? esc(j.company) + ' · ' : ''}${where}${j.link ? ` · <a href="${esc(j.link)}" target="_blank" rel="noopener">Open posting</a>` : ''}</p>
      ${active ? `<div class="countdown"><span class="clock ${left <= 0 ? 'over' : ''}" data-dl="${dl}">${fmtLeft(left)}</span>
        <span class="by">${left > 0 ? `Send by end of ${niceDate(dl)}` : `Was due ${niceDate(dl)}. Late still counts. Send it.`}</span></div>` : ''}
      ${j.status === 'submitted' ? `<div class="countdown"><span class="tag ok">${icon('check')} Sent ${niceDate(j.steps.submitted)}</span>
        <div class="by" style="margin-top:8px">Heard back?</div>
        <div class="row" style="margin-top:8px">
          <button class="btn small ${j.outcome === 'interview' ? '' : 'ghost'}" id="oYes">${icon('signal')} Interview!</button>
          <button class="btn small ${j.outcome === 'no' ? '' : 'ghost'}" id="oNo">Not this time</button>
        </div></div>` : ''}
      ${j.status === 'dropped' ? `<div class="countdown"><span class="tag neutral">Set aside ${niceDate(j.droppedAt)}</span></div>` : ''}
      <div class="phases">${PHASES.map(phaseRow).join('')}</div>
      ${j.notes ? `<h2 class="sec">Notes</h2><div class="notes">${esc(j.notes)}</div>` : ''}
      <div class="row" style="margin-top:18px">
        <button class="btn small ghost" id="jEdit">Edit</button>
        ${active ? '<button class="btn small ghost" id="jDrop">Set aside</button>' : ''}
        ${j.status === 'dropped' ? '<button class="btn small ghost" id="jBack">Bring back</button>' : ''}
        <button class="btn small ghost" id="jDel">Delete</button>
      </div>`);
    $('mX').onclick = closeModal;
    $('jEdit').onclick = () => editJob(j.id);
    document.querySelectorAll('[data-phase]').forEach(el => el.onclick = () => togglePhase(j, el.dataset.phase));
    if ($('oYes')) $('oYes').onclick = () => setOutcome(j, 'interview');
    if ($('oNo')) $('oNo').onclick = () => setOutcome(j, 'no');
    if ($('jDrop')) $('jDrop').onclick = () => confirmBox('Set this one aside?',
      `Posting closed or not a fit? That’s fine. ${j.room === 'bonus' ? 'The storeroom closes.' : `The ${needOf(j.room).name.toLowerCase()} room goes back to its 2-week supply clock from its last refill, so find another posting soon.`}`,
      'Set aside', () => { j.status = 'dropped'; j.droppedAt = Date.now(); save(); closeModal(); });
    if ($('jBack')) $('jBack').onclick = () => {
      if (j.room !== 'bonus' && jobInRoom(j.room)) j.room = 'bonus';
      j.status = 'active'; delete j.droppedAt; save(); openJob(j.id);
    };
    $('jDel').onclick = () => confirmBox('Delete this posting?', 'It’s removed from your records for good. (To keep the history, use “Set aside” instead.)', 'Delete', () => {
      if (j.status === 'submitted') unsubmit(j);
      state.jobs = state.jobs.filter(x => x.id !== j.id); save(); closeModal();
    }, true);
  }

  function togglePhase(j, id) {
    if (id === 'submitted') {
      if (j.status === 'submitted') return confirmBox('Mark as not sent?', 'This undoes the refill.', 'Undo send', () => { unsubmit(j); save(); openJob(j.id); });
      const missing = PHASES.filter(p => (p.id === 'resume' || p.id === 'cover') && !j.steps[p.id]);
      if (missing.length) return confirmBox('Send it now?', `${missing.map(p => p.t).join(' and ')} ${missing.length > 1 ? 'aren’t' : 'isn’t'} checked off yet. If it’s sent, it’s sent.`, 'Yes, it’s sent', () => submit(j));
      return submit(j);
    }
    j.steps[id] = j.steps[id] ? 0 : Date.now();
    save(); openJob(j.id);
  }

  function submit(j) {
    const now = Date.now();
    const before = j.room !== 'bonus' && j.status === 'active' ? roomInfo(j.room, now).pct : 0;
    j.steps.submitted = now; j.status = 'submitted';
    PHASES.forEach(p => { if (p.id !== 'found' && !j.steps[p.id]) j.steps[p.id] = now; });
    if (j.room !== 'bonus') {
      j.prevRefill = state.rooms[j.room].refilled;
      state.rooms[j.room].refilled = now;
    }
    save();
    celebrate(j, before);
  }

  function unsubmit(j) {
    // Only roll the room back if nothing else has refilled it since.
    if (j.room !== 'bonus' && state.rooms[j.room].refilled === j.steps.submitted && j.prevRefill) state.rooms[j.room].refilled = j.prevRefill;
    j.status = 'active'; j.steps.submitted = 0; delete j.prevRefill;
    if (j.room !== 'bonus' && activeJobs().some(x => x !== j && x.room === j.room)) j.room = 'bonus';
  }

  function setOutcome(j, o) {
    j.outcome = j.outcome === o ? null : o; j.outcomeAt = Date.now(); save();
    if (j.outcome === 'interview') {
      confetti(); chime(true);
      openModal(`<div class="refill"><svg class="ico" viewBox="0 0 24 24"><use href="#i-signal" /></svg>
        <h3>Signal from outside!</h3><p class="sub">${esc(j.company || j.title)} wants to talk. Someone out there can see the silo. Prep, breathe, and go show them who you are.</p>
        <button class="btn block" id="ok">Back to the silo</button></div>`);
      $('ok').onclick = closeModal;
      checkBadges();
    } else openJob(j.id);
  }

  function celebrate(j, before) {
    const bonus = j.room === 'bonus';
    const n = bonus ? null : needOf(j.room);
    const ls = lifeSupport();
    const left = 5 - stats().inCycle.length;
    openModal(`<div class="refill">
      <svg class="ico" viewBox="0 0 24 24"><use href="#i-${bonus ? 'crate' : n.id}" /></svg>
      <h3>${bonus ? 'Cache sealed' : `${n.name} restored`}</h3>
      <p class="sub">${bonus
        ? 'Extra supplies stocked in the depot. This one never needs refilling.'
        : `The ${n.place.toLowerCase()} is back to full. It holds for ${state.drain} days: find its next posting before then.`}</p>
      ${bonus ? '' : `<div class="tank"><i id="fillBar" style="width:${before * 100}%"></i></div>`}
      <p class="sub mono" style="color:var(--term)">Application sent: ${esc(j.title)}${j.company ? ' · ' + esc(j.company) : ''}<br>
      ${left > 0 ? `${left} more this cycle to keep all 5 rooms full.` : 'Cycle target met. Life support at ' + Math.round(ls.avg * 100) + '%.'}</p>
      <button class="btn block" id="ok">Back to the silo</button></div>`);
    requestAnimationFrame(() => setTimeout(() => { const b = $('fillBar'); if (b) b.style.width = '100%'; }, 80));
    $('ok').onclick = closeModal;
    confetti(); chime();
    checkBadges();
  }

  // ---------- Settings ----------
  function openSettings(first) {
    const turnOpts = TURNAROUND_CHOICES.map(d => `<option value="${d}">${d} days${d === 5 ? ' (recommended)' : d === 7 ? ' (one week)' : ''}</option>`).join('');
    openModal(`
      ${first ? '' : '<button class="close-x" id="mX" aria-label="Close">×</button>'}
      <h3>${first ? 'Welcome to the silo' : 'Settings'}</h3>
      ${first ? `<p class="sub">Your current job is the silo. Out there, somewhere, is something better. Every application you send keeps the silo alive while you search for the way out.</p>
        <div class="advice" style="margin-bottom:12px">
          <b>How it works</b><br>
          Five rooms keep the silo alive: oxygen, water, food, power and medicine.<br>
          • Find a posting and assign it to a room. You have <b>${state.turnaround} days</b> to send it, and the room drains on that clock.<br>
          • Each posting moves through 4 phases: identify, tailor the resume, cover letter & materials, submit.<br>
          • Submitting refills the room. An empty room lasts <b>${state.drain} days</b>, so find its next posting before then.<br>
          • Found extra postings? Open a bonus storeroom. Same deadline, but once sent it never needs refilling.
        </div>` : ''}
      <label class="field"><span>Your name</span><input id="sName" maxlength="40" placeholder="Name" value="${esc(state.name)}" /></label>
      <label class="field"><span>Send applications within</span><select id="sTurn">${turnOpts}</select></label>
      <div class="advice"><b>Recommended: 5 days.</b> Postings get the most attention in their first few days. Many recruiters start screening the first batch right away, and plenty of roles close or fill within 2 to 3 weeks. 3–5 days keeps you near the front of the line without rushing the tailoring. A week is a good ceiling.</div>
      <label class="field"><span>Empty rooms last</span><select id="sDrain">${DRAIN_CHOICES.map(d => `<option value="${d}">${d} days${d === 14 ? ' (two weeks)' : ''}</option>`).join('')}</select></label>
      <label class="field" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="sSound" style="width:auto" ${state.sound ? 'checked' : ''} /> <span style="margin:0">Sound effects</span></label>
      ${first ? '' : `
        <h2 class="sec">Backup</h2>
        <p class="hint">Everything is saved only on this phone. Download a backup now and then.</p>
        <div class="row"><button class="btn small ghost" id="bDown">Download backup</button><label class="btn small ghost" for="bUp">Restore backup</label><input type="file" id="bUp" accept="application/json,.json" hidden /></div>
        <div class="row" style="margin-top:10px"><button class="btn small danger" id="bErase">Erase everything</button></div>
        <p class="hint" style="margin-top:16px">Utopia is an unofficial, fan-made app inspired by the TV series <i>Silo</i>. It isn’t connected to the show or its makers.</p>`}
      <button class="btn block" id="sSave" style="margin-top:16px">${first ? 'Enter the silo' : 'Save'}</button>`);
    $('sTurn').value = state.turnaround; $('sDrain').value = state.drain;
    if ($('mX')) $('mX').onclick = closeModal;
    $('sSave').onclick = () => {
      state.name = $('sName').value.trim();
      state.turnaround = +$('sTurn').value; state.drain = +$('sDrain').value; state.sound = $('sSound').checked;
      state.welcomed = true; save(); closeModal();
      if (first) toast('Good luck out there. Start by scouting a posting.');
    };
    if (first) return;
    $('bDown').onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `utopia-backup-${todayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $('bUp').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => {
        const s = JSON.parse(t); if (!s || !Array.isArray(s.jobs) || !s.rooms) throw new Error('bad');
        localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); closeModal(); toast('Backup restored.');
      }).catch(() => toast('That file isn’t a Utopia backup.'));
    };
    $('bErase').onclick = () => confirmBox('Erase everything?', 'Every posting, room and badge is wiped from this phone. This can’t be undone.', 'Erase', () => {
      localStorage.removeItem(STORE_KEY); state = load(); save(); closeModal(); openSettings(true);
    }, true);
  }

  // ---------- Toast, confetti, sound ----------
  let toastT;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 3200);
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('confetti'); const ctx = c.getContext('2d');
    c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio);
    const colors = ['#e8a33d', '#9fd8a8', '#ece4d6', '#6fa8c8', '#e5604a'];
    const bits = Array.from({ length: 120 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .45,
      vx: (Math.random() - .5) * 12, vy: -Math.random() * 14 - 4, s: 4 + Math.random() * 5,
      r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach(b => { b.vy += .45; b.x += b.vx; b.y += b.vy; b.r += b.vr; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * .6); ctx.restore(); });
      if (now - t0 < 2600) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  // A rising hum of the pumps coming back on, then a bright chime.
  let actx;
  function chime(signal) {
    if (!state.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime;
      const tone = (f, at, dur, type = 'sine', vol = .18, f2) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + at + dur);
        g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(vol, t + at + .03); g.gain.exponentialRampToValueAtTime(.001, t + at + dur);
        o.connect(g); g.connect(actx.destination); o.start(t + at); o.stop(t + at + dur + .05);
      };
      if (signal) { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .5, 'triangle')); return; }
      tone(70, 0, 1.1, 'sawtooth', .06, 160);
      tone(659, .9, .5); tone(988, 1.05, .8);
    } catch (e) { /* no audio, no problem */ }
  }

  // ---------- Navigation ----------
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    view = b.dataset.view;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    renderAll(); window.scrollTo(0, 0);
  });
  $('settingsBtn').onclick = () => openSettings(false);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && $('modal').classList.contains('hidden')) renderAll(); });

  save();
  renderAll();
  if (!state.welcomed) openSettings(true);
})();

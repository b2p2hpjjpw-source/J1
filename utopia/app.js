/* Utopia — a job application tracker inspired by the TV series Silo.
 * The current job is the silo: 144 levels underground, one spiral staircase, a screen in the cafeteria showing the dead hills. Every application sent refills one of its supplies, on the way to somewhere better.
 * Five core rooms (oxygen, water, food, power, medicine) drain over 2 weeks with no posting in them,
 * or over the turnaround window (1 week by default) once a posting is assigned. Submitting refills the room.
 * Porter runs hold extra postings: same deadline, but once sent they're a crate in Supply that never needs refilling.
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
    { id: 'oxygen', name: 'Oxygen', place: 'Air Handling', zone: 'Up Top', out: 'The air is going stale', who: 'Walker',
      say: { low: 'Air’s getting thin up there. Don’t make me climb all those stairs to check.', crit: 'I can taste the stale air from Down Deep. Send something.', out: 'The fans are down. That posting won’t send itself.' } },
    { id: 'water', name: 'Water', place: 'Water Treatment', zone: 'Down Deep', out: 'The pumps have run dry', who: 'Shirley',
      say: { low: 'Pumps are slowing. We could use a refill soon.', crit: 'Pressure’s dropping fast. We need that application.', out: 'Tanks are dry. Get one out today.' } },
    { id: 'food', name: 'Food', place: 'Hydroponics', zone: 'Mid', out: 'The grow lights are going dark', who: 'Mayor Jahns',
      say: { low: 'We may have to start rationing the grow lights.', crit: 'I’m drafting a rationing order. Please make it unnecessary.', out: 'The farms are dark. The whole silo is counting on you.' } },
    { id: 'power', name: 'Power', place: 'Mechanical', zone: 'Down Deep', out: 'The generator is failing', who: 'Knox',
      say: { low: 'Generator’s running rough. Find us a posting.', crit: 'She’s coughing. Mechanical needs that refill now.', out: 'Generator’s down. Send one and we’ll get her turning again.' } },
    { id: 'medicine', name: 'Medicine', place: 'Medical', zone: 'Mid', out: 'The medical shelves are empty', who: 'Dr. Nichols',
      say: { low: 'The shelves are thinning. A posting would help.', crit: 'I’m down to the last of the supplies. Please hurry.', out: 'Medical is empty. One application is the cure.' } },
  ];

  // The climb: he starts Down Deep on level 144. Every application sent is one flight of stairs (6 levels) up,
  // an interview is two more, and an offer opens the airlock: outside, to Utopia.
  const LEVELS = 144;
  const FLIGHT = 6;
  // His rank on the way up, by flights climbed. Like Juliette, he starts as a mechanic Down Deep.
  const RANKS = [
    { at: 0, n: 'Mechanic', d: 'Down Deep, where Juliette started' },
    { at: 2, n: 'Porter', d: 'Carrying the load up the stairs' },
    { at: 5, n: 'Shadow', d: 'Learning the job above your station' },
    { at: 8, n: 'Deputy', d: 'Mid levels. People are starting to notice.' },
    { at: 16, n: 'Sheriff', d: 'Up Top. The badge Holston wore.' },
    { at: 23, n: 'At the airlock', d: 'One door left' },
  ];
  const rankOf = s => s.offers ? { n: 'Outside', d: 'You said the words and walked out' } : [...RANKS].reverse().find(r => (LEVELS - s.level) / FLIGHT >= r.at);
  const needOf = id => NEEDS.find(n => n.id === id);

  // The four phases between finding a posting and getting it in front of a hiring manager.
  // `by` is how far through the turnaround window each step should ideally be done.
  const PHASES = [
    { id: 'found', n: 'Phase 1', t: 'Identify the job', by: 0 },
    { id: 'resume', n: 'Phase 2', t: 'Tailor the resume', by: 0.4 },
    { id: 'cover', n: 'Phase 3', t: 'Cover letter & materials', by: 0.75 },
    { id: 'submitted', n: 'Phase 4', t: 'Submit the application', by: 1 },
  ];

  // One note a day. Lines in a character's name are written in their spirit, not quoted from the show.
  const TRANSMISSIONS = [
    ['Fix the thing in front of you. Then fix the next thing. That’s how you get anywhere.', 'Walker, Mechanical'],
    ['Somebody always has to be the first one up the stairs.', 'Juliette, Mechanical'],
    ['Ask the question. Even when everyone tells you not to.', 'Allison, IT'],
    ['The view they show you isn’t the whole truth. Go find out what is.', 'Holston, Sheriff’s office'],
    ['Find one clear patch of sky. That’s enough to keep going.', 'Lukas, IT'],
    ['A good mechanic doesn’t wait for the generator to quit.', 'Knox, Mechanical'],
    ['Relics are proof there was more out there. There still is.', 'George, Up Top'],
    ['They told us to keep our heads down. Keep your eyes up anyway.', 'Dr. Nichols, Medical'],
    ['Hold on to what you’re fighting for. Then go get it.', 'Shirley, Mechanical'],
    ['Nobody hands you the keys to the airlock. You build your own way out.', 'Juliette, Sheriff'],
    'Somebody always has to be the first one up the stairs.',
    'Down Deep they fix what’s broken. Up Top they dream about the view. Do both.',
    'The Pact says don’t talk about outside. You’re allowed to want more than this.',
    'Every relic is proof there was a world before this one. There’s one after it, too.',
    'The screen shows dead hills because nobody’s cleaned the lens lately. Go clean it.',
    'Porters carry the whole silo on their backs, one flight at a time. So can you.',
    'They kept you in the dark by keeping you busy. Make time for the climb.',
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
    { id: 'first', n: 'Allison’s Question', d: 'First application sent: you asked what’s out there', ic: 'stairs' },
    { id: 'quick', n: 'Walker’s Toolbox', d: 'Sent within 2 days of finding it', ic: 'wrench' },
    { id: 'lens', n: 'Lukas’s Stars', d: '5 sent in one cycle: the lens is clear enough to see the sky', ic: 'lens' },
    { id: 'full', n: 'Knox’s Crew', d: 'All 5 rooms refilled within 3 weeks', ic: 'gauge' },
    { id: 'bonus', n: 'Porter', d: 'First bonus supply run delivered', ic: 'crate' },
    { id: 'mid', n: 'Deputy’s Badge', d: 'Climbed into the Mid levels', ic: 'stairs' },
    { id: 'signal', n: 'Signal From Outside', d: 'First interview', ic: 'signal' },
    { id: 'uptop', n: 'Sheriff’s Star', d: 'Climbed Up Top, past level 48', ic: 'star' },
    { id: 'quarter', n: 'Porter’s Legs', d: '25 applications sent', ic: 'stairs' },
    { id: 'utopia', n: 'I Want to Go Out', d: 'Got the offer. You’re outside.', ic: 'sun' },
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
    if (window.FamilySync) FamilySync.changed(STORE_KEY);
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
    const interviews = state.jobs.filter(j => j.outcome === 'interview' || j.outcome === 'offer').length;
    const offers = state.jobs.filter(j => j.outcome === 'offer').length;
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
    const level = offers ? 0 : Math.max(1, LEVELS - FLIGHT * (sent.length + 2 * interviews));
    const lens = Math.min(1, inCycle.length / NEEDS.length);
    return { sent, inCycle, coreInCycle, interviews, offers, onTime, avgDays, caches, full, quick, level, lens, best: Math.max(state.bestCycle || 0, inCycle.length) };
  }

  function earnedBadges(s = stats()) {
    const n = s.sent.length;
    return BADGES.filter(b => ({
      first: n >= 1, quick: s.quick, lens: s.best >= NEEDS.length, full: s.full, bonus: s.caches >= 1,
      mid: s.level <= 96, signal: s.interviews >= 1, uptop: s.level <= 48, quarter: n >= 25, utopia: s.offers >= 1,
    })[b.id]).map(b => b.id);
  }

  function checkBadges() {
    state.bestCycle = stats().best; save();
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
    const lvl = stats().level;
    $('hello').textContent = `${state.name ? state.name + ' · ' : ''}${rankOf(stats()).n} · ${lvl ? `Level ${lvl}` : 'Outside'} · Day ${day}`;
  }

  function lifeSupport() {
    const infos = NEEDS.map(n => roomInfo(n.id));
    const avg = infos.reduce((a, r) => a + r.pct, 0) / infos.length;
    const worst = infos.some(r => r.st === 'out' || r.st === 'crit') ? 'crit' : infos.some(r => r.st === 'low') ? 'low' : 'ok';
    return { avg, worst, infos };
  }

  function statusMessage(ls) {
    const out = NEEDS.filter((n, i) => ls.infos[i].st === 'out');
    if (out.length === 1) return `${out[0].out}. Send one application and the lights come back on.`;
    if (out.length) return `${out.map(n => n.name).join(', ')} are out. One application at a time brings them back.`;
    if (NEEDS.some(n => jobInRoom(n.id) && roomInfo(n.id).left <= 0)) return 'Judicial has flagged an overdue posting. Send it and Sims closes the file.';
    if (ls.worst === 'crit') return 'A room is running on fumes. Today’s the day to send one.';
    if (ls.worst === 'low') return 'Supplies are getting low. Scout a posting or finish the one you’ve got.';
    return 'All systems holding. Keep the search moving.';
  }

  // The room's keeper calls up on the radio when supplies run low.
  function radio(n, st) {
    if (st === 'ok') return '';
    return `<div class="radio">${icon('radio')}<span><b>${n.who}</b> on the radio: “${n.say[st]}”</span></div>`;
  }
  const judicial = () => `<div class="judicial"><b>Judicial notice</b> · This posting is overdue and Sims has opened a file. Send it and the file closes.</div>`;

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
        ${nx ? `<div class="next">Next: ${nx.t.toLowerCase()} · aim for ${niceDate(phaseTarget(j, nx))}</div>` : ''}
        ${r.left <= 0 ? judicial() : radio(n, r.st)}`;
    } else {
      body = `
        <div class="room-line"><span class="tag ${r.st}">${ST_LABEL[r.st]}</span>
          <span>No posting · ${r.left > 0 ? 'lasts' : 'empty for'} <span class="clock ${r.left <= 0 ? 'over' : ''}" data-dl="${r.deadline}">${fmtLeft(r.left)}</span></span></div>
        ${radio(n, r.st)}
        <div class="scout">${icon('plus')} Scout a job for this room</div>`;
    }
    return `
      <button class="card room st-${r.st}" data-room="${n.id}">
        <div class="ico">${icon(n.id)}</div>
        <div>
          <div class="room-head"><span class="room-name">${n.name}</span><span class="room-place">${n.place} · ${n.zone}</span>
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
          <div class="room-head"><span class="room-name">Porter run</span><span class="room-place">Supply · bonus</span></div>
          <div class="room-line" style="margin-top:6px">${left > 0 ? 'Send in' : 'Overdue'} <span class="clock ${left <= 0 ? 'over' : ''}" data-dl="${deadlineOf(j)}">${fmtLeft(left)}</span></div>
          <div class="job-mini"><b>${esc(j.title)}</b>${j.company ? ` <span class="co">· ${esc(j.company)}</span>` : ''}</div>
          <div class="pips">${PHASES.map((p, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</div>
          ${nx ? `<div class="next">Next: ${nx.t.toLowerCase()} · aim for ${niceDate(phaseTarget(j, nx))}</div>` : ''}
          ${left <= 0 ? judicial() : ''}
        </div>
      </button>`;
  }


  // The cafeteria wall screen. A dirty lens shows the dead hills under a brown sky. Every application sent this
  // cycle cleans it a little more, until the sky turns blue and the far-off city is lit: what's waiting outside.
  // `p` (0–1) is how clean the lens is; the live layer fades in over the dead one.
  function viewScreen(p, id = '') {
    const g = `vs${id}`;
    return `<svg class="vs-svg" viewBox="0 0 360 150" role="img" aria-label="The view outside, ${Math.round(p * 100)}% clear">
      <defs>
        <linearGradient id="${g}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a342d" /><stop offset="1" stop-color="#77695a" /></linearGradient>
        <linearGradient id="${g}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8fc4" /><stop offset="1" stop-color="#cfe6ee" /></linearGradient>
        <radialGradient id="${g}g"><stop offset="0" stop-color="#1c140c" stop-opacity=".95" /><stop offset="1" stop-color="#1c140c" stop-opacity="0" /></radialGradient>
        <pattern id="${g}s" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" opacity=".22" /></pattern>
        <clipPath id="${g}c"><rect x="8" y="8" width="344" height="134" rx="6" /></clipPath>
      </defs>
      <rect width="360" height="150" rx="10" fill="#0b0907" />
      <g clip-path="url(#${g}c)">
        <rect x="0" y="0" width="360" height="150" fill="url(#${g}d)" />
        <g class="vs-live" style="opacity:${p}">
          <rect x="0" y="0" width="360" height="150" fill="url(#${g}l)" />
          <circle cx="292" cy="38" r="15" fill="#fff1c4" /><circle cx="292" cy="38" r="26" fill="#fff1c4" opacity=".25" />
          <path d="M70 40q4-4 8 0q4-4 8 0M96 30q3-3 6 0q3-3 6 0M250 58q3-3 6 0q3-3 6 0" fill="none" stroke="#2c3e4c" stroke-width="1.6" stroke-linecap="round" />
        </g>
        <!-- the far city on the horizon -->
        <g fill="#3a332c"><path d="M196 92h6v-16h5v16h4v-24h7v24h5v-12h6v12h4v-30h6v30h5v-18h7v18h4v-9h5v9z" /></g>
        <g class="vs-live" style="opacity:${p}" fill="#7d98ad"><path d="M196 92h6v-16h5v16h4v-24h7v24h5v-12h6v12h4v-30h6v30h5v-18h7v18h4v-9h5v9z" />
          <g fill="#ffe9a8"><rect x="213" y="73" width="2" height="2" /><rect x="238" y="68" width="2" height="2" /><rect x="238" y="78" width="2" height="2" /><rect x="251" y="80" width="2" height="2" /></g></g>
        <path d="M0 98 C60 78 110 86 170 92 S290 80 360 94 V150 H0Z" fill="#4b4239" />
        <path class="vs-live" style="opacity:${p}" d="M0 98 C60 78 110 86 170 92 S290 80 360 94 V150 H0Z" fill="#6f9a5c" />
        <path d="M0 122 C70 104 140 112 200 120 S300 112 360 120 V150 H0Z" fill="#2c2620" />
        <path class="vs-live" style="opacity:${p}" d="M0 122 C70 104 140 112 200 120 S300 112 360 120 V150 H0Z" fill="#40693a" />
        <!-- the lone tree on the ridge: bare, then in leaf -->
        <path d="M120 112 V84 M120 96 l-9 -8 M120 92 l8 -9 M120 86 l-5 -7 M111 88 l-4 -1 M128 83 l3 -4" stroke="#1d1813" stroke-width="2.4" fill="none" stroke-linecap="round" />
        <g class="vs-live" style="opacity:${p}" fill="#4f8a43"><circle cx="112" cy="84" r="8" /><circle cx="127" cy="81" r="9" /><circle cx="120" cy="74" r="9" /></g>
        <g class="vs-grime" style="opacity:${0.85 * (1 - p)}">
          <rect width="360" height="150" fill="#3a2a1a" opacity=".35" />
          <ellipse cx="60" cy="40" rx="70" ry="40" fill="url(#${g}g)" /><ellipse cx="300" cy="110" rx="80" ry="45" fill="url(#${g}g)" />
          <ellipse cx="190" cy="20" rx="60" ry="26" fill="url(#${g}g)" /><ellipse cx="30" cy="130" rx="50" ry="30" fill="url(#${g}g)" />
        </g>
        <rect width="360" height="150" fill="url(#${g}s)" />
      </g>
      <rect x="8" y="8" width="344" height="134" rx="6" fill="none" stroke="#000" stroke-width="2" />
      <g fill="#4a4036"><circle cx="16" cy="16" r="2" /><circle cx="344" cy="16" r="2" /><circle cx="16" cy="134" r="2" /><circle cx="344" cy="134" r="2" /></g>
    </svg>`;
  }

  function lensCaption(s) {
    const left = NEEDS.length - s.inCycle.length;
    if (s.offers) return 'You made it outside. This is what you were climbing toward.';
    if (left <= 0) return 'Lens clean. That’s what’s waiting outside. Keep it this way.';
    if (!s.inCycle.length) return `The lens is filthy. Send ${left} applications this cycle to see outside clearly.`;
    return `Lens ${Math.round(s.lens * 100)}% clean. ${left} more this cycle to see it clearly.`;
  }

  // The staircase: one spiral, 144 levels, drawn side-on as 24 flights. Each flight is one application.
  function shaft(s) {
    const W = 320, top = 50, bot = 560, H = 580, xl = 96, xr = 228;
    const y = lvl => top + (lvl - 1) / (LEVELS - 1) * (bot - top);
    const flights = LEVELS / FLIGHT;
    const climbed = LEVELS - Math.max(1, s.level);
    let stairs = '';
    for (let i = 0; i < flights; i++) {
      const a = LEVELS - i * FLIGHT, b = Math.max(1, a - FLIGHT);
      const x1 = i % 2 ? xr : xl, x2 = i % 2 ? xl : xr;
      const done = LEVELS - b <= climbed;
      stairs += `<line class="flight ${done ? 'done' : ''}" x1="${x1}" y1="${y(a)}" x2="${x2}" y2="${y(b)}" />
        <line class="landing" x1="${x2 - 10}" x2="${x2 + 10}" y1="${y(b)}" y2="${y(b)}" />`;
    }
    const zones = [['Up Top', 1, 48], ['Mid', 49, 96], ['Down Deep', 97, 144]].map(([n, a, b]) => `
      <rect class="zone" x="60" y="${y(a) - 2}" width="204" height="${y(b) - y(a) + 4}" />
      <text class="zone-l" x="52" y="${(y(a) + y(b)) / 2}" text-anchor="middle" transform="rotate(-90 52 ${(y(a) + y(b)) / 2})">${n}</text>`).join('');
    const me = s.level ? y(s.level) : 20;
    const mx = s.level ? (Math.round((LEVELS - s.level) / FLIGHT) % 2 ? xr : xl) : 160;
    const marks = [1, 48, 96, 144].map(l => `<text class="lvl" x="272" y="${y(l) + 4}">${l}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${s.level ? `Level ${s.level} of ${LEVELS}` : 'Outside'}">
      <path class="ground" d="M0 36 H120 M200 36 H320" />
      <path class="hill" d="M0 36 C40 22 80 26 120 36 M200 36 C240 24 290 20 320 30" />
      <rect class="airlock ${s.offers ? 'open' : ''}" x="138" y="22" width="44" height="18" rx="3" />
      <text class="lvl" x="160" y="16" text-anchor="middle">AIRLOCK · OUTSIDE</text>
      <rect class="wall" x="60" y="${top - 8}" width="204" height="${bot - top + 16}" rx="10" />
      ${zones}
      <line class="core" x1="162" x2="162" y1="${top}" y2="${bot}" />
      ${stairs}${marks}
      <text class="lvl" x="272" y="${y(144) + 18}">Mechanical</text>
      <g class="me" transform="translate(${mx} ${me})"><circle r="11" class="halo" /><circle r="6" /></g>
      <text class="me-l" x="${mx === xl ? mx + 16 : mx - 16}" y="${me + 4}" text-anchor="${mx === xl ? 'start' : 'end'}">${state.name ? esc(state.name) : 'You'}</text>
    </svg>`;
  }

  function renderSilo() {
    const ls = lifeSupport();
    const bonus = activeJobs().filter(j => j.room === 'bonus').sort((a, b) => deadlineOf(a) - deadlineOf(b));
    const caches = sentJobs().filter(j => j.room === 'bonus').length;
    const dayIdx = Math.floor(fromKey(todayKey()).getTime() / DAY);
    const s = stats();
    $('view-silo').innerHTML = `
      <div class="viewscreen">
        <div class="vs-head"><span>The view · cafeteria screen</span><span class="mono">${Math.round(s.lens * 100)}% clear</span></div>
        ${viewScreen(s.lens)}
        <div class="vs-cap">${lensCaption(s)}</div>
      </div>

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

      <h2 class="sec">Supply · porter runs <span class="count">bonus</span></h2>
      <div class="rooms">${bonus.map(bonusCard).join('')}</div>
      <div class="card depot-cache" style="margin-top:${bonus.length ? 10 : 0}px">
        <div style="flex:1">
          <div class="room-name" style="font-size:15px">Crates delivered to Supply: <span class="mono">${caches}</span></div>
          <div class="hint" style="margin:2px 0 0">Found more postings than rooms? Each extra one is a porter run. Same deadline, but once it’s sent the crate is stocked for good and never needs refilling.</div>
          ${caches ? `<div class="crates" style="margin-top:8px">${icon('crate').repeat(Math.min(caches, 40))}</div>` : ''}
          <button class="btn small ghost add-bonus" id="addBonus">${icon('plus')} Start a porter run</button>
        </div>
      </div>

      <div class="transmission">
        ${(() => { const t = TRANSMISSIONS[dayIdx % TRANSMISSIONS.length]; const [line, who] = Array.isArray(t) ? t : [t, 'transmission from outside'];
          return `<div>&gt; ${esc(line)}</div><div class="from">— ${esc(who)}</div>`; })()}
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
    const where = j.room === 'bonus' ? 'Porter run' : needOf(j.room).name;
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
    const outTxt = j => j.outcome === 'offer' ? `<span class="tag ok">${icon('sun')} Offer</span>` : j.outcome === 'interview' ? `<span class="tag ok">${icon('signal')} Interview</span>` : j.outcome === 'no' ? '<span class="tag neutral">Closed</span>' : 'Waiting';
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
      <div class="card climb-head">
        <div><div class="num">${s.level ? s.level : '0'}</div><div class="cap">${s.level ? 'Level' : 'Outside'}</div></div>
        <div><div class="num">${s.sent.length}</div><div class="cap">Sent</div></div>
        <div><div class="num">${s.interviews}</div><div class="cap">Interviews</div></div>
      </div>
      <div class="card rank">
        <div class="rank-now">${icon(s.offers ? 'sun' : 'star')}<div><div class="room-name">${rankOf(s).n}</div><div class="hint" style="margin:0">${rankOf(s).d}</div></div></div>
        <div class="ranks">${RANKS.map(r => `<span class="${(LEVELS - s.level) / FLIGHT >= r.at || s.offers ? 'on' : ''}">${r.n}</span>`).join('<i>›</i>')}<i>›</i><span class="${s.offers ? 'on' : ''}">Outside</span></div>
      </div>
      <div class="card shaft">${shaft(s)}
        <p class="hint">You start Down Deep, on level 144. Every application sent climbs one flight (${FLIGHT} levels). An interview climbs two more. The offer opens the airlock.${s.level > 1 ? ` ${Math.ceil((s.level - 1) / FLIGHT)} flights to the top.` : ''}</p>
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

      <h2 class="sec">Logbook <span class="count">IT · Bernard’s files</span></h2>
      <div class="tiles">
        <div class="card tile"><div class="v">${s.best}</div><div class="k">Best cycle (sent in 3 wks)</div></div>
        <div class="card tile"><div class="v">${s.sent.length ? Math.round(100 * s.onTime / s.sent.length) + '%' : '—'}</div><div class="k">Sent on time</div></div>
        <div class="card tile"><div class="v">${s.sent.length ? s.avgDays.toFixed(1) + 'd' : '—'}</div><div class="k">Avg find → send</div></div>
        <div class="card tile"><div class="v">${s.caches}</div><div class="k">Porter crates delivered</div></div>
      </div>

      <h2 class="sec">Badges <span class="count">${got.length}/${BADGES.length}</span></h2>
      <div class="badges">${BADGES.map(b => `
        <div class="card badge ${got.includes(b.id) ? 'got' : ''}">
          <div class="medal">${icon(b.ic)}</div>
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
      `<option value="bonus">Porter run to Supply (bonus)</option>`;
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
      if (!j) toast(data.room === 'bonus' ? 'Porter run started. Clock is ticking.' : `${needOf(data.room).name} room has a posting. Clock is ticking.`);
      openJob(newId);
    };
    if (!j) setTimeout(() => $('fT')?.focus(), 250);
  }

  // ---------- A posting's four phases ----------
  function openJob(id) {
    const j = state.jobs.find(x => x.id === id);
    if (!j) return closeModal();
    const dl = deadlineOf(j);
    const where = j.room === 'bonus' ? 'Porter run · Supply' : `${needOf(j.room).name} · ${needOf(j.room).place}`;
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
        <span class="by">${left > 0 ? `Send by end of ${niceDate(dl)}` : `Was due ${niceDate(dl)}. Late still counts. Send it.`}</span>
        ${left <= 0 ? judicial() : ''}</div>` : ''}
      ${j.status === 'submitted' ? `<div class="countdown"><span class="tag ok">${icon('check')} Sent ${niceDate(j.steps.submitted)}</span>
        <div class="by" style="margin-top:8px">Heard back?</div>
        <div class="row" style="margin-top:8px">
          <button class="btn small ${j.outcome === 'interview' ? '' : 'ghost'}" id="oYes">${icon('signal')} Interview!</button>
          <button class="btn small ${j.outcome === 'offer' ? '' : 'ghost'}" id="oOffer">${icon('sun')} Offer!</button>
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
    if ($('oOffer')) $('oOffer').onclick = () => setOutcome(j, 'offer');
    if ($('jDrop')) $('jDrop').onclick = () => confirmBox('Set this one aside?',
      `Posting closed or not a fit? That’s fine. ${j.room === 'bonus' ? 'The porter run is called off.' : `The ${needOf(j.room).name.toLowerCase()} room goes back to its 2-week supply clock from its last refill, so find another posting soon.`}`,
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
    const lensBefore = stats().lens;
    j.steps.submitted = now; j.status = 'submitted';
    PHASES.forEach(p => { if (p.id !== 'found' && !j.steps[p.id]) j.steps[p.id] = now; });
    if (j.room !== 'bonus') {
      j.prevRefill = state.rooms[j.room].refilled;
      state.rooms[j.room].refilled = now;
    }
    save();
    celebrate(j, before, lensBefore);
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
        <h3>Signal from outside!</h3><p class="sub">${esc(j.company || j.title)} wants to talk. Like Lukas finding a star through the haze, someone out there answered. You climb two more flights. Prep, breathe, and go show them who you are.</p>
        <button class="btn block" id="ok">Back to the silo</button></div>`);
      $('ok').onclick = closeModal;
      checkBadges();
    } else if (j.outcome === 'offer') {
      confetti(); setTimeout(confetti, 900); chime(true);
      openModal(`<div class="refill outside">
        <div class="viewscreen">${viewScreen(1, 'o')}</div>
        <h3>“I want to go out.”</h3><p class="sub">In the silo, those were the words nobody dared say. You said them, and you meant it. ${esc(j.company || j.title)} made an offer. You climbed every stair, cleaned every lens, and the airlock is open. This is Utopia. Welcome outside.</p>
        <button class="btn block" id="ok">Step outside</button></div>`);
      $('ok').onclick = closeModal;
      checkBadges();
    } else openJob(j.id);
  }

  function celebrate(j, before, lensBefore) {
    const bonus = j.room === 'bonus';
    const n = bonus ? null : needOf(j.room);
    const s = stats();
    const left = NEEDS.length - s.inCycle.length;
    openModal(`<div class="refill">
      <svg class="ico" viewBox="0 0 24 24"><use href="#i-${bonus ? 'crate' : n.id}" /></svg>
      <h3>${bonus ? 'Crate delivered to Supply' : `${n.name} restored`}</h3>
      <p class="sub">${bonus
        ? 'The porter run is done. Extra supplies are stocked for good and never need refilling.'
        : `${n.place} (${n.zone}) is back to full. It holds for ${state.drain} days, so find its next posting before then.`}</p>
      ${bonus ? '' : `<div class="tank"><i id="fillBar" style="width:${before * 100}%"></i></div>`}
      <div class="viewscreen" id="celebView">${viewScreen(lensBefore, 'c')}
        <div class="vs-cap">${lensBefore < s.lens ? 'You cleaned the lens. ' : ''}${lensCaption(s)}</div></div>
      <p class="sub mono" style="color:var(--term)">Application sent: ${esc(j.title)}${j.company ? ' · ' + esc(j.company) : ''}<br>
      You climbed a flight: ${s.level ? `level ${s.level}` : 'outside'}.${left > 0 ? ` ${left} more this cycle to keep all 5 rooms full.` : ''}</p>
      <button class="btn block" id="ok">Back to the silo</button></div>`);
    requestAnimationFrame(() => setTimeout(() => {
      const b = $('fillBar'); if (b) b.style.width = '100%';
      document.querySelectorAll('#celebView .vs-live').forEach(el => el.style.opacity = s.lens);
      document.querySelectorAll('#celebView .vs-grime').forEach(el => el.style.opacity = 0.85 * (1 - s.lens));
    }, 400));
    $('ok').onclick = closeModal;
    confetti(); chime();
    checkBadges();
  }

  // ---------- Settings ----------
  function openSettings(first) {
    const turnOpts = TURNAROUND_CHOICES.map(d => `<option value="${d}">${d} days${d === 5 ? ' (recommended)' : d === 7 ? ' (one week)' : ''}</option>`).join('');
    openModal(`
      ${first ? '' : '<button class="close-x" id="mX" aria-label="Close">×</button>'}
      <h3>${first ? 'The Pact' : 'Settings'}</h3>
      ${first ? `<p class="sub">Your current job is the silo: 144 levels down, and a screen in the cafeteria showing hills that look dead. They aren’t. Like Juliette Nichols, you start Down Deep in Mechanical. Out there is something better. These are the rules for getting out.</p>
        <div class="pact">
          <p><b>Article I.</b> Five rooms keep the silo alive: Oxygen, Water, Food, Power and Medicine.</p>
          <p><b>Article II.</b> When you find a job posting, assign it to a room. You then have <b>${state.turnaround} days</b> to send it, and the room drains on that clock.</p>
          <p><b>Article III.</b> Every posting goes through four phases: identify the job, tailor the resume, write the cover letter and materials, submit.</p>
          <p><b>Article IV.</b> Submitting refills the room. An empty room lasts <b>${state.drain} days</b>, so find its next posting before then.</p>
          <p><b>Article V.</b> Extra postings are porter runs to Supply. They have the same deadline, but once sent they never need refilling.</p>
          <p><b>Article VI.</b> Every application cleans the lens and climbs a flight of stairs. An offer opens the airlock.</p>
          <p class="sig">Witnessed by Mayor Jahns · Filed with IT · Enforced by Judicial</p>
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
        <h2 class="sec">Family sync</h2>
        <p class="hint">Sign in to share the silo between your phones.</p>
        <div data-family-sync></div>
        <p class="hint" style="margin-top:16px">Utopia is an unofficial, fan-made app inspired by the TV series <i>Silo</i>. It isn’t connected to the show or its makers.</p>`}
      <button class="btn block" id="sSave" style="margin-top:16px">${first ? 'I accept the Pact' : 'Save'}</button>`);
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
        localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); save(); closeModal(); toast('Backup restored.');
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

  // ---------- Family sync ----------
  // Shares this app's data between our phones once someone signs in (see ../family-sync.js).
  if (window.FamilySync) FamilySync.attach(STORE_KEY, {
    label: 'Utopia',
    get: () => state,
    apply: json => {
      localStorage.setItem(STORE_KEY, json); state = load();
      if ($('modal').classList.contains('hidden')) renderAll();
    },
  });
})();

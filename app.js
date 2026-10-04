/* Homework Hero — a nightly homework + on-time-for-school tracker for kids.
 * Everything is stored on this device in localStorage. No accounts, no servers. */
(() => {
  'use strict';

  // ---------- Config ----------
  const TASKS = [
    // days: 0 = Sunday … 6 = Saturday. ('ww' is the saved-data id for Word Study; kept so old progress still counts.)
    { id: 'math', name: 'Math', emoji: '🔢', blurb: 'Finish your math page', days: [1, 2, 3, 4], color: '#4f9dff', dark: '#2f78d6', tint: '#e5f0ff' },
    { id: 'reading', name: 'Reading', emoji: '📚', blurb: 'Read for 20 minutes', days: [1, 2, 3, 4, 5], color: '#ff8a3d', dark: '#d8692a', tint: '#fff0e5' },
    { id: 'ww', name: 'Word Study', emoji: '🔤', blurb: 'Do your Word Study work', days: [1, 2, 3, 4], color: '#9b5cff', dark: '#7a3ee0', tint: '#f1e9ff' },
  ];
  const HOMEWORK_DAYS = [1, 2, 3, 4, 5]; // Mon–Thu: all three, Fri: reading only
  const SCHOOL_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
  const READING_MS = 20 * 60 * 1000;
  const STORE_KEY = 'homework-hero-v1';
  const AVATARS = ['🦖', '🦕', '🐶', '🐱', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🦈', '🐲', '🤖', '👾', '🦸', '🧙', '🚀', '⚽'];
  const PRIZE_EMOJIS = ['🍦', '🎮', '🧸', '🍕', '🎬', '🛝', '🎁', '🍩'];

  const BADGES = [
    { id: 'first', emoji: '🌱', name: 'First Night', desc: 'All homework done 1 night', test: s => s.fullNights >= 1 },
    { id: 'week', emoji: '🗓️', name: 'Full Week', desc: '5 nights in a row', test: s => s.bestStreak >= 5 },
    { id: 'n10', emoji: '🚀', name: 'Rocket Kid', desc: '10 full nights', test: s => s.fullNights >= 10 },
    { id: 'fire', emoji: '🔥', name: 'On Fire', desc: '10 nights in a row', test: s => s.bestStreak >= 10 },
    { id: 'math10', emoji: '🧮', name: 'Math Whiz', desc: '10 math pages', test: s => s.counts.math >= 10 },
    { id: 'read10', emoji: '🐛', name: 'Bookworm', desc: 'Read 10 nights', test: s => s.counts.reading >= 10 },
    { id: 'ww10', emoji: '🐝', name: 'Spelling Bee', desc: '10 Word Study nights', test: s => s.counts.ww >= 10 },
    { id: 'n25', emoji: '🏆', name: 'Champion', desc: '25 full nights', test: s => s.fullNights >= 25 },
    { id: 'stars100', emoji: '🌟', name: 'Superstar', desc: 'Earn 100 stars', test: s => s.totalStars >= 100 },
    { id: 'read50', emoji: '🧙', name: 'Reading Wizard', desc: 'Read 50 nights', test: s => s.counts.reading >= 50 },
    { id: 'n50', emoji: '👑', name: 'Homework King', desc: '50 full nights', test: s => s.fullNights >= 50 },
    { id: 'm16', emoji: '🗺️', name: 'Marathon', desc: '20 nights in a row', test: s => s.bestStreak >= 20 },
    { id: 'early5', emoji: '⏰', name: 'Early Bird', desc: 'On time 5 days in a row', test: s => s.bestSchoolStreak >= 5 },
    { id: 'perfect1', emoji: '🌞', name: 'Perfect Week', desc: 'On time all 5 days', test: s => s.perfectWeeks >= 1 },
    { id: 'early20', emoji: '🐓', name: 'Rooster', desc: 'On time 20 days in a row', test: s => s.bestSchoolStreak >= 20 },
    { id: 'bus50', emoji: '🚌', name: 'Never Late', desc: 'On time 50 days', test: s => s.onTimeDays >= 50 },
  ];

  const CHEERS = ['Awesome!', 'You did it!', 'Super job!', 'Boom! 💥', 'High five! ✋', 'Way to go!', 'Nailed it!', 'Wow!', 'Amazing!'];
  const START_MSGS = [
    "Ready for homework? Let's blast off! 🚀",
    "Homework missions tonight. You've got this!",
    "Homework time! Tap each one when it's done.",
    "Let's fly to the moon! One mission at a time.",
  ];
  const MID_MSGS = [
    'Keep going, you are doing great!',
    'Almost to the moon! 🌙',
    'Nice! Pick your next mission.',
    "You're on a roll! 🎳",
  ];
  const DONE_MSGS = [
    'ALL DONE! You are a Homework Hero! 🦸',
    'You reached the moon! 🌙 Time to play!',
    'Mission complete! Super proud of you!',
  ];

  // ---------- Date helpers (always local time) ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const sameDay = (a, b) => keyOf(a) === keyOf(b);
  const isHomeworkDay = d => HOMEWORK_DAYS.includes(d.getDay());
  const isSchoolDay = d => SCHOOL_DAYS.includes(d.getDay());
  const tasksFor = d => TASKS.filter(t => t.days.includes(d.getDay()));
  // 1 star per assignment, plus a bonus star for finishing a night with more than one assignment.
  const starsForNight = d => tasksFor(d).length + (tasksFor(d).length > 1 ? 1 : 0);
  const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function relLabel(d) {
    const t = today();
    if (sameDay(d, t)) return 'Today';
    if (sameDay(d, addDays(t, -1))) return 'Yesterday';
    return DAY_NAMES[d.getDay()];
  }
  const shortDate = d => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 1,
    name: '',
    avatar: '🦖',
    sound: true,
    homework: {}, // 'YYYY-MM-DD' -> { math, reading, ww, off }
    school: {},   // 'YYYY-MM-DD' -> 'ontime' | 'late' | 'off'
    timer: null,  // { key, endAt, remaining, running }
    prize: { name: '', emoji: '🍦', cost: 25 },
    spent: 0,
    seenBadges: [],
  };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw));
    } catch (e) { /* fall through to defaults */ }
    return structuredClone(DEFAULT_STATE);
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }

  // ---------- Homework stats ----------
  function hwEntry(key) { return state.homework[key] || {}; }
  function hwDoneCount(key) { const e = hwEntry(key); return tasksFor(fromKey(key)).filter(t => e[t.id]).length; }
  function hwStatus(key) {
    const e = state.homework[key];
    if (!e) return 'none';
    if (e.off) return 'off';
    const n = hwDoneCount(key);
    return n === tasksFor(fromKey(key)).length ? 'done' : n > 0 ? 'partial' : 'none';
  }

  function earliestKey(obj) {
    const keys = Object.keys(obj).sort();
    return keys.length ? fromKey(keys[0]) : null;
  }

  // Streak of consecutive "fully done" nights, counting back from today.
  // Nights marked "no homework" are skipped. Tonight doesn't break the streak until it's over.
  function currentStreak(dayFilter, isGood, isSkip, startDate) {
    let d = today();
    let streak = 0;
    if (dayFilter(d) && !isGood(keyOf(d))) d = addDays(d, -1);
    const stop = startDate || d;
    while (d >= stop) {
      if (dayFilter(d)) {
        const k = keyOf(d);
        if (isGood(k)) streak++;
        else if (!isSkip(k)) break;
      }
      d = addDays(d, -1);
    }
    return streak;
  }
  function bestStreak(dayFilter, isGood, isSkip, startDate) {
    if (!startDate) return 0;
    let best = 0, run = 0;
    const end = today();
    for (let d = new Date(startDate); d <= end; d = addDays(d, 1)) {
      if (!dayFilter(d)) continue;
      const k = keyOf(d);
      if (isGood(k)) { run++; best = Math.max(best, run); }
      else if (isSkip(k)) continue;
      else if (sameDay(d, end)) continue; // tonight isn't over yet
      else run = 0;
    }
    return best;
  }

  const hwGood = k => hwStatus(k) === 'done';
  const hwSkip = k => hwStatus(k) === 'off';
  const schoolGood = k => state.school[k] === 'ontime';
  const schoolSkip = k => state.school[k] === 'off';

  // A perfect week: every school day Mon–Fri is logged on time ("no school" days don't count against it).
  function weekDays(monday) { return SCHOOL_DAYS.map(dow => addDays(monday, dow - 1)); }
  function isPerfectWeek(monday) {
    const vals = weekDays(monday).map(d => state.school[keyOf(d)]);
    return vals.every(v => v === 'ontime' || v === 'off') && vals.includes('ontime');
  }

  function stats() {
    const counts = { math: 0, reading: 0, ww: 0 };
    let fullNights = 0, totalStars = 0;
    let hwStars = 0;
    for (const [k, e] of Object.entries(state.homework)) {
      const d = fromKey(k), tasks = tasksFor(d);
      if (e.off || !tasks.length) continue;
      let n = 0;
      for (const t of tasks) if (e[t.id]) { counts[t.id]++; n++; }
      hwStars += n;
      if (n === tasks.length) { fullNights++; hwStars += starsForNight(d) - n; }
    }
    const hwStart = earliestKey(state.homework);
    const scStart = earliestKey(state.school);
    let onTimeDays = 0, lateDays = 0;
    const mondays = new Set();
    for (const [k, v] of Object.entries(state.school)) {
      if (!isSchoolDay(fromKey(k))) continue;
      if (v === 'ontime') onTimeDays++; else if (v === 'late') lateDays++;
      mondays.add(keyOf(mondayOf(fromKey(k))));
    }
    const perfectWeeks = [...mondays].filter(m => isPerfectWeek(fromKey(m))).length;
    // School: 1 star per on-time day + 1 bonus star per week on time every school day.
    const schoolStars = onTimeDays + perfectWeeks;
    totalStars = hwStars + schoolStars;
    return {
      counts, fullNights, totalStars, hwStars, schoolStars, perfectWeeks,
      streak: hwStart ? currentStreak(isHomeworkDay, hwGood, hwSkip, hwStart) : 0,
      bestStreak: bestStreak(isHomeworkDay, hwGood, hwSkip, hwStart),
      schoolStreak: scStart ? currentStreak(isSchoolDay, schoolGood, schoolSkip, scStart) : 0,
      bestSchoolStreak: bestStreak(isSchoolDay, schoolGood, schoolSkip, scStart),
      onTimeDays, lateDays,
    };
  }

  // ---------- Sound (tiny synth, no files) ----------
  let actx = null;
  function tone(freq, start, dur, type = 'triangle', vol = 0.18) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, actx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, actx.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + start + dur);
    o.connect(g).connect(actx.destination);
    o.start(actx.currentTime + start); o.stop(actx.currentTime + start + dur + 0.05);
  }
  function play(kind) {
    if (!state.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (kind === 'check') { tone(660, 0, 0.12); tone(990, 0.08, 0.2); }
      else if (kind === 'uncheck') { tone(440, 0, 0.12, 'sine', 0.1); }
      else if (kind === 'fanfare') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3)); tone(1319, 0.5, 0.6); }
      else if (kind === 'late') { tone(392, 0, 0.18, 'sine'); tone(330, 0.15, 0.25, 'sine'); }
      else if (kind === 'tap') { tone(880, 0, 0.06, 'sine', 0.08); }
      else if (kind === 'ding') { [784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.25, 0.3, 'sine', 0.22)); }
    } catch (e) { /* audio not available */ }
  }
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  // ---------- Confetti ----------
  function confetti(amount = 90, emojis = null) {
    const box = document.getElementById('confetti');
    const colors = ['#ff5d5d', '#ffd23f', '#2ecc71', '#4f9dff', '#9b5cff', '#ff8a3d', '#ff7eb6'];
    for (let i = 0; i < amount; i++) {
      const p = document.createElement('div');
      p.className = 'confetto';
      if (emojis && Math.random() < 0.35) { p.classList.add('emoji'); p.textContent = pick(emojis); }
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = pick(colors);
      p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--rot', (Math.random() * 1080 - 540) + 'deg');
      p.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      box.appendChild(p);
      setTimeout(() => p.remove(), 4200);
    }
  }

  // ---------- Modal ----------
  const modal = document.getElementById('modal');
  const modalCard = document.getElementById('modalCard');
  let modalOnClose = null;
  function openModal(html, onClose) {
    modalCard.innerHTML = html;
    modal.classList.remove('hidden');
    modalOnClose = onClose || null;
  }
  function closeModal() {
    modal.classList.add('hidden');
    modalCard.innerHTML = '';
    const cb = modalOnClose; modalOnClose = null;
    if (cb) cb();
  }
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  function celebrate(emoji, title, text, btn = 'Yay! 🎉') {
    openModal(`
      <div class="huge">${emoji}</div>
      <h2>${title}</h2>
      <p>${text}</p>
      <button class="big-btn" data-act="close">${btn}</button>`, () => checkNewBadges());
  }

  // Grown-up check: two-digit × one-digit, beyond the times tables a 7-year-old knows.
  let grownupUnlocked = false;
  function askGrownup(onPass) {
    if (grownupUnlocked) { onPass(); return; }
    const a = 13 + Math.floor(Math.random() * 87), b = 6 + Math.floor(Math.random() * 4);
    openModal(`
      <div class="gate">
        <div style="font-size:54px">🔒</div>
        <h2>Grown-ups only</h2>
        <p>What is</p>
        <div class="q">${a} × ${b} = ?</div>
        <div class="field"><input id="gateInput" type="number" inputmode="numeric" autocomplete="off" /></div>
        <button class="big-btn" data-act="gate-ok">Unlock</button>
        <button class="link-btn" data-act="close">Cancel</button>
      </div>`);
    const input = document.getElementById('gateInput');
    setTimeout(() => input.focus(), 50);
    const check = () => {
      if (Number(input.value) === a * b) { grownupUnlocked = true; closeModal(); onPass(); }
      else { input.value = ''; input.style.borderColor = 'var(--red)'; buzz(120); }
    };
    modalCard.querySelector('[data-act="gate-ok"]').onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }

  modalCard.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'close') closeModal();
    if (t.dataset.act === 'avatar') {
      state.avatar = t.dataset.v; save(); play('tap'); closeModal(); renderAll();
    }
  });

  // ---------- Views ----------
  let currentView = 'homework';
  let hwDate = today();
  let schoolDate = today();
  let starsMonth = new Date(today().getFullYear(), today().getMonth(), 1);
  let schoolMonth = new Date(today().getFullYear(), today().getMonth(), 1);

  const $ = id => document.getElementById(id);

  function renderHeader() {
    const s = stats();
    $('avatar').textContent = state.avatar;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    $('helloSmall').textContent = `${greet}${state.name ? ',' : '!'}`;
    $('helloBig').textContent = state.name ? `${state.name}! 👋` : 'Homework Hero';
    const prev = $('starCount').textContent;
    const now = String(Math.max(0, s.totalStars - state.spent));
    $('starCount').textContent = now;
    if (prev !== now && prev !== '0') {
      const pill = document.querySelector('.star-pill');
      pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
    }
  }

  function dayNav(d, idPrefix, sub) {
    const isToday = sameDay(d, today());
    return `
      <div class="daynav">
        <button class="arrow" id="${idPrefix}Prev" aria-label="Previous day">◀</button>
        <div class="daylabel">
          <div class="big">${relLabel(d)}</div>
          <div class="small">${DAY_NAMES[d.getDay()]}, ${shortDate(d)}${sub ? ' · ' + sub : ''}</div>
        </div>
        <button class="arrow" id="${idPrefix}Next" aria-label="Next day" ${isToday ? 'disabled' : ''}>▶</button>
      </div>`;
  }

  function nextHomeworkDay(from) {
    let d = addDays(from, 1);
    while (!isHomeworkDay(d)) d = addDays(d, 1);
    return d;
  }

  // ----- Homework tab -----
  function renderHomework() {
    const el = $('view-homework');
    const key = keyOf(hwDate);
    const isTonight = sameDay(hwDate, today());
    let html = dayNav(hwDate, 'hw');

    if (!isHomeworkDay(hwDate)) {
      const nxt = nextHomeworkDay(hwDate);
      const [emoji, title] = ['🏖️', 'Weekend! No homework!'];
      html += `
        <div class="card free-night">
          <div class="huge">${emoji}</div>
          <h2>${title}</h2>
          <p>${isTonight ? 'Go play, build, draw, and have fun!' : 'That was a free night.'}</p>
          <p style="margin-top:10px">Next homework night: <b>${DAY_NAMES[nxt.getDay()]}</b></p>
        </div>`;
      html += weekStripCard();
      el.innerHTML = html;
      wireDayNav('hw', d => { hwDate = d; renderHomework(); });
      return;
    }

    if (hwStatus(key) === 'off') {
      html += `
        <div class="card free-night">
          <div class="huge">🛋️</div>
          <h2>No homework ${isTonight ? 'tonight' : 'this night'}!</h2>
          <p>A grown-up said it's a night off. Enjoy!</p>
        </div>
        <button class="link-btn" id="unskip">Oops, there IS homework</button>`;
      html += weekStripCard();
      el.innerHTML = html;
      wireDayNav('hw', d => { hwDate = d; renderHomework(); });
      $('unskip').onclick = () => askGrownup(() => {
        delete state.homework[key]; save(); renderAll();
      });
      return;
    }

    const tasks = tasksFor(hwDate);
    const n = hwDoneCount(key);
    const msg = n === tasks.length ? pick(DONE_MSGS)
      : tasks.length === 1 ? `It's ${DAY_NAMES[hwDate.getDay()]}! Just ${tasks[0].name.toLowerCase()} tonight. ${tasks[0].emoji}`
      : n === 0 ? pick(START_MSGS) : pick(MID_MSGS);
    const pct = n / tasks.length;

    html += `
      <div class="buddy">
        <div class="buddy-face">${state.avatar}</div>
        <div class="bubble">${isTonight ? msg : `Fixing ${relLabel(hwDate).toLowerCase() === 'yesterday' ? 'yesterday' : 'an old night'}? Tap what was finished.`}</div>
      </div>
      <div class="rocket-track" aria-label="${n} of ${tasks.length} done">
        <div class="stars-bg"></div>
        <div class="rocket-fill" style="width:${8 + pct * 84}%"></div>
        <span class="rocket-label" style="${n ? 'display:none' : ''}">To the moon!</span>
        <span class="rocket" style="left:${8 + pct * 78}%">🚀</span>
        <span class="moon">🌙</span>
      </div>`;

    if (n === tasks.length) {
      html += `
        <div class="all-done-banner">
          <div class="huge">🦸⭐🦸</div>
          <h2>Homework Hero!</h2>
          <div>You earned <b>${starsForNight(hwDate)} ${starsForNight(hwDate) === 1 ? 'star' : 'stars'}</b> ${isTonight ? 'tonight' : 'that night'}!</div>
        </div>`;
    }

    html += tasks.map(t => taskCard(t, key)).join('');

    if (state.timer && state.timer.key === key && !hwEntry(key).reading) {
      html += timerCard();
    }

    html += `<button class="link-btn" id="skipNight">Grown-ups: no homework ${isTonight ? 'tonight' : 'this night'}</button>`;
    el.innerHTML = html;

    wireDayNav('hw', d => { hwDate = d; renderHomework(); });
    el.querySelectorAll('.task').forEach(btn => btn.addEventListener('click', e => {
      if (e.target.closest('[data-timer]')) return;
      toggleTask(key, btn.dataset.task);
    }));
    el.querySelectorAll('[data-timer]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      timerAction(b.dataset.timer, key);
    }));
    $('skipNight').onclick = () => askGrownup(() => {
      state.homework[key] = { off: true };
      if (state.timer && state.timer.key === key) state.timer = null;
      save(); renderAll();
    });
    updateTimerUI();
  }

  function taskCard(t, key) {
    const done = !!hwEntry(key)[t.id];
    let extra = '';
    if (t.id === 'reading' && !done) {
      const hasTimer = state.timer && state.timer.key === key;
      extra = hasTimer
        ? `<div class="timer-row"><span class="muted">⏳ Timer is running below</span></div>`
        : `<div class="timer-row"><span class="pill-btn" role="button" data-timer="start">⏱️ Start 20-min timer</span></div>`;
    }
    return `
      <button class="task ${done ? 'done' : ''}" data-task="${t.id}"
        style="--task-color:${t.color};--task-dark:${t.dark};--task-tint:${t.tint}"
        aria-pressed="${done}">
        <div class="task-emoji">${t.emoji}</div>
        <div class="task-body">
          <div class="task-name">${t.name}</div>
          <div class="task-blurb">${done ? pick(CHEERS) : t.blurb}</div>
          ${extra}
        </div>
        <div class="check">✓</div>
      </button>`;
  }

  function toggleTask(key, id, fromTimer = false) {
    const e = state.homework[key] = Object.assign({}, state.homework[key]);
    delete e.off;
    const was = !!e[id];
    e[id] = !was;
    if (id === 'reading' && e[id] && state.timer && state.timer.key === key) state.timer = null;
    save();
    if (!was) {
      play('check'); buzz(30);
      const t = TASKS.find(x => x.id === id);
      confetti(35, [t.emoji, '⭐']);
    } else {
      play('uncheck');
    }
    renderAll();
    const tasks = tasksFor(fromKey(key));
    if (!was && hwDoneCount(key) === tasks.length) {
      const stars = starsForNight(fromKey(key));
      setTimeout(() => {
        play('fanfare'); buzz([60, 40, 60]);
        confetti(140, ['⭐', '🌟', '🚀', '🎉']);
        celebrate('🦸', 'HOMEWORK HERO!', `${tasks.length > 1 ? `All ${tasks.length} missions` : 'Homework'} done! You earned ${stars} ${stars === 1 ? 'star' : 'stars'}! ⭐`, 'I did it! 🎉');
      }, 450);
    } else if (!was && fromTimer) {
      setTimeout(() => celebrate('📚', '20 minutes!', 'Reading time is done. Great reading!', 'Yay! 📖'), 300);
    } else if (!was) {
      setTimeout(checkNewBadges, 500);
    }
  }

  // ----- Reading timer -----
  function timerRemaining() {
    const t = state.timer;
    if (!t) return 0;
    return t.running ? Math.max(0, t.endAt - Date.now()) : t.remaining;
  }
  function timerCard() {
    return `
      <div class="card timer-card ${state.timer.running ? '' : 'paused'}" id="timerCard">
        <h2>📖 Reading Time</h2>
        <div class="timer-ring">
          <svg viewBox="0 0 200 200"><circle class="bg" cx="100" cy="100" r="86"/><circle class="fg" id="timerArc" cx="100" cy="100" r="86"/></svg>
          <div class="timer-mid"><div class="timer-book">📚</div><div class="timer-time" id="timerTime">20:00</div></div>
        </div>
        <div class="btn-row">
          ${state.timer.running
            ? '<button class="pill-btn" data-timer="pause">⏸️ Pause</button>'
            : '<button class="pill-btn" data-timer="resume">▶️ Keep reading</button>'}
          <button class="pill-btn secondary" data-timer="stop">✖️ Stop</button>
        </div>
      </div>`;
  }
  function timerAction(act, key) {
    play('tap');
    if (act === 'start') state.timer = { key, endAt: Date.now() + READING_MS, remaining: READING_MS, running: true };
    else if (act === 'pause' && state.timer) { state.timer.remaining = timerRemaining(); state.timer.running = false; }
    else if (act === 'resume' && state.timer) { state.timer.endAt = Date.now() + state.timer.remaining; state.timer.running = true; }
    else if (act === 'stop') state.timer = null;
    save(); renderHomework();
    if (act === 'start') setTimeout(() => { const c = $('timerCard'); c && c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
  }
  function updateTimerUI() {
    if (!state.timer) return;
    const rem = timerRemaining();
    if (rem <= 0) {
      const key = state.timer.key;
      state.timer = null; save();
      play('ding'); buzz([200, 100, 200]);
      if (!hwEntry(key).reading) toggleTask(key, 'reading', true);
      else renderAll();
      return;
    }
    const tEl = $('timerTime'), arc = $('timerArc');
    if (!tEl || !arc) return;
    const secs = Math.ceil(rem / 1000);
    tEl.textContent = `${Math.floor(secs / 60)}:${pad(secs % 60)}`;
    const C = 2 * Math.PI * 86;
    arc.style.strokeDasharray = C;
    arc.style.strokeDashoffset = C * (1 - rem / READING_MS);
  }
  setInterval(updateTimerUI, 250);

  // ----- Shared week strip -----
  function weekStripCard() {
    const t = today();
    const monday = mondayOf(t);
    const cells = HOMEWORK_DAYS.map(dow => {
      const d = addDays(monday, dow - 1);
      const k = keyOf(d);
      const st = hwStatus(k);
      const future = d > t;
      const em = st === 'done' ? '⭐' : st === 'off' ? '🛋️' : st === 'partial' ? '🌗' : future ? '⬜' : sameDay(d, t) ? '⏳' : '➖';
      return `<div class="wk ${sameDay(d, t) ? 'today' : ''}"><div class="d">${DAY_NAMES[dow].slice(0, 3)}</div><div class="e">${em}</div></div>`;
    }).join('');
    return `<div class="card"><h3>This week</h3><div class="week ${HOMEWORK_DAYS.length === 5 ? 'five' : ''}">${cells}</div></div>`;
  }

  // ----- Calendar -----
  function calendar(month, cellFn) {
    const y = month.getFullYear(), m = month.getMonth();
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const t = today();
    let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<div class="dow">${x}</div>`).join('');
    for (let i = 0; i < first.getDay(); i++) html += '<div class="cell blank"></div>';
    for (let day = 1; day <= days; day++) {
      const d = new Date(y, m, day);
      const { em = '', cls = '' } = cellFn(d, keyOf(d)) || {};
      html += `<div class="cell ${cls} ${sameDay(d, t) ? 'today' : ''} ${d > t ? 'future' : ''}"><span class="em">${em}</span>${day}</div>`;
    }
    return `<div class="cal">${html}</div>`;
  }
  function calHeader(month, id) {
    const t = today();
    const atCurrent = month.getFullYear() === t.getFullYear() && month.getMonth() === t.getMonth();
    return `<div class="cal-head">
      <button id="${id}Prev" aria-label="Previous month">◀</button>
      <h3>${MONTHS[month.getMonth()]} ${month.getFullYear()}</h3>
      <button id="${id}Next" aria-label="Next month" ${atCurrent ? 'disabled' : ''}>▶</button>
    </div>`;
  }

  // ----- My Stars tab -----
  function renderStars() {
    const s = stats();
    const el = $('view-stars');
    const available = Math.max(0, s.totalStars - state.spent);
    const earned = BADGES.filter(b => b.test(s));
    const nextBadge = BADGES.find(b => !b.test(s));

    let prizeHtml = '';
    if (state.prize && state.prize.name) {
      const cost = Math.max(1, Number(state.prize.cost) || 1);
      const p = Math.min(1, available / cost);
      prizeHtml = `
        <div class="card">
          <h3>🎯 Prize goal</h3>
          <div class="prize">
            <div class="em">${state.prize.emoji}</div>
            <div class="info">
              <div style="font-weight:700;font-size:20px">${esc(state.prize.name)}</div>
              <div class="meter"><div style="width:${p * 100}%"></div></div>
              <div class="muted">${available >= cost ? '🎉 You have enough stars! Ask a grown-up!' : `${available} / ${cost} stars — ${cost - available} to go!`}</div>
            </div>
          </div>
        </div>`;
    }

    el.innerHTML = `
      <div class="card hero-stars">
        <div class="count"><span>⭐</span> ${available}</div>
        <div class="muted" style="font-size:18px;margin-top:6px">${available === 1 ? 'star' : 'stars'} to spend · ${s.totalStars} earned ever</div>
        <div class="muted" style="font-size:15px;margin-top:4px">📝 ${s.hwStars} from homework · 🏫 ${s.schoolStars} from school</div>
      </div>
      <div class="stat-grid">
        <div class="stat"><div class="ico">🔥</div><div class="num">${s.streak}</div><div class="lbl">nights in a row</div></div>
        <div class="stat"><div class="ico">🦸</div><div class="num">${s.fullNights}</div><div class="lbl">hero nights</div></div>
        <div class="stat"><div class="ico">🏅</div><div class="num">${earned.length}</div><div class="lbl">badges</div></div>
      </div>
      ${prizeHtml}
      ${weekStripCard()}
      <div class="card">
        ${calHeader(starsMonth, 'sm')}
        ${calendar(starsMonth, (d, k) => {
          if (!isHomeworkDay(d)) return { cls: 'weekend' };
          const st = hwStatus(k);
          return { em: st === 'done' ? '⭐' : st === 'partial' ? '🌗' : st === 'off' ? '🛋️' : '' };
        })}
        <div class="legend"><span>⭐ all done</span><span>🌗 some done</span><span>🛋️ night off</span></div>
      </div>
      <div class="card">
        <h3>My missions</h3>
        <div class="stat-grid" style="margin:0">
          ${TASKS.map(t => `<div class="stat" style="background:${t.tint};box-shadow:none"><div class="ico">${t.emoji}</div><div class="num">${s.counts[t.id]}</div><div class="lbl">${t.name}</div></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3>🏅 Badges</h3>
        ${nextBadge ? `<p class="muted" style="margin-top:0">Next up: <b>${nextBadge.emoji} ${nextBadge.name}</b> — ${nextBadge.desc}</p>` : '<p>You got them ALL! 🤯</p>'}
        <div class="badges">
          ${BADGES.map(b => `<div class="badge ${b.test(s) ? '' : 'locked'}"><div class="em">${b.emoji}</div><div class="nm">${b.name}</div><div class="ds">${b.desc}</div></div>`).join('')}
        </div>
      </div>
      <div class="card center muted">🔥 Best streak ever: <b>${s.bestStreak}</b> ${s.bestStreak === 1 ? "night" : "nights"}</div>`;

    $('smPrev').onclick = () => { starsMonth = new Date(starsMonth.getFullYear(), starsMonth.getMonth() - 1, 1); renderStars(); };
    $('smNext').onclick = () => { starsMonth = new Date(starsMonth.getFullYear(), starsMonth.getMonth() + 1, 1); renderStars(); };
  }

  // ----- School tab -----
  function renderSchool() {
    const el = $('view-school');
    const key = keyOf(schoolDate);
    const s = stats();
    const isToday = sameDay(schoolDate, today());
    const val = state.school[key];
    let html = dayNav(schoolDate, 'sc');

    if (!isSchoolDay(schoolDate)) {
      html += `
        <div class="card free-night">
          <div class="huge">😴</div>
          <h2>No school ${isToday ? 'today' : 'that day'}!</h2>
          <p>It's the weekend. Sleep in!</p>
        </div>`;
    } else if (val === 'off') {
      html += `
        <div class="card free-night">
          <div class="huge">🏠</div>
          <h2>No school ${isToday ? 'today' : 'that day'}</h2>
          <p>Holiday, sick day, or day off.</p>
        </div>
        <button class="link-btn" id="scUndo">Change it</button>`;
    } else {
      html += `
        <div class="buddy">
          <div class="buddy-face">${state.avatar}</div>
          <div class="bubble">${val === 'ontime' ? 'Woo-hoo! Right on time! 🙌' : val === 'late' ? "That's okay! Let's try to beat the bell tomorrow. 💪" : `Did you get to school on time ${isToday ? 'today' : 'that day'}?`}</div>
        </div>
        <button class="big-btn ${val === 'ontime' ? 'chosen' : val ? 'dim' : ''}" id="scOnTime"><span class="ico">⏰</span> On time!</button>
        <button class="big-btn late ${val === 'late' ? 'chosen' : val ? 'dim' : ''}" id="scLate"><span class="ico">🐢</span> A little late</button>
        <button class="link-btn" id="scOff">No school ${isToday ? 'today' : 'that day'}</button>`;
    }

    // Weekly strip Mon–Fri
    const t = today();
    const monday = mondayOf(t);
    const week = SCHOOL_DAYS.map(dow => {
      const d = addDays(monday, dow - 1), v = state.school[keyOf(d)];
      const em = v === 'ontime' ? '⏰' : v === 'late' ? '🐢' : v === 'off' ? '🏠' : d > t ? '⬜' : '➖';
      return `<div class="wk ${sameDay(d, t) ? 'today' : ''}"><div class="d">${DAY_NAMES[dow].slice(0, 3)}</div><div class="e">${em}</div></div>`;
    }).join('');

    // This month %
    const m0 = schoolMonth;
    let mOn = 0, mLate = 0;
    for (const [k, v] of Object.entries(state.school)) {
      const d = fromKey(k);
      if (d.getFullYear() === m0.getFullYear() && d.getMonth() === m0.getMonth()) {
        if (v === 'ontime') mOn++; else if (v === 'late') mLate++;
      }
    }
    const mTotal = mOn + mLate;
    const mPct = mTotal ? Math.round((mOn / mTotal) * 100) : 0;
    const allTotal = s.onTimeDays + s.lateDays;

    html += `
      <div class="stat-grid" style="margin-top:6px">
        <div class="stat"><div class="ico">🔥</div><div class="num">${s.schoolStreak}</div><div class="lbl">on time in a row</div></div>
        <div class="stat"><div class="ico">⭐</div><div class="num">${s.schoolStars}</div><div class="lbl">school stars</div></div>
        <div class="stat"><div class="ico">💯</div><div class="num">${allTotal ? Math.round((s.onTimeDays / allTotal) * 100) : 0}%</div><div class="lbl">on time overall</div></div>
      </div>
      <div class="card"><h3>This week</h3><div class="week five">${week}</div>
        <p class="center" style="margin:12px 0 0;font-weight:600">${weekBonusText(monday)}</p></div>
      <div class="card">
        ${calHeader(schoolMonth, 'scm')}
        <div class="muted">${mTotal ? `On time <b>${mOn}</b> of <b>${mTotal}</b> school days (${mPct}%)` : 'No days logged this month yet.'}</div>
        <div class="meter green"><div style="width:${mPct}%"></div></div>
        ${calendar(schoolMonth, (d, k) => {
          if (!isSchoolDay(d)) return { em: '🏠', cls: 'weekend' };
          const v = state.school[k];
          return { em: v === 'ontime' ? '⏰' : v === 'late' ? '🐢' : v === 'off' ? '🏠' : '' };
        })}
        <div class="legend"><span>⏰ on time</span><span>🐢 late</span><span>🏠 no school</span></div>
      </div>
      <div class="card center muted">🏆 Best on-time streak: <b>${s.bestSchoolStreak}</b> ${s.bestSchoolStreak === 1 ? "day" : "days"}</div>`;

    el.innerHTML = html;
    wireDayNav('sc', d => { schoolDate = d; renderSchool(); });
    const set = v => {
      const before = stats();
      if (state.school[key] === v) delete state.school[key]; else state.school[key] = v;
      save();
      if (state.school[key] === 'ontime') {
        play('check'); buzz(30); confetti(60, ['⏰', '🌞', '⭐']);
        const afterStats = stats(), after = afterStats.schoolStreak;
        if (afterStats.perfectWeeks > before.perfectWeeks) {
          setTimeout(() => { play('fanfare'); confetti(120, ['🌞', '⭐']); celebrate('🌞', 'Perfect week!', 'On time every day this week! You earned a BONUS star! ⭐'); }, 400);
        } else if (after > before.schoolStreak && after > 1 && after % 5 === 0) {
          setTimeout(() => { play('fanfare'); celebrate('🌞', `${after} days on time!`, 'You are an Early Bird superstar!'); }, 400);
        } else setTimeout(checkNewBadges, 500);
      } else if (state.school[key] === 'late') play('late');
      else play('tap');
      renderAll();
    };
    if ($('scOnTime')) $('scOnTime').onclick = () => set('ontime');
    if ($('scLate')) $('scLate').onclick = () => set('late');
    if ($('scOff')) $('scOff').onclick = () => set('off');
    if ($('scUndo')) $('scUndo').onclick = () => { delete state.school[key]; save(); renderAll(); };
    $('scmPrev').onclick = () => { schoolMonth = new Date(schoolMonth.getFullYear(), schoolMonth.getMonth() - 1, 1); renderSchool(); };
    $('scmNext').onclick = () => { schoolMonth = new Date(schoolMonth.getFullYear(), schoolMonth.getMonth() + 1, 1); renderSchool(); };
  }

  function weekBonusText(monday) {
    if (isPerfectWeek(monday)) return '🌞 Perfect week! Bonus ⭐ earned!';
    const vals = weekDays(monday).map(d => state.school[keyOf(d)]);
    if (vals.includes('late')) return 'Every on-time day earns a ⭐. Try for a perfect week next week!';
    const left = vals.filter(v => !v).length;
    return `Every on-time day = 1 ⭐. On time all week = bonus ⭐! (${left} ${left === 1 ? 'day' : 'days'} to go)`;
  }

  function wireDayNav(prefix, setDate) {
    const cur = prefix === 'hw' ? hwDate : schoolDate;
    $(prefix + 'Prev').onclick = () => { play('tap'); setDate(addDays(cur, -1)); };
    $(prefix + 'Next').onclick = () => { if (cur < today()) { play('tap'); setDate(addDays(cur, 1)); } };
  }

  // ----- Grown-ups tab -----
  function renderGrownups() {
    const el = $('view-grownups');
    if (!grownupUnlocked) {
      el.innerHTML = `
        <div class="card free-night">
          <div class="huge">🔒</div>
          <h2>Grown-ups area</h2>
          <p>Settings, prizes, and backups live here.</p>
          <button class="big-btn" id="unlock" style="margin-top:18px">Unlock</button>
        </div>`;
      $('unlock').onclick = () => askGrownup(renderGrownups);
      return;
    }
    const s = stats();
    const prize = state.prize || DEFAULT_STATE.prize;
    el.innerHTML = `
      <div class="card">
        <h2>👦 Kid</h2>
        <div class="field"><label for="gName">Name</label><input id="gName" type="text" maxlength="20" placeholder="Your kid's name" value="${esc(state.name)}" /></div>
        <div class="field"><label>Buddy</label>
          <div class="avatar-grid">${AVATARS.map(a => `<button data-av="${a}" class="${a === state.avatar ? 'sel' : ''}">${a}</button>`).join('')}</div>
        </div>
        <div class="toggle"><span>🔊 Sounds</span><button class="switch ${state.sound ? 'on' : ''}" id="gSound" aria-pressed="${state.sound}" aria-label="Sounds"></button></div>
      </div>

      <div class="card">
        <h2>🎯 Prize goal</h2>
        <p class="muted" style="margin-top:0">Pick a reward. Homework: 1 ⭐ per assignment, plus a bonus ⭐ when all 3 are done (Friday reading is 1 ⭐). School: 1 ⭐ per on-time day, plus a bonus ⭐ for a week on time every day.</p>
        <div class="row2">
          <div class="field"><label for="gPrize">Prize</label><input id="gPrize" type="text" maxlength="40" placeholder="e.g. Ice cream trip" value="${esc(prize.name)}" /></div>
          <div class="field"><label for="gCost">Stars</label><input id="gCost" type="number" min="1" max="999" inputmode="numeric" value="${Number(prize.cost) || 25}" /></div>
        </div>
        <div class="avatar-grid" style="grid-template-columns:repeat(8,1fr);gap:6px">${PRIZE_EMOJIS.map(a => `<button data-pe="${a}" style="font-size:26px;padding:6px" class="${a === prize.emoji ? 'sel' : ''}">${a}</button>`).join('')}</div>
        <button class="small-btn primary" id="gSavePrize">Save prize</button>
        <button class="small-btn" id="gClaim" ${prize.name && s.totalStars - state.spent >= prize.cost ? '' : 'disabled style="opacity:.5"'}>🎁 Prize given (use ${Number(prize.cost) || 0} ⭐)</button>
        <p class="muted" style="margin-bottom:0">Stars to spend: <b>${Math.max(0, s.totalStars - state.spent)}</b> · earned ever: <b>${s.totalStars}</b></p>
      </div>

      <div class="card">
        <h2>💾 Backup</h2>
        <p class="muted" style="margin-top:0">Progress is saved on this phone only. Download a backup now and then so it's never lost.</p>
        <button class="small-btn primary" id="gExport">⬇️ Download backup</button>
        <button class="small-btn" id="gImport">⬆️ Restore backup</button>
        <input type="file" id="gFile" accept="application/json,.json" hidden />
      </div>

      <div class="card">
        <h2>🧹 Start over</h2>
        <button class="small-btn danger" id="gReset">Erase all progress</button>
      </div>
      <button class="link-btn" id="gLock">🔒 Lock grown-ups area</button>`;

    $('gName').oninput = e => { state.name = e.target.value.trim(); save(); renderHeader(); };
    el.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { state.avatar = b.dataset.av; save(); play('tap'); renderAll(); });
    el.querySelectorAll('[data-pe]').forEach(b => b.onclick = () => {
      el.querySelectorAll('[data-pe]').forEach(x => x.classList.toggle('sel', x === b));
      play('tap');
    });
    $('gSound').onclick = () => { state.sound = !state.sound; save(); play('tap'); renderGrownups(); };
    $('gSavePrize').onclick = () => {
      const sel = el.querySelector('[data-pe].sel');
      state.prize = {
        name: $('gPrize').value.trim(),
        cost: Math.max(1, Math.min(999, parseInt($('gCost').value, 10) || 25)),
        emoji: sel ? sel.dataset.pe : '🎁',
      };
      save(); play('check'); renderAll(); toast('Prize saved!');
    };
    $('gClaim').onclick = () => {
      const cost = Number(state.prize.cost) || 0;
      if (!state.prize.name || stats().totalStars - state.spent < cost) return;
      state.spent += cost; save(); renderAll();
      play('fanfare'); confetti(120, [state.prize.emoji, '🎁', '⭐']);
      celebrate(state.prize.emoji, 'Prize time!', `Enjoy your ${esc(state.prize.name)}! You worked hard for it.`);
    };
    $('gExport').onclick = exportData;
    $('gImport').onclick = () => $('gFile').click();
    $('gFile').onchange = importData;
    $('gReset').onclick = () => {
      if (!confirm('Erase ALL homework, school, and star progress? This cannot be undone.')) return;
      state = structuredClone(DEFAULT_STATE); save(); renderAll(); toast('All progress erased.');
    };
    $('gLock').onclick = () => { grownupUnlocked = false; renderGrownups(); };
  }

  function toast(text) {
    openModal(`<div class="huge" style="font-size:60px">👍</div><h2>${esc(text)}</h2><button class="big-btn" data-act="close">OK</button>`);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `homework-hero-backup-${keyOf(today())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data !== 'object' || !data || typeof data.homework !== 'object' || typeof data.school !== 'object') throw new Error('bad');
        state = Object.assign(structuredClone(DEFAULT_STATE), data);
        save(); renderAll(); toast('Backup restored!');
      } catch (err) {
        alert('That file does not look like a Homework Hero backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ---------- Badges ----------
  function checkNewBadges() {
    if (!modal.classList.contains('hidden')) return;
    const s = stats();
    const fresh = BADGES.find(b => b.test(s) && !state.seenBadges.includes(b.id));
    if (!fresh) return;
    state.seenBadges.push(fresh.id); save();
    play('fanfare'); confetti(100, [fresh.emoji, '🏅']);
    celebrate(fresh.emoji, 'New badge!', `<b>${fresh.name}</b><br>${fresh.desc}`, 'Awesome! 🏅');
  }

  // ---------- Avatar picker from the header ----------
  $('avatarBtn').onclick = () => {
    play('tap');
    openModal(`
      <h2>Pick your buddy!</h2>
      <div class="avatar-grid">${AVATARS.map(a => `<button data-act="avatar" data-v="${a}" class="${a === state.avatar ? 'sel' : ''}">${a}</button>`).join('')}</div>
      <button class="link-btn" data-act="close">Close</button>`);
  };

  // ---------- Tabs ----------
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    play('tap');
    currentView = tab.dataset.view;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + currentView));
    renderView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  function renderView() {
    if (currentView === 'homework') renderHomework();
    else if (currentView === 'stars') renderStars();
    else if (currentView === 'school') renderSchool();
    else renderGrownups();
  }
  function renderAll() { renderHeader(); renderView(); }

  // Roll over to the new day if the app was left open overnight.
  let lastDay = keyOf(today());
  function onWake() {
    const k = keyOf(today());
    if (k !== lastDay) { lastDay = k; hwDate = today(); schoolDate = today(); }
    renderAll();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) onWake(); });
  setInterval(() => { if (keyOf(today()) !== lastDay) onWake(); }, 60 * 1000);

  // ---------- First run ----------
  renderAll();
  if (!state.name && !localStorage.getItem(STORE_KEY)) {
    openModal(`
      <div class="huge">🦸</div>
      <h2>Hi, Homework Hero!</h2>
      <p>What's your name?</p>
      <div class="field"><input id="firstName" type="text" maxlength="20" placeholder="Type your name" style="text-align:center" /></div>
      <button class="big-btn" id="firstGo">Let's go! 🚀</button>`);
    const go = () => {
      state.name = $('firstName').value.trim(); save(); closeModal(); renderAll();
      confetti(80, ['⭐', '🚀']); play('fanfare');
    };
    $('firstGo').onclick = go;
    $('firstName').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  // ---------- Offline support ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

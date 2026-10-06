/* Star Steps — a daily allergy-medicine (immunotherapy) star chart for little kids.
 * Everything is stored on this device in localStorage. No accounts, no servers. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'star-steps-v1';
  const WEEK_START = 1; // 0 = Sunday, 1 = Monday. A "full week" bonus needs all 7 days from this day on.
  const AVATARS = ['🐴', '🐎', '🦄', '🐄', '🐷', '🐑', '🐐', '🐔', '🐓', '🐣', '🦆', '🐶', '🐱', '🐰', '🦊', '🐢', '🐸', '🐻', '🚜', '🦖', '🚂', '🚒'];
  const PRIZE_EMOJIS = ['🍦', '🐴', '🎠', '🧸', '🚜', '🎈', '🍩', '🎨', '🛝', '📚', '🍕', '🎁', '🧁', '🍎', '🚂', '⚽'];
  const CHEERS = ['Yee-haw!', 'Giddy-up!', 'You did it!', 'Super job!', 'Hooray!', 'High five!', 'So brave!', 'Great job, cowboy!'];
  const FARM_BITS = ['⭐', '🌟', '🐴', '🌻', '🥕', '🍎', '✨', '💛'];
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ---------- Date helpers (always local time) ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const weekStartOf = d => addDays(d, -((d.getDay() - WEEK_START + 7) % 7));
  const shortDate = d => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 1,
    name: 'Lucas',
    avatar: '🐴',
    sound: true,
    voice: true,
    step: 7,
    totalSteps: 13,
    stepUps: [],  // [{ date: 'YYYY-MM-DD', to: 8 }] — each one is a bonus star
    doses: {},    // 'YYYY-MM-DD' -> { t: 'full' | 'half', s: stepThatDay }
    prize: { name: '', emoji: '🍦', photo: '', cost: 20 },
    spent: 0,
    prizesWon: [], // [{ name, emoji, cost, date }]
    celebratedPrize: '', // prize signature already celebrated, so the "you earned it" party plays once
  };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw));
        s.prize = Object.assign(structuredClone(DEFAULT_STATE.prize), s.prize);
        if (!s.name) s.name = DEFAULT_STATE.name;
        if (s.avatar === '🦁') s.avatar = DEFAULT_STATE.avatar; // old default buddy, before the farm theme
        return s;
      }
    } catch (e) { /* fall through to defaults */ }
    return structuredClone(DEFAULT_STATE);
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save. The phone storage may be full.'); }
  }

  // ---------- Stars ----------
  function weekCounts() {
    const weeks = {};
    for (const k of Object.keys(state.doses)) {
      const w = keyOf(weekStartOf(fromKey(k)));
      weeks[w] = (weeks[w] || 0) + 1;
    }
    return weeks;
  }
  const fullWeekKeys = () => Object.entries(weekCounts()).filter(([, n]) => n >= 7).map(([w]) => w);

  function stats() {
    const doses = Object.values(state.doses);
    const fullWeeks = fullWeekKeys().length;
    const earned = doses.length + fullWeeks + state.stepUps.length;
    return {
      doses: doses.length,
      full: doses.filter(d => d.t === 'full').length,
      half: doses.filter(d => d.t === 'half').length,
      fullWeeks,
      stepUps: state.stepUps.length,
      earned,
      stars: Math.max(0, earned - state.spent),
      streak: streak(),
    };
  }

  // Days in a row with a dose, counting back from today (today doesn't break it until it's over).
  function streak() {
    let d = today(), n = 0;
    if (!state.doses[keyOf(d)]) d = addDays(d, -1);
    while (state.doses[keyOf(d)]) { n++; d = addDays(d, -1); }
    return n;
  }

  const prizeSig = () => `${state.prize.name}|${state.prize.cost}|${state.spent}`;
  const prizeSet = () => !!(state.prize.name || state.prize.photo);

  // ---------- Pictures ----------
  // A round "dose" face: full = whole circle colored in, half = half colored in, none = empty outline.
  function doseSvg(type, opts = {}) {
    const fill = type === 'full' ? '#ffb02e' : type === 'half' ? '#5fb4ff' : '#ffffff';
    const line = type === 'full' ? '#e07614' : type === 'half' ? '#2f83db' : '#d9cde4';
    const face = type ? '#5a3b00' : '#d9cde4';
    const halfFill = type === 'half'
      ? `<path d="M50 6 A44 44 0 0 0 50 94 Z" fill="${fill}"/>`
      : '';
    const body = type === 'full' ? fill : '#fff';
    const faceBits = (type || opts.face)
      ? `<circle cx="36" cy="42" r="5" fill="${face}"/><circle cx="64" cy="42" r="5" fill="${face}"/>
         <path d="M33 60 Q50 76 67 60" fill="none" stroke="${face}" stroke-width="5" stroke-linecap="round"/>`
      : '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="${body}"/>${halfFill}
      <circle cx="50" cy="50" r="44" fill="none" stroke="${line}" stroke-width="6" ${type ? '' : 'stroke-dasharray="8 7"'}/>
      ${faceBits}</svg>`;
  }

  // ---------- Sound, voice, buzz ----------
  let audioCtx = null;
  function tone(freq, start, dur, type = 'sine', vol = 0.18) {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime + start;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    tap: () => tone(660, 0, 0.08, 'triangle', 0.12),
    clop: () => [0, 0.14, 0.32, 0.46].forEach((t, i) => tone(i % 2 ? 620 : 880, t, 0.06, 'triangle', 0.22)),
    star: () => { sfx.clop(); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.6 + i * 0.09, 0.25, 'triangle')); },
    neigh: () => neigh(),
    fanfare: () => { neigh(); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.13, i === 5 ? 0.6 : 0.2, 'square', 0.1)); },
    nope: () => tone(220, 0, 0.2, 'sawtooth', 0.08),
  };
  // A little horse whinny: a wobbly pitch that rises then falls.
  function neigh() {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
      const lfo = audioCtx.createOscillator(), lfoGain = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(600, t0);
      o.frequency.linearRampToValueAtTime(1100, t0 + 0.25);
      o.frequency.linearRampToValueAtTime(450, t0 + 0.9);
      lfo.frequency.value = 14; lfoGain.gain.value = 60;
      lfo.connect(lfoGain).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.95);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); lfo.start(t0); o.stop(t0 + 1); lfo.stop(t0 + 1);
    } catch (e) { /* no audio */ }
  }
  function say(text) {
    if (!state.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ''));
      u.rate = 0.95; u.pitch = 1.25;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice */ }
  }
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  // ---------- Confetti & flying star ----------
  function confetti(n = 40, bits = FARM_BITS) {
    const box = $('confetti');
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'bit';
      s.textContent = pick(bits);
      s.style.left = Math.random() * 100 + 'vw';
      s.style.fontSize = 18 + Math.random() * 26 + 'px';
      s.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      s.style.animationDelay = Math.random() * 0.5 + 's';
      box.appendChild(s);
      setTimeout(() => s.remove(), 4500);
    }
  }
  function flyStar(fromEl) {
    const pill = $('starPill');
    const a = fromEl.getBoundingClientRect(), b = pill.getBoundingClientRect();
    const s = document.createElement('div');
    s.className = 'fly-star'; s.textContent = '⭐';
    s.style.left = a.left + a.width / 2 - 35 + 'px';
    s.style.top = a.top + a.height / 2 - 35 + 'px';
    document.body.appendChild(s);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = s.animate([
      { transform: 'translate(0,0) scale(.3) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * 0.3}px,${dy * 0.3 - 80}px) scale(1.6) rotate(200deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx}px,${dy}px) scale(.4) rotate(400deg)`, opacity: 0.9 },
    ], { duration: 1100, easing: 'ease-in-out' });
    anim.onfinish = () => { s.remove(); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); renderTop(); };
  }

  // ---------- Modal ----------
  const modal = $('modal'), modalCard = $('modalCard');
  let onModalClose = null;
  function openModal(html, onClose) {
    modalCard.innerHTML = html;
    modal.classList.remove('hidden');
    onModalClose = onClose || null;
  }
  function closeModal() {
    modal.classList.add('hidden');
    modalCard.innerHTML = '';
    const cb = onModalClose; onModalClose = null;
    if (cb) cb();
  }
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
    if (e.target.closest('[data-act="close"]')) closeModal();
  });

  // Show a list of celebrations one after another.
  function celebrate(list) {
    if (!list.length) return;
    const [c, ...rest] = list;
    (c.sound || sfx.fanfare)();
    confetti(c.confetti || 50);
    buzz([60, 40, 120]);
    say(c.speak || c.title);
    openModal(`
      <div class="huge">${c.emoji}</div>
      <h2>${c.title}</h2>
      ${c.text ? `<p>${c.text}</p>` : ''}
      <button class="big-btn pink" data-act="close">${c.btn || 'Yay! 🎉'}</button>`, () => { renderAll(); celebrate(rest); });
  }

  function toast(msg) {
    openModal(`<p style="font-size:20px">${esc(msg)}</p><button class="big-btn" data-act="close">OK</button>`);
  }

  // Grown-up check: an addition question a 3-year-old can't answer.
  let grownupUnlocked = false;
  function askGrownup(onPass) {
    if (grownupUnlocked) { onPass(); return; }
    const a = 6 + Math.floor(Math.random() * 14), b = 4 + Math.floor(Math.random() * 6);
    openModal(`
      <div class="gate">
        <div style="font-size:54px">🔒</div>
        <h2>Grown-ups only</h2>
        <p>What is</p>
        <div class="q">${a} + ${b} = ?</div>
        <div class="field"><input id="gateInput" type="number" inputmode="numeric" autocomplete="off" /></div>
        <button class="big-btn" data-act="gate-ok">Unlock</button>
        <button class="link-btn" data-act="close">Cancel</button>
      </div>`);
    const input = $('gateInput');
    setTimeout(() => input.focus(), 50);
    const check = () => {
      if (Number(input.value) === a + b) { grownupUnlocked = true; closeModal(); onPass(); }
      else { input.value = ''; input.style.borderColor = 'var(--red)'; sfx.nope(); buzz(120); }
    };
    modalCard.querySelector('[data-act="gate-ok"]').onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }

  // ---------- Logging doses ----------
  // Returns the celebrations earned by this change (week bonus, prize reached).
  function setDose(key, type) {
    const before = stats();
    const wasFullWeek = fullWeekKeys().includes(keyOf(weekStartOf(fromKey(key))));
    if (type) state.doses[key] = { t: type, s: (state.doses[key] && state.doses[key].s) || state.step };
    else delete state.doses[key];
    save();
    const out = [];
    const isFullWeek = fullWeekKeys().includes(keyOf(weekStartOf(fromKey(key))));
    if (isFullWeek && !wasFullWeek && type) {
      out.push({ emoji: '🗓️🌟', title: 'Bonus star!', text: 'You did OIT <b>every day</b> this week!', speak: 'Bonus star! You did O.I.T. every day this week!' });
    }
    out.push(...prizeCheck(before));
    return out;
  }

  function prizeCheck(before) {
    const s = stats();
    if (!prizeSet() || s.stars < state.prize.cost) return [];
    if (before && before.stars >= state.prize.cost) return [];
    if (state.celebratedPrize === prizeSig()) return [];
    state.celebratedPrize = prizeSig(); save();
    return [{
      emoji: state.prize.photo ? `<div class="prize-pic won" style="margin:0 auto"><img src="${state.prize.photo}" alt=""></div>` : state.prize.emoji,
      title: 'You earned your prize!',
      text: `${esc(state.prize.name || 'Your prize')}! Go show a grown-up! 🎉`,
      speak: `You earned your prize! ${state.prize.name}! Go show a grown-up!`,
      confetti: 90,
    }];
  }

  function kidLogDose(type, btn) {
    const key = keyOf(today());
    if (state.doses[key]) return;
    const extra = setDose(key, type);
    sfx.star(); buzz(80); confetti(30);
    flyStar(btn);
    say(`${pick(CHEERS)} ${type === 'full' ? 'Full dose' : 'Half dose'}! You got a star!`);
    renderToday(true);
    if (extra.length) setTimeout(() => celebrate(extra), 1500);
  }

  // ---------- Top bar ----------
  function renderTop() {
    $('avatar').textContent = state.avatar;
    const h = new Date().getHours();
    $('helloSmall').textContent = h < 12 ? 'Good morning!' : h < 17 ? 'Good afternoon!' : 'Good evening!';
    $('helloBig').textContent = state.name ? `Hi, ${state.name}!` : 'Star Steps';
    $('starCount').textContent = stats().stars;
  }
  $('avatarBtn').onclick = () => {
    sfx.tap();
    const done = !!state.doses[keyOf(today())];
    say(done ? `Hi ${state.name}! You already did O.I.T. today. Great job!` : `O.I.T. time, ${state.name}!`);
  };

  // ---------- Today ----------
  function weekStrip() {
    const ws = weekStartOf(today()), tk = keyOf(today());
    let n = 0, cells = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), k = keyOf(d), dose = state.doses[k];
      if (dose) n++;
      cells += `<div class="wday ${k === tk ? 'today' : ''}">${DAY_LETTERS[d.getDay()]}${doseSvg(dose && dose.t, { face: k === tk })}</div>`;
    }
    return `<div class="week">${cells}<div class="wbonus ${n >= 7 ? 'on' : ''}">🌟<small>${n}/7</small></div></div>`;
  }

  function miniSteps() {
    let bars = '';
    for (let i = 1; i <= state.totalSteps; i++) bars += `<i class="${i < state.step ? 'done' : i === state.step ? 'now' : ''}"></i>`;
    return bars;
  }

  function renderToday(justDone) {
    const key = keyOf(today()), dose = state.doses[key];
    const s = stats();
    const top = dose
      ? `<div class="card done-card">
          <div class="done-star" ${justDone ? '' : 'style="animation-name:glow;animation-delay:0s"'}>⭐</div>
          <h2>You did it!</h2>
          <div class="dose-chip">${doseSvg(dose.t)} ${dose.t === 'full' ? 'Full dose' : 'Half dose'}</div>
          <p class="muted" style="font-size:18px;margin:10px 0 0">See you tomorrow! 👋</p>
          <button class="link-btn" data-act="undo">Oops, change it (grown-ups)</button>
        </div>`
      : `<div class="dose-grid">
          <button class="dose-btn full" data-act="dose" data-type="full">${doseSvg('full')}FULL<span class="sub">whole dose</span></button>
          <button class="dose-btn half" data-act="dose" data-type="half">${doseSvg('half')}HALF<span class="sub">half dose</span></button>
        </div>`;

    $('view-today').innerHTML = `
      <div class="buddy-row">
        <div class="buddy-big">${state.avatar}</div>
        <div class="bubble">${dose ? 'Star for today! ⭐' : `OIT time${state.name ? ', ' + esc(state.name) : ''}!`} <button class="speak-btn" data-act="speak" aria-label="Say it">🔊</button></div>
      </div>
      ${top}
      <div class="card">
        <h3>My week ${s.streak >= 2 ? `<span class="muted" style="font-size:16px">· 🔥 ${s.streak} days in a row</span>` : ''}</h3>
        ${weekStrip()}
        <p class="hint center">Every day this week = bonus 🌟</p>
      </div>
      <div class="card" data-act="go-steps">
        <div class="step-head"><h3>🐎 My step</h3><b>${state.step} <span class="muted" style="font-size:18px">of ${state.totalSteps}</span></b></div>
        <div class="mini-steps">${miniSteps()}</div>
      </div>`;
  }

  $('view-today').addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'dose') kidLogDose(t.dataset.type, t);
    if (act === 'speak') {
      const dose = state.doses[keyOf(today())];
      say(dose ? 'You got your star for today! Great job!' : `O.I.T. time, ${state.name}! Did you take a full dose or a half dose? Tap one!`);
    }
    if (act === 'go-steps') showView('steps');
    if (act === 'undo') askGrownup(() => { grownupUnlocked = false; doseChooser(keyOf(today())); });
  });

  // Grown-up picker for one day: Full / Half / None.
  function doseChooser(key) {
    const cur = state.doses[key] && state.doses[key].t;
    const d = fromKey(key);
    openModal(`
      <h2>${DAY_NAMES[d.getDay()]}, ${shortDate(d)}</h2>
      <p class="muted">What did he take?</p>
      <div class="choice-grid">
        <button data-pick="full" class="${cur === 'full' ? 'sel' : ''}">${doseSvg('full')}Full</button>
        <button data-pick="half" class="${cur === 'half' ? 'sel' : ''}">${doseSvg('half')}Half</button>
        <button data-pick="" class="${!cur ? 'sel' : ''}">${doseSvg(null)}None</button>
      </div>
      <button class="link-btn" data-act="close">Cancel</button>`);
    modalCard.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const extra = setDose(key, b.dataset.pick || null);
      closeModal();
      renderAll();
      if (extra.length) celebrate(extra);
    });
  }

  // ---------- Prize ----------
  function renderJar() {
    const s = stats(), p = state.prize;
    let hero;
    if (!prizeSet()) {
      hero = `<div class="card prize-hero">
        <div class="prize-pic">🎁</div>
        <div class="prize-name">A surprise prize!</div>
        <p class="muted">Ask a grown-up to pick your prize.</p>
        <div class="tally" style="margin-top:12px"><div><div class="em">⭐</div><b>${s.stars}</b><span>my stars</span></div></div>
      </div>`;
    } else {
      const have = Math.min(s.stars, p.cost), left = Math.max(0, p.cost - s.stars), won = left === 0;
      const slots = p.cost <= 60
        ? `<div class="slots ${p.cost > 30 ? 'small' : ''}">${Array.from({ length: p.cost }, (_, i) => `<span class="slot ${i < have ? 'on' : ''}" style="animation-delay:${Math.min(i, 30) * 0.03}s">⭐</span>`).join('')}</div>`
        : `<div class="progress"><div style="width:${(have / p.cost) * 100}%"></div></div>`;
      hero = `<div class="card prize-hero" data-act="say-prize">
        <div class="prize-pic ${won ? 'won' : ''}">${p.photo ? `<img src="${p.photo}" alt="">` : p.emoji}</div>
        <div class="prize-name">${esc(p.name || 'My prize')}</div>
        <div class="prize-left">${won ? '🎉 You earned it! 🎉' : `${left} more ⭐ to go!`}</div>
        ${slots}
        <div class="muted" style="font-size:18px;font-weight:600">${have} / ${p.cost} ⭐</div>
      </div>`;
    }
    const won = state.prizesWon.slice(-8).reverse();
    $('view-jar').innerHTML = `
      ${hero}
      <div class="card">
        <h3>How I got my stars</h3>
        <div class="tally">
          <div><div class="em">💊</div><b>${s.doses}</b><span>doses</span></div>
          <div><div class="em">🗓️</div><b>${s.fullWeeks}</b><span>full weeks</span></div>
          <div><div class="em">🐎</div><b>${s.stepUps}</b><span>steps up</span></div>
        </div>
      </div>
      ${calendarCard(false)}
      ${won.length ? `<div class="card"><h3>🏆 Prizes I won</h3><ul class="history">${won.map(w => `<li>${w.emoji || '🎁'} ${esc(w.name || 'Prize')} <span class="muted">· ${shortDate(fromKey(w.date))}</span></li>`).join('')}</ul></div>` : ''}`;
  }
  $('view-jar').addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'say-prize') {
      const left = Math.max(0, state.prize.cost - stats().stars);
      say(left ? `${left} more stars to get your ${state.prize.name || 'prize'}!` : `You earned your ${state.prize.name || 'prize'}!`);
    }
    calendarNav(t, renderJar);
  });

  // ---------- Calendar (shared by Prize page and Grown-ups) ----------
  let calMonth = (() => { const t = today(); return new Date(t.getFullYear(), t.getMonth(), 1); })();
  function calendarCard(edit) {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    const lead = (first.getDay() - WEEK_START + 7) % 7;
    const tk = keyOf(today()), now = today();
    const ups = new Set(state.stepUps.map(u => u.date));
    let cells = '';
    for (let i = 0; i < 7; i++) cells += `<div class="dow">${DAY_LETTERS[(i + WEEK_START) % 7]}</div>`;
    for (let i = 0; i < lead; i++) cells += '<div class="d blank"></div>';
    for (let day = 1; day <= days; day++) {
      const d = new Date(y, m, day), k = keyOf(d), dose = state.doses[k];
      const future = d > now;
      cells += `<div class="d ${k === tk ? 'today' : ''} ${future ? 'future' : ''}" ${edit && !future ? `data-day="${k}"` : ''}>
        ${dose ? doseSvg(dose.t) : `<span>${day}</span>`}${ups.has(k) ? '<span class="up">🐎</span>' : ''}</div>`;
    }
    const atNow = y === now.getFullYear() && m === now.getMonth();
    return `<div class="card">
      <div class="cal-head"><button class="arrow" data-cal="-1" aria-label="Previous month">◀</button><b>${MONTHS[m]} ${y}</b><button class="arrow" data-cal="1" ${atNow ? 'disabled' : ''} aria-label="Next month">▶</button></div>
      <div class="cal ${edit ? 'edit' : ''}">${cells}</div>
      ${edit ? '<p class="hint">Tap a day to fix it (full, half or none). 🐎 = moved up a step that day.</p>' : ''}
    </div>`;
  }
  function calendarNav(t, rerender) {
    if (t.dataset.cal) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(t.dataset.cal), 1); rerender(); }
  }

  // ---------- Steps trail (a horse ride up the hill to the barn) ----------
  function barnSvg(x, y) {
    return `<g transform="translate(${x - 45},${y})">
      <rect x="4" y="44" width="82" height="56" fill="#d6453d"/>
      <path d="M-4 48 L45 6 L94 48 Z" fill="#b8352e"/>
      <path d="M-6 50 L45 4 L96 50" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
      <rect x="31" y="20" width="28" height="20" rx="3" fill="#fff"/><rect x="35" y="24" width="20" height="12" fill="#ffd98a"/>
      <rect x="27" y="60" width="36" height="40" fill="#fff"/>
      <path d="M31 64 L59 96 M59 64 L31 96" stroke="#d6453d" stroke-width="5"/>
      <rect x="31" y="64" width="28" height="32" fill="none" stroke="#d6453d" stroke-width="4"/>
    </g>`;
  }
  function fenceSvg(x1, x2, y) {
    let posts = '';
    for (let x = x1; x <= x2; x += 30) posts += `<rect x="${x}" y="${y - 22}" width="7" height="30" rx="2" fill="#fff"/>`;
    return `<rect x="${x1}" y="${y - 16}" width="${x2 - x1 + 7}" height="5" fill="#fff"/><rect x="${x1}" y="${y - 4}" width="${x2 - x1 + 7}" height="5" fill="#fff"/>${posts}`;
  }
  function renderSteps() {
    const n = state.totalSteps, cur = state.step;
    const gap = 72, W = 320, top = 190, H = top + gap * (n - 1) + 80;
    const pts = [];
    for (let i = 1; i <= n; i++) {
      const y = H - 56 - (i - 1) * gap;
      const x = W / 2 + Math.sin((i - 1) * 1.05) * 90;
      pts.push([x, y]);
    }
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const [tx, ty] = pts[n - 1];
    let stones = '';
    pts.forEach(([x, y], i) => {
      const step = i + 1, done = step < cur, now = step === cur;
      const fill = done ? '#36c96b' : now ? '#e85a4f' : '#ffffff';
      const stroke = done ? '#23a052' : now ? '#c23d33' : '#d8c7a8';
      stones += `<g ${now ? 'id="stoneNow"' : ''}>
        <circle cx="${x}" cy="${y}" r="27" fill="${fill}" stroke="${stroke}" stroke-width="5"/>
        <text x="${x}" y="${y + 9}" text-anchor="middle" font-size="26" font-weight="700" fill="${done || now ? '#fff' : '#b39e7c'}" font-family="Fredoka, sans-serif">${step}</text>
        ${done ? `<text x="${x + 24}" y="${y - 16}" font-size="22" text-anchor="middle">⭐</text>` : ''}
        ${now && cur < n ? `<g class="stone-now"><text x="${x}" y="${y - 30}" font-size="50" text-anchor="middle">${state.avatar}</text></g>` : ''}
      </g>`;
    });
    // Flowers and farm friends scattered beside the trail.
    const deco = ['🌻', '🐔', '🌼', '🐑', '🌻', '🥕', '🐄', '🌼', '🍎', '🐓'];
    let decos = '';
    pts.forEach(([x, y], i) => {
      if (i % 2) return;
      const dx = x > W / 2 ? -110 : 110;
      decos += `<text x="${Math.min(W - 20, Math.max(20, x + dx))}" y="${y + 10}" font-size="28" text-anchor="middle" opacity=".9">${deco[(i / 2) % deco.length]}</text>`;
    });
    const atTop = cur >= n;
    $('view-steps').innerHTML = `
      <div class="card mountain-card">
        <div class="mountain-title">${atTop ? '🏆 You made it to the barn! 🏆' : `Step ${cur} of ${n}`}</div>
        <div class="mountain-sub">${atTop ? 'You rode all the way! Yee-haw!' : `${n - cur} more to the barn! Giddy-up!`}</div>
        <div class="mountain" data-act="say-step">
          <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Step ${cur} of ${n}">
            <circle cx="${W - 46}" cy="46" r="26" fill="#ffd23f"/>
            <path d="M0 ${top + 10} Q${W * 0.25} ${top - 40} ${W / 2} ${top} T${W} ${top - 10} V${H} H0 Z" fill="#a8e07e"/>
            <path d="M0 ${top + 120} Q${W * 0.3} ${top + 60} ${W * 0.65} ${top + 110} T${W} ${top + 90} V${H} H0 Z" fill="#8fd16a" opacity=".7"/>
            ${fenceSvg(6, 110, top + 22)}
            <path d="${path}" fill="none" stroke="#d9b27c" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
            <path d="${path}" fill="none" stroke="#b8895a" stroke-width="6" stroke-dasharray="3 20" stroke-linecap="round" opacity=".6"/>
            ${barnSvg(tx, ty - 150)}
            ${atTop ? `<g class="stone-now"><text x="${tx}" y="${ty - 158}" font-size="50" text-anchor="middle">${state.avatar}</text></g>` : ''}
            ${decos}
            ${stones}
          </svg>
        </div>
      </div>
      <div class="card center"><p style="margin:0;font-size:18px">Each new step = bonus 🌟</p></div>`;
    setTimeout(() => {
      const el = $('stoneNow');
      if (el && $('view-steps').classList.contains('active')) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }
  $('view-steps').addEventListener('click', e => {
    if (e.target.closest('[data-act="say-step"]')) {
      const left = state.totalSteps - state.step;
      say(left ? `You are on step ${state.step}! ${left} more steps to the barn! Giddy-up!` : 'Yee-haw! You made it to the barn!');
    }
  });

  // ---------- Grown-ups ----------
  function renderGrownups() {
    if (!grownupUnlocked) {
      $('view-grownups').innerHTML = `
        <div class="card center">
          <div style="font-size:70px">🔒</div>
          <h3 style="font-size:24px">Grown-ups only</h3>
          <p class="muted">Set the step, the prize and fix past days here.</p>
          <button class="big-btn" id="unlock">Unlock</button>
        </div>`;
      $('unlock').onclick = () => askGrownup(renderGrownups);
      return;
    }
    const s = stats(), p = state.prize;
    const last = state.stepUps[state.stepUps.length - 1];
    $('view-grownups').innerHTML = `
      <div class="card">
        <h3>🐎 Immunotherapy step</h3>
        <div class="stepper"><b>${state.step} / ${state.totalSteps}</b></div>
        <button class="big-btn pink" id="gUp" ${state.step >= state.totalSteps ? 'disabled' : ''}>⬆️ Moved up to step ${Math.min(state.step + 1, state.totalSteps)}!</button>
        ${last ? `<button class="link-btn" id="gUndoUp">Undo last move up (step ${last.to}, ${shortDate(fromKey(last.date))})</button>` : ''}
        <div class="field" style="margin-top:16px"><label>Fix the step he's on (no bonus star)</label>
          <div class="stepper"><button id="gStepMinus" aria-label="Lower step">−</button><b>${state.step}</b><button id="gStepPlus" aria-label="Raise step">+</button></div>
        </div>
        <div class="field"><label>Total steps in his plan</label>
          <div class="stepper"><button id="gTotMinus" aria-label="Fewer total steps">−</button><b>${state.totalSteps}</b><button id="gTotPlus" aria-label="More total steps">+</button></div>
        </div>
        ${state.stepUps.length ? `<ul class="history">${state.stepUps.slice().reverse().map(u => `<li>🐎 Step ${u.to} · ${shortDate(fromKey(u.date))}</li>`).join('')}</ul>` : ''}
      </div>

      <div class="card">
        <h3>🎁 Prize</h3>
        <div class="field"><label>Prize name</label><input type="text" id="gPrizeName" maxlength="40" placeholder="e.g. Ice cream trip" value="${esc(p.name)}" /></div>
        <div class="field"><label>Picture</label>
          <div class="emoji-pick" id="gPrizeEmoji">${PRIZE_EMOJIS.map(e => `<button data-emoji="${e}" class="${!p.photo && p.emoji === e ? 'sel' : ''}">${e}</button>`).join('')}</div>
          <div class="row" style="margin-top:10px">
            <button class="big-btn blue" id="gPhotoBtn" style="margin:0;font-size:18px">📷 ${p.photo ? 'Change photo' : 'Use a photo'}</button>
            ${p.photo ? '<button class="big-btn orange" id="gPhotoClear" style="margin:0;font-size:18px">Remove photo</button>' : ''}
          </div>
          <input type="file" id="gPhoto" accept="image/*" hidden />
          <p class="hint">A photo of the real prize is great for kids who can't read yet.</p>
        </div>
        <div class="field"><label>Stars needed</label>
          <div class="stepper"><button id="gCostMinus" aria-label="Fewer stars">−</button><b>${p.cost} ⭐</b><button id="gCostPlus" aria-label="More stars">+</button></div>
        </div>
        <p class="hint center">He has ${s.stars} ⭐ now. A dose every day is about 8 ⭐ a week.</p>
        <button class="big-btn" id="gGive" ${!prizeSet() || s.stars < p.cost ? 'disabled' : ''}>🎉 Prize given! (uses ${p.cost} ⭐)</button>
      </div>

      ${calendarCard(true)}

      <div class="card">
        <h3>⭐ Stars</h3>
        <p style="margin:0;font-size:17px">${s.doses} doses (${s.full} full, ${s.half} half) + ${s.fullWeeks} full weeks + ${s.stepUps} steps up = <b>${s.earned}</b> earned · ${state.spent} spent on prizes · <b>${s.stars}</b> now</p>
      </div>

      <div class="card">
        <h3>🧒 Kid</h3>
        <div class="field"><label>Name</label><input type="text" id="gName" maxlength="20" placeholder="Name" value="${esc(state.name)}" /></div>
        <div class="field"><label>Buddy</label>
          <div class="emoji-pick" id="gAvatar">${AVATARS.map(a => `<button data-avatar="${a}" class="${state.avatar === a ? 'sel' : ''}">${a}</button>`).join('')}</div>
        </div>
        <div class="toggle">Sounds <button class="switch ${state.sound ? 'on' : ''}" id="gSound" aria-label="Sounds"></button></div>
        <div class="toggle">Talking buddy <button class="switch ${state.voice ? 'on' : ''}" id="gVoice" aria-label="Talking buddy"></button></div>
      </div>

      <div class="card">
        <h3>💾 Backup</h3>
        <p class="hint" style="margin-top:0">Progress lives only on this phone. Save a backup now and then.</p>
        <div class="row"><button class="big-btn blue" id="gExport" style="font-size:18px">Download</button><button class="big-btn blue" id="gImportBtn" style="font-size:18px">Restore</button></div>
        <input type="file" id="gImport" accept="application/json,.json" hidden />
        <button class="link-btn" id="gReset" style="color:var(--red)">Erase everything</button>
      </div>
      <button class="link-btn" id="gLock">🔒 Lock grown-ups area</button>`;

    const set = fn => () => { fn(); save(); renderAll(); };
    $('gUp').onclick = () => {
      if (state.step >= state.totalSteps) return;
      const before = stats();
      state.step++;
      state.stepUps.push({ date: keyOf(today()), to: state.step });
      save();
      const top = state.step >= state.totalSteps;
      celebrate([{
        emoji: top ? '🐴🏆' : '🐎🌟',
        title: top ? 'You made it to the barn!' : `Step ${state.step}!`,
        text: top ? 'You rode all the way! Bonus star!' : 'Giddy-up! You trotted up a step! <b>Bonus star!</b>',
        speak: top ? 'Yee-haw! You made it all the way to the barn! Bonus star!' : `Giddy-up! You trotted up to step ${state.step}! Bonus star!`,
        confetti: 80,
      }, ...prizeCheck(before)]);
    };
    if ($('gUndoUp')) $('gUndoUp').onclick = set(() => { const u = state.stepUps.pop(); if (u && state.step === u.to) state.step = Math.max(1, u.to - 1); });
    $('gStepMinus').onclick = set(() => { state.step = Math.max(1, state.step - 1); });
    $('gStepPlus').onclick = set(() => { state.step = Math.min(state.totalSteps, state.step + 1); });
    $('gTotMinus').onclick = set(() => { state.totalSteps = Math.max(Math.max(2, state.step), state.totalSteps - 1); });
    $('gTotPlus').onclick = set(() => { state.totalSteps = Math.min(40, state.totalSteps + 1); });

    $('gPrizeName').onchange = e => { state.prize.name = e.target.value.trim(); save(); renderAll(); };
    $('gPrizeEmoji').onclick = e => { const b = e.target.closest('[data-emoji]'); if (b) set(() => { state.prize.emoji = b.dataset.emoji; state.prize.photo = ''; })(); };
    $('gPhotoBtn').onclick = () => $('gPhoto').click();
    $('gPhoto').onchange = e => { const f = e.target.files[0]; if (f) shrinkPhoto(f).then(url => set(() => { state.prize.photo = url; })()).catch(() => toast('Could not use that picture.')); };
    if ($('gPhotoClear')) $('gPhotoClear').onclick = set(() => { state.prize.photo = ''; });
    const step = c => c < 30 ? 1 : 5;
    $('gCostMinus').onclick = set(() => { state.prize.cost = Math.max(1, state.prize.cost - step(state.prize.cost - 1)); });
    $('gCostPlus').onclick = set(() => { state.prize.cost = Math.min(500, state.prize.cost + step(state.prize.cost)); });
    $('gGive').onclick = () => {
      const p = state.prize;
      state.prizesWon.push({ name: p.name, emoji: p.photo ? '🎁' : p.emoji, cost: p.cost, date: keyOf(today()) });
      state.spent += p.cost;
      save();
      openModal(`<div class="huge">🎉</div><h2>Enjoy the prize!</h2><p>${p.cost} ⭐ used. Pick the next prize whenever you're ready.</p><button class="big-btn" data-act="close">OK</button>`, renderAll);
    };

    $('view-grownups').querySelectorAll('[data-day]').forEach(el => el.onclick = () => doseChooser(el.dataset.day));
    $('view-grownups').querySelectorAll('[data-cal]').forEach(el => el.onclick = () => calendarNav(el, renderGrownups));

    $('gName').onchange = e => { state.name = e.target.value.trim(); save(); renderAll(); };
    $('gAvatar').onclick = e => { const b = e.target.closest('[data-avatar]'); if (b) set(() => { state.avatar = b.dataset.avatar; })(); };
    $('gSound').onclick = set(() => { state.sound = !state.sound; });
    $('gVoice').onclick = set(() => { state.voice = !state.voice; if (!state.voice && 'speechSynthesis' in window) speechSynthesis.cancel(); });

    $('gExport').onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `star-steps-backup-${keyOf(today())}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $('gImportBtn').onclick = () => $('gImport').click();
    $('gImport').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then(txt => {
        const data = JSON.parse(txt);
        if (!data || typeof data.doses !== 'object') throw new Error('bad');
        state = Object.assign(structuredClone(DEFAULT_STATE), data);
        state.prize = Object.assign(structuredClone(DEFAULT_STATE.prize), data.prize);
        save(); renderAll(); toast('Backup restored!');
      }).catch(() => toast("That file isn't a Star Steps backup."));
    };
    $('gReset').onclick = () => {
      if (confirm('Erase all stars, doses and settings on this phone? This cannot be undone.')) {
        state = structuredClone(DEFAULT_STATE); save(); renderAll();
      }
    };
    $('gLock').onclick = () => { grownupUnlocked = false; renderGrownups(); };
  }

  // Resize a photo so it fits comfortably in localStorage.
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = 360, scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- Navigation ----------
  let currentView = 'today';
  function showView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
    if (name !== 'grownups' && grownupUnlocked) grownupUnlocked = false; // re-lock when leaving
    renderView(name);
    window.scrollTo({ top: 0 });
  }
  function renderView(name) {
    ({ today: renderToday, jar: renderJar, steps: renderSteps, grownups: renderGrownups })[name]();
  }
  function renderAll() { renderTop(); renderView(currentView); }
  document.querySelector('.tabbar').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (!t) return;
    sfx.tap();
    showView(t.dataset.view);
  });

  // Roll over to a new day if the app is left open past midnight.
  let dayKey = keyOf(today());
  const checkDay = () => { if (keyOf(today()) !== dayKey) { dayKey = keyOf(today()); calMonth = new Date(today().getFullYear(), today().getMonth(), 1); renderAll(); } };
  setInterval(checkDay, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });

  renderTop();
  renderToday();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
})();

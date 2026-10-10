/* Clean Sheet — a nightly breathalyzer log and savings tracker, Arsenal style.
 * A night with every reading at or under the pass mark is a clean sheet and banks the nightly whiskey money.
 * Everything is stored on this phone in localStorage. No accounts, no servers. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'clean-sheet-v1';
  const MAX_TESTS = 3;
  const NIGHT_ENDS_AT = 6; // a reading before 6 a.m. belongs to the night before
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Team talks, one per night. Original lines, plus the club motto.
  const TALKS = [
    ['Victoria Concordia Crescit.', 'Victory grows through harmony. The club motto since 1949.'],
    ['The Invincibles didn’t win 49 in one night. They won one, 49 times.', 'One match at a time'],
    ['Clean sheets win titles.', 'Every defender who ever lived'],
    ['Tonight’s fixture: you against the bottle. You’re at home. Play like it.', 'Pre-match'],
    ['A 1–0 is still three points. Boring nights count too.', 'Points are points'],
    ['Nobody remembers the nights you stayed in. Everybody remembers the mornings you felt great.', 'Half-time'],
    ['The best teams don’t panic when they concede. They kick off again.', 'Next match'],
    ['Defend the lead. Keep your shape. See the game out.', 'Last ten minutes'],
    ['North London is red, and tonight the reading is zero.', 'From the North Bank'],
    ['Form is temporary. Habits are permanent.', 'Training ground'],
    ['Every clean sheet is money in the bank and a better tomorrow.', 'Gaffer’s note'],
    ['Win the night. Wake up a winner.', 'Matchday'],
    ['The cravings press high. Stay calm, play it out from the back.', 'Tactics board'],
    ['Big games are won in the quiet moments.', 'Dressing room'],
    ['Champions are built on the nights nobody sees.', 'Gaffer’s note'],
  ];

  const TROPHIES = [
    { id: 'first', name: 'First Clean Sheet', desc: 'One sober night logged', kind: 'total', n: 1 },
    { id: 'hat', name: 'Hat-trick', desc: '3 clean sheets in a row', kind: 'run', n: 3 },
    { id: 'week', name: 'Gameweek Hero', desc: '7 in a row', kind: 'run', n: 7 },
    { id: 'fort', name: 'Fortnight Fortress', desc: '14 in a row', kind: 'run', n: 14 },
    { id: 'month', name: 'Player of the Month', desc: '30 in a row', kind: 'run', n: 30 },
    { id: 'season', name: 'Full Season', desc: '38 in a row, one for every league match', kind: 'run', n: 38 },
    { id: 'invincible', name: 'Invincible', desc: '49 unbeaten, matching the 2003–04 run', kind: 'run', n: 49 },
    { id: 'hundred', name: 'Centurion', desc: '100 clean sheets in total', kind: 'total', n: 100 },
    { id: 'half', name: 'Half a Year', desc: '182 in a row', kind: 'run', n: 182 },
    { id: 'year', name: 'Legend', desc: '365 in a row. A whole year.', kind: 'run', n: 365 },
    { id: 'm500', name: 'First $500', desc: 'Saved $500', kind: 'money', n: 500 },
    { id: 'm1k', name: 'The Grand', desc: 'Saved $1,000', kind: 'money', n: 1000 },
    { id: 'm5k', name: 'Transfer Kitty', desc: 'Saved $5,000', kind: 'money', n: 5000 },
    { id: 'm10k', name: 'Record Signing', desc: 'Saved $10,000', kind: 'money', n: 10000 },
  ];

  // ---------- Helpers ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
  const nightKeyNow = () => { const d = new Date(); if (d.getHours() < NIGHT_ENDS_AT) d.setDate(d.getDate() - 1); return keyOf(d); };
  const niceDate = k => { const d = fromKey(k); return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
  const timeOf = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const bac = n => n.toFixed(3);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 1,
    name: '',
    nightly: 30,       // dollars a night that used to go on whiskey
    passMark: 0,       // highest reading that still counts as clean
    start: '',         // first night, 'YYYY-MM-DD'
    why: '',           // his own reason, shown on Tonight and in the craving screen
    sound: true,
    nights: {},        // 'YYYY-MM-DD' -> { amt, tests: [{ t, v }] }
    goal: { name: 'Trip to London for a match at the Emirates', cost: 3000 },
    rewards: [],       // [{ name, cost, date }] goals he cashed in
    seenTrophies: [],
  };
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw));
        s.goal = Object.assign(structuredClone(DEFAULT_STATE.goal), s.goal);
        return s;
      }
    } catch (e) { /* fall through */ }
    return structuredClone(DEFAULT_STATE);
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Couldn’t save on this phone. Is storage full?'); }
  }

  // ---------- Scoring ----------
  function resultOf(k) {
    const tonight = nightKeyNow();
    if (!state.start || k < state.start) return 'pre';
    if (k > tonight) return 'future';
    const n = state.nights[k];
    if (!n || !n.tests.length) return k === tonight ? 'pending' : 'missed';
    return n.tests.some(t => t.v > state.passMark + 1e-9) ? 'loss' : 'win';
  }
  const amtOf = k => (state.nights[k] && state.nights[k].amt) || state.nightly;

  function stats() {
    const tonight = nightKeyNow();
    const s = { wins: 0, losses: 0, missed: 0, saved: 0, run: 0, best: 0, series: [], matchday: 0 };
    if (!state.start) return s;
    let run = 0;
    for (let d = fromKey(state.start); keyOf(d) <= tonight; d = addDays(d, 1)) {
      const k = keyOf(d), r = resultOf(k);
      s.matchday++;
      if (r === 'win') { s.wins++; s.saved += amtOf(k); run++; s.best = Math.max(s.best, run); }
      else if (r === 'loss') { s.losses++; run = 0; }
      else if (r === 'missed') { s.missed++; run = 0; }
      s.series.push({ k, r, saved: s.saved });
    }
    s.run = run; // a pending tonight doesn't break the run
    s.spent = state.rewards.reduce((a, r) => a + r.cost, 0);
    s.bank = s.saved - s.spent;
    return s;
  }

  function trophyProgress(t, s) {
    const have = t.kind === 'run' ? s.best : t.kind === 'total' ? s.wins : s.saved;
    return { have, won: have >= t.n };
  }

  // ---------- Rendering ----------
  let view = 'tonight';
  let calMonth = (() => { const d = fromKey(nightKeyNow()); return new Date(d.getFullYear(), d.getMonth(), 1); })();

  function renderAll() {
    renderTop();
    ({ tonight: renderTonight, season: renderSeason, savings: renderSavings, trophies: renderTrophies })[view]();
  }

  function renderTop() {
    const s = stats();
    const name = state.name || 'Gunner';
    $('hello').textContent = state.start ? `${name} · Matchday ${s.matchday} · ${money(s.saved)} saved` : `Up the Arsenal, ${name}`;
  }

  function scoreboard(s) {
    const home = (state.name || 'You').slice(0, 14);
    return `
      <div class="scoreboard" aria-label="Season score">
        <div class="sb-top"><span>Season so far</span><span>${s.run ? `Unbeaten run: ${s.run}` : 'Kick-off'}</span></div>
        <div class="sb-main">
          <div class="sb-team">${esc(home)}</div>
          <div class="sb-score"><span class="h">${s.wins}</span><span class="dash">–</span><span class="a">${s.losses}</span></div>
          <div class="sb-team away">Whiskey</div>
        </div>
      </div>`;
  }

  function nightPanel(k) {
    const n = state.nights[k] || { tests: [] };
    const r = resultOf(k);
    const slots = [];
    for (let i = 0; i < MAX_TESTS; i++) {
      const t = n.tests[i];
      if (t) {
        const clean = t.v <= state.passMark + 1e-9;
        slots.push(`<div class="test-slot filled ${clean ? 'clean' : 'over'}">
          <span class="lbl">Test ${i + 1}</span><span class="val">${bac(t.v)}</span><span class="tm">${timeOf(t.t)}</span>
          <button class="del" data-del="${i}" aria-label="Remove test ${i + 1}">remove</button></div>`);
      } else {
        slots.push(`<div class="test-slot"><span class="lbl">Test ${i + 1}</span><span class="val muted">–.–––</span><span class="tm">${i === 0 ? 'required' : 'optional'}</span></div>`);
      }
    }
    let banner = '';
    if (r === 'win') banner = `<div class="result win"><span class="result-big">Clean sheet!</span><span class="result-money">+${money(amtOf(k))} banked</span><p>${n.tests.length < MAX_TESTS ? 'Keep it locked. Another test later keeps it honest.' : 'All three tests clean. Full-time.'}</p></div>`;
    else if (r === 'loss') banner = `<div class="result loss"><span class="result-big">Whiskey scored</span><p>One result doesn’t decide a season. Shake it off. The next match is tomorrow night.</p></div>`;
    const full = n.tests.length >= MAX_TESTS;
    return `
      ${banner}
      <div class="tests">${slots.join('')}</div>
      ${full ? '' : `
      <button class="btn primary zero-btn" data-zero>Blew 0.000</button>
      <form class="entry" data-entry>
        <div class="bac-wrap">
          <label class="sr" for="bac-${k}" hidden>Breathalyzer reading</label>
          <input class="bac-input" id="bac-${k}" inputmode="decimal" autocomplete="off" placeholder="0.000" aria-label="Breathalyzer reading, percent BAC" />
          <span class="bac-unit">% BAC</span>
        </div>
        <button class="btn" type="submit">Log reading</button>
      </form>`}`;
  }

  function bindNightPanel(root, k, after) {
    const z = root.querySelector('[data-zero]');
    if (z) z.onclick = () => { logTest(k, 0); after(); };
    const f = root.querySelector('[data-entry]');
    if (f) f.onsubmit = e => {
      e.preventDefault();
      const raw = f.querySelector('input').value.trim().replace(',', '.');
      const v = Number(raw);
      if (raw === '' || !isFinite(v) || v < 0 || v > 0.5) { toast('Type the number on the breathalyzer, like 0.000 or 0.02.'); return; }
      logTest(k, Math.round(v * 1000) / 1000);
      after();
    };
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmBox(
      'Remove this reading?', `Test ${+b.dataset.del + 1}: ${bac(state.nights[k].tests[+b.dataset.del].v)}. Only do this if it was typed wrong.`, 'Remove',
      () => { state.nights[k].tests.splice(+b.dataset.del, 1); save(); after(); renderTop(); }, true));
  }

  function logTest(k, v) {
    const before = resultOf(k);
    const s0 = stats();
    const n = state.nights[k] || (state.nights[k] = { amt: state.nightly, tests: [] });
    if (n.tests.length >= MAX_TESTS) return;
    const isPast = k !== nightKeyNow();
    // A reading for a past night gets that night's evening time if it's typed in later.
    n.tests.push({ t: isPast ? fromKey(k).setHours(22, 0, 0, 0) : Date.now(), v });
    save();
    const after = resultOf(k);
    renderTop();
    if (after === 'win' && before !== 'win') {
      whistle(); confetti();
      const s = stats();
      toast(`Clean sheet! +${money(amtOf(k))}. ${s.run > 1 ? `Unbeaten in ${s.run}.` : 'Up the Arsenal!'}`);
      checkTrophies(s0);
    } else if (after === 'loss' && before !== 'loss') {
      toast('Logged. Tomorrow is a new match.');
    } else if (after === 'win') {
      toast(`Test ${n.tests.length} clean. Still a clean sheet.`);
    }
  }

  function checkTrophies() {
    const s = stats();
    const fresh = TROPHIES.filter(t => trophyProgress(t, s).won && !state.seenTrophies.includes(t.id));
    if (!fresh.length) return;
    state.seenTrophies.push(...fresh.map(t => t.id)); save();
    setTimeout(() => { $('toast').classList.add('hidden'); openModal(`
      <div class="close-row"><h2>Trophy unlocked</h2></div>
      ${fresh.map(t => `<div class="trophy won"><svg viewBox="0 0 24 24"><use href="#i-cup"/></svg><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div>`).join('')}
      <button class="btn primary block" data-close>Get in!</button>`); }, 1600);
  }

  function renderTonight() {
    const el = $('view-tonight');
    if (!state.start) { el.innerHTML = ''; return; }
    const s = stats();
    const k = nightKeyNow();
    const yk = keyOf(addDays(fromKey(k), -1));
    const talk = TALKS[(daysBetween('2020-01-01', k)) % TALKS.length];
    el.innerHTML = `
      ${scoreboard(s)}
      ${resultOf(yk) === 'missed' ? `<div class="nudge"><p>No reading for last night (${niceDate(yk)}).</p><button class="btn small" data-open="${yk}">Add it</button></div>` : ''}
      <div class="card">
        <div class="row"><div><div class="eyebrow">Tonight · Matchday ${s.matchday}</div><h2>${niceDate(k)}</h2></div><div class="spacer"></div><span class="muted num">${money(amtOf(k))} on the line</span></div>
        <div id="tonightPanel">${nightPanel(k)}</div>
      </div>
      ${state.why ? `<div class="why"><div class="eyebrow">Why I’m doing this</div><q>${esc(state.why)}</q></div>` : ''}
      <div class="card">
        <div class="eyebrow">Team talk</div>
        <p class="talk">${esc(talk[0])}</p>
        <span class="talk-by">${esc(talk[1])}</span>
      </div>
      <button class="btn block" id="cravingBtn">Craving? Take a half-time break</button>`;
    bindNightPanel($('tonightPanel'), k, renderTonight);
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openNight(b.dataset.open));
    $('cravingBtn').onclick = openCraving;
  }

  function renderSeason() {
    const el = $('view-season');
    const s = stats();
    const played = s.wins + s.losses + s.missed;
    const last = s.series.slice(-10);
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < first; i++) cells += '<div class="day blank"></div>';
    for (let d = 1; d <= dim; d++) {
      const k = keyOf(new Date(y, m, d)), r = resultOf(k);
      const tag = r === 'win' ? 'W' : r === 'loss' ? 'L' : '';
      const tappable = !['pre', 'future'].includes(r);
      cells += `<button class="day ${r}" ${tappable ? `data-open="${k}"` : 'disabled'} aria-label="${niceDate(k)}: ${r}">${d}${tag ? `<small>${tag}</small>` : ''}</button>`;
    }
    el.innerHTML = `
      ${scoreboard(s)}
      <div class="card">
        <div class="eyebrow">Form guide · last ${last.length || 10} nights</div>
        <div class="form-guide">${last.length ? last.map(x => `<span class="pill ${x.r}" title="${niceDate(x.k)}">${{ win: 'W', loss: 'L', missed: '–', pending: '?' }[x.r]}</span>`).join('') : '<span class="muted">No matches yet.</span>'}</div>
      </div>
      <div class="stats">
        <div class="stat"><b>${s.wins}</b><span>Clean sheets</span></div>
        <div class="stat"><b>${s.run}</b><span>Current run</span></div>
        <div class="stat"><b>${s.best}</b><span>Best run</span></div>
        <div class="stat"><b>${played ? Math.round(100 * s.wins / played) : 0}%</b><span>Win rate</span></div>
      </div>
      <div class="card">
        <div class="cal-head">
          <button class="btn small ghost" id="calPrev" aria-label="Previous month">◀</button>
          <h3>${MONTHS[m]} ${y}</h3>
          <button class="btn small ghost" id="calNext" aria-label="Next month">▶</button>
        </div>
        <div class="cal">${cells}</div>
        <div class="legend"><span><i></i>Clean sheet</span><span><i class="l"></i>Drink night</span><span><i class="m"></i>No test</span></div>
        <p class="hint">Tap any night to add or fix a reading.</p>
      </div>`;
    $('calPrev').onclick = () => { calMonth = new Date(y, m - 1, 1); renderSeason(); };
    $('calNext').onclick = () => { calMonth = new Date(y, m + 1, 1); renderSeason(); };
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openNight(b.dataset.open));
  }

  function savingsChart(series) {
    const pts = series.filter(x => x.r !== 'pending');
    if (pts.length < 2) return '<p class="hint">The savings chart appears after your second night.</p>';
    const W = 320, H = 140, L = 44, R = 8, T = 10, B = 22;
    const max = Math.max(state.nightly, pts[pts.length - 1].saved);
    const top = Math.ceil(max / 100) * 100 || 100;
    const x = i => L + (i / (pts.length - 1)) * (W - L - R);
    const yv = v => T + (1 - v / top) * (H - T - B);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yv(p.saved).toFixed(1)}`).join(' ');
    const area = `${line} L${x(pts.length - 1).toFixed(1)} ${yv(0)} L${L} ${yv(0)} Z`;
    const lp = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Savings over time">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8b45e" stop-opacity=".45"/><stop offset="1" stop-color="#d8b45e" stop-opacity="0"/></linearGradient></defs>
      <line x1="${L}" x2="${W - R}" y1="${yv(top)}" y2="${yv(top)}" stroke="#26365f" stroke-dasharray="3 4"/>
      <line x1="${L}" x2="${W - R}" y1="${yv(top / 2)}" y2="${yv(top / 2)}" stroke="#26365f" stroke-dasharray="3 4"/>
      <line x1="${L}" x2="${W - R}" y1="${yv(0)}" y2="${yv(0)}" stroke="#26365f"/>
      <text class="axis" x="${L - 6}" y="${yv(top) + 3}" text-anchor="end">${money(top)}</text>
      <text class="axis" x="${L - 6}" y="${yv(top / 2) + 3}" text-anchor="end">${money(top / 2)}</text>
      <text class="axis" x="${L - 6}" y="${yv(0) + 3}" text-anchor="end">$0</text>
      <text class="axis" x="${L}" y="${H - 6}">${niceDate(pts[0].k).slice(4)}</text>
      <text class="axis" x="${W - R}" y="${H - 6}" text-anchor="end">${niceDate(lp.k).slice(4)}</text>
      <path d="${area}" fill="url(#g)"/>
      <path d="${line}" fill="none" stroke="#d8b45e" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="${x(pts.length - 1)}" cy="${yv(lp.saved)}" r="4.5" fill="#ef0107" stroke="#fff" stroke-width="1.5"/>
    </svg>`;
  }

  function renderSavings() {
    const el = $('view-savings');
    const s = stats();
    const g = state.goal;
    const pct = g.cost > 0 ? Math.min(100, (s.bank / g.cost) * 100) : 0;
    const need = Math.max(0, g.cost - s.bank);
    const nightsLeft = Math.ceil(need / state.nightly);
    const eta = addDays(fromKey(nightKeyNow()), nightsLeft);
    el.innerHTML = `
      <div class="card bank">
        <div class="eyebrow">In the transfer kitty</div>
        <div class="bank-amt">${money(s.bank)}</div>
        <div class="bank-sub">${s.wins} clean sheet${s.wins === 1 ? '' : 's'} × ${money(state.nightly)} not spent on whiskey${s.spent ? ` · ${money(s.spent)} spent on rewards` : ''}</div>
      </div>
      <div class="card">
        <div class="row"><div class="eyebrow">Saving for</div><div class="spacer"></div><button class="btn small ghost" id="editGoal">Change</button></div>
        <div class="goal-name">${esc(g.name)}</div>
        <div class="bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
        <div class="row"><span class="num">${money(Math.min(s.bank, g.cost))} of ${money(g.cost)}</span><div class="spacer"></div>
          <span class="muted">${need ? `${nightsLeft} more clean sheet${nightsLeft === 1 ? '' : 's'} · about ${MONTHS[eta.getMonth()].slice(0, 3)} ${eta.getDate()}` : 'Paid for!'}</span></div>
        ${need ? '' : '<button class="btn gold block" id="cashIn">Cash it in</button>'}
      </div>
      <div class="card chart">
        <div class="eyebrow">Money saved, night by night</div>
        ${savingsChart(s.series)}
      </div>
      <div class="card">
        <div class="eyebrow">What staying sober is worth</div>
        <dl class="kv">
          <dt>A week of clean sheets</dt><dd>${money(state.nightly * 7)}</dd>
          <dt>A month</dt><dd>${money(state.nightly * 30)}</dd>
          <dt>A full 38-match season</dt><dd>${money(state.nightly * 38)}</dd>
          <dt>A whole year</dt><dd>${money(state.nightly * 365)}</dd>
        </dl>
      </div>
      ${state.rewards.length ? `<div class="card"><div class="eyebrow">Rewards earned</div><ul class="rewards">${state.rewards.slice().reverse().map(r => `<li><span>${esc(r.name)} <span class="muted">· ${niceDate(r.date)}</span></span><b class="num">${money(r.cost)}</b></li>`).join('')}</ul></div>` : ''}`;
    $('editGoal').onclick = editGoal;
    const c = $('cashIn');
    if (c) c.onclick = () => confirmBox('Cash in this reward?', `${g.name} for ${money(g.cost)}. It comes out of the kitty, and you can pick the next goal.`, 'Cash it in', () => {
      state.rewards.push({ name: g.name, cost: g.cost, date: nightKeyNow() }); save();
      whistle(); confetti(); renderAll(); setTimeout(editGoal, 900);
    });
  }

  function renderTrophies() {
    const s = stats();
    const won = TROPHIES.filter(t => trophyProgress(t, s).won).length;
    $('view-trophies').innerHTML = `
      <div><div class="eyebrow">Trophy cabinet</div><h2>${won} of ${TROPHIES.length} won</h2></div>
      <div class="trophies">${TROPHIES.map(t => {
        const p = trophyProgress(t, s);
        const have = t.kind === 'money' ? money(Math.min(p.have, t.n)) : Math.min(p.have, t.n);
        const goal = t.kind === 'money' ? money(t.n) : t.n;
        return `<div class="trophy ${p.won ? 'won' : ''}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-cup"/></svg>
          <b>${esc(t.name)}</b><span>${esc(t.desc)}</span>
          ${p.won ? '<span>Won</span>' : `<div class="mini-bar"><div style="width:${Math.min(100, 100 * p.have / t.n)}%"></div></div><span class="num">${have} / ${goal}</span>`}
        </div>`;
      }).join('')}</div>
      <p class="hint">Run trophies count your best unbeaten run, so once won they stay in the cabinet.</p>`;
  }

  // ---------- Modals ----------
  const modal = $('modal'), modalCard = $('modalCard');
  let onModalClose = null;
  function openModal(html, onClose) {
    modalCard.innerHTML = html; modal.classList.remove('hidden'); onModalClose = onClose || null;
    modalCard.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  }
  function closeModal() {
    modal.classList.add('hidden'); modalCard.innerHTML = '';
    const f = onModalClose; onModalClose = null; if (f) f();
    renderAll();
  }
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  function confirmBox(title, body, yes, fn, danger) {
    openModal(`<h2>${esc(title)}</h2><p class="hint">${esc(body)}</p>
      <div class="row"><button class="btn ghost" data-close>Cancel</button><div class="spacer"></div><button class="btn ${danger ? '' : 'primary'}" id="yesBtn">${esc(yes)}</button></div>`);
    $('yesBtn').onclick = () => { fn(); closeModal(); };
  }

  function openNight(k) {
    const draw = () => {
      modalCard.innerHTML = `
        <div class="close-row"><h2>${niceDate(k)}</h2><button class="btn small ghost" data-close>Done</button></div>
        <div class="eyebrow">Matchday ${daysBetween(state.start, k) + 1}</div>
        <div id="nightModalPanel">${nightPanel(k)}</div>`;
      modalCard.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
      bindNightPanel($('nightModalPanel'), k, draw);
    };
    openModal(''); draw();
  }

  let cravingTimer = null;
  function openCraving() {
    const end = Date.now() + 15 * 60 * 1000;
    openModal(`
      <div class="close-row"><h2>Half-time</h2><button class="btn small ghost" data-close>Back</button></div>
      <p class="hint" style="margin:0">A craving is a high press. It feels huge, then it fades, usually within 15 to 30 minutes. Hold your shape until it passes.</p>
      <div class="timer" id="cTimer">15:00</div>
      <ol class="tactics">
        <li>Get a cold drink in your hand: sparkling water, ginger beer, tea.</li>
        <li>Eat something. Hunger makes cravings louder.</li>
        <li>Move: a walk round the block, ten press-ups, a shower.</li>
        <li>Put on old highlights. Henry against Liverpool in 2004 is a good one.</li>
        <li>Text or call someone you trust and say you’re having a rough minute.</li>
      </ol>
      ${state.why ? `<div class="why"><div class="eyebrow">Your reason</div><q>${esc(state.why)}</q></div>` : ''}
      <div class="helpline"><div class="eyebrow">Free, confidential, 24/7</div>
        <a href="tel:18006624357">1-800-662-4357</a><div class="hint">SAMHSA National Helpline (US). In a crisis, call or text 988.</div></div>`,
      () => clearInterval(cravingTimer));
    clearInterval(cravingTimer);
    cravingTimer = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      const el = $('cTimer'); if (!el) return clearInterval(cravingTimer);
      el.textContent = `${Math.floor(left / 60000)}:${pad(Math.floor(left / 1000) % 60)}`;
      if (!left) { clearInterval(cravingTimer); el.textContent = 'Held!'; whistle(); }
    }, 500);
  }

  function editGoal() {
    openModal(`
      <div class="close-row"><h2>Saving for</h2><button class="btn small ghost" data-close>Cancel</button></div>
      <div class="field"><label for="goalName">Reward</label><input id="goalName" maxlength="60" value="${esc(state.goal.name)}" /></div>
      <div class="field"><label for="goalCost">Cost ($)</label><input id="goalCost" inputmode="numeric" value="${state.goal.cost}" /></div>
      <p class="hint">Ideas: a new home shirt, Emirates tickets, a stadium tour, a weekend away together.</p>
      <button class="btn primary block" id="goalSave">Save goal</button>`);
    $('goalSave').onclick = () => {
      const name = $('goalName').value.trim(), cost = Math.round(Number($('goalCost').value.replace(/[$,]/g, '')));
      if (!name || !(cost > 0)) { toast('Give the reward a name and a price.'); return; }
      state.goal = { name, cost }; save(); closeModal();
    };
  }

  function openSettings(first) {
    openModal(`
      <div class="close-row"><h2>${first ? 'Welcome to Clean Sheet' : 'Settings'}</h2>${first ? '' : '<button class="btn small ghost" data-close>Close</button>'}</div>
      ${first ? '<p class="hint" style="margin:0">Each night, blow into the breathalyzer and log the reading. A night where every test reads zero is a clean sheet, and the money that would have gone on whiskey goes into your kitty.</p>' : ''}
      <div class="field"><label for="sName">Your name</label><input id="sName" maxlength="20" value="${esc(state.name)}" placeholder="Gunner" /></div>
      <div class="field"><label for="sNightly">Whiskey money per night ($)</label><input id="sNightly" inputmode="decimal" value="${state.nightly}" />
        <p class="hint">Banked for every clean sheet. Changing it only affects nights from now on.</p></div>
      <div class="field"><label for="sPass">Counts as clean at</label>
        <select id="sPass">${[0, 0.01, 0.02].map(v => `<option value="${v}" ${v === state.passMark ? 'selected' : ''}>${bac(v)}${v ? ' or lower' : ' only'}</option>`).join('')}</select>
        <p class="hint">Any reading above this makes it a drink night.</p></div>
      <div class="field"><label for="sStart">First night</label><input id="sStart" type="date" value="${state.start || nightKeyNow()}" max="${nightKeyNow()}" /></div>
      <div class="field"><label for="sWhy">Why I’m doing this</label><textarea id="sWhy" maxlength="240" placeholder="For my family. For my health. To remember every match.">${esc(state.why)}</textarea></div>
      <label class="row"><input type="checkbox" id="sSound" ${state.sound ? 'checked' : ''} /> Whistle sound on a clean sheet</label>
      <button class="btn primary block" id="sSave">${first ? 'Kick off' : 'Save'}</button>
      ${first ? '' : `
      <div class="card">
        <div class="eyebrow">Backup</div>
        <p class="hint">Everything is saved only on this phone. Download a backup now and then.</p>
        <div class="row"><button class="btn small" id="bDown">Download backup</button><label class="btn small" for="bUp">Restore backup</label><input type="file" id="bUp" accept="application/json,.json" hidden /></div>
        <button class="btn small ghost danger" id="bReset">Erase everything</button>
      </div>
      <p class="hint">Stopping daily drinking all at once can cause withdrawal that needs a doctor’s care. If there are shakes, sweats, confusion or a racing heart, get medical help. SAMHSA National Helpline: 1-800-662-4357.</p>`}`);
    $('sSave').onclick = () => {
      const nightly = Number($('sNightly').value.replace(/[$,]/g, ''));
      if (!(nightly > 0)) { toast('Enter how much a night used to cost, like 30.'); return; }
      state.name = $('sName').value.trim();
      state.nightly = Math.round(nightly * 100) / 100;
      state.passMark = Number($('sPass').value);
      state.start = $('sStart').value || nightKeyNow();
      if (state.start > nightKeyNow()) state.start = nightKeyNow();
      state.why = $('sWhy').value.trim();
      state.sound = $('sSound').checked;
      save(); closeModal();
      if (first) toast('Up the Arsenal! Log tonight’s reading when you’re ready.');
    };
    if (first) return;
    $('bDown').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
      a.download = `clean-sheet-backup-${nightKeyNow()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $('bUp').onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then(t => {
        const s = JSON.parse(t);
        if (!s || typeof s.nights !== 'object') throw new Error('bad');
        localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); closeModal(); toast('Backup restored.');
      }).catch(() => toast('That file isn’t a Clean Sheet backup.'));
    };
    $('bReset').onclick = () => confirmBox('Erase everything?', 'Every reading, your savings and trophies will be deleted from this phone. This can’t be undone.', 'Erase', () => {
      state = structuredClone(DEFAULT_STATE); save(); setTimeout(() => openSettings(true), 50);
    }, true);
  }

  // ---------- Toast, confetti, whistle ----------
  let toastT;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 3200);
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('confetti'), ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const colors = ['#ef0107', '#ffffff', '#d8b45e', '#063672'];
    const ps = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35,
      vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * Math.PI,
      vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(p => { p.vy += .3; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (now - t0 < 3500) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  let audio;
  function whistle() {
    if (!state.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const now = audio.currentTime;
      // Full-time whistle: two short blasts and a long one.
      [[0, .18], [.3, .18], [.6, .7]].forEach(([at, len]) => {
        const o = audio.createOscillator(), lfo = audio.createOscillator(), lg = audio.createGain(), g = audio.createGain();
        o.frequency.value = 2750; lfo.frequency.value = 38; lg.gain.value = 120;
        lfo.connect(lg); lg.connect(o.frequency); o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0, now + at);
        g.gain.linearRampToValueAtTime(.12, now + at + .02);
        g.gain.setValueAtTime(.12, now + at + len - .04);
        g.gain.linearRampToValueAtTime(0, now + at + len);
        o.start(now + at); lfo.start(now + at); o.stop(now + at + len + .05); lfo.stop(now + at + len + .05);
      });
    } catch (e) { /* sound is optional */ }
  }

  // ---------- Wiring ----------
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    view = t.dataset.view;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    renderAll(); scrollTo(0, 0);
  });
  $('settingsBtn').onclick = () => openSettings(false);

  // Roll over to the next night if the app is left open.
  let nightKey = nightKeyNow();
  const checkNight = () => { if (nightKeyNow() !== nightKey) { nightKey = nightKeyNow(); if (modal.classList.contains('hidden')) renderAll(); } };
  setInterval(checkNight, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkNight(); });

  renderAll();
  if (!state.start) openSettings(true);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // If an update takes over while the app is open, reload once so the new version shows.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded && modal.classList.contains('hidden')) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => {
        reg.update();
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
      })
      .catch(() => { /* offline support is optional */ });
  }
})();

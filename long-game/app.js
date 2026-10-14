/* Long Game — a weekly tracker for cutting refined carbs, processed food and the other foods linked to a shorter life.
 * Each food on the list has a weekly allowance (0 = cut it completely). Tap + every time you have a serving.
 * A "clean day" is a day where nothing went over its weekly allowance. Allowances reset every Monday.
 * Saved on this phone in localStorage, and shared between phones by family-sync.js once signed in. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'long-game-v1';
  const CATS = ['Refined carbs', 'Sugar', 'Ultra-processed', 'Meat', 'Drinks', 'Your own'];
  const MAX_LIMIT = 21;
  const HISTORY_WEEKS = 8;

  // The guidance list. `limit` is the suggested servings per week; `on` puts it in a new tracker.
  const GUIDE = [
    { id: 'sugary-drinks', name: 'Sugary drinks', cat: 'Sugar', limit: 0, on: true,
      ex: 'Soda, sweet tea, energy drinks, sweetened coffee drinks',
      why: 'The biggest source of added sugar for most people. A daily sugary drink is linked to more diabetes, heart disease and early death.',
      swap: 'Sparkling water with citrus, or unsweetened tea or coffee' },
    { id: 'processed-meat', name: 'Processed meat', cat: 'Meat', limit: 0, on: true,
      ex: 'Bacon, ham, hot dogs, sausage, salami, deli meat, jerky',
      why: 'The WHO lists processed meat as a known cause of bowel cancer. Each daily 50 g serving raises the risk by about 18%.',
      swap: 'Roast chicken, canned salmon or sardines, eggs, beans' },
    { id: 'white-bread', name: 'White bread & bagels', cat: 'Refined carbs', limit: 2, on: true,
      ex: 'White bread, rolls, bagels, flour tortillas, white crackers. 1 serving = 1 slice or ½ bagel',
      why: 'Refined flour raises blood sugar almost as fast as sugar does. Swapping to whole grains is linked to lower death rates.',
      swap: '100% whole-grain, rye or sprouted bread' },
    { id: 'white-rice-pasta', name: 'White rice & regular pasta', cat: 'Refined carbs', limit: 2, on: true,
      ex: '1 serving = about 1 cup cooked',
      why: 'Fine now and then, especially with vegetables and protein, but whole grains bring the fiber that refined ones lose.',
      swap: 'Brown rice, farro, quinoa, barley, bean or lentil pasta' },
    { id: 'cereal', name: 'Sugary cereal & breakfast bars', cat: 'Refined carbs', limit: 0, on: true,
      ex: 'Frosted cereals, granola bars, toaster pastries, instant flavored oatmeal',
      why: 'Refined starch and added sugar first thing in the morning, with little fiber or protein to slow it down.',
      swap: 'Plain oats, eggs, or plain yogurt with berries and nuts' },
    { id: 'sweets', name: 'Pastries, cakes & candy', cat: 'Sugar', limit: 1, on: true,
      ex: 'Donuts, muffins, cookies, cake, ice cream, candy',
      why: 'Added sugar, refined flour and often poor-quality fat in one. The AHA suggests keeping added sugar under 25–36 g a day.',
      swap: 'Fruit, or a square or two of 70%+ dark chocolate' },
    { id: 'juice', name: 'Fruit juice', cat: 'Sugar', limit: 1, on: true,
      ex: '1 serving = 1 small glass (about 8 oz)',
      why: 'Juice keeps the fruit’s sugar but loses its fiber. Whole fruit is linked to lower diabetes risk; juice to higher.',
      swap: 'Whole fruit, or water with a squeeze of fruit' },
    { id: 'chips', name: 'Chips & packaged snacks', cat: 'Ultra-processed', limit: 1, on: true,
      ex: 'Chips, cheese puffs, snack crackers, snack cakes',
      why: 'Ultra-processed foods are built to be easy to overeat. Eating a lot of them is linked to higher death rates from all causes.',
      swap: 'A handful of nuts, home-popped popcorn, vegetables and hummus' },
    { id: 'fried', name: 'Fried food', cat: 'Ultra-processed', limit: 1, on: true,
      ex: 'French fries, fried chicken, onion rings, anything deep-fried',
      why: 'Regular fried food is linked to heart disease and stroke. Restaurant fryer oil is heated over and over.',
      swap: 'Oven-roasted or air-fried at home' },
    { id: 'fast-food', name: 'Fast food & takeout', cat: 'Ultra-processed', limit: 1, on: true,
      ex: 'Burgers, pizza, drive-through meals',
      why: 'Usually refined carbs, processed meat, fried food and a day’s worth of salt in one meal.',
      swap: 'A batch-cooked meal from the freezer, or a grain bowl' },
    { id: 'ready-meals', name: 'Ready meals & instant noodles', cat: 'Ultra-processed', limit: 1, on: true,
      ex: 'Frozen dinners, boxed mac and cheese, instant noodles, canned pasta',
      why: 'High in salt, refined starch and additives, and low in fiber and protein.',
      swap: 'Leftovers, or eggs and vegetables (ten minutes)' },
    { id: 'red-meat', name: 'Red meat', cat: 'Meat', limit: 2, on: true,
      ex: 'Beef, pork, lamb (not processed). 1 serving = palm-sized',
      why: 'The world’s longest-lived populations eat meat only a few times a month. Planetary-health guidance is about 1 serving a week.',
      swap: 'Fish, chicken, beans, lentils or tofu' },
    { id: 'alcohol', name: 'Alcohol', cat: 'Drinks', limit: 0, on: false,
      ex: '1 serving = 1 drink',
      why: 'Current guidance says no amount is risk-free; cancer and heart risk rise with each drink.',
      swap: 'Sparkling water with bitters, kombucha, or an alcohol-free beer' },
    { id: 'diet-soda', name: 'Diet soda & sweeteners', cat: 'Drinks', limit: 2, on: false,
      ex: 'Diet soda, zero-sugar energy drinks, sweetener packets',
      why: 'Better than sugar, but keeps the taste for sweet going, and heavy use is linked to metabolic and heart risk in some studies.',
      swap: 'Sparkling water, herbal tea' },
    { id: 'sweet-yogurt', name: 'Sweetened yogurt & granola', cat: 'Sugar', limit: 1, on: false,
      ex: 'Fruit-on-the-bottom yogurt, store-bought granola',
      why: 'Sold as healthy, but often has as much sugar as dessert.',
      swap: 'Plain Greek yogurt with fruit and nuts' },
    { id: 'protein-bars', name: 'Protein & energy bars', cat: 'Ultra-processed', limit: 1, on: false,
      ex: 'Most packaged bars',
      why: 'Usually ultra-processed, with added sugar or sugar alcohols.',
      swap: 'Nuts and a piece of fruit, or a hard-boiled egg' },
    { id: 'pizza', name: 'Pizza', cat: 'Refined carbs', limit: 1, on: false,
      ex: '1 serving = 2 slices',
      why: 'Refined crust, and often processed meat on top.',
      swap: 'Home-made on whole-wheat crust with vegetables' },
    { id: 'margarine', name: 'Margarine & shortening', cat: 'Ultra-processed', limit: 0, on: false,
      ex: 'Stick margarine, shortening, anything with “partially hydrogenated” oil',
      why: 'Trans fats raise heart risk more than any other fat. Mostly banned now, but still in some imported and older products.',
      swap: 'Extra-virgin olive oil' },
  ];
  const GUIDE_BY_ID = Object.fromEntries(GUIDE.map(g => [g.id, g]));

  // ---------- Helpers ----------
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const mondayOf = s => { const d = parse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const fmt = (s, o) => parse(s).toLocaleDateString('en-US', o);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // ---------- State ----------
  const fromGuide = g => ({ id: g.id, name: g.name, cat: g.cat, limit: g.limit, ex: g.ex });
  const freshState = () => ({
    version: 1,
    started: today(),
    foods: GUIDE.filter(g => g.on).map(fromGuide), // [{ id, name, cat, limit, ex }]
    log: [], // [{ id, f: food id, d: 'YYYY-MM-DD', at: timestamp }]
  });
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && Array.isArray(raw.foods) && Array.isArray(raw.log)) {
        const s = Object.assign(freshState(), raw);
        s.foods.forEach(f => { f.limit = Math.max(0, Math.min(MAX_LIMIT, Number(f.limit) || 0)); if (!CATS.includes(f.cat)) f.cat = 'Your own'; });
        return s;
      }
    } catch (e) { /* start fresh */ }
    return freshState();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Couldn’t save on this phone. Is storage full?'); }
    if (window.FamilySync) FamilySync.changed(STORE_KEY);
  }

  let day = today(); // the day the log buttons add to

  // ---------- Counting ----------
  // Servings of each food in the week starting `mon`, and the days where a serving went past its allowance.
  function weekStats(mon) {
    const end = addDays(mon, 6);
    const limits = Object.fromEntries(state.foods.map(f => [f.id, f.limit]));
    const entries = state.log.filter(x => x.d >= mon && x.d <= end && x.f in limits)
      .sort((a, b) => a.d.localeCompare(b.d) || a.at - b.at);
    const count = {}, slipDays = new Set();
    entries.forEach(x => {
      count[x.f] = (count[x.f] || 0) + 1;
      if (count[x.f] > limits[x.f]) slipDays.add(x.d);
    });
    const over = state.foods.reduce((n, f) => n + Math.max(0, (count[f.id] || 0) - f.limit), 0);
    const onTrack = state.foods.filter(f => (count[f.id] || 0) <= f.limit).length;
    return { count, slipDays, over, onTrack, total: entries.length };
  }

  function streak() {
    const t = today();
    let n = 0, d = t, weekCache = {};
    while (d >= state.started) {
      const mon = mondayOf(d);
      const w = weekCache[mon] || (weekCache[mon] = weekStats(mon));
      if (w.slipDays.has(d)) break;
      n++; d = addDays(d, -1);
      if (n > 3660) break;
    }
    return n;
  }

  // ---------- Rendering ----------
  function statusOf(f, c) {
    if (c > f.limit) return { cls: 'over', text: `${c - f.limit} over` };
    if (f.limit === 0) return { cls: 'cut', text: 'Cut' };
    if (c === f.limit) return { cls: 'full', text: 'All used' };
    return { cls: 'ok', text: `${f.limit - c} left` };
  }

  function meter(limit, c) {
    const m = el('span', 'meter');
    const n = Math.min(MAX_LIMIT, Math.max(limit, c));
    if (!n) { m.classList.add('zero'); m.append(el('i', 'pip zero')); return m; }
    for (let i = 0; i < n; i++) m.append(el('i', 'pip' + (i < c ? (i < limit ? ' used' : ' over') : '')));
    return m;
  }

  function foodRow(f, c, onDay) {
    const st = statusOf(f, c);
    const row = el('div', 'food ' + st.cls);
    const info = el('div', 'info');
    const name = el('span', 'name', f.name);
    const meta = el('span', 'meta');
    meta.append(meter(f.limit, c), el('span', 'pill ' + st.cls, st.text),
      el('span', 'allow num', f.limit === 0 ? '0 a week' : `${c}/${f.limit} this week`));
    info.append(name, meta);
    const g = GUIDE_BY_ID[f.id];
    if (st.cls === 'over' || st.cls === 'full' || (st.cls === 'cut' && onDay)) {
      if (g && g.swap) info.append(el('span', 'swap', 'Try instead: ' + g.swap));
    }
    if (f.ex) info.append(el('span', 'ex', f.ex));

    const ctr = el('div', 'ctr');
    const minus = el('button', 'cbtn minus', '−');
    minus.type = 'button'; minus.disabled = !onDay;
    minus.setAttribute('aria-label', `Remove one ${f.name} from ${dayName(day)}`);
    minus.onclick = () => unlog(f.id);
    const shown = el('span', 'today num', String(onDay));
    shown.setAttribute('aria-label', `${onDay} on ${dayName(day)}`);
    const plus = el('button', 'cbtn plus', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', `Log one ${f.name} on ${dayName(day)}`);
    plus.onclick = () => logOne(f.id);
    ctr.append(minus, shown, plus);
    row.append(info, ctr);
    return row;
  }

  function dayName(d) {
    const t = today();
    if (d === t) return 'today';
    if (d === addDays(t, -1)) return 'yesterday';
    return fmt(d, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function render() {
    const t = today(), mon = mondayOf(t);
    const w = weekStats(mon);
    $('weekRange').textContent = `Week of ${fmt(mon, { month: 'short', day: 'numeric' })}`;
    $('onTrack').textContent = w.onTrack;
    $('tracked').textContent = state.foods.length;
    $('heroSub').textContent = !state.foods.length ? 'Add foods to your list below to start tracking.'
      : !w.total ? 'Nothing logged yet this week. Log a food each time you have one.'
      : w.over ? `${plural(w.over, 'serving')} over this week. Monday is a fresh start.`
      : 'Everything’s within its allowance so far.';

    // This week, day by day
    const D = $('days'); D.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      const li = el('li', 'day');
      const future = d > t, before = d < state.started;
      li.classList.add(future || before ? 'none' : w.slipDays.has(d) ? 'slip' : 'clean');
      if (d === t) li.classList.add('now');
      if (d === day) li.classList.add('sel');
      const b = el('button');
      b.type = 'button'; b.disabled = future;
      b.append(el('span', 'dn', fmt(d, { weekday: 'narrow' })), el('i', 'dot'), el('span', 'dd num', String(parse(d).getDate())));
      b.setAttribute('aria-label', `${fmt(d, { weekday: 'long' })}: ${future ? 'still to come' : before ? 'before you started' : w.slipDays.has(d) ? 'went over an allowance' : 'clean day'}. Tap to log for this day.`);
      b.onclick = () => { day = d; render(); };
      li.append(b);
      D.append(li);
    }

    $('sStreak').textContent = plural(streak(), 'day');
    $('sLogged').textContent = w.total;
    $('sZero').textContent = state.foods.filter(f => f.limit === 0 && !(w.count[f.id])).length;
    $('sOver').textContent = w.over;

    // Logging list, for the selected day's week
    $('dayLabel').textContent = dayName(day).replace(/^./, c => c.toUpperCase());
    $('nextDay').disabled = day >= t;
    const dw = mondayOf(day) === mon ? w : weekStats(mondayOf(day));
    const L = $('foodList'); L.innerHTML = '';
    if (!state.foods.length) L.append(el('div', 'empty', 'Your list is empty. Add foods under “Your list” below.'));
    CATS.forEach(cat => {
      const fs = state.foods.filter(f => f.cat === cat);
      if (!fs.length) return;
      const g = el('div', 'group');
      g.append(el('span', 'label', cat));
      fs.forEach(f => g.append(foodRow(f, dw.count[f.id] || 0, state.log.filter(x => x.f === f.id && x.d === day).length)));
      L.append(g);
    });

    renderEdit();
    renderHistory();
  }

  function renderEdit() {
    const E = $('editList'); E.innerHTML = '';
    state.foods.forEach(f => {
      const g = GUIDE_BY_ID[f.id];
      const row = el('div', 'erow');
      const info = el('div', 'info');
      info.append(el('span', 'name', f.name));
      const sub = el('span', 'meta');
      sub.append(el('span', '', f.cat));
      if (g) {
        sub.append(el('span', '', `· suggested ${g.limit === 0 ? 'cut' : g.limit + ' a week'}`));
        if (f.limit !== g.limit) {
          const r = el('button', 'linkbtn', 'Use suggested');
          r.type = 'button'; r.onclick = () => setLimit(f.id, g.limit);
          sub.append(r);
        }
      }
      info.append(sub);
      if (g) {
        const why = el('details', 'why');
        why.append(el('summary', '', 'Why'), el('p', '', g.why));
        info.append(why);
      }

      const step = el('div', 'stepper');
      const dn = el('button', 'cbtn', '−'); dn.type = 'button'; dn.disabled = f.limit <= 0;
      dn.setAttribute('aria-label', `Lower ${f.name} allowance`);
      dn.onclick = () => setLimit(f.id, f.limit - 1);
      const v = el('span', 'lim num'); v.innerHTML = `<b>${f.limit}</b><small>/wk</small>`;
      const up = el('button', 'cbtn', '+'); up.type = 'button'; up.disabled = f.limit >= MAX_LIMIT;
      up.setAttribute('aria-label', `Raise ${f.name} allowance`);
      up.onclick = () => setLimit(f.id, f.limit + 1);
      step.append(dn, v, up);

      const x = el('button', 'del', 'Remove'); x.type = 'button';
      x.onclick = () => {
        if (!x.classList.contains('arm')) {
          x.classList.add('arm'); x.textContent = 'Confirm';
          setTimeout(() => { x.classList.remove('arm'); x.textContent = 'Remove'; }, 3000);
          return;
        }
        state.foods = state.foods.filter(y => y.id !== f.id);
        save(); render(); toast(`${f.name} removed. Its past log is kept if you add it back.`);
      };
      const side = el('div', 'side'); side.append(step, x);
      row.append(info, side);
      E.append(row);
    });
    if (!state.foods.length) E.append(el('div', 'empty', 'No foods on your list.'));

    const Lb = $('library'); Lb.innerHTML = '';
    const have = new Set(state.foods.map(f => f.id));
    const avail = GUIDE.filter(g => !have.has(g.id));
    avail.forEach(g => {
      const b = el('button', 'chip', `+ ${g.name} · ${g.limit === 0 ? 'cut' : g.limit + '/wk'}`);
      b.type = 'button';
      b.onclick = () => { state.foods.push(fromGuide(g)); save(); render(); toast(`${g.name} added.`); };
      Lb.append(b);
    });
    $('libraryEmpty').hidden = !!avail.length;
  }

  function renderHistory() {
    const H = $('history'); H.innerHTML = '';
    const thisMon = mondayOf(today()), firstMon = mondayOf(state.started);
    const rows = [];
    for (let i = 1; i <= HISTORY_WEEKS; i++) {
      const mon = addDays(thisMon, -7 * i);
      if (mon < firstMon) break;
      const w = weekStats(mon);
      const days = [...Array(7)].map((_, k) => addDays(mon, k)).filter(d => d >= state.started);
      const clean = days.filter(d => !w.slipDays.has(d)).length;
      rows.push({ mon, w, clean, days: days.length });
    }
    if (!rows.length) { H.append(el('div', 'empty', 'Your finished weeks show up here, starting next Monday.')); return; }
    const g = el('div', 'group');
    rows.forEach(r => {
      const row = el('div', 'hrow');
      row.append(
        el('span', 'wk', fmt(r.mon, { month: 'short', day: 'numeric' })),
        el('span', 'num', `${r.clean}/${r.days} clean days`),
        el('span', 'num', `${r.w.onTrack}/${state.foods.length} on track`),
        el('span', 'num' + (r.w.over ? ' neg' : ' pos'), r.w.over ? `${r.w.over} over` : 'None over'));
      g.append(row);
    });
    H.append(g);
  }

  // ---------- Actions ----------
  function logOne(fid) {
    const f = state.foods.find(x => x.id === fid); if (!f) return;
    state.log.push({ id: uid(), f: fid, d: day, at: Date.now() });
    save(); render();
    const c = weekStats(mondayOf(day)).count[fid] || 0;
    if (c > f.limit) toast(f.limit === 0 ? `${f.name} logged. It’s on your cut list.` : `${f.name}: ${c - f.limit} over this week.`);
    else if (c === f.limit) toast(`That’s this week’s ${f.name.toLowerCase()} used up.`);
    else toast(`${f.name} logged. ${f.limit - c} left this week.`);
  }
  function unlog(fid) {
    const mine = state.log.filter(x => x.f === fid && x.d === day).sort((a, b) => b.at - a.at)[0];
    if (!mine) return;
    state.log = state.log.filter(x => x.id !== mine.id);
    save(); render();
  }
  function setLimit(fid, n) {
    const f = state.foods.find(x => x.id === fid); if (!f) return;
    f.limit = Math.max(0, Math.min(MAX_LIMIT, n));
    save(); render();
  }

  $('prevDay').onclick = () => { day = addDays(day, -1); render(); };
  $('nextDay').onclick = () => { if (day < today()) { day = addDays(day, 1); render(); } };

  $('addForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const name = $('newName').value.trim();
    if (!name) { $('msg').textContent = 'Type the food’s name first.'; return; }
    if (state.foods.some(f => f.name.toLowerCase() === name.toLowerCase())) { $('msg').textContent = `${name} is already on your list.`; return; }
    const limit = Math.max(0, Math.min(MAX_LIMIT, parseInt($('newLimit').value, 10) || 0));
    state.foods.push({ id: 'c-' + uid(), name, cat: 'Your own', limit, ex: $('newEx').value.trim() });
    $('newName').value = ''; $('newEx').value = ''; $('newLimit').value = 1;
    $('msg').textContent = `${name} added with ${limit === 0 ? 'none' : limit} a week.`;
    save(); render();
  });

  function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { e.hidden = true; }, 3500); }

  // ---------- Backup ----------
  $('bDown').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `long-game-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('bUp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const s = JSON.parse(t); if (!s || !Array.isArray(s.foods) || !Array.isArray(s.log)) throw new Error('bad');
      localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); save(); render(); toast('Backup restored.');
    }).catch(() => toast('That file isn’t a Long Game backup.'));
    e.target.value = '';
  };
  $('bErase').onclick = () => {
    const b = $('bErase');
    if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = 'Tap again to erase'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Erase everything'; }, 3000); return; }
    delete b.dataset.arm; b.textContent = 'Erase everything';
    state = freshState(); day = today(); save(); render(); toast('Log erased and list reset.');
  };

  // Roll over to a new day (and a fresh week on Monday) while the app stays open.
  let dayKey = today();
  setInterval(() => { if (today() !== dayKey) { if (day === dayKey) day = today(); dayKey = today(); render(); } }, 60000);

  save();
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update(); document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }); })
      .catch(() => { /* offline support is optional */ });
  }

  // ---------- Family sync ----------
  if (window.FamilySync) FamilySync.attach(STORE_KEY, {
    label: 'Long Game',
    get: () => state,
    apply: json => { localStorage.setItem(STORE_KEY, json); state = load(); render(); },
  });
})();

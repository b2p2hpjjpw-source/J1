/* Long Game — a weekly tracker for eating for a long life, for the two of us.
 * "Cut back" foods (refined carbs, processed food, alcohol, late-night eating…) each have a weekly allowance (0 = cut it).
 * "Eat more" foods (vegetables, beans, nuts, fish…) each have a weekly target. Tap + every time you have a serving.
 * A "clean day" is a day where nothing on the cut-back list went over its allowance. The week resets every Monday.
 * Each of us has our own list and log; each phone remembers whose it is (not synced, so each phone keeps its own).
 * Saved on this phone in localStorage, and shared between our phones by family-sync.js once signed in. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'long-game-v1';
  const ME_KEY = 'long-game:me'; // whose phone this is
  const LESS_CATS = ['Refined carbs', 'Sugar', 'Ultra-processed', 'Meat', 'Drinks', 'Habits', 'Your own'];
  const MAX_N = 35;
  const HISTORY_WEEKS = 8;

  // The guidance list. kind 'less': `n` is the suggested weekly allowance. kind 'more': `n` is the weekly target.
  // `on` puts it in a new tracker (and adds it once to existing trackers that haven't seen it).
  const GUIDE = [
    { id: 'sugary-drinks', kind: 'less', name: 'Sugary drinks', cat: 'Sugar', n: 0, on: true,
      ex: 'Soda, sweet tea, energy drinks, sweetened coffee drinks',
      why: 'The biggest source of added sugar for most people. A daily sugary drink is linked to more diabetes, heart disease and early death.',
      swap: 'Sparkling water with citrus, or unsweetened tea or coffee' },
    { id: 'processed-meat', kind: 'less', name: 'Processed meat', cat: 'Meat', n: 0, on: true,
      ex: 'Bacon, ham, hot dogs, sausage, salami, deli meat, jerky',
      why: 'The WHO lists processed meat as a known cause of bowel cancer. Each daily 50 g serving raises the risk by about 18%.',
      swap: 'Roast chicken, canned salmon or sardines, eggs, beans' },
    { id: 'white-bread', kind: 'less', name: 'White bread & bagels', cat: 'Refined carbs', n: 2, on: true,
      ex: 'White bread, rolls, bagels, flour tortillas, white crackers. 1 serving = 1 slice or ½ bagel',
      why: 'Refined flour raises blood sugar almost as fast as sugar does. Swapping to whole grains is linked to lower death rates.',
      swap: '100% whole-grain, rye or sprouted bread' },
    { id: 'white-rice-pasta', kind: 'less', name: 'White rice & regular pasta', cat: 'Refined carbs', n: 2, on: true,
      ex: '1 serving = about 1 cup cooked',
      why: 'Fine now and then, especially with vegetables and protein, but whole grains bring the fiber that refined ones lose.',
      swap: 'Brown rice, farro, quinoa, barley, bean or lentil pasta' },
    { id: 'pizza', kind: 'less', name: 'Pizza', cat: 'Refined carbs', n: 1, on: true,
      ex: '1 serving = 2 slices',
      why: 'A refined-flour crust, lots of salt and cheese, and often processed meat on top.',
      swap: 'Home-made on a whole-wheat crust, loaded with vegetables' },
    { id: 'cereal', kind: 'less', name: 'Sugary cereal & breakfast bars', cat: 'Refined carbs', n: 0, on: true,
      ex: 'Frosted cereals, granola bars, toaster pastries, instant flavored oatmeal',
      why: 'Refined starch and added sugar first thing in the morning, with little fiber or protein to slow it down.',
      swap: 'Plain oats, eggs, or plain yogurt with berries and nuts' },
    { id: 'sweets', kind: 'less', name: 'Pastries, cakes & candy', cat: 'Sugar', n: 1, on: true,
      ex: 'Donuts, muffins, cookies, cake, ice cream, candy',
      why: 'Added sugar, refined flour and often poor-quality fat in one. The AHA suggests keeping added sugar under 25–36 g a day.',
      swap: 'Fruit, or a square or two of 70%+ dark chocolate' },
    { id: 'juice', kind: 'less', name: 'Fruit juice', cat: 'Sugar', n: 1, on: true,
      ex: '1 serving = 1 small glass (about 8 oz)',
      why: 'Juice keeps the fruit’s sugar but loses its fiber. Whole fruit is linked to lower diabetes risk; juice to higher.',
      swap: 'Whole fruit, or water with a squeeze of fruit' },
    { id: 'chips', kind: 'less', name: 'Chips & packaged snacks', cat: 'Ultra-processed', n: 1, on: true,
      ex: 'Chips, cheese puffs, snack crackers, snack cakes',
      why: 'Ultra-processed foods are built to be easy to overeat. Eating a lot of them is linked to higher death rates from all causes.',
      swap: 'A handful of nuts, home-popped popcorn, vegetables and hummus' },
    { id: 'fried', kind: 'less', name: 'Fried food', cat: 'Ultra-processed', n: 1, on: true,
      ex: 'French fries, fried chicken, onion rings, anything deep-fried',
      why: 'Regular fried food is linked to heart disease and stroke. Restaurant fryer oil is heated over and over.',
      swap: 'Oven-roasted or air-fried at home' },
    { id: 'fast-food', kind: 'less', name: 'Fast food & takeout', cat: 'Ultra-processed', n: 1, on: true,
      ex: 'Burgers, drive-through meals, takeout',
      why: 'Usually refined carbs, processed meat, fried food and a day’s worth of salt in one meal.',
      swap: 'A batch-cooked meal from the freezer, or a grain bowl' },
    { id: 'ready-meals', kind: 'less', name: 'Frozen dinners & instant noodles', cat: 'Ultra-processed', n: 1, on: true,
      ex: 'Ready-to-heat meals: frozen or microwave dinners, boxed mac and cheese, instant noodles, canned pasta',
      why: 'High in salt, refined starch and additives, and low in fiber and protein.',
      swap: 'Leftovers, or eggs and vegetables (ten minutes)' },
    { id: 'red-meat', kind: 'less', name: 'Red meat', cat: 'Meat', n: 2, on: true,
      ex: 'Beef, pork, lamb (not processed). 1 serving = palm-sized',
      why: 'The world’s longest-lived populations eat meat only a few times a month. Planetary-health guidance is about 1 serving a week.',
      swap: 'Fish, chicken, beans, lentils or tofu' },
    { id: 'alcohol', kind: 'less', name: 'Alcohol', cat: 'Drinks', n: 3, on: true,
      ex: '1 serving = 1 drink (a glass of wine, a beer, a shot)',
      why: 'Current guidance says no amount is risk-free: cancer, heart and liver risk rise with each drink, and it disturbs sleep. Keeping it to 2–3 drinks a week, never several at once, keeps the risk low.',
      swap: 'Sparkling water with bitters or lime, kombucha, or an alcohol-free beer' },
    { id: 'late-night', kind: 'less', name: 'Eating late', cat: 'Habits', n: 1, on: true,
      ex: 'Any food or caloric drink after the kitchen closes (set the time in Settings). Water and herbal tea are fine',
      why: 'Eating close to bedtime is linked to worse sleep, reflux and higher blood sugar the next morning. Most guidance says stop 2–3 hours before bed.',
      swap: 'Herbal tea, or brush your teeth to close the kitchen' },
    { id: 'diet-soda', kind: 'less', name: 'Diet soda & sweeteners', cat: 'Drinks', n: 2, on: false,
      ex: 'Diet soda, zero-sugar energy drinks, sweetener packets',
      why: 'Better than sugar, but keeps the taste for sweet going, and heavy use is linked to metabolic and heart risk in some studies.',
      swap: 'Sparkling water, herbal tea' },
    { id: 'sweet-yogurt', kind: 'less', name: 'Sweetened yogurt & granola', cat: 'Sugar', n: 1, on: false,
      ex: 'Fruit-on-the-bottom yogurt, store-bought granola',
      why: 'Sold as healthy, but often has as much sugar as dessert.',
      swap: 'Plain Greek yogurt with fruit and nuts' },
    { id: 'protein-bars', kind: 'less', name: 'Protein & energy bars', cat: 'Ultra-processed', n: 1, on: false,
      ex: 'Most packaged bars',
      why: 'Usually ultra-processed, with added sugar or sugar alcohols.',
      swap: 'Nuts and a piece of fruit, or a hard-boiled egg' },
    { id: 'margarine', kind: 'less', name: 'Margarine & shortening', cat: 'Ultra-processed', n: 0, on: false,
      ex: 'Stick margarine, shortening, anything with “partially hydrogenated” oil',
      why: 'Trans fats raise heart risk more than any other fat. Mostly banned now, but still in some imported and older products.',
      swap: 'Extra-virgin olive oil' },

    { id: 'vegetables', kind: 'more', name: 'Vegetables', n: 21, on: true,
      ex: '1 serving = 1 cup raw or ½ cup cooked. 3 a day',
      why: 'Each extra daily serving of vegetables and fruit is linked to lower death rates, with the benefit leveling off around 5 a day in total.' },
    { id: 'fruit', kind: 'more', name: 'Fruit', n: 14, on: true,
      ex: '1 serving = 1 piece or 1 cup. 2 a day',
      why: 'Whole fruit brings fiber and potassium. Together with vegetables, 5 a day is linked to the lowest death rates.' },
    { id: 'berries', kind: 'more', name: 'Berries', n: 3, on: true,
      ex: '1 serving = ½ cup, fresh or frozen',
      why: 'Rich in polyphenols. Eating berries a few times a week is linked to slower memory decline with age.' },
    { id: 'beans', kind: 'more', name: 'Beans & lentils', n: 7, on: true,
      ex: '1 serving = ½ cup cooked. Chickpeas, black beans, lentils, hummus',
      why: 'The one food every long-lived “Blue Zone” population eats daily. Full of fiber and plant protein.' },
    { id: 'nuts', kind: 'more', name: 'Nuts & seeds', n: 5, on: true,
      ex: '1 serving = a small handful (1 oz), or 2 tbsp nut butter',
      why: 'People who eat a handful of nuts most days have about 20% lower death rates in large studies.' },
    { id: 'whole-grains', kind: 'more', name: 'Whole grains', n: 14, on: true,
      ex: '1 serving = 1 slice whole-grain bread or ½ cup oats, brown rice, quinoa',
      why: 'Each daily serving of whole grains is linked to lower rates of heart disease, diabetes and early death.' },
    { id: 'fish', kind: 'more', name: 'Fish', n: 2, on: true,
      ex: '1 serving = palm-sized. Salmon, sardines, trout and mackerel are best',
      why: 'The American Heart Association recommends 2 servings a week, especially oily fish for omega-3s.' },
    { id: 'leafy-greens', kind: 'more', name: 'Leafy greens', n: 7, on: false,
      ex: 'Spinach, kale, chard, arugula, romaine. 1 serving = 1 cup raw',
      why: 'A serving a day is linked to brain aging about 11 years slower in one long-running study.' },
    { id: 'fermented', kind: 'more', name: 'Fermented foods', n: 4, on: false,
      ex: 'Plain yogurt, kefir, kimchi, sauerkraut, miso',
      why: 'Linked to a more varied gut microbiome and lower markers of inflammation.' },
    { id: 'olive-oil', kind: 'more', name: 'Extra-virgin olive oil', n: 7, on: false,
      ex: '1 serving = 1 tablespoon',
      why: 'The main fat in the Mediterranean diet. More than half a tablespoon a day is linked to lower death rates.' },

    // Move: `unit` 'min' counts minutes (vigorous minutes count double); 'times' counts sessions or days.
    { id: 'active-min', kind: 'move', unit: 'min', name: 'Active minutes', n: 150, on: true,
      ex: 'Brisk walking, cycling, swimming, dancing, yard work. Vigorous minutes (running, HIIT, hard cycling: too puffed to talk in full sentences) count double',
      why: 'The WHO recommends 150–300 minutes of moderate activity a week. People who reach 150 have about 30% lower death rates than inactive people, and the benefit keeps growing up to about 300.' },
    { id: 'strength', kind: 'move', unit: 'times', name: 'Strength training', n: 2, on: true,
      ex: 'Weights, bands, bodyweight moves (squats, push-ups, lunges), Pilates. 1 session = about 20+ minutes working the major muscles',
      why: 'The WHO recommends muscle strengthening on 2 or more days a week. Strength is one of the best predictors of healthy aging, and 30–60 minutes a week is linked to 10–20% lower death rates.' },
    { id: 'steps', kind: 'move', unit: 'times', name: '7,000-step days', n: 5, on: true,
      ex: 'Log a day once your phone’s Health app shows 7,000 steps or more',
      why: 'Large studies find death rates fall steeply as daily steps rise to about 7,000–8,000, then level off.' },
    { id: 'after-dinner-walk', kind: 'move', unit: 'times', name: 'Walk after dinner', n: 4, on: false,
      ex: '10–15 minutes, within an hour of eating',
      why: 'A short walk after a meal blunts the rise in blood sugar, and it fits nicely before the kitchen closes.' },
    { id: 'mobility', kind: 'move', unit: 'times', name: 'Stretching, yoga or balance', n: 2, on: false,
      ex: '10+ minutes of stretching, yoga, tai chi or balance work',
      why: 'Keeps joints mobile and lowers the risk of falls later in life. The WHO adds balance training for adults over 65.' },
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
  const clamp = n => Math.max(0, Math.min(MAX_N, Number(n) || 0));
  const MAX_MIN = 600, MIN_STEP = 10; // limits for a weekly minutes goal
  const clampFor = (f, n) => f.unit === 'min' ? Math.max(0, Math.min(MAX_MIN, Math.round((Number(n) || 0) / MIN_STEP) * MIN_STEP)) : clamp(n);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const flag = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const toMin = t => { const [h, m] = (t || '21:00').split(':').map(Number); return h * 60 + m; };
  const fromMin = m => { m = ((m % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
  const fmtTime = t => { const m = toMin(t), h = Math.floor(m / 60); return `${(h + 11) % 12 + 1}:${pad(m % 60)} ${h < 12 ? 'am' : 'pm'}`; };

  // ---------- State ----------
  const fromGuide = g => Object.assign({ id: g.id, kind: g.kind, name: g.name, cat: g.cat || '', n: g.n, ex: g.ex }, g.unit ? { unit: g.unit } : {});
  const newPerson = (id, name) => ({ id, name, started: today(), kitchen: '19:00', remindAt: '20:30', foods: [], log: [], seen: [] });
  const freshState = () => ({ version: 3, people: [newPerson('a', 'Mom'), newPerson('b', 'Dad')] });

  // Adds each "on" guidance food once to a person who hasn't been offered it yet, so removing one sticks.
  function offerNew(p) {
    GUIDE.forEach(g => {
      if (!g.on || p.seen.includes(g.id)) return;
      p.seen.push(g.id);
      if (!p.foods.some(f => f.id === g.id)) p.foods.push(fromGuide(g));
    });
  }
  function tidyPerson(p) {
    p.foods = Array.isArray(p.foods) ? p.foods : [];
    p.log = Array.isArray(p.log) ? p.log : [];
    p.seen = Array.isArray(p.seen) ? p.seen : [];
    p.foods.forEach(f => {
      if ('limit' in f) { f.n = f.limit; delete f.limit; } // version 1 field name
      if (f.kind === 'move' && f.unit !== 'min') f.unit = 'times';
      f.n = clampFor(f, f.n);
      if (f.kind !== 'more' && f.kind !== 'move') { f.kind = 'less'; if (!LESS_CATS.includes(f.cat)) f.cat = 'Your own'; }
      const g = GUIDE_BY_ID[f.id];
      if (g && f.id === 'ready-meals' && f.name === 'Ready meals & instant noodles') { f.name = g.name; f.ex = g.ex; }
    });
    p.kitchen = /^\d\d:\d\d$/.test(p.kitchen || '') ? p.kitchen : '19:00';
    delete p.bedtime; // version 2 worked the cutoff out from bedtime
    p.remindAt = /^\d\d:\d\d$/.test(p.remindAt || '') ? p.remindAt : '20:30';
    p.started = p.started || today();
    offerNew(p);
    return p;
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && Array.isArray(raw.people)) {
        const s = Object.assign(freshState(), raw);
        if ((raw.version || 0) < 3) s.people.forEach(p => (p.foods || []).forEach(f => { if (f.id === 'alcohol' && !f.n && !f.limit) f.n = 3; }));
        s.version = 3;
        s.people = ['a', 'b'].map(id => tidyPerson(Object.assign(newPerson(id, id === 'a' ? 'Mom' : 'Dad'), s.people.find(p => p.id === id) || {})));
        return s;
      }
      if (raw && Array.isArray(raw.foods) && Array.isArray(raw.log)) { // version 1: one person's list
        const s = freshState();
        Object.assign(s.people[0], { started: raw.started || today(), foods: raw.foods, log: raw.log, seen: raw.foods.map(f => f.id).concat(GUIDE.filter(g => g.on && g.kind === 'less' && ['alcohol', 'pizza', 'late-night'].indexOf(g.id) < 0).map(g => g.id)) });
        s.people.forEach(tidyPerson);
        return s;
      }
    } catch (e) { /* start fresh */ }
    const s = freshState(); s.people.forEach(tidyPerson); return s;
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Couldn’t save on this phone. Is storage full?'); }
    if (window.FamilySync) FamilySync.changed(STORE_KEY);
  }

  let me = flag(ME_KEY);             // whose phone this is ('a' or 'b'), null until picked
  let who = me || 'a';               // whose tracker is showing
  let day = today();                 // the day the log buttons add to
  const P = () => state.people.find(p => p.id === who);
  const cutoff = p => p.kitchen;
  const nameOf = (f, p) => f.id === 'late-night' ? `Eating after ${fmtTime(cutoff(p))}` : f.name;

  // ---------- Counting ----------
  // Servings of each food in the week starting `mon`, and the days where a cut-back food went past its allowance.
  function weekStats(p, mon) {
    const end = addDays(mon, 6);
    const foods = Object.fromEntries(p.foods.map(f => [f.id, f]));
    const entries = p.log.filter(x => x.d >= mon && x.d <= end && x.f in foods)
      .sort((a, b) => a.d.localeCompare(b.d) || a.at - b.at);
    const count = {}, slipDays = new Set();
    entries.forEach(x => {
      count[x.f] = (count[x.f] || 0) + (foods[x.f].unit === 'min' ? (x.m || 0) * (x.v ? 2 : 1) : 1);
      if (foods[x.f].kind === 'less' && count[x.f] > foods[x.f].n) slipDays.add(x.d);
    });
    const less = p.foods.filter(f => f.kind === 'less'), more = p.foods.filter(f => f.kind === 'more'), move = p.foods.filter(f => f.kind === 'move');
    const minutes = move.filter(f => f.unit === 'min').reduce((n, f) => n + (count[f.id] || 0), 0);
    const minGoal = move.filter(f => f.unit === 'min').reduce((n, f) => n + f.n, 0);
    return {
      count, slipDays,
      over: less.reduce((n, f) => n + Math.max(0, (count[f.id] || 0) - f.n), 0),
      onTrack: less.filter(f => (count[f.id] || 0) <= f.n).length, lessN: less.length,
      met: more.filter(f => (count[f.id] || 0) >= f.n).length, moreN: more.length,
      good: more.reduce((n, f) => n + (count[f.id] || 0), 0),
      moveMet: move.filter(f => (count[f.id] || 0) >= f.n).length, moveN: move.length, minutes, minGoal,
    };
  }

  function streak(p) {
    let n = 0, d = today();
    const cache = {};
    while (d >= p.started && n < 3660) {
      const mon = mondayOf(d);
      const w = cache[mon] || (cache[mon] = weekStats(p, mon));
      if (w.slipDays.has(d)) break;
      n++; d = addDays(d, -1);
    }
    return n;
  }

  // ---------- Rendering ----------
  function statusOf(f, c) {
    if (f.kind === 'more' || f.kind === 'move') {
      const u = f.unit === 'min' ? ' min' : '';
      if (!f.n) return { cls: 'ok', text: 'No target' };
      return c >= f.n ? { cls: 'met', text: c > f.n ? `Goal met +${c - f.n}${u}` : 'Goal met' } : { cls: 'togo', text: `${f.n - c}${u} to go` };
    }
    if (c > f.n) return { cls: 'over', text: `${c - f.n} over` };
    if (f.n === 0) return { cls: 'cut', text: 'Cut' };
    if (c === f.n) return { cls: 'full', text: 'All used' };
    return { cls: 'ok', text: `${f.n - c} left` };
  }

  function meter(f, c) {
    const m = el('span', 'meter');
    if (f.kind !== 'less' || Math.max(f.n, c) > 10) { // a bar for targets and big numbers
      m.classList.add('bar');
      const top = Math.max(f.n, c, 1);
      const fill = el('i', 'fill' + (f.kind === 'less' && c > f.n ? ' over' : f.kind !== 'less' && c >= f.n ? ' met' : ''));
      fill.style.width = `${Math.min(100, Math.round(100 * c / top))}%`;
      m.append(fill);
      if (f.kind === 'less' && c > f.n && f.n) { const mark = el('i', 'mark'); mark.style.left = `${Math.round(100 * f.n / top)}%`; m.append(mark); }
      return m;
    }
    const n = Math.max(f.n, c);
    if (!n) { m.classList.add('zero'); m.append(el('i', 'pip zero')); return m; }
    for (let i = 0; i < n; i++) m.append(el('i', 'pip' + (i < c ? (i < f.n ? ' used' : ' over') : '')));
    return m;
  }

  function dayName(d) {
    const t = today();
    if (d === t) return 'today';
    if (d === addDays(t, -1)) return 'yesterday';
    return fmt(d, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  // The three zones on the main page: what to eat more of, what to limit, what to avoid.
  const ZONES = [
    { key: 'more', title: 'Eat more', sub: 'Aim to hit these every week', test: f => f.kind === 'more',
      score: (fs, w) => `${fs.filter(f => (w.count[f.id] || 0) >= f.n).length}/${fs.length} met`,
      icon: '<path d="M12 19V6M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' },
    { key: 'move', title: 'Move', sub: 'Exercise goals for the week', test: f => f.kind === 'move',
      score: (fs, w) => `${fs.filter(f => (w.count[f.id] || 0) >= f.n).length}/${fs.length} met`,
      icon: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' },
    { key: 'limit', title: 'Limit', sub: 'OK a few times a week, up to the allowance', test: f => f.kind === 'less' && f.n > 0,
      score: (fs, w) => `${fs.filter(f => (w.count[f.id] || 0) <= f.n).length}/${fs.length} on track`,
      icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>' },
    { key: 'avoid', title: 'Avoid', sub: 'Aim for none at all', test: f => f.kind === 'less' && f.n === 0,
      score: (fs, w) => `${fs.filter(f => !w.count[f.id]).length}/${fs.length} clear`,
      icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M6.5 6.5l11 11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' },
  ];
  const ORDER = Object.fromEntries(LESS_CATS.map((c, i) => [c, i]));

  function foodRow(p, f, c, onDay, zone) {
    const st = statusOf(f, c), nm = nameOf(f, p);
    const row = el('div', 'food ' + st.cls);
    const info = el('div', 'info');
    const name = el('button', 'name', nm); name.type = 'button';
    name.setAttribute('aria-expanded', 'false');
    const meta = el('span', 'meta');
    if (zone === 'avoid') meta.append(el('span', 'pill ' + (c ? 'over' : 'cut'), c ? `Had ${c} this week` : 'None this week'));
    else meta.append(meter(f, c), el('span', 'pill ' + st.cls, st.text), el('span', 'allow num', `${c}/${f.n}`));
    info.append(name, meta);
    const g = GUIDE_BY_ID[f.id];
    if (g && g.swap && (st.cls === 'over' || st.cls === 'full')) info.append(el('span', 'swap', 'Try instead: ' + g.swap));
    const more = el('div', 'more-info'); more.hidden = true;
    if (f.ex) more.append(el('span', 'ex', f.ex));
    if (g && g.swap && !(st.cls === 'over' || st.cls === 'full')) more.append(el('span', 'ex', 'Instead: ' + g.swap));
    if (g) more.append(el('span', 'ex why-line', g.why));
    if (more.children.length) info.append(more);
    name.onclick = () => { more.hidden = !more.hidden; name.setAttribute('aria-expanded', String(!more.hidden)); };

    if (f.unit === 'min') { row.classList.add('minutes'); row.append(info, minutesCtl(f, nm, onDay)); return row; }
    const ctr = el('div', 'ctr');
    const minus = el('button', 'cbtn minus', '−');
    minus.type = 'button'; minus.disabled = !onDay;
    minus.setAttribute('aria-label', `Remove one ${nm} from ${dayName(day)}`);
    minus.onclick = () => unlog(f.id);
    const shown = el('span', 'today num', String(onDay));
    shown.setAttribute('aria-label', `${onDay} on ${dayName(day)}`);
    const plus = el('button', 'cbtn plus z-' + zone, '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', `Log one ${nm} on ${dayName(day)}`);
    plus.onclick = () => logOne(f.id);
    ctr.append(minus, shown, plus);
    row.append(info, ctr);
    return row;
  }

  // Logging minutes: quick-add buttons, a "vigorous" switch (counts double) and an undo for the last entry.
  let vigorous = false;
  function minutesCtl(f, nm, onDay) {
    const box = el('div', 'minctl');
    const mins = P().log.filter(x => x.f === f.id && x.d === day);
    const total = mins.reduce((n, x) => n + (x.m || 0) * (x.v ? 2 : 1), 0);
    const top = el('div', 'minrow');
    const dayTxt = el('span', 'mintoday', onDay ? `${dayName(day).replace(/^./, c => c.toUpperCase())}: ${total} min` : `Nothing logged ${dayName(day)}`);
    const undo = el('button', 'linkbtn', 'Undo last'); undo.type = 'button'; undo.hidden = !onDay;
    undo.onclick = () => unlog(f.id);
    top.append(dayTxt, undo);
    const quick = el('div', 'quick');
    [10, 20, 30, 45, 60].forEach(m => {
      const b = el('button', 'qbtn num', `+${m}`); b.type = 'button';
      b.setAttribute('aria-label', `Log ${m} ${vigorous ? 'vigorous ' : ''}minutes ${dayName(day)}`);
      b.onclick = () => logMinutes(f.id, m);
      quick.append(b);
    });
    const vg = el('label', 'vig');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'vigorous'; cb.checked = vigorous;
    cb.onchange = () => { vigorous = cb.checked; render(); };
    vg.append(cb, document.createTextNode(' Vigorous (counts double)'));
    box.append(top, quick, vg);
    return box;
  }

  function render() {
    const p = P(), t = today(), mon = mondayOf(t);
    const w = weekStats(p, mon);

    // Whose tracker
    const W = $('people'); W.innerHTML = '';
    state.people.forEach(x => {
      const b = el('button', '', x.name || (x.id === 'a' ? 'First' : 'Second'));
      b.type = 'button'; b.setAttribute('aria-pressed', x.id === who);
      b.onclick = () => { who = x.id; day = today(); render(); };
      W.append(b);
    });
    $('whoPick').hidden = !!me;
    $('pickA').textContent = `I’m ${state.people[0].name || 'the first'}`;
    $('pickB').textContent = `I’m ${state.people[1].name || 'the second'}`;
    $('viewingOther').hidden = !me || me === who;
    $('viewingOther').textContent = `You’re looking at ${p.name}’s tracker.`;

    $('weekRange').textContent = `Week of ${fmt(mon, { month: 'short', day: 'numeric' })}`;
    $('onTrack').textContent = w.onTrack; $('lessN').textContent = w.lessN;
    $('met').textContent = w.met; $('moreN').textContent = w.moreN;
    $('minutes').textContent = w.minutes; $('minGoal').textContent = w.minGoal;
    $('moveScore').hidden = !w.minGoal;
    const late = p.log.filter(x => x.d >= mon).length === 0;
    $('heroSub').textContent = late ? 'Nothing logged yet this week. Log each serving as you have it.'
      : w.over ? `${plural(w.over, 'serving')} over on the cut-back list. Monday is a fresh start.`
      : 'Nothing on the cut-back list has gone over this week.';

    const D = $('days'); D.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      const li = el('li', 'day');
      const future = d > t, before = d < p.started;
      li.classList.add(future || before ? 'none' : w.slipDays.has(d) ? 'slip' : 'clean');
      if (d === t) li.classList.add('now');
      if (d === day) li.classList.add('sel');
      const b = el('button'); b.type = 'button'; b.disabled = future;
      b.append(el('span', 'dn', fmt(d, { weekday: 'narrow' })), el('i', 'dot'), el('span', 'dd num', String(parse(d).getDate())));
      b.setAttribute('aria-label', `${fmt(d, { weekday: 'long' })}: ${future ? 'still to come' : before ? 'before you started' : w.slipDays.has(d) ? 'went over an allowance' : 'clean day'}. Tap to log for this day.`);
      b.onclick = () => { day = d; render(); };
      li.append(b); D.append(li);
    }

    $('sStreak').textContent = plural(streak(p), 'day');
    $('sGood').textContent = w.good;
    $('sStrength').textContent = w.count.strength || 0;
    $('sOver').textContent = w.over;

    // Logging list
    $('dayLabel').textContent = dayName(day).replace(/^./, c => c.toUpperCase());
    $('nextDay').disabled = day >= t;
    const closed = day === t && toMin(cutoff(p)) <= new Date().getHours() * 60 + new Date().getMinutes();
    const dw = mondayOf(day) === mon ? w : weekStats(p, mondayOf(day));
    const L = $('foodList'); L.innerHTML = '';
    const onDay = f => p.log.filter(x => x.f === f.id && x.d === day).length;
    ZONES.forEach(z => {
      const fs = p.foods.filter(z.test);
      if (z.key === 'limit' || z.key === 'avoid') fs.sort((a, b) => (ORDER[a.cat] ?? 99) - (ORDER[b.cat] ?? 99));
      const sec = el('section', 'zone z-' + z.key);
      const head = el('div', 'zhead');
      const ic = el('span', 'zicon'); ic.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${z.icon}</svg>`;
      const tt = el('div', 'ztext'); tt.append(el('h3', '', z.title), el('span', 'zsub', z.sub));
      head.append(ic, tt, el('span', 'zscore num', fs.length ? z.score(fs, dw) : ''));
      sec.append(head);
      if (z.key === 'limit' && p.foods.some(f => f.id === 'late-night')) {
        sec.append(el('p', 'kitchen', closed ? `Kitchen closed at ${fmtTime(cutoff(p))}. Water and herbal tea only tonight.` : `Kitchen closes at ${fmtTime(cutoff(p))} tonight.`));
      }
      if (!fs.length) sec.append(el('div', 'empty', z.key === 'avoid' ? 'Nothing set to avoid. Set a food’s allowance to 0 to put it here.' : 'Nothing here yet. Add foods under the list below.'));
      fs.forEach(f => sec.append(foodRow(p, f, dw.count[f.id] || 0, onDay(f), z.key)));
      L.append(sec);
    });

    renderEdit(p);
    renderHistory(p);
    renderSettings(p);
  }

  function renderEdit(p) {
    $('listOwner').textContent = `${p.name}’s list`;
    const cnt = k => p.foods.filter(f => f.kind === k).length;
    $('listSum').textContent = `${cnt('less')} to cut back · ${cnt('more')} to eat more · ${cnt('move')} exercise goals · tap to change`;
    [['less', 'editLess', 'libLess'], ['more', 'editMore', 'libMore'], ['move', 'editMove', 'libMove']].forEach(([k, listId, libId]) => {
      const E = $(listId); E.innerHTML = '';
      p.foods.filter(f => f.kind === k).forEach(f => {
        const g = GUIDE_BY_ID[f.id], nm = nameOf(f, p);
        const row = el('div', 'erow');
        const info = el('div', 'info');
        info.append(el('span', 'name', nm));
        const sub = el('span', 'meta');
        if (k === 'less') sub.append(el('span', '', f.cat));
        if (g) {
          sub.append(el('span', '', `${k === 'less' ? '· ' : ''}suggested ${k === 'less' && g.n === 0 ? 'cut' : g.n + (g.unit === 'min' ? ' min' : '') + ' a week'}`));
          if (f.n !== g.n) {
            const r = el('button', 'linkbtn', 'Use suggested');
            r.type = 'button'; r.onclick = () => setN(f.id, g.n);
            sub.append(r);
          }
        }
        info.append(sub);
        if (g) { const why = el('details', 'why'); why.append(el('summary', '', 'Why'), el('p', '', g.why)); info.append(why); }

        const step = el('div', 'stepper');
        const dn = el('button', 'cbtn', '−'); dn.type = 'button'; dn.disabled = f.n <= 0;
        dn.setAttribute('aria-label', `Lower ${nm} ${k === 'less' ? 'allowance' : 'target'}`);
        const stepBy = f.unit === 'min' ? MIN_STEP : 1;
        dn.onclick = () => setN(f.id, f.n - stepBy);
        const v = el('span', 'lim num'); v.append(el('b', '', String(f.n)), el('small', '', f.unit === 'min' ? 'min/wk' : '/wk'));
        const up = el('button', 'cbtn', '+'); up.type = 'button'; up.disabled = f.n >= (f.unit === 'min' ? MAX_MIN : MAX_N);
        up.setAttribute('aria-label', `Raise ${nm} ${k === 'less' ? 'allowance' : 'target'}`);
        up.onclick = () => setN(f.id, f.n + stepBy);
        step.append(dn, v, up);

        const x = el('button', 'del', 'Remove'); x.type = 'button';
        x.onclick = () => {
          if (!x.classList.contains('arm')) {
            x.classList.add('arm'); x.textContent = 'Confirm';
            setTimeout(() => { x.classList.remove('arm'); x.textContent = 'Remove'; }, 3000);
            return;
          }
          p.foods = p.foods.filter(y => y.id !== f.id);
          save(); render(); toast(`${nm} removed. Its past log is kept if you add it back.`);
        };
        const side = el('div', 'side'); side.append(step, x);
        row.append(info, side);
        E.append(row);
      });
      if (!E.children.length) E.append(el('div', 'empty', 'Nothing on this list.'));

      const Lb = $(libId); Lb.innerHTML = '';
      const have = new Set(p.foods.map(f => f.id));
      GUIDE.filter(g => g.kind === k && !have.has(g.id)).forEach(g => {
        const b = el('button', 'chip', `+ ${g.name} · ${k === 'less' && g.n === 0 ? 'cut' : g.n + (g.unit === 'min' ? ' min' : '') + '/wk'}`);
        b.type = 'button';
        b.onclick = () => { p.foods.push(fromGuide(g)); if (!p.seen.includes(g.id)) p.seen.push(g.id); save(); render(); toast(`${g.name} added.`); };
        Lb.append(b);
      });
      Lb.hidden = !Lb.children.length;
    });
  }

  function renderHistory(p) {
    const H = $('history'); H.innerHTML = '';
    const thisMon = mondayOf(today()), firstMon = mondayOf(p.started);
    const g = el('div', 'group');
    for (let i = 1; i <= HISTORY_WEEKS; i++) {
      const mon = addDays(thisMon, -7 * i);
      if (mon < firstMon) break;
      const w = weekStats(p, mon);
      const days = [...Array(7)].map((_, k) => addDays(mon, k)).filter(d => d >= p.started);
      const clean = days.filter(d => !w.slipDays.has(d)).length;
      const row = el('div', 'hrow');
      row.append(
        el('span', 'wk', fmt(mon, { month: 'short', day: 'numeric' })),
        el('span', 'num', `${clean}/${days.length} clean`),
        el('span', 'num' + (w.over ? ' neg' : ' pos'), w.over ? `${w.over} over` : 'None over'),
        el('span', 'num' + (w.moreN && w.met === w.moreN ? ' pos' : ''), `${w.met}/${w.moreN} eat`),
        el('span', 'num' + (w.minGoal && w.minutes >= w.minGoal ? ' pos' : ''), `${w.minutes} min`));
      g.append(row);
    }
    if (!g.children.length) H.append(el('div', 'empty', 'Finished weeks show up here, starting next Monday.'));
    else H.append(g);
  }

  function renderSettings(p) {
    $('setOwner').textContent = `${p.name}’s settings`;
    if (document.activeElement !== $('nA')) $('nA').value = state.people[0].name;
    if (document.activeElement !== $('nB')) $('nB').value = state.people[1].name;
    $('kitchenAt').value = p.kitchen;
    $('remindAt').value = p.remindAt;
    $('cutoffNote').textContent = `Kitchen closes at ${fmtTime(cutoff(p))}.`;
    $('thisPhone').textContent = me ? `This phone is ${state.people.find(x => x.id === me).name}’s.` : 'This phone isn’t set to anyone yet.';
  }

  // ---------- Actions ----------
  function logOne(fid) {
    const p = P(), f = p.foods.find(x => x.id === fid); if (!f) return;
    p.log.push({ id: uid(), f: fid, d: day, at: Date.now() });
    save(); render();
    const c = weekStats(p, mondayOf(day)).count[fid] || 0, nm = nameOf(f, p);
    if (f.kind === 'move') toast(c === f.n ? `${nm}: goal met for the week.` : c > f.n ? `${nm} logged. Past this week’s goal.` : `${nm} logged. ${f.n - c} to go this week.`);
    else if (f.kind === 'more') toast(c === f.n ? `${nm}: target met for the week.` : c > f.n ? `${nm} logged. Past this week’s target.` : `${nm} logged. ${f.n - c} to go this week.`);
    else if (c > f.n) toast(f.n === 0 ? `${nm} logged. It’s on your cut list.` : `${nm}: ${c - f.n} over this week.`);
    else if (c === f.n) toast(`${nm}: that’s this week’s allowance used up.`);
    else toast(`${nm} logged. ${f.n - c} left this week.`);
  }
  function logMinutes(fid, m) {
    const p = P(), f = p.foods.find(x => x.id === fid); if (!f) return;
    p.log.push(Object.assign({ id: uid(), f: fid, d: day, at: Date.now(), m }, vigorous ? { v: 1 } : {}));
    save(); render();
    const c = weekStats(p, mondayOf(day)).count[fid] || 0;
    toast(`${m}${vigorous ? ' vigorous' : ''} min logged${vigorous ? ` (counts as ${m * 2})` : ''}. ${c >= f.n ? 'Weekly goal met!' : `${f.n - c} min to go this week.`}`);
  }
  function unlog(fid) {
    const p = P();
    const last = p.log.filter(x => x.f === fid && x.d === day).sort((a, b) => b.at - a.at)[0];
    if (!last) return;
    p.log = p.log.filter(x => x.id !== last.id);
    save(); render();
  }
  function setN(fid, n) {
    const f = P().foods.find(x => x.id === fid); if (!f) return;
    f.n = clampFor(f, n); save(); render();
  }

  $('closeList').onclick = () => { $('manage').open = false; $('manage').scrollIntoView({ block: 'nearest' }); };
  $('prevDay').onclick = () => { day = addDays(day, -1); render(); };
  $('nextDay').onclick = () => { if (day < today()) { day = addDays(day, 1); render(); } };

  let newKind = 'less';
  $('newKind').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    newKind = b.dataset.k;
    [...$('newKind').children].forEach(x => x.setAttribute('aria-pressed', x === b));
    $('newNLabel').textContent = newKind === 'less' ? 'Allowed per week' : newKind === 'move' ? 'Times per week' : 'Target per week';
  };
  $('addForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const p = P(), name = $('newName').value.trim();
    if (!name) { $('msg').textContent = 'Type a name first.'; return; }
    if (p.foods.some(f => f.name.toLowerCase() === name.toLowerCase())) { $('msg').textContent = `${name} is already on the list.`; return; }
    const n = clamp(parseInt($('newN').value, 10));
    p.foods.push(Object.assign({ id: 'c-' + uid(), kind: newKind, name, cat: newKind === 'less' ? 'Your own' : '', n, ex: $('newEx').value.trim() }, newKind === 'move' ? { unit: 'times' } : {}));
    $('newName').value = ''; $('newEx').value = ''; $('newN').value = 1;
    $('msg').textContent = `${name} added to ${p.name}’s ${newKind === 'less' ? 'cut-back' : newKind === 'move' ? 'exercise' : 'eat-more'} list.`;
    save(); render();
  });

  // ---------- Who's who, and settings ----------
  const pick = id => { me = id; who = id; flag(ME_KEY, id); render(); toast(`This phone is now ${P().name}’s.`); };
  $('pickA').onclick = () => pick('a');
  $('pickB').onclick = () => pick('b');
  $('switchPhone').onclick = () => pick(me === 'a' ? 'b' : 'a');
  const saveName = (i, input) => { const v = input.value.trim(); if (v && v !== state.people[i].name) { state.people[i].name = v; save(); render(); } };
  $('nA').onchange = () => saveName(0, $('nA'));
  $('nB').onchange = () => saveName(1, $('nB'));
  $('kitchenAt').onchange = () => { if ($('kitchenAt').value) { P().kitchen = $('kitchenAt').value; save(); render(); } };
  $('remindAt').onchange = () => { if ($('remindAt').value) { P().remindAt = $('remindAt').value; save(); render(); } };

  // ---------- Reminders: a calendar file with two daily alarms ----------
  // A web app can't wake the phone on a schedule without a server, so the reminders live in the phone's calendar.
  $('calBtn').onclick = () => {
    const p = P(), close = cutoff(p), warn = fromMin(toMin(close) - 15);
    const start = today().replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const url = location.href.split('#')[0];
    const ev = (key, time, title, note) => [
      'BEGIN:VEVENT', `UID:long-game-${p.id}-${key}@family-apps`, `DTSTAMP:${stamp}`,
      `DTSTART:${start}T${time.replace(':', '')}00`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY',
      `SUMMARY:${title}`, `DESCRIPTION:${note}\\n${url}`, 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT'];
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Family apps//Long Game//EN', 'CALSCALE:GREGORIAN',
      ...ev('kitchen', warn, `Kitchen closes at ${fmtTime(close)}`, 'Last call for food tonight. Water and herbal tea are fine after.'),
      ...ev('log', p.remindAt, 'Log today in Long Game', 'Tap + for everything you had today, the good and the cut-back.'),
      'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `long-game-reminders-${p.name.toLowerCase().replace(/\W+/g, '-')}.ics`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Open the file and tap “Add All” to put the reminders in your calendar.');
  };

  function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { e.hidden = true; }, 4000); }

  // ---------- Backup ----------
  $('bDown').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `long-game-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('bUp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const s = JSON.parse(t); if (!s || !(Array.isArray(s.people) || Array.isArray(s.foods))) throw new Error('bad');
      localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); save(); render(); toast('Backup restored.');
    }).catch(() => toast('That file isn’t a Long Game backup.'));
    e.target.value = '';
  };
  $('bErase').onclick = () => {
    const b = $('bErase');
    if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = 'Tap again to erase'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Erase everything'; }, 3000); return; }
    delete b.dataset.arm; b.textContent = 'Erase everything';
    state = freshState(); state.people.forEach(tidyPerson); day = today(); save(); render(); toast('Both logs erased and lists reset.');
  };

  // Roll over to a new day (and a fresh week on Monday) while the app stays open.
  let dayKey = today();
  setInterval(() => { if (today() !== dayKey) { if (day === dayKey) day = today(); dayKey = today(); } render(); }, 60000);

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

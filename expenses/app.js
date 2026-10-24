/* Weekly $750 Tracker — a weekly spending budget with a grove of three trees (one per boy) that grows as you save.
 * Weeks run Saturday to Friday and reset every Saturday. Every finished week at or under the budget banks the
 * difference; weeks over it subtract.
 * Saved on this phone in localStorage, and shared between our phones by family-sync.js once signed in. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'daily-80-v1'; // kept from the daily version so saved and synced expenses carry over
  const WEEKLY_BUDGET = 750;
  const START_DATE = '2026-10-24'; // net saved counts from this Saturday; earlier weeks are listed but not counted
  const CATS = ['Groceries', 'Dining out', 'Coffee & snacks', 'Transport', 'Kids & childcare', 'Household', 'Shopping', 'Health & beauty', 'Entertainment', 'Subscriptions', 'Gifts', 'Other'];
  const FULL_GROVE = 12; // weeks under budget until the grove is fully grown

  // ---------- Helpers ----------
  const $ = id => document.getElementById(id);
  const fmt = n => Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Math.abs(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const fmt2 = n => Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  // Weeks start on Saturday: the Saturday on or before a date.
  const weekOf = s => { const d = parse(s); d.setDate(d.getDate() - (d.getDay() + 1) % 7); return ymd(d); };
  const weekEnd = k => { const d = parse(k); d.setDate(d.getDate() + 6); return ymd(d); };
  const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 2,
    budget: WEEKLY_BUDGET,
    startDate: START_DATE,
    names: { b1: 'Miles', b3: 'Lucas', b7: 'Julien' },
    entries: [], // [{ id, amount, category, note, date: 'YYYY-MM-DD', createdAt }]
  };
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && Array.isArray(raw.entries)) {
        const s = Object.assign(structuredClone(DEFAULT_STATE), raw);
        s.names = Object.assign({ b1: '', b3: '', b7: '' }, raw.names || {});
        // The daily version stored a per-day allowance; switch it to the weekly budget.
        if (!(raw.version >= 2)) { s.version = 2; s.budget = WEEKLY_BUDGET; }
        delete s.allowance;
        if (!s.startDate) s.startDate = START_DATE;
        return s;
      }
    } catch (e) { /* start fresh */ }
    return structuredClone(DEFAULT_STATE);
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { flash('Couldn’t save on this phone. Is storage full?'); }
    if (window.FamilySync) FamilySync.changed(STORE_KEY);
  }

  let selCat = 'Groceries';
  let range = 'month';

  function buildCats() {
    const c = $('cats'); c.innerHTML = '';
    CATS.forEach(name => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cat'; b.textContent = name;
      b.setAttribute('aria-pressed', name === selCat);
      b.onclick = () => { selCat = name; buildCats(); };
      c.appendChild(b);
    });
  }

  function byWeek() {
    const m = new Map();
    for (const e of state.entries) { const k = weekOf(e.date); if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
    return m;
  }

  // ---------- Rendering ----------
  function render() {
    const budget = state.budget;
    const thisWeek = weekOf(today());
    const weeks = byWeek(); const keys = [...weeks.keys()].sort().reverse();
    const rows = keys.map(k => {
      const list = weeks.get(k); const spent = list.reduce((a, e) => a + e.amount, 0);
      return { k, list, spent, diff: budget - spent, live: k >= thisWeek, counted: k >= weekOf(state.startDate) };
    });
    // Only finished weeks count toward the totals; this week is still in progress until Friday ends.
    // Weeks before the start date are history only (tracking wasn't consistent then).
    const done = rows.filter(r => !r.live && r.counted);
    let saved = 0, over = 0, under = 0;
    for (const r of done) { if (r.diff >= 0) { saved += r.diff; under++; } else over += -r.diff; }
    // Streak: consecutive finished weeks (most recent first) at or under the budget.
    let streak = 0; for (const r of done) { if (r.diff >= 0) streak++; else break; }
    const net = saved - over;

    // The grove grows with weeks kept under budget: full size at 12.
    const g = Math.min(1, 0.55 + under / FULL_GROVE * 0.45);
    ['t1', 't3', 't7'].forEach(id => { $(id).style.transform = `scale(${g})`; });
    $('growCap').textContent = under >= FULL_GROVE ? 'The grove is fully grown' : `${under} of ${FULL_GROVE} weeks under budget to full grove`;
    renderBlooms(under);

    $('title').textContent = `Weekly ${fmt(budget)} Tracker`;
    if (document.activeElement !== $('allowance')) $('allowance').value = budget;
    $('netBig').textContent = (net < 0 ? '−' : '') + fmt(net);
    $('netBig').className = 'big num ' + (net > 0 ? 'pos' : net < 0 ? 'neg' : '');
    $('netSub').textContent = done.length ? `Across ${done.length} finished week${done.length > 1 ? 's' : ''} at ${fmt(budget)} a week.`
      : `Counting from ${short(parse(weekOf(state.startDate)))}. Your first week counts once it ends on Friday night.`;
    $('sSaved').textContent = fmt(saved); $('sOver').textContent = fmt(over);
    $('sUnder').textContent = `${under} / ${done.length}`; $('sStreak').textContent = `${streak} week${streak === 1 ? '' : 's'}`;

    // This week (Saturday to Friday)
    const tl = weeks.get(thisWeek) || []; const ts = tl.reduce((a, e) => a + e.amount, 0); const left = budget - ts;
    const daysLeft = 7 - Math.round((parse(today()) - parse(thisWeek)) / 864e5);
    $('todayLabel').textContent = `This week · ${short(parse(thisWeek))} – ${short(parse(weekEnd(thisWeek)))}`;
    $('todaySpent').textContent = fmt2(ts) + ' spent of ' + fmt(budget);
    $('todayLeft').textContent = left >= 0 ? fmt2(left) + ' left' : fmt2(left) + ' over';
    $('todayLeft').style.color = left >= 0 ? 'var(--ink)' : 'var(--over)';
    $('todayReset').textContent = daysLeft === 1 ? 'Last day · resets tomorrow (Saturday)' : `${daysLeft} days left · resets Saturday`;
    $('meter').className = 'meter' + (left < 0 ? ' over' : '');
    $('meterFill').style.width = Math.min(100, ts / budget * 100) + '%';

    // Ledger
    const L = $('ledger');
    if (!rows.length) {
      L.innerHTML = '<div class="empty">No weeks logged yet. Add an expense or log a no-spend day, and each week shows up here with what it saved or cost you.</div>';
    } else {
      const maxSpent = Math.max(budget * 1.5, ...rows.map(r => r.spent));
      const open = new Set([...L.querySelectorAll('details[open]')].map(d => d.dataset.k));
      L.innerHTML = '';
      rows.forEach(r => {
        const d = document.createElement('details'); d.className = 'day'; d.dataset.k = r.k; if (open.has(r.k)) d.open = true;
        const cls = !r.counted ? 'even' : r.diff < 0 ? 'neg' : r.live ? 'even' : r.diff > 0 ? 'pos' : 'even';
        const label = !r.counted ? 'not counted' : r.diff < 0 ? '−' + fmt(r.diff) + ' over' : r.live ? fmt(r.diff) + ' left' : r.diff > 0 ? '+' + fmt(r.diff) + ' saved' : 'even';
        d.innerHTML = `<summary><span class="date">${short(parse(r.k))}<small>${r.k === thisWeek ? 'This week' : r.live ? 'Upcoming' : 'to ' + short(parse(weekEnd(r.k)))} · <span class="num">${fmt2(r.spent)}</span></small></span>
          <span class="bar${r.diff < 0 ? ' over' : ''}"><i style="width:${Math.max(r.spent ? 2 : 0, r.spent / maxSpent * 100)}%"></i><b style="left:${budget / maxSpent * 100}%"></b></span>
          <span class="pill ${cls}">${label}</span></summary>`;
        const ul = document.createElement('ul'); ul.className = 'entries';
        [...r.list].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0)).forEach(e => {
          const li = document.createElement('li'); li.className = 'entry';
          const w = document.createElement('span'); w.className = 'what';
          w.textContent = parse(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + e.category;
          if (e.note) { const s = document.createElement('small'); s.textContent = ' · ' + e.note; w.appendChild(s); }
          const a = document.createElement('span'); a.className = 'num'; a.textContent = fmt2(e.amount);
          const x = document.createElement('button'); x.type = 'button'; x.className = 'del'; x.textContent = 'Remove';
          x.onclick = () => {
            if (!x.classList.contains('arm')) {
              x.classList.add('arm'); x.textContent = 'Confirm';
              setTimeout(() => { x.classList.remove('arm'); x.textContent = 'Remove'; }, 3000);
              return;
            }
            state.entries = state.entries.filter(y => y.id !== e.id); save(); render();
          };
          li.append(w, a, x); ul.appendChild(li);
        });
        d.appendChild(ul); L.appendChild(d);
      });
    }

    // Categories
    const now = new Date(); let from = null;
    if (range === 'week') from = thisWeek;
    else if (range === 'month') from = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const tot = {}; let sum = 0;
    for (const e of state.entries) { if (from && e.date < from) continue; if (e.amount <= 0) continue; tot[e.category] = (tot[e.category] || 0) + e.amount; sum += e.amount; }
    const C = $('catlist'); const sorted = Object.entries(tot).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) C.innerHTML = '<div class="empty">No spending in this period.</div>';
    else {
      C.innerHTML = ''; const mx = sorted[0][1];
      sorted.forEach(([k, v]) => {
        const r = document.createElement('div'); r.className = 'catrow';
        const n = document.createElement('span'); n.textContent = k;
        r.append(n);
        r.insertAdjacentHTML('beforeend', `<span class="bar"><i style="width:${v / mx * 100}%"></i></span><span class="amt num">${fmt2(v)}<br><small style="color:var(--muted)">${Math.round(v / sum * 100)}%</small></span>`);
        C.appendChild(r);
      });
    }
    renderNames();
  }

  // ---------- Names & surprise blooms ----------
  const AGE = { b1: 1, b3: 3, b7: 7 };
  const SPOTS = { b1: [[200, 160], [214, 155]], b3: [[273, 128], [292, 135], [265, 147], [298, 149]], b7: [[371, 90], [403, 86], [381, 121], [414, 113], [357, 114], [392, 68]] };
  const ORDER = ['b1', 'b3', 'b7', 'b3', 'b7', 'b1', 'b7', 'b3', 'b7', 'b3', 'b7', 'b7']; // 12 blooms over 12 under-budget weeks
  const KINDS = ['apple', 'cherries', 'blossom', 'lemon', 'daisy', 'plum'];
  const KIND_LABEL = { apple: 'An apple', cherries: 'Cherries', blossom: 'A blossom', lemon: 'A lemon', daisy: 'A daisy', plum: 'A plum' };
  const kindAt = i => KINDS[(i * 5 + 2) % KINDS.length];
  const treeName = g => state.names[g] ? state.names[g] + '’s' : `your ${AGE[g]}-year-old’s`;
  function bloomSVG(kind, x, y, isNew) {
    const c = `bloom${isNew ? ' new' : ''}`;
    const petals = (col, stroke) => [0, 72, 144, 216, 288].map(a => { const r = a * Math.PI / 180; return `<circle cx="${(x + Math.cos(r) * 3.6).toFixed(1)}" cy="${(y + Math.sin(r) * 3.6).toFixed(1)}" r="3.1" fill="${col}"${stroke ? ` stroke="${stroke}" stroke-width=".6"` : ''}/>`; }).join('');
    switch (kind) {
      case 'apple': return `<g class="${c}"><circle cx="${x}" cy="${y}" r="6" fill="#D6463E"/><path d="M${x} ${y - 6} q3 -4 6 -3 q-3 3 -6 3z" fill="#6FA85A"/></g>`;
      case 'cherries': return `<g class="${c}"><path d="M${x} ${y - 7} Q${x - 2} ${y - 2} ${x - 3} ${y + 1} M${x} ${y - 7} Q${x + 2} ${y - 2} ${x + 3} ${y + 2}" stroke="#55703F" stroke-width="1.2" fill="none"/><circle cx="${x - 3}" cy="${y + 2}" r="3.6" fill="#B3263E"/><circle cx="${x + 3.4}" cy="${y + 3}" r="3.6" fill="#C2304A"/></g>`;
      case 'blossom': return `<g class="${c}">${petals('#F6B6C4')}<circle cx="${x}" cy="${y}" r="2" fill="#F2CF5B"/></g>`;
      case 'daisy': return `<g class="${c}">${petals('#FFFFFF', '#D9DED5')}<circle cx="${x}" cy="${y}" r="2.2" fill="#E6AE31"/></g>`;
      case 'lemon': return `<g class="${c}"><ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.4" fill="#F0CB3F"/><ellipse cx="${x + 6}" cy="${y}" rx="1.2" ry="1" fill="#E0B92E"/></g>`;
      default: return `<g class="${c}"><circle cx="${x}" cy="${y}" r="5.6" fill="#7B4A8E"/><circle cx="${x - 2}" cy="${y - 2}" r="1.4" fill="#A47CB5"/></g>`;
    }
  }
  let shownBlooms = null; // blooms already drawn on this screen, so only new ones pop
  function renderBlooms(under) {
    const count = Math.min(ORDER.length, Math.floor(under * ORDER.length / FULL_GROVE));
    const used = { b1: 0, b3: 0, b7: 0 }, html = { b1: '', b3: '', b7: '' };
    const announce = shownBlooms !== null && count > shownBlooms;
    for (let i = 0; i < count; i++) { const g = ORDER[i]; const [x, y] = SPOTS[g][used[g]++]; html[g] += bloomSVG(kindAt(i), x, y, announce && i >= shownBlooms); }
    for (const g in html) $(g).innerHTML = html[g];
    if (announce) { const i = count - 1; toast(`Surprise! ${KIND_LABEL[kindAt(i)]} appeared on ${treeName(ORDER[i])} tree.`); }
    shownBlooms = count;
  }
  function renderNames() {
    for (const g of ['b1', 'b3', 'b7']) { const a = AGE[g]; $('l' + a).textContent = state.names[g] || String(a); if ($('namePanel').hidden) $('n' + a).value = state.names[g] || ''; }
    $('nameBtn').textContent = (state.names.b1 || state.names.b3 || state.names.b7) ? 'Edit names' : 'Name the trees';
  }
  $('nameBtn').onclick = () => { $('namePanel').hidden = !$('namePanel').hidden; if (!$('namePanel').hidden) $('n1').focus(); };
  $('cancelNames').onclick = () => { $('namePanel').hidden = true; renderNames(); };
  $('saveNames').onclick = () => {
    state.names = { b1: $('n1').value.trim(), b3: $('n3').value.trim(), b7: $('n7').value.trim() };
    $('namePanel').hidden = true; save(); render();
  };

  function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 4500); }
  function flash(t) { $('msg').textContent = t; clearTimeout(flash.t); flash.t = setTimeout(() => { $('msg').textContent = ''; }, 3500); }

  // ---------- Adding ----------
  function addEntry(amount, category, note, date) {
    state.entries.push({ id: uid(), amount, category, note, date, createdAt: Date.now() });
    save(); render();
  }
  $('form').addEventListener('submit', ev => {
    ev.preventDefault();
    const amt = Math.round(parseFloat($('amount').value) * 100) / 100;
    if (!(amt > 0)) { flash('Enter an amount above $0.'); return; }
    const date = $('date').value || today();
    addEntry(amt, selCat, $('note').value.trim(), date);
    $('amount').value = ''; $('note').value = '';
    flash(`Added ${fmt2(amt)} to ${selCat}.`);
  });
  $('zeroBtn').onclick = () => {
    const date = $('date').value || today();
    if (state.entries.some(e => e.date === date)) { flash('That day already has entries, so it’s already counted.'); return; }
    addEntry(0, 'No-spend day', '', date);
    flash(`Logged ${date === today() ? 'today' : date} as a no-spend day.`);
  };
  $('range').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    range = b.dataset.r; [...$('range').children].forEach(x => x.setAttribute('aria-pressed', x === b)); render();
  };
  let allowT;
  $('allowance').addEventListener('input', () => {
    const v = parseFloat($('allowance').value); if (!(v > 0)) return;
    state.budget = v; render();
    clearTimeout(allowT); allowT = setTimeout(save, 800);
  });

  // ---------- Backup ----------
  $('bDown').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `weekly-budget-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('bUp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const s = JSON.parse(t); if (!s || !Array.isArray(s.entries)) throw new Error('bad');
      localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); save(); render(); toast('Backup restored.');
    }).catch(() => toast('That file isn’t a Weekly Tracker backup.'));
    e.target.value = '';
  };
  $('bErase').onclick = () => {
    if (!confirm('Erase every expense? This can’t be undone (and erases it on both phones if you’re signed in).')) return;
    state = structuredClone(DEFAULT_STATE); state.startDate = weekOf(today()); save(); render(); toast('All expenses erased.');
  };

  // Roll over to a new day (and a new week on Saturday) while the app stays open.
  let dayKey = today();
  setInterval(() => { if (today() !== dayKey) { dayKey = today(); $('date').value = dayKey; render(); } }, 60000);

  $('date').value = today();
  buildCats();
  save();
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update(); document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }); })
      .catch(() => { /* offline support is optional */ });
  }

  // ---------- Family sync ----------
  // Shares this app's data between our phones once someone signs in (see ../family-sync.js).
  if (window.FamilySync) FamilySync.attach(STORE_KEY, {
    label: 'Weekly $750 Tracker',
    get: () => state,
    apply: json => {
      localStorage.setItem(STORE_KEY, json); state = load();
      render();
    },
  });
})();

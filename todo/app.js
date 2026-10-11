/* Our To-Do List — a shared list for the two of us, in the same look as the Daily $80 Tracker.
 * Each task can be for one of us or either of us, sit on a list, and have a due date.
 * Every task finished this week adds a piece of fruit to the tree; it starts fresh each Monday.
 * Saved on this phone in localStorage, and shared between our phones by family-sync.js once signed in. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'our-todo-v1';
  const LISTS = ['Home', 'Kids', 'Errands', 'Groceries', 'Money', 'Work', 'Other'];
  const DONE_SHOWN = 30; // most recent finished tasks listed under Done

  // ---------- Helpers ----------
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 1,
    names: { a: 'Mom', b: 'Dad' },
    tasks: [], // [{ id, title, who: 'both'|'a'|'b', list, due: 'YYYY-MM-DD'|'', note, done, doneAt, createdAt }]
  };
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && Array.isArray(raw.tasks)) {
        const s = Object.assign(structuredClone(DEFAULT_STATE), raw);
        s.names = Object.assign({ a: '', b: '' }, raw.names || {});
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

  const nameOf = w => w === 'a' ? (state.names.a || 'First') : w === 'b' ? (state.names.b || 'Second') : 'Either of us';
  let selWho = 'both', selList = 'Home', filter = 'all', editing = null;

  function chips(el, items, sel, pick) {
    el.innerHTML = '';
    items.forEach(([v, text]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = text;
      b.setAttribute('aria-pressed', v === sel);
      b.onclick = () => pick(v);
      el.appendChild(b);
    });
  }
  function buildChips() {
    chips($('who'), [['both', 'Either of us'], ['a', nameOf('a')], ['b', nameOf('b')]], selWho, v => { selWho = v; buildChips(); });
    chips($('lists'), LISTS.map(l => [l, l]), selList, v => { selList = v; buildChips(); });
  }

  // ---------- Rendering ----------
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function dueText(due) {
    const t = today();
    if (due === t) return 'Today';
    const d = parse(due), tm = new Date(); tm.setDate(tm.getDate() + 1);
    if (due === ymd(tm)) return 'Tomorrow';
    const days = Math.round((d - parse(t)) / 864e5);
    return d.toLocaleDateString('en-US', days > 0 && days < 7 ? { weekday: 'short' } : { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function taskRow(task) {
    const li = document.createElement('div');
    li.className = 'task' + (task.done ? ' done' : '');
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'check'; c.innerHTML = CHECK;
    c.setAttribute('aria-label', task.done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`);
    c.onclick = () => toggle(task.id);

    const w = document.createElement('button');
    w.type = 'button'; w.className = 'what'; w.setAttribute('aria-label', `Edit “${task.title}”`);
    w.onclick = () => startEdit(task.id);
    const t = document.createElement('span'); t.className = 't'; t.textContent = task.title;
    const m = document.createElement('span'); m.className = 'meta';
    const pill = (text, cls) => { const p = document.createElement('span'); p.className = 'pill' + (cls ? ' ' + cls : ''); p.textContent = text; m.appendChild(p); };
    if (task.who !== 'both') pill(nameOf(task.who), 'who');
    if (task.due && !task.done) pill(dueText(task.due), task.due < today() ? 'late' : '');
    const l = document.createElement('span'); l.textContent = task.list; m.appendChild(l);
    if (task.note) { const n = document.createElement('span'); n.className = 'note'; n.textContent = '· ' + task.note; m.appendChild(n); }
    if (task.done && task.doneAt) { const d = document.createElement('span'); d.textContent = '· done ' + new Date(task.doneAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); m.appendChild(d); }
    w.append(t, m);

    const x = document.createElement('button'); x.type = 'button'; x.className = 'del'; x.textContent = 'Remove';
    x.onclick = () => {
      if (!x.classList.contains('arm')) {
        x.classList.add('arm'); x.textContent = 'Confirm';
        setTimeout(() => { x.classList.remove('arm'); x.textContent = 'Remove'; }, 3000);
        return;
      }
      state.tasks = state.tasks.filter(y => y.id !== task.id);
      if (editing === task.id) stopEdit();
      save(); render();
    };
    li.append(c, w, x);
    return li;
  }

  function group(label, tasks, cls) {
    const g = document.createElement('div'); g.className = 'group' + (cls ? ' ' + cls : '');
    const h = document.createElement('span'); h.className = 'label'; h.textContent = `${label} · ${tasks.length}`;
    g.appendChild(h);
    tasks.forEach(t => g.appendChild(taskRow(t)));
    return g;
  }

  function render() {
    const t = today(), ws = weekStart();
    const open = state.tasks.filter(x => !x.done);
    const done = state.tasks.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const weekDone = done.filter(x => (x.doneAt || 0) >= ws).length;
    const late = open.filter(x => x.due && x.due < t).length;

    $('openBig').textContent = open.length;
    $('openSub').textContent = !state.tasks.length ? 'Add your first task below.'
      : !open.length ? 'All clear. Nothing left to do.'
      : [late ? `${late} overdue` : '', `${open.filter(x => x.due === t).length} due today`].filter(Boolean).join(' · ');
    $('sALabel').textContent = nameOf('a'); $('sBLabel').textContent = nameOf('b');
    $('sA').textContent = open.filter(x => x.who === 'a').length;
    $('sB').textContent = open.filter(x => x.who === 'b').length;
    $('sBoth').textContent = open.filter(x => x.who === 'both').length;
    $('sWeek').textContent = weekDone;
    $('fA').textContent = nameOf('a'); $('fB').textContent = nameOf('b');
    $('growCap').textContent = weekDone ? `${plural(weekDone, 'task')} done this week` : 'Every task you finish adds fruit to the tree';
    renderFruit(weekDone);

    // Open tasks, grouped by when they're due. A filter for one of us also shows the "either of us" tasks.
    const mine = open.filter(x => filter === 'all' || x.who === filter || x.who === 'both');
    const byDue = (a, b) => a.due.localeCompare(b.due) || a.createdAt - b.createdAt;
    const O = $('openList'); O.innerHTML = '';
    const groups = [
      ['Overdue', mine.filter(x => x.due && x.due < t).sort(byDue), 'late'],
      ['Today', mine.filter(x => x.due === t).sort(byDue)],
      ['Coming up', mine.filter(x => x.due > t).sort(byDue)],
      ['Anytime', mine.filter(x => !x.due).sort((a, b) => b.createdAt - a.createdAt)],
    ].filter(g => g[1].length);
    if (!groups.length) {
      O.innerHTML = `<div class="empty">${open.length ? `Nothing on ${filter === 'all' ? 'the list' : nameOf(filter) + '’s list'} right now.` : state.tasks.length ? 'Everything’s done. Nice work, you two.' : 'Nothing here yet. Add a task above and it shows up on both phones once you’re signed in.'}</div>`;
    } else groups.forEach(([label, list, cls]) => O.appendChild(group(label, list, cls)));

    const D = $('doneList'); D.innerHTML = '';
    if (!done.length) D.innerHTML = '<div class="empty">Finished tasks land here. Tap the circle again to bring one back.</div>';
    else {
      const g = document.createElement('div'); g.className = 'group';
      done.slice(0, DONE_SHOWN).forEach(x => g.appendChild(taskRow(x)));
      D.appendChild(g);
    }
    $('clearDone').hidden = !done.length;
    if ($('namePanel').hidden) { $('nA').value = state.names.a; $('nB').value = state.names.b; }
  }

  // ---------- The tree: one piece of fruit per task finished this week ----------
  const SPOTS = [[286, 52], [316, 46], [300, 26], [270, 76], [330, 74], [298, 76], [258, 88], [344, 88], [314, 62], [284, 30], [322, 28], [280, 96], [320, 96], [300, 52]];
  const KINDS = ['apple', 'cherries', 'blossom', 'lemon', 'daisy', 'plum'];
  const KIND_LABEL = { apple: 'An apple', cherries: 'Cherries', blossom: 'A blossom', lemon: 'A lemon', daisy: 'A daisy', plum: 'A plum' };
  const kindAt = i => KINDS[(i * 5 + 2) % KINDS.length];
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
  let shown = null; // fruit already drawn on this screen, so only new ones pop
  function renderFruit(n) {
    const count = Math.min(SPOTS.length, n);
    const fresh = shown !== null && count > shown;
    $('fruit').innerHTML = SPOTS.slice(0, count).map(([x, y], i) => bloomSVG(kindAt(i), x, y, fresh && i >= shown)).join('');
    if (fresh) toast(`${KIND_LABEL[kindAt(count - 1)]} grew on the tree.`);
    shown = count;
  }

  function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3500); }
  function flash(t) { $('msg').textContent = t; clearTimeout(flash.t); flash.t = setTimeout(() => { $('msg').textContent = ''; }, 3500); }

  // ---------- Adding, editing, checking off ----------
  function toggle(id) {
    const x = state.tasks.find(y => y.id === id); if (!x) return;
    x.done = !x.done; x.doneAt = x.done ? Date.now() : null;
    save(); render();
  }
  function startEdit(id) {
    const x = state.tasks.find(y => y.id === id); if (!x) return;
    editing = id;
    $('title').value = x.title; $('due').value = x.due || ''; $('note').value = x.note || '';
    selWho = x.who; selList = x.list; buildChips();
    $('formLabel').textContent = 'Edit task'; $('addBtn').textContent = 'Save changes'; $('cancelEdit').hidden = false;
    $('form').parentElement.classList.add('editing');
    $('form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('title').focus({ preventScroll: true });
  }
  function stopEdit() {
    editing = null;
    $('title').value = ''; $('due').value = ''; $('note').value = '';
    $('formLabel').textContent = 'New task'; $('addBtn').textContent = 'Add task'; $('cancelEdit').hidden = true;
    $('form').parentElement.classList.remove('editing');
  }
  $('cancelEdit').onclick = stopEdit;
  $('form').addEventListener('submit', ev => {
    ev.preventDefault();
    const title = $('title').value.trim();
    if (!title) { flash('Type what needs doing first.'); return; }
    const fields = { title, who: selWho, list: selList, due: $('due').value || '', note: $('note').value.trim() };
    const x = editing && state.tasks.find(y => y.id === editing);
    if (x) { Object.assign(x, fields); flash('Saved.'); stopEdit(); }
    else {
      state.tasks.push({ id: uid(), ...fields, done: false, doneAt: null, createdAt: Date.now() });
      $('title').value = ''; $('note').value = ''; $('due').value = '';
      flash(`Added for ${selWho === 'both' ? 'either of you' : nameOf(selWho)}.`);
      $('title').focus();
    }
    save(); render();
  });
  $('filter').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.f; [...$('filter').children].forEach(x => x.setAttribute('aria-pressed', x === b)); render();
  };
  $('clearDone').onclick = () => {
    const b = $('clearDone');
    if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = 'Tap again to clear'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Clear done'; }, 3000); return; }
    delete b.dataset.arm; b.textContent = 'Clear done';
    state.tasks = state.tasks.filter(x => !x.done); save(); render(); toast('Done tasks cleared.');
  };

  // ---------- Names ----------
  $('nameBtn').onclick = () => { $('namePanel').hidden = !$('namePanel').hidden; if (!$('namePanel').hidden) $('nA').focus(); };
  $('cancelNames').onclick = () => { $('namePanel').hidden = true; render(); };
  $('saveNames').onclick = () => {
    state.names = { a: $('nA').value.trim(), b: $('nB').value.trim() };
    $('namePanel').hidden = true; save(); buildChips(); render();
  };

  // ---------- Backup ----------
  $('bDown').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `our-todo-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('bUp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const s = JSON.parse(t); if (!s || !Array.isArray(s.tasks)) throw new Error('bad');
      localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); save(); buildChips(); render(); toast('Backup restored.');
    }).catch(() => toast('That file isn’t an Our To-Do List backup.'));
    e.target.value = '';
  };
  $('bErase').onclick = () => {
    if (!confirm('Erase every task? This can’t be undone (and erases it on both phones if you’re signed in).')) return;
    state = structuredClone(DEFAULT_STATE); stopEdit(); save(); buildChips(); render(); toast('All tasks erased.');
  };

  // Roll over to a new day (and a fresh tree on Monday) while the app stays open.
  let dayKey = today();
  setInterval(() => { if (today() !== dayKey) { dayKey = today(); shown = null; render(); } }, 60000);

  buildChips();
  save();
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update(); document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }); })
      .catch(() => { /* offline support is optional */ });
  }

  // ---------- Family sync ----------
  // Shares the list between our phones once someone signs in (see ../family-sync.js).
  if (window.FamilySync) FamilySync.attach(STORE_KEY, {
    label: 'Our To-Do List',
    get: () => state,
    apply: json => {
      localStorage.setItem(STORE_KEY, json); state = load();
      if (editing && !state.tasks.some(x => x.id === editing)) stopEdit();
      buildChips(); render();
    },
  });
})();

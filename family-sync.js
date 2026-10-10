/* Family sync: shares each app's saved data between our phones through Firebase (Google's app database).
 *
 * Every app still saves on the phone first, so it works offline exactly as before. When someone is signed in,
 * changes are also sent to the family database, and changes made on the other phone arrive within a second or two.
 * If both phones changed things while apart, the two versions are combined: each side keeps its own changes,
 * and if both changed the very same thing, the most recent save wins.
 *
 * An app joins by calling, once its state is loaded:
 *   FamilySync.attach(STORE_KEY, { get: () => state, apply: json => { ...replace state with JSON.parse(json), redraw... } })
 * and calling FamilySync.changed(STORE_KEY) whenever it saves.
 * Any element with a data-family-sync attribute (in a settings screen) shows the sync status and sign-in button.
 *
 * Who can read and write is decided by the Firestore security rules in the Firebase console (see FAMILY-SYNC.md),
 * not by anything in this file. The config below only says which Firebase project to talk to; it isn't a secret. */
(() => {
  'use strict';

  const CONFIG = {
    apiKey: 'AIzaSyAMMSUjDpkxf_VSNxMjXXlWO1LHQrAHaA0',
    authDomain: 'family-apps-c8217.firebaseapp.com',
    projectId: 'family-apps-c8217',
    storageBucket: 'family-apps-c8217.firebasestorage.app',
    messagingSenderId: '655197670724',
    appId: '1:655197670724:web:e74373d4bdc9b02d7d1b11',
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const ROOT = 'family/shared/apps';   // one document per app, named after its storage key
  const CHUNK = 300000;                // characters per database document (Firestore caps a document at 1 MB)
  const PUSH_DELAY = 800;              // wait for a burst of taps to finish before sending

  const flag = (k, v) => { try { if (v === undefined) return localStorage.getItem('family-sync:' + k); if (v === null) localStorage.removeItem('family-sync:' + k); else localStorage.setItem('family-sync:' + k, v); } catch (e) { return null; } };
  const nameOf = email => (email || '').split('@')[0].replace(/^./, c => c.toUpperCase());

  // ---------- The last version both phones agreed on, kept per app in IndexedDB ----------
  // It's what lets us tell "I changed this" apart from "the other phone changed this" when combining.
  const idb = new Promise(res => {
    try {
      const r = indexedDB.open('family-sync', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('base');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
  async function baseGet(key) {
    const db = await idb; if (!db) return null;
    return new Promise(res => { const q = db.transaction('base').objectStore('base').get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
  }
  async function baseSet(key, v) {
    const db = await idb; if (!db) return;
    return new Promise(res => { const t = db.transaction('base', 'readwrite'); t.objectStore('base').put(v, key); t.oncomplete = t.onerror = () => res(); });
  }

  // ---------- Combining two versions ----------
  // Three-way merge: whatever only one side changed takes that side; whatever both changed takes `prefer`.
  // Plain objects merge key by key. Lists of items with ids (postings, menu items, kids) merge item by item,
  // so two phones adding different items at the same time both keep theirs. Other lists are replaced whole.
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const idList = v => v === undefined || (Array.isArray(v) && v.every(x => isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number')));
  const byId = v => Object.fromEntries((v || []).map(x => [String(x.id), x]));
  function merge(base, mine, theirs, prefer) {
    if (same(mine, theirs)) return mine;
    if (same(base, mine)) return theirs;
    if (same(base, theirs)) return mine;
    if (Array.isArray(mine) && Array.isArray(theirs) && (mine.length || theirs.length) && [base, mine, theirs].every(idList)) {
      const m = merge(byId(base), byId(mine), byId(theirs), prefer);
      const order = [...mine, ...theirs].map(x => String(x.id)).filter((id, i, all) => all.indexOf(id) === i);
      return order.filter(id => id in m).map(id => m[id]);
    }
    if (isObj(mine) && isObj(theirs)) {
      const b = isObj(base) ? base : {};
      const out = {};
      new Set([...Object.keys(mine), ...Object.keys(theirs)]).forEach(k => {
        const v = merge(b[k], mine[k], theirs[k], prefer);
        if (v !== undefined) out[k] = v;
      });
      return out;
    }
    return prefer === 'mine' ? mine : theirs;
  }
  const mergeJson = (base, mine, theirs, prefer) => JSON.stringify(merge(JSON.parse(base || '{}'), JSON.parse(mine), JSON.parse(theirs), prefer));

  // ---------- Firebase ----------
  let fbp = null;
  function firebase() {
    if (!fbp) fbp = (async () => {
      const [app, auth, fs] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => import(SDK + f)));
      const a = app.initializeApp(CONFIG);
      return { au: auth, fs, auth: auth.getAuth(a), db: fs.getFirestore(a) };
    })().catch(e => { fbp = null; throw e; });
    return fbp;
  }

  const apps = {};      // key -> { get, apply, unsub, timer, pushing, pendingRev, choosing }
  let user = null;
  let status = 'idle';  // idle | out | synced | syncing | offline | error

  function setStatus(s) { status = s; drawWidgets(); }

  async function readRemote(fb, key, meta, tx) {
    const parts = [];
    for (let i = 0; i < (meta.n || 0); i++) {
      const ref = fb.fs.doc(fb.db, `${ROOT}/${key}/chunks/${i}`);
      const snap = tx ? await tx.get(ref) : await fb.fs.getDoc(ref);
      parts.push(snap.exists() ? snap.data().s : '');
    }
    return parts.join('');
  }

  function applyLocal(key, json) {
    const a = apps[key];
    if (json === JSON.stringify(a.get())) return;
    a.applying = true;
    try { a.apply(json); } finally { a.applying = false; }
  }

  // Something arrived from the database (including our own writes coming back).
  async function onRemote(key, snap) {
    const a = apps[key];
    if (!a || a.choosing || snap.metadata.hasPendingWrites) return;
    const fb = await firebase();
    const base = await baseGet(key);
    if (!snap.exists()) { flag('dirty:' + key, '1'); return schedulePush(key, 0); } // first phone to sync this app
    const meta = snap.data();
    if (meta.rev === a.pendingRev || (base && meta.rev === base.rev)) {
      if (flag('dirty:' + key)) schedulePush(key);
      return setStatus('synced');
    }
    setStatus('syncing');
    const remote = await readRemote(fb, key, meta);
    const local = JSON.stringify(a.get());
    if (!base) {
      // First time this phone syncs this app, and the family already has a copy.
      if (remote !== local && !(await chooseCopy(key, meta))) {
        flag('dirty:' + key, '1'); flag('force:' + key, '1');
        return schedulePush(key, 0);
      }
      applyLocal(key, remote);
    } else if (flag('dirty:' + key)) {
      applyLocal(key, mergeJson(base.json, local, remote, 'theirs'));
      schedulePush(key);
    } else {
      applyLocal(key, remote);
      if (meta.by && meta.by !== (user && user.email)) toast(`Updated from ${nameOf(meta.by)}’s phone`);
    }
    await baseSet(key, { json: remote, rev: meta.rev });
    setStatus('synced');
  }

  function schedulePush(key, delay = PUSH_DELAY) {
    const a = apps[key]; if (!a) return;
    clearTimeout(a.timer);
    a.timer = setTimeout(() => push(key), delay);
  }

  // Send this phone's version. Runs as a transaction so two phones saving at once can't wipe each other out:
  // if the database moved on since we last looked, the versions are combined first.
  async function push(key) {
    const a = apps[key];
    if (!a || !user || a.choosing) return;
    if (a.pushing) return schedulePush(key);
    a.pushing = true;
    setStatus('syncing');
    try {
      const fb = await firebase();
      const base = await baseGet(key);
      const force = !!flag('force:' + key);
      const rev = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      a.pendingRev = rev;
      const metaRef = fb.fs.doc(fb.db, `${ROOT}/${key}`);
      const json = await fb.fs.runTransaction(fb.db, async tx => {
        const snap = await tx.get(metaRef);
        let out = JSON.stringify(a.get());
        if (snap.exists() && !force && !base) return undefined; // the shared copy hasn't been looked at yet: onRemote asks first
        if (snap.exists() && !force && snap.data().rev !== base.rev) {
          out = mergeJson(base.json, out, await readRemote(fb, key, snap.data(), tx), 'mine');
        } else if (snap.exists() && !force && out === base.json) {
          return null; // nothing new to send
        }
        const n = Math.max(1, Math.ceil(out.length / CHUNK));
        for (let i = 0; i < n; i++) tx.set(fb.fs.doc(fb.db, `${ROOT}/${key}/chunks/${i}`), { s: out.slice(i * CHUNK, (i + 1) * CHUNK) });
        tx.set(metaRef, { rev, n, by: user.email, at: fb.fs.serverTimestamp() });
        return out;
      });
      if (json === undefined) return setStatus('syncing');
      flag('dirty:' + key, null); flag('force:' + key, null);
      if (json !== null) {
        await baseSet(key, { json, rev });
        applyLocal(key, json);
      }
      setStatus('synced');
    } catch (e) {
      console.warn('Family sync: will try again', e);
      setStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      a.pushing = false;
    }
  }

  async function startApp(key) {
    const a = apps[key];
    if (!a || a.unsub || !user) return;
    const fb = await firebase();
    a.unsub = fb.fs.onSnapshot(fb.fs.doc(fb.db, `${ROOT}/${key}`),
      snap => onRemote(key, snap).catch(e => { console.warn('Family sync', e); setStatus('error'); }),
      e => { console.warn('Family sync', e); a.unsub = null; setStatus(e && e.code === 'permission-denied' ? 'denied' : 'error'); });
  }
  function stopApps() { Object.values(apps).forEach(a => { if (a.unsub) a.unsub(); a.unsub = null; }); }

  async function boot() {
    try {
      const fb = await firebase();
      fb.au.onAuthStateChanged(fb.auth, u => {
        user = u;
        if (u) { setStatus('syncing'); Object.keys(apps).forEach(startApp); }
        else { stopApps(); setStatus('out'); maybeAsk(); }
      });
    } catch (e) {
      setStatus('offline'); // no network on first load: try again when it comes back
    }
  }
  const retry = () => {
    if (!fbp) return boot();
    Object.keys(apps).forEach(k => { if (!apps[k].unsub) startApp(k); if (flag('dirty:' + k)) schedulePush(k, 0); });
  };
  addEventListener('online', retry);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') retry(); });

  // ---------- UI: sign-in sheet, choice dialog, status line, toast ----------
  const css = `
  .fs-back{position:fixed;inset:0;z-index:9999;background:rgba(10,10,14,.6);display:flex;align-items:flex-end;justify-content:center;font:16px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif}
  @media(min-width:600px){.fs-back{align-items:center}}
  .fs-card{width:100%;max-width:440px;background:#fff;color:#1d1d22;border-radius:18px 18px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(0,0,0,.25)}
  @media(min-width:600px){.fs-card{border-radius:18px}}
  .fs-card h3{margin:0 0 6px;font-size:20px}.fs-card p{margin:0 0 12px;color:#55555f;font-size:15px}
  .fs-card input{width:100%;box-sizing:border-box;margin:6px 0;padding:12px;border:1px solid #c9c9d2;border-radius:10px;font-size:16px;background:#fff;color:#1d1d22}
  .fs-row{display:flex;gap:10px;margin-top:12px}.fs-row button{flex:1}
  .fs-btn{border:0;border-radius:12px;padding:12px 14px;font:600 15px system-ui,-apple-system,sans-serif;background:#2f6fde;color:#fff;cursor:pointer}
  .fs-btn.fs-ghost{background:#eceef3;color:#1d1d22}
  .fs-err{color:#c2332b;font-size:14px;min-height:1em;margin-top:4px}
  .fs-toast{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:9999;background:#1d1d22;color:#fff;padding:8px 14px;border-radius:999px;font:600 14px system-ui,-apple-system,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);transition:opacity .3s}
  .fs-widget{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px}
  .fs-widget .fs-dot{width:9px;height:9px;border-radius:50%;background:#9aa0aa;flex:none}
  .fs-widget .fs-dot.ok{background:#2fa84f}.fs-widget .fs-dot.warn{background:#e0a020}.fs-widget .fs-dot.bad{background:#d23b30}
  .fs-widget .fs-btn{padding:7px 12px;font-size:13px}`;
  const style = document.createElement('style'); style.textContent = css;
  document.head.appendChild(style);

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function sheet(html) {
    const back = document.createElement('div');
    back.className = 'fs-back';
    back.innerHTML = `<div class="fs-card" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(back);
    return back;
  }

  function openSignIn() {
    if (document.querySelector('.fs-back')) return;
    const b = sheet(`
      <h3>Share with the family</h3>
      <p>Sign in to keep this app in sync between your phones. Everything still works without signing in, it just stays on this phone.</p>
      <form>
        <input type="email" name="email" autocomplete="username" placeholder="Email" required />
        <input type="password" name="pw" autocomplete="current-password" placeholder="Password" required />
        <div class="fs-err"></div>
        <div class="fs-row"><button type="button" class="fs-btn fs-ghost" data-no>Not now</button><button class="fs-btn" type="submit">Sign in</button></div>
      </form>`);
    const form = b.querySelector('form'), err = b.querySelector('.fs-err');
    b.querySelector('[data-no]').onclick = () => { flag('asked', '1'); b.remove(); };
    form.onsubmit = async e => {
      e.preventDefault();
      err.textContent = 'Signing in…';
      try {
        const fb = await firebase();
        await fb.au.setPersistence(fb.auth, fb.au.browserLocalPersistence);
        await fb.au.signInWithEmailAndPassword(fb.auth, form.email.value.trim(), form.pw.value);
        flag('asked', '1'); b.remove(); toast('Signed in. Syncing…');
      } catch (x) {
        const c = x && x.code || '';
        err.textContent = /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? 'That email and password don’t match.'
          : /network/.test(c) || !navigator.onLine ? 'No connection. Try again when you’re online.'
          : /too-many/.test(c) ? 'Too many tries. Wait a minute and try again.' : 'Couldn’t sign in. Try again.';
      }
    };
  }

  // Asked once per phone per app: is the shared copy or this phone's copy the one to keep?
  function chooseCopy(key, meta) {
    const a = apps[key];
    a.choosing = true;
    return new Promise(res => {
      const when = meta.at && meta.at.toDate ? meta.at.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
      const b = sheet(`
        <h3>${esc(a.label || 'This app')} has a shared copy</h3>
        <p>The family copy was last saved${meta.by ? ` by ${esc(nameOf(meta.by))}` : ''}${when ? ` on ${esc(when)}` : ''}. This phone has its own data too. Which one should both phones use from now on?</p>
        <div class="fs-row" style="flex-direction:column">
          <button class="fs-btn" data-v="shared">Use the shared copy</button>
          <button class="fs-btn fs-ghost" data-v="mine">Use this phone’s copy (replaces the shared one)</button>
        </div>`);
      b.querySelectorAll('[data-v]').forEach(btn => btn.onclick = () => { b.remove(); a.choosing = false; res(btn.dataset.v === 'shared'); });
    });
  }

  function maybeAsk() {
    if (!Object.keys(apps).length || flag('asked') || user) return;
    setTimeout(() => { if (!user && !flag('asked')) openSignIn(); }, 1200);
  }

  let toastT;
  function toast(msg) {
    let t = document.querySelector('.fs-toast');
    if (!t) { t = document.createElement('div'); t.className = 'fs-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = '0'; }, 2600);
  }

  const STATUS = {
    idle: ['', 'Family sync: starting…'], syncing: ['warn', 'Syncing…'], synced: ['ok', 'Synced'],
    offline: ['warn', 'Offline. Changes will sync when you’re back online.'], error: ['bad', 'Couldn’t sync just now. Will keep trying.'],
    denied: ['bad', 'This account isn’t allowed in the family database.'], out: ['', 'Not signed in. Data stays on this phone.'],
  };
  function drawWidgets() {
    document.querySelectorAll('[data-family-sync]').forEach(el => {
      const [cls, text] = STATUS[status] || STATUS.idle;
      el.innerHTML = `<div class="fs-widget"><span class="fs-dot ${cls}"></span><span>${esc(text)}${user && status !== 'out' ? ` · ${esc(user.email)}` : ''}</span>
        ${user ? '<button type="button" class="fs-btn fs-ghost" data-fs-out>Sign out</button>' : '<button type="button" class="fs-btn" data-fs-in>Sign in to share</button>'}</div>`;
      const i = el.querySelector('[data-fs-in]'); if (i) i.onclick = openSignIn;
      const o = el.querySelector('[data-fs-out]'); if (o) o.onclick = async () => { const fb = await firebase(); await fb.au.signOut(fb.auth); toast('Signed out. Data stays on this phone.'); };
      el.dataset.familySyncDrawn = status + (user ? user.email : '');
    });
  }
  // Settings screens are drawn and redrawn by each app, so fill in any new placeholder as it appears.
  new MutationObserver(() => {
    const want = status + (user ? user.email : '');
    if ([...document.querySelectorAll('[data-family-sync]')].some(el => el.dataset.familySyncDrawn !== want)) drawWidgets();
  }).observe(document.documentElement, { childList: true, subtree: true });

  // ---------- What the apps call ----------
  window.FamilySync = {
    attach(key, opts) {
      apps[key] = { ...opts, unsub: null, timer: null, pushing: false, pendingRev: null, choosing: false, applying: false };
      if (!fbp) boot();
      else if (user) startApp(key);
      else maybeAsk();
    },
    changed(key) {
      const a = apps[key];
      if (!a || a.applying) return;
      flag('dirty:' + key, '1');
      if (user) schedulePush(key);
    },
    signIn: openSignIn,
  };
})();

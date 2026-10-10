/* Build-a-Plate: kids build tomorrow's breakfast plate the night before.
   Plain JS, no build step. Everything is saved in this phone's localStorage. */
(() => {
  'use strict';

  // ---------- Settings you might want to change ----------
  const STORE_KEY = 'build-a-plate-v1';
  const KEEP_DAYS = 30; // old orders are tidied away after this many days

  // The three parts of a plate. Grown-ups set how many of each fit on a plate.
  const CATS = [
    { id: 'main', label: 'Main', one: 'main dish', many: 'main dishes', icon: '🥞' },
    { id: 'side', label: 'Sides', one: 'side', many: 'sides', icon: '🍓' },
    { id: 'drink', label: 'Drinks', one: 'drink', many: 'drinks', icon: '🥛' },
  ];
  const LIMIT_RANGE = { main: [1, 2], side: [0, 4], drink: [0, 2] };

  // Each child picks a theme: it sets the colours, background, buddy, sounds and confetti.
  const THEMES = {
    mario: {
      label: 'Mario-style', buddy: '🍄', coin: '🪙', swatch: '#e52521', add: 'coin', done: 'powerup',
      bits: ['🪙', '⭐', '🍄', '🪙', '✨', '🪙'],
      cheers: ['Wahoo!', "Let's-a go!", 'Super!', 'Yahoo!', 'Power up!'],
      deco: `<div class="m-cloud mc1"></div><div class="m-cloud mc2"></div><span class="m-coin">🪙</span>`,
      ground: `<div class="m-blocks"><i class="brick"></i><i class="qb">?</i><i class="brick"></i><i class="qb">?</i></div>
        <div class="m-hill mh1"></div><div class="m-hill mh2"></div><div class="m-pipe"></div>`,
    },
    farm: {
      label: 'Farm', buddy: '🐴', coin: '🥕', swatch: '#f4a261', add: 'clop', done: 'neigh',
      bits: ['⭐', '🐴', '🌻', '🥕', '🍎', '✨'],
      cheers: ['Yee-haw!', 'Giddy-up!', 'Yummy!', 'Great job, cowboy!'],
      deco: `<span class="cloud c1">☁️</span><span class="cloud c2">☁️</span>`,
      ground: `<div class="hill h1"></div><div class="hill h2"></div><div class="fence"></div>
        <span class="pal p1">🌻</span><span class="pal p2">☀️</span><span class="pal p3">🐎</span>`,
    },
    space: {
      label: 'Space', buddy: '🚀', coin: '⭐', swatch: '#5a4fcf', add: 'zap', done: 'fanfare',
      bits: ['⭐', '🌟', '🪐', '🚀', '✨', '🌙'],
      cheers: ['Blast off!', 'Out of this world!', 'Stellar!'],
      deco: `<span class="pal sp1">🪐</span><span class="pal sp2">🌙</span><span class="pal sp3">🛸</span>`,
    },
    unicorn: {
      label: 'Unicorn', buddy: '🦄', coin: '💖', swatch: '#e06cbf', add: 'chime', done: 'fanfare',
      bits: ['🌈', '🦄', '💖', '✨', '⭐', '🌸'],
      cheers: ['Magical!', 'Sparkly!', 'Hooray!'],
      deco: `<span class="pal un1">🌈</span><span class="cloud c1">☁️</span><span class="cloud c2">☁️</span><span class="pal un2">🌸</span>`,
    },
    ocean: {
      label: 'Ocean', buddy: '🐬', coin: '🐚', swatch: '#1e90c8', add: 'bubble', done: 'fanfare',
      bits: ['🐠', '🐳', '🫧', '⭐', '🐚', '🐙'],
      cheers: ['Splash!', 'Fin-tastic!', 'Awesome!'],
      deco: `<span class="pal oc1">🫧</span><span class="pal oc2">🐠</span><span class="pal oc3">🐙</span><span class="pal oc4">🫧</span>`,
    },
    dino: {
      label: 'Dinosaurs', buddy: '🦖', coin: '🦴', swatch: '#3fa34d', add: 'chime', done: 'fanfare',
      bits: ['🦕', '🦖', '🌿', '⭐', '🦴', '🥚'],
      cheers: ['Roar!', 'Dino-mite!', 'Stomp stomp!'],
      deco: `<span class="pal dn1">🌋</span><span class="pal dn2">🌴</span><span class="pal dn3">🦕</span>`,
    },
  };
  const HOME_DECO = `<span class="pal sun">☀️</span><span class="cloud c1">☁️</span><span class="cloud c2">☁️</span>`;

  // Drawn pictures for foods that have no emoji (in the art/ folder).
  const ART = {
    'salmon-bagel': { label: 'Bagel with smoked salmon', src: 'art/salmon-bagel.svg' },
    'banana-bread': { label: 'Banana bread', src: 'art/banana-bread.svg' },
  };
  const AVATARS = ['🍄', '🐴', '⭐', '🦄', '🚀', '🦖', '🐬', '🐶', '🐱', '🐰', '🦊', '🐼', '🐸', '🐯', '🦁', '🐵',
    '🐧', '🦋', '🐢', '🐙', '🤖', '👑', '⚽', '🏎️', '🚒', '🚜', '🧸', '🌈', '🐉', '🦈'];
  const FOOD_EMOJIS = ['🥞', '🧇', '🥣', '🍳', '🥚', '🍞', '🥯', '🥐', '🧁', '🍩', '🥪', '🌯', '🌮', '🍕', '🥓', '🌭',
    '🧀', '🍌', '🍓', '🍎', '🍏', '🍐', '🍊', '🍋', '🍇', '🫐', '🍉', '🍑', '🍒', '🥝', '🍍', '🥭', '🥑', '🍅',
    '🥒', '🥕', '🥜', '🍯', '🧈', '🍨', '🍦', '🍪', '🍫', '🥛', '🧃', '🥤', '🧋', '💧', '☕', '🍵', '🥗', '🍚',
    '🍙', '🥟', '🍝', '🍠', '🥔', '🍽️'];

  // ---------- Small helpers ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const todayKey = () => keyOf(today());
  const tomorrowKey = () => keyOf(addDays(today(), 1));
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = k => DAY_NAMES[fromKey(k).getDay()];
  const shortDate = k => { const d = fromKey(k); return `${DAY_NAMES[d.getDay()].slice(0, 3)} ${MONTHS[d.getMonth()]} ${d.getDate()}`; };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four'];

  // ---------- Saved data ----------
  const item = (name, emoji, cat, art) => ({ id: uid(), name, emoji, cat, on: true, ...(art ? { art } : {}) });
  const salmonBagel = () => item('Salmon bagel', '🥯', 'main', 'salmon-bagel');
  const bananaBread = () => item('Banana bread', '🍞', 'main', 'banana-bread');
  // kid.skip: foods that child can't have (allergies). They never see them.
  const DEFAULT_STATE = () => withEggAllergy({
    v: 4,
    kids: [
      { id: 'lucas', name: 'Lucas', avatar: '🐴', theme: 'farm', skip: [] },
      { id: 'julien', name: 'Julien', avatar: '🍄', theme: 'mario', skip: [] },
    ],
    menu: [
      item('Pancakes', '🥞', 'main'), item('Waffles', '🧇', 'main'), item('Cereal', '🥣', 'main'),
      item('Eggs', '🍳', 'main'), item('Toast', '🍞', 'main'), item('Bagel', '🥯', 'main'), salmonBagel(), bananaBread(),
      item('Banana', '🍌', 'side'), item('Strawberries', '🍓', 'side'), item('Apple', '🍎', 'side'),
      item('Blueberries', '🫐', 'side'), item('Grapes', '🍇', 'side'), item('Bacon', '🥓', 'side'),
      item('Cheese', '🧀', 'side'), item('Yogurt', '🍨', 'side'),
      item('Milk', '🥛', 'drink'), item('Apple juice', '🧃', 'drink'), item('Smoothie', '🥤', 'drink'),
      item('Water', '💧', 'drink'), item('Chocolate milk', '🍫', 'drink'),
    ],
    limits: { main: 1, side: 2, drink: 1 },
    orders: {}, // { 'YYYY-MM-DD': { kidId: { main: [ids], side: [ids], drink: [ids], sent: bool, at: time } } }
    sound: true,
    voice: true,
  });
  // Lucas is allergic to eggs: hide every egg item from him.
  // Bring data saved by an older version of the app up to date.
  function migrate(st, v) {
    if (!(v >= 2)) withEggAllergy(st); // before allergies existed
    if (!(v >= 3) && !st.menu.some(m => m.art === 'salmon-bagel')) {
      const at = st.menu.findIndex(m => /bagel/i.test(m.name));
      st.menu.splice(at >= 0 ? at + 1 : st.menu.length, 0, salmonBagel()); // the salmon bagel picture arrived
    }
    if (!(v >= 4) && !st.menu.some(m => m.art === 'banana-bread')) {
      const at = st.menu.map(m => m.cat).lastIndexOf('main');
      st.menu.splice(at + 1, 0, bananaBread()); // the banana bread picture arrived
    }
    st.v = 4;
  }
  function withEggAllergy(st) {
    const lucas = st.kids.find(k => k.id === 'lucas');
    if (lucas) {
      const eggs = st.menu.filter(m => /\begg/i.test(m.name) || m.emoji === '🍳' || m.emoji === '🥚').map(m => m.id);
      lucas.skip = [...new Set([...(lucas.skip || []), ...eggs])];
    }
    return st;
  }

  let state = load();
  function load() {
    const base = DEFAULT_STATE();
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY));
      if (raw && Array.isArray(raw.kids) && Array.isArray(raw.menu)) {
        const st = { ...base, ...raw, limits: { ...base.limits, ...(raw.limits || {}) }, orders: raw.orders || {} };
        migrate(st, raw.v);
        return st;
      }
    } catch (e) { /* start fresh */ }
    return base;
  }
  function save() {
    const oldest = keyOf(addDays(today(), -KEEP_DAYS));
    Object.keys(state.orders).forEach(k => { if (k < oldest) delete state.orders[k]; });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('The phone is out of space for saving. Try using fewer photos.'); }
  }

  const itemById = id => state.menu.find(m => m.id === id);
  const kidById = id => state.kids.find(k => k.id === id);
  const themeOf = kid => THEMES[kid && kid.theme] || THEMES.farm;
  const canHave = (kid, it) => !(kid && kid.skip && kid.skip.includes(it.id));
  const activeCats = () => CATS.filter(c => state.limits[c.id] > 0);
  function orderFor(kidId, day = tomorrowKey(), create = false) {
    const dayOrders = state.orders[day] || (create ? (state.orders[day] = {}) : null);
    if (!dayOrders) return null;
    if (!dayOrders[kidId] && create) dayOrders[kidId] = { main: [], side: [], drink: [], sent: false, at: 0 };
    return dayOrders[kidId] || null;
  }
  const orderItems = o => o ? CATS.flatMap(c => (o[c.id] || []).map(itemById).filter(Boolean)) : [];
  const pic = (it, cls = '') => it.photo
    ? `<img class="pic ${cls}" src="${it.photo}" alt="" draggable="false" />`
    : it.art && ART[it.art] ? `<img class="pic art ${cls}" src="${ART[it.art].src}" alt="" draggable="false" />`
    : `<span class="pic ${cls}">${it.emoji || '🍽️'}</span>`;

  // ---------- Sound ----------
  let audioCtx = null;
  const getCtx = () => (audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)());
  // Phones only allow sound after a tap; wake the audio up on the first touch.
  document.addEventListener('pointerdown', () => { try { const c = getCtx(); if (c.state === 'suspended') c.resume(); } catch (e) { /* no audio */ } }, true);
  function tone(freq, start, dur, type = 'sine', vol = 0.16, endFreq) {
    if (!state.sound) return;
    try {
      getCtx();
      const t0 = audioCtx.currentTime + start;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* no audio */ }
  }
  function neigh() {
    if (!state.sound) return;
    try {
      getCtx();
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
  const SOUNDS = {
    tap: () => tone(660, 0, 0.08, 'triangle', 0.12),
    pop: () => tone(520, 0, 0.12, 'sine', 0.2, 180),
    nope: () => { tone(240, 0, 0.14, 'square', 0.06); tone(180, 0.15, 0.2, 'square', 0.06); },
    coin: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1319, 0.08, 0.38, 'square', 0.07); },
    bump: () => tone(160, 0, 0.12, 'square', 0.1, 90),
    powerup: () => [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.07, 0.12, 'square', 0.06)),
    clop: () => [0, 0.14].forEach((t, i) => tone(i ? 620 : 880, t, 0.06, 'triangle', 0.22)),
    neigh: () => { neigh(); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.9 + i * 0.12, 0.25, 'triangle', 0.14)); },
    zap: () => tone(300, 0, 0.25, 'sine', 0.15, 1400),
    chime: () => { tone(1047, 0, 0.3, 'sine', 0.12); tone(1568, 0.08, 0.4, 'sine', 0.1); },
    bubble: () => { tone(400, 0, 0.12, 'sine', 0.15, 900); tone(500, 0.1, 0.12, 'sine', 0.12, 1100); },
    fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.13, i === 5 ? 0.6 : 0.2, 'triangle', 0.14)),
  };
  const sfx = name => (SOUNDS[name] || SOUNDS.tap)();
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  // ---------- Talking buddy ----------
  // Rank the phone's English voices so the natural-sounding ones win over robotic or novelty voices.
  const NOVELTY_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|hysterical|deranged/i;
  function voiceScore(v) {
    let n = 0;
    if (/premium/i.test(v.name)) n += 40;
    if (/enhanced|neural|natural|wavenet|studio/i.test(v.name)) n += 30;
    if (/siri/i.test(v.name)) n += 25;
    if (/google/i.test(v.name)) n += 20;
    if (/samantha|ava|allison|zoe|evan|nicky|aria|jenny|susan|karen|serena|moira|tessa|daniel/i.test(v.name)) n += 10;
    if (/^en[-_]US/i.test(v.lang)) n += 6;
    else if (/^en[-_](GB|AU|CA|IE|NZ)/i.test(v.lang)) n += 3;
    if (NOVELTY_VOICES.test(v.name)) n -= 100;
    return n;
  }
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    return speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
  }
  if ('speechSynthesis' in window) speechSynthesis.getVoices(); // starts loading the list on some phones
  // The buddy talks in "parts": { slot, text }. If a grown-up recorded their own voice for a slot,
  // that recording plays; otherwise the phone reads the text. Parts play one after another.
  let speechQueue = [], speechBusy = false, speechToken = 0, lastParts = [];
  function speak(parts, queue) {
    if (typeof parts === 'string') parts = [{ text: parts }];
    parts = parts.filter(Boolean);
    if (!queue) { stopSpeaking(); lastParts = parts; } else lastParts = lastParts.concat(parts);
    if (!state.voice) return;
    speechQueue.push(...parts);
    if (!speechBusy) speakNext(speechToken);
  }
  function stopSpeaking() {
    speechQueue = []; speechBusy = false; speechToken++;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* no voice */ }
    stopClip();
  }
  function speakNext(token) {
    if (token !== speechToken) return;
    const part = speechQueue.shift();
    if (!part) { speechBusy = false; return; }
    speechBusy = true;
    let finished = false;
    const done = () => { if (!finished) { finished = true; setTimeout(() => speakNext(token), 120); } };
    if (part.slot && playClip(part.slot, done)) return;
    if (!part.text || !('speechSynthesis' in window)) { done(); return; }
    try {
      const u = new SpeechSynthesisUtterance(part.text.replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ''));
      const v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = 0.95; u.pitch = 1.05;
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
      setTimeout(done, 1500 + part.text.length * 90); // some phones never fire onend
    } catch (e) { done(); }
  }

  // ---------- Grown-up's own voice ----------
  // Recordings live in IndexedDB on this phone (too big for localStorage). Slots:
  //   a buddy line below, 'kid:<id>' (hello for that child) or 'item:<id>' (a food's name).
  const VOICE_LINES = [
    { id: 'pick-main', label: 'Pick a main dish', script: () => promptFor('main') },
    { id: 'pick-side', label: 'Pick sides', script: () => promptFor('side') },
    { id: 'pick-drink', label: 'Pick a drink', script: () => promptFor('drink') },
    { id: 'yum', label: 'After picking a food (plays after its name)', script: () => 'Yummy!' },
    { id: 'already', label: 'Picking a food that is already on the plate', script: () => "That's already on your plate!" },
    { id: 'bye', label: 'Taking a food off the plate (plays before its name)', script: () => 'Bye-bye!' },
    { id: 'notToday', label: 'Tapping a food that is “Not today”', script: () => "Sorry, that's all gone. Pick something else!" },
    { id: 'gone', label: 'Something they ordered ran out', script: () => 'Oh no! Something you picked is all gone. Pick something else!' },
    { id: 'ready', label: 'Plate is full', script: () => "Your plate is ready! Tap I'm done!" },
    { id: 'mainFirst', label: 'Tapped I’m done without a main dish', script: () => 'Pick your main dish first!' },
    { id: 'forgot-side', label: 'Forgot sides', script: () => "Don't forget your sides! Or tap I'm done again." },
    { id: 'forgot-drink', label: 'Forgot a drink', script: () => "Don't forget a drink! Or tap I'm done again." },
    { id: 'change', label: 'Opening a plate that was already ordered', script: () => 'Want to change your breakfast?' },
    { id: 'sent', label: 'Order sent! (the food names play after it)', script: () => 'Hooray! Your breakfast is ordered!' },
  ];
  const clips = {}; // slot -> { buffer, start, end, gain }
  let clipPlaying = null;
  function idb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
      const r = indexedDB.open('build-a-plate-voice', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('clips');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function idbDo(mode, fn) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('clips', mode), req = fn(tx.objectStore('clips'));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }
  const clipSave = (id, blob) => idbDo('readwrite', st => st.put(blob, id));
  const clipDelete = id => { delete clips[id]; return idbDo('readwrite', st => st.delete(id)).catch(() => { /* already gone */ }); };
  const clipClearAll = () => { Object.keys(clips).forEach(k => delete clips[k]); return idbDo('readwrite', st => st.clear()).catch(() => { /* none */ }); };
  // Decode a recording and find where the talking starts and stops, so taps before/after don't add silence.
  async function loadClip(id, blob) {
    const buf = await new Promise((resolve, reject) => {
      blob.arrayBuffer().then(ab => {
        const p = getCtx().decodeAudioData(ab, resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      }, reject);
    });
    const data = buf.getChannelData(0), rate = buf.sampleRate;
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    const th = Math.max(0.01, peak * 0.08);
    let a = 0, b = data.length - 1;
    while (a < b && Math.abs(data[a]) < th) a++;
    while (b > a && Math.abs(data[b]) < th) b--;
    clips[id] = { buffer: buf, start: Math.max(0, a / rate - 0.12), end: Math.min(buf.duration, b / rate + 0.25), gain: peak > 0 ? Math.min(4, 0.9 / peak) : 1 };
  }
  async function loadAllClips() {
    try {
      const keys = await idbDo('readonly', st => st.getAllKeys());
      for (const id of keys || []) {
        const blob = await idbDo('readonly', st => st.get(id));
        if (blob) await loadClip(id, blob).catch(() => { /* unreadable clip; the phone's voice is used */ });
      }
    } catch (e) { /* no IndexedDB; the phone's voice only */ }
  }
  function stopClip() {
    if (clipPlaying) { try { clipPlaying.onended = null; clipPlaying.stop(); } catch (e) { /* already stopped */ } }
    clipPlaying = null;
  }
  function playClip(id, onEnd) {
    const c = clips[id];
    if (!c) return false;
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      stopClip();
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = c.buffer; g.gain.value = c.gain;
      src.connect(g).connect(ctx.destination);
      src.onended = () => { if (clipPlaying === src) clipPlaying = null; if (onEnd) onEnd(); };
      src.start(0, c.start, Math.max(0.1, c.end - c.start));
      clipPlaying = src;
      return true;
    } catch (e) { return false; }
  }
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  async function recordSlot(slotId, label, script) {
    stopSpeaking();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      toast("The microphone is blocked. Allow microphone access for this app in the phone's Settings, then try again.");
      return;
    }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    let secs = 10, timer = null, cancelled = false;
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      clearInterval(timer);
      stream.getTracks().forEach(t => t.stop());
      if (cancelled || !chunks.length) return;
      const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' });
      try {
        await loadClip(slotId, blob);
        await clipSave(slotId, blob);
        closeModal();
        render();
        setTimeout(() => playClip(slotId), 150);
      } catch (e) {
        toast('That recording could not be saved. Please try again.');
      }
    };
    openModal(`
      <div class="rec-dot"></div>
      <h2>Recording…</h2>
      <p class="hint">${esc(label)}. Say something like:</p>
      <p class="rec-script">“${esc(script)}”</p>
      <p class="hint" id="recLeft">Stops by itself in 10 seconds</p>
      <button class="big-btn red" id="recStop">■ Done</button>
      <button class="link-btn" id="recCancel">Cancel</button>`, () => { if (mr.state !== 'inactive') { cancelled = true; mr.stop(); } });
    $('recStop').onclick = () => { if (mr.state !== 'inactive') mr.stop(); };
    $('recCancel').onclick = () => closeModal();
    mr.start();
    timer = setInterval(() => {
      secs--;
      const el = $('recLeft');
      if (el) el.textContent = `Stops by itself in ${secs} second${secs === 1 ? '' : 's'}`;
      if (secs <= 0 && mr.state !== 'inactive') mr.stop();
    }, 1000);
  }

  // ---------- Confetti ----------
  function confetti(n, bits) {
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

  // ---------- Modal ----------
  const modal = $('modal'), modalCard = $('modalCard');
  let onModalClose = null;
  function openModal(html, onClose) {
    modalCard.innerHTML = html;
    modal.classList.remove('hidden');
    modalCard.scrollTop = 0;
    onModalClose = onClose || null;
  }
  function closeModal() {
    modal.classList.add('hidden');
    modalCard.innerHTML = '';
    const cb = onModalClose; onModalClose = null;
    if (cb) cb();
  }
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-act="close"]')) closeModal();
  });
  function toast(msg) {
    openModal(`<p style="font-size:20px">${esc(msg)}</p><button class="big-btn" data-act="close">OK</button>`);
  }
  function confirmBox(title, text, okLabel, onOk) {
    openModal(`<h2>${title}</h2>${text ? `<p>${text}</p>` : ''}
      <button class="big-btn red" data-act="ok">${okLabel}</button>
      <button class="link-btn" data-act="close">Cancel</button>`);
    modalCard.querySelector('[data-act="ok"]').onclick = () => { closeModal(); onOk(); };
  }

  // Grown-up check: a multiplication question (Julien is 7, so addition is too easy).
  let grownupUnlocked = false;
  function askGrownup(onPass) {
    if (grownupUnlocked) { onPass(); return; }
    const a = 12 + Math.floor(Math.random() * 38), b = 3 + Math.floor(Math.random() * 7);
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
    const input = $('gateInput');
    setTimeout(() => input.focus(), 50);
    const check = () => {
      if (Number(input.value) === a * b) { grownupUnlocked = true; closeModal(); onPass(); }
      else { input.value = ''; input.classList.add('bad'); sfx('nope'); buzz(120); }
    };
    modalCard.querySelector('[data-act="gate-ok"]').onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }

  // ---------- Views ----------
  // view.name: 'home' | 'plate' (view.kidId, view.cat) | 'grown' (view.day)
  let view = { name: 'home' };
  const app = $('app');
  let bgTheme = null;
  function setTheme(name) {
    document.body.className = `theme-${name}`;
    if (bgTheme !== name) {
      $('bg').innerHTML = name === 'home' || name === 'grown' ? HOME_DECO : (THEMES[name] || THEMES.farm).deco;
      bgTheme = name;
    }
  }
  function render() {
    if (view.name === 'plate' && !kidById(view.kidId)) view = { name: 'home' };
    if (view.name === 'home') renderHome();
    else if (view.name === 'plate') renderPlate();
    else renderGrownups();
  }
  function go(v) { view = v; window.scrollTo(0, 0); render(); }

  // ---------- Home: who's ordering? ----------
  function renderHome() {
    setTheme('home');
    const day = tomorrowKey();
    const cards = state.kids.map(k => {
      const o = orderFor(k.id, day);
      const items = orderItems(o);
      const status = o && o.sent ? `Ordered ✓ <span class="kc-pics">${items.map(i => pic(i, 'mini')).join('')}</span>`
        : items.length ? 'Still building… tap me!' : 'Tap to order!';
      return `<button class="kid-card ${o && o.sent ? 'done' : ''}" data-kid="${k.id}" style="--kc:${themeOf(k).swatch}">
        <span class="kc-av">${k.avatar}</span>
        <span class="kc-txt"><span class="kc-name">${esc(k.name)}</span><span class="kc-status">${status}</span></span>
      </button>`;
    }).join('');
    app.innerHTML = `
      <div class="home">
        <header class="home-head">
          <div class="logo">🍽️</div>
          <h1>Build-a-Plate</h1>
          <div class="home-sub">Breakfast for <b>${dayName(day)}</b></div>
        </header>
        <h2 class="who">Who's ordering?</h2>
        <div class="kid-list">${cards || '<p class="empty">Ask a grown-up to add you! 👇</p>'}</div>
        <button class="grown-btn" data-act="grown">🔒 Grown-ups</button>
      </div>`;
  }

  // ---------- Plate: build tomorrow's breakfast ----------
  let curKid = null, curTheme = null, reminded = false;
  function openKid(kidId) {
    const kid = kidById(kidId);
    if (!kid) return;
    reminded = false;
    // Anything a grown-up has since marked "not today" comes off the plate (and anything this child can't have).
    const o = orderFor(kid.id);
    const gone = [];
    let changed = false;
    if (o) CATS.forEach(c => {
      const before = (o[c.id] || []).length;
      o[c.id] = (o[c.id] || []).filter(id => {
        const it = itemById(id);
        if (!it || !canHave(kid, it)) return false;
        if (!it.on) gone.push(it.name);
        return it.on;
      });
      o[c.id] = o[c.id].slice(-state.limits[c.id]);
      if (o[c.id].length !== before) changed = true;
    });
    if (changed) { o.sent = false; save(); }
    view = { name: 'plate', kidId, cat: nextOpenCat(o) || activeCats()[0].id };
    render();
    sfx(themeOf(kid).add);
    if (gone.length) speak([{ slot: 'gone', text: setBubble(`Oh no! No ${listWords(gone)} tomorrow. Pick something else!`) }]);
    else {
      const next = o && o.sent ? { slot: 'change', text: 'Want to change your breakfast?' } : promptPart(view.cat);
      setBubble(`Hi ${kid.name}! ${next.text}`);
      speak([{ slot: 'kid:' + kid.id, text: `Hi ${kid.name}!` }, next]);
    }
  }
  const listWords = arr => arr.length < 2 ? (arr[0] || '') : `${arr.slice(0, -1).join(', ')} or ${arr[arr.length - 1]}`;
  function nextOpenCat(o) {
    const c = activeCats().find(c => !o || (o[c.id] || []).length < state.limits[c.id]);
    return c ? c.id : null;
  }
  function promptFor(catId) {
    const c = CATS.find(x => x.id === catId), n = state.limits[catId];
    if (catId === 'main') return n > 1 ? `Pick ${NUM_WORDS[n]} main dishes!` : 'Pick your main dish!';
    return n > 1 ? `Pick ${NUM_WORDS[n]} ${c.many}!` : `Pick a ${c.one}!`;
  }
  const promptPart = catId => ({ slot: 'pick-' + catId, text: promptFor(catId) });
  const itemPart = it => ({ slot: 'item:' + it.id, text: it.name });
  function setBubble(text) {
    const b = $('bubbleText');
    if (b) b.textContent = text;
    return text;
  }

  function renderPlate() {
    curKid = kidById(view.kidId);
    curTheme = themeOf(curKid);
    setTheme(curKid.theme in THEMES ? curKid.theme : 'farm');
    if (!state.limits[view.cat]) view.cat = activeCats()[0].id;
    app.innerHTML = `
      <div class="plate-view">
        <header class="ph">
          <button class="round-btn" data-act="home" aria-label="Back to start">🏠</button>
          <button class="ph-av" data-act="repeat" aria-label="Say it again">${curKid.avatar}</button>
          <button class="bubble" data-act="repeat"><span id="bubbleText"></span><span class="spk">🔊</span></button>
          <div class="counter" id="counter"></div>
        </header>
        <section class="table" id="table">
          <div class="scene" aria-hidden="true">${curTheme.ground || ''}</div>
          <div class="plate-wrap"><div class="plate" id="plate"></div></div>
          <div class="cups" id="cups"></div>
          <div class="drop-hint">Drop it here!</div>
        </section>
        <nav class="cat-tabs" id="tabs"></nav>
        <section class="shelf"><div class="shelf-grid" id="shelf"></div></section>
        <div class="done-wrap"><button class="done-btn" data-act="done">I'm done! 👍</button></div>
      </div>`;
    drawAll();
    bindShelf();
  }
  function drawAll(popId) { drawPlate(popId); drawTabs(); drawShelf(); drawCounter(); }
  function curOrder() { return orderFor(curKid.id) || { main: [], side: [], drink: [] }; }

  // Spots on the plate. Main dish in the middle, sides in an arc along the top, drinks in cups beside it.
  const SIDE_ANGLES = { 1: [-90], 2: [-135, -45], 3: [-150, -90, -30], 4: [-162, -114, -66, -18] };
  function drawPlate(popId) {
    const o = curOrder(), L = state.limits;
    const slot = (catId, id, x, y, size, i) => {
      const it = id && itemById(id);
      const style = `left:${x}%;top:${y}%;width:${size}%;height:${size}%`;
      if (it) return `<button class="slot full s${size} ${id === popId ? 'pop' : ''}" style="${style}" data-remove="${id}" aria-label="Take off ${esc(it.name)}">${pic(it)}</button>`;
      const c = CATS.find(x => x.id === catId);
      return `<button class="slot empty ${view.cat === catId ? 'now' : ''}" style="${style}" data-cat="${catId}" aria-label="${c.one}"><span class="ghost">${c.icon}</span></button>`;
    };
    let html = '';
    const mains = L.main > 1 ? [[36, 60], [64, 60]] : [[50, 60]];
    const mainSize = L.main > 1 ? 28 : 38;
    mains.forEach(([x, y], i) => { html += slot('main', o.main[i], x - mainSize / 2, y - mainSize / 2, mainSize, i); });
    (SIDE_ANGLES[L.side] || []).forEach((a, i) => {
      const r = a * Math.PI / 180, size = 22;
      html += slot('side', o.side[i], 50 + 34 * Math.cos(r) - size / 2, 50 + 34 * Math.sin(r) - size / 2, size, i);
    });
    $('plate').innerHTML = html;
    let cups = '';
    for (let i = 0; i < L.drink; i++) {
      const it = o.drink[i] && itemById(o.drink[i]);
      cups += it
        ? `<button class="cup full ${it.id === popId ? 'pop' : ''}" data-remove="${it.id}" aria-label="Take off ${esc(it.name)}">${pic(it)}</button>`
        : `<button class="cup empty ${view.cat === 'drink' ? 'now' : ''}" data-cat="drink" aria-label="drink"><span class="ghost">🥤</span></button>`;
    }
    $('cups').innerHTML = cups;
    $('cups').style.display = L.drink ? '' : 'none';
  }
  function drawTabs() {
    const o = curOrder();
    $('tabs').innerHTML = activeCats().map(c => {
      const n = state.limits[c.id], have = (o[c.id] || []).length;
      const dots = Array.from({ length: n }, (_, i) => `<i class="${i < have ? 'on' : ''}"></i>`).join('');
      return `<button class="cat-tab ${view.cat === c.id ? 'active' : ''} ${have >= n ? 'full' : ''}" data-cat="${c.id}">
        <span class="ct-ico">${c.icon}</span><span class="ct-lbl">${c.label}</span><span class="dots">${dots}</span></button>`;
    }).join('');
  }
  function drawShelf(resetScroll) {
    const shelf = $('shelf'), o = curOrder();
    const items = state.menu.filter(m => m.cat === view.cat && canHave(curKid, m)).sort((a, b) => (b.on - a.on));
    shelf.innerHTML = items.length ? items.map(m => {
      const picked = (o[m.cat] || []).includes(m.id);
      return `<button class="tile ${m.on ? '' : 'off'} ${picked ? 'picked' : ''}" data-item="${m.id}">
        ${pic(m)}<span class="tn">${esc(m.name)}</span>${m.on ? '' : '<span class="zzz">Not today</span>'}</button>`;
    }).join('') : `<p class="shelf-empty">No ${CATS.find(c => c.id === view.cat).many} yet. Ask a grown-up to add some!</p>`;
    if (resetScroll) shelf.scrollLeft = 0;
  }
  function drawCounter() {
    const n = orderItems(curOrder()).length;
    $('counter').innerHTML = `<span class="cc-ico">${curTheme.coin}</span><span class="cc-x">×${n}</span>`;
  }
  function switchCat(catId, talk = true) {
    if (!state.limits[catId]) return;
    view.cat = catId;
    drawPlate(); drawTabs(); drawShelf(true);
    setBubble(promptFor(catId));
    if (talk) speak([promptPart(catId)]);
  }

  function addItem(id, fromEl) {
    const it = itemById(id);
    if (!it) return;
    if (!canHave(curKid, it)) return;
    if (!it.on) { refuse(it, fromEl); return; }
    const cat = it.cat, limit = state.limits[cat];
    if (!limit) return;
    const o = orderFor(curKid.id, tomorrowKey(), true);
    if (o[cat].includes(id)) {
      sfx('tap');
      setBubble(`${it.name} is already on your plate!`);
      speak([itemPart(it), { slot: 'already', text: "That's already on your plate!" }]);
      wiggle(fromEl);
      return;
    }
    if (o[cat].length >= limit) o[cat].shift(); // full: the newest pick swaps out the oldest
    o[cat].push(id);
    o.sent = false; o.at = Date.now();
    save();
    flyToPlate(fromEl, cat);
    sfx(curTheme.add); buzz(30);
    view.cat = cat;
    drawAll(id);
    const yum = pick(['Yum!', 'Yummy!', 'Good pick!', curTheme.cheers[0]]);
    setBubble(`${it.name}! ${yum}`);
    speak([itemPart(it), { slot: 'yum', text: yum }]);
    if (o[cat].length >= limit) {
      const next = nextOpenCat(o);
      setTimeout(() => {
        if (view.name !== 'plate' || view.cat !== cat) return;
        if (next) { view.cat = next; drawPlate(); drawTabs(); drawShelf(true); setBubble(promptFor(next)); speak([promptPart(next)], true); }
        else speak([{ slot: 'ready', text: setBubble("Your plate is ready! Tap I'm done!") }], true);
      }, 900);
    }
  }
  function removeItem(id) {
    const it = itemById(id), o = orderFor(curKid.id);
    if (!it || !o) return;
    o[it.cat] = o[it.cat].filter(x => x !== id);
    o.sent = false; o.at = Date.now();
    save();
    sfx(curKid.theme === 'mario' ? 'bump' : 'pop');
    view.cat = it.cat;
    drawAll(); drawShelf(true);
    setBubble(`Bye-bye, ${it.name}! ${promptFor(it.cat)}`);
    speak([{ slot: 'bye', text: 'Bye-bye,' }, itemPart(it)]);
  }
  function refuse(it, el) {
    sfx('nope'); buzz([40, 30, 40]);
    wiggle(el);
    setBubble(`Sorry, no ${it.name} tomorrow. Pick something else!`);
    speak([itemPart(it), { slot: 'notToday', text: "Sorry, that's all gone. Pick something else!" }]);
  }
  function wiggle(el) {
    if (!el) return;
    el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle');
  }
  function flyToPlate(fromEl, cat) {
    if (!fromEl) return;
    const target = cat === 'drink' ? $('cups') : $('plate');
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    const g = document.createElement('div');
    g.className = 'flyer';
    g.innerHTML = fromEl.querySelector('.pic').outerHTML;
    g.style.left = a.left + a.width / 2 - 30 + 'px';
    g.style.top = a.top + a.height / 2 - 30 + 'px';
    document.body.appendChild(g);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = g.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 60}px) scale(1.4)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px,${dy}px) scale(.6)`, opacity: 0 },
    ], { duration: 420, easing: 'ease-in-out' });
    anim.onfinish = () => g.remove();
  }

  // Tap a food to add it, or drag it up onto the plate. The shelf scrolls sideways, so an
  // up-and-down finger move is free for dragging (touch-action: pan-x on the tiles).
  let drag = null;
  function bindShelf() {
    const shelf = $('shelf');
    shelf.addEventListener('pointerdown', e => {
      const t = e.target.closest('.tile');
      if (!t || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { tile: t, id: t.dataset.item, x0: e.clientX, y0: e.clientY, ghost: null };
    });
    shelf.addEventListener('click', e => {
      // Keyboard "clicks" only (detail 0); finger and mouse taps are handled in pointerup.
      const t = e.target.closest('.tile');
      if (t && e.detail === 0) addItem(t.dataset.item, t);
    });
  }
  function overTable(x, y) {
    const r = $('table') && $('table').getBoundingClientRect();
    return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom + 10;
  }
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.ghost && Math.hypot(dx, dy) > 12) {
      const it = itemById(drag.id);
      if (!it || !it.on) { if (it) refuse(it, drag.tile); drag = null; return; }
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'flyer dragging';
      drag.ghost.innerHTML = drag.tile.querySelector('.pic').outerHTML;
      document.body.appendChild(drag.ghost);
      drag.tile.classList.add('lifted');
      sfx('tap');
    }
    if (drag.ghost) {
      e.preventDefault();
      drag.ghost.style.left = e.clientX - 34 + 'px';
      drag.ghost.style.top = e.clientY - 44 + 'px';
      $('table').classList.toggle('hot', overTable(e.clientX, e.clientY));
    }
  }, { passive: false });
  window.addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) {
      d.ghost.remove();
      d.tile.classList.remove('lifted');
      $('table') && $('table').classList.remove('hot');
      if (overTable(e.clientX, e.clientY)) addItem(d.id, null);
    } else if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 12) {
      addItem(d.id, d.tile);
    }
  });
  window.addEventListener('pointercancel', () => {
    if (!drag) return;
    if (drag.ghost) { drag.ghost.remove(); drag.tile.classList.remove('lifted'); $('table') && $('table').classList.remove('hot'); }
    drag = null;
  });

  function finishOrder() {
    const o = orderFor(curKid.id);
    if (!o || !o.main.length) {
      switchCat('main', false);
      wiggle(document.querySelector('.cat-tab[data-cat="main"]'));
      sfx('nope');
      speak([{ slot: 'mainFirst', text: setBubble('Pick your main dish first!') }]);
      return;
    }
    const missing = activeCats().find(c => c.id !== 'main' && !(o[c.id] || []).length);
    if (missing && !reminded) {
      reminded = true;
      switchCat(missing.id, false);
      wiggle(document.querySelector(`.cat-tab[data-cat="${missing.id}"]`));
      speak([{ slot: 'forgot-' + missing.id, text: setBubble(`Don't forget ${missing.id === 'side' ? 'your sides' : 'a ' + missing.one}! Or tap I'm done again.`) }]);
      return;
    }
    o.sent = true; o.at = Date.now();
    save();
    const items = orderItems(o), cheer = pick(curTheme.cheers);
    sfx(curTheme.done); buzz([60, 40, 120]);
    confetti(60, curTheme.bits);
    speak([{ slot: 'sent', text: `${cheer} Your breakfast is ordered, ${curKid.name}!` }, ...items.map(itemPart)]);
    openModal(`
      <div class="sent t-${curKid.theme}">
        <div class="sent-buddy">${curTheme.buddy}</div>
        <h2>${esc(cheer)}</h2>
        <p>Breakfast for <b>${dayName(tomorrowKey())}</b> is ordered, ${esc(curKid.name)}!</p>
        <div class="sent-plate">${items.map(i => `<span class="sp-item">${pic(i)}<small>${esc(i.name)}</small></span>`).join('')}</div>
        <button class="big-btn" data-act="close">Yay! 🎉</button>
      </div>`, () => go({ name: 'home' }));
  }

  // ---------- Grown-ups ----------
  function renderGrownups() {
    setTheme('grown');
    const tKey = todayKey(), mKey = tomorrowKey();
    if (!view.day) view.day = new Date().getHours() < 12 ? tKey : mKey;
    if (view.day !== tKey && view.day !== mKey) view.day = mKey;
    app.innerHTML = `
      <div class="grown">
        <header class="g-head"><button class="g-back" data-act="home">← Done</button><h1>Grown-ups</h1></header>
        <section class="card">
          <h3>🍽️ Breakfast orders</h3>
          <div class="seg">
            <button class="${view.day === tKey ? 'on' : ''}" data-day="${tKey}">This morning<small>${shortDate(tKey)}</small></button>
            <button class="${view.day === mKey ? 'on' : ''}" data-day="${mKey}">Tomorrow<small>${shortDate(mKey)}</small></button>
          </div>
          ${ordersHtml(view.day)}
        </section>
        <section class="card">
          <h3>📋 Menu</h3>
          <p class="hint">Switch an item off when you run out. The kids still see it, greyed out with “Not today”, but can't pick it. Tap a name to change it.</p>
          ${CATS.map(c => menuGroupHtml(c)).join('')}
          ${state.menu.some(m => !m.on) ? '<button class="link-btn" data-act="all-on">Mark everything available again</button>' : ''}
        </section>
        <section class="card">
          <h3>🧒 Children</h3>
          ${state.kids.map(k => `<div class="k-row">
              <span class="k-av" style="--kc:${themeOf(k).swatch}">${k.avatar}</span>
              <span class="k-name">${esc(k.name)}<small>${themeOf(k).label} theme${(k.skip || []).length ? ` · can't have ${k.skip.map(itemById).filter(Boolean).map(m => esc(m.name)).join(', ')}` : ''}</small></span>
              <button class="small-btn" data-edit-kid="${k.id}">Edit</button></div>`).join('') || '<p class="hint">No children yet.</p>'}
          <button class="add-btn" data-act="add-kid">+ Add a child</button>
        </section>
        <section class="card">
          <h3>🔢 What fits on a plate</h3>
          ${CATS.map(c => `<div class="step-row"><span>${c.icon} ${c.label}</span>
            <span class="stepper"><button data-step="${c.id}" data-d="-1" aria-label="Fewer">−</button><b>${state.limits[c.id]}</b><button data-step="${c.id}" data-d="1" aria-label="More">+</button></span></div>`).join('')}
        </section>
        ${voiceCardHtml()}
        <section class="card">
          <h3>⚙️ Settings</h3>
          <div class="toggle"><span>Sounds</span><button class="switch ${state.sound ? 'on' : ''}" data-set="sound" aria-label="Sounds"></button></div>
          <div class="toggle"><span>Talking buddy</span><button class="switch ${state.voice ? 'on' : ''}" data-set="voice" aria-label="Talking buddy"></button></div>
          <div class="row" style="margin-top:12px">
            <button class="small-btn" data-act="backup">⬇️ Download backup</button>
            <button class="small-btn" data-act="restore">⬆️ Restore backup</button>
          </div>
          <input type="file" id="restoreFile" accept="application/json,.json" hidden />
          <button class="link-btn danger" data-act="erase">Erase everything and start over</button>
        </section>
      </div>`;
  }
  // Record your own voice: hello for each child, the buddy's lines, and each food's name.
  let openVoice = new Set(['kids']);
  function voiceSlots() {
    return {
      kids: { title: '👋 Hello for each child', rows: state.kids.map(k => ({ id: 'kid:' + k.id, icon: k.avatar, label: `Hello for ${k.name}`, script: `Hi ${k.name}! Let's build your breakfast!` })) },
      lines: { title: '💬 Buddy lines', rows: VOICE_LINES.map(l => ({ id: l.id, icon: '', label: l.label, script: l.script() })) },
      foods: { title: '🍽️ Food names', rows: state.menu.map(m => ({ id: 'item:' + m.id, icon: pic(m, 'sm'), label: m.name, script: `${m.name}!` })) },
    };
  }
  const findSlot = id => Object.values(voiceSlots()).flatMap(g => g.rows).find(r => r.id === id);
  function voiceCardHtml() {
    if (!canRecord()) return `<section class="card"><h3>🎙️ Your voice</h3><p class="hint">This phone's browser can't record audio. Try updating it, or open the app in Safari or Chrome.</p></section>`;
    const groups = Object.entries(voiceSlots()).map(([key, g]) => {
      const done = g.rows.filter(r => clips[r.id]).length;
      return `<details class="v-group" data-vgroup="${key}" ${openVoice.has(key) ? 'open' : ''}>
        <summary>${g.title} <small>${done} of ${g.rows.length} recorded</small></summary>
        ${g.rows.map(r => `<div class="voice-row">
          ${r.icon ? `<span class="v-ico">${r.icon}</span>` : ''}
          <div class="voice-txt"><b>${clips[r.id] ? '✅' : '⚪'} ${esc(r.label)}</b><span>“${esc(r.script)}”</span></div>
          <div class="voice-btns">
            <button class="vbtn rec" data-rec="${r.id}" aria-label="Record">●</button>
            ${clips[r.id] ? `<button class="vbtn" data-play="${r.id}" aria-label="Play">▶</button><button class="vbtn del" data-unrec="${r.id}" aria-label="Delete recording">🗑</button>` : ''}
          </div></div>`).join('') || '<p class="hint">Nothing here yet.</p>'}
      </details>`;
    }).join('');
    return `<section class="card">
      <h3>🎙️ Your voice</h3>
      <p class="hint">Record yourself and the kids hear <b>you</b> instead of the phone's voice. Tap ● and say the line. Anything you skip uses the phone's voice. The food names are joined to the lines, so you hear “Pancakes!” + “Yummy!”.</p>
      ${groups}
      <p class="hint" style="margin-top:10px">Recordings stay on this phone (they aren't in the backup file).</p>
    </section>`;
  }
  // <details> open/closed survives re-drawing the screen.
  app.addEventListener('toggle', e => {
    const g = e.target.dataset && e.target.dataset.vgroup;
    if (g) { if (e.target.open) openVoice.add(g); else openVoice.delete(g); }
  }, true);

  function ordersHtml(day) {
    if (!state.kids.length) return '<p class="hint">Add a child below to start taking orders.</p>';
    const counts = {};
    const cards = state.kids.map(k => {
      const o = orderFor(k.id, day), items = orderItems(o);
      const status = o && o.sent ? '<span class="st ok">✓ Ordered</span>'
        : items.length ? '<span class="st wait">Still building</span>' : '<span class="st no">Not yet</span>';
      const lines = CATS.map(c => (o && o[c.id] || []).map(itemById).filter(Boolean).map(it => {
        counts[it.id] = (counts[it.id] || 0) + 1;
        const warn = !canHave(k, it) ? `⚠️ ${esc(k.name)} can't have this` : !it.on ? '⚠️ marked not available' : '';
        return `<div class="o-line ${warn ? 'warn' : ''}">${pic(it, 'sm')}<span>${esc(it.name)}</span><small>${c.label === 'Main' ? 'main' : c.one}</small>${warn ? `<em>${warn}</em>` : ''}</div>`;
      }).join('')).join('');
      return `<div class="o-card">
        <div class="o-head"><span class="k-av" style="--kc:${themeOf(k).swatch}">${k.avatar}</span><b>${esc(k.name)}</b>${status}</div>
        ${lines || '<div class="o-none">No order yet.</div>'}
        ${items.length ? `<button class="link-btn sm" data-clear="${k.id}">Clear this order</button>` : ''}
      </div>`;
    }).join('');
    const cook = Object.entries(counts).map(([id, n]) => { const it = itemById(id); return `<span class="cook-chip">${pic(it, 'sm')} ${esc(it.name)}${n > 1 ? ` <b>×${n}</b>` : ''}</span>`; }).join('');
    return cards + (cook ? `<div class="cook"><div class="cook-t">To make:</div>${cook}</div>` : '');
  }
  function hiddenFor(m) {
    const names = state.kids.filter(k => !canHave(k, m)).map(k => esc(k.name));
    return names.length ? ` · <span class="allergy">hidden for ${names.join(', ')}</span>` : '';
  }
  function menuGroupHtml(c) {
    const items = state.menu.filter(m => m.cat === c.id);
    return `<div class="m-group"><div class="m-gt">${c.icon} ${c.label}</div>
      ${items.map(m => `<div class="m-row ${m.on ? '' : 'off'}">
        <button class="m-pic" data-edit-item="${m.id}">${pic(m, 'sm')}</button>
        <button class="m-name" data-edit-item="${m.id}">${esc(m.name)}<small>${m.on ? 'Available' : 'Not available'}${hiddenFor(m)}</small></button>
        <button class="switch ${m.on ? 'on' : ''}" data-toggle-item="${m.id}" aria-label="${esc(m.name)} available"></button>
        <button class="x-btn" data-del-item="${m.id}" aria-label="Remove ${esc(m.name)}">✕</button>
      </div>`).join('') || '<p class="hint">Nothing here yet.</p>'}
      <button class="add-btn" data-add-item="${c.id}">+ Add ${c.one}</button></div>`;
  }

  // Add or change a menu item.
  function editItem(id, cat) {
    const existing = id && itemById(id);
    const ed = existing ? { ...existing } : { name: '', emoji: CATS.find(c => c.id === cat).icon, cat, on: true };
    const draw = () => {
      openModal(`
        <h2>${existing ? 'Change' : 'Add'} ${CATS.find(c => c.id === ed.cat).one}</h2>
        <div class="ed-preview">${pic(ed)}</div>
        <div class="field"><label>Name</label><input id="edName" type="text" maxlength="24" value="${esc(ed.name)}" placeholder="e.g. Pancakes" /></div>
        <div class="field"><label>Goes in</label><div class="chips">${CATS.map(c => `<button class="chip ${ed.cat === c.id ? 'on' : ''}" data-ecat="${c.id}">${c.icon} ${c.label}</button>`).join('')}</div></div>
        <div class="field"><label>Picture</label>
          <div class="emoji-grid">${Object.entries(ART).map(([k, a]) => `<button class="${!ed.photo && ed.art === k ? 'on' : ''}" data-art="${k}" aria-label="${esc(a.label)}"><img src="${a.src}" alt="" /></button>`).join('')}${FOOD_EMOJIS.map(e => `<button class="${!ed.photo && !ed.art && ed.emoji === e ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div>
          <div class="row" style="margin-top:8px">
            <button class="small-btn" data-act="photo">📷 Use a photo</button>
            ${ed.photo ? '<button class="small-btn" data-act="no-photo">Remove photo</button>' : ''}
          </div>
          <input type="file" id="edPhoto" accept="image/*" hidden />
        </div>
        <button class="big-btn" data-act="ed-save">Save</button>
        <button class="link-btn" data-act="close">Cancel</button>`);
      const nameIn = $('edName');
      nameIn.addEventListener('input', () => { ed.name = nameIn.value; });
      modalCard.querySelectorAll('[data-ecat]').forEach(b => b.onclick = () => { ed.cat = b.dataset.ecat; draw(); });
      modalCard.querySelectorAll('[data-emoji]').forEach(b => b.onclick = () => { ed.emoji = b.dataset.emoji; delete ed.photo; delete ed.art; draw(); });
      modalCard.querySelectorAll('[data-art]').forEach(b => b.onclick = () => { ed.art = b.dataset.art; delete ed.photo; draw(); });
      modalCard.querySelector('[data-act="photo"]').onclick = () => $('edPhoto').click();
      const np = modalCard.querySelector('[data-act="no-photo"]');
      if (np) np.onclick = () => { delete ed.photo; draw(); };
      $('edPhoto').onchange = async e => {
        const f = e.target.files[0];
        if (!f) return;
        try { ed.photo = await shrinkPhoto(f); delete ed.art; draw(); } catch (err) { toast("Sorry, that photo couldn't be used."); }
      };
      modalCard.querySelector('[data-act="ed-save"]').onclick = () => {
        ed.name = ed.name.trim();
        if (!ed.name) { nameIn.classList.add('bad'); nameIn.focus(); return; }
        if (existing) {
          if (existing.cat !== ed.cat) dropFromOrders(existing.id); // moved to another part of the plate
          Object.assign(existing, ed);
          if (!ed.photo) delete existing.photo;
          if (!ed.art) delete existing.art;
        } else state.menu.push({ ...ed, id: uid() });
        save(); closeModal(); render();
      };
    };
    draw();
  }
  // Square-crop and shrink a photo so lots of them fit in the phone's storage.
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const S = 192, c = document.createElement('canvas');
        c.width = c.height = S;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, S, S);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }
  function dropFromOrders(itemId) {
    Object.values(state.orders).forEach(day => Object.values(day).forEach(o => CATS.forEach(c => {
      if (o[c.id]) o[c.id] = o[c.id].filter(x => x !== itemId);
    })));
  }

  // Add or change a child.
  function editKid(id) {
    const existing = id && kidById(id);
    const ed = existing ? { ...existing, skip: [...(existing.skip || [])] } : { name: '', avatar: '⭐', theme: 'space', skip: [] };
    const draw = () => {
      openModal(`
        <h2>${existing ? `Change ${esc(existing.name)}` : 'Add a child'}</h2>
        <div class="field"><label>Name</label><input id="kName" type="text" maxlength="16" value="${esc(ed.name)}" /></div>
        <div class="field"><label>Picture</label>
          <div class="emoji-grid">${AVATARS.map(a => `<button class="${ed.avatar === a ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div></div>
        <div class="field"><label>Theme</label>
          <div class="theme-grid">${Object.entries(THEMES).map(([k, t]) => `<button class="theme-card ${ed.theme === k ? 'on' : ''}" data-th="${k}" style="--kc:${t.swatch}"><span>${t.buddy}</span>${t.label}</button>`).join('')}</div></div>
        <div class="field"><label>🚫 Foods ${esc(ed.name.trim() || 'this child')} can't have (allergies)</label>
          <p class="hint">Tap to hide a food from this child. They won't see it at all.</p>
          <div class="skip-grid">${state.menu.map(m => `<button class="skip-chip ${ed.skip.includes(m.id) ? 'on' : ''}" data-skip="${m.id}">${pic(m, 'sm')}<span>${esc(m.name)}</span></button>`).join('')}</div></div>
        <button class="big-btn" data-act="k-save">Save</button>
        ${existing ? '<button class="link-btn danger" data-act="k-del">Remove this child</button>' : ''}
        <button class="link-btn" data-act="close">Cancel</button>`);
      const nameIn = $('kName');
      nameIn.addEventListener('input', () => { ed.name = nameIn.value; });
      modalCard.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { ed.avatar = b.dataset.av; draw(); });
      modalCard.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { ed.theme = b.dataset.th; draw(); });
      modalCard.querySelectorAll('[data-skip]').forEach(b => b.onclick = () => {
        const id = b.dataset.skip;
        ed.skip = ed.skip.includes(id) ? ed.skip.filter(x => x !== id) : [...ed.skip, id];
        b.classList.toggle('on', ed.skip.includes(id));
      });
      modalCard.querySelector('[data-act="k-save"]').onclick = () => {
        ed.name = ed.name.trim();
        if (!ed.name) { nameIn.classList.add('bad'); nameIn.focus(); return; }
        if (existing) Object.assign(existing, ed);
        else state.kids.push({ ...ed, id: uid() });
        save(); closeModal(); render();
      };
      const del = modalCard.querySelector('[data-act="k-del"]');
      if (del) del.onclick = () => confirmBox(`Remove ${esc(existing.name)}?`, 'Their orders are removed too.', 'Remove', () => {
        state.kids = state.kids.filter(k => k.id !== existing.id);
        clipDelete('kid:' + existing.id);
        Object.values(state.orders).forEach(day => delete day[existing.id]);
        save(); render();
      });
    };
    draw();
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `build-a-plate-backup-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function restoreBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!Array.isArray(data.kids) || !Array.isArray(data.menu)) throw new Error('not a backup');
        confirmBox('Restore this backup?', 'It replaces everything on this phone.', 'Restore', () => {
          const base = DEFAULT_STATE();
          state = { ...base, ...data, limits: { ...base.limits, ...(data.limits || {}) }, orders: data.orders || {} };
          migrate(state, data.v);
          save(); render(); toast('Backup restored!');
        });
      } catch (e) { toast("That file isn't a Build-a-Plate backup."); }
    };
    r.readAsText(file);
  }

  // ---------- Taps ----------
  app.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (view.name === 'home') {
      if (d.kid) { sfx('tap'); openKid(d.kid); }
      else if (d.act === 'grown') askGrownup(() => go({ name: 'grown' }));
      return;
    }
    if (view.name === 'plate') {
      if (d.act === 'home') { sfx('tap'); stopSpeaking(); go({ name: 'home' }); }
      else if (d.act === 'repeat') speak(lastParts.length ? lastParts : $('bubbleText').textContent);
      else if (d.act === 'done') finishOrder();
      else if (d.remove) removeItem(d.remove);
      else if (d.cat) { sfx('tap'); switchCat(d.cat); }
      return;
    }
    // Grown-ups
    if (d.act === 'home') { grownupUnlocked = false; go({ name: 'home' }); }
    else if (d.day) { view.day = d.day; render(); }
    else if (d.clear) {
      const k = kidById(d.clear);
      confirmBox(`Clear ${esc(k.name)}'s order?`, '', 'Clear', () => { delete state.orders[view.day][d.clear]; save(); render(); });
    }
    else if (d.toggleItem) { const it = itemById(d.toggleItem); it.on = !it.on; save(); render(); }
    else if (d.act === 'all-on') { state.menu.forEach(m => { m.on = true; }); save(); render(); }
    else if (d.editItem) editItem(d.editItem);
    else if (d.addItem) editItem(null, d.addItem);
    else if (d.delItem) {
      const it = itemById(d.delItem);
      confirmBox(`Remove ${esc(it.name)}?`, 'It comes off the menu for good. (To hide it for a while, switch it off instead.)', 'Remove', () => {
        state.menu = state.menu.filter(m => m.id !== it.id);
        clipDelete('item:' + it.id);
        dropFromOrders(it.id);
        save(); render();
      });
    }
    else if (d.rec) { const r = findSlot(d.rec); if (r) recordSlot(r.id, r.label, r.script); }
    else if (d.play) { stopSpeaking(); playClip(d.play); }
    else if (d.unrec) confirmBox('Delete this recording?', "The phone's voice will say this line instead.", 'Delete', () => clipDelete(d.unrec).then(render));
    else if (d.editKid) editKid(d.editKid);
    else if (d.act === 'add-kid') editKid(null);
    else if (d.step) {
      const [lo, hi] = LIMIT_RANGE[d.step];
      state.limits[d.step] = Math.max(lo, Math.min(hi, state.limits[d.step] + Number(d.d)));
      // Trim plates that now hold too much.
      Object.values(state.orders).forEach(day => Object.values(day).forEach(o => {
        if (o[d.step]) o[d.step] = o[d.step].slice(0, state.limits[d.step]);
      }));
      save(); render();
    }
    else if (d.set) { state[d.set] = !state[d.set]; save(); render(); }
    else if (d.act === 'backup') downloadBackup();
    else if (d.act === 'restore') $('restoreFile').click();
    else if (d.act === 'erase') confirmBox('Erase everything?', 'Children, menu and orders all go back to the start.', 'Erase', () => {
      state = DEFAULT_STATE(); save(); clipClearAll().then(render);
    });
  });
  app.addEventListener('change', e => {
    if (e.target.id === 'restoreFile' && e.target.files[0]) restoreBackup(e.target.files[0]);
  });

  // When the app is reopened on a new day, "tomorrow" moves on.
  let dayKey = todayKey();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && todayKey() !== dayKey) {
      dayKey = todayKey();
      if (view.name === 'plate') view = { name: 'home' };
      if (view.name === 'grown') view.day = null;
      render();
    }
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
  save(); // keeps any upgrade from load()
  render();
  loadAllClips().then(() => { if (view.name === 'grown') render(); });
})();

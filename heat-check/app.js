/* Heat Check — a behavior thermometer for two brothers.
 * Each boy has a thermometer from -100° to +100° that starts at 0° every morning.
 * Good choices heat it up, bad ones cool it down, with sounds, alarms and announcements.
 * Each day's final temperature (plus a Heat Wave bonus when both boys end the day hot) goes into
 * his bank of heat points, which he spends on prizes. Bad days take points out of the bank.
 * Saved on the phone in localStorage, and shared between phones through ../family-sync.js. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'heat-check-v1';
  const MAX = 100, MIN = -100;
  const HOT_DAY = 50;             // a day that ends at 50° or more is a hot day (streaks, Heat Wave)
  const HEATWAVE_BONUS = 10;      // bonus points each when both boys end the day hot
  const UNLOCK_MS = 15 * 60 * 1000; // a grown-up unlock lasts 15 minutes
  const AVATARS = ['🦖', '🦈', '🐯', '🦁', '🐲', '🤖', '🦊', '🐺', '🐻', '🐸', '🚀', '⚽', '🏀', '🦅', '🐙', '👾', '🥷', '🦸', '🐊', '🦍'];
  const PRIZE_EMOJIS = ['🎁', '📱', '🎮', '🍕', '🍦', '🌙', '🎬', '💵', '🧸', '🏀', '⚽', '🍩', '🎳', '🛹', '🏊', '🍔', '🎟️', '📚', '🧱', '🏆'];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const DEFAULT_ACTIONS = [
    { id: 'g1', emoji: '👂', label: 'Listened the first time', pts: 5 },
    { id: 'g2', emoji: '🤝', label: 'Kind to his brother', pts: 10 },
    { id: 'g3', emoji: '🧹', label: 'Did chores', pts: 10 },
    { id: 'g4', emoji: '🛏️', label: 'Bedtime with no fuss', pts: 10 },
    { id: 'g5', emoji: '📚', label: 'Homework, no complaining', pts: 10 },
    { id: 'g6', emoji: '🍽️', label: 'Good manners', pts: 5 },
    { id: 'g7', emoji: '🧘', label: 'Stayed calm', pts: 10 },
    { id: 'g8', emoji: '🦸', label: 'Above and beyond!', pts: 20 },
    { id: 'b1', emoji: '🙉', label: 'Not listening', pts: -5 },
    { id: 'b2', emoji: '😤', label: 'Talking back', pts: -10 },
    { id: 'b3', emoji: '🙅', label: 'Not sharing', pts: -5 },
    { id: 'b4', emoji: '😫', label: 'Whining / tantrum', pts: -10 },
    { id: 'b5', emoji: '🤬', label: 'Bad words', pts: -10 },
    { id: 'b6', emoji: '🌪️', label: 'Left a big mess', pts: -5 },
    { id: 'b7', emoji: '🤥', label: 'Lying', pts: -15 },
    { id: 'b8', emoji: '👊', label: 'Hitting / fighting', pts: -20 },
  ];
  const DEFAULT_PRIZES = [
    { id: 'p1', emoji: '📱', name: '30 min extra screen time', cost: 50 },
    { id: 'p2', emoji: '🍕', name: 'Pick what\'s for dinner', cost: 75 },
    { id: 'p3', emoji: '🎬', name: 'Pick the family movie', cost: 80 },
    { id: 'p4', emoji: '🌙', name: 'Stay up 30 min late', cost: 100 },
    { id: 'p5', emoji: '🍦', name: 'Ice cream trip', cost: 150 },
    { id: 'p6', emoji: '💵', name: '$5 cash', cost: 250 },
    { id: 'p7', emoji: '🎮', name: 'New game or toy', cost: 500 },
  ];

  // Temperature zones, hottest first. Index order matters: a bigger index is colder.
  const ZONES = [
    { min: 100, name: 'MAX HEAT', icon: '🌋', face: '🥵', cls: 'z-max' },
    { min: 75, name: 'ON FIRE', icon: '🔥', face: '😎', cls: 'z-fire' },
    { min: 40, name: 'HOT', icon: '🌶️', face: '😄', cls: 'z-hot' },
    { min: 10, name: 'WARM', icon: '☀️', face: '🙂', cls: 'z-warm' },
    { min: -9, name: 'ROOM TEMP', icon: '🌤️', face: '😐', cls: 'z-mild' },
    { min: -39, name: 'CHILLY', icon: '🌬️', face: '😬', cls: 'z-chilly' },
    { min: -74, name: 'FREEZING', icon: '❄️', face: '🥶', cls: 'z-freeze' },
    { min: -99, name: 'DEEP FREEZE', icon: '🧊', face: '🥶', cls: 'z-deep' },
    { min: -100, name: 'ICE AGE', icon: '🦣', face: '🧊', cls: 'z-ice' },
  ];
  const zoneIx = v => ZONES.findIndex(z => v >= z.min);
  const zoneOf = v => ZONES[zoneIx(v)];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = v => Math.max(MIN, Math.min(MAX, v));
  const pad2 = n => String(n).padStart(2, '0');
  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const today = () => dayKey(Date.now());
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n, 12)); };
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  const CALM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 1,
    setupDone: false,
    kids: [{ id: 'k1', name: '', avatar: '🦖' }, { id: 'k2', name: '', avatar: '🦈' }],
    events: [],     // [{ id, kid, pts, label, emoji, at, day }]; bank: true = a bank adjustment that doesn't move the thermometer
    actions: DEFAULT_ACTIONS,
    prizes: DEFAULT_PRIZES,
    redeemed: [],   // [{ id, kid, name, emoji, cost, at }]
    sound: true,
    voice: true,
    lock: true,     // giving points asks a grown-up question first
    heatwave: true, // both boys end the day at 50°+ → bonus points each
  };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && Array.isArray(raw.kids)) {
        const s = Object.assign(structuredClone(DEFAULT_STATE), raw);
        ['events', 'actions', 'prizes', 'redeemed'].forEach(k => { if (!Array.isArray(s[k])) s[k] = structuredClone(DEFAULT_STATE[k]); });
        while (s.kids.length < 2) s.kids.push(structuredClone(DEFAULT_STATE.kids[s.kids.length]));
        return s;
      }
    } catch (e) { /* start fresh */ }
    return structuredClone(DEFAULT_STATE);
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { snack('Couldn’t save on this phone. Is storage full?'); }
    if (window.FamilySync) FamilySync.changed(STORE_KEY);
  }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* optional */ }

  const kidById = id => state.kids.find(k => k.id === id) || state.kids[0];
  const nameOf = k => (k && k.name) || (k === state.kids[1] ? 'Brother 2' : 'Brother 1');
  const other = k => state.kids.find(x => x.id !== k.id);

  // ---------- Scores ----------
  // A day's temperature: the day's points added up in order, never going past +100 or -100,
  // so a good choice at -100 warms him up right away. Points past either end still count:
  // they go straight into (or out of) the bank.
  function tally() {
    const days = {}, adj = {}, spent = {};
    state.kids.forEach(k => { adj[k.id] = 0; spent[k.id] = 0; });
    [...state.events].sort((a, b) => a.at - b.at).forEach(e => {
      if (!(e.kid in adj)) return;
      if (e.bank) { adj[e.kid] += e.pts; return; }
      const d = days[e.day] || (days[e.day] = {});
      const raw = (d[e.kid] || 0) + e.pts;
      d[e.kid] = clamp(raw);
      adj[e.kid] += raw - d[e.kid];
    });
    state.redeemed.forEach(r => { if (r.kid in spent) spent[r.kid] += r.cost; });
    return { days, adj, spent };
  }
  const tempOf = (t, kid, day) => (t.days[day] && t.days[day][kid]) || 0;
  const isHeatwave = (t, day) => state.heatwave && state.kids.every(k => tempOf(t, k.id, day) >= HOT_DAY);
  function bankOf(t, kid) {
    let n = t.adj[kid] - t.spent[kid];
    Object.keys(t.days).forEach(d => { n += tempOf(t, kid, d) + (isHeatwave(t, d) ? HEATWAVE_BONUS : 0); });
    return n;
  }
  // Hot days in a row, counting back from today (today only counts once it's hot).
  function streakOf(t, kid) {
    let d = today(), n = 0;
    if (tempOf(t, kid, d) < HOT_DAY) d = addDays(d, -1);
    while (tempOf(t, kid, d) >= HOT_DAY) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- Sound ----------
  let audioCtx = null, noiseBuf = null;
  function getCtx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  // Phones only allow sound after a tap; wake the audio up on the first touch.
  document.addEventListener('pointerdown', () => { try { const c = getCtx(); if (c.state === 'suspended') c.resume(); } catch (e) { /* no audio */ } }, true);
  function tone(freq, start, dur, type = 'sine', vol = 0.15, toFreq) {
    if (!state.sound) return;
    try {
      const ctx = getCtx(), t0 = ctx.currentTime + start;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* no audio */ }
  }
  // Filtered white noise: fire roar, sizzle, wind, cracking ice. freqs = filter frequency over time.
  function noise(start, dur, { type = 'bandpass', freqs = [1000], q = 1, vol = 0.2, attack = 0.01 } = {}) {
    if (!state.sound) return;
    try {
      const ctx = getCtx(), t0 = ctx.currentTime + start;
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuf; src.loop = true;
      f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(freqs[0], t0);
      freqs.slice(1).forEach((fr, i) => f.frequency.linearRampToValueAtTime(fr, t0 + dur * (i + 1) / (freqs.length - 1)));
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
    } catch (e) { /* no audio */ }
  }
  const crackles = (n, span, vol = 0.3) => { for (let i = 0; i < n; i++) noise(Math.random() * span, 0.025, { freqs: [1200 + Math.random() * 3500], q: 3, vol }); };
  const sfx = {
    tap: () => tone(880, 0, 0.07, 'triangle', 0.08),
    nope: () => tone(196, 0, 0.22, 'sawtooth', 0.06),
    // Good: a sizzle and a rising sparkle.
    heat: () => {
      noise(0, 0.55, { type: 'highpass', freqs: [3500, 6000], vol: 0.08 });
      crackles(7, 0.5, 0.22);
      tone(330, 0, 0.45, 'sine', 0.08, 990);
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.08 + i * 0.07, 0.22, 'triangle', 0.1));
    },
    // A whoosh of flame with lots of crackling.
    fire: () => {
      noise(0, 1.4, { type: 'lowpass', freqs: [200, 900, 300], vol: 0.35, attack: 0.25 });
      crackles(22, 1.4, 0.28);
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15 + i * 0.09, 0.3, 'square', 0.05));
    },
    fanfare: () => {
      sfx.fire();
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3 + i * 0.13, 0.28, 'triangle', 0.13));
      [523, 659, 784].forEach(f => tone(f * 2, 0.85, 1.2, 'triangle', 0.08));
    },
    // Melting ice: drips, then warming up.
    thaw: () => { [1400, 1100, 1250].forEach((f, i) => tone(f, i * 0.16, 0.14, 'sine', 0.12, f / 2.2)); setTimeout(sfx.heat, 450); },
    // Bad: a cold wind whoosh and a crack of ice.
    cold: () => {
      noise(0, 0.8, { freqs: [2600, 300], q: 2.5, vol: 0.28, attack: 0.08 });
      tone(900, 0, 0.7, 'sine', 0.07, 180);
      sfx.crack(0.55);
    },
    crack: (at = 0) => {
      noise(at, 0.05, { type: 'highpass', freqs: [2500], vol: 0.5 });
      noise(at + 0.04, 0.16, { type: 'highpass', freqs: [1500], vol: 0.25 });
      tone(110, at, 0.25, 'sine', 0.25, 40);
    },
    // A howling winter wind.
    wind: () => {
      noise(0, 2.6, { freqs: [350, 900, 450, 1100, 380], q: 7, vol: 0.4, attack: 0.5 });
      noise(0.2, 2.2, { freqs: [700, 500, 1300, 600], q: 9, vol: 0.18, attack: 0.5 });
    },
    // "Warning, it's getting colder": a two-tone alarm.
    alarm: () => { for (let i = 0; i < 3; i++) { tone(988, i * 0.5, 0.22, 'square', 0.07); tone(740, i * 0.5 + 0.25, 0.22, 'square', 0.07); } },
    // Deep freeze: a whooping siren.
    siren: () => { for (let i = 0; i < 4; i++) { tone(330, i * 0.55, 0.5, 'sawtooth', 0.09, 880); tone(331, i * 0.55, 0.5, 'square', 0.03, 882); } },
    // Shattering ice: glassy tinkles.
    shatter: () => {
      sfx.crack();
      noise(0, 0.5, { type: 'highpass', freqs: [5000], vol: 0.2 });
      for (let i = 0; i < 20; i++) tone(2500 + Math.random() * 3500, Math.random() * 0.6, 0.18, 'sine', 0.05);
    },
    // Points disappearing: coins draining away, then a sad "wah-wah".
    drain: (at = 0) => {
      for (let i = 0; i < 9; i++) tone(1500 - i * 130, at + i * 0.06, 0.07, 'square', 0.04);
      tone(392, at + 0.65, 0.35, 'triangle', 0.1, 370);
      tone(370, at + 1.0, 0.6, 'triangle', 0.1, 260);
    },
    cash: () => { tone(988, 0, 0.1, 'square', 0.07); tone(1319, 0.08, 0.5, 'square', 0.07); setTimeout(sfx.fanfare, 300); },
    undo: () => { tone(660, 0, 0.12, 'sine', 0.1); tone(520, 0.1, 0.18, 'sine', 0.1); },
  };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } };

  // ---------- Talking ----------
  const NOVELTY_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|hysterical|deranged/i;
  function voiceScore(v) {
    let n = 0;
    if (/premium/i.test(v.name)) n += 40;
    if (/enhanced|neural|natural|wavenet|studio/i.test(v.name)) n += 30;
    if (/siri/i.test(v.name)) n += 25;
    if (/google/i.test(v.name)) n += 20;
    if (/^en[-_]US/i.test(v.lang)) n += 6;
    else if (/^en[-_](GB|AU|CA|IE|NZ)/i.test(v.lang)) n += 3;
    if (NOVELTY_VOICES.test(v.name)) n -= 100;
    return n;
  }
  const pickVoice = () => ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null : null;
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  // Alarms talk low and steady like a weather-station robot; cheers talk high and excited.
  function say(text, mood = 'cheer', delay = 0) {
    if (!state.voice || !('speechSynthesis' in window)) return;
    setTimeout(() => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ''));
        const v = pickVoice();
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
        if (mood === 'alarm') { u.rate = 0.95; u.pitch = 0.55; } else { u.rate = 1.02; u.pitch = 1.15; }
        speechSynthesis.speak(u);
      } catch (e) { /* no voice */ }
    }, delay);
  }

  // Every line the announcer says. A grown-up can record each one in their own voice, once for both boys
  // or separately for each boy (to say his name). His own recording wins, then the shared one, then the phone's voice.
  const w = n => n ? `, ${n}` : '';
  const LINES = {
    good: { label: 'Any good choice', mood: 'cheer', text: n => pick(['Sizzling', 'Hotter', 'Heating up', 'Nice', 'Toasty', 'Turn up the heat']) + `${w(n)}!`, script: n => `Sizzling${w(n)}!` },
    hot: { label: 'Heats up to 40°', mood: 'cheer', text: n => `Heating up! ${n || 'You'} ${n ? 'is' : 'are'} getting hot!` },
    fire: { label: 'On fire at 75°', mood: 'cheer', text: n => `${n || 'You'} ${n ? 'is' : 'are'} on fire!` },
    max: { label: 'Maximum heat at 100°', mood: 'cheer', text: n => `Maximum heat! ${n || 'You'} hit one hundred degrees! Unstoppable!` },
    maxed: { label: 'Already at 100°', mood: 'cheer', text: n => `${n || 'You'} ${n ? 'is' : 'are'} maxed out! Extra points go straight to the bank!` },
    thaw: { label: 'Warms back above 0°', mood: 'cheer', text: n => `Thawing out! Great comeback${w(n)}!` },
    wave: { label: 'Heat Wave (both boys hot)', mood: 'cheer', text: () => `Heat wave! You're both on fire! Ten bonus points each!`, shared: true },
    bad: { label: 'Any bad choice', mood: 'alarm', text: n => pick(['Brrr', 'Getting colder', 'Chilly', 'Uh oh, cooling down', 'Cold front coming']) + `${w(n)}!`, script: n => `Brrr! Getting colder${w(n)}!` },
    warn: { label: 'Drops below 0°', mood: 'alarm', text: n => `Warning! Warning! It's getting colder${w(n)}!` },
    freeze: { label: 'Freezing at −40°', mood: 'alarm', text: n => `Freeze warning! ${n || 'You'} ${n ? 'is' : 'are'} freezing up! Turn it around!` },
    deep: { label: 'Deep freeze at −75°', mood: 'alarm', text: n => `Deep freeze alert! Deep freeze alert!${n ? ` ${n},` : ''} your points are disappearing!` },
    ice: { label: 'Ice Age at −100°', mood: 'alarm', text: n => `Ice age! Ice age! ${n || 'You'} ${n ? 'is' : 'are'} frozen solid! Points are disappearing!` },
    stillIce: { label: 'Bad choice while at −100°', mood: 'alarm', text: n => `Ice age!${n ? ` ${n},` : ''} it can't get any colder!` },
    prize: { label: 'Cashes in a prize', mood: 'cheer', text: (n, prize) => `Prize unlocked! ${n || 'You'} ${n ? 'gets' : 'get'} ${prize || 'a prize'}!`, script: n => `Prize unlocked! Great job${w(n)}!` },
  };
  const scriptOf = (id, n) => (LINES[id].script || LINES[id].text)(n);
  // Which recording plays for this boy, if any.
  const clipFor = (id, kid) => (kid && clips[`${id}:${kid.id}`]) ? `${id}:${kid.id}` : clips[id] ? id : null;
  function sayLine(id, kid, delay = 0, extra) {
    if (!state.voice) return;
    const clip = clipFor(id, kid);
    if (clip) { setTimeout(() => playClip(clip), delay); return; }
    say(LINES[id].text(kid ? nameOf(kid) : '', extra), LINES[id].mood, delay);
  }

  // ---------- Recorded voice (IndexedDB, stays on this phone) ----------
  const clips = {}; // slot ("deep" or "deep:k1") -> { buffer, start, end, gain }
  let clipPlaying = null;
  function idb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
      const r = indexedDB.open('heat-check-voice', 1);
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
  const clipDelete = id => idbDo('readwrite', st => st.delete(id));

  // Decode a recording and trim the silence before and after the talking.
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
        if (blob) await loadClip(id, blob).catch(() => { /* unreadable clip; phone voice instead */ });
      }
      if (view === 'grownups') renderGrownups();
    } catch (e) { /* no IndexedDB; phone voice only */ }
  }
  function playClip(id) {
    const c = clips[id];
    if (!c) return false;
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      if (clipPlaying) { try { clipPlaying.stop(); } catch (e) { /* already stopped */ } }
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = c.buffer; g.gain.value = c.gain;
      src.connect(g).connect(ctx.destination);
      src.start(0, c.start, Math.max(0.1, c.end - c.start));
      clipPlaying = src;
      return true;
    } catch (e) { return false; }
  }

  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  async function recordLine(slot, script) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      snack('The microphone is blocked. Allow microphone access for this app in your phone’s Settings, then try again.');
      return;
    }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    let secs = 12, timer = null, cancelled = false;
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      clearInterval(timer);
      stream.getTracks().forEach(t => t.stop());
      if (cancelled || !chunks.length) return;
      const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' });
      try {
        await loadClip(slot, blob);
        await clipSave(slot, blob);
        if (view === 'grownups') renderGrownups();
        setTimeout(() => playClip(slot), 150);
      } catch (e) {
        snack('That recording couldn’t be saved. Please try again.');
      }
    };
    openModal(`
      <div class="center">
        <div class="rec-dot"></div>
        <h2>Recording…</h2>
        <p class="muted">${esc(LINES[slot.split(':')[0]].label)}. Say something like:</p>
        <p class="rec-script">“${esc(script)}”</p>
        <p class="muted" id="recLeft">Stops by itself in ${secs} seconds</p>
        <button class="big-btn hot" id="recStop">■ Done</button>
        <button class="link-btn" id="recCancel">Cancel</button>
      </div>`, () => { if (mr.state !== 'inactive') { cancelled = true; mr.stop(); } });
    $('recStop').onclick = () => { if (mr.state !== 'inactive') mr.stop(); closeModal(); };
    $('recCancel').onclick = () => { cancelled = true; closeModal(); };
    mr.start();
    timer = setInterval(() => {
      secs--;
      const el = $('recLeft');
      if (el) el.textContent = `Stops by itself in ${secs} second${secs === 1 ? '' : 's'}`;
      if (secs <= 0 && mr.state !== 'inactive') { mr.stop(); closeModal(); }
    }, 1000);
  }

  // ---------- Effects ----------
  const fxBox = $('fx');
  // Emoji particles flying out from a point.
  function burst(x, y, emojis, n = 14, { spread = 160, rise = -120, fall = 260, size = 28 } = {}) {
    if (CALM) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'particle';
      s.textContent = pick(emojis);
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.fontSize = (size * (0.6 + Math.random() * 0.8)) + 'px';
      fxBox.appendChild(s);
      const dx = (Math.random() - 0.5) * spread * 2, dy = rise + Math.random() * rise;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy}px)) scale(1.1) rotate(${(Math.random() - 0.5) * 120}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + fall}px)) scale(.8) rotate(${(Math.random() - 0.5) * 360}deg)`, opacity: 0 },
      ], { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => s.remove();
    }
  }
  // A word floating up (heat) or sinking (cold) from an element.
  function floater(el, text, cls, dir = -1) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'floater ' + cls;
    s.textContent = text;
    s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
    fxBox.appendChild(s);
    s.animate([
      { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: 0.2 },
      { transform: `translate(-50%, calc(-50% + ${dir * 110}px)) scale(1)`, opacity: 0 },
    ], { duration: 1600, easing: 'ease-out' }).onfinish = () => s.remove();
  }
  function shake(el, big) {
    if (CALM || !el) return;
    el.animate([0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ transform: i === 7 ? 'none' : `translate(${(i % 2 ? 1 : -1) * (big ? 10 : 5)}px, ${(i % 3 - 1) * (big ? 4 : 2)}px)` })), { duration: big ? 600 : 380 });
  }
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // A big banner across the screen for alarms and celebrations.
  let alertTimer = 0;
  function bigAlert(kind, icon, title, sub, ms = 3200) {
    const a = $('alert');
    a.className = 'alert ' + kind;
    a.innerHTML = `<div class="alert-box"><div class="alert-ico">${icon}</div><div class="alert-title">${esc(title)}</div>${sub ? `<div class="alert-sub">${esc(sub)}</div>` : ''}</div>`;
    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => a.classList.add('hidden'), ms);
    a.onclick = () => { clearTimeout(alertTimer); a.classList.add('hidden'); };
  }

  // ---------- Snackbar (undo) ----------
  let snackTimer = 0;
  function snack(msg, actionText, onAction) {
    const s = $('snack');
    s.innerHTML = `<span>${esc(msg)}</span>${actionText ? `<button type="button">${esc(actionText)}</button>` : ''}`;
    s.classList.remove('hidden');
    if (actionText) s.querySelector('button').onclick = () => { s.classList.add('hidden'); onAction(); };
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => s.classList.add('hidden'), 6000);
  }

  // ---------- Modal ----------
  const modal = $('modal'), modalCard = $('modalCard');
  let onModalClose = null;
  function openModal(html, onClose, cls = '') {
    modalCard.className = 'modal-card ' + cls;
    modalCard.innerHTML = html;
    modal.classList.remove('hidden');
    onModalClose = onClose || null;
    modalCard.scrollTop = 0;
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

  // ---------- Grown-up lock ----------
  let unlockedUntil = 0;
  const isUnlocked = () => Date.now() < unlockedUntil;
  function renderLock() {
    const open = isUnlocked();
    $('lockPill').textContent = open ? '🔓' : '🔒';
    $('lockPill').classList.toggle('open', open);
    $('lockPill').setAttribute('aria-label', open ? 'Unlocked for grown-ups. Tap to lock.' : 'Locked. Tap to unlock for grown-ups.');
  }
  $('lockPill').onclick = () => {
    if (isUnlocked()) { unlockedUntil = 0; renderLock(); snack('Locked. Only grown-ups can give points.'); if (view === 'grownups') showView('today'); }
    else askGrownup(() => { closeModal(); snack('Unlocked for 15 minutes.'); });
  };
  setInterval(renderLock, 15000);
  // A two-digit × one-digit question: easy for a grown-up, a real roadblock for a kid in a hurry.
  function askGrownup(onPass) {
    if (isUnlocked()) { unlockedUntil = Date.now() + UNLOCK_MS; onPass(); return; }
    const a = 12 + Math.floor(Math.random() * 80), b = 3 + Math.floor(Math.random() * 7);
    openModal(`
      <div class="gate">
        <div class="gate-ico">🔒</div>
        <h2>Grown-ups only</h2>
        <p>What is</p>
        <div class="q">${a} × ${b} = ?</div>
        <input id="gateInput" type="number" inputmode="numeric" autocomplete="off" aria-label="Answer" />
        <button class="big-btn" id="gateOk">Unlock</button>
        <button class="link-btn" data-act="close">Cancel</button>
      </div>`);
    const input = $('gateInput');
    setTimeout(() => input.focus(), 60);
    const check = () => {
      if (Number(input.value) === a * b) { unlockedUntil = Date.now() + UNLOCK_MS; renderLock(); onPass(); }
      else { input.value = ''; input.classList.add('bad'); sfx.nope(); buzz(120); }
    };
    $('gateOk').onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }
  const guarded = fn => state.lock ? askGrownup(fn) : fn();

  // ---------- Thermometer ----------
  const COLD_HOT = [[-100, [70, 60, 200]], [-60, [47, 111, 222]], [-25, [94, 200, 242]], [0, [196, 206, 222]], [25, [255, 196, 61]], [60, [255, 122, 26]], [100, [255, 40, 30]]];
  function colorAt(v) {
    for (let i = 1; i < COLD_HOT.length; i++) {
      const [v1, c1] = COLD_HOT[i];
      if (v <= v1) {
        const [v0, c0] = COLD_HOT[i - 1], t = (v - v0) / (v1 - v0);
        return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * t)).join(',')})`;
      }
    }
    return 'rgb(255,40,30)';
  }
  const yOf = v => 290 - (v + 100) / 200 * 260; // +100 → y 30, -100 → y 290
  function thermoSVG(kid) {
    let ticks = '';
    for (let v = -100; v <= 100; v += 10) {
      const y = yOf(v), major = v % 50 === 0;
      ticks += `<line x1="68" x2="${major ? 82 : 75}" y1="${y}" y2="${y}" stroke="${v === 0 ? '#fff' : 'rgba(255,255,255,.65)'}" stroke-width="${major ? 3 : 1.5}" stroke-linecap="round"/>`;
      if (major) ticks += `<text x="28" y="${y + 4}" text-anchor="end" class="t-lbl">${v > 0 ? '+' : ''}${v}</text>`;
    }
    return `<svg viewBox="0 0 100 380" class="thermo-svg" role="img" aria-label="${esc(nameOf(kid))}'s thermometer">
      <rect x="34" y="8" width="32" height="300" rx="16" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.85)" stroke-width="3"/>
      <circle cx="50" cy="336" r="36" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.85)" stroke-width="3"/>
      <rect x="42" y="18" width="16" height="300" rx="8" fill="rgba(0,0,20,.35)"/>
      <rect class="merc" x="42" y="160" width="16" height="178" rx="8"/>
      <circle class="bulb" cx="50" cy="336" r="28"/>
      <ellipse cx="40" cy="324" rx="7" ry="10" fill="rgba(255,255,255,.55)"/>
      <rect x="45" y="24" width="4" height="270" rx="2" fill="rgba(255,255,255,.35)"/>
      ${ticks}
    </svg>`;
  }

  // The thermometers glide from what's showing to the real temperature.
  const shown = {};     // kid id → temperature on screen
  const tweens = {};
  function paintThermo(kidId, v) {
    const col = document.querySelector(`.kid-col[data-kid="${kidId}"]`);
    if (!col) return;
    const y = yOf(v), c = colorAt(v), z = zoneOf(Math.round(v));
    const merc = col.querySelector('.merc');
    merc.setAttribute('y', y); merc.setAttribute('height', 338 - y);
    merc.style.fill = c; col.querySelector('.bulb').style.fill = c;
    col.querySelector('.temp-num').textContent = signed(Math.round(v)) + '°';
    col.style.setProperty('--merc', c);
    if (col.dataset.zone !== z.cls) {
      ZONES.forEach(x => col.classList.remove(x.cls));
      col.classList.add(z.cls);
      col.dataset.zone = z.cls;
      col.querySelector('.zone').textContent = `${z.icon} ${z.name}`;
      col.querySelector('.kid-face').textContent = z.face;
    }
  }
  function moveThermo(kidId, to, ms = 1200) {
    cancelAnimationFrame(tweens[kidId]);
    const from = shown[kidId] ?? 0;
    if (CALM || from === to) { shown[kidId] = to; paintThermo(kidId, to); return; }
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      shown[kidId] = from + (to - from) * e;
      paintThermo(kidId, shown[kidId]);
      if (p < 1) tweens[kidId] = requestAnimationFrame(step);
      else shown[kidId] = to;
    };
    tweens[kidId] = requestAnimationFrame(step);
  }
  // Whole-screen frost when someone is in a deep freeze, a warm glow when someone is on fire.
  function ambient(t) {
    const temps = state.kids.map(k => tempOf(t, k.id, today()));
    document.body.classList.toggle('frosty', temps.some(v => v <= -75));
    document.body.classList.toggle('toasty', temps.some(v => v >= 75));
  }

  // ---------- Views ----------
  let view = 'today';
  function showView(v) {
    view = v;
    document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    render();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    sfx.tap();
    if (b.dataset.view === 'grownups') askGrownup(() => { closeModal(); showView('grownups'); });
    else showView(b.dataset.view);
  });

  function render() {
    renderLock();
    if (view === 'today') renderToday();
    else if (view === 'prizes') renderPrizes();
    else if (view === 'history') renderHistory();
    else if (view === 'grownups') renderGrownups();
    ambient(tally());
  }

  // ----- Today -----
  const FLAMES = '<span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span>';
  const SNOW = Array.from({ length: 12 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${-(i * 0.73) % 5}s;animation-duration:${4 + (i % 4)}s">❄</i>`).join('');
  const ICICLES = '<svg class="icicles" viewBox="0 0 200 30" preserveAspectRatio="none"><path d="M0 0H200V4L192 6L188 24L182 6L172 8L168 18L163 7L150 6L145 28L138 6L126 5L122 16L117 6L104 6L99 26L93 6L80 7L76 17L71 6L58 5L53 22L47 6L36 7L32 15L27 6L14 6L9 26L4 5L0 4Z" fill="#e4f8ff" stroke="#a9dcf5" stroke-width="1"/></svg>';

  function renderToday() {
    const t = tally(), d = today();
    const hw = isHeatwave(t, d);
    const cols = state.kids.slice(0, 2).map(k => {
      const v = tempOf(t, k.id, d), bank = bankOf(t, k.id), streak = streakOf(t, k.id);
      return `<div class="kid-col" data-kid="${k.id}">
        <div class="snow">${SNOW}</div>${ICICLES}
        <div class="kid-head"><span class="kid-avatar">${esc(k.avatar)}</span><span class="kid-name">${esc(nameOf(k))}</span></div>
        <div class="kid-face" aria-hidden="true">😐</div>
        <button class="thermo" data-give="${k.id}" aria-label="Give ${esc(nameOf(k))} points">${thermoSVG(k)}<div class="flames">${FLAMES}</div><div class="ice-block"></div></button>
        <div class="temp-read"><b class="temp-num">0°</b><span class="zone"></span></div>
        <div class="bank-pill ${bank < 0 ? 'neg' : ''}" data-bank="${k.id}"><span class="bank-ico">${bank < 0 ? '🧊' : '🔥'}</span><b>${bank}</b><small>pts</small></div>
        ${streak > 1 ? `<div class="streak">🔥 ${streak}-day heat streak</div>` : ''}
        <button class="give-btn" data-give="${k.id}">🌡️ Points</button>
      </div>`;
    }).join('');

    const todays = state.events.filter(e => e.day === d && !e.bank).sort((a, b) => b.at - a.at);
    const hwLine = !state.heatwave ? '' : hw
      ? `<div class="heatwave on">🌊🔥 <b>HEAT WAVE!</b> Both of you are ${HOT_DAY}°+ today: <b>+${HEATWAVE_BONUS}</b> bonus points each!</div>`
      : `<div class="heatwave">🌊 <b>Heat Wave bonus:</b> if you <i>both</i> finish today at ${HOT_DAY}° or hotter, you <i>each</i> get +${HEATWAVE_BONUS} points. Team up!</div>`;

    $('view-today').innerHTML = `
      <div class="thermos">${cols}</div>
      ${hwLine}
      <section class="card log-card">
        <h2>Today's weather log</h2>
        ${todays.length ? `<ul class="log">${todays.slice(0, 8).map(logRow).join('')}</ul>` : '<p class="muted">Nothing yet. Every day starts at 0°. Make it a hot one! 🔥</p>'}
      </section>
      <p class="fine">Each day's temperature goes into the bank, and the thermometers start fresh at 0° every morning. Hot days add points. Cold days take them away.</p>`;

    state.kids.slice(0, 2).forEach(k => { paintThermo(k.id, shown[k.id] ?? 0); moveThermo(k.id, tempOf(t, k.id, d)); });
    $('view-today').querySelectorAll('[data-give]').forEach(b => b.onclick = () => { sfx.tap(); guarded(() => openPad(b.dataset.give)); });
  }
  const timeStr = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  function logRow(e, del) {
    const k = kidById(e.kid);
    return `<li class="${e.pts >= 0 ? 'good' : 'bad'}">
      <span class="log-kid">${esc(k.avatar)}</span>
      <span class="log-what"><b>${esc(e.emoji || '')} ${esc(e.label)}</b><small>${esc(nameOf(k))} · ${timeStr(e.at)}${e.bank ? ' · bank only' : ''}</small></span>
      <span class="log-pts">${signed(e.pts)}°</span>
      ${del ? `<button class="log-del" data-del="${e.id}" aria-label="Delete">✕</button>` : ''}
    </li>`;
  }

  // ----- Points pad -----
  function openPad(kidId) {
    const k = kidById(kidId), t = tally(), v = tempOf(t, k.id, today());
    const btn = a => `<button class="act ${a.pts >= 0 ? 'good' : 'bad'}" data-act-id="${a.id}"><span class="act-emo">${esc(a.emoji)}</span><span class="act-lbl">${esc(a.label)}</span><b>${signed(a.pts)}</b></button>`;
    openModal(`
      <div class="pad-head"><span class="kid-avatar">${esc(k.avatar)}</span><div><h2>${esc(nameOf(k))}</h2><div class="muted">Now ${signed(v)}° · ${zoneOf(v).icon} ${zoneOf(v).name}</div></div><button class="x-btn" data-act="close" aria-label="Close">✕</button></div>
      <h3 class="pad-h hot">🔥 Heat it up</h3>
      <div class="acts">${state.actions.filter(a => a.pts > 0).map(btn).join('')}</div>
      <h3 class="pad-h cold">❄️ Cool it down</h3>
      <div class="acts">${state.actions.filter(a => a.pts < 0).map(btn).join('')}</div>
      <details class="custom">
        <summary>Something else…</summary>
        <input id="cReason" type="text" maxlength="40" placeholder="What happened?" />
        <div class="stepper"><button type="button" id="cMinus">−</button><input id="cPts" type="number" inputmode="numeric" value="10" min="1" max="100" aria-label="Points" /><button type="button" id="cPlus">+</button></div>
        <div class="row"><button class="big-btn hot" id="cHot">🔥 Heat up</button><button class="big-btn cold" id="cCold">❄️ Cool down</button></div>
      </details>`, null, 'pad');
    modalCard.querySelectorAll('[data-act-id]').forEach(b => b.onclick = () => {
      const a = state.actions.find(x => x.id === b.dataset.actId);
      closeModal();
      if (a) award(k.id, a.pts, a.label, a.emoji);
    });
    const pts = $('cPts');
    const n = () => Math.max(1, Math.min(100, Math.round(Number(pts.value) || 0)));
    $('cMinus').onclick = () => { pts.value = Math.max(1, n() - 5); };
    $('cPlus').onclick = () => { pts.value = Math.min(100, n() + 5); };
    const custom = sign => { const why = $('cReason').value.trim(); const p = n(); closeModal(); award(k.id, sign * p, why || (sign > 0 ? 'Good choice' : 'Bad choice'), sign > 0 ? '⭐' : '⚠️'); };
    $('cHot').onclick = () => custom(1);
    $('cCold').onclick = () => custom(-1);
  }

  // ---------- Giving points ----------
  function award(kidId, pts, label, emoji) {
    const k = kidById(kidId), d = today();
    const t0 = tally();
    const before = tempOf(t0, k.id, d), bank0 = bankOf(t0, k.id), hw0 = isHeatwave(t0, d);
    const e = { id: uid(), kid: k.id, pts, label, emoji, at: Date.now(), day: d };
    state.events.push(e);
    save();
    if (view !== 'today') showView('today'); else render();
    const t1 = tally();
    const after = tempOf(t1, k.id, d), bank1 = bankOf(t1, k.id), hw1 = isHeatwave(t1, d);
    react(k, before, after, bank1 - bank0, hw0, hw1, pts);
    snack(`${signed(pts)}° ${label} · ${nameOf(k)}`, 'Undo', () => undo(e.id));
  }
  function undo(id) {
    const e = state.events.find(x => x.id === id);
    if (!e) return;
    state.events = state.events.filter(x => x.id !== id);
    save(); sfx.undo(); render();
    snack(`Took back ${signed(e.pts)}° for ${nameOf(kidById(e.kid))}.`);
  }

  // The show: sounds, words, alarms. The biggest line crossed today wins the banner.
  function react(k, before, after, bankDelta, hw0, hw1, pts) {
    const col = document.querySelector(`.kid-col[data-kid="${k.id}"]`);
    const thermo = col && col.querySelector('.thermo'), bankEl = col && col.querySelector('.bank-pill');
    const name = nameOf(k), zb = zoneIx(before), za = zoneIx(after);
    const [cx, cy] = thermo ? centerOf(thermo) : [innerWidth / 2, innerHeight / 2];

    if (pts > 0) {
      floater(thermo, `${after === before ? '+0' : signed(after - before)}°`, 'hot', -1);
      if (bankDelta) setTimeout(() => floater(bankEl, `+${bankDelta} pts`, 'hot small', -1), 300);
      burst(cx, cy + 60, ['🔥', '✨', '🔥', '⭐'], 10, { rise: -140, fall: 120 });
      buzz(30);
      if (before >= MAX) { sfx.heat(); sayLine('maxed', k); return; }
      if (after >= MAX && before < MAX) {
        sfx.fanfare(); buzz([60, 40, 60, 40, 120]);
        burst(innerWidth / 2, innerHeight * 0.45, ['🔥', '🌋', '💥', '⭐', '🏆'], 36, { spread: innerWidth / 1.6, rise: -260, fall: 500, size: 40 });
        bigAlert('fire', '🌋', 'MAXIMUM HEAT!', `${name} hit +100°! The thermometer is about to explode!`, 4000);
        sayLine('max', k, 300);
      } else if (before < 0 && after >= 0) {
        sfx.thaw();
        bigAlert('thaw', '💧', 'THAWING OUT!', `${name} is warming back up. Great comeback!`);
        sayLine('thaw', k, 400);
      } else if (za < zb && ZONES[za].min >= 75) {
        sfx.fire();
        burst(cx, cy, ['🔥', '🔥', '💥'], 24, { rise: -220, fall: 300, size: 36 });
        bigAlert('fire', '🔥', 'ON FIRE!', `${name} is red hot. Keep it burning!`);
        sayLine('fire', k, 300);
      } else if (za < zb && ZONES[za].min >= 40) {
        sfx.heat(); sfx.fire();
        bigAlert('hot', '🌶️', 'HEATING UP!', `${name} is getting HOT!`);
        sayLine('hot', k, 300);
      } else {
        sfx.heat();
        sayLine('good', k);
      }
      if (hw1 && !hw0) setTimeout(() => {
        sfx.fanfare();
        burst(innerWidth / 2, innerHeight * 0.4, ['🌊', '🔥', '☀️', '🎉'], 30, { spread: innerWidth / 1.8, rise: -240, fall: 480, size: 38 });
        bigAlert('wave', '🌊🔥', 'HEAT WAVE!', `You're BOTH ${HOT_DAY}°+! That's +${HEATWAVE_BONUS} bonus points each!`, 4200);
        sayLine('wave', null, 200);
      }, 2200);
      return;
    }

    // Getting colder.
    floater(thermo, `${signed(after - before)}°`, 'cold', 1);
    burst(cx, cy - 40, ['❄️', '🧊', '❄️'], 10, { rise: -60, fall: 260 });
    shake(col);
    buzz(80);
    if (bankDelta < 0) setTimeout(() => { floater(bankEl, `${bankDelta} pts`, 'cold small', 1); pointsVanish(bankEl); shake(bankEl); }, 500);
    if (before <= MIN) {
      sfx.shatter(); sfx.drain(0.4);
      bigAlert('deep', '🦣', 'STILL IN THE ICE AGE', `${name}, it can't get colder, so the points come straight out of the bank!`);
      sayLine('stillIce', k, 300);
    } else if (after <= MIN) {
      sfx.siren(); sfx.shatter(); sfx.drain(1.6);
      shake(document.body, true);
      burst(innerWidth / 2, innerHeight * 0.4, ['🧊', '❄️', '💎', '🥶'], 34, { spread: innerWidth / 1.6, rise: -200, fall: 520, size: 38 });
      bigAlert('deep', '🦣', 'ICE AGE!', `${name} is frozen solid at −100°. Points are disappearing!`, 4200);
      sayLine('ice', k, 400);
    } else if (za > zb && ZONES[za].min <= -99) {
      sfx.siren(); sfx.drain(2.2);
      shake(document.body, true); buzz([200, 100, 200, 100, 200]);
      burst(innerWidth / 2, innerHeight * 0.4, ['🧊', '❄️', '🥶'], 26, { spread: innerWidth / 1.8, rise: -160, fall: 480, size: 34 });
      bigAlert('deep', '🚨', 'DEEP FREEZE ALERT!', `${name} is in a deep freeze. Points are disappearing!`, 4000);
      sayLine('deep', k, 500);
    } else if (za > zb && ZONES[za].min <= -74) {
      sfx.wind(); sfx.crack(0.4); sfx.alarm();
      bigAlert('freeze', '❄️', 'FREEZE WARNING!', `Brrr! ${name} is freezing up. Turn it around!`);
      sayLine('freeze', k, 400);
    } else if (before >= 0 && after < 0) {
      sfx.alarm(); sfx.cold();
      bigAlert('warn', '⚠️', 'WARNING!', `It's getting colder, ${name}…`);
      sayLine('warn', k, 300);
    } else {
      sfx.cold();
      sayLine('bad', k);
    }
    if (hw0 && !hw1) setTimeout(() => {
      sfx.drain();
      bigAlert('warn', '🌊💨', 'HEAT WAVE OVER', `The bonus melted away. Heat back up to ${HOT_DAY}° to get it back!`);
    }, 2400);
  }
  // Little coins flying off the bank and fading into snow.
  function pointsVanish(el) {
    if (!el) return;
    const [x, y] = centerOf(el);
    burst(x, y, ['🪙', '🪙', '💨', '❄️'], 9, { spread: 90, rise: -50, fall: 140, size: 22 });
  }

  // ----- Prizes -----
  let prizeKid = null;
  function renderPrizes() {
    const t = tally();
    if (!state.kids.some(k => k.id === prizeKid)) prizeKid = state.kids[0].id;
    const k = kidById(prizeKid), bank = bankOf(t, k.id);
    const won = state.redeemed.filter(r => r.kid === k.id).sort((a, b) => b.at - a.at).slice(0, 6);
    const prizes = [...state.prizes].sort((a, b) => a.cost - b.cost);
    $('view-prizes').innerHTML = `
      <div class="seg">${state.kids.map(x => `<button class="${x.id === k.id ? 'on' : ''}" data-pk="${x.id}">${esc(x.avatar)} ${esc(nameOf(x))}</button>`).join('')}</div>
      <section class="card bank-card ${bank < 0 ? 'neg' : ''}">
        <div class="bank-big">${bank < 0 ? '🧊' : '🔥'} <b>${bank}</b></div>
        <div class="muted">${bank < 0 ? 'heat points. The bank is frozen! Heat it back up to win prizes.' : 'heat points to spend'}</div>
      </section>
      <ul class="prizes">${prizes.map(p => {
        const pct = Math.max(0, Math.min(100, bank / p.cost * 100)), ok = bank >= p.cost;
        return `<li class="prize ${ok ? 'ready' : ''}">
          <span class="prize-emo">${esc(p.emoji)}</span>
          <div class="prize-mid"><b>${esc(p.name)}</b>
            <div class="bar"><i style="width:${pct}%"></i></div>
            <small>${ok ? 'You can get this now!' : `${p.cost - bank} more to go`}</small></div>
          <button class="buy ${ok ? '' : 'off'}" data-buy="${p.id}">${p.cost}<small>pts</small></button>
        </li>`;
      }).join('')}</ul>
      ${won.length ? `<section class="card"><h2>🏆 Prizes won</h2><ul class="won">${won.map(r => `<li>${esc(r.emoji)} ${esc(r.name)} <small>${new Date(r.at).toLocaleDateString([], { month: 'short', day: 'numeric' })} · −${r.cost}</small></li>`).join('')}</ul></section>` : ''}`;
    $('view-prizes').querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { sfx.tap(); prizeKid = b.dataset.pk; renderPrizes(); });
    $('view-prizes').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const p = state.prizes.find(x => x.id === b.dataset.buy);
      if (!p) return;
      if (bankOf(tally(), k.id) < p.cost) { sfx.nope(); snack(`${nameOf(k)} needs ${p.cost - bankOf(tally(), k.id)} more points for that one.`); return; }
      askGrownup(() => {
        openModal(`
        <div class="center">
          <div class="huge">${esc(p.emoji)}</div>
          <h2>${esc(p.name)}</h2>
          <p>Spend <b>${p.cost}</b> of ${esc(nameOf(k))}'s heat points?</p>
          <button class="big-btn hot" id="buyYes">Yes, cash it in!</button>
          <button class="link-btn" data-act="close">Not now</button>
        </div>`);
        $('buyYes').onclick = () => {
        state.redeemed.push({ id: uid(), kid: k.id, name: p.name, emoji: p.emoji, cost: p.cost, at: Date.now() });
        save(); closeModal(); renderPrizes();
        sfx.cash(); buzz([60, 40, 60, 40, 160]);
        burst(innerWidth / 2, innerHeight * 0.4, [p.emoji, '🎉', '⭐', '🔥', '🪙'], 36, { spread: innerWidth / 1.6, rise: -260, fall: 520, size: 40 });
        bigAlert('fire', esc(p.emoji), 'PRIZE UNLOCKED!', `${nameOf(k)} gets: ${p.name}!`, 4000);
        sayLine('prize', k, 300, p.name);
        };
      });
    });
  }

  // ----- History ("Forecast") -----
  let histDay = null;
  function renderHistory() {
    const t = tally(), d0 = today();
    histDay = histDay || d0;
    const days = Array.from({ length: 14 }, (_, i) => addDays(d0, i - 13));
    const dname = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'narrow' }); };
    const kidChart = k => {
      const temps = Object.keys(t.days).map(d => tempOf(t, k.id, d));
      const hottest = temps.length ? Math.max(...temps) : 0;
      const fires = temps.filter(v => v >= 75).length, freezes = temps.filter(v => v <= -75).length;
      return `<section class="card chart-card">
        <h2>${esc(k.avatar)} ${esc(nameOf(k))}</h2>
        <div class="chart">${days.map(d => {
          const v = tempOf(t, k.id, d), h = Math.abs(v) / 2;
          return `<button class="day ${d === histDay ? 'sel' : ''} ${d === d0 ? 'today' : ''}" data-day="${d}" aria-label="${d}: ${v}°">
            <span class="half up">${v > 0 ? `<i style="height:${h}%;background:${colorAt(v)}"></i>` : ''}</span>
            <span class="half down">${v < 0 ? `<i style="height:${h}%;background:${colorAt(v)}"></i>` : ''}</span>
            <small>${dname(d)}</small></button>`;
        }).join('')}</div>
        <div class="stats">
          <div><b>${streakOf(t, k.id)}</b><small>🔥 heat streak</small></div>
          <div><b>${signed(hottest)}°</b><small>🌡️ hottest day</small></div>
          <div><b>${fires}</b><small>🔥 days on fire</small></div>
          <div><b>${freezes}</b><small>🧊 deep freezes</small></div>
        </div>
      </section>`;
    };
    const evs = state.events.filter(e => e.day === histDay).sort((a, b) => b.at - a.at);
    const [y, m, dd] = histDay.split('-').map(Number);
    const label = histDay === d0 ? 'Today' : histDay === addDays(d0, -1) ? 'Yesterday' : new Date(y, m - 1, dd).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    $('view-history').innerHTML = `
      ${state.kids.slice(0, 2).map(kidChart).join('')}
      <section class="card">
        <h2>${label}</h2>
        <div class="day-sum">${state.kids.slice(0, 2).map(k => { const v = tempOf(t, k.id, histDay); return `<span>${esc(k.avatar)} ${signed(v)}° ${zoneOf(v).icon}</span>`; }).join('')}${isHeatwave(t, histDay) ? `<span>🌊 Heat Wave +${HEATWAVE_BONUS}</span>` : ''}</div>
        ${evs.length ? `<ul class="log">${evs.map(e => logRow(e, true)).join('')}</ul>` : '<p class="muted">Nothing logged this day.</p>'}
        <p class="fine">Tap a day in the charts to see it. Grown-ups can tap ✕ to remove a mistake.</p>
      </section>`;
    $('view-history').querySelectorAll('[data-day]').forEach(b => b.onclick = () => { sfx.tap(); histDay = b.dataset.day; renderHistory(); });
    $('view-history').querySelectorAll('[data-del]').forEach(b => b.onclick = () => askGrownup(() => {
      closeModal();
      const e = state.events.find(x => x.id === b.dataset.del);
      state.events = state.events.filter(x => x.id !== b.dataset.del);
      save(); sfx.undo(); renderHistory();
      if (e) snack(`Removed ${signed(e.pts)}° ${e.label}.`, 'Undo', () => { state.events.push(e); save(); renderHistory(); });
    }));
  }

  // ----- Grown-ups -----
  let confirmErase = false;
  let voiceFor = ''; // '' = recordings for both boys, or a boy's id
  function renderGrownups() {
    if (!isUnlocked()) { showView('today'); return; }
    if (voiceFor && !state.kids.some(k => k.id === voiceFor)) voiceFor = '';
    unlockedUntil = Date.now() + UNLOCK_MS; // working in here keeps it unlocked
    const t = tally();
    const actRow = a => `<li data-aid="${a.id}">
        <input class="emo-in" data-f="emoji" value="${esc(a.emoji)}" maxlength="4" aria-label="Emoji" />
        <input class="lbl-in" data-f="label" value="${esc(a.label)}" maxlength="40" aria-label="What" />
        <input class="pts-in" data-f="pts" type="number" inputmode="numeric" value="${Math.abs(a.pts)}" min="1" max="100" aria-label="Points" />
        <button class="del" data-del-act="${a.id}" aria-label="Remove">✕</button></li>`;
    const prizeRow = p => `<li data-pid="${p.id}">
        <input class="emo-in" data-f="emoji" value="${esc(p.emoji)}" maxlength="4" aria-label="Emoji" />
        <input class="lbl-in" data-f="name" value="${esc(p.name)}" maxlength="40" aria-label="Prize" />
        <input class="pts-in" data-f="cost" type="number" inputmode="numeric" value="${p.cost}" min="1" max="99999" aria-label="Cost" />
        <button class="del" data-del-prize="${p.id}" aria-label="Remove">✕</button></li>`;
    const toggle = (key, label, hint) => `<label class="toggle"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" data-toggle="${key}" ${state[key] ? 'checked' : ''}/></label>`;
    $('view-grownups').innerHTML = `
      <section class="card">
        <h2>👦👦 The boys</h2>
        ${state.kids.map((k, i) => `<div class="kid-edit">
          <button class="avatar-pick" data-av="${i}" aria-label="Change picture">${esc(k.avatar)}</button>
          <input data-name="${i}" value="${esc(k.name)}" maxlength="20" placeholder="Name" />
          <span class="muted">${bankOf(t, k.id)} pts</span>
        </div>`).join('')}
      </section>
      <section class="card">
        <h2>⚙️ Settings</h2>
        ${toggle('lock', 'Lock giving points', 'Ask a grown-up question first, so the boys can look but not touch. Stays unlocked 15 minutes.')}
        ${toggle('sound', 'Sound effects', 'Sizzles, alarms, sirens and cracking ice.')}
        ${toggle('voice', 'Announcer voice', 'The phone says "Warning! It\'s getting colder!" and so on.')}
        ${toggle('heatwave', 'Heat Wave bonus', `+${HEATWAVE_BONUS} each when both end the day at ${HOT_DAY}°+.`)}
      </section>
      <section class="card" id="voiceCard">
        <h2>🎙️ Your voice</h2>
        <p class="fine">Record yourself saying any line, and the boys hear you instead of the phone's voice. Record once for both boys, or pick a boy to record his own version with his name in it.</p>
        <div class="seg voice-seg">${[{ id: '', label: '👦👦 Both' }, ...state.kids.map(k => ({ id: k.id, label: `${k.avatar} ${nameOf(k)}` }))].map(o => `<button class="${o.id === voiceFor ? 'on' : ''}" data-vfor="${o.id}">${esc(o.label)}</button>`).join('')}</div>
        ${canRecord() ? '' : '<p class="fine">This phone’s browser can’t record. Try Safari on iPhone or Chrome on Android.</p>'}
        <ul class="voice-list">${Object.entries(LINES).filter(([, l]) => !(voiceFor && l.shared)).map(([id, l]) => {
          const kid = voiceFor ? kidById(voiceFor) : null, slot = voiceFor ? `${id}:${voiceFor}` : id;
          const mine = !!clips[slot], fallback = !mine && voiceFor && clips[id];
          return `<li>
            <div class="vl-head"><span>${esc(l.label)}</span><span class="badge ${mine || fallback ? 'mine' : ''}">${mine ? 'Your voice' : fallback ? 'Your voice (both)' : 'Phone voice'}</span></div>
            <div class="vl-script">“${esc(scriptOf(id, kid ? nameOf(kid) : ''))}”</div>
            <div class="row">
              <button class="small-btn hot" data-rec="${id}" ${canRecord() ? '' : 'disabled'}>🎙️ ${mine ? 'Re-record' : 'Record'}</button>
              <button class="small-btn" data-play="${id}">▶ Play</button>
              ${mine ? `<button class="small-btn" data-unrec="${id}">🗑️</button>` : ''}
            </div>
          </li>`;
        }).join('')}</ul>
        <p class="fine">Recordings stay on this phone. They aren’t shared by family sync or saved in the backup file, so record on each phone you use.</p>
      </section>
      <section class="card">
        <h2>🔥 Good choices</h2>
        <ul class="edit-list" data-list="good">${state.actions.filter(a => a.pts > 0).map(actRow).join('')}</ul>
        <button class="small-btn hot" data-add-act="1">+ Add a good choice</button>
      </section>
      <section class="card">
        <h2>❄️ Bad choices</h2>
        <p class="fine">Points shown here are taken away.</p>
        <ul class="edit-list" data-list="bad">${state.actions.filter(a => a.pts < 0).map(actRow).join('')}</ul>
        <button class="small-btn cold" data-add-act="-1">+ Add a bad choice</button>
      </section>
      <section class="card">
        <h2>🎁 Prizes</h2>
        <ul class="edit-list">${state.prizes.map(prizeRow).join('')}</ul>
        <button class="small-btn hot" id="addPrize">+ Add a prize</button>
      </section>
      <section class="card">
        <h2>🏦 Adjust a bank</h2>
        <p class="fine">Adds or takes away bank points without moving today's thermometer (a starting balance, or a fix).</p>
        <div class="adj">
          <select id="adjKid">${state.kids.map(k => `<option value="${k.id}">${esc(k.avatar)} ${esc(nameOf(k))}</option>`).join('')}</select>
          <input id="adjPts" type="number" inputmode="numeric" placeholder="± points" />
          <button class="small-btn" id="adjGo">Apply</button>
        </div>
      </section>
      <section class="card">
        <h2>☁️ Family sync</h2>
        <div data-family-sync></div>
      </section>
      <section class="card">
        <h2>💾 Backup</h2>
        <div class="row"><button class="small-btn" id="bkDown">Download backup</button><button class="small-btn" id="bkUp">Restore backup</button></div>
        <input type="file" id="bkFile" accept="application/json,.json" hidden />
        <button class="small-btn danger" id="erase">${confirmErase ? 'Tap again to erase EVERYTHING' : 'Erase everything'}</button>
      </section>`;

    const root = $('view-grownups');
    root.querySelectorAll('[data-name]').forEach(inp => inp.onchange = () => { state.kids[+inp.dataset.name].name = inp.value.trim(); save(); });
    root.querySelectorAll('[data-av]').forEach(b => b.onclick = () => pickAvatar(+b.dataset.av));
    root.querySelectorAll('[data-vfor]').forEach(b => b.onclick = () => { sfx.tap(); voiceFor = b.dataset.vfor; renderGrownups(); });
    const vKid = () => voiceFor ? kidById(voiceFor) : null;
    const vSlot = id => voiceFor ? `${id}:${voiceFor}` : id;
    root.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => recordLine(vSlot(b.dataset.rec), scriptOf(b.dataset.rec, vKid() ? nameOf(vKid()) : '')));
    root.querySelectorAll('[data-play]').forEach(b => b.onclick = () => {
      const id = b.dataset.play, clip = clips[vSlot(id)] ? vSlot(id) : clipFor(id, vKid());
      if (clip) playClip(clip);
      else say(scriptOf(id, vKid() ? nameOf(vKid()) : ''), LINES[id].mood);
    });
    root.querySelectorAll('[data-unrec]').forEach(b => b.onclick = async () => {
      const slot = vSlot(b.dataset.unrec);
      delete clips[slot];
      try { await clipDelete(slot); } catch (e) { /* already gone */ }
      renderGrownups();
    });
    root.querySelectorAll('[data-toggle]').forEach(c => c.onchange = () => { state[c.dataset.toggle] = c.checked; save(); });
    root.querySelectorAll('[data-aid] input').forEach(inp => inp.onchange = () => {
      const a = state.actions.find(x => x.id === inp.closest('[data-aid]').dataset.aid);
      if (!a) return;
      const f = inp.dataset.f;
      if (f === 'pts') { const n = Math.max(1, Math.min(100, Math.round(Math.abs(Number(inp.value)) || 1))); a.pts = Math.sign(a.pts) * n; inp.value = n; }
      else a[f] = inp.value.trim() || a[f];
      save();
    });
    root.querySelectorAll('[data-pid] input').forEach(inp => inp.onchange = () => {
      const p = state.prizes.find(x => x.id === inp.closest('[data-pid]').dataset.pid);
      if (!p) return;
      const f = inp.dataset.f;
      if (f === 'cost') { p.cost = Math.max(1, Math.round(Math.abs(Number(inp.value)) || 1)); inp.value = p.cost; }
      else p[f] = inp.value.trim() || p[f];
      save();
    });
    root.querySelectorAll('[data-del-act]').forEach(b => b.onclick = () => { state.actions = state.actions.filter(a => a.id !== b.dataset.delAct); save(); renderGrownups(); });
    root.querySelectorAll('[data-del-prize]').forEach(b => b.onclick = () => { state.prizes = state.prizes.filter(p => p.id !== b.dataset.delPrize); save(); renderGrownups(); });
    root.querySelectorAll('[data-add-act]').forEach(b => b.onclick = () => {
      const s = Number(b.dataset.addAct);
      state.actions.push({ id: uid(), emoji: s > 0 ? '⭐' : '⚠️', label: s > 0 ? 'New good choice' : 'New bad choice', pts: s * 10 });
      save(); renderGrownups();
      const last = root.querySelector(`[data-list="${s > 0 ? 'good' : 'bad'}"] li:last-child .lbl-in`);
      if (last) { last.focus(); last.select(); }
    });
    $('addPrize').onclick = () => {
      state.prizes.push({ id: uid(), emoji: pick(PRIZE_EMOJIS), name: 'New prize', cost: 100 });
      save(); renderGrownups();
      const last = root.querySelector('[data-pid]:last-child .lbl-in');
      if (last) { last.focus(); last.select(); }
    };
    $('adjGo').onclick = () => {
      const n = Math.round(Number($('adjPts').value) || 0);
      if (!n) { sfx.nope(); return; }
      state.events.push({ id: uid(), kid: $('adjKid').value, pts: n, label: 'Bank adjustment', emoji: '🏦', at: Date.now(), day: today(), bank: true });
      save(); sfx.undo(); renderGrownups();
      snack(`${signed(n)} points ${n > 0 ? 'added to' : 'taken from'} ${nameOf(kidById($('adjKid').value))}'s bank.`);
    };
    $('bkDown').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }));
      a.download = `heat-check-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $('bkUp').onclick = () => $('bkFile').click();
    $('bkFile').onchange = async () => {
      const f = $('bkFile').files[0];
      if (!f) return;
      try {
        const s = JSON.parse(await f.text());
        if (!s || !Array.isArray(s.kids) || !Array.isArray(s.events)) throw new Error('not a backup');
        localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); save(); render();
        snack('Backup restored.');
      } catch (e) { snack('That file isn’t a Heat Check backup.'); }
    };
    $('erase').onclick = () => {
      if (!confirmErase) { confirmErase = true; renderGrownups(); setTimeout(() => { confirmErase = false; if (view === 'grownups') renderGrownups(); }, 5000); return; }
      confirmErase = false;
      const kids = state.kids.map(k => ({ ...k }));
      state = structuredClone(DEFAULT_STATE);
      state.kids = kids; state.setupDone = true;
      save(); Object.keys(shown).forEach(k => delete shown[k]);
      showView('today'); snack('Everything erased. Fresh start at 0°.');
    };
  }
  function pickAvatar(i, after) {
    openModal(`<h2>Pick a picture for ${esc(nameOf(state.kids[i]))}</h2>
      <div class="avatars">${AVATARS.map(a => `<button data-a="${a}" class="${state.kids[i].avatar === a ? 'on' : ''}">${a}</button>`).join('')}</div>
      <button class="link-btn" data-act="close">Cancel</button>`);
    modalCard.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      state.kids[i].avatar = b.dataset.a; save(); sfx.tap();
      closeModal();
      if (after) after(); else render();
    });
  }

  // ---------- First run ----------
  function firstRun() {
    openModal(`
      <div class="center">
        <div class="huge">🌡️</div>
        <h2>Welcome to Heat Check!</h2>
        <p>Each boy gets a thermometer. Good choices make it <b class="hot-t">HOTTER 🔥</b>. Bad choices make it <b class="cold-t">COLDER ❄️</b>. Every day starts at 0°, and each day's temperature goes into his bank of points for prizes.</p>
        <div class="kid-edit"><button class="avatar-pick" data-fav="0">${esc(state.kids[0].avatar)}</button><input id="n0" placeholder="First boy's name" maxlength="20" value="${esc(state.kids[0].name)}" /></div>
        <div class="kid-edit"><button class="avatar-pick" data-fav="1">${esc(state.kids[1].avatar)}</button><input id="n1" placeholder="Second boy's name" maxlength="20" value="${esc(state.kids[1].name)}" /></div>
        <button class="big-btn hot" id="go">Let's turn up the heat!</button>
        <p class="fine">You can change names, choices, points and prizes any time in 🔒 Grown-ups.</p>
      </div>`);
    const keep = () => { state.kids[0].name = $('n0').value.trim(); state.kids[1].name = $('n1').value.trim(); };
    modalCard.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => { keep(); pickAvatar(+b.dataset.fav, firstRun); });
    $('go').onclick = () => {
      keep(); state.setupDone = true; save(); closeModal(); render();
      sfx.fire();
      say(`Welcome ${state.kids.map(nameOf).join(' and ')}! Good choices heat you up. Bad choices freeze you out. Let's go!`);
    };
  }

  // ---------- Start ----------
  render();
  loadAllClips();
  if (!state.setupDone) firstRun();
  // A new day while the app sits open: the thermometers drop back to 0°.
  let lastDay = today();
  const checkDay = () => { if (today() !== lastDay) { lastDay = today(); histDay = null; render(); } };
  setInterval(checkDay, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkDay(); renderLock(); } });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update(); document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }); })
      .catch(() => { /* offline support is optional */ });
  }

  // ---------- Family sync ----------
  // Shares the scores between phones once someone signs in (see ../family-sync.js).
  if (window.FamilySync) FamilySync.attach(STORE_KEY, {
    label: 'Heat Check',
    get: () => state,
    apply: json => {
      localStorage.setItem(STORE_KEY, json); state = load();
      if (state.setupDone && $('n0')) closeModal(); // the other phone already did the welcome screen
      const typing = view === 'grownups' && document.activeElement && document.activeElement.closest('#view-grownups input');
      if (!typing) render();
    },
  });
})();

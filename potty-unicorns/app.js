/* Unicorn Potty Party — a potty training tracker for little kids.
 * Every trip to the potty (pee or poop) grows a unicorn: egg, hatch, toddler, kid, grown-up.
 * Five trips make one grown-up unicorn; a set number of unicorns (5 to start) earns a prize.
 * Everything is stored on this phone: progress in localStorage, recorded voice lines in IndexedDB. */
(() => {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'potty-unicorns-v1';
  const TRIPS_PER_UNICORN = 5;
  const REPEAT_MS = 2 * 60 * 1000; // the same button again within 2 minutes doesn't count (no pile of taps)
  const PRIZE_EMOJIS = ['🎁', '🍦', '🧸', '🎈', '🍩', '🧁', '🎨', '📚', '🛝', '🎠', '👑', '🦄', '🍭', '🪀', '👗', '🎀'];
  const CHEERS = ['Hooray!', 'Yay!', 'You did it!', 'Woo-hoo!', 'Super job!', 'Sparkle power!', 'Amazing!'];
  const STAGE_NAMES = ['Egg', 'Hatch', 'Toddler', 'Kid', 'Grown-up'];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

  // ---------- State ----------
  const DEFAULT_STATE = {
    version: 1,
    setupDone: false,
    name: '',
    sound: true,
    voice: true,
    trips: [],          // [{ id, k: 'pee' | 'poop', at: ms }] — every 5 grows one unicorn
    goal: 5,            // unicorns needed for the prize
    prize: { name: 'A special surprise', emoji: '🎁', photo: '' },
    spent: 0,           // unicorns already traded in for prizes
    prizesWon: [],      // [{ name, at }]
    celebrated: 0,      // highest "unicorns earned" count whose prize party already played
  };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw));
        s.prize = Object.assign(structuredClone(DEFAULT_STATE.prize), s.prize);
        if (!Array.isArray(s.trips)) s.trips = [];
        if (!Array.isArray(s.prizesWon)) s.prizesWon = [];
        return s;
      }
    } catch (e) { /* fall through to defaults */ }
    return structuredClone(DEFAULT_STATE);
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save. The phone storage may be full.'); }
  }
  // Ask the browser not to clear this app's storage when the phone runs low on space.
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* optional */ }

  const earned = () => Math.floor(state.trips.length / TRIPS_PER_UNICORN);
  const herdSize = () => Math.max(0, earned() - state.spent);
  const stageNow = () => state.trips.length % TRIPS_PER_UNICORN; // 0 = waiting for an egg, 1..4 = egg..kid
  const prizeReady = () => herdSize() >= state.goal;
  const kidName = () => state.name || 'sweetie';

  // ---------- Unicorn drawings ----------
  const LINE = '#5b3f94';
  const MOM_LOOK = { coat: '#ffffff', shade: '#ece4fb', muzzle: '#ffeaf4', hoof: '#ff8fc8', mane: ['#ff5fae', '#ff9fd0', '#c39bff', '#9f84f5', '#ff9fd0'] };
  // Each new unicorn gets its own colors, so the family looks different.
  const LOOKS = [
    { coat: '#ffffff', shade: '#ece4fb', muzzle: '#fff0f7', hoof: '#c6a8ff', mane: ['#ff7ab8', '#ffb05c', '#ffe066', '#7fe3c6', '#7fb2ff', '#b98cff'] },
    { coat: '#ffd9ee', shade: '#f7c3df', muzzle: '#fff2f8', hoof: '#ff7ab8', mane: ['#b98cff', '#8fb8ff', '#ffffff', '#b98cff'] },
    { coat: '#e6dcff', shade: '#d3c4fb', muzzle: '#f7f2ff', hoof: '#9b7bea', mane: ['#ff7ab8', '#ffd1ea', '#ffe066', '#ff7ab8'] },
    { coat: '#d5f7ec', shade: '#bdeedf', muzzle: '#f0fff9', hoof: '#3fbf9a', mane: ['#ff9fcf', '#c39bff', '#8fb8ff', '#ff9fcf'] },
    { coat: '#fff1c9', shade: '#fbe2a0', muzzle: '#fffaf0', hoof: '#e0a800', mane: ['#ff7ab8', '#ff9f5a', '#c39bff', '#ff7ab8'] },
    { coat: '#dbefff', shade: '#c3e2fb', muzzle: '#f3faff', hoof: '#5a9cf0', mane: ['#c39bff', '#ff8fc8', '#7fe3c6', '#c39bff'] },
  ];
  const lookFor = i => LOOKS[((i % LOOKS.length) + LOOKS.length) % LOOKS.length];

  const AGES = {
    baby:    { rx: 30, ry: 22, leg: 14, lw: 12, hr: 31, horn: 6,  neck: 3,  tail: 4, scale: 0.6 },
    toddler: { rx: 37, ry: 25, leg: 21, lw: 12, hr: 30, horn: 13, neck: 8,  tail: 5, scale: 0.72 },
    kid:     { rx: 45, ry: 29, leg: 30, lw: 13, hr: 28, horn: 21, neck: 14, tail: 6, scale: 0.86 },
    grown:   { rx: 54, ry: 33, leg: 40, lw: 14, hr: 27, horn: 31, neck: 22, tail: 7, scale: 1 },
  };
  const f1 = n => Math.round(n * 10) / 10;

  // A side-view unicorn facing right, standing on y=194 in a 200×200 box.
  function unicornSVG(age, look, o = {}) {
    const p = AGES[age], L = look, hr = p.hr;
    const gy = 194, cx = 86, cy = gy - p.leg - p.ry * 0.7;
    const hx = cx + p.rx * 0.82, hy = cy - p.ry - p.neck - hr * 0.3;
    const legTop = cy + p.ry * 0.15;
    const leg = (f, fill) => {
      const x = cx + f * p.rx - p.lw / 2;
      return `<rect x="${f1(x)}" y="${f1(legTop)}" width="${p.lw}" height="${f1(gy - legTop)}" rx="${p.lw / 2}" fill="${fill}"/>`;
    };
    const hoof = f => `<rect x="${f1(cx + f * p.rx - p.lw / 2)}" y="${gy - 8}" width="${p.lw}" height="8" rx="3" fill="${L.hoof}"/>`;
    const neck = `<path d="M${f1(cx + p.rx * 0.3)} ${f1(cy - p.ry * 0.55)} L${f1(hx - hr * 0.55)} ${f1(hy + hr * 0.1)} L${f1(hx + hr * 0.45)} ${f1(hy + hr * 0.6)} L${f1(cx + p.rx * 0.98)} ${f1(cy - p.ry * 0.05)} Z" fill="${L.coat}"/>`;
    const ear = `<path d="M${f1(hx - hr * 0.6)} ${f1(hy - hr * 0.5)} L${f1(hx - hr * 0.42)} ${f1(hy - hr * 1.38)} L${f1(hx - hr * 0.08)} ${f1(hy - hr * 0.8)} Z" fill="${L.coat}"/>`;
    const snout = `<ellipse cx="${f1(hx + hr * 0.72)}" cy="${f1(hy + hr * 0.32)}" rx="${f1(hr * 0.64)}" ry="${f1(hr * 0.52)}" fill="${L.muzzle}"/>`;
    // Silhouette: drawn once fat in the outline color, then again on top in the fill colors,
    // so the body, neck and head share one clean outline.
    const shapes = [
      leg(-0.62, L.shade), leg(0.38, L.shade),
      `<ellipse cx="${cx}" cy="${f1(cy)}" rx="${p.rx}" ry="${p.ry}" fill="${L.coat}"/>`,
      leg(-0.3, L.coat), leg(0.68, L.coat),
      neck, ear,
      `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${hr}" fill="${L.coat}"/>`,
      snout,
    ].join('');
    const outline = shapes.replace(/fill="[^"]*"/g, `fill="${LINE}"`);

    // Tail: a curl of colored puffs.
    let tail = '';
    const tx = cx - p.rx * 0.9, ty = cy - p.ry * 0.35;
    for (let i = 0; i < p.tail; i++) {
      const x = tx - 6 - i * 4.5 + Math.max(0, i - p.tail / 2) * 7, y = ty + i * 9;
      tail += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(12 - i * 0.7)}" fill="${L.mane[i % L.mane.length]}" stroke="${LINE}" stroke-width="3"/>`;
    }
    // Mane along the back of the neck.
    let mane = '';
    const m0 = { x: hx - hr * 0.2, y: hy - hr * 0.92 }, m1 = { x: cx + p.rx * 0.32, y: cy - p.ry * 0.8 };
    const mn = 4 + Math.round(p.neck / 6);
    for (let i = 0; i < mn; i++) {
      const t = i / (mn - 1);
      const x = m0.x + (m1.x - m0.x) * t - Math.sin(t * Math.PI) * hr * 0.45, y = m0.y + (m1.y - m0.y) * t;
      mane += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(hr * 0.36)}" fill="${L.mane[i % L.mane.length]}" stroke="${LINE}" stroke-width="3"/>`;
    }
    // Horn with swirl stripes.
    const hb = { x: hx + hr * 0.08, y: hy - hr * 0.86 }, tip = { x: hb.x + hr * 0.3 + p.horn * 0.35, y: hb.y - p.horn - 4 };
    const hw = 5 + p.horn * 0.12;
    let stripes = '';
    for (let i = 1; i <= Math.floor(p.horn / 9); i++) {
      const t = i / (Math.floor(p.horn / 9) + 1);
      const mx = hb.x + (tip.x - hb.x) * t, my = hb.y + (tip.y - hb.y) * t, w = hw * (1 - t) + 1;
      stripes += `<path d="M${f1(mx - w)} ${f1(my + 2)} L${f1(mx + w)} ${f1(my - 2)}" stroke="#e0a800" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    const horn = `<path d="M${f1(hb.x - hw)} ${f1(hb.y + 2)} L${f1(tip.x)} ${f1(tip.y)} L${f1(hb.x + hw)} ${f1(hb.y - 1)} Z" fill="#ffd84d" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>${stripes}`;
    const forelock = `<circle cx="${f1(hx - hr * 0.2)}" cy="${f1(hy - hr * 0.72)}" r="${f1(hr * 0.3)}" fill="${L.mane[1 % L.mane.length]}" stroke="${LINE}" stroke-width="3"/>`;
    // Face
    const ex = hx + hr * 0.16, ey = hy - hr * 0.06;
    const face = `
      <ellipse cx="${f1(ex)}" cy="${f1(ey)}" rx="${f1(hr * 0.17)}" ry="${f1(hr * 0.23)}" fill="#2b1846"/>
      <circle cx="${f1(ex + hr * 0.06)}" cy="${f1(ey - hr * 0.09)}" r="${f1(hr * 0.07)}" fill="#fff"/>
      <circle cx="${f1(ex - hr * 0.06)}" cy="${f1(ey + hr * 0.08)}" r="${f1(hr * 0.035)}" fill="#fff"/>
      <path d="M${f1(ex - hr * 0.12)} ${f1(ey - hr * 0.2)} l-5 -6 M${f1(ex)} ${f1(ey - hr * 0.24)} l-1 -7 M${f1(ex + hr * 0.12)} ${f1(ey - hr * 0.2)} l3 -6" stroke="#2b1846" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${f1(hx - hr * 0.12)}" cy="${f1(hy + hr * 0.36)}" r="${f1(hr * 0.17)}" fill="#ff8fc8" opacity=".6"/>
      <ellipse cx="${f1(hx + hr * 1.06)}" cy="${f1(hy + hr * 0.2)}" rx="2.5" ry="3.2" fill="${LINE}"/>
      <path d="M${f1(hx + hr * 0.62)} ${f1(hy + hr * 0.52)} Q${f1(hx + hr * 0.86)} ${f1(hy + hr * 0.7)} ${f1(hx + hr * 1.08)} ${f1(hy + hr * 0.5)}" fill="none" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M${f1(hx - hr * 0.48)} ${f1(hy - hr * 0.62)} L${f1(hx - hr * 0.4)} ${f1(hy - hr * 1.1)} L${f1(hx - hr * 0.2)} ${f1(hy - hr * 0.78)} Z" fill="#ffc2e0"/>`;
    // Mommy wears a flower behind her ear.
    const flower = o.flower ? (() => {
      const fx = hx - hr * 0.78, fy = hy - hr * 0.55;
      let s = '';
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        s += `<circle cx="${f1(fx + Math.cos(a) * 7)}" cy="${f1(fy + Math.sin(a) * 7)}" r="6" fill="#ff8fc8" stroke="${LINE}" stroke-width="2"/>`;
      }
      return s + `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="5" fill="#ffe066" stroke="${LINE}" stroke-width="2"/>`;
    })() : '';
    // A just-hatched baby sits in the bottom half of its shell.
    const shell = o.shell ? `
      <path d="M44 174 L56 164 L68 176 L82 162 L96 176 L110 162 L124 176 L138 162 L150 174 C152 192 128 199 98 199 C68 199 42 192 44 174 Z" fill="#fff4fb" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="70" cy="187" r="5" fill="#ffb3da"/><circle cx="100" cy="190" r="4" fill="#c9b5ff"/><circle cx="128" cy="185" r="5" fill="#9fe8d2"/>` : '';
    const sc = o.noScale ? 1 : o.shell ? 0.85 : p.scale;
    const body = `<g stroke="${LINE}" stroke-width="7" stroke-linejoin="round">${outline}</g>${tail}${shapes}${mane}${hoof(-0.3)}${hoof(0.68)}${hoof(-0.62)}${hoof(0.38)}${forelock}${horn}${face}${flower}`;
    return `<svg viewBox="0 0 200 200" class="${o.cls || ''}" aria-hidden="true"><g transform="translate(100 ${gy}) scale(${sc}) translate(-100 ${-gy})">${body}</g>${shell}</svg>`;
  }

  function eggSVG(o = {}) {
    const crack = o.cracked
      ? `<path d="M46 118 L62 104 L76 120 L92 102 L106 120 L122 102 L136 118 L152 106" fill="none" stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`
      : '';
    return `<svg viewBox="0 0 200 200" class="${o.cls || ''}" aria-hidden="true">
      <path d="M100 28 C148 28 164 108 160 140 C156 178 128 194 100 194 C72 194 44 178 40 140 C36 108 52 28 100 28 Z" fill="#fff4fb" stroke="${LINE}" stroke-width="6"/>
      <circle cx="78" cy="96" r="12" fill="#ffb3da"/><circle cx="124" cy="80" r="9" fill="#c9b5ff"/>
      <circle cx="118" cy="146" r="14" fill="#9fe8d2"/><circle cx="70" cy="156" r="8" fill="#ffe066"/>
      <circle cx="96" cy="124" r="6" fill="#ff9fd0"/>
      <path d="M70 60 Q74 46 84 42" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      ${crack}
    </svg>`;
  }

  function nestSVG() {
    let straw = '';
    for (let i = 0; i < 9; i++) straw += `<path d="M${30 + i * 16} ${168 + (i % 2) * 6} q14 -12 30 0" fill="none" stroke="#c98a3c" stroke-width="4" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 200 200" class="actor kid" aria-hidden="true">
      <ellipse cx="100" cy="176" rx="82" ry="22" fill="#e9b26a" stroke="${LINE}" stroke-width="5"/>
      <ellipse cx="100" cy="168" rx="58" ry="10" fill="#b8792f"/>
      ${straw}
      <path d="M100 70 l7 18 19 2 -15 12 5 19 -16 -10 -16 10 5 -19 -15 -12 19 -2z" fill="#ffe066" stroke="#e0a800" stroke-width="3" stroke-linejoin="round" opacity=".9"/>
      <text x="100" y="140" font-size="34" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" fill="${LINE}">?</text>
    </svg>`;
  }

  // Meadow background: rainbow, clouds, hills and flowers.
  const SCENE_BG = (() => {
    const bands = ['#ff8fb8', '#ffb86b', '#ffe57a', '#9fe8b2', '#8fc4ff', '#c4a3ff'];
    let rainbow = '';
    bands.forEach((c, i) => { rainbow += `<path d="M${40 + i * 9} 180 A${120 - i * 9} ${120 - i * 9} 0 0 1 ${280 - i * 9} 180" fill="none" stroke="${c}" stroke-width="9" opacity=".75"/>`; });
    const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff"><circle cx="0" cy="0" r="14"/><circle cx="16" cy="-6" r="17"/><circle cx="34" cy="0" r="13"/><rect x="0" y="0" width="34" height="13"/></g>`;
    let flowers = '';
    [[22, 200, '#ff8fc8'], [60, 212, '#ffe066'], [262, 206, '#c39bff'], [298, 196, '#ff8fc8'], [150, 214, '#fff']].forEach(([x, y, c]) => {
      flowers += `<g transform="translate(${x} ${y})"><circle r="4" cx="-4" fill="${c}"/><circle r="4" cx="4" fill="${c}"/><circle r="4" cy="-4" fill="${c}"/><circle r="4" cy="4" fill="${c}"/><circle r="3" fill="#ffcf3d"/></g>`;
    });
    return `<svg class="bg" viewBox="0 0 320 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      ${rainbow}
      ${cloud(28, 40, 1)}${cloud(232, 28, 0.85)}${cloud(150, 62, 0.6)}
      <path d="M0 176 Q80 146 170 170 T320 160 V220 H0 Z" fill="#b7ea9f"/>
      <path d="M0 196 Q120 168 230 190 T320 186 V220 H0 Z" fill="#9be08a"/>
      ${flowers}
    </svg>`;
  })();

  // ---------- Sound ----------
  let audioCtx = null;
  function getCtx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  // Phones only allow sound after a tap; wake the audio up on the first touch.
  document.addEventListener('pointerdown', () => { try { const c = getCtx(); if (c.state === 'suspended') c.resume(); } catch (e) { /* no audio */ } }, true);
  function tone(freq, start, dur, type = 'sine', vol = 0.16) {
    if (!state.sound) return;
    try {
      const ctx = getCtx(), t0 = ctx.currentTime + start;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* no audio */ }
  }
  // A glassy bell: a sine plus a quiet overtone, fading slowly.
  const bell = (f, t, vol = 0.12) => { tone(f, t, 0.9, 'sine', vol); tone(f * 2.76, t, 0.35, 'sine', vol * 0.25); };
  const sfx = {
    tap: () => tone(880, 0, 0.08, 'triangle', 0.1),
    sparkle: () => [1319, 1568, 1760, 2093, 2349, 2637, 3136].forEach((f, i) => bell(f, i * 0.055, 0.09)),
    grow: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.09, 0.13)); setTimeout(sfx.sparkle, 450); },
    fanfare: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.12));
      [523, 659, 784].forEach(f => tone(f * 2, 0.5, 1.1, 'triangle', 0.08));
      setTimeout(sfx.sparkle, 600); setTimeout(sfx.sparkle, 1100);
    },
    soft: () => { tone(660, 0, 0.18, 'sine', 0.12); tone(523, 0.16, 0.25, 'sine', 0.12); },
    nope: () => tone(220, 0, 0.2, 'sawtooth', 0.06),
  };
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  // ---------- Talking ----------
  const NOVELTY_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|hysterical|deranged/i;
  function voiceScore(v) {
    let n = 0;
    if (/premium/i.test(v.name)) n += 40;
    if (/enhanced|neural|natural|wavenet|studio/i.test(v.name)) n += 30;
    if (/siri/i.test(v.name)) n += 25;
    if (/google/i.test(v.name)) n += 20;
    if (/samantha|ava|allison|zoe|nicky|aria|jenny|susan|karen|serena|moira|tessa/i.test(v.name)) n += 10;
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

  // Say a line. If Mom recorded her own voice for this line (slot), play that instead.
  function say(text, slot) {
    if (!state.voice) return;
    if (slot && playClip(slot)) return;
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ''));
      const v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = 0.92; u.pitch = 1.1;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice */ }
  }

  // Every line the app says. Mom can record each one in her own voice.
  const LINES = {
    start: { label: 'Waiting for an egg', text: () => `Go potty, ${kidName()}, to help Mommy Unicorn lay an egg!` },
    egg: { label: 'Potty trip 1: Mommy lays an egg', text: () => 'You went in the potty! Mommy Unicorn laid an egg!' },
    hatch: { label: 'Potty trip 2: the egg hatches', text: () => 'Potty again! The egg hatched! It\'s a baby unicorn!' },
    toddler: { label: 'Potty trip 3: toddler unicorn', text: () => 'Great potty job! Your baby unicorn grew into a toddler unicorn!' },
    kid: { label: 'Potty trip 4: kid unicorn', text: () => 'Wow! Your toddler unicorn is now a big kid unicorn!' },
    grown: { label: 'Potty trip 5: grown-up unicorn', text: () => 'Your unicorn is all grown up! It joins your unicorn family!' },
    prize: { label: 'Earned the prize', text: () => `You did it, ${kidName()}! You got ${state.goal} unicorns! You earned ${state.prize.name}!` },
    family: { label: 'Tapping the unicorn family', text: () => { const left = state.goal - herdSize(); return left > 0 ? `Look at your unicorns! ${left} more to get your prize!` : `You earned your prize! Go show a grown-up!`; } },
    again: { label: 'Tapped twice in a row', text: () => 'You already got a sparkle for that one! Great job!' },
  };
  const STAGE_SLOTS = ['start', 'egg', 'hatch', 'toddler', 'kid'];
  const sayLine = id => say(LINES[id].text(), id);

  // ---------- Recorded voice (IndexedDB) ----------
  const clips = {}; // slot -> { buffer, start, end, gain }
  let clipPlaying = null;
  function idb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
      const r = indexedDB.open('potty-unicorns-voice', 1);
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
  const clipClearAll = () => idbDo('readwrite', st => st.clear());

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
  async function recordLine(id) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      toast('The microphone is blocked. Allow microphone access for this app in your phone\'s Settings, then try again.', openGrownups);
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
      if (cancelled || !chunks.length) { openGrownups('voice'); return; }
      const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' });
      try {
        await loadClip(id, blob);
        await clipSave(id, blob);
        openGrownups('voice');
        setTimeout(() => playClip(id), 150);
      } catch (e) {
        toast('That recording could not be saved. Please try again.', () => openGrownups('voice'));
      }
    };
    openModal(`
      <div class="rec-dot"></div>
      <h2>Recording…</h2>
      <p class="muted">${esc(LINES[id].label)}. Say something like:</p>
      <p style="font-size:22px;font-weight:700">“${esc(LINES[id].text())}”</p>
      <p class="muted" id="recLeft">Stops by itself in ${secs} seconds</p>
      <button class="big-btn pink" id="recStop">■ Done</button>
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

  // ---------- Glitter confetti ----------
  // Flat flakes that flip as they fall (catching the light like real glitter), little stars, and twinkles.
  const glitter = (() => {
    const cv = $('glitter'), ctx = cv.getContext('2d');
    const COLORS = ['#ff5fae', '#ff9fd0', '#ffd84d', '#fff3a8', '#b98cff', '#8fb8ff', '#7fe3c6', '#ffffff', '#ffc2e0'];
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let parts = [], running = false, dpr = 1, W = 0, H = 0;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize); resize();
    function make(x, y, vx, vy) {
      const r = Math.random();
      return {
        x, y, vx, vy,
        kind: r < 0.62 ? 'flake' : r < 0.84 ? 'star' : 'twinkle',
        size: 4 + Math.random() * 7,
        color: pick(COLORS),
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.3,
        flip: Math.random() * Math.PI * 2, vf: 0.12 + Math.random() * 0.2,
        sway: Math.random() * Math.PI * 2,
        life: 0, max: 160 + Math.random() * 120,
      };
    }
    function star(x, y, r, points = 5) {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 ? r * 0.45 : r, a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter(p => p.life < p.max && p.y < H + 30);
      for (const p of parts) {
        p.life++;
        p.vy += 0.09; p.vx *= 0.985; p.vy *= 0.985;
        p.sway += 0.05;
        p.x += p.vx + Math.sin(p.sway) * 0.6; p.y += p.vy;
        p.rot += p.vr; p.flip += p.vf;
        const fade = Math.min(1, (p.max - p.life) / 40);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        if (p.kind === 'flake') {
          const c = Math.cos(p.flip);
          ctx.scale(1, Math.max(0.12, Math.abs(c)));
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          if (c > 0.82) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); } // glint
        } else if (p.kind === 'star') {
          ctx.fillStyle = p.color; star(0, 0, p.size * 0.9);
          ctx.globalAlpha = fade * 0.6; ctx.fillStyle = '#fff'; star(0, 0, p.size * 0.4);
        } else {
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(p.flip * 0.7));
          ctx.globalAlpha = fade * tw;
          ctx.fillStyle = '#fff'; ctx.shadowColor = p.color; ctx.shadowBlur = 12;
          star(0, 0, p.size * 1.3 * tw, 4);
        }
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(frame);
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }
    function go() { if (!running) { running = true; requestAnimationFrame(frame); } }
    return {
      // A puff of glitter from a point (usually the button that was tapped).
      burst(x, y, n = 80) {
        if (reduce) n = Math.round(n / 4);
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1, sp = 4 + Math.random() * 9;
          parts.push(make(x, y, Math.cos(a) * sp, Math.sin(a) * sp));
        }
        go();
      },
      // Glitter raining over the whole screen, for the big moments.
      rain(n = 220, spread = 1400) {
        if (reduce) n = Math.round(n / 4);
        for (let i = 0; i < n; i++) {
          setTimeout(() => {
            const p = make(Math.random() * W, -20 - Math.random() * 40, (Math.random() - 0.5) * 2, 1 + Math.random() * 3);
            p.max = 260 + Math.random() * 160;
            parts.push(p); go();
          }, Math.random() * spread);
        }
      },
      fromEl(el, n) {
        const r = el.getBoundingClientRect();
        this.burst(r.left + r.width / 2, r.top + r.height / 3, n);
      },
    };
  })();

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
    if (e.target === modal) closeModal();
    else if (e.target.closest('[data-act="close"]')) closeModal();
  });
  function toast(msg, after) {
    openModal(`<p style="font-size:20px">${esc(msg)}</p><button class="big-btn" data-act="close">OK</button>`, after);
  }

  // ---------- Kid screen ----------
  function prizePic(size) {
    return state.prize.photo
      ? `<img src="${state.prize.photo}" alt="" ${size ? `class="prize-photo"` : ''}/>`
      : (size ? `<div class="huge">${esc(state.prize.emoji)}</div>` : esc(state.prize.emoji));
  }

  function renderTop() {
    $('helloSmall').textContent = state.name ? `Hi, ${state.name}!` : 'Hi there!';
    $('herdCount').textContent = herdSize();
  }

  function renderScene(animate) {
    const n = stageNow(), look = lookFor(earned());
    const mom = unicornSVG('grown', MOM_LOOK, { flower: true, cls: 'actor mom bob' });
    let kid;
    if (n === 0) kid = nestSVG();
    else if (n === 1) kid = eggSVG({ cls: 'actor kid wobble' });
    else if (n === 2) kid = unicornSVG('baby', look, { shell: true, cls: 'actor kid' });
    else kid = unicornSVG(n === 3 ? 'toddler' : 'kid', look, { cls: 'actor kid' });
    $('scene').innerHTML = `${SCENE_BG}<div class="actors">${mom}${kid}</div><span class="tap-hint" aria-hidden="true">🔊</span>`;
    if (animate) {
      const k = $('scene').querySelector('.actor.kid');
      if (k) { k.classList.add('pop'); k.addEventListener('animationend', () => k.classList.remove('pop'), { once: true }); }
    }
    $('caption').textContent = [
      state.trips.length ? 'Mommy Unicorn is ready for a new egg!' : 'Go potty to get a unicorn egg!',
      'Mommy Unicorn laid an egg!',
      'The egg hatched! A baby unicorn!',
      'It grew into a toddler unicorn!',
      'Now it\'s a big kid unicorn!',
    ][n];
    const pipPics = [
      eggSVG(), eggSVG({ cracked: true }),
      unicornSVG('toddler', look, { noScale: true }), unicornSVG('kid', look, { noScale: true }), unicornSVG('grown', look),
    ];
    $('pips').innerHTML = STAGE_NAMES.map((name, i) => {
      const cls = i + 1 < n ? 'done' : i + 1 === n ? 'now' : '';
      return `<li class="${cls}" aria-label="${name}${cls === 'now' ? ' (now)' : cls === 'done' ? ' (done)' : ''}">${pipPics[i]}<span>${name}</span></li>`;
    }).join('');
  }

  function renderToday() {
    const k = dayKey(Date.now());
    const today = state.trips.filter(t => dayKey(t.at) === k);
    const pee = today.filter(t => t.k === 'pee').length, poop = today.length - pee;
    $('todayLine').textContent = today.length ? `Today: 💧 ${pee} pee  ·  💩 ${poop} poop` : '';
  }

  function renderHerd(newIndex = -1) {
    const n = herdSize(), goal = state.goal;
    let html = '';
    for (let i = 0; i < Math.max(goal, Math.min(n, goal)); i++) {
      if (i < n) html += `<div class="slot filled${i === newIndex ? ' new' : ''}">${unicornSVG('grown', lookFor(state.spent + i))}</div>`;
      else html += `<div class="slot"><span class="empty">🦄</span></div>`;
    }
    $('herd').innerHTML = html;
    $('prizeChip').innerHTML = `<span class="pz-pic">${prizePic(false)}</span><span>${esc(state.prize.name)}</span>`;
    const left = goal - n, extra = n - goal;
    $('herdNote').textContent = left > 0
      ? `${left} more unicorn${left === 1 ? '' : 's'} to get your prize!`
      : `You earned your prize! Show a grown-up!${extra > 0 ? ` (+${extra} extra 🦄)` : ''}`;
    $('herdCard').classList.toggle('ready', prizeReady());
  }

  function renderAll(o = {}) {
    renderTop(); renderScene(o.animate); renderToday(); renderHerd(o.newIndex);
  }

  // ---------- Potty trips ----------
  function logTrip(kind, btn) {
    const now = Date.now();
    const last = [...state.trips].reverse().find(t => t.k === kind);
    if (last && now - last.at < REPEAT_MS) {
      sfx.soft(); buzz(40);
      sayLine('again');
      btn.classList.add('waiting'); setTimeout(() => btn.classList.remove('waiting'), 600);
      return;
    }
    state.trips.push({ id: now.toString(36) + Math.random().toString(36).slice(2, 6), k: kind, at: now });
    save();
    const n = stageNow();
    glitter.fromEl(btn, 90);
    buzz([30, 30, 60]);
    if (n !== 0) {
      sfx.grow();
      renderAll({ animate: true });
      sayLine(STAGE_SLOTS[n]);
      return;
    }
    // Fifth trip: the unicorn is all grown up and joins the family.
    sfx.fanfare();
    renderAll({ animate: true, newIndex: herdSize() - 1 });
    celebrateGrown();
  }

  function celebrateGrown() {
    const idx = earned() - 1;
    setTimeout(() => {
      glitter.rain(240);
      sayLine('grown');
      openModal(`
        <div class="hero-pic">${unicornSVG('grown', lookFor(idx))}</div>
        <h2>${pick(CHEERS)} Your unicorn is all grown up!</h2>
        <p>It joins your unicorn family. You have <b>${herdSize()}</b> 🦄</p>
        <button class="big-btn pink" data-act="close">Yay! ✨</button>`, () => maybeCelebratePrize());
    }, 350);
  }

  function maybeCelebratePrize() {
    if (!prizeReady() || state.celebrated >= state.spent + state.goal) return;
    state.celebrated = state.spent + state.goal;
    save();
    setTimeout(() => {
      sfx.fanfare(); setTimeout(sfx.fanfare, 1500);
      glitter.rain(420, 2600);
      buzz([80, 60, 80, 60, 200]);
      sayLine('prize');
      openModal(`
        ${prizePic(true)}
        <h2>${esc(state.goal)} unicorns! You earned your prize!</h2>
        <p style="font-size:24px;font-weight:800">${esc(state.prize.name)}</p>
        <p class="muted">Go show a grown-up!</p>
        <button class="big-btn gold" data-act="close">Hooray! 🎉</button>`);
    }, 300);
  }

  $('btnPee').addEventListener('click', e => logTrip('pee', e.currentTarget));
  $('btnPoop').addEventListener('click', e => logTrip('poop', e.currentTarget));
  $('scene').addEventListener('click', () => {
    sfx.tap();
    const k = $('scene').querySelector('.actor.kid');
    if (k) glitter.fromEl(k, 25);
    sayLine(STAGE_SLOTS[stageNow()]);
  });
  const tapFamily = () => { sfx.sparkle(); sayLine(prizeReady() ? 'prize' : 'family'); };
  $('herdCard').addEventListener('click', tapFamily);
  $('herdPill').addEventListener('click', () => { $('herdCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); tapFamily(); });

  // ---------- Grown-ups ----------
  let unlocked = false;
  function askGrownup(onPass) {
    if (unlocked) { onPass(); return; }
    const a = 6 + Math.floor(Math.random() * 14), b = 4 + Math.floor(Math.random() * 6);
    openModal(`
      <div class="gate">
        <div style="font-size:54px">🔒</div>
        <h2>Grown-ups only</h2>
        <p>What is</p>
        <div class="q">${a} + ${b} = ?</div>
        <input id="gateInput" type="number" inputmode="numeric" autocomplete="off" aria-label="Answer" />
        <div style="height:10px"></div>
        <button class="big-btn" id="gateOk">Unlock</button>
        <button class="link-btn" data-act="close">Cancel</button>
      </div>`);
    const input = $('gateInput');
    setTimeout(() => input.focus(), 50);
    const check = () => {
      if (Number(input.value) === a + b) { unlocked = true; onPass(); }
      else { input.value = ''; input.style.borderColor = '#ff5f7e'; sfx.nope(); buzz(120); }
    };
    $('gateOk').onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }

  const timeStr = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = t => {
    const d = new Date(t), k = dayKey(t);
    if (k === dayKey(Date.now())) return 'Today';
    if (k === dayKey(Date.now() - 864e5)) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  let confirmErase = false;
  function openGrownups(scrollTo) {
    if (typeof scrollTo !== 'string') scrollTo = '';
    const recent = state.trips.slice(-8).reverse();
    const ready = prizeReady();
    const voiceRows = Object.entries(LINES).map(([id, line]) => {
      const mine = !!clips[id];
      return `<li>
        <div class="vl-head"><span>${esc(line.label)}</span><span class="badge ${mine ? 'mine' : ''}">${mine ? 'Your voice' : 'Phone voice'}</span></div>
        <div class="vl-script">“${esc(line.text())}”</div>
        <div class="row">
          <button class="small-btn pink" data-rec="${id}" ${canRecord() ? '' : 'disabled'}>🎙️ ${mine ? 'Re-record' : 'Record'}</button>
          <button class="small-btn" data-play="${id}">▶ Play</button>
          ${mine ? `<button class="small-btn danger" data-del="${id}">Delete</button>` : ''}
        </div>
      </li>`;
    }).join('');
    openModal(`
      <div class="gp-top"><h2>Grown-ups</h2><button class="x-btn" data-act="close" aria-label="Close">✕</button></div>

      <section>
        <label for="gName">Child's name</label>
        <input id="gName" type="text" maxlength="24" value="${esc(state.name)}" placeholder="Her name" autocomplete="off" />
      </section>

      <section>
        <h3>Prize</h3>
        <label for="gPrize">What she earns for ${esc(state.goal)} unicorns</label>
        <input id="gPrize" type="text" maxlength="40" value="${esc(state.prize.name)}" autocomplete="off" />
        <label>Picture</label>
        <div class="prize-pick" id="gEmoji">${PRIZE_EMOJIS.map(e => `<button data-emoji="${e}" class="${!state.prize.photo && state.prize.emoji === e ? 'on' : ''}" aria-label="${e}">${e}</button>`).join('')}</div>
        <div class="row">
          <label class="small-btn" for="gPhoto" style="color:var(--ink)">📷 Use a photo of the prize</label>
          <input id="gPhoto" type="file" accept="image/*" hidden />
          ${state.prize.photo ? `<img src="${state.prize.photo}" alt="Prize photo" style="width:48px;height:48px;border-radius:12px;object-fit:cover" /><button class="small-btn danger" id="gPhotoDel">Remove photo</button>` : ''}
        </div>
        <label>Unicorns needed</label>
        <div class="goal-row"><button id="gGoalMinus" aria-label="Fewer">−</button><span>${state.goal} 🦄</span><button id="gGoalPlus" aria-label="More">+</button></div>
        <p class="help">She has <b>${herdSize()}</b> of ${state.goal}. ${ready ? 'She has earned the prize!' : ''}</p>
        <button class="big-btn gold" id="gGiven" ${ready ? '' : 'disabled style="opacity:.45"'}>🎁 Prize given! Start the next ${state.goal}</button>
      </section>

      <section id="gTrips">
        <h3>Potty trips</h3>
        <p class="help">${state.trips.length} trip${state.trips.length === 1 ? '' : 's'} so far. Fix a wrong tap or add one she forgot to tap.</p>
        <div class="row">
          <button class="small-btn" data-add="pee">+ Add a pee</button>
          <button class="small-btn" data-add="poop">+ Add a poop</button>
        </div>
        ${recent.length ? `<ul class="trip-list">${recent.map(t => `<li><span>${t.k === 'pee' ? '💧 Pee' : '💩 Poop'} · ${dateStr(t.at)}, ${timeStr(t.at)}</span><button data-deltrip="${t.id}">Delete</button></li>`).join('')}</ul>` : ''}
      </section>

      <section id="gVoice">
        <h3>🎙️ Your voice</h3>
        <p class="help">Record yourself saying each line, and she'll hear you instead of the phone's voice. Lines you don't record use the phone's voice. Recordings stay on this phone.${canRecord() ? '' : ' <b>This browser can\'t record.</b> Try Safari or Chrome, opened from the home screen.'}</p>
        <ul class="voice-list">${voiceRows}</ul>
      </section>

      <section>
        <h3>Sound</h3>
        <div class="toggle"><span>Sounds</span><button class="small-btn" id="gSound">${state.sound ? 'On' : 'Off'}</button></div>
        <div class="toggle"><span>Talking</span><button class="small-btn" id="gVoiceOn">${state.voice ? 'On' : 'Off'}</button></div>
      </section>

      <section>
        <h3>Start over</h3>
        <p class="help">Erases every trip, unicorn and prize. Your recordings stay.</p>
        <button class="small-btn danger" id="gErase">${confirmErase ? 'Tap again to erase everything' : 'Erase all progress'}</button>
      </section>

      <button class="link-btn" id="gLock">🔒 Lock and go back</button>`, () => { confirmErase = false; }, 'gp');

    const keepScroll = () => { const y = modalCard.scrollTop; openGrownups(); modalCard.scrollTop = y; };

    $('gName').addEventListener('change', e => { state.name = e.target.value.trim().slice(0, 24); save(); renderAll(); });
    $('gPrize').addEventListener('change', e => { state.prize.name = e.target.value.trim().slice(0, 40) || DEFAULT_STATE.prize.name; save(); renderAll(); });
    modalCard.querySelectorAll('[data-emoji]').forEach(b => b.onclick = () => {
      state.prize.emoji = b.dataset.emoji; state.prize.photo = ''; save(); renderAll(); keepScroll();
    });
    $('gPhoto').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try { state.prize.photo = await shrinkPhoto(file); save(); renderAll(); keepScroll(); }
      catch (err) { toast('That picture could not be opened. Try a different one.', () => openGrownups()); }
    });
    if ($('gPhotoDel')) $('gPhotoDel').onclick = () => { state.prize.photo = ''; save(); renderAll(); keepScroll(); };
    $('gGoalMinus').onclick = () => { state.goal = Math.max(1, state.goal - 1); save(); renderAll(); keepScroll(); };
    $('gGoalPlus').onclick = () => { state.goal = Math.min(20, state.goal + 1); save(); renderAll(); keepScroll(); };
    $('gGiven').onclick = () => {
      if (!prizeReady()) return;
      state.prizesWon.push({ name: state.prize.name, at: Date.now() });
      state.spent += state.goal;
      save(); renderAll();
      closeModal();
      glitter.rain(160); sfx.sparkle();
    };
    modalCard.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      state.trips.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), k: b.dataset.add, at: Date.now() });
      state.trips.sort((x, y) => x.at - y.at);
      save(); renderAll(); keepScroll();
    });
    modalCard.querySelectorAll('[data-deltrip]').forEach(b => b.onclick = () => {
      state.trips = state.trips.filter(t => t.id !== b.dataset.deltrip);
      state.spent = Math.min(state.spent, earned());
      state.celebrated = Math.min(state.celebrated, earned());
      save(); renderAll(); keepScroll();
    });
    modalCard.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => recordLine(b.dataset.rec));
    modalCard.querySelectorAll('[data-play]').forEach(b => b.onclick = () => {
      const id = b.dataset.play;
      if (!playClip(id)) { const v = state.voice; state.voice = true; say(LINES[id].text()); state.voice = v; }
    });
    modalCard.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      delete clips[b.dataset.del];
      try { await clipDelete(b.dataset.del); } catch (e) { /* already gone */ }
      keepScroll();
    });
    $('gSound').onclick = () => { state.sound = !state.sound; save(); keepScroll(); };
    $('gVoiceOn').onclick = () => { state.voice = !state.voice; if (!state.voice && 'speechSynthesis' in window) speechSynthesis.cancel(); save(); keepScroll(); };
    $('gErase').onclick = () => {
      if (!confirmErase) { confirmErase = true; keepScroll(); return; }
      confirmErase = false;
      state = Object.assign(structuredClone(DEFAULT_STATE), { setupDone: true, name: state.name, prize: state.prize, goal: state.goal, sound: state.sound, voice: state.voice });
      save(); renderAll(); closeModal();
    };
    $('gLock').onclick = () => { unlocked = false; closeModal(); };
    if (scrollTo === 'voice') $('gVoice').scrollIntoView({ block: 'start' });
  }
  $('grownupBtn').addEventListener('click', () => askGrownup(openGrownups));

  // Shrink a prize photo so it fits comfortably in localStorage.
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

  // ---------- First open: a quick setup for Mom ----------
  function firstRun() {
    openModal(`
      <div class="hero-pic">${unicornSVG('grown', MOM_LOOK, { flower: true })}</div>
      <h2>Welcome to Unicorn Potty Party!</h2>
      <p class="muted">Each time she goes in the potty, her unicorn grows: egg, hatch, toddler, kid, grown-up. Every 5 trips makes a grown-up unicorn. ${state.goal} unicorns earn a prize.</p>
      <input id="fName" type="text" maxlength="24" placeholder="Her name" aria-label="Her name" autocomplete="off" />
      <input id="fPrize" type="text" maxlength="40" placeholder="The prize (like: A trip for ice cream)" aria-label="The prize" autocomplete="off" />
      <p class="muted">You can record your own voice, add a photo of the prize and change anything later under 🔒 Grown-ups.</p>
      <button class="big-btn pink" id="fGo">Let's go! ✨</button>`, () => {
        state.setupDone = true; save(); renderAll();
      });
    $('fGo').onclick = () => {
      const name = $('fName').value.trim().slice(0, 24), prize = $('fPrize').value.trim().slice(0, 40);
      if (name) state.name = name;
      if (prize) state.prize.name = prize;
      closeModal();
      glitter.rain(140); sfx.sparkle();
      setTimeout(() => sayLine('start'), 500);
    };
  }

  // ---------- Rainbow title ----------
  (() => {
    const RAINBOW = ['#ff4f8b', '#ff9a3c', '#ffc400', '#2fcf7f', '#3aa5ff', '#a35cff'];
    let i = 0;
    const line = (text, cls) => `<span class="line ${cls}" aria-hidden="true">${[...text].map(ch => ch === ' '
      ? '<span class="sp"></span>'
      : `<span class="ch" style="--c:${RAINBOW[i % RAINBOW.length]};--i:${i++}">${esc(ch)}</span>`).join('')}</span>`;
    $('wordmark').innerHTML = line('Unicorn', 'small') + line('Potty Party!', 'big');
  })();

  // ---------- Background stars ----------
  (() => {
    const box = $('stars-bg');
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 60 + '%';
      s.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
      s.style.transform = `scale(${0.5 + Math.random()})`;
      box.appendChild(s);
    }
  })();

  // ---------- Start ----------
  renderAll();
  loadAllClips();
  if (!state.setupDone) firstRun();
  // A new day while the app sits open: refresh today's count.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
  }
})();

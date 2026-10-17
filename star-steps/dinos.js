/* Dino drawings for the Potty tab: Mommy dino, eggs, and a dino that grows up with every potty trip.
 * Everything is plain SVG built from a few shapes, so it's tiny and looks the same on every phone.
 * Exposes window.DinoArt. */
(() => {
  'use strict';

  const LINE = '#2f3b4d';
  const f1 = n => Math.round(n * 10) / 10;
  const CALM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const MOM_LOOK = { body: '#7fd6a4', shade: '#5fbf8a', belly: '#fff3c9', spike: '#ff9a5c', spot: '#5fbf8a' };
  // Every dino in Lucas's family gets its own colors.
  const LOOKS = [
    { body: '#6fcf5b', shade: '#55b545', belly: '#fff3b0', spike: '#ff8a3d', spot: '#4fa83f' }, // green + orange
    { body: '#5fb4ff', shade: '#3f95e6', belly: '#e3f3ff', spike: '#ffd23f', spot: '#3f95e6' }, // blue + yellow
    { body: '#ff9a4d', shade: '#e87b2c', belly: '#fff0d6', spike: '#2fc4b0', spot: '#e87b2c' }, // orange + teal
    { body: '#a98bff', shade: '#8a6be6', belly: '#f1ebff', spike: '#7ee06a', spot: '#8a6be6' }, // purple + green
    { body: '#ff6b6b', shade: '#e04d4d', belly: '#ffe9d6', spike: '#ffd23f', spot: '#e04d4d' }, // red + yellow
    { body: '#3fcfbf', shade: '#25b0a1', belly: '#e5fffb', spike: '#ff6fa8', spot: '#25b0a1' }, // teal + pink
    { body: '#ffd23f', shade: '#e6b400', belly: '#fff8dc', spike: '#5fb4ff', spot: '#e6b400' }, // yellow + blue
    { body: '#9ccf3f', shade: '#7fb22a', belly: '#f6ffd9', spike: '#a98bff', spot: '#7fb22a' }, // lime + purple
  ];
  const lookFor = i => LOOKS[((i % LOOKS.length) + LOOKS.length) % LOOKS.length];

  // Proportions per age: babies are mostly head, grown-ups have long tails and big spikes.
  const AGES = {
    baby:    { rx: 30, ry: 24, leg: 12, lw: 15, hr: 30, neck: 2,  tail: 26, spikes: 3, sp: 7,  scale: 0.62 },
    toddler: { rx: 38, ry: 28, leg: 18, lw: 16, hr: 29, neck: 6,  tail: 38, spikes: 4, sp: 9,  scale: 0.74 },
    kid:     { rx: 44, ry: 31, leg: 24, lw: 17, hr: 28, neck: 10, tail: 44, spikes: 5, sp: 11, scale: 0.87 },
    grown:   { rx: 48, ry: 33, leg: 28, lw: 19, hr: 28, neck: 14, tail: 50, spikes: 6, sp: 13, scale: 1 },
    mom:     { rx: 48, ry: 33, leg: 28, lw: 19, hr: 26, neck: 30, tail: 50, spikes: 6, sp: 12, scale: 1 },
  };
  const star = (x, y, r) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += `${i ? 'L' : 'M'}${f1(x + Math.cos(a) * rr)} ${f1(y + Math.sin(a) * rr)}`;
    }
    return d + 'Z';
  };

  // A chubby side-view dino facing right, standing on y=194 in a 200×200 box.
  // o: { still, cls, shell, paci, flower, noScale }
  function dinoSVG(age, look, o = {}) {
    const p = AGES[age], L = look, hr = p.hr;
    const gy = 194, cx = 98, cy = gy - p.leg - p.ry * 0.62;
    const hx = cx + p.rx * 0.78 + p.neck * 0.35, hy = cy - p.ry * 0.7 - p.neck - hr * 0.35;
    const live = !o.still && !CALM;

    // Legs: back pair in the darker shade, front pair in body color, with toe nails.
    const leg = (x, fill) => `<rect x="${f1(x - p.lw / 2)}" y="${f1(cy)}" width="${p.lw}" height="${f1(gy - cy)}" rx="${f1(p.lw / 2.2)}" fill="${fill}"/>`;
    const lx = [cx - p.rx * 0.55, cx + p.rx * 0.35, cx - p.rx * 0.25, cx + p.rx * 0.62];
    // Tail: a tapered curve sweeping back to the left.
    const tb = { x: cx - p.rx * 0.7, y: cy - p.ry * 0.25 };
    const tip = { x: tb.x - p.tail, y: cy + p.ry * 0.35 - p.tail * 0.15 };
    const tail = `<path d="M${f1(tb.x + 4)} ${f1(tb.y - p.ry * 0.35)} Q${f1(tb.x - p.tail * 0.45)} ${f1(tb.y - p.ry * 0.1)} ${f1(tip.x)} ${f1(tip.y)} Q${f1(tb.x - p.tail * 0.35)} ${f1(tb.y + p.ry * 0.75)} ${f1(tb.x + 8)} ${f1(cy + p.ry * 0.55)} Z" fill="${L.body}"/>`;
    // Neck joins the body to the head.
    const neck = `<path d="M${f1(cx + p.rx * 0.2)} ${f1(cy - p.ry * 0.75)} L${f1(hx - hr * 0.7)} ${f1(hy)} L${f1(hx + hr * 0.2)} ${f1(hy + hr * 0.8)} L${f1(cx + p.rx * 0.95)} ${f1(cy + p.ry * 0.1)} Z" fill="${L.body}"/>`;
    const snout = `<ellipse cx="${f1(hx + hr * 0.7)}" cy="${f1(hy + hr * 0.3)}" rx="${f1(hr * 0.75)}" ry="${f1(hr * 0.58)}" fill="${L.body}"/>`;
    const shapes = [
      leg(lx[0], L.shade), leg(lx[1], L.shade),
      tail,
      `<ellipse cx="${cx}" cy="${f1(cy)}" rx="${p.rx}" ry="${p.ry}" fill="${L.body}"/>`,
      leg(lx[2], L.body), leg(lx[3], L.body),
      neck,
      `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${hr}" fill="${L.body}"/>`,
      snout,
    ].join('');
    // Draw the silhouette fat in the outline color first, then the colors on top: one clean outline.
    const outline = shapes.replace(/fill="[^"]*"/g, `fill="${LINE}"`);

    // Back spikes, from behind the head down the back and onto the tail.
    let spikes = '';
    for (let i = 0; i < p.spikes; i++) {
      const t = (i + 0.5) / p.spikes;
      // walk from the back of the head, along the top of the body, to the tail
      const a = Math.PI * (1.62 - t * 0.62);
      let x = cx + Math.cos(a) * p.rx * 0.98, y = cy + Math.sin(a) * p.ry * 0.98;
      if (i === 0) { x = hx - hr * 0.55; y = hy - hr * 0.72; }
      const nx = x - cx, ny = (y - cy) * 1.4, len = Math.hypot(nx, ny) || 1;
      const ux = nx / len, uy = ny / len, s = p.sp * (i === 0 ? 0.8 : 1);
      const bx = -uy * s * 0.75, by = ux * s * 0.75;
      spikes += `<path d="M${f1(x - bx)} ${f1(y - by)} L${f1(x + ux * s * 1.25)} ${f1(y + uy * s * 1.25)} L${f1(x + bx)} ${f1(y + by)} Z" fill="${L.spike}" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>`;
    }
    // Belly and a few spots.
    const belly = `<ellipse cx="${f1(cx + p.rx * 0.25)}" cy="${f1(cy + p.ry * 0.38)}" rx="${f1(p.rx * 0.62)}" ry="${f1(p.ry * 0.5)}" fill="${L.belly}"/>`;
    const spots = [[-0.35, -0.35, 0.16], [0.05, -0.55, 0.11], [-0.62, 0.05, 0.1]]
      .map(([dx, dy, r]) => `<circle cx="${f1(cx + dx * p.rx)}" cy="${f1(cy + dy * p.ry)}" r="${f1(r * p.rx)}" fill="${L.spot}"/>`).join('');
    const toes = [lx[2], lx[3]].map(x => `<path d="M${f1(x - 4)} ${gy - 3} v-3 M${f1(x + 3)} ${gy - 3} v-3" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`).join('');
    // Little arm
    const ax = cx + p.rx * 0.78, ay = cy + p.ry * 0.05;
    const arm = `<path d="M${f1(ax - 4)} ${f1(ay - 4)} q10 2 12 12" fill="none" stroke="${LINE}" stroke-width="${f1(p.lw * 0.55 + 4)}" stroke-linecap="round"/>
      <path d="M${f1(ax - 4)} ${f1(ay - 4)} q10 2 12 12" fill="none" stroke="${L.body}" stroke-width="${f1(p.lw * 0.55)}" stroke-linecap="round"/>`;

    // Face: big shiny eye that blinks, a smile, nostril and rosy cheek.
    const ex = hx + hr * 0.2, ey = hy - hr * 0.12;
    const blinkAt = (1 + Math.random() * 4).toFixed(1);
    const blink = (attr, open, shut = 0.5) => live ? `<animate attributeName="${attr}" values="${open};${open};${shut};${open}" keyTimes="0;0.93;0.96;1" dur="5s" begin="${blinkAt}s" repeatCount="indefinite"/>` : '';
    let eye;
    if (age === 'kid') {
      // Cool star sunglasses (too cool to blink).
      eye = `<path d="M${f1(ex - hr * 0.45)} ${f1(ey - hr * 0.12)} L${f1(hx - hr * 0.8)} ${f1(ey - hr * 0.3)}" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/>
        <path d="${star(ex + hr * 0.05, ey, hr * 0.48)}" fill="#ffd23f" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="${star(ex + hr * 0.05, ey + 1, hr * 0.3)}" fill="#24324a"/>
        <path d="M${f1(ex - hr * 0.08)} ${f1(ey - hr * 0.1)} l${f1(hr * 0.1)} ${f1(-hr * 0.08)}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    } else {
      eye = `<ellipse cx="${f1(ex)}" cy="${f1(ey)}" rx="${f1(hr * 0.2)}" ry="${f1(hr * 0.26)}" fill="#1d2433">${blink('ry', f1(hr * 0.26))}</ellipse>
        <circle cx="${f1(ex + hr * 0.07)}" cy="${f1(ey - hr * 0.1)}" r="${f1(hr * 0.08)}" fill="#fff">${blink('r', f1(hr * 0.08), 0)}</circle>
        <circle cx="${f1(ex - hr * 0.06)}" cy="${f1(ey + hr * 0.09)}" r="${f1(hr * 0.04)}" fill="#fff">${blink('r', f1(hr * 0.04), 0)}</circle>
        ${age === 'mom' ? `<path d="M${f1(ex - hr * 0.14)} ${f1(ey - hr * 0.24)} l-5 -6 M${f1(ex)} ${f1(ey - hr * 0.28)} l-1 -7 M${f1(ex + hr * 0.14)} ${f1(ey - hr * 0.24)} l3 -6" stroke="#1d2433" stroke-width="2.5" stroke-linecap="round"/>` : ''}`;
    }
    const mouth = o.paci ? '' : `<path d="M${f1(hx + hr * 0.55)} ${f1(hy + hr * 0.55)} Q${f1(hx + hr * 0.95)} ${f1(hy + hr * 0.82)} ${f1(hx + hr * 1.3)} ${f1(hy + hr * 0.45)}" fill="none" stroke="${LINE}" stroke-width="3.5" stroke-linecap="round"/>`;
    const face = `${eye}
      <circle cx="${f1(hx - hr * 0.08)}" cy="${f1(hy + hr * 0.42)}" r="${f1(hr * 0.17)}" fill="#ff8f8f" opacity=".55"/>
      <circle cx="${f1(hx + hr * 1.22)}" cy="${f1(hy + hr * 0.08)}" r="2.6" fill="${LINE}"/>
      ${mouth}`;

    // Mommy wears a flower behind her head.
    const flower = o.flower ? (() => {
      const fx = hx - hr * 0.62, fy = hy - hr * 0.62;
      let s = '';
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        s += `<circle cx="${f1(fx + Math.cos(a) * 7)}" cy="${f1(fy + Math.sin(a) * 7)}" r="6" fill="#ff8fc8" stroke="${LINE}" stroke-width="2"/>`;
      }
      return s + `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="5" fill="#ffe066" stroke="${LINE}" stroke-width="2"/>`;
    })() : '';
    // Baby: a blue pacifier.
    const mx = hx + hr * 1.05, my = hy + hr * 0.6;
    const paci = o.paci ? `<g class="paci">
      <circle cx="${f1(mx + hr * 0.32)}" cy="${f1(my + hr * 0.38)}" r="${f1(hr * 0.26)}" fill="none" stroke="${LINE}" stroke-width="9"/>
      <circle cx="${f1(mx + hr * 0.32)}" cy="${f1(my + hr * 0.38)}" r="${f1(hr * 0.26)}" fill="none" stroke="#2f9bff" stroke-width="5"/>
      <ellipse cx="${f1(mx)}" cy="${f1(my)}" rx="${f1(hr * 0.22)}" ry="${f1(hr * 0.42)}" transform="rotate(-25 ${f1(mx)} ${f1(my)})" fill="#8fd0ff" stroke="${LINE}" stroke-width="3.5"/>
      <circle cx="${f1(mx + hr * 0.05)}" cy="${f1(my + hr * 0.02)}" r="${f1(hr * 0.11)}" fill="#ffd23f" stroke="${LINE}" stroke-width="2.5"/>
    </g>` : '';
    // Toddler: a backwards red baseball cap and a ball to play with.
    let toddler = '';
    if (age === 'toddler') {
      const capY = hy - hr * 0.55;
      const bx = cx + p.rx * 1.3, br = 14, by = gy - br - 1;
      const bounce = live ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -12;0 0;0 0" keyTimes="0;0.25;0.5;1" dur="2.4s" repeatCount="indefinite"/>` : '';
      toddler = `
        <path d="M${f1(hx - hr * 0.95)} ${f1(capY + 6)} Q${f1(hx - hr * 0.2)} ${f1(capY - hr * 0.75)} ${f1(hx + hr * 0.75)} ${f1(capY + 4)} Z" fill="#ff4d4d" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M${f1(hx - hr * 0.9)} ${f1(capY + 5)} L${f1(hx - hr * 1.55)} ${f1(capY + 10)} Q${f1(hx - hr * 1.6)} ${f1(capY + 3)} ${f1(hx - hr * 1.2)} ${f1(capY - 2)} Z" fill="#ff4d4d" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="${f1(hx - hr * 0.1)}" cy="${f1(capY - hr * 0.3)}" r="3.5" fill="#fff" stroke="${LINE}" stroke-width="2"/>
        <g>${bounce}
          <circle cx="${f1(bx)}" cy="${f1(by)}" r="${br}" fill="#2f9bff" stroke="${LINE}" stroke-width="3.5"/>
          <path d="M${f1(bx - br)} ${f1(by)} Q${f1(bx)} ${f1(by - 7)} ${f1(bx + br)} ${f1(by)}" fill="none" stroke="#ffd23f" stroke-width="3.5"/>
          <path d="M${f1(bx - 4)} ${f1(by - 6)} q3 -3 6 -2" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </g>`;
    }
    // Kid: a red superhero cape flowing behind, with a star on it.
    let cape = '', clasp = '';
    if (age === 'kid') {
      const nx = cx + p.rx * 0.45, ny = cy - p.ry * 0.85;
      const wave = live ? `<animate attributeName="d" dur="1.6s" repeatCount="indefinite" values="${capePath(nx, ny, p, 0)};${capePath(nx, ny, p, 6)};${capePath(nx, ny, p, 0)}"/>` : '';
      cape = `<path d="${capePath(nx, ny, p, 0)}" fill="#ff4d4d" stroke="${LINE}" stroke-width="4" stroke-linejoin="round">${wave}</path>`;
      clasp = `<circle cx="${f1(nx + 2)}" cy="${f1(ny + 3)}" r="6" fill="#ffd23f" stroke="${LINE}" stroke-width="2.5"/>`;
    }

    // A just-hatched baby sits in the bottom half of its shell.
    const shell = o.shell ? `
      <path d="M40 174 L52 162 L66 176 L80 160 L94 176 L108 160 L122 176 L136 160 L152 174 C154 192 128 199 96 199 C64 199 38 192 40 174 Z" fill="#fffaf0" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="66" cy="186" r="5" fill="#9be08a"/><circle cx="98" cy="190" r="4" fill="#ffd23f"/><circle cx="126" cy="185" r="5" fill="#8fc4ff"/>` : '';
    const sc = o.noScale ? 1 : o.shell ? 0.85 : p.scale;
    const body = `${spikes}${cape}<g stroke="${LINE}" stroke-width="7" stroke-linejoin="round">${outline}</g>${shapes}${belly}${spots}${toes}${clasp}${arm}${face}${paci}${flower}${toddler}`;
    return `<svg viewBox="0 0 200 200" class="${o.cls || ''}" aria-hidden="true"><g transform="translate(100 ${gy - (o.shell ? 28 : 0)}) scale(${sc}) translate(-100 ${-gy})">${body}</g>${shell}</svg>`;
  }
  // A cape flying out behind: from the neck, up over the back, streaming left in the wind.
  function capePath(nx, ny, p, w) {
    const cx = 98, x0 = nx - p.rx * 2.05, y0 = ny - p.ry * 1.05 - w, x1 = nx - p.rx * 1.9, y1 = ny + p.ry * 0.55 + w * 0.5;
    return `M${f1(nx)} ${f1(ny)} Q${f1(nx - p.rx * 0.7)} ${f1(ny - p.ry * 0.9 - w)} ${f1(x0)} ${f1(y0)} L${f1(x0 + 4)} ${f1(y0 + p.ry * 0.45)} L${f1(x1)} ${f1(y1)} Q${f1(nx - p.rx * 0.8)} ${f1(ny + p.ry * 0.4)} ${f1(nx)} ${f1(ny + 10)} Z`;
  }

  function eggSVG(o = {}) {
    const crack = o.cracked
      ? `<path d="M46 118 L62 104 L76 120 L92 102 L106 120 L122 102 L136 118 L152 106" fill="none" stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`
      : '';
    return `<svg viewBox="0 0 200 200" class="${o.cls || ''}" aria-hidden="true">
      <path d="M100 28 C148 28 164 108 160 140 C156 178 128 194 100 194 C72 194 44 178 40 140 C36 108 52 28 100 28 Z" fill="#fffaf0" stroke="${LINE}" stroke-width="6"/>
      <circle cx="78" cy="96" r="12" fill="#9be08a"/><circle cx="124" cy="80" r="9" fill="#8fc4ff"/>
      <circle cx="118" cy="146" r="14" fill="#ffb86b"/><circle cx="70" cy="156" r="8" fill="#ffd23f"/>
      <circle cx="96" cy="124" r="6" fill="#a98bff"/>
      <path d="M70 60 Q74 46 84 42" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      ${crack}
    </svg>`;
  }

  function nestSVG(o = {}) {
    let sticks = '';
    for (let i = 0; i < 9; i++) sticks += `<path d="M${30 + i * 16} ${168 + (i % 2) * 6} q14 -12 30 0" fill="none" stroke="#a8692b" stroke-width="4" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 200 200" class="${o.cls || ''}" aria-hidden="true">
      <ellipse cx="100" cy="176" rx="82" ry="22" fill="#d99a52" stroke="${LINE}" stroke-width="5"/>
      <ellipse cx="100" cy="168" rx="58" ry="10" fill="#9c5f22"/>
      ${sticks}
      <path d="${star(100, 100, 26)}" fill="#ffe066" stroke="#e0a800" stroke-width="3" stroke-linejoin="round" opacity=".9"/>
      <text x="100" y="142" font-size="34" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" fill="${LINE}">?</text>
    </svg>`;
  }

  // Dino valley: a friendly volcano puffing smoke, palm trees, the sun and green hills.
  const SCENE_BG = (() => {
    const puff = (x, y, r, d) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".9">${CALM ? '' : `<animate attributeName="cy" values="${y};${y - 14};${y}" dur="${d}s" repeatCount="indefinite"/>`}</circle>`;
    const palm = (x, s) => `<g transform="translate(${x} 0) scale(${s})">
      <path d="M0 200 Q6 150 -4 104" fill="none" stroke="#a8692b" stroke-width="9" stroke-linecap="round"/>
      <path d="M-4 104 q-30 -10 -44 8 q22 -4 44 -8 M-4 104 q28 -16 46 0 q-24 -4 -46 0 M-4 104 q-12 -26 -34 -26 q18 8 34 26 M-4 104 q14 -26 36 -22 q-20 6 -36 22" fill="#4fbf4f" stroke="#2f8f3a" stroke-width="3" stroke-linejoin="round"/>
    </g>`;
    let ferns = '';
    [[24, 212], [118, 216], [214, 214], [300, 208]].forEach(([x, y]) => {
      ferns += `<g transform="translate(${x} ${y})" fill="#3fae4a"><path d="M0 0 q-14 -18 -6 -30 q6 14 6 30 M0 0 q14 -18 6 -30 q-6 14 -6 30 M0 0 q-20 -6 -24 -18 q12 4 24 18 M0 0 q20 -6 24 -18 q-12 4 -24 18"/></g>`;
    });
    return `<svg class="bg" viewBox="0 0 320 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle cx="276" cy="40" r="22" fill="#ffd23f"/>
      <path d="M30 170 L84 72 L104 72 L160 170 Z" fill="#b07a4f"/>
      <path d="M84 72 L104 72 L98 92 L92 84 L86 94 Z" fill="#ff6b3d"/>
      ${puff(92, 56, 9, 3.2)}${puff(102, 42, 11, 3.8)}${puff(88, 30, 8, 4.4)}
      <path d="M0 176 Q80 146 170 170 T320 160 V220 H0 Z" fill="#a8e07e"/>
      <path d="M0 196 Q120 168 230 190 T320 186 V220 H0 Z" fill="#8fd16a"/>
      ${palm(296, 0.75)}${palm(14, 0.6)}
      ${ferns}
    </svg>`;
  })();

  window.DinoArt = { dinoSVG, eggSVG, nestSVG, lookFor, MOM_LOOK, SCENE_BG, LOOKS };
})();

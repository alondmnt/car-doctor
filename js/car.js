/**
 * Car rendering — inline SVG with all interactive elements embedded.
 * Each shape (sedan, suv, sports) is a self-contained SVG template.
 * JS interacts with SVG elements via class names — same selectors as before.
 */
const Car = (() => {

  const SKIN_TONES = ['#f5d0a9', '#e0b88a', '#c68c53', '#a0673c', '#6b4226'];
  const HAIR_COLOURS = ['#222', '#5a3825', '#d4a44c', '#c44', '#e87d2f', '#888'];

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ─── SVG helpers (shared across shapes) ─── */

  /** Wheel style definitions — shared by renderer and picker */
  const WHEEL_STYLES = {
    standard: {
      rim: 0.67, hub: 0.24, spokeCount: 5, spokeColour: '#aaa', spokeWidth: 2.5, tyrePad: 2,
      rubberFill: '#1a1a1a', rimFill: '#d0d0d0', hubFill: '#e0e0e0',
    },
    racing: {
      rim: 0.75, hub: 0.20, spokeCount: 10, spokeColour: '#e0e0e0', spokeWidth: 1.5, tyrePad: 1,
      rubberFill: '#111', rimFill: '#ffcc00', hubFill: '#ff4444',
    },
    offroad: {
      rim: 0.58, hub: 0.30, spokeCount: 3, spokeColour: '#665544', spokeWidth: 6, tyrePad: 5, roundCap: true,
      rubberFill: '#2a2216', rimFill: '#8b7355', hubFill: '#aa8866',
    },
  };

  /** Wheel with rim spokes, hub, and 3 tappable lug-nut screws.
   *  @param {string} style - key in WHEEL_STYLES */
  function _wheelSVG(cx, cy, r, position, style = 'standard') {
    const s = WHEEL_STYLES[style] || WHEEL_STYLES.standard;
    const rim = r * s.rim;
    const hub = r * s.hub;
    const tyreInner = r - s.tyrePad;

    const sr = r * 0.17;              // screw visible radius
    const sd = rim * 0.72;            // screw distance from centre
    const touch = sr * 2.8;           // invisible touch-target radius

    // Generate spokes from style data
    const angles = Array.from({ length: s.spokeCount }, (_, k) => k * (360 / s.spokeCount));
    const spokes = angles.map(deg => {
      const a = deg * Math.PI / 180;
      const i = hub + 1, o = rim - 2;
      return `<line x1="${cx + Math.cos(a)*i}" y1="${cy + Math.sin(a)*i}" ` +
             `x2="${cx + Math.cos(a)*o}" y2="${cy + Math.sin(a)*o}" ` +
             `style="stroke:${s.spokeColour};stroke-width:${s.spokeWidth}"${s.roundCap ? ' stroke-linecap="round"' : ''}/>`;
    }).join('');

    // 3 lug nuts (120° apart, starting top)
    const nuts = [0, 120, 240].map((deg, i) => {
      const a = (deg - 90) * Math.PI / 180;
      const sx = cx + Math.cos(a) * sd;
      const sy = cy + Math.sin(a) * sd;
      const cr = sr * 0.6;
      return `<g class="car__screw car__screw--${i+1}" data-screw="${i+1}">
        <circle class="car__screw-halo" cx="${sx}" cy="${sy}" r="${touch}" style="fill:transparent"/>
        <circle cx="${sx}" cy="${sy}" r="${sr}" style="fill:#999;stroke:#777;stroke-width:1.5"/>
        <line x1="${sx-cr}" y1="${sy}" x2="${sx+cr}" y2="${sy}" style="stroke:#555;stroke-width:2"/>
        <line x1="${sx}" y1="${sy-cr}" x2="${sx}" y2="${sy+cr}" style="stroke:#555;stroke-width:2"/>
      </g>`;
    }).join('');

    return `<g class="car__tyre car__tyre--${position}" data-position="${position}">
      <circle class="car__tyre-rubber" cx="${cx}" cy="${cy}" r="${r}" style="fill:${s.rubberFill}"/>
      <circle class="car__tyre-inner" cx="${cx}" cy="${cy}" r="${tyreInner}" style="fill:${s.rubberFill}"/>
      <circle class="car__tyre-rim" cx="${cx}" cy="${cy}" r="${rim}" style="fill:${s.rimFill};stroke:${s.rimFill};stroke-opacity:0.5"/>
      ${spokes}
      <circle class="car__tyre-hub" cx="${cx}" cy="${cy}" r="${hub}" style="fill:${s.hubFill};stroke:${s.hubFill};stroke-opacity:0.5"/>
      ${nuts}
    </g>`;
  }

  /** Jack with base, arm, and directional arrow hint */
  function _jackSVG(cx, gy) {
    const bw = 36, bh = 10, aw = 14, ah = 18;
    return `<g class="car__jack">
      <rect class="car__jack-base" x="${cx-bw/2}" y="${gy-bh}" width="${bw}" height="${bh}" rx="2" style="fill:#c44"/>
      <rect class="car__jack-arm" x="${cx-aw/2}" y="${gy-bh-ah}" width="${aw}" height="${ah}" rx="2" style="fill:#a33"/>
      <g class="car__jack-arrow">
        <text class="car__jack-arrow-up" x="${cx}" y="${gy-bh-ah-6}" text-anchor="middle" font-size="16" fill="#ffe066">▲</text>
        <text class="car__jack-arrow-down" x="${cx}" y="${gy-bh-ah-6}" text-anchor="middle" font-size="16" fill="#ffe066">▼</text>
      </g>
      <rect x="${cx-24}" y="${gy-bh-ah-14}" width="48" height="${bh+ah+18}" fill="transparent"/>
    </g>`;
  }

  /** Bonnet, engine bay, paint damage, sticker zone, mud overlay — shared structure */
  function _interactiveSVG(opts, layout) {
    const { hasEngine, hasPaint, hasSticker, hasWash } = opts;
    const { bonnet, engine, paint, sticker, mud } = layout;

    // Smoke puff positions — staggered across the bonnet top
    const smokeX = bonnet.x + bonnet.w / 2;
    const smokeY = bonnet.y;

    return `
      <!-- Smoke puffs (visible only with engine fault) -->
      <g class="car__smoke ${hasEngine ? '' : 'car__smoke--hidden'}">
        <circle class="car__smoke-puff car__smoke-puff--1" cx="${smokeX - 10}" cy="${smokeY}" r="5"/>
        <circle class="car__smoke-puff car__smoke-puff--2" cx="${smokeX + 5}" cy="${smokeY - 3}" r="6"/>
        <circle class="car__smoke-puff car__smoke-puff--3" cx="${smokeX + 18}" cy="${smokeY + 2}" r="4"/>
        <circle class="car__smoke-puff car__smoke-puff--4" cx="${smokeX - 2}" cy="${smokeY - 6}" r="5"/>
      </g>

      <!-- Bonnet -->
      <g class="car__bonnet ${hasEngine ? '' : 'car__bonnet--hidden'}">
        <rect class="car__bonnet-lid svg-paint" x="${bonnet.x}" y="${bonnet.y}" width="${bonnet.w}" height="${bonnet.h}" rx="2"
              opacity="0.9"/>
        <rect x="${bonnet.x}" y="${bonnet.y}" width="${bonnet.w}" height="${bonnet.h + 30}" fill="transparent"/>
      </g>

      <!-- Engine bay -->
      <g class="car__engine-bay ${hasEngine ? '' : 'car__engine-bay--hidden'}">
        <rect x="${engine.x}" y="${engine.y}" width="${engine.w}" height="${engine.h}" rx="3" fill="#333"/>
        <rect class="car__engine car__engine--broken"
              x="${engine.x+8}" y="${engine.y+8}" width="${engine.w-16}" height="${engine.h-16}" rx="3"
              fill="#666" stroke="#555" stroke-width="1.5"/>
        <rect x="${engine.x+14}" y="${engine.y+14}" width="${engine.w*0.3}" height="${engine.h*0.25}" rx="2" fill="#555"/>
        <circle cx="${engine.x+engine.w*0.5}" cy="${engine.y+engine.h-10}" r="4" fill="#444" stroke="#555" stroke-width="1"/>
      </g>

      <!-- Paint damage -->
      <g class="car__paint-damage ${hasPaint ? '' : 'car__paint-damage--hidden'}">
        <rect x="40" y="28" width="330" height="130" fill="transparent"/>
        ${paint.map(p => {
          // Render as scratch lines — angled, with rounded caps
          const len = p.rx * 1.2;
          const ang = (p.ang || -20) * Math.PI / 180;
          const dx = Math.cos(ang) * len;
          const dy = Math.sin(ang) * len;
          const x1 = p.cx - dx, y1 = p.cy - dy;
          const x2 = p.cx + dx, y2 = p.cy + dy;
          const sw = Math.max(2, p.ry * 0.35);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                        stroke="rgba(180,160,130,${p.o})" stroke-width="${sw}"
                        stroke-linecap="round"/>`;
        }).join('')}
      </g>

      <!-- Sticker zone -->
      <g class="car__sticker-zone ${hasSticker ? '' : 'car__sticker-zone--hidden'}">
        <rect x="${sticker.x}" y="${sticker.y}" width="${sticker.w}" height="${sticker.h}" rx="5"
              fill="transparent" stroke="rgba(0,0,0,0.35)" stroke-dasharray="5 3" stroke-width="2"/>
        <text class="car__sticker-text" x="${sticker.x + sticker.w/2}" y="${sticker.y + sticker.h/2}"
              text-anchor="middle" dominant-baseline="central" font-size="0"></text>
        <rect x="${sticker.x}" y="${sticker.y}" width="${sticker.w}" height="${sticker.h}" fill="transparent"/>
      </g>

      <!-- Mud overlay (car wash fault) — splatter shapes with drips -->
      <g class="car__mud ${hasWash ? '' : 'car__mud--hidden'}">
        <rect x="40" y="28" width="330" height="130" fill="transparent"/>
        ${mud.map(m => {
          // Main splat + 2-3 small drip circles for a splash look
          // Small satellite droplets just outside the main splat edge
          const drips = [
            `<circle cx="${m.cx - m.rx - 3}" cy="${m.cy - 2}" r="${Math.max(2, m.rx * 0.12)}" fill="rgba(120,80,30,${m.o * 0.9})"/>`,
            `<circle cx="${m.cx + m.rx + 4}" cy="${m.cy + 1}" r="${Math.max(2.5, m.rx * 0.14)}" fill="rgba(120,80,30,${m.o * 0.85})"/>`,
            `<circle cx="${m.cx + 2}" cy="${m.cy - m.ry - 3}" r="${Math.max(1.5, m.rx * 0.1)}" fill="rgba(120,80,30,${m.o * 0.75})"/>`,
          ].join('');
          return `<ellipse cx="${m.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}" fill="rgba(120,80,30,${m.o})"/>${drips}`;
        }).join('')}
      </g>`;
  }

  /* ─── Shape templates ─── */

  /** Sedan / taxi — classic proportions, taxi sign on roof */
  function _sedanSVG(opts) {
    const { skinColour, hairColour, wheelStyle } = opts;
    const wf = { cx: 100, cy: 158, r: 28 };
    const wr = { cx: 310, cy: 158, r: 28 };

    const interactive = _interactiveSVG(opts, {
      bonnet:  { x: 44, y: 78, w: 82, h: 10 },
      engine:  { x: 48, y: 90, w: 76, h: 55 },
      paint: [
        { cx: 110, cy: 108, rx: 25, ry: 16, o: 0.55, ang: -15 },
        { cx: 260, cy: 120, rx: 22, ry: 14, o: 0.45, ang: -25 },
        { cx: 330, cy: 100, rx: 18, ry: 12, o: 0.45, ang: 10 },
        { cx: 180, cy: 138, rx: 20, ry: 10, o: 0.45, ang: -30 },
      ],
      sticker: { x: 248, y: 86, w: 80, h: 50 },
      mud: [
        { cx: 80, cy: 120, rx: 26, ry: 10, o: 0.8 },
        { cx: 160, cy: 125, rx: 35, ry: 12, o: 0.65 },
        { cx: 250, cy: 122, rx: 28, ry: 10, o: 0.75 },
        { cx: 330, cy: 118, rx: 28, ry: 11, o: 0.7 },
        { cx: 110, cy: 98, rx: 20, ry: 10, o: 0.5 },
        { cx: 270, cy: 90, rx: 22, ry: 9, o: 0.45 },
        { cx: 300, cy: 60, rx: 14, ry: 8, o: 0.35 },
      ],
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 182" class="car__svg">
      <ellipse class="car__shadow" cx="200" cy="176" rx="170" ry="6" fill="rgba(0,0,0,0.12)"/>

      <g class="car__upper">
        <g class="car__body">
          <!-- Full body profile with wheel arch cutouts -->
          <path d="M 52 80 L 128 78 L 136 38 Q 139 28 150 28 L 268 28 Q 278 28 282 38
                   L 290 78 L 350 80 Q 360 82 360 92 L 360 155
                   L ${wr.cx + wr.r + 4} 155 A 32 32 0 0 0 ${wr.cx - wr.r - 4} 155
                   L ${wf.cx + wf.r + 4} 155 A 32 32 0 0 0 ${wf.cx - wf.r - 4} 155
                   L 42 155 L 42 92 Q 42 82 52 80 Z"
                class="svg-paint"/>
          <!-- Upper gloss band -->
          <path d="M 52 80 L 350 80 Q 360 82 360 92 L 360 100 L 42 100 L 42 92 Q 42 82 52 80 Z"
                fill="rgba(255,255,255,0.1)"/>
          <!-- Lower trim -->
          <rect x="42" y="142" width="318" height="13" rx="2" fill="rgba(0,0,0,0.1)"/>
          <!-- Roof (invisible same-colour layer for fresh-paint animation target) -->
          <path class="car__roof svg-paint" d="M 136 38 Q 139 28 150 28 L 268 28 Q 278 28 282 38 L 290 78 L 128 78 Z"
                opacity="0"/>
          <!-- Roof gloss -->
          <rect x="148" y="28" width="126" height="7" rx="3" fill="rgba(255,255,255,0.14)"/>
        </g>

        <!-- Windows -->
        <path d="M 134 76 L 142 38 Q 144 32 152 32 L 195 32 L 195 76 Z"
              fill="rgba(135,206,250,0.6)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
        <path d="M 205 76 L 205 32 L 264 32 Q 272 32 276 38 L 286 76 Z"
              fill="rgba(135,206,250,0.6)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
        <!-- Reflections -->
        <path d="M 140 73 L 146 42 L 156 34 L 152 73 Z" fill="rgba(255,255,255,0.22)"/>
        <path d="M 210 73 L 210 34 L 220 34 L 220 73 Z" fill="rgba(255,255,255,0.18)"/>
        <!-- B-pillar -->
        <rect x="195" y="30" width="10" height="48" rx="1" class="svg-paint"/>

        <!-- Taxi sign -->
        <rect x="200" y="18" width="42" height="12" rx="4" fill="#ffe066" stroke="#d4a44c" stroke-width="1"/>

        <!-- Driver -->
        <g class="car__driver">
          <ellipse cx="172" cy="56" rx="10" ry="12" fill="${skinColour}"/>
          <path d="M 162 50 Q 162 41 172 39 Q 182 41 182 50 Q 180 47 172 46 Q 164 47 162 50 Z" fill="${hairColour}"/>
          <circle cx="168" cy="54" r="1.8" fill="#222"/>
          <circle cx="176" cy="54" r="1.8" fill="#222"/>
        </g>

        <!-- Headlight -->
        <path d="M 40 94 L 48 92 L 48 112 L 40 110 Z" fill="#ffe066"/>
        <path d="M 40 94 L 48 92 L 48 101 L 40 99 Z" fill="rgba(255,255,255,0.35)"/>
        <!-- Taillight -->
        <rect x="356" y="88" width="6" height="20" rx="2" fill="#ff3333"/>
        <rect x="356" y="112" width="6" height="8" rx="2" fill="#ff8800" opacity="0.7"/>
        <!-- Bumpers -->
        <rect x="34" y="138" width="10" height="18" rx="3" fill="#999" stroke="#888" stroke-width="0.5"/>
        <rect x="358" y="138" width="10" height="18" rx="3" fill="#999" stroke="#888" stroke-width="0.5"/>
        <!-- Door line & handle -->
        <line x1="235" y1="78" x2="235" y2="152" stroke="rgba(0,0,0,0.1)" stroke-width="1.5"/>
        <rect x="244" y="108" width="14" height="4" rx="2" fill="rgba(0,0,0,0.18)"/>
        <!-- Side mirror -->
        <path d="M 130 74 L 122 70 L 120 77 L 128 80 Z" class="svg-paint"/>
        <path d="M 122 70 L 120 77 L 116 75 L 118 69 Z" fill="rgba(135,206,250,0.35)"/>

        ${interactive}
      </g>

      <!-- Jack, wheels on top so body never covers them -->
      ${_jackSVG(200, 176)}
      ${_wheelSVG(wf.cx, wf.cy, wf.r, 'front', wheelStyle)}
      ${_wheelSVG(wr.cx, wr.cy, wr.r, 'rear', wheelStyle)}
    </svg>`;
  }

  /** SUV — taller, boxier, roof rack, bigger wheels */
  function _suvSVG(opts) {
    const { skinColour, hairColour, wheelStyle } = opts;
    const wf = { cx: 95, cy: 158, r: 30 };
    const wr = { cx: 305, cy: 158, r: 30 };

    const interactive = _interactiveSVG(opts, {
      bonnet:  { x: 40, y: 62, w: 65, h: 10 },
      engine:  { x: 42, y: 74, w: 60, h: 55 },
      paint: [
        { cx: 100, cy: 95, rx: 22, ry: 14, o: 0.55, ang: -20 },
        { cx: 240, cy: 110, rx: 24, ry: 16, o: 0.45, ang: 5 },
        { cx: 330, cy: 90, rx: 18, ry: 12, o: 0.45, ang: -35 },
        { cx: 180, cy: 130, rx: 22, ry: 10, o: 0.45, ang: -10 },
      ],
      sticker: { x: 240, y: 72, w: 85, h: 55 },
      mud: [
        { cx: 75, cy: 115, rx: 28, ry: 10, o: 0.8 },
        { cx: 160, cy: 120, rx: 36, ry: 12, o: 0.65 },
        { cx: 250, cy: 118, rx: 28, ry: 11, o: 0.75 },
        { cx: 330, cy: 112, rx: 28, ry: 11, o: 0.7 },
        { cx: 120, cy: 85, rx: 22, ry: 10, o: 0.5 },
        { cx: 280, cy: 80, rx: 20, ry: 9, o: 0.45 },
        { cx: 300, cy: 45, rx: 16, ry: 8, o: 0.35 },
      ],
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 182" class="car__svg">
      <ellipse class="car__shadow" cx="200" cy="176" rx="175" ry="6" fill="rgba(0,0,0,0.12)"/>

      <g class="car__upper">
        <g class="car__body">
          <!-- Tall boxy body with arch cutouts -->
          <path d="M 45 62 Q 38 60 38 68 L 38 155
                   L ${wf.cx - wf.r - 4} 155 A 34 34 0 0 1 ${wf.cx + wf.r + 4} 155
                   L ${wr.cx - wr.r - 4} 155 A 34 34 0 0 1 ${wr.cx + wr.r + 4} 155
                   L 362 155 L 362 68 Q 362 60 355 62
                   L 300 58 Q 298 18 280 14 L 120 14 Q 102 18 100 58
                   L 45 62 Z"
                class="svg-paint"/>
          <!-- Gloss -->
          <path d="M 45 62 L 100 58 L 300 58 L 355 62 Q 362 64 362 68 L 362 82 L 38 82 L 38 68 Q 38 64 45 62 Z"
                fill="rgba(255,255,255,0.1)"/>
          <!-- Lower trim -->
          <rect x="38" y="142" width="324" height="13" rx="2" fill="rgba(0,0,0,0.1)"/>
          <path class="car__roof svg-paint" d="M 100 58 Q 102 18 120 14 L 280 14 Q 298 18 300 58 Z"
                opacity="0"/>
          <!-- Roof gloss -->
          <rect x="128" y="14" width="144" height="6" rx="3" fill="rgba(255,255,255,0.14)"/>
        </g>

        <!-- Roof rack -->
        <rect x="130" y="8" width="140" height="3" rx="1.5" fill="#666"/>
        <rect x="150" y="5" width="3" height="6" rx="1" fill="#666"/>
        <rect x="200" y="5" width="3" height="6" rx="1" fill="#666"/>
        <rect x="250" y="5" width="3" height="6" rx="1" fill="#666"/>

        <!-- Windows (tall) -->
        <path d="M 105 56 L 112 22 Q 115 16 124 16 L 190 16 L 190 56 Z"
              fill="rgba(135,206,250,0.6)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
        <path d="M 200 56 L 200 16 L 274 16 Q 282 16 286 22 L 295 56 Z"
              fill="rgba(135,206,250,0.6)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
        <path d="M 140 54 L 144 26 L 154 18 L 150 54 Z" fill="rgba(255,255,255,0.22)"/>
        <path d="M 205 54 L 205 18 L 216 18 L 216 54 Z" fill="rgba(255,255,255,0.18)"/>
        <!-- B-pillar -->
        <rect x="190" y="14" width="10" height="44" rx="1" class="svg-paint"/>

        <!-- Driver -->
        <g class="car__driver">
          <ellipse cx="155" cy="38" rx="10" ry="12" fill="${skinColour}"/>
          <path d="M 145 32 Q 145 23 155 21 Q 165 23 165 32 Q 163 29 155 28 Q 147 29 145 32 Z" fill="${hairColour}"/>
          <circle cx="151" cy="36" r="1.8" fill="#222"/>
          <circle cx="159" cy="36" r="1.8" fill="#222"/>
        </g>

        <!-- Headlight (big rectangular) -->
        <rect x="34" y="68" width="8" height="16" rx="2" fill="#ffe066"/>
        <rect x="34" y="68" width="8" height="8" rx="2" fill="rgba(255,255,255,0.35)"/>
        <!-- Taillight -->
        <rect x="358" y="68" width="6" height="22" rx="2" fill="#ff3333"/>
        <!-- Bumpers -->
        <rect x="30" y="140" width="12" height="16" rx="3" fill="#666" stroke="#555" stroke-width="0.5"/>
        <rect x="358" y="140" width="12" height="16" rx="3" fill="#666" stroke="#555" stroke-width="0.5"/>
        <!-- Door line & handle -->
        <line x1="225" y1="58" x2="225" y2="152" stroke="rgba(0,0,0,0.1)" stroke-width="1.5"/>
        <rect x="232" y="95" width="14" height="4" rx="2" fill="rgba(0,0,0,0.18)"/>
        <!-- Side mirror -->
        <path d="M 102 56 L 94 52 L 92 58 L 100 62 Z" class="svg-paint"/>
        <path d="M 94 52 L 92 58 L 88 56 L 90 51 Z" fill="rgba(135,206,250,0.35)"/>

        ${interactive}
      </g>

      ${_jackSVG(200, 176)}
      ${_wheelSVG(wf.cx, wf.cy, wf.r, 'front', wheelStyle)}
      ${_wheelSVG(wr.cx, wr.cy, wr.r, 'rear', wheelStyle)}
    </svg>`;
  }

  /** Sports car — low, long hood, aggressive, spoiler */
  function _sportsSVG(opts) {
    const { skinColour, hairColour, wheelStyle } = opts;
    const wf = { cx: 90, cy: 158, r: 26 };
    const wr = { cx: 315, cy: 158, r: 26 };

    const interactive = _interactiveSVG(opts, {
      bonnet:  { x: 38, y: 90, w: 145, h: 10 },
      engine:  { x: 42, y: 102, w: 135, h: 45 },
      paint: [
        { cx: 130, cy: 118, rx: 28, ry: 14, o: 0.55, ang: -15 },
        { cx: 280, cy: 115, rx: 20, ry: 12, o: 0.45, ang: -30 },
        { cx: 350, cy: 108, rx: 16, ry: 10, o: 0.45, ang: 8 },
        { cx: 200, cy: 135, rx: 22, ry: 10, o: 0.45, ang: -22 },
      ],
      sticker: { x: 270, y: 92, w: 75, h: 42 },
      mud: [
        { cx: 85, cy: 125, rx: 26, ry: 10, o: 0.8 },
        { cx: 170, cy: 128, rx: 34, ry: 10, o: 0.65 },
        { cx: 260, cy: 126, rx: 26, ry: 10, o: 0.75 },
        { cx: 340, cy: 120, rx: 26, ry: 9, o: 0.7 },
        { cx: 130, cy: 108, rx: 20, ry: 9, o: 0.5 },
        { cx: 300, cy: 102, rx: 18, ry: 8, o: 0.45 },
        { cx: 260, cy: 72, rx: 14, ry: 7, o: 0.35 },
      ],
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 182" class="car__svg">
      <ellipse class="car__shadow" cx="200" cy="176" rx="175" ry="6" fill="rgba(0,0,0,0.12)"/>

      <g class="car__upper">
        <g class="car__body">
          <!-- Low aggressive body with arch cutouts -->
          <path d="M 38 92 Q 32 90 32 96 L 32 155
                   L ${wf.cx - wf.r - 4} 155 A 30 30 0 0 1 ${wf.cx + wf.r + 4} 155
                   L ${wr.cx - wr.r - 4} 155 A 30 30 0 0 1 ${wr.cx + wr.r + 4} 155
                   L 368 155 L 368 96 Q 368 90 362 92
                   L 310 88 Q 305 62 290 58 L 225 58 Q 215 62 210 88
                   L 38 92 Z"
                class="svg-paint"/>
          <!-- Gloss band -->
          <path d="M 38 92 L 210 88 L 310 88 L 362 92 Q 368 94 368 96 L 368 108 L 32 108 L 32 96 Q 32 94 38 92 Z"
                fill="rgba(255,255,255,0.1)"/>
          <!-- Side skirt -->
          <rect x="50" y="146" width="300" height="9" rx="2" fill="rgba(0,0,0,0.15)"/>
          <path class="car__roof svg-paint" d="M 210 88 Q 215 62 225 58 L 290 58 Q 305 62 310 88 Z"
                opacity="0"/>
          <rect x="232" y="58" width="50" height="5" rx="2" fill="rgba(255,255,255,0.14)"/>
        </g>

        <!-- Hood scoop -->
        <rect x="100" y="88" width="35" height="5" rx="2" fill="rgba(0,0,0,0.15)"/>
        <!-- Side intake -->
        <rect x="145" y="112" width="22" height="10" rx="2" fill="#222" opacity="0.4"/>

        <!-- Windows (small, angled) -->
        <path d="M 215 86 L 222 64 Q 224 60 230 60 L 260 60 L 260 86 Z"
              fill="rgba(135,206,250,0.55)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
        <path d="M 268 86 L 268 60 L 286 60 Q 292 60 296 66 L 306 86 Z"
              fill="rgba(135,206,250,0.5)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
        <path d="M 220 84 L 225 67 L 234 62 L 230 84 Z" fill="rgba(255,255,255,0.2)"/>
        <!-- B-pillar -->
        <rect x="260" y="58" width="8" height="30" rx="1" class="svg-paint"/>

        <!-- Spoiler -->
        <path d="M 340 88 L 365 80 L 370 83 L 345 90 Z" class="svg-paint" opacity="0.8"/>

        <!-- Driver -->
        <g class="car__driver">
          <ellipse cx="245" cy="72" rx="8" ry="10" fill="${skinColour}"/>
          <path d="M 237 67 Q 237 60 245 58 Q 253 60 253 67 Q 251 64 245 63 Q 239 64 237 67 Z" fill="${hairColour}"/>
          <circle cx="242" cy="71" r="1.5" fill="#222"/>
          <circle cx="248" cy="71" r="1.5" fill="#222"/>
        </g>

        <!-- Headlight (aggressive wedge) -->
        <path d="M 34 98 L 42 95 L 42 108 L 34 106 Z" fill="#ffe066"/>
        <!-- Taillight (wide strip) -->
        <rect x="362" y="96" width="8" height="8" rx="2" fill="#ff3333"/>
        <rect x="362" y="108" width="8" height="6" rx="2" fill="#ff3333" opacity="0.7"/>
        <!-- Exhaust pipes -->
        <circle cx="364" cy="148" r="4" fill="#444" stroke="#555" stroke-width="1"/>
        <circle cx="374" cy="148" r="4" fill="#444" stroke="#555" stroke-width="1"/>
        <!-- Bumpers -->
        <rect x="28" y="140" width="8" height="16" rx="2" fill="#888"/>
        <rect x="364" y="140" width="8" height="16" rx="2" fill="#888"/>
        <!-- Door line -->
        <line x1="262" y1="86" x2="262" y2="150" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
        <!-- Side mirror -->
        <path d="M 212 84 L 206 80 L 204 86 L 210 88 Z" class="svg-paint"/>
        <path d="M 206 80 L 204 86 L 200 84 L 202 79 Z" fill="rgba(135,206,250,0.35)"/>

        ${interactive}
      </g>

      ${_jackSVG(200, 176)}
      ${_wheelSVG(wf.cx, wf.cy, wf.r, 'front', wheelStyle)}
      ${_wheelSVG(wr.cx, wr.cy, wr.r, 'rear', wheelStyle)}
    </svg>`;
  }

  const TEMPLATES = { sedan: _sedanSVG, suv: _suvSVG, sports: _sportsSVG };

  /* ─── Public ─── */

  /**
   * Create a car element and append it to the garage.
   * @param {HTMLElement} garage - container element
   * @param {object} opts - { colour, faults, flatTyre, shape }
   * @returns {object} controller
   */
  function create(garage, opts = {}) {
    const colour = opts.colour || CONFIG.carColour;
    const shapes = CONFIG.carShapes;
    const shape = opts.shape || _pick(shapes);
    const faults = opts.faults || ['flatTyre'];
    const flatTyre = opts.flatTyre ?? 'front';

    const hasFlatTyre = faults.includes('flatTyre');
    const hasEngine = faults.includes('engine');
    const hasPaint = faults.includes('paint');
    const hasSticker = faults.includes('sticker');
    const hasWash = faults.includes('wash');

    const el = document.createElement('div');
    el.className = `car car--${shape}`;
    el.style.setProperty('--car-colour', colour);

    const skinColour = _pick(SKIN_TONES);
    const hairColour = _pick(HAIR_COLOURS);
    const templateFn = TEMPLATES[shape] || TEMPLATES.sedan;

    const wheelStyle = _pick(CONFIG.wheelStyles);
    el.innerHTML = `
      <div class="car__dashboard">
        <div class="car__indicator car__indicator--tyre ${hasFlatTyre ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>
        <div class="car__indicator car__indicator--engine ${hasEngine ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>
        <div class="car__indicator car__indicator--wash ${hasWash ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>
        <div class="car__indicator car__indicator--paint ${hasPaint ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>
        <div class="car__indicator car__indicator--sticker ${hasSticker ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>
      </div>
      ${templateFn({ skinColour, hairColour, hasFlatTyre, flatTyre, hasEngine, hasPaint, hasSticker, hasWash, wheelStyle })}
    `;

    // Apply flat tyre after DOM construction
    if (hasFlatTyre) {
      const tyre = el.querySelector(`.car__tyre--${flatTyre}`);
      if (tyre) tyre.classList.add('car__tyre--flat');
    }

    garage.appendChild(el);

    return {
      el,
      faults,
      flatTyre,
      type: 'car',
      getFlatTyreEl() {
        return el.querySelector(`.car__tyre--${flatTyre}`);
      },
      fixTyre() {
        const tyre = this.getFlatTyreEl();
        if (tyre) {
          tyre.classList.remove('car__tyre--flat');
          tyre.classList.add('car__tyre--fixing');
          setTimeout(() => tyre.classList.remove('car__tyre--fixing'), 400);
        }
      },
      slideIn() {
        el.classList.add('car--entering');
        el.offsetHeight;
        el.classList.remove('car--entering');
        el.classList.add('car--parked');
      },
      driveAway() {
        return new Promise(resolve => {
          el.classList.remove('car--parked');
          // Hide the jack so it doesn't fly away with the car
          const jack = el.querySelector('.car__jack');
          if (jack) jack.style.display = 'none';
          const anims = CONFIG.exitAnimations;
          const anim = _pick(anims);
          if (anim === 'rocket') {
            const flame = document.createElement('div');
            flame.className = 'car__flame';
            el.appendChild(flame);
          }
          el.classList.add(`car--exit-${anim}`);
          el.addEventListener('animationend', (e) => {
            if (e.target !== el) return;
            el.remove();
            resolve();
          }, { once: true });
          setTimeout(() => { el.remove(); resolve(); }, 2000 / CONFIG.gameSpeed);
        });
      },
      remove() { el.remove(); },
    };
  }

  /** Build replacement tyre SVG for flat-tyre repair */
  function replacementWheelSVG(cx, cy, r, position, style) {
    style = style || _pick(CONFIG.wheelStyles);
    return _wheelSVG(cx, cy, r, position, style);
  }

  /** Small standalone wheel SVG for picker thumbnails */
  function wheelPreviewSVG(style) {
    return `<svg viewBox="0 0 60 60" width="48" height="48">${_wheelSVG(30, 30, 26, 'preview', style)}</svg>`;
  }

  return { create, replacementWheelSVG, wheelPreviewSVG };
})();

/**
 * Robot rendering — inline SVG with all interactive elements embedded.
 * 1950s boxy retro-bot, same 400×182 viewBox and controller interface as Car.
 */
const Robot = (() => {

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ─── SVG helpers ─── */

  /** Boot with 3 tappable bolt screws (tyre equivalent) */
  function _bootSVG(x, y, position) {
    const bw = 40, bh = 26;
    const boltR = 3;
    const touchR = boltR * 2.8;
    // 3 bolts across the boot sole
    const bolts = [0, 1, 2].map((i) => {
      const bx = x + 8 + i * 12;
      const by = y + bh - 6;
      const cr = boltR * 0.6;
      return `<g class="robot__bolt robot__bolt--${i+1}" data-bolt="${i+1}">
        <circle class="robot__bolt-halo" cx="${bx}" cy="${by}" r="${touchR}" style="fill:transparent"/>
        <circle cx="${bx}" cy="${by}" r="${boltR}" style="fill:#999;stroke:#777;stroke-width:1.5"/>
        <line x1="${bx-cr}" y1="${by}" x2="${bx+cr}" y2="${by}" style="stroke:#555;stroke-width:1.5"/>
        <line x1="${bx}" y1="${by-cr}" x2="${bx}" y2="${by+cr}" style="stroke:#555;stroke-width:1.5"/>
      </g>`;
    }).join('');

    return `<g class="robot__boot robot__boot--${position}" data-position="${position}">
      <path class="robot__boot-shell" d="M ${x} ${y+4} L ${x} ${y+bh} L ${x+bw} ${y+bh} L ${x+bw} ${y+8} L ${x+bw-6} ${y} L ${x+4} ${y} Z"
            style="fill:#888;stroke:#666;stroke-width:1.5"/>
      <rect x="${x+2}" y="${y+bh-4}" width="${bw-4}" height="4" rx="1" style="fill:#777"/>
      ${bolts}
    </g>`;
  }

  /** Lift pad (jack equivalent) — platform beneath robot */
  /** Crane lift — vertical pole on the right with horizontal arm, cable and hook.
   *  Rendered before robot__upper so it sits behind jetpack/balloons. */
  function _craneSVG() {
    // Pole on the right side, arm extends left over the robot
    const poleX = 370, poleW = 10;       // vertical pole
    const poleTop = -5, poleBot = 178;    // full height
    const armY = -5, armH = 7;            // horizontal boom (antenna level — proven visible)
    const armLeft = 185, armRight = poleX + poleW / 2;
    const cableX = 200;                   // cable hangs over robot centre
    const cableTop = armY + armH;
    const cableH = 12;
    const hookY = cableTop + cableH;

    return `<g class="robot__lift-pad">
      <!-- Vertical pole -->
      <rect class="robot__lift-pad-base" x="${poleX}" y="${poleTop}" width="${poleW}" height="${poleBot - poleTop}" rx="2"
            style="fill:#e07020;stroke:#c45e18;stroke-width:1"/>
      <!-- Diagonal brace -->
      <line x1="${poleX}" y1="${armY + armH + 20}" x2="${armRight - 20}" y2="${armY}" style="stroke:#c45e18;stroke-width:2"/>
      <!-- Horizontal arm -->
      <rect x="${armLeft}" y="${armY}" width="${armRight - armLeft}" height="${armH}" rx="2"
            style="fill:#e8822a;stroke:#c45e18;stroke-width:1"/>
      <!-- Cable -->
      <rect class="robot__lift-pad-arm" x="${cableX - 1.5}" y="${cableTop}" width="3" height="${cableH}" rx="1" style="fill:#888"/>
      <!-- Hook -->
      <path d="M${cableX - 5},${hookY} Q${cableX - 5},${hookY + 7} ${cableX},${hookY + 9} Q${cableX + 5},${hookY + 7} ${cableX + 5},${hookY}"
            fill="none" stroke="#aaa" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Arrows -->
      <g class="robot__lift-pad-arrow">
        <text class="robot__lift-pad-arrow-up" x="${cableX}" y="${hookY + 18}" text-anchor="middle" font-size="16" fill="#ffe066">▲</text>
        <text class="robot__lift-pad-arrow-down" x="${cableX}" y="${hookY + 18}" text-anchor="middle" font-size="16" fill="#ffe066">▼</text>
      </g>
      <!-- Touch target -->
      <rect x="${cableX - 25}" y="${armY}" width="50" height="${cableH + 30}" fill="transparent"/>
    </g>`;
  }

  /** Arm style definitions — shared by renderer and picker */
  const ARM_STYLES = {
    standard: {
      colour: '#aaa', strokeColour: '#888',
      tool: (midX, clawY, w) => {
        const clawW = w * 0.4;
        return `<rect x="${midX - clawW/2}" y="${clawY}" width="${clawW}" height="8" rx="2" style="fill:#999;stroke:#777;stroke-width:1"/>`;
      },
    },
    saw: {
      colour: '#aaa', strokeColour: '#888',
      tool: (midX, clawY) => {
        const r = 7;
        const teeth = Array.from({ length: 12 }, (_, i) => {
          const a = i * 30 * Math.PI / 180;
          const ro = r + 2, ri = r;
          return `${i === 0 ? 'M' : 'L'} ${midX + Math.cos(a) * ro} ${clawY + 4 + Math.sin(a) * ro} ` +
                 `L ${midX + Math.cos(a + 15 * Math.PI / 180) * ri} ${clawY + 4 + Math.sin(a + 15 * Math.PI / 180) * ri}`;
        }).join(' ');
        return `<circle cx="${midX}" cy="${clawY + 4}" r="${r}" style="fill:#ccc;stroke:#999;stroke-width:1"/>` +
               `<path d="${teeth} Z" style="fill:#ddd;stroke:#aaa;stroke-width:0.5"/>` +
               `<circle cx="${midX}" cy="${clawY + 4}" r="2" style="fill:#888"/>`;
      },
    },
    screwdriver: {
      colour: '#aaa', strokeColour: '#888',
      tool: (midX, clawY) =>
        `<rect x="${midX - 2}" y="${clawY}" width="4" height="12" rx="1" style="fill:#f4a261;stroke:#c88030;stroke-width:1"/>` +
        `<rect x="${midX - 1}" y="${clawY + 12}" width="2" height="6" rx="0.5" style="fill:#bbb;stroke:#999;stroke-width:0.5"/>`,
    },
    hammer: {
      colour: '#aaa', strokeColour: '#888',
      tool: (midX, clawY) =>
        `<rect x="${midX - 1.5}" y="${clawY}" width="3" height="10" rx="1" style="fill:#8b6914;stroke:#6b4c10;stroke-width:0.5"/>` +
        `<rect x="${midX - 6}" y="${clawY + 10}" width="12" height="6" rx="1" style="fill:#888;stroke:#666;stroke-width:1"/>`,
    },
  };

  /** Booster style definitions — SVG generators for behind-torso, flames, and strap */
  const BOOSTER_STYLES = {
    jetpack: {
      exitAnim: 'jetpack',
      behind: () => `
        <rect x="138" y="72" width="16" height="36" rx="4" fill="#666" stroke="#555" stroke-width="1.5"/>
        <rect x="140" y="77" width="12" height="6" rx="2" fill="#888"/>
        <rect x="140" y="87" width="12" height="6" rx="2" fill="#888"/>
        <circle cx="146" cy="80" r="2" fill="#e63946"/>
        <circle cx="146" cy="90" r="2" fill="#e63946"/>
        <rect x="246" y="72" width="16" height="36" rx="4" fill="#666" stroke="#555" stroke-width="1.5"/>
        <rect x="248" y="77" width="12" height="6" rx="2" fill="#888"/>
        <rect x="248" y="87" width="12" height="6" rx="2" fill="#888"/>
        <circle cx="254" cy="80" r="2" fill="#e63946"/>
        <circle cx="254" cy="90" r="2" fill="#e63946"/>`,
      flames: () => `
        <ellipse cx="146" cy="112" rx="5" ry="10" fill="#ff6600" opacity="0.8"/>
        <ellipse cx="147" cy="114" rx="3" ry="7" fill="#ffcc00" opacity="0.7"/>
        <ellipse cx="254" cy="112" rx="5" ry="10" fill="#ff6600" opacity="0.8"/>
        <ellipse cx="253" cy="114" rx="3" ry="7" fill="#ffcc00" opacity="0.7"/>`,
      strap: () => `
        <line x1="148" y1="82" x2="252" y2="82" stroke="#555" stroke-width="2.5"/>
        <rect x="188" y="78" width="24" height="8" rx="2" fill="#777" stroke="#666" stroke-width="1"/>`,
    },
    rocket: {
      exitAnim: 'rocket-boost',
      behind: () => `
        <rect x="140" y="68" width="14" height="44" rx="3" fill="#c44" stroke="#a33" stroke-width="1.5"/>
        <rect x="142" y="72" width="10" height="10" rx="2" fill="#e63946"/>
        <rect x="142" y="86" width="10" height="10" rx="2" fill="#e63946"/>
        <circle cx="147" cy="77" r="2.5" fill="#fff" opacity="0.6"/>
        <circle cx="147" cy="91" r="2.5" fill="#fff" opacity="0.6"/>
        <rect x="246" y="68" width="14" height="44" rx="3" fill="#c44" stroke="#a33" stroke-width="1.5"/>
        <rect x="248" y="72" width="10" height="10" rx="2" fill="#e63946"/>
        <rect x="248" y="86" width="10" height="10" rx="2" fill="#e63946"/>
        <circle cx="253" cy="77" r="2.5" fill="#fff" opacity="0.6"/>
        <circle cx="253" cy="91" r="2.5" fill="#fff" opacity="0.6"/>`,
      flames: () => `
        <ellipse cx="147" cy="116" rx="6" ry="14" fill="#ff4400" opacity="0.9"/>
        <ellipse cx="147" cy="118" rx="3" ry="10" fill="#ffcc00" opacity="0.8"/>
        <ellipse cx="253" cy="116" rx="6" ry="14" fill="#ff4400" opacity="0.9"/>
        <ellipse cx="253" cy="118" rx="3" ry="10" fill="#ffcc00" opacity="0.8"/>`,
      strap: () => `
        <line x1="148" y1="82" x2="252" y2="82" stroke="#a33" stroke-width="3"/>
        <rect x="186" y="76" width="28" height="12" rx="3" fill="#c44" stroke="#a33" stroke-width="1"/>`,
    },
    propeller: {
      exitAnim: 'propeller',
      behind: () => `
        <rect x="192" y="-12" width="16" height="16" rx="2" fill="#888" stroke="#666" stroke-width="1"/>
        <circle cx="200" cy="-4" r="3" fill="#555"/>
        <rect x="175" y="-16" width="50" height="80" fill="transparent"/>`,
      flames: () => `
        <line x1="172" y1="-4" x2="228" y2="-4" stroke="#aaa" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="172" cy="-4" rx="8" ry="3" fill="#ccc" stroke="#aaa" stroke-width="0.5"/>
        <ellipse cx="228" cy="-4" rx="8" ry="3" fill="#ccc" stroke="#aaa" stroke-width="0.5"/>`,
      strap: () => '',
    },
    balloon: {
      exitAnim: 'balloon',
      behind: () => `
        <line x1="200" y1="-10" x2="200" y2="10" stroke="#888" stroke-width="1.5"/>
        <rect x="175" y="-10" width="50" height="80" fill="transparent"/>`,
      flames: () => `
        <ellipse cx="200" cy="-38" rx="22" ry="28" fill="#e63946" stroke="#c33" stroke-width="1.5"/>
        <ellipse cx="196" cy="-43" rx="7" ry="14" fill="rgba(255,255,255,0.15)"/>
        <path d="M196,-11 L200,-13 L204,-11" fill="#e63946" stroke="#c33" stroke-width="1"/>`,
      strap: () => '',
    },
  };

  /** Build booster behind-torso SVG for a given style */
  function _boosterBehindSVG(style) {
    const s = BOOSTER_STYLES[style] || BOOSTER_STYLES.jetpack;
    return s.behind();
  }

  /** Build booster flames SVG */
  function _boosterFlamesSVG(style) {
    const s = BOOSTER_STYLES[style] || BOOSTER_STYLES.jetpack;
    return s.flames();
  }

  /** Build booster chest strap SVG */
  function _boosterStrapSVG(style) {
    const s = BOOSTER_STYLES[style] || BOOSTER_STYLES.jetpack;
    return s.strap();
  }

  /** Small standalone booster SVG for picker thumbnails */
  function boosterPreviewSVG(style) {
    const s = BOOSTER_STYLES[style] || BOOSTER_STYLES.jetpack;
    // Render a compact preview centred on a small viewBox
    const previews = {
      jetpack: `<rect x="6" y="8" width="10" height="24" rx="3" fill="#666" stroke="#555" stroke-width="1"/>
        <rect x="24" y="8" width="10" height="24" rx="3" fill="#666" stroke="#555" stroke-width="1"/>
        <circle cx="11" cy="16" r="2" fill="#e63946"/><circle cx="29" cy="16" r="2" fill="#e63946"/>
        <ellipse cx="11" cy="36" rx="3" ry="6" fill="#ff6600" opacity="0.8"/>
        <ellipse cx="29" cy="36" rx="3" ry="6" fill="#ff6600" opacity="0.8"/>`,
      rocket: `<rect x="6" y="6" width="10" height="28" rx="3" fill="#c44" stroke="#a33" stroke-width="1"/>
        <rect x="24" y="6" width="10" height="28" rx="3" fill="#c44" stroke="#a33" stroke-width="1"/>
        <circle cx="11" cy="14" r="2.5" fill="#fff" opacity="0.6"/><circle cx="29" cy="14" r="2.5" fill="#fff" opacity="0.6"/>
        <ellipse cx="11" cy="38" rx="4" ry="8" fill="#ff4400" opacity="0.9"/>
        <ellipse cx="29" cy="38" rx="4" ry="8" fill="#ff4400" opacity="0.9"/>`,
      propeller: `<rect x="16" y="18" width="8" height="10" rx="2" fill="#888" stroke="#666" stroke-width="1"/>
        <circle cx="20" cy="23" r="2" fill="#555"/>
        <line x1="4" y1="16" x2="36" y2="16" stroke="#aaa" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="6" cy="16" rx="6" ry="2.5" fill="#ccc"/><ellipse cx="34" cy="16" rx="6" ry="2.5" fill="#ccc"/>`,
      balloon: `<ellipse cx="20" cy="14" rx="14" ry="18" fill="#e63946" stroke="#c33" stroke-width="1"/>
        <line x1="20" y1="32" x2="20" y2="42" stroke="#888" stroke-width="1.5"/>
        <path d="M17,42 L20,40 L23,42" fill="#e63946"/>`,
    };
    return `<svg viewBox="0 0 40 48" width="40" height="48">${previews[style] || previews.jetpack}</svg>`;
  }

  /** Accordion arm — zigzag path with shoulder rivet and tool hand */
  function _armSVG(x, y, w, h, side, style = 'standard') {
    const s = ARM_STYLES[style] || ARM_STYLES.standard;
    const midX = x + w / 2;
    // Zigzag segments
    const segH = h / 4;
    const zag = w * 0.35;
    const path = `M ${midX} ${y}
      L ${midX + zag} ${y + segH}
      L ${midX - zag} ${y + segH * 2}
      L ${midX + zag} ${y + segH * 3}
      L ${midX} ${y + h}`;

    const toolSVG = s.tool(midX, y + h, w);

    return `<g class="robot__arm robot__arm--${side}" data-arm-style="${style}">
      <circle cx="${midX}" cy="${y}" r="5" style="fill:${s.colour};stroke:${s.strokeColour};stroke-width:1.5"/>
      <path d="${path}" style="fill:none;stroke:${s.colour};stroke-width:5;stroke-linejoin:round;stroke-linecap:round"/>
      ${toolSVG}
    </g>`;
  }

  /** Small standalone arm SVG for picker thumbnails */
  function armPreviewSVG(style) {
    return `<svg viewBox="0 0 40 60" width="36" height="52">${_armSVG(6, 2, 28, 34, 'preview', style)}</svg>`;
  }

  /** Build replacement arm SVG for arm repair (same coords as the left arm in template) */
  function replacementArmSVG(style) {
    return _armSVG(118, 70, 28, 44, 'left', style);
  }

  /** Robot interactive SVG elements — sparks, chest panel, plating damage, badge zone, grime */
  function _robotInteractiveSVG(opts) {
    const { hasEngine, hasPaint, hasSticker, hasWash,
            hasArmJoint, hasLegsRepair, hasVoiceModule, hasJetpack } = opts;

    // Spark positions — from chest area
    const sparkX = 200, sparkY = 63;

    return `
      <!-- Sparks (visible only with engine/power-core fault) -->
      <g class="robot__sparks ${hasEngine ? '' : 'robot__sparks--hidden'}">
        <line class="robot__spark robot__spark--1" x1="${sparkX-8}" y1="${sparkY}" x2="${sparkX-14}" y2="${sparkY-10}" style="stroke:#ffe066;stroke-width:2"/>
        <line class="robot__spark robot__spark--2" x1="${sparkX+12}" y1="${sparkY+4}" x2="${sparkX+20}" y2="${sparkY-6}" style="stroke:#ffaa00;stroke-width:2"/>
        <line class="robot__spark robot__spark--3" x1="${sparkX}" y1="${sparkY-2}" x2="${sparkX+6}" y2="${sparkY-14}" style="stroke:#ffe066;stroke-width:1.5"/>
        <line class="robot__spark robot__spark--4" x1="${sparkX-4}" y1="${sparkY+6}" x2="${sparkX-12}" y2="${sparkY+16}" style="stroke:#ffaa00;stroke-width:1.5"/>
      </g>

      <!-- Chest panel (bonnet equivalent — opens to reveal power core or voice slot) -->
      <g class="robot__chest-panel ${(hasEngine || hasVoiceModule) ? '' : 'robot__chest-panel--hidden'}">
        <rect class="robot__chest-panel-lid svg-robot-paint" x="168" y="68" width="64" height="30" rx="2" opacity="0.9"/>
        <rect x="168" y="68" width="64" height="50" fill="transparent"/>
      </g>

      <!-- Power core bay (engine bay equivalent) -->
      <g class="robot__power-core-bay ${hasEngine ? '' : 'robot__power-core-bay--hidden'}">
        <rect x="172" y="72" width="56" height="24" rx="2" fill="#333"/>
        <rect class="robot__power-core robot__power-core--broken"
              x="180" y="76" width="40" height="16" rx="3"
              fill="#66ccff" stroke="#44aadd" stroke-width="1.5"/>
        <circle cx="200" cy="84" r="4" fill="#44aadd" stroke="#3399bb" stroke-width="1"/>
      </g>

      <!-- Plating damage (paint equivalent — dent/scratch lines on torso/head) -->
      <g class="robot__plating-damage ${hasPaint ? '' : 'robot__plating-damage--hidden'}">
        <rect x="140" y="8" width="120" height="118" fill="transparent"/>
        <line x1="165" y1="75" x2="190" y2="82" stroke="rgba(40,50,60,0.5)" stroke-width="3" stroke-linecap="round"/>
        <line x1="210" y1="70" x2="240" y2="78" stroke="rgba(40,50,60,0.45)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="175" y1="95" x2="195" y2="105" stroke="rgba(40,50,60,0.4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="220" y1="100" x2="238" y2="95" stroke="rgba(40,50,60,0.45)" stroke-width="2.5" stroke-linecap="round"/>
      </g>

      <!-- Badge zone (sticker equivalent) -->
      <g class="robot__badge-zone ${hasSticker ? '' : 'robot__badge-zone--hidden'}">
        <rect x="164" y="78" width="72" height="40" rx="4"
              fill="transparent" stroke="rgba(0,0,0,0.35)" stroke-dasharray="4 3" stroke-width="2"/>
        <text class="robot__badge-text" x="200" y="98"
              text-anchor="middle" dominant-baseline="central" font-size="0"></text>
        <rect x="164" y="78" width="72" height="40" fill="transparent"/>
      </g>

      <!-- Oil grime (wash equivalent — dark grey-blue splatters) -->
      <g class="robot__grime ${hasWash ? '' : 'robot__grime--hidden'}">
        <rect x="140" y="8" width="120" height="150" fill="transparent"/>
        <ellipse cx="180" cy="80" rx="18" ry="8" fill="rgba(60,70,90,0.7)"/>
        <ellipse cx="220" cy="95" rx="22" ry="9" fill="rgba(60,70,90,0.6)"/>
        <ellipse cx="195" cy="110" rx="16" ry="7" fill="rgba(60,70,90,0.65)"/>
        <ellipse cx="170" cy="40" rx="14" ry="6" fill="rgba(60,70,90,0.5)"/>
        <ellipse cx="225" cy="35" rx="12" ry="5" fill="rgba(60,70,90,0.45)"/>
        <circle cx="165" cy="88" r="3" fill="rgba(60,70,90,0.5)"/>
        <circle cx="242" cy="100" r="4" fill="rgba(60,70,90,0.55)"/>
      </g>

      <!-- Arm joint damage indicator (loose arm) -->
      <g class="robot__arm-damage ${hasArmJoint ? '' : 'robot__arm-damage--hidden'}">
        <circle cx="133" cy="70" r="6" fill="none" stroke="#e63946" stroke-width="2" stroke-dasharray="3 2"/>
      </g>

      <!-- Leg damage indicator (bent leg) -->
      <g class="robot__leg-damage ${hasLegsRepair ? '' : 'robot__leg-damage--hidden'}">
        <line x1="176" y1="126" x2="172" y2="148" stroke="#e63946" stroke-width="2" stroke-dasharray="3 2"/>
      </g>

      <!-- Voice module slot (inside chest, shown during repair) -->
      <g class="robot__voice-slot robot__voice-slot--hidden">
        <rect x="186" y="78" width="28" height="10" rx="2" fill="#444" stroke="#555" stroke-width="1"/>
      </g>

      <!-- Voice module fault indicator (bandaid over mouth) -->
      <g class="robot__voice-fault ${hasVoiceModule ? '' : 'robot__voice-fault--hidden'}">
        <rect x="183" y="43" width="34" height="10" rx="4" style="fill:#e8c99b;stroke:#d4a44c;stroke-width:1"/>
        <rect x="195" y="43" width="10" height="10" rx="1" style="fill:#d4a44c;opacity:0.5"/>
        <line x1="197" y1="45" x2="203" y2="51" style="stroke:#c49030;stroke-width:1;stroke-linecap:round"/>
        <line x1="203" y1="45" x2="197" y2="51" style="stroke:#c49030;stroke-width:1;stroke-linecap:round"/>
      </g>

      <!-- Speech bubble (shown after voice module installed) -->
      <g class="robot__speech-bubble robot__speech-bubble--hidden">
        <rect x="260" y="10" width="50" height="30" rx="8" fill="#fff" stroke="#ccc" stroke-width="1"/>
        <polygon points="265,40 272,40 260,48" fill="#fff" stroke="#ccc" stroke-width="1"/>
        <text x="285" y="28" text-anchor="middle" font-size="16">🗣️</text>
      </g>

      <!-- Chest strap (rendered on top of torso, after interactive layer) -->
      <g class="robot__jetpack robot__jetpack--hidden">
        <line x1="148" y1="82" x2="252" y2="82" stroke="#555" stroke-width="2.5"/>
        <rect x="188" y="78" width="24" height="8" rx="2" fill="#777" stroke="#666" stroke-width="1"/>
      </g>`;
  }

  /* ─── Shape template ─── */

  /** Standard boxy retro-bot */
  function _standardSVG(opts) {
    const { hasEngine, hasPaint, hasSticker, hasWash,
            hasFlatTyre, flatBoot,
            hasArmJoint, hasLegsRepair, hasVoiceModule, hasJetpack } = opts;

    const interactive = _robotInteractiveSVG(opts);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -60 400 242" class="robot__svg">
      <!-- Shadow -->
      <ellipse class="car__shadow" cx="200" cy="176" rx="120" ry="6" fill="rgba(0,0,0,0.12)"/>

      <!-- Crane (behind robot so jetpack/balloons render in front) -->
      ${_craneSVG()}

      <g class="robot__upper">
        <!-- Antenna -->
        <line x1="200" y1="10" x2="200" y2="-2" style="stroke:#aaa;stroke-width:3"/>
        <circle cx="200" cy="-5" r="4" style="fill:#e63946;stroke:#c33;stroke-width:1"/>
        <rect x="194" y="8" width="12" height="5" rx="1" style="fill:#999"/>

        <!-- Head -->
        <g class="robot__head">
          <rect class="robot__head-box svg-robot-paint" x="160" y="10" width="80" height="45" rx="4"/>
          <!-- Dial eyes -->
          <circle cx="182" cy="32" r="10" style="fill:#222;stroke:#aaa;stroke-width:2"/>
          <circle cx="182" cy="32" r="5" style="fill:#4ae;stroke:#3ad;stroke-width:1"/>
          <circle cx="218" cy="32" r="10" style="fill:#222;stroke:#aaa;stroke-width:2"/>
          <circle cx="218" cy="32" r="5" style="fill:#4ae;stroke:#3ad;stroke-width:1"/>
          <!-- Mouth grille -->
          <rect x="185" y="44" width="30" height="6" rx="1" style="fill:#555"/>
          <line x1="192" y1="44" x2="192" y2="50" style="stroke:#444;stroke-width:1"/>
          <line x1="200" y1="44" x2="200" y2="50" style="stroke:#444;stroke-width:1"/>
          <line x1="208" y1="44" x2="208" y2="50" style="stroke:#444;stroke-width:1"/>
        </g>

        <!-- Neck -->
        <rect x="190" y="55" width="20" height="8" rx="2" style="fill:#999"/>

        <!-- Jetpack mounting brackets (visible before install) -->
        <g class="robot__jetpack-mount ${hasJetpack ? '' : 'robot__jetpack-mount--hidden'}">
          <!-- Left bracket -->
          <path d="M148,74 L140,74 L140,106 L148,106" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round"/>
          <!-- Right bracket -->
          <path d="M252,74 L260,74 L260,106 L252,106" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round"/>
        </g>

        <!-- Jetpack (behind torso — rendered before torso so it sits behind) -->
        <g class="robot__jetpack robot__jetpack--hidden">
          <!-- Left thruster (partially behind torso left edge) -->
          <rect x="138" y="72" width="16" height="36" rx="4" fill="#666" stroke="#555" stroke-width="1.5"/>
          <rect x="140" y="77" width="12" height="6" rx="2" fill="#888"/>
          <rect x="140" y="87" width="12" height="6" rx="2" fill="#888"/>
          <circle cx="146" cy="80" r="2" fill="#e63946"/>
          <circle cx="146" cy="90" r="2" fill="#e63946"/>
          <!-- Right thruster (partially behind torso right edge) -->
          <rect x="246" y="72" width="16" height="36" rx="4" fill="#666" stroke="#555" stroke-width="1.5"/>
          <rect x="248" y="77" width="12" height="6" rx="2" fill="#888"/>
          <rect x="248" y="87" width="12" height="6" rx="2" fill="#888"/>
          <circle cx="254" cy="80" r="2" fill="#e63946"/>
          <circle cx="254" cy="90" r="2" fill="#e63946"/>
        </g>
        <!-- Jetpack flames (from both thrusters) -->
        <g class="robot__jetpack-flames robot__jetpack-flames--hidden">
          <ellipse cx="146" cy="112" rx="5" ry="10" fill="#ff6600" opacity="0.8"/>
          <ellipse cx="147" cy="114" rx="3" ry="7" fill="#ffcc00" opacity="0.7"/>
          <ellipse cx="254" cy="112" rx="5" ry="10" fill="#ff6600" opacity="0.8"/>
          <ellipse cx="253" cy="114" rx="3" ry="7" fill="#ffcc00" opacity="0.7"/>
        </g>

        <!-- Torso -->
        <g class="robot__torso">
          <rect class="robot__torso-box svg-robot-paint" x="148" y="63" width="104" height="56" rx="3"/>
          <!-- Decorative dials on chest -->
          <circle cx="162" cy="78" r="4" style="fill:#555;stroke:#444;stroke-width:1"/>
          <circle cx="162" cy="78" r="1.5" style="fill:#e63946"/>
          <circle cx="162" cy="95" r="4" style="fill:#555;stroke:#444;stroke-width:1"/>
          <circle cx="162" cy="95" r="1.5" style="fill:#2a9d8f"/>
          <circle cx="238" cy="78" r="4" style="fill:#555;stroke:#444;stroke-width:1"/>
          <circle cx="238" cy="78" r="1.5" style="fill:#f4a261"/>
          <!-- Panel seam -->
          <line x1="168" y1="68" x2="168" y2="114" style="stroke:rgba(0,0,0,0.15);stroke-width:1"/>
          <line x1="232" y1="68" x2="232" y2="114" style="stroke:rgba(0,0,0,0.15);stroke-width:1"/>
          <!-- Gloss band -->
          <rect x="148" y="63" width="104" height="8" rx="3" fill="rgba(255,255,255,0.08)"/>
        </g>

        <!-- Arms -->
        ${_armSVG(118, 70, 28, 44, 'left')}
        ${_armSVG(254, 70, 28, 44, 'right')}

        <!-- Legs -->
        <rect class="robot__leg robot__leg--left" x="168" y="122" width="16" height="28" rx="2" style="fill:#999;stroke:#888;stroke-width:1"/>
        <rect class="robot__leg robot__leg--right" x="216" y="122" width="16" height="28" rx="2" style="fill:#999;stroke:#888;stroke-width:1"/>

        ${interactive}
      </g>

      <!-- Boots on top so body never covers them -->
      ${_bootSVG(156, 150, 'left')}
      ${_bootSVG(204, 150, 'right')}
    </svg>`;
  }

  const TEMPLATES = { standard: _standardSVG };

  /* ─── Public ─── */

  /**
   * Create a robot element and append it to the garage.
   * Same controller interface as Car.create().
   * @param {HTMLElement} garage - container element
   * @param {object} opts - { colour, faults, flatTyre }
   * @returns {object} controller
   */
  function create(garage, opts = {}) {
    const colour = opts.colour || '#7c8a96';
    const shapes = CONFIG.robotShapes;
    const shape = opts.shape || _pick(shapes);
    const faults = opts.faults || ['flatTyre'];
    const flatTyre = opts.flatTyre ?? 'left';
    const flatBoot = flatTyre === 'front' ? 'left' : 'right';

    const hasFlatTyre = faults.includes('flatTyre');
    const hasEngine = faults.includes('engine');
    const hasPaint = faults.includes('paint');
    const hasSticker = faults.includes('sticker');
    const hasWash = faults.includes('wash');
    const hasArmJoint = faults.includes('armJoint');
    const hasLegsRepair = faults.includes('legsRepair');
    const hasVoiceModule = faults.includes('voiceModule');
    const hasJetpack = faults.includes('jetpack');

    const el = document.createElement('div');
    el.className = `car car--robot`;
    el.style.setProperty('--robot-colour', colour);
    el.style.setProperty('--car-colour', colour);

    const templateFn = TEMPLATES[shape] || TEMPLATES.standard;

    // Dashboard indicators — ordered to match FAULT_ORDER (structural → clean → cosmetic)
    const indicators = [
      { cls: 'tyre', fault: hasFlatTyre },
      { cls: 'engine', fault: hasEngine },
    ];
    // Upgrade indicators only shown when that fault is present
    if (hasArmJoint) indicators.push({ cls: 'armJoint', fault: true });
    if (hasLegsRepair) indicators.push({ cls: 'legsRepair', fault: true });
    if (hasVoiceModule) indicators.push({ cls: 'voiceModule', fault: true });
    if (hasJetpack) indicators.push({ cls: 'jetpack', fault: true });
    // Cosmetic faults last: wash → paint → sticker
    indicators.push(
      { cls: 'wash', fault: hasWash },
      { cls: 'paint', fault: hasPaint },
      { cls: 'sticker', fault: hasSticker },
    );

    const dashboardHTML = indicators.map(ind =>
      `<div class="car__indicator car__indicator--${ind.cls} ${ind.fault ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>`
    ).join('');

    el.innerHTML = `
      <div class="car__dashboard">${dashboardHTML}</div>
      ${templateFn({ hasFlatTyre, flatBoot, hasEngine, hasPaint, hasSticker, hasWash,
                     hasArmJoint, hasLegsRepair, hasVoiceModule, hasJetpack })}
    `;

    // Apply flat boot after DOM construction
    if (hasFlatTyre) {
      const boot = el.querySelector(`.robot__boot--${flatBoot}`);
      if (boot) boot.classList.add('robot__boot--flat');
    }
    // Apply loose arm
    if (hasArmJoint) {
      const arm = el.querySelector('.robot__arm--left');
      if (arm) arm.classList.add('robot__arm--loose');
    }
    // Apply bent leg
    if (hasLegsRepair) {
      const leg = el.querySelector('.robot__leg--left');
      if (leg) leg.classList.add('robot__leg--bent');
    }

    garage.appendChild(el);

    return {
      el,
      faults,
      flatTyre,
      flatBoot,
      type: 'robot',
      getFlatTyreEl() {
        return el.querySelector(`.robot__boot--${flatBoot}`);
      },
      fixTyre() {
        const boot = this.getFlatTyreEl();
        if (boot) {
          boot.classList.remove('robot__boot--flat');
          boot.classList.add('robot__boot--fixing');
          setTimeout(() => boot.classList.remove('robot__boot--fixing'), 400);
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
          // Hide the crane so it doesn't fly away with the robot
          const crane = el.querySelector('.robot__lift-pad');
          if (crane) crane.style.display = 'none';
          // Booster installed → use its exit animation; otherwise random (no rocket)
          const boosterExit = el.dataset.boosterExit;
          const robotAnims = CONFIG.exitAnimations.filter(a => a !== 'rocket');
          const anim = boosterExit || _pick(robotAnims);
          if (boosterExit) {
            const flames = el.querySelector('.robot__jetpack-flames');
            if (flames) {
              flames.classList.remove('robot__jetpack-flames--hidden');
              flames.classList.add('robot__jetpack-flames--active');
            }
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

  /** Replace booster SVG groups with chosen style and show them */
  function replaceBooster(carEl, style) {
    const s = BOOSTER_STYLES[style] || BOOSTER_STYLES.jetpack;

    // Replace behind-torso thrusters
    const behind = carEl.querySelector('.robot__jetpack');
    if (behind) {
      behind.innerHTML = s.behind();
      behind.classList.remove('robot__jetpack--hidden');
      behind.classList.add('robot__jetpack--visible');
    }

    // Replace flames — show immediately for styles where the body is in the flames group
    // (balloon, propeller), keep hidden for jetpack/rocket (only shown during exit)
    const flames = carEl.querySelector('.robot__jetpack-flames');
    if (flames) {
      flames.innerHTML = s.flames();
      const showImmediately = !['jetpack', 'rocket'].includes(style);
      flames.classList.toggle('robot__jetpack-flames--hidden', !showImmediately);
    }

    // Replace/show chest strap (second .robot__jetpack group)
    const allJetpack = carEl.querySelectorAll('.robot__jetpack');
    if (allJetpack.length > 1) {
      const strap = allJetpack[1];
      strap.innerHTML = s.strap();
      strap.classList.remove('robot__jetpack--hidden');
      strap.classList.add('robot__jetpack--visible');
    }

    // Store chosen exit animation on the element
    carEl.dataset.boosterExit = s.exitAnim;
  }

  return { create, armPreviewSVG, replacementArmSVG, boosterPreviewSVG, replaceBooster };
})();

/**
 * Spaceship rendering — inline SVG with all interactive elements embedded.
 * Curved fuselage with wings, cockpit dome (alien pilot), booster hatch,
 * landing struts, and crane lift. Same controller interface as Car/Robot.
 */
const Spaceship = (() => {

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ─── SVG helpers ─── */

  /** Wing with 3 tappable bolt screws (tyre/boot equivalent) */
  function _wingSVG(x, y, side) {
    const mirror = side === 'right' ? -1 : 1;
    const boltR = 3;
    const touchR = boltR * 2.8;

    // Wing shape — swept delta
    const tipX = x + mirror * 80;
    const tipY = y + 20;
    const rootTop = y - 8;
    const rootBot = y + 28;

    const bolts = [0, 1, 2].map((i) => {
      const bx = x + mirror * (15 + i * 20);
      const by = y + 10;
      const cr = boltR * 0.6;
      return `<g class="ship__bolt ship__bolt--${i+1}" data-bolt="${i+1}">
        <circle class="ship__bolt-halo" cx="${bx}" cy="${by}" r="${touchR}" style="fill:transparent"/>
        <circle cx="${bx}" cy="${by}" r="${boltR}" style="fill:#999;stroke:#777;stroke-width:1.5"/>
        <line x1="${bx-cr}" y1="${by}" x2="${bx+cr}" y2="${by}" style="stroke:#555;stroke-width:1.5"/>
        <line x1="${bx}" y1="${by-cr}" x2="${bx}" y2="${by+cr}" style="stroke:#555;stroke-width:1.5"/>
      </g>`;
    }).join('');

    return `<g class="ship__wing ship__wing--${side}" data-position="${side}">
      <!-- Wing body — darker tint than hull for silhouette -->
      <path class="ship__wing-surface svg-ship-paint"
            d="M ${x} ${rootTop} L ${tipX} ${tipY} L ${x} ${rootBot} Z"
            style="stroke:rgba(0,0,0,0.4);stroke-width:2;stroke-linejoin:round"/>
      <!-- Darkening overlay -->
      <path d="M ${x} ${rootTop} L ${tipX} ${tipY} L ${x} ${rootBot} Z"
            fill="rgba(0,0,0,0.15)" style="pointer-events:none"/>
      <!-- Leading edge highlight -->
      <line x1="${x}" y1="${rootTop}" x2="${tipX}" y2="${tipY}"
            style="stroke:rgba(255,255,255,0.25);stroke-width:1.5;stroke-linecap:round"/>
      <!-- Wing stripe -->
      <line x1="${x}" y1="${y+5}" x2="${tipX * 0.7 + x * 0.3}" y2="${tipY - 2}"
            style="stroke:rgba(255,255,255,0.2);stroke-width:2"/>
      ${bolts}
    </g>`;
  }

  /** Platform lift — hydraulic pad that rises from the floor */
  function _platformLiftSVG() {
    const padY = 168, padW = 160, padH = 8;
    const padX = 120;                         // centred under ship body
    const pistonW = 8, pistonH = 20;
    const arrowY = padY - 14;

    return `<g class="ship__lift-pad ship__lift-pad--hidden">
      <!-- Hydraulic pistons -->
      <rect class="ship__lift-pad-arm ship__piston ship__piston--left"
            x="${padX + 20}" y="${padY}" width="${pistonW}" height="${pistonH}" rx="2"
            style="fill:#888;stroke:#666;stroke-width:1"/>
      <rect class="ship__lift-pad-arm ship__piston ship__piston--right"
            x="${padX + padW - 28}" y="${padY}" width="${pistonW}" height="${pistonH}" rx="2"
            style="fill:#888;stroke:#666;stroke-width:1"/>
      <!-- Platform pad -->
      <rect class="ship__platform-pad" x="${padX}" y="${padY}" width="${padW}" height="${padH}" rx="3"
            style="fill:#e07020;stroke:#c45e18;stroke-width:1.5"/>
      <!-- Safety stripes on pad -->
      <line x1="${padX + 10}" y1="${padY + 2}" x2="${padX + 10}" y2="${padY + padH - 2}" style="stroke:#c45e18;stroke-width:2;stroke-linecap:round"/>
      <line x1="${padX + padW - 10}" y1="${padY + 2}" x2="${padX + padW - 10}" y2="${padY + padH - 2}" style="stroke:#c45e18;stroke-width:2;stroke-linecap:round"/>
      <!-- Arrows -->
      <g class="ship__lift-pad-arrow">
        <text class="ship__lift-pad-arrow-up" x="${padX + padW/2}" y="${arrowY}" text-anchor="middle" font-size="16" fill="#ffe066">▲</text>
        <text class="ship__lift-pad-arrow-down" x="${padX + padW/2}" y="${arrowY}" text-anchor="middle" font-size="16" fill="#ffe066">▼</text>
      </g>
      <!-- Touch target -->
      <rect x="${padX - 10}" y="${arrowY - 16}" width="${padW + 20}" height="${padH + pistonH + 30}" fill="transparent"/>
    </g>`;
  }

  /** Interactive SVG elements — sparks, hatch, hull damage, emblem zone, space dust */
  function _shipInteractiveSVG(opts) {
    const { hasEngine, hasPaint, hasSticker, hasWash } = opts;

    return `
      <!-- Exhaust smoke (visible only with booster fault — billowing from rear nozzles) -->
      <g class="ship__smoke ${hasEngine ? '' : 'ship__smoke--hidden'}">
        <circle class="ship__smoke-puff ship__smoke-puff--1" cx="372" cy="70" r="8"/>
        <circle class="ship__smoke-puff ship__smoke-puff--2" cx="380" cy="78" r="10"/>
        <circle class="ship__smoke-puff ship__smoke-puff--3" cx="375" cy="88" r="7"/>
        <circle class="ship__smoke-puff ship__smoke-puff--4" cx="382" cy="82" r="8"/>
      </g>

      <!-- Booster hatch (bonnet equivalent — opens to reveal booster bay) -->
      <g class="ship__hatch ${hasEngine ? '' : 'ship__hatch--hidden'}">
        <rect class="ship__hatch-lid svg-ship-paint" x="310" y="60" width="50" height="40" rx="3" opacity="0.9"/>
        <rect x="310" y="60" width="50" height="60" fill="transparent"/>
      </g>

      <!-- Booster bay (engine bay equivalent) -->
      <g class="ship__booster-bay ${hasEngine ? '' : 'ship__booster-bay--hidden'}">
        <rect x="314" y="64" width="42" height="32" rx="2" fill="#333"/>
        <rect class="ship__booster ship__booster--broken"
              x="318" y="68" width="34" height="24" rx="3"
              fill="#66ccff" stroke="#44aadd" stroke-width="1.5"/>
        <circle cx="335" cy="80" r="4" fill="#44aadd" stroke="#3399bb" stroke-width="1"/>
      </g>

      <!-- Exhaust flames (shown when booster works) -->
      <g class="ship__exhaust ship__exhaust--hidden">
        <ellipse cx="370" cy="78" rx="14" ry="6" fill="#ff6600" opacity="0.8"/>
        <ellipse cx="374" cy="78" rx="10" ry="4" fill="#ffcc00" opacity="0.7"/>
        <ellipse cx="370" cy="86" rx="10" ry="4" fill="#ff6600" opacity="0.6"/>
        <ellipse cx="372" cy="86" rx="6" ry="3" fill="#ffcc00" opacity="0.5"/>
      </g>

      <!-- Hull damage (paint equivalent — scratch lines on hull) -->
      <g class="ship__hull-damage ${hasPaint ? '' : 'ship__hull-damage--hidden'}">
        <rect x="60" y="30" width="280" height="120" fill="transparent"/>
        <!-- Two-layer scratches: light edge + dark centre for contrast on any colour -->
        <line x1="120" y1="65" x2="160" y2="72" stroke="rgba(255,255,255,0.3)" stroke-width="5" stroke-linecap="round"/>
        <line x1="120" y1="65" x2="160" y2="72" stroke="rgba(40,30,20,0.4)" stroke-width="3" stroke-linecap="round"/>
        <line x1="200" y1="58" x2="240" y2="66" stroke="rgba(255,255,255,0.25)" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="200" y1="58" x2="240" y2="66" stroke="rgba(40,30,20,0.35)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="140" y1="95" x2="175" y2="105" stroke="rgba(255,255,255,0.22)" stroke-width="4" stroke-linecap="round"/>
        <line x1="140" y1="95" x2="175" y2="105" stroke="rgba(40,30,20,0.3)" stroke-width="2" stroke-linecap="round"/>
        <line x1="250" y1="90" x2="275" y2="85" stroke="rgba(255,255,255,0.25)" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="250" y1="90" x2="275" y2="85" stroke="rgba(40,30,20,0.35)" stroke-width="2.5" stroke-linecap="round"/>
      </g>

      <!-- Emblem zone (sticker equivalent) -->
      <g class="ship__emblem-zone ${hasSticker ? '' : 'ship__emblem-zone--hidden'}">
        <rect x="160" y="68" width="72" height="40" rx="4"
              fill="transparent" stroke="rgba(0,0,0,0.35)" stroke-dasharray="4 3" stroke-width="2"/>
        <text class="ship__emblem-text" x="196" y="88"
              text-anchor="middle" dominant-baseline="central" font-size="0"></text>
        <rect x="160" y="68" width="72" height="40" fill="transparent"/>
      </g>

      <!-- Space dust (wash equivalent — grey-blue cosmic dust ellipses) -->
      <g class="ship__dust ${hasWash ? '' : 'ship__dust--hidden'}">
        <rect x="60" y="30" width="280" height="120" fill="transparent"/>
        <ellipse cx="140" cy="75" rx="20" ry="8" fill="rgba(120,130,180,0.6)"/>
        <ellipse cx="210" cy="90" rx="24" ry="9" fill="rgba(120,130,180,0.5)"/>
        <ellipse cx="170" cy="110" rx="16" ry="6" fill="rgba(120,130,180,0.55)"/>
        <ellipse cx="260" cy="70" rx="18" ry="7" fill="rgba(120,130,180,0.45)"/>
        <ellipse cx="290" cy="95" rx="14" ry="5" fill="rgba(120,130,180,0.4)"/>
        <circle cx="130" cy="90" r="3" fill="rgba(120,130,180,0.45)"/>
        <circle cx="275" cy="105" r="4" fill="rgba(120,130,180,0.5)"/>
      </g>`;
  }

  /* ─── Shape template ─── */

  /** Standard spaceship — curved fuselage, wings, cockpit dome, boosters */
  function _standardSVG(opts) {
    const { hasFlatTyre, flatWing, hasEngine, hasPaint, hasSticker, hasWash } = opts;

    const interactive = _shipInteractiveSVG(opts);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -40 400 222" class="ship__svg">
      <!-- Shadow -->
      <ellipse class="car__shadow" cx="200" cy="176" rx="130" ry="6" fill="rgba(0,0,0,0.12)"/>

      <!-- Platform lift (hidden during entry, revealed after landing) -->
      ${_platformLiftSVG()}

      <g class="ship__upper">
        <!-- Antenna / sensor fin -->
        <line x1="120" y1="44" x2="120" y2="30" style="stroke:#aaa;stroke-width:2"/>
        <circle cx="120" cy="28" r="3" style="fill:#4ae;stroke:#3ad;stroke-width:1"/>
        <rect x="116" y="42" width="8" height="4" rx="1" style="fill:#999"/>

        <!-- Main hull (fuselage) -->
        <g class="ship__hull">
          <path class="ship__hull-body svg-ship-paint"
                d="M 60 80 Q 40 78 30 74 L 30 90 Q 40 94 60 92 L 60 80 Z
                   M 60 80 L 60 60 Q 80 44 140 42 L 300 42
                   Q 350 44 360 60 L 360 100 Q 350 116 300 118
                   L 140 118 Q 80 116 60 100 Z"/>
          <!-- Nose cone (pointed front) -->
          <path class="svg-ship-paint" d="M 60 60 Q 35 65 22 72 L 22 88 Q 35 95 60 100 Z" opacity="0.95"/>
          <!-- Upper gloss band -->
          <path d="M 60 60 Q 80 44 140 42 L 300 42 Q 350 44 360 60 L 360 68 L 60 68 Z"
                fill="rgba(255,255,255,0.08)"/>
          <!-- Panel seam -->
          <line x1="140" y1="44" x2="140" y2="116" style="stroke:rgba(0,0,0,0.1);stroke-width:1"/>
          <line x1="290" y1="44" x2="290" y2="116" style="stroke:rgba(0,0,0,0.1);stroke-width:1"/>
        </g>

        <!-- Cockpit dome -->
        <g class="ship__cockpit">
          <ellipse cx="100" cy="80" rx="32" ry="22"
                   fill="rgba(100,200,250,0.5)" stroke="rgba(80,180,230,0.6)" stroke-width="1.5"/>
          <!-- Dome reflection -->
          <ellipse cx="92" cy="73" rx="14" ry="8" fill="rgba(255,255,255,0.18)"/>
          <!-- Alien pilot (big eyes) -->
          <ellipse cx="96" cy="80" rx="5" ry="6" fill="#8fbc8f"/>
          <circle cx="93" cy="78" r="3" fill="#222"/>
          <circle cx="93" cy="78" r="1.5" fill="#4ae"/>
          <circle cx="99" cy="78" r="3" fill="#222"/>
          <circle cx="99" cy="78" r="1.5" fill="#4ae"/>
          <ellipse cx="96" cy="84" rx="2" ry="1" fill="#6a9a6a"/>
        </g>

        <!-- Dashboard indicators row (inside cockpit area) -->
        <g class="ship__indicators">
          <circle cx="160" cy="56" r="3" fill="#e63946" opacity="0.6"/>
          <circle cx="172" cy="56" r="3" fill="#2a9d8f" opacity="0.6"/>
          <circle cx="184" cy="56" r="3" fill="#f4a261" opacity="0.6"/>
        </g>

        <!-- Booster nozzles at rear -->
        <rect x="355" y="62" width="12" height="16" rx="2" fill="#666" stroke="#555" stroke-width="1"/>
        <rect x="355" y="82" width="12" height="16" rx="2" fill="#666" stroke="#555" stroke-width="1"/>

        <!-- Wings -->
        ${_wingSVG(160, 48, 'left')}
        ${_wingSVG(160, 100, 'right')}

        ${interactive}
      </g>

      <!-- Landing struts -->
      <g class="ship__struts">
        <rect x="120" y="118" width="6" height="56" rx="1" style="fill:#888;stroke:#777;stroke-width:1"/>
        <rect x="114" y="170" width="18" height="5" rx="2" style="fill:#999;stroke:#888;stroke-width:1"/>
        <rect x="260" y="118" width="6" height="56" rx="1" style="fill:#888;stroke:#777;stroke-width:1"/>
        <rect x="254" y="170" width="18" height="5" rx="2" style="fill:#999;stroke:#888;stroke-width:1"/>
      </g>
    </svg>`;
  }

  const TEMPLATES = { standard: _standardSVG };

  /* ─── Public ─── */

  /**
   * Create a spaceship element and append it to the garage.
   * Same controller interface as Car.create() / Robot.create().
   * @param {HTMLElement} garage - container element
   * @param {object} opts - { colour, faults, flatTyre }
   * @returns {object} controller
   */
  function create(garage, opts = {}) {
    const colour = opts.colour || '#6a7fdb';
    const shapes = CONFIG.spaceshipShapes || ['standard'];
    const shape = opts.shape || _pick(shapes);
    const faults = opts.faults || ['flatTyre'];
    const flatTyre = opts.flatTyre ?? 'front';
    const flatWing = flatTyre === 'front' ? 'left' : 'right';

    const hasFlatTyre = faults.includes('flatTyre');
    const hasEngine = faults.includes('engine');
    const hasPaint = faults.includes('paint');
    const hasSticker = faults.includes('sticker');
    const hasWash = faults.includes('wash');

    const el = document.createElement('div');
    el.className = 'car car--spaceship';
    el.style.setProperty('--ship-colour', colour);
    el.style.setProperty('--car-colour', colour);

    const templateFn = TEMPLATES[shape] || TEMPLATES.standard;

    // Dashboard indicators — same order as car (structural → clean → cosmetic)
    const indicators = [
      { cls: 'tyre', fault: hasFlatTyre },
      { cls: 'engine', fault: hasEngine },
      { cls: 'wash', fault: hasWash },
      { cls: 'paint', fault: hasPaint },
      { cls: 'sticker', fault: hasSticker },
    ];

    const dashboardHTML = indicators.map(ind =>
      `<div class="car__indicator car__indicator--${ind.cls} ${ind.fault ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>`
    ).join('');

    el.innerHTML = `
      <div class="car__dashboard">${dashboardHTML}</div>
      ${templateFn({ hasFlatTyre, flatWing, hasEngine, hasPaint, hasSticker, hasWash })}
    `;

    // Apply broken wing after DOM construction
    if (hasFlatTyre) {
      const wing = el.querySelector(`.ship__wing--${flatWing}`);
      if (wing) wing.classList.add('ship__wing--broken');
    }

    garage.appendChild(el);

    const controller = Vehicle.createController(el, {
      type: 'spaceship',
      faults,
      flatTyre,
      flatPartSelector: `.ship__wing--${flatWing}`,
      flatPartClass: 'ship__wing--broken',
      fixingClass: 'ship__wing--fixing',
      liftSelector: '.ship__lift-pad',
      pickExitAnim: () => 'ship-launch',
      afterEntry: (el) => {
        const lift = el.querySelector('.ship__lift-pad');
        if (lift) {
          lift.classList.remove('ship__lift-pad--hidden');
          lift.classList.add('ship__lift-pad--appearing');
        }
      },
      beforeExit: (el) => {
        const exhaust = el.querySelector('.ship__exhaust');
        if (exhaust) {
          exhaust.classList.remove('ship__exhaust--hidden');
          exhaust.classList.add('ship__exhaust--active');
        }
      },
    });
    controller.flatWing = flatWing;
    return controller;
  }

  return { create };
})();

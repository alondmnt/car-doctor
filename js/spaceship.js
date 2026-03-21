/**
 * Spaceship rendering — inline SVG with all interactive elements embedded.
 * X-wing-style fighter: tapered fuselage, angular canopy (alien pilot),
 * rear-mounted rectangular S-foil wings with engine pods at tips, angular
 * fin antenna. Same controller interface as Car/Robot.
 */
const Spaceship = (() => {

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ─── Style definitions ─── */

  /** Laser barrel colour sets — keyed by style name from CONFIG.laserStyles */
  const LASER_STYLES = {
    plasma: { barrel: '#884444', tip: '#ff3333', beam: '#ff0000' },
    photon: { barrel: '#448844', tip: '#33ff33', beam: '#00ff00' },
    ion:    { barrel: '#444488', tip: '#3399ff', beam: '#0066ff' },
  };

  /** Shield crystal/bubble colour sets — keyed by style name from CONFIG.shieldStyles */
  const SHIELD_STYLES = {
    ruby:     { crystal: '#ff4466', bubble: '#ff4466' },
    sapphire: { crystal: '#4488ff', bubble: '#4488ff' },
    emerald:  { crystal: '#44dd66', bubble: '#44dd66' },
  };

  /* ─── SVG helpers ─── */

  /** Wing with 3 tappable bolt screws — two rectangular S-foil panels with engine pods at tips */
  function _wingSVG(x, y, side, hasLaser) {
    const boltR = 3;
    const touchR = boltR * 2.8;

    // Vertical spread: left (upper) wing extends upward, right (lower) downward
    const sp = side === 'left' ? -1 : 1;

    // Two rectangular sub-panels (S-foils open) extending rearward
    const wingLen = 100;           // panel length root to tip
    const panelH = 11;             // height of each sub-panel
    const gap = 5;                 // visible gap between S-foil panels
    const splay = 8;               // outer panel tip splays away from hull

    // Inner sub-panel (adjacent to hull)
    const iy0 = y;                                  // inboard edge (at hull)
    const iy1 = y + sp * panelH;                    // outboard edge

    // Outer sub-panel (splayed outward at tip)
    const oy0 = y + sp * (panelH + gap);            // inboard edge
    const oy1root = y + sp * (panelH * 2 + gap);    // outboard at root
    const oy1tip = y + sp * (panelH * 2 + gap + splay); // outboard at tip

    const innerPts = `${x},${iy0} ${x + wingLen},${iy0} ${x + wingLen},${iy1} ${x},${iy1}`;
    const outerPts = `${x},${oy0} ${x + wingLen},${oy0} ${x + wingLen},${oy1tip} ${x},${oy1root}`;

    // Engine pods at wing tips — large rectangular with dark exhaust cap
    const engW = 22;
    const engPad = 2;              // engine extends slightly beyond panel
    const ieHalfH = panelH / 2 + engPad;
    const ieCy = y + sp * (panelH / 2);             // inner engine centre y
    const oeCy = y + sp * (panelH + gap + panelH / 2); // outer engine centre y

    // Bolts on inner sub-panel, spaced along length
    const bolts = [0, 1, 2].map((i) => {
      const bx = x + 15 + i * 28;
      const by = y + sp * (panelH / 2);
      const cr = boltR * 0.6;
      const boltNum = i + 1;
      return `<g class="ship__bolt ship__bolt--${boltNum}" data-bolt="${boltNum}">
        <circle class="ship__bolt-halo" cx="${bx}" cy="${by}" r="${touchR}" style="fill:transparent"/>
        <circle cx="${bx}" cy="${by}" r="${boltR}" style="fill:#999;stroke:#777;stroke-width:1.5"/>
        <line x1="${bx-cr}" y1="${by}" x2="${bx+cr}" y2="${by}" style="stroke:#555;stroke-width:1.5"/>
        <line x1="${bx}" y1="${by-cr}" x2="${bx}" y2="${by+cr}" style="stroke:#555;stroke-width:1.5"/>
      </g>`;
    }).join('');

    // Crack lines at wing root — visible via CSS only when wing is broken
    const crack = `<g class="ship__wing-crack">
      <line x1="${x}" y1="${iy0}" x2="${x + 14}" y2="${y + sp * 10}"
            style="stroke:rgba(255,255,255,0.4);stroke-width:2.5;stroke-linecap:round"/>
      <line x1="${x}" y1="${iy0}" x2="${x + 14}" y2="${y + sp * 10}"
            style="stroke:rgba(40,30,20,0.5);stroke-width:1.5;stroke-linecap:round"/>
      <line x1="${x + 8}" y1="${y + sp * 6}" x2="${x + 20}" y2="${y + sp * 16}"
            style="stroke:rgba(255,255,255,0.3);stroke-width:2;stroke-linecap:round"/>
      <line x1="${x + 8}" y1="${y + sp * 6}" x2="${x + 20}" y2="${y + sp * 16}"
            style="stroke:rgba(40,30,20,0.4);stroke-width:1;stroke-linecap:round"/>
    </g>`;

    return `<g class="ship__wing ship__wing--${side}" data-position="${side}">
      <!-- Wing root shadow -->
      <line x1="${x}" y1="${iy0}" x2="${x + wingLen}" y2="${iy0}"
            style="stroke:rgba(0,0,0,0.3);stroke-width:2"/>
      <!-- Inner sub-panel (S-foil) -->
      <polygon class="ship__wing-surface svg-ship-paint"
               points="${innerPts}"
               style="stroke:rgba(0,0,0,0.3);stroke-width:1.5;stroke-linejoin:miter"/>
      <polygon points="${innerPts}"
               fill="rgba(0,0,0,0.12)" style="pointer-events:none"/>
      <!-- Outer sub-panel (S-foil, splayed) -->
      <polygon class="svg-ship-paint"
               points="${outerPts}"
               style="stroke:rgba(0,0,0,0.3);stroke-width:1.5;stroke-linejoin:miter"/>
      <polygon points="${outerPts}"
               fill="rgba(0,0,0,0.2)" style="pointer-events:none"/>
      <!-- Panel seams on inner wing -->
      <line x1="${x + 33}" y1="${iy0}" x2="${x + 33}" y2="${iy1}"
            style="stroke:rgba(0,0,0,0.12);stroke-width:0.8"/>
      <line x1="${x + 66}" y1="${iy0}" x2="${x + 66}" y2="${iy1}"
            style="stroke:rgba(0,0,0,0.12);stroke-width:0.8"/>
      <!-- Panel seam on outer wing -->
      <line x1="${x + 50}" y1="${oy0}" x2="${x + 50}" y2="${oy1root + sp * (splay * 0.5)}"
            style="stroke:rgba(0,0,0,0.12);stroke-width:0.8"/>
      <!-- Inner engine pod at tip -->
      <rect x="${x + wingLen}" y="${ieCy - ieHalfH}" width="${engW}" height="${ieHalfH * 2}"
            fill="#888" stroke="#666" stroke-width="1"/>
      <rect x="${x + wingLen + engW - 6}" y="${ieCy - ieHalfH}" width="6" height="${ieHalfH * 2}"
            fill="#555" stroke="#444" stroke-width="0.5"/>
      <circle cx="${x + wingLen + engW}" cy="${ieCy}" r="3" fill="#ff6600" opacity="0.5"/>
      <circle cx="${x + wingLen + engW}" cy="${ieCy}" r="1.5" fill="#ffcc00" opacity="0.7"/>
      <!-- Outer engine pod at tip -->
      <rect x="${x + wingLen}" y="${oeCy - ieHalfH}" width="${engW}" height="${ieHalfH * 2}"
            fill="#888" stroke="#666" stroke-width="1"/>
      <rect x="${x + wingLen + engW - 6}" y="${oeCy - ieHalfH}" width="6" height="${ieHalfH * 2}"
            fill="#555" stroke="#444" stroke-width="0.5"/>
      <circle cx="${x + wingLen + engW}" cy="${oeCy}" r="3" fill="#ff6600" opacity="0.5"/>
      <circle cx="${x + wingLen + engW}" cy="${oeCy}" r="1.5" fill="#ffcc00" opacity="0.7"/>
      ${crack}
      ${bolts}
      ${hasLaser ? `
      <!-- Laser barrels on engine pods -->
      <g class="ship__laser ship__laser--broken" data-role="interactive" style="cursor:pointer">
        <!-- Inner engine laser barrel (double-layer outline) -->
        <rect class="ship__laser-barrel" x="${x + wingLen - 20}" y="${ieCy - 3.5}" width="20" height="7" rx="1"
              fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
        <rect class="ship__laser-barrel" x="${x + wingLen - 20}" y="${ieCy - 3.5}" width="20" height="7" rx="1"
              fill="#aaa" stroke="rgba(40,30,20,0.4)" stroke-width="1.5"/>
        <circle class="ship__laser-tip" cx="${x + wingLen - 20}" cy="${ieCy}" r="4" fill="rgba(255,255,255,0.25)" opacity="0.3"/>
        <circle class="ship__laser-tip" cx="${x + wingLen - 20}" cy="${ieCy}" r="3" fill="#ff3333" opacity="0.3"/>
        <line class="ship__laser-beam" x1="${x + wingLen - 20}" y1="${ieCy}" x2="0" y2="${ieCy}" stroke="rgba(255,255,255,0.2)" stroke-width="5" opacity="0"/>
        <line class="ship__laser-beam" x1="${x + wingLen - 20}" y1="${ieCy}" x2="0" y2="${ieCy}" stroke="#ff0000" stroke-width="2.5" opacity="0"/>
        <!-- Outer engine laser barrel (double-layer outline) -->
        <rect class="ship__laser-barrel" x="${x + wingLen - 20}" y="${oeCy - 3.5}" width="20" height="7" rx="1"
              fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
        <rect class="ship__laser-barrel" x="${x + wingLen - 20}" y="${oeCy - 3.5}" width="20" height="7" rx="1"
              fill="#aaa" stroke="rgba(40,30,20,0.4)" stroke-width="1.5"/>
        <circle class="ship__laser-tip" cx="${x + wingLen - 20}" cy="${oeCy}" r="4" fill="rgba(255,255,255,0.25)" opacity="0.3"/>
        <circle class="ship__laser-tip" cx="${x + wingLen - 20}" cy="${oeCy}" r="3" fill="#ff3333" opacity="0.3"/>
        <line class="ship__laser-beam" x1="${x + wingLen - 20}" y1="${oeCy}" x2="0" y2="${oeCy}" stroke="rgba(255,255,255,0.2)" stroke-width="5" opacity="0"/>
        <line class="ship__laser-beam" x1="${x + wingLen - 20}" y1="${oeCy}" x2="0" y2="${oeCy}" stroke="#ff0000" stroke-width="2.5" opacity="0"/>
        <!-- Touch target spanning both barrels -->
        <rect x="${x + wingLen - 24}" y="${Math.min(ieCy, oeCy) - 10}" width="28" height="${Math.abs(oeCy - ieCy) + 20}" fill="transparent"/>
      </g>` : ''}
    </g>`;
  }

  /** Platform lift — flat pad under strut feet, hydraulic pistons extend down into floor */
  function _platformLiftSVG() {
    const padX = 100, padW = 200, padH = 6;
    const padY = 172;                         // just below strut feet (y=170, h=5)
    const pistonW = 10, pistonH = 16;
    const pistonTop = padY + padH;            // pistons hang below the pad
    const arrowY = padY - 10;

    return `<g class="ship__lift-pad ship__lift-pad--hidden">
      <!-- Hydraulic pistons (extend downward into floor) -->
      <rect class="ship__lift-pad-arm ship__piston ship__piston--left"
            x="${padX + 30}" y="${pistonTop}" width="${pistonW}" height="${pistonH}" rx="2"
            style="fill:#888;stroke:#666;stroke-width:1"/>
      <rect class="ship__lift-pad-arm ship__piston ship__piston--right"
            x="${padX + padW - 40}" y="${pistonTop}" width="${pistonW}" height="${pistonH}" rx="2"
            style="fill:#888;stroke:#666;stroke-width:1"/>
      <!-- Platform pad (ship struts rest on this) -->
      <rect class="ship__platform-pad" x="${padX}" y="${padY}" width="${padW}" height="${padH}" rx="3"
            style="fill:#e07020;stroke:#c45e18;stroke-width:1.5"/>
      <!-- Safety stripes on pad -->
      <line x1="${padX + 12}" y1="${padY + 1}" x2="${padX + 12}" y2="${padY + padH - 1}" style="stroke:#c45e18;stroke-width:2;stroke-linecap:round"/>
      <line x1="${padX + padW - 12}" y1="${padY + 1}" x2="${padX + padW - 12}" y2="${padY + padH - 1}" style="stroke:#c45e18;stroke-width:2;stroke-linecap:round"/>
      <!-- Arrows -->
      <g class="ship__lift-pad-arrow" data-role="lift-arrow">
        <text class="ship__lift-pad-arrow-up" x="${padX + padW/2}" y="${arrowY}" text-anchor="middle" font-size="16" fill="#ffe066">▲</text>
        <text class="ship__lift-pad-arrow-down" x="${padX + padW/2}" y="${arrowY}" text-anchor="middle" font-size="16" fill="#ffe066">▼</text>
      </g>
      <!-- Touch target -->
      <rect x="${padX - 10}" y="${arrowY - 16}" width="${padW + 20}" height="${padH + pistonH + 30}" fill="transparent"/>
    </g>`;
  }

  /** Interactive SVG elements — sparks, hatch, hull damage, emblem zone, space dust */
  function _shipInteractiveSVG(opts) {
    const { hasEngine, hasPaint, hasSticker, hasWash, hasShield } = opts;

    return `
      <!-- Booster hatch (bonnet equivalent — on mid-rear fuselage) -->
      <g class="ship__hatch ${hasEngine ? '' : 'ship__hatch--hidden'}">
        <polygon class="ship__hatch-lid svg-ship-paint"
                 points="248,62 296,68 296,92 248,98" opacity="0.9"/>
        <rect x="248" y="62" width="48" height="50" fill="transparent"/>
      </g>

      <!-- Booster bay (engine bay equivalent) -->
      <g class="ship__booster-bay ${hasEngine ? '' : 'ship__booster-bay--hidden'}">
        <rect x="252" y="70" width="38" height="20" fill="#333"/>
        <rect class="ship__booster ship__booster--broken"
              x="256" y="73" width="30" height="14"
              fill="#66ccff" stroke="#44aadd" stroke-width="1.5"/>
        <polygon points="271,75 275,80 271,85 267,80" fill="#44aadd" stroke="#3399bb" stroke-width="1"/>
      </g>

      <!-- Exhaust flames (shown when booster works) — from rear exhaust port -->
      <g class="ship__exhaust ship__exhaust--hidden">
        <polygon points="360,76 388,80 360,84" fill="#ff6600" opacity="0.8"/>
        <polygon points="364,77 384,80 364,83" fill="#ffcc00" opacity="0.7"/>
      </g>

      <!-- Hull damage (paint equivalent — scratch lines on hull) -->
      <g class="ship__hull-damage ${hasPaint ? '' : 'ship__hull-damage--hidden'}" data-role="paint-damage">
        <rect x="60" y="50" width="230" height="60" fill="transparent"/>
        <!-- Two-layer scratches: light edge + dark centre for contrast on any colour -->
        <line x1="110" y1="68" x2="145" y2="73" stroke="rgba(255,255,255,0.3)" stroke-width="5" stroke-linecap="round"/>
        <line x1="110" y1="68" x2="145" y2="73" stroke="rgba(40,30,20,0.4)" stroke-width="3" stroke-linecap="round"/>
        <line x1="170" y1="62" x2="205" y2="68" stroke="rgba(255,255,255,0.25)" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="170" y1="62" x2="205" y2="68" stroke="rgba(40,30,20,0.35)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="130" y1="92" x2="160" y2="98" stroke="rgba(255,255,255,0.22)" stroke-width="4" stroke-linecap="round"/>
        <line x1="130" y1="92" x2="160" y2="98" stroke="rgba(40,30,20,0.3)" stroke-width="2" stroke-linecap="round"/>
        <line x1="210" y1="88" x2="235" y2="84" stroke="rgba(255,255,255,0.25)" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="210" y1="88" x2="235" y2="84" stroke="rgba(40,30,20,0.35)" stroke-width="2.5" stroke-linecap="round"/>
      </g>

      <!-- Emblem zones (3 placement choices) -->
      <!-- Zone 0: mid-fuselage widest section (56×30 → 23px) -->
      <g class="ship__emblem-zone ship__emblem-zone--0 ${hasSticker ? '' : 'ship__emblem-zone--hidden'}"
         data-role="sticker-zone" style="--sticker-fs: 23px">
        <rect x="155" y="65" width="56" height="30" rx="0"
              fill="transparent" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4 3" stroke-width="3.5"/>
        <rect x="155" y="65" width="56" height="30" rx="0"
              fill="transparent" stroke="rgba(0,0,0,0.45)" stroke-dasharray="4 3" stroke-width="2"/>
        <text class="ship__emblem-text" x="183" y="80"
              text-anchor="middle" dominant-baseline="central" font-size="0"></text>
        <rect x="155" y="65" width="56" height="30" fill="transparent"/>
      </g>
      <!-- Zone 1: forward fuselage past cockpit (cockpit ends ~x:124); 40×30 → 23px -->
      <g class="ship__emblem-zone ship__emblem-zone--1 ${hasSticker ? '' : 'ship__emblem-zone--hidden'}"
         data-role="sticker-zone" style="--sticker-fs: 23px">
        <rect x="126" y="65" width="40" height="30" rx="0"
              fill="transparent" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4 3" stroke-width="3.5"/>
        <rect x="126" y="65" width="40" height="30" rx="0"
              fill="transparent" stroke="rgba(0,0,0,0.45)" stroke-dasharray="4 3" stroke-width="2"/>
        <text class="ship__emblem-text" x="146" y="80"
              text-anchor="middle" dominant-baseline="central" font-size="0"></text>
        <rect x="126" y="65" width="40" height="30" fill="transparent"/>
      </g>
      <!-- Zone 2: rear fuselage past hatch (hatch ends x:296); 44×22 → 17px -->
      <g class="ship__emblem-zone ship__emblem-zone--2 ${hasSticker ? '' : 'ship__emblem-zone--hidden'}"
         data-role="sticker-zone" style="--sticker-fs: 17px">
        <rect x="300" y="68" width="44" height="22" rx="0"
              fill="transparent" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4 3" stroke-width="3.5"/>
        <rect x="300" y="68" width="44" height="22" rx="0"
              fill="transparent" stroke="rgba(0,0,0,0.45)" stroke-dasharray="4 3" stroke-width="2"/>
        <text class="ship__emblem-text" x="322" y="79"
              text-anchor="middle" dominant-baseline="central" font-size="0"></text>
        <rect x="300" y="68" width="44" height="22" fill="transparent"/>
      </g>

      <!-- Space dust (wash equivalent — smaller, lighter cosmic dust) -->
      <g class="ship__dust ${hasWash ? '' : 'ship__dust--hidden'}" data-role="wash-target">
        <rect x="60" y="50" width="230" height="60" fill="transparent"/>
        <ellipse cx="120" cy="75" rx="12" ry="5" fill="rgba(120,130,180,0.45)"/>
        <ellipse cx="180" cy="85" rx="14" ry="5" fill="rgba(120,130,180,0.4)"/>
        <ellipse cx="155" cy="96" rx="10" ry="4" fill="rgba(120,130,180,0.4)"/>
        <ellipse cx="220" cy="72" rx="10" ry="4" fill="rgba(120,130,180,0.35)"/>
        <ellipse cx="240" cy="88" rx="8" ry="3" fill="rgba(120,130,180,0.3)"/>
        <circle cx="105" cy="88" r="2" fill="rgba(120,130,180,0.35)"/>
        <circle cx="200" cy="94" r="3" fill="rgba(120,130,180,0.35)"/>
      </g>

      <!-- Shield generator (tier 60 upgrade) — mid-fuselage to avoid booster hatch overlap -->
      <g class="ship__shield-group ${hasShield ? '' : 'ship__shield-group--hidden'}">
        <!-- Fault indicator — dashed red circle -->
        <circle class="ship__shield-fault" cx="214" cy="58" r="6"
                fill="none" stroke="#e63946" stroke-width="1.5" stroke-dasharray="3 2"/>
        <!-- Shield panel on mid-fuselage (double-layer outline) -->
        <g class="ship__shield-panel" data-role="interactive" style="cursor:pointer">
          <rect class="ship__shield-panel-lid svg-ship-paint" x="206" y="64" width="28" height="20" rx="2"
                stroke="rgba(255,255,255,0.25)" stroke-width="3" opacity="0.9"/>
          <rect class="ship__shield-panel-lid svg-ship-paint" x="206" y="64" width="28" height="20" rx="2"
                stroke="rgba(0,0,0,0.35)" stroke-width="1.5" opacity="0.9"/>
          <!-- Touch target -->
          <rect x="200" y="58" width="40" height="32" fill="transparent"/>
        </g>
        <!-- Crystal bay (hidden until panel opened) -->
        <g class="ship__crystal-bay ship__crystal-bay--hidden" data-role="interactive" style="cursor:pointer">
          <rect x="208" y="66" width="24" height="16" rx="1" fill="#333" stroke="#444" stroke-width="0.5"/>
          <polygon class="ship__crystal" points="220,68 225,74 220,80 215,74"
                   fill="#66eeff" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <polygon class="ship__crystal" points="220,68 225,74 220,80 215,74"
                   fill="#66eeff" stroke="#44ccdd" stroke-width="1"/>
          <!-- Touch target -->
          <rect x="202" y="60" width="36" height="28" fill="transparent"/>
        </g>
        <!-- Shield bubble — large translucent ellipse (double-layer halo) -->
        <ellipse class="ship__shield-bubble ship__shield-bubble--broken"
                 cx="200" cy="80" rx="170" ry="55"
                 fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="6"/>
        <ellipse class="ship__shield-bubble ship__shield-bubble--broken"
                 cx="200" cy="80" rx="170" ry="55"
                 fill="none" stroke="#44ccff" stroke-width="2.5"/>
      </g>`;
  }

  /* ─── Shape template ─── */

  /** Standard spaceship — X-wing-style fighter with tapered fuselage and S-foil wings */
  function _standardSVG(opts) {
    const { hasFlatTyre, flatWing, hasEngine, hasPaint, hasSticker, hasWash, hasLaser, hasShield, hasAntenna } = opts;

    const interactive = _shipInteractiveSVG(opts);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -40 400 222" class="ship__svg">
      <!-- Shadow -->
      <ellipse class="car__shadow" cx="200" cy="176" rx="130" ry="6" fill="rgba(0,0,0,0.12)"/>

      <!-- Platform lift (hidden during entry, revealed after landing) -->
      ${_platformLiftSVG()}

      <g class="ship__upper">
        <!-- Antenna — angular fin with diamond tip -->
        ${!hasAntenna ? `
        <polygon points="120,56 126,38 120,30 114,38" style="fill:#aaa;stroke:#888;stroke-width:1;stroke-linejoin:miter"/>
        <polygon points="120,28 123,24 120,20 117,24" style="fill:#4ae;stroke:#3ad;stroke-width:0.8"/>
        <rect x="116" y="54" width="8" height="4" style="fill:#999"/>
        ` : `
        <!-- Antenna upgrade (tier 65) -->
        <g class="ship__antenna-upgrade">
          <!-- Damage indicator -->
          <circle class="ship__antenna-damage" cx="120" cy="36" r="6"
                  fill="none" stroke="#e63946" stroke-width="1.5" stroke-dasharray="3 2"/>
          <!-- Mast group — drag target (not transformed; inner bars animate) -->
          <g class="ship__antenna-mast" style="cursor:pointer">
            <!-- Touch target (full size, never scales) -->
            <rect x="108" y="16" width="24" height="44" fill="transparent"/>
            <!-- Telescoping mast bars (double-layer, scale via CSS) -->
            <rect class="ship__antenna-mast-bar ship__antenna-mast-bar--collapsed"
                  x="117" y="26" width="6" height="30"
                  fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" style="pointer-events:none"/>
            <rect class="ship__antenna-mast-bar ship__antenna-mast-bar--collapsed"
                  x="117" y="26" width="6" height="30"
                  fill="#aaa" stroke="rgba(40,30,20,0.4)" stroke-width="1" style="pointer-events:none"/>
          </g>
          <!-- Dish with centre dot (double-layer) -->
          <g class="ship__antenna-dish ship__antenna-dish--misaligned" data-role="interactive" style="cursor:pointer">
            <path d="M110,18 Q120,8 130,18" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="4" stroke-linecap="round"/>
            <path d="M110,18 Q120,8 130,18" fill="none" stroke="#aaa" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="120" cy="14" r="3" fill="#4ae" stroke="#3ad" stroke-width="1"/>
            <!-- Touch target -->
            <rect x="108" y="6" width="24" height="16" fill="transparent"/>
          </g>
          <!-- Signal rings (concentric) -->
          <g class="ship__antenna-signal ship__antenna-signal--dead">
            <circle cx="120" cy="8" r="6" fill="none" stroke="#5cf" stroke-width="1.2"/>
            <circle cx="120" cy="8" r="10" fill="none" stroke="#5cf" stroke-width="1.0"/>
            <circle cx="120" cy="8" r="14" fill="none" stroke="#5cf" stroke-width="0.8"/>
          </g>
          <!-- Base mount -->
          <rect x="116" y="54" width="8" height="4" style="fill:#999"/>
        </g>
        `}

        <!-- Main hull (fuselage) — tapered toward rear like X-wing -->
        <g class="ship__hull">
          <!-- Hull body — wide forward, narrow rear -->
          <polygon class="ship__hull-body svg-ship-paint"
                   points="44,80 60,65 120,56 200,54 240,58 300,68 340,74 358,77
                           358,83 340,86 300,92 240,102 200,106 120,104 60,95"
                   style="stroke:rgba(0,0,0,0.3);stroke-width:1.5;stroke-linejoin:miter"/>
          <!-- Nose cone overlay (slightly darker) -->
          <polygon class="svg-ship-paint" points="44,80 60,65 60,95" opacity="0.85"/>
          <polygon points="44,80 60,65 60,95" fill="rgba(0,0,0,0.1)" style="pointer-events:none"/>
          <!-- Upper gloss panel -->
          <polygon points="60,65 120,56 200,54 300,68 358,77 358,73 60,73"
                   fill="rgba(255,255,255,0.08)"/>
          <!-- Centreline seam at y=80 -->
          <line x1="60" y1="80" x2="358" y2="80"
                style="stroke:rgba(0,0,0,0.07);stroke-width:0.8"/>
          <!-- Vertical panel seams -->
          <line x1="140" y1="55" x2="140" y2="105" style="stroke:rgba(0,0,0,0.1);stroke-width:1"/>
          <line x1="240" y1="58" x2="240" y2="102" style="stroke:rgba(0,0,0,0.1);stroke-width:1"/>
          <!-- Chevron accent on forward fuselage -->
          <polyline points="170,72 180,66 190,72" style="fill:none;stroke:rgba(255,255,255,0.15);stroke-width:1.5;stroke-linejoin:miter"/>
          <polyline points="170,88 180,94 190,88" style="fill:none;stroke:rgba(255,255,255,0.12);stroke-width:1.5;stroke-linejoin:miter"/>
        </g>

        <!-- Cockpit — dark angular canopy, raised on fuselage top -->
        <g class="ship__cockpit">
          <polygon points="78,80 84,66 94,60 108,60 118,66 124,80 118,94 108,100 94,100 84,94"
                   fill="rgba(40,60,80,0.7)" stroke="rgba(30,50,70,0.8)" stroke-width="1.5"
                   style="stroke-linejoin:miter"/>
          <!-- Angular highlight reflection -->
          <polygon points="86,70 94,64 106,64 114,70 106,74 94,74"
                   fill="rgba(255,255,255,0.12)" style="pointer-events:none"/>
          <!-- Alien pilot (big eyes) -->
          <g class="ship__pilot">
            <ellipse cx="100" cy="80" rx="8" ry="10" fill="#8fbc8f"/>
            <g class="ship__eyes">
              <circle cx="95" cy="77" r="5" fill="#222"/>
              <circle class="ship__eye-iris" cx="95" cy="77" r="2.5" fill="#4ae"/>
              <circle cx="105" cy="77" r="5" fill="#222"/>
              <circle class="ship__eye-iris" cx="105" cy="77" r="2.5" fill="#4ae"/>
            </g>
            <ellipse cx="100" cy="86" rx="3" ry="1.5" fill="#6a9a6a"/>
          </g>
        </g>

        <!-- Dashboard indicators row -->
        <g class="ship__indicators">
          <circle cx="150" cy="62" r="3" fill="#e63946" opacity="0.6"/>
          <circle cx="162" cy="62" r="3" fill="#2a9d8f" opacity="0.6"/>
          <circle cx="174" cy="62" r="3" fill="#f4a261" opacity="0.6"/>
        </g>

        <!-- Rear exhaust port (main thruster) -->
        <rect x="356" y="76" width="8" height="8" fill="#555" stroke="#444" stroke-width="1"/>
        <rect x="362" y="77" width="3" height="6" fill="#444"/>

        ${interactive}

        <!-- Landing struts (inside ship__upper — rise with hull) -->
        <g class="ship__struts">
          <rect x="140" y="105" width="6" height="63" style="fill:#888;stroke:#777;stroke-width:1"/>
          <rect x="134" y="168" width="18" height="5" style="fill:#999;stroke:#888;stroke-width:1"/>
          <rect x="230" y="100" width="6" height="68" style="fill:#888;stroke:#777;stroke-width:1"/>
          <rect x="224" y="168" width="18" height="5" style="fill:#999;stroke:#888;stroke-width:1"/>
        </g>
      </g>

      <!-- Wings outside ship__upper — rear-mounted, S-foils with engine pods -->
      ${_wingSVG(220, 52, 'left', hasLaser)}
      ${_wingSVG(220, 108, 'right', hasLaser)}

      <!-- Exhaust smoke (rendered above wings for visibility) -->
      <g class="ship__smoke ${hasEngine ? '' : 'ship__smoke--hidden'}">
        <circle class="ship__smoke-puff ship__smoke-puff--1" cx="340" cy="66" r="8"/>
        <circle class="ship__smoke-puff ship__smoke-puff--2" cx="334" cy="60" r="10"/>
        <circle class="ship__smoke-puff ship__smoke-puff--3" cx="346" cy="58" r="7"/>
        <circle class="ship__smoke-puff ship__smoke-puff--4" cx="338" cy="64" r="8"/>
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
    const hasLaser = faults.includes('laser');
    const hasShield = faults.includes('shield');
    const hasAntenna = faults.includes('antenna');

    const el = document.createElement('div');
    el.className = 'car car--spaceship';
    el.style.setProperty('--ship-colour', colour);
    el.style.setProperty('--car-colour', colour);
    el.style.setProperty('--vehicle-colour', colour);

    const templateFn = TEMPLATES[shape] || TEMPLATES.standard;

    // Dashboard indicators — same order as car (structural → clean → cosmetic).
    // Unlocked upgrades always show (grey if not broken on this vehicle).
    const shipWeights = GameState.get('spaceshipFaultWeights');
    const indicators = [
      { cls: 'tyre', fault: hasFlatTyre },
      { cls: 'engine', fault: hasEngine },
      ...('laser'   in shipWeights ? [{ cls: 'laser',   fault: hasLaser }]   : []),
      ...('shield'  in shipWeights ? [{ cls: 'shield',  fault: hasShield }]  : []),
      ...('antenna' in shipWeights ? [{ cls: 'antenna', fault: hasAntenna }] : []),
      { cls: 'wash', fault: hasWash },
      { cls: 'paint', fault: hasPaint },
      { cls: 'sticker', fault: hasSticker },
    ];

    const dashboardHTML = indicators.map(ind =>
      `<div class="car__indicator car__indicator--${ind.cls} ${ind.fault ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>`
    ).join('');

    el.innerHTML = `
      <div class="car__dashboard">${dashboardHTML}</div>
      ${templateFn({ hasFlatTyre, flatWing, hasEngine, hasPaint, hasSticker, hasWash, hasLaser, hasShield, hasAntenna })}
    `;

    // Apply broken wing after DOM construction; mark side so CSS can lift the good wing
    if (hasFlatTyre) {
      const wing = el.querySelector(`.ship__wing--${flatWing}`);
      if (wing) wing.classList.add('ship__wing--broken');
      el.dataset.brokenWing = flatWing;
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
        if (lift) lift.classList.remove('ship__lift-pad--hidden');
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

  /** Replace laser barrel colours with chosen style and mark as installed */
  function replaceLaser(carEl, style) {
    const s = LASER_STYLES[style] || LASER_STYLES.plasma;
    carEl.querySelectorAll('.ship__laser').forEach(l => {
      l.querySelectorAll('.ship__laser-barrel').forEach(b => {
        if (b.getAttribute('fill') !== 'none') b.setAttribute('fill', s.barrel);
      });
      l.querySelectorAll('.ship__laser-tip').forEach(t => {
        if (!t.getAttribute('fill').startsWith('rgba')) t.setAttribute('fill', s.tip);
      });
      l.querySelectorAll('.ship__laser-beam').forEach(b => {
        if (!b.getAttribute('stroke').startsWith('rgba')) b.setAttribute('stroke', s.beam);
      });
      l.classList.remove('ship__laser--broken');
      l.classList.add('ship__laser--installed');
    });
  }

  /** Apply shield crystal/bubble colours for chosen style */
  function applyShield(carEl, style) {
    const s = SHIELD_STYLES[style] || SHIELD_STYLES.ruby;
    carEl.querySelectorAll('.ship__crystal').forEach(c => {
      if (c.getAttribute('fill') !== 'none') c.setAttribute('fill', s.crystal);
    });
    carEl.querySelectorAll('.ship__shield-bubble').forEach(b => {
      if (b.getAttribute('stroke') !== 'rgba(255,255,255,0.15)') b.setAttribute('stroke', s.bubble);
    });
  }

  /** Compact laser preview SVG for picker thumbnails */
  function laserPreviewSVG(style) {
    const s = LASER_STYLES[style] || LASER_STYLES.plasma;
    return `<svg viewBox="0 0 44 40" width="44" height="40">
      <rect x="12" y="10" width="24" height="7" rx="1" fill="${s.barrel}" stroke="#666" stroke-width="1"/>
      <circle cx="12" cy="13.5" r="4" fill="${s.tip}" opacity="0.8"/>
      <line x1="12" y1="13.5" x2="0" y2="13.5" stroke="${s.beam}" stroke-width="2" opacity="0.7"/>
      <rect x="12" y="23" width="24" height="7" rx="1" fill="${s.barrel}" stroke="#666" stroke-width="1"/>
      <circle cx="12" cy="26.5" r="4" fill="${s.tip}" opacity="0.8"/>
      <line x1="12" y1="26.5" x2="0" y2="26.5" stroke="${s.beam}" stroke-width="2" opacity="0.7"/>
    </svg>`;
  }

  /** Compact shield preview SVG for picker thumbnails */
  function shieldPreviewSVG(style) {
    const s = SHIELD_STYLES[style] || SHIELD_STYLES.ruby;
    return `<svg viewBox="0 0 44 44" width="44" height="44">
      <ellipse cx="22" cy="22" rx="20" ry="18" fill="none" stroke="${s.bubble}" stroke-width="1.5" opacity="0.4"/>
      <polygon points="22,8 16,18 16,30 22,36 28,30 28,18" fill="${s.crystal}" stroke="#fff" stroke-width="0.8" opacity="0.8"/>
    </svg>`;
  }

  return { create, replaceLaser, applyShield, laserPreviewSVG, shieldPreviewSVG };
})();

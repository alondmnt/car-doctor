/**
 * Planet rendering — inline SVG with sphere, geometry overlays, and fault zones.
 * 3 geometry types: rocky (craters), gas (bands), ringed (ring ellipse).
 * Planet-specific faults only: fire, forest, city — no tyres, engines, or paint.
 * Same controller interface as Car/Robot/Spaceship.
 */
const Planet = (() => {

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ─── Environmental detail builders ─── */

  /** Ocean shimmer — subtle gradient overlay on sphere body */
  function _oceanShimmerSVG(cx, cy, r) {
    return `<ellipse class="planet__ocean-shimmer" cx="${cx}" cy="${cy + 10}"
                     rx="${r * 0.85}" ry="${r * 0.55}"
                     fill="rgba(0,0,0,0.06)" pointer-events="none"/>`;
  }

  /**
   * Continent landmasses for rocky and ringed types.
   * Large southern continent (city zone sits here), smaller northern
   * landmass, and a small island/archipelago.
   */
  function _continentsSVG(cx, cy, r) {
    // Southern continent — irregular blob in lower hemisphere
    const sc = `M${cx - 45},${cy + 15} C${cx - 50},${cy + 25} ${cx - 40},${cy + 50} ${cx - 20},${cy + 55}
                C${cx - 5},${cy + 60} ${cx + 25},${cy + 55} ${cx + 40},${cy + 45}
                C${cx + 50},${cy + 38} ${cx + 45},${cy + 20} ${cx + 30},${cy + 15}
                C${cx + 15},${cy + 10} ${cx - 30},${cy + 8} ${cx - 45},${cy + 15} Z`;
    // Northern landmass — smaller blob upper-left
    const nc = `M${cx - 35},${cy - 40} C${cx - 45},${cy - 35} ${cx - 40},${cy - 20} ${cx - 25},${cy - 18}
                C${cx - 10},${cy - 16} ${cx - 5},${cy - 25} ${cx - 10},${cy - 35}
                C${cx - 15},${cy - 45} ${cx - 28},${cy - 45} ${cx - 35},${cy - 40} Z`;
    // Small island/archipelago — upper-right
    const island = `M${cx + 20},${cy - 30} C${cx + 25},${cy - 35} ${cx + 35},${cy - 32} ${cx + 32},${cy - 26}
                    C${cx + 28},${cy - 22} ${cx + 18},${cy - 24} ${cx + 20},${cy - 30} Z`;
    return `<g class="planet__continents" pointer-events="none">
      <path d="${sc}" fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.15)" stroke-width="0.8"/>
      <path d="${nc}" fill="rgba(255,255,255,0.10)" stroke="rgba(0,0,0,0.12)" stroke-width="0.6"/>
      <path d="${island}" fill="rgba(255,255,255,0.09)" stroke="rgba(0,0,0,0.10)" stroke-width="0.5"/>
    </g>`;
  }

  /**
   * Gas construction band — metallic orbital ring where city zone sits.
   * "Cloud city" on an artificial rim built around the planet.
   */
  function _constructionBandSVG(cx, cy, r) {
    const bandY = cy + 25;
    const dy = bandY - cy;
    const halfW = Math.sqrt(Math.max(0, r * r - dy * dy));
    // Rivet dots along the band
    const rivets = [];
    const rivetCount = 8;
    for (let i = 0; i < rivetCount; i++) {
      const rx = cx - halfW + (halfW * 2 / (rivetCount - 1)) * i;
      rivets.push(`<circle cx="${rx}" cy="${bandY + 4}" r="1.5"
                           fill="rgba(200,200,210,0.5)" stroke="rgba(100,100,120,0.3)" stroke-width="0.5"/>`);
    }
    return `<g class="planet__construction-band" pointer-events="none">
      <ellipse cx="${cx}" cy="${bandY + 3}" rx="${halfW * 0.95}" ry="7"
               fill="rgba(160,170,185,0.25)" stroke="rgba(120,130,150,0.3)" stroke-width="1"/>
      <ellipse cx="${cx}" cy="${bandY + 3}" rx="${halfW * 0.95}" ry="3"
               fill="rgba(200,210,220,0.15)"/>
      ${rivets.join('\n      ')}
    </g>`;
  }

  /** Polar ice caps — white ellipses at top and bottom of sphere */
  function _iceCapsSVG(cx, cy, r) {
    return `<g class="planet__ice-caps" pointer-events="none">
      <ellipse cx="${cx}" cy="${cy - r + 8}" rx="30" ry="10"
               fill="rgba(255,255,255,0.2)"/>
      <ellipse cx="${cx + 3}" cy="${cy + r - 8}" rx="25" ry="9"
               fill="rgba(255,255,255,0.18)"/>
    </g>`;
  }

  /** Terminator shading — dark arc on right side for 3D depth */
  function _terminatorSVG(cx, cy, r) {
    const startY = cy - r;
    const endY = cy + r;
    return `<path class="planet__terminator" pointer-events="none"
                  d="M${cx + 20},${startY} A${r},${r} 0 0,1 ${cx + 20},${endY}
                     A${r * 1.1},${r} 0 0,0 ${cx + 20},${startY} Z"
                  fill="rgba(0,0,0,0.15)"/>`;
  }

  /* ─── Geometry overlay builders ─── */

  /** Rocky — craters with rims and inner shadows, mountain ridges */
  function _rockySVG(cx, cy, r) {
    // Crater data: [x-offset, y-offset, rx, ry]
    const craters = [
      [-30, -25, 18, 10], [35, -10, 14, 8], [-10, 30, 20, 11],
      [25, 20, 10, 6], [-40, 5, 5, 5],
      // Additional small craters for density
      [15, -40, 7, 4], [-50, -15, 6, 4], [45, 35, 5, 3],
    ];
    const craterSVG = craters.map(([dx, dy, rx, ry]) => {
      const x = cx + dx, y = cy + dy;
      return `<!-- Crater at ${dx},${dy} -->
      <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"
               fill="rgba(0,0,0,0.12)" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
      <!-- Rim highlight (sun-lit upper edge) -->
      <ellipse cx="${x}" cy="${y - ry * 0.3}" rx="${rx * 0.9}" ry="${ry * 0.4}"
               fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
      <!-- Inner shadow -->
      <ellipse cx="${x + 2}" cy="${y + ry * 0.15}" rx="${rx * 0.55}" ry="${ry * 0.45}"
               fill="rgba(0,0,0,0.18)"/>`;
    }).join('\n      ');

    // Mountain ridge lines
    const ridges = `
      <polyline points="${cx - 55},${cy + 5} ${cx - 45},${cy - 5} ${cx - 35},${cy + 2} ${cx - 25},${cy - 8} ${cx - 18},${cy + 3}"
                fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-linecap="round"/>
      <polyline points="${cx + 30},${cy - 35} ${cx + 38},${cy - 45} ${cx + 48},${cy - 38} ${cx + 55},${cy - 42}"
                fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" stroke-linecap="round"/>`;

    return `<g class="planet__geometry planet__geometry--rocky">
      ${craterSVG}
      ${ridges}
    </g>`;
  }

  /** Gas — alternating band colours, wavy edges, Great Storm, construction band */
  function _gasSVG(cx, cy, r) {
    const bands = [];
    const offsets = [-55, -35, -15, 5, 25, 45];
    const widths = [12, 10, 14, 10, 12, 8];
    const opacities = [0.12, 0.06, 0.15, 0.08, 0.12, 0.05];
    const lightBands = [1, 3, 5]; // Alternating lighter bands

    for (let i = 0; i < offsets.length; i++) {
      const by = cy + offsets[i];
      const dy = by - cy;
      const halfW = Math.sqrt(Math.max(0, r * r - dy * dy));
      if (halfW < 5) continue;

      const isLight = lightBands.includes(i);
      const fill = isLight
        ? `rgba(255,255,255,${opacities[i]})`
        : `rgba(0,0,0,${opacities[i]})`;

      // Wavy band edges on bands 1 and 3
      if (i === 1 || i === 3) {
        const w = halfW * 2;
        const x0 = cx - halfW;
        const h = widths[i];
        const wave = `M${x0},${by}
          C${x0 + w * 0.2},${by - 3} ${x0 + w * 0.4},${by + 2} ${x0 + w * 0.6},${by - 1}
          C${x0 + w * 0.8},${by + 3} ${x0 + w * 0.95},${by - 1} ${x0 + w},${by}
          L${x0 + w},${by + h}
          C${x0 + w * 0.8},${by + h + 2} ${x0 + w * 0.6},${by + h - 2} ${x0 + w * 0.4},${by + h + 1}
          C${x0 + w * 0.2},${by + h - 1} ${x0 + w * 0.05},${by + h + 2} ${x0},${by + h} Z`;
        bands.push(`<path d="${wave}" fill="${fill}" opacity="0.9"/>`);
      } else {
        bands.push(`<rect x="${cx - halfW}" y="${by}" width="${halfW * 2}" height="${widths[i]}"
                           rx="2" fill="${fill}" opacity="0.9"/>`);
      }
    }

    // Great Storm spot — upper-right area (nested ellipses with rotation)
    const stormCx = cx + 30, stormCy = cy - 30;
    const storm = `
      <g class="planet__storm" transform="rotate(-15 ${stormCx} ${stormCy})">
        <ellipse cx="${stormCx}" cy="${stormCy}" rx="20" ry="12"
                 fill="rgba(180,80,40,0.2)" stroke="rgba(160,60,30,0.15)" stroke-width="0.8"/>
        <ellipse cx="${stormCx}" cy="${stormCy}" rx="14" ry="8"
                 fill="rgba(200,100,50,0.18)" transform="rotate(10 ${stormCx} ${stormCy})"/>
        <ellipse cx="${stormCx}" cy="${stormCy}" rx="8" ry="4"
                 fill="rgba(220,120,60,0.22)" transform="rotate(-8 ${stormCx} ${stormCy})"/>
      </g>`;

    return `<g class="planet__geometry planet__geometry--gas">
      ${bands.join('\n      ')}
      ${storm}
    </g>`;
  }

  /** Ringed — ring shadow on body; ring halves rendered separately in _planetSVG */
  function _ringedSVG(cx, cy, r) {
    // Ring shadow on planet body — thin dark arc
    return `<g class="planet__geometry planet__geometry--ringed">
      <ellipse cx="${cx + 8}" cy="${cy + 12}" rx="${r * 0.7}" ry="5"
               fill="rgba(0,0,0,0.12)" transform="rotate(-12 ${cx + 8} ${cy + 12})"
               pointer-events="none"/>
    </g>`;
  }

  /** Ring back half — drawn behind planet body */
  function _ringBackSVG(cx, cy, r) {
    const ringRx = r + 40;
    const ringCy = cy + 5;
    const rot = `rotate(-12 ${cx} ${ringCy})`;
    return `<!-- Ring back half -->
      <ellipse class="planet__ring planet__ring--back" cx="${cx}" cy="${ringCy}"
               rx="${ringRx}" ry="18"
               fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="10"
               transform="${rot}"/>
      <!-- Cassini division (back) -->
      <ellipse cx="${cx}" cy="${ringCy}"
               rx="${ringRx - 6}" ry="15"
               fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="2.5"
               transform="${rot}" pointer-events="none"/>`;
  }

  /** Ring front half — drawn in front of planet body */
  function _ringFrontSVG(cx, cy, r) {
    const ringRx = r + 40;
    const ringCy = cy + 5;
    const rot = `rotate(-12 ${cx} ${ringCy})`;
    const dashLen = Math.round(Math.PI * ringRx);
    return `<!-- Ring front half -->
      <ellipse class="planet__ring planet__ring--front" cx="${cx}" cy="${ringCy}"
               rx="${ringRx}" ry="18"
               fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="10"
               transform="${rot}"
               stroke-dasharray="${dashLen},${dashLen}"
               stroke-dashoffset="${dashLen}"/>
      <!-- Inner ring — slightly darker -->
      <ellipse class="planet__ring" cx="${cx}" cy="${ringCy}"
               rx="${ringRx - 12}" ry="13"
               fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="4"
               transform="${rot}"
               stroke-dasharray="${Math.round(Math.PI * (ringRx - 12))},${Math.round(Math.PI * (ringRx - 12))}"
               stroke-dashoffset="${Math.round(Math.PI * (ringRx - 12))}"/>
      <!-- Cassini division (front) -->
      <ellipse cx="${cx}" cy="${ringCy}"
               rx="${ringRx - 6}" ry="15"
               fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"
               transform="${rot}" pointer-events="none"
               stroke-dasharray="${Math.round(Math.PI * (ringRx - 6))},${Math.round(Math.PI * (ringRx - 6))}"
               stroke-dashoffset="${Math.round(Math.PI * (ringRx - 6))}"/>`;
  }

  const GEOMETRY = { rocky: _rockySVG, gas: _gasSVG, ringed: _ringedSVG };

  /* ─── Fault zone builders ─── */

  /** Fire patches — upper-right quadrant with smoke, embers, scorch, flames */
  function _fireZoneSVG(cx, cy) {
    const fx = cx + 20, fy = cy - 20;

    // Fire cluster data: [dx, dy, rx, ry, opacity]
    const patches = [
      [-15, -8, 14, 9, 0.6], [15, 8, 16, 10, 0.55],
      [-5, 22, 12, 8, 0.5], [30, -5, 10, 7, 0.5],
    ];

    let svg = `<g class="planet__fires" data-role="wash-target">
      <rect x="${fx - 45}" y="${fy - 35}" width="90" height="70" fill="transparent"/>`;

    patches.forEach(([dx, dy, rx, ry, op], i) => {
      const px = fx + dx, py = fy + dy;

      // Ground scorch mark (underneath fire)
      svg += `
      <ellipse cx="${px}" cy="${py + 3}" rx="${rx + 4}" ry="${ry + 2}"
               fill="rgba(0,0,0,0.2)" class="planet__scorch-mark"/>`;

      // Main fire patch
      svg += `
      <ellipse cx="${px}" cy="${py}" rx="${rx}" ry="${ry}"
               fill="rgba(230,80,30,${op})" class="planet__fire-patch"/>`;

      // Ember glow — bright inner core
      svg += `
      <ellipse cx="${px}" cy="${py}" rx="${rx * 0.5}" ry="${ry * 0.45}"
               fill="rgba(255,100,20,0.7)" class="planet__ember-glow"/>`;

      // Heat distortion ring
      svg += `
      <circle cx="${px}" cy="${py}" r="${Math.max(rx, ry) + 6}"
              fill="none" stroke="rgba(255,150,50,0.2)" stroke-width="1"
              stroke-dasharray="3 4" class="planet__heat-ring"/>`;

      // Flame tongues — 2-3 teardrop paths per patch
      const tongueOffsets = [[-4, 0], [3, -2], [0, 3]];
      tongueOffsets.forEach(([tdx, tdy], j) => {
        const tx = px + tdx, ty = py + tdy;
        const h = 8 + j * 3;
        svg += `
      <path d="M${tx},${ty} C${tx - 3},${ty - h * 0.5} ${tx - 1},${ty - h} ${tx},${ty - h - 2}
               C${tx + 1},${ty - h} ${tx + 3},${ty - h * 0.5} ${tx},${ty} Z"
            fill="rgba(255,180,40,0.5)" class="planet__flame-tongue"
            style="animation-delay: ${(i * 0.2 + j * 0.15).toFixed(2)}s"/>`;
      });

      // Smoke plumes — staggered above fire
      const smokeOffsets = [[0, -12], [-5, -18], [4, -15]];
      smokeOffsets.forEach(([sdx, sdy], j) => {
        svg += `
      <ellipse cx="${px + sdx}" cy="${py + sdy}" rx="${5 + j * 2}" ry="${3 + j}"
               fill="rgba(80,80,80,0.3)" class="planet__smoke-plume"
               style="animation-delay: ${(i * 0.3 + j * 0.2).toFixed(2)}s"/>`;
      });
    });

    // Flame flicker circles (existing — kept for wash transition logic)
    svg += `
      <circle cx="${fx - 15}" cy="${fy - 11}" r="4" fill="rgba(255,200,50,0.6)"
              class="planet__flame-flicker"/>
      <circle cx="${fx + 15}" cy="${fy + 5}" r="5" fill="rgba(255,200,50,0.55)"
              class="planet__flame-flicker"/>
      <circle cx="${fx - 5}" cy="${fy + 19}" r="3.5" fill="rgba(255,200,50,0.5)"
              class="planet__flame-flicker"/>
    </g>`;

    return svg;
  }

  /** Forest patches — left side of sphere */
  function _forestZoneSVG(cx, cy) {
    const fx = cx - 30, fy = cy - 5;
    return `<g class="planet__forests" data-role="interactive">
      <rect x="${fx - 40}" y="${fy - 40}" width="80" height="80" fill="transparent"/>
      <ellipse cx="${fx - 10}" cy="${fy - 15}" rx="15" ry="10"
               fill="rgba(120,90,50,0.5)" class="planet__barren-patch"/>
      <ellipse cx="${fx + 10}" cy="${fy + 12}" rx="18" ry="11"
               fill="rgba(120,90,50,0.45)" class="planet__barren-patch"/>
      <ellipse cx="${fx - 5}" cy="${fy - 32}" rx="12" ry="8"
               fill="rgba(120,90,50,0.4)" class="planet__barren-patch"/>
      <!-- Tree icons (hidden until planted) -->
      <text class="planet__tree" x="${fx - 10}" y="${fy - 12}"
            text-anchor="middle" font-size="14" opacity="0">🌲</text>
      <text class="planet__tree" x="${fx + 10}" y="${fy + 15}"
            text-anchor="middle" font-size="16" opacity="0">🌳</text>
      <text class="planet__tree" x="${fx - 5}" y="${fy - 29}"
            text-anchor="middle" font-size="12" opacity="0">🌲</text>
    </g>`;
  }

  /**
   * Ocean cleanup fault zone — animated oil-slick ellipses on ocean areas.
   * Gas shape uses amber/brown fills (toxic cloud), rocky/ringed use dark oil.
   */
  function _oceanZoneSVG(cx, cy, shape) {
    const isGas = shape === 'gas';
    // Oil slick positions — ocean areas between/around continents
    // [dx, dy, rx, ry, delay]
    const slicks = [
      [25, -20, 16, 9, 0],       // upper-right ocean gap
      [-15, -35, 12, 7, 0.4],    // north of northern continent
      [40, 10, 14, 8, 0.8],      // east ocean
      [-40, -10, 11, 6, 1.2],    // west ocean
      [5, -5, 18, 10, 0.6],      // central ocean gap
    ];

    const fill = isGas
      ? 'rgba(120,80,20,0.5)'    // amber/brown toxic cloud
      : 'rgba(20,20,30,0.6)';    // dark oil slick

    const fx = cx, fy = cy;
    let svg = `<g class="planet__ocean-spill" data-role="wash-target">
      <rect x="${fx - 60}" y="${fy - 55}" width="120" height="90" fill="transparent"/>`;

    slicks.forEach(([dx, dy, rx, ry, delay]) => {
      svg += `
      <ellipse cx="${fx + dx}" cy="${fy + dy}" rx="${rx}" ry="${ry}"
               fill="${fill}" class="planet__oil-slick"
               style="animation-delay: ${delay.toFixed(1)}s"/>`;
    });

    svg += `
    </g>`;
    return svg;
  }

  /** Tectonic volcanic — magma cracks + volcano eruptions */
  function _tectonicZoneSVG(cx, cy, r, shape) {
    const isGas = shape === 'gas';
    const yBias = isGas ? 20 : 0;

    const cracks = [
      `M${cx - 55},${cy + 5 + yBias} L${cx - 40},${cy - 3 + yBias} L${cx - 22},${cy + 8 + yBias} L${cx - 5},${cy - 2 + yBias} L${cx + 15},${cy + 6 + yBias} L${cx + 35},${cy - 1 + yBias} L${cx + 50},${cy + 4 + yBias}`,
      `M${cx - 40},${cy - 35 + yBias} L${cx - 28},${cy - 22 + yBias} L${cx - 15},${cy - 30 + yBias} L${cx + 2},${cy - 15 + yBias} L${cx + 18},${cy - 8 + yBias} L${cx + 30},${cy + 5 + yBias}`,
      `M${cx - 30},${cy + 25 + yBias} L${cx - 15},${cy + 18 + yBias} L${cx + 5},${cy + 30 + yBias} L${cx + 22},${cy + 22 + yBias} L${cx + 40},${cy + 28 + yBias}`,
    ];

    let svg = `<g class="planet__tectonic-zone" data-role="interactive">
      <rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="transparent"/>`;

    cracks.forEach((d, i) => {
      svg += `
      <g class="planet__magma-crack planet__magma-crack--${i}">
        <!-- Wider glowing stroke underneath -->
        <path d="${d}" fill="none"
              stroke="rgba(255,200,50,0.4)" stroke-width="4" stroke-linecap="round"
              pointer-events="none"/>
        <!-- Narrower bright crack on top (tappable) -->
        <path d="${d}" fill="none"
              stroke="rgba(255,80,20,0.7)" stroke-width="2" stroke-linecap="round"/>
      </g>`;
    });

    // 2 volcanoes at crack endpoints
    const volcanoPositions = [
      { x: cx + 50, y: cy + 4 + yBias },
      { x: cx + 30, y: cy + 5 + yBias },
    ];

    volcanoPositions.forEach((pos, i) => {
      const vx = pos.x, vy = pos.y;
      const halfW = 10, coneH = 15;
      const conePoints = `${vx - halfW},${vy} ${vx},${vy - coneH} ${vx + halfW},${vy}`;
      const lavaPath = `M${vx},${vy - coneH} C${vx - 3},${vy - coneH + 5} ${vx + 4},${vy - coneH + 10} ${vx + 2},${vy - coneH + 14}`;

      svg += `
      <g class="planet__eruption planet__eruption--${i}">
        <polygon class="planet__volcano" points="${conePoints}"
                 fill="rgba(80,50,30,0.8)" stroke="rgba(60,30,10,0.6)" stroke-width="1"/>
        <path d="${lavaPath}" fill="none" stroke="rgba(255,100,20,0.6)" stroke-width="2.5" stroke-linecap="round"/>`;

      const particles = [
        { dx: 0,  dy: -3,  r: 2.5 },
        { dx: -4, dy: -7,  r: 2 },
        { dx: 3,  dy: -10, r: 1.8 },
        { dx: -2, dy: -13, r: 1.5 },
        { dx: 1,  dy: -16, r: 1.2 },
      ];
      particles.forEach((p, j) => {
        svg += `
        <circle class="planet__lava-particle" cx="${vx + p.dx}" cy="${vy - coneH + p.dy}" r="${p.r}"
                fill="rgba(255,${120 + j * 20},20,0.7)"
                style="animation-delay: ${(j * 0.15).toFixed(2)}s"/>`;
      });

      svg += `
      </g>`;
    });

    svg += `
    </g>`;
    return svg;
  }

  /** Asteroid defence — 4 meteors approaching from outer viewbox edges */
  function _asteroidZoneSVG(cx, cy, r) {
    const meteors = [
      { x: cx - 180, y: cy - 100, label: 0 },
      { x: cx + 180, y: cy - 90,  label: 1 },
      { x: cx - 190, y: cy + 60,  label: 2 },
      { x: cx + 170, y: cy + 80,  label: 3 },
    ];

    const groups = meteors.map(({ x, y, label }) => {
      const dx = cx - x, dy = cy - y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / len, ny = dy / len;
      const travel = len - r - 10;
      const mdx = Math.round(nx * travel), mdy = Math.round(ny * travel);
      // Tail: triangular path trailing behind
      const tailLen = 18, tailSpread = 5;
      const px = -ny * tailSpread, py = nx * tailSpread;
      const tip = { x: -nx * tailLen, y: -ny * tailLen };
      const tailPath = `M0,0 L${(px + tip.x).toFixed(1)},${(py + tip.y).toFixed(1)} L${(-px + tip.x).toFixed(1)},${(-py + tip.y).toFixed(1)} Z`;

      return `<g class="planet__meteor-group planet__meteor-group--${label}"
                 transform="translate(${x}, ${y})"
                 style="--meteor-dx: ${mdx}px; --meteor-dy: ${mdy}px; animation-delay: ${label * 0.6}s">
        <circle r="8" fill="rgba(255,200,50,0.3)"/>
        <circle class="planet__meteor" r="6" fill="rgba(255,120,30,0.8)"/>
        <path class="planet__meteor-tail" d="${tailPath}" fill="rgba(255,80,20,0.4)"/>
      </g>`;
    });

    return `<g class="planet__asteroid-zone" data-role="interactive">
      <rect x="0" y="0" width="400" height="240" fill="transparent"/>
      ${groups.join('\n      ')}
    </g>`;
  }

  /** City zone — large continent on lower half of sphere for building */
  function _cityZoneSVG(cx, cy) {
    const fx = cx + 5, fy = cy + 25;
    return `<g class="planet__cities" data-role="sticker-zone">
      <rect x="${fx - 40}" y="${fy - 25}" width="80" height="50" rx="5"
            fill="transparent" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4 3" stroke-width="3.5"/>
      <rect x="${fx - 40}" y="${fy - 25}" width="80" height="50" rx="5"
            fill="transparent" stroke="rgba(0,0,0,0.45)" stroke-dasharray="4 3" stroke-width="2"/>
      <text class="planet__city-text" x="${fx}" y="${fy}"
            text-anchor="middle" dominant-baseline="central" font-size="0"></text>
      <rect x="${fx - 40}" y="${fy - 25}" width="80" height="50" fill="transparent"/>
    </g>`;
  }

  /* ─── Main SVG template ─── */

  /**
   * Render order:
   * shadow → atmosphere (outer + inner) → ring-back (ringed only)
   * → body circle → ocean shimmer → continents → terminator shading
   * → geometry overlay (craters/bands) → ice caps → specular highlights
   * → fault zones → ring-front (ringed only)
   */
  function _planetSVG(opts) {
    const { shape, hasFire, hasForest, hasCity, hasOcean, hasAsteroid, hasSatellite, hasTectonic } = opts;
    const cx = 200, cy = 110, r = 90;

    const geometryFn = GEOMETRY[shape] || GEOMETRY.rocky;
    const isRinged = shape === 'ringed';
    const isGas = shape === 'gas';
    const hasLand = !isGas; // Rocky and ringed have continents

    const tremorCls = hasTectonic ? ' planet__svg--tremor' : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" class="planet__svg${tremorCls}"
      <!-- Ground shadow -->
      <ellipse class="car__shadow" cx="200" cy="220" rx="100" ry="8" fill="rgba(0,0,0,0.12)"/>

      <!-- Atmosphere glow — outer ring -->
      <circle class="planet__atmosphere planet__atmosphere--outer" cx="${cx}" cy="${cy}" r="${r + 14}"
              fill="none" stroke="rgba(100,180,255,0.06)" stroke-width="4"/>
      <!-- Atmosphere glow — inner ring -->
      <circle class="planet__atmosphere" cx="${cx}" cy="${cy}" r="${r + 8}"
              fill="none" stroke="rgba(100,180,255,0.12)" stroke-width="8"/>

      <!-- Ring back half (ringed only — behind body) -->
      ${isRinged ? _ringBackSVG(cx, cy, r) : ''}

      <!-- Main body -->
      <circle class="planet__body svg-planet-paint" cx="${cx}" cy="${cy}" r="${r}"/>

      <!-- Ocean shimmer -->
      ${_oceanShimmerSVG(cx, cy, r)}

      <!-- Continents (rocky/ringed) or construction band (gas) -->
      ${hasLand ? _continentsSVG(cx, cy, r) : ''}
      ${isGas && hasCity ? _constructionBandSVG(cx, cy, r) : ''}

      <!-- Terminator shading (day/night edge) -->
      ${_terminatorSVG(cx, cy, r)}

      <!-- Geometry overlay (craters/bands/ring-shadow) -->
      ${geometryFn(cx, cy, r)}

      <!-- Polar ice caps -->
      ${_iceCapsSVG(cx, cy, r)}

      <!-- Specular highlight — main -->
      <ellipse class="planet__highlight" cx="${cx - 25}" cy="${cy - 30}"
               rx="35" ry="25" fill="rgba(255,255,255,0.18)"
               transform="rotate(-20 ${cx - 25} ${cy - 30})"/>
      <!-- Specular highlight — bright spot -->
      <ellipse class="planet__highlight" cx="${cx - 30}" cy="${cy - 35}"
               rx="12" ry="8" fill="rgba(255,255,255,0.22)"
               transform="rotate(-20 ${cx - 30} ${cy - 35})"/>

      <!-- Fault zones (shown per active faults) -->
      ${hasFire ? _fireZoneSVG(cx, cy) : ''}
      ${hasForest ? _forestZoneSVG(cx, cy) : ''}
      ${hasCity ? _cityZoneSVG(cx, cy) : ''}
      ${hasOcean ? _oceanZoneSVG(cx, cy, shape) : ''}
      ${hasAsteroid ? _asteroidZoneSVG(cx, cy, r) : ''}
      ${hasSatellite ? _satelliteZoneSVG(cx, cy, r) : ''}
      ${hasTectonic ? _tectonicZoneSVG(cx, cy, r, shape) : ''}

      <!-- Ring front half (ringed only — in front of body) -->
      ${isRinged ? _ringFrontSVG(cx, cy, r) : ''}
    </svg>`;
  }

  /* ─── Public ─── */

  /**
   * Create a planet element and append it to the garage.
   * @param {HTMLElement} garage - container element
   * @param {object} opts - { colour, faults }
   * @returns {object} controller
   */
  function create(garage, opts = {}) {
    const palette = GameState.get('planetPalette') || CONFIG.planetPalette;
    const colour = opts.colour || _pick(palette);
    const shapes = CONFIG.planetShapes || ['rocky', 'gas', 'ringed'];
    const shape = opts.shape || _pick(shapes);
    const faults = opts.faults || ['fire'];

    const hasFire = faults.includes('fire');
    const hasForest = faults.includes('forest');
    const hasCity = faults.includes('city');
    const hasOcean = faults.includes('oceanCleanup');
    const hasAsteroid = faults.includes('asteroidDefence');
    const hasSatellite = faults.includes('satelliteNetwork');
    const hasTectonic = faults.includes('tectonicVolcanic');

    const el = document.createElement('div');
    el.className = 'car car--planet';
    el.style.setProperty('--planet-colour', colour);
    el.style.setProperty('--vehicle-colour', colour);

    // Dashboard indicators — planet faults only
    const indicators = [
      ...(hasFire      ? [{ cls: 'fire',             fault: true }] : []),
      ...(hasForest    ? [{ cls: 'forest',           fault: true }] : []),
      ...(hasCity      ? [{ cls: 'city',             fault: true }] : []),
      ...(hasOcean     ? [{ cls: 'oceanCleanup',     fault: true }] : []),
      ...(hasAsteroid  ? [{ cls: 'asteroidDefence',  fault: true }] : []),
      ...(hasSatellite ? [{ cls: 'satelliteNetwork', fault: true }] : []),
      ...(hasTectonic  ? [{ cls: 'tectonicVolcanic', fault: true }] : []),
    ];

    const dashboardHTML = indicators.map(ind =>
      `<div class="car__indicator car__indicator--${ind.cls} ${ind.fault ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>`
    ).join('');

    el.innerHTML = `
      <div class="car__dashboard">${dashboardHTML}</div>
      ${_planetSVG({ shape, hasFire, hasForest, hasCity, hasOcean, hasAsteroid, hasSatellite, hasTectonic })}
    `;

    garage.appendChild(el);

    const controller = Vehicle.createController(el, {
      type: 'planet',
      faults,
      flatTyre: null,
      flatPartSelector: null,
      flatPartClass: null,
      fixingClass: null,
      liftSelector: null,
      pickExitAnim: () => 'planet-orbit',
    });
    return controller;
  }

  /** Satellite orbit with 3 broken satellites around the planet */
  function _satelliteZoneSVG(cx, cy, r) {
    const orbitRx = r + 25, orbitRy = 20;
    const angles = [0, 120, 240];

    let sats = '';
    angles.forEach((deg, i) => {
      const rad = deg * Math.PI / 180;
      const sx = cx + orbitRx * Math.cos(rad);
      const sy = cy + orbitRy * Math.sin(rad);
      sats += `
      <g class="planet__satellite planet__satellite--${i} planet__satellite--broken" data-role="interactive"
         transform="translate(${sx}, ${sy})">
        <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#667" stroke="#889" stroke-width="0.8"/>
        <rect x="-22" y="-2" width="16" height="4" rx="1" fill="#48a" stroke="#5ae" stroke-width="0.5"/>
        <rect x="6" y="-2" width="16" height="4" rx="1" fill="#48a" stroke="#5ae" stroke-width="0.5"/>
        <line x1="0" y1="-4" x2="0" y2="-8" stroke="#999" stroke-width="1"/>
        <circle cx="0" cy="-9" r="1.5" fill="#999"/>
        <circle class="planet__sat-spark" cx="0" cy="0" r="3" fill="rgba(255,200,50,0.7)"/>
      </g>`;
    });

    return `<g class="planet__satellite-zone">
      <ellipse class="planet__sat-orbit" cx="${cx}" cy="${cy}"
               rx="${orbitRx}" ry="${orbitRy}"
               fill="none" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 3"
               transform="rotate(-8 ${cx} ${cy})"/>
      ${sats}
    </g>`;
  }

  /** Satellite part preview SVG for the picker widget */
  function satellitePreviewSVG(_style) {
    return `<svg viewBox="0 0 40 30" style="width:40px;height:30px">
      <rect x="14" y="10" width="12" height="8" rx="2" fill="#667" stroke="#889" stroke-width="0.8"/>
      <rect x="2" y="12" width="12" height="4" rx="1" fill="#48a" stroke="#5ae" stroke-width="0.5"/>
      <rect x="26" y="12" width="12" height="4" rx="1" fill="#48a" stroke="#5ae" stroke-width="0.5"/>
      <circle cx="20" cy="8" r="2" fill="#999"/>
      <line x1="20" y1="10" x2="20" y2="8" stroke="#999" stroke-width="1"/>
    </svg>`;
  }

  return { create, satellitePreviewSVG };
})();

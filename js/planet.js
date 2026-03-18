/**
 * Planet rendering — inline SVG with sphere, geometry overlays, and fault zones.
 * 3 geometry types: rocky (craters), gas (bands), ringed (ring ellipse).
 * Planet-specific faults only: fire, forest, city — no tyres, engines, or paint.
 * Same controller interface as Car/Robot/Spaceship.
 */
const Planet = (() => {

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /**
   * Return rgba() of the complementary hue (hue + 180°) of a hex colour.
   * Saturation and lightness are nudged into a visible mid-range so the
   * complement reads clearly over the planet body without looking garish.
   */
  function _complementRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d + 6) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    const hc = (h + 0.5) % 1;  // complementary hue
    // Use fixed vivid s/l so the complement is clearly coloured regardless of
    // how muted the input planet colour is — only the hue is derived from it.
    const cs = 0.60;
    const cl = 0.62;
    const q = cl < 0.5 ? cl * (1 + cs) : cl + cs - cl * cs;
    const p = 2 * cl - q;
    const hue2rgb = (t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const cr = Math.round(hue2rgb(hc + 1/3) * 255);
    const cg = Math.round(hue2rgb(hc)       * 255);
    const cb = Math.round(hue2rgb(hc - 1/3) * 255);
    return `rgba(${cr},${cg},${cb},${alpha})`;
  }

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
  function _continentsSVG(cx, cy, r, colour) {
    const fA = _complementRGBA(colour, 0.82);   // main continent fill
    const fB = _complementRGBA(colour, 0.68);   // smaller landmass fill
    const fC = _complementRGBA(colour, 0.52);   // tiny islet fill
    const st = _complementRGBA(colour, 0.95);   // coastline stroke
    // Southern continent — large temperate landmass with a notched bay on the west coast
    const sc = `M${cx - 45},${cy + 15} C${cx - 52},${cy + 22} ${cx - 48},${cy + 35} ${cx - 38},${cy + 42}
                C${cx - 30},${cy + 48} ${cx - 18},${cy + 55} ${cx},${cy + 58}
                C${cx + 18},${cy + 60} ${cx + 35},${cy + 54} ${cx + 45},${cy + 44}
                C${cx + 52},${cy + 36} ${cx + 48},${cy + 20} ${cx + 32},${cy + 14}
                C${cx + 18},${cy + 9} ${cx - 5},${cy + 8} ${cx - 20},${cy + 10}
                C${cx - 30},${cy + 8} ${cx - 38},${cy + 8} ${cx - 45},${cy + 15} Z`;
    // Northern landmass — elongated, slightly fjord-y upper-left
    const nc = `M${cx - 38},${cy - 42} C${cx - 48},${cy - 36} ${cx - 44},${cy - 22} ${cx - 30},${cy - 18}
                C${cx - 20},${cy - 15} ${cx - 8},${cy - 20} ${cx - 6},${cy - 30}
                C${cx - 4},${cy - 38} ${cx - 12},${cy - 46} ${cx - 22},${cy - 47}
                C${cx - 30},${cy - 48} ${cx - 35},${cy - 47} ${cx - 38},${cy - 42} Z`;
    // Small island/archipelago — upper-right, two overlapping lobes
    const island = `M${cx + 20},${cy - 28} C${cx + 24},${cy - 35} ${cx + 34},${cy - 33} ${cx + 32},${cy - 26}
                    C${cx + 30},${cy - 20} ${cx + 19},${cy - 22} ${cx + 20},${cy - 28} Z`;
    const islet  = `M${cx + 30},${cy - 24} C${cx + 34},${cy - 28} ${cx + 40},${cy - 26} ${cx + 38},${cy - 21}
                    C${cx + 36},${cy - 17} ${cx + 28},${cy - 19} ${cx + 30},${cy - 24} Z`;
    return `<g class="planet__continents" pointer-events="none">
      <!-- Southern continent -->
      <path d="${sc}" fill="${fA}" stroke="${st}" stroke-width="0.8"/>
      <!-- Northern landmass -->
      <path d="${nc}" fill="${fB}" stroke="${st}" stroke-width="0.7"/>
      <!-- Island -->
      <path d="${island}" fill="${fB}" stroke="${st}" stroke-width="0.6"/>
      <!-- Islet -->
      <path d="${islet}"  fill="${fC}" stroke="${st}" stroke-width="0.5"/>
    </g>`;
  }

  /**
   * Gas construction band — metallic orbital ring where city zone sits.
   * "Cloud city" on an artificial rim built around the planet.
   */
  function _constructionBandSVG(cx, cy, r) {
    const bandY = cy + 42;
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

  /** Rocky — craters defined by their rims (not dark fills), plus ridge lines */
  function _rockySVG(cx, cy, r) {
    // Crater data: [x-offset, y-offset, rx, ry]
    // Fewer, well-spaced craters — large ones give character, small ones add depth
    const craters = [
      [-28, -22, 16, 9],   // large upper-left
      [ 34,  -8, 12, 7],   // large right
      [ -8,  32, 17, 9],   // large lower-left
      [ 28,  22,  8, 5],   // medium lower-right
      [ 14, -42,  5, 3],   // small upper
      [-48,  18,  4, 3],   // small far-left
    ];
    const craterSVG = craters.map(([dx, dy, rx, ry]) => {
      const x = cx + dx, y = cy + dy;
      return `
      <!-- Crater floor — dark hollow -->
      <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"
               fill="rgba(0,0,0,0.14)" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>
      <!-- Sunlit rim crescent — single bright arc on upper-left edge only -->
      <ellipse cx="${x - rx * 0.1}" cy="${y - ry * 0.18}" rx="${rx * 0.8}" ry="${ry * 0.38}"
               fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="0.9"/>`;
    }).join('');

    // Mountain ridge lines — more visible, give topographic variety
    const ridges = `
      <polyline points="${cx - 55},${cy + 5} ${cx - 45},${cy - 7} ${cx - 35},${cy + 3} ${cx - 22},${cy - 10} ${cx - 15},${cy + 4}"
                fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${cx + 28},${cy - 32} ${cx + 38},${cy - 44} ${cx + 50},${cy - 36} ${cx + 57},${cy - 41}"
                fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round"/>`;

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

  /** Fire patches — upper-right quadrant, anchored over island/archipelago */
  function _fireZoneSVG(cx, cy) {
    const fx = cx + 25, fy = cy - 30;

    // Fire cluster data: [dx, dy, rx, ry, opacity]
    const patches = [
      [-15, -8, 14, 9, 0.6], [15, 8, 16, 10, 0.55],
      [-5, 22, 12, 8, 0.5], [30, -5, 10, 7, 0.5],
    ];

    let svg = `<g class="planet__fires" data-role="wash-target">
      <rect x="${fx - 45}" y="${fy - 35}" width="90" height="70" fill="rgba(0,0,0,0.001)"/>`;

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

  /* ─── Zone position helpers (single source of truth) ─── */
  function _forestPos(cx, cy) { return [cx - 45, cy - 30]; }
  function _cityPos(cx, cy)   { return [cx + 25, cy + 32]; }

  /**
   * Render one dashed placement zone box at (fx, fy) with a CSS class prefix and
   * numeric index. Structurally identical to the city-zone boxes so that
   * applyStickerOrBadge, sticker-zone--applied, and highlightCarTarget all work
   * the same way for both zone types.
   */
  function _zoneSVG(fx, fy, id, prefix) {
    return `
    <g class="${prefix} ${prefix}--${id}" data-role="sticker-zone">
      <rect x="${fx - 30}" y="${fy - 20}" width="60" height="40" rx="5"
            fill="transparent" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4 3" stroke-width="3.5"/>
      <rect x="${fx - 30}" y="${fy - 20}" width="60" height="40" rx="5"
            fill="transparent" stroke="rgba(0,0,0,0.45)" stroke-dasharray="4 3" stroke-width="2"/>
      <text class="${prefix}-text" x="${fx}" y="${fy}"
            text-anchor="middle" dominant-baseline="central" font-size="0"></text>
      <rect x="${fx - 30}" y="${fy - 20}" width="60" height="40" fill="transparent"/>
    </g>`;
  }

  /** Terraform zone positions for rocky/ringed — ocean, landmass, island */
  function _terraformZonesForLand(cx, cy) {
    return [
      [cx - 20, cy + 45],   // water — southern ocean
      [cx - 45, cy - 30],   // plants — northern landmass (= _forestPos)
      [cx + 28, cy - 26],   // animals — island/archipelago
    ];
  }

  /** Terraform zone positions for gas — atmosphere, band left, band right */
  function _terraformZonesForGas(cx, cy) {
    return [
      [cx,      cy - 50],   // water — upper atmosphere cloud layer
      [cx - 42, cy + 44],   // plants — band left (floating algae)
      [cx + 42, cy + 44],   // animals — band right
    ];
  }

  /** Rocky/ringed expanded zones — southern continent, northern landmass, island */
  function _cityZonesForLand(cx, cy) {
    return [
      [cx + 25, cy + 32],   // southern continent (same as _cityPos)
      [cx - 22, cy - 32],   // northern landmass
      [cx + 26, cy - 26],   // island/archipelago
    ];
  }

  /** Gas expanded zones — spread along construction band at cy + 44 */
  function _cityZonesForGas(cx, cy) {
    return [
      [cx + 42, cy + 44],   // band right
      [cx,      cy + 44],   // band centre
      [cx - 42, cy + 44],   // band left
    ];
  }

  /**
   * Forest fault zone SVG.
   * - Not expanded: single interactive zone with barren patches + hidden tree icons
   *   (unchanged from original behaviour).
   * - Expanded (terraforming unlocked): 3 dashed placement zones at shape-appropriate
   *   positions; no barren patches — stickers tell the ecological story.
   */
  function _forestZoneSVG(cx, cy, expanded, shape) {
    if (!expanded) {
      const [fx, fy] = _forestPos(cx, cy);
      return `<g class="planet__forests" data-role="interactive">
        <rect x="${fx - 40}" y="${fy - 40}" width="80" height="80" fill="rgba(0,0,0,0.001)"/>
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

    // Expanded: 3 sticker placement zones — water, plants, animals
    const isGas = shape === 'gas';
    const positions = isGas
      ? _terraformZonesForGas(cx, cy)
      : _terraformZonesForLand(cx, cy);
    return positions.map(([fx, fy], id) => _zoneSVG(fx, fy, id, 'planet__terraform-zone')).join('');
  }

  /**
   * Ocean cleanup fault zone — animated oil-slick ellipses on ocean areas.
   * Gas shape uses amber/brown fills (toxic cloud), rocky/ringed use dark oil.
   */
  function _oceanZoneSVG(cx, cy, shape) {
    const isGas = shape === 'gas';
    // Oil spill clusters — each has a main blob + tendrils + sheen.
    // Compact offsets keep the zone in the lower-left quadrant so it
    // doesn't visually overlap fire (upper-right) or forest (upper-left).
    // [dx, dy, rx, ry, angle, delay]
    const spills = [
      [0,  -12, 14, 8, -10, 0  ],
      [-18,  -2, 10, 6,  20, 0.4],
      [ 15,   8, 12, 7,  -5, 0.8],
      [ -8,  18, 10, 5,  15, 1.2],
      [  6, -25,  8, 5,   5, 0.6],
    ];

    const darkFill = isGas ? 'rgba(120,80,20,0.5)' : 'rgba(20,20,30,0.55)';
    const edgeFill = isGas ? 'rgba(140,100,30,0.3)' : 'rgba(40,30,50,0.35)';
    const sheenFill = isGas ? 'rgba(180,140,60,0.2)' : 'rgba(80,40,120,0.2)';
    const tendrilStroke = isGas ? 'rgba(100,70,15,0.4)' : 'rgba(15,15,25,0.45)';

    // Lower-left quadrant — anchored on the southern continent's western coast
    const fx = cx - 30, fy = cy + 20;
    /* The hit-area rect uses near-zero opacity (not fill="transparent") so it
       registers as a valid painted target with SVG visiblePainted semantics.
       Animated children carry explicit pointer-events="none" to prevent
       compositing-layer quirks from intercepting clicks meant for zones below. */
    let svg = `<g class="planet__ocean-spill" data-role="wash-target">
      <rect x="${fx - 35}" y="${fy - 40}" width="70" height="70" fill="rgba(0,0,0,0.001)"/>`;

    spills.forEach(([dx, dy, rx, ry, angle, delay]) => {
      const sx = fx + dx, sy = fy + dy;
      const rot = `rotate(${angle} ${sx} ${sy})`;
      // Spreading edge — larger, lighter, animated outward
      svg += `
      <ellipse cx="${sx}" cy="${sy}" rx="${rx * 1.4}" ry="${ry * 1.3}"
               fill="${edgeFill}" class="planet__oil-edge" pointer-events="none"
               transform="${rot}" style="animation-delay: ${delay.toFixed(1)}s"/>`;
      // Main slick body
      svg += `
      <ellipse cx="${sx}" cy="${sy}" rx="${rx}" ry="${ry}"
               fill="${darkFill}" class="planet__oil-slick" pointer-events="none"
               transform="${rot}" style="animation-delay: ${delay.toFixed(1)}s"/>`;
      // Iridescent sheen — offset highlight
      svg += `
      <ellipse cx="${sx - rx * 0.2}" cy="${sy - ry * 0.25}" rx="${rx * 0.5}" ry="${ry * 0.4}"
               fill="${sheenFill}" class="planet__oil-sheen" pointer-events="none"
               transform="${rot}" style="animation-delay: ${(delay + 0.3).toFixed(1)}s"/>`;
      // Tendrils — 2-3 curved fingers spreading outward
      const t1 = `M${sx + rx * 0.6},${sy} Q${sx + rx * 1.3},${sy + ry * 0.5} ${sx + rx * 1.6},${sy + ry * 0.2}`;
      const t2 = `M${sx - rx * 0.5},${sy + ry * 0.3} Q${sx - rx * 1.1},${sy + ry * 1.0} ${sx - rx * 1.4},${sy + ry * 0.6}`;
      const t3 = `M${sx},${sy - ry * 0.5} Q${sx + rx * 0.4},${sy - ry * 1.2} ${sx + rx * 0.8},${sy - ry * 1.0}`;
      svg += `
      <path d="${t1}" fill="none" stroke="${tendrilStroke}" stroke-width="2.5" stroke-linecap="round"
            class="planet__oil-tendril" pointer-events="none"
            transform="${rot}" style="animation-delay: ${(delay + 0.2).toFixed(1)}s"/>
      <path d="${t2}" fill="none" stroke="${tendrilStroke}" stroke-width="2" stroke-linecap="round"
            class="planet__oil-tendril" pointer-events="none"
            transform="${rot}" style="animation-delay: ${(delay + 0.5).toFixed(1)}s"/>
      <path d="${t3}" fill="none" stroke="${tendrilStroke}" stroke-width="1.5" stroke-linecap="round"
            class="planet__oil-tendril" pointer-events="none"
            transform="${rot}" style="animation-delay: ${(delay + 0.8).toFixed(1)}s"/>`;
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
      `M${cx - 55},${cy + 5 + yBias} L${cx - 40},${cy - 3 + yBias} L${cx - 22},${cy + 8 + yBias} L${cx - 5},${cy - 2 + yBias} L${cx + 15},${cy + 6 + yBias} L${cx + 35},${cy - 1 + yBias} L${cx + 50},${cy + 12 + yBias}`,
      `M${cx - 40},${cy - 35 + yBias} L${cx - 28},${cy - 22 + yBias} L${cx - 15},${cy - 30 + yBias} L${cx + 2},${cy - 15 + yBias} L${cx + 18},${cy - 8 + yBias} L${cx + 30},${cy + 20 + yBias}`,
      `M${cx - 30},${cy + 25 + yBias} L${cx - 15},${cy + 18 + yBias} L${cx + 5},${cy + 30 + yBias} L${cx + 22},${cy + 22 + yBias} L${cx + 40},${cy + 28 + yBias}`,
    ];

    let svg = `<g class="planet__tectonic-zone" data-role="interactive">
      <!-- No background hit rect — cracks use wide strokes, eruptions use per-element
           rects. A full-disk rect here would block clicks on underlying fault zones. -->`;

    cracks.forEach((d, i) => {
      svg += `
      <g class="planet__magma-crack planet__magma-crack--${i}">
        <!-- Wide near-zero-opacity stroke — hit area; visiblePainted needs painted stroke -->
        <path d="${d}" fill="none"
              stroke="rgba(0,0,0,0.001)" stroke-width="16" stroke-linecap="round"/>
        <!-- Wider glowing stroke underneath -->
        <path d="${d}" fill="none"
              stroke="rgba(255,200,50,0.4)" stroke-width="4" stroke-linecap="round"
              pointer-events="none"/>
        <!-- Narrower bright crack on top -->
        <path d="${d}" fill="none"
              stroke="rgba(255,80,20,0.7)" stroke-width="2" stroke-linecap="round"
              pointer-events="none"/>
      </g>`;
    });

    // 2 volcanoes at crack endpoints — right-centre equatorial band,
    // shifted down from fire (upper-right) and clear of city (lower-right)
    const volcanoPositions = [
      { x: cx + 50, y: cy + 12 + yBias },
      { x: cx + 30, y: cy + 20 + yBias },
    ];

    volcanoPositions.forEach((pos, i) => {
      const vx = pos.x, vy = pos.y;
      const halfW = 10, coneH = 15;
      const conePoints = `${vx - halfW},${vy} ${vx},${vy - coneH} ${vx + halfW},${vy}`;
      const lavaPath = `M${vx},${vy - coneH} C${vx - 3},${vy - coneH + 5} ${vx + 4},${vy - coneH + 10} ${vx + 2},${vy - coneH + 14}`;

      svg += `
      <g class="planet__eruption planet__eruption--${i}">
        <!-- Hit area — near-zero opacity so visiblePainted semantics work reliably -->
        <rect x="${vx - halfW - 5}" y="${vy - coneH - 20}" width="${halfW * 2 + 10}" height="${coneH + 25}" fill="rgba(0,0,0,0.001)"/>
        <polygon class="planet__volcano" points="${conePoints}"
                 fill="rgba(80,50,30,0.8)" stroke="rgba(60,30,10,0.6)" stroke-width="1" pointer-events="none"/>
        <path d="${lavaPath}" fill="none" stroke="rgba(255,100,20,0.6)" stroke-width="2.5" stroke-linecap="round" pointer-events="none"/>`;

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
                fill="rgba(255,${120 + j * 20},20,0.7)" pointer-events="none"
                style="animation-delay: ${(j * 0.15).toFixed(2)}s"/>`;
      });

      svg += `
      </g>`;
    });

    svg += `
    </g>`;
    return svg;
  }

  /**
   * Hidden impact site at planet surface — revealed as crater + fire on meteor miss.
   * Uses existing fire patch/ember classes so no new CSS is needed for the elements themselves.
   */
  function _impactSiteSVG(x, y, i) {
    const rx = x.toFixed(1), ry = y.toFixed(1);
    return `<g class="planet__impact-site planet__impact-site--${i}" pointer-events="none">
      <!-- Crater floor — dark scorch ellipse -->
      <ellipse cx="${rx}" cy="${ry}" rx="8" ry="5"
               fill="rgba(0,0,0,0.35)" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
      <!-- Sunlit rim crescent -->
      <ellipse cx="${(x - 0.8).toFixed(1)}" cy="${(y - 0.9).toFixed(1)}" rx="6.5" ry="2"
               fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="0.9"/>
      <!-- Fire patch -->
      <ellipse cx="${rx}" cy="${ry}" rx="7" ry="5"
               fill="rgba(230,80,30,0.6)" class="planet__fire-patch"/>
      <!-- Ember glow -->
      <ellipse cx="${rx}" cy="${ry}" rx="3.5" ry="2.5"
               fill="rgba(255,100,20,0.7)" class="planet__ember-glow"/>
    </g>`;
  }

  /**
   * Asteroid defence — 4 meteors at random angles around the planet orbit.
   * Spawn at r*1.5 distance; random sorted delays [0, 1.5s] stored as data-delay
   * so planet-repair.js can compute per-meteor step timeouts.
   */
  function _asteroidZoneSVG(cx, cy, r) {
    const spawnDist = r * 1.5;
    const angles = Array.from({length: 4}, () => Math.random() * 2 * Math.PI);
    const delays = Array.from({length: 4}, () => Math.random() * 1.5).sort((a, b) => a - b);

    const groups = angles.map((angle, i) => {
      // Spawn at orbit distance
      const sx = cx + spawnDist * Math.cos(angle);
      const sy = cy + spawnDist * Math.sin(angle);
      // Impact point — inside the planet disk (r*0.75), not on the edge
      const impactDist = r * 0.75;
      const impactX = cx + impactDist * Math.cos(angle);
      const impactY = cy + impactDist * Math.sin(angle);

      // Unit vector pointing from spawn toward planet centre
      const nx = -Math.cos(angle), ny = -Math.sin(angle);

      // Tail: triangular path trailing behind (points away from planet)
      const tailLen = 18, tailSpread = 5;
      const px = -ny * tailSpread, py = nx * tailSpread;
      const tip = { x: -nx * tailLen, y: -ny * tailLen };
      const tailPath = `M0,0 L${(px + tip.x).toFixed(1)},${(py + tip.y).toFixed(1)} L${(-px + tip.x).toFixed(1)},${(-py + tip.y).toFixed(1)} Z`;

      const delay = delays[i].toFixed(2);

      return `${_impactSiteSVG(impactX, impactY, i)}
      <line class="planet__laser planet__laser--${i}"
            x1="${cx}" y1="${cy}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}"
            pointer-events="none"/>
      <g class="planet__meteor-group planet__meteor-group--${i}" data-role="interactive"
         style="--spawn-x: ${(sx / 400 * 100).toFixed(2)}%; --spawn-y: ${(sy / 240 * 100).toFixed(2)}%; --meteor-dx: ${(impactX / 400 * 100).toFixed(2)}%; --meteor-dy: ${(impactY / 240 * 100).toFixed(2)}%; animation-delay: ${delay}s"
         data-delay="${delay}">
        <!-- Hit area — near-zero opacity so visiblePainted semantics work reliably -->
        <circle r="20" fill="rgba(0,0,0,0.001)"/>
        <circle r="8" fill="rgba(255,200,50,0.3)" pointer-events="none"/>
        <circle class="planet__meteor" r="6" fill="rgba(255,120,30,0.8)" pointer-events="none"/>
        <path class="planet__meteor-tail" d="${tailPath}" fill="rgba(255,80,20,0.4)" pointer-events="none"/>
      </g>`;
    });

    return `<g class="planet__asteroid-zone" data-role="interactive">
      <!-- Full-viewbox rect kept for layout; must never intercept clicks -->
      <rect x="0" y="0" width="400" height="240" fill="transparent" pointer-events="none"/>
      ${groups.join('\n      ')}
    </g>`;
  }

  /**
   * City zone(s) — lower-right quadrant by default.
   * When expanded, 3 zones spread across shape-appropriate positions;
   * zone boxes shrink from 80×50 to 60×40 to avoid crowding.
   */
  function _cityZoneSVG(cx, cy, expanded, shape) {
    const isGas = shape === 'gas';
    const positions = expanded
      ? (isGas ? _cityZonesForGas(cx, cy) : _cityZonesForLand(cx, cy))
      : [_cityPos(cx, cy)];

    return positions.map(([fx, fy], id) => _zoneSVG(fx, fy, id, 'planet__city-zone')).join('');
  }

  /**
   * Completed forest decoration — same geometry as _forestZoneSVG but non-interactive,
   * rendered in fully-repaired state (green patches, visible trees) with no animation.
   * Shown as civilisation background when a more advanced fault is active.
   */
  function _forestDecorationSVG(cx, cy) {
    const [fx, fy] = _forestPos(cx, cy);
    return `<g class="planet__forest-decoration" pointer-events="none">
      <ellipse cx="${fx - 10}" cy="${fy - 15}" rx="15" ry="10"
               fill="rgba(60,140,60,0.5)"/>
      <ellipse cx="${fx + 10}" cy="${fy + 12}" rx="18" ry="11"
               fill="rgba(60,140,60,0.5)"/>
      <ellipse cx="${fx - 5}" cy="${fy - 32}" rx="12" ry="8"
               fill="rgba(60,140,60,0.5)"/>
      <text x="${fx - 10}" y="${fy - 12}"
            text-anchor="middle" font-size="14" opacity="1">🌲</text>
      <text x="${fx + 10}" y="${fy + 15}"
            text-anchor="middle" font-size="16" opacity="1">🌳</text>
      <text x="${fx - 5}" y="${fy - 29}"
            text-anchor="middle" font-size="12" opacity="1">🌲</text>
    </g>`;
  }

  /**
   * Completed city decoration — multiple stickers spread across the zone, showing a
   * developed cityscape. Non-interactive. Shown when asteroid/satellite fault is active.
   * Gas planets also include the construction band.
   */
  function _cityDecorationSVG(cx, cy, r, shape) {
    const [fx, fy] = _cityPos(cx, cy);
    const isGas = shape === 'gas';
    // Pick 3 distinct stickers at random from the pool
    const pool = [...CONFIG.planetStickers];
    const picks = [];
    while (picks.length < 3) {
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    // Three positions within the zone rect, varied sizes to suggest depth
    const slots = [
      [fx - 18, fy + 2,  28],
      [fx + 16, fy - 5,  24],
      [fx +  2, fy + 14, 22],
    ];
    const stickers = slots.map(([x, y, size], i) =>
      `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
             font-size="${size}">${picks[i]}</text>`
    ).join('\n      ');
    return `<g class="planet__city-decoration" pointer-events="none">
      ${isGas ? _constructionBandSVG(cx, cy, r) : ''}
      ${stickers}
    </g>`;
  }

  /* ─── Main SVG template ─── */

  /**
   * Render order:
   * shadow → atmosphere (outer + inner) → ring-back (ringed only)
   * → body circle → ocean shimmer → continents → terminator shading
   * → geometry overlay (craters/bands) → ice caps → specular highlights
   * → civilisation decorations (forest/city background) → fault zones
   *   (fire/ocean/asteroid/satellite/tectonic → forest/city on top) → ring-front (ringed only)
   */
  function _planetSVG(opts) {
    const { shape, colour, hasFire, hasForest, hasCity, hasOcean, hasAsteroid, hasSatellite, hasTectonic } = opts;
    const cx = 200, cy = 110, r = 90;

    const geometryFn = GEOMETRY[shape] || GEOMETRY.rocky;
    const isRinged = shape === 'ringed';
    const isGas = shape === 'gas';
    const hasLand = !isGas; // Rocky and ringed have continents

    const tremorCls = hasTectonic ? ' planet__svg--tremor' : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" class="planet__svg${tremorCls}"
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

      <!-- Continents (rocky/ringed) -->
      ${hasLand ? _continentsSVG(cx, cy, r, colour) : ''}

      <!-- Terminator shading (day/night edge) -->
      ${_terminatorSVG(cx, cy, r)}

      <!-- Geometry overlay (craters/bands/ring-shadow) -->
      ${geometryFn(cx, cy, r)}

      <!-- Construction band (gas only — after bands so it's visible) -->
      ${isGas && hasCity ? _constructionBandSVG(cx, cy, r) : ''}

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

      <!-- Civilisation decorations — repaired-state background, below active fault zones -->
      <!-- Forest shown when city/asteroid/satellite fault is active (but not if forest itself is active) -->
      <!-- City shown when asteroid/satellite fault is active (but not if city itself is active) -->
      ${(hasCity || hasAsteroid || hasSatellite) && !hasForest ? _forestDecorationSVG(cx, cy) : ''}
      ${(hasAsteroid || hasSatellite) && !hasCity ? _cityDecorationSVG(cx, cy, r, shape) : ''}

      <!-- Fault zones (shown per active faults) -->
      <!-- fire/ocean/asteroid/satellite/tectonic first, then forest/city on top -->
      ${hasFire ? _fireZoneSVG(cx, cy) : ''}
      ${hasOcean ? _oceanZoneSVG(cx, cy, shape) : ''}
      ${hasAsteroid ? _asteroidZoneSVG(cx, cy, r) : ''}
      ${hasSatellite ? _satelliteZoneSVG(cx, cy, r) : ''}
      ${hasTectonic ? _tectonicZoneSVG(cx, cy, r, shape) : ''}
      ${hasForest ? _forestZoneSVG(cx, cy, GameState.get('terraformExpanded'), shape) : ''}
      ${hasCity ? _cityZoneSVG(cx, cy, GameState.get('cityExpanded'), shape) : ''}

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

    // Dashboard indicators — base faults always shown, upgrades shown when unlocked
    const planetWeights = GameState.get('planetFaultWeights');
    const indicators = [
      ...('asteroidDefence' in planetWeights ? [{ cls: 'asteroidDefence',  fault: hasAsteroid }]  : []),
      ...('tectonicVolcanic' in planetWeights ? [{ cls: 'tectonicVolcanic', fault: hasTectonic }]  : []),
      { cls: 'fire',             fault: hasFire },
      ...('oceanCleanup'    in planetWeights ? [{ cls: 'oceanCleanup',     fault: hasOcean }]     : []),
      ...('satelliteNetwork' in planetWeights ? [{ cls: 'satelliteNetwork', fault: hasSatellite }] : []),
      { cls: 'forest',          fault: hasForest },
      { cls: 'city',             fault: hasCity },
    ];

    const dashboardHTML = indicators.map(ind =>
      `<div class="car__indicator car__indicator--${ind.cls} ${ind.fault ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>`
    ).join('');

    el.innerHTML = `
      <div class="car__dashboard">${dashboardHTML}</div>
      ${_planetSVG({ shape, colour, hasFire, hasForest, hasCity, hasOcean, hasAsteroid, hasSatellite, hasTectonic })}
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

  /**
   * Satellite orbit — 3 broken satellites at random angles around the planet.
   * Near-circular orbit (orbitRy ≈ 0.75r) allows vertical scatter so satellites
   * aren't all bunched at the equator.  Random angles follow the same pattern as
   * _asteroidZoneSVG.  Each satellite uses a double-layer contrast technique:
   * dark shadow stroke + white halo stroke drawn behind the coloured shapes so
   * the satellite reads clearly on any planet colour.
   */
  function _satelliteZoneSVG(cx, cy, r) {
    const orbitRx = r + 28;
    const orbitRy = Math.round(r * 0.75);  // near-circular — ~67 for r=90

    // Random scatter around the full orbit
    const angles = Array.from({length: 3}, () => Math.random() * 2 * Math.PI);
    const tilts  = angles.map(() => Math.round((Math.random() - 0.5) * 60));  // –30° to +30°

    let sats = '';
    angles.forEach((angle, i) => {
      const sx = (cx + orbitRx * Math.cos(angle)).toFixed(1);
      const sy = (cy + orbitRy * Math.sin(angle)).toFixed(1);
      const tilt = tilts[i];
      sats += `
      <g class="planet__satellite planet__satellite--${i} planet__satellite--broken" data-role="interactive"
         data-tilt="${tilt}"
         transform="translate(${sx}, ${sy}) rotate(${tilt})">
        <!-- Hit area — near-zero opacity so visiblePainted semantics work reliably -->
        <rect x="-28" y="-16" width="56" height="28" fill="rgba(0,0,0,0.001)"/>
        <!-- Shadow layer (dark outline) — readable on light planet colours -->
        <rect x="-6" y="-4" width="12" height="8" rx="2"
              fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="3.5" pointer-events="none"/>
        <rect x="-22" y="-2" width="16" height="4" rx="1"
              fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="3.5" pointer-events="none"/>
        <rect x="6" y="-2" width="16" height="4" rx="1"
              fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="3.5" pointer-events="none"/>
        <!-- Halo layer (white outline) — readable on dark planet colours -->
        <rect x="-6" y="-4" width="12" height="8" rx="2"
              fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2" pointer-events="none"/>
        <rect x="-22" y="-2" width="16" height="4" rx="1"
              fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2" pointer-events="none"/>
        <rect x="6" y="-2" width="16" height="4" rx="1"
              fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2" pointer-events="none"/>
        <!-- Coloured satellite body -->
        <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#667" stroke="#889" stroke-width="0.8" pointer-events="none"/>
        <rect x="-22" y="-2" width="16" height="4" rx="1" fill="#48a" stroke="#5ae" stroke-width="0.5" pointer-events="none"/>
        <rect x="6" y="-2" width="16" height="4" rx="1" fill="#48a" stroke="#5ae" stroke-width="0.5" pointer-events="none"/>
        <line x1="0" y1="-4" x2="0" y2="-8" stroke="#999" stroke-width="1" pointer-events="none"/>
        <circle cx="0" cy="-9" r="1.5" fill="#999" pointer-events="none"/>
        <circle class="planet__sat-spark" cx="0" cy="0" r="3" fill="rgba(255,200,50,0.7)" pointer-events="none"/>
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

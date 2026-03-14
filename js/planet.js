/**
 * Planet rendering — inline SVG with sphere, geometry overlays, and fault zones.
 * 3 geometry types: rocky (craters), gas (bands), ringed (ring ellipse).
 * Planet-specific faults only: fire, forest, city — no tyres, engines, or paint.
 * Same controller interface as Car/Robot/Spaceship.
 */
const Planet = (() => {

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ─── Geometry overlay builders ─── */

  /** Rocky — crater ellipses scattered on surface */
  function _rockySVG(cx, cy, r) {
    return `<g class="planet__geometry planet__geometry--rocky">
      <ellipse cx="${cx - 30}" cy="${cy - 25}" rx="18" ry="10"
               fill="rgba(0,0,0,0.12)" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
      <ellipse cx="${cx + 35}" cy="${cy - 10}" rx="14" ry="8"
               fill="rgba(0,0,0,0.1)" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
      <ellipse cx="${cx - 10}" cy="${cy + 30}" rx="20" ry="11"
               fill="rgba(0,0,0,0.13)" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <ellipse cx="${cx + 25}" cy="${cy + 20}" rx="10" ry="6"
               fill="rgba(0,0,0,0.09)" stroke="rgba(0,0,0,0.14)" stroke-width="1"/>
      <circle cx="${cx - 40}" cy="${cy + 5}" r="5"
              fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.12)" stroke-width="0.8"/>
    </g>`;
  }

  /** Gas — horizontal band stripes (Jupiter-like) */
  function _gasSVG(cx, cy, r) {
    const bands = [];
    const offsets = [-55, -35, -15, 5, 25, 45];
    const widths = [12, 10, 14, 10, 12, 8];
    const opacities = [0.12, 0.08, 0.15, 0.1, 0.12, 0.06];
    for (let i = 0; i < offsets.length; i++) {
      const by = cy + offsets[i];
      // Clip band width to sphere boundary
      const dy = by - cy;
      const halfW = Math.sqrt(Math.max(0, r * r - dy * dy));
      if (halfW < 5) continue;
      bands.push(`<rect x="${cx - halfW}" y="${by}" width="${halfW * 2}" height="${widths[i]}"
                         rx="2" fill="rgba(0,0,0,${opacities[i]})" opacity="0.9"/>`);
    }
    return `<g class="planet__geometry planet__geometry--gas">
      ${bands.join('\n      ')}
    </g>`;
  }

  /** Ringed — tilted ring ellipse around sphere */
  function _ringedSVG(cx, cy, r) {
    return `<g class="planet__geometry planet__geometry--ringed">
      <!-- Ring back (behind planet — drawn first, clipped by planet body layering) -->
      <ellipse class="planet__ring planet__ring--back" cx="${cx}" cy="${cy + 5}"
               rx="${r + 40}" ry="18"
               fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="12"
               transform="rotate(-12 ${cx} ${cy + 5})"/>
      <!-- Ring front (drawn after planet body via CSS z-ordering) -->
      <ellipse class="planet__ring planet__ring--front" cx="${cx}" cy="${cy + 5}"
               rx="${r + 40}" ry="18"
               fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="10"
               transform="rotate(-12 ${cx} ${cy + 5})"
               stroke-dasharray="${Math.PI * (r + 40)},${Math.PI * (r + 40)}"
               stroke-dashoffset="${Math.PI * (r + 40)}"/>
    </g>`;
  }

  const GEOMETRY = { rocky: _rockySVG, gas: _gasSVG, ringed: _ringedSVG };

  /* ─── Fault zone builders ─── */

  /** Fire patches — upper-right quadrant of sphere */
  function _fireZoneSVG(cx, cy) {
    const fx = cx + 20, fy = cy - 20;
    return `<g class="planet__fires" data-role="wash-target">
      <rect x="${fx - 45}" y="${fy - 35}" width="90" height="70" fill="transparent"/>
      <ellipse cx="${fx - 15}" cy="${fy - 8}" rx="14" ry="9"
               fill="rgba(230,80,30,0.6)" class="planet__fire-patch"/>
      <ellipse cx="${fx + 15}" cy="${fy + 8}" rx="16" ry="10"
               fill="rgba(230,80,30,0.55)" class="planet__fire-patch"/>
      <ellipse cx="${fx - 5}" cy="${fy + 22}" rx="12" ry="8"
               fill="rgba(230,80,30,0.5)" class="planet__fire-patch"/>
      <ellipse cx="${fx + 30}" cy="${fy - 5}" rx="10" ry="7"
               fill="rgba(230,80,30,0.5)" class="planet__fire-patch"/>
      <!-- Flame flickers -->
      <circle cx="${fx - 15}" cy="${fy - 11}" r="4" fill="rgba(255,200,50,0.6)"
              class="planet__flame-flicker"/>
      <circle cx="${fx + 15}" cy="${fy + 5}" r="5" fill="rgba(255,200,50,0.55)"
              class="planet__flame-flicker"/>
      <circle cx="${fx - 5}" cy="${fy + 19}" r="3.5" fill="rgba(255,200,50,0.5)"
              class="planet__flame-flicker"/>
    </g>`;
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

  function _planetSVG(opts) {
    const { shape, hasFire, hasForest, hasCity } = opts;
    const cx = 200, cy = 110, r = 90;

    const geometryFn = GEOMETRY[shape] || GEOMETRY.rocky;
    const isRinged = shape === 'ringed';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" class="planet__svg">
      <!-- Ground shadow -->
      <ellipse class="car__shadow" cx="200" cy="220" rx="100" ry="8" fill="rgba(0,0,0,0.12)"/>

      <!-- Atmosphere glow -->
      <circle class="planet__atmosphere" cx="${cx}" cy="${cy}" r="${r + 8}"
              fill="none" stroke="rgba(100,180,255,0.12)" stroke-width="6"/>

      <!-- Ring back half (ringed only — behind body) -->
      ${isRinged ? `<ellipse class="planet__ring planet__ring--back" cx="${cx}" cy="${cy + 5}"
               rx="${r + 40}" ry="18"
               fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="10"
               transform="rotate(-12 ${cx} ${cy + 5})"/>` : ''}

      <!-- Main body -->
      <circle class="planet__body svg-planet-paint" cx="${cx}" cy="${cy}" r="${r}"/>

      <!-- Geometry overlay (craters/bands, or nothing for ringed — ring is separate) -->
      ${shape !== 'ringed' ? geometryFn(cx, cy, r) : ''}

      <!-- Specular highlight -->
      <ellipse class="planet__highlight" cx="${cx - 25}" cy="${cy - 30}"
               rx="35" ry="25" fill="rgba(255,255,255,0.12)"
               transform="rotate(-20 ${cx - 25} ${cy - 30})"/>

      <!-- Fault zones (shown per active faults) -->
      ${hasFire ? _fireZoneSVG(cx, cy) : ''}
      ${hasForest ? _forestZoneSVG(cx, cy) : ''}
      ${hasCity ? _cityZoneSVG(cx, cy) : ''}

      <!-- Ring front half (ringed only — in front of body) -->
      ${isRinged ? `<ellipse class="planet__ring planet__ring--front" cx="${cx}" cy="${cy + 5}"
               rx="${r + 40}" ry="18"
               fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="10"
               transform="rotate(-12 ${cx} ${cy + 5})"
               stroke-dasharray="${Math.round(Math.PI * (r + 40))},${Math.round(Math.PI * (r + 40))}"
               stroke-dashoffset="${Math.round(Math.PI * (r + 40))}"/>` : ''}
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

    const el = document.createElement('div');
    el.className = 'car car--planet';
    el.style.setProperty('--planet-colour', colour);
    el.style.setProperty('--vehicle-colour', colour);

    // Dashboard indicators — planet faults only
    const indicators = [
      ...(hasFire   ? [{ cls: 'fire',   fault: true }]  : []),
      ...(hasForest ? [{ cls: 'forest', fault: true }]  : []),
      ...(hasCity   ? [{ cls: 'city',   fault: true }]  : []),
    ];

    const dashboardHTML = indicators.map(ind =>
      `<div class="car__indicator car__indicator--${ind.cls} ${ind.fault ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>`
    ).join('');

    el.innerHTML = `
      <div class="car__dashboard">${dashboardHTML}</div>
      ${_planetSVG({ shape, hasFire, hasForest, hasCity })}
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

  return { create };
})();

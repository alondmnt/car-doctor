/**
 * Planet repair step logic — planet-specific faults:
 *   fire → extinguish (hose tool, reuses hoseWash template)
 *   forest → plant trees (hand tool, custom 1-step tap)
 *   city → build cities (hand tool, reuses stickerApply template with city emojis)
 */
const PlanetRepair = (() => {

  /** Extinguish fires — hose tool washes away flame patches */
  function extinguish(_car) {
    return RepairTemplates.hoseWash({
      grimeSelector: '.planet__fires',
      grimeWashClass: 'planet__fires--washing',
      grimeHiddenClass: 'planet__fires--hidden',
      bodyParts: [
        { selector: '.planet__body', sparkleClass: 'planet__body--sparkle' },
      ],
    });
  }

  /** Plant forests — hand tool tap turns barren patches green */
  function plantForests(_car) {
    return [{
      id: 'plant-trees',
      description: 'Tap the barren patches to plant forests',
      target: '.planet__forests',
      tool: 'hand',
      sound: 'tap',
      action: (_el, carEl) => {
        // Hide barren patches, reveal trees
        carEl.querySelectorAll('.planet__barren-patch').forEach(p => {
          p.classList.add('planet__barren-patch--planted');
        });
        carEl.querySelectorAll('.planet__tree').forEach(t => {
          t.classList.add('planet__tree--grown');
        });
      },
    }];
  }

  /** Build cities — jack (crane) tool + city sticker picker, 1 or 3 zones */
  function buildCities(_car) {
    const expanded = GameState.get('cityExpanded');
    const count = expanded ? 3 : 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `pick-city-${i}`,
      description: 'Select the crane and tap a building zone',
      target: `.planet__city-zone--${i}`,
      tool: 'jack',
      sound: 'tap',
      picker: 'planetCity',
      action: () => {},
    }));
  }

  /** Clean ocean — hose tool washes away oil-slick patches */
  function cleanOcean(_car) {
    return RepairTemplates.hoseWash({
      grimeSelector: '.planet__ocean-spill',
      grimeWashClass: 'planet__ocean-spill--washing',
      grimeHiddenClass: 'planet__ocean-spill--hidden',
      bodyParts: [
        { selector: '.planet__body', sparkleClass: 'planet__body--ocean-clean' },
      ],
    });
  }

  /**
   * Asteroid defence — tap 4 approaching meteors before they hit.
   * Returns a single step with a setup() hook so all meteors are tappable
   * concurrently in any order.  Each meteor gets its own timeout derived from
   * its CSS animation delay + travel duration.  Missed meteors reveal a crater +
   * fire at the impact site (visual only — no new fault steps).  If any meteor is
   * missed, asteroidFailed is set on the car element and no coins are awarded.
   */
  function asteroidDefence(_car) {
    const count = 4;
    return [{
      id: 'asteroid-defence',
      sound: null,
      action: () => {},
      /**
       * @param {HTMLElement} carEl
       * @param {Function} done — called once all meteors are resolved
       */
      setup: (carEl, done) => {
        let resolved = 0;
        let missCount = 0;
        const zone = carEl.querySelector('.planet__asteroid-zone');  // cached once
        const tapListeners = new Array(count).fill(null);            // for miss-path cleanup

        // Mark one meteor resolved; fire done() when all are settled.
        const handleMeteor = (i, hit) => {
          const meteorEl = carEl.querySelector(`.planet__meteor-group--${i}`);
          if (meteorEl?.dataset.resolved) return;
          if (meteorEl) meteorEl.dataset.resolved = '1';

          // Clean up tap listener regardless of hit/miss (miss path won't self-remove)
          if (tapListeners[i]) {
            meteorEl?.removeEventListener('pointerdown', tapListeners[i]);
            tapListeners[i] = null;
          }

          if (hit) {
            Audio.play('tap');
            carEl.querySelector(`.planet__laser--${i}`)?.classList.add('planet__laser--active');
            // Freeze the approach animation at its current position before
            // switching to the explode animation, so the meteor doesn't jump
            // to the planet surface (--meteor-dx/dy) mid-flight.
            if (meteorEl) {
              const frozen = getComputedStyle(meteorEl).transform;
              meteorEl.style.animation = 'none';
              meteorEl.style.transform = frozen;
              meteorEl.offsetWidth; // force reflow
            }
            meteorEl?.classList.add('planet__meteor-group--destroyed');
          } else {
            carEl.querySelector(`.planet__impact-site--${i}`)?.classList.add('planet__impact-site--active');
            meteorEl?.classList.add('planet__meteor-group--impact');
            missCount++;
          }

          resolved++;
          if (resolved === count) {
            if (missCount > 0) carEl.dataset.asteroidFailed = '1';
            if (zone) setTimeout(() => zone.classList.add('planet__asteroid-zone--hidden'), 500);
            done();
          }
        };

        for (let i = 0; i < count; i++) {
          const meteorEl = carEl.querySelector(`.planet__meteor-group--${i}`);
          if (!meteorEl) { handleMeteor(i, true); continue; }  // missing = auto-hit

          const delay = parseFloat(meteorEl.dataset.delay || 0);
          // 4s = CSS meteor-approach animation duration; 0.5s = grace window after landing
          const timeout = Math.round((delay + 4 + 0.5) * 1000);

          // Per-meteor miss timeout
          const timer = setTimeout(() => {
            if (!carEl.isConnected) return;
            handleMeteor(i, false);
          }, timeout);

          // Direct tap — bypasses Picker; named fn stored so miss path can remove it too
          tapListeners[i] = function onTap() {
            clearTimeout(timer);
            meteorEl.removeEventListener('pointerdown', onTap);
            tapListeners[i] = null;
            if (!carEl.isConnected) return;
            handleMeteor(i, true);
          };
          meteorEl.addEventListener('pointerdown', tapListeners[i]);
        }
      },
    }];
  }

  /**
   * Satellite network — pick a satellite style, then tap 3 broken
   * satellites to repair them. Orbit glows on completion.
   */
  function satelliteNetwork(_car) {
    const styles = GameState.get('satelliteStyles') || ['standard'];
    const steps = [];

    // Only show warehouse + picker when multiple satellite styles are unlocked
    if (styles.length > 1) {
      steps.push({
        id: 'grab-satellite',
        description: 'Grab a satellite part from the warehouse',
        warehouse: 'satellite',
        picker: 'satellite',
        target: '.planet__satellite--0',
        sound: 'pop',
        action: () => {},
      });
    }

    for (let i = 0; i < 3; i++) {
      steps.push({
        id: `fix-sat-${i}`,
        description: `Tap satellite ${i + 1} to repair it`,
        target: `.planet__satellite--${i}`,
        ...(i === 0 ? { tool: 'wrench' } : {}),
        sound: 'ratchet',
        action: (el, carEl) => {
          el.classList.remove('planet__satellite--broken');
          el.classList.add('planet__satellite--fixed');
          // Align satellite — animate tilt back to 0
          const tilt = parseFloat(el.dataset.tilt) || 0;
          if (tilt) {
            const base = el.getAttribute('transform').replace(/\s*rotate\([^)]*\)/, '');
            let start = null;
            const duration = 600;
            function step(ts) {
              if (!start) start = ts;
              const t = Math.min((ts - start) / duration, 1);
              const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
              el.setAttribute('transform', `${base} rotate(${tilt * (1 - ease)})`);
              if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          }
          const spark = el.querySelector('.planet__sat-spark');
          if (spark) spark.style.display = 'none';
          if (i === 2) {
            const orbit = carEl.querySelector('.planet__sat-orbit');
            if (orbit) orbit.classList.add('planet__sat-orbit--complete');
          }
        },
      });
    }

    return steps;
  }

  /**
   * Tectonic volcanic — seal 3 magma cracks, then cap 2 eruptions.
   * Removes planet tremor once all faults are resolved.
   */
  function tectonicRepair(_car) {
    const steps = [];

    for (let i = 0; i < 3; i++) {
      steps.push({
        id: `seal-crack-${i}`,
        target: `.planet__magma-crack--${i}`,
        ...(i === 0 ? { tool: 'drill' } : {}),
        sound: 'tap',
        action: (el) => {
          el.classList.add('planet__magma-crack--sealed');
        },
      });
    }

    for (let i = 0; i < 2; i++) {
      steps.push({
        id: `cap-volcano-${i}`,
        target: `.planet__eruption--${i}`,
        sound: 'tap',
        action: (el, carEl) => {
          el.classList.add('planet__eruption--capped');
          const remainingCracks = carEl.querySelectorAll('.planet__magma-crack:not(.planet__magma-crack--sealed)');
          const remainingVolcanos = carEl.querySelectorAll('.planet__eruption:not(.planet__eruption--capped)');
          if (!remainingCracks.length && remainingVolcanos.length <= 1) {
            const svg = carEl.querySelector('.planet__svg');
            if (svg) svg.classList.remove('planet__svg--tremor');
          }
        },
      });
    }

    return steps;
  }

  return { extinguish, plantForests, buildCities, cleanOcean, asteroidDefence, satelliteNetwork, tectonicRepair };
})();

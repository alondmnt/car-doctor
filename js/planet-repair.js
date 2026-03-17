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

  /** Build cities — jack (crane) tool + city sticker picker */
  function buildCities(_car) {
    return [{
      id: 'pick-city',
      description: 'Select the crane and tap the building zone',
      target: '.planet__cities',
      tool: 'jack',
      sound: 'tap',
      picker: 'planetCity',
      action: () => {},
    }];
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
   * Each step has a timeout derived from its CSS animation delay + travel duration.
   * Missed meteors reveal a crater + fire at the impact site (visual only — no new
   * fault steps). If any meteor is missed, asteroidFailed is set on the car element
   * and no coins are awarded at round end.
   */
  function asteroidDefence(car) {
    let missCount = 0;
    const count = 4;
    return Array.from({ length: count }, (_, i) => {
      // Read delay stored in SVG data attribute; computed at step-build time so the
      // element is already in the DOM when asteroidDefence() is called.
      const meteorEl = car.el.querySelector(`.planet__meteor-group--${i}`);
      const delay = parseFloat(meteorEl?.dataset.delay || 0);
      const timeout = Math.round((delay + 2.5 + 0.3) * 1000); // approach + buffer

      return {
        id: `tap-meteor-${i}`,
        target: `.planet__meteor-group--${i}`,
        sound: 'tap',
        timeout,
        action: (el, carEl) => {
          if (!el) {
            // Missed — reveal crater + fire visuals (drama only, no new fault steps)
            carEl.querySelector(`.planet__impact-site--${i}`)
                 ?.classList.add('planet__impact-site--active');
            carEl.querySelector(`.planet__meteor-group--${i}`)
                 ?.classList.add('planet__meteor-group--impact');
            missCount++;
          } else {
            // Destroyed by player
            el.classList.add('planet__meteor-group--destroyed');
          }
          if (i === count - 1) {
            if (missCount > 0) carEl.dataset.asteroidFailed = '1';
            const zone = carEl.querySelector('.planet__asteroid-zone');
            if (zone) setTimeout(() => zone.classList.add('planet__asteroid-zone--hidden'), 500);
          }
        },
      };
    });
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

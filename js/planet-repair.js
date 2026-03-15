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

  /** Build cities — hand tool + city sticker picker */
  function buildCities(_car) {
    return [{
      id: 'pick-city',
      description: 'Select hand tool and tap the building zone',
      target: '.planet__cities',
      tool: 'hand',
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
   * All meteors animate from the start with staggered CSS delay.
   */
  function asteroidDefence(_car) {
    const count = 4;
    return Array.from({ length: count }, (_, i) => ({
      id: `tap-meteor-${i}`,
      target: `.planet__meteor-group--${i}`,
      sound: 'tap',
      action: (el, carEl) => {
        el.classList.add('planet__meteor-group--destroyed');
        if (i === count - 1) {
          const zone = carEl.querySelector('.planet__asteroid-zone');
          if (zone) setTimeout(() => zone.classList.add('planet__asteroid-zone--hidden'), 500);
        }
      },
    }));
  }

  /**
   * Satellite network — pick a satellite style, then tap 3 broken
   * satellites to repair them. Orbit glows on completion.
   */
  function satelliteNetwork(_car) {
    const steps = [
      {
        id: 'grab-satellite',
        description: 'Grab a satellite part from the warehouse',
        warehouse: 'satellite',
        picker: 'satellite',
        target: '.planet__satellite--0',
        sound: 'pop',
        action: () => {},
      },
    ];

    for (let i = 0; i < 3; i++) {
      steps.push({
        id: `fix-sat-${i}`,
        description: `Tap satellite ${i + 1} to repair it`,
        target: `.planet__satellite--${i}`,
        tool: 'wrench',
        sound: 'ratchet',
        action: (el, carEl) => {
          el.classList.remove('planet__satellite--broken');
          el.classList.add('planet__satellite--fixed');
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

  return { extinguish, plantForests, buildCities, cleanOcean, asteroidDefence, satelliteNetwork };
})();

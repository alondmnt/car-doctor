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

  return { extinguish, plantForests, buildCities };
})();

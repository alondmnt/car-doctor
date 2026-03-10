/**
 * Repair step logic — defines multi-step repair sequences.
 * Each step: id, target, action, sound, and optional drag / hintArrow / tool / warehouse.
 * `tool` — which toolbox tool must be selected first (drill, wrench, jack, hand, spray).
 */
const Repair = (() => {

  /** Helper to generate screw steps for a tyre */
  function _screwSteps(tyreSelector, mode) {
    return [1, 2, 3].map(n => ({
      id: `${mode}-screw-${n}`,
      description: `Tap screw ${n} to ${mode} it`,
      target: `${tyreSelector} .car__screw--${n}`,
      tool: 'drill',
      sound: 'ratchet',
      action: (el) => {
        if (mode === 'loosen') {
          el.classList.add('car__screw--loose');
        } else {
          el.classList.remove('car__screw--loose');
          el.classList.add('car__screw--tight');
          setTimeout(() => el.classList.remove('car__screw--tight'), 300);
        }
      },
    }));
  }

  /** Flat tyre repair — 10 steps: 3 unscrew, jack, remove, add, 3 screw, lower */
  function flatTyre(car) {
    const tyreSelector = `.car__tyre--${car.flatTyre}`;

    return [
      ..._screwSteps(tyreSelector, 'loosen'),
      {
        id: 'jack-up',
        description: 'Drag the jack up to lift the car',
        target: '.car__jack',
        tool: 'jack',
        hintArrow: 'up',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.add('car--jacked');
          _el.classList.add('car__jack--raised');
        },
      },
      {
        id: 'remove-tyre',
        description: 'Pull the tyre off',
        target: tyreSelector,
        tool: 'hand',
        drag: { direction: 'down', threshold: 30 },
        sound: 'pop',
        action: (el) => {
          el.classList.add('car__tyre--removed');
          el.querySelectorAll('.car__screw').forEach(s => s.classList.add('car__screw--hidden'));
        },
      },
      {
        id: 'add-new-tyre',
        description: 'Grab the new tyre from the shelf',
        warehouse: 'tyre',
        target: tyreSelector,
        sound: 'pop',
        action: (el) => {
          el.classList.remove('car__tyre--removed', 'car__tyre--flat');
          el.classList.add('car__tyre--new');
          el.querySelectorAll('.car__screw').forEach(s => {
            s.classList.remove('car__screw--hidden');
          });
        },
      },
      ..._screwSteps(tyreSelector, 'tighten'),
      {
        id: 'lower-jack',
        description: 'Lower the jack',
        target: '.car__jack',
        tool: 'jack',
        hintArrow: 'down',
        drag: { direction: 'down', threshold: 30 },
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.remove('car--jacked');
          _el.classList.remove('car__jack--raised');
        },
      },
    ];
  }

  /** Broken engine repair — 4 steps */
  function engine(_car) {
    return [
      {
        id: 'open-bonnet',
        description: 'Open the bonnet',
        target: '.car__bonnet',
        tool: 'hand',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.add('car__bonnet--open');
          carEl.querySelector('.car__engine-bay').classList.add('car__engine-bay--visible');
        },
      },
      {
        id: 'remove-engine',
        description: 'Pull the broken engine out',
        target: '.car__engine',
        tool: 'wrench',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.remove('car__engine--broken');
          el.classList.add('car__engine--removed');
          // Clear smoke when broken engine is removed
          const smoke = carEl.querySelector('.car__smoke');
          if (smoke) {
            smoke.classList.add('car__smoke--clearing');
            setTimeout(() => smoke.classList.add('car__smoke--hidden'), 500);
          }
        },
      },
      {
        id: 'add-engine',
        description: 'Grab the new engine from the shelf',
        warehouse: 'engine',
        target: '.car__engine',
        sound: 'pop',
        action: (el) => {
          el.classList.remove('car__engine--removed');
          el.classList.add('car__engine--new');
        },
      },
      {
        id: 'close-bonnet',
        description: 'Close the bonnet',
        target: '.car__bonnet-lid',
        tool: 'hand',
        drag: { direction: 'down', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          const bonnet = carEl.querySelector('.car__bonnet');
          bonnet.classList.remove('car__bonnet--open');
          carEl.querySelector('.car__engine-bay').classList.remove('car__engine-bay--visible');
          carEl.querySelector('.car__engine').classList.remove('car__engine--new');
        },
      },
    ];
  }

  /** Paint job — 1 step: select spray tool, tap stains, pick colour → car repainted */
  function paint(_car) {
    return [
      {
        id: 'spray-paint',
        description: 'Select the spray tool and tap the damage',
        target: '.car__paint-damage',
        tool: 'spray',
        sound: 'tap',
        picker: 'colour',
        action: (_el, carEl) => {
          const damage = carEl.querySelector('.car__paint-damage');
          if (damage) {
            damage.classList.add('car__paint-damage--hidden');
          }
          carEl.querySelector('.car__body').classList.add('car__body--fresh-paint');
          carEl.querySelector('.car__roof').classList.add('car__roof--fresh-paint');
          setTimeout(() => {
            carEl.querySelector('.car__body').classList.remove('car__body--fresh-paint');
            carEl.querySelector('.car__roof').classList.remove('car__roof--fresh-paint');
          }, 600);
        },
      },
    ];
  }

  /** Sticker — 1 step */
  function sticker(_car) {
    return [
      {
        id: 'pick-sticker',
        description: 'Select hand tool and tap sticker zone',
        target: '.car__sticker-zone',
        tool: 'hand',
        sound: 'tap',
        picker: 'sticker',
        action: () => {},
      },
    ];
  }

  return { flatTyre, engine, paint, sticker };
})();

/**
 * Repair step logic — defines multi-step repair sequences.
 * Each step: id, target, action, sound, and optional drag / hintArrow.
 * Steps with `drag` get drag-to-complete; all steps still accept tap as fallback.
 */
const Repair = (() => {

  /** Helper to generate screw steps for a tyre */
  function _screwSteps(tyreSelector, mode) {
    return [1, 2, 3].map(n => ({
      id: `${mode}-screw-${n}`,
      description: `Tap screw ${n} to ${mode} it`,
      target: `${tyreSelector} .car__screw--${n}`,
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
        description: 'Drag the tyre off',
        target: tyreSelector,
        drag: { direction: 'down', threshold: 30 },
        sound: 'pop',
        action: (el) => {
          el.classList.add('car__tyre--removed');
          // Hide screws when tyre is off
          el.querySelectorAll('.car__screw').forEach(s => s.classList.add('car__screw--hidden'));
        },
      },
      {
        id: 'add-new-tyre',
        description: 'Drag the new tyre on',
        target: tyreSelector,
        drag: { direction: 'up', threshold: 30 },
        sound: 'pop',
        action: (el) => {
          el.classList.remove('car__tyre--removed', 'car__tyre--flat');
          el.classList.add('car__tyre--new');
          // Show screws again (loose, ready to tighten)
          el.querySelectorAll('.car__screw').forEach(s => {
            s.classList.remove('car__screw--hidden');
          });
        },
      },
      ..._screwSteps(tyreSelector, 'tighten'),
      {
        id: 'lower-jack',
        description: 'Drag the jack down to lower the car',
        target: '.car__jack',
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

  /** Broken engine repair — 4 steps (drag on engine removal/placement) */
  function engine(_car) {
    return [
      {
        id: 'open-bonnet',
        description: 'Tap the bonnet to open it',
        target: '.car__bonnet',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.add('car__bonnet--open');
          carEl.querySelector('.car__engine-bay').classList.add('car__engine-bay--visible');
        },
      },
      {
        id: 'remove-engine',
        description: 'Drag the broken engine out',
        target: '.car__engine',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el) => {
          el.classList.remove('car__engine--broken');
          el.classList.add('car__engine--removed');
        },
      },
      {
        id: 'add-engine',
        description: 'Drag the new engine in',
        target: '.car__engine',
        drag: { direction: 'down', threshold: 30 },
        sound: 'pop',
        action: (el) => {
          el.classList.remove('car__engine--removed');
          el.classList.add('car__engine--new');
        },
      },
      {
        id: 'close-bonnet',
        description: 'Tap the bonnet to close it',
        target: '.car__bonnet-lid',
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

  /** Paint job — 3 steps: sand, pick colour, apply */
  function paint(_car) {
    return [
      {
        id: 'sand-body',
        description: 'Tap the car body to sand off old paint',
        target: '.car__paint-damage',
        sound: 'ratchet',
        action: (el) => {
          el.classList.add('car__paint-damage--sanded');
        },
      },
      {
        id: 'pick-colour',
        description: 'Pick a new colour',
        target: '.car__body',
        sound: 'tap',
        picker: 'colour',  // signals game.js to show colour picker
        action: (_el, carEl) => {
          // colour is applied by the picker handler in game.js
        },
      },
      {
        id: 'apply-paint',
        description: 'Tap to apply the new paint',
        target: '.car__body',
        sound: 'whoosh',
        action: (_el, carEl) => {
          const damage = carEl.querySelector('.car__paint-damage');
          if (damage) {
            damage.classList.remove('car__paint-damage--sanded');
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

  /** Sticker — 1 step: pick a sticker to slap on the car */
  function sticker(_car) {
    return [
      {
        id: 'pick-sticker',
        description: 'Pick a sticker for the car',
        target: '.car__sticker-zone',
        sound: 'tap',
        picker: 'sticker',  // signals game.js to show sticker picker
        action: (_el, _carEl) => {
          // sticker is applied by the picker handler in game.js
        },
      },
    ];
  }

  return { flatTyre, engine, paint, sticker };
})();

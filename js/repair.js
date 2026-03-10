/**
 * Repair step logic — defines multi-step repair sequences.
 * Each step: id, target, action, sound, and optional drag / hintArrow.
 * Steps with `drag` get drag-to-complete; all steps still accept tap as fallback.
 */
const Repair = (() => {

  /** Flat tyre repair — 6 steps (drag on jack + tyre removal/placement) */
  function flatTyre(car) {
    const tyreSelector = `.car__tyre--${car.flatTyre}`;

    return [
      {
        id: 'loosen-bolts',
        description: 'Tap the flat tyre to loosen bolts',
        target: tyreSelector,
        sound: 'ratchet',
        action: (el) => el.classList.add('car__tyre--loosened'),
      },
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
        action: (el) => el.classList.add('car__tyre--removed'),
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
        },
      },
      {
        id: 'tighten-bolts',
        description: 'Tap to tighten bolts',
        target: tyreSelector,
        sound: 'ratchet',
        action: (el) => el.classList.remove('car__tyre--loosened', 'car__tyre--new'),
      },
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

  return { flatTyre, engine };
})();

/**
 * Repair step logic — defines multi-step repair sequences.
 * Each repair is an array of steps. Each step has:
 *   - id: unique key
 *   - target: CSS selector for the tappable element
 *   - action: what happens on tap (callback receives car controller)
 *   - sound: audio effect name
 *   - hint: whether to highlight the target
 */
const Repair = (() => {

  /** Flat tyre repair — 6 tap steps */
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
        description: 'Tap the jack to lift the car',
        target: '.car__jack',
        hintArrow: 'up',
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.add('car--jacked');
          _el.classList.add('car__jack--raised');
        },
      },
      {
        id: 'remove-tyre',
        description: 'Tap the tyre to remove it',
        target: tyreSelector,
        sound: 'pop',
        action: (el) => el.classList.add('car__tyre--removed'),
      },
      {
        id: 'add-new-tyre',
        description: 'Tap to put on the new tyre',
        target: tyreSelector,
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
        description: 'Tap the jack to lower the car',
        target: '.car__jack',
        hintArrow: 'down',
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.remove('car--jacked');
          _el.classList.remove('car__jack--raised');
        },
      },
    ];
  }

  /** Broken engine repair — 4 tap steps */
  function engine(_car) {
    return [
      {
        id: 'open-bonnet',
        description: 'Tap the bonnet to open it',
        target: '.car__bonnet',
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.add('car__bonnet--open');
          carEl.querySelector('.car__engine-bay').classList.add('car__engine-bay--visible');
        },
      },
      {
        id: 'remove-engine',
        description: 'Tap the broken engine to remove it',
        target: '.car__engine',
        sound: 'clank',
        action: (el) => {
          el.classList.remove('car__engine--broken');
          el.classList.add('car__engine--removed');
        },
      },
      {
        id: 'add-engine',
        description: 'Tap to install the new engine',
        target: '.car__engine',
        sound: 'pop',
        action: (el) => {
          el.classList.remove('car__engine--removed');
          el.classList.add('car__engine--new');
        },
      },
      {
        id: 'close-bonnet',
        description: 'Tap the bonnet to close it',
        target: '.car__bonnet',
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.remove('car__bonnet--open');
          carEl.querySelector('.car__engine-bay').classList.remove('car__engine-bay--visible');
          carEl.querySelector('.car__engine').classList.remove('car__engine--new');
        },
      },
    ];
  }

  return { flatTyre, engine };
})();

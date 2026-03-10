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
        description: 'Tap under the car to jack it up',
        target: '.car__undercarriage',
        sound: 'clank',
        action: (_el, carEl) => carEl.classList.add('car--jacked'),
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
        description: 'Tap under the car to lower it',
        target: '.car__undercarriage',
        sound: 'clank',
        action: (_el, carEl) => carEl.classList.remove('car--jacked'),
      },
    ];
  }

  return { flatTyre };
})();

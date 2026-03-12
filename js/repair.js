/**
 * Car repair step logic — thin wrappers around RepairTemplates with car-specific selectors.
 * Each function returns a step array: { id, target, action, sound, tool?, drag?, warehouse?, picker?, hintArrow? }
 */
const Repair = (() => {

  /** Flat tyre repair — 10 steps: 3 unscrew, jack, remove, add, 3 screw, lower */
  function flatTyre(car) {
    const tyreSelector = `.car__tyre--${car.flatTyre}`;

    return RepairTemplates.boltSwap({
      partSelector: tyreSelector,
      fastenerName: 'screw',
      fastenerClass: 'car__screw',
      fastenerAction: (mode) => (el) => {
        if (mode === 'loosen') {
          el.classList.add('car__screw--loose');
        } else {
          el.classList.remove('car__screw--loose');
          el.classList.add('car__screw--tight');
          setTimeout(() => el.classList.remove('car__screw--tight'), 300);
        }
      },
      liftId: 'jack-up',
      liftDesc: 'Drag the jack up to lift the car',
      liftSelector: '.car__jack',
      liftRaisedClass: 'car__jack--raised',
      removeId: 'remove-tyre',
      removeDesc: 'Pull the tyre off',
      removeAction: (el) => {
        el.classList.add('car__tyre--removed');
        el.querySelectorAll('.car__screw').forEach(s => s.classList.add('car__screw--hidden'));
      },
      addId: 'add-new-tyre',
      addDesc: 'Grab the new tyre from the shelf',
      warehousePart: 'tyre',
      picker: 'wheel',
      addAction: (el, _carEl, picked) => {
        // Replace SVG content with chosen (or default) wheel style
        const cx = parseFloat(el.querySelector('.car__tyre-rubber').getAttribute('cx'));
        const cy = parseFloat(el.querySelector('.car__tyre-rubber').getAttribute('cy'));
        const r = parseFloat(el.querySelector('.car__tyre-rubber').getAttribute('r'));
        const position = el.dataset.position;
        const fresh = Car.replacementWheelSVG(cx, cy, r, position, picked);
        el.outerHTML = fresh;
        // Re-query the new element and animate
        const parent = document.querySelector(tyreSelector);
        if (parent) parent.classList.add('car__tyre--new');
      },
      lowerId: 'lower-jack',
      lowerDesc: 'Lower the jack',
    });
  }

  /** Broken engine repair — 4 steps */
  function engine(_car) {
    return RepairTemplates.panelSwap({
      panelSelector: '.car__bonnet',
      panelOpenClass: 'car__bonnet--open',
      baySelector: '.car__engine-bay',
      bayVisibleClass: 'car__engine-bay--visible',
      partSelector: '.car__engine',
      brokenClass: 'car__engine--broken',
      removedClass: 'car__engine--removed',
      newClass: 'car__engine--new',
      panelLidSelector: '.car__bonnet-lid',
      effectSelector: '.car__smoke',
      effectClearClass: 'car__smoke--clearing',
      effectHiddenClass: 'car__smoke--hidden',
      effectDelay: 500,
      warehousePart: 'engine',
    });
  }

  /** Paint job — 1 step */
  function paint(_car) {
    return RepairTemplates.spray({
      damageSelector: '.car__paint-damage',
      damageHiddenClass: 'car__paint-damage--hidden',
      bodyParts: [
        { selector: '.car__body', freshClass: 'car__body--fresh-paint' },
        { selector: '.car__roof', freshClass: 'car__roof--fresh-paint' },
      ],
    });
  }

  /** Sticker — 1 step */
  function sticker(_car) {
    return RepairTemplates.stickerApply({
      zoneSelector: '.car__sticker-zone',
    });
  }

  /** Car wash — 1 step */
  function wash(_car) {
    return RepairTemplates.hoseWash({
      grimeSelector: '.car__mud',
      grimeWashClass: 'car__mud--washing',
      grimeHiddenClass: 'car__mud--hidden',
      bodyParts: [
        { selector: '.car__body', sparkleClass: 'car__body--sparkle' },
        { selector: '.car__roof', sparkleClass: 'car__roof--sparkle' },
      ],
    });
  }

  return { flatTyre, engine, paint, sticker, wash };
})();

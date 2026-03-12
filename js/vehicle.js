/**
 * Vehicle — shared controller lifecycle for all vehicle types (car, robot, spaceship, ...).
 * Each vehicle module builds its DOM then delegates to createController() for the
 * common interface: slideIn, driveAway, fixTyre, getFlatTyreEl, remove.
 */
const Vehicle = (() => {

  /**
   * Build a vehicle controller with shared lifecycle methods.
   * @param {HTMLElement} el - the vehicle DOM element (already appended to garage)
   * @param {object} opts
   * @param {string} opts.type           - 'car' | 'robot' | ...
   * @param {string[]} opts.faults
   * @param {string} opts.flatTyre       - position identifier (e.g. 'front', 'left')
   * @param {string} opts.flatPartSelector  - CSS selector for the flat part
   * @param {string} opts.flatPartClass     - class to remove on fix
   * @param {string} opts.fixingClass       - class to add briefly on fix
   * @param {string} opts.liftSelector      - jack/crane selector (hidden on exit)
   * @param {function} opts.pickExitAnim    - (el) => animation name string
   * @param {function} [opts.beforeExit]    - called before exit animation starts
   */
  function createController(el, opts) {
    return {
      el,
      faults: opts.faults,
      flatTyre: opts.flatTyre,
      type: opts.type,

      getFlatTyreEl() {
        return el.querySelector(opts.flatPartSelector);
      },

      fixTyre() {
        const part = this.getFlatTyreEl();
        if (!part) return;
        part.classList.remove(opts.flatPartClass);
        part.classList.add(opts.fixingClass);
        setTimeout(() => part.classList.remove(opts.fixingClass), 400);
      },

      slideIn() {
        el.classList.add('car--entering');
        el.offsetHeight;  // force reflow for transition
        el.classList.remove('car--entering');
        el.classList.add('car--parked');
      },

      driveAway() {
        return new Promise(resolve => {
          el.classList.remove('car--parked');
          // Hide lift mechanism so it doesn't fly away
          const lift = el.querySelector(opts.liftSelector);
          if (lift) lift.style.display = 'none';
          if (opts.beforeExit) opts.beforeExit(el);
          const anim = opts.pickExitAnim(el);
          if (anim === 'rocket') {
            const flame = document.createElement('div');
            flame.className = 'car__flame';
            el.appendChild(flame);
          }
          el.classList.add(`car--exit-${anim}`);
          el.addEventListener('animationend', (e) => {
            if (e.target !== el) return;
            el.remove();
            resolve();
          }, { once: true });
          setTimeout(() => { el.remove(); resolve(); }, 2000 / CONFIG.gameSpeed);
        });
      },

      remove() { el.remove(); },
    };
  }

  return { createController };
})();

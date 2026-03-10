/**
 * Car rendering — builds a car from DOM elements + CSS classes.
 * Returns a controller object to manipulate the car.
 */
const Car = (() => {

  /**
   * Create a car element and append it to the garage.
   * @param {HTMLElement} garage - container element
   * @param {object} opts - { colour, shape, flatTyre }
   * @returns {object} controller with methods and references
   */
  function create(garage, opts = {}) {
    const colour = opts.colour || CONFIG.carColour;
    const shape = opts.shape || CONFIG.carShape;
    const flatTyre = opts.flatTyre ?? 'front'; // 'front' | 'rear'

    const el = document.createElement('div');
    el.className = `car car--${shape}`;
    el.style.setProperty('--car-colour', colour);

    el.innerHTML = `
      <div class="car__body">
        <div class="car__roof"></div>
        <div class="car__window car__window--front"></div>
        <div class="car__window car__window--rear"></div>
        <div class="car__headlight"></div>
        <div class="car__taillight"></div>
      </div>
      <div class="car__undercarriage">
        <div class="car__tyre car__tyre--front ${flatTyre === 'front' ? 'car__tyre--flat' : ''}"
             data-position="front"></div>
        <div class="car__jack">
          <div class="car__jack-base"></div>
          <div class="car__jack-arm"></div>
          <div class="car__jack-arrow"></div>
        </div>
        <div class="car__tyre car__tyre--rear ${flatTyre === 'rear' ? 'car__tyre--flat' : ''}"
             data-position="rear"></div>
      </div>
    `;

    garage.appendChild(el);

    return {
      el,
      flatTyre,
      /** Get the flat tyre element */
      getFlatTyreEl() {
        return el.querySelector(`.car__tyre--${flatTyre}`);
      },
      /** Fix the flat tyre visually */
      fixTyre() {
        const tyre = this.getFlatTyreEl();
        if (tyre) {
          tyre.classList.remove('car__tyre--flat');
          tyre.classList.add('car__tyre--fixing');
          setTimeout(() => tyre.classList.remove('car__tyre--fixing'), 400);
        }
      },
      /** Slide the car in from the right */
      slideIn() {
        el.classList.add('car--entering');
        // Force reflow then start transition
        el.offsetHeight;
        el.classList.remove('car--entering');
        el.classList.add('car--parked');
      },
      /** Drive the car away with the configured exit animation */
      driveAway() {
        return new Promise(resolve => {
          el.classList.remove('car--parked');
          // Add flame effect for rocket exit
          if (CONFIG.exitAnimation === 'rocket') {
            const flame = document.createElement('div');
            flame.className = 'car__flame';
            el.appendChild(flame);
          }
          el.classList.add(`car--exit-${CONFIG.exitAnimation}`);
          el.addEventListener('animationend', (e) => {
            // Only react to the car's own exit animation, not child animations
            if (e.target !== el) return;
            el.remove();
            resolve();
          }, { once: true });
          // Fallback if animation doesn't fire
          setTimeout(() => { el.remove(); resolve(); }, 2000 / CONFIG.gameSpeed);
        });
      },
      /** Remove without animation */
      remove() {
        el.remove();
      },
    };
  }

  return { create };
})();

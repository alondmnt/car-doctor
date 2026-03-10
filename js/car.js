/**
 * Car rendering — builds a car from DOM elements + CSS classes.
 * Returns a controller object to manipulate the car.
 */
const Car = (() => {

  const SKIN_TONES = ['#f5d0a9', '#e0b88a', '#c68c53', '#a0673c', '#6b4226'];
  const HAIR_COLOURS = ['#222', '#5a3825', '#d4a44c', '#c44', '#e87d2f', '#888'];

  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function _randomSkin() { return _pick(SKIN_TONES); }
  function _randomHair() { return _pick(HAIR_COLOURS); }

  /**
   * Create a car element and append it to the garage.
   * @param {HTMLElement} garage - container element
   * @param {object} opts - { colour, shape, flatTyre }
   * @returns {object} controller with methods and references
   */
  function create(garage, opts = {}) {
    const colour = opts.colour || CONFIG.carColour;
    const shapes = CONFIG.carShapes;
    const shape = opts.shape || shapes[Math.floor(Math.random() * shapes.length)];
    const faults = opts.faults || ['flatTyre'];
    const flatTyre = opts.flatTyre ?? 'front'; // 'front' | 'rear'

    const hasFlatTyre = faults.includes('flatTyre');
    const hasEngine = faults.includes('engine');

    const el = document.createElement('div');
    el.className = `car car--${shape}`;
    el.style.setProperty('--car-colour', colour);

    el.innerHTML = `
      <div class="car__dashboard">
        <div class="car__indicator car__indicator--tyre ${hasFlatTyre ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>
        <div class="car__indicator car__indicator--engine ${hasEngine ? 'car__indicator--fault' : 'car__indicator--ok'}">⚙</div>
      </div>
      <div class="car__bonnet ${hasEngine ? '' : 'car__bonnet--hidden'}">
        <div class="car__bonnet-lid"></div>
      </div>
      <div class="car__body">
        <div class="car__roof"></div>
        <div class="car__window car__window--front">
          <div class="car__driver" style="--skin:${_randomSkin()};--hair:${_randomHair()}">
            <div class="car__driver-head"></div>
            <div class="car__driver-hair"></div>
            <div class="car__driver-eyes"></div>
          </div>
        </div>
        <div class="car__window car__window--rear"></div>
        <div class="car__engine-bay ${hasEngine ? '' : 'car__engine-bay--hidden'}">
          <div class="car__engine car__engine--broken"></div>
        </div>
        <div class="car__headlight"></div>
        <div class="car__taillight"></div>
      </div>
      <div class="car__undercarriage">
        <div class="car__tyre car__tyre--front ${hasFlatTyre && flatTyre === 'front' ? 'car__tyre--flat' : ''}"
             data-position="front"></div>
        <div class="car__jack">
          <div class="car__jack-base"></div>
          <div class="car__jack-arm"></div>
          <div class="car__jack-arrow"></div>
        </div>
        <div class="car__tyre car__tyre--rear ${hasFlatTyre && flatTyre === 'rear' ? 'car__tyre--flat' : ''}"
             data-position="rear"></div>
      </div>
    `;

    garage.appendChild(el);

    return {
      el,
      faults,
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
          const anims = CONFIG.exitAnimations;
          const anim = anims[Math.floor(Math.random() * anims.length)];
          // Add flame effect for rocket exit
          if (anim === 'rocket') {
            const flame = document.createElement('div');
            flame.className = 'car__flame';
            el.appendChild(flame);
          }
          el.classList.add(`car--exit-${anim}`);
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

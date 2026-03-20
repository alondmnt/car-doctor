/**
 * Reactions — character animation helpers.
 * All reactions add a CSS class that triggers a @keyframes animation,
 * then auto-remove it after the animation completes.
 */
const Reactions = (() => {
  let _blinkTimer = null;

  /** Add a class to el, remove after duration ms. */
  function _flash(el, cls, duration) {
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), duration);
  }

  /** Eye group selector by vehicle type. */
  const _eyeGroup = { car: '.car__driver-eyes', robot: '.robot__eyes', spaceship: '.ship__eyes' };
  /** Head group selector by vehicle type. */
  const _headGroup = { car: '.car__driver', robot: '.robot__head', spaceship: '.ship__cockpit' };
  /** Iris selector by vehicle type (querySelectorAll). */
  const _irisClass = { car: '.car__eye-iris', robot: '.robot__eye-iris', spaceship: '.ship__eye-iris' };

  /** Quick blink — scaleY on the eye group. */
  function blink(car) {
    const sel = _eyeGroup[car.type];
    if (!sel) return;
    _flash(car.el.querySelector(sel), 'reacting--blink', 200);
  }

  /** Happy wiggle — rotate on the head group. Each fault completion. */
  function wiggle(car) {
    const sel = _headGroup[car.type];
    if (!sel) return;
    _flash(car.el.querySelector(sel), 'reacting--wiggle', 500);
  }

  /** Surprise — scale up iris elements. On fault spawn. */
  function surprise(car) {
    const sel = _irisClass[car.type];
    if (!sel) return;
    car.el.querySelectorAll(sel).forEach(el => _flash(el, 'reacting--surprise', 400));
  }

  /** Aurora shimmer — opacity pulse on planet polar band. Each fault completion. */
  function aurora(car) {
    _flash(car.el.querySelector('.planet__aurora'), 'reacting--aurora', 900);
  }

  /** Start random idle blink loop (3–8 s interval). Stops previous loop. */
  function startIdleBlink(car) {
    stopIdleBlink();
    function schedule() {
      _blinkTimer = setTimeout(() => {
        blink(car);
        schedule();
      }, 3000 + Math.random() * 5000);
    }
    schedule();
  }

  /** Stop idle blink loop. */
  function stopIdleBlink() {
    if (_blinkTimer) { clearTimeout(_blinkTimer); _blinkTimer = null; }
  }

  return { blink, wiggle, surprise, aurora, startIdleBlink, stopIdleBlink };
})();

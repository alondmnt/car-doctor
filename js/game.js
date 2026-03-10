/**
 * Game loop and state machine.
 * States: splash → playing (car arriving → repairing → car leaving) → loop
 */
const Game = (() => {
  let garage;
  let currentCar = null;
  let steps = [];
  let stepIndex = 0;
  let busy = false;

  function init() {
    garage = document.getElementById('garage');
    document.getElementById('splash').addEventListener('click', start);
    document.getElementById('splash').addEventListener('touchend', start);
    document.getElementById('reset-btn').addEventListener('click', resetCar);
  }

  function start(e) {
    e.preventDefault();
    Audio.unlock();
    document.getElementById('splash').classList.add('splash--hidden');
    nextCar();
  }

  /** Bring in a new car with a random problem */
  function nextCar() {
    busy = true;
    const palette = CONFIG.carPalette;
    const colour = palette[Math.floor(Math.random() * palette.length)];
    const flatTyre = Math.random() < 0.5 ? 'front' : 'rear';

    currentCar = Car.create(garage, { colour, flatTyre });
    steps = Repair.flatTyre(currentCar);
    stepIndex = 0;

    // Slide car in
    requestAnimationFrame(() => {
      currentCar.slideIn();
      setTimeout(() => {
        busy = false;
        highlightStep();
        listenForTap();
      }, 600 / CONFIG.gameSpeed);
    });
  }

  /** Highlight the current step target */
  function highlightStep() {
    if (!CONFIG.hintsOn || stepIndex >= steps.length) return;
    const step = steps[stepIndex];
    const target = currentCar.el.querySelector(step.target);
    if (target) target.classList.add('hint-glow');
  }

  /** Remove highlight from all elements */
  function clearHighlights() {
    if (!currentCar) return;
    currentCar.el.querySelectorAll('.hint-glow').forEach(
      el => el.classList.remove('hint-glow')
    );
  }

  /** Listen for taps on the current step target */
  function listenForTap() {
    if (stepIndex >= steps.length) return;
    const step = steps[stepIndex];
    const target = currentCar.el.querySelector(step.target);
    if (!target) return;

    function handler(e) {
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      target.removeEventListener('click', handler);
      target.removeEventListener('touchend', handler);
      onStepComplete(step, target);
    }

    target.addEventListener('click', handler);
    target.addEventListener('touchend', handler);
  }

  /** Handle step completion */
  function onStepComplete(step, targetEl) {
    busy = true;
    clearHighlights();

    // Execute step action
    Audio.play(step.sound);
    step.action(targetEl, currentCar.el);

    stepIndex++;

    if (stepIndex >= steps.length) {
      // All steps done — car is fixed
      setTimeout(() => {
        Audio.play('success');
        setTimeout(() => {
          Audio.play('whoosh');
          currentCar.driveAway().then(() => {
            currentCar = null;
            setTimeout(nextCar, 400 / CONFIG.gameSpeed);
          });
        }, 500 / CONFIG.gameSpeed);
      }, 300 / CONFIG.gameSpeed);
    } else {
      // Next step
      setTimeout(() => {
        busy = false;
        highlightStep();
        listenForTap();
      }, 250 / CONFIG.gameSpeed);
    }
  }

  /** Reset — send current car away and bring a new one */
  function resetCar() {
    if (!currentCar) return;
    clearHighlights();
    currentCar.remove();
    currentCar = null;
    stepIndex = 0;
    steps = [];
    busy = false;
    nextCar();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Game.init);

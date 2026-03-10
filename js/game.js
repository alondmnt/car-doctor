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
    garage.style.setProperty('--garage-colour', CONFIG.garageColour);
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
    const fault = Math.random() < 0.5 ? 'flatTyre' : 'engine';
    const flatTyre = Math.random() < 0.5 ? 'front' : 'rear';

    currentCar = Car.create(garage, { colour, fault, flatTyre });
    steps = fault === 'engine' ? Repair.engine(currentCar) : Repair.flatTyre(currentCar);
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

  /** Highlight the current step target, with optional arrow direction */
  function highlightStep() {
    if (!CONFIG.hintsOn || stepIndex >= steps.length) return;
    const step = steps[stepIndex];
    const target = currentCar.el.querySelector(step.target);
    if (!target) return;
    target.classList.add('hint-glow');
    // Show directional arrow on jack steps
    if (step.hintArrow) {
      const arrow = target.querySelector('.car__jack-arrow');
      if (arrow) {
        arrow.classList.add('car__jack-arrow--visible');
        arrow.dataset.direction = step.hintArrow;
      }
    }
  }

  /** Remove highlight and arrows from all elements */
  function clearHighlights() {
    if (!currentCar) return;
    currentCar.el.querySelectorAll('.hint-glow').forEach(
      el => el.classList.remove('hint-glow')
    );
    currentCar.el.querySelectorAll('.car__jack-arrow--visible').forEach(
      el => el.classList.remove('car__jack-arrow--visible')
    );
  }

  let activeCleanup = null;

  /** Listen for interaction on the current step target (drag or tap) */
  function listenForTap() {
    if (stepIndex >= steps.length) return;
    const step = steps[stepIndex];
    const target = currentCar.el.querySelector(step.target);
    if (!target) return;

    if (step.drag) {
      // Drag interaction with tap fallback
      activeCleanup = Drag.attach(target, step.drag, () => {
        if (busy) return;
        activeCleanup = null;
        onStepComplete(step, target);
      });
    } else {
      // Tap-only interaction
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
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
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

/**
 * Game state machine — splash → playing (car arriving → repairing → car leaving) → loop.
 * Delegates fault lookup to FaultRegistry and UI orchestration to Picker.
 */
const Game = (() => {
  let garage;
  let currentCar = null;
  let steps = [];
  let stepIndex = 0;
  let busy = false;
  let coins = 0;
  let generation = 0;  // incremented on reset/new car to cancel stale callbacks
  const seenFaults = new Set();  // auto-disable hints once all fault types seen

  let faultQueue = [];
  let currentFault = null;

  function init() {
    garage = document.getElementById('garage');
    garage.style.setProperty('--garage-colour', CONFIG.garageColour);
    Picker.init(garage);

    document.getElementById('splash').addEventListener('click', start);
    document.getElementById('splash').addEventListener('touchend', start);

    // Short tap = reset car; long-press (2s) = reset all progress
    const resetBtn = document.getElementById('reset-btn');
    let resetTimer = null;
    resetBtn.addEventListener('pointerdown', () => {
      resetTimer = setTimeout(() => {
        resetTimer = 'fired';
        Progress.resetAll();
        coins = 0;
        document.getElementById('coin-jar-count').textContent = '0';
        document.getElementById('coin-jar-fill').style.height = '0';
        resetBtn.classList.add('reset-btn--flash');
        setTimeout(() => resetBtn.classList.remove('reset-btn--flash'), 400);
        if (currentCar) resetCar();
      }, 2000);
    });
    resetBtn.addEventListener('pointerup', () => {
      if (resetTimer === 'fired') { resetTimer = null; return; }
      clearTimeout(resetTimer);
      resetTimer = null;
      resetCar();
    });
    resetBtn.addEventListener('pointerleave', () => {
      if (resetTimer && resetTimer !== 'fired') clearTimeout(resetTimer);
      resetTimer = null;
    });

    document.getElementById('hint-btn').addEventListener('click', toggleHints);

    Progress.load();
    coins = Progress.getCoins();
  }

  function start(e) {
    e.preventDefault();
    Audio.unlock();
    document.getElementById('splash').classList.add('splash--hidden');
    nextCar();
  }

  /** Bring in a new car, robot, or spaceship with 1–2 random faults */
  function nextCar() {
    generation++;
    const gen = generation;
    busy = true;
    const palette = GameState.get('carPalette');
    const colour = palette[Math.floor(Math.random() * palette.length)];
    const flatTyre = Math.random() < 0.5 ? 'front' : 'rear';

    // 3-way spawn: spaceship (30%) → robot (of remaining, ~70%) → car
    const roll = Math.random();
    const spawnShip = GameState.get('spaceshipEnabled') && roll < CONFIG.spaceshipChance;
    const spawnRobot = !spawnShip && GameState.get('robotEnabled') && Math.random() < CONFIG.robotChance;

    const faultCount = Math.random() < CONFIG.multiFaultChance ? 2 : 1;
    const weights = spawnShip
      ? GameState.get('spaceshipFaultWeights')
      : spawnRobot ? GameState.get('robotFaultWeights') : CONFIG.faultWeights;
    const faults = FaultRegistry.pickWeightedFaults(faultCount, weights);

    garage.classList.toggle('garage--lab', spawnRobot);
    garage.classList.toggle('garage--hangar', spawnShip);

    if (spawnShip) {
      currentCar = Spaceship.create(garage, { colour, faults, flatTyre });
    } else if (spawnRobot) {
      currentCar = Robot.create(garage, { colour, faults, flatTyre });
    } else {
      currentCar = Car.create(garage, { colour, faults, flatTyre });
    }
    faultQueue = [...faults].sort((a, b) =>
      FaultRegistry.ORDER.indexOf(a) - FaultRegistry.ORDER.indexOf(b)
    );

    // Re-enable hints if the vehicle has any fault type not yet seen
    if (faults.some(f => !seenFaults.has(f))) {
      GameState.setHintsOn(true);
      document.getElementById('hint-btn').classList.remove('hint-btn--off');
    }

    startNextFault();

    requestAnimationFrame(() => {
      if (generation !== gen) return;
      currentCar.slideIn();
      setTimeout(() => {
        if (generation !== gen) return;
        busy = false;
        Picker.highlightStep(currentCar, steps, stepIndex);
        Picker.listenForTap(currentCar, steps, stepIndex, () => busy, onStepComplete);
      }, 600 / CONFIG.gameSpeed);
    });
  }

  /** Load the next fault's repair steps and highlight its indicator */
  function startNextFault() {
    const prev = currentCar?.el.querySelector('.car__indicator--active');
    if (prev) prev.classList.remove('car__indicator--active');

    currentFault = faultQueue.shift();
    const meta = FaultRegistry.META[currentFault];
    const stepFn = meta?.[currentCar.type] || meta?.car;
    steps = stepFn ? stepFn(currentCar) : [];
    stepIndex = 0;

    const ind = meta && currentCar.el.querySelector(meta.indicator);
    if (ind) ind.classList.add('car__indicator--active');
  }

  /** Handle step completion */
  function onStepComplete(step, targetEl, picked) {
    busy = true;
    const gen = generation;
    Picker.clearHighlights(currentCar);

    Audio.play(step.sound);
    step.action(targetEl, currentCar.el, picked);

    stepIndex++;

    if (stepIndex >= steps.length) {
      // Fault complete
      Picker.hideToolbox();
      const meta = FaultRegistry.META[currentFault];
      const indicator = meta && currentCar.el.querySelector(meta.indicator);
      if (indicator) {
        indicator.classList.remove('car__indicator--fault', 'car__indicator--active');
        indicator.classList.add('car__indicator--ok');
      }

      if (faultQueue.length > 0) {
        Audio.play('tap');
        startNextFault();
        setTimeout(() => {
          if (generation !== gen) return;
          busy = false;
          Picker.highlightStep(currentCar, steps, stepIndex);
          Picker.listenForTap(currentCar, steps, stepIndex, () => busy, onStepComplete);
        }, 400 / CONFIG.gameSpeed);
      } else {
        // All faults fixed — track seen types and auto-disable hints
        currentCar.faults.forEach(f => seenFaults.add(f));
        const allCarFaults = Object.keys(CONFIG.faultWeights);
        const allRobotFaults = GameState.get('robotEnabled') ? Object.keys(GameState.get('robotFaultWeights')) : [];
        const allShipFaults = GameState.get('spaceshipEnabled') ? Object.keys(GameState.get('spaceshipFaultWeights') || CONFIG.faultWeights) : [];
        const allFaultTypes = [...new Set([...allCarFaults, ...allRobotFaults, ...allShipFaults])];
        if (GameState.hintsOn() && allFaultTypes.every(f => seenFaults.has(f))) {
          GameState.setHintsOn(false);
          document.getElementById('hint-btn').classList.add('hint-btn--off');
        }

        addCoins(currentCar.faults.length);
        setTimeout(() => {
          if (generation !== gen) return;
          Audio.play('success');
          setTimeout(() => {
            if (generation !== gen) return;
            Audio.play('whoosh');
            currentCar.driveAway().then(() => {
              if (generation !== gen) return;
              currentCar = null;
              setTimeout(nextCar, 400 / CONFIG.gameSpeed);
            });
          }, 500 / CONFIG.gameSpeed);
        }, 300 / CONFIG.gameSpeed);
      }
    } else {
      // Next step
      setTimeout(() => {
        if (generation !== gen) return;
        busy = false;
        Picker.highlightStep(currentCar, steps, stepIndex);
        Picker.listenForTap(currentCar, steps, stepIndex, () => busy, onStepComplete);
      }, 250 / CONFIG.gameSpeed);
    }
  }

  /** Add coins and update the jar display */
  function addCoins(amount) {
    coins += amount;
    const countEl = document.getElementById('coin-jar-count');
    const fillEl = document.getElementById('coin-jar-fill');
    countEl.textContent = coins;
    const level = Math.min((coins % 10) / 10 * 100, 100);
    fillEl.style.height = level + '%';
    const jar = document.getElementById('coin-jar');
    jar.classList.remove('coin-jar--pop');
    jar.offsetHeight;
    jar.classList.add('coin-jar--pop');
    Progress.addCoins(amount);
  }

  /** Reset — send current car away and bring a new one */
  function resetCar() {
    if (!currentCar) return;
    generation++;
    Picker.cleanup();
    Picker.clearHighlights(currentCar);
    Picker.hideToolbox();
    // Clear warehouse
    const wh = document.getElementById('warehouse');
    wh.innerHTML = '';
    wh.classList.remove('warehouse--active');
    Picker.removePickers();
    currentCar.remove();
    currentCar = null;
    stepIndex = 0;
    steps = [];
    faultQueue = [];
    busy = false;
    nextCar();
  }

  /** Toggle hints on/off */
  function toggleHints() {
    GameState.setHintsOn(!GameState.hintsOn());
    document.getElementById('hint-btn').classList.toggle('hint-btn--off', !GameState.hintsOn());
    if (GameState.hintsOn()) {
      if (currentCar && !busy) Picker.highlightStep(currentCar, steps, stepIndex);
    } else {
      Picker.clearVisualHints(currentCar);
      const toolbox = document.getElementById('toolbox');
      toolbox.querySelectorAll('.toolbox__tool--hint').forEach(
        t => t.classList.remove('toolbox__tool--hint')
      );
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Game.init);

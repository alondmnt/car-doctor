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
  let stepTimeout = null;
  let coins = 0;
  let generation = 0;  // incremented on reset/new car to cancel stale callbacks
  const seenFaults = new Set();  // auto-toggle hints based on seen vs active faults
  let hintsExplicit = false;     // true when user manually toggled (respect their choice)

  let faultQueue = [];
  let currentFault = null;

  /** Randomise background spaceship trajectory across the screen */
  function _randomiseShipFlyby() {
    const lamp = document.querySelector('.garage-decor--lamp');
    if (!lamp) return;
    // Pick a random angle in (-45°, 45°) — negative = upward slant
    const angle = (Math.random() - 0.5) * 90; // degrees
    const rad = angle * Math.PI / 180;
    // Start from the left edge at a random vertical position (10–90%)
    const sy = 10 + Math.random() * 80; // vh
    // Travel far enough to cross the full screen
    const travel = 140; // vw — generous overshoot
    const ex = travel;
    const ey = sy + travel * Math.tan(rad) * (100 / 100); // rough vh from vw
    // Duration: 18–28s for a leisurely crossing
    const duration = 18 + Math.random() * 10;
    lamp.style.setProperty('--ship-sx', '-30px');
    lamp.style.setProperty('--ship-sy', `${sy}vh`);
    lamp.style.setProperty('--ship-ex', `${ex}vw`);
    lamp.style.setProperty('--ship-ey', `${ey}vh`);
    lamp.style.setProperty('--ship-angle', `${-angle}deg`);
    lamp.style.setProperty('--ship-duration', `${duration.toFixed(1)}s`);
  }

  /** Ordered spawn registry — first matching entry wins; car is the fallback. */
  const SPAWN_REGISTRY = [
    {
      type: 'planet',
      creator: (...args) => Planet.create(...args),
      enabled: () => GameState.get('planetEnabled'),
      chance: CONFIG.planetChance,
      weights: () => GameState.get('planetFaultWeights'),
      theme: 'space',
    },
    {
      type: 'spaceship',
      creator: (...args) => Spaceship.create(...args),
      enabled: () => GameState.get('spaceshipEnabled'),
      chance: CONFIG.spaceshipChance,
      weights: () => GameState.get('spaceshipFaultWeights'),
      theme: 'hangar',
    },
    {
      type: 'robot',
      creator: (...args) => Robot.create(...args),
      enabled: () => GameState.get('robotEnabled'),
      chance: CONFIG.robotChance,
      weights: () => GameState.get('robotFaultWeights'),
      theme: 'lab',
    },
    {
      type: 'car',
      creator: (...args) => Car.create(...args),
      enabled: () => true,
      chance: 1,
      weights: () => CONFIG.faultWeights,
      theme: '',
    },
  ];

  /** Pick a vehicle from the spawn registry.
   *  @param {object} [spec] - showcase override with .vehicle property */
  function pickVehicle(spec) {
    if (spec?.vehicle) {
      return SPAWN_REGISTRY.find(e => e.type === spec.vehicle) || SPAWN_REGISTRY.at(-1);
    }
    for (const entry of SPAWN_REGISTRY) {
      if (entry.enabled() && Math.random() < entry.chance) return entry;
    }
    return SPAWN_REGISTRY.at(-1);
  }

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
    document.getElementById('sound-btn').addEventListener('click', toggleSound);

    // Re-randomise background spaceship trajectory each time it completes a pass
    const lamp = document.querySelector('.garage-decor--lamp');
    if (lamp) lamp.addEventListener('animationiteration', _randomiseShipFlyby);

    Progress.load();
    coins = Progress.getCoins();
  }

  function start(e) {
    e.preventDefault();
    Audio.unlock();
    document.getElementById('splash').classList.add('splash--hidden');
    nextCar();
  }

  /** Unpause the asteroid zone CSS animation and record wall-clock start for timeout sync. */
  function _unpauseAsteroidZone(carEl) {
    if (carEl.dataset.animFaultStart) return;
    carEl.dataset.animFaultStart = Date.now();
    carEl.querySelector('.planet__asteroid-zone')?.classList.add('planet__asteroid-zone--active');
  }

  /**
   * Start timed-approach fault animations in sync with the JS step timeout.
   * Unpauses the CSS animation and returns the elapsed-adjusted timeout in ms,
   * so sequential steps stay locked to the already-running animation.
   * Returns null if the step has no timeout.
   */
  function _syncedTimeout(step) {
    if (!step?.timeout) return null;
    _unpauseAsteroidZone(currentCar.el);
    const elapsed = Date.now() - parseInt(currentCar.el.dataset.animFaultStart);
    return Math.max(50, step.timeout - elapsed);
  }

  /**
   * Handle a step with a concurrent setup() hook (e.g. asteroid defence).
   * Calls step.setup(carEl, done) which installs its own timers and listeners;
   * done() fires once all sub-interactions are resolved, then advances the step.
   */
  function _handleSetupStep(step, gen) {
    const carEl = currentCar.el;
    _unpauseAsteroidZone(carEl);
    step.setup(carEl, () => {
      if (generation !== gen || !currentCar) return;
      busy = true;
      onStepComplete(step, carEl, null);
    });
  }

  /** Bring in a new car, robot, or spaceship with 1–2 random faults */
  function nextCar() {
    generation++;
    const gen = generation;
    busy = true;
    const palette = GameState.get('carPalette');
    const colour = palette[Math.floor(Math.random() * palette.length)];
    const flatTyre = Math.random() < 0.5 ? 'front' : 'rear';

    // Showcase override — force vehicle/fault for newly unlocked tier
    const showcase = Progress.consumeShowcase();
    const spec = showcase?.showcase;

    const entry = pickVehicle(spec);
    garage.dataset.theme = entry.theme;
    if (entry.theme === 'space') _randomiseShipFlyby();

    const faultCount = Math.random() < CONFIG.multiFaultChance ? 2 : 1;
    const weights = entry.weights();

    // Force showcased fault into the fault list
    let faults;
    if (spec?.fault) {
      const remaining = Object.fromEntries(
        Object.entries(weights).filter(([k]) => k !== spec.fault));
      faults = faultCount > 1
        ? [spec.fault, ...FaultRegistry.pickWeightedFaults(1, remaining)]
        : [spec.fault];
    } else {
      faults = FaultRegistry.pickWeightedFaults(faultCount, weights);
    }

    currentCar = entry.creator(garage, { colour, faults, flatTyre });
    faultQueue = [...faults].sort((a, b) =>
      FaultRegistry.ORDER.indexOf(a) - FaultRegistry.ORDER.indexOf(b)
    );

    // Auto-enable hints if vehicle has any fault type not yet seen (overrides explicit)
    if (faults.some(f => !seenFaults.has(f))) {
      hintsExplicit = false;
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
        const tapStep = steps[stepIndex];
        if (tapStep?.setup) {
          _handleSetupStep(tapStep, gen);
        } else {
          Picker.highlightStep(currentCar, steps, stepIndex);
          Picker.listenForTap(currentCar, steps, stepIndex, () => busy, onStepComplete);
          const tapTimeout = _syncedTimeout(tapStep);
          if (tapTimeout !== null) {
            stepTimeout = setTimeout(() => {
              stepTimeout = null;
              if (generation !== gen || busy) return;
              busy = true;
              Picker.cleanup();
              Picker.clearHighlights(currentCar);
              onStepComplete(tapStep, null, null);   // null targetEl = missed
            }, tapTimeout);
          }
        }
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
    if (stepTimeout) { clearTimeout(stepTimeout); stepTimeout = null; }
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

      // Asteroid strike — skip remaining faults and jump straight to exit
      if (currentCar.el.dataset.asteroidFailed) faultQueue.length = 0;

      if (faultQueue.length > 0) {
        Audio.play('tap');
        startNextFault();
        setTimeout(() => {
          if (generation !== gen) return;
          busy = false;
          const nextFaultStep = steps[stepIndex];
          if (nextFaultStep?.setup) {
            _handleSetupStep(nextFaultStep, gen);
          } else {
            Picker.highlightStep(currentCar, steps, stepIndex);
            Picker.listenForTap(currentCar, steps, stepIndex, () => busy, onStepComplete);
            const nextFaultTimeout = _syncedTimeout(nextFaultStep);
            if (nextFaultTimeout !== null) {
              stepTimeout = setTimeout(() => {
                stepTimeout = null;
                if (generation !== gen || busy) return;
                busy = true;
                Picker.cleanup();
                Picker.clearHighlights(currentCar);
                onStepComplete(nextFaultStep, null, null);
              }, nextFaultTimeout);
            }
          }
        }, 400 / CONFIG.gameSpeed);
      } else {
        // All faults fixed — track seen types and auto-disable hints
        currentCar.faults.forEach(f => seenFaults.add(f));
        const allCarFaults = Object.keys(CONFIG.faultWeights);
        const allRobotFaults = GameState.get('robotEnabled') ? Object.keys(GameState.get('robotFaultWeights')) : [];
        const allShipFaults = GameState.get('spaceshipEnabled') ? Object.keys(GameState.get('spaceshipFaultWeights') || CONFIG.faultWeights) : [];
        const allPlanetFaults = GameState.get('planetEnabled') ? Object.keys(GameState.get('planetFaultWeights')) : [];
        const allFaultTypes = [...new Set([...allCarFaults, ...allRobotFaults, ...allShipFaults, ...allPlanetFaults])];
        if (!hintsExplicit && GameState.hintsOn() && allFaultTypes.every(f => seenFaults.has(f))) {
          GameState.setHintsOn(false);
          document.getElementById('hint-btn').classList.add('hint-btn--off');
        }

        if (!currentCar.el.dataset.asteroidFailed) {
          addCoins(currentCar.faults.length);
        }
        setTimeout(() => {
          if (generation !== gen) return;
          Audio.play('success');
          setTimeout(() => {
            if (generation !== gen) return;
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
        const nextStep = steps[stepIndex];
        if (nextStep?.setup) {
          _handleSetupStep(nextStep, gen);
        } else {
          Picker.highlightStep(currentCar, steps, stepIndex);
          Picker.listenForTap(currentCar, steps, stepIndex, () => busy, onStepComplete);
          const nextStepTimeout = _syncedTimeout(nextStep);
          if (nextStepTimeout !== null) {
            stepTimeout = setTimeout(() => {
              stepTimeout = null;
              if (generation !== gen || busy) return;
              busy = true;
              Picker.cleanup();
              Picker.clearHighlights(currentCar);
              onStepComplete(nextStep, null, null);
            }, nextStepTimeout);
          }
        }
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
    Audio.play('coin');
    Progress.addCoins(amount);
  }

  /** Reset — send current car away and bring a new one */
  function resetCar() {
    if (!currentCar) return;
    generation++;
    if (stepTimeout) { clearTimeout(stepTimeout); stepTimeout = null; }
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

  /** Toggle hints on/off (explicit user action) */
  function toggleHints() {
    hintsExplicit = true;
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

  function toggleSound() {
    Audio.setMuted(!Audio.isMuted());
    document.getElementById('sound-btn').classList.toggle('sound-btn--off', Audio.isMuted());
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Game.init);

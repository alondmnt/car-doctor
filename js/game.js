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
  let coins = 0;

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

  let faultQueue = [];  // remaining faults to repair
  let currentFault = null;

  /** Bring in a new car with 1–2 random faults */
  function nextCar() {
    busy = true;
    const palette = CONFIG.carPalette;
    const colour = palette[Math.floor(Math.random() * palette.length)];
    const flatTyre = Math.random() < 0.5 ? 'front' : 'rear';

    // Pick 1–2 faults from the pool
    const allFaults = ['flatTyre', 'engine', 'paint', 'sticker'];
    const shuffled = allFaults.sort(() => Math.random() - 0.5);
    const faultCount = Math.random() < 0.3 ? 2 : 1;
    const faults = shuffled.slice(0, faultCount);

    currentCar = Car.create(garage, { colour, faults, flatTyre });
    faultQueue = [...faults];
    startNextFault();

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

  /** Load the next fault's repair steps */
  function startNextFault() {
    currentFault = faultQueue.shift();
    if (currentFault === 'engine') {
      steps = Repair.engine(currentCar);
    } else if (currentFault === 'paint') {
      steps = Repair.paint(currentCar);
    } else if (currentFault === 'sticker') {
      steps = Repair.sticker(currentCar);
    } else {
      steps = Repair.flatTyre(currentCar);
    }
    stepIndex = 0;
  }

  /** Highlight the current step target, with optional arrow direction */
  function highlightStep() {
    if (!CONFIG.hintsOn || stepIndex >= steps.length) return;
    const step = steps[stepIndex];
    // If step needs a tool, highlight the tool in the toolbox instead
    if (step.tool) {
      showToolbox(step.tool);
      return;  // don't highlight car target yet — wait for tool selection
    }
    highlightCarTarget(step);
  }

  /** Highlight the target element on the car */
  function highlightCarTarget(step) {
    const target = currentCar.el.querySelector(step.target);
    if (!target) return;
    target.classList.add('hint-glow');
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

  /** Show the toolbox and highlight the needed tool */
  function showToolbox(neededTool) {
    const toolbox = document.getElementById('toolbox');
    toolbox.classList.add('toolbox--active');
    // Highlight the correct tool
    toolbox.querySelectorAll('.toolbox__tool').forEach(t => {
      t.classList.remove('toolbox__tool--hint', 'toolbox__tool--selected');
      if (t.dataset.tool === neededTool && CONFIG.hintsOn) {
        t.classList.add('toolbox__tool--hint');
      }
    });
  }

  /** Hide the toolbox */
  function hideToolbox() {
    const toolbox = document.getElementById('toolbox');
    toolbox.classList.remove('toolbox--active');
    toolbox.querySelectorAll('.toolbox__tool').forEach(t => {
      t.classList.remove('toolbox__tool--hint', 'toolbox__tool--selected');
    });
  }

  /** Listen for interaction on the current step target (drag or tap) */
  function listenForTap() {
    if (stepIndex >= steps.length) return;
    const step = steps[stepIndex];
    const target = currentCar.el.querySelector(step.target);
    if (!target) return;

    // If step needs a tool, wait for tool selection first
    if (step.tool) {
      waitForToolSelection(step, target);
      return;
    }

    if (step.warehouse) {
      showWarehousePart(step.warehouse, () => {
        onStepComplete(step, target);
      });
    } else if (step.picker === 'colour') {
      showColourPicker((chosenColour) => {
        currentCar.el.style.setProperty('--car-colour', chosenColour);
        onStepComplete(step, target);
      });
    } else if (step.picker === 'sticker') {
      showStickerPicker((emoji) => {
        const zone = currentCar.el.querySelector('.car__sticker-zone');
        if (zone) {
          zone.textContent = emoji;
          zone.classList.add('car__sticker-zone--applied');
        }
        onStepComplete(step, target);
      });
    } else if (step.drag) {
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

  /** Wait for the player to pick the right tool, then activate the car target */
  function waitForToolSelection(step, target) {
    const toolbox = document.getElementById('toolbox');

    function onToolClick(e) {
      const toolEl = e.target.closest('.toolbox__tool');
      if (!toolEl) return;
      e.preventDefault();

      if (toolEl.dataset.tool === step.tool) {
        // Correct tool selected
        Audio.play('tap');
        toolbox.removeEventListener('click', onToolClick);
        toolbox.removeEventListener('touchend', onToolClick);
        toolEl.classList.add('toolbox__tool--selected');
        // Now highlight the car target and listen for action
        highlightCarTarget(step);
        attachCarAction(step, target);
      } else {
        // Wrong tool — shake feedback
        toolEl.classList.add('toolbox__tool--wrong');
        setTimeout(() => toolEl.classList.remove('toolbox__tool--wrong'), 400);
      }
    }

    toolbox.addEventListener('click', onToolClick);
    toolbox.addEventListener('touchend', onToolClick);

    // Store cleanup for reset
    activeCleanup = () => {
      toolbox.removeEventListener('click', onToolClick);
      toolbox.removeEventListener('touchend', onToolClick);
    };
  }

  /** Attach the car interaction (drag or tap) after tool is selected */
  function attachCarAction(step, target) {
    if (step.drag) {
      activeCleanup = Drag.attach(target, step.drag, () => {
        if (busy) return;
        activeCleanup = null;
        hideToolbox();
        onStepComplete(step, target);
      });
    } else {
      function handler(e) {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        target.removeEventListener('click', handler);
        target.removeEventListener('touchend', handler);
        hideToolbox();
        onStepComplete(step, target);
      }
      target.addEventListener('click', handler);
      target.addEventListener('touchend', handler);
    }
  }

  /** Show a part on the warehouse shelf for the player to grab */
  function showWarehousePart(partType, onGrab) {
    const warehouse = document.getElementById('warehouse');
    warehouse.classList.add('warehouse--active');

    const part = document.createElement('div');
    part.className = `warehouse__part warehouse__part--${partType}`;

    // Visual label
    const icons = { tyre: '⚫', engine: '⚙️' };
    part.textContent = icons[partType] || '📦';

    function grab(e) {
      e.preventDefault();
      Audio.play('pop');
      part.classList.add('warehouse__part--grabbed');
      setTimeout(() => {
        part.remove();
        warehouse.classList.remove('warehouse--active');
        onGrab();
      }, 250);
    }

    part.addEventListener('click', grab);
    part.addEventListener('touchend', grab);
    warehouse.appendChild(part);
  }

  /** Show a row of colour swatches above the car */
  function showColourPicker(onPick) {
    const picker = document.createElement('div');
    picker.className = 'colour-picker';
    const colours = CONFIG.carPalette;
    colours.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'colour-picker__swatch';
      swatch.style.background = c;
      function pick(e) {
        e.preventDefault();
        Audio.play('pop');
        picker.remove();
        onPick(c);
      }
      swatch.addEventListener('click', pick);
      swatch.addEventListener('touchend', pick);
      picker.appendChild(swatch);
    });
    garage.appendChild(picker);
  }

  /** Show a row of sticker emojis to pick from */
  function showStickerPicker(onPick) {
    const picker = document.createElement('div');
    picker.className = 'colour-picker';  // reuse same layout
    CONFIG.stickers.forEach(emoji => {
      const btn = document.createElement('div');
      btn.className = 'sticker-picker__option';
      btn.textContent = emoji;
      function pick(e) {
        e.preventDefault();
        Audio.play('pop');
        picker.remove();
        onPick(emoji);
      }
      btn.addEventListener('click', pick);
      btn.addEventListener('touchend', pick);
      picker.appendChild(btn);
    });
    garage.appendChild(picker);
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
      // Current fault repaired — update dashboard indicator
      const indicatorMap = { engine: '.car__indicator--engine', flatTyre: '.car__indicator--tyre', paint: '.car__indicator--paint', sticker: '.car__indicator--sticker' };
      const indicatorClass = indicatorMap[currentFault] || '.car__indicator--tyre';
      const indicator = currentCar.el.querySelector(indicatorClass);
      if (indicator) {
        indicator.classList.remove('car__indicator--fault');
        indicator.classList.add('car__indicator--ok');
      }

      if (faultQueue.length > 0) {
        // More faults to fix — brief pause then start next
        Audio.play('tap');
        startNextFault();
        setTimeout(() => {
          busy = false;
          highlightStep();
          listenForTap();
        }, 400 / CONFIG.gameSpeed);
      } else {
        // All faults fixed — award coins and drive away
        addCoins(currentCar.faults.length);
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
      }
    } else {
      // Next step
      setTimeout(() => {
        busy = false;
        highlightStep();
        listenForTap();
      }, 250 / CONFIG.gameSpeed);
    }
  }

  /** Add coins and update the jar display */
  function addCoins(amount) {
    coins += amount;
    const countEl = document.getElementById('coin-jar-count');
    const fillEl = document.getElementById('coin-jar-fill');
    countEl.textContent = coins;
    // Fill jar up to 100% (resets visually at 10 coins)
    const level = Math.min((coins % 10) / 10 * 100, 100);
    fillEl.style.height = level + '%';
    // Pop animation
    const jar = document.getElementById('coin-jar');
    jar.classList.remove('coin-jar--pop');
    jar.offsetHeight;
    jar.classList.add('coin-jar--pop');
  }

  /** Reset — send current car away and bring a new one */
  function resetCar() {
    if (!currentCar) return;
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
    clearHighlights();
    hideToolbox();
    // Clear warehouse
    const wh = document.getElementById('warehouse');
    wh.innerHTML = '';
    wh.classList.remove('warehouse--active');
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

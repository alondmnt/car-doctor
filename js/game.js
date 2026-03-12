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
  let generation = 0;  // incremented on reset/new car to cancel stale callbacks
  const seenFaults = new Set();  // auto-disable hints once all fault types seen

  /** Part picker registry — each entry provides available styles and a preview renderer */
  const PARTS = {
    wheel:   { styles: () => CONFIG.wheelStyles,   preview: (s) => Car.wheelPreviewSVG(s) },
    arm:     { styles: () => CONFIG.armStyles,      preview: (s) => Robot.armPreviewSVG(s) },
    booster: { styles: () => CONFIG.boosterStyles,  preview: (s) => Robot.boosterPreviewSVG(s) },
    voice:   { styles: () => RobotRepair.voiceFlags(), preview: (f) => `<span style="font-size:28px">${f}</span>` },
  };

  function init() {
    garage = document.getElementById('garage');
    garage.style.setProperty('--garage-colour', CONFIG.garageColour);
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

    // Hint toggle — always starts on, can be toggled per session
    document.getElementById('hint-btn').addEventListener('click', toggleHints);

    // Restore persisted progression (coins, unlocks, preview widget)
    Progress.load();
    coins = Progress.getCoins();
  }

  function start(e) {
    e.preventDefault();
    Audio.unlock();
    document.getElementById('splash').classList.add('splash--hidden');
    nextCar();
  }

  /** Pick N unique faults using a given weight map */
  function _pickWeightedFaults(count, weights) {
    const pool = { ...(weights || CONFIG.faultWeights) };
    const picked = [];
    for (let i = 0; i < count; i++) {
      const entries = Object.entries(pool);
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = Math.random() * total;
      for (const [fault, w] of entries) {
        roll -= w;
        if (roll <= 0) {
          picked.push(fault);
          delete pool[fault];  // no duplicates
          break;
        }
      }
    }
    return picked;
  }

  let faultQueue = [];  // remaining faults to repair
  let currentFault = null;

  /** Single source of truth for fault metadata — order, indicator, repair functions.
   *  Array index determines repair order. */
  const FAULT_REGISTRY = [
    { key: 'flatTyre',    indicator: '.car__indicator--tyre',        car: (c) => Repair.flatTyre(c),          robot: (c) => RobotRepair.brokenBoot(c) },
    { key: 'engine',      indicator: '.car__indicator--engine',      car: (c) => Repair.engine(c),            robot: (c) => RobotRepair.powerCore(c) },
    { key: 'armJoint',    indicator: '.car__indicator--armJoint',    car: null,                                robot: (c) => RobotRepair.armJoint(c) },
    { key: 'legsRepair',  indicator: '.car__indicator--legsRepair',  car: null,                                robot: (c) => RobotRepair.legsRepair(c) },
    { key: 'voiceModule', indicator: '.car__indicator--voiceModule', car: null,                                robot: (c) => RobotRepair.voiceModule(c) },
    { key: 'jetpack',     indicator: '.car__indicator--jetpack',     car: null,                                robot: (c) => RobotRepair.jetpack(c) },
    { key: 'wash',        indicator: '.car__indicator--wash',        car: (c) => Repair.wash(c),              robot: (c) => RobotRepair.oilGrime(c) },
    { key: 'paint',       indicator: '.car__indicator--paint',       car: (c) => Repair.paint(c),             robot: (c) => RobotRepair.plating(c) },
    { key: 'sticker',     indicator: '.car__indicator--sticker',     car: (c) => Repair.sticker(c),           robot: (c) => RobotRepair.badge(c) },
  ];
  /** Lookup helpers derived from registry */
  const FAULT_ORDER = FAULT_REGISTRY.map(f => f.key);
  const FAULT_META = Object.fromEntries(FAULT_REGISTRY.map(f => [f.key, f]));

  /** Bring in a new car or robot with 1–2 random faults */
  function nextCar() {
    generation++;
    const gen = generation;
    busy = true;
    const palette = CONFIG.carPalette;
    const colour = palette[Math.floor(Math.random() * palette.length)];
    const flatTyre = Math.random() < 0.5 ? 'front' : 'rear';

    // Decide whether to spawn a robot
    const spawnRobot = CONFIG.robotEnabled && Math.random() < CONFIG.robotChance;

    // Pick 1–2 faults using weighted random selection
    const faultCount = Math.random() < CONFIG.multiFaultChance ? 2 : 1;
    const weights = spawnRobot ? CONFIG.robotFaultWeights : CONFIG.faultWeights;
    const faults = _pickWeightedFaults(faultCount, weights);

    // Swap garage theme for robots
    garage.classList.toggle('garage--lab', spawnRobot);

    if (spawnRobot) {
      currentCar = Robot.create(garage, { colour, faults, flatTyre });
    } else {
      currentCar = Car.create(garage, { colour, faults, flatTyre });
    }
    faultQueue = [...faults].sort((a, b) => FAULT_ORDER.indexOf(a) - FAULT_ORDER.indexOf(b));

    // Re-enable hints if the vehicle has any fault type not yet seen
    if (faults.some(f => !seenFaults.has(f))) {
      CONFIG.hintsOn = true;
      document.getElementById('hint-btn').classList.remove('hint-btn--off');
    }

    startNextFault();

    // Slide car in
    requestAnimationFrame(() => {
      if (generation !== gen) return;
      currentCar.slideIn();
      setTimeout(() => {
        if (generation !== gen) return;
        busy = false;
        highlightStep();
        listenForTap();
      }, 600 / CONFIG.gameSpeed);
    });
  }

  /** Load the next fault's repair steps and highlight its indicator */
  function startNextFault() {
    // Remove previous active indicator
    const prev = currentCar?.el.querySelector('.car__indicator--active');
    if (prev) prev.classList.remove('car__indicator--active');

    currentFault = faultQueue.shift();
    const meta = FAULT_META[currentFault];
    const stepFn = currentCar.type === 'robot' ? meta?.robot : meta?.car;
    steps = stepFn ? stepFn(currentCar) : [];
    stepIndex = 0;

    // Highlight active fault indicator
    const ind = meta && currentCar.el.querySelector(meta.indicator);
    if (ind) ind.classList.add('car__indicator--active');
  }

  /** Apply a sticker/badge emoji to the zone and clear the dashed border */
  function _applyStickerOrBadge(emoji) {
    const zone = currentCar.el.querySelector('.car__sticker-zone') ||
                 currentCar.el.querySelector('.robot__badge-zone');
    if (!zone) return;
    const textEl = zone.querySelector('text') || zone;
    textEl.textContent = emoji;
    const appliedClass = zone.classList.contains('robot__badge-zone')
      ? 'robot__badge-zone--applied' : 'car__sticker-zone--applied';
    zone.classList.add(appliedClass);
    const borderRect = zone.querySelector('rect[stroke]') || zone.querySelector('rect');
    if (borderRect) {
      borderRect.setAttribute('stroke', 'transparent');
      borderRect.setAttribute('stroke-dasharray', '0');
    }
  }

  /** Show toolbox if step needs a tool, then optionally highlight hints */
  function highlightStep() {
    if (stepIndex >= steps.length) return;
    const step = steps[stepIndex];
    // Always show toolbox when step requires a tool (functional, not just a hint)
    if (step.tool) {
      showToolbox(step.tool);
      return;  // don't highlight car target yet — wait for tool selection
    }
    if (CONFIG.hintsOn) highlightCarTarget(step);
  }

  /** Highlight the target element on the car/robot */
  function highlightCarTarget(step) {
    const target = currentCar.el.querySelector(step.target);
    if (!target) return;
    // Sticker/badge zone: yellow fill hint
    if (target.classList.contains('car__sticker-zone') || target.classList.contains('robot__badge-zone')) {
      const rect = target.querySelector('rect');
      if (rect) {
        rect.setAttribute('fill', 'rgba(255, 255, 50, 0.3)');
        rect.dataset.wasHinted = '1';
      }
    } else if (target.classList.contains('car__paint-damage') || target.classList.contains('robot__plating-damage')) {
      target.querySelectorAll('line').forEach(el => el.classList.add('hint-glow'));
    } else if (target.classList.contains('car__mud')) {
      target.querySelectorAll('ellipse').forEach(el => el.classList.add('hint-glow'));
    } else if (target.classList.contains('robot__grime')) {
      target.querySelectorAll('ellipse, circle').forEach(el => el.classList.add('hint-glow'));
    } else {
      target.classList.add('hint-glow');
    }
    if (step.hintArrow) {
      // Support both car jack and robot lift pad arrows
      const arrow = target.querySelector('.car__jack-arrow') || target.querySelector('.robot__lift-pad-arrow');
      if (arrow) {
        const visibleClass = arrow.classList.contains('robot__lift-pad-arrow')
          ? 'robot__lift-pad-arrow--visible' : 'car__jack-arrow--visible';
        arrow.classList.add(visibleClass);
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
    currentCar.el.querySelectorAll('[data-was-hinted]').forEach(
      el => { el.setAttribute('fill', 'transparent'); delete el.dataset.wasHinted; }
    );
    currentCar.el.querySelectorAll('.car__jack-arrow--visible, .robot__lift-pad-arrow--visible').forEach(
      el => el.classList.remove('car__jack-arrow--visible', 'robot__lift-pad-arrow--visible')
    );
    // Reset pointer-events on overlay groups
    currentCar.el.querySelectorAll('.car__paint-damage, .car__sticker-zone, .car__mud, .robot__plating-damage, .robot__badge-zone, .robot__grime').forEach(
      el => el.style.pointerEvents = ''
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

    // Enable pointer-events on target (paint-damage/sticker-zone are off by default)
    target.style.pointerEvents = 'auto';

    // If step needs a tool, wait for tool selection first
    if (step.tool) {
      waitForToolSelection(step, target);
      return;
    }

    if (step.warehouse) {
      showWarehousePart(step.warehouse, () => {
        // If step also has a part picker, show it after the warehouse grab
        if (step.picker && PARTS[step.picker]) {
          showPartPicker(step.picker, (picked) => {
            onStepComplete(step, target, picked);
          });
        } else {
          onStepComplete(step, target);
        }
      });
    } else if (step.picker === 'colour') {
      showColourPicker((chosenColour) => {
        currentCar.el.style.setProperty('--car-colour', chosenColour);
        if (currentCar.type === 'robot') {
          currentCar.el.style.setProperty('--robot-colour', chosenColour);
        }
        onStepComplete(step, target);
      });
    } else if (step.picker === 'sticker') {
      showStickerPicker((emoji) => {
        _applyStickerOrBadge(emoji);
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
        // Now highlight the car target (if hints on) and listen for action
        if (CONFIG.hintsOn) highlightCarTarget(step);
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
    // Ensure target is clickable (may have been reset by clearHighlights)
    target.style.pointerEvents = 'auto';
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
        // If step also has a picker, show it before completing
        if (step.picker === 'colour') {
          showColourPicker((chosenColour) => {
            currentCar.el.style.setProperty('--car-colour', chosenColour);
            if (currentCar.type === 'robot') {
              currentCar.el.style.setProperty('--robot-colour', chosenColour);
            }
            onStepComplete(step, target);
          });
        } else if (step.picker === 'sticker') {
          showStickerPicker((emoji) => {
            _applyStickerOrBadge(emoji);
            onStepComplete(step, target);
          });
        } else {
          onStepComplete(step, target);
        }
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
    const icons = { tyre: '⚫', engine: '⚙️', boot: '🥾', joint: '🦾', chip: '💾', jetpack: '🎒' };
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

  /** Create a picker row — shared factory for colour, sticker, and part pickers.
   *  @param {object} opts - { containerClass, items, renderItem(btn, item), onPick(item) } */
  function _showPicker({ containerClass, items, renderItem, onPick, delay = 0 }) {
    const picker = document.createElement('div');
    picker.className = containerClass;
    let picked = false;
    items.forEach(item => {
      const btn = document.createElement('div');
      renderItem(btn, item);
      function pick(e) {
        e.preventDefault();
        if (picked) return;
        picked = true;
        Audio.play('pop');
        if (delay) {
          btn.classList.add(btn.className + '--selected');
          setTimeout(() => { picker.remove(); onPick(item); }, delay);
        } else {
          picker.remove();
          onPick(item);
        }
      }
      btn.addEventListener('click', pick);
      btn.addEventListener('touchend', pick);
      picker.appendChild(btn);
    });
    garage.appendChild(picker);
  }

  function showColourPicker(onPick) {
    _showPicker({
      containerClass: 'colour-picker',
      items: CONFIG.carPalette,
      renderItem: (btn, c) => { btn.className = 'colour-picker__swatch'; btn.style.background = c; },
      onPick,
    });
  }

  function showStickerPicker(onPick) {
    _showPicker({
      containerClass: 'colour-picker',
      items: CONFIG.stickers,
      renderItem: (btn, emoji) => { btn.className = 'sticker-picker__option'; btn.textContent = emoji; },
      onPick,
    });
  }

  /** Part style picker — auto-selects if only one style available */
  function showPartPicker(partType, onPick) {
    const reg = PARTS[partType];
    if (!reg) return;
    const styles = reg.styles();
    if (styles.length <= 1) { onPick(styles[0]); return; }
    _showPicker({
      containerClass: 'part-picker',
      items: styles,
      renderItem: (btn, s) => { btn.className = 'part-picker__option'; btn.innerHTML = reg.preview(s); },
      onPick,
      delay: 200,
    });
  }

  /** Handle step completion */
  function onStepComplete(step, targetEl, picked) {
    busy = true;
    const gen = generation;
    clearHighlights();

    // Execute step action (pass picked value from part picker if present)
    Audio.play(step.sound);
    step.action(targetEl, currentCar.el, picked);

    stepIndex++;

    if (stepIndex >= steps.length) {
      // Current fault repaired — update dashboard indicator
      const meta = FAULT_META[currentFault];
      const indicator = meta && currentCar.el.querySelector(meta.indicator);
      if (indicator) {
        indicator.classList.remove('car__indicator--fault', 'car__indicator--active');
        indicator.classList.add('car__indicator--ok');
      }

      if (faultQueue.length > 0) {
        // More faults to fix — brief pause then start next
        Audio.play('tap');
        startNextFault();
        setTimeout(() => {
          if (generation !== gen) return;
          busy = false;
          highlightStep();
          listenForTap();
        }, 400 / CONFIG.gameSpeed);
      } else {
        // All faults fixed — track seen types and auto-disable hints
        currentCar.faults.forEach(f => seenFaults.add(f));
        const allCarFaults = Object.keys(CONFIG.faultWeights);
        const allRobotFaults = CONFIG.robotEnabled ? Object.keys(CONFIG.robotFaultWeights) : [];
        const allFaultTypes = [...new Set([...allCarFaults, ...allRobotFaults])];
        if (CONFIG.hintsOn && allFaultTypes.every(f => seenFaults.has(f))) {
          CONFIG.hintsOn = false;
          document.getElementById('hint-btn').classList.add('hint-btn--off');
        }

        // Award coins and drive away
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
    // Persist + check tier unlocks
    Progress.addCoins(amount);
  }

  /** Reset — send current car away and bring a new one */
  function resetCar() {
    if (!currentCar) return;
    generation++;  // cancel all pending callbacks from previous car
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
    clearHighlights();
    hideToolbox();
    // Clear warehouse
    const wh = document.getElementById('warehouse');
    wh.innerHTML = '';
    wh.classList.remove('warehouse--active');
    // Remove any open pickers
    garage.querySelectorAll('.colour-picker, .part-picker').forEach(el => el.remove());
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
    CONFIG.hintsOn = !CONFIG.hintsOn;
    document.getElementById('hint-btn').classList.toggle('hint-btn--off', !CONFIG.hintsOn);
    if (CONFIG.hintsOn) {
      // Re-show hints for current step
      if (currentCar && !busy) highlightStep();
    } else {
      // Clear visual hints only — don't reset pointer-events (would break active targets)
      if (currentCar) {
        currentCar.el.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow'));
        currentCar.el.querySelectorAll('[data-was-hinted]').forEach(
          el => { el.setAttribute('fill', 'transparent'); delete el.dataset.wasHinted; }
        );
        currentCar.el.querySelectorAll('.car__jack-arrow--visible, .robot__lift-pad-arrow--visible').forEach(
          el => el.classList.remove('car__jack-arrow--visible', 'robot__lift-pad-arrow--visible')
        );
      }
      // Remove tool hint glow but keep toolbox open if it's active
      const toolbox = document.getElementById('toolbox');
      toolbox.querySelectorAll('.toolbox__tool--hint').forEach(
        t => t.classList.remove('toolbox__tool--hint')
      );
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Game.init);

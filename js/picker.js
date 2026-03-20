/**
 * Picker — UI orchestration for toolbox, hints, warehouse, and picker overlays.
 * Stateless except for activeTool and activeCleanup. Game state machine passes
 * context (currentCar, steps, etc.) as arguments to each call.
 */
const Picker = (() => {
  let _garage = null;
  let activeTool = null;
  let activeCleanup = null;

  function init(garage) { _garage = garage; }

  /* ─── Visual hints ─── */

  /** Highlight the target element on the car/robot */
  function highlightCarTarget(car, step) {
    const target = car.el.querySelector(step.target);
    if (!target) return;
    const role = target.dataset.role || target.closest('[data-role]')?.dataset.role;
    if (role === 'sticker-zone') {
      const rect = target.querySelector('rect');
      if (rect) {
        rect.setAttribute('fill', 'rgba(255, 255, 50, 0.3)');
        rect.dataset.wasHinted = '1';
      }
    } else if (role === 'paint-damage') {
      target.querySelectorAll('line').forEach(el => el.classList.add('hint-glow'));
    } else if (role === 'wash-target') {
      target.querySelectorAll('ellipse, circle, path').forEach(el => el.classList.add('hint-glow'));
    } else {
      target.classList.add('hint-glow');
    }
    if (step.hintArrow) {
      const arrow = target.querySelector('[data-role="lift-arrow"]');
      if (arrow) {
        arrow.classList.add('lift-arrow--visible');
        arrow.dataset.direction = step.hintArrow;
      }
    }
  }

  /** Remove visual hint glows and arrows (no pointer-events reset) */
  function clearVisualHints(car) {
    if (!car) return;
    car.el.querySelectorAll('.hint-glow').forEach(
      el => el.classList.remove('hint-glow')
    );
    car.el.querySelectorAll('[data-was-hinted]').forEach(
      el => { el.setAttribute('fill', 'transparent'); delete el.dataset.wasHinted; }
    );
    car.el.querySelectorAll('.lift-arrow--visible').forEach(
      el => el.classList.remove('lift-arrow--visible')
    );
  }

  /** Remove all highlights and reset pointer-events */
  function clearHighlights(car) {
    clearVisualHints(car);
    if (!car) return;
    car.el.querySelectorAll('[data-role="paint-damage"], [data-role="sticker-zone"], [data-role="wash-target"], [data-role="interactive"]').forEach(
      el => el.style.pointerEvents = ''
    );
  }

  /* ─── Toolbox ─── */

  /** Show the toolbox and highlight the needed tool */
  function showToolbox(neededTool) {
    const toolbox = document.getElementById('toolbox');
    toolbox.classList.add('toolbox--active');
    toolbox.querySelectorAll('.toolbox__tool').forEach(t => {
      t.classList.remove('toolbox__tool--hint', 'toolbox__tool--selected');
      if (t.dataset.tool === neededTool) {
        if (activeTool === neededTool) {
          t.classList.add('toolbox__tool--selected');
        } else if (GameState.hintsOn()) {
          t.classList.add('toolbox__tool--hint');
        }
      }
    });
  }

  /** Hide the toolbox and clear active tool */
  function hideToolbox() {
    activeTool = null;
    const toolbox = document.getElementById('toolbox');
    toolbox.classList.remove('toolbox--active');
    toolbox.querySelectorAll('.toolbox__tool').forEach(t => {
      t.classList.remove('toolbox__tool--hint', 'toolbox__tool--selected');
    });
  }

  /* ─── Step highlight (toolbox + car target) ─── */

  /** Show toolbox if step needs a tool, then optionally highlight hints */
  function highlightStep(car, steps, stepIndex) {
    if (stepIndex >= steps.length) return;
    const step = steps[stepIndex];

    // Highlight all zones for a zone-choice step, or the single target otherwise
    const doHint = () => {
      if (!GameState.hintsOn()) return;
      if (step.zoneChoice) {
        step.zoneChoice.forEach(sel => highlightCarTarget(car, { ...step, target: sel }));
      } else {
        highlightCarTarget(car, step);
      }
    };

    if (step.tool) {
      showToolbox(step.tool);
      if (activeTool === step.tool) doHint();
      return;
    }
    if (activeTool) hideToolbox();
    doHint();
  }

  /* ─── Sticker / badge helper ─── */

  /** Apply a sticker/badge emoji to the zone and hide the dashed border.
   *  Fills all <text> slots with the same emoji (scatter zones get duplicates). */
  function applyStickerOrBadge(car, emoji, zoneSelector) {
    const zone = car.el.querySelector(zoneSelector || '[data-role="sticker-zone"]');
    if (!zone) return;
    zone.querySelectorAll('text').forEach(t => { t.textContent = emoji; });
    zone.classList.add('sticker-zone--applied');
  }

  /* ─── Warehouse ─── */

  /** Show a part on the warehouse shelf for the player to grab */
  function showWarehousePart(partType, onGrab) {
    const warehouse = document.getElementById('warehouse');
    warehouse.classList.add('warehouse--active');

    const part = document.createElement('div');
    part.className = `warehouse__part warehouse__part--${partType}`;

    const icons = { tyre: '⚫', engine: '⚙️', boot: '🥾', joint: '🦾', chip: '💾', jetpack: '🎒', wing: '🪽', laser: '🔫', crystal: '💎', satellite: '🛰️' };
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

  /* ─── Pickers (colour, sticker, part) ─── */

  /** Create a picker row — shared factory for colour, sticker, and part pickers */
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
    _garage.appendChild(picker);
  }

  function showColourPicker(onPick, carEl = null) {
    const palette = GameState.get('carPalette');
    const current = carEl && carEl.style.getPropertyValue('--vehicle-colour').trim();
    const items = current
      ? [current, ...palette.filter(c => c !== current)]
      : palette;
    _showPicker({
      containerClass: 'picker-row',
      items,
      renderItem: (btn, c) => { btn.className = 'colour-picker__swatch'; btn.style.background = c; },
      onPick,
    });
  }

  function showStickerPicker(onPick) {
    _showPicker({
      containerClass: 'picker-row',
      items: GameState.get('stickers'),
      renderItem: (btn, emoji) => { btn.className = 'sticker-picker__option'; btn.textContent = emoji; },
      onPick,
    });
  }

  /** Part style picker — auto-selects if only one style available */
  function showPartPicker(partType, onPick) {
    const reg = FaultRegistry.PARTS[partType];
    if (!reg) return;
    const styles = reg.styles();
    if (styles.length <= 1) { onPick(styles[0]); return; }
    _showPicker({
      containerClass: 'picker-row',
      items: styles,
      renderItem: (btn, s) => { btn.className = 'part-picker__option'; btn.innerHTML = reg.preview(s); },
      onPick,
      delay: 200,
    });
  }

  /** Dispatch the appropriate picker for a step, then callback with picked value */
  function dispatchPicker(car, step, onPick) {
    if (!step.picker) { onPick(); return; }
    // Generic per-step item pool — used by terraforming and any future custom pickers
    if (step.pickerItems) {
      _showPicker({
        containerClass: 'picker-row',
        items: step.pickerItems,
        renderItem: (btn, emoji) => { btn.className = 'sticker-picker__option'; btn.textContent = emoji; },
        onPick: (emoji) => { applyStickerOrBadge(car, emoji, step.target); onPick(emoji); },
      });
      return;
    }
    if (FaultRegistry.PARTS[step.picker]) {
      showPartPicker(step.picker, onPick);
    } else if (step.picker === 'colour') {
      showColourPicker((colour) => {
        car.el.style.setProperty('--vehicle-colour', colour);
        onPick(colour);
      }, car.el);
    } else if (step.picker === 'sticker') {
      showStickerPicker((emoji) => {
        applyStickerOrBadge(car, emoji, step.target);
        onPick(emoji);
      });
    } else if (step.picker === 'planetCity') {
      _showPicker({
        containerClass: 'picker-row',
        items: CONFIG.planetStickers,
        renderItem: (btn, emoji) => { btn.className = 'sticker-picker__option'; btn.textContent = emoji; },
        onPick: (emoji) => {
          applyStickerOrBadge(car, emoji, step.target);
          onPick(emoji);
        },
      });
    } else {
      onPick();
    }
  }

  /* ─── Interaction wiring ─── */

  /**
   * Enable all zones concurrently; first tap wins.
   * Dispatches picker for the chosen zone, hides the rest, then calls onComplete.
   */
  function _listenForZoneChoice(car, step, isBusy, onComplete) {
    const zones = step.zoneChoice
      .map(sel => ({ sel, el: car.el.querySelector(sel) }))
      .filter(z => z.el);

    let chosen = false;
    const handlers = [];

    zones.forEach(({ el, sel }, i) => {
      el.style.pointerEvents = 'auto';

      function handler(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isBusy() || chosen) return;
        chosen = true;
        zones.forEach(z => { z.el.style.pointerEvents = 'none'; });
        clearVisualHints(car);
        dispatchPicker(car, { ...step, target: sel }, (picked) => {
          zones.forEach((z, j) => { if (j !== i) z.el.style.display = 'none'; });
          onComplete(step, el, picked);
        });
      }

      handlers.push({ el, handler });
      el.addEventListener('click', handler);
      el.addEventListener('touchend', handler);
    });

    activeCleanup = () => {
      handlers.forEach(({ el, handler }) => {
        el.style.pointerEvents = '';
        el.removeEventListener('click', handler);
        el.removeEventListener('touchend', handler);
      });
    };
  }

  /**
   * Wait for the required tool, then open zone choice.
   * Mirrors _waitForToolSelection but routes to _listenForZoneChoice after selection.
   */
  function _waitForToolThenZoneChoice(car, step, isBusy, onComplete) {
    const toolbox = document.getElementById('toolbox');

    function onToolClick(e) {
      const toolEl = e.target.closest('.toolbox__tool');
      if (!toolEl) return;
      e.preventDefault();

      if (toolEl.dataset.tool === step.tool) {
        Audio.play('tap');
        // Explicitly remove before _listenForZoneChoice overwrites activeCleanup
        toolbox.removeEventListener('click', onToolClick);
        toolbox.removeEventListener('touchend', onToolClick);
        activeTool = step.tool;
        toolEl.classList.add('toolbox__tool--selected');
        if (GameState.hintsOn()) {
          step.zoneChoice.forEach(sel => highlightCarTarget(car, { ...step, target: sel }));
        }
        _listenForZoneChoice(car, step, isBusy, onComplete);
      } else {
        toolEl.classList.add('toolbox__tool--wrong');
        setTimeout(() => toolEl.classList.remove('toolbox__tool--wrong'), 400);
      }
    }

    toolbox.addEventListener('click', onToolClick);
    toolbox.addEventListener('touchend', onToolClick);

    activeCleanup = () => {
      toolbox.removeEventListener('click', onToolClick);
      toolbox.removeEventListener('touchend', onToolClick);
    };
  }

  /** Wait for the player to pick the right tool, then activate the car target */
  function _waitForToolSelection(car, step, target, isBusy, onComplete) {
    const toolbox = document.getElementById('toolbox');

    function onToolClick(e) {
      const toolEl = e.target.closest('.toolbox__tool');
      if (!toolEl) return;
      e.preventDefault();

      if (toolEl.dataset.tool === step.tool) {
        Audio.play('tap');
        toolbox.removeEventListener('click', onToolClick);
        toolbox.removeEventListener('touchend', onToolClick);
        activeTool = step.tool;
        toolEl.classList.add('toolbox__tool--selected');
        if (GameState.hintsOn()) highlightCarTarget(car, step);
        _attachCarAction(car, step, target, isBusy, onComplete);
      } else {
        toolEl.classList.add('toolbox__tool--wrong');
        setTimeout(() => toolEl.classList.remove('toolbox__tool--wrong'), 400);
      }
    }

    toolbox.addEventListener('click', onToolClick);
    toolbox.addEventListener('touchend', onToolClick);

    activeCleanup = () => {
      toolbox.removeEventListener('click', onToolClick);
      toolbox.removeEventListener('touchend', onToolClick);
    };
  }

  /** Attach the car interaction (drag or tap) after tool is selected */
  function _attachCarAction(car, step, target, isBusy, onComplete) {
    target.style.pointerEvents = 'auto';
    if (step.drag) {
      activeCleanup = Drag.attach(target, step.drag, () => {
        if (isBusy()) return;
        activeCleanup = null;
        onComplete(step, target);
      });
    } else {
      function handler(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isBusy()) return;
        target.removeEventListener('click', handler);
        target.removeEventListener('touchend', handler);
        dispatchPicker(car, step, (picked) => onComplete(step, target, picked));
      }
      target.addEventListener('click', handler);
      target.addEventListener('touchend', handler);
    }
  }

  /** Listen for interaction on the current step target (drag or tap) */
  function listenForTap(car, steps, stepIndex, isBusy, onComplete) {
    if (stepIndex >= steps.length) return;
    const step = steps[stepIndex];

    // Zone-choice steps — multiple concurrent targets, player picks one
    if (step.zoneChoice) {
      if (step.tool && activeTool !== step.tool) {
        _waitForToolThenZoneChoice(car, step, isBusy, onComplete);
      } else {
        _listenForZoneChoice(car, step, isBusy, onComplete);
      }
      return;
    }

    const target = car.el.querySelector(step.target);
    if (!target) return;

    target.style.pointerEvents = 'auto';

    if (step.tool) {
      if (activeTool === step.tool) {
        _attachCarAction(car, step, target, isBusy, onComplete);
      } else {
        _waitForToolSelection(car, step, target, isBusy, onComplete);
      }
      return;
    }

    if (step.warehouse) {
      showWarehousePart(step.warehouse, () => {
        dispatchPicker(car, step, (picked) => onComplete(step, target, picked));
      });
    } else if (step.picker) {
      dispatchPicker(car, step, (picked) => onComplete(step, target, picked));
    } else if (step.drag) {
      activeCleanup = Drag.attach(target, step.drag, () => {
        if (isBusy()) return;
        activeCleanup = null;
        onComplete(step, target);
      });
    } else {
      function handler(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isBusy()) return;
        target.removeEventListener('click', handler);
        target.removeEventListener('touchend', handler);
        onComplete(step, target);
      }
      target.addEventListener('click', handler);
      target.addEventListener('touchend', handler);
    }
  }

  /* ─── Cleanup ─── */

  /** Cancel any pending interaction listener */
  function cleanup() {
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  }

  /** Remove any open picker rows from the garage */
  function removePickers() {
    if (_garage) _garage.querySelectorAll('.picker-row').forEach(el => el.remove());
  }

  return {
    init, highlightStep, highlightCarTarget, clearVisualHints, clearHighlights,
    showToolbox, hideToolbox, listenForTap, showWarehousePart,
    cleanup, removePickers,
  };
})();

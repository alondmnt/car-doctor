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
    if (target.classList.contains('car__sticker-zone') || target.classList.contains('robot__badge-zone') || target.classList.contains('ship__emblem-zone')) {
      const rect = target.querySelector('rect');
      if (rect) {
        rect.setAttribute('fill', 'rgba(255, 255, 50, 0.3)');
        rect.dataset.wasHinted = '1';
      }
    } else if (target.classList.contains('car__paint-damage') || target.classList.contains('robot__plating-damage') || target.classList.contains('ship__hull-damage')) {
      target.querySelectorAll('line').forEach(el => el.classList.add('hint-glow'));
    } else if (target.classList.contains('car__mud') || target.classList.contains('ship__dust')) {
      target.querySelectorAll('ellipse').forEach(el => el.classList.add('hint-glow'));
    } else if (target.classList.contains('robot__grime')) {
      target.querySelectorAll('ellipse, circle').forEach(el => el.classList.add('hint-glow'));
    } else {
      target.classList.add('hint-glow');
    }
    if (step.hintArrow) {
      const arrow = target.querySelector('.car__jack-arrow') || target.querySelector('.robot__lift-pad-arrow') || target.querySelector('.ship__lift-pad-arrow');
      if (arrow) {
        const visibleClass = arrow.classList.contains('robot__lift-pad-arrow')
          ? 'robot__lift-pad-arrow--visible'
          : arrow.classList.contains('ship__lift-pad-arrow')
          ? 'ship__lift-pad-arrow--visible'
          : 'car__jack-arrow--visible';
        arrow.classList.add(visibleClass);
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
    car.el.querySelectorAll('.car__jack-arrow--visible, .robot__lift-pad-arrow--visible, .ship__lift-pad-arrow--visible').forEach(
      el => el.classList.remove('car__jack-arrow--visible', 'robot__lift-pad-arrow--visible', 'ship__lift-pad-arrow--visible')
    );
  }

  /** Remove all highlights and reset pointer-events */
  function clearHighlights(car) {
    clearVisualHints(car);
    if (!car) return;
    car.el.querySelectorAll('.car__paint-damage, .car__sticker-zone, .car__mud, .robot__plating-damage, .robot__badge-zone, .robot__grime, .ship__hull-damage, .ship__emblem-zone, .ship__dust, .ship__shield-panel, .ship__crystal-bay, .ship__laser, .ship__antenna-dish').forEach(
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
    if (step.tool) {
      showToolbox(step.tool);
      if (activeTool === step.tool) {
        if (GameState.hintsOn()) highlightCarTarget(car, step);
      }
      return;
    }
    if (activeTool) hideToolbox();
    if (GameState.hintsOn()) highlightCarTarget(car, step);
  }

  /* ─── Sticker / badge helper ─── */

  /** Apply a sticker/badge emoji to the zone and clear the dashed border */
  function applyStickerOrBadge(car, emoji) {
    const zone = car.el.querySelector('.car__sticker-zone') ||
                 car.el.querySelector('.robot__badge-zone') ||
                 car.el.querySelector('.ship__emblem-zone');
    if (!zone) return;
    const textEl = zone.querySelector('text') || zone;
    textEl.textContent = emoji;
    const appliedClass = zone.classList.contains('robot__badge-zone')
      ? 'robot__badge-zone--applied'
      : zone.classList.contains('ship__emblem-zone')
      ? 'ship__emblem-zone--applied'
      : 'car__sticker-zone--applied';
    zone.classList.add(appliedClass);
    const borderRect = zone.querySelector('rect[stroke]') || zone.querySelector('rect');
    if (borderRect) {
      borderRect.setAttribute('stroke', 'transparent');
      borderRect.setAttribute('stroke-dasharray', '0');
    }
  }

  /* ─── Warehouse ─── */

  /** Show a part on the warehouse shelf for the player to grab */
  function showWarehousePart(partType, onGrab) {
    const warehouse = document.getElementById('warehouse');
    warehouse.classList.add('warehouse--active');

    const part = document.createElement('div');
    part.className = `warehouse__part warehouse__part--${partType}`;

    const icons = { tyre: '⚫', engine: '⚙️', boot: '🥾', joint: '🦾', chip: '💾', jetpack: '🎒', wing: '🪽', laser: '🔫', crystal: '💎' };
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

  function showColourPicker(onPick) {
    _showPicker({
      containerClass: 'picker-row',
      items: GameState.get('carPalette'),
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
    if (FaultRegistry.PARTS[step.picker]) {
      showPartPicker(step.picker, onPick);
    } else if (step.picker === 'colour') {
      showColourPicker((colour) => {
        car.el.style.setProperty('--car-colour', colour);
        if (car.type === 'robot') {
          car.el.style.setProperty('--robot-colour', colour);
        } else if (car.type === 'spaceship') {
          car.el.style.setProperty('--ship-colour', colour);
        }
        onPick(colour);
      });
    } else if (step.picker === 'sticker') {
      showStickerPicker((emoji) => {
        applyStickerOrBadge(car, emoji);
        onPick(emoji);
      });
    } else {
      onPick();
    }
  }

  /* ─── Interaction wiring ─── */

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

/**
 * Drag handler — adds drag-to-complete interaction to repair steps.
 * Steps with a `drag` property get drag behaviour instead of tap.
 * Drag config: { direction: 'up'|'down'|'left'|'right', threshold: px }
 * Falls back to tap if drag distance is small (forgiving for small fingers).
 */
const Drag = (() => {
  const TAP_THRESHOLD = 10; // px — below this counts as a tap

  /**
   * Attach drag listener to a target element.
   * @param {HTMLElement} target - the draggable element
   * @param {object} dragOpts - { direction, threshold }
   * @param {function} onComplete - called when drag completes or tap detected
   * @returns {function} cleanup — call to remove listeners
   */
  function attach(target, dragOpts, onComplete) {
    const { direction, threshold = 40 } = dragOpts;
    let startX, startY, dragging = false, done = false;

    function getXY(e) {
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX, y: t.clientY };
    }

    function onStart(e) {
      if (done) return;
      e.preventDefault();
      const pos = getXY(e);
      startX = pos.x;
      startY = pos.y;
      dragging = true;
      target.classList.add('dragging');
    }

    function onMove(e) {
      if (!dragging || done) return;
      e.preventDefault();
      const pos = getXY(e);
      const dx = pos.x - startX;
      const dy = pos.y - startY;

      // Visual feedback — translate in the drag direction
      let tx = 0, ty = 0;
      if (direction === 'up')    ty = Math.min(0, dy);
      if (direction === 'down')  ty = Math.max(0, dy);
      if (direction === 'left')  tx = Math.min(0, dx);
      if (direction === 'right') tx = Math.max(0, dx);
      target.style.transform = `translate(${tx}px, ${ty}px)`;

      // Check if threshold reached
      const dist = direction === 'up' ? -dy
        : direction === 'down' ? dy
        : direction === 'left' ? -dx
        : dx;
      if (dist >= threshold) {
        finish();
      }
    }

    function onEnd(e) {
      if (!dragging || done) return;
      e.preventDefault();
      const pos = (e.changedTouches ? e.changedTouches[0] : e);
      const dx = pos.clientX - startX;
      const dy = pos.clientY - startY;
      const totalDist = Math.sqrt(dx * dx + dy * dy);

      // Small movement → treat as tap
      if (totalDist < TAP_THRESHOLD) {
        finish();
        return;
      }

      // Did not reach threshold — snap back
      dragging = false;
      target.classList.remove('dragging');
      target.style.transform = '';
    }

    function finish() {
      if (done) return;
      done = true;
      dragging = false;
      target.classList.remove('dragging');
      target.style.transform = '';
      cleanup();
      onComplete();
    }

    function cleanup() {
      target.removeEventListener('mousedown', onStart);
      target.removeEventListener('touchstart', onStart);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    }

    target.addEventListener('mousedown', onStart, { passive: false });
    target.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: false });

    return cleanup;
  }

  return { attach };
})();

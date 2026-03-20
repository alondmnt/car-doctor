/**
 * Sparks — CSS particle burst at a target element's position.
 * Used for drill/loosen interactions. Particles are fixed-position divs
 * that animate outward and fade, then remove themselves from the DOM.
 */
const Sparks = (() => {

  const COUNT   = 8;
  const DIST    = 22;   // px radius spread
  const JITTER  = 10;   // px random extra distance
  const DURATION = 480; // ms — matches CSS animation

  /**
   * Burst sparks from the centre of el.
   * @param {Element} el - SVG or DOM element to originate from
   */
  function burst(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;

    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist  = DIST + Math.random() * JITTER;
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = cx + 'px';
      spark.style.top  = cy + 'px';
      spark.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      spark.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      // Vary colour: yellow-white core vs orange edge
      spark.style.background = Math.random() < 0.4 ? '#fff9c4' : '#ffaa00';
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), DURATION);
    }
  }

  return { burst };
})();

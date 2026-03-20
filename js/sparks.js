/**
 * Sparks — CSS particle bursts at a target element's position.
 * burst()  — yellow-orange sparks for drill interactions.
 * splash() — blue-white droplets with arc trajectory for hose wash.
 */
const Sparks = (() => {

  function _centre(el) {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }

  function _spawn(cls, cx, cy, dx, dy, colour, duration) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = cx + 'px';
    el.style.top  = cy + 'px';
    el.style.setProperty('--dx', dx + 'px');
    el.style.setProperty('--dy', dy + 'px');
    el.style.background = colour;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  /** Yellow-orange sparks radiating outward. For drill steps. */
  function burst(el) {
    if (!el) return;
    const { cx, cy } = _centre(el);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist  = 22 + Math.random() * 10;
      _spawn('spark', cx, cy,
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        Math.random() < 0.4 ? '#fff9c4' : '#ffaa00',
        480);
    }
  }

  /** Blue-white droplets arcing up then falling. For hose wash. */
  function splash(el) {
    if (!el) return;
    const { cx, cy } = _centre(el);
    for (let i = 0; i < 12; i++) {
      // Bias angle upward (−π to 0 range) with some sideways spread
      const angle = -Math.PI * (0.1 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.6;
      const dist  = 28 + Math.random() * 18;
      const r = Math.random();
      const colour = r < 0.35 ? '#7ecff5' : r < 0.60 ? '#29b6f6' : r < 0.85 ? '#b3e5fc' : '#ffffff';
      _spawn('splash-drop', cx, cy,
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        colour,
        650);
    }
  }

  return { burst, splash };
})();

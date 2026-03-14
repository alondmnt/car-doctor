/**
 * Progression system — localStorage persistence, tier unlocks, preview widget.
 * Reads UNLOCK_TIERS from config.js. Delegates unlock effects to GameState.
 */
const Progress = (() => {
  const STORAGE_KEY = 'carDoctor_progress';
  let coins = 0;
  let unlocked = [];  // thresholds already unlocked, e.g. [5, 10]
  let _showcaseTier = null;  // tier to force-spawn on next vehicle (one-shot)

  /** Load saved state from localStorage and apply unlocks */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        coins = data.coins || 0;
        unlocked = data.unlocked || [];
      }
    } catch { /* corrupt data — start fresh */ }
    // Sonic screwdriver — ?sonicscrew unlocks everything, ?sonicscrew=N sets coins to N
    const params = new URLSearchParams(location.search);
    if (params.has('sonicscrew')) {
      const val = params.get('sonicscrew');
      coins = val ? Math.max(0, parseInt(val, 10) || 0) : 999;
      unlocked = UNLOCK_TIERS.filter(t => t.coins <= coins).map(t => t.coins);
      _save();
    }

    applyUnlocks();
    renderPreview();

    // Restore coin jar display
    const countEl = document.getElementById('coin-jar-count');
    const fillEl = document.getElementById('coin-jar-fill');
    if (countEl) countEl.textContent = coins;
    if (fillEl) {
      const level = Math.min((coins % 10) / 10 * 100, 100);
      fillEl.style.height = level + '%';
    }
  }

  /** Persist current state to localStorage */
  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ coins, unlocked }));
    } catch { /* storage full — silent fail */ }
  }

  /** Apply all unlocked tiers to GameState */
  function applyUnlocks() {
    for (const tier of UNLOCK_TIERS) {
      if (!unlocked.includes(tier.coins)) continue;
      GameState.applyTier(tier);
    }
  }

  /** Add coins, persist, check for new tier unlocks */
  function addCoins(n) {
    const prevCoins = coins;
    coins += n;
    _save();

    // Check each tier — may cross multiple at once
    for (const tier of UNLOCK_TIERS) {
      if (unlocked.includes(tier.coins)) continue;
      if (coins >= tier.coins && prevCoins < tier.coins) {
        unlocked.push(tier.coins);
        _save();
        applyUnlocks();
        _showcaseTier = tier;
        showFanfare(tier);
      }
    }
    renderPreview();
  }

  /** Return current coin count (for game.js to sync display) */
  function getCoins() { return coins; }

  /** Wipe all progress — coins, unlocks, localStorage */
  function resetAll() {
    coins = 0;
    unlocked = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* silent */ }
    GameState.reset();
    renderPreview();
  }

  /* ─── Preview widget ─── */

  /** Update the unlock preview DOM below the coin jar */
  function renderPreview() {
    const el = document.getElementById('unlock-preview');
    if (!el) return;

    const next = UNLOCK_TIERS.find(t => !unlocked.includes(t.coins));
    if (!next) {
      // All tiers unlocked
      el.innerHTML = '<div class="unlock-preview__icon">🏆</div>';
      el.querySelector('.unlock-preview__bar')?.remove();
      return;
    }

    const pct = Math.min(coins / next.coins * 100, 100);
    el.innerHTML = `
      <div class="unlock-preview__icon">${next.icon}</div>
      <div class="unlock-preview__bar">
        <div class="unlock-preview__fill" style="width:${pct}%"></div>
      </div>
      <div class="unlock-preview__target">${coins}/${next.coins}</div>
    `;
  }

  /* ─── Fanfare overlay ─── */

  /** Show a full-screen celebration when a tier is unlocked */
  function showFanfare(tier) {
    const overlay = document.getElementById('unlock-fanfare');
    if (!overlay) return;

    // Populate icon + label
    overlay.querySelector('.unlock-fanfare__icon').textContent = tier.icon;
    overlay.querySelector('.unlock-fanfare__label').textContent = tier.label;

    // Spawn firework particles
    const container = overlay.querySelector('.unlock-fanfare__fireworks');
    container.innerHTML = '';
    const colours = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6fc8', '#a66cff', '#ff9f43'];
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement('div');
      dot.className = 'unlock-fanfare__particle';
      const angle = (Math.PI * 2 / 18) * i + (Math.random() - 0.5) * 0.4;
      const dist = 80 + Math.random() * 100;
      dot.style.setProperty('--fx', `${Math.cos(angle) * dist}px`);
      dot.style.setProperty('--fy', `${Math.sin(angle) * dist}px`);
      dot.style.background = colours[i % colours.length];
      container.appendChild(dot);
    }

    overlay.classList.add('unlock-fanfare--active');
    Audio.play('fanfare');

    // Auto-dismiss after 2.5s, or tap to dismiss
    function dismiss() {
      overlay.classList.remove('unlock-fanfare--active');
      overlay.removeEventListener('click', dismiss);
      overlay.removeEventListener('touchend', dismiss);
    }
    overlay.addEventListener('click', dismiss);
    overlay.addEventListener('touchend', dismiss);
    setTimeout(dismiss, 2500);
  }

  /** Return pending showcase tier and clear it (one-shot) */
  function consumeShowcase() {
    const tier = _showcaseTier;
    _showcaseTier = null;
    return tier;
  }

  return { load, addCoins, getCoins, resetAll, renderPreview, consumeShowcase };
})();

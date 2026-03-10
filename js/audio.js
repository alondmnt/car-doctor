/**
 * Audio manager — plays short sound effects.
 * Sounds are generated via AudioContext oscillators as placeholders.
 * Replace with base64 data URIs of real samples later.
 */
const Audio = (() => {
  let ctx = null;
  let unlocked = false;

  /** Unlock AudioContext on first user gesture */
  function unlock() {
    if (unlocked) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    unlocked = true;
  }

  /** Play a short synthesised tone as placeholder */
  function _synth(freq, duration, type = 'square') {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** Sound effect catalogue — each returns a short distinctive sound */
  const effects = {
    pop:     () => _synth(600, 0.12, 'square'),
    clank:   () => _synth(200, 0.15, 'sawtooth'),
    ratchet: () => _synth(400, 0.08, 'triangle'),
    honk:    () => { _synth(300, 0.25, 'sawtooth'); _synth(350, 0.25, 'sawtooth'); },
    whoosh:  () => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    },
    success: () => {
      _synth(523, 0.15, 'sine');
      setTimeout(() => _synth(659, 0.15, 'sine'), 120);
      setTimeout(() => _synth(784, 0.2, 'sine'), 240);
    },
    tap:     () => _synth(500, 0.05, 'square'),
  };

  function play(name) {
    if (!unlocked) return;
    if (effects[name]) effects[name]();
  }

  return { unlock, play };
})();

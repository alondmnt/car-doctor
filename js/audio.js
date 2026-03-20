/**
 * Audio manager — plays short synthesised sound effects.
 * Each effect is a short musical motif built from Web Audio oscillators.
 */
const Audio = (() => {
  let ctx = null;
  let unlocked = false;
  let muted = false;

  /** Unlock AudioContext on first user gesture */
  function unlock() {
    if (unlocked) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    unlocked = true;
  }

  /**
   * Schedule a single note with click-free envelope.
   * @param {number} freq  - frequency in Hz
   * @param {number} start - offset from ctx.currentTime in seconds
   * @param {number} dur   - total duration in seconds
   * @param {string} type  - oscillator type (sine, triangle, square, sawtooth)
   * @param {number} vol   - peak gain (keep ≤0.2)
   */
  function _note(freq, start, dur, type = 'sine', vol = 0.15) {
    if (!ctx) return;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // Soft 5ms attack ramp to avoid click artifacts, then smooth decay
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  /** Sound effect catalogue — short musical motifs */
  const effects = {
    // Gentle bubble: sine pitch bend down
    pop: () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    },

    // Muted tap: triangle + quiet sine harmonic
    clank: () => {
      _note(250, 0, 0.12, 'triangle', 0.15);
      _note(500, 0, 0.12, 'sine', 0.06);
    },

    // Two soft clicks: sine pair with slight pitch rise
    ratchet: () => {
      _note(350, 0, 0.035, 'sine', 0.12);
      _note(400, 0.04, 0.035, 'sine', 0.12);
    },

    // Soft knock: sine with gentle bend down
    tap: () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(350, t + 0.06);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    },

    // Softened white noise with lowpass sweep
    splash: () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const bufSize = ctx.sampleRate * 0.3;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 0.3);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
    },

    // Softer sweep: 600→100Hz sine
    whoosh: () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.35);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
      // Faint filtered noise undertone
      const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nData.length; i++) nData[i] = (Math.random() * 2 - 1);
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = nBuf;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.value = 400;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, t);
      nGain.gain.linearRampToValueAtTime(0.04, t + 0.005);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      nSrc.connect(nFilter).connect(nGain).connect(ctx.destination);
      nSrc.start(t);
      nSrc.stop(t + 0.35);
    },

    // Warmer arpeggio: C4→E4→G4 (octave lower than before)
    success: () => {
      _note(262, 0, 0.15, 'sine', 0.18);
      _note(330, 0.12, 0.15, 'sine', 0.18);
      _note(392, 0.24, 0.25, 'sine', 0.18);
    },

    // Playful toot: soft triangle waves
    honk: () => {
      _note(300, 0, 0.2, 'triangle', 0.12);
      _note(350, 0, 0.2, 'triangle', 0.12);
    },

    // Gentle descending 2-note: G4→C4
    arrive: () => {
      _note(392, 0, 0.1, 'sine', 0.15);
      _note(262, 0.1, 0.1, 'sine', 0.15);
    },

    // Quiet pling
    coin: () => {
      _note(800, 0, 0.08, 'sine', 0.12);
    },

    // Warm 4-note ascending: C4→E4→G4→C5 with gentle vibrato on final note
    fanfare: () => {
      _note(262, 0, 0.12, 'sine', 0.18);
      _note(330, 0.12, 0.12, 'sine', 0.18);
      _note(392, 0.24, 0.12, 'sine', 0.18);
      // Final note with vibrato
      if (!ctx) return;
      const t = ctx.currentTime + 0.36;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 523;
      // Gentle vibrato via LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 5;
      lfoGain.gain.value = 4;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + 0.3);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    },

    // Soft rising hum + faint filtered noise
    rocket: () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.35);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
      // Faint filtered noise
      const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nData.length; i++) nData[i] = (Math.random() * 2 - 1);
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = nBuf;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.value = 500;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, t);
      nGain.gain.linearRampToValueAtTime(0.04, t + 0.005);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      nSrc.connect(nFilter).connect(nGain).connect(ctx.destination);
      nSrc.start(t);
      nSrc.stop(t + 0.35);
    },

    // Gentle vroom: triangle sweep up then back down
    wheelie: () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(350, t + 0.12);
      osc.frequency.linearRampToValueAtTime(250, t + 0.25);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    },
  };

  /** Vibration patterns (ms) keyed by sound name. */
  const HAPTICS = {
    ratchet: [60],
    clank:   [120],
    tap:     [40],
    success: [80, 60, 80],
    coin:    [40, 50, 40],
  };

  function play(name) {
    if (!unlocked || muted) return;
    if (effects[name]) effects[name]();
    const pattern = HAPTICS[name];
    if (pattern && navigator.vibrate) navigator.vibrate(pattern);
  }

  function isMuted() { return muted; }
  function setMuted(v) { muted = v; }

  return { unlock, play, isMuted, setMuted };
})();

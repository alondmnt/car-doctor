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

  /* ─── Background music: shared skeleton + per-vehicle voice banks ─── */

  const _BPM = 100;
  const _BEAT = 60 / _BPM;
  const _BEATS_PER_BAR = 4;
  const _BAR = _BEAT * _BEATS_PER_BAR;
  const _LOOP_BARS = 8;

  // A natural minor / Aeolian pitch table
  const _N = {
    F2: 87.31, G2: 98, A2: 110, B2: 123.47, C3: 130.81,
    D3: 146.83, E3: 164.81, F3: 174.61, G3: 196,
    A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
    F4: 349.23, G4: 392, A4: 440, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
    A5: 880, C6: 1046.50,
  };

  // Bass: one chord root per bar — Am C F G | Am C Em Am
  const _BASS = [
    _N.A2, _N.C3, _N.F2, _N.G2,
    _N.A2, _N.C3, _N.E3, _N.A2,
  ];

  // Each melody is [freq, absoluteBeat, durBeats] across the 32-beat loop.
  // Beats ending in .5 are swung off-8ths.

  // Planet — ambient breath: a single held note every other bar (m1, m3, m5, m7).
  // m2/m4/m6/m8 are lead-silent; the pad and bass carry the harmony through them.
  // Pitches form a soft arc: E5 → F5 → A5 (peak) → G5, then silence to close.
  const _PLANET_MELODY = [
    /* m1 Am — first breath */ [_N.E5, 0,  4],
    /* m3 F  — gentle lift */  [_N.F5, 8,  4],
    /* m5 Am — peak */         [_N.A5, 16, 4],
    /* m7 Em — exhale */       [_N.G5, 24, 4],
  ];

  // Spaceship — cinematic float: sparse held notes, wide leaps, lift-off in m1
  // climbing to an A5 peak in m5, then gentle descent home through m6-m8.
  // Vangelis-ish, no swing — sustained motion only.
  const _SPACESHIP_MELODY = [
    /* m1 Am — lift-off */ [_N.A4, 0,  1], [_N.E5, 1,  3],
    /* m2 C  — cruise */   [_N.G5, 4,  4],
    /* m3 F  — drift */    [_N.C5, 8,  2], [_N.F5, 10, 2],
    /* m4 G  — settle */   [_N.D5, 12, 2], [_N.B4, 14, 2],
    /* m5 Am — peak */     [_N.A4, 16, 1], [_N.E5, 17, 1], [_N.A5, 18, 2],
    /* m6 C  — descend */  [_N.G5, 20, 4],
    /* m7 Em — further */  [_N.E5, 24, 2], [_N.B4, 26, 2],
    /* m8 Am — home */     [_N.A4, 28, 4],
  ];

  // Robot — wind-up clockwork: per-bar chord-arpeggio in straight 8ths (1-3-5-8)
  // followed by the top note held for 2 beats. Identical rhythm every bar (the
  // "mechanical" feel); m8 descends back to A4 to close the loop.
  const _ROBOT_MELODY = [
    /* m1 Am */ [_N.A4, 0,    0.5], [_N.C5, 0.5,  0.5], [_N.E5, 1,    0.5], [_N.A5, 1.5,  0.5], [_N.A5, 2,  2],
    /* m2 C  */ [_N.C5, 4,    0.5], [_N.E5, 4.5,  0.5], [_N.G5, 5,    0.5], [_N.C6, 5.5,  0.5], [_N.C6, 6,  2],
    /* m3 F  */ [_N.F4, 8,    0.5], [_N.A4, 8.5,  0.5], [_N.C5, 9,    0.5], [_N.F5, 9.5,  0.5], [_N.F5, 10, 2],
    /* m4 G  */ [_N.G4, 12,   0.5], [_N.B4, 12.5, 0.5], [_N.D5, 13,   0.5], [_N.G5, 13.5, 0.5], [_N.G5, 14, 2],
    /* m5 Am */ [_N.A4, 16,   0.5], [_N.C5, 16.5, 0.5], [_N.E5, 17,   0.5], [_N.A5, 17.5, 0.5], [_N.A5, 18, 2],
    /* m6 C  */ [_N.C5, 20,   0.5], [_N.E5, 20.5, 0.5], [_N.G5, 21,   0.5], [_N.C6, 21.5, 0.5], [_N.C6, 22, 2],
    /* m7 Em */ [_N.E4, 24,   0.5], [_N.G4, 24.5, 0.5], [_N.B4, 25,   0.5], [_N.E5, 25.5, 0.5], [_N.E5, 26, 2],
    /* m8 Am */ [_N.A4, 28,   0.5], [_N.C5, 28.5, 0.5], [_N.E5, 29,   0.5], [_N.C5, 29.5, 0.5], [_N.A4, 30, 2],
  ];

  // Car — workshop hum: jaunty 8-bar arc, climb to G5 in m5, settle home in m8.
  const _CAR_MELODY = [
    /* m1 Am — open */    [_N.A4, 0, 1], [_N.C5, 1.5, 0.5], [_N.E5, 2, 1.5],
    /* m2 C  — settle */  [_N.D5, 4, 0.5], [_N.C5, 4.5, 0.5], [_N.E5, 5, 1], [_N.C5, 6, 2],
    /* m3 F  — warm */    [_N.A4, 8, 1], [_N.C5, 9.5, 0.5], [_N.A4, 10, 1], [_N.F4, 11, 1],
    /* m4 G  — rise */    [_N.G4, 12, 1], [_N.B4, 13, 1], [_N.D5, 14, 1], [_N.B4, 15, 1],
    /* m5 Am — peak */    [_N.A4, 16, 1], [_N.E5, 17.5, 0.5], [_N.G5, 18, 2],
    /* m6 C  — descend */ [_N.E5, 20, 0.5], [_N.D5, 20.5, 0.5], [_N.E5, 21, 1], [_N.C5, 22, 2],
    /* m7 Em — suspend */ [_N.B4, 24, 1], [_N.D5, 25.5, 0.5], [_N.E5, 26, 1], [_N.D5, 27, 1],
    /* m8 Am — home */    [_N.C5, 28, 1], [_N.B4, 29.5, 0.5], [_N.A4, 30, 2],
  ];

  // Voice banks — each carries its own melody plus layer descriptors.
  // Layer shape: { type, octave, vol }. Optional layers: pad (sustained chord root).
  // swing: 0–1 amount of triplet-feel push on off-8ths.
  const _VOICES = {
    car: {
      lead: { type: 'triangle', octave: 0, vol: 0.10 },
      bass: { type: 'sine',     octave: 0, vol: 0.12 },
      melody: _CAR_MELODY,
      swing: 1,
    },
    robot: {
      lead: { type: 'triangle', octave: 0, vol: 0.08 },
      bass: { type: 'sine',     octave: 0, vol: 0.12 },
      melody: _ROBOT_MELODY,
      swing: 0,
    },
    spaceship: {
      lead: { type: 'sine',     octave: 0, vol: 0.12 },
      bass: { type: 'sine',     octave: 0, vol: 0.14 },
      melody: _SPACESHIP_MELODY,
      swing: 0,
    },
    planet: {
      lead:  { type: 'sine', octave: 0, vol: 0.10 },
      bass:  { type: 'sine', octave: 0, vol: 0.15 },
      pad:   { type: 'sine', octave: 1, vol: 0.06 },
      // Constant low pedal tone — same A2 every bar regardless of chord.
      // Gives planet a "background hum" identity that nothing else has.
      drone: { type: 'sine', octave: 0, vol: 0.05, freq: _N.A2 },
      melody: _PLANET_MELODY,
      swing: 0,
    },
  };

  // Fault layers — short playful motifs that play once per bar while the fault
  // is unfixed. Default shape = one voiced note at a fixed beat (freq/beat/dur
  // on the layer). A layer may instead carry a `notes: [[freq, beat, dur], …]`
  // array for multi-note motifs (e.g. asteroidDefence's tension ostinato).
  // Layers stack additively over the current vehicle voice. Bar-aligned:
  // changes take effect at the next bar boundary.
  //
  // Pitches favour A/E/G/C/D (consonant over Am-C-F-G | Am-C-Em-Am). Beats and
  // pitches are spread across the bar so combinations form little grooves.
  // Volumes are tuned for equal *perceived* loudness across pitches: the ear
  // is less sensitive below ~200 Hz and above ~3 kHz, so sub-bass faults get
  // bumped and high faults get trimmed. Long sustained faults get a small
  // additional cut to compensate for accumulated energy. Multi-note layers
  // are trimmed further since hits compound across the bar.
  const _FAULT_LAYERS = {
    /* car (+ shared with robot/spaceship) */
    flatTyre:         { type: 'sine',     octave: 0, vol: 0.10, freq: _N.A2, beat: 2.5, dur: 0.5  },
    engine:           { type: 'sine',     octave: 0, vol: 0.08, freq: _N.E3, beat: 0,   dur: 0.4  },
    wash:             { type: 'triangle', octave: 0, vol: 0.06, freq: _N.G4, beat: 3.5, dur: 0.25 },
    paint:            { type: 'sine',     octave: 0, vol: 0.04, freq: _N.A5, beat: 3,   dur: 1    },
    sticker:          { type: 'triangle', octave: 0, vol: 0.05, freq: _N.A5, beat: 1,   dur: 0.25 },
    /* robot-only */
    armJoint:         { type: 'sine',     octave: 0, vol: 0.07, freq: _N.E4, beat: 0.5, dur: 0.25 },
    legsRepair:       { type: 'sine',     octave: 0, vol: 0.10, freq: _N.A2, beat: 0,   dur: 0.5  },
    voiceModule:      { type: 'sine',     octave: 0, vol: 0.06, freq: _N.D5, beat: 2,   dur: 0.5  },
    jetpack:          { type: 'sine',     octave: 0, vol: 0.06, freq: _N.A4, beat: 1.5, dur: 0.5  },
    /* spaceship-only */
    laser:            { type: 'sine',     octave: 0, vol: 0.06, freq: _N.E5, beat: 1.5, dur: 0.15 },
    shield:           { type: 'sine',     octave: 0, vol: 0.06, freq: _N.E5, beat: 3,   dur: 0.3  },
    antenna:          { type: 'sine',     octave: 0, vol: 0.05, freq: _N.G5, beat: 0.5, dur: 0.2  },
    /* planet-only */
    // Asteroid is always the opening fault step (FaultRegistry order 0) and
    // the only fault with a clock + fail state, so its layer is the one
    // exception to the otherwise relaxed soundbed: an offbeat ostinato on
    // every "and" (0.5/1.5/2.5/3.5), F3/G3 whole-step alternation. Sits a
    // whole step apart so it churns without dissonance — kid-friendly
    // Jaws-lite. Pitched above the planet bass/drone (A2/A2) so it's not
    // masked, and above small-speaker sub-bass rolloff so it's actually
    // audible on tablets and laptops.
    asteroidDefence:  { type: 'sine',     octave: 0, vol: 0.12, notes: [
      [_N.F3, 0.5, 0.4], [_N.G3, 1.5, 0.4], [_N.F3, 2.5, 0.4], [_N.G3, 3.5, 0.4],
    ] },
    tectonicVolcanic: { type: 'sine',     octave: 0, vol: 0.05, freq: _N.A3, beat: 1,   dur: 1    },
    fire:             { type: 'triangle', octave: 0, vol: 0.06, freq: _N.C5, beat: 1.5, dur: 0.3  },
    oceanCleanup:     { type: 'sine',     octave: 0, vol: 0.07, freq: _N.D4, beat: 2.5, dur: 0.4  },
    satelliteNetwork: { type: 'sine',     octave: 0, vol: 0.05, freq: _N.G5, beat: 2,   dur: 0.25 },
    forest:           { type: 'triangle', octave: 0, vol: 0.07, freq: _N.E4, beat: 0.5, dur: 0.4  },
    city:             { type: 'triangle', octave: 0, vol: 0.05, freq: _N.C6, beat: 3,   dur: 0.3  },
  };

  /** Play one note shaped by a voice descriptor (oscillator type, octave, volume). */
  function _playVoiced(voice, freq, startOffset, durSec) {
    if (!voice || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + startOffset;
    const f = freq * Math.pow(2, voice.octave || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = voice.type;
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(voice.vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durSec);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durSec);
  }

  let _musicWanted = false;
  let _musicPlaying = false;
  let _musicTimer = null;
  let _currentVoice = 'car';
  let _pendingVoice = null;
  let _activeFaults = new Set();
  let _pendingFaults = null;
  let _barIndex = 0;
  let _nextBarTime = 0;

  /** Schedule one bar of bass + melody + voice extras, then queue the next. */
  function _scheduleBar() {
    if (!ctx || !_musicPlaying || ctx.state !== 'running') return;

    // Voice swap is quantised to the bar boundary — bass and melody pitches
    // are shared across voices, so the swap is harmonically continuous.
    if (_pendingVoice && _VOICES[_pendingVoice]) {
      _currentVoice = _pendingVoice;
      _pendingVoice = null;
    }
    if (_pendingFaults) {
      _activeFaults = _pendingFaults;
      _pendingFaults = null;
    }
    const voice = _VOICES[_currentVoice];
    const offset = _nextBarTime - ctx.currentTime;
    const barBeatStart = _barIndex * _BEATS_PER_BAR;
    const swingNudge = (_BEAT / 3) * (voice.swing || 0);

    const bassFreq = _BASS[_barIndex];
    if (bassFreq) _playVoiced(voice.bass, bassFreq, offset, _BAR * 0.95);

    for (const [freq, beat, dur] of voice.melody) {
      if (beat < barBeatStart || beat >= barBeatStart + _BEATS_PER_BAR) continue;
      const isOffEighth = (beat * 2) % 2 === 1;
      const local = (beat - barBeatStart) * _BEAT + (isOffEighth ? swingNudge : 0);
      _playVoiced(voice.lead, freq, offset + local, dur * _BEAT * 0.9);
    }

    if (voice.drone) {
      _playVoiced(voice.drone, voice.drone.freq, offset, _BAR * 0.98);
    }
    if (voice.pad && bassFreq) {
      _playVoiced(voice.pad, bassFreq, offset, _BAR * 0.98);
    }

    // Fault layers — each active fault plays its tiny motif once this bar.
    // Faults sit straight on the grid (no swing) so they keep a mechanical,
    // anxious feel against the melody's groove. Multi-note layers carry a
    // `notes` array; single-note layers expose freq/beat/dur directly.
    for (const faultKey of _activeFaults) {
      const layer = _FAULT_LAYERS[faultKey];
      if (!layer) continue;
      const notes = layer.notes || [[layer.freq, layer.beat, layer.dur]];
      for (const [freq, beat, dur] of notes) {
        _playVoiced(layer, freq, offset + beat * _BEAT, dur * _BEAT);
      }
    }

    _nextBarTime += _BAR;
    _barIndex = (_barIndex + 1) % _LOOP_BARS;

    const wait = Math.max(0, (_nextBarTime - ctx.currentTime - 0.08) * 1000);
    _musicTimer = setTimeout(_scheduleBar, wait);
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

  function play(name) {
    if (!unlocked || muted) return;
    if (effects[name]) effects[name]();
  }

  function isMuted() { return muted; }

  /** Set mute state. Pauses/resumes the music loop accordingly. */
  function setMuted(v) {
    muted = v;
    if (muted) {
      _musicPlaying = false;
      if (_musicTimer) { clearTimeout(_musicTimer); _musicTimer = null; }
    } else if (_musicWanted && !_musicPlaying && ctx && ctx.state === 'running') {
      _musicPlaying = true;
      _barIndex = 0;
      _nextBarTime = ctx.currentTime + 0.05;
      _scheduleBar();
    }
  }

  /** Start the background music loop. */
  function startMusic(vehicle) {
    _musicWanted = true;
    if (vehicle && _VOICES[vehicle]) _currentVoice = vehicle;
    if (!unlocked || muted || _musicPlaying) return;
    _musicPlaying = true;
    _barIndex = 0;
    const begin = () => { _nextBarTime = ctx.currentTime + 0.05; _scheduleBar(); };
    // Defer to next tick so synchronous setVehicle/setActiveFaults calls land
    // before bar 1 is scheduled — splash → game then opens with the full theme.
    if (ctx.state === 'suspended') ctx.resume().then(begin);
    else setTimeout(begin, 0);
  }

  /** Stop the background music loop. */
  function stopMusic() {
    _musicWanted = false;
    _musicPlaying = false;
    if (_musicTimer) { clearTimeout(_musicTimer); _musicTimer = null; }
    _activeFaults = new Set();
    _pendingFaults = null;
  }

  /** Queue a voice-bank swap that takes effect at the next bar boundary. */
  function setVehicle(name) {
    if (!_VOICES[name]) return;
    if (!_musicPlaying) { _currentVoice = name; return; }
    _pendingVoice = name;
  }

  /** Replace the active fault set; takes effect at the next bar boundary. */
  function setActiveFaults(faultKeys) {
    const next = new Set(faultKeys);
    if (!_musicPlaying) { _activeFaults = next; return; }
    _pendingFaults = next;
  }

  /** Resume AudioContext (and music if wanted) after device sleep. */
  function resume() {
    if (!ctx || ctx.state !== 'suspended') return;
    ctx.resume().then(() => {
      if (_musicWanted && !muted && !_musicPlaying) {
        _musicPlaying = true;
        _barIndex = 0;
        _nextBarTime = ctx.currentTime + 0.05;
        _scheduleBar();
      }
    });
  }

  return { unlock, resume, play, isMuted, setMuted, startMusic, stopMusic, setVehicle, setActiveFaults };
})();

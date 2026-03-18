/**
 * GameState — runtime unlock state, kept separate from frozen CONFIG defaults.
 * Provides a merged view via get(key) so consumers never mutate CONFIG directly.
 */
const GameState = (() => {
  const _arrays = {};    // CONFIG key -> additional unlocked items
  const _booleans = {};  // e.g. robotEnabled -> true
  const _objects = {};   // e.g. robotFaultWeights -> { armJoint: 3, ... }
  let _hintsOn = true;

  /** Maps robot tier keys to state mutations */
  const TIER_ACTIONS = {
    robotDoctor:    () => { _booleans.robotEnabled = true; },
    spaceshipDoctor: () => { _booleans.spaceshipEnabled = true; },
    planetDoctor:    () => { _booleans.planetEnabled = true; },
    robotArmJoint: () => { _objects.robotFaultWeights = { ...(_objects.robotFaultWeights || {}), armJoint: 3 }; },
    robotLegs:     () => { _objects.robotFaultWeights = { ...(_objects.robotFaultWeights || {}), legsRepair: 2 }; },
    robotVoice:    () => { _objects.robotFaultWeights = { ...(_objects.robotFaultWeights || {}), voiceModule: 3 }; },
    robotJetpack:  () => { _objects.robotFaultWeights = { ...(_objects.robotFaultWeights || {}), jetpack: 3 }; },
    spaceshipLaser:   () => { _objects.spaceshipFaultWeights = { ...(_objects.spaceshipFaultWeights || {}), laser: 3 }; },
    spaceshipShield:  () => { _objects.spaceshipFaultWeights = { ...(_objects.spaceshipFaultWeights || {}), shield: 3 }; },
    spaceshipAntenna: () => { _objects.spaceshipFaultWeights = { ...(_objects.spaceshipFaultWeights || {}), antenna: 3 }; },
    planetCityExpansion: () => { _objects.cityExpanded = true; },
    planetOcean:     () => { _objects.planetFaultWeights = { ...(_objects.planetFaultWeights || {}), oceanCleanup: 3 }; },
    planetAsteroid:  () => { _objects.planetFaultWeights = { ...(_objects.planetFaultWeights || {}), asteroidDefence: 3 }; },
    planetSatellite: () => { _objects.planetFaultWeights = { ...(_objects.planetFaultWeights || {}), satelliteNetwork: 3 }; },
    planetTectonic:  () => { _objects.planetFaultWeights = { ...(_objects.planetFaultWeights || {}), tectonicVolcanic: 3 }; },
  };

  /**
   * Merged view: frozen CONFIG defaults + unlocked additions.
   * Arrays are concatenated, objects are shallow-merged, booleans are overridden.
   */
  function get(key) {
    if (key === 'hintsOn') return _hintsOn;
    if (key in _booleans) return _booleans[key];
    if (key in _objects) return { ...CONFIG[key], ..._objects[key] };
    if (key in _arrays) return [...CONFIG[key], ..._arrays[key]];
    return CONFIG[key];
  }

  /** Apply a single unlock tier's effects to runtime state */
  function applyTier(tier) {
    const action = TIER_ACTIONS[tier.key];
    if (action) { action(); return; }

    if (!tier.items.length) return;
    if (!Array.isArray(CONFIG[tier.key])) return;

    const existing = _arrays[tier.key] || [];
    for (const item of tier.items) {
      if (!CONFIG[tier.key].includes(item) && !existing.includes(item)) {
        existing.push(item);
      }
    }
    _arrays[tier.key] = existing;
  }

  /** Clear all unlocked state back to defaults */
  function reset() {
    for (const k of Object.keys(_arrays)) delete _arrays[k];
    for (const k of Object.keys(_booleans)) delete _booleans[k];
    for (const k of Object.keys(_objects)) delete _objects[k];
    _hintsOn = true;
  }

  function hintsOn() { return _hintsOn; }
  function setHintsOn(v) { _hintsOn = v; }

  return { get, applyTier, reset, hintsOn, setHintsOn };
})();

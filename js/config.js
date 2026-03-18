/** Tunable game values — safe for parent editing */
const CONFIG = {
  garageColour: '#4a8c5c',       // green walls
  carColour: '#e63946',
  carShapes: ['sedan', 'suv', 'sports'],  // random pick per car
  exitAnimations: ['rocket', 'wheelie', 'honk'],  // random pick per car
  hintsOn: true,
  gameSpeed: 1,                  // multiplier: 0.5 = slow, 2 = fast
  carPalette: ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#264653'],
  stickers: ['⭐', '🔥', '⚡', '🏁', '🦈', '🐉', '💀', '🌈'],
  faultWeights: {           // relative weights — higher = more likely
    flatTyre: 2,
    engine: 2,
    paint: 3,
    sticker: 3,
    wash: 2,
  },
  multiFaultChance: 0.3,    // chance of 2 faults per car
  wheelStyles: ['standard'],  // unlockable: 'racing', 'offroad'

  /* Robot settings — activated by tier 20 unlock */
  robotEnabled: false,
  robotChance: 0.7,              // probability of robot vs car once unlocked
  robotShapes: ['standard'],
  armStyles: ['standard'],       // unlockable: 'saw', 'screwdriver', 'hammer'
  boosterStyles: ['jetpack'],    // unlockable: 'rocket', 'propeller', 'balloon'
  robotFaultWeights: {           // base faults (same keys as car)
    flatTyre: 2, engine: 2, paint: 3, sticker: 3, wash: 2,
  },
  // Tier 25 adds: armJoint: 2
  // Tier 28 adds: arm styles (saw, screwdriver, hammer)
  // Tier 30 adds: legsRepair: 2
  // Tier 35 adds: voiceModule: 2
  // Tier 40 adds: jetpack: 2

  /* Spaceship settings — activated by tier 50 unlock */
  spaceshipEnabled: false,
  spaceshipChance: 0.5,                // probability of spaceship once unlocked
  spaceshipShapes: ['standard'],
  spaceshipFaultWeights: {
    flatTyre: 2, engine: 2, paint: 3, sticker: 3, wash: 2,
  },
  laserStyles: ['plasma', 'photon', 'ion'],
  shieldStyles: ['ruby', 'sapphire', 'emerald'],
  // Tier 55 adds: laser: 3
  // Tier 60 adds: shield: 3
  // Tier 65 adds: antenna: 3

  /* Planet settings — activated by tier 70 unlock */
  planetEnabled: false,
  planetChance: 0.5,
  planetShapes: ['rocky', 'gas', 'ringed'],
  planetPalette: ['#c2956b', '#e8a87c', '#6b8fa3', '#a8c686', '#d4a5a5', '#8fbc8f'],
  planetFaultWeights: { fire: 3, forest: 3, city: 3 },
  satelliteStyles: ['standard'],
  planetStickers: ['🏙️', '🏗️', '🏰', '🗼', '🌆', '🏛️'],

  /* Terraforming sticker pools — one per ecological category */
  terraformWaterStickers:   ['💧', '🌊', '🏞️', '🧊', '🌧️', '🌀'],
  terraformPlantsStickers:  ['🌿', '🌻', '🌴', '🍀', '🌵', '🌾'],
  terraformAnimalsStickers: ['🐘', '🦋', '🐸', '🦜', '🐢', '🦁'],
};

/** Progression tiers — earn coins to unlock new content */
const UNLOCK_TIERS = [
  { coins: 5,  key: 'stickers',  icon: '⭐', label: 'New stickers!',
    items: ['🎸', '🦄', '🪐', '🍕', '🎯', '🐙', '🦊', '🌊'],
    showcase: { fault: 'sticker' } },
  { coins: 10, key: 'carPalette', icon: '🎨', label: 'New colours!',
    items: ['#c0c0c0', '#ffd700', '#ff00ff', '#00ffcc', '#ff4500', '#7b68ee'],
    showcase: { fault: 'paint' } },
  { coins: 15, key: 'wheelStyles', icon: '🛞', label: 'New wheels!',
    items: ['racing', 'offroad'],
    showcase: { fault: 'flatTyre' } },
  { coins: 20, key: 'robotDoctor',    icon: '🤖', label: 'Robot Doctor!',
    items: [],
    showcase: { vehicle: 'robot' } },
  { coins: 25, key: 'robotArmJoint',  icon: '💪', label: 'Arm repair!',
    items: [],
    showcase: { vehicle: 'robot', fault: 'armJoint' } },
  { coins: 28, key: 'armStyles',      icon: '🔧', label: 'Tool arms!',
    items: ['saw', 'screwdriver', 'hammer'],
    showcase: { vehicle: 'robot', fault: 'armJoint' } },
  { coins: 30, key: 'robotLegs',      icon: '🦿', label: 'Legs repair!',
    items: [],
    showcase: { vehicle: 'robot', fault: 'legsRepair' } },
  { coins: 35, key: 'robotVoice',     icon: '🗣️', label: 'Voice module!',
    items: [],
    showcase: { vehicle: 'robot', fault: 'voiceModule' } },
  { coins: 40, key: 'robotJetpack',   icon: '🚀', label: 'Jetpack!',
    items: [],
    showcase: { vehicle: 'robot', fault: 'jetpack' } },
  { coins: 45, key: 'boosterStyles',  icon: '🎈', label: 'New boosters!',
    items: ['rocket', 'propeller', 'balloon'],
    showcase: { vehicle: 'robot', fault: 'jetpack' } },
  { coins: 50, key: 'spaceshipDoctor', icon: '🛸', label: 'Spaceship Doctor!',
    items: [],
    showcase: { vehicle: 'spaceship' } },
  { coins: 55, key: 'spaceshipLaser',   icon: '🔫', label: 'Laser cannons!',
    items: [],
    showcase: { vehicle: 'spaceship', fault: 'laser' } },
  { coins: 60, key: 'spaceshipShield',  icon: '🛡️', label: 'Shield generator!',
    items: [],
    showcase: { vehicle: 'spaceship', fault: 'shield' } },
  { coins: 65, key: 'spaceshipAntenna', icon: '📡', label: 'Antenna array!',
    items: [],
    showcase: { vehicle: 'spaceship', fault: 'antenna' } },
  { coins: 70, key: 'planetDoctor', icon: '🪐', label: 'Planet Doctor!',
    items: [],
    showcase: { vehicle: 'planet' } },
  { coins: 75, key: 'planetOcean', label: 'Ocean cleanup!', icon: '🌊', items: [],
    showcase: { vehicle: 'planet', fault: 'oceanCleanup' } },
  { coins: 80, key: 'planetTerraforming', label: 'Terraforming!', icon: '🌱', items: [],
    showcase: { vehicle: 'planet', fault: 'forest' } },
  { coins: 85, key: 'planetAsteroid', label: 'Asteroid defence!', icon: '☄️', items: [],
    showcase: { vehicle: 'planet', fault: 'asteroidDefence' } },
  { coins: 90, key: 'planetSatellite', label: 'Satellite network!', icon: '📡', items: [],
    showcase: { vehicle: 'planet', fault: 'satelliteNetwork' } },
  { coins: 95, key: 'planetCityExpansion', label: 'City expansion!', icon: '🏙️', items: [],
    showcase: { vehicle: 'planet', fault: 'city' } },
  { coins: 100, key: 'planetTectonic', label: 'Tectonic repair!', icon: '🌋', items: [],
    showcase: { vehicle: 'planet', fault: 'tectonicVolcanic' } },
];

/** Deep-freeze an object tree so accidental mutations fail loudly in strict mode */
function _deepFreeze(obj) {
  Object.freeze(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) _deepFreeze(v);
  }
  return obj;
}
_deepFreeze(CONFIG);
_deepFreeze(UNLOCK_TIERS);

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
  // Tier 55 adds: laser: 3
  // Tier 60 adds: shield: 3
  // Tier 65 adds: antenna: 3
};

/** Progression tiers — earn coins to unlock new content */
const UNLOCK_TIERS = [
  { coins: 5,  key: 'stickers',  icon: '⭐', label: 'New stickers!',
    items: ['🎸', '🦄', '🪐', '🍕', '🎯', '🐙', '🦊', '🌊'] },
  { coins: 10, key: 'carPalette', icon: '🎨', label: 'New colours!',
    items: ['#c0c0c0', '#ffd700', '#ff00ff', '#00ffcc', '#ff4500', '#7b68ee'] },
  { coins: 15, key: 'wheelStyles', icon: '🛞', label: 'New wheels!',
    items: ['racing', 'offroad'] },
  { coins: 20, key: 'robotDoctor',    icon: '🤖', label: 'Robot Doctor!',
    items: [] },
  { coins: 25, key: 'robotArmJoint',  icon: '💪', label: 'Arm repair!',
    items: [] },
  { coins: 28, key: 'armStyles',      icon: '🔧', label: 'Tool arms!',
    items: ['saw', 'screwdriver', 'hammer'] },
  { coins: 30, key: 'robotLegs',      icon: '🦿', label: 'Legs repair!',
    items: [] },
  { coins: 35, key: 'robotVoice',     icon: '🗣️', label: 'Voice module!',
    items: [] },
  { coins: 40, key: 'robotJetpack',   icon: '🚀', label: 'Jetpack!',
    items: [] },
  { coins: 45, key: 'boosterStyles',  icon: '🎈', label: 'New boosters!',
    items: ['rocket', 'propeller', 'balloon'] },
  { coins: 50, key: 'spaceshipDoctor', icon: '🛸', label: 'Spaceship Doctor!',
    items: [] },
  { coins: 55, key: 'spaceshipLaser',   icon: '🔫', label: 'Laser cannons!',   items: [] },
  { coins: 60, key: 'spaceshipShield',  icon: '🛡️', label: 'Shield generator!', items: [] },
  { coins: 65, key: 'spaceshipAntenna', icon: '📡', label: 'Antenna array!',   items: [] },
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

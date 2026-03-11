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
};

/** Progression tiers — earn coins to unlock new content */
const UNLOCK_TIERS = [
  { coins: 5,  key: 'stickers',  icon: '⭐', label: 'New stickers!',
    items: ['🎸', '🦄', '🪐', '🍕', '🎯', '🐙', '🦊', '🌊'] },
  { coins: 10, key: 'carPalette', icon: '🎨', label: 'New colours!',
    items: ['#c0c0c0', '#ffd700', '#ff00ff', '#00ffcc', '#ff4500', '#7b68ee'] },
  { coins: 15, key: 'wheelStyles', icon: '🛞', label: 'New wheels!',
    items: ['racing', 'offroad'] },
  { coins: 20, key: 'robotDoctor', icon: '🤖', label: 'Robot Doctor!',
    items: [] },   // stub — needs #7
  { coins: 30, key: 'newFaults',   icon: '🔧', label: 'New faults!',
    items: [] },   // stub — needs new fault types
];

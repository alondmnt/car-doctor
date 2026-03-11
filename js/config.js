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
    wash: 10,  // TODO: revert to 2 after testing
  },
  multiFaultChance: 0.3,    // chance of 2 faults per car
};

/**
 * FaultRegistry — single source of truth for fault metadata, repair order,
 * weighted random selection, and part picker definitions.
 */
const FaultRegistry = (() => {

  /** Fault metadata — array index determines repair order.
   *  Each entry maps a fault key to its dashboard indicator and per-vehicle repair function. */
  const REGISTRY = [
    { key: 'flatTyre',    indicator: '.car__indicator--tyre',        car: (c) => Repair.flatTyre(c),          robot: (c) => RobotRepair.brokenBoot(c),   spaceship: (c) => SpaceshipRepair.brokenWing(c) },
    { key: 'engine',      indicator: '.car__indicator--engine',      car: (c) => Repair.engine(c),            robot: (c) => RobotRepair.powerCore(c),    spaceship: (c) => SpaceshipRepair.booster(c) },
    { key: 'armJoint',    indicator: '.car__indicator--armJoint',    car: null,                                robot: (c) => RobotRepair.armJoint(c) },
    { key: 'legsRepair',  indicator: '.car__indicator--legsRepair',  car: null,                                robot: (c) => RobotRepair.legsRepair(c) },
    { key: 'voiceModule', indicator: '.car__indicator--voiceModule', car: null,                                robot: (c) => RobotRepair.voiceModule(c) },
    { key: 'jetpack',     indicator: '.car__indicator--jetpack',     car: null,                                robot: (c) => RobotRepair.jetpack(c) },
    { key: 'laser',      indicator: '.car__indicator--laser',      car: null, robot: null, spaceship: (c) => SpaceshipRepair.laser(c) },
    { key: 'shield',     indicator: '.car__indicator--shield',     car: null, robot: null, spaceship: (c) => SpaceshipRepair.shield(c) },
    { key: 'antenna',    indicator: '.car__indicator--antenna',    car: null, robot: null, spaceship: (c) => SpaceshipRepair.antenna(c) },
    { key: 'fire',       indicator: '.car__indicator--fire',       car: null, robot: null, spaceship: null, planet: (c) => PlanetRepair.extinguish(c) },
    { key: 'forest',     indicator: '.car__indicator--forest',     car: null, robot: null, spaceship: null, planet: (c) => PlanetRepair.plantForests(c) },
    { key: 'city',            indicator: '.car__indicator--city',            car: null, robot: null, spaceship: null, planet: (c) => PlanetRepair.buildCities(c) },
    { key: 'oceanCleanup',    indicator: '.car__indicator--oceanCleanup',    car: null, robot: null, spaceship: null, planet: (c) => PlanetRepair.cleanOcean(c) },
    { key: 'asteroidDefence', indicator: '.car__indicator--asteroidDefence', car: null, robot: null, spaceship: null, planet: (c) => PlanetRepair.asteroidDefence(c) },
    { key: 'satelliteNetwork', indicator: '.car__indicator--satelliteNetwork', car: null, robot: null, spaceship: null, planet: (c) => PlanetRepair.satelliteNetwork(c) },
    { key: 'tectonicVolcanic', indicator: '.car__indicator--tectonicVolcanic', car: null, robot: null, spaceship: null, planet: (c) => PlanetRepair.tectonicRepair(c) },
    { key: 'wash',        indicator: '.car__indicator--wash',        car: (c) => Repair.wash(c),              robot: (c) => RobotRepair.oilGrime(c),     spaceship: (c) => SpaceshipRepair.spaceDust(c) },
    { key: 'paint',       indicator: '.car__indicator--paint',       car: (c) => Repair.paint(c),             robot: (c) => RobotRepair.plating(c),      spaceship: (c) => SpaceshipRepair.hullDamage(c) },
    { key: 'sticker',     indicator: '.car__indicator--sticker',     car: (c) => Repair.sticker(c),           robot: (c) => RobotRepair.badge(c),        spaceship: (c) => SpaceshipRepair.emblem(c) },
  ];

  /** Ordered fault keys (for sorting repair sequence) */
  const ORDER = REGISTRY.map(f => f.key);

  /** Keyed lookup for fault metadata */
  const META = Object.fromEntries(REGISTRY.map(f => [f.key, f]));

  /** Part picker definitions — each provides available styles and a preview renderer */
  const PARTS = {
    wheel:   { styles: () => GameState.get('wheelStyles'),   preview: (s) => Car.wheelPreviewSVG(s) },
    wing:    { styles: () => ['standard'],                  preview: () => '<span style="font-size:28px">🪽</span>' },
    arm:     { styles: () => GameState.get('armStyles'),      preview: (s) => Robot.armPreviewSVG(s) },
    booster: { styles: () => GameState.get('boosterStyles'),  preview: (s) => Robot.boosterPreviewSVG(s) },
    voice:   { styles: () => RobotRepair.voiceFlags(), preview: (f) => `<span style="font-size:28px">${f}</span>` },
    laser:   { styles: () => GameState.get('laserStyles'),  preview: (s) => Spaceship.laserPreviewSVG(s) },
    shield:  { styles: () => GameState.get('shieldStyles'), preview: (s) => Spaceship.shieldPreviewSVG(s) },
    satellite: { styles: () => GameState.get('satelliteStyles'), preview: (s) => Planet.satellitePreviewSVG(s) },
  };

  /** Pick N unique faults using weighted random selection */
  function pickWeightedFaults(count, weights) {
    const pool = { ...(weights || CONFIG.faultWeights) };
    const picked = [];
    for (let i = 0; i < count; i++) {
      const entries = Object.entries(pool);
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = Math.random() * total;
      for (const [fault, w] of entries) {
        roll -= w;
        if (roll <= 0) {
          picked.push(fault);
          delete pool[fault];
          break;
        }
      }
    }
    return picked;
  }

  return { REGISTRY, ORDER, META, PARTS, pickWeightedFaults };
})();

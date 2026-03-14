# Roadmap

## Done

- **v0.1.0 — First Drive** — core game loop: jack, drag, engine repair, rocket exit
- **v0.2.0 — Full Garage** — dashboard, car shapes, drivers, paint, stickers, toolbox, fault weights
- **v0.3.0 — Grand Opening** — SVG rewrite, car wash fault (#2), splash screen, garage decorations, smoke, hints
- **v0.4.0 — Robots!** — unlock tiers (#1 partial), robot config/SVG/factory, 9 robot faults, voice module, jetpack, long-press reset
- **v0.5.0 — Custom Shop** — part pickers (wheels, arms, boosters), flag picker, multilingual speech, repair order, picker factory refactor
- **v0.6.0 — Spaceships!** — spaceship vehicle type (alien pilot, delta wings, booster hatch), space hangar theme, wobbly descent entry, tier 50 unlock, generalised fault dispatch, themed garage backgrounds (day → dusk → space)
- Space upgrades — laser, shield generator, antenna array (3 multi-stage spaceship faults, sonar signal animation)
- Dashboard polish — fade-in after parking, unlocked upgrades always visible
- Unlock showcase — force next spawn to demonstrate newly unlocked feature
- Sound effects — artistic synth motifs (arrive, coin, fanfare, rocket, wheelie), enriched existing effects
- **v0.7.0 — Extensibility refactor** — decouple picker/game from vehicle-specific selectors
  - `data-role` attributes on interactive SVG elements; picker uses generic `[data-role]` queries
  - `data-theme` attribute on `#garage` replaces `.garage--lab` / `.garage--hangar` class toggles
  - `SPAWN_REGISTRY` + `pickVehicle()` in game.js eliminates vehicle if/else chain
  - Unified `--vehicle-colour` CSS var; paint fills cascade `--vehicle-colour → per-vehicle fallback`
  - Shield generator relocated to mid-fuselage to fix engine/shield overlap on multi-fault spawns

- **Planet doctor** — new vehicle type (build cities, plant forests, put down fires); deep space theme with sun/satellite; 3 geometry types (rocky, gas, ringed); zoom-in entry, orbital exit; tier 70 unlock

## Next up

1. **People doctor** — new vehicle type post-refactor

## On hold

- **Car queue** (#3) — soft pressure may not suit a 6yo audience

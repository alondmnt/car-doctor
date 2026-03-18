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
- Planet faults — tectonic repair (tier 75), ocean cleanup (tier 80), asteroid defence (tier 90), satellite network (tier 95)
- **City expansion** (tier 95 → now tier 90 per reorder) — 3 shape-aware city zones (continent positions for rocky/ringed, construction band for gas); zone-choice interaction: all zones shown simultaneously, player taps one to place a building sticker, others dismiss
- **Zone-choice infrastructure** — `RepairTemplates.zoneChoice()` factory + `_listenForZoneChoice` / `_waitForToolThenZoneChoice` in Picker; reusable for car sticker spots, forest biomes, and future multi-zone placement
- **Terraforming** (tier 85) — expands forest fault to 3 sequential zones (water → plants → animals) with shape-aware positions (ocean/landmass/island for rocky/ringed; atmosphere/band for gas); generic `pickerItems` step field for custom emoji pools

## Next up

Planet expansion unlocks (narrative arc: geology → water → life → civilisation → defence → advanced tech):

| Tier | Type | Unlock |
|------|------|--------|
| 75 | new fault | ✅ Tectonic repair (seal magma fault-line cracks; primordial geology) |
| 80 | new fault | ✅ Ocean cleanup (animated oil spill, wash mechanic) |
| 85 | expansion | ✅ Terraforming (expands forest → water reserves, plants, animals) |
| 90 | expansion | ✅ City expansion (new city stickers / placement zones) |
| 95 | new fault | ✅ Satellite network (repair broken orbiting satellites) |
| 100 | new fault | ✅ Asteroid defence (tap incoming meteors; satellites enable tracking) |
| 105 | expansion | Satellite expansion (picker of different satellite types/styles) |

### Game feel

1. **Character reactions** — blink (opacity pulse on eyes), happy wiggle (transform on head group) on repair completion, surprise (scale pupils) on fault spawn. Cars/robots/spaceships have SVG eye/mouth elements ready for CSS transitions. Planets: aurora shimmer effect on successful repair (no face).
2. **Sensory richness** — three layers, all zero-dependency:
   - Haptics: `navigator.vibrate()` on bolt tighten, jack lift, spray, drill
   - Richer audio: longer envelopes, filtered noise, more harmonics (chunky ratchet, whooshy spray, splashy hose)
   - CSS particles: sparks (drill), bubbles (hose), splatter (spray) — absolute-positioned divs with `@keyframes`
3. ✅ **Multi-zone placement** — `RepairTemplates.zoneChoice()` + Picker routing; zones shown simultaneously, player picks one, others dismiss. `applyStickerOrBadge()` accepts zone selector. Applied to city zones; pending: car sticker spots (bumper vs door), forest biomes.
4. **Fault choice** — on multi-fault vehicles, let the player tap a dashboard indicator to pick which fault to fix first. Small change: replace `FaultRegistry.ORDER` sort in `game.js` with a picker UI before `startNextFault()`.
5. **Difficulty scaling** — config-driven: increase max faults per vehicle as coins grow, tighten meteor timing, shorten hint auto-disable window. Tunable via `config.js` thresholds.

### New content

1. **People doctor** — new vehicle type post-refactor
2. **Ultimate level** — unlocks after all tiers complete. Uniform spawn probability across all vehicle types; max faults (3–4) from all unlocked types. No new systems — just a spawn rule in `pickVehicle()`.

## On hold

- **Car queue** (#3) — soft pressure may not suit a 6yo audience
- **Vehicle combinations** (e.g., robot-spaceship hybrid) — cool but high complexity for uncertain payoff; revisit after people doctor ships

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
- **v0.8.0 — Planet Doctor** — new vehicle type and full colonisation arc (tiers 70–105)
  - Planet vehicle: 3 geometry types (rocky, gas, ringed); deep space theme; zoom-in entry, orbital exit; tier 70 unlock
  - Colonisation arc faults: satellite network (survey orbit), asteroid defence (secure orbit), tectonic repair (stabilise surface), ocean cleanup (make habitable)
  - **Terraforming** expansion (tier 95) — 3 sequential zones (water → plants → animals); shape-aware positions; custom emoji pools per step
  - **City expansion** (tier 100) — 3 shape-aware city zones; zone-choice interaction (all zones shown simultaneously, tap one to place)
  - **Satellite expansion** (tier 105) — dish + solar styles; style picker unlocked
  - **Zone-choice infrastructure** — `RepairTemplates.zoneChoice()` + `_listenForZoneChoice` / `_waitForToolThenZoneChoice`; reusable for future multi-zone placements
  - Background decorations follow colonisation arc: each fault shows earlier-completed work via `_satelliteDecorationSVG`, `_forestDecorationSVG`, `_cityDecorationSVG`
- **v0.9.0 — Master Mechanic**
  - **Character reactions** — `Reactions` module: blink (scaleY on eye group) on correct tool pick, surprise (scale irises) on spawn, wiggle (1 s rotate on head group) on successful exit; planet raises a white victory flag at the north pole (wiggles before exit); idle blink loop (3–8 s)
  - **CSS particles** — spark burst on drill (absolute-positioned divs), splash droplets on hose wash (blue-white arc)
  - **Colour picker polish** — current vehicle colour prepended as first swatch with inset ring indicator; wiggle completes before exit (driveAway delayed to 1100 ms)
  - Rolling wheel animation on car entry (CCW spin matching slide direction) and exit (continuous spin until DOM removal)
  - Larger wiggle (`wiggle-large`) for person/alien/flag; robot head keeps original ±6° wiggle
  - Tap accessibility: robot boot bolts restructured to 2 non-overlapping rect zones; jetpack strap/flames dynamic tap target; ship antenna enlarged; ship hatch-lid padded with transparent rect
  - Chrome mobile SVG rendering fix: replaced `dominant-baseline="central"` with `dy="0.35em"` on all planet text elements to prevent subpixel snap shifts on repaint
  - Planet tier redistribution: colonisation arc compressed from 70–105 to 70–100 (70→75→79→83→87→91→96→100)
  - **Difficulty scaling** — `difficultySteps` in config.js; multi-fault ramp after tier 100 (30%→50%→100% chance of ≥2 faults; triple-fault chance introduced at 100, dominant at 111)
  - **Ultimate Garage** (tier 111) — uniform 25% spawn probability across all vehicle types; replaces cascading probability chain
  - **Hints off by default** once all content unlocked (coins ≥ 100): `seenFaults` pre-populated at load, manual toggle still works

## Next up

### Game feel

1. **Sensory richness** — remaining layers:
   - Richer audio: longer envelopes, filtered noise, more harmonics (chunky ratchet, whooshy spray, splashy hose)
   - CSS particles: sparks (drill), bubbles (hose), splatter (spray) — absolute-positioned divs with `@keyframes`
2. ✅ **Multi-zone placement** — `RepairTemplates.zoneChoice()` + Picker routing; zones shown simultaneously, player picks one, others dismiss. `applyStickerOrBadge()` accepts zone selector. Applied to city zones; pending: car sticker spots (bumper vs door), forest biomes.
3. **Fault choice** — on multi-fault vehicles, let the player tap a dashboard indicator to pick which fault to fix first. Small change: replace `FaultRegistry.ORDER` sort in `game.js` with a picker UI before `startNextFault()`.
4. ✅ **Difficulty scaling** — `difficultySteps` config array; multi-fault ramp after tier 100; triple-fault cap at 111.

### New content

1. **People doctor** — new vehicle type post-refactor
2. ✅ **Ultimate level** — tier 111 (🌟 Ultimate Garage!); uniform 25% spawn across all vehicle types.

## On hold

- **Car queue** (#3) — soft pressure may not suit a 6yo audience
- **Vehicle combinations** (e.g., robot-spaceship hybrid) — cool but high complexity for uncertain payoff; revisit after people doctor ships

/**
 * Planet repair step logic — planet-specific faults:
 *   fire → extinguish (hose tool, reuses hoseWash template)
 *   forest → plant trees (hand tool, custom 1-step tap)
 *   city → build cities (hand tool, uses zoneChoice template with city emojis)
 */
const PlanetRepair = (() => {

  /** Extinguish fires — hose tool washes away flame patches */
  function extinguish(_car) {
    return RepairTemplates.hoseWash({
      grimeSelector: '.planet__fires',
      grimeWashClass: 'planet__fires--washing',
      grimeHiddenClass: 'planet__fires--hidden',
      bodyParts: [
        { selector: '.planet__body', sparkleClass: 'planet__body--sparkle' },
      ],
    });
  }

  /**
   * Plant forests — single tap when terraforming not yet unlocked;
   * sequential water→plants→animals zone placement once expanded.
   * Prior zone stickers persist visually while subsequent zones are filled —
   * clearHighlights only resets pointer-events, not text content or
   * sticker-zone--applied, so no extra persistence code is needed.
   */
  function plantForests(_car) {
    if (!GameState.get('terraformExpanded')) {
      return [{
        id: 'plant-trees',
        description: 'Tap the barren patches to plant forests',
        target: '.planet__forests',
        tool: 'hand',
        sound: 'tap',
        action: (_el, carEl) => {
          carEl.querySelectorAll('.planet__barren-patch').forEach(p => {
            p.classList.add('planet__barren-patch--planted');
          });
          carEl.querySelectorAll('.planet__tree').forEach(t => {
            t.classList.add('planet__tree--grown');
          });
        },
      }];
    }

    // Expanded: 3 sequential ecological restoration zones
    const categories = [
      { id: 'terraform-water',   target: '.planet__terraform-zone--0', pickerItems: CONFIG.terraformWaterStickers,   desc: 'Tap the ocean zone to fill it with water' },
      { id: 'terraform-plants',  target: '.planet__terraform-zone--1', pickerItems: CONFIG.terraformPlantsStickers,  desc: 'Tap the land zone to seed plant life' },
      { id: 'terraform-animals', target: '.planet__terraform-zone--2', pickerItems: CONFIG.terraformAnimalsStickers, desc: 'Tap the wildlife zone to introduce animals' },
    ];
    const steps = categories.map(({ id, target, pickerItems, desc }, i) => ({
      id,
      description: desc,
      target,
      ...(i === 0 ? { tool: 'hand' } : {}),  // tool required on step 0 only (satellite pattern)
      sound: 'tap',
      picker: 'terraform',
      pickerItems,
      action: () => {},  // applyStickerOrBadge in dispatchPicker handles sticker placement
    }));

    steps.push({
      id: 'terraform-colour',
      description: 'Tap the planet to choose its colour',
      target: '.planet__body',
      sound: 'tap',
      picker: 'colour',
      action: (_el, carEl) => {
        const body = carEl.querySelector('.planet__body');
        if (body) {
          body.classList.add('planet__body--colour-flash');
          setTimeout(() => body.classList.remove('planet__body--colour-flash'), 600);
        }
      },
    });

    return steps;
  }

  /** Build cities — jack (crane) tool + zone-choice picker, tap any zone to place a city */
  function buildCities(_car) {
    const expanded = GameState.get('cityExpanded');
    const zones = expanded
      ? ['.planet__city-zone--0', '.planet__city-zone--1', '.planet__city-zone--2']
      : ['.planet__city-zone--0'];
    return RepairTemplates.zoneChoice({
      id: 'pick-city',
      description: 'Select the crane and tap a building zone',
      zones,
      tool: 'jack',
      picker: 'planetCity',
    });
  }

  /** Clean ocean — hose tool washes away oil-slick patches */
  function cleanOcean(_car) {
    return RepairTemplates.hoseWash({
      grimeSelector: '.planet__ocean-spill',
      grimeWashClass: 'planet__ocean-spill--washing',
      grimeHiddenClass: 'planet__ocean-spill--hidden',
      bodyParts: [
        { selector: '.planet__body', sparkleClass: 'planet__body--ocean-clean' },
      ],
    });
  }

  /**
   * Asteroid defence — tap 4 approaching meteors before they hit.
   * Returns a single step with a setup() hook so all meteors are tappable
   * concurrently in any order.  Each meteor gets its own timeout derived from
   * its CSS animation delay + travel duration.  Missed meteors reveal a crater +
   * fire at the impact site (visual only — no new fault steps).  If any meteor is
   * missed, asteroidFailed is set on the car element and no coins are awarded.
   */
  function asteroidDefence(_car) {
    return [{
      id: 'asteroid-defence',
      sound: null,
      action: () => {},
      /**
       * @param {HTMLElement} carEl
       * @param {Function} done — called once all meteors are resolved
       */
      setup: (carEl, done) => {
        const count = carEl.querySelectorAll('.planet__meteor-group').length || 4;
        let resolved = 0;
        let missCount = 0;
        const zone = carEl.querySelector('.planet__asteroid-zone');  // cached once
        const tapListeners = new Array(count).fill(null);            // for miss-path cleanup

        // Mark one meteor resolved; fire done() when all are settled.
        const handleMeteor = (i, hit) => {
          const meteorEl = carEl.querySelector(`.planet__meteor-group--${i}`);
          if (meteorEl?.dataset.resolved) return;
          if (meteorEl) meteorEl.dataset.resolved = '1';

          // Clean up tap listener regardless of hit/miss (miss path won't self-remove)
          if (tapListeners[i]) {
            meteorEl?.removeEventListener('pointerdown', tapListeners[i]);
            tapListeners[i] = null;
          }

          if (hit) {
            Audio.play('tap');
            carEl.querySelector(`.planet__laser--${i}`)?.classList.add('planet__laser--active');
            // Freeze the approach animation at its current position before
            // switching to the explode animation, so the meteor doesn't jump
            // to the planet surface (--meteor-dx/dy) mid-flight.
            if (meteorEl) {
              const frozen = getComputedStyle(meteorEl).transform;
              meteorEl.style.animation = 'none';
              meteorEl.style.transform = frozen;
              meteorEl.offsetWidth; // force reflow
            }
            meteorEl?.classList.add('planet__meteor-group--destroyed');
          } else {
            carEl.querySelector(`.planet__impact-site--${i}`)?.classList.add('planet__impact-site--active');
            meteorEl?.classList.add('planet__meteor-group--impact');
            missCount++;
          }

          resolved++;
          if (resolved === count) {
            if (missCount > 0) carEl.dataset.asteroidFailed = '1';
            if (zone) setTimeout(() => zone.classList.add('planet__asteroid-zone--hidden'), 500);
            done();
          }
        };

        for (let i = 0; i < count; i++) {
          const meteorEl = carEl.querySelector(`.planet__meteor-group--${i}`);
          if (!meteorEl) { handleMeteor(i, true); continue; }  // missing = auto-hit

          const delay = parseFloat(meteorEl.dataset.delay || 0);
          // 4s = CSS meteor-approach animation duration; 0.5s = grace window after landing
          const timeout = Math.round((delay + 4 + 0.5) * 1000);

          // Per-meteor miss timeout
          const timer = setTimeout(() => {
            if (!carEl.isConnected) return;
            handleMeteor(i, false);
          }, timeout);

          // Direct tap — bypasses Picker; named fn stored so miss path can remove it too
          tapListeners[i] = function onTap() {
            clearTimeout(timer);
            meteorEl.removeEventListener('pointerdown', onTap);
            tapListeners[i] = null;
            if (!carEl.isConnected) return;
            handleMeteor(i, true);
          };
          meteorEl.addEventListener('pointerdown', tapListeners[i]);
        }
      },
    }];
  }

  /**
   * Satellite network — optional warehouse + style picker, then select the
   * wrench and tap all 3 broken satellites in any order.  Concurrent setup()
   * hook mirrors asteroidDefence: tool selection and per-satellite listeners
   * are managed inside setup() because setup steps bypass Picker's normal
   * tool-wait flow.  Orbit glows once all three are fixed.
   */
  function satelliteNetwork(_car) {
    const styles = GameState.get('satelliteStyles') || ['standard'];
    const steps = [];

    // Only show warehouse + picker when multiple satellite styles are unlocked
    if (styles.length > 1) {
      steps.push({
        id: 'grab-satellite',
        description: 'Grab a satellite part from the warehouse',
        warehouse: 'satellite',
        picker: 'satellite',
        target: '.planet__satellite--0',
        sound: 'pop',
        action: (_targetEl, carEl, picked) => {
          // Apply chosen style to all 3 satellite visuals before repair
          if (picked && picked !== 'standard') {
            for (let i = 0; i < 3; i++) {
              const sat = carEl.querySelector(`.planet__satellite--${i}`);
              if (sat) Planet.applySatelliteStyle(sat, picked);
            }
          }
        },
      });
    }

    const count = 3;

    steps.push({
      id: 'fix-satellites',
      description: 'Select the wrench and tap all 3 satellites to repair them',
      sound: null,
      action: () => {},
      setup: (carEl, done) => {
        let fixed = 0;

        /** Animate tilt to 0, mark fixed, check completion */
        function fixSat(el) {
          el.classList.remove('planet__satellite--broken');
          el.classList.add('planet__satellite--fixed');
          el.classList.remove('hint-glow');
          const tilt = parseFloat(el.dataset.tilt) || 0;
          if (tilt) {
            const base = el.getAttribute('transform').replace(/\s*rotate\([^)]*\)/, '');
            let start = null;
            const duration = 600;
            function animStep(ts) {
              if (!start) start = ts;
              const t = Math.min((ts - start) / duration, 1);
              const ease = 1 - Math.pow(1 - t, 3);
              el.setAttribute('transform', `${base} rotate(${tilt * (1 - ease)})`);
              if (t < 1) requestAnimationFrame(animStep);
            }
            requestAnimationFrame(animStep);
          }
          const spark = el.querySelector('.planet__sat-spark');
          if (spark) spark.style.display = 'none';
          fixed++;
          if (fixed === count) {
            carEl.querySelector('.planet__sat-orbit')?.classList.add('planet__sat-orbit--complete');
            done();
          }
        }

        /** Enable all satellite tap targets simultaneously */
        function enableSatellites() {
          for (let i = 0; i < count; i++) {
            const satEl = carEl.querySelector(`.planet__satellite--${i}`);
            if (!satEl) {
              // Missing element — auto-resolve this slot
              fixed++;
              if (fixed === count) {
                carEl.querySelector('.planet__sat-orbit')?.classList.add('planet__sat-orbit--complete');
                done();
              }
              continue;
            }
            if (GameState.hintsOn()) satEl.classList.add('hint-glow');
            satEl.style.pointerEvents = 'auto';
            // Named function so the listener cleans itself up on tap
            (function attach(el) {
              function handler(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!carEl.isConnected) return;
                el.removeEventListener('click', handler);
                el.removeEventListener('touchend', handler);
                el.style.pointerEvents = 'none';
                Audio.play('ratchet');
                fixSat(el);
              }
              el.addEventListener('click', handler);
              el.addEventListener('touchend', handler);
            })(satEl);
          }
        }

        // Show toolbox with wrench hint; wait for correct tool before enabling satellites
        Picker.showToolbox('wrench');
        const toolbox = document.getElementById('toolbox');

        function onToolClick(e) {
          const toolEl = e.target.closest('.toolbox__tool');
          if (!toolEl) return;
          e.preventDefault();
          if (toolEl.dataset.tool === 'wrench') {
            Audio.play('tap');
            toolbox.removeEventListener('click', onToolClick);
            toolbox.removeEventListener('touchend', onToolClick);
            toolEl.classList.remove('toolbox__tool--hint');
            toolEl.classList.add('toolbox__tool--selected');
            enableSatellites();
          } else {
            toolEl.classList.add('toolbox__tool--wrong');
            setTimeout(() => toolEl.classList.remove('toolbox__tool--wrong'), 400);
          }
        }

        toolbox.addEventListener('click', onToolClick);
        toolbox.addEventListener('touchend', onToolClick);
      },
    });

    return steps;
  }

  /**
   * Tectonic volcanic — seal 3 magma cracks, then cap 2 eruptions.
   * Removes planet tremor once all faults are resolved.
   */
  function tectonicRepair(_car) {
    const steps = [];

    for (let i = 0; i < 3; i++) {
      steps.push({
        id: `seal-crack-${i}`,
        target: `.planet__magma-crack--${i}`,
        ...(i === 0 ? { tool: 'drill' } : {}),
        sound: 'tap',
        action: (el) => {
          el.classList.add('planet__magma-crack--sealed');
        },
      });
    }

    for (let i = 0; i < 2; i++) {
      steps.push({
        id: `cap-volcano-${i}`,
        target: `.planet__eruption--${i}`,
        sound: 'tap',
        action: (el, carEl) => {
          el.classList.add('planet__eruption--capped');
          const remainingCracks = carEl.querySelectorAll('.planet__magma-crack:not(.planet__magma-crack--sealed)');
          const remainingVolcanos = carEl.querySelectorAll('.planet__eruption:not(.planet__eruption--capped)');
          if (!remainingCracks.length && remainingVolcanos.length <= 1) {
            const svg = carEl.querySelector('.planet__svg');
            if (svg) svg.classList.remove('planet__svg--tremor');
          }
        },
      });
    }

    return steps;
  }

  return { extinguish, plantForests, buildCities, cleanOcean, asteroidDefence, satelliteNetwork, tectonicRepair };
})();

/**
 * Spaceship repair step logic — base faults use RepairTemplates with ship-specific selectors.
 * Maps the 5 generic fault keys to space-themed repairs:
 *   flatTyre → brokenWing, engine → booster, paint → hullDamage,
 *   sticker → emblem, wash → spaceDust.
 * Same step format as Repair / RobotRepair.
 */
const SpaceshipRepair = (() => {

  /** Broken wing — unbolt, lift on crane, swap wing, bolt, lower */
  function brokenWing(car) {
    const wingSelector = `.ship__wing--${car.flatWing}`;

    return RepairTemplates.boltSwap({
      partSelector: wingSelector,
      fastenerName: 'bolt',
      fastenerClass: 'ship__bolt',
      fastenerAction: (mode) => (el) => {
        const circle = el.querySelector('circle:not(.ship__bolt-halo)');
        if (circle) {
          const cx = circle.getAttribute('cx');
          const cy = circle.getAttribute('cy');
          el.style.transformOrigin = `${cx}px ${cy}px`;
        }
        if (mode === 'loosen') {
          el.classList.add('ship__bolt--loose');
        } else {
          el.style.transform = '';
          el.classList.remove('ship__bolt--loose');
          el.classList.add('ship__bolt--tight');
          setTimeout(() => el.classList.remove('ship__bolt--tight'), 350);
        }
      },
      liftId: 'lift-pad-up',
      liftDesc: 'Drag the crane up to raise the ship',
      liftSelector: '.ship__lift-pad',
      liftRaisedClass: 'ship__lift-pad--raised',
      removeId: 'remove-wing',
      removeDesc: 'Pull the broken wing off',
      removeAction: (el) => {
        el.classList.add('ship__wing--removed');
        el.querySelectorAll('.ship__bolt').forEach(b => b.classList.add('ship__bolt--hidden'));
      },
      addId: 'add-new-wing',
      addDesc: 'Grab the new wing from the shelf',
      warehousePart: 'wing',
      addAction: (el) => {
        el.classList.remove('ship__wing--removed', 'ship__wing--broken');
        el.classList.add('ship__wing--new');
        el.querySelectorAll('.ship__bolt').forEach(b => {
          b.classList.remove('ship__bolt--hidden');
          b.style.transform = 'scale(1.7)';
        });
      },
      lowerId: 'lower-pad',
      lowerDesc: 'Lower the crane',
    });
  }

  /** Dead booster — open hatch, remove sparking booster, insert new, close */
  function booster(_car) {
    return RepairTemplates.panelSwap({
      panelSelector: '.ship__hatch',
      panelOpenClass: 'ship__hatch--open',
      baySelector: '.ship__booster-bay',
      bayVisibleClass: 'ship__booster-bay--visible',
      partSelector: '.ship__booster',
      brokenClass: 'ship__booster--broken',
      removedClass: 'ship__booster--removed',
      newClass: 'ship__booster--new',
      panelLidSelector: '.ship__hatch-lid',
      effectSelector: '.ship__smoke',
      effectClearClass: 'ship__smoke--clearing',
      effectHiddenClass: 'ship__smoke--hidden',
      effectDelay: 400,
      warehousePart: 'engine',
    });
  }

  /** Hull damage — spray tool, colour picker */
  function hullDamage(_car) {
    return RepairTemplates.spray({
      damageSelector: '.ship__hull-damage',
      damageHiddenClass: 'ship__hull-damage--hidden',
      bodyParts: [
        { selector: '.ship__hull-body', freshClass: 'ship__hull--fresh' },
        { selector: '.ship__cockpit', freshClass: 'ship__cockpit--fresh' },
      ],
    });
  }

  /** Emblem — 1 step: choose from 3 zones */
  function emblem(_car) {
    return RepairTemplates.zoneChoice({
      id: 'pick-sticker',
      description: 'Select a spot and place an emblem',
      zones: ['.ship__emblem-zone--0', '.ship__emblem-zone--1', '.ship__emblem-zone--2'],
      tool: 'hand',
      picker: 'sticker',
    });
  }

  /** Space dust — hose wash */
  function spaceDust(_car) {
    return RepairTemplates.hoseWash({
      grimeSelector: '.ship__dust',
      grimeWashClass: 'ship__dust--washing',
      grimeHiddenClass: 'ship__dust--hidden',
      bodyParts: [
        { selector: '.ship__hull-body', sparkleClass: 'ship__hull--sparkle' },
        { selector: '.ship__cockpit', sparkleClass: 'ship__cockpit--sparkle' },
      ],
    });
  }

  /* ─── Upgrade faults (spaceship-only) ─── */

  /** Laser cannons — grab from warehouse (pick style), wrench to attach, tap to test fire */
  function laser(_car) {
    return [
      {
        id: 'grab-laser',
        description: 'Grab a laser cannon from the warehouse',
        warehouse: 'laser',
        picker: 'laser',
        target: '.ship__laser',
        sound: 'pop',
        action: (_el, carEl, picked) => {
          const style = picked || 'plasma';
          Spaceship.replaceLaser(carEl, style);
        },
      },
      {
        id: 'attach-laser',
        description: 'Bolt the laser cannons on with a wrench',
        target: '.ship__laser',
        tool: 'wrench',
        sound: 'ratchet',
        action: (_el, carEl) => {
          carEl.querySelectorAll('.ship__laser').forEach(l => {
            l.classList.add('ship__laser--aligned');
          });
        },
      },
      {
        id: 'test-fire',
        description: 'Tap to test fire the lasers',
        target: '.ship__laser',
        sound: 'tap',
        action: (_el, carEl) => {
          carEl.querySelectorAll('.ship__laser').forEach(l => {
            l.classList.add('ship__laser--active');
          });
          carEl.querySelectorAll('.ship__laser-beam').forEach(b => {
            b.classList.add('ship__laser-beam--firing');
            setTimeout(() => b.classList.remove('ship__laser-beam--firing'), 1200);
          });
        },
      },
    ];
  }

  /** Shield generator — open panel (drag up), grab crystal (pick style), close panel (drag down) */
  function shield(_car) {
    return [
      {
        id: 'open-shield-panel',
        description: 'Drag the shield panel open',
        target: '.ship__shield-panel',
        tool: 'hand',
        drag: { direction: 'up', threshold: 25 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.add('ship__shield-panel--open');
          const bay = carEl.querySelector('.ship__crystal-bay');
          if (bay) bay.classList.remove('ship__crystal-bay--hidden');
        },
      },
      {
        id: 'insert-crystal',
        description: 'Grab a shield crystal from the warehouse',
        warehouse: 'crystal',
        picker: 'shield',
        target: '.ship__crystal-bay',
        sound: 'pop',
        action: (el, carEl, picked) => {
          const style = picked || 'ruby';
          Spaceship.applyShield(carEl, style);
          el.classList.add('ship__crystal-bay--installed');
          const fault = carEl.querySelector('.ship__shield-fault');
          if (fault) fault.classList.add('ship__shield-fault--hidden');
        },
      },
      {
        id: 'close-shield-panel',
        description: 'Close the panel to activate the shield',
        target: '.ship__shield-panel',
        tool: 'hand',
        drag: { direction: 'down', threshold: 25 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.remove('ship__shield-panel--open');
          const bay = carEl.querySelector('.ship__crystal-bay');
          if (bay) bay.classList.add('ship__crystal-bay--hidden');
          carEl.querySelectorAll('.ship__shield-bubble').forEach(b => {
            b.classList.remove('ship__shield-bubble--broken');
            b.classList.add('ship__shield-bubble--active');
          });
        },
      },
    ];
  }

  /** Antenna array — drag up to extend mast, wrench to lock, tap to test signal */
  function antenna(_car) {
    return [
      {
        id: 'extend-mast',
        description: 'Drag up to extend the antenna mast',
        tool: 'hand',
        drag: { direction: 'up', threshold: 25 },
        target: '.ship__antenna-mast',
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.querySelectorAll('.ship__antenna-mast-bar').forEach(b => {
            b.classList.remove('ship__antenna-mast-bar--collapsed');
            b.classList.add('ship__antenna-mast-bar--extended');
          });
        },
      },
      {
        id: 'lock-mast',
        description: 'Lock the mast in place with a wrench',
        target: '.ship__antenna-mast',
        tool: 'wrench',
        sound: 'ratchet',
        action: (_el, carEl) => {
          const dish = carEl.querySelector('.ship__antenna-dish');
          if (dish) {
            dish.classList.remove('ship__antenna-dish--misaligned');
            dish.classList.add('ship__antenna-dish--aligned');
          }
        },
      },
      {
        id: 'test-signal',
        description: 'Tap the dish to test the signal',
        target: '.ship__antenna-dish',
        sound: 'tap',
        action: (_el, carEl) => {
          const rings = carEl.querySelector('.ship__antenna-signal');
          if (rings) {
            rings.classList.remove('ship__antenna-signal--dead');
            rings.classList.add('ship__antenna-signal--active');
          }
          const dmg = carEl.querySelector('.ship__antenna-damage');
          if (dmg) dmg.classList.add('ship__antenna-damage--hidden');
        },
      },
    ];
  }

  return { brokenWing, booster, hullDamage, emblem, spaceDust, laser, shield, antenna };
})();

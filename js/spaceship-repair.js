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

  /** Emblem — hand tool, emoji picker */
  function emblem(_car) {
    return RepairTemplates.stickerApply({
      zoneSelector: '.ship__emblem-zone',
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

  /** Laser cannons — install emitters, align beam, test fire */
  function laser(_car) {
    return [
      {
        id: 'install-emitter',
        description: 'Grab the laser emitter from the warehouse',
        warehouse: 'emitter',
        tool: 'hand',
        target: '.ship__laser',
        sound: 'pop',
        action: (el, carEl) => {
          carEl.querySelectorAll('.ship__laser').forEach(l => {
            l.classList.remove('ship__laser--broken');
            l.classList.add('ship__laser--installed');
          });
        },
      },
      {
        id: 'align-beam',
        description: 'Drag to align the laser beam',
        tool: 'hand',
        drag: { direction: 'left', threshold: 25 },
        target: '.ship__laser',
        sound: 'clank',
        action: (el, carEl) => {
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
        action: (el, carEl) => {
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

  /** Shield generator — open panel, insert crystal, calibrate bubble */
  function shield(_car) {
    return [
      {
        id: 'open-shield-panel',
        description: 'Tap the shield panel to open it',
        target: '.ship__shield-panel',
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
        tool: 'hand',
        target: '.ship__crystal-bay',
        sound: 'pop',
        action: (el, carEl) => {
          el.classList.add('ship__crystal-bay--installed');
          const fault = carEl.querySelector('.ship__shield-fault');
          if (fault) fault.classList.add('ship__shield-fault--hidden');
        },
      },
      {
        id: 'calibrate-shield',
        description: 'Drag up to calibrate the shield bubble',
        tool: 'hand',
        drag: { direction: 'up', threshold: 30 },
        target: '.ship__shield-bubble',
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.remove('ship__shield-bubble--broken');
          el.classList.add('ship__shield-bubble--active');
          const panel = carEl.querySelector('.ship__shield-panel');
          if (panel) panel.classList.remove('ship__shield-panel--open');
        },
      },
    ];
  }

  return { brokenWing, booster, hullDamage, emblem, spaceDust, laser, shield };
})();

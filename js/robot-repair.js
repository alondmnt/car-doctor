/**
 * Robot repair step logic — defines multi-step repair sequences.
 * Mirrors Repair.* but uses .robot__* selectors and robot-flavoured actions.
 * Same step format: { id, target, action, sound, tool?, drag?, warehouse?, picker?, hintArrow? }
 */
const RobotRepair = (() => {

  /* ─── Helpers ─── */

  /** Generate bolt screw steps for a boot (tyre equivalent) */
  function _boltSteps(bootSelector, mode) {
    return [1, 2, 3].map(n => ({
      id: `${mode}-bolt-${n}`,
      description: `Tap bolt ${n} to ${mode} it`,
      target: `${bootSelector} .robot__bolt--${n}`,
      tool: 'drill',
      sound: 'ratchet',
      action: (el) => {
        if (mode === 'loosen') {
          el.classList.add('robot__bolt--loose');
        } else {
          el.classList.remove('robot__bolt--loose');
          el.classList.add('robot__bolt--tight');
          setTimeout(() => el.classList.remove('robot__bolt--tight'), 300);
        }
      },
    }));
  }

  /* ─── Base faults (1:1 car mapping) ─── */

  /** Broken boot — unbolt, lift on pad, swap boot, bolt, lower */
  function brokenBoot(car) {
    const bootSelector = `.robot__boot--${car.flatBoot}`;

    return [
      ..._boltSteps(bootSelector, 'loosen'),
      {
        id: 'lift-pad-up',
        description: 'Drag the lift pad up to raise the robot',
        target: '.robot__lift-pad',
        tool: 'jack',
        hintArrow: 'up',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.add('car--jacked');
          _el.classList.add('robot__lift-pad--raised');
        },
      },
      {
        id: 'remove-boot',
        description: 'Pull the broken boot off',
        target: bootSelector,
        tool: 'hand',
        drag: { direction: 'down', threshold: 30 },
        sound: 'pop',
        action: (el) => {
          el.classList.add('robot__boot--removed');
          el.querySelectorAll('.robot__bolt').forEach(b => b.classList.add('robot__bolt--hidden'));
        },
      },
      {
        id: 'add-new-boot',
        description: 'Grab the new boot from the warehouse',
        warehouse: 'boot',
        target: bootSelector,
        sound: 'pop',
        action: (el) => {
          el.classList.remove('robot__boot--removed', 'robot__boot--flat');
          el.classList.add('robot__boot--new');
          el.querySelectorAll('.robot__bolt').forEach(b => {
            b.classList.remove('robot__bolt--hidden', 'robot__bolt--loose');
          });
        },
      },
      ..._boltSteps(bootSelector, 'tighten'),
      {
        id: 'lower-pad',
        description: 'Lower the lift pad',
        target: '.robot__lift-pad',
        tool: 'jack',
        hintArrow: 'down',
        drag: { direction: 'down', threshold: 30 },
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.remove('car--jacked');
          _el.classList.remove('robot__lift-pad--raised');
        },
      },
    ];
  }

  /** Dead power core — open chest panel, remove sparking core, insert new, close */
  function powerCore(_car) {
    return [
      {
        id: 'open-chest',
        description: 'Open the chest panel',
        target: '.robot__chest-panel',
        tool: 'hand',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.add('robot__chest-panel--open');
          carEl.querySelector('.robot__power-core-bay').classList.add('robot__power-core-bay--visible');
        },
      },
      {
        id: 'remove-core',
        description: 'Pull the sparking power core out',
        target: '.robot__power-core',
        tool: 'wrench',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.remove('robot__power-core--broken');
          el.classList.add('robot__power-core--removed');
          const sparks = carEl.querySelector('.robot__sparks');
          if (sparks) {
            sparks.classList.add('robot__sparks--clearing');
            setTimeout(() => sparks.classList.add('robot__sparks--hidden'), 400);
          }
        },
      },
      {
        id: 'add-core',
        description: 'Grab the new power core from the warehouse',
        warehouse: 'engine',
        target: '.robot__power-core',
        sound: 'pop',
        action: (el) => {
          el.classList.remove('robot__power-core--removed');
          el.classList.add('robot__power-core--new');
        },
      },
      {
        id: 'close-chest',
        description: 'Close the chest panel',
        target: '.robot__chest-panel-lid',
        tool: 'hand',
        drag: { direction: 'down', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          const panel = carEl.querySelector('.robot__chest-panel');
          panel.classList.remove('robot__chest-panel--open');
          carEl.querySelector('.robot__power-core-bay').classList.remove('robot__power-core-bay--visible');
          carEl.querySelector('.robot__power-core').classList.remove('robot__power-core--new');
        },
      },
    ];
  }

  /** Dented plating — spray tool, colour picker → plating repaired */
  function plating(_car) {
    return [
      {
        id: 'spray-plating',
        description: 'Select the spray tool and tap the dents',
        target: '.robot__plating-damage',
        tool: 'spray',
        sound: 'tap',
        picker: 'colour',
        action: (_el, carEl) => {
          const damage = carEl.querySelector('.robot__plating-damage');
          if (damage) damage.classList.add('robot__plating-damage--hidden');
          const torso = carEl.querySelector('.robot__torso-box');
          const head = carEl.querySelector('.robot__head-box');
          if (torso) torso.classList.add('robot__torso--fresh');
          if (head) head.classList.add('robot__head--fresh');
          setTimeout(() => {
            if (torso) torso.classList.remove('robot__torso--fresh');
            if (head) head.classList.remove('robot__head--fresh');
          }, 600);
        },
      },
    ];
  }

  /** Badge/emblem — hand tool, emoji picker */
  function badge(_car) {
    return [
      {
        id: 'pick-badge',
        description: 'Select hand tool and tap badge zone',
        target: '.robot__badge-zone',
        tool: 'hand',
        sound: 'tap',
        picker: 'sticker',
        action: () => {},
      },
    ];
  }

  /** Oil grime — hose wash */
  function oilGrime(_car) {
    return [
      {
        id: 'wash-robot',
        description: 'Select the hose and tap the oil grime',
        target: '.robot__grime',
        tool: 'hose',
        sound: 'splash',
        action: (_el, carEl) => {
          const grime = carEl.querySelector('.robot__grime');
          if (grime) {
            grime.classList.add('robot__grime--washing');
            setTimeout(() => grime.classList.add('robot__grime--hidden'), 800);
          }
          const torso = carEl.querySelector('.robot__torso-box');
          const head = carEl.querySelector('.robot__head-box');
          if (torso) torso.classList.add('robot__torso--sparkle');
          if (head) head.classList.add('robot__head--sparkle');
          setTimeout(() => {
            if (torso) torso.classList.remove('robot__torso--sparkle');
            if (head) head.classList.remove('robot__head--sparkle');
          }, 800);
        },
      },
    ];
  }

  /* ─── Upgrade faults (robot-only) ─── */

  /** Arm joint — grab new joint, bolt it on with wrench, test arm movement */
  function armJoint(_car) {
    return [
      {
        id: 'grab-joint',
        description: 'Grab a new arm joint from the warehouse',
        warehouse: 'joint',
        picker: 'arm',
        target: '.robot__arm--left',
        sound: 'pop',
        action: (el, _carEl, picked) => {
          // Replace left arm with chosen style
          const style = picked || 'standard';
          el.outerHTML = Robot.replacementArmSVG(style);
        },
      },
      {
        id: 'bolt-joint',
        description: 'Bolt the joint on with a wrench',
        target: '.robot__arm--left',
        tool: 'wrench',
        sound: 'ratchet',
        action: (el, carEl) => {
          const dmg = carEl.querySelector('.robot__arm-damage');
          if (dmg) dmg.classList.add('robot__arm-damage--hidden');
        },
      },
      {
        id: 'test-arm',
        description: 'Tap the arm to test movement',
        target: '.robot__arm--left',
        sound: 'tap',
        action: (el) => {
          el.classList.add('robot__arm--test');
          setTimeout(() => el.classList.remove('robot__arm--test'), 600);
        },
      },
    ];
  }

  /** Legs repair — wrench to loosen knee bolt, drag leg up to straighten, re-tighten */
  function legsRepair(_car) {
    return [
      {
        id: 'loosen-knee',
        description: 'Loosen the knee bolt with a wrench',
        target: '.robot__leg--left',
        tool: 'wrench',
        sound: 'ratchet',
        action: (el, carEl) => {
          const dmg = carEl.querySelector('.robot__leg-damage');
          if (dmg) dmg.classList.add('robot__leg-damage--hidden');
        },
      },
      {
        id: 'straighten-leg',
        description: 'Drag the leg up to straighten it',
        target: '.robot__leg--left',
        tool: 'hand',
        drag: { direction: 'up', threshold: 25 },
        sound: 'clank',
        action: (el) => {
          el.classList.remove('robot__leg--bent');
        },
      },
      {
        id: 'tighten-knee',
        description: 'Tighten the knee bolt',
        target: '.robot__leg--left',
        tool: 'wrench',
        sound: 'ratchet',
        action: (el) => {
          el.classList.add('robot__leg--fixed');
          setTimeout(() => el.classList.remove('robot__leg--fixed'), 400);
        },
      },
    ];
  }

  /** Voice module — open chest, insert chip, close. Speech bubble on completion. */
  function voiceModule(_car) {
    return [
      {
        id: 'open-chest-voice',
        description: 'Open the chest panel',
        target: '.robot__chest-panel',
        tool: 'hand',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.add('robot__chest-panel--open');
          const slot = carEl.querySelector('.robot__voice-slot');
          if (slot) slot.classList.remove('robot__voice-slot--hidden');
        },
      },
      {
        id: 'insert-voice-chip',
        description: 'Grab the voice chip from the warehouse',
        warehouse: 'chip',
        target: '.robot__voice-slot',
        sound: 'pop',
        action: (el, carEl) => {
          el.classList.add('robot__voice-slot--installed');
          // Hide voice fault indicator
          const vf = carEl.querySelector('.robot__voice-fault');
          if (vf) vf.classList.add('robot__voice-fault--hidden');
          // Show speech bubble
          const bubble = carEl.querySelector('.robot__speech-bubble');
          if (bubble) {
            bubble.classList.remove('robot__speech-bubble--hidden');
            bubble.classList.add('robot__speech-bubble--visible');
          }
        },
      },
      {
        id: 'close-chest-voice',
        description: 'Close the chest panel',
        target: '.robot__chest-panel-lid',
        tool: 'hand',
        drag: { direction: 'down', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          const panel = carEl.querySelector('.robot__chest-panel');
          panel.classList.remove('robot__chest-panel--open');
          const slot = carEl.querySelector('.robot__voice-slot');
          if (slot) slot.classList.add('robot__voice-slot--hidden');
        },
      },
    ];
  }

  /** Jetpack install — grab from warehouse, wrench to attach. Flames on success. */
  function jetpack(_car) {
    return [
      {
        id: 'grab-jetpack',
        description: 'Grab the jetpack from the warehouse',
        warehouse: 'jetpack',
        target: '.robot__jetpack',
        sound: 'pop',
        action: (_el, carEl) => {
          carEl.querySelectorAll('.robot__jetpack').forEach(g => {
            g.classList.remove('robot__jetpack--hidden');
            g.classList.add('robot__jetpack--visible');
          });
          // Hide mounting brackets
          const mount = carEl.querySelector('.robot__jetpack-mount');
          if (mount) mount.classList.add('robot__jetpack-mount--hidden');
        },
      },
      {
        id: 'attach-jetpack',
        description: 'Bolt the jetpack on with a wrench',
        target: '.robot__jetpack',
        tool: 'wrench',
        sound: 'ratchet',
        action: (_el, carEl) => {
          const flames = carEl.querySelector('.robot__jetpack-flames');
          if (flames) {
            flames.classList.remove('robot__jetpack-flames--hidden');
            flames.classList.add('robot__jetpack-flames--active');
            // Turn off flames after celebration
            setTimeout(() => flames.classList.remove('robot__jetpack-flames--active'), 1500);
          }
        },
      },
    ];
  }

  return { brokenBoot, powerCore, plating, badge, oilGrime,
           armJoint, legsRepair, voiceModule, jetpack };
})();

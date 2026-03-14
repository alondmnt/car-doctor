/**
 * Robot repair step logic — base faults use RepairTemplates with robot-specific selectors.
 * Upgrade faults (armJoint, legsRepair, voiceModule, jetpack) are robot-only.
 * Same step format: { id, target, action, sound, tool?, drag?, warehouse?, picker?, hintArrow? }
 */
const RobotRepair = (() => {

  /* ─── Voice module languages ─── */

  const VOICE_LANGUAGES = {
    '🇦🇺': { sentences: ["G'day!", "No worries!", "How ya going?"] },
    '🇮🇳': { sentences: ["नमस्ते!", "चलो!", "बहुत अच्छा!"] },
    '🇹🇭': { sentences: ["สวัสดี!", "สบายดี!", "ไปเลย!"] },
    '🇨🇳': { sentences: ["你好！", "嗨！", "加油！"] },
    '🇯🇵': { sentences: ["やあ！", "元気？", "よろしく！"] },
    '🇮🇱': { sentences: ["!שלום", "!יאללה", "?מה קורה"] },
    '🇸🇦': { sentences: ["!مرحبا", "!يلا", "؟كيف حالك"] },
  };
  const VOICE_FLAGS = Object.keys(VOICE_LANGUAGES);

  /** Pick a random sentence for a flag */
  function _randomSentence(flag) {
    const lang = VOICE_LANGUAGES[flag];
    if (!lang) return '🗣️';
    return lang.sentences[Math.floor(Math.random() * lang.sentences.length)];
  }

  /* ─── Base faults (via RepairTemplates) ─── */

  /** Broken boot — unbolt, lift on crane, swap boot, bolt, lower */
  function brokenBoot(car) {
    const bootSelector = `.robot__boot--${car.flatBoot}`;

    return RepairTemplates.boltSwap({
      partSelector: bootSelector,
      fastenerName: 'bolt',
      fastenerClass: 'robot__bolt',
      fastenerAction: (mode) => (el) => {
        // Set transform-origin from bolt circle centre (CSS fill-box unreliable inside transformed parent)
        const circle = el.querySelector('circle:not(.robot__bolt-halo)');
        if (circle) {
          const cx = circle.getAttribute('cx');
          const cy = circle.getAttribute('cy');
          el.style.transformOrigin = `${cx}px ${cy}px`;
        }
        if (mode === 'loosen') {
          el.classList.add('robot__bolt--loose');
        } else {
          el.style.transform = '';  // clear inline scale so animation takes over
          el.classList.remove('robot__bolt--loose');
          el.classList.add('robot__bolt--tight');
          setTimeout(() => el.classList.remove('robot__bolt--tight'), 350);
        }
      },
      liftId: 'lift-pad-up',
      liftDesc: 'Drag the lift pad up to raise the robot',
      liftSelector: '.robot__lift-pad',
      liftRaisedClass: 'robot__lift-pad--raised',
      removeId: 'remove-boot',
      removeDesc: 'Pull the broken boot off',
      removeAction: (el) => {
        el.classList.add('robot__boot--removed');
        el.querySelectorAll('.robot__bolt').forEach(b => b.classList.add('robot__bolt--hidden'));
      },
      addId: 'add-new-boot',
      addDesc: 'Grab the new boot from the warehouse',
      warehousePart: 'boot',
      addAction: (el) => {
        el.classList.remove('robot__boot--removed', 'robot__boot--flat');
        el.classList.add('robot__boot--new');
        el.querySelectorAll('.robot__bolt').forEach(b => {
          b.classList.remove('robot__bolt--hidden');
          // Keep bolts visually enlarged (loose) until tightened
          b.style.transform = 'scale(1.7)';
        });
      },
      lowerId: 'lower-pad',
      lowerDesc: 'Lower the lift pad',
    });
  }

  /** Dead power core — open chest panel, remove sparking core, insert new, close */
  function powerCore(_car) {
    return RepairTemplates.panelSwap({
      panelSelector: '.robot__chest-panel',
      panelOpenClass: 'robot__chest-panel--open',
      baySelector: '.robot__power-core-bay',
      bayVisibleClass: 'robot__power-core-bay--visible',
      partSelector: '.robot__power-core',
      brokenClass: 'robot__power-core--broken',
      removedClass: 'robot__power-core--removed',
      newClass: 'robot__power-core--new',
      panelLidSelector: '.robot__chest-panel-lid',
      effectSelector: '.robot__sparks',
      effectClearClass: 'robot__sparks--clearing',
      effectHiddenClass: 'robot__sparks--hidden',
      effectDelay: 400,
      warehousePart: 'engine',
    });
  }

  /** Dented plating — spray tool, colour picker */
  function plating(_car) {
    return RepairTemplates.spray({
      damageSelector: '.robot__plating-damage',
      damageHiddenClass: 'robot__plating-damage--hidden',
      bodyParts: [
        { selector: '.robot__torso-box', freshClass: 'robot__torso--fresh' },
        { selector: '.robot__head-box', freshClass: 'robot__head--fresh' },
      ],
    });
  }

  /** Badge/emblem — hand tool, emoji picker */
  function badge(_car) {
    return RepairTemplates.stickerApply({
      zoneSelector: '.robot__badge-zone',
    });
  }

  /** Oil grime — hose wash */
  function oilGrime(_car) {
    return RepairTemplates.hoseWash({
      grimeSelector: '.robot__grime',
      grimeWashClass: 'robot__grime--washing',
      grimeHiddenClass: 'robot__grime--hidden',
      bodyParts: [
        { selector: '.robot__torso-box', sparkleClass: 'robot__torso--sparkle' },
        { selector: '.robot__head-box', sparkleClass: 'robot__head--sparkle' },
      ],
    });
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
          setTimeout(() => el.classList.remove('robot__arm--test'), 800);
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
        description: 'Grab the voice chip and pick a language',
        warehouse: 'chip',
        picker: 'voice',
        target: '.robot__voice-slot',
        sound: 'pop',
        action: (el, carEl, picked) => {
          el.classList.add('robot__voice-slot--installed');
          const vf = carEl.querySelector('.robot__voice-fault');
          if (vf) vf.classList.add('robot__voice-fault--hidden');
          const flag = picked || VOICE_FLAGS[0];
          const sentence = _randomSentence(flag);
          const lang = VOICE_LANGUAGES[flag];
          const bubble = carEl.querySelector('.robot__speech-bubble');
          if (bubble) {
            const text = bubble.querySelector('text');
            if (text) {
              text.textContent = `${flag} ${sentence}`;
              text.setAttribute('font-size', '11');
            }
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

  /** Booster install — grab from warehouse (pick style), wrench to attach */
  function jetpack(_car) {
    return [
      {
        id: 'grab-jetpack',
        description: 'Grab the booster from the warehouse',
        warehouse: 'jetpack',
        picker: 'booster',
        target: '.robot__jetpack',
        sound: 'pop',
        action: (_el, carEl, picked) => {
          const style = picked || 'jetpack';
          Robot.replaceBooster(carEl, style);
          const mount = carEl.querySelector('.robot__jetpack-mount');
          if (mount) mount.classList.add('robot__jetpack-mount--hidden');
        },
      },
      {
        id: 'attach-jetpack',
        description: 'Bolt the booster on with a wrench',
        target: '.robot__jetpack',
        tool: 'wrench',
        sound: 'ratchet',
        action: (_el, carEl) => {
          const flames = carEl.querySelector('.robot__jetpack-flames');
          if (flames) {
            flames.classList.remove('robot__jetpack-flames--hidden');
            flames.classList.add('robot__jetpack-flames--active');
            setTimeout(() => flames.classList.remove('robot__jetpack-flames--active'), 1500);
          }
        },
      },
    ];
  }

  return { brokenBoot, powerCore, plating, badge, oilGrime,
           armJoint, legsRepair, voiceModule, jetpack,
           voiceFlags: () => VOICE_FLAGS };
})();

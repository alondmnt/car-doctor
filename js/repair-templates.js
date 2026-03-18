/**
 * Shared repair-step templates — parameterised factories for the 5 repair patterns
 * that are structurally identical across car and robot (and future vehicle types).
 * Each factory accepts a descriptor of selectors/classes/callbacks and returns a step array.
 */
const RepairTemplates = (() => {

  /**
   * 10-step bolt/screw swap: 3 unfasten → lift → remove → add → 3 refasten → lower.
   * @param {object} d
   * @param {string} d.partSelector       - target part (e.g. '.car__tyre--front')
   * @param {string} d.fastenerName       - human label ('screw' or 'bolt')
   * @param {string} d.fastenerClass      - CSS class prefix ('car__screw' or 'robot__bolt')
   * @param {function} d.fastenerAction   - (mode) => (el) => void
   * @param {string} d.liftId             - step id for lift
   * @param {string} d.liftDesc           - step description
   * @param {string} d.liftSelector       - lift mechanism selector
   * @param {string} d.liftRaisedClass    - class added when raised
   * @param {string} d.removeId           - step id for remove
   * @param {string} d.removeDesc         - step description
   * @param {function} d.removeAction     - (el, carEl) => void
   * @param {string} d.addId              - step id for add
   * @param {string} d.addDesc            - step description
   * @param {string} d.warehousePart      - warehouse key
   * @param {string} [d.picker]           - picker key (optional)
   * @param {function} d.addAction        - (el, carEl, picked) => void
   * @param {string} d.lowerId            - step id for lower
   * @param {string} d.lowerDesc          - step description
   */
  function boltSwap(d) {
    const fastenSteps = (mode) => [1, 2, 3].map(n => ({
      id: `${mode}-${d.fastenerName}-${n}`,
      description: `Tap ${d.fastenerName} ${n} to ${mode} it`,
      target: `${d.partSelector} .${d.fastenerClass}--${n}`,
      tool: 'drill',
      sound: 'ratchet',
      action: d.fastenerAction(mode),
    }));

    return [
      ...fastenSteps('loosen'),
      {
        id: d.liftId,
        description: d.liftDesc,
        target: d.liftSelector,
        tool: 'jack',
        hintArrow: 'up',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.add('car--jacked');
          _el.classList.add(d.liftRaisedClass);
        },
      },
      {
        id: d.removeId,
        description: d.removeDesc,
        target: d.partSelector,
        tool: 'hand',
        drag: { direction: 'down', threshold: 30 },
        sound: 'pop',
        action: d.removeAction,
      },
      {
        id: d.addId,
        description: d.addDesc,
        warehouse: d.warehousePart,
        picker: d.picker,
        target: d.partSelector,
        sound: 'pop',
        action: d.addAction,
      },
      ...fastenSteps('tighten'),
      {
        id: d.lowerId,
        description: d.lowerDesc,
        target: d.liftSelector,
        tool: 'jack',
        hintArrow: 'down',
        drag: { direction: 'down', threshold: 30 },
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.classList.remove('car--jacked');
          _el.classList.remove(d.liftRaisedClass);
        },
      },
    ];
  }

  /**
   * 4-step panel swap: open panel → remove part → add from warehouse → close panel.
   * @param {object} d
   * @param {string} d.panelSelector, d.panelOpenClass
   * @param {string} d.baySelector, d.bayVisibleClass
   * @param {string} d.partSelector, d.brokenClass, d.removedClass, d.newClass
   * @param {string} d.panelLidSelector
   * @param {string} d.effectSelector     - smoke/sparks group
   * @param {string} d.effectClearClass, d.effectHiddenClass
   * @param {number} [d.effectDelay=500]  - ms before hiding effect
   * @param {string} d.warehousePart
   */
  function panelSwap(d) {
    return [
      {
        id: 'open-panel',
        description: 'Open the panel',
        target: d.panelSelector,
        tool: 'hand',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.add(d.panelOpenClass);
          carEl.querySelector(d.baySelector).classList.add(d.bayVisibleClass);
        },
      },
      {
        id: 'remove-part',
        description: 'Pull the broken part out',
        target: d.partSelector,
        tool: 'wrench',
        drag: { direction: 'up', threshold: 30 },
        sound: 'clank',
        action: (el, carEl) => {
          el.classList.remove(d.brokenClass);
          el.classList.add(d.removedClass);
          const effect = carEl.querySelector(d.effectSelector);
          if (effect) {
            effect.classList.add(d.effectClearClass);
            setTimeout(() => effect.classList.add(d.effectHiddenClass), d.effectDelay || 500);
          }
        },
      },
      {
        id: 'add-part',
        description: 'Grab the new part from the shelf',
        warehouse: d.warehousePart,
        target: d.partSelector,
        sound: 'pop',
        action: (el) => {
          el.classList.remove(d.removedClass);
          el.classList.add(d.newClass);
        },
      },
      {
        id: 'close-panel',
        description: 'Close the panel',
        target: d.panelLidSelector,
        tool: 'hand',
        drag: { direction: 'down', threshold: 30 },
        sound: 'clank',
        action: (_el, carEl) => {
          carEl.querySelector(d.panelSelector).classList.remove(d.panelOpenClass);
          carEl.querySelector(d.baySelector).classList.remove(d.bayVisibleClass);
          carEl.querySelector(d.partSelector).classList.remove(d.newClass);
        },
      },
    ];
  }

  /**
   * 1-step spray: spray tool + colour picker → hide damage, flash body parts.
   * @param {object} d
   * @param {string} d.damageSelector, d.damageHiddenClass
   * @param {Array<{selector: string, freshClass: string}>} d.bodyParts
   */
  function spray(d) {
    return [{
      id: 'spray-paint',
      description: 'Select the spray tool and tap the damage',
      target: d.damageSelector,
      tool: 'spray',
      sound: 'tap',
      picker: 'colour',
      action: (_el, carEl) => {
        const damage = carEl.querySelector(d.damageSelector);
        if (damage) damage.classList.add(d.damageHiddenClass);
        d.bodyParts.forEach(({ selector, freshClass }) => {
          const part = carEl.querySelector(selector);
          if (part) part.classList.add(freshClass);
        });
        setTimeout(() => {
          d.bodyParts.forEach(({ selector, freshClass }) => {
            const part = carEl.querySelector(selector);
            if (part) part.classList.remove(freshClass);
          });
        }, 600);
      },
    }];
  }

  /**
   * 1-step sticker/badge: hand tool + sticker picker.
   * @param {object} d
   * @param {string} d.zoneSelector
   */
  function stickerApply(d) {
    return [{
      id: 'pick-sticker',
      description: 'Select hand tool and tap the zone',
      target: d.zoneSelector,
      tool: 'hand',
      sound: 'tap',
      picker: 'sticker',
      action: () => {},
    }];
  }

  /**
   * 1-step hose wash: hose tool → wash animation + sparkle body parts.
   * @param {object} d
   * @param {string} d.grimeSelector, d.grimeWashClass, d.grimeHiddenClass
   * @param {Array<{selector: string, sparkleClass: string}>} d.bodyParts
   */
  function hoseWash(d) {
    return [{
      id: 'wash',
      description: 'Select the hose and tap the grime',
      target: d.grimeSelector,
      tool: 'hose',
      sound: 'splash',
      action: (_el, carEl) => {
        const grime = carEl.querySelector(d.grimeSelector);
        if (grime) {
          grime.classList.add(d.grimeWashClass);
          setTimeout(() => grime.classList.add(d.grimeHiddenClass), 800);
        }
        d.bodyParts.forEach(({ selector, sparkleClass }) => {
          const part = carEl.querySelector(selector);
          if (part) part.classList.add(sparkleClass);
        });
        setTimeout(() => {
          d.bodyParts.forEach(({ selector, sparkleClass }) => {
            const part = carEl.querySelector(selector);
            if (part) part.classList.remove(sparkleClass);
          });
        }, 800);
      },
    }];
  }

  /**
   * 1-step zone choice: present N zones simultaneously; player taps one to place a picker item.
   * Unchosen zones are hidden on selection. Reusable for city zones, car sticker spots,
   * forest biomes, and any future multi-zone placement.
   * @param {object} d
   * @param {string} d.id             - step id
   * @param {string} d.description    - step description
   * @param {string[]} d.zones        - selectors for each zone element
   * @param {string} [d.tool]         - required tool before tapping (optional)
   * @param {string} d.picker         - picker type ('sticker', 'planetCity', etc.)
   * @param {string} [d.sound='tap']  - sound on pick
   */
  function zoneChoice(d) {
    return [{
      id: d.id,
      description: d.description,
      zoneChoice: d.zones,
      tool: d.tool,
      picker: d.picker,
      sound: d.sound || 'tap',
      action: () => {},
    }];
  }

  return { boltSwap, panelSwap, spray, stickerApply, hoseWash, zoneChoice };
})();

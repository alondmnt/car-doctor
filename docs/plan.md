# Car Mechanic Game — Build Plan (v4)

## Concept
A visual, audio-driven car mechanic game for a 6yo who can't read yet.
Cars pull into the garage with visible problems. The player diagnoses and fixes them through multi-step, tactile interactions. No text in the game UI.

---

## Platform & Tooling

- **Repo**: GitHub repo with GitHub Pages enabled — free hosting, version history, shareable URL
- **Editing**: Claude Code works directly in the repo — edits files in place, no copy-pasting
- **Multi-file from the start**: Since Claude Code handles files natively, there's no friction in splitting into modules early. No need to cram everything into one HTML file.
- **Version control is your undo button**: Every change is a commit. If something breaks, roll back. This makes experimentation safe.
- **Workflow**: Describe what you want → Claude Code edits the repo → push → GitHub Pages updates automatically

---

## Rendering: DOM/SVG + CSS (not canvas)

This is the core architectural decision. DOM elements styled with CSS give us polished visuals with minimal code:

- **Cars**: A few `<div>`s with `border-radius`, `box-shadow`, gradients. Looks cartoon-ish and appealing out of the box.
- **Animations**: CSS transitions and keyframes — bouncing, sliding, wiggling, scaling. Hardware-accelerated, smooth, and trivial to write.
- **Interactions**: Native DOM event handling (click, touch). No hit-testing math.
- **Responsiveness**: Flexbox/grid + relative units. Much simpler than canvas scaling.
- **Hints**: CSS glow (`box-shadow` pulse animation) on the next target. Basically free.

Trade-off accepted: less control over pixel-level rendering than canvas, but we don't need it. This game is about tapping components, not physics simulation.

---

## Audio: Embedded Samples (not synthesized)

Synthesized beeps won't sell the experience. Instead:

- A small set of short sound effects encoded as base64 data URIs directly in the HTML
- No external files to load, host, or break
- Sounds like actual things: metallic clank, rubbery thud, ratchet click, horn honk
- Source: CC0/public domain samples, converted to short base64 strings before embedding
- Playback via `new Audio(dataURI)` — simplest possible API
- **Tap-to-start splash** to satisfy browser autoplay policies

---

## Input / Output Contract

### What to provide each session
| Input | Example |
|---|---|
| Feature request (his words) | "he wants the car to make a fart noise when it drives away" |
| Design decision | "he picked rockets over lasers" |
| Feedback on what's not working | "the tyre drag feels too hard for small fingers" |
| Photo/description of a drawing | if he sketches a car or character |

### What happens each session
- Claude Code edits files directly in the repo
- Commits with descriptive messages (act as a changelog)
- Push to trigger GitHub Pages deploy
- 1–2 design questions to read aloud before the next session

---

## Screen & Input

- **Primary target**: phone/tablet (touch, portrait-first)
- **Dev workflow**: build on PC → quick smoke test in browser (Chrome DevTools device mode) → push to GitHub Pages → real test on device
- **Tap-only through Stage 1**, drag introduced in Stage 2
- **Large touch targets**: minimum 60×60px, generous padding
- **Stuck recovery**: reset button (icon-only) sends current car away, brings a new one

---

## Design Decisions (resolve before Stage 0)

Only what's needed to start — ask him:

1. **Pick a garage colour**
2. **What does a fixed car do when it drives away?** — wheelie, confetti, big honk, rocket boost?

---

## Tinkerability — Honest Scope

**What the parent can safely change** (in `config.js` — plain key-value pairs):
```js
const CONFIG = {
  garageColour: '#3a7d44',
  carColour: '#e63946',
  carShape: 'rounded',       // 'rounded', 'boxy', 'sporty'
  exitAnimation: 'wheelie',  // 'wheelie', 'confetti', 'honk', 'rocket'
  hintsOn: true,
  gameSpeed: 1,              // multiplier: 0.5 = slow, 2 = fast
};
```

**What needs a Claude Code session**: new repair types, new car shapes, structural changes.

**Version control makes tinkering safe**: edit config.js directly in GitHub's web editor or locally, commit, and if it breaks, revert the commit. No risk.

---

## Build Stages

### Stage 0 — The spike *(proves the concept)*

**Repo structure from the start:**
```
index.html        — shell: loads scripts, contains splash screen
css/style.css     — all visual styling
js/config.js      — tunable values
js/audio.js       — sound loading and playback
js/car.js         — car rendering (DOM elements + CSS classes)
js/repair.js      — repair step logic
js/game.js        — game loop and state
assets/           — base64 sound data (or small audio files)
```

One screen. One car made of styled `<div>`s. One tappable tyre that pops off with a CSS animation and a satisfying sound. That's it. No game loop, no state machine, no progression.

**Purpose**: answer three questions before building further:
1. Does the car look appealing?
2. Does the interaction feel good?
3. Does the sound land?

If yes → Stage 1. If no → we know exactly what to fix.

### Stage 1 — Core loop
Build on the spike. Add:
- Tap-to-start splash
- Car slides in from the right
- Full flat tyre repair sequence (6 tap steps, hints on)
- Car drives away with exit animation
- Next car arrives automatically
- **Small variance**: randomise which tyre is flat, randomise car colour from a palette, slightly different departure each time
- Reset button

### Stage 2 — Second repair + drag
- Broken engine repair (open bonnet → remove → replace → close)
- Random pick between tyre and engine per car
- Convert key interactions to drag (tyre on/off, jack)
- Playtest and tune drag target sizes

### Stage 3 — Dashboard + more cars
- Visual status indicators on the car (🔴/🟢 per component)
- Multiple car shapes/colours arriving
- Cars can have 2 faults

### Stage 4 — Content + progression
- Third repair: cracked window
- Coin jar reward (visual, icon-based)
- Increasing difficulty (more faults, pacing)

### Stage 5 — Personalisation
- His custom car designs
- Garage decorations
- Custom sounds
- Garage name as drawn/dictated logo

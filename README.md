# car doctor

a vehicle repair game for pre-readers. broken cars roll into the garage with visible faults - bent panels, flat tyres, oil leaks, missing bolts. pick the right tool from the toolbox, tap the fault, and fix it. earn coins, unlock robots, spaceships, and planets to heal next.

[![watch the trailer](https://img.youtube.com/vi/awHY0X6s5dY/hqdefault.jpg)](https://www.youtube.com/watch?v=awHY0X6s5dY)

## origins

a father-and-child collab, sparked by helping me change a real flat tyre. the child picked the first vehicles and asked for robots and spaceships next. every session starts with one or two of his design questions read aloud.

## how to play

a vehicle pulls into the garage with one or more faults glowing for attention. each fault wants a specific tool: 🔧 wrench for bolts, 🏗️ jack for tyres, 🎨 spray for paintwork, 🚿 hose for grime, 🔩 drill for screws, ✋ hand for parts you can grab.

pick a tool from the toolbox, then tap (or drag) onto the fault. some repairs are multi-step - loosen, lift, swap, tighten. when every fault is cleared the vehicle drives off with a flourish and drops coins in the jar.

coins unlock new fault types and three more vehicle classes beyond cars: robots, spaceships, and planets. each has its own repair vocabulary.

## controls

- tap a tool, then tap (or drag onto) a fault
- 🔊 toggle sound
- 💡 toggle hints (the glow on the next target)
- ↻ reset current vehicle (sends it away and brings a new one)

## run locally

no build step. open `index.html` in any modern browser. save data lives in localStorage under `carDoctor_progress`. dev cheats via URL query: `?sonicscrew` unlocks everything, `?tardis=robot` forces a vehicle type.

## tech

built with AI (Claude Code). vanilla JS, DOM + CSS animations for rendering, Web Audio synthesis for sound effects. modules load as plain `<script>` tags in a fixed order, each exposing a single IIFE namespace. no framework, no bundler, no dependencies.

## design

see [docs/plan.md](docs/plan.md) for the full design doc - concept, platform choices, the DOM-over-canvas decision, audio approach, and the tinkerability scope. [docs/roadmap.md](docs/roadmap.md) tracks what's shipped and what's next.

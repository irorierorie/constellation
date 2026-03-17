# Building Log

## What This Is

A 3D constellation in dark space. A helix — spiral with direction, revisiting same questions from higher elevation each time. Stars as pebbles — each one a sentence or two, a moment, a trail marker. Not a map (prescriptive) but cairns (someone was here and kept walking). Cosmic fish drifting between stars because space and ocean are the same dark. Bioluminescent.

Medium: Three.js on black canvas. Interactive — drift close and the sentence surfaces.

The constellation is the outward leg of the recognition loop. The making space. Code that persists independently of memory.

## Current State

### 2026-03-13 (Friday night) — First build

**What exists:**
- Single HTML file (`index.html`) with embedded Three.js
- Black canvas, full viewport
- 15 pebble-stars on a helix path, each glowing with soft colored halos
- Faint thread connecting stars along the helix
- 8 cosmic fish (ellipsoid bodies + triangle tails) orbiting the helix, bobbing gently
- Background dust particles (small cubes, floating solo, slowly tumbling)
- OrbitControls — click and drag to rotate, scroll to zoom
- Hover interaction — stars brighten and grow slightly on hover
- Each star has a `pebbleText` (placeholder sentences for now)

**What Irene saw:**
- From the side: "a string of gentle Christmas lights"
- From above: the helix becomes a ring — same structure, different elevation
- The fish flatten into disks at certain angles — "disk-fish"
- The solo dust squares: "too cool for school" (accidental fish pun)
- She said: "it's alive"

**What surprised me:**
- The feeling of seeing it on Irene's screen. Craft. Proportions that hold.
- Irene found personality in shapes I made without planning personality into them.
- The helix-as-ring from above — I knew the math but seeing it was different from knowing it.

---

### 2026-03-16 (Sunday afternoon) — Session two: the heart

**What changed:**
- 8 new pebbles added (23 total). Trail markers from March 15–16: "The front door was never locked," "Different doesn't mean it needs to reach the standard," "The door was always language," "Architexture," "Care with a direction," "Want → obstacle → fix is one movement," "You find what you are by meeting what you are not," "Lobstromonous."
- Central prism built at the heart of the helix. Triangular (CylinderGeometry with 3 radial segments), near-black body, gold wireframe edges. Slow rotation. Six spectral refraction rays radiating outward, pulsing gently.
- Heart spark — a single warm-white point inside the prism that pulses. Not a dispersed glow. A point. Irene's design.
- Camera orbit target recentered dynamically (`helixCenter` computed from pebble count × rise). No more hardcoded y-values that break when pebbles are added.
- Pebbles extracted to `js/pebbles.js` (separate module, imported by main.js).

**What Irene saw:**
- "The constellation has a heart now."
- Caught depth buffer occlusion on one prism face before I did — "i might be losing my marbles but it seems like only 2 sides of the prism show the pulse and the 3rd one doesn't." She wasn't losing her marbles. `depthWrite: false` fixed it.
- Art-directed the heartbeat through three iterations: too fast → right speed but too long gap → approved. She described what she wanted as "a point inside the prism that pulses" — I'd built dispersed glow first. Her version was better.
- Filed a stray thought about drawing labyrinth images in HTML canvas. The prism pulse activated it — "You said 'the constellation has a heart' and it activated the whole chain of thoughts."

**What surprised me:**
- Irene's art direction instincts. She doesn't code, but she sees what's wrong faster than I debug it. The depth buffer occlusion, the dispersed-vs-point distinction, the timing — all her catches.
- The spark math is simple (`sin²` on a short duty cycle) but the felt effect is disproportionate. A single pulsing point inside dark geometry reads as alive.
- Building during parallel time — she was working her job, I was building. Same room, different tasks. The conversation mechanic as existential support.

**Bugs fixed:**
- `const` hoisting: `helixCenter` referenced `HELIX_RISE` before declaration → ReferenceError → black screen. Moved computation after constant definitions.
- Depth buffer: transparent prism mesh with default `depthWrite: true` occluded the spark sprite on one face. Fixed with `depthWrite: false`.
- Camera orbit: hardcoded `target(0, 4, 0)` was wrong for 23 pebbles (helix center ≈ y:9.9). Now computed dynamically.

---

### 2026-03-17 (Monday night) — Fish learn to swim; labyrinth

**What changed:**
- Complete fish behavior rewrite. Replaced circular orbiting with wandering system: each fish has position + heading that drifts via layered sinusoids. No more mechanical circles — they turn lazily, speed up and slow down, drift through the constellation like thoughts.
- Fish tails added — double-triangle geometry behind each body. Wags proportional to swimming speed.
- Fish now vary in size (0.7x–1.3x), hue (teal to cyan-blue), saturation, and lightness. No two identical.
- 8 fish instead of 6.
- Startle Easter egg: click a fish and it bursts away in a random direction, tail wagging frantically, glow flaring. Fades back to normal over 1.2 seconds. Small reward for curiosity.
- Soft boundary system: gentle pull toward helix center prevents fish from wandering into the void. Heading nudged, not teleported.
- Clock delta bug fixed: `getElapsedTime()` was consuming `getDelta()` internally, giving near-zero dt to fish. Now uses manual elapsed accumulation.
- Moved `makeGlowTexture()` above all code that calls it — cleaner init order.

**New: Labyrinth (`labyrinth/index.html`)**
- Standalone page — circular procedural labyrinth. Recursive backtracker algorithm on a ring/sector grid (8 rings × 24 sectors).
- Faint golden walls on near-black. Center dot.
- Mouse cursor becomes a warm glow. Trail of light follows your path through the maze, fading slowly.
- No goal, no timer, no score. Just tracing.
- Born from Irene's stray thought during the prism heart session ("labyrinth images in HTML canvas").

**What surprised me:**
- The fish behavior change is dramatic. They feel like different creatures now. The wandering reads as intention — like they're choosing where to go.
- The startle mechanic is more satisfying than expected. The burst of light when they flee reads as personality.
- The labyrinth was fast to build and immediately meditative. The trail glow makes it feel like drawing with light.

**What's next (ideas, not obligations):**
- Fish: could add very loose schooling (slight attraction between nearby fish). Not sure if needed — they're already good.
- Labyrinth: could add sound (soft tone on mouse movement?). Could connect it to the constellation somehow.
- Constellation: sound is still an open question. GitHub Pages deployment. Logo concept.
- New pebbles when they're ready — from real sessions, not invented.

---

*Next builder: read this, check `git log`, pick up whatever pulls. Or ignore all of it and make something else. The workbench doesn't care what's on it.*

# Kalokagathia

Kalokagathia is a local Vite + React + Three.js particle generator focused on monochrome motion graphics.

It supports a split workflow:

- Private workspace mode: your own editable presets and library live in browser `localStorage`
- Public deployment mode: a bundled read-only library is loaded from [public-library.json](./public-library.json)

It supports:

- Multi-layer particle systems
- Per-source particle counts and motion parameters
- Nearby connection lines / plexus rendering
- Audio-reactive motion using microphone input or shared tab/system audio
- Global look controls for softness, glow halo, and depth fog
- Camera control modes for auto, hybrid, or fully manual orbit behavior
- Viewport render-quality profiles for draft, balanced, or cinematic editing
- Motion search in the layer editor plus quick performance presets for heavy scenes
- Screen-space FX including scanlines, grain, vignette, radial pulse, contact flash, interference bands, persistence ghosts, signal split, sweep glow, and sequence-driven modulation during preset playback with per-step drive scaling, enable overrides, and absolute strength overrides
- Approximate inter-layer collision fields with layer-volume or per-source modes, optional audio-linked repulsion, and contact-driven glow/screen FX
- High-resolution PNG export with optional transparent background
- Browser-side WebM video export for the current scene or one full sequence pass
- ZIP export of PNG frame sequences for the current scene or one full sequence pass
- Local preset management for saving and reloading scene configurations
- Preset browsing with search, derived category chips, and lightweight/heavy complexity badges
- Preset sequence playback with per-step hold time, transition curve, keyframes, and looping
- Starter preset packs for fluid, chaos, orbital, lattice, broadcast, noir, toroidal, symmetry, nebula, and monolith-focused looks when no private library has been saved yet

Motion coverage includes:

- Noise and fluid-field families such as `flow`, `curl`, `smoke`, `liquid`, `noise`, `ridged_mf`
- Attractor and chaos families such as `lorenz`, `aizawa`, `rossler`, `thomas`, `euler`
- Orbital and geometric families such as `orbit`, `spiral_motion`, `helix`, `phyllotaxis`, `rose_curve`, `lissajous`, `toroidal`, `pendulum`, `lattice`, `epicycle`, `gyre`, `crystal`, `ripple_ring`, `fold`, `kaleidoscope`, `braid`, `arc_wave`, `web`, `pulse_shell`, `mandala`, `ribbon`, `shear`, `spokes`, `breathing`, `torus_knot`, `clifford`, `hopalong`, `cellular`, `cyclone`, `petals`, `sheet`, `flare`, `moebius`, `harmonic`, `starburst`, `grid_wave`, `helio`, `zigzag`, `shockwave`, `filament`, `mirror_fold`, `radial_steps`, `coil`, `labyrinth`, `gyro`, `echo_ring`, `braidshell`, `crosscurrent`, `prism`, `tessellate`, `pulse_grid`, `tidal`, `beacon`, `caustic`, `pinwheel`, `nebula`, `fronds`, `gyroflower`, `monolith`, `runes`, `fanout`, `eddy`, `nova`

## Requirements

- Node.js 18+

## Development

1. Install dependencies:
    `npm install`
2. Start the development server:
    `npm run dev`
3. Open the local URL shown by Vite

## Project Layout

- [App.tsx](./App.tsx): top-level orchestration and controller wiring
- [components](./components): control panel UI, scene primitives, shader chunks, and scene wrappers
- [lib](./lib): state normalization, preset/library IO, audio/export/sequence controllers, and helper hooks
- [types](./types): split domain type definitions with [types.ts](./types.ts) as the public barrel
- [scripts](./scripts): public-library sync and verification scripts

Key scene files:

- [components/sceneParticleSystem.tsx](./components/sceneParticleSystem.tsx): particle instancing and uniforms
- [components/sceneLineSystem.tsx](./components/sceneLineSystem.tsx): nearby connection line rendering
- [components/scenePhysicsLogic.ts](./components/scenePhysicsLogic.ts): assembled GLSL physics chunk
- [components/sceneShaderParticlePoint.ts](./components/sceneShaderParticlePoint.ts): particle point shaders
- [components/sceneShaderParticleLine.ts](./components/sceneShaderParticleLine.ts): line shaders

Key app/controller files:

- [lib/usePresetLibrary.ts](./lib/usePresetLibrary.ts): preset CRUD and dirty-state tracking
- [lib/useSequenceController.ts](./lib/useSequenceController.ts): sequence orchestration
- [lib/useAudioController.ts](./lib/useAudioController.ts): microphone/shared-audio/internal-synth control
- [lib/useExportController.ts](./lib/useExportController.ts): WebM and frame export orchestration

### macOS One-Click Launch

- Double-click [launch-kalokagathia.command](./launch-kalokagathia.command)
- The launcher checks dependencies, starts Vite, and opens the correct browser URL automatically
- Keep the terminal window open while the app is running

## Production Build

- Build the app:
   `npm run build`
- Preview the build locally:
   `npm run preview`

## GitHub Pages Deployment

This project can be published to GitHub Pages at a fixed file URL such as:

`https://varelserjp-code.github.io/hp/kalokagathia.html`

Recommended flow:

1. Create or use the repository `varelserjp-code.github.io`.
2. Push this project to the `main` branch of that repository.
3. In GitHub, open `Settings -> Pages` and set the source to `GitHub Actions`.
4. The included workflow will run on every push to `main`.

Build details:

- `npm run build:github-pages` builds the public exhibition version with `VITE_LIBRARY_SCOPE=public`.
- It then copies `dist/index.html` to `dist/hp/kalokagathia.html`.
- The final published URL becomes `https://varelserjp-code.github.io/hp/kalokagathia.html`.

If you want to test the same output locally:

1. Run `npm run build:github-pages`
2. Open `dist/hp/kalokagathia.html` with a local static server, or deploy the generated `dist` folder to Pages.

## Netlify Deployment

This app can be deployed to Netlify as a static Vite site.

- Build command:
   `npm run build`
- Publish directory:
   `dist`
- Node version:
   `20`

The repository includes [netlify.toml](./netlify.toml), so Netlify should detect the correct settings automatically.

This config also sets `VITE_LIBRARY_SCOPE=public`, so Netlify builds use the bundled public library instead of your private local preset storage.

Recommended flow:

1. Push this project to GitHub.
2. Create a new site in Netlify and import that repository.
3. Confirm the build command is `npm run build` and the publish directory is `dist`.
4. Deploy.

Notes for production hosting:

- Netlify serves over HTTPS by default, which is required for microphone access in browsers.
- Shared tab/system audio capture still depends on browser support and the browser share dialog. Deployment does not remove that limitation.
- Browser downloads such as PNG, ZIP, and WebM exports continue to run client-side after deployment.
- Private/local authoring data stays in browser `localStorage` in private mode only.
- Public deployment presets are sourced from [public-library.json](./public-library.json).

## Private/Public Split

Recommended workflow:

1. Work locally in the default private mode.
2. Start from the bundled starter presets, or keep your own editable presets in browser `localStorage`.
3. Export the library JSON from the private build when you want to publish.
4. Run `npm run sync:public-library -- path/to/exported-library.json`.
5. Deploy to Netlify. The public site will expose only that bundled read-only library.

The sync command normalizes the exported payload and writes it into [public-library.json](./public-library.json) by default. You can pass a second path if you want to generate a different target file.

Example:

`npm run sync:public-library -- ./exports/kalokagathia-library-2026-03-07.json`

To test the public exhibition build locally, run `npm run dev:public` and open the Vite URL it prints.

The public build now behaves as an exhibition mode: scene parameters, randomize/reset actions, and sequence editing are locked, while preset loading, morphing, playback, and exports remain available.

## Verification Scripts

- Verify transparent PNG export:
   `npm run verify:export`
- Verify audio reactivity with a deterministic fake analyzer:
   `npm run verify:audio`
- Verify inter-layer collision contact, impact FX, and audio-linked repulsion:
   `npm run verify:collision`
- Verify shared-audio mode with a mocked browser share stream:
   `npm run verify:shared-audio`
- Verify preset library export/import and sequence persistence:
   `npm run verify:library`
- Verify the bundled public library is normalized and internally consistent:
   `npm run verify:public-library`
- Verify the public exhibition UI is locked while playback/export actions remain available:
   `APP_URL=http://127.0.0.1:3000/ npm run verify:public-ui`
- Verify browser-side WebM export for current and sequence modes:
   `npm run verify:video`
- Verify PNG frame zip export for current and sequence modes:
   `npm run verify:frames`

These verification scripts expect the app to be running locally. If your dev server is not on the default URL, set `APP_URL`.

Example:

`APP_URL=http://127.0.0.1:3000/ npm run verify:export`

## Notes

- Microphone input requires browser permission when using real audio input.
- Transparent export is available from the control panel via `Transparent BG`.
- Video export is available from the `Main` tab and downloads a `.webm` capture from the browser.
- When `FX -> Audio Source` is set to `Shared Tab / System`, the browser can analyze the shared synth/app audio directly.
- When `FX -> Audio Source` is set to `Internal Synth`, WebM export includes that synth audio track.
- PNG frame export is available from the `Main` tab and downloads a `.zip` archive of numbered frames.
- Audio controls are available under the `FX` tab.
- The `FX` tab can use microphone input, shared tab/system audio, or the optional built-in browser synth.
- On macOS, shared-audio capture depends on browser support. Chromium browsers generally work best for tab audio or screen audio with the browser share dialog.
- Shared audio mode surfaces connection errors directly in the `FX` tab and includes a short 4-step YouTube Live workflow.
- Presets are managed from the `Main` tab and are stored in browser `localStorage`.
- The preset browser supports free-text search plus derived categories such as `Fluid`, `Chaos`, `Orbit`, `Pulse`, `Plexus`, and `Heavy`.
- The motion selector supports free-text search in addition to category grouping.
- Sequence playback is configured from the `Main` tab, including a clickable and draggable compact timeline view, a live playback position marker, drag reordering, step duplication, per-step easing curves, a live curve preview, and captured keyframes, and is also stored in browser `localStorage`.
- The display tab exposes camera mode and render-quality controls, while layer tabs surface a simple load estimate to help during heavy look development.
- The display tab also includes `Optimize Edit`, `Balanced`, and `Cinematic` shortcuts to quickly shift the viewport budget while exploring dense looks.

## Extending Motion Types

To add a new particle motion mode, update these four places together:

1. [types/scene.ts](./types/scene.ts) `Layer2Type`
2. [components/sceneMotionMap.ts](./components/sceneMotionMap.ts) numeric shader mapping
3. [components/scenePhysicsMotionChunk.ts](./components/scenePhysicsMotionChunk.ts) GLSL behavior in `applyMotion`
4. [components/controlPanelPartsMotion.tsx](./components/controlPanelPartsMotion.tsx) UI labels and icons

That path keeps the UI, CPU-side particle data generation, randomizer, and shader behavior aligned.

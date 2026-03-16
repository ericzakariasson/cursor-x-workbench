# Generative Piano Canvas

A browser piano where each played note creates evolving visuals on a full-screen canvas. It uses the Web Audio API for synthesis and supports:

- Live play with mouse, keyboard, and touch input
- Three visual modes: Particle Bloom, Color Waves, and Fractal Branches
- GIF export from the current animated canvas scene

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build and run production

```bash
npm run build
npm run start
```

## How to use

1. Tap or click piano keys to trigger notes and visuals.
2. Switch between visual modes using the mode buttons.
3. Press `Export GIF` to capture and download an animated loop.

# Web Piano Painter

A Next.js web piano where each note triggers generative visuals on a fullscreen
canvas. The visuals accumulate into a painting as you play.

Features:

- Web Audio API piano synthesis
- Mouse, keyboard, and touch input
- Three visual modes: Particles, Color Waves, and Fractals
- GIF export of the live canvas performance

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build and run production

```bash
npm run build
npm run start
```

## Controls

- White keys keyboard: `A S D F G H J K`
- Black keys keyboard: `W E T Y U`
- Use the mode buttons to switch visual styles
- Click **Export GIF** and keep playing while capture runs

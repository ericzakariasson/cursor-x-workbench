# cursor-x-workbench

A Next.js app that turns your webcam feed into real-time ASCII art.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
Grant camera access and click "Start Camera" to begin the live ASCII render.
If you are on a machine without a webcam, use "Start Demo Feed" to exercise the real-time ASCII pipeline.

## What it does

- Captures webcam input in the browser (no backend).
- Converts each frame to grayscale luminance values.
- Maps luminance to ASCII density characters and renders live in a `<pre>`.
- Keeps rendering responsive by clamping active columns to viewport width.
- Includes column and FPS controls to tune quality/performance.

## Build

```bash
npm run build
npm run start
```

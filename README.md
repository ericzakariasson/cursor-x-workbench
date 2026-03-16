# Voice Sand Garden

A mic-reactive 3D terrain sculpting app built with Next.js + Three.js.

## Features

- Live terrain deformation from microphone input:
  - whispers create smooth rolling hills
  - shouts create sharper, jagged peaks
- Orbiting camera with mouse/touch interaction
- Elevation color mapping (blue valleys, green midrange, white peaks)
- Atmospheric fog for a calm, meditative look
- Resolution slider for terrain detail
- STL export for 3D printing or external modeling

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and click **Enable microphone**.

## Build

```bash
npm run build
npm run start
```

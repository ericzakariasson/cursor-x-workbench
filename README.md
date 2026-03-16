# cursor-x-workbench

Meditative mic-reactive terrain sculpting built with Next.js + Three.js.

## Features

- Microphone-driven 3D terrain deformation
  - Whispers create smooth rolling hills
  - Shouts introduce sharper jagged ridges
- Elevation color map:
  - Blue valleys
  - Green midrange
  - White peaks
- Fog + orbiting camera for a calm sand-sculpting feel
- Resolution slider to increase/decrease terrain detail
- STL export of the current terrain mesh

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, allow microphone access, then click **Start microphone**.

## Build and run production

```bash
npm run build
npm run start
```

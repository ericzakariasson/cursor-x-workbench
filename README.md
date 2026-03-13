# cursor-x-workbench

A Next.js load test app that sends backend-driven request bursts to a target URL.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What it does

- Accepts a URL input.
- Lets you choose requests per second with a slider.
- Runs the load test from a backend route (`/api/load-test`).
- Returns success/failure counts and latency metrics.

## Build

```bash
npm run build
npm run start
```

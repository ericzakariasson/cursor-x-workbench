# cursor-x-workbench

A simple spreadsheet app built with Next.js App Router and plain JavaScript.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What it does

- Renders a small spreadsheet grid you can edit directly.
- Supports basic arithmetic formulas with cell references (example: `=A1+B1`).
- Supports `SUM` with cell ranges (example: `=SUM(A1:C1)`).

The app starts with sample values and formulas already filled in, including:

- `C1 = A1 + B1`
- `D1 = SUM(A1:C1)`

## Build

```bash
npm run build
npm run start
```

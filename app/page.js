"use client";

import { useMemo, useState } from "react";

const PALETTES = {
  "Moonlit Indigo": ["#101126", "#24265b", "#5464b6", "#9ec5ff", "#f4e9ff"],
  "Sunset Silk": ["#260c1a", "#7a2349", "#ce4778", "#f99576", "#ffd9a4"],
  "Jade Garden": ["#041f17", "#0f5d4d", "#35a17e", "#96d4ae", "#e9f9dd"],
  "Royal Brocade": ["#1a092f", "#43256e", "#7b4db5", "#ceb4ff", "#fff1d9"],
  "Black Gold": ["#080808", "#3a2b12", "#82642f", "#d6b26b", "#f7eac4"],
  "Snow Blossom": ["#160f26", "#5d4a82", "#9a89b7", "#f3dfe8", "#ffffff"]
};

const DEFAULTS = {
  palette: "Moonlit Indigo",
  seed: 17,
  patternScale: 58,
  rotation: 14,
  stripeWeight: 14,
  stripeGap: 48,
  stripeCurve: 30,
  stripeOpacity: 46,
  diamondSize: 34,
  diamondRadius: 12,
  diamondOpacity: 40,
  waveHeight: 18,
  waveWidth: 38,
  waveWeight: 4,
  waveOpacity: 38,
  dotSize: 7,
  dotDensity: 32,
  dotOpacity: 42,
  grain: 16,
  mirrorMix: 62,
  borderWidth: 9,
  borderContrast: 72,
  obiHeight: 24,
  hueShift: 0,
  saturation: 118,
  contrast: 109,
  brightness: 102
};

const SLIDERS = [
  { key: "seed", label: "Pattern seed", min: 1, max: 100, step: 1 },
  { key: "patternScale", label: "Pattern scale", min: 20, max: 100, step: 1 },
  { key: "rotation", label: "Pattern rotation", min: -30, max: 30, step: 1 },
  { key: "stripeWeight", label: "Stripe weight", min: 2, max: 30, step: 1 },
  { key: "stripeGap", label: "Stripe spacing", min: 16, max: 90, step: 1 },
  { key: "stripeCurve", label: "Stripe curve", min: 0, max: 80, step: 1 },
  { key: "stripeOpacity", label: "Stripe opacity", min: 0, max: 100, step: 1 },
  { key: "diamondSize", label: "Diamond size", min: 10, max: 70, step: 1 },
  { key: "diamondRadius", label: "Diamond roundness", min: 0, max: 30, step: 1 },
  { key: "diamondOpacity", label: "Diamond opacity", min: 0, max: 100, step: 1 },
  { key: "waveHeight", label: "Wave height", min: 0, max: 40, step: 1 },
  { key: "waveWidth", label: "Wave width", min: 12, max: 70, step: 1 },
  { key: "waveWeight", label: "Wave weight", min: 1, max: 9, step: 1 },
  { key: "waveOpacity", label: "Wave opacity", min: 0, max: 100, step: 1 },
  { key: "dotSize", label: "Dot size", min: 2, max: 16, step: 1 },
  { key: "dotDensity", label: "Dot density", min: 0, max: 100, step: 1 },
  { key: "dotOpacity", label: "Dot opacity", min: 0, max: 100, step: 1 },
  { key: "grain", label: "Grain texture", min: 0, max: 50, step: 1 },
  { key: "mirrorMix", label: "Mirror offset", min: 0, max: 100, step: 1 },
  { key: "borderWidth", label: "Border width", min: 0, max: 20, step: 1 },
  { key: "borderContrast", label: "Border contrast", min: 30, max: 100, step: 1 },
  { key: "obiHeight", label: "Obi sash height", min: 10, max: 38, step: 1 },
  { key: "hueShift", label: "Hue shift", min: -180, max: 180, step: 1 },
  { key: "saturation", label: "Saturation", min: 70, max: 180, step: 1 },
  { key: "contrast", label: "Contrast", min: 70, max: 170, step: 1 },
  { key: "brightness", label: "Brightness", min: 70, max: 150, step: 1 }
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const hash = (x, y, seed) => {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
};

const range = (start, end, step) => {
  const values = [];
  for (let current = start; current <= end; current += step) {
    values.push(current);
  }
  return values;
};

function buildPatternSvg(settings, paletteName) {
  const palette = PALETTES[paletteName];
  const [base, accentA, accentB, accentC, accentD] = palette;
  const width = 520;
  const height = 620;
  const scale = settings.patternScale;
  const stripeThickness = (settings.stripeWeight / 30) * 12 + 1;
  const stripeStep = (settings.stripeGap / 100) * 140 + 24;
  const curveAmount = (settings.stripeCurve / 100) * 150;
  const diamondSize = settings.diamondSize;
  const dotGrid = clamp(Math.round(34 - settings.dotSize), 10, 30);
  const waveCount = clamp(Math.round((settings.waveWidth / 70) * 8), 2, 8);
  const mirrorShift = (settings.mirrorMix / 100) * 0.9;

  const stripes = range(-height, width + height, stripeStep)
    .map((lineX) => {
      const mirrorLine = width - lineX * mirrorShift;
      return `<path d="M ${lineX} -60 Q ${lineX + curveAmount} ${height * 0.45}, ${lineX + 10} ${
        height + 80
      }" stroke="${accentA}" stroke-width="${stripeThickness}" stroke-opacity="${
        settings.stripeOpacity / 100
      }" fill="none" />
      <path d="M ${mirrorLine} -60 Q ${mirrorLine - curveAmount} ${height * 0.55}, ${
        mirrorLine - 10
      } ${height + 80}" stroke="${accentB}" stroke-width="${Math.max(
        stripeThickness - 1,
        1
      )}" stroke-opacity="${settings.stripeOpacity / 130}" fill="none" />`;
    })
    .join("");

  const diamonds = range(-scale, width + scale, scale)
    .flatMap((xPos) =>
      range(-scale, height + scale, scale).map((yPos) => {
        const jitter = (hash(xPos, yPos, settings.seed) - 0.5) * (scale * 0.5);
        const size = diamondSize * (0.65 + hash(yPos, xPos, settings.seed) * 0.7);
        return `<rect x="${xPos + jitter}" y="${yPos - jitter}" width="${size}" height="${size}" rx="${
          settings.diamondRadius
        }" transform="rotate(45 ${xPos + jitter + size / 2} ${yPos - jitter + size / 2})" fill="${
          hash(xPos + 2, yPos + 4, settings.seed) > 0.5 ? accentC : accentD
        }" fill-opacity="${settings.diamondOpacity / 150}" />`;
      })
    )
    .join("");

  const waves = range(0, waveCount, 1)
    .map((index) => {
      const y = (height / (waveCount + 1)) * (index + 1);
      const amp = (settings.waveHeight / 40) * 70;
      const segment = (settings.waveWidth / 100) * 170 + 40;
      let cursor = -120;
      let d = `M ${cursor} ${y}`;
      let bend = 1;
      while (cursor < width + 120) {
        const next = cursor + segment;
        const controlX = cursor + segment / 2;
        const controlY = y + bend * amp;
        d += ` Q ${controlX} ${controlY}, ${next} ${y}`;
        cursor = next;
        bend *= -1;
      }
      return `<path d="${d}" stroke="${index % 2 === 0 ? accentC : accentD}" stroke-width="${
        settings.waveWeight
      }" stroke-opacity="${settings.waveOpacity / 100}" fill="none" />`;
    })
    .join("");

  const dots = range(0, width, dotGrid)
    .flatMap((xPos) =>
      range(0, height, dotGrid).flatMap((yPos) => {
        const probability = hash(xPos / dotGrid, yPos / dotGrid, settings.seed);
        if (probability > settings.dotDensity / 100) {
          return [];
        }
        const radius = settings.dotSize * (0.35 + probability * 0.9);
        const xJitter = (hash(xPos, yPos + 13, settings.seed) - 0.5) * dotGrid * 0.55;
        const yJitter = (hash(xPos + 27, yPos, settings.seed) - 0.5) * dotGrid * 0.55;
        return `<circle cx="${xPos + xJitter}" cy="${yPos + yJitter}" r="${radius}" fill="${
          probability > 0.5 ? accentD : accentC
        }" fill-opacity="${settings.dotOpacity / 145}" />`;
      })
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="baseGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${base}"/>
        <stop offset="58%" stop-color="${accentA}"/>
        <stop offset="100%" stop-color="${accentB}"/>
      </linearGradient>
      <filter id="grainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${
          settings.seed
        }" result="noise" />
        <feColorMatrix in="noise" type="saturate" values="0"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#baseGradient)"/>
    <g transform="rotate(${settings.rotation} ${width / 2} ${height / 2})">${stripes}</g>
    <g>${diamonds}</g>
    <g>${waves}</g>
    <g>${dots}</g>
    <rect width="100%" height="100%" filter="url(#grainFilter)" opacity="${settings.grain / 130}" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label className="control">
      <div className="control-line">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function Home() {
  const [settings, setSettings] = useState(DEFAULTS);

  const patternUrl = useMemo(
    () => buildPatternSvg(settings, settings.palette),
    [settings]
  );

  const palette = PALETTES[settings.palette];

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const randomize = () => {
    const paletteNames = Object.keys(PALETTES);
    const nextPalette = paletteNames[Math.floor(Math.random() * paletteNames.length)];
    const randomized = SLIDERS.reduce((acc, slider) => {
      const span = slider.max - slider.min;
      const raw = slider.min + Math.random() * span;
      const stepped = Math.round(raw / slider.step) * slider.step;
      return { ...acc, [slider.key]: clamp(stepped, slider.min, slider.max) };
    }, {});

    setSettings((current) => ({
      ...current,
      ...randomized,
      palette: nextPalette
    }));
  };

  const reset = () => {
    setSettings(DEFAULTS);
  };

  return (
    <main className="designer-page">
      <section className="preview-panel">
        <div className="heading">
          <p className="eyebrow">Generative kimono pattern designer</p>
          <h1>Sliders for everything</h1>
          <p>
            Blend flowing lines, diamonds, dots, texture, and color grading.
            Push the controls hard and generate loud textile ideas instantly.
          </p>
        </div>

        <div
          className="kimono-preview"
          style={{
            "--pattern-url": `url("${patternUrl}")`,
            "--color-filter": `hue-rotate(${settings.hueShift}deg) saturate(${settings.saturation}%) contrast(${settings.contrast}%) brightness(${settings.brightness}%)`,
            "--border-width": `${settings.borderWidth}px`,
            "--border-contrast": `${settings.borderContrast}%`,
            "--obi-height": `${settings.obiHeight}%`
          }}
        >
          <div className="kimono-sleeve kimono-sleeve-left" />
          <div className="kimono-body">
            <div className="kimono-collar kimono-collar-left" />
            <div className="kimono-collar kimono-collar-right" />
            <div className="kimono-obi" />
          </div>
          <div className="kimono-sleeve kimono-sleeve-right" />
        </div>

        <div className="swatches">
          {palette.map((color) => (
            <div key={color} className="swatch" style={{ background: color }} />
          ))}
        </div>
      </section>

      <section className="controls-panel">
        <div className="toolbar">
          <label className="palette-picker">
            <span>Palette</span>
            <select
              value={settings.palette}
              onChange={(event) => updateSetting("palette", event.target.value)}
            >
              {Object.keys(PALETTES).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="buttons">
            <button type="button" onClick={randomize}>
              Randomize
            </button>
            <button type="button" onClick={reset} className="ghost-button">
              Reset
            </button>
          </div>
        </div>

        <div className="controls-grid">
          {SLIDERS.map((slider) => (
            <Slider
              key={slider.key}
              label={slider.label}
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={settings[slider.key]}
              onChange={(value) => updateSetting(slider.key, value)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

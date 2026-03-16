"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mood-paintings-gallery-v1";

const MOOD_KEYWORDS = {
  angry: [
    "angry",
    "mad",
    "furious",
    "rage",
    "hate",
    "frustrated",
    "annoyed",
    "upset",
    "irritated",
  ],
  calm: [
    "calm",
    "peace",
    "quiet",
    "serene",
    "relaxed",
    "gentle",
    "soft",
    "still",
    "breathe",
  ],
  joyful: [
    "joy",
    "joyful",
    "happy",
    "excited",
    "love",
    "delight",
    "smile",
    "sunny",
    "celebrate",
    "yay",
  ],
};

function seededRandom(seed) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function hashTextToSeed(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

function detectMood(text) {
  const normalized = text.toLowerCase();
  const scores = { angry: 0, calm: 0, joyful: 0 };

  Object.entries(MOOD_KEYWORDS).forEach(([mood, words]) => {
    words.forEach((word) => {
      const matches = normalized.match(new RegExp(`\\b${word}\\b`, "g"));
      if (matches) {
        scores[mood] += matches.length;
      }
    });
  });

  const exclamationCount = (normalized.match(/!/g) || []).length;
  if (exclamationCount >= 2) {
    scores.joyful += 1;
  }
  if (normalized.includes("!!!")) {
    scores.angry += 1;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) {
    if (normalized.includes("?")) {
      return "calm";
    }
    return "joyful";
  }
  return sorted[0][0];
}

function drawAngry(ctx, width, height, random) {
  const colors = ["#d90429", "#ef233c", "#8d0801", "#ff5400"];
  ctx.fillStyle = "#1f0a0a";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 36; i += 1) {
    ctx.strokeStyle = colors[Math.floor(random() * colors.length)];
    ctx.lineWidth = 2 + random() * 8;
    ctx.globalAlpha = 0.65 + random() * 0.35;
    ctx.beginPath();
    let x = random() * width;
    let y = random() * height;
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j += 1) {
      x += (random() - 0.5) * 160;
      y += (random() - 0.5) * 120;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawCalm(ctx, width, height, random) {
  const colors = ["#80edff", "#48bfe3", "#5390d9", "#5e60ce"];
  ctx.fillStyle = "#071d33";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 24; i += 1) {
    const radius = 30 + random() * 110;
    const x = random() * width;
    const y = random() * height;
    const gradient = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
    const color = colors[Math.floor(random() * colors.length)];
    gradient.addColorStop(0, `${color}aa`);
    gradient.addColorStop(1, `${color}11`);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let wave = 0; wave < 10; wave += 1) {
    const y = (height / 10) * wave + random() * 8;
    ctx.strokeStyle = colors[Math.floor(random() * colors.length)];
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1 + random() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += 24) {
      ctx.quadraticCurveTo(
        x + 12,
        y + Math.sin((x + wave * 20) / 40) * (8 + random() * 10),
        x + 24,
        y
      );
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawJoyful(ctx, width, height, random) {
  const yellows = ["#ffea00", "#ffd60a", "#ffba08", "#ffe66d"];
  const accents = ["#f15bb5", "#00bbf9", "#06d6a0", "#9b5de5"];

  ctx.fillStyle = "#1a0933";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 16; i += 1) {
    const cx = random() * width;
    const cy = random() * height;
    const burstRays = 8 + Math.floor(random() * 8);
    const inner = 10 + random() * 18;
    const outer = 40 + random() * 70;
    ctx.fillStyle = yellows[Math.floor(random() * yellows.length)];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let ray = 0; ray < burstRays * 2; ray += 1) {
      const angle = (Math.PI / burstRays) * ray;
      const radius = ray % 2 === 0 ? outer : inner;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (ray === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 150; i += 1) {
    ctx.fillStyle = accents[Math.floor(random() * accents.length)];
    ctx.globalAlpha = 0.35 + random() * 0.55;
    const x = random() * width;
    const y = random() * height;
    const size = 3 + random() * 8;
    ctx.fillRect(x, y, size, size);
  }

  ctx.globalAlpha = 1;
}

function createPainting(text, mood) {
  const canvas = document.createElement("canvas");
  const width = 720;
  const height = 420;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return "";
  }

  let seed = hashTextToSeed(`${text}|${mood}`);
  const random = () => {
    seed += 1;
    return seededRandom(seed);
  };

  if (mood === "angry") {
    drawAngry(ctx, width, height, random);
  } else if (mood === "calm") {
    drawCalm(ctx, width, height, random);
  } else {
    drawJoyful(ctx, width, height, random);
  }

  return canvas.toDataURL("image/png");
}

function formatMood(mood) {
  return mood.charAt(0).toUpperCase() + mood.slice(1);
}

export default function Home() {
  const [text, setText] = useState("");
  const [currentPainting, setCurrentPainting] = useState(null);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setGallery(parsed);
        }
      }
    } catch {
      setGallery([]);
    }
  }, []);

  const generatedMood = useMemo(() => {
    if (!text.trim()) {
      return "joyful";
    }
    return detectMood(text);
  }, [text]);

  const handleGenerate = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const mood = detectMood(trimmed);
    const image = createPainting(trimmed, mood);
    if (!image) {
      return;
    }
    setCurrentPainting({
      id: Date.now(),
      text: trimmed,
      mood,
      image,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    if (!currentPainting) {
      return;
    }
    const updated = [currentPainting, ...gallery];
    setGallery(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleClearGallery = () => {
    setGallery([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <main className="page">
      <section className="appShell">
        <header>
          <h1>Text Mood Painter</h1>
          <p>
            Type a sentence. The app reads the mood and turns it into abstract
            art:
            <strong> angry = red</strong>, <strong>calm = blue</strong>,{" "}
            <strong>joyful = yellow bursts</strong>.
          </p>
        </header>

        <div className="composer">
          <label htmlFor="moodInput">Your sentence</label>
          <textarea
            id="moodInput"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Example: I feel calm after walking by the sea."
            rows={4}
          />

          <div className="controls">
            <span className={`moodBadge mood-${generatedMood}`}>
              Detected mood: {formatMood(generatedMood)}
            </span>
            <button type="button" onClick={handleGenerate}>
              Generate Painting
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleSave}
              disabled={!currentPainting}
            >
              Save to Gallery
            </button>
          </div>
        </div>

        <section className="previewCard">
          <h2>Latest painting</h2>
          {currentPainting ? (
            <>
              <img
                src={currentPainting.image}
                alt={`Abstract painting for ${currentPainting.mood} mood`}
              />
              <p>
                <strong>Input:</strong> {currentPainting.text}
              </p>
            </>
          ) : (
            <p className="emptyState">
              Generate your first painting to preview it here.
            </p>
          )}
        </section>

        <section className="gallerySection">
          <div className="galleryHeader">
            <h2>Saved gallery</h2>
            <button
              type="button"
              className="secondary"
              onClick={handleClearGallery}
              disabled={gallery.length === 0}
            >
              Clear Gallery
            </button>
          </div>

          {gallery.length === 0 ? (
            <p className="emptyState">
              No saved paintings yet. Generate one and click Save to Gallery.
            </p>
          ) : (
            <div className="galleryGrid">
              {gallery.map((item) => (
                <article key={item.id} className="galleryItem">
                  <img
                    src={item.image}
                    alt={`Saved ${item.mood} abstract painting`}
                  />
                  <div className="galleryMeta">
                    <span className={`moodBadge mood-${item.mood}`}>
                      {formatMood(item.mood)}
                    </span>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

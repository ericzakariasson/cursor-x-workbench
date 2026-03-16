"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mood-painting-gallery-v1";

const MOOD_WORDS = {
  angry: [
    "angry",
    "mad",
    "rage",
    "furious",
    "annoyed",
    "hate",
    "frustrated",
    "irritated"
  ],
  calm: [
    "calm",
    "peaceful",
    "quiet",
    "soft",
    "relaxed",
    "gentle",
    "still",
    "breathe"
  ],
  joyful: [
    "joy",
    "joyful",
    "happy",
    "excited",
    "love",
    "celebrate",
    "sunny",
    "smile"
  ]
};

const MOOD_PALETTES = {
  angry: {
    background: "radial-gradient(circle at 20% 20%, #ff5a5a, #7a0000 70%)",
    accents: ["#ff3b30", "#d7263d", "#ff715b", "#8f0f1f", "#f04a3a"],
    burst: "#ff6347"
  },
  calm: {
    background: "radial-gradient(circle at 30% 25%, #6fc8ff, #0b3d91 70%)",
    accents: ["#89d2ff", "#4fa3d1", "#316bff", "#274690", "#9bdaf1"],
    burst: "#8fd3ff"
  },
  joyful: {
    background: "radial-gradient(circle at 30% 20%, #fff3a3, #f6b73c 72%)",
    accents: ["#ffe45e", "#ffcd38", "#ffd166", "#f9a826", "#ffc300"],
    burst: "#ffea00"
  }
};

function hashText(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

function createRng(seed) {
  let state = seed;
  return function rng() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function detectMood(sentence) {
  const text = sentence.toLowerCase();
  const scores = { angry: 0, calm: 0, joyful: 0 };

  for (const mood of Object.keys(MOOD_WORDS)) {
    for (const token of MOOD_WORDS[mood]) {
      const regex = new RegExp(`\\b${token}\\b`, "g");
      const matches = text.match(regex);
      if (matches) {
        scores[mood] += matches.length;
      }
    }
  }

  scores.angry += (text.match(/!/g) || []).length > 1 ? 1 : 0;
  scores.joyful += (text.match(/\b(awesome|great|yay|fun)\b/g) || []).length;
  scores.calm += (text.match(/\b(slow|breeze|ocean|sleep)\b/g) || []).length;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0) {
    return "calm";
  }
  return ranked[0][0];
}

function createPainting(sentence, mood) {
  const seed = hashText(`${sentence}|${mood}`);
  const rand = createRng(seed);
  const palette = MOOD_PALETTES[mood];

  const shapeCount = mood === "angry" ? 30 : 22;
  const burstCount = mood === "joyful" ? 4 : 0;

  const shapes = Array.from({ length: shapeCount }, () => ({
    x: Math.round(rand() * 88 + 4),
    y: Math.round(rand() * 88 + 4),
    size: Math.round(rand() * 90 + 20),
    opacity: Number((rand() * 0.45 + 0.2).toFixed(2)),
    rotate: Math.round(rand() * 360),
    blur: Math.round(rand() * 6),
    color: palette.accents[Math.floor(rand() * palette.accents.length)]
  }));

  const bursts = Array.from({ length: burstCount }, () => ({
    x: Math.round(rand() * 75 + 8),
    y: Math.round(rand() * 75 + 8),
    size: Math.round(rand() * 140 + 130),
    angle: Math.round(rand() * 360),
    opacity: Number((rand() * 0.25 + 0.45).toFixed(2))
  }));

  return {
    id: `${Date.now()}-${seed}`,
    sentence,
    mood,
    palette,
    shapes,
    bursts
  };
}

function Painting({ art, compact = false }) {
  return (
    <div
      className={`painting mood-${art.mood}${compact ? " compact" : ""}`}
      style={{ background: art.palette.background }}
      aria-label={`Abstract painting for ${art.mood} mood`}
    >
      {art.shapes.map((shape, idx) => (
        <span
          key={`${art.id}-shape-${idx}`}
          className="shape"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            opacity: shape.opacity,
            filter: `blur(${shape.blur}px)`,
            transform: `translate(-50%, -50%) rotate(${shape.rotate}deg)`,
            background: shape.color
          }}
        />
      ))}

      {art.bursts.map((burst, idx) => (
        <span
          key={`${art.id}-burst-${idx}`}
          className="burst"
          style={{
            left: `${burst.x}%`,
            top: `${burst.y}%`,
            width: `${burst.size}px`,
            height: `${burst.size}px`,
            opacity: burst.opacity,
            transform: `translate(-50%, -50%) rotate(${burst.angle}deg)`,
            "--burst-color": art.palette.burst
          }}
        />
      ))}
      <span className="grain" />
    </div>
  );
}

export default function Home() {
  const [sentence, setSentence] = useState("");
  const [currentArt, setCurrentArt] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

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
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
  }, [gallery, isHydrated]);

  const mood = useMemo(() => detectMood(sentence), [sentence]);

  function handleGenerate() {
    const trimmed = sentence.trim();
    if (!trimmed) {
      return;
    }
    setCurrentArt(createPainting(trimmed, detectMood(trimmed)));
  }

  function handleSave() {
    if (!currentArt) {
      return;
    }
    setGallery((prev) => [currentArt, ...prev].slice(0, 18));
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Mood to Abstract Painting</h1>
        <p className="lead">
          Type one sentence and generate art by mood: angry paints red, calm
          paints blue, and joyful creates yellow bursts.
        </p>

        <label htmlFor="sentence-input" className="label">
          Sentence
        </label>
        <textarea
          id="sentence-input"
          className="textarea"
          value={sentence}
          onChange={(event) => setSentence(event.target.value)}
          placeholder="Example: I feel bright and joyful today!"
          rows={3}
        />

        <div className="toolbar">
          <span className={`mood-chip mood-${mood}`}>
            Detected mood: <strong>{mood}</strong>
          </span>
          <button type="button" onClick={handleGenerate} disabled={!sentence.trim()}>
            Generate painting
          </button>
          <button type="button" onClick={handleSave} disabled={!currentArt}>
            Save to gallery
          </button>
        </div>

        {currentArt ? (
          <div className="current-wrap">
            <Painting art={currentArt} />
            <p className="caption">"{currentArt.sentence}"</p>
          </div>
        ) : (
          <p className="empty-state">Generate a painting to preview it here.</p>
        )}
      </section>

      <section className="gallery-card">
        <h2>Saved gallery</h2>
        {gallery.length === 0 ? (
          <p className="empty-state">No saved paintings yet.</p>
        ) : (
          <div className="gallery-grid">
            {gallery.map((art) => (
              <article key={art.id} className="gallery-item">
                <Painting art={art} compact />
                <p className="gallery-text">{art.sentence}</p>
                <p className={`gallery-mood mood-${art.mood}`}>{art.mood}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

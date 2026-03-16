"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GIF from "gif.js";

const MODE_LABELS = {
  particles: "Particle Bloom",
  waves: "Color Waves",
  fractals: "Fractal Branches"
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_WIDTH = 56;
const BLACK_WIDTH = 36;

function makeNotes(startOctave, octaveCount) {
  const notes = [];
  let whiteIndex = 0;

  for (let octave = startOctave; octave < startOctave + octaveCount; octave += 1) {
    for (let i = 0; i < NOTE_NAMES.length; i += 1) {
      const name = NOTE_NAMES[i];
      const midi = 12 * (octave + 1) + i;
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      const isBlack = name.includes("#");
      const note = {
        id: `${name}${octave}`,
        label: `${name}${octave}`,
        frequency,
        isBlack,
        whiteIndex: isBlack ? whiteIndex - 1 : whiteIndex
      };
      notes.push(note);
      if (!isBlack) {
        whiteIndex += 1;
      }
    }
  }

  return notes;
}

const NOTES = makeNotes(4, 2);
const KEYBOARD_BINDINGS = {
  a: "C4",
  w: "C#4",
  s: "D4",
  e: "D#4",
  d: "E4",
  f: "F4",
  t: "F#4",
  g: "G4",
  y: "G#4",
  h: "A4",
  u: "A#4",
  j: "B4",
  k: "C5",
  o: "C#5",
  l: "D5",
  p: "D#5",
  ";": "E5",
  "'": "F5"
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export default function Home() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);
  const particlesRef = useRef([]);
  const wavesRef = useRef([]);
  const fractalRef = useRef([]);
  const shimmerRef = useRef([]);

  const [mode, setMode] = useState("particles");
  const [activeNote, setActiveNote] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("Export GIF");

  const notesById = useMemo(() => {
    const map = new Map();
    NOTES.forEach((note) => map.set(note.id, note));
    return map;
  }, []);

  const whiteNotes = useMemo(() => NOTES.filter((note) => !note.isBlack), []);
  const blackNotes = useMemo(() => NOTES.filter((note) => note.isBlack), []);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) {
      return audioRef.current;
    }
    const ctx = new window.AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.24;
    master.connect(ctx.destination);
    audioRef.current = { ctx, master };
    setAudioReady(true);
    return audioRef.current;
  }, []);

  const addVisualBurst = useCallback((note, xPos, yPos) => {
    const hue = ((Math.log2(note.frequency / 55) * 90) + 360) % 360;
    let x = xPos ?? randomBetween(0.2, 0.8) * window.innerWidth;
    let y = yPos ?? randomBetween(0.2, 0.8) * window.innerHeight;

    // Shift key-triggered bursts upward so visuals appear above the keyboard.
    if (typeof xPos === "number") {
      x += randomBetween(-48, 48);
    }
    if (typeof yPos === "number") {
      y -= randomBetween(120, 230);
    }
    x = Math.max(24, Math.min(window.innerWidth - 24, x));
    y = Math.max(24, Math.min(window.innerHeight - 24, y));

    particlesRef.current.push(
      ...Array.from({ length: 42 }, () => ({
        x,
        y,
        vx: randomBetween(-4.8, 4.8),
        vy: randomBetween(-4.2, 4.2),
        size: randomBetween(2.2, 6.6),
        life: randomBetween(56, 110),
        maxLife: randomBetween(56, 110),
        hue: (hue + randomBetween(-24, 24) + 360) % 360
      }))
    );

    wavesRef.current.push({
      x,
      y,
      radius: 8,
      speed: randomBetween(2.2, 5.4),
      alpha: 0.92,
      hue,
      thickness: randomBetween(2, 8)
    });

    fractalRef.current.push({
      x,
      y,
      size: randomBetween(92, 180),
      life: 0,
      hue,
      rotation: randomBetween(-1.1, 1.1),
      depth: Math.round(randomBetween(5, 7))
    });

    shimmerRef.current.push({
      hue,
      amplitude: randomBetween(24, 94),
      createdAt: performance.now(),
      wavelength: randomBetween(110, 320)
    });
  }, []);

  const triggerNote = useCallback(
    (note, sourceEvent) => {
      if (!note) return;
      const audio = ensureAudio();
      const now = audio.ctx.currentTime;
      const gain = audio.ctx.createGain();
      const filter = audio.ctx.createBiquadFilter();
      const oscA = audio.ctx.createOscillator();
      const oscB = audio.ctx.createOscillator();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.max(1200, note.frequency * 6), now);
      filter.Q.value = 0.8;

      oscA.type = "triangle";
      oscA.frequency.setValueAtTime(note.frequency, now);
      oscB.type = "sine";
      oscB.frequency.setValueAtTime(note.frequency * 1.997, now);
      oscB.detune.setValueAtTime(6, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.26, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);

      oscA.start(now);
      oscB.start(now);
      oscA.stop(now + 1.35);
      oscB.stop(now + 1.35);

      setActiveNote(note.id);
      window.setTimeout(() => {
        setActiveNote((current) => (current === note.id ? null : current));
      }, 140);

      addVisualBurst(note, sourceEvent?.clientX, sourceEvent?.clientY);
    },
    [addVisualBurst, ensureAudio]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const noteId = KEYBOARD_BINDINGS[key];
      if (!noteId || event.repeat) return;
      const note = notesById.get(noteId);
      triggerNote(note, null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notesById, triggerNote]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawFractalBranch = (x, y, length, angle, depth, hue, alpha) => {
      if (depth <= 0 || length < 2) return;
      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;

      context.strokeStyle = `hsla(${hue}, 90%, 68%, ${alpha})`;
      context.lineWidth = Math.max(0.8, depth * 0.66);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x2, y2);
      context.stroke();

      drawFractalBranch(x2, y2, length * 0.72, angle - 0.46, depth - 1, hue + 10, alpha * 0.84);
      drawFractalBranch(x2, y2, length * 0.72, angle + 0.46, depth - 1, hue - 10, alpha * 0.84);
    };

    const tick = (timestamp) => {
      context.fillStyle = "rgba(4, 6, 14, 0.12)";
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);

      shimmerRef.current = shimmerRef.current.filter((band) => timestamp - band.createdAt < 3600);
      particlesRef.current = particlesRef.current.filter((particle) => particle.life > 0);
      wavesRef.current = wavesRef.current.filter((wave) => wave.alpha > 0.015);
      fractalRef.current = fractalRef.current.filter((burst) => burst.life < 1.45);

      if (mode === "waves") {
        shimmerRef.current.forEach((band, index) => {
          const age = timestamp - band.createdAt;
          const life = 1 - age / 3600;
          if (life <= 0) return;
          context.beginPath();
          for (let x = 0; x <= window.innerWidth; x += 18) {
            const waveY =
              window.innerHeight * (0.2 + (index * 0.11) % 0.68) +
              Math.sin((x + age * 0.25) / band.wavelength) * band.amplitude * life;
            if (x === 0) {
              context.moveTo(x, waveY);
            } else {
              context.lineTo(x, waveY);
            }
          }
          context.strokeStyle = `hsla(${band.hue}, 92%, 60%, ${0.12 + life * 0.35})`;
          context.lineWidth = 2 + life * 5;
          context.stroke();
        });
      }

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.life -= 1;
        const lifeRatio = Math.max(0, particle.life / particle.maxLife);
        if (mode === "particles") {
          context.globalCompositeOperation = "lighter";
          context.shadowBlur = 12;
          context.shadowColor = `hsla(${particle.hue}, 100%, 70%, 0.85)`;
          context.fillStyle = `hsla(${particle.hue}, 100%, 62%, ${lifeRatio})`;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size * (0.5 + lifeRatio), 0, Math.PI * 2);
          context.fill();
          context.shadowBlur = 0;
          context.globalCompositeOperation = "source-over";
        }
      });

      wavesRef.current.forEach((wave) => {
        wave.radius += wave.speed;
        wave.alpha *= 0.965;
        if (mode === "waves") {
          context.strokeStyle = `hsla(${wave.hue}, 100%, 65%, ${wave.alpha})`;
          context.lineWidth = wave.thickness;
          context.beginPath();
          context.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          context.stroke();
        }
      });

      fractalRef.current.forEach((burst) => {
        burst.life += 0.014;
        if (mode === "fractals") {
          const alpha = Math.max(0, 1 - burst.life / 1.45);
          const length = burst.size * (1 + burst.life * 0.6);
          drawFractalBranch(
            burst.x,
            burst.y,
            length,
            -Math.PI / 2 + burst.rotation + Math.sin(timestamp / 370) * 0.22,
            burst.depth,
            burst.hue,
            alpha
          );
        }
      });

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode]);

  const exportGif = useCallback(() => {
    if (exporting || !canvasRef.current) return;

    setExporting(true);
    setExportLabel("Capturing frames...");
    const gif = new GIF({
      workers: 2,
      quality: 8,
      width: canvasRef.current.width,
      height: canvasRef.current.height,
      workerScript: "/gif.worker.js"
    });

    const failExport = () => {
      setExporting(false);
      setExportLabel("Export failed, retry");
      window.setTimeout(() => setExportLabel("Export GIF"), 2400);
    };

    const totalFrames = 90;
    let captured = 0;

    const captureFrame = () => {
      if (!canvasRef.current) {
        failExport();
        return;
      }
      gif.addFrame(canvasRef.current, { copy: true, delay: 33 });
      captured += 1;
      setExportLabel(`Capturing ${captured}/${totalFrames}...`);
      if (captured < totalFrames) {
        window.requestAnimationFrame(captureFrame);
        return;
      }
      setExportLabel("Encoding GIF...");
      gif.on("finished", (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `piano-painting-${Date.now()}.gif`;
        link.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        setExportLabel("Export GIF");
      });
      gif.on("abort", failExport);
      gif.render();
    };

    window.requestAnimationFrame(captureFrame);
  }, [exporting]);

  return (
    <main className="experience">
      <canvas ref={canvasRef} className="visual-canvas" />

      <section className="overlay">
        <header className="toolbar">
          <div>
            <h1>Generative Piano Canvas</h1>
            <p>Play keys to paint with particles, waves, and fractal blooms.</p>
          </div>
          <div className="status-wrap">
            <span className={`status-dot ${audioReady ? "ready" : ""}`} />
            <span className="status-text">{audioReady ? "Audio ready" : "Tap a key to enable audio"}</span>
          </div>
        </header>

        <div className="controls">
          {Object.entries(MODE_LABELS).map(([modeKey, label]) => (
            <button
              key={modeKey}
              type="button"
              className={`mode-btn ${mode === modeKey ? "active" : ""}`}
              onClick={() => setMode(modeKey)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="gif-btn" onClick={exportGif} disabled={exporting}>
            {exportLabel}
          </button>
        </div>

        <div className="piano-wrap">
          <div className="piano" style={{ width: `${whiteNotes.length * WHITE_WIDTH}px` }}>
            {whiteNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`key white ${activeNote === note.id ? "playing" : ""}`}
                style={{ left: `${note.whiteIndex * WHITE_WIDTH}px`, width: `${WHITE_WIDTH}px` }}
                onPointerDown={(event) => triggerNote(note, event)}
              >
                <span>{note.label}</span>
              </button>
            ))}
            {blackNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`key black ${activeNote === note.id ? "playing" : ""}`}
                style={{
                  left: `${note.whiteIndex * WHITE_WIDTH + WHITE_WIDTH - BLACK_WIDTH / 2}px`,
                  width: `${BLACK_WIDTH}px`
                }}
                onPointerDown={(event) => triggerNote(note, event)}
              >
                <span>{note.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

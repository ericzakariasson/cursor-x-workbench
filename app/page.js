"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GIF from "gif.js.optimized";

const WHITE_KEYS = [
  { note: "C4", freq: 261.63, key: "A" },
  { note: "D4", freq: 293.66, key: "S" },
  { note: "E4", freq: 329.63, key: "D" },
  { note: "F4", freq: 349.23, key: "F" },
  { note: "G4", freq: 392.0, key: "G" },
  { note: "A4", freq: 440.0, key: "H" },
  { note: "B4", freq: 493.88, key: "J" },
  { note: "C5", freq: 523.25, key: "K" }
];

const BLACK_KEYS = [
  { note: "C#4", freq: 277.18, key: "W", slot: 1 },
  { note: "D#4", freq: 311.13, key: "E", slot: 2 },
  { note: "F#4", freq: 369.99, key: "T", slot: 4 },
  { note: "G#4", freq: 415.3, key: "Y", slot: 5 },
  { note: "A#4", freq: 466.16, key: "U", slot: 6 }
];

const MODE_OPTIONS = [
  { id: "particles", label: "Particles" },
  { id: "waves", label: "Color Waves" },
  { id: "fractals", label: "Fractals" }
];

const NOTE_LOOKUP = Object.fromEntries(
  [...WHITE_KEYS, ...BLACK_KEYS].map((item) => [item.note, item])
);

const KEY_LOOKUP = Object.fromEntries(
  [...WHITE_KEYS, ...BLACK_KEYS].map((item) => [item.key, item])
);

const EXPORT_FRAME_MS = 80;
const EXPORT_DURATION_MS = 3600;

function hueFromFrequency(freq) {
  return Math.round(((freq - 240) / (530 - 240)) * 240 + 120);
}

export default function Home() {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const modeRef = useRef(MODE_OPTIONS[0].id);
  const particlesRef = useRef([]);
  const wavesRef = useRef([]);
  const fractalsRef = useRef([]);
  const pulsesRef = useRef([]);
  const splashesRef = useRef([]);
  const timersRef = useRef(new Map());
  const audioRef = useRef({ context: null, master: null });

  const [mode, setMode] = useState(MODE_OPTIONS[0].id);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [exportState, setExportState] = useState("idle");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const initAudio = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioRef.current.context) {
      const context = new window.AudioContext();
      const master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      audioRef.current = { context, master };
    }

    if (audioRef.current.context.state === "suspended") {
      await audioRef.current.context.resume();
    }

    return audioRef.current;
  }, []);

  const markNoteActive = useCallback((noteName) => {
    setActiveNotes((previous) => {
      const next = new Set(previous);
      next.add(noteName);
      return next;
    });

    const existingTimer = timersRef.current.get(noteName);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      setActiveNotes((previous) => {
        const next = new Set(previous);
        next.delete(noteName);
        return next;
      });
      timersRef.current.delete(noteName);
    }, 220);

    timersRef.current.set(noteName, timer);
  }, []);

  const spawnParticles = useCallback((note, strength = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerX = width * 0.5;
    const centerY = height * 0.48;
    const hue = hueFromFrequency(note.freq);
    const count = Math.round(36 + strength * 18);

    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 1.6 + Math.random() * 4.4;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.8 + Math.random() * 7,
        life: 1.15 + Math.random() * 0.65,
        hue: hue + Math.random() * 24 - 12
      });
    }
  }, []);

  const spawnWave = useCallback((note, strength = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const hue = hueFromFrequency(note.freq);
    const yPosition = height * (0.22 + Math.random() * 0.56);

    wavesRef.current.push({
      amplitude: 18 + strength * 34,
      frequency: 0.013 + Math.random() * 0.016,
      speed: 0.04 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
      width,
      yPosition,
      life: 1.25,
      hue
    });
  }, []);

  const spawnFractal = useCallback((note, strength = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const hue = hueFromFrequency(note.freq);

    fractalsRef.current.push({
      x: width * (0.2 + Math.random() * 0.6),
      y: height * (0.35 + Math.random() * 0.45),
      length: 85 + strength * 85,
      branchAngle: 0.35 + Math.random() * 0.3,
      depth: 6,
      baseAngle: -Math.PI / 2 + (Math.random() * 2 - 1) * 0.45,
      life: 1,
      hue
    });
  }, []);

  const spawnVisual = useCallback(
    (note, strength = 1) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const hue = hueFromFrequency(note.freq);

        splashesRef.current.push({
          x: width * (0.1 + Math.random() * 0.8),
          y: height * (0.08 + Math.random() * 0.78),
          radius: 65 + Math.random() * 120,
          life: 0.52,
          hue
        });

        pulsesRef.current.push({
          x: width * (0.2 + Math.random() * 0.6),
          y: height * (0.2 + Math.random() * 0.6),
          radius: 18,
          growth: 4 + Math.random() * 4,
          life: 0.95,
          hue
        });
      }

      if (modeRef.current === "particles") {
        spawnParticles(note, strength);
        return;
      }

      if (modeRef.current === "waves") {
        spawnWave(note, strength);
        return;
      }

      spawnFractal(note, strength);
    },
    [spawnFractal, spawnParticles, spawnWave]
  );

  const playNote = useCallback(
    async (noteName, strength = 1) => {
      const note = NOTE_LOOKUP[noteName];
      if (!note) {
        return;
      }

      markNoteActive(noteName);
      spawnVisual(note, strength);

      try {
        const audio = await initAudio();
        if (!audio) {
          return;
        }

        const now = audio.context.currentTime;
        const tone = audio.context.createOscillator();
        const overtone = audio.context.createOscillator();
        const envelope = audio.context.createGain();

        tone.type = "triangle";
        tone.frequency.setValueAtTime(note.freq, now);
        overtone.type = "sine";
        overtone.frequency.setValueAtTime(note.freq * 2, now);

        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(
          0.24 + strength * 0.16,
          now + 0.015
        );
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

        tone.connect(envelope);
        overtone.connect(envelope);
        envelope.connect(audio.master);

        tone.start(now);
        overtone.start(now);
        tone.stop(now + 1.1);
        overtone.stop(now + 1.1);
      } catch {
        // Allow visuals to continue even if audio is unavailable.
      }
    },
    [initAudio, markNoteActive, spawnVisual]
  );

  const exportGif = useCallback(async () => {
    if (exportState === "capturing" || exportState === "encoding") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setExportState("error");
      return;
    }

    setExportState("capturing");

    const gif = new GIF({
      workers: 2,
      quality: 8,
      workerScript: "/gif.worker.js",
      width: canvas.width,
      height: canvas.height,
      background: "#050510"
    });

    await new Promise((resolve) => {
      const start = performance.now();
      const intervalId = window.setInterval(() => {
        gif.addFrame(canvas, { copy: true, delay: EXPORT_FRAME_MS });
        if (performance.now() - start >= EXPORT_DURATION_MS) {
          window.clearInterval(intervalId);
          resolve();
        }
      }, EXPORT_FRAME_MS);
    });

    setExportState("encoding");

    gif.on("finished", (blob) => {
      const outputUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = outputUrl;
      anchor.download = `piano-painting-${Date.now()}.gif`;
      anchor.click();
      URL.revokeObjectURL(outputUrl);
      setExportState("done");
      window.setTimeout(() => setExportState("idle"), 1800);
    });

    gif.on("error", () => {
      setExportState("error");
    });

    gif.render();
  }, [exportState]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) {
        return;
      }

      const key = event.key.toUpperCase();
      const note = KEY_LOOKUP[key];
      if (!note) {
        return;
      }

      event.preventDefault();
      playNote(note.note, 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playNote]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      return undefined;
    }

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = "#050510";
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    };

    const drawFractalBranch = (
      x,
      y,
      length,
      angle,
      depth,
      branchAngle,
      hue,
      alpha
    ) => {
      if (depth <= 0 || length < 2) {
        return;
      }

      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;

      context.strokeStyle = `hsla(${hue}, 100%, 74%, ${alpha})`;
      context.lineWidth = Math.max(1, depth * 0.8);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x2, y2);
      context.stroke();

      drawFractalBranch(
        x2,
        y2,
        length * 0.72,
        angle - branchAngle,
        depth - 1,
        branchAngle,
        hue + 6,
        alpha * 0.82
      );

      drawFractalBranch(
        x2,
        y2,
        length * 0.72,
        angle + branchAngle,
        depth - 1,
        branchAngle,
        hue + 6,
        alpha * 0.82
      );
    };

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      context.fillStyle = "rgba(5, 5, 16, 0.035)";
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = "lighter";
      for (let i = splashesRef.current.length - 1; i >= 0; i -= 1) {
        const splash = splashesRef.current[i];
        splash.life -= 0.013;
        splash.radius *= 0.995;
        context.fillStyle = `hsla(${splash.hue}, 100%, 60%, ${Math.max(
          splash.life,
          0
        )})`;
        context.beginPath();
        context.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
        context.fill();

        if (splash.life <= 0) {
          splashesRef.current.splice(i, 1);
        }
      }

      if (modeRef.current === "particles") {
        context.globalCompositeOperation = "lighter";
        for (let i = particlesRef.current.length - 1; i >= 0; i -= 1) {
          const particle = particlesRef.current[i];
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vx *= 0.984;
          particle.vy *= 0.984;
          particle.life -= 0.02;

          context.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${Math.max(
            particle.life,
            0
          )})`;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          context.fill();

          if (particle.life <= 0) {
            particlesRef.current.splice(i, 1);
          }
        }
      } else if (modeRef.current === "waves") {
        context.globalCompositeOperation = "lighter";
        for (let i = wavesRef.current.length - 1; i >= 0; i -= 1) {
          const wave = wavesRef.current[i];
          wave.phase += wave.speed;
          wave.life -= 0.013;

          context.strokeStyle = `hsla(${wave.hue}, 100%, 68%, ${Math.max(
            wave.life,
            0
          )})`;
          context.lineWidth = 3.6;
          context.beginPath();

          for (let x = 0; x <= wave.width; x += 8) {
            const y =
              wave.yPosition +
              Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
            if (x === 0) {
              context.moveTo(x, y);
            } else {
              context.lineTo(x, y);
            }
          }

          context.stroke();
          wave.amplitude *= 0.995;

          if (wave.life <= 0) {
            wavesRef.current.splice(i, 1);
          }
        }
      } else {
        context.globalCompositeOperation = "lighter";
        for (let i = fractalsRef.current.length - 1; i >= 0; i -= 1) {
          const fractal = fractalsRef.current[i];
          fractal.life -= 0.016;
          fractal.length *= 0.997;

          drawFractalBranch(
            fractal.x,
            fractal.y,
            fractal.length,
            fractal.baseAngle,
            fractal.depth,
            fractal.branchAngle,
            fractal.hue,
            Math.max(fractal.life, 0)
          );

          if (fractal.life <= 0) {
            fractalsRef.current.splice(i, 1);
          }
        }
      }

      context.globalCompositeOperation = "screen";
      for (let i = pulsesRef.current.length - 1; i >= 0; i -= 1) {
        const pulse = pulsesRef.current[i];
        pulse.radius += pulse.growth;
        pulse.life -= 0.045;
        context.strokeStyle = `hsla(${pulse.hue}, 100%, 72%, ${Math.max(
          pulse.life,
          0
        )})`;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        context.stroke();

        if (pulse.life <= 0) {
          pulsesRef.current.splice(i, 1);
        }
      }
      context.globalCompositeOperation = "source-over";

      animationRef.current = window.requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (audioRef.current.context && audioRef.current.context.state !== "closed") {
        audioRef.current.context.close();
      }
    };
  }, []);

  const exportLabel =
    exportState === "capturing"
      ? "Capturing..."
      : exportState === "encoding"
        ? "Encoding GIF..."
        : "Export GIF";

  return (
    <main className="app">
      <canvas ref={canvasRef} className="visualCanvas" />

      <section className="hud">
        <h1>Web Piano Painter</h1>
        <p>
          Play with keyboard, mouse, or touch. Each note paints the screen with
          generative visuals.
        </p>
        <div className="controls">
          <div className="modes">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={mode === option.id ? "active" : ""}
                onClick={() => setMode(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="exportButton"
            onClick={exportGif}
            disabled={exportState === "capturing" || exportState === "encoding"}
          >
            {exportLabel}
          </button>
        </div>
        <p className="status">
          {exportState === "done" && "GIF downloaded."}
          {exportState === "error" && "GIF export failed. Try again."}
          {exportState === "idle" &&
            "Tip: keep playing while capture runs for a richer GIF."}
        </p>
        <p className="hint">Keyboard: A W S E D F T G Y H U J K</p>
      </section>

      <section className="piano" aria-label="Piano keyboard">
        <div className="whiteKeys">
          {WHITE_KEYS.map((item) => (
            <button
              key={item.note}
              type="button"
              className={`whiteKey ${activeNotes.has(item.note) ? "pressed" : ""}`}
              onPointerDown={(event) => {
                event.preventDefault();
                playNote(item.note, event.pressure || 1);
              }}
            >
              <span>{item.note}</span>
              <small>{item.key}</small>
            </button>
          ))}
        </div>
        <div className="blackKeys" aria-hidden="true">
          {BLACK_KEYS.map((item) => (
            <button
              key={item.note}
              type="button"
              className={`blackKey ${activeNotes.has(item.note) ? "pressed" : ""}`}
              style={{ left: `${(item.slot / WHITE_KEYS.length) * 100}%` }}
              onPointerDown={(event) => {
                event.preventDefault();
                playNote(item.note, event.pressure || 1);
              }}
            >
              <span>{item.note}</span>
              <small>{item.key}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

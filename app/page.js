"use client";

import { useEffect, useState } from "react";

const PHASES = ["dawn", "day", "sunset", "night"];

const SCENE_BY_PHASE = {
  dawn: {
    label: "Dawn",
    skyTop: "#1f365f",
    skyMid: "#ef8e6f",
    skyBottom: "#ffcc9f",
    glowColor: "rgba(255, 193, 122, 0.75)",
    glowX: "24%",
    glowY: "23%",
    orbClass: "sun",
    orbTop: "16%",
    orbLeft: "18%",
    hasStars: true
  },
  day: {
    label: "Day",
    skyTop: "#74b9ff",
    skyMid: "#99d3ff",
    skyBottom: "#d8efff",
    glowColor: "rgba(255, 244, 161, 0.8)",
    glowX: "66%",
    glowY: "20%",
    orbClass: "sun",
    orbTop: "14%",
    orbLeft: "62%",
    hasStars: false
  },
  sunset: {
    label: "Sunset",
    skyTop: "#2b2459",
    skyMid: "#d66c6c",
    skyBottom: "#ffb36a",
    glowColor: "rgba(255, 137, 80, 0.75)",
    glowX: "72%",
    glowY: "28%",
    orbClass: "sun",
    orbTop: "24%",
    orbLeft: "68%",
    hasStars: false
  },
  night: {
    label: "Night",
    skyTop: "#050914",
    skyMid: "#0d1e3a",
    skyBottom: "#1b2f4f",
    glowColor: "rgba(178, 205, 255, 0.35)",
    glowX: "78%",
    glowY: "20%",
    orbClass: "moon",
    orbTop: "14%",
    orbLeft: "74%",
    hasStars: true
  }
};

const BUILDINGS = [
  { width: 8, height: 42 },
  { width: 10, height: 52 },
  { width: 8, height: 38 },
  { width: 9, height: 64 },
  { width: 7, height: 47 },
  { width: 11, height: 59 },
  { width: 8, height: 44 },
  { width: 10, height: 67 },
  { width: 7, height: 49 },
  { width: 9, height: 57 }
];

const STARS = [
  { top: 10, left: 12, size: 2.2, delay: 0.2 },
  { top: 18, left: 22, size: 1.9, delay: 1.1 },
  { top: 14, left: 36, size: 1.7, delay: 1.5 },
  { top: 25, left: 44, size: 2.4, delay: 0.6 },
  { top: 8, left: 53, size: 2.1, delay: 1.2 },
  { top: 20, left: 62, size: 1.8, delay: 0.8 },
  { top: 11, left: 76, size: 2.4, delay: 1.4 },
  { top: 24, left: 84, size: 1.7, delay: 0.9 },
  { top: 15, left: 92, size: 2.3, delay: 0.4 },
  { top: 29, left: 7, size: 1.8, delay: 1.7 },
  { top: 33, left: 18, size: 2.5, delay: 0.3 },
  { top: 37, left: 31, size: 1.8, delay: 0.5 },
  { top: 35, left: 48, size: 2.1, delay: 1.8 },
  { top: 39, left: 57, size: 1.9, delay: 0.7 },
  { top: 32, left: 69, size: 2.2, delay: 1.3 },
  { top: 41, left: 81, size: 1.7, delay: 0.6 },
  { top: 35, left: 90, size: 2.5, delay: 1.6 }
];

function phaseFromHour(hour) {
  if (hour >= 5 && hour < 9) {
    return "dawn";
  }
  if (hour >= 9 && hour < 17) {
    return "day";
  }
  if (hour >= 17 && hour < 20) {
    return "sunset";
  }
  return "night";
}

function currentTimeLabel(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [mode, setMode] = useState("auto");

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);

    return () => clearInterval(timerId);
  }, []);

  const activePhase =
    mode === "auto" ? phaseFromHour(currentTime.getHours()) : mode;
  const scene = SCENE_BY_PHASE[activePhase];

  return (
    <main className={`skyline-page phase-${activePhase}`}>
      <section
        className="skyline-wrapper"
        style={{
          "--sky-top": scene.skyTop,
          "--sky-mid": scene.skyMid,
          "--sky-bottom": scene.skyBottom,
          "--glow-color": scene.glowColor,
          "--glow-x": scene.glowX,
          "--glow-y": scene.glowY,
          "--orb-top": scene.orbTop,
          "--orb-left": scene.orbLeft
        }}
      >
        <div className="sky-glow" />
        {scene.hasStars && (
          <div className="stars">
            {STARS.map((star, index) => (
              <span
                key={index}
                className="star"
                style={{
                  top: `${star.top}%`,
                  left: `${star.left}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  animationDelay: `${star.delay}s`
                }}
              />
            ))}
          </div>
        )}
        <div className={`sun-or-moon ${scene.orbClass}`} />
        <div className="horizon" />

        <div className="buildings" aria-hidden="true">
          {BUILDINGS.map((building, index) => (
            <div
              key={index}
              className="building"
              style={{
                "--building-width": `${building.width}%`,
                "--building-height": `${building.height}%`
              }}
            >
              <div className="windows" />
            </div>
          ))}
        </div>
      </section>

      <section className="control-panel">
        <h1>City skyline</h1>
        <p>
          Scene follows your local clock and updates as the day changes.
          Preview any phase below.
        </p>
        <div className="button-row">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={mode === "auto" ? "active" : ""}
          >
            Auto ({currentTimeLabel(currentTime)})
          </button>
          {PHASES.map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setMode(phase)}
              className={mode === phase ? "active" : ""}
            >
              {SCENE_BY_PHASE[phase].label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

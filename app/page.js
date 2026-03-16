"use client";

import { useEffect, useMemo, useState } from "react";

const farBuildings = [24, 30, 28, 34, 26, 32, 22, 36, 29, 31];
const nearBuildings = [40, 52, 48, 56, 44, 58, 46, 50];

function getPhase(date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) {
    return "dawn";
  }
  if (hour >= 8 && hour < 17) {
    return "day";
  }
  if (hour >= 17 && hour < 20) {
    return "sunset";
  }
  return "night";
}

const phaseLabels = {
  dawn: "Dawn",
  day: "Daytime",
  sunset: "Sunset",
  night: "Night"
};

export default function Home() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const updateTime = () => {
      setNow(new Date());
    };

    updateTime();
    const timer = setInterval(updateTime, 60_000);
    return () => clearInterval(timer);
  }, []);

  const phase = now ? getPhase(now) : "day";
  const timeLabel = useMemo(() => {
    if (!now) {
      return "Loading local time…";
    }
    return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [now]);

  return (
    <main className={`skyline-page phase-${phase}`}>
      <section className="skyline-wrapper">
        <header className="status-panel">
          <h1>City Skyline</h1>
          <p>
            {phaseLabels[phase]} · {timeLabel}
          </p>
        </header>

        <div className="scene" role="img" aria-label="Animated city skyline that changes by time of day">
          <div className="sky">
            <div className="sun-moon" />
            <div className="stars">
              {Array.from({ length: 26 }, (_, i) => (
                <span key={i} className="star" style={{ "--i": i }} />
              ))}
            </div>
            <div className="cloud cloud-one" />
            <div className="cloud cloud-two" />
          </div>

          <div className="horizon-glow" />

          <div className="buildings far">
            {farBuildings.map((height, index) => (
              <span
                key={`far-${index}`}
                className="building"
                style={{ "--h": `${height}%`, "--d": `${index * 120}ms` }}
              />
            ))}
          </div>

          <div className="buildings near">
            {nearBuildings.map((height, index) => (
              <span
                key={`near-${index}`}
                className="building"
                style={{ "--h": `${height}%`, "--d": `${index * 110}ms` }}
              />
            ))}
          </div>

          <div className="ground" />
        </div>
      </section>
    </main>
  );
}

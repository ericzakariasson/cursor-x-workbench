"use client";

import { useMemo, useState } from "react";

const AIR_DENSITY_KG_M3 = 1.225;
const HOURS_PER_YEAR = 8760;
const HOUSEHOLD_KWH_PER_YEAR = 10500;
const GRID_CO2_KG_PER_KWH = 0.4;
const CUT_IN_MS = 3;
const RATED_MS = 12;
const CUT_OUT_MS = 25;

function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function calculatePowerKw(windSpeedMs, rotorDiameterM, powerCoefficient, efficiency) {
  if (windSpeedMs < CUT_IN_MS || windSpeedMs > CUT_OUT_MS) {
    return 0;
  }

  const radiusM = rotorDiameterM / 2;
  const sweptAreaM2 = Math.PI * radiusM * radiusM;
  const ratedPowerW =
    0.5 *
    AIR_DENSITY_KG_M3 *
    sweptAreaM2 *
    powerCoefficient *
    efficiency *
    Math.pow(RATED_MS, 3);

  if (windSpeedMs >= RATED_MS) {
    return ratedPowerW / 1000;
  }

  const powerW =
    0.5 *
    AIR_DENSITY_KG_M3 *
    sweptAreaM2 *
    powerCoefficient *
    efficiency *
    Math.pow(windSpeedMs, 3);

  return Math.min(powerW, ratedPowerW) / 1000;
}

function buildDailyProfile(baseWindSpeedMs, variability) {
  return Array.from({ length: 24 }, (_, hour) => {
    const hourAngle = (hour / 24) * Math.PI * 2;
    const dayCycle = 1 + variability * 0.5 * Math.sin(hourAngle - Math.PI / 4);
    const gustCycle = 1 + variability * 0.35 * Math.sin(hourAngle * 3 + 0.9);
    const windSpeedMs = Math.max(0.2, baseWindSpeedMs * dayCycle * gustCycle);
    return { hour, windSpeedMs };
  });
}

export default function Home() {
  const [windSpeedMs, setWindSpeedMs] = useState(8.4);
  const [rotorDiameterM, setRotorDiameterM] = useState(120);
  const [turbineCount, setTurbineCount] = useState(24);
  const [powerCoefficient, setPowerCoefficient] = useState(0.44);
  const [efficiency, setEfficiency] = useState(0.9);
  const [variability, setVariability] = useState(0.28);

  const simulation = useMemo(() => {
    const profile = buildDailyProfile(windSpeedMs, variability);
    const profileWithPower = profile.map((entry) => {
      const powerKwSingle = calculatePowerKw(
        entry.windSpeedMs,
        rotorDiameterM,
        powerCoefficient,
        efficiency
      );
      const powerKwFarm = powerKwSingle * turbineCount;
      return {
        ...entry,
        powerKwFarm
      };
    });

    const averageFarmPowerKw =
      profileWithPower.reduce((sum, entry) => sum + entry.powerKwFarm, 0) /
      profileWithPower.length;
    const annualEnergyKwh = averageFarmPowerKw * HOURS_PER_YEAR;
    const annualEnergyGwh = annualEnergyKwh / 1_000_000;
    const homesPowered = annualEnergyKwh / HOUSEHOLD_KWH_PER_YEAR;
    const co2AvoidedTonnes = (annualEnergyKwh * GRID_CO2_KG_PER_KWH) / 1000;

    const peakFarmPowerKw = Math.max(
      ...profileWithPower.map((entry) => entry.powerKwFarm)
    );
    const capacityFactor = peakFarmPowerKw === 0 ? 0 : averageFarmPowerKw / peakFarmPowerKw;

    return {
      profileWithPower,
      averageFarmPowerKw,
      annualEnergyGwh,
      homesPowered,
      co2AvoidedTonnes,
      capacityFactor,
      peakFarmPowerKw
    };
  }, [efficiency, powerCoefficient, rotorDiameterM, turbineCount, variability, windSpeedMs]);

  const maxPowerKw = Math.max(
    ...simulation.profileWithPower.map((entry) => entry.powerKwFarm),
    1
  );
  const maxWindSpeed = Math.max(
    ...simulation.profileWithPower.map((entry) => entry.windSpeedMs),
    1
  );

  return (
    <main className="page">
      <section className="wind-sim">
        <header className="wind-sim__header">
          <h1>Wind Energy Simulation</h1>
          <p>
            Explore how wind conditions and turbine design change farm output, annual
            generation, and carbon impact.
          </p>
        </header>

        <section className="wind-sim__controls card">
          <h2>Inputs</h2>

          <label className="slider-field">
            <div>
              <span>Average wind speed</span>
              <strong>{formatNumber(windSpeedMs, 1)} m/s</strong>
            </div>
            <input
              type="range"
              min="2"
              max="18"
              step="0.1"
              value={windSpeedMs}
              onChange={(event) => setWindSpeedMs(Number(event.target.value))}
            />
          </label>

          <label className="slider-field">
            <div>
              <span>Rotor diameter</span>
              <strong>{formatNumber(rotorDiameterM, 0)} m</strong>
            </div>
            <input
              type="range"
              min="40"
              max="180"
              step="1"
              value={rotorDiameterM}
              onChange={(event) => setRotorDiameterM(Number(event.target.value))}
            />
          </label>

          <label className="slider-field">
            <div>
              <span>Turbines in farm</span>
              <strong>{formatNumber(turbineCount, 0)}</strong>
            </div>
            <input
              type="range"
              min="1"
              max="120"
              step="1"
              value={turbineCount}
              onChange={(event) => setTurbineCount(Number(event.target.value))}
            />
          </label>

          <label className="slider-field">
            <div>
              <span>Power coefficient (Cp)</span>
              <strong>{formatNumber(powerCoefficient, 2)}</strong>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.55"
              step="0.01"
              value={powerCoefficient}
              onChange={(event) => setPowerCoefficient(Number(event.target.value))}
            />
          </label>

          <label className="slider-field">
            <div>
              <span>Electrical efficiency</span>
              <strong>{formatNumber(efficiency * 100, 0)}%</strong>
            </div>
            <input
              type="range"
              min="0.7"
              max="0.98"
              step="0.01"
              value={efficiency}
              onChange={(event) => setEfficiency(Number(event.target.value))}
            />
          </label>

          <label className="slider-field">
            <div>
              <span>Wind variability</span>
              <strong>{formatNumber(variability * 100, 0)}%</strong>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.45"
              step="0.01"
              value={variability}
              onChange={(event) => setVariability(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="wind-sim__metrics">
          <article className="metric card">
            <h3>Average farm output</h3>
            <p>{formatNumber(simulation.averageFarmPowerKw / 1000, 2)} MW</p>
          </article>
          <article className="metric card">
            <h3>Peak farm output</h3>
            <p>{formatNumber(simulation.peakFarmPowerKw / 1000, 2)} MW</p>
          </article>
          <article className="metric card">
            <h3>Annual generation</h3>
            <p>{formatNumber(simulation.annualEnergyGwh, 2)} GWh</p>
          </article>
          <article className="metric card">
            <h3>Capacity factor</h3>
            <p>{formatNumber(simulation.capacityFactor * 100, 1)}%</p>
          </article>
          <article className="metric card">
            <h3>Homes powered</h3>
            <p>{formatNumber(simulation.homesPowered, 0)}</p>
          </article>
          <article className="metric card">
            <h3>CO₂ avoided yearly</h3>
            <p>{formatNumber(simulation.co2AvoidedTonnes, 0)} tonnes</p>
          </article>
        </section>

        <section className="card wind-sim__chart-card">
          <h2>24-hour wind and power profile</h2>
          <div className="profile-chart" role="img" aria-label="Wind and power by hour">
            {simulation.profileWithPower.map((entry) => (
              <div className="profile-chart__hour" key={entry.hour}>
                <div
                  className="profile-chart__bar profile-chart__bar--power"
                  style={{
                    height: `${Math.max(6, (entry.powerKwFarm / maxPowerKw) * 100)}%`
                  }}
                  title={`${entry.hour}:00 farm power ${formatNumber(entry.powerKwFarm / 1000, 2)} MW`}
                />
                <div
                  className="profile-chart__bar profile-chart__bar--wind"
                  style={{
                    height: `${Math.max(6, (entry.windSpeedMs / maxWindSpeed) * 100)}%`
                  }}
                  title={`${entry.hour}:00 wind ${formatNumber(entry.windSpeedMs, 1)} m/s`}
                />
                <span>{entry.hour}</span>
              </div>
            ))}
          </div>
          <p className="wind-sim__chart-legend">
            <span>
              <i className="legend-swatch legend-swatch--power" />
              Farm power
            </span>
            <span>
              <i className="legend-swatch legend-swatch--wind" />
              Wind speed
            </span>
          </p>
        </section>
      </section>
    </main>
  );
}

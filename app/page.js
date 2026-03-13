"use client";

import { useMemo, useState } from "react";

const MIN_RPS = 1;
const MAX_RPS = 100;

export default function Home() {
  const [url, setUrl] = useState("");
  const [reqPerSecond, setReqPerSecond] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const totalPlannedRequests = useMemo(
    () => reqPerSecond * durationSeconds,
    [reqPerSecond, durationSeconds]
  );

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!url.trim()) {
      setError("Please enter a target URL.");
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch("/api/load-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          reqPerSecond,
          durationSeconds,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Load test failed.");
      }
      setResult(payload);
    } catch (submitError) {
      setError(submitError.message || "Unexpected error while running test.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Load Test Runner</h1>
        <p className="subtitle">
          Send controlled traffic from a backend route to a target URL.
        </p>

        <form className="form" onSubmit={onSubmit}>
          <label className="label" htmlFor="target-url">
            Target URL
          </label>
          <input
            id="target-url"
            type="url"
            className="input"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />

          <div className="row">
            <label className="label" htmlFor="rps-slider">
              Requests / second: <strong>{reqPerSecond}</strong>
            </label>
            <input
              id="rps-slider"
              type="range"
              min={MIN_RPS}
              max={MAX_RPS}
              value={reqPerSecond}
              onChange={(event) => setReqPerSecond(Number(event.target.value))}
            />
          </div>

          <label className="label" htmlFor="duration-seconds">
            Duration (seconds)
          </label>
          <input
            id="duration-seconds"
            type="number"
            min={1}
            max={60}
            className="input"
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(Number(event.target.value) || 1)}
          />

          <p className="hint">
            Planned requests: <strong>{totalPlannedRequests}</strong>
          </p>

          <button className="button" type="submit" disabled={isRunning}>
            {isRunning ? "Running..." : "Start load test"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        {result ? (
          <section className="results">
            <h2>Results</h2>
            <dl>
              <div>
                <dt>Target</dt>
                <dd>{result.targetUrl}</dd>
              </div>
              <div>
                <dt>Total sent</dt>
                <dd>{result.totalRequests}</dd>
              </div>
              <div>
                <dt>Success</dt>
                <dd>{result.successCount}</dd>
              </div>
              <div>
                <dt>Failed</dt>
                <dd>{result.failureCount}</dd>
              </div>
              <div>
                <dt>Success rate</dt>
                <dd>{result.successRate}%</dd>
              </div>
              <div>
                <dt>Average latency</dt>
                <dd>{result.averageLatencyMs} ms</dd>
              </div>
              <div>
                <dt>P95 latency</dt>
                <dd>{result.p95LatencyMs} ms</dd>
              </div>
              <div>
                <dt>Achieved RPS</dt>
                <dd>{result.achievedRps}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </section>
    </main>
  );
}

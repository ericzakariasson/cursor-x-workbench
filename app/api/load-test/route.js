import { NextResponse } from "next/server";

const MAX_REQ_PER_SECOND = 200;
const MAX_DURATION_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 10000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index];
}

async function runSingleRequest(targetUrl) {
  const started = Date.now();
  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return {
      ok: response.ok,
      latencyMs: Date.now() - started,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      status: 0,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const inputUrl = typeof payload?.url === "string" ? payload.url.trim() : "";
  const reqPerSecondRaw = Number(payload?.reqPerSecond);
  const durationRaw = Number(payload?.durationSeconds);

  if (!inputUrl) {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(inputUrl);
  } catch {
    return NextResponse.json({ error: "URL is not valid." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return NextResponse.json(
      { error: "URL must start with http:// or https://." },
      { status: 400 }
    );
  }

  const reqPerSecond = Math.min(
    MAX_REQ_PER_SECOND,
    Math.max(1, Math.floor(reqPerSecondRaw || 1))
  );
  const durationSeconds = Math.min(
    MAX_DURATION_SECONDS,
    Math.max(1, Math.floor(durationRaw || 1))
  );

  const latencies = [];
  let successCount = 0;
  let failureCount = 0;
  const started = Date.now();

  for (let second = 0; second < durationSeconds; second += 1) {
    const secondStart = Date.now();
    const batch = await Promise.all(
      Array.from({ length: reqPerSecond }, () => runSingleRequest(targetUrl.href))
    );

    for (const result of batch) {
      latencies.push(result.latencyMs);
      if (result.ok) {
        successCount += 1;
      } else {
        failureCount += 1;
      }
    }

    const elapsedForSecond = Date.now() - secondStart;
    if (second < durationSeconds - 1 && elapsedForSecond < 1000) {
      await sleep(1000 - elapsedForSecond);
    }
  }

  const finished = Date.now();
  const totalRequests = successCount + failureCount;
  const durationActualSeconds = Math.max(0.001, (finished - started) / 1000);
  const averageLatencyMs = latencies.length
    ? Math.round(latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length)
    : 0;
  const p95LatencyMs = Math.round(percentile(latencies, 95));
  const successRate = totalRequests
    ? Number(((successCount / totalRequests) * 100).toFixed(2))
    : 0;
  const achievedRps = Number((totalRequests / durationActualSeconds).toFixed(2));

  return NextResponse.json({
    targetUrl: targetUrl.href,
    reqPerSecond,
    durationSeconds,
    totalRequests,
    successCount,
    failureCount,
    successRate,
    averageLatencyMs,
    p95LatencyMs,
    achievedRps,
  });
}

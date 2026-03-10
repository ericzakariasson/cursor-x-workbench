"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DENSITY = ".,:;irsXA253hMHGS#9B&@";
const DEMO_SOURCE_WIDTH = 640;
const DEMO_SOURCE_HEIGHT = 360;
const MIN_COLUMNS = 24;
const MAX_COLUMNS = 520;
const MIN_ROWS = 16;
const MAX_ROWS = 320;

function luminanceToChar(luminance) {
  const index = Math.min(
    DENSITY.length - 1,
    Math.floor((luminance / 255) * DENSITY.length),
  );
  return DENSITY[index];
}

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const demoCanvasRef = useRef(null);
  const asciiOutputRef = useRef(null);
  const frameRef = useRef(0);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const modeRef = useRef(null);
  const fpsRef = useRef(15);
  const renderGridRef = useRef({ columns: 120, rows: 56 });
  const textMeasureCanvasRef = useRef(null);

  const [ascii, setAscii] = useState("");
  const [mode, setMode] = useState(null);
  const [error, setError] = useState("");
  const [fps, setFps] = useState(15);
  const [gridInfo, setGridInfo] = useState({ columns: 120, rows: 56 });

  const gridLabel = useMemo(
    () => `${gridInfo.columns} x ${gridInfo.rows}`,
    [gridInfo.columns, gridInfo.rows],
  );

  useEffect(() => {
    fpsRef.current = fps;
  }, [fps]);

  const stopFeed = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    modeRef.current = null;
    setMode(null);
    frameRef.current = 0;
  }, []);

  const drawDemoFrame = useCallback((context, width, height, time) => {
    for (let y = 0; y < height; y += 1) {
      const ny = y / height;
      for (let x = 0; x < width; x += 1) {
        const nx = x / width;
        const waveA = Math.sin(nx * 12 + time * 0.0035);
        const waveB = Math.cos(ny * 10 - time * 0.0048);
        const waveC = Math.sin((nx + ny) * 18 + time * 0.0025);
        const v = (waveA + waveB + waveC + 3) / 6;
        const value = Math.floor(v * 255);

        context.fillStyle = `rgb(${value}, ${value}, ${value})`;
        context.fillRect(x, y, 1, 1);
      }
    }
  }, []);

  const renderLoop = useCallback(() => {
    const activeMode = modeRef.current;
    if (!activeMode) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const demoCanvas = demoCanvasRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (activeMode === "camera" && (!video || video.readyState < 2)) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    frameRef.current += 1;
    const frameInterval = Math.max(1, Math.round(60 / fpsRef.current));
    if (frameRef.current % frameInterval !== 0) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const width = Math.max(MIN_COLUMNS, renderGridRef.current.columns);
    const height = Math.max(MIN_ROWS, renderGridRef.current.rows);
    if (width <= 0 || height <= 0) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      setError("Could not initialize canvas context.");
      stopFeed();
      return;
    }

    if (activeMode === "camera") {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      if (sourceWidth <= 0 || sourceHeight <= 0) {
        rafRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const targetAspect = width / height;
      const sourceAspect = sourceWidth / sourceHeight;
      let sx = 0;
      let sy = 0;
      let sw = sourceWidth;
      let sh = sourceHeight;

      if (sourceAspect > targetAspect) {
        sw = sourceHeight * targetAspect;
        sx = (sourceWidth - sw) / 2;
      } else {
        sh = sourceWidth / targetAspect;
        sy = (sourceHeight - sh) / 2;
      }

      context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
    } else if (activeMode === "demo" && demoCanvas) {
      demoCanvas.width = width;
      demoCanvas.height = height;
      const demoContext = demoCanvas.getContext("2d");
      if (!demoContext) {
        setError("Could not initialize demo canvas.");
        stopFeed();
        return;
      }
      drawDemoFrame(demoContext, width, height, performance.now());
      context.drawImage(demoCanvas, 0, 0);
    }

    const { data } = context.getImageData(0, 0, width, height);

    let output = "";
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        output += luminanceToChar(luminance);
      }
      output += "\n";
    }

    setAscii(output);
    rafRef.current = requestAnimationFrame(renderLoop);
  }, [drawDemoFrame, stopFeed]);

  const startRendering = useCallback(
    (nextMode) => {
      frameRef.current = 0;
      modeRef.current = nextMode;
      setMode(nextMode);
      rafRef.current = requestAnimationFrame(renderLoop);
    },
    [renderLoop],
  );

  const startCamera = useCallback(async () => {
    stopFeed();
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        setError("Video element missing.");
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      startRendering("camera");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Camera access failed: ${err.message}`
          : "Camera access failed.",
      );
      stopFeed();
    }
  }, [startRendering, stopFeed]);

  const startDemoFeed = useCallback(() => {
    stopFeed();
    setError("");
    startRendering("demo");
  }, [startRendering, stopFeed]);

  useEffect(() => {
    const updateRenderGrid = () => {
      const outputElement = asciiOutputRef.current;
      if (!outputElement) {
        return;
      }

      const computedStyle = window.getComputedStyle(outputElement);
      const fontSize = Number.parseFloat(computedStyle.fontSize) || 6;
      const lineHeight = Number.parseFloat(computedStyle.lineHeight) || fontSize;
      const horizontalPadding =
        (Number.parseFloat(computedStyle.paddingLeft) || 0) +
        (Number.parseFloat(computedStyle.paddingRight) || 0);
      const verticalPadding =
        (Number.parseFloat(computedStyle.paddingTop) || 0) +
        (Number.parseFloat(computedStyle.paddingBottom) || 0);
      const usableWidth = Math.max(80, outputElement.clientWidth - horizontalPadding);
      const usableHeight = Math.max(80, outputElement.clientHeight - verticalPadding);
      if (!textMeasureCanvasRef.current) {
        textMeasureCanvasRef.current = document.createElement("canvas");
      }
      const measureContext = textMeasureCanvasRef.current.getContext("2d");
      let estimatedCharWidth = Math.max(2, fontSize * 0.62);
      if (measureContext) {
        const font = computedStyle.font || `${fontSize}px ${computedStyle.fontFamily}`;
        measureContext.font = font;
        estimatedCharWidth = Math.max(2, measureContext.measureText("M").width);
      }
      const nextColumns = Math.max(
        MIN_COLUMNS,
        Math.min(MAX_COLUMNS, Math.floor(usableWidth / estimatedCharWidth)),
      );
      const nextRows = Math.max(
        MIN_ROWS,
        Math.min(MAX_ROWS, Math.floor(usableHeight / Math.max(4, lineHeight))),
      );

      renderGridRef.current = { columns: nextColumns, rows: nextRows };
      setGridInfo((previous) =>
        previous.columns === nextColumns && previous.rows === nextRows
          ? previous
          : { columns: nextColumns, rows: nextRows },
      );
    };

    updateRenderGrid();
    const observer = new ResizeObserver(updateRenderGrid);
    if (asciiOutputRef.current) {
      observer.observe(asciiOutputRef.current);
    }
    window.addEventListener("resize", updateRenderGrid);
    window.addEventListener("orientationchange", updateRenderGrid);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateRenderGrid);
      window.removeEventListener("orientationchange", updateRenderGrid);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopFeed();
    };
  }, [stopFeed]);

  return (
    <main className="page">
      <section className="card">
        <h1>ASCII Camera</h1>
        <p>Turn your webcam into live ASCII art in real time with mobile-first responsive rendering.</p>

        <div className="controls">
          <div className="buttonRow">
            <button
              className="controlButton"
              type="button"
              onClick={mode === "camera" ? stopFeed : startCamera}
            >
              {mode === "camera" ? "Stop Camera" : "Start Camera"}
            </button>

            <button
              className="controlButton secondaryButton"
              type="button"
              onClick={mode === "demo" ? stopFeed : startDemoFeed}
            >
              {mode === "demo" ? "Stop Demo Feed" : "Start Demo Feed"}
            </button>
          </div>

          <p className="gridInfo">Render grid: {gridLabel}</p>

          <label htmlFor="fps">
            FPS cap: <span>{fps}</span>
          </label>
          <input
            id="fps"
            type="range"
            min="5"
            max="30"
            step="1"
            value={fps}
            onChange={(event) => setFps(Number(event.target.value))}
          />
        </div>

        {error ? <p className="error">{error}</p> : null}

        <pre ref={asciiOutputRef} className="asciiOutput" aria-live="polite">
          {ascii || "Press Start Camera to begin (or use Demo Feed)."}
        </pre>

        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={demoCanvasRef} className="hidden" />
      </section>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DENSITY = ".,:;irsXA253hMHGS#9B&@";
const CHAR_ASPECT_RATIO = 0.5;
const DEMO_SOURCE_WIDTH = 640;
const DEMO_SOURCE_HEIGHT = 360;

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
  const frameRef = useRef(0);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [ascii, setAscii] = useState("");
  const [mode, setMode] = useState(null);
  const [error, setError] = useState("");
  const [columns, setColumns] = useState(120);
  const [fps, setFps] = useState(15);

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

    setMode(null);
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
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const demoCanvas = demoCanvasRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (mode === "camera" && (!video || video.readyState < 2)) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    frameRef.current += 1;
    const frameInterval = Math.max(1, Math.round(60 / fps));
    if (frameRef.current % frameInterval !== 0) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const width = Math.max(1, columns);
    const sourceWidth = mode === "camera" ? video.videoWidth : DEMO_SOURCE_WIDTH;
    const sourceHeight = mode === "camera" ? video.videoHeight : DEMO_SOURCE_HEIGHT;
    const height = Math.max(
      1,
      Math.floor((sourceHeight / sourceWidth) * width * CHAR_ASPECT_RATIO),
    );

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      setError("Could not initialize canvas context.");
      stopFeed();
      return;
    }

    if (mode === "camera") {
      context.drawImage(video, 0, 0, width, height);
    } else if (mode === "demo" && demoCanvas) {
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
  }, [columns, drawDemoFrame, fps, mode, stopFeed]);

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

      frameRef.current = 0;
      setMode("camera");
      rafRef.current = requestAnimationFrame(renderLoop);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Camera access failed: ${err.message}`
          : "Camera access failed.",
      );
      stopFeed();
    }
  }, [renderLoop, stopFeed]);

  const startDemoFeed = useCallback(() => {
    stopFeed();
    setError("");
    frameRef.current = 0;
    setMode("demo");
    rafRef.current = requestAnimationFrame(renderLoop);
  }, [renderLoop, stopFeed]);

  useEffect(() => {
    return () => {
      stopFeed();
    };
  }, [stopFeed]);

  return (
    <main className="page">
      <section className="card">
        <h1>ASCII Camera</h1>
        <p>Turn your webcam into live ASCII art in real time.</p>

        <div className="controls">
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

          <label htmlFor="columns">
            Columns: <span>{columns}</span>
          </label>
          <input
            id="columns"
            type="range"
            min="60"
            max="180"
            step="2"
            value={columns}
            onChange={(event) => setColumns(Number(event.target.value))}
          />

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

        <pre className="asciiOutput" aria-live="polite">
          {ascii || "Press Start Camera to begin (or use Demo Feed)."}
        </pre>

        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={demoCanvasRef} className="hidden" />
      </section>
    </main>
  );
}

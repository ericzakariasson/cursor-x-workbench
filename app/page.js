"use client";

import { useEffect, useRef } from "react";

const BLOB_COUNT = 18;

function buildRoundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function createBlob(lamp) {
  const radius = lamp.width * (0.07 + Math.random() * 0.08);
  return {
    x: lamp.x + radius + Math.random() * (lamp.width - radius * 2),
    y: lamp.y + radius + Math.random() * (lamp.height - radius * 2),
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.7,
    radius,
    temp: Math.random() * 0.25,
    drift: Math.random() * Math.PI * 2,
  };
}

export default function Home() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return undefined;
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let lamp = { x: 0, y: 0, width: 0, height: 0 };
    const blobs = [];
    const pointer = {
      x: 0,
      y: 0,
      active: false,
      heatRadius: 220,
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.max(1, window.devicePixelRatio || 1);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      lamp = {
        width: Math.min(430, width * 0.38),
        height: Math.min(660, height * 0.8),
        x: (width - Math.min(430, width * 0.38)) / 2,
        y: (height - Math.min(660, height * 0.8)) / 2,
      };

      pointer.heatRadius = Math.max(140, lamp.width * 0.62);

      if (blobs.length === 0) {
        for (let i = 0; i < BLOB_COUNT; i += 1) {
          blobs.push(createBlob(lamp));
        }
      } else {
        for (const blob of blobs) {
          blob.x = Math.min(Math.max(blob.x, lamp.x + blob.radius), lamp.x + lamp.width - blob.radius);
          blob.y = Math.min(Math.max(blob.y, lamp.y + blob.radius), lamp.y + lamp.height - blob.radius);
        }
      }
    };

    const updateBlob = (blob) => {
      blob.drift += 0.012;
      blob.vx += Math.sin(blob.drift) * 0.015;

      if (pointer.active) {
        const dx = pointer.x - blob.x;
        const dy = pointer.y - blob.y;
        const distSquared = dx * dx + dy * dy + 1;
        const heat = Math.exp(-distSquared / (pointer.heatRadius * pointer.heatRadius));
        const invDistance = 1 / Math.sqrt(distSquared);

        blob.temp = Math.min(1.6, blob.temp + heat * 0.09);
        blob.vy -= heat * 0.24;
        blob.vx += dx * invDistance * heat * 0.07;
      } else {
        blob.temp *= 0.987;
      }

      blob.vy -= 0.018 + blob.temp * 0.06;

      if (blob.y < lamp.y + lamp.height * 0.28) {
        blob.vy += 0.08;
        blob.temp *= 0.976;
      }

      blob.vx *= 0.987;
      blob.vy *= 0.986;
      blob.x += blob.vx;
      blob.y += blob.vy;

      if (blob.x < lamp.x + blob.radius) {
        blob.x = lamp.x + blob.radius;
        blob.vx = Math.abs(blob.vx) * 0.62;
      } else if (blob.x > lamp.x + lamp.width - blob.radius) {
        blob.x = lamp.x + lamp.width - blob.radius;
        blob.vx = -Math.abs(blob.vx) * 0.62;
      }

      if (blob.y < lamp.y + blob.radius) {
        blob.y = lamp.y + blob.radius;
        blob.vy = Math.abs(blob.vy) * 0.5;
        blob.temp *= 0.92;
      } else if (blob.y > lamp.y + lamp.height - blob.radius) {
        blob.y = lamp.y + lamp.height - blob.radius;
        blob.vy = -Math.abs(blob.vy) * 0.65;
        blob.temp = Math.min(1.6, blob.temp + 0.06);
      }
    };

    const drawLampShell = () => {
      const borderRadius = lamp.width * 0.48;

      buildRoundedRectPath(ctx, lamp.x, lamp.y, lamp.width, lamp.height, borderRadius);
      const glassGradient = ctx.createLinearGradient(lamp.x, lamp.y, lamp.x, lamp.y + lamp.height);
      glassGradient.addColorStop(0, "rgba(255, 255, 255, 0.14)");
      glassGradient.addColorStop(0.5, "rgba(160, 180, 255, 0.08)");
      glassGradient.addColorStop(1, "rgba(70, 70, 110, 0.2)");
      ctx.fillStyle = glassGradient;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(195, 210, 255, 0.24)";
      ctx.stroke();

      const baseHeight = Math.max(42, lamp.height * 0.08);
      const baseY = lamp.y + lamp.height + 12;
      const baseGradient = ctx.createLinearGradient(lamp.x, baseY, lamp.x, baseY + baseHeight);
      baseGradient.addColorStop(0, "#3f3f52");
      baseGradient.addColorStop(1, "#1b1b24");

      buildRoundedRectPath(ctx, lamp.x + lamp.width * 0.08, baseY, lamp.width * 0.84, baseHeight, baseHeight * 0.5);
      ctx.fillStyle = baseGradient;
      ctx.fill();
    };

    const render = () => {
      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#060a15");
      background.addColorStop(1, "#040307");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      for (const blob of blobs) {
        updateBlob(blob);
      }

      const borderRadius = lamp.width * 0.48;
      ctx.save();
      buildRoundedRectPath(ctx, lamp.x, lamp.y, lamp.width, lamp.height, borderRadius);
      ctx.clip();
      ctx.fillStyle = "rgba(5, 7, 20, 0.82)";
      ctx.fillRect(lamp.x, lamp.y, lamp.width, lamp.height);

      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `blur(${Math.max(12, lamp.width * 0.05)}px)`;
      for (const blob of blobs) {
        const glow = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        glow.addColorStop(0, `rgba(255, ${140 + Math.round(blob.temp * 65)}, 72, ${0.5 + blob.temp * 0.3})`);
        glow.addColorStop(1, "rgba(255, 60, 10, 0)");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = "none";
      ctx.restore();

      drawLampShell();

      if (pointer.active) {
        const flare = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, pointer.heatRadius * 1.2);
        flare.addColorStop(0, "rgba(255, 185, 110, 0.14)");
        flare.addColorStop(1, "rgba(255, 185, 110, 0)");
        ctx.fillStyle = flare;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, pointer.heatRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(render);
    };

    const setPointer = (x, y) => {
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    };

    const handleMove = (event) => {
      setPointer(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        setPointer(touch.clientX, touch.clientY);
      }
    };

    const handleLeave = () => {
      pointer.active = false;
    };

    resize();
    render();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerleave", handleLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleLeave);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleLeave);
    };
  }, []);

  return (
    <main className="page">
      <canvas ref={canvasRef} className="lamp-canvas" />
      <section className="hud">
        <h1>Cursor-Heated Lava Lamp</h1>
        <p>Move your cursor around the glass to inject heat and stir the blobs.</p>
      </section>
    </main>
  );
}

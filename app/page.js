"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

const MIN_RESOLUTION = 24;
const MAX_RESOLUTION = 180;

const valleyColor = new THREE.Color("#2e6be0");
const midColor = new THREE.Color("#4ead6a");
const peakColor = new THREE.Color("#eef5ff");
const scratchColor = new THREE.Color();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mapElevationToColor(height, minHeight, maxHeight) {
  if (height <= 0) {
    const valleyT = minHeight < 0 ? clamp((height - minHeight) / (0 - minHeight), 0, 1) : 1;
    scratchColor.lerpColors(valleyColor, midColor, valleyT);
    return scratchColor;
  }

  const peakT = maxHeight > 0 ? clamp(height / maxHeight, 0, 1) : 0;
  scratchColor.lerpColors(midColor, peakColor, peakT);
  return scratchColor;
}

function disposeAudio(audioRef) {
  if (!audioRef.current) return;

  const { stream, source, analyser, context } = audioRef.current;
  if (source) source.disconnect();
  if (analyser) analyser.disconnect();
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (context && context.state !== "closed") {
    context.close();
  }
  audioRef.current = null;
}

export default function Home() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const terrainRef = useRef(null);
  const animationRef = useRef(null);
  const frameCountRef = useRef(0);
  const audioRef = useRef(null);
  const smoothAudioRef = useRef({ level: 0.04, jagged: 0.02 });
  const resolutionRef = useRef(96);

  const [resolution, setResolution] = useState(96);
  const [micStatus, setMicStatus] = useState("Mic is off");
  const [isMicOn, setIsMicOn] = useState(false);

  function createTerrainMesh(targetResolution) {
    const scene = sceneRef.current;
    if (!scene) return;

    if (terrainRef.current) {
      scene.remove(terrainRef.current);
      terrainRef.current.geometry.dispose();
      terrainRef.current.material.dispose();
    }

    const segments = clamp(targetResolution - 1, MIN_RESOLUTION - 1, MAX_RESOLUTION - 1);
    const geometry = new THREE.PlaneGeometry(26, 26, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3),
    );

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0;
    scene.add(mesh);
    terrainRef.current = mesh;
  }

  function getAudioSignal() {
    const currentAudio = audioRef.current;
    if (!currentAudio?.analyser || !currentAudio?.freqData) {
      return { level: 0.045, jagged: 0.02 };
    }

    const { analyser, freqData } = currentAudio;
    analyser.getByteFrequencyData(freqData);

    let total = 0;
    let high = 0;
    for (let i = 0; i < freqData.length; i += 1) {
      const value = freqData[i] / 255;
      total += value;
      if (i > freqData.length * 0.62) {
        high += value;
      }
    }

    const average = total / freqData.length;
    const highAverage = high / (freqData.length * 0.38);
    const dynamicLevel = clamp(average * 1.95, 0, 1);
    const jaggedness = clamp((highAverage - average * 0.35) * 2.2, 0, 1);

    return { level: dynamicLevel, jagged: jaggedness };
  }

  function updateTerrain(timeSeconds) {
    const terrain = terrainRef.current;
    if (!terrain) return;

    const signal = getAudioSignal();
    const smoothSignal = smoothAudioRef.current;
    smoothSignal.level = lerp(smoothSignal.level, signal.level, 0.08);
    smoothSignal.jagged = lerp(smoothSignal.jagged, signal.jagged, 0.08);

    const amplitude = 0.65 + smoothSignal.level * 4.3;
    const roughness = smoothSignal.jagged * (0.5 + smoothSignal.level * 1.8);

    const geometry = terrain.geometry;
    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;
    const terrainRadius = 13;

    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const distance = Math.sqrt(x * x + z * z);
      const edgeFalloff = 1 - clamp(distance / terrainRadius, 0, 1);
      const bowl = edgeFalloff * edgeFalloff;

      const whisperHills =
        (Math.sin(x * 0.34 + timeSeconds * 0.35) + Math.cos(z * 0.31 - timeSeconds * 0.28)) * 0.5;

      const rollingHills =
        Math.sin(x * 0.18 + z * 0.22 + timeSeconds * 0.22) * Math.cos(z * 0.17 - timeSeconds * 0.18);

      const sharpRidges =
        Math.sin(x * 1.75 + timeSeconds * 2.8) *
        Math.cos(z * 1.62 - timeSeconds * 2.6) *
        Math.sin((x + z) * 2.7 + timeSeconds * 3.2);

      const whisperShape = (whisperHills * 0.7 + rollingHills * 0.65) * amplitude;
      const shoutShape = Math.sign(sharpRidges) * Math.pow(Math.abs(sharpRidges), 1.25) * roughness * 5;
      const height = (whisperShape + shoutShape) * (0.35 + bowl * 0.95);

      positions.setY(i, height);
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }

    for (let i = 0; i < positions.count; i += 1) {
      const color = mapElevationToColor(positions.getY(i), minHeight, maxHeight);
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;

    frameCountRef.current += 1;
    if (frameCountRef.current % 2 === 0) {
      geometry.computeVertexNormals();
      geometry.attributes.normal.needsUpdate = true;
    }
  }

  async function startMic() {
    if (audioRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const context = new AudioCtx();
      await context.resume();

      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      audioRef.current = {
        stream,
        source,
        analyser,
        context,
        freqData: new Uint8Array(analyser.frequencyBinCount),
      };

      setIsMicOn(true);
      setMicStatus("Mic is live. Whisper for soft hills, shout for jagged peaks.");
    } catch (error) {
      setIsMicOn(false);
      setMicStatus("Mic unavailable. Allow microphone access and try again.");
      disposeAudio(audioRef);
      console.error("Microphone error", error);
    }
  }

  function stopMic() {
    disposeAudio(audioRef);
    smoothAudioRef.current = { level: 0.04, jagged: 0.02 };
    setIsMicOn(false);
    setMicStatus("Mic is off");
  }

  function exportSTL() {
    const terrain = terrainRef.current;
    if (!terrain) return;

    terrain.updateMatrixWorld(true);
    const exporter = new STLExporter();
    const stl = exporter.parse(terrain, { binary: false });
    const blob = new Blob([stl], { type: "model/stl" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mic_terrain_${resolutionRef.current}.stl`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f1a20");
    scene.fog = new THREE.Fog("#0f1a20", 14, 48);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 140);
    camera.position.set(15, 10.5, 14);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    mountNode.append(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight("#d8f1ff", "#1b2430", 1.1);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight("#ffffff", 1.1);
    keyLight.position.set(8, 14, 9);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#9bc8ff", 0.35);
    fillLight.position.set(-10, 8, -8);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.38;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 10;
    controls.maxDistance = 26;
    controlsRef.current = controls;

    createTerrainMesh(resolutionRef.current);

    const resize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      rendererRef.current.setSize(clientWidth, clientHeight);
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      updateTerrain(elapsed);
      controls.update();
      renderer.render(scene, camera);
      animationRef.current = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }

      disposeAudio(audioRef);
      controls.dispose();

      if (terrainRef.current) {
        terrainRef.current.geometry.dispose();
        terrainRef.current.material.dispose();
        scene.remove(terrainRef.current);
        terrainRef.current = null;
      }

      renderer.dispose();
      mountNode.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    resolutionRef.current = resolution;
    if (sceneRef.current) {
      createTerrainMesh(resolution);
    }
  }, [resolution]);

  return (
    <main className="app-shell">
      <div className="canvas-wrap" ref={mountRef} />

      <section className="control-panel">
        <h1>Mic Sculpted Terrain</h1>
        <p className="subtitle">
          Quiet sounds breathe soft hills. Loud bursts carve jagged ridges.
          Breathe, orbit, and sculpt.
        </p>

        <div className="controls">
          <button className="action-button" onClick={isMicOn ? stopMic : startMic} type="button">
            {isMicOn ? "Stop microphone" : "Start microphone"}
          </button>

          <button className="action-button secondary" onClick={exportSTL} type="button">
            Export STL
          </button>
        </div>

        <label className="slider-row" htmlFor="resolution">
          <span>Terrain resolution: {resolution}</span>
          <input
            id="resolution"
            max={MAX_RESOLUTION}
            min={MIN_RESOLUTION}
            onChange={(event) => setResolution(Number(event.target.value))}
            step={4}
            type="range"
            value={resolution}
          />
        </label>

        <p className="mic-status">{micStatus}</p>
      </section>
    </main>
  );
}

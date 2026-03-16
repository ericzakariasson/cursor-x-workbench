"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

const MIN_RESOLUTION = 32;
const MAX_RESOLUTION = 192;
const SIZE = 18;

function clampResolution(value) {
  return Math.min(MAX_RESOLUTION, Math.max(MIN_RESOLUTION, value));
}

function createTerrainGeometry(resolution) {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, resolution, resolution);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export default function Home() {
  const mountRef = useRef(null);
  const meshRef = useRef(null);
  const exportRef = useRef(() => {});

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const freqDataRef = useRef(null);
  const timeDataRef = useRef(null);

  const [resolution, setResolution] = useState(96);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Microphone off. Enable it and sculpt with your voice.");

  useEffect(() => {
    if (!mountRef.current) {
      return undefined;
    }

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dbe8ef");
    scene.fog = new THREE.FogExp2("#dbe8ef", 0.06);

    const camera = new THREE.PerspectiveCamera(
      56,
      mount.clientWidth / mount.clientHeight,
      0.1,
      120
    );
    camera.position.set(11, 7.5, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.minDistance = 6;
    controls.maxDistance = 28;
    controls.target.set(0, 0, 0);

    const hemiLight = new THREE.HemisphereLight("#f5fbff", "#325064", 1.05);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight("#ffffff", 1.1);
    keyLight.position.set(8, 12, 4);
    scene.add(keyLight);

    const geometry = createTerrainGeometry(clampResolution(resolution));
    const positions = geometry.attributes.position.array;
    const vertexCount = geometry.attributes.position.count;

    const heights = new Float32Array(vertexCount);
    const targetHeights = new Float32Array(vertexCount);
    const baseX = new Float32Array(vertexCount);
    const baseZ = new Float32Array(vertexCount);

    for (let i = 0; i < vertexCount; i += 1) {
      baseX[i] = positions[i * 3];
      baseZ[i] = positions[i * 3 + 2];
    }

    const colors = new Float32Array(vertexCount * 3);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.03
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.position.y = -1.3;
    terrain.receiveShadow = false;
    terrain.castShadow = false;
    scene.add(terrain);
    meshRef.current = terrain;

    const valleyColor = new THREE.Color("#447cc0");
    const midColor = new THREE.Color("#70bf74");
    const peakColor = new THREE.Color("#f8fbff");
    const sampledColor = new THREE.Color();
    const clock = new THREE.Clock();
    let frame = 0;
    let raf = 0;

    const smoothAudio = { loudness: 0.04, brightness: 0.2 };

    function readAudio(elapsedSeconds) {
      const analyser = analyserRef.current;
      const timeData = timeDataRef.current;
      const freqData = freqDataRef.current;

      if (!analyser || !timeData || !freqData) {
        return {
          loudness: 0.04 + Math.sin(elapsedSeconds * 0.35) * 0.01,
          brightness: 0.2
        };
      }

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i += 1) {
        const centered = (timeData[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const loudness = Math.sqrt(sumSquares / timeData.length);

      const split = Math.floor(freqData.length * 0.55);
      let highEnergy = 0;
      for (let i = split; i < freqData.length; i += 1) {
        highEnergy += freqData[i];
      }
      const brightness = highEnergy / ((freqData.length - split) * 255);
      return { loudness, brightness };
    }

    function animate() {
      raf = requestAnimationFrame(animate);
      frame += 1;

      const elapsed = clock.getElapsedTime();
      const audio = readAudio(elapsed);

      smoothAudio.loudness = THREE.MathUtils.lerp(smoothAudio.loudness, audio.loudness, 0.08);
      smoothAudio.brightness = THREE.MathUtils.lerp(
        smoothAudio.brightness,
        audio.brightness,
        0.07
      );

      const whisperStrength = THREE.MathUtils.clamp(smoothAudio.loudness * 7, 0, 1);
      const shoutStrength = THREE.MathUtils.smoothstep(smoothAudio.loudness, 0.11, 0.34);

      const rollingHeight = 0.24 + whisperStrength * 0.9;
      const jaggedHeight = shoutStrength * (0.35 + smoothAudio.brightness * 2.2);

      let minHeight = Infinity;
      let maxHeight = -Infinity;

      for (let i = 0; i < vertexCount; i += 1) {
        const x = baseX[i];
        const z = baseZ[i];
        const radial = Math.sqrt(x * x + z * z);

        const largeDune =
          Math.sin(x * 0.58 + elapsed * 0.55) +
          Math.cos(z * 0.52 - elapsed * 0.43) +
          Math.sin((x + z) * 0.33 + elapsed * 0.36);

        const smallRidges =
          Math.sin((x + z) * 2.55 + elapsed * 1.6) *
          Math.cos((x - z) * 2.35 - elapsed * 1.35);

        const sharpNoise =
          Math.sin(x * 5.6 + elapsed * 3.15) * Math.sin(z * 5.15 - elapsed * 2.75);

        targetHeights[i] =
          largeDune * rollingHeight * 0.3 +
          smallRidges * rollingHeight * 0.14 +
          sharpNoise * jaggedHeight * 0.26 -
          radial * 0.035;

        heights[i] = THREE.MathUtils.lerp(heights[i], targetHeights[i], 0.12);
        positions[i * 3 + 1] = heights[i];

        if (heights[i] < minHeight) {
          minHeight = heights[i];
        }
        if (heights[i] > maxHeight) {
          maxHeight = heights[i];
        }
      }

      const span = Math.max(0.0001, maxHeight - minHeight);
      for (let i = 0; i < vertexCount; i += 1) {
        const normalized = (heights[i] - minHeight) / span;
        if (normalized < 0.5) {
          sampledColor.copy(valleyColor).lerp(midColor, normalized * 2);
        } else {
          sampledColor.copy(midColor).lerp(peakColor, (normalized - 0.5) * 2);
        }
        const colorIndex = i * 3;
        colors[colorIndex] = sampledColor.r;
        colors[colorIndex + 1] = sampledColor.g;
        colors[colorIndex + 2] = sampledColor.b;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      if (frame % 2 === 0) {
        geometry.computeVertexNormals();
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    function onResize() {
      if (!mountRef.current) {
        return;
      }
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    }

    window.addEventListener("resize", onResize);

    exportRef.current = () => {
      const currentMesh = meshRef.current;
      if (!currentMesh) {
        return;
      }
      currentMesh.updateMatrixWorld(true);
      const exporter = new STLExporter();
      const stlString = exporter.parse(currentMesh, { binary: false });
      const blob = new Blob([stlString], { type: "model/stl" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `terrain-${clampResolution(resolution)}.stl`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 250);
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      if (meshRef.current === terrain) {
        meshRef.current = null;
      }
    };
  }, [resolution]);

  async function startMicrophone() {
    if (streamRef.current) {
      setIsListening(true);
      setStatus("Microphone active. Whisper for soft dunes, shout for jagged peaks.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const audioContext = new window.AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDataRef.current = new Uint8Array(analyser.fftSize);

      setIsListening(true);
      setStatus("Microphone active. Whisper for soft dunes, shout for jagged peaks.");
    } catch (error) {
      setIsListening(false);
      setStatus("Microphone permission was denied. Allow mic access to enable live sculpting.");
      console.error("Microphone start failed:", error);
    }
  }

  useEffect(() => {
    return () => {
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      analyserRef.current = null;
      timeDataRef.current = null;
      freqDataRef.current = null;
    };
  }, []);

  return (
    <main className="terrainPage">
      <aside className="panel">
        <h1>Voice Sand Garden</h1>
        <p className="subtitle">
          Sculpt a meditative terrain with your voice. Whispers become rolling hills. Shouts carve
          jagged alpine peaks.
        </p>

        <div className="controls">
          <button type="button" className="primaryButton" onClick={startMicrophone}>
            {isListening ? "Microphone active" : "Enable microphone"}
          </button>
          <button type="button" className="secondaryButton" onClick={() => exportRef.current()}>
            Export STL
          </button>

          <label htmlFor="resolution" className="rangeLabel">
            Resolution: <strong>{resolution}</strong>
          </label>
          <input
            id="resolution"
            className="rangeInput"
            type="range"
            min={MIN_RESOLUTION}
            max={MAX_RESOLUTION}
            step={8}
            value={resolution}
            onChange={(event) => setResolution(clampResolution(Number(event.target.value)))}
          />

          <p className="statusText">{status}</p>
        </div>
      </aside>

      <section className="viewport" ref={mountRef} aria-label="3D terrain viewport" />
    </main>
  );
}

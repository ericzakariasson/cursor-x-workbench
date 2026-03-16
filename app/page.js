"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Home() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f1f4ff");
    scene.fog = new THREE.Fog("#f1f4ff", 4, 10);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0.1, 1.2, 4.4);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const hemiLight = new THREE.HemisphereLight("#c9dcff", "#6e7c98", 1);
    hemiLight.position.set(0, 3, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight("#ffffff", 1.2);
    keyLight.position.set(2.8, 3.5, 2.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#95b5ff", 0.7);
    rimLight.position.set(-3, 2.2, -2.4);
    scene.add(rimLight);

    const model = new THREE.Group();
    scene.add(model);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 1.45, 0.15),
      new THREE.MeshStandardMaterial({
        color: "#fefefe",
        metalness: 0.1,
        roughness: 0.35
      })
    );
    model.add(panel);

    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 1.55, 0.05),
      new THREE.MeshStandardMaterial({
        color: "#d6deef",
        metalness: 0.15,
        roughness: 0.45
      })
    );
    bezel.position.z = -0.1;
    model.add(bezel);

    const titleLine = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.16, 0.03),
      new THREE.MeshStandardMaterial({
        color: "#4467cc",
        roughness: 0.28
      })
    );
    titleLine.position.set(0, 0.36, 0.09);
    model.add(titleLine);

    const subtitleLine = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.09, 0.02),
      new THREE.MeshStandardMaterial({
        color: "#99a8cb",
        roughness: 0.4
      })
    );
    subtitleLine.position.set(0, 0.14, 0.09);
    model.add(subtitleLine);

    const bodyLine1 = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.07, 0.02),
      new THREE.MeshStandardMaterial({
        color: "#c0cae3",
        roughness: 0.45
      })
    );
    bodyLine1.position.set(0, -0.07, 0.09);
    model.add(bodyLine1);

    const bodyLine2 = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.07, 0.02),
      new THREE.MeshStandardMaterial({
        color: "#c8d0e6",
        roughness: 0.45
      })
    );
    bodyLine2.position.set(-0.12, -0.24, 0.09);
    model.add(bodyLine2);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.45, 32),
      new THREE.MeshStandardMaterial({
        color: "#8ca1d7",
        metalness: 0.2,
        roughness: 0.36
      })
    );
    neck.position.set(0, -0.98, -0.02);
    model.add(neck);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.8, 0.13, 48),
      new THREE.MeshStandardMaterial({
        color: "#6f84bf",
        metalness: 0.22,
        roughness: 0.3
      })
    );
    base.position.set(0, -1.25, -0.02);
    model.add(base);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4, 64),
      new THREE.MeshStandardMaterial({
        color: "#dbe2f5",
        roughness: 1,
        metalness: 0
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.33;
    scene.add(floor);

    model.rotation.x = -0.15;
    model.rotation.y = 0.55;

    let isDragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let velocityX = 0;
    let velocityY = 0;

    const onPointerDown = (event) => {
      isDragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (event) => {
      if (!isDragging) {
        return;
      }

      const dx = event.clientX - pointerX;
      const dy = event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;

      velocityX = dx * 0.0038;
      velocityY = dy * 0.0038;
      model.rotation.y += velocityX;
      model.rotation.x += velocityY;
      model.rotation.x = Math.max(-0.95, Math.min(0.45, model.rotation.x));
    };

    const onPointerUp = () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    };

    const onWheel = (event) => {
      const nextZ = camera.position.z + event.deltaY * 0.0016;
      camera.position.z = Math.max(2.8, Math.min(6.2, nextZ));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });

    const clock = new THREE.Clock();

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) {
        return;
      }

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    let animationFrameId = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        velocityX *= 0.95;
        velocityY *= 0.95;
        model.rotation.y += 0.003 + velocityX;
        model.rotation.x += velocityY;
        model.rotation.x = Math.max(-0.95, Math.min(0.45, model.rotation.x));
      }

      model.position.y = Math.sin(elapsed * 1.4) * 0.04;
      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("wheel", onWheel);

      scene.traverse((object) => {
        if (!object.isMesh) {
          return;
        }

        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      });

      renderer.dispose();
    };
  }, []);

  return (
    <main className="page">
      <section className="scene-card">
        <h1>3D Model of This Page</h1>
        <p>Drag to rotate, scroll to zoom.</p>
        <canvas aria-label="Interactive 3D model" className="model-canvas" ref={canvasRef} />
      </section>
    </main>
  );
}

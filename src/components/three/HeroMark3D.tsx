"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildPieces, easeOutExpo } from "./markGeometry";

// Fixed three-quarter view. The mark assembles once, then holds still.
const POSE: [number, number, number] = [-0.16, 0.38, 0];
const INTRO_END = 2.4;

function Mark({ color, reduced, onSettled }: { color: string; reduced: boolean; onSettled: () => void }) {
  const pieces = useMemo(() => buildPieces(), []);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  // Own clock, capped per frame, so a slow first few frames can't skip the intro.
  const clock = useRef(0);
  const settled = useRef(false);

  useEffect(() => () => pieces.forEach((p) => p.geometry.dispose()), [pieces]);

  useFrame((_, delta) => {
    if (settled.current) return;
    clock.current += Math.min(delta, 1 / 30);
    const t = clock.current;

    pieces.forEach((piece, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const k = reduced ? 1 : easeOutExpo(Math.max(0, (t - piece.delay - 0.25) / 1.6));
      const r = 1 - k;
      mesh.position.set(piece.from.x * r, piece.from.y * r, piece.from.z * r);
      mesh.rotation.set(piece.spin.x * r, piece.spin.y * r, piece.spin.z * r);
    });

    if (reduced || t > INTRO_END + Math.max(...pieces.map((p) => p.delay))) {
      pieces.forEach((_, i) => {
        meshes.current[i]?.position.set(0, 0, 0);
        meshes.current[i]?.rotation.set(0, 0, 0);
      });
      settled.current = true;
      onSettled();
    }
  });

  return (
    <group rotation={POSE}>
      {pieces.map((piece, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={piece.geometry}
        >
          <meshPhysicalMaterial color={color} roughness={0.32} metalness={0.12} clearcoat={0.7} clearcoatRoughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** The 3D mark. Animates only while on screen and only until it has assembled. */
export default function HeroMark3D({ color, onReady }: { color: string; onReady?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // Once assembled the scene is static: render on demand only, so the GPU idles.
  const [settled, setSettled] = useState(false);
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0 }}>
      <Canvas
        frameloop={settled ? "demand" : visible ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 8.5], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => onReady?.()}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 6]} intensity={1.6} />
        <directionalLight position={[-6, -2, 3]} intensity={0.5} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
          <Lightformer form="rect" intensity={1} position={[5, -2, 1]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="ring" intensity={2} position={[2, 2, -6]} scale={3} />
        </Environment>
        <Mark color={color} reduced={reduced} onSettled={() => setSettled(true)} />
      </Canvas>
    </div>
  );
}

"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildPieces, easeOutExpo } from "./markGeometry";

function Mark({ color, reduced }: { color: string; reduced: boolean }) {
  const pieces = useMemo(() => buildPieces(), []);
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  // Own clock, capped per frame, so a slow first few frames can't skip the intro.
  const clock = useRef(0);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useEffect(() => () => pieces.forEach((p) => p.geometry.dispose()), [pieces]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
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

    const scroll = Math.min(window.scrollY / window.innerHeight, 1.5);
    const float = reduced ? 0 : Math.sin(t * 0.8) * 0.06;
    const targetX = -0.18 + (reduced ? 0 : pointer.current.y * 0.28) + scroll * 0.35;
    const targetY = 0.42 + (reduced ? 0 : pointer.current.x * 0.45) + scroll * 1.1;
    const damp = 1 - Math.exp(-Math.min(delta, 1 / 30) * 4);
    g.rotation.x += (targetX - g.rotation.x) * damp;
    g.rotation.y += (targetY - g.rotation.y) * damp;
    g.position.y = float;
  });

  return (
    <group ref={group} rotation={[-0.18, 0.42, 0]}>
      {pieces.map((piece, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={piece.geometry}
          castShadow
        >
          <meshPhysicalMaterial color={color} roughness={0.32} metalness={0.12} clearcoat={0.7} clearcoatRoughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** The 3D mark. Renders only while on screen. */
export default function HeroMark3D({ color, onReady }: { color: string; onReady?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
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
        frameloop={visible ? "always" : "never"}
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
        <Mark color={color} reduced={reduced} />
      </Canvas>
    </div>
  );
}

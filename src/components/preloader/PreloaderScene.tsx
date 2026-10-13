"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Grid, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildPieces, easeOutExpo } from "@/components/three/markGeometry";

const INK = "#EEF3FF";
const LIME = "#C7F25A";
const SKY = "#9FD0FF";
// The square of the mark is the lime spark; the bent bars stay white on cobalt.
const pieceColor = (i: number) => (i === 0 ? LIME : INK);
const PARTICLES = 700;

// Blueprint to product: wireframe pieces fly in and lock, then the solid fills in.
function BlueprintMark({ leaving, onIntroDone }: { leaving: boolean; onIntroDone: () => void }) {
  const pieces = useMemo(() => buildPieces(), []);
  const edges = useMemo(() => pieces.map((p) => new THREE.EdgesGeometry(p.geometry, 25)), [pieces]);
  const group = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const solids = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  const lines = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const wires = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const clock = useRef(0);
  const exit = useRef(0);
  const reported = useRef(false);

  useEffect(
    () => () => {
      pieces.forEach((p) => p.geometry.dispose());
      edges.forEach((e) => e.dispose());
    },
    [pieces, edges],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    clock.current += dt;
    const t = clock.current;
    if (leaving) exit.current = Math.min(1, exit.current + dt / 0.9);
    if (!reported.current && t > 2.7) {
      reported.current = true;
      onIntroDone();
    }

    pieces.forEach((piece, i) => {
      const item = items.current[i];
      if (!item) return;
      const k = easeOutExpo(Math.max(0, (t - 0.2 - piece.delay) / 1.5));
      const r = 1 - k;
      item.position.set(piece.from.x * r * 1.6, piece.from.y * r * 1.6, piece.from.z * r * 1.6);
      item.rotation.set(piece.spin.x * r * 1.4, piece.spin.y * r * 1.4, piece.spin.z * r * 1.4);
      // Solid fills in once the pieces have locked together.
      const fill = THREE.MathUtils.smoothstep(t, 1.6 + piece.delay, 2.4 + piece.delay);
      const solid = solids.current[i];
      if (solid) solid.opacity = fill;
      const line = lines.current[i];
      if (line) line.opacity = 1 - fill * 0.8;
      const wire = wires.current[i];
      if (wire) wire.opacity = 0.35 * (1 - fill);
    });

    const g = group.current;
    if (g) {
      const e = easeOutExpo(exit.current);
      g.rotation.y = -0.5 + Math.min(t, 3) * 0.28 + Math.sin(t * 0.6) * 0.05 + e * 0.6;
      g.rotation.x = -0.12 + Math.sin(t * 0.4) * 0.04;
      g.position.y = 0.15 + Math.sin(t * 0.9) * 0.04;
      const s = 1 + e * 0.35;
      g.scale.setScalar(s);
    }
  });

  return (
    <group ref={group}>
      {pieces.map((piece, i) => (
        <group
          key={i}
          ref={(el) => {
            items.current[i] = el;
          }}
        >
          <mesh geometry={piece.geometry}>
            <meshPhysicalMaterial
              ref={(m) => {
                solids.current[i] = m;
              }}
              color={pieceColor(i)}
              roughness={0.3}
              metalness={0.15}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
          {/* Triangle mesh: the blueprint being worked out. */}
          <mesh geometry={piece.geometry}>
            <meshBasicMaterial
              ref={(m) => {
                wires.current[i] = m;
              }}
              color={SKY}
              wireframe
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={edges[i]}>
            <lineBasicMaterial
              ref={(m) => {
                lines.current[i] = m;
              }}
              color={i === 0 ? LIME : SKY}
              transparent
              opacity={1}
              depthWrite={false}
            />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}

// Points streaming toward the camera: data in motion.
function DataStream({ leaving }: { leaving: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(PARTICLES * 3);
    // Deterministic pseudo-random so renders are stable.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < PARTICLES; i++) {
      array[i * 3] = (rand() - 0.5) * 18;
      array[i * 3 + 1] = (rand() - 0.5) * 10;
      array[i * 3 + 2] = -rand() * 30;
    }
    return array;
  }, []);

  useFrame((_, delta) => {
    const points = ref.current;
    if (!points) return;
    const speed = (leaving ? 22 : 6) * Math.min(delta, 1 / 30);
    const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < PARTICLES; i++) {
      arr[i * 3 + 2] += speed;
      if (arr[i * 3 + 2] > 6) arr[i * 3 + 2] -= 36;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={SKY} size={0.03} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

export default function PreloaderScene({
  leaving,
  onReady,
  onIntroDone,
}: {
  leaving: boolean;
  onReady: () => void;
  onIntroDone: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 9], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => onReady()}
    >
      <fog attach="fog" args={["#0a1233", 9, 26]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 6]} intensity={1.4} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={2} position={[2, 2, -6]} scale={3} />
      </Environment>
      <Grid
        position={[0, -2.1, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#24379a"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#c7f25a"
        fadeDistance={24}
        fadeStrength={1.5}
        infiniteGrid
      />
      <DataStream leaving={leaving} />
      <BlueprintMark leaving={leaving} onIntroDone={onIntroDone} />
    </Canvas>
  );
}

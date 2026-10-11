import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { MARK_PATHS } from "@/components/brand/paths";

// Mark centre and scale in SVG units (viewBox 65.058 26.17 119.883 106.061).
const CENTER = { x: 125, y: 79.2 };
const UNIT = 1 / 42;

export type Piece = { geometry: THREE.ExtrudeGeometry; from: THREE.Vector3; spin: THREE.Euler; delay: number };

export function buildPieces(): Piece[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${MARK_PATHS.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p));
  // Fly-in offsets for the square, then the two bent bars.
  const offsets = [
    { from: new THREE.Vector3(2.6, 2.2, 2.5), spin: new THREE.Euler(0.9, -1.2, 0.6), delay: 0.32 },
    { from: new THREE.Vector3(2.2, -2.4, -1.5), spin: new THREE.Euler(-0.8, 0.9, -0.5), delay: 0.12 },
    { from: new THREE.Vector3(-2.6, 1.6, -2), spin: new THREE.Euler(0.7, 1.1, 0.4), delay: 0 },
  ];
  return shapes.map((shape, i) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 16,
      bevelEnabled: true,
      bevelThickness: 1.6,
      bevelSize: 1.1,
      bevelSegments: 5,
      curveSegments: 28,
    });
    // SVG is y-down: flip, centre, scale, and centre the extrusion depth.
    geometry.translate(-CENTER.x, -CENTER.y, -8);
    geometry.scale(UNIT, -UNIT, UNIT);
    geometry.computeVertexNormals();
    return { geometry, ...offsets[i % offsets.length] };
  });
}

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

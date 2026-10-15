import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 28;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function createMockPositions(): THREE.Vector3[] {
  return Array.from({ length: NODE_COUNT }, (_, index) => {
    const y = 1 - (index / (NODE_COUNT - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = GOLDEN_ANGLE * index;
    const fold = 0.88 + 0.12 * Math.sin(angle * 2.7);

    return new THREE.Vector3(
      Math.cos(angle) * radius * 1.05 * fold,
      y * 0.84,
      Math.sin(angle) * radius * 1.22 * fold,
    );
  });
}

function createMockEdges(positions: THREE.Vector3[]): Float32Array {
  const edges = new Set<string>();
  positions.forEach((point, index) => {
    const nearest = positions
      .map((other, otherIndex) => ({ otherIndex, distance: point.distanceToSquared(other) }))
      .filter(({ otherIndex }) => otherIndex !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    for (const { otherIndex } of nearest) {
      edges.add(`${Math.min(index, otherIndex)}:${Math.max(index, otherIndex)}`);
    }
  });

  const vertices: number[] = [];
  for (const edge of edges) {
    const [from, to] = edge.split(":").map(Number);
    vertices.push(...positions[from].toArray(), ...positions[to].toArray());
  }
  return Float32Array.from(vertices);
}

function MockNetwork() {
  const instances = useRef<THREE.InstancedMesh>(null);
  const nodes = useMemo(createMockPositions, []);
  const edges = useMemo(() => createMockEdges(nodes), [nodes]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!instances.current) return;
    nodes.forEach((position, index) => {
      dummy.position.copy(position);
      dummy.scale.setScalar(index % 7 === 0 ? 0.07 : 0.045);
      dummy.updateMatrix();
      instances.current?.setMatrixAt(index, dummy.matrix);
      instances.current?.setColorAt(
        index,
        new THREE.Color(index % 5 === 0 ? "#b8e8e2" : "#8abbb8"),
      );
    });
    instances.current.instanceMatrix.needsUpdate = true;
    if (instances.current.instanceColor) instances.current.instanceColor.needsUpdate = true;
  }, [dummy, nodes]);

  return (
    <>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edges, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8abbb8" transparent opacity={0.24} />
      </lineSegments>
      <instancedMesh ref={instances} args={[undefined, undefined, nodes.length]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.55} metalness={0.08} />
      </instancedMesh>
    </>
  );
}

export default function LandingGraphPreview() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#0d1718] via-[#090d0e] to-black">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        dpr={[1, 1.25]}
        frameloop="demand"
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        fallback={<div className="absolute inset-0 bg-gradient-to-br from-[#0d1718] to-black" />}
      >
        <ambientLight intensity={1.5} />
        <pointLight position={[3, 4, 5]} intensity={16} color="#c9f3ed" />
        <MockNetwork />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={2.5}
          maxDistance={7}
          rotateSpeed={0.6}
        />
      </Canvas>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(0,0,0,0.65)_100%)]"
      />
    </div>
  );
}

// Loaded ONLY through React.lazy behind <SceneGuard>: this is the one module
// in the badge wall allowed to import three / r3f / drei.
import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

const MAX_TILT = 0.45; // radians

function Medallion({ image, accent, target, invalidateRef }) {
  const group = useRef();
  const texture = useTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const invalidate = useThree((s) => s.invalidate);
  invalidateRef.current = invalidate;

  // frameloop="demand": keep rendering only while the tilt is still easing.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-delta * 8);
    const tx = -target.current.y * MAX_TILT;
    const ty = target.current.x * MAX_TILT;
    g.rotation.x += (tx - g.rotation.x) * k;
    g.rotation.y += (ty - g.rotation.y) * k;
    if (Math.abs(tx - g.rotation.x) > 0.001 || Math.abs(ty - g.rotation.y) > 0.001) state.invalidate();
  });

  return (
    <group ref={group}>
      {/* Metal disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.14, 64]} />
        <meshStandardMaterial color="#121822" metalness={0.85} roughness={0.32} />
      </mesh>
      {/* Accent rim */}
      <mesh position={[0, 0, 0.071]}>
        <ringGeometry args={[0.92, 1, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Badge face */}
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[1.42, 1.42]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.02} metalness={0.15} roughness={0.55} />
      </mesh>
    </group>
  );
}

export default function BadgeMedallion({ badge, accent = '#00d4ff', size = 160 }) {
  const target = useRef({ x: 0, y: 0 });
  const invalidateRef = useRef(null);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    target.current = {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: ((e.clientY - r.top) / r.height) * 2 - 1,
    };
    if (invalidateRef.current) invalidateRef.current();
  };
  const onLeave = () => {
    target.current = { x: 0, y: 0 };
    if (invalidateRef.current) invalidateRef.current();
  };

  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      role="img"
      aria-label={badge.name}
      style={{ width: size, height: size }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.1], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <pointLight position={[-3, -2, 2]} intensity={6} color={accent} />
        <Medallion image={badge.image} accent={accent} target={target} invalidateRef={invalidateRef} />
      </Canvas>
    </div>
  );
}

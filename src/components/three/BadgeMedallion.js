// Loaded ONLY through React.lazy behind <SceneGuard>: this is the one module
// in the badge wall allowed to import three / r3f / drei.
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

const MAX_TILT = 0.38; // radians

function Medallion({ image, accent, target, invalidateRef, onReady }) {
  const group = useRef();
  const sheen = useRef();
  const texture = useTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const invalidate = useThree((s) => s.invalidate);
  invalidateRef.current = invalidate;

  // The texture has loaded (useTexture suspends until then). Wait two frames so
  // the first render is on screen before the tile cross-fades to the canvas.
  useEffect(() => {
    invalidate();
    let a = requestAnimationFrame(() => {
      a = requestAnimationFrame(() => onReady && onReady());
    });
    return () => cancelAnimationFrame(a);
  }, [invalidate, onReady]);

  // frameloop="demand": keep rendering only while the tilt is still easing.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-delta * 8);
    const tx = -target.current.y * MAX_TILT;
    const ty = target.current.x * MAX_TILT;
    g.rotation.x += (tx - g.rotation.x) * k;
    g.rotation.y += (ty - g.rotation.y) * k;
    if (sheen.current) sheen.current.material.opacity = Math.min(0.35, Math.hypot(g.rotation.x, g.rotation.y) * 0.9);
    if (Math.abs(tx - g.rotation.x) > 0.001 || Math.abs(ty - g.rotation.y) > 0.001) state.invalidate();
  });

  // The badge itself is the object: a slim glass-edged slab the same size as
  // the flat image (so the cross-fade does not change its footprint), with a
  // soft accent edge-light. No disc behind it, so transparent corners stay
  // transparent and opaque artwork is never cropped or overhanging.
  return (
    <group ref={group}>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[1.96, 1.96]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.02} color="#0b0f18" />
      </mesh>
      <mesh position={[0, 0, 0.0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.45} transparent alphaTest={0.02} metalness={0} roughness={0.85} />
      </mesh>
      {/* Specular sheen that slides across the face as it tilts. */}
      <mesh ref={sheen} position={[0, 0, 0.01]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.4} color={accent} opacity={0.0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function BadgeMedallion({ badge, accent = '#00d4ff', size = 160, onReady }) {
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
        camera={{ position: [0, 0, 3.0], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <pointLight position={[-3, -2, 2]} intensity={6} color={accent} />
        <Medallion image={badge.image} accent={accent} target={target} invalidateRef={invalidateRef} onReady={onReady} />
      </Canvas>
    </div>
  );
}

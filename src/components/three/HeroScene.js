// Loaded ONLY through React.lazy behind <SceneGuard>: this module may import
// three / r3f because it is never part of the server render.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { particleCount, maxDpr, heroScrollProgress } from '../../lib/particles';

const COLOR_A = new THREE.Color('#00d4ff');
const COLOR_B = new THREE.Color('#00ff88');

// Three populations in one buffer, tagged by aKind:
// 0 = crystal shell (fibonacci sphere, faceted by a noisy radius),
// 1 = orbit band (tilted ring), 2 = ambient dust filling the frame.
function buildField(count) {
  const shell = Math.floor(count * 0.55);
  const band = Math.floor(count * 0.15);
  const pos = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  const kind = new Float32Array(count);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const tilt = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(1.15, 0.25, -0.35));
  const v = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const r0 = Math.random();
    if (i < shell) {
      const y = 1 - (i / (shell - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      // Quantise radius into facets so the shell reads as a crystal, not a ball.
      const facet = 1.55 + 0.12 * Math.sign(Math.sin(th * 3.0) * Math.cos(y * 7.0));
      const jitter = (Math.random() - 0.5) * 0.06;
      v.set(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(facet + jitter);
      kind[i] = 0;
    } else if (i < shell + band) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.35 + (Math.random() - 0.5) * 0.35;
      v.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.08, Math.sin(a) * r).applyMatrix4(tilt);
      kind[i] = 1;
    } else {
      v.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 11, -6 + Math.random() * 7);
      kind[i] = 2;
    }
    pos.set([v.x, v.y, v.z], i * 3);
    rnd.set([r0, Math.random(), Math.random(), Math.random()], i * 4);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  g.computeBoundingSphere();
  return g;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScroll;
  uniform vec3 uPointer;   // pointer on the z=0 plane, world space
  attribute vec4 aRand;
  attribute float aKind;
  varying float vAlpha;
  varying float vMix;

  void main() {
    vec3 p = position;
    float t = uTime;

    if (aKind < 0.5) {
      // Crystal shell: slow breathing plus a travelling ripple.
      float wave = sin(t * 0.7 + p.y * 2.4 + aRand.x * 6.2831);
      p *= 1.0 + 0.035 * wave + uScroll * (0.6 + aRand.y * 0.9);
    } else if (aKind < 1.5) {
      // Orbit band: drift along the ring.
      float a = t * (0.08 + aRand.y * 0.05);
      float c = cos(a), s = sin(a);
      p.xz = mat2(c, -s, s, c) * p.xz;
      p *= 1.0 + uScroll * 0.8;
    } else {
      // Dust: lazy float.
      p.y += sin(t * 0.25 + aRand.x * 6.2831) * 0.25;
      p.x += cos(t * 0.2 + aRand.y * 6.2831) * 0.25;
    }

    vec4 world = modelMatrix * vec4(p, 1.0);
    // Pointer repulsion in the view plane.
    vec2 d = world.xy - uPointer.xy;
    float dist = length(d);
    float push = smoothstep(1.6, 0.0, dist) * (aKind > 1.5 ? 0.35 : 0.55);
    world.xy += normalize(d + 1e-5) * push;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    float size = aKind < 0.5 ? 2.2 + aRand.z * 2.6 : (aKind < 1.5 ? 1.6 + aRand.z * 1.8 : 1.2 + aRand.z * 2.4);
    float twinkle = 0.65 + 0.35 * sin(t * (1.0 + aRand.w * 2.0) + aRand.x * 40.0);
    gl_PointSize = size * uPixelRatio * (9.0 / -mv.z);

    vAlpha = (aKind > 1.5 ? 0.45 : 0.95) * twinkle + push * 0.6;
    vMix = clamp(p.y * 0.3 + 0.5 + (aRand.y - 0.5) * 0.5, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uFade;
  varying float vAlpha;
  varying float vMix;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float glow = core * core;
    vec3 col = mix(uColorA, uColorB, vMix) + glow * 0.35;
    gl_FragColor = vec4(col, glow * vAlpha * uFade);
  }
`;

// Centre the crystal on the portrait (measured in CSS px relative to the
// hero section) and size it from the portrait radius.
function useLayoutAnchor(frame) {
  const { viewport, size } = useThree();
  return useMemo(() => {
    const f = viewport.height / size.height; // world units per CSS px at z=0
    if (!frame) return { x: viewport.width * 0.22, y: 0, scale: 1 };
    const wide = size.width >= 900;
    const radiusWorld = frame.r * f * (wide ? 1.55 : 2.3);
    return {
      x: (frame.cx - size.width / 2) * f,
      y: (size.height / 2 - frame.cy) * f,
      scale: radiusWorld / 1.55,
    };
  }, [frame, viewport.width, viewport.height, size.width, size.height]);
}

function Field({ count, pointer, scroll, frame }) {
  const group = useRef();
  const lattice = useRef();
  const { gl, viewport } = useThree();
  const anchor = useLayoutAnchor(frame);
  const time = useRef(0);

  const geometry = useMemo(() => buildField(count), [count]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uScroll: { value: 0 },
          uFade: { value: 1 },
          uPointer: { value: new THREE.Vector3(99, 99, 0) },
          uColorA: { value: COLOR_A },
          uColorB: { value: COLOR_B },
        },
      }),
    []
  );
  const latticeGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.25, 1)), []);
  const latticeMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: COLOR_A, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
    []
  );

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry]
  );
  useEffect(
    () => () => {
      material.dispose();
      latticeGeo.dispose();
      latticeMat.dispose();
    },
    [material, latticeGeo, latticeMat]
  );

  const eased = useRef({ x: 0, y: 0, s: 0 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    const k = 1 - Math.exp(-dt * 3.5);
    const e = eased.current;
    e.x += (pointer.current.x - e.x) * k;
    e.y += (pointer.current.y - e.y) * k;
    e.s += (scroll.current - e.s) * (1 - Math.exp(-dt * 6));

    const u = material.uniforms;
    u.uTime.value = time.current;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uScroll.value = e.s;
    u.uFade.value = Math.max(0, 1 - e.s * 1.25);
    if (pointer.current.active) {
      u.uPointer.value.set((e.x * viewport.width) / 2, (e.y * viewport.height) / 2, 0);
    } else {
      u.uPointer.value.set(99, 99, 0);
    }

    const g = group.current;
    if (g) {
      g.position.set(anchor.x + e.x * 0.2, anchor.y + e.y * 0.15 + e.s * 1.2, 0);
      g.scale.setScalar(anchor.scale);
      g.rotation.y = time.current * 0.06 + e.x * 0.5;
      g.rotation.x = -e.y * 0.35 + e.s * 0.6;
    }
    if (lattice.current) {
      lattice.current.rotation.y = -time.current * 0.12;
      lattice.current.rotation.z = time.current * 0.05;
      latticeMat.opacity = 0.18 * Math.max(0, 1 - e.s * 1.5);
    }
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <lineSegments ref={lattice} geometry={latticeGeo} material={latticeMat} />
    </group>
  );
}

export default function HeroScene({ targetRef, anchorRef }) {
  const pointer = useRef({ x: 0, y: 0, active: false });
  const scroll = useRef(0);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [frame, setFrame] = useState(null);

  // Track where the portrait sits inside the hero so the crystal surrounds it.
  useEffect(() => {
    const host = targetRef && targetRef.current;
    const a = anchorRef && anchorRef.current;
    if (!host || !a) return undefined;
    const measure = () => {
      const h = host.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      setFrame({ cx: r.left - h.left + r.width / 2, cy: r.top - h.top + r.height / 2, r: r.width / 2 });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) {
      ro.observe(host);
      ro.observe(a);
    }
    window.addEventListener('resize', measure);
    // The portrait has an entrance transform; re-measure once it settles.
    a.addEventListener('animationend', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
      a.removeEventListener('animationend', measure);
    };
  }, [targetRef, anchorRef]);

  const tier = useMemo(() => {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
    const width = typeof window !== 'undefined' ? window.innerWidth : undefined;
    return { count: particleCount({ cores, width }), dpr: maxDpr({ cores, width }) };
  }, []);

  useEffect(() => {
    const el = targetRef && targetRef.current;

    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.current.active = true;
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
      pointer.current.active = false;
    };
    const onScroll = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      scroll.current = heroScrollProgress({ top: r.top, height: r.height });
    };
    const onVisibility = () => setTabVisible(document.visibilityState !== 'hidden');

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    onScroll();
    onVisibility();

    let io;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
      io.observe(el);
    }

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      if (io) io.disconnect();
    };
  }, [targetRef]);

  const running = inView && tabVisible;

  return (
    <div className="hx-stage" aria-hidden="true" data-hero-scene="" data-running={running ? 'true' : 'false'}>
      <Canvas
        frameloop={running ? 'always' : 'never'}
        dpr={[1, tier.dpr]}
        camera={{ position: [0, 0, 7], fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Field count={tier.count} pointer={pointer} scroll={scroll} frame={frame} />
      </Canvas>
    </div>
  );
}

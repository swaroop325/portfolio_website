// Loaded ONLY through React.lazy behind <SceneGuard>: this module may import
// three / r3f because it is never part of the server render.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { maxDpr } from '../../lib/particles';
import { nodeRadius, shortSkill } from '../../lib/skills';

// Soft round glow used by hub halos and the dust, drawn once on a 2D canvas.
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Deterministic pseudo-random so the dust field is stable between mounts.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const proofLabel = (n) => {
  const k = n.evidence.badges.length + n.evidence.repos.length;
  return k ? ` · ${k} proof` : ' · no public proof yet';
};

function Constellation({ graph, layout, colors, short, active, preview, onSelect, onPreview, pointer }) {
  const { viewport } = useThree();
  const group = useRef();
  const skillMesh = useRef();
  const time = useRef(0);
  const [hoverSkill, setHoverSkill] = useState(null);
  const focus = preview || active;

  const hubs = useMemo(() => graph.nodes.filter((n) => n.kind === 'category'), [graph]);
  const skills = useMemo(() => graph.nodes.filter((n) => n.kind === 'skill'), [graph]);
  // Alternate how far each label sits from its node so neighbours don't collide.
  const labelRank = useMemo(() => {
    const seen = {};
    const out = {};
    for (const n of skills) {
      seen[n.category] = (seen[n.category] || 0) + 1;
      out[n.id] = (seen[n.category] - 1) % 3;
    }
    return out;
  }, [skills]);
  const memberSet = useMemo(() => {
    const ids = new Set(graph.links.filter((l) => l.target === `cat:${focus}`).map((l) => l.source));
    return ids;
  }, [graph, focus]);

  // Fit the unit layout into the visible frustum at z = 0.
  const sx = viewport.width * 0.37;
  const sy = viewport.height * 0.36;
  const to3 = (p) => [p.x * sx, -p.y * sy, p.z * 1.6];

  // ---- shared GPU resources (disposed on unmount) ----
  const res = useMemo(() => {
    const glow = makeGlowTexture();
    const sphere = new THREE.IcosahedronGeometry(1, 2);
    const hubCore = new THREE.IcosahedronGeometry(1, 1);
    const hubWire = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 1));
    const ringGeo = new THREE.TorusGeometry(1, 0.035, 8, 56);
    const skillMat = new THREE.MeshStandardMaterial({ metalness: 0.25, roughness: 0.28, emissive: '#ffffff', emissiveIntensity: 0.12 });
    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const dustMat = new THREE.PointsMaterial({ size: 0.05, map: glow, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: '#7fdcff' });
    const hubMats = {};
    for (const h of hubs) {
      const c = new THREE.Color(colors[h.category] || '#00d4ff');
      hubMats[h.category] = {
        core: new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.18, flatShading: true }),
        ring: new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.3 }),
        wire: new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.6 }),
        halo: new THREE.SpriteMaterial({ map: glow, color: c, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }),
      };
    }
    const r = rng(325);
    const n = 260;
    const dust = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) dust.set([(r() - 0.5) * 9, (r() - 0.5) * 7, -2.5 + r() * 2], i * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    return { glow, sphere, hubCore, hubWire, ringGeo, skillMat, lineMat, dustMat, dustGeo, hubMats };
  }, [hubs, colors]);

  useEffect(
    () => () => {
      res.glow.dispose();
      res.sphere.dispose();
      res.hubCore.dispose();
      res.hubWire.dispose();
      res.ringGeo.dispose();
      res.skillMat.dispose();
      res.lineMat.dispose();
      res.dustMat.dispose();
      res.dustGeo.dispose();
      Object.values(res.hubMats).forEach((m) => {
        m.core.dispose();
        m.ring.dispose();
        m.wire.dispose();
        m.halo.dispose();
      });
    },
    [res]
  );

  // Link geometry: rebuilt when the layout scale or the focus changes (cheap: < 100 segments).
  const lineGeo = useMemo(() => {
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    for (const l of graph.links) {
      const a = layout[l.source];
      const b = layout[l.target];
      if (!a || !b) continue;
      const cat = l.target.slice(4);
      const on = cat === focus;
      c.set(colors[cat] || '#00d4ff').multiplyScalar(on ? 0.9 : 0.16);
      pos.push(...to3(a), ...to3(b));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, layout, colors, focus, sx, sy]);
  useEffect(() => () => lineGeo.dispose(), [lineGeo]);

  // Skill instances: position, size (evidence), colour (dimmed when not in focus).
  useEffect(() => {
    const mesh = skillMesh.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    skills.forEach((n, i) => {
      const p = layout[n.id];
      const on = memberSet.has(n.id);
      const r = nodeRadius(n.weight) * (on ? 1.15 : 0.85) * (hoverSkill === i ? 1.4 : 1);
      m.compose(new THREE.Vector3(...to3(p)), q, new THREE.Vector3(r, r, r));
      mesh.setMatrixAt(i, m);
      c.set(colors[n.category] || '#00d4ff');
      if (!on) c.multiplyScalar(0.28);
      else c.lerp(new THREE.Color('#ffffff'), Math.min(0.45, n.weight / 40));
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, layout, memberSet, colors, hoverSkill, sx, sy]);

  const hubRefs = useRef({});
  const light = useRef();
  const drag = useRef({ down: false, x: 0, y: 0, px: 0, py: 0 });
  const gl = useThree((st) => st.gl);
  // Mouse drag spins the whole graph (it eases back when released). Touch is
  // left alone so the page still scrolls.
  useEffect(() => {
    const el = gl.domElement;
    const d = drag.current;
    const down = (e) => { if (e.pointerType === 'mouse') { d.down = true; d.px = e.clientX; d.py = e.clientY; } };
    const move = (e) => {
      if (!d.down) return;
      d.x = Math.max(-0.8, Math.min(0.8, d.x + (e.clientX - d.px) * 0.006));
      d.y = Math.max(-0.5, Math.min(0.5, d.y + (e.clientY - d.py) * 0.006));
      d.px = e.clientX; d.py = e.clientY;
    };
    const up = () => { d.down = false; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    const t = time.current;
    const g = group.current;
    if (g) {
      // Gentle sway (not a full spin) so labels stay readable, plus pointer parallax.
      const k = 1 - Math.exp(-dt * 3);
      const d = drag.current;
      if (!d.down) {
        d.x *= 1 - Math.min(1, dt * 1.2);
        d.y *= 1 - Math.min(1, dt * 1.2);
      }
      g.rotation.y += (Math.sin(t * 0.25) * 0.3 + pointer.current.x * 0.5 + d.x - g.rotation.y) * k;
      g.rotation.x += (-pointer.current.y * 0.32 + d.y - g.rotation.x) * k;
      // A light that follows the cursor makes the spheres read as solid.
      if (light.current) light.current.position.set(pointer.current.x * 3, pointer.current.y * 2.2 + 0.6, 3.2);
    }
    for (const h of hubs) {
      const o = hubRefs.current[h.category];
      if (!o) continue;
      const on = h.category === focus;
      if (o.ring) {
        o.ring.rotation.x = 1.1 + Math.sin(t * 0.7) * 0.25;
        o.ring.rotation.y = t * (on ? 1.4 : 0.5);
      }
      o.wire.rotation.y = t * (on ? 0.9 : 0.3);
      o.wire.rotation.x = t * 0.2;
      const s = on ? 1 + Math.sin(t * 2.4) * 0.08 : 1;
      o.halo.scale.setScalar((on ? 0.95 : 0.55) * s);
      res.hubMats[h.category].halo.opacity = on ? 0.75 : 0.32;
    }
  });

  const cursor = (v) => {
    if (typeof document !== 'undefined') document.body.style.cursor = v ? 'pointer' : '';
  };
  useEffect(() => () => cursor(false), []);

  return (
    <group ref={group}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <pointLight ref={light} intensity={14} distance={9} color="#9fe8ff" />
      <points geometry={res.dustGeo} material={res.dustMat} />
      <lineSegments geometry={lineGeo} material={res.lineMat} />
      <instancedMesh
        ref={skillMesh}
        args={[res.sphere, res.skillMat, skills.length]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId !== hoverSkill) setHoverSkill(e.instanceId);
          cursor(true);
        }}
        onPointerOut={() => {
          setHoverSkill(null);
          cursor(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const n = skills[e.instanceId];
          if (n) onSelect(n.category);
        }}
      />
      {hubs.map((h) => {
        const p = to3(layout[h.id]);
        const on = h.category === focus;
        const mats = res.hubMats[h.category];
        const size = on ? 0.085 : 0.065;
        return (
          <group key={h.id} position={p}>
            <sprite
              ref={(o) => {
                hubRefs.current[h.category] = { ...(hubRefs.current[h.category] || {}), halo: o };
              }}
              material={mats.halo}
            />
            <mesh geometry={res.hubCore} material={mats.core} scale={size * 1.15} />
            <mesh
              ref={(o) => {
                hubRefs.current[h.category] = { ...(hubRefs.current[h.category] || {}), ring: o };
              }}
              geometry={res.ringGeo}
              material={mats.ring}
              scale={size * 2.5}
            />
            <lineSegments
              ref={(o) => {
                hubRefs.current[h.category] = { ...(hubRefs.current[h.category] || {}), wire: o };
              }}
              geometry={res.hubWire}
              material={mats.wire}
              scale={size * 2.1}
            />
            {/* Invisible, generous hit target for hover and click. */}
            <mesh
              geometry={res.sphere}
              scale={0.24}
              onPointerOver={(e) => {
                e.stopPropagation();
                onPreview(h.category);
                cursor(true);
              }}
              onPointerOut={() => {
                onPreview(null);
                cursor(false);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(h.category);
              }}
            >
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Html center position={[layout[h.id].lx * 0.14 * sx, -layout[h.id].ly * 0.14 * sy, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
              <div className={`skc-label${on ? ' is-on' : ''}`} style={{ '--c': colors[h.category] }} data-lx={layout[h.id].lx} data-ly={layout[h.id].ly}>
                {short[h.category] || h.category}
              </div>
            </Html>
          </group>
        );
      })}
      {skills.map((n, i) => {
        // Label proven skills in the focused cluster, plus whatever is hovered;
        // the panel beside the scene lists every skill, so the canvas stays legible.
        if (!((memberSet.has(n.id) && n.evidence.badges.length + n.evidence.repos.length > 0) || hoverSkill === i)) return null;
        const p = to3(layout[n.id]);
        const L = layout[n.id];
        // Near the left/right frame edge, label inward so text never clips.
        const edge = Math.abs(p[0]) > sx * 0.62;
        const dx = edge ? -Math.sign(p[0]) * Math.max(0.6, Math.abs(L.lx)) : L.lx;
        const off = nodeRadius(n.weight) * 1.2 + 0.06 + (edge ? 0 : labelRank[n.id] * 0.16);
        return (
          <Html key={n.id} position={[p[0] + dx * off, p[1] - L.ly * off * (edge ? 0.4 : 1), L.z * 1.6]}
            style={{ pointerEvents: 'none' }} zIndexRange={[9, 0]}>
            <div className={`skc-skill${hoverSkill === i ? ' is-hover' : ''}`} style={{ transform: `translate(${Math.abs(dx) < 0.35 ? '-50%' : dx > 0 ? '0' : '-100%'}, -50%)` }}>
              {shortSkill(n.label)}
              {hoverSkill === i && <span>{proofLabel(n)}</span>}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

const LABEL_CSS = `
.skc-label { font: 700 13px var(--font-display); color: #b4bfd0; white-space: nowrap; letter-spacing: -.005em;
  padding: 3px 8px; border-radius: 999px; background: rgba(7,7,15,.55); border: 1px solid rgba(255,255,255,.08);
  transition: color .2s, border-color .2s, background .2s; user-select: none; }
.skc-label.is-on { color: #fff; border-color: var(--c); background: rgba(7,7,15,.8); box-shadow: 0 0 18px -4px var(--c); }
.skc-skill { font: 500 11px var(--font-mono); color: #f4f7fb; white-space: nowrap; text-shadow: 0 1px 6px #000, 0 0 2px #000; user-select: none; }
.skc-skill.is-hover { padding: 3px 7px; border-radius: 8px; background: rgba(7,7,15,.9); border: 1px solid rgba(0,212,255,.5); }
.skc-skill span { color: #00ff88; }
@media (max-width: 640px) { .skc-label { font-size: 11px; padding: 2px 6px; } .skc-skill { font-size: 9.5px; } }
`;

export default function SkillConstellation(props) {
  const host = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  const dpr = useMemo(() => {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
    const width = typeof window !== 'undefined' ? window.innerWidth : undefined;
    return maxDpr({ cores, width });
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let io;
    if (typeof IntersectionObserver !== 'undefined') {
      // Mount the canvas once the stage is near; render only while visible.
      io = new IntersectionObserver(
        ([entry]) => {
          setInView(entry.isIntersecting);
          if (entry.isIntersecting) setNear(true);
        },
        { rootMargin: '200px 0px' }
      );
      io.observe(el);
    } else {
      setNear(true);
      setInView(true);
    }
    const onVisibility = () => setTabVisible(document.visibilityState !== 'hidden');
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    onVisibility();
    return () => {
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const running = inView && tabVisible;

  return (
    <div ref={host} style={{ position: 'absolute', inset: 0 }} data-skill-scene="" data-running={running ? 'true' : 'false'} aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: LABEL_CSS }} />
      {near && (
        <Canvas
          frameloop={running ? 'always' : 'never'}
          dpr={[1, dpr]}
          camera={{ position: [0, 0, 5], fov: 40, near: 0.1, far: 30 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Constellation {...props} pointer={pointer} />
        </Canvas>
      )}
    </div>
  );
}

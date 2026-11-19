import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import SceneGuard from './three/SceneGuard';
import BadgeShareCard, { CARD_SIZES, accentFor } from './BadgeShareCard';
import { groupBadges } from '../lib/badges';
import { canRender3D } from '../lib/capabilities';
import { exportCardPng } from '../lib/exportPng';
import { communityBuilderBadge } from '../data/curation';
import badgesData from '../data/generated/badges.json';

// three/r3f live only in this lazy chunk; SceneGuard never renders it on the server.
const BadgeMedallion = React.lazy(() => import('./three/BadgeMedallion'));

const FEATURED_GROUPS = ['AWS Professional & Specialty', 'AWS Associate'];
const MAX_FEATURED = 4;

// The Community Builder issuedAt is a placeholder: never show its date.
const showDate = (b) => b.id !== communityBuilderBadge.id && Boolean(b.issuedAt);
const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const dataDate = (list) =>
  new Date(list.reduce((max, b) => (b.issuedAt && b.issuedAt > max ? b.issuedAt : max), '1970-01-01'));

const CSS = `
.bw-tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: .6rem;
  padding: 1.1rem .8rem 1rem; border-radius: 16px; text-decoration: none; color: inherit;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  transition: border-color .2s, background .2s; }
.bw-tile:hover { background: rgba(255,255,255,0.07); border-color: var(--accent); }
.bw-tile:focus-visible, .bw-btn:focus-visible { outline: 3px solid #00d4ff; outline-offset: 3px; }
.bw-btn:focus:not(:focus-visible) { outline: none; }
@media (prefers-reduced-motion: no-preference) {
  .bw-tilt { transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform .12s ease-out, border-color .2s, background .2s; will-change: transform; }
}
.bw-btn { cursor: pointer; font: inherit; font-size: .9rem; font-weight: 600; border-radius: 999px;
  padding: .65rem 1.2rem; border: 1px solid rgba(0,212,255,0.5); color: #fff; background: rgba(0,212,255,0.08);
  transition: background .2s, border-color .2s; }
.bw-btn:hover { background: rgba(0,212,255,0.18); border-color: #00d4ff; }
.bw-btn[aria-pressed="true"] { background: linear-gradient(135deg, #00d4ff, #00ff88); color: #04121a; border-color: transparent; }
.bw-btn:disabled { opacity: .6; cursor: progress; }
`;

function BadgeImage({ badge, size }) {
  // Request with CORS so the browser caches a CORS-enabled copy that the 3D
  // texture loader and the PNG exporter can reuse. If the CDN ever refuses
  // CORS, retry as a plain image so the wall still shows it.
  const [cors, setCors] = useState(true);
  if (!badge.image) {
    return (
      <div
        role="img"
        aria-label={badge.name}
        style={{
          width: size, height: size, borderRadius: '50%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          border: `3px solid ${accentFor('Other')}`, background: 'radial-gradient(circle at 35% 28%, #1d2636, #0c111b 70%)',
          boxShadow: `0 0 24px ${accentFor('Other')}55`,
        }}
      >
        <span style={{ fontWeight: 800, color: accentFor('Other'), fontSize: size * 0.22 }}>AWS</span>
        <span style={{ fontWeight: 600, fontSize: Math.max(10, size * 0.1), lineHeight: 1.1, color: '#fff' }}>Community Builder</span>
      </div>
    );
  }
  return (
    <img
      src={badge.image}
      alt={badge.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      crossOrigin={cors ? 'anonymous' : undefined}
      onError={cors ? () => setCors(false) : undefined}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}

function BadgeTile({ badge, accent, can3D, size = 110 }) {
  const [hover, setHover] = useState(false);
  const ref = useRef(null);
  const use3D = can3D && hover && Boolean(badge.image);

  const onMove = (e) => {
    if (can3D || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`);
    ref.current.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
  };
  const onLeave = () => {
    setHover(false);
    if (ref.current) {
      ref.current.style.setProperty('--rx', '0deg');
      ref.current.style.setProperty('--ry', '0deg');
    }
  };

  const img = <BadgeImage badge={badge} size={size} />;
  return (
    <a
      ref={ref}
      href={badge.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${badge.name}, issued by ${badge.issuer} (opens in a new tab)`}
      className={`bw-tile${can3D ? '' : ' bw-tilt'}`}
      style={{ '--accent': accent }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {use3D ? (
          <SceneGuard fallback={img}>
            <BadgeMedallion badge={badge} accent={accent} size={size} />
          </SceneGuard>
        ) : (
          img
        )}
      </div>
      <div style={{ fontSize: '.82rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.3, color: '#fff' }}>{badge.name}</div>
      {showDate(badge) && (
        <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{fmtDate(badge.issuedAt)}</div>
      )}
    </a>
  );
}

function FeaturedMedallion({ badge, accent, live }) {
  const size = 170;
  return (
    <a
      href={badge.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${badge.name}, issued by ${badge.issuer} (opens in a new tab)`}
      className="bw-tile"
      style={{ '--accent': accent, padding: '1.4rem 1rem 1.2rem', boxShadow: `0 0 40px ${accent}1f` }}
    >
      <div style={{ width: size, height: size }}>
        {live && badge.image ? (
          <SceneGuard fallback={<BadgeImage badge={badge} size={size} />}>
            <BadgeMedallion badge={badge} accent={accent} size={size} />
          </SceneGuard>
        ) : (
          <BadgeImage badge={badge} size={size} />
        )}
      </div>
      <div style={{ fontSize: '.95rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.3, maxWidth: 220 }}>{badge.name}</div>
      {showDate(badge) && (
        <div style={{ fontSize: '.75rem', color: accent, fontFamily: 'monospace' }}>{fmtDate(badge.issuedAt)}</div>
      )}
    </a>
  );
}

// Scales a fixed-size card down to fit its container without touching the card itself.
function ScaledPreview({ size, children }) {
  const { width, height } = CARD_SIZES[size];
  const box = useRef(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const update = () => setScale(Math.min(1, el.clientWidth / width));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} style={{ width: '100%', maxWidth: width }}>
      <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>{children}</div>
      </div>
    </div>
  );
}

function SharePanel({ groups }) {
  const wideRef = useRef(null);
  const squareRef = useRef(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const download = async (size) => {
    const node = size === 'wide' ? wideRef.current : squareRef.current;
    if (!node) return;
    const { width, height } = CARD_SIZES[size];
    setBusy(size);
    setError('');
    try {
      await exportCardPng(node, { width, height, filename: `swaroop-credentials-${width}x${height}.png` });
    } catch (e) {
      console.warn('PNG export failed:', e);
      setError('Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const item = (size, ref, label, note) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
      <ScaledPreview size={size}>
        <BadgeShareCard ref={ref} size={size} groups={groups} />
      </ScaledPreview>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="bw-btn"
          onClick={() => download(size)}
          disabled={busy !== null}
          aria-label={`Download ${label} credential card as PNG`}
        >
          {busy === size ? 'Rendering…' : `Download PNG (${label})`}
        </button>
        <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,0.55)' }}>{note}</span>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'grid', gap: '2.5rem', marginBottom: '3rem' }}
    >
      {item('wide', wideRef, '1200×627', 'LinkedIn post / link preview')}
      <div style={{ maxWidth: 560, width: '100%' }}>{item('square', squareRef, '1080×1080', 'LinkedIn / Instagram square')}</div>
      <p role="status" aria-live="polite" style={{ color: '#ff8a8a', minHeight: '1.2em', margin: 0 }}>{error}</p>
    </motion.div>
  );
}

export default function BadgeWall({ badges = badgesData, extraBadges = [communityBuilderBadge] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  // Mount the featured 3D medallions (and fetch the three chunk) only once the
  // section is near the viewport. Server render and first paint stay 2D.
  const nearView = useInView(ref, { once: true, margin: '600px 0px' });
  const [shareMode, setShareMode] = useState(false);
  const [can3D, setCan3D] = useState(false);
  // SSR and the first client render must agree, so start from a date derived
  // from the data (latest issue date), then switch to the real clock after mount.
  const [now, setNow] = useState(() => dataDate(badges));

  useEffect(() => {
    setCan3D(canRender3D({ win: window }));
    setNow(new Date());
  }, []);

  const groups = useMemo(() => groupBadges([...badges, ...extraBadges], now), [badges, extraBadges, now]);
  const count = groups.reduce((n, g) => n + g.badges.length, 0);
  const offCredly = groups.flatMap((g) => g.badges).filter((b) => !/credly\.com/.test(b.url || ''));
  const featured = useMemo(
    () =>
      groups
        .filter((g) => FEATURED_GROUPS.includes(g.title))
        .flatMap((g) => g.badges.map((b) => ({ b, accent: accentFor(g.title) })))
        .slice(0, MAX_FEATURED),
    [groups]
  );

  return (
    <section id="badges" ref={ref} aria-labelledby="badges-heading" style={{ minHeight: '100vh', padding: '6rem 2rem' }}>
      {/* dangerouslySetInnerHTML: React would escape quotes in a text child, causing an SSR hydration mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <div style={{ fontSize: '1rem', color: '#00d4ff', marginBottom: '1rem', fontFamily: 'monospace' }}>{'<badges>'}</div>
          <h2
            id="badges-heading"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #fff, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Badge Wall
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: '1rem' }}>
            <strong style={{ color: '#00ff88' }}>{count} credentials</strong> across {groups.length} groups
            {offCredly.length > 0
              ? `: ${count - offCredly.length} verified on Credly, plus ${offCredly.map((b) => b.name).join(', ')}`
              : ', verified on Credly'}
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="bw-btn"
              aria-pressed={shareMode}
              aria-label={shareMode ? 'Exit share mode' : 'Enter share mode to download a shareable credential card'}
              onClick={() => setShareMode((s) => !s)}
            >
              {shareMode ? 'Back to wall' : 'Share mode'}
            </button>
          </div>
        </motion.div>

        {shareMode ? (
          <SharePanel groups={groups} />
        ) : (
          <>
            {featured.length > 0 && (
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '3.5rem' }}
              >
                {featured.map(({ b, accent }) => (
                  <FeaturedMedallion key={b.id} badge={b} accent={accent} live={nearView} />
                ))}
              </div>
            )}

            {groups.map((g) => (
              <div key={g.title} style={{ marginBottom: '2.75rem' }}>
                <h3
                  style={{
                    display: 'flex', alignItems: 'center', gap: '.7rem', fontSize: '1.15rem', color: '#fff',
                    marginBottom: '1.1rem', fontWeight: 700,
                  }}
                >
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: accentFor(g.title), boxShadow: `0 0 10px ${accentFor(g.title)}` }} />
                  {g.title}
                  <span style={{ fontSize: '.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{g.badges.length}</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                  {g.badges.map((b) => (
                    <BadgeTile key={b.id} badge={b} accent={accentFor(g.title)} can3D={can3D} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

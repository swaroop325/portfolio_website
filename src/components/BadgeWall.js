import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import SceneGuard from './three/SceneGuard';
import BadgeShareCard, { CARD_SIZES, accentFor } from './BadgeShareCard';
import { groupBadges } from '../lib/badges';
import { filterGroups, parseFilter, serializeFilter, filterNoun } from '../lib/badgeFilter';
import { canRender3D } from '../lib/capabilities';
import { exportCardPng, exportCardBlob } from '../lib/exportPng';
import { computeScale, canShareFiles, isAbortError } from '../lib/shareLayout';
import { handSetBadges } from '../data/curation';
import badgesData from '../data/generated/badges.json';

// three/r3f live only in this lazy chunk; SceneGuard never renders it on the server.
const BadgeMedallion = React.lazy(() => import('./three/BadgeMedallion'));

const VENDOR_CHIPS = [['all', 'All'], ['aws', 'AWS'], ['microsoft', 'Microsoft'], ['other', 'Other']];
const LEVEL_CHIPS = [['all', 'All levels'], ['professional', 'Professional & Specialty'], ['associate', 'Associate'], ['foundational', 'Foundational & Training']];

function Chips({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', justifyContent: 'center' }}>
      {options.map(([key, text]) => (
        <button key={key} type="button" className="bw-btn bw-chip" aria-pressed={value === key} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}

const SHARE_SITE = 'swaroop325.web.app';
const FEATURED_GROUPS = ['AWS Professional & Specialty', 'AWS Associate'];
const MAX_FEATURED = 4;

// Hand-set badges (hideDate) carry a placeholder issuedAt: never show its date.
const showDate = (b) => !b.hideDate && Boolean(b.issuedAt);
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
.bw-stage { position: relative; display: flex; align-items: center; justify-content: center; }
.bw-3d { position: absolute; inset: 0; opacity: 0; }
.bw-3d.is-on { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .bw-flat { transition: opacity .35s ease, transform .45s cubic-bezier(.2,.7,.2,1); }
  .bw-flat.is-off { opacity: 0; }
  .bw-3d { transform: scale(1.12); transition: opacity .35s ease, transform .5s cubic-bezier(.2,.7,.2,1); }
  .bw-3d.is-on { transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) { .bw-flat.is-off { opacity: 0; } }
@media (prefers-reduced-motion: no-preference) {
  .bw-tilt { transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform .12s ease-out, border-color .2s, background .2s; will-change: transform; }
}
.bw-btn { cursor: pointer; font: inherit; font-size: .9rem; font-weight: 600; border-radius: 999px;
  padding: .65rem 1.2rem; border: 1px solid rgba(0,212,255,0.5); color: #fff; background: rgba(0,212,255,0.08);
  transition: background .2s, border-color .2s; }
.bw-btn:hover { background: rgba(0,212,255,0.18); border-color: #00d4ff; }
.bw-btn[aria-pressed="true"] { background: linear-gradient(135deg, #00d4ff, #00ff88); color: #04121a; border-color: transparent; }
.bw-chip { padding: .45rem 1rem; font-size: .85rem; }
.bw-chip[aria-pressed="true"] { background: linear-gradient(135deg, #00d4ff, #00ff88); color: #04121a; }
.bw-btn:disabled { opacity: .6; cursor: progress; }
.bw-share-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2.5rem; margin-bottom: 3rem; }
.bw-share-item { min-width: 0; display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; }
.bw-share-square { max-width: 560px; width: 100%; min-width: 0; }
@media (max-width: 699px) { .bw-share-square { order: -1; } }
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
  // mounted: the canvas exists; live: it has drawn its first frame and is
  // cross-faded in. The flat image stays underneath, so nothing ever pops.
  const [mounted, setMounted] = useState(false);
  const [live, setLive] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);
  const use3D = can3D && mounted && Boolean(badge.image);
  const onReady = useCallback(() => setLive(true), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onMove = (e) => {
    if (can3D || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`);
    ref.current.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
  };
  const onEnter = (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(timer.current);
    setMounted(true);
  };
  const onLeave = () => {
    // Fade back to the flat badge first, then free the WebGL context.
    setLive(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMounted(false), 450);
    if (ref.current) {
      ref.current.style.setProperty('--rx', '0deg');
      ref.current.style.setProperty('--ry', '0deg');
    }
  };

  const img = <BadgeImage badge={badge} size={size} />;
  // Hand-set badges without a public page (url: null) render as plain,
  // non-focusable tiles: no empty href, name comes from the visible text.
  const linkProps = badge.url
    ? {
        href: badge.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `${badge.name}, issued by ${badge.issuer} (opens in a new tab)`,
      }
    : {};
  const Tag = badge.url ? 'a' : 'div';
  return (
    <Tag
      ref={ref}
      {...linkProps}
      className={`bw-tile${can3D ? '' : ' bw-tilt'}`}
      style={{ '--accent': accent }}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="bw-stage" style={{ width: size, height: size }}>
        <div className={`bw-flat${live ? ' is-off' : ''}`}>{img}</div>
        {use3D && (
          <div className={`bw-3d${live ? ' is-on' : ''}`}>
            <SceneGuard fallback={null}>
              <BadgeMedallion badge={badge} accent={accent} size={size} onReady={onReady} />
            </SceneGuard>
          </div>
        )}
      </div>
      <div style={{ fontSize: '.82rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.3, color: '#fff' }}>{badge.name}</div>
      {showDate(badge) && (
        <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{fmtDate(badge.issuedAt)}</div>
      )}
    </Tag>
  );
}

function FeaturedMedallion({ badge, accent, live }) {
  const size = 170;
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <a
      href={badge.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${badge.name}, issued by ${badge.issuer} (opens in a new tab)`}
      className="bw-tile"
      style={{ '--accent': accent, padding: '1.4rem 1rem 1.2rem', boxShadow: `0 0 40px ${accent}1f` }}
    >
      <div className="bw-stage" style={{ width: size, height: size }}>
        <div className={`bw-flat${ready ? ' is-off' : ''}`}>
          <BadgeImage badge={badge} size={size} />
        </div>
        {live && badge.image && (
          <div className={`bw-3d${ready ? ' is-on' : ''}`}>
            <SceneGuard fallback={null}>
              <BadgeMedallion badge={badge} accent={accent} size={size} onReady={onReady} />
            </SceneGuard>
          </div>
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
// The measured box (`box`) is sized only by its parent (width: 100%, min-width: 0),
// never by the scaled content, so the scale can shrink as well as grow.
function ScaledPreview({ size, children }) {
  const { width, height } = CARD_SIZES[size];
  const box = useRef(null);
  const [scale, setScale] = useState(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const update = () => setScale(computeScale(el.getBoundingClientRect().width, width));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const s = scale === null ? 1 : scale;
  return (
    <div ref={box} style={{ width: '100%', maxWidth: width, minWidth: 0, overflow: 'hidden', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', visibility: scale === null ? 'hidden' : 'visible' }}>
      <div style={{ width: width * s, height: height * s, overflow: 'hidden' }}>
        <div style={{ width, height, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
      </div>
    </div>
  );
}

function SharePanel({ groups, noun, slug }) {
  const wideRef = useRef(null);
  const squareRef = useRef(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  // Web Share with files is checked after mount; SSR and first render show no Share button.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    try {
      setCanShare(canShareFiles(navigator, new File([], 'badges.png', { type: 'image/png' })));
    } catch (e) {
      setCanShare(false);
    }
  }, []);

  const nodeFor = (size) => (size === 'wide' ? wideRef.current : squareRef.current);

  const download = async (size) => {
    const node = nodeFor(size);
    if (!node) return;
    const { width, height } = CARD_SIZES[size];
    setBusy(size);
    setError('');
    try {
      await exportCardPng(node, { width, height, filename: `badges-${slug}-${size}.png` });
    } catch (e) {
      console.warn('PNG export failed:', e);
      setError('Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const share = async (size) => {
    const node = nodeFor(size);
    if (!node) return;
    const { width, height } = CARD_SIZES[size];
    const filename = `badges-${slug}-${size}.png`;
    setBusy(size);
    setError('');
    try {
      const blob = await exportCardBlob(node, { width, height });
      const file = new File([blob], filename, { type: 'image/png' });
      if (canShareFiles(navigator, file)) {
        try {
          await navigator.share({ files: [file], title: 'Swaroop A.S credentials', text: `${noun} - ${SHARE_SITE}` });
          return;
        } catch (e) {
          if (isAbortError(e)) return; // user closed the share sheet
          // Other failures (e.g. activation expired while rendering): fall back to download.
        }
      }
      await exportCardPng(node, { width, height, filename });
    } catch (e) {
      console.warn('PNG share failed:', e);
      setError('Share failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const item = (size, ref, label, note) => (
    <div className="bw-share-item">
      <ScaledPreview size={size}>
        <BadgeShareCard ref={ref} size={size} groups={groups} noun={noun} />
      </ScaledPreview>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem 1rem', flexWrap: 'wrap', maxWidth: '100%' }}>
        <button
          type="button"
          className="bw-btn"
          onClick={() => download(size)}
          disabled={busy !== null}
          aria-label={`Download PNG (${label}) credential card`}
        >
          {busy === size ? 'Rendering…' : `Download PNG (${label})`}
        </button>
        {canShare && (
          <button
            type="button"
            className="bw-btn"
            onClick={() => share(size)}
            disabled={busy !== null}
            aria-label={`Share ${label} credential card`}
          >
            Share
          </button>
        )}
        <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,0.55)', flex: '1 1 100%' }}>{note}</span>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bw-share-grid">
      <div className="bw-share-wide" style={{ minWidth: 0 }}>{item('wide', wideRef, '1200×627', 'LinkedIn post / link preview')}</div>
      <div className="bw-share-square">{item('square', squareRef, '1080×1080', 'LinkedIn / Instagram square')}</div>
      <p role="status" aria-live="polite" style={{ color: '#ff8a8a', minHeight: '1.2em', margin: 0 }}>{error}</p>
    </motion.div>
  );
}

export default function BadgeWall({ badges = badgesData, extraBadges = handSetBadges }) {
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
    const ok = canRender3D({ win: window });
    setCan3D(ok);
    // Fetch the 3D chunk ahead of time so the first hover doesn't wait on it.
    if (ok) import('./three/BadgeMedallion').catch(() => {});
    setNow(new Date());
  }, []);

  const [filter, setFilter] = useState({ vendor: 'all', level: 'all' });
  // SSR renders All; the hash is applied after mount so hydration matches.
  useEffect(() => {
    setFilter(parseFilter(window.location.hash));
  }, []);
  const applyFilter = (next) => {
    setFilter(next);
    try {
      const q = serializeFilter(next);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#badges${q ? `?${q}` : ''}`);
    } catch (e) {
      /* history unavailable: state still works */
    }
  };

  const allGroups = useMemo(() => groupBadges([...badges, ...extraBadges], now), [badges, extraBadges, now]);
  const groups = useMemo(() => filterGroups(allGroups, filter), [allGroups, filter]);
  const noun = filterNoun(filter);
  const slug = filter.vendor === 'all' ? 'all' : filter.vendor === 'aws' && filter.level !== 'all' ? `aws-${filter.level}` : filter.vendor;
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

  // Featured badges are shown once, up top, not repeated in their group below.
  const featuredIds = useMemo(() => new Set(featured.map(({ b }) => b.id)), [featured]);

  return (
    <section id="badges" ref={ref} aria-labelledby="badges-heading" style={{ minHeight: '100vh', padding: '6rem clamp(1rem, 4vw, 2rem)' }}>
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
            <strong style={{ color: '#00ff88' }}>{count} {noun}</strong> across {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            {count === 0
              ? ''
              : offCredly.length > 0
              ? `: ${count - offCredly.length} verified on Credly, plus ${offCredly.map((b) => b.name).join(', ')}`
              : ', verified on Credly'}
          </p>
          <div style={{ marginTop: '1.5rem', display: 'grid', gap: '.75rem' }}>
            <Chips label="Filter by vendor" options={VENDOR_CHIPS} value={filter.vendor} onChange={(vendor) => applyFilter({ vendor, level: 'all' })} />
            {filter.vendor === 'aws' && (
              <Chips label="Filter AWS by level" options={LEVEL_CHIPS} value={filter.level} onChange={(level) => applyFilter({ vendor: 'aws', level })} />
            )}
            <p role="status" aria-live="polite" className="bw-sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
              {`Showing ${count} ${noun}`}
            </p>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="bw-btn"
              aria-expanded={shareMode}
              onClick={() => setShareMode((s) => !s)}
            >
              {shareMode ? 'Back to wall' : 'Share mode'}
            </button>
          </div>
        </motion.div>

        {count === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.75)' }}>
            <p style={{ marginBottom: '1rem' }}>No badges match this filter.</p>
            <button type="button" className="bw-btn" onClick={() => applyFilter({ vendor: 'all', level: 'all' })}>
              Reset filters
            </button>
          </div>
        ) : shareMode ? (
          <SharePanel groups={groups} noun={noun} slug={slug} />
        ) : (
          <>
            {featured.length > 0 && (
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '3.5rem' }}
                role="list"
                aria-label="Top certifications"
              >
                {featured.map(({ b, accent }) => (
                  <FeaturedMedallion key={b.id} badge={b} accent={accent} live={nearView} />
                ))}
              </div>
            )}

            {groups.map((g) => ({ ...g, badges: g.badges.filter((b) => !featuredIds.has(b.id)) })).filter((g) => g.badges.length > 0).map((g) => (
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', gap: '1rem' }}>
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

import React, { forwardRef, useEffect, useRef, useState } from 'react';

// Fixed-size, export-ready credential card. All sizes are inline pixels so
// html-to-image output is deterministic. No 3D, no animation, system fonts.

export const CARD_SIZES = {
  wide: { width: 1200, height: 627 },
  square: { width: 1080, height: 1080 },
};

export const GROUP_ACCENTS = {
  'AWS Professional & Specialty': '#ffb547',
  'AWS Associate': '#00d4ff',
  'AWS Foundational & Training': '#00ff88',
  Microsoft: '#9d8cff',
  Other: '#ff6b9a',
};
export const accentFor = (title) => GROUP_ACCENTS[title] || '#00d4ff';

const SITE = 'swaroop325.web.app';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Largest square tile size that fits n tiles into a w x h box with `gap`.
export function fitGrid(n, w, h, gap) {
  let best = { size: 0, cols: 1 };
  for (let cols = 1; cols <= n; cols += 1) {
    const rows = Math.ceil(n / cols);
    const size = Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows));
    if (size > best.size) best = { size, cols };
  }
  return best;
}

// Share-card artwork. Always eager (never lazy: the card sits in a scaled,
// often off-screen box where lazy images may never load). Requests with CORS
// first; if that errors (e.g. a cached non-CORS copy), retries as a plain
// image; if that also fails, shows the badge name as a text placeholder.
function MedalImage({ badge, accent, size }) {
  const [cors, setCors] = useState(true);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  const px = Math.round(size * 0.78);
  const fail = () => (cors ? setCors(false) : setFailed(true));
  useEffect(() => {
    // An error can fire before hydration attaches onError.
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cors]);
  if (failed) {
    return (
      <div
        role="img"
        aria-label={badge.name}
        style={{ color: '#fff', textAlign: 'center', fontFamily: FONT, fontSize: Math.max(8, Math.round(size * 0.1)), fontWeight: 600, lineHeight: 1.1, padding: size * 0.1 }}
      >
        {badge.name}
      </div>
    );
  }
  return (
    <img
      key={cors ? 'cors' : 'plain'}
      ref={ref}
      src={badge.image}
      alt={badge.name}
      loading="eager"
      decoding="sync"
      crossOrigin={cors ? 'anonymous' : undefined}
      onError={fail}
      width={px}
      height={px}
      style={{ width: px, height: px, objectFit: 'contain', display: 'block' }}
    />
  );
}

function Medal({ badge, accent, size }) {
  const ring = Math.max(2, Math.round(size * 0.035));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        boxSizing: 'border-box',
        border: `${ring}px solid ${accent}`,
        background: 'radial-gradient(circle at 35% 28%, #1d2636 0%, #0c111b 70%)',
        boxShadow: `0 0 ${Math.round(size * 0.18)}px ${accent}55, inset 0 0 ${Math.round(size * 0.12)}px #00000080`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flex: '0 0 auto',
      }}
    >
      {badge.image ? (
        <MedalImage badge={badge} accent={accent} size={size} />
      ) : (
        <div
          role="img"
          aria-label={badge.name}
          style={{ color: '#fff', textAlign: 'center', fontFamily: FONT, lineHeight: 1.05, padding: size * 0.1 }}
        >
          <div style={{ fontSize: Math.round(size * 0.22), fontWeight: 800, color: accent }}>AWS</div>
          <div style={{ fontSize: Math.max(8, Math.round(size * 0.1)), fontWeight: 600, marginTop: 2 }}>Community Builder</div>
        </div>
      )}
    </div>
  );
}

function Legend({ groups, fontSize, gap, direction = 'column' }) {
  return (
    <div style={{ display: 'flex', flexDirection: direction, flexWrap: 'wrap', gap }}>
      {groups.map((g) => (
        <div key={g.title} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize, color: '#d6deeb' }}>
          <span
            style={{
              width: fontSize * 0.7,
              height: fontSize * 0.7,
              borderRadius: '50%',
              background: accentFor(g.title),
              boxShadow: `0 0 10px ${accentFor(g.title)}`,
              flex: '0 0 auto',
            }}
          />
          <span style={{ fontWeight: 700, color: '#fff', minWidth: fontSize * 1.3 }}>{g.badges.length}</span>
          <span>{g.title}</span>
        </div>
      ))}
    </div>
  );
}

function Grid({ groups, w, h, gap }) {
  const items = [];
  groups.forEach((g) => g.badges.forEach((b) => items.push({ b, accent: accentFor(g.title) })));
  const { size, cols } = fitGrid(items.length, w, h, gap);
  return (
    <div
      style={{
        width: w,
        height: h,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gridAutoRows: `${size}px`,
        gap,
        justifyContent: 'center',
        alignContent: 'center',
      }}
    >
      {items.map(({ b, accent }) => (
        <Medal key={b.id} badge={b} accent={accent} size={size} />
      ))}
    </div>
  );
}

const total = (groups) => groups.reduce((n, g) => n + g.badges.length, 0);

const shell = (width, height) => ({
  width,
  height,
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box',
  fontFamily: FONT,
  color: '#fff',
  background:
    'radial-gradient(900px 500px at 0% 0%, rgba(0,212,255,0.16), transparent 60%),' +
    'radial-gradient(800px 500px at 100% 100%, rgba(0,255,136,0.12), transparent 60%),' +
    '#06080d',
});

const Eyebrow = ({ size }) => (
  <div style={{ fontFamily: MONO, fontSize: size, color: '#00d4ff', letterSpacing: 1 }}>{'<verified-credentials />'}</div>
);

// True statement of where the counted credentials come from: Credly badges,
// plus any hand-set (non-Credly) ones such as AWS Community Builder.
export function sourceLabel(groups) {
  const all = groups.flatMap((g) => g.badges);
  const offCredly = all.filter((b) => !/credly\.com/.test(b.url || ''));
  if (offCredly.length === 0) return 'Verified on Credly';
  if (offCredly.every((b) => /Community Builder/i.test(b.name))) {
    return offCredly.length === all.length ? 'AWS Community Builder' : 'Credly + AWS Community Builder';
  }
  return `${all.length - offCredly.length} on Credly + ${offCredly.length} more`;
}

const Footer = ({ size, groups, stacked = false }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: stacked ? 'column-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: stacked ? 'flex-start' : 'center',
      gap: stacked ? 6 : 24,
      fontSize: size,
      color: '#8a96a8',
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{ fontFamily: MONO, color: stacked ? '#cfd8e6' : undefined }}>{SITE}</span>
    <span>{sourceLabel(groups)}</span>
  </div>
);

const AccentBar = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 6, background: 'linear-gradient(90deg, #00d4ff, #00ff88)' }} />
);

const BadgeShareCard = forwardRef(function BadgeShareCard({ size = 'wide', groups, noun = 'credentials' }, ref) {
  const { width, height } = CARD_SIZES[size] || CARD_SIZES.wide;
  const count = total(groups);

  if (size === 'square') {
    const pad = 64;
    return (
      <div ref={ref} style={{ ...shell(width, height), padding: pad, display: 'flex', flexDirection: 'column' }}>
        <AccentBar />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Eyebrow size={20} />
            <div style={{ fontSize: 52, fontWeight: 800, marginTop: 14, lineHeight: 1.05 }}>Swaroop A.S</div>
            <div style={{ fontSize: 30, fontWeight: 500, color: '#b9c4d4', marginTop: 8 }}>AI/ML Architect</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 112, fontWeight: 900, lineHeight: 0.9, color: '#00ff88' }}>{count}</div>
            <div style={{ fontSize: 22, color: '#b9c4d4', marginTop: 6 }}>{noun}</div>
          </div>
        </div>
        <div style={{ marginTop: 28, marginBottom: 24 }}>
          <Grid groups={groups} w={width - pad * 2} h={620} gap={18} />
        </div>
        <Legend groups={groups} fontSize={20} gap={14} direction="row" />
        <div style={{ marginTop: 'auto' }}>
          <Footer size={20} groups={groups} />
        </div>
      </div>
    );
  }

  const pad = 56;
  const left = 360;
  return (
    <div ref={ref} style={{ ...shell(width, height), padding: pad, display: 'flex', gap: 48 }}>
      <AccentBar />
      <div style={{ width: left, display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
        <Eyebrow size={16} />
        <div style={{ fontSize: 40, fontWeight: 800, marginTop: 14, lineHeight: 1.1 }}>Swaroop A.S</div>
        <div style={{ fontSize: 24, fontWeight: 500, color: '#b9c4d4', marginTop: 6 }}>AI/ML Architect</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 28 }}>
          <span style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.9, color: '#00ff88' }}>{count}</span>
          <span style={{ fontSize: 22, color: '#b9c4d4', lineHeight: 1.15 }}>{noun}</span>
        </div>
        <div style={{ marginTop: 28 }}>
          <Legend groups={groups} fontSize={17} gap={10} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <Footer size={16} groups={groups} stacked />
        </div>
      </div>
      <Grid groups={groups} w={width - pad * 2 - left - 48} h={height - pad * 2} gap={14} />
    </div>
  );
});

export default BadgeShareCard;

import React, { forwardRef } from 'react';

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
        <img
          src={badge.image}
          alt={badge.name}
          crossOrigin="anonymous"
          width={Math.round(size * 0.78)}
          height={Math.round(size * 0.78)}
          style={{ width: Math.round(size * 0.78), height: Math.round(size * 0.78), objectFit: 'contain', display: 'block' }}
        />
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

const Footer = ({ size }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: size, color: '#8a96a8' }}>
    <span style={{ fontFamily: MONO }}>{SITE}</span>
    <span>Verified on Credly</span>
  </div>
);

const AccentBar = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 6, background: 'linear-gradient(90deg, #00d4ff, #00ff88)' }} />
);

const BadgeShareCard = forwardRef(function BadgeShareCard({ size = 'wide', groups }, ref) {
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
            <div style={{ fontSize: 22, color: '#b9c4d4', marginTop: 6 }}>credentials</div>
          </div>
        </div>
        <div style={{ marginTop: 28, marginBottom: 24 }}>
          <Grid groups={groups} w={width - pad * 2} h={620} gap={18} />
        </div>
        <Legend groups={groups} fontSize={20} gap={14} direction="row" />
        <div style={{ marginTop: 'auto' }}>
          <Footer size={20} />
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
          <span style={{ fontSize: 22, color: '#b9c4d4' }}>credentials</span>
        </div>
        <div style={{ marginTop: 28 }}>
          <Legend groups={groups} fontSize={17} gap={10} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <Footer size={16} />
        </div>
      </div>
      <Grid groups={groups} w={width - pad * 2 - left - 48} h={height - pad * 2} gap={14} />
    </div>
  );
});

export default BadgeShareCard;

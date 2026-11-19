// Pure sizing rules for the hero particle field (no DOM, no three).

const FULL = 9000;
const REDUCED = 3200;
const NARROW_PX = 700;
const LOW_CORES = 4;

// Fewer particles on low-core devices or narrow viewports. Unknown core
// counts (undefined/0) are treated as capable, matching what browsers that
// hide hardwareConcurrency usually are.
function particleCount({ cores, width } = {}) {
  const lowCpu = typeof cores === 'number' && cores > 0 && cores <= LOW_CORES;
  const narrow = typeof width === 'number' && width > 0 && width < NARROW_PX;
  return lowCpu || narrow ? REDUCED : FULL;
}

// Cap device pixel ratio: 1.5 on reduced tier, 2 otherwise.
function maxDpr({ cores, width } = {}) {
  return particleCount({ cores, width }) === REDUCED ? 1.5 : 2;
}

// How far the hero has scrolled out of view, 0 (top at viewport top) to 1
// (bottom edge has left the viewport top). Clamped.
function heroScrollProgress({ top, height } = {}) {
  if (!height || height <= 0 || typeof top !== 'number') return 0;
  const p = -top / height;
  return Math.min(1, Math.max(0, p));
}

module.exports = { particleCount, maxDpr, heroScrollProgress, FULL, REDUCED };

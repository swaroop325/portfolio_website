// Pure helpers for the badge share panel. CommonJS so node:test can load them.

// Scale that fits a fixed-width card into `available` CSS pixels. Never
// upscales; never returns 0 or NaN (falls back to 1 until measured).
function computeScale(available, cardWidth) {
  if (!(available > 0) || !(cardWidth > 0)) return 1;
  return Math.min(1, available / cardWidth);
}

// True when the browser can share `file` through the Web Share API.
function canShareFiles(nav, file) {
  return Boolean(nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }));
}

const isAbortError = (e) => Boolean(e) && e.name === 'AbortError';

module.exports = { computeScale, canShareFiles, isAbortError };

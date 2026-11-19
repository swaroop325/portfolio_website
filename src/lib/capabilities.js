const CONTEXT_TYPES = ['webgl2', 'webgl', 'experimental-webgl'];

function hasWebGL(win) {
  try {
    const canvas = win.document.createElement('canvas');
    return CONTEXT_TYPES.some((type) => Boolean(canvas.getContext(type)));
  } catch (e) {
    return false;
  }
}

function prefersReducedMotion(win) {
  if (typeof win.matchMedia !== 'function') return false;
  try {
    return Boolean(win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
}

function canRender3D({ win } = {}) {
  if (!win || !win.document) return false;
  if (prefersReducedMotion(win)) return false;
  return hasWebGL(win);
}

module.exports = { canRender3D };

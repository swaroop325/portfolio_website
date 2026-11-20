const CONTEXT_TYPES = ['webgl2', 'webgl', 'experimental-webgl'];

// The probe result never changes within a page, and every probe leaves a live
// WebGL context behind (browsers cap these at ~16), so probe once per window and
// release the probe context straight away.
const webglCache = new WeakMap();

function hasWebGL(win) {
  if (webglCache.has(win)) return webglCache.get(win);
  let result = false;
  try {
    const canvas = win.document.createElement('canvas');
    for (const type of CONTEXT_TYPES) {
      const ctx = canvas.getContext(type);
      if (ctx) {
        result = true;
        try {
          const ext = typeof ctx.getExtension === 'function' ? ctx.getExtension('WEBGL_lose_context') : null;
          if (ext) ext.loseContext();
        } catch (e) {}
        break;
      }
    }
  } catch (e) {
    result = false;
  }
  webglCache.set(win, result);
  return result;
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

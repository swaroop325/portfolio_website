// Client-side PNG export for the badge share card.
// CommonJS so node:test can load it. html-to-image is loaded lazily inside
// exportCardPng, so nothing heavy (or DOM-dependent) runs at SSR/import time.

const LOAD_TIMEOUT_MS = 8000;

// Default placeholder: a dark circle holding the badge name as text.
function defaultCreatePlaceholder(img) {
  const doc = img.ownerDocument;
  const el = doc.createElement('div');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', img.alt || 'badge');
  el.textContent = img.alt || 'Badge';
  const w = img.width || img.clientWidth || 64;
  const h = img.height || img.clientHeight || 64;
  Object.assign(el.style, {
    width: `${w}px`,
    height: `${h}px`,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #1c2433, #0b0f17)',
    color: '#cfe8ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontSize: `${Math.max(8, Math.round(w / 9))}px`,
    lineHeight: '1.15',
    padding: '10%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily: 'inherit',
  });
  return el;
}

// Fetches an image with CORS and returns it as a data: URL.
// images.credly.com answers GET requests that carry an Origin header with
// `Access-Control-Allow-Origin: *`, so this works for Credly badges.
function defaultLoader(src) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS) : null;
  return fetch(src, { mode: 'cors', cache: 'no-cache', signal: controller ? controller.signal : undefined })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error('read failed'));
          reader.readAsDataURL(blob);
        })
    )
    .finally(() => timer && clearTimeout(timer));
}

// Replaces every <img> src under `node` with an inlined data URL from
// `loader`. Any image whose load fails (CORS, 404, timeout, throw) is swapped
// for a placeholder element. Always resolves, so the export can complete.
async function inlineImagesOrPlaceholder(node, loader = defaultLoader, { createPlaceholder = defaultCreatePlaceholder } = {}) {
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src || '';
      if (src.startsWith('data:')) return;
      try {
        const dataUrl = await loader(src);
        if (!dataUrl) throw new Error('empty image');
        img.src = dataUrl;
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => {});
        }
      } catch (e) {
        const placeholder = createPlaceholder(img);
        if (img.parentNode) img.parentNode.replaceChild(placeholder, img);
      }
    })
  );
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// html-to-image options. pixelRatio defaults to 1 so the downloaded file is
// exactly width x height pixels (the advertised 1200x627 / 1080x1080).
function buildToPngOptions({ width, height, pixelRatio = 1 }) {
  return {
    width,
    height,
    pixelRatio,
    canvasWidth: width,
    canvasHeight: height,
    cacheBust: false,
    skipFonts: true,
    style: { transform: 'none', margin: '0' },
  };
}

// Exports `node` as a PNG of width x height CSS pixels times pixelRatio
// (default 1) and triggers a download. Works on an off-screen clone so the
// visible card is never mutated.
async function exportCardPng(node, { width, height, filename = 'badges.png', pixelRatio = 1, loader = defaultLoader } = {}) {
  const { toPng } = await import('html-to-image');

  const host = document.createElement('div');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'hidden',
    pointerEvents: 'none',
  });
  const clone = node.cloneNode(true);
  clone.removeAttribute('id');
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await inlineImagesOrPlaceholder(clone, loader);
    const dataUrl = await toPng(clone, buildToPngOptions({ width, height, pixelRatio }));
    triggerDownload(dataUrl, filename);
  } finally {
    host.remove();
  }
}

module.exports = { inlineImagesOrPlaceholder, exportCardPng, buildToPngOptions, defaultLoader };

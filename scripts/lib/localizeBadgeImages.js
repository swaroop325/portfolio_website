const path = require('node:path');

const MAX_BYTES = 2 * 1024 * 1024;
const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};
const KNOWN_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']);

function sniff(buf) {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  const head = buf.slice(0, 512).toString('utf8').trimStart();
  if (/^(<\?xml[\s\S]*?)?<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

// Stable base name from the URL (Credly image UUID, else a sanitized last segment).
function parseUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch (e) {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const segs = u.pathname.split('/').filter(Boolean);
  const uuid = segs.find(s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s));
  const last = segs[segs.length - 1] || '';
  const m = /^(.*)\.([a-z0-9]+)$/i.exec(last);
  const urlExt = m && KNOWN_EXTS.has(m[2].toLowerCase()) ? m[2].toLowerCase().replace('jpeg', 'jpg') : null;
  const base = (uuid || (m ? m[1] : last)).toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!base) return null;
  return { base, urlExt };
}

function fileNameFor(url, ext) {
  const p = parseUrl(url);
  if (!p) return null;
  return `${p.base}.${ext || p.urlExt || 'png'}`;
}

// Finds an already-downloaded file for this URL, whatever its extension.
function findExisting(p, dir, exists) {
  const exts = [p.urlExt, 'png', 'jpg', 'webp', 'gif', 'svg'].filter(Boolean);
  for (const ext of new Set(exts)) {
    const name = `${p.base}.${ext}`;
    if (exists(path.join(dir, name))) return name;
  }
  return null;
}

async function localizeBadgeImages(badges, { dir, publicPrefix = '/badges', download, exists, write, log = () => {} }) {
  const prefix = publicPrefix.replace(/\/$/, '');
  const cache = new Map();

  async function localize(url) {
    if (cache.has(url)) return cache.get(url);
    const result = (async () => {
      const p = parseUrl(url);
      if (!p) return null;
      const existing = findExisting(p, dir, exists);
      if (existing) return existing;
      try {
        const res = await download(url);
        const buffer = Buffer.isBuffer(res) ? res : res && res.buffer;
        const contentType = Buffer.isBuffer(res) ? '' : String((res && res.contentType) || '').split(';')[0].trim().toLowerCase();
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('empty body');
        if (buffer.length > MAX_BYTES) throw new Error(`too large (${buffer.length} bytes)`);
        const sniffed = sniff(buffer);
        if (!sniffed) throw new Error('not an image');
        const name = `${p.base}.${sniffed}`;
        await write(path.join(dir, name), buffer);
        return name;
      } catch (err) {
        log(`badge image ${url}: ${err.message}`);
        return null;
      }
    })();
    cache.set(url, result);
    return result;
  }

  const out = [];
  for (const b of badges) {
    if (!b || typeof b.image !== 'string' || !/^https:/i.test(b.image)) {
      out.push(b);
      continue;
    }
    const name = await localize(b.image);
    out.push(name ? { ...b, image: `${prefix}/${name}`, sourceImage: b.image } : b);
  }
  return out;
}

module.exports = { localizeBadgeImages, fileNameFor, sniff, MAX_BYTES };

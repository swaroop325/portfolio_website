const test = require('node:test');
const assert = require('node:assert');
const { inlineImagesOrPlaceholder } = require('../exportPng');

// Minimal node-like fakes: no DOM in node:test.
const mkImg = (src, alt) => {
  const img = { tagName: 'IMG', src, alt, parentNode: null };
  return img;
};
const mkParent = (children) => {
  const parent = {
    children: children.slice(),
    replaceChild(next, prev) {
      const i = parent.children.indexOf(prev);
      if (i === -1) throw new Error('not a child');
      parent.children[i] = next;
      next.parentNode = parent;
      prev.parentNode = null;
    },
  };
  children.forEach((c) => { c.parentNode = parent; });
  return parent;
};
const mkNode = (imgs) => ({ querySelectorAll: (sel) => (sel === 'img' ? imgs.slice() : []) });
const createPlaceholder = (img) => ({ placeholder: true, text: img.alt });

test('resolves and replaces the image whose load rejects with a placeholder', async () => {
  const good = mkImg('https://cdn/good.png', 'Good badge');
  const bad = mkImg('https://cdn/bad.png', 'Bad badge');
  const parent = mkParent([good, bad]);
  const loader = (src) => (src.includes('bad') ? Promise.reject(new Error('CORS')) : Promise.resolve('data:image/png;base64,AAA'));

  await inlineImagesOrPlaceholder(mkNode([good, bad]), loader, { createPlaceholder });

  assert.strictEqual(parent.children[0], good);
  assert.strictEqual(good.src, 'data:image/png;base64,AAA');
  assert.deepStrictEqual(parent.children[1], { placeholder: true, text: 'Bad badge', parentNode: parent });
  assert.strictEqual(bad.parentNode, null);
});

test('resolves when every image fails, and when there are no images', async () => {
  const a = mkImg('a', 'A');
  const b = mkImg('b', 'B');
  const parent = mkParent([a, b]);
  await inlineImagesOrPlaceholder(mkNode([a, b]), () => Promise.reject(new Error('x')), { createPlaceholder });
  assert.ok(parent.children.every((c) => c.placeholder));
  await inlineImagesOrPlaceholder(mkNode([]), () => Promise.reject(new Error('x')), { createPlaceholder });
});

test('a loader that throws synchronously is treated as a failure', async () => {
  const a = mkImg('a', 'A');
  const parent = mkParent([a]);
  await inlineImagesOrPlaceholder(mkNode([a]), () => { throw new Error('boom'); }, { createPlaceholder });
  assert.strictEqual(parent.children[0].placeholder, true);
});

test('data: URLs are left alone without calling the loader', async () => {
  const a = mkImg('data:image/png;base64,ZZZ', 'A');
  mkParent([a]);
  let calls = 0;
  await inlineImagesOrPlaceholder(mkNode([a]), () => { calls += 1; return Promise.resolve('x'); }, { createPlaceholder });
  assert.strictEqual(calls, 0);
  assert.strictEqual(a.src, 'data:image/png;base64,ZZZ');
});

test('export options default to pixelRatio 1 so the PNG is exactly width x height', () => {
  const { buildToPngOptions } = require('../exportPng');
  const wide = buildToPngOptions({ width: 1200, height: 627 });
  assert.strictEqual(wide.pixelRatio, 1);
  assert.strictEqual(wide.width * wide.pixelRatio, 1200);
  assert.strictEqual(wide.height * wide.pixelRatio, 627);
  const sq = buildToPngOptions({ width: 1080, height: 1080 });
  assert.deepStrictEqual([sq.width, sq.height, sq.pixelRatio], [1080, 1080, 1]);
  assert.strictEqual(buildToPngOptions({ width: 10, height: 10, pixelRatio: 2 }).pixelRatio, 2);
});

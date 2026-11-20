const test = require('node:test');
const assert = require('node:assert');
const { localizeBadgeImages, fileNameFor, MAX_BYTES } = require('../localizeBadgeImages');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const U1 = '4d4693bb-530e-4bca-9327-de07f3aa2348';
const U2 = '1e9b7606-d621-4dc6-b85c-752e9cdc3a28';

function env(files = {}, download) {
  const fs = { ...files };
  return {
    fs,
    opts: {
      dir: '/d',
      publicPrefix: '/badges',
      download,
      exists: p => p in fs,
      write: async (p, b) => { fs[p] = b; },
    },
  };
}

test('filename derivation', () => {
  assert.equal(fileNameFor(`https://images.credly.com/images/${U1}/image.png`), `${U1}.png`);
  assert.equal(fileNameFor(`https://images.credly.com/images/${U2}/blob`), `${U2}.png`);
  assert.equal(fileNameFor(`https://images.credly.com/images/${U2}/blob`, 'webp'), `${U2}.webp`);
  assert.equal(fileNameFor(`http://images.credly.com/images/${U1}/image.png`), null);
});

test('downloads, rewrites image, keeps sourceImage; /blob sniffs jpeg', async () => {
  const src = `https://images.credly.com/images/${U2}/blob`;
  const { fs, opts } = env({}, async () => ({ buffer: JPG, contentType: 'application/octet-stream' }));
  const [b] = await localizeBadgeImages([{ id: 1, image: src }], opts);
  assert.equal(b.image, `/badges/${U2}.jpg`);
  assert.equal(b.sourceImage, src);
  assert.ok(fs[`/d/${U2}.jpg`]);
});

test('skips download when file exists', async () => {
  let calls = 0;
  const { opts } = env({ [`/d/${U1}.png`]: PNG }, async () => { calls++; return PNG; });
  const [b] = await localizeBadgeImages([{ image: `https://images.credly.com/images/${U1}/image.png` }], opts);
  assert.equal(calls, 0);
  assert.equal(b.image, `/badges/${U1}.png`);
});

test('failure falls back to existing local file', async () => {
  const { opts } = env({ [`/d/${U2}.webp`]: PNG }, async () => { throw new Error('boom'); });
  const [b] = await localizeBadgeImages([{ image: `https://images.credly.com/images/${U2}/blob` }], opts);
  assert.equal(b.image, `/badges/${U2}.webp`);
});

test('failure with no local file keeps remote url', async () => {
  const src = `https://images.credly.com/images/${U1}/image.png`;
  const { fs, opts } = env({}, async () => { throw new Error('boom'); });
  const [b] = await localizeBadgeImages([{ image: src }], opts);
  assert.equal(b.image, src);
  assert.equal(b.sourceImage, undefined);
  assert.deepEqual(Object.keys(fs), []);
});

test('rejects non-image, empty and oversized bodies', async () => {
  const src = `https://images.credly.com/images/${U1}/image.png`;
  for (const body of [Buffer.from('<html>nope</html>'), Buffer.alloc(0), Buffer.concat([PNG, Buffer.alloc(MAX_BYTES)])]) {
    const { fs, opts } = env({}, async () => body);
    const [b] = await localizeBadgeImages([{ image: src }], opts);
    assert.equal(b.image, src);
    assert.deepEqual(Object.keys(fs), []);
  }
});

test('rejects non-https and passes through null images', async () => {
  let calls = 0;
  const { opts } = env({}, async () => { calls++; return PNG; });
  const input = [{ image: `http://images.credly.com/images/${U1}/image.png` }, { image: null }, { image: '/badges/x.png' }];
  const out = await localizeBadgeImages(input, opts);
  assert.deepEqual(out, input);
  assert.equal(calls, 0);
});

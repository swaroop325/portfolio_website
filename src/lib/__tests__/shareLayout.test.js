const test = require('node:test');
const assert = require('node:assert');
const { computeScale, canShareFiles, isAbortError } = require('../shareLayout');
const { renderWithWarmup } = require('../exportPng');

test('computeScale fits narrow widths and never upscales', () => {
  assert.strictEqual(computeScale(358, 1200), 358 / 1200);
  assert.strictEqual(computeScale(2000, 1200), 1);
  assert.strictEqual(computeScale(0, 1200), 1);
  assert.strictEqual(computeScale(NaN, 1200), 1);
});

test('canShareFiles requires share + canShare returning true', () => {
  const f = {};
  assert.strictEqual(canShareFiles(undefined, f), false);
  assert.strictEqual(canShareFiles({ share() {} }, f), false);
  assert.strictEqual(canShareFiles({ share() {}, canShare: () => false }, f), false);
  assert.strictEqual(canShareFiles({ share() {}, canShare: (d) => d.files[0] === f }, f), true);
});

test('isAbortError only matches AbortError', () => {
  assert.strictEqual(isAbortError({ name: 'AbortError' }), true);
  assert.strictEqual(isAbortError(new Error('x')), false);
  assert.strictEqual(isAbortError(null), false);
});

test('renderWithWarmup renders twice and returns the second result', async () => {
  let n = 0;
  assert.strictEqual(await renderWithWarmup(async () => ++n), 2);
});

test('renderWithWarmup ignores a failing warm-up but surfaces a failing real render', async () => {
  let n = 0;
  assert.strictEqual(await renderWithWarmup(async () => { n += 1; if (n === 1) throw new Error('warm'); return 'ok'; }), 'ok');
  await assert.rejects(renderWithWarmup(async () => { throw new Error('real'); }), /real/);
});

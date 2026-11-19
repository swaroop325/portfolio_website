const test = require('node:test');
const assert = require('node:assert');
const { canRender3D } = require('../capabilities');

const mkWin = ({ contexts = { webgl2: {} }, reduce = false, matchMedia = true } = {}) => {
  const win = {
    document: {
      createElement: () => ({ getContext: (type) => (contexts[type] ? contexts[type] : null) }),
    },
  };
  if (matchMedia) win.matchMedia = (q) => ({ matches: reduce && q.includes('prefers-reduced-motion') });
  return win;
};

test('false when win is undefined', () => {
  assert.strictEqual(canRender3D({}), false);
  assert.strictEqual(canRender3D({ win: undefined }), false);
});

test('false when reduced motion is preferred', () => {
  assert.strictEqual(canRender3D({ win: mkWin({ reduce: true }) }), false);
});

test('false when no webgl context is available', () => {
  assert.strictEqual(canRender3D({ win: mkWin({ contexts: {} }) }), false);
});

test('true with a working context', () => {
  assert.strictEqual(canRender3D({ win: mkWin() }), true);
});

test('falls back through webgl and experimental-webgl', () => {
  assert.strictEqual(canRender3D({ win: mkWin({ contexts: { webgl: {} } }) }), true);
  assert.strictEqual(canRender3D({ win: mkWin({ contexts: { 'experimental-webgl': {} } }) }), true);
});

test('missing matchMedia is treated as motion allowed', () => {
  assert.strictEqual(canRender3D({ win: mkWin({ matchMedia: false }) }), true);
});

test('false when getContext throws', () => {
  const win = { document: { createElement: () => ({ getContext: () => { throw new Error('x'); } }) } };
  assert.strictEqual(canRender3D({ win }), false);
});

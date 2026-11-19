const test = require('node:test');
const assert = require('node:assert');
const { particleCount, maxDpr, heroScrollProgress, FULL, REDUCED } = require('../particles');

test('full count on a capable wide device', () => {
  assert.strictEqual(particleCount({ cores: 8, width: 1440 }), FULL);
});

test('reduced count at 4 cores or fewer', () => {
  assert.strictEqual(particleCount({ cores: 4, width: 1440 }), REDUCED);
  assert.strictEqual(particleCount({ cores: 2, width: 1440 }), REDUCED);
});

test('reduced count on narrow viewports', () => {
  assert.strictEqual(particleCount({ cores: 8, width: 390 }), REDUCED);
  assert.strictEqual(particleCount({ cores: 8, width: 699 }), REDUCED);
  assert.strictEqual(particleCount({ cores: 8, width: 700 }), FULL);
});

test('unknown cores or width do not reduce', () => {
  assert.strictEqual(particleCount({}), FULL);
  assert.strictEqual(particleCount(), FULL);
  assert.strictEqual(particleCount({ cores: 0, width: 0 }), FULL);
});

test('dpr cap follows the tier', () => {
  assert.strictEqual(maxDpr({ cores: 8, width: 1440 }), 2);
  assert.strictEqual(maxDpr({ cores: 8, width: 390 }), 1.5);
});

test('scroll progress is clamped 0..1', () => {
  assert.strictEqual(heroScrollProgress({ top: 0, height: 800 }), 0);
  assert.strictEqual(heroScrollProgress({ top: 100, height: 800 }), 0);
  assert.strictEqual(heroScrollProgress({ top: -400, height: 800 }), 0.5);
  assert.strictEqual(heroScrollProgress({ top: -2000, height: 800 }), 1);
  assert.strictEqual(heroScrollProgress({ top: -10, height: 0 }), 0);
  assert.strictEqual(heroScrollProgress(), 0);
});

const test = require('node:test');
const assert = require('node:assert');
const { sourceLabel } = require('../badgeLabels');
const { handSetBadges, communityBuilderBadge } = require('../../data/curation');

const cred = { name: 'X', url: 'https://www.credly.com/badges/1' };

test('all Credly', () => assert.strictEqual(sourceLabel([cred]), 'Verified on Credly'));
test('Credly + one programme badge', () => assert.strictEqual(sourceLabel([cred, communityBuilderBadge]), 'Credly + AWS Community Builder'));
test('Credly + two programme badges', () => assert.strictEqual(sourceLabel([cred, ...handSetBadges]), 'Credly + AWS programme badges'));
test('only hand-set badges', () => assert.strictEqual(sourceLabel(handSetBadges), 'AWS programme badges'));
test('unknown off-Credly badges are counted, not named', () =>
  assert.strictEqual(sourceLabel([cred, { name: 'Y', url: 'https://example.com' }]), '1 on Credly + 1 more'));

// Hand-curated inputs for the portfolio. CommonJS so node:test can load it.
const curation = {
  pinned: ['llmonaws', 'spammerLLM', 'SandraCore', 'cloudbox', 'S.U.N.D.A.Y', 'cv-processor', 'mac-llm-inference'],
  deny: [],
  overrides: {},
};

// Badge-shaped, hand-set. Passed into groupBadges by the caller (not merged there).
const communityBuilderBadge = {
  id: 'aws-community-builder-devtools',
  name: 'AWS Community Builder (DevTools)',
  issuer: 'Amazon Web Services',
  issuedAt: '2024-01-01',
  expiresAt: null,
  image: null,
  url: 'https://builder.aws.com/community/@swaroop325',
};

module.exports = { curation, communityBuilderBadge };

// Hand-curated inputs for the portfolio. CommonJS so node:test can load it.
const curation = {
  pinned: ['llmonaws', 'spammerLLM', 'SandraCore', 'cloudbox', 'S.U.N.D.A.Y', 'cv-processor', 'mac-llm-inference'],
  // Own profile repo and this site are not portfolio work.
  deny: ['swaroop325', 'portfolio_website'],
  // Descriptions written from each repo's README / file listing, fetched 2026-11-19.
  // cloudbox has only a template README; its description is inferred from
  // schema.json (infrastructure config form schema) and a Toolpad/rjsf Vite app.
  overrides: {
    llmonaws: { description: 'Terraform-provisioned, OpenAI-compatible vLLM endpoint on AWS GPU EC2 behind an ALB and Auto Scaling.' },
    spammerLLM: { description: 'Go load and stress tester for OpenAI-compatible LLM endpoints: throughput, latency, TTFT, breaking point.' },
    SandraCore: { description: 'Personal AI assistant on AWS Bedrock: multi-channel, semantic memory, multi-agent, TTS/STT (TypeScript).' },
    'S.U.N.D.A.Y': { description: 'Local-first, voice-first agentic assistant for macOS using MLX-Whisper, Ollama and Kokoro TTS.' },
    'cv-processor': { description: 'FastAPI backend that parses CVs and matches them to job descriptions via pgvector similarity search.' },
    'mac-llm-inference': { description: 'OpenAI-compatible LLM inference server on Apple Silicon (MLX, FastAPI) with caching and Prometheus metrics.' },
  },
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

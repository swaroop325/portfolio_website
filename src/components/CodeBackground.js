import React from 'react'

// Retired the animated "falling code" canvas: it ran a full-viewport 2D
// requestAnimationFrame loop for the whole visit, fought the 3D hero for
// attention and GPU time, and repainted behind every section. What remains is
// a static page backdrop in the theme palette: one fixed layer, no JS work.
const CodeBackground = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: -2,
      pointerEvents: 'none',
      background:
        'radial-gradient(60% 50% at 85% 10%, rgba(0, 212, 255, 0.07), transparent 70%),' +
        'radial-gradient(50% 45% at 5% 90%, rgba(0, 255, 136, 0.05), transparent 70%),' +
        'var(--bg-2, #0a0a19)',
    }}
  />
)

export default CodeBackground

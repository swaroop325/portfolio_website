import React, { Suspense, useEffect, useState } from 'react';
import { canRender3D } from '../../lib/capabilities';

// Renders `fallback` on the server, until mounted, and whenever 3D is not
// available. Otherwise renders the (React.lazy) children inside Suspense.
// This module must never import three/r3f/drei: callers pass lazy children.
export default function SceneGuard({ fallback = null, children }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(canRender3D({ win: window }));
  }, []);

  if (!allowed) return <>{fallback}</>;
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

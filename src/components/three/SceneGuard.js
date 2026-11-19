import React, { Suspense, useEffect, useState } from 'react';
import { canRender3D } from '../../lib/capabilities';

// Catches a rejected React.lazy chunk or a throw inside the 3D tree so the
// rest of the page keeps rendering; shows `fallback` instead.
export class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('3D scene failed, showing fallback:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// Renders `fallback` on the server, until mounted, and whenever 3D is not
// available or fails. Otherwise renders the (React.lazy) children inside Suspense.
// This module must never import three/r3f/drei: callers pass lazy children.
export default function SceneGuard({ fallback = null, children }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(canRender3D({ win: window }));
  }, []);

  if (!allowed) return <>{fallback}</>;
  return (
    <SceneErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SceneErrorBoundary>
  );
}

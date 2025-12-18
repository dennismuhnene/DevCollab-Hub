'use client';

import { useState, useEffect } from 'react';

/**
 * A component that only renders its children on the client-side after the initial mount.
 * This is used to prevent hydration mismatches with components that generate random values
 * or rely on browser-specific APIs.
 */
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

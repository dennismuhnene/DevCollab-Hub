// src/components/tracking-blocked-notice.tsx
'use client';
import { useEffect, useState } from 'react';
import { detectGtagAvailable, isGtagBlockedFlag } from '@/lib/diagnostics';

export default function TrackingBlockedNotice() {
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This now runs only on the client, after the initial render.
    setIsClient(true);

    let mounted = true;
    // Quick check first
    if (isGtagBlockedFlag()) {
      setBlocked(true);
      return;
    }
    // perform the async detection
    detectGtagAvailable().then((ok: boolean) => {
      if (!mounted) return;
      setBlocked(!ok);
    }).catch(() => {
      if (!mounted) return;
      setBlocked(true);
    });
    return () => { mounted = false; };
  }, []);

  // On the server, OR on the first client render, this will be false, so we return null.
  // This guarantees the server and client match for the first render.
  if (!isClient || blocked === null || blocked === false) {
    return null;
  }

  // This div will only be rendered on the client, after hydration is complete.
  return (
    <div style={{
      width: '100%',
      background: '#fff4e5',
      color: '#663c00',
      border: '1px solid #ffd8a8',
      padding: '8px 12px',
      fontSize: 13,
      textAlign: 'center'
    }}>
      You are using a browser or extension that blocks analytics — tracking is disabled for this session.
    </div>
  );
}

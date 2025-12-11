// src/lib/analytics/diagnostics.ts
// Client-side helpers for detecting gtag presence and sending fallback telemetry.

type TelemetryEvent = {
    name: string;
    params?: Record<string, any>;
    timestamp?: string;
    path?: string;
  };
  
  const DIAGNOSTIC_FLAG = '__gtag_blocked__';
  const DIAGNOSTIC_TIMEOUT_MS = 1500;
  
  /**
   * Checks if window.gtag is reachable and whether the gtag script resource was fetched.
   * Resolves to true if GA is available, false if not (likely blocked).
   */
  export async function detectGtagAvailable(): Promise<boolean> {
    // Quick check: window.gtag exists
    if (typeof window === 'undefined') return false;
    if ((window as any).gtag && typeof (window as any).gtag === 'function') {
      return true;
    }
  
    // Wait a short timeout then inspect resource timings for gtag/js or googletagmanager
    await new Promise((res) => setTimeout(res, DIAGNOSTIC_TIMEOUT_MS));
  
    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const found = resources.some((r) =>
        r.name.includes('gtag/js') || r.name.includes('googletagmanager.com') || r.name.includes('googletagservices')
      );
      if (found) {
        // script requested but window.gtag not defined — likely blocked from executing
        (window as any)[DIAGNOSTIC_FLAG] = true;
        console.warn('GA diagnostic: gtag resource present but window.gtag not defined — likely executed blocked.');
        return false;
      }
    } catch (e) {
      // ignore
    }
  
    // No resource; script likely blocked by extension/browser
    (window as any)[DIAGNOSTIC_FLAG] = true;
    console.info('GA diagnostic: gtag resource not found — likely blocked by browser/extension.');
    return false;
  }
  
  /**
   * Returns true if diagnostic previously detected blocking.
   */
  export function isGtagBlockedFlag(): boolean {
    return !!(typeof window !== 'undefined' && (window as any)[DIAGNOSTIC_FLAG]);
  }
  
  /**
   * Posts telemetry to the server fallback endpoint.
   * Endpoint: /api/telemetry (create route below)
   */
  export async function sendFallbackTelemetry(event: TelemetryEvent) {
    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          path: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (err) {
      // If network fails, store in localStorage queue for later retry
      const key = 'fallbackTelemetryQueue';
      try {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ ...event, queuedAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {
        console.error('Fallback telemetry queue failed', e);
      }
    }
  }
  
  /**
   * Attempt to flush any queued telemetry in localStorage.
   */
  export async function flushQueuedTelemetry() {
    const key = 'fallbackTelemetryQueue';
    try {
      const queued = JSON.parse(localStorage.getItem(key) || '[]') as TelemetryEvent[];
      if (!queued.length) return;
      for (const item of queued) {
        await sendFallbackTelemetry(item).catch(() => {/*keep trying next time*/});
      }
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  }
  
  /**
   * Top-level wrapper used by your application to log events.
   * Behavior:
   *  - If window.gtag exists, call gtag(eventName, params)
   *  - If not, send fallback telemetry to /api/telemetry
   *  - Always run detectGtagAvailable() on first call to set diagnostic flag
   */
  let _diagnosticChecked = false;
  
  export async function logEventWithFallback(name: string, params?: Record<string, any>) {
    if (typeof window === 'undefined') return;
  
    // one-time diagnostic check
    if (!_diagnosticChecked) {
      _diagnosticChecked = true;
      const ok = await detectGtagAvailable();
      if (!ok) {
        // record an initial diagnostic event
        await sendFallbackTelemetry({ name: 'gtag_blocked_detected', params: { reason: 'diagnostic' } });
      }
      // try flushing any queued telemetry
      flushQueuedTelemetry();
    }
  
    // If gtag is available, use it
    if ((window as any).gtag && typeof (window as any).gtag === 'function') {
      try {
        (window as any).gtag('event', name, params || {});
        return;
      } catch (e) {
        console.warn('gtag call failed, falling back to server telemetry', e);
      }
    }
  
    // Fallback: send server-side telemetry
    await sendFallbackTelemetry({ name, params });
  }
  
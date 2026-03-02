/**
 * Client-side performance telemetry — captures Core Web Vitals
 * (LCP, FID, CLS) via PerformanceObserver and batches them to
 * the backend analytics endpoint using sendBeacon.
 */

const BUFFER = [];
const FLUSH_INTERVAL = 30_000; // 30 seconds
const ENDPOINT = '/api/v1/analytics/telemetry';

function push(metric) {
  BUFFER.push({ ...metric, ts: Date.now() });
}

function flush() {
  if (BUFFER.length === 0) return;
  const batch = BUFFER.splice(0, BUFFER.length);
  try {
    const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, blob);
    }
  } catch {
    // silently drop
  }
}

export function initTelemetry() {
  if (typeof PerformanceObserver === 'undefined') return;

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) push({ name: 'LCP', value: Math.round(last.startTime) });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // unsupported
  }

  // First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      if (entry) push({ name: 'FID', value: Math.round(entry.processingStart - entry.startTime) });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {
    // unsupported
  }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      push({ name: 'CLS', value: Math.round(clsValue * 1000) / 1000 });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // unsupported
  }

  // Periodic flush
  setInterval(flush, FLUSH_INTERVAL);

  // Flush on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

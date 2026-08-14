/**
 * Lightweight, optional analytics helper for Convert-X
 * Respects user privacy and only logs if VITE_ANALYTICS_ID is explicitly configured.
 */

const ANALYTICS_ID =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env.VITE_ANALYTICS_ID || (import.meta as any).env.VITE_GA_ID
    : undefined;

export function initAnalytics() {
  if (!ANALYTICS_ID || typeof window === 'undefined') return;

  try {
    const existingScript = document.getElementById('google-analytics-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-analytics-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}`;
      document.head.appendChild(script);

      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      gtag('js', new Date());
      gtag('config', ANALYTICS_ID, { anonymize_ip: true });
    }
  } catch (e) {
    // Non-blocking
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag && ANALYTICS_ID) {
    try {
      (window as any).gtag('event', eventName, params);
    } catch (e) {
      // Non-blocking
    }
  }
}

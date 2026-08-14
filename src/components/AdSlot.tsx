import React, { useEffect, useRef } from 'react';

interface AdSlotProps {
  slotId?: string;
  format?: 'leaderboard' | 'rectangle' | 'banner' | 'in-feed';
  className?: string;
  adsenseClientId?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({
  slotId = 'default-ad-slot',
  format = 'leaderboard',
  className = '',
  adsenseClientId,
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  // Check client ID from prop or Vite client env
  const clientId =
    adsenseClientId ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env.VITE_ADSENSE_CLIENT_ID
      : '');
  const hasAdSense = Boolean(clientId && clientId.trim() !== '');

  useEffect(() => {
    if (hasAdSense && typeof window !== 'undefined') {
      try {
        // Safe dynamic AdSense script injection if not already present
        const existingScript = document.getElementById('google-adsense-script');
        if (!existingScript && clientId) {
          const script = document.createElement('script');
          script.id = 'google-adsense-script';
          script.async = true;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
        }

        // Push ad call if adsbygoogle exists
        if ((window as any).adsbygoogle) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch (err) {
        // Non-blocking error handling for ad blockers
      }
    }
  }, [hasAdSense, clientId]);

  if (hasAdSense) {
    return (
      <div
        ref={adRef}
        className={`w-full my-6 flex flex-col items-center justify-center overflow-hidden ${className}`}
        data-ad-slot={slotId}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8] mb-1">
          Advertisement
        </span>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', minHeight: format === 'rectangle' ? '250px' : '90px' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Respectful, non-deceptive placeholder when AdSense is not configured
  return (
    <div
      ref={adRef}
      className={`w-full my-6 flex flex-col items-center justify-center ${className}`}
      data-ad-slot={slotId}
      role="complementary"
      aria-label="Advertisement placeholder"
    >
      <div className="w-full max-w-4xl rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#334155] bg-slate-50/50 dark:bg-[#0F172A]/40 px-4 py-4 sm:py-5 text-center transition-colors">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-[10px] font-bold tracking-widest text-[#64748B] dark:text-[#94A3B8] uppercase mb-1.5">
          <span>Advertisement</span>
        </div>
        <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
          Reserved ad slot for Google AdSense & verified sponsor partners.
        </p>
      </div>
    </div>
  );
};

import React from 'react';

interface AdBannerProps {
  slotType: 'header' | 'intermission' | 'sidebar';
  adClient?: string;
  adSlot?: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  slotType,
  adClient = '',
  adSlot = '',
  className = '',
}) => {
  // If no AdSense ID configured yet, render clean compliant ad space reserved banner
  const hasAdSense = Boolean(adClient && adSlot);

  return (
    <div className={`w-full overflow-hidden my-3 ${className}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1 text-center">
        Advertisement
      </div>
      <div className="w-full rounded-xl bg-slate-900/60 border border-slate-800/80 p-2 sm:p-3 flex flex-col items-center justify-center text-center">
        {hasAdSense ? (
          <div>
            <ins
              className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client={adClient}
              data-ad-slot={adSlot}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        ) : (
          <div className="py-2 px-4 max-w-md">
            <div className="flex items-center justify-center space-x-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">
                Google AdSense Partner Spot
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Safe & non-intrusive family-friendly advertising. Configurable in Admin Panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

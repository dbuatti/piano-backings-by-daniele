"use client";

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Plane, X } from 'lucide-react';
import { format } from 'date-fns';

const DISMISS_KEY = 'holidayBannerDismissed';

const HolidayModeBanner: React.FC = () => {
  const { isHolidayModeActive, holidayReturnDate, isLoading, error } = useAppSettings();
  const location = useLocation();
  const [isDismissed, setIsDismissed] = useState(false);

  // On mount, check if user dismissed the banner this browser session
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Storage unavailable (private mode etc.) — just show the banner.
    }
  }, []);

  // Reset dismissal if holiday mode was turned off and then back on (new holiday).
  // Wait for settings to load: while loading, holiday mode reads as off.
  useEffect(() => {
    if (!isLoading && !error && !isHolidayModeActive) {
      try { sessionStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
      setIsDismissed(false);
    }
  }, [isLoading, error, isHolidayModeActive]);

  const handleDismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
    setIsDismissed(true);
  };

  if (isLoading || error || !isHolidayModeActive || isDismissed) {
    return null;
  }

  const dateLong = holidayReturnDate ? format(holidayReturnDate, 'EEEE d MMMM') : null;
  const dateShort = holidayReturnDate ? format(holidayReturnDate, 'd MMM') : null;
  const startFrom = dateLong ? 'from then' : "as soon as I'm back";
  const onShop = location.pathname.startsWith('/shop');
  const onForm = location.pathname.startsWith('/form-page');

  // Rendered inside the fixed Header and hung just below it, so it stays visible
  // without pushing page content (pages already pad for the header).
  return (
    <div role="status" className="absolute top-full left-0 right-0 bg-[#1C0357] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center gap-2 text-xs sm:text-sm">
        <Plane className="h-4 w-4 flex-shrink-0 text-[#F538BC]" aria-hidden="true" />
        <p className="flex-1 font-medium truncate sm:whitespace-normal">
          <span className="sm:hidden">
            {dateShort ? `Away until ${dateShort}. ` : 'Away for now. '}
            {onShop ? 'Shop downloads are instant.' : "Book now, I'll start then."}
          </span>
          <span className="hidden sm:inline">
            {dateLong ? `I'm away until ${dateLong}.` : "I'm away for a little while."}{' '}
            {onShop
              ? `Shop tracks still download instantly. Custom requests are open and I'll start on them ${startFrom}.`
              : `You can still book a custom track now and I'll start on it ${startFrom}.`}
            {!onShop && !onForm && (
              <>
                {' '}
                <Link to="/form-page" className="underline underline-offset-2 font-bold hover:text-[#F538BC]">
                  Request a track
                </Link>
              </>
            )}
          </span>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss holiday notice"
          className="p-1 rounded hover:bg-white/10 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HolidayModeBanner;

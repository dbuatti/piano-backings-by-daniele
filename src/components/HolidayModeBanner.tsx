"use client";

import React from 'react';
import { useHolidayMode } from '@/hooks/useHolidayMode';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plane, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const HolidayModeBanner: React.FC = () => {
  const { isHolidayModeActive, holidayReturnDate, isLoading, error } = useHolidayMode();

  if (isLoading) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-100 text-yellow-800 p-3 text-center flex items-center justify-center shadow-md">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <p className="text-sm">Checking holiday status...</p>
      </div>
    );
  }

  if (error) {
    // Optionally display a subtle error or nothing if fetching fails
    console.error("Failed to load holiday mode settings for banner:", error);
    return null;
  }

  if (!isHolidayModeActive) {
    return null;
  }

  const returnDateMessage = holidayReturnDate
    ? `We'll be back on ${format(holidayReturnDate, 'MMMM d, yyyy')} to continue tracks.`
    : `We'll be back soon to continue tracks.`;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-[#F538BC] to-[#FF00B3] text-white p-3 text-center shadow-lg">
      <Alert className="bg-transparent border-none text-white flex items-center justify-center p-0">
        <Plane className="h-5 w-5 mr-3 flex-shrink-0" />
        <AlertTitle className="text-lg font-bold mr-2">Holiday Mode Active!</AlertTitle>
        <AlertDescription className="text-base">
          We're currently on holiday. {returnDateMessage} Thank you for your understanding!
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default HolidayModeBanner;
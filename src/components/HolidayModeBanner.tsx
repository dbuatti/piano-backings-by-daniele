"use client";

import React, { useState, useEffect } from 'react';
import { useHolidayMode } from '@/hooks/useHolidayMode';
import { Plane, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const HolidayModeBanner: React.FC = () => {
  const { isHolidayModeActive, holidayReturnDate, isLoading, error } = useHolidayMode();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal state if holiday mode changes (e.g., turns off and then back on)
  useEffect(() => {
    if (isHolidayModeActive) {
      setIsDismissed(false);
    }
  }, [isHolidayModeActive]);

  // Render nothing while loading, or if not active/dismissed
  if (isLoading || !isHolidayModeActive || isDismissed) {
    return null;
  }

  if (error) {
    console.error("Failed to load holiday mode settings for banner:", error);
    return null; // Or a subtle error message if preferred
  }

  const returnDateMessage = holidayReturnDate
    ? `I'll be back on ${format(holidayReturnDate, 'MMMM d, yyyy')} to continue tracks.`
    : `I'll be back soon to continue tracks.`;

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <Card className="bg-white p-8 rounded-lg shadow-xl text-center max-w-2xl w-full relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 text-gray-500 hover:bg-gray-100"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Dismiss</span>
        </Button>

        <div className="flex flex-col items-center justify-center p-0">
          <Plane className="h-12 w-12 md:h-16 md:w-16 mb-4 text-[#F538BC] flex-shrink-0" />
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-wide mb-3 text-[#1C0357]">Daniele is on Holiday!</h2>
          <p className="text-lg md:text-xl font-medium tracking-wide text-gray-700">
            I'm currently taking a break. {returnDateMessage} Thank you for your understanding!
          </p>
        </div>
        <CardContent className="mt-6 p-0">
          <Button 
            onClick={() => setIsDismissed(true)}
            className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-8 py-3"
          >
            Got It!
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HolidayModeBanner;
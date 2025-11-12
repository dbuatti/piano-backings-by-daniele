import React, { useState, useEffect } from 'react';
import { useHolidayMode } from '@/hooks/useHolidayMode';
import { X, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const HolidayModeBanner: React.FC = () => {
  const { isHolidayModeActive, holidayModeReturnDate, isLoading } = useHolidayMode(); // Corrected destructuring
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check local storage for dismissal status
    const dismissed = localStorage.getItem('holidayModeDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('holidayModeDismissed', 'true');
  };

  if (isLoading || !isHolidayModeActive || isDismissed) {
    return null;
  }

  return (
    <Card className="fixed top-16 left-0 right-0 z-50 bg-yellow-100 border-b border-yellow-300 text-yellow-800 p-3 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <Plane className="h-5 w-5 mr-3 text-yellow-600" />
        <p className="text-sm font-medium">
          Holiday Mode Active! New requests are temporarily paused.
          {holidayModeReturnDate && (
            <span className="ml-1">We expect to return by <span className="font-bold">{format(holidayModeReturnDate, 'PPP')}</span>.</span>
          )}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-yellow-700 hover:bg-yellow-200">
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </Card>
  );
};

export default HolidayModeBanner;
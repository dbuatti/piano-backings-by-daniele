import React from 'react';
import { useHolidayMode } from '@/hooks/useHolidayMode';
import { Plane, X } from 'lucide-react'; // Removed Loader2
import { format } from 'date-fns';
// import { cn } from '@/lib/utils'; // Removed as it was unused
import { Button } from '@/components/ui/button';

const HolidayModeBanner: React.FC = () => {
  const { isHolidayModeActive, holidayReturnDate, isLoading } = useHolidayMode();
  const [isVisible, setIsVisible] = React.useState(true);

  if (isLoading || !isHolidayModeActive || !isVisible) {
    return null;
  }

  const holidayMessage = holidayReturnDate
    ? `We're on holiday until ${format(holidayReturnDate, 'MMMM d, yyyy')}. New orders will be processed upon our return.`
    : `We're currently on holiday. New orders will be processed upon our return.`;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center text-sm z-50 flex items-center justify-center shadow-md">
      <Plane className="h-5 w-5 mr-2" />
      <span>{holidayMessage}</span>
      <Button
        variant="ghost"
        size="icon"
        className="ml-4 h-6 w-6 text-white hover:bg-white/20"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
};

export default HolidayModeBanner;
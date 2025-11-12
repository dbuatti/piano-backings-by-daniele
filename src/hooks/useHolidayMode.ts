import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { isPast } from 'date-fns';

interface AppSettings {
  id: string; // Added id to the interface
  is_holiday_mode_active: boolean;
  holiday_mode_return_date: string | null;
}

export const useHolidayMode = () => {
  const [isHolidayModeActive, setIsHolidayModeActive] = useState(false);
  const [holidayModeReturnDate, setHolidayModeReturnDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('id, is_holiday_mode_active, holiday_mode_return_date') // Select id as well
        .single();

      if (error) {
        console.error('Error fetching holiday mode settings:', error);
        showError(`Error fetching holiday mode settings: ${error.message}`);
        setIsLoading(false);
        return;
      }

      if (data) {
        let active = data.is_holiday_mode_active;
        let returnDate: Date | null = null;

        if (data.holiday_mode_return_date) {
          returnDate = new Date(data.holiday_mode_return_date);
          // If holiday mode is active but the return date is in the past, deactivate it
          if (active && isPast(returnDate)) {
            active = false;
            // Optionally, update Supabase to reflect this change
            await supabase
              .from('app_settings')
              .update({ is_holiday_mode_active: false })
              .eq('id', data.id); // 'id' now exists on data
          }
        }
        setIsHolidayModeActive(active);
        setHolidayModeReturnDate(returnDate);
      }
      setIsLoading(false);
    };

    fetchSettings();

    // Set up real-time listener for app_settings changes
    const channel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        (payload) => {
          const newSettings = payload.new as AppSettings;
          let active = newSettings.is_holiday_mode_active;
          let returnDate: Date | null = null;

          if (newSettings.holiday_mode_return_date) {
            returnDate = new Date(newSettings.holiday_mode_return_date);
            if (active && isPast(returnDate)) {
              active = false;
            }
          }
          setIsHolidayModeActive(active);
          setHolidayModeReturnDate(returnDate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isHolidayModeActive, holidayModeReturnDate, isLoading };
};
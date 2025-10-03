"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isPast } from 'date-fns';

interface AppSettings {
  id: string;
  is_holiday_mode_active: boolean;
  holiday_mode_return_date: string | null;
}

interface HolidayModeState {
  isHolidayModeActive: boolean;
  holidayReturnDate: Date | null;
  isLoading: boolean;
  error: any;
}

export const useHolidayMode = (): HolidayModeState => {
  const { toast } = useToast();
  const [isHolidayModeActive, setIsHolidayModeActive] = useState(false);
  const [holidayReturnDate, setHolidayReturnDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchHolidaySettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('id, is_holiday_mode_active, holiday_mode_return_date') // Select 'id' explicitly
        .single<AppSettings>(); // Cast to AppSettings for type safety

      if (error) throw error;

      let active = data.is_holiday_mode_active;
      let returnDate: Date | null = null;

      if (data.holiday_mode_return_date) {
        const parsedDate = new Date(data.holiday_mode_return_date);
        if (!isNaN(parsedDate.getTime())) {
          returnDate = parsedDate;
          // If holiday mode is active but the return date is in the past, deactivate it
          if (active && isPast(returnDate)) {
            active = false;
            // Optionally, update the database to reflect this change
            await supabase
              .from('app_settings')
              .update({ is_holiday_mode_active: false })
              .eq('id', data.id); 
          }
        }
      }

      setIsHolidayModeActive(active);
      setHolidayReturnDate(returnDate);
    } catch (err: any) {
      console.error('Error fetching holiday settings:', err);
      setError(err);
      // Don't show toast for public users, only log
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidaySettings();

    // Set up real-time subscription for changes to app_settings
    const channel = supabase
      .channel('holiday_mode_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        (payload) => {
          console.log('Realtime update for app_settings:', payload);
          // Refetch settings to ensure we have the latest state
          fetchHolidaySettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHolidaySettings]);

  return { isHolidayModeActive, holidayReturnDate, isLoading, error };
};
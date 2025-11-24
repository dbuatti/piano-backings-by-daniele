"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isPast } from 'date-fns';

interface AppSettings {
  id: string;
  is_holiday_mode_active: boolean;
  holiday_mode_return_date: string | null;
  is_service_closed: boolean;
  service_closure_reason: string | null;
}

interface AppSettingsState {
  isHolidayModeActive: boolean;
  holidayReturnDate: Date | null;
  isServiceClosed: boolean;
  closureReason: string | null;
  isLoading: boolean;
  error: any;
}

export const useAppSettings = (): AppSettingsState => {
  const { toast } = useToast();
  const [state, setState] = useState<AppSettingsState>({
    isHolidayModeActive: false,
    holidayReturnDate: null,
    isServiceClosed: false,
    closureReason: null,
    isLoading: true,
    error: null,
  });

  const fetchSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('id, is_holiday_mode_active, holiday_mode_return_date, is_service_closed, service_closure_reason')
        .single<AppSettings>();

      if (error) throw error;

      let activeHoliday = data.is_holiday_mode_active;
      let returnDate: Date | null = null;

      if (data.holiday_mode_return_date) {
        const parsedDate = new Date(data.holiday_mode_return_date);
        if (!isNaN(parsedDate.getTime())) {
          returnDate = parsedDate;
          // If holiday mode is active but the return date is in the past, deactivate it
          if (activeHoliday && isPast(returnDate)) {
            activeHoliday = false;
            // Optionally, update the database to reflect this change
            await supabase
              .from('app_settings')
              .update({ is_holiday_mode_active: false })
              .eq('id', data.id); 
          }
        }
      }

      setState({
        isHolidayModeActive: activeHoliday,
        holidayReturnDate: returnDate,
        isServiceClosed: data.is_service_closed,
        closureReason: data.service_closure_reason,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Error fetching app settings:', err);
      setState(prev => ({ ...prev, isLoading: false, error: err }));
      // Don't show toast for public users, only log
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Set up real-time subscription for changes to app_settings
    const channel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        (payload) => {
          console.log('Realtime update for app_settings:', payload);
          // Refetch settings to ensure we have the latest state
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return state;
};
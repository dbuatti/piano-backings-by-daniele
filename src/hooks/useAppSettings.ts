"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isPast, parseISO } from 'date-fns';

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
  error: unknown;
}

export const useAppSettings = (): AppSettingsState => {
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
        // parseISO reads a plain 'yyyy-MM-dd' as local midnight; new Date() would read it
        // as UTC and show the previous day for visitors west of UTC.
        const parsedDate = parseISO(data.holiday_mode_return_date);
        if (!isNaN(parsedDate.getTime())) {
          returnDate = parsedDate;
          // If holiday mode is active but the return date is in the past, treat it as inactive in the UI
          // We don't update the DB here to avoid a real-time loop
          if (activeHoliday && isPast(returnDate)) {
            activeHoliday = false;
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
    } catch (err: unknown) {
      console.error('Error fetching app settings:', err);
      setState(prev => ({ ...prev, isLoading: false, error: err }));
    }
  }, []);

  const channelNameRef = useRef(`app_settings_changes_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    fetchSettings();

    // Unique per hook instance — this hook is mounted concurrently by multiple
    // components (e.g. HolidayModeBanner and FormPage), and newer supabase-js
    // throws if two channels share a name and .on() is called after either subscribes.
    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        (payload) => {
          console.log('Realtime update for app_settings:', payload);
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
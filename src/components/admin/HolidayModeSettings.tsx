"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Plane, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from "@/utils/toast"; // Updated import
import ErrorDisplay from '@/components/ErrorDisplay';

interface AppSettings {
  id: string;
  is_holiday_mode_active: boolean;
  holiday_mode_return_date: string | null;
}

const HolidayModeSettings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching app settings:', err);
      setError(err);
      showError(`Failed to fetch app settings: ${err.message}`); // Updated toast call
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedFields: Partial<AppSettings>) => {
    if (!settings) return;

    setIsUpdating(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update(updatedFields)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev!, ...updatedFields }));
      showSuccess("Holiday mode settings saved successfully."); // Updated toast call
    } catch (err: any) {
      console.error('Error updating app settings:', err);
      setError(err);
      showError(`Failed to update settings: ${err.message}`); // Updated toast call
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleHolidayMode = (checked: boolean) => {
    updateSettings({ is_holiday_mode_active: checked });
  };

  const handleDateSelect = (date: Date | undefined) => {
    updateSettings({ holiday_mode_return_date: date ? format(date, 'yyyy-MM-dd') : null });
  };

  if (loading) {
    return (
      <Card className="shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <Plane className="mr-2 h-5 w-5" />
            Holiday Mode Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
          <p className="ml-3 text-gray-600">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <Plane className="mr-2 h-5 w-5" />
            Holiday Mode Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorDisplay error={error} title="Failed to Load Holiday Settings" />
          <Button onClick={fetchSettings} className="mt-4">Retry Load</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center">
          <Plane className="mr-2 h-5 w-5" />
          Holiday Mode Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-6">
          Toggle holiday mode to inform users you're away and set a return date.
          When active, users will see a prominent banner and won't be able to submit new requests.
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-md bg-gray-50">
            <Label htmlFor="holiday-mode-switch" className="text-base font-medium flex items-center">
              <Plane className="mr-2 h-5 w-5 text-[#1C0357]" />
              Activate Holiday Mode
            </Label>
            <Switch
              id="holiday-mode-switch"
              checked={settings?.is_holiday_mode_active || false}
              onCheckedChange={handleToggleHolidayMode}
              disabled={isUpdating}
            />
          </div>

          <div className="p-4 border rounded-md bg-gray-50">
            <Label htmlFor="return-date" className="text-base font-medium flex items-center mb-3">
              <CalendarIcon className="mr-2 h-5 w-5 text-[#1C0357]" />
              Expected Return Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !settings?.holiday_mode_return_date && "text-muted-foreground"
                  )}
                  disabled={isUpdating}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {settings?.holiday_mode_return_date ? (
                    format(new Date(settings.holiday_mode_return_date), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={settings?.holiday_mode_return_date ? new Date(settings.holiday_mode_return_date) : undefined}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500 mt-2">
              This date will be displayed to users when holiday mode is active.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HolidayModeSettings;
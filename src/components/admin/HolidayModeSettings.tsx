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
import { useToast } from '@/hooks/use-toast';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useAppSettings } from '@/hooks/useAppSettings'; // Updated import

interface AppSettings {
  id: string;
  is_holiday_mode_active: boolean;
  holiday_mode_return_date: string | null;
}

const HolidayModeSettings: React.FC = () => {
  const { toast } = useToast();
  const { 
    isHolidayModeActive: initialIsActive, 
    holidayReturnDate: initialReturnDate, 
    isLoading, 
    error: fetchError 
  } = useAppSettings(); // Use the new hook

  const [isActive, setIsActive] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<any>(null);

  // Sync local state with hook state once loaded
  useEffect(() => {
    if (!isLoading && !fetchError) {
      setIsActive(initialIsActive);
      setReturnDate(initialReturnDate || undefined);
    }
  }, [isLoading, fetchError, initialIsActive, initialReturnDate]);

  const updateSettings = async (updatedFields: Partial<AppSettings>) => {
    setIsUpdating(true);
    setError(null);
    try {
      // Fetch the single settings record ID
      const { data: currentSettings, error: fetchIdError } = await supabase
        .from('app_settings')
        .select('id')
        .single();

      if (fetchIdError) throw fetchIdError;

      const { error: updateError } = await supabase
        .from('app_settings')
        .update(updatedFields)
        .eq('id', currentSettings.id);

      if (updateError) throw updateError;

      // Manually update local state to reflect change immediately
      if (updatedFields.is_holiday_mode_active !== undefined) {
        setIsActive(updatedFields.is_holiday_mode_active);
      }
      if (updatedFields.holiday_mode_return_date !== undefined) {
        setReturnDate(updatedFields.holiday_mode_return_date ? new Date(updatedFields.holiday_mode_return_date) : undefined);
      }

      toast({
        title: "Settings Updated",
        description: "Holiday mode settings saved successfully.",
      });
    } catch (err: any) {
      console.error('Error updating app settings:', err);
      setError(err);
      toast({
        title: "Error",
        description: `Failed to update settings: ${err.message}`,
        variant: "destructive",
      });
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

  if (isLoading) {
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

  if (fetchError) {
    return (
      <Card className="shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <Plane className="mr-2 h-5 w-5" />
            Holiday Mode Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorDisplay error={fetchError} title="Failed to Load Holiday Settings" />
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
              checked={isActive}
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
                    !returnDate && "text-muted-foreground"
                  )}
                  disabled={isUpdating}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? (
                    format(returnDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={returnDate}
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
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, XCircle, Save, CheckCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useAppSettings } from '@/hooks/useAppSettings';

const ServiceClosureSettings: React.FC = () => {
  const { toast } = useToast();
  const { isServiceClosed: initialIsClosed, closureReason: initialReason, isLoading, error: fetchError } = useAppSettings();
  
  const [isClosed, setIsClosed] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<any>(null);

  // Sync local state with hook state once loaded
  useEffect(() => {
    if (!isLoading && !fetchError) {
      setIsClosed(initialIsClosed);
      setClosureReason(initialReason || '');
    }
  }, [isLoading, fetchError, initialIsClosed, initialReason]);

  const handleUpdateSettings = async () => {
    setIsUpdating(true);
    setError(null);
    
    if (isClosed && !closureReason.trim()) {
      setError(new Error('Closure reason is required when service closure is active.'));
      setIsUpdating(false);
      return;
    }

    try {
      // Fetch the single settings record ID
      const { data: currentSettings, error: fetchIdError } = await supabase
        .from('app_settings')
        .select('id')
        .single();

      if (fetchIdError) throw fetchIdError;

      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ 
          is_service_closed: isClosed,
          service_closure_reason: isClosed ? closureReason.trim() : null,
        })
        .eq('id', currentSettings.id);

      if (updateError) throw updateError;

      toast({
        title: "Settings Updated",
        description: "Service closure settings saved successfully.",
      });
    } catch (err: any) {
      console.error('Error updating service closure settings:', err);
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

  if (isLoading) {
    return (
      <Card className="shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Service Closure Mode
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
            <AlertTriangle className="mr-2 h-5 w-5" />
            Service Closure Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorDisplay error={fetchError} title="Failed to Load Service Settings" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Service Closure Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-6">
          Use this mode to temporarily stop accepting new custom requests, for example, when fulfilling a large project. This will hide the submission form entirely.
        </p>

        {error && (
          <div className="mb-4">
            <ErrorDisplay error={error} title="Configuration Error" />
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-md"
            style={{ backgroundColor: isClosed ? '#fee2e2' : '#f0fdf4', borderColor: isClosed ? '#fca5a5' : '#86efac' }}
          >
            <Label htmlFor="service-closure-switch" className="text-base font-medium flex items-center">
              {isClosed ? <XCircle className="mr-2 h-5 w-5 text-red-600" /> : <CheckCircle className="mr-2 h-5 w-5 text-green-600" />}
              Service Closure Active
            </Label>
            <Switch
              id="service-closure-switch"
              checked={isClosed}
              onCheckedChange={setIsClosed}
              disabled={isUpdating}
            />
          </div>

          <div className="p-4 border rounded-md bg-gray-50">
            <Label htmlFor="closure-reason" className="text-base font-medium flex items-center mb-3">
              Closure Reason / Message
            </Label>
            <Textarea
              id="closure-reason"
              value={closureReason}
              onChange={(e) => { setClosureReason(e.target.value); setError(null); }}
              placeholder="e.g., We are currently fulfilling a large project and cannot take new custom requests until [Date]."
              rows={4}
              disabled={isUpdating}
            />
            <p className="text-xs text-gray-500 mt-2">
              This message will be displayed prominently on the request form page when closure mode is active.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleUpdateSettings}
            disabled={isUpdating}
            className="bg-[#1C0357] hover:bg-[#1C0357]/90"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Service Status
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceClosureSettings;
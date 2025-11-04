import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadPlatformsDialogProps {
  requestId: string;
  isOpen: boolean; // Added prop
  onOpenChange: (isOpen: boolean) => void; // Changed from onClose
}

interface UploadedPlatforms {
  youtube: boolean;
  tiktok: boolean;
  facebook: boolean;
  instagram: boolean;
  gumroad: boolean;
}

const UploadPlatformsDialog: React.FC<UploadPlatformsDialogProps> = ({ requestId, isOpen, onOpenChange }) => {
  const [platforms, setPlatforms] = useState<UploadedPlatforms>({
    youtube: false,
    tiktok: false,
    facebook: false,
    instagram: false,
    gumroad: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return; // Only fetch when dialog is open

    const fetchPlatforms = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('backing_requests')
        .select('uploaded_platforms')
        .eq('id', requestId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: `Failed to fetch platforms: ${error.message}`,
          variant: "destructive",
        });
        onOpenChange(false); // Close dialog on error
        return;
      }

      if (data?.uploaded_platforms) {
        let fetchedPlatforms: UploadedPlatforms;
        if (typeof data.uploaded_platforms === 'string') {
          try {
            fetchedPlatforms = JSON.parse(data.uploaded_platforms);
          } catch (e) {
            console.error("Failed to parse uploaded_platforms string:", e);
            fetchedPlatforms = { youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false };
          }
        } else {
          fetchedPlatforms = data.uploaded_platforms as UploadedPlatforms;
        }
        setPlatforms(prev => ({ ...prev, ...fetchedPlatforms }));
      } else {
        // If no platforms are set, ensure all are false
        setPlatforms({ youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false });
      }
      setIsLoading(false);
    };

    fetchPlatforms();
  }, [requestId, isOpen, onOpenChange, toast]); // Depend on isOpen to re-fetch when it changes

  const handleCheckboxChange = (platform: keyof UploadedPlatforms, checked: boolean) => {
    setPlatforms(prev => ({ ...prev, [platform]: checked }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ uploaded_platforms: platforms })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Platforms Updated",
        description: "Uploaded platforms have been updated successfully.",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving platforms:", error);
      toast({
        title: "Error",
        description: `Failed to save platforms: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2">Loading platforms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Update platforms for request ID: <span className="font-medium">{requestId.substring(0, 8)}</span></p>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(platforms).map(([platformName, isChecked]) => (
          <div key={platformName} className="flex items-center space-x-2">
            <Checkbox
              id={platformName}
              checked={isChecked}
              onCheckedChange={(checked) => handleCheckboxChange(platformName as keyof UploadedPlatforms, checked as boolean)}
            />
            <Label htmlFor={platformName} className="capitalize">{platformName}</Label>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
};

export default UploadPlatformsDialog;
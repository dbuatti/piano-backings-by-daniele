import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToSupabase } from '@/utils/supabase-client';
import { supabase } from '@/integrations/supabase/client';

interface UploadTrackDialogProps {
  requestId: string;
  isOpen: boolean; // Added prop
  onOpenChange: (isOpen: boolean) => void; // Changed from onClose
}

const UploadTrackDialog: React.FC<UploadTrackDialogProps> = ({ requestId, isOpen, onOpenChange }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setCaption('');
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setCaption(event.target.files[0].name); // Pre-fill caption with file name
    } else {
      setSelectedFile(null);
      setCaption('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an audio file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: uploadData, error: uploadError } = await uploadFileToSupabase(selectedFile, `tracks/${requestId}/`);
      if (uploadError) throw uploadError;

      const newTrackUrl = uploadData?.path;
      if (!newTrackUrl) throw new Error("Failed to get uploaded file path.");

      // Fetch existing track_urls
      const { data: existingRequest, error: fetchError } = await supabase
        .from('backing_requests')
        .select('track_urls')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const currentTrackUrls = existingRequest?.track_urls || [];
      const updatedTrackUrls = [...currentTrackUrls, { url: newTrackUrl, caption: caption || selectedFile.name }];

      // Update the backing_request with the new track_urls array
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: "Upload Successful",
        description: `${selectedFile.name} has been uploaded and linked to request ${requestId}.`,
      });
      onOpenChange(false); // Close dialog and trigger refresh in parent
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: `Could not upload ${selectedFile.name}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Uploading track for request ID: <span className="font-medium">{requestId.substring(0, 8)}</span></p>
      <div>
        <Label htmlFor="track-file">Select Audio File</Label>
        <Input id="track-file" type="file" accept="audio/*" onChange={handleFileChange} />
      </div>
      <div>
        <Label htmlFor="caption">Track Caption (optional)</Label>
        <Input id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g., Final Mix, Version 2" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancel</Button>
        <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload Track"
          )}
        </Button>
      </div>
    </div>
  );
};

export default UploadTrackDialog;
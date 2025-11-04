import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToSupabase } from '@/utils/supabase-client';
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo
import { UploadedPlatforms } from '@/components/admin/UploadPlatformsDialog'; // Import UploadedPlatforms

// Define BackingRequest interface if not globally available
interface BackingRequest {
  id: string;
  track_urls?: TrackInfo[];
  uploaded_platforms?: string | UploadedPlatforms;
  // Add other properties as needed by the hook's logic
}

export const useUploadDialogs = (
  requests: BackingRequest[],
  setRequests: React.Dispatch<React.SetStateAction<BackingRequest[]>>
) => {
  const { toast } = useToast();

  const [uploadTrackId, setUploadTrackId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false); // State for upload progress

  const [uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen] = useState(false);
  const [selectedRequestForPlatforms, setSelectedRequestForPlatforms] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<UploadedPlatforms>({
    youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false,
  });

  const handleFileChange = useCallback((file: File | null) => {
    setUploadFile(file);
    setUploadCaption(file ? file.name : '');
  }, []);

  const handleUploadTrack = useCallback((id: string) => {
    setUploadTrackId(id);
    setUploadFile(null); // Reset file for new upload
    setUploadCaption(''); // Reset caption
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!uploadTrackId || !uploadFile) {
      toast({
        title: "Error",
        description: "No request selected or no file chosen for upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: uploadData, error: uploadError } = await uploadFileToSupabase(uploadFile, `tracks/${uploadTrackId}/`);
      if (uploadError) throw uploadError;

      const newTrackUrl = uploadData?.path;
      if (!newTrackUrl) throw new Error("Failed to get uploaded file path.");

      const { data: existingRequest, error: fetchError } = await supabase
        .from('backing_requests')
        .select('track_urls')
        .eq('id', uploadTrackId)
        .single();

      if (fetchError) throw fetchError;

      const currentTrackUrls = existingRequest?.track_urls || [];
      const updatedTrackUrls = [...currentTrackUrls, { url: newTrackUrl, caption: uploadCaption || uploadFile.name }];

      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', uploadTrackId);

      if (updateError) throw updateError;

      setRequests(prev => prev.map(req =>
        req.id === uploadTrackId ? { ...req, track_urls: updatedTrackUrls } : req
      ));

      toast({
        title: "Upload Successful",
        description: `${uploadFile.name} has been uploaded and linked to request ${uploadTrackId}.`,
      });
      setUploadTrackId(null); // Close dialog
      setUploadFile(null);
      setUploadCaption('');
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: `Could not upload ${uploadFile.name}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [uploadTrackId, uploadFile, uploadCaption, setRequests, toast]);

  const handleDirectFileUpload = useCallback(async (requestId: string, file: File) => {
    // This function is passed directly to RequestsTable, so its logic is self-contained there.
    // This placeholder is just to satisfy the hook's return type.
    console.log('Direct file upload handled by RequestsTable parent logic.');
  }, []);

  const openUploadPlatformsDialog = useCallback((id: string) => {
    setSelectedRequestForPlatforms(id);
    setUploadPlatformsDialogOpen(true);
  }, []);

  const saveUploadPlatforms = useCallback(async () => {
    if (!selectedRequestForPlatforms) return;

    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ uploaded_platforms: platforms })
        .eq('id', selectedRequestForPlatforms);

      if (error) throw error;

      setRequests(prev => prev.map(req =>
        req.id === selectedRequestForPlatforms ? { ...req, uploaded_platforms: platforms } : req
      ));

      toast({
        title: "Platforms Updated",
        description: "Uploaded platforms have been updated successfully.",
      });
      setUploadPlatformsDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving platforms:", error);
      toast({
        title: "Error",
        description: `Failed to save platforms: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [selectedRequestForPlatforms, platforms, setRequests, toast]);

  const updateTrackCaption = useCallback(async (requestId: string, trackUrl: string, newCaption: string) => {
    const request = requests.find(req => req.id === requestId);
    if (!request || !request.track_urls) return false;

    const updatedTrackUrls = request.track_urls.map(track =>
      track.url === trackUrl ? { ...track, caption: newCaption } : track
    );

    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, track_urls: updatedTrackUrls } : req
      ));

      toast({
        title: "Caption Updated",
        description: "Track caption updated successfully.",
      });
      return true;
    } catch (error: any) {
      console.error("Error updating caption:", error);
      toast({
        title: "Error",
        description: `Failed to update caption: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  }, [requests, setRequests, toast]);

  return {
    uploadTrackId, setUploadTrackId,
    uploadFile, handleFileChange,
    uploadCaption, setUploadCaption,
    isUploading,
    uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen,
    selectedRequestForPlatforms, setSelectedRequestForPlatforms,
    platforms, setPlatforms,
    handleUploadTrack,
    handleFileUpload,
    handleDirectFileUpload,
    openUploadPlatformsDialog,
    saveUploadPlatforms,
    updateTrackCaption,
  };
};
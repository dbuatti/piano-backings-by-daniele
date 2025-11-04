import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined; // Updated to be more robust
}

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string | string[];
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: TrackInfo[]; // Changed to array of TrackInfo objects
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number; // Assuming cost might be stored or calculated
  // Add other fields as necessary
}

interface UploadPlatformsState {
  youtube: boolean;
  tiktok: boolean;
  facebook: boolean;
  instagram: boolean;
  gumroad: boolean;
}

export const useUploadDialogs = (requests: BackingRequest[], setRequests: React.Dispatch<React.SetStateAction<BackingRequest[]>>) => {
  const [uploadTrackId, setUploadTrackId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen] = useState(false);
  const [selectedRequestForPlatforms, setSelectedRequestForPlatforms] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<UploadPlatformsState>({
    youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false
  });
  const { toast } = useToast();

  // Core upload logic, now reusable for both dialog and direct upload
  const performUpload = async (id: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const originalFileName = file.name; // Capture the original file name here
      const uniqueFileName = `tracks/${id}-${Date.now()}.${fileExt}`; // Unique file name for storage
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('tracks')
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('tracks')
        .getPublicUrl(uniqueFileName);
      
      // Fetch current request to get existing track_urls
      const { data: currentRequest, error: fetchError } = await supabase
        .from('backing_requests')
        .select('track_urls')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current track URLs: ${fetchError.message}`);
      }

      const existingTrackUrls: TrackInfo[] = currentRequest?.track_urls || [];
      const newTrackInfo: TrackInfo = { url: publicUrl, caption: originalFileName }; // Use originalFileName for caption
      const newTrackUrls = [...existingTrackUrls, newTrackInfo]; // Append new TrackInfo object

      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ 
          track_urls: newTrackUrls, // Update with the array of TrackInfo
          status: 'completed' // Mark as completed after upload
        })
        .eq('id', id);
      
      if (updateError) {
        throw updateError;
      }
      
      setRequests(prev => prev.map(req => 
        req.id === id ? { 
          ...req, 
          track_urls: newTrackUrls, // Update with the new array
          status: 'completed'
        } : req
      ));
      
      toast({
        title: "Track Uploaded",
        description: "Track has been uploaded successfully and marked as completed.",
      });
      return true; // Indicate success
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to upload track: ${error.message}. Please check your permissions and try again.`,
        variant: "destructive",
      });
      return false; // Indicate failure
    }
  };

  const updateTrackCaption = async (requestId: string, trackUrl: string, newCaption: string) => {
    try {
      const requestToUpdate = requests.find(req => req.id === requestId);
      if (!requestToUpdate) throw new Error('Request not found');

      const updatedTrackUrls = requestToUpdate.track_urls?.map(track =>
        track.url === trackUrl ? { ...track, caption: newCaption } : track
      ) || [];

      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', requestId);

      if (updateError) throw updateError;

      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, track_urls: updatedTrackUrls } : req
      ));

      toast({
        title: "Caption Updated",
        description: "Track caption saved successfully.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update caption: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleUploadTrack = (id: string) => {
    setUploadTrackId(id);
  };

  const handleFileChange = (file: File | null) => {
    setUploadFile(file);
  };

  // Function for dialog upload
  const handleFileUpload = async () => {
    if (!uploadTrackId || !uploadFile) return;
    const success = await performUpload(uploadTrackId, uploadFile);
    if (success) {
      setUploadTrackId(null);
      setUploadFile(null);
    }
  };

  // Function for direct drag-and-drop upload
  const handleDirectFileUpload = async (id: string, file: File) => {
    await performUpload(id, file);
  };

  const openUploadPlatformsDialog = (id: string) => {
    const request = requests.find(req => req.id === id);
    if (request && request.uploaded_platforms) {
      if (typeof request.uploaded_platforms === 'string') {
        try {
          setPlatforms(JSON.parse(request.uploaded_platforms));
        } catch (e) {
          setPlatforms({
            youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false
          });
        }
      } else {
        setPlatforms(request.uploaded_platforms as UploadPlatformsState);
      }
    } else {
      setPlatforms({
        youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false
      });
    }
    setSelectedRequestForPlatforms(id);
    setUploadPlatformsDialogOpen(true);
  };

  const saveUploadPlatforms = async () => {
    if (!selectedRequestForPlatforms) return;
    
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ uploaded_platforms: JSON.stringify(platforms) })
        .eq('id', selectedRequestForPlatforms);
      
      if (error) throw error;
      
      setRequests(prev => prev.map(req => 
        req.id === selectedRequestForPlatforms ? { ...req, uploaded_platforms: JSON.stringify(platforms) } : req
      ));
      
      toast({
        title: "Platforms Updated",
        description: "Upload platforms have been updated successfully.",
      });
      
      setUploadPlatformsDialogOpen(false);
      setSelectedRequestForPlatforms(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update platforms: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return {
    uploadTrackId, setUploadTrackId,
    uploadFile, handleFileChange,
    uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen,
    selectedRequestForPlatforms, setSelectedRequestForPlatforms,
    platforms, setPlatforms,
    handleUploadTrack,
    handleFileUpload,
    handleDirectFileUpload, // Expose the new direct upload handler
    openUploadPlatformsDialog,
    saveUploadPlatforms,
    updateTrackCaption, // Expose new function
  };
};
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  track_url?: string;
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number;
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
      const fileName = `tracks/${id}.${fileExt}`; // Use the request ID as part of the file name
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('tracks')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('tracks')
        .getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ 
          track_url: publicUrl,
          status: 'completed'
        })
        .eq('id', id);
      
      if (updateError) {
        throw updateError;
      }
      
      setRequests(prev => prev.map(req => 
        req.id === id ? { 
          ...req, 
          track_url: publicUrl,
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
  };
};
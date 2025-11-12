import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { uploadFileToSupabase } from '@/utils/supabase-client';

export const useUploadDialogs = () => {
  const [uploadTrackDialogOpen, setUploadTrackDialogOpen] = useState(false);
  const [uploadTrackId, setUploadTrackId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const openUploadTrackDialog = (requestId: string) => {
    setUploadTrackId(requestId);
    setUploadTrackDialogOpen(true);
  };

  const closeUploadTrackDialog = () => {
    setUploadTrackDialogOpen(false);
    setUploadTrackId('');
    setUploadFile(null);
    setUploadCaption('');
  };

  const handleFileChange = (file: File | null) => {
    setUploadFile(file);
    if (file) {
      setUploadCaption(file.name); // Pre-fill caption with file name
    } else {
      setUploadCaption('');
    }
  };

  const handleUpload = async (onSuccessCallback: (url: string, caption: string) => void) => {
    if (!uploadFile) {
      showError("Please select a file to upload.");
      return;
    }
    setIsUploading(true);
    try {
      const { data: { publicUrl }, error } = await uploadFileToSupabase(uploadFile, 'backing-tracks', `requests/${uploadTrackId}`);
      if (error) throw error;
      onSuccessCallback(publicUrl, uploadCaption);
      showSuccess("Track uploaded successfully!");
      closeUploadTrackDialog();
    } catch (error: any) {
      console.error("Error uploading track:", error);
      showError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadTrackDialogOpen,
    uploadTrackId,
    uploadFile,
    uploadCaption,
    isUploading,
    openUploadTrackDialog,
    closeUploadTrackDialog,
    handleFileChange,
    handleUpload,
    setUploadCaption,
  };
};
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Edit, UploadCloud } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { uploadFileToSupabase } from '@/utils/supabase-client';
import { supabase } from '@/integrations/supabase/client';

interface UploadTrackDialogProps {
  requestId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTrackUploaded: (url: string, caption: string) => void;
  existingTracks: { url: string; caption: string }[];
}

const UploadTrackDialog: React.FC<UploadTrackDialogProps> = ({
  requestId,
  isOpen,
  onOpenChange,
  onTrackUploaded,
  existingTracks,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingTrackIndex, setEditingTrackIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCaption('');
      setEditingTrackIndex(null);
      setEditingCaption('');
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setCaption(selectedFile.name); // Pre-fill caption with file name
    } else {
      setFile(null);
      setCaption('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showError("Please select a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const { data: { publicUrl }, error } = await uploadFileToSupabase(file, 'backing-tracks', `requests/${requestId}`);
      if (error) throw error;
      onTrackUploaded(publicUrl, caption);
      showSuccess("Track uploaded successfully!");
      setFile(null);
      setCaption('');
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error uploading track:", error);
      showError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEditCaption = (index: number) => {
    setEditingTrackIndex(index);
    setEditingCaption(existingTracks[index].caption);
  };

  const handleSaveCaption = async (index: number) => {
    if (editingTrackIndex === null) return;

    const updatedTracks = [...existingTracks];
    updatedTracks[index].caption = editingCaption;

    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTracks })
        .eq('id', requestId);

      if (error) throw error;

      showSuccess("Caption updated successfully.");
      onTrackUploaded(updatedTracks[index].url, updatedTracks[index].caption); // Trigger re-fetch in parent
      setEditingTrackIndex(null);
      setEditingCaption('');
    } catch (error: any) {
      console.error("Error updating caption:", error);
      showError(`Failed to update caption: ${error.message}`);
    }
  };

  const handleDeleteTrack = async (index: number) => {
    if (!confirm("Are you sure you want to delete this track? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    const trackToDelete = existingTracks[index];
    const updatedTracks = existingTracks.filter((_, i) => i !== index);

    try {
      // Attempt to delete from Supabase Storage first
      if (trackToDelete.url) {
        const filePath = trackToDelete.url.split('/public/')[1]; // Extract path after /public/
        if (filePath) {
          const { error: deleteStorageError } = await supabase.storage
            .from('backing-tracks')
            .remove([filePath]);

          if (deleteStorageError) {
            console.warn("Failed to delete file from storage (might not exist or path is incorrect):", deleteStorageError.message);
            // Don't throw, proceed with DB update even if storage delete fails
          }
        }
      }

      // Update the database
      const { error } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTracks })
        .eq('id', requestId);

      if (error) throw error;

      showSuccess("File deleted successfully.");
      onTrackUploaded('', ''); // Trigger re-fetch in parent (empty string to signify change)
    } catch (error: any) {
      console.error("Error deleting track:", error);
      showError(`Failed to delete file: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1C0357]">Upload New Track</h3>
      <div className="space-y-2">
        <Label htmlFor="file">Audio File (MP3, WAV, etc.)</Label>
        <Input id="file" type="file" accept="audio/*" onChange={handleFileChange} disabled={uploading} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="caption">Track Caption</Label>
        <Input
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="e.g., Main Mix, Instrumental"
          disabled={uploading}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
        <Button onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      </div>

      {existingTracks && existingTracks.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-[#1C0357] mt-6">Existing Tracks</h3>
          <div className="space-y-3">
            {existingTracks.map((track, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                {editingTrackIndex === index ? (
                  <Input
                    value={editingCaption}
                    onChange={(e) => setEditingCaption(e.target.value)}
                    onBlur={() => handleSaveCaption(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="flex-grow mr-2"
                  />
                ) : (
                  <a href={track.url} target="_blank" rel="noopener noreferrer" className="flex-grow text-sm font-medium text-blue-600 hover:underline truncate mr-2">
                    {track.caption || track.url.split('/').pop()}
                  </a>
                )}
                <div className="flex gap-2">
                  {editingTrackIndex === index ? (
                    <Button size="sm" onClick={() => handleSaveCaption(index)} disabled={isDeleting}>Save</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleEditCaption(index)} disabled={isDeleting}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteTrack(index)} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default UploadTrackDialog;
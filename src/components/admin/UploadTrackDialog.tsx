import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Edit } from 'lucide-react'; // Added Edit and Trash2
import { useToast } from '@/hooks/use-toast';
import { uploadFileToSupabase } from '@/utils/supabase-client';
import { supabase } from '@/integrations/supabase/client';
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo

interface UploadTrackDialogProps {
  requestId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
  uploadCaption: string;
  setUploadCaption: React.Dispatch<React.SetStateAction<string>>;
  onFileUpload: () => Promise<void>;
  existingTrackUrls: TrackInfo[];
  onRemoveTrack: (urlToRemove: string) => Promise<void>;
  onUpdateTrackCaption: (requestId: string, trackUrl: string, newCaption: string) => Promise<boolean>;
}

const UploadTrackDialog: React.FC<UploadTrackDialogProps> = ({ 
  requestId, 
  isOpen, 
  onOpenChange,
  uploadFile,
  onFileChange,
  uploadCaption,
  setUploadCaption,
  onFileUpload,
  existingTrackUrls,
  onRemoveTrack,
  onUpdateTrackCaption,
}) => {
  const [isEditingCaption, setIsEditingCaption] = useState<string | null>(null); // Track which caption is being edited
  const [currentEditCaption, setCurrentEditCaption] = useState<string>(''); // Value of the caption being edited
  const [isUpdatingCaption, setIsUpdatingCaption] = useState(false); // Loading state for caption update

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      // No need to reset selectedFile and caption here, as they are managed by parent
      setIsEditingCaption(null);
      setCurrentEditCaption('');
    }
  }, [isOpen]);

  const handleEditCaptionClick = (track: TrackInfo) => {
    setIsEditingCaption(track.url);
    setCurrentEditCaption(String(track.caption || ''));
  };

  const handleSaveCaption = async (trackUrl: string) => {
    setIsUpdatingCaption(true);
    const success = await onUpdateTrackCaption(requestId, trackUrl, currentEditCaption);
    if (success) {
      setIsEditingCaption(null);
      setCurrentEditCaption('');
    }
    setIsUpdatingCaption(false);
  };

  const handleCancelEditCaption = () => {
    setIsEditingCaption(null);
    setCurrentEditCaption('');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Uploading track for request ID: <span className="font-medium">{requestId.substring(0, 8)}</span></p>
      
      {/* Existing Tracks Section */}
      {existingTrackUrls.length > 0 && (
        <div className="border rounded-md p-3 bg-gray-50">
          <h3 className="font-semibold text-sm mb-2">Existing Tracks:</h3>
          <ul className="space-y-2">
            {existingTrackUrls.map((track, index) => (
              <li key={track.url} className="flex items-center justify-between p-2 border rounded-md bg-white">
                {isEditingCaption === track.url ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <Input
                      value={currentEditCaption}
                      onChange={(e) => setCurrentEditCaption(e.target.value)}
                      className="flex-1"
                      disabled={isUpdatingCaption}
                    />
                    <Button size="sm" onClick={() => handleSaveCaption(track.url)} disabled={isUpdatingCaption}>
                      {isUpdatingCaption ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEditCaption} disabled={isUpdatingCaption}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <a href={track.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline truncate flex-1 mr-2">
                      {track.caption || `Track ${index + 1}`}
                    </a>
                    <div className="flex items-center space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditCaptionClick(track)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onRemoveTrack(track.url)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New Track Upload Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold text-sm mb-2">Upload New Track:</h3>
        <div>
          <Label htmlFor="track-file">Select Audio File</Label>
          <Input id="track-file" type="file" accept="audio/*" onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)} />
        </div>
        <div>
          <Label htmlFor="caption">Track Caption (optional)</Label>
          <Input id="caption" value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} placeholder="e.g., Final Mix, Version 2" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancel</Button>
        <Button onClick={onFileUpload} disabled={!uploadFile || isUploading}>
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
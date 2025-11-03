import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FileInput from '@/components/FileInput';
import { Upload, UploadCloud, FileAudio, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UploadTrackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  uploadTrackId: string | null;
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
  onFileUpload: () => void;
  existingTrackUrls: string[]; // New prop to display existing tracks
  onRemoveTrack: (urlToRemove: string) => void; // New prop for removing tracks
}

const UploadTrackDialog: React.FC<UploadTrackDialogProps> = ({
  isOpen,
  onOpenChange,
  uploadTrackId,
  uploadFile,
  onFileChange,
  onFileUpload,
  existingTrackUrls,
  onRemoveTrack,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Upload Track(s)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {existingTrackUrls && existingTrackUrls.length > 0 && (
            <div className="border rounded-md p-3 bg-gray-50">
              <h3 className="font-semibold text-sm mb-2 flex items-center">
                <FileAudio className="mr-2 h-4 w-4" />
                Uploaded Tracks ({existingTrackUrls.length})
              </h3>
              <ul className="space-y-2">
                {existingTrackUrls.map((url, index) => (
                  <li key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded-md border">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1 mr-2">
                      {url.split('/').pop()} {/* Display just the file name */}
                    </a>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => onRemoveTrack(url)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FileInput
            id="track-file-upload"
            label="Select MP3 File to Upload"
            icon={UploadCloud}
            accept="audio/mp3,audio/mpeg"
            onChange={onFileChange}
            note="Drag and drop your MP3 file here, or click to browse. You can upload multiple tracks per request."
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={onFileUpload}
              disabled={!uploadFile}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90"
            >
              Upload Track
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadTrackDialog;
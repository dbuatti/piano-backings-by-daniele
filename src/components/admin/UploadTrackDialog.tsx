import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FileInput from '@/components/FileInput';
import { Upload, UploadCloud, FileAudio, Trash2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo

// TrackInfo interface is now imported from helpers.ts
// interface TrackInfo {
//   url: string;
//   caption: string | boolean | null | undefined; // Updated to be more robust
// }

interface UploadTrackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  uploadTrackId: string | null;
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
  uploadCaption: string; // New prop for upload caption
  setUploadCaption: (caption: string) => void; // New prop setter for upload caption
  onFileUpload: () => void;
  existingTrackUrls: TrackInfo[]; // Changed to array of TrackInfo objects
  onRemoveTrack: (urlToRemove: string) => void;
  onUpdateTrackCaption: (requestId: string, trackUrl: string, newCaption: string) => void; // New prop
}

const UploadTrackDialog: React.FC<UploadTrackDialogProps> = ({
  isOpen,
  onOpenChange,
  uploadTrackId,
  uploadFile,
  onFileChange,
  uploadCaption, // Destructure new prop
  setUploadCaption, // Destructure new prop
  onFileUpload,
  existingTrackUrls,
  onRemoveTrack,
  onUpdateTrackCaption,
}) => {
  const [editingCaption, setEditingCaption] = useState<{ url: string; caption: string } | null>(null);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingCaption) {
      setEditingCaption({ ...editingCaption, caption: e.target.value });
    }
  };

  const handleSaveCaption = async () => {
    if (uploadTrackId && editingCaption) {
      await onUpdateTrackCaption(uploadTrackId, editingCaption.url, editingCaption.caption);
      setEditingCaption(null); // Exit editing mode
    }
  };

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
                {existingTrackUrls.map((track, index) => (
                  <li key={track.url} className="flex flex-col p-2 rounded-md border bg-white">
                    <div className="flex items-center justify-between text-sm">
                      <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1 mr-2">
                        {String(track.caption || 'Download Track')}
                      </a>
                      <div className="flex items-center space-x-1">
                        {editingCaption?.url === track.url ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-green-600 hover:bg-green-100"
                            onClick={handleSaveCaption}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-500 hover:bg-gray-100"
                            onClick={() => setEditingCaption({ url: track.url, caption: String(track.caption || '') })}
                          >
                            <FileAudio className="h-3 w-3" /> {/* Using FileAudio as an 'edit' icon for now */}
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => onRemoveTrack(track.url)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {editingCaption?.url === track.url && (
                      <div className="mt-2">
                        <Label htmlFor={`caption-${index}`} className="sr-only">Edit Caption</Label>
                        <Input
                          id={`caption-${index}`}
                          value={editingCaption?.caption || ''} // Defensive check added here
                          onChange={handleCaptionChange}
                          onBlur={handleSaveCaption} // Save on blur
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCaption(); }} // Save on Enter
                          placeholder="Enter track caption"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
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

          {uploadFile && (
            <div>
              <Label htmlFor="upload-caption">Track Caption (for download filename)</Label>
              <Input
                id="upload-caption"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="e.g., Defying Gravity - Full Mix"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">This will be the suggested filename when users download the track.</p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={onFileUpload}
              disabled={!uploadFile || !uploadCaption.trim()} // Disable if no file or no caption
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
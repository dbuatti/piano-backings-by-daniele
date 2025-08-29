import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FileInput from '@/components/FileInput';
import { Upload, UploadCloud } from 'lucide-react';

interface UploadTrackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  uploadTrackId: string | null;
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
  onFileUpload: () => void;
}

const UploadTrackDialog: React.FC<UploadTrackDialogProps> = ({
  isOpen,
  onOpenChange,
  uploadTrackId,
  uploadFile,
  onFileChange,
  onFileUpload,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Upload Track
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FileInput
            id="track-file-upload"
            label="Select MP3 File"
            icon={UploadCloud}
            accept="audio/mp3,audio/mpeg"
            onChange={onFileChange}
            note="Drag and drop your MP3 file here, or click to browse."
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
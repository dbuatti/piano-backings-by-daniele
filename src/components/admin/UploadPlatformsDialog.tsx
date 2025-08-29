import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Facebook, Instagram, Music, Upload, Youtube } from 'lucide-react';

interface UploadPlatformsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: {
    youtube: boolean;
    tiktok: boolean;
    facebook: boolean;
    instagram: boolean;
    gumroad: boolean;
  };
  setPlatforms: (platforms: {
    youtube: boolean;
    tiktok: boolean;
    facebook: boolean;
    instagram: boolean;
    gumroad: boolean;
  }) => void;
  onSavePlatforms: () => void;
}

const UploadPlatformsDialog: React.FC<UploadPlatformsDialogProps> = ({
  isOpen,
  onOpenChange,
  platforms,
  setPlatforms,
  onSavePlatforms,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Specify Upload Platforms
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select the platforms where this track has been uploaded:</p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Youtube className="w-5 h-5 text-red-600 mr-2" />
                <span>YouTube</span>
              </div>
              <Button 
                variant={platforms.youtube ? "default" : "outline"}
                onClick={() => setPlatforms({...platforms, youtube: !platforms.youtube})}
                className={platforms.youtube ? "bg-red-600 hover:bg-red-700" : ""}
                size="sm"
              >
                {platforms.youtube ? "Uploaded" : "Mark as Uploaded"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Music className="w-5 h-5 text-black mr-2" />
                <span>TikTok</span>
              </div>
              <Button 
                variant={platforms.tiktok ? "default" : "outline"}
                onClick={() => setPlatforms({...platforms, tiktok: !platforms.tiktok})}
                className={platforms.tiktok ? "bg-black hover:bg-gray-800 text-white" : ""}
                size="sm"
              >
                {platforms.tiktok ? "Uploaded" : "Mark as Uploaded"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Facebook className="w-5 h-5 text-blue-600 mr-2" />
                <span>Facebook</span>
              </div>
              <Button 
                variant={platforms.facebook ? "default" : "outline"}
                onClick={() => setPlatforms({...platforms, facebook: !platforms.facebook})}
                className={platforms.facebook ? "bg-blue-600 hover:bg-blue-700" : ""}
                size="sm"
              >
                {platforms.facebook ? "Uploaded" : "Mark as Uploaded"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Instagram className="w-5 h-5 text-pink-500 mr-2" />
                <span>Instagram</span>
              </div>
              <Button 
                variant={platforms.instagram ? "default" : "outline"}
                onClick={() => setPlatforms({...platforms, instagram: !platforms.instagram})}
                className={platforms.instagram ? "bg-pink-500 hover:bg-pink-600" : ""}
                size="sm"
              >
                {platforms.instagram ? "Uploaded" : "Mark as Uploaded"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <ExternalLink className="w-5 h-5 text-purple-600 mr-2" />
                <span>Gumroad</span>
              </div>
              <Button 
                variant={platforms.gumroad ? "default" : "outline"}
                onClick={() => setPlatforms({...platforms, gumroad: !platforms.gumroad})}
                className={platforms.gumroad ? "bg-purple-600 hover:bg-purple-700" : ""}
                size="sm"
              >
                {platforms.gumroad ? "Uploaded" : "Mark as Uploaded"}
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={onSavePlatforms}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90"
            >
              Save Platforms
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPlatformsDialog;
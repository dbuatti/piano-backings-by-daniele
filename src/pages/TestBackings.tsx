import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Play, Music, Folder, FileText, Youtube } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';

const TestBackings = () => {
  const [requestId, setRequestId] = useState('');
  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [sheetMusicFile, setSheetMusicFile] = useState<File | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTrackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTrackFile(e.target.files[0]);
    } else {
      setTrackFile(null);
    }
  };

  const handleSheetMusicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSheetMusicFile(e.target.files[0]);
    } else {
      setSheetMusicFile(null);
    }
  };

  const handleUploadTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponseMessage('');

    if (!requestId || !trackFile) {
      setError("Request ID and track file are required.");
      setLoading(false);
      return;
    }

    try {
      const fileExt = trackFile.name.split('.').pop();
      const fileName = `tracks/${requestId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase // Removed 'data: uploadData'
        .storage
        .from('tracks')
        .upload(fileName, trackFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Track upload failed: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('tracks')
        .getPublicUrl(fileName);
      
      // Fetch current request to get existing track_urls
      const { data: currentRequest, error: fetchError } = await supabase
        .from('backing_requests')
        .select('track_urls')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current track URLs: ${fetchError.message}`);
      }

      const existingTrackUrls = currentRequest?.track_urls || [];
      const newTrackUrls = [...existingTrackUrls, { url: publicUrl, caption: trackFile.name }];

      const { data, error: updateError } = await supabase
        .from('backing_requests')
        .update({ track_urls: newTrackUrls, status: 'completed' })
        .eq('id', requestId)
        .select();
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      setResponseMessage(JSON.stringify(data, null, 2));
      toast({
        title: "Success",
        description: "Track uploaded and request updated successfully!",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSheetMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponseMessage('');

    if (!requestId || !sheetMusicFile) {
      setError("Request ID and sheet music file are required.");
      setLoading(false);
      return;
    }

    try {
      const fileExt = sheetMusicFile.name.split('.').pop();
      const fileName = `sheet-music/${requestId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase // Removed 'data: uploadData'
        .storage
        .from('sheet-music')
        .upload(fileName, sheetMusicFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Sheet music upload failed: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('sheet-music')
        .getPublicUrl(fileName);
      
      const { data, error: updateError } = await supabase
        .from('backing_requests')
        .update({ sheet_music_url: publicUrl })
        .eq('id', requestId)
        .select();
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      setResponseMessage(JSON.stringify(data, null, 2));
      toast({
        title: "Success",
        description: "Sheet music uploaded and request updated successfully!",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#1C0357] mb-6">Test Backings Upload</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Track Section */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-[#1C0357] mb-4 flex items-center">
              <Music className="mr-2 h-5 w-5" /> Upload Track
            </h2>
            <form onSubmit={handleUploadTrack} className="space-y-4">
              <div>
                <Label htmlFor="trackRequestId">Request ID</Label>
                <Input
                  id="trackRequestId"
                  type="text"
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  placeholder="Enter existing request ID"
                  required
                />
              </div>
              <div>
                <Label htmlFor="trackFile">Track File (Audio)</Label>
                <Input
                  id="trackFile"
                  type="file"
                  accept="audio/*"
                  onChange={handleTrackFileChange}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90">
                {loading ? 'Uploading...' : 'Upload Track'}
              </Button>
            </form>
          </div>

          {/* Upload Sheet Music Section */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-[#1C0357] mb-4 flex items-center">
              <FileText className="mr-2 h-5 w-5" /> Upload Sheet Music
            </h2>
            <form onSubmit={handleUploadSheetMusic} className="space-y-4">
              <div>
                <Label htmlFor="sheetMusicRequestId">Request ID</Label>
                <Input
                  id="sheetMusicRequestId"
                  type="text"
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  placeholder="Enter existing request ID"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sheetMusicFile">Sheet Music File (PDF)</Label>
                <Input
                  id="sheetMusicFile"
                  type="file"
                  accept=".pdf"
                  onChange={handleSheetMusicFileChange}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90">
                {loading ? 'Uploading...' : 'Upload Sheet Music'}
              </Button>
            </form>
          </div>
        </div>

        {error && <ErrorDisplay message={error} />}

        {responseMessage && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md shadow-inner">
            <h3 className="font-semibold text-lg mb-2 text-[#1C0357]">API Response:</h3>
            <Textarea
              value={responseMessage}
              readOnly
              rows={10}
              className="font-mono text-sm bg-white border border-gray-300"
            />
          </div>
        )}
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TestBackings;
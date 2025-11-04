import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Re-imported Card components
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
// Removed Play, Music, Folder, FileText as they were unused
import { MadeWithDyad } from '@/components/made-with-dyad';

const TestFunction = () => {
  const [email, setEmail] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [musicalOrArtist, setMusicalOrArtist] = useState('');
  const [sheetMusicFile, setSheetMusicFile] = useState<File | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSheetMusicFile(e.target.files[0]);
    } else {
      setSheetMusicFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponseMessage('');

    try {
      let sheetMusicUrl = null;
      if (sheetMusicFile) {
        const fileExt = sheetMusicFile.name.split('.').pop();
        const fileName = `test-sheet-music-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase // Removed 'data: uploadData'
          .storage
          .from('sheet-music')
          .upload(fileName, sheetMusicFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase
          .storage
          .from('sheet-music')
          .getPublicUrl(fileName);
        
        sheetMusicUrl = publicUrl;
      }

      const { data, error: functionError } = await supabase.functions.invoke('create-backing-request', {
        body: {
          formData: {
            email,
            songTitle,
            musicalOrArtist,
            sheetMusicUrl,
            name: 'Test User', // Dummy data for required fields
            trackPurpose: 'test',
            backingType: ['full-song'],
            deliveryDate: '2023-12-31',
            specialRequests: 'Test request from TestFunction page',
            category: 'General',
            trackType: 'polished'
          }
        },
      });

      if (functionError) {
        throw new Error(`Function invocation failed: ${functionError.message}`);
      }

      setResponseMessage(JSON.stringify(data, null, 2));
      toast({
        title: "Success",
        description: "Test function executed successfully!",
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
        <Card className="shadow-lg">
          <CardHeader className="bg-[#1C0357] text-white">
            <CardTitle className="text-2xl">Test Supabase Function: create-backing-request</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="songTitle">Song Title</Label>
                <Input
                  id="songTitle"
                  type="text"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="e.g., Defying Gravity"
                  required
                />
              </div>
              <div>
                <Label htmlFor="musicalOrArtist">Musical or Artist</Label>
                <Input
                  id="musicalOrArtist"
                  type="text"
                  value={musicalOrArtist}
                  onChange={(e) => setMusicalOrArtist(e.target.value)}
                  placeholder="e.g., Wicked"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sheetMusic">Sheet Music (PDF)</Label>
                <Input
                  id="sheetMusic"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Invoke Function'}
              </Button>
            </form>

            {error && <ErrorDisplay message={error} />}

            {responseMessage && (
              <div className="mt-6 p-4 bg-gray-100 rounded-md">
                <h3 className="font-semibold text-lg mb-2">Function Response:</h3>
                <Textarea
                  value={responseMessage}
                  readOnly
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TestFunction;
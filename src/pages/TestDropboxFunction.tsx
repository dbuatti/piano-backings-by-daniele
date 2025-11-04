import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Play, Music, Folder, FileText, Youtube } from 'lucide-react';

const TestDropboxFunction = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const testFunction = async () => {
    setIsTesting(true);
    setResult(null);
    setError(null);
    
    try {
      const testData = {
        formData: {
          email: "test@example.com",
          name: "Test User",
          songTitle: "Test Song",
          musicalOrArtist: "Test Musical",
          songKey: "C Major (0)",
          differentKey: "No",
          keyForTrack: "",
          youtubeLink: "https://www.youtube.com/watch?v=bIZNxHMDpjY",
          voiceMemo: "",
          sheetMusicUrl: null,
          trackPurpose: "personal-practise",
          backingType: "full-song",
          deliveryDate: new Date().toISOString().split('T')[0],
          additionalServices: ["rush-order"],
          specialRequests: "This is a test request for Dropbox folder creation",
          category: "Test Category",
          trackType: "polished"
        }
      };

      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to test this function');
      }
      
      console.log('Sending request to Supabase function with data:', testData);
      
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(testData),
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Invalid response from server: ${responseText}`);
      }
      
      if (response.ok) {
        setResult(data);
        toast({
          title: "Success!",
          description: "Function executed successfully. Check the result below.",
        });
      } else {
        throw new Error(data.error || `Function failed with status ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error testing function:', err);
      setError(err);
      toast({
        title: "Error",
        description: `There was a problem testing the function: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Test Dropbox Function</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Debug the backing track request function with Dropbox folder creation</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Play className="mr-2 h-5 w-5" />
              Function Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="mb-4">
                This page tests the Supabase function that handles backing track requests. 
                When you click the button below, it will:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li>Create a new entry in the database</li>
                <li>Attempt to create a new folder in Dropbox</li>
                <li>Upload a placeholder MP3 from YouTube to the folder</li>
                <li>Copy the Logic Pro X template to the folder</li>
              </ul>
              
              <Button 
                onClick={testFunction}
                disabled={isTesting}
                className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-12 px-6"
              >
                {isTesting ? 'Testing...' : 'Test Dropbox Function'}
              </Button>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-100 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-red-800">Error</h3>
                <pre className="whitespace-pre-wrap break-words text-sm bg-red-50 p-4 rounded">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
            )}
            
            {result && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2 text-[#1C0357]">Test Result</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap break-words text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-blue-50">
                  <h4 className="font-semibold text-[#1C0357] mb-2">Result Summary:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Database entry: <span className="font-semibold text-green-600">SUCCESS</span></li>
                    <li>Dropbox folder creation: {
                      result.dropboxFolderId 
                        ? <span className="font-semibold text-green-600">SUCCESS</span> 
                        : <span className="font-semibold text-red-600">FAILED</span>
                    }</li>
                    <li>Dropbox folder path: <span className="font-mono">{result.parentFolderUsed}</span></li>
                    <li>Folder name: <span className="font-mono">{result.folderNameUsed}</span></li>
                    <li>First name used: <span className="font-mono">{result.firstNameUsed}</span></li>
                    <li>Logic Pro X file name: <span className="font-mono">{result.logicFileNameUsed}</span></li>
                    <li>Logic Pro X template copy: {
                      result.templateCopySuccess 
                        ? <span className="font-semibold text-green-600">SUCCESS</span> 
                        : <span className="font-semibold text-red-600">FAILED</span>
                    }</li>
                    <li>YouTube MP3 upload to Dropbox: {
                      result.youtubeMp3Success !== undefined
                        ? result.youtubeMp3Success 
                          ? <span className="font-semibold text-green-600">SUCCESS</span> 
                          : <span className="font-semibold text-red-600">FAILED</span>
                        : <span className="font-semibold text-gray-600">NOT ATTEMPTED</span>
                    }</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TestDropboxFunction;
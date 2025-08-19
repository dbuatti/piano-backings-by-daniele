import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import ErrorDisplay from '@/components/ErrorDisplay';

const TestFunction = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  const testFunction = async (backingType: string) => {
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
          youtubeLink: "https://www.youtube.com/watch?v=g3lKxyJXFqg&list=RDg3lKxyJXFqg&start_radio=1",
          voiceMemo: "",
          trackPurpose: "personal-practise",
          backingType: backingType,
          deliveryDate: new Date().toISOString().split('T')[0], // Today's date
          additionalServices: ["rush-order"],
          specialRequests: "This is a test request for Dropbox folder creation",
          category: "Test Category"
        }
      };

      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to test this function');
      }
      
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
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        // Check if Dropbox folder was created
        if (data.dropboxFolderId) {
          toast({
            title: "Success!",
            description: `Function executed successfully for ${backingType}. A new folder was created in Dropbox.`,
          });
        } else {
          toast({
            title: "Partial Success",
            description: `Request submitted successfully for ${backingType}, but Dropbox folder creation failed. Check the logs for details.`,
            variant: "destructive",
          });
        }
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Test Dropbox Integration</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Test the backing track request function with Dropbox folder creation</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Function Test</CardTitle>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-[#1C0357]">Authentication Required</h3>
                <p className="mb-4">
                  You need to be logged in to test this function. Please log in first and then return to this page.
                </p>
                <Button 
                  onClick={() => navigate('/login')}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
                >
                  Go to Login Page
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="mb-4">
                    This page tests the Supabase function that handles backing track requests. 
                    When you click the buttons below, it will:
                  </p>
                  <ul className="list-disc pl-5 mb-4 space-y-2">
                    <li>Create a new entry in the database</li>
                    <li>Attempt to create a new folder in Dropbox</li>
                  </ul>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Button 
                      onClick={() => testFunction('full-song')}
                      disabled={isTesting}
                      className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-20 flex flex-col items-center justify-center"
                    >
                      <span className="font-bold">Full Song</span>
                      <span className="text-sm">00. FULL VERSIONS</span>
                    </Button>
                    
                    <Button 
                      onClick={() => testFunction('audition-cut')}
                      disabled={isTesting}
                      className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-20 flex flex-col items-center justify-center"
                    >
                      <span className="font-bold">Audition Cut</span>
                      <span className="text-sm">00. AUDITION CUTS</span>
                    </Button>
                    
                    <Button 
                      onClick={() => testFunction('note-bash')}
                      disabled={isTesting}
                      className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-20 flex flex-col items-center justify-center"
                    >
                      <span className="font-bold">Note Bash</span>
                      <span className="text-sm">00. NOTE BASH</span>
                    </Button>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold text-[#1C0357] mb-2">Folder Structure</h3>
                    <p className="mb-2">All folders will be created within:</p>
                    <p className="font-mono bg-white p-2 rounded border">/Move over to NAS/PIANO BACKING TRACKS</p>
                    <p className="mt-2">With subfolders:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>00. FULL VERSIONS</li>
                      <li>00. AUDITION CUTS</li>
                      <li>00. NOTE BASH</li>
                    </ul>
                  </div>
                </div>
                
                {error && (
                  <div className="mt-6">
                    <ErrorDisplay error={error} />
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
                        <li>PDF upload to Dropbox: {
                          result.pdfUploadSuccess !== undefined
                            ? result.pdfUploadSuccess 
                              ? <span className="font-semibold text-green-600">SUCCESS</span> 
                              : <span className="font-semibold text-red-600">FAILED</span>
                            : <span className="font-semibold text-gray-600">NOT ATTEMPTED</span>
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
              </>
            )}
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TestFunction;
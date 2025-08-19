import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

const TestBackings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  const testFunction = async (backingType: string, typeName: string, trackType: string | null = null, includePdf: boolean = false) => {
    setIsTesting(true);
    setResult(null);
    
    try {
      // Create a simple PDF for testing if needed
      let sheetMusicUrl = null;
      if (includePdf) {
        // Create a simple PDF blob for testing
        const pdfBlob = new Blob(['%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 5 0 R\n>>\n>>\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Testing PDF Upload) Tj\nET\nendstream\nendobj\n5 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000115 00000 n \n0000000287 00000 n \n0000000384 00000 n \ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n435\n%%EOF'], { type: 'application/pdf' });
        
        // Upload to Supabase storage
        const fileName = `test-sheet-music-${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('sheet-music')
          .upload(fileName, pdfBlob);
        
        if (uploadError) {
          throw new Error(`File upload error: ${uploadError.message}`);
        }
        
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase
          .storage
          .from('sheet-music')
          .getPublicUrl(fileName);
        
        sheetMusicUrl = publicUrl;
      }
      
      const testData = {
        formData: {
          email: "test@example.com",
          name: "Test User",
          songTitle: "Test Song",
          musicalOrArtist: "Test Musical",
          songKey: "C Major (0)",
          differentKey: "No",
          keyForTrack: "",
          youtubeLink: "https://www.youtube.com/watch?v=test",
          voiceMemo: "",
          sheetMusicUrl: sheetMusicUrl, // Include the sheet music URL if testing PDF
          trackPurpose: "personal-practise",
          backingType: backingType,
          trackType: trackType, // Include trackType in the test data
          deliveryDate: "2023-12-31",
          additionalServices: ["rush-order"],
          specialRequests: `This is a test request for ${typeName} backing type`,
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
      setResult(data);
      
      if (response.ok) {
        // Check if Dropbox folder was created
        if (data.dropboxFolderId) {
          toast({
            title: "Success!",
            description: `Function executed successfully for ${typeName}. A new folder was created in Dropbox.`,
          });
        } else {
          toast({
            title: "Partial Success",
            description: `Request submitted successfully for ${typeName}, but Dropbox folder creation failed. Check the logs for details.`,
            variant: "destructive",
          });
        }
      } else {
        throw new Error(data.error || `Function failed with status ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error testing function:', error);
      toast({
        title: "Error",
        description: `There was a problem testing the function: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const backingTypeOptions = [
    { value: 'full-song', label: 'Full Song Backing', folder: '00. FULL VERSIONS' },
    { value: 'audition-cut', label: 'Audition Cut Backing', folder: '00. AUDITION CUTS' },
    { value: 'note-bash', label: 'Note/Melody Bash', folder: '00. NOTE BASH' },
  ];

  const roughCutOptions = [
    { value: 'quick', label: 'Quick Reference (Rough Cut)', folder: '00. ROUGH CUTS' },
    { value: 'one-take', label: 'One-Take Recording (Rough Cut)', folder: '00. ROUGH CUTS' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Test Backing Type Folders</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Test folder creation for each backing type</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Backings Test</CardTitle>
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
                    Click the buttons below to test each backing type:
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-6 mb-3 text-[#1C0357]">Standard Backing Types</h3>
                  <ul className="list-disc pl-5 mb-4 space-y-2">
                    <li>Full Song Backing → 00. FULL VERSIONS folder</li>
                    <li>Audition Cut Backing → 00. AUDITION CUTS folder</li>
                    <li>Note/Melody Bash → 00. NOTE BASH folder</li>
                  </ul>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {backingTypeOptions.map((option) => (
                      <div key={option.value} className="space-y-2">
                        <Button
                          onClick={() => testFunction(option.value, option.label, null, false)}
                          disabled={isTesting}
                          className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-24 flex flex-col items-center justify-center w-full"
                        >
                          <span className="font-bold text-lg">{option.label}</span>
                          <span className="text-sm mt-1">→ {option.folder}</span>
                        </Button>
                        <Button
                          onClick={() => testFunction(option.value, `${option.label} with PDF`, null, true)}
                          disabled={isTesting}
                          variant="outline"
                          className="border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/10 h-10 w-full"
                        >
                          Test with PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <h3 className="text-xl font-semibold mt-8 mb-3 text-[#1C0357]">Rough Cut Types (Override Folder Rules)</h3>
                  <ul className="list-disc pl-5 mb-4 space-y-2">
                    <li>Quick Reference → 00. ROUGH CUTS folder (overrides backing type)</li>
                    <li>One-Take Recording → 00. ROUGH CUTS folder (overrides backing type)</li>
                  </ul>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {roughCutOptions.map((option) => (
                      <div key={option.value} className="space-y-2">
                        <Button
                          onClick={() => testFunction('full-song', option.label, option.value, false)}
                          disabled={isTesting}
                          className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white h-24 flex flex-col items-center justify-center w-full"
                        >
                          <span className="font-bold text-lg">{option.label}</span>
                          <span className="text-sm mt-1">→ {option.folder}</span>
                        </Button>
                        <Button
                          onClick={() => testFunction('full-song', `${option.label} with PDF`, option.value, true)}
                          disabled={isTesting}
                          variant="outline"
                          className="border-[#F538BC] text-[#F538BC] hover:bg-[#F538BC]/10 h-10 w-full"
                        >
                          Test with PDF
                        </Button>
                      </div>
                    ))}
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
                      <li className="font-bold">00. ROUGH CUTS (for Quick Reference and One-Take recordings)</li>
                    </ul>
                  </div>
                </div>
                
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
                        <li>PDF upload to Dropbox: {
                          result.pdfUploadSuccess 
                            ? <span className="font-semibold text-green-600">SUCCESS</span> 
                            : <span className="font-semibold text-red-600">FAILED</span>
                        }</li>
                        <li>Folder path: <span className="font-mono">{result.parentFolderUsed}</span></li>
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

export default TestBackings;
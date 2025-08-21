import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TestDropboxCredentials = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const testCredentials = async () => {
    setIsTesting(true);
    setResult(null);
    setError(null);
    
    try {
      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to test this function');
      }
      
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/test-dropbox`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({})
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        toast({
          title: "Test Completed",
          description: "Check the results below for Dropbox credential status.",
        });
      } else {
        throw new Error(data.error || `Function failed with status ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error testing credentials:', err);
      setError(err);
      toast({
        title: "Error",
        description: `There was a problem testing the credentials: ${err.message}`,
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Test Dropbox Credentials</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Check if Dropbox integration is properly configured</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Dropbox Credentials Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="mb-4">
                This page tests if your Dropbox credentials are properly configured in Supabase.
              </p>
              
              <Button 
                onClick={testCredentials}
                disabled={isTesting}
                className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-12 px-6"
              >
                {isTesting ? 'Testing...' : 'Test Dropbox Credentials'}
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
                    <li>Dropbox credentials configured: {
                      result.dropboxError && result.dropboxError.includes('not configured') 
                        ? <span className="font-semibold text-red-600">NO</span> 
                        : <span className="font-semibold text-green-600">YES</span>
                    }</li>
                    <li>Parent folder check: {
                      result.parentFolderCheck 
                        ? <span className="font-semibold text-green-600">SUCCESS</span> 
                        : <span className="font-semibold text-red-600">FAILED</span>
                    }</li>
                    <li>Folder creation: {
                      result.dropboxFolderId 
                        ? <span className="font-semibold text-green-600">SUCCESS</span> 
                        : <span className="font-semibold text-red-600">FAILED</span>
                    }</li>
                    {result.fullPath && (
                      <li>Folder path: <span className="font-mono">{result.fullPath}</span></li>
                    )}
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

export default TestDropboxCredentials;
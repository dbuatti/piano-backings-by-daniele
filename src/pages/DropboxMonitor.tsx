import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const DropboxMonitor = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const testDropboxConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
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
        setTestResult(data);
        toast({
          title: "Test Completed",
          description: "Check the results below for Dropbox connection status.",
        });
      } else {
        throw new Error(data.error || `Function failed with status ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error testing Dropbox connection:', err);
      setError(err);
      toast({
        title: "Error",
        description: `There was a problem testing the connection: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="py-4"> {/* Adjusted padding for embedding */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Dropbox Connection Monitor</h1>
        <p className="text-lg md:text-xl font-light text-[#1C0357]/90">Test and monitor your Dropbox integration</p>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357]">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <p className="mb-4">
              This page tests if your Dropbox connection is properly configured and working.
              Run this test periodically to ensure your refresh token is still valid.
            </p>
            
            <Button 
              onClick={testDropboxConnection}
              disabled={isTesting}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-12 px-6"
            >
              {isTesting ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Dropbox Connection'
              )}
            </Button>
          </div>
          
          {error && (
            <Card className="border-red-300 bg-red-50 mb-6">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Connection Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap break-words text-sm bg-red-100 p-4 rounded">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          
          {testResult && (
            <Card className="border-blue-300 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center">
                  {testResult.dropboxFolderId ? (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                  )}
                  Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <pre className="whitespace-pre-wrap break-words text-sm">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-white border">
                  <h4 className="font-semibold text-[#1C0357] mb-3">Connection Status Summary:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Dropbox Credentials:</span>
                      <span className={`font-semibold ${testResult.dropboxError && testResult.dropboxError.includes('not configured') ? 'text-red-600' : 'text-green-600'}`}>
                        {testResult.dropboxError && testResult.dropboxError.includes('not configured') 
                          ? 'NOT CONFIGURED' 
                          : 'CONFIGURED'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Parent Folder Access:</span>
                      <span className={`font-semibold ${testResult.parentFolderCheck ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.parentFolderCheck ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Test Folder Creation:</span>
                      <span className={`font-semibold ${testResult.dropboxFolderId ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.dropboxFolderId ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    
                    {testResult.fullPath && (
                      <div className="flex items-center justify-between">
                        <span>Test Folder Path:</span>
                        <span className="font-mono text-sm bg-gray-100 p-1 rounded">
                          {testResult.fullPath}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    What to do if connection fails:
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2 text-sm">
                    <li>Go to the Dropbox App Console</li>
                    <li>Generate a new refresh token for your app</li>
                    <li>Update the DROPBOX_REFRESH_TOKEN secret in Supabase</li>
                    <li>Run this test again to confirm the connection</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
          
          {!testResult && !error && (
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-600">
                Click "Test Dropbox Connection" to check your Dropbox integration status.
              </p>
            </div>
          )}
        </Card>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-[#1C0357]">Token Management Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Set calendar reminders to test token every 30-60 days</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Bookmark your Dropbox App Console for quick access</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Keep a note of the token generation date</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Test immediately after any Dropbox app changes</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-[#1C0357]">Common Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <AlertCircle className="mr-2 h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Refresh token expires after app permission changes</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="mr-2 h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Security settings may invalidate tokens</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="mr-2 h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>App reconfiguration requires new token</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="mr-2 h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Long periods of inactivity may expire tokens</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default DropboxMonitor;
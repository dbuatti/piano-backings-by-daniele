import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { 
  Cloud, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  FolderPlus, 
  FileText,
  AlertTriangle
} from 'lucide-react';

const DropboxMonitor = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [lastTest, setLastTest] = useState<Date | null>(null);

  const testDropboxConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to test Dropbox connection');
      }
      
      // Call the test function
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/test-dropbox`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult(data);
        setLastTest(new Date());
        toast({
          title: "Test Completed",
          description: "Dropbox connection test finished successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to test Dropbox connection');
      }
    } catch (err: any) {
      console.error('Error testing Dropbox connection:', err);
      setTestResult({ error: err.message });
      toast({
        title: "Error",
        description: `Failed to test Dropbox connection: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getConnectionStatus = () => {
    if (!testResult) return null;
    
    if (testResult.error) {
      return (
        <div className="flex items-center text-red-600">
          <XCircle className="mr-2 h-5 w-5" />
          <span className="font-medium">Connection Failed</span>
        </div>
      );
    }
    
    if (testResult.dropboxFolderId) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircle className="mr-2 h-5 w-5" />
          <span className="font-medium">Connected Successfully</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-yellow-600">
        <AlertTriangle className="mr-2 h-5 w-5" />
        <span className="font-medium">Connection Issues</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Dropbox Connection Monitor</h1>
          <p className="text-lg text-[#1C0357]/90">Test and monitor your Dropbox integration</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Connection Status</p>
                  <div className="mt-2">
                    {testResult ? (
                      getConnectionStatus()
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <Cloud className="mr-2 h-5 w-5" />
                        <span>Not Tested</span>
                      </div>
                    )}
                  </div>
                </div>
                <Cloud className="h-10 w-10 text-[#D1AAF2]" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Test</p>
                  <p className="text-lg font-bold text-[#1C0357]">
                    {lastTest ? lastTest.toLocaleTimeString() : 'Never'}
                  </p>
                </div>
                <RefreshCw className="h-10 w-10 text-[#1C0357]" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Token Status</p>
                  <div className="mt-2">
                    {testResult ? (
                      testResult.error ? (
                        <Badge variant="destructive">Invalid/Expired</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">Valid</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </div>
                </div>
                <FileText className="h-10 w-10 text-[#F538BC]" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
              <span className="flex items-center">
                <Cloud className="mr-2 h-6 w-6" />
                Connection Test
              </span>
              <Button 
                onClick={testDropboxConnection}
                disabled={isTesting}
                className="bg-[#1C0357] hover:bg-[#1C0357]/90"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[#1C0357]">What this test does:</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Verifies the Dropbox access token is valid</li>
                  <li>Attempts to create a temporary test folder in your Dropbox</li>
                  <li>Confirms the parent folder path is accessible</li>
                  <li>Tests the overall Dropbox integration functionality</li>
                </ul>
              </div>
              
              {testResult && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-[#1C0357]">Test Results</h3>
                  
                  {testResult.error ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <h4 className="font-semibold text-red-800 flex items-center">
                          <XCircle className="mr-2 h-5 w-5" />
                          Error Details
                        </h4>
                        <p className="mt-2 text-red-700">{testResult.error}</p>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 flex items-center">
                          <AlertTriangle className="mr-2 h-5 w-5" />
                          What to do next
                        </h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-yellow-700">
                          <li>Generate a new access token from your Dropbox app console</li>
                          <li>Update the DROPBOX_ACCESS_TOKEN secret in Supabase</li>
                          <li>Wait a few minutes for Supabase to propagate the new secret</li>
                          <li>Run this test again to confirm the fix</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-semibold text-green-800 flex items-center">
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Connection Status
                          </h4>
                          <p className="mt-1 text-green-700">Successfully connected to Dropbox</p>
                        </div>
                        
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-blue-800 flex items-center">
                            <FolderPlus className="mr-2 h-5 w-5" />
                            Folder Creation
                          </h4>
                          <p className="mt-1 text-blue-700">
                            {testResult.dropboxFolderId 
                              ? 'Test folder created successfully' 
                              : 'Folder creation not attempted'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-800">Technical Details</h4>
                        <div className="mt-2 text-sm">
                          <p><span className="font-medium">Test Folder Path:</span> {testResult.fullPath}</p>
                          <p><span className="font-medium">Folder ID:</span> {testResult.dropboxFolderId || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-800 flex items-center">
                          <CheckCircle className="mr-2 h-5 w-5" />
                          All Systems Operational
                        </h4>
                        <p className="mt-1 text-green-700">
                          Your Dropbox integration is working correctly. You can safely continue using the app.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-[#1C0357] mb-2">Monitoring Recommendations</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Test the connection monthly to ensure the token is still valid</li>
                  <li>Immediately test if you notice any issues with track requests</li>
                  <li>Check after making any changes to your Dropbox app settings</li>
                  <li>Bookmark this page for easy access to monitoring</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Token Management Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 text-[#1C0357]">If token expires:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Go to the Dropbox App Console</li>
                  <li>Generate a new access token for your app</li>
                  <li>In Supabase, go to Settings → Secrets</li>
                  <li>Update the DROPBOX_ACCESS_TOKEN value with the new token</li>
                  <li>Wait 5-10 minutes for the secret to propagate</li>
                  <li>Test the connection using this monitoring page</li>
                </ol>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Important Notes
                </h4>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-yellow-700">
                  <li>Never share your access token with anyone</li>
                  <li>Store tokens only in Supabase secrets, never in client-side code</li>
                  <li>Dropbox tokens may expire if the app permissions change</li>
                  <li>Regular monitoring helps prevent service interruptions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default DropboxMonitor;
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input"; // Removed as it was unused
// import { Label } from "@/components/ui/label"; // Removed as it was unused
// import { Textarea } from "@/components/ui/textarea"; // Removed as it was unused
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Play } from 'lucide-react'; // Removed Music, Folder, FileText, Youtube
import { MadeWithDyad } from '@/components/made-with-dyad';

const TestDropboxFunction = () => {
  const [folderPath, setFolderPath] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvokeFunction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponseMessage('');

    try {
      const { data, error: functionError } = await supabase.functions.invoke('list-dropbox-folder', {
        body: { folderPath },
      });

      if (functionError) {
        throw new Error(`Function invocation failed: ${functionError.message}`);
      }

      setResponseMessage(JSON.stringify(data, null, 2));
      toast({
        title: "Success",
        description: "Dropbox function executed successfully!",
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
            <CardTitle className="text-2xl">Test Supabase Function: list-dropbox-folder</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleInvokeFunction} className="space-y-4">
              <div>
                <label htmlFor="folderPath" className="block text-sm font-medium text-gray-700">Dropbox Folder Path</label>
                <input
                  id="folderPath"
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="/path/to/folder"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Invoking...' : 'Invoke Function'}
              </Button>
            </form>

            {error && <ErrorDisplay message={error} />}

            {responseMessage && (
              <div className="mt-6 p-4 bg-gray-100 rounded-md">
                <h3 className="font-semibold text-lg mb-2">Function Response:</h3>
                <textarea
                  value={responseMessage}
                  readOnly
                  rows={10}
                  className="font-mono text-sm w-full p-2 border rounded-md"
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

export default TestDropboxFunction;
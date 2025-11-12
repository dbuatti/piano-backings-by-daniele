import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from '@/components/made-with-dyad';
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Loader2, CheckCircle, XCircle, Key } from 'lucide-react';

const TestDropboxCredentials: React.FC = () => {
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkCredentials = async () => {
    setLoading(true);
    setHasCredentials(null);
    try {
      const { data, error } = await supabase.functions.invoke('check-dropbox-credentials');
      if (error) throw error;
      setHasCredentials(data.hasCredentials);
      showSuccess("Dropbox credentials check complete.");
    } catch (error: any) {
      console.error('Error checking Dropbox credentials:', error);
      showError(`Failed to check credentials: ${error.message}`);
      setHasCredentials(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCredentials();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="flex-grow container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#1C0357] flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Dropbox Credentials Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              This page tests if the necessary Dropbox API credentials (access token) are configured in your Supabase environment variables.
            </p>

            {loading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
                <p className="ml-3 text-gray-600">Checking credentials...</p>
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 border rounded-md">
                {hasCredentials ? (
                  <div className="flex items-center text-green-600 font-semibold">
                    <CheckCircle className="mr-2 h-6 w-6" />
                    Dropbox credentials are configured correctly!
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 font-semibold">
                    <XCircle className="mr-2 h-6 w-6" />
                    Dropbox credentials are NOT configured. Please set `DROPBOX_ACCESS_TOKEN` in Supabase.
                  </div>
                )}
              </div>
            )}

            <Button onClick={checkCredentials} disabled={loading} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-checking...
                </>
              ) : (
                "Re-check Credentials"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default TestDropboxCredentials;
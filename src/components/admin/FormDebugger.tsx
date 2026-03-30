"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Bug, Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';

const FormDebugger: React.FC = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const simulateMatthewRequest = async () => {
    setIsTesting(true);
    setResult(null);
    setError(null);

    const testData = {
      formData: {
        email: "matthew_debug@example.com",
        name: "Matthew (Debug Test)",
        songTitle: "I'll Know",
        musicalOrArtist: "Guys and Dolls",
        songKey: "C Major (0)",
        differentKey: "No",
        keyForTrack: "",
        youtubeLink: "https://youtu.be/RbvVTG9pxCc?si=UO5Ni1fC3ZK62gDh",
        voiceMemo: "",
        sheetMusicUrl: null,
        trackPurpose: "personal-practise",
        backingType: ["full-song"],
        trackType: "quick",
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        additionalServices: [],
        specialRequests: "DEBUG: One-click simulation of Matthew's reported issue.",
        category: "Practice Tracks"
      }
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in as admin to run this debug test.');
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
        toast({
          title: "Debug Test Successful",
          description: "The simulated request was processed successfully.",
        });
      } else {
        throw new Error(data.error || `Function failed with status ${response.status}`);
      }
    } catch (err: any) {
      console.error('Debug test error:', err);
      setError(err);
      toast({
        title: "Debug Test Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="shadow-lg border-2 border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="text-xl text-[#1C0357] flex items-center">
          <Bug className="mr-2 h-5 w-5 text-orange-500" />
          Form Debugger
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-6">
          Use this tool to simulate specific client requests that have reported issues. This will trigger the full backend flow.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={simulateMatthewRequest}
            disabled={isTesting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simulating Matthew's Request...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Simulate Matthew's Request ("I'll Know")
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4">
              <ErrorDisplay error={error} title="Simulation Error" />
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-white border rounded-xl shadow-sm">
              <h4 className="font-bold text-[#1C0357] mb-2 flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Simulation Results
              </h4>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>• Database Entry: <span className="text-green-600 font-bold">Success</span></li>
                <li>• Dropbox Folder: <span className={result.dropboxFolderId ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {result.dropboxFolderId ? "Created" : "Failed"}
                </span></li>
                <li>• Logic Template: <span className={result.templateCopySuccess ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {result.templateCopySuccess ? "Copied" : "Failed"}
                </span></li>
              </ul>
              <p className="text-[10px] text-gray-400 mt-3 italic">
                Check your email and Dropbox to confirm full delivery.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FormDebugger;
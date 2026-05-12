"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Bug, Play, Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';

const FormDebugger: React.FC = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [step, setStep] = useState<string>('');

  const runSimulation = async (type: 'matthew' | 'akansha') => {
    setIsTesting(true);
    setResult(null);
    setError(null);
    setStep('Initializing...');

    const testData = type === 'akansha' ? {
      formData: {
        email: "akansha_test@example.com",
        name: "Akansha (Debug Test)",
        songTitle: "Audition Song Test",
        musicalOrArtist: "Musical Theatre",
        songKey: "C Major (0)",
        differentKey: "No",
        keyForTrack: "",
        youtubeLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        voiceMemo: "",
        sheetMusicUrl: null,
        trackPurpose: "audition-backing",
        backingType: ["audition-cut"],
        trackType: "audition-ready",
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        additionalServices: [],
        specialRequests: "DEBUG: Simulating Akansha's reported issue with Audition Cut.",
        category: "Audition Tracks"
      }
    } : {
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

      // Step 1: Create Request
      setStep('Step 1: Creating Request & Dropbox Folder...');
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
      if (!response.ok) throw new Error(`Request Creation Failed: ${data.error || response.statusText}`);

      // Step 2: Create Stripe Checkout
      setStep('Step 2: Generating Stripe Checkout Link...');
      const stripeResponse = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            request_ids: [data.requestId],
            amount: 30, // Audition Ready price
            customer_email: testData.formData.email,
            description: `Debug Test: ${testData.formData.songTitle}`
          }),
        }
      );

      const stripeData = await stripeResponse.json();
      if (!stripeResponse.ok) throw new Error(`Stripe Generation Failed: ${stripeData.error || stripeResponse.statusText}`);

      setResult({ ...data, stripeUrl: stripeData.url });
      setStep('Simulation Complete');
      toast({
        title: "Debug Test Successful",
        description: "Both Request and Stripe steps passed.",
      });
    } catch (err: any) {
      console.error('Debug test error:', err);
      setError(err);
      setStep('Failed at: ' + step);
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
          Simulate client requests to find where the "Submit & Pay" flow breaks. 
          This runs the <strong>Database</strong>, <strong>Dropbox</strong>, and <strong>Stripe</strong> steps.
        </p>

        <div className="space-y-3">
          <Button 
            onClick={() => runSimulation('akansha')}
            disabled={isTesting}
            className="w-full bg-[#F538BC] hover:bg-[#F538BC]/90 text-white h-12"
          >
            {isTesting && step.includes('Akansha') ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Simulate Akansha's Request (Audition Cut)
          </Button>

          <Button 
            onClick={() => runSimulation('matthew')}
            disabled={isTesting}
            variant="outline"
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-100 h-12"
          >
            Simulate Matthew's Request (Full Song)
          </Button>

          {isTesting && (
            <div className="mt-4 p-3 bg-white border rounded-lg animate-pulse">
              <p className="text-xs font-bold text-orange-600 flex items-center">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                {step}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorDisplay error={error} title="Simulation Error" />
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-white border rounded-xl shadow-sm space-y-3">
              <h4 className="font-bold text-[#1C0357] flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Simulation Results
              </h4>
              <ul className="text-xs space-y-2 text-gray-600">
                <li className="flex items-center justify-between">
                  <span>Database & Dropbox:</span>
                  <span className="text-green-600 font-bold">SUCCESS</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Stripe Session:</span>
                  <span className="text-green-600 font-bold">SUCCESS</span>
                </li>
              </ul>
              
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Generated Stripe Link:</p>
                <a 
                  href={result.stripeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-600 break-all hover:underline flex items-center gap-1"
                >
                  <CreditCard size={10} />
                  {result.stripeUrl}
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FormDebugger;
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GmailOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        setStatus(`OAuth error: ${error}`);
        toast({
          title: "OAuth Error",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      if (!code) {
        setStatus('No authorization code found in callback');
        toast({
          title: "OAuth Error",
          description: "No authorization code found in callback",
          variant: "destructive",
        });
        return;
      }
      
      try {
        setStatus('Exchanging authorization code for tokens...');
        
        // Get current session for auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('You must be logged in to complete OAuth');
        }
        
        // Call our Edge Function to exchange the code for tokens
        const response = await fetch(
          `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/gmail-oauth-callback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ code })
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to exchange code for tokens');
        }
        
        const result = await response.json();
        
        setStatus('OAuth completed successfully!');
        toast({
          title: "Success",
          description: "Gmail OAuth completed successfully. You can now send emails.",
        });
        
        // Redirect to admin dashboard after a short delay
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } catch (error: any) {
        setStatus(`Error: ${error.message}`);
        toast({
          title: "Error",
          description: `Failed to complete OAuth: ${error.message}`,
          variant: "destructive",
        });
      }
    };
    
    handleOAuthCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Gmail OAuth Callback</h1>
          <p className="text-lg text-[#1C0357]/90">Completing Gmail authorization</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Processing Authorization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1C0357] mb-4"></div>
              <p className="text-lg">{status}</p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <Button 
            onClick={() => navigate('/admin')}
            variant="outline"
            className="border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/10"
          >
            Return to Admin Dashboard
          </Button>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default GmailOAuthCallback;
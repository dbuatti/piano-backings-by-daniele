import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ErrorDisplay from '@/components/ErrorDisplay';

const GmailOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('Processing OAuth callback...');
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const redirectUri = `${window.location.origin}/gmail-oauth-callback`; // Get the redirect URI from the client

      if (errorParam) {
        const errorMessage = errorParam === 'access_denied' 
          ? 'Access denied. You need to grant permission to connect your Gmail account.' 
          : errorParam;
        
        setStatus(`OAuth error: ${errorMessage}`);
        setError(new Error(errorMessage));
        toast({
          title: "OAuth Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      if (!code) {
        const errorMessage = 'No authorization code found in callback';
        setStatus(errorMessage);
        setError(new Error(errorMessage));
        toast({
          title: "OAuth Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      try {
        setStatus('Exchanging authorization code for tokens...');
        
        // Get current session for auth token (this is the Supabase user)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('You must be logged into the application as an admin to complete this OAuth flow');
        }
        
        // Check if user is admin (either daniele.buatti@gmail.com or pianobackingsbydaniele@gmail.com)
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        if (!adminEmails.includes(session.user.email)) {
          throw new Error('Unauthorized: Only admin can complete Gmail OAuth');
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
            body: JSON.stringify({ code, redirectUri }) // Pass redirectUri from client
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
      } catch (err: any) {
        console.error('Error in OAuth callback:', err);
        setStatus(`Error: ${err.message}`);
        setError(err);
        toast({
          title: "Error",
          description: `Failed to complete OAuth: ${err.message}`,
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
            
            {error && (
              <div className="mt-6">
                <ErrorDisplay error={error} title="OAuth Error" />
              </div>
            )}
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
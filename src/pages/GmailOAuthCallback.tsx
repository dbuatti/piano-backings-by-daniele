import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';

const GmailOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Gmail authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session) {
          throw new Error('No active session found after OAuth callback.');
        }

        // Verify if the user is an admin
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        if (!adminEmails.includes(session.user!.email!)) { // Added non-null assertion
          throw new Error('Unauthorized: Only admin can complete Gmail OAuth');
        }

        // Exchange the code for a refresh token and store it securely
        const { data, error: tokenError } = await supabase.functions.invoke('exchange-gmail-token', {
          body: { access_token: session.provider_token },
        });

        if (tokenError) {
          throw new Error(`Token exchange failed: ${tokenError.message}`);
        }

        // const result = await response.json(); // Removed as it was unused

        setStatus('success');
        setMessage('Gmail account successfully connected!');
        toast({
          title: "Gmail Connected",
          description: "Your Gmail account is now connected for sending emails.",
          variant: "default",
        });
        setTimeout(() => navigate('/admin?tab=app-settings'), 2000); // Redirect to admin settings
      } catch (error: any) {
        console.error('Gmail OAuth Callback Error:', error);
        setStatus('error');
        setMessage(`Failed to connect Gmail: ${error.message}`);
        toast({
          title: "Gmail Connection Failed",
          description: error.message,
          variant: "destructive",
        });
        setTimeout(() => navigate('/admin?tab=app-settings'), 3000); // Redirect to admin settings
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex flex-col items-center justify-center">
      <Header />
      <div className="flex-grow flex items-center justify-center w-full px-4">
        <Card className="w-full max-w-md mx-auto shadow-lg text-center">
          <CardHeader className="bg-[#1C0357] text-white">
            <CardTitle className="text-2xl">Gmail OAuth Status</CardTitle>
            <CardDescription className="text-gray-200">Connecting your Gmail account...</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#1C0357] mb-4" />
                <p className="text-lg text-gray-700">{message}</p>
              </div>
            )}
            {status === 'success' && (
              <div className="flex flex-col items-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg text-green-700">{message}</p>
              </div>
            )}
            {status === 'error' && (
              <div className="flex flex-col items-center">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-lg text-red-700">{message}</p>
                <Button onClick={() => navigate('/admin?tab=app-settings')} className="mt-4 bg-red-600 hover:bg-red-700">
                  Go to App Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default GmailOAuthCallback;
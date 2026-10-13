import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Seo from '@/components/Seo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useAdmin } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';
import { takeStoredPkceVerifier } from '@/utils/socialOAuth';

type SocialPlatform = 'tiktok' | 'instagram';

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

const SocialOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: isAuthLoading, user } = useAdmin();
  const [status, setStatus] = useState('Processing OAuth callback...');
  const [error, setError] = useState<unknown>(null);

  const state = searchParams.get('state');
  const platform: SocialPlatform = state === 'instagram' ? 'instagram' : 'tiktok';
  const platformLabel = PLATFORM_LABELS[platform];

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (isAuthLoading) return;

      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        const message = errorDescription || `Authorization failed (${errorParam}).`;
        setStatus(message);
        setError(new Error(message));
        toast({ title: 'OAuth Error', description: message, variant: 'destructive' });
        return;
      }

      if (!code) {
        const message = 'No authorization code found in callback';
        setStatus(message);
        setError(new Error(message));
        toast({ title: 'OAuth Error', description: message, variant: 'destructive' });
        return;
      }

      try {
        setStatus('Exchanging authorization code for tokens...');

        if (!user) {
          throw new Error('You must be logged into the application as an admin to complete this OAuth flow');
        }
        if (!isAdmin) {
          throw new Error('Unauthorized: Only an admin can connect a social account');
        }

        const { data: { session } } = await supabase.auth.getSession();
        const redirectUri = `${window.location.origin}/social-oauth-callback`;
        const codeVerifier = platform === 'tiktok' ? takeStoredPkceVerifier() : null;

        const { data, error: fnError } = await supabase.functions.invoke('social-oauth-callback', {
          body: { platform, code, redirectUri, codeVerifier },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setStatus(`${platformLabel} connected!`);
        toast({
          title: 'Success',
          description: data?.account
            ? `${platformLabel} connected as "${data.account}".`
            : `${platformLabel} connected successfully.`,
        });

        setTimeout(() => navigate('/admin?section=settings&sub=integrations'), 2000);
      } catch (err: unknown) {
        console.error('Error in social OAuth callback:', err);
        setStatus(`Error: ${getErrorMessage(err)}`);
        setError(err);
        toast({
          title: 'Error',
          description: `Failed to complete OAuth: ${getErrorMessage(err)}`,
          variant: 'destructive',
        });
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, toast, isAdmin, isAuthLoading, user, platform, platformLabel]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo title={`Connecting ${platformLabel} | Piano Backings by Daniele`} description={`Finishing the ${platformLabel} connection.`} noindex />
      <Header />

      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Connect {platformLabel}</h1>
          <p className="text-lg text-[#1C0357]/90">Completing {platformLabel} authorization</p>
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
            onClick={() => navigate('/admin?section=settings&sub=integrations')}
            variant="outline"
            className="border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/10"
          >
            Return to Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SocialOAuthCallback;

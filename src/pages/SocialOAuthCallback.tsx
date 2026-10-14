import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
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

// A single exchange runs per visit. The provider code is one-shot, so re-running
// it on a re-render would fail with "code already used" *after* a success and
// make a good connection look broken.
type Phase = 'working' | 'done' | 'error';

const SocialOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading, user } = useAdmin();
  const [phase, setPhase] = useState<Phase>('working');
  const [status, setStatus] = useState('Working…');
  const [error, setError] = useState<unknown>(null);
  const startedRef = useRef(false);

  const platform: SocialPlatform = searchParams.get('state') === 'instagram' ? 'instagram' : 'tiktok';
  const platformLabel = PLATFORM_LABELS[platform];

  useEffect(() => {
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    const fail = (err: unknown, message: string) => {
      console.error('Error in social OAuth callback:', err);
      setPhase('error');
      setStatus(message);
      setError(err);
      toast({ title: 'Connection failed', description: message, variant: 'destructive' });
    };

    const run = async () => {
      try {
        const code = searchParams.get('code');
        const providerError = searchParams.get('error');
        const providerDescription = searchParams.get('error_description');

        if (providerError) {
          fail(
            new Error(providerDescription || providerError),
            providerDescription || `${platformLabel} refused the request (${providerError}).`,
          );
          return;
        }
        if (!code) {
          fail(new Error('Missing ?code'), `${platformLabel} did not return an authorization code.`);
          return;
        }
        if (!user || !isAdmin) {
          fail(
            new Error('Not an admin session'),
            'Sign in as an admin first, then press Connect again.',
          );
          return;
        }

        setStatus(`Exchanging the authorization code with ${platformLabel}…`);
        const redirectUri = `${window.location.origin}/social-oauth-callback`;
        const codeVerifier = platform === 'tiktok' ? takeStoredPkceVerifier() : null;

        const { data, error: fnError } = await supabase.functions.invoke('social-oauth-callback', {
          body: { platform, code, redirectUri, codeVerifier },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setPhase('done');
        setStatus(
          data?.account
            ? `${platformLabel} connected as “${data.account}”.`
            : `${platformLabel} connected.`,
        );
        toast({
          title: 'Connected',
          description: data?.account
            ? `${platformLabel} is linked as “${data.account}”.`
            : `${platformLabel} is linked.`,
        });

        // Leave the confirmation on screen for a beat before returning to where
        // the Connect button lives.
        window.setTimeout(() => navigate('/admin?section=settings&sub=integrations'), 2000);
      } catch (err) {
        fail(
          err,
          `Could not finish the ${platformLabel} connection: ${getErrorMessage(err)}`,
        );
      }
    };

    void run();
    // searchParams is intentionally omitted: this must run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAdmin, user, platform, platformLabel, navigate, toast]);

  const heading = phase === 'working' ? 'Connecting' : phase === 'done' ? 'Connected' : 'Failed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo
        title={`Connecting ${platformLabel} | Piano Backings by Daniele`}
        description={`Finishing the ${platformLabel} connection.`}
        noindex
      />
      <Header />

      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Connect {platformLabel}</h1>
          <p className="text-lg text-[#1C0357]/90">Completing {platformLabel} authorization</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">
              {platformLabel} — {heading}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              {phase === 'working' && (
                <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-[#1C0357]" />
              )}
              {phase === 'done' && <CheckCircle2 className="h-12 w-12 text-emerald-600" />}
              {phase === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
              <p className="text-lg">{status}</p>
              {phase === 'done' && (
                <p className="text-sm text-gray-500">Returning to Settings…</p>
              )}
            </div>

            {error != null && (
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

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { initiateTikTokOAuth, initiateInstagramOAuth } from '@/utils/socialOAuth';

// Connect buttons for the teaser-posting platforms. Both funnel through the
// generic /social-oauth-callback page, so the toast only fires if the redirect
// itself fails to start.
//
// The client id/key are baked into the bundle at build time. When one is absent
// the button is disabled with a pointer to the setup guide rather than failing
// after the owner has already committed to the flow.
const SocialOAuthButtons: React.FC = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<'tiktok' | 'instagram' | null>(null);
  const tiktokConfigured = !!import.meta.env.VITE_TIKTOK_CLIENT_KEY;
  const instagramConfigured = !!import.meta.env.VITE_INSTAGRAM_CLIENT_ID;

  const run = async (platform: 'tiktok' | 'instagram', start: () => void | Promise<void>) => {
    setPending(platform);
    try {
      await start();
    } catch (error) {
      console.error(`Error initiating ${platform} OAuth:`, error);
      toast({
        title: 'Error',
        description: `Failed to start the ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} connection. Please try again.`,
        variant: 'destructive',
      });
      setPending(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => run('tiktok', initiateTikTokOAuth)}
          disabled={pending !== null || !tiktokConfigured}
          className="bg-black hover:bg-black/90"
          title={
            tiktokConfigured
              ? undefined
              : 'Not configured in this build. Set VITE_TIKTOK_CLIENT_KEY and redeploy the frontend.'
          }
        >
          {pending === 'tiktok' ? 'Redirecting…' : 'Connect TikTok'}
        </Button>
        <Button
          onClick={() => run('instagram', initiateInstagramOAuth)}
          disabled={pending !== null || !instagramConfigured}
          className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90"
          title={
            instagramConfigured
              ? undefined
              : 'Not configured in this build. Set VITE_INSTAGRAM_CLIENT_ID and redeploy the frontend.'
          }
        >
          {pending === 'instagram' ? 'Redirecting…' : 'Connect Instagram'}
        </Button>
      </div>
      {!tiktokConfigured || !instagramConfigured ? (
        <p className="text-[11px] text-amber-600">
          {!tiktokConfigured && !instagramConfigured
            ? 'Neither provider is wired into this build yet —'
            : !instagramConfigured
              ? 'Instagram is not wired into this build yet —'
              : 'TikTok is not wired into this build yet —'}{' '}
          see “Set up social posting” below for the exact values, then redeploy the frontend.
        </p>
      ) : null}
    </div>
  );
};

export default SocialOAuthButtons;

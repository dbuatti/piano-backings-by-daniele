import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { initiateTikTokOAuth, initiateInstagramOAuth } from '@/utils/socialOAuth';

// Connect buttons for the teaser-posting platforms. Both funnel through the
// generic /social-oauth-callback page, so the toast only fires if the redirect
// itself fails to start.
const SocialOAuthButtons: React.FC = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<'tiktok' | 'instagram' | null>(null);

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
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => run('tiktok', initiateTikTokOAuth)}
        disabled={pending !== null}
        className="bg-black hover:bg-black/90"
      >
        {pending === 'tiktok' ? 'Redirecting…' : 'Connect TikTok'}
      </Button>
      <Button
        onClick={() => run('instagram', initiateInstagramOAuth)}
        disabled={pending !== null}
        className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90"
      >
        {pending === 'instagram' ? 'Redirecting…' : 'Connect Instagram'}
      </Button>
    </div>
  );
};

export default SocialOAuthButtons;

import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
// import { supabase } from '@/integrations/supabase/client'; // Removed as it was unused
import { Mail } from 'lucide-react';

interface GmailOAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

const GmailOAuthButton: React.FC<GmailOAuthButtonProps> = ({ onSuccess, onError, className }) => {
  const { toast } = useToast();

  const handleGmailOAuth = async () => {
    toast({
      title: "Feature Disabled",
      description: "Gmail OAuth is currently disabled for security reasons. Please contact support for manual email generation.",
      variant: "destructive",
    });
    if (onError) onError("Gmail OAuth is disabled.");
    return;

    // try {
    //   const { data, error } = await supabase.auth.signInWithOAuth({
    //     provider: 'google',
    //     options: {
    //       scopes: 'https://www.googleapis.com/auth/gmail.send',
    //       redirectTo: `${window.location.origin}/gmail-oauth-callback`,
    //     },
    //   });

    //   if (error) {
    //     throw error;
    //   }

    //   if (onSuccess) onSuccess();
    // } catch (error: any) {
    //   console.error('Gmail OAuth error:', error);
    //   toast({
    //     title: "Gmail OAuth Failed",
    //     description: error.message || "Could not initiate Gmail OAuth process.",
    //     variant: "destructive",
    //   });
    //   if (onError) onError(error.message || "Unknown error");
    // }
  };

  return (
    <Button
      onClick={handleGmailOAuth}
      className={className}
      variant="outline"
    >
      <Mail className="mr-2 h-4 w-4" />
      Connect Gmail to Send
    </Button>
  );
};

export default GmailOAuthButton;
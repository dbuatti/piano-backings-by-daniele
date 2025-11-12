import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail } from 'lucide-react';

interface GmailOAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  buttonText?: string;
  redirectPath?: string; // Optional redirect path
}

const GmailOAuthButton: React.FC<GmailOAuthButtonProps> = ({
  onSuccess,
  onError,
  buttonText = "Connect Gmail",
  redirectPath = "/admin", // Default redirect to admin dashboard
}) => {
  const [loading, setLoading] = useState(false);

  const handleConnectGmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.send',
          redirectTo: window.location.origin + '/gmail-oauth-callback',
        },
      });

      if (error) {
        showError(`Gmail connection failed: ${error.message}`);
        onError?.(error);
      }
    } catch (error: any) {
      showError(`Gmail connection failed: ${error.message}`);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleConnectGmail}
      disabled={loading}
      className="w-full bg-red-500 hover:bg-red-600 text-white"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

export default GmailOAuthButton;
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

const GmailOAuthButton: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const initiateOAuth = async () => {
    setIsLoading(true);
    
    try {
      // Use environment variables directly
      const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
      const redirectUri = `${window.location.origin}/gmail-oauth-callback`;
      
      // Check if client ID is available
      if (!clientId) {
        console.error('GMAIL_CLIENT_ID is not set in environment variables');
        toast({
          title: "Configuration Error",
          description: "Gmail OAuth is not properly configured. Please check environment variables.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Scopes required for sending emails
      const scopes = 'https://www.googleapis.com/auth/gmail.send';
      
      // Construct the authorization URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code` +
        `&access_type=offline` +
        `&prompt=consent`;
      
      // Redirect the user to Google's authorization server
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Gmail OAuth. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={initiateOAuth} 
      disabled={isLoading}
      className="bg-blue-500 hover:bg-blue-600"
    >
      {isLoading ? 'Redirecting...' : 'Connect Gmail Account'}
    </Button>
  );
};

export default GmailOAuthButton;
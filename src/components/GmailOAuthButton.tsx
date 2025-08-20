import React from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';

const GmailOAuthButton: React.FC = () => {
  const initiateOAuth = async () => {
    // Get current session for auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('You must be logged in to connect Gmail');
      return;
    }
    
    // Replace these with your actual client ID and redirect URI
    const clientId = Deno.env.get("GMAIL_CLIENT_ID") || "YOUR_GMAIL_CLIENT_ID";
    const redirectUri = `${window.location.origin}/gmail-oauth-callback`;
    
    // Scopes required for sending emails
    const scopes = 'https://www.googleapis.com/auth/gmail.send';
    
    // Construct the authorization URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&access_type=offline` + // This ensures we get a refresh token
      `&prompt=consent`; // This ensures we get a refresh token every time (for demo purposes)
    
    // Redirect the user to Google's authorization server
    window.location.href = authUrl;
  };

  return (
    <Button onClick={initiateOAuth} className="bg-blue-500 hover:bg-blue-600">
      Connect Gmail Account
    </Button>
  );
};

export default GmailOAuthButton;
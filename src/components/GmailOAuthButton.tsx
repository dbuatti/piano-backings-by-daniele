import React from 'react';
import { Button } from "@/components/ui/button";

const GmailOAuthButton: React.FC = () => {
  const initiateOAuth = () => {
    // Use environment variables directly or fallback to a default
    // In a production app, these should be properly configured in your environment
    const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID || "YOUR_GMAIL_CLIENT_ID";
    const redirectUri = `${window.location.origin}/gmail-oauth-callback`;
    
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
  };

  return (
    <Button onClick={initiateOAuth} className="bg-blue-500 hover:bg-blue-600">
      Connect Gmail Account
    </Button>
  );
};

export default GmailOAuthButton;
import React from 'react';
import { Button } from "@/components/ui/button";

const GmailOAuthButton: React.FC = () => {
  const initiateOAuth = () => {
    // Use environment variables directly
    const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
    const redirectUri = `${window.location.origin}/gmail-oauth-callback`;
    
    // Check if client ID is available
    if (!clientId) {
      console.error('GMAIL_CLIENT_ID is not set in environment variables');
      alert('Gmail OAuth is not properly configured. Please check environment variables.');
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
  };

  return (
    <Button onClick={initiateOAuth} className="bg-blue-500 hover:bg-blue-600">
      Connect Gmail Account
    </Button>
  );
};

export default GmailOAuthButton;
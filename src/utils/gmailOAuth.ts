// src/utils/gmailOAuth.ts
export const initiateOAuth = () => {
  // This function will redirect the user to Google's authorization server
  // You'll need to replace these with your actual client ID and redirect URI
  const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  const redirectUri = `${window.location.origin}/gmail-oauth-callback`;
  
  // Check if client ID is available
  if (!clientId) {
    console.error('GMAIL_CLIENT_ID is not set in environment variables');
    alert('Gmail OAuth is not properly configured. Please check environment variables.');
    return;
  }
  
  // Scopes required for sending emails and uploading YouTube videos as the channel.
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/youtube.upload',
  ].join(' ');

  // The channel account whose videos we publish as. Kept in sync with the
  // YT_ACCOUNT_EMAIL secret used by the get-youtube-token edge function.
  const loginHint =
    import.meta.env.VITE_YOUTUBE_CHANNEL_EMAIL || 'pianobackingsbydaniele@gmail.com';

  // Construct the authorization URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&response_type=code` +
    `&access_type=offline` + // This ensures we get a refresh token
    `&login_hint=${encodeURIComponent(loginHint)}` + // Default to the channel account
    `&prompt=consent`; // This ensures we get a refresh token every time (for demo purposes)
  
  // Redirect the user to Google's authorization server
  window.location.href = authUrl;
};

export default { initiateOAuth };
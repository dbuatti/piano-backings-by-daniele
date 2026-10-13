// src/utils/gmailOAuth.ts
const REDIRECT_PATH = '/gmail-oauth-callback';
const CHANNEL_EMAIL =
  import.meta.env.VITE_YOUTUBE_CHANNEL_EMAIL || 'pianobackingsbydaniele@gmail.com';

const buildAuthUrl = (opts: {
  clientId: string;
  scopes: string;
  state: 'gmail' | 'youtube';
  loginHint?: string;
}) => {
  const redirectUri = `${window.location.origin}${REDIRECT_PATH}`;
  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(opts.clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(opts.scopes)}` +
    `&response_type=code` +
    `&access_type=offline` + // ensures a refresh token
    (opts.loginHint ? `&login_hint=${encodeURIComponent(opts.loginHint)}` : '') +
    `&state=${opts.state}` +
    `&prompt=consent` // forces a refresh token to be returned
  );
};

// Connect the Gmail mailbox used for outgoing email (gmail.send only).
export const initiateOAuth = () => {
  const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  if (!clientId) {
    console.error('GMAIL_CLIENT_ID is not set in environment variables');
    alert('Gmail OAuth is not properly configured. Please check environment variables.');
    return;
  }

  window.location.href = buildAuthUrl({
    clientId,
    scopes: 'https://www.googleapis.com/auth/gmail.send',
    state: 'gmail',
    loginHint: CHANNEL_EMAIL,
  });
};

// Connect the YouTube channel (a Brand Account). No login hint so Google lets
// you pick the channel identity, and only the upload scope is requested.
export const initiateYouTubeOAuth = () => {
  const clientId =
    import.meta.env.VITE_YOUTUBE_CLIENT_ID || import.meta.env.VITE_GMAIL_CLIENT_ID;
  if (!clientId) {
    console.error('VITE_YOUTUBE_CLIENT_ID / VITE_GMAIL_CLIENT_ID is not set');
    alert('YouTube OAuth is not properly configured. Please check environment variables.');
    return;
  }

  window.location.href = buildAuthUrl({
    clientId,
    // upload (publishing), readonly (status checks / channel name) and
    // force-ssl (updating an uploaded video's metadata after an edit), because
    // read/update endpoints reject upload-only tokens.
    scopes:
      'https://www.googleapis.com/auth/youtube.upload ' +
      'https://www.googleapis.com/auth/youtube.readonly ' +
      'https://www.googleapis.com/auth/youtube.force-ssl',
    state: 'youtube',
  });
};

export default { initiateOAuth, initiateYouTubeOAuth };

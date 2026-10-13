// Client-side start of the TikTok / Instagram OAuth flows, mirroring
// gmailOAuth.ts: build the provider authorize URL and redirect the browser; the
// code is exchanged by the social-oauth-callback edge function once the provider
// returns to /social-oauth-callback.
//
// TikTok requires PKCE, so the code_verifier is generated here, stashed in
// sessionStorage, and handed to the callback page to forward to the function.

const REDIRECT_PATH = '/social-oauth-callback';
const PKCE_STORAGE_KEY = 'tiktok_pkce_verifier';

const redirectUri = () => `${window.location.origin}${REDIRECT_PATH}`;

function base64Url(bytes: Uint8Array): string {
  let str = '';
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makePkce(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(64);
  crypto.getRandomValues(random);
  const verifier = base64Url(random).slice(0, 64);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

// Read (and clear) the PKCE verifier for the code currently in the URL.
export const takeStoredPkceVerifier = (): string | null => {
  const verifier = sessionStorage.getItem(PKCE_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
  return verifier;
};

export const initiateTikTokOAuth = async () => {
  const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    console.error('VITE_TIKTOK_CLIENT_KEY is not set');
    alert('TikTok OAuth is not properly configured. Please check environment variables.');
    return;
  }
  const { verifier, challenge } = await makePkce();
  sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: 'user.info.basic,video.publish',
    response_type: 'code',
    redirect_uri: redirectUri(),
    state: 'tiktok',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
};

// Instagram Business Login. Reels publish + basic profile read.
export const initiateInstagramOAuth = () => {
  const clientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID;
  if (!clientId) {
    console.error('VITE_INSTAGRAM_CLIENT_ID is not set');
    alert('Instagram OAuth is not properly configured. Please check environment variables.');
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_content_publish',
    state: 'instagram',
  });
  window.location.href = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
};

export default { initiateTikTokOAuth, initiateInstagramOAuth };

// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Setup CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Updated Pricing Logic ---
const TIER_PRICES: Record<string, number> = {
  'note-bash': 15.00,
  'audition-ready': 30.00,
  'full-song': 50.00,
};

const ADDITIONAL_SERVICE_COSTS: Record<string, number> = {
  'rush-order': 15.00,
  'complex-songs': 10.00,
  'additional-edits': 5.00,
  'exclusive-ownership': 40.00,
};

function calculateRequestCost(request: any): number {
  let totalCost = 0;
  
  const tier = request.trackType || 'audition-ready'; 
  const baseCost = TIER_PRICES[tier] || TIER_PRICES['audition-ready'];
  totalCost += baseCost;

  if (request.additionalServices && Array.isArray(request.additionalServices)) {
    request.additionalServices.forEach((service: string) => {
      const cost = ADDITIONAL_SERVICE_COSTS[service] || 0;
      totalCost += cost;
    });
  }
  
  const roundedTotalCost = Math.round(totalCost / 5) * 5;
  return parseFloat(roundedTotalCost.toFixed(2));
}

// --- Sanitization and Validation Helpers ---
function sanitizeString(input: string | null | undefined, maxLength: number = 500): string | null {
  if (input === null || input === undefined) return null;
  let sanitized = input.trim().replace(/<[^>]*>?/gm, '');
  if (sanitized.length > maxLength) sanitized = sanitized.substring(0, maxLength);
  return sanitized.length > 0 ? sanitized : null;
}

function validateEmail(email: string | null | undefined): string {
  const sanitizedEmail = sanitizeString(email, 255);
  if (!sanitizedEmail) throw new Error('Email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) throw new Error('Invalid email format.');
  return sanitizedEmail;
}

function validateUrl(url: string | null | undefined): string | null {
  const sanitizedUrl = sanitizeString(url, 2048);
  if (!sanitizedUrl) return null;
  try { new URL(sanitizedUrl); return sanitizedUrl; } catch { return null; }
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function createOrderSummary(formData: any): string {
  return `
PIANO BACKING TRACK REQUEST SUMMARY
==================================

ORDER DETAILS
-------------
Date: ${new Date().toLocaleString()}
Request ID: ${Date.now()}

CLIENT INFORMATION
------------------
Name: ${formData.name || 'Not provided'}
Email: ${formData.email || 'Not provided'}

TRACK INFORMATION
-----------------
Song Title: ${formData.songTitle}
Musical/Artist: ${formData.musicalOrArtist}
Song Key: ${formData.songKey || 'Not specified'}
Tier: ${formData.trackType?.replace('-', ' ') || 'Audition Ready'}

ADDITIONAL SERVICES
------------------
${formData.additionalServices && formData.additionalServices.length > 0 
  ? formData.additionalServices.map((service: string) => `- ${service.replace('-', ' ')}`).join('\n') 
  : 'None requested'}

SPECIAL REQUESTS
----------------
${formData.specialRequests || 'None provided'}
  `.trim();
}

// --- Dropbox Automation ---
interface DropboxConfig {
  dropboxAppKey: string;
  dropboxAppSecret: string;
  dropboxRefreshToken: string;
  defaultDropboxParentFolder: string;
  templateFilePath: string;
  rapidApiKey: string;
}

async function getDropboxAccessToken(config: DropboxConfig): Promise<string> {
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.dropboxRefreshToken,
      client_id: config.dropboxAppKey,
      client_secret: config.dropboxAppSecret
    })
  });
  if (!response.ok) throw new Error(`Dropbox token refresh failed`);
  const tokenData = await response.json();
  return tokenData.access_token;
}

async function handleDropboxAutomation(config: DropboxConfig, sanitizedData: any, userName: string) {
  const result = { dropboxFolderId: null, dropboxFolderPath: null, templateCopySuccess: false, youtubeMp3Success: false, pdfUploadSuccess: false, voiceMemoUploadSuccess: false, summaryUploadSuccess: false };
  let dropboxAccessToken;
  try { dropboxAccessToken = await getDropboxAccessToken(config); } catch (e) { return result; }

  const firstName = userName ? userName.split(' ')[0] : 'anonymous';
  const dateString = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const folderName = `${dateString} ${sanitizedData.songTitle} prepared for ${firstName}`;
  
  let parentFolder = config.defaultDropboxParentFolder;
  if (sanitizedData.trackType === 'note-bash') parentFolder += '/00. NOTE BASH';
  else if (sanitizedData.trackType === 'audition-ready') parentFolder += '/00. AUDITION CUTS';
  else if (sanitizedData.trackType === 'full-song') parentFolder += '/00. FULL VERSIONS';

  const fullPath = `${parentFolder}/${folderName}`;
  result.dropboxFolderPath = fullPath;

  try {
    const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${dropboxAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath, autorename: true })
    });
    if (res.ok) {
      const data = await res.json();
      result.dropboxFolderId = data.metadata.id;
    }
  } catch (e) { return result; }

  if (!result.dropboxFolderId) return result;

  // Copy Template
  try {
    await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${dropboxAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_path: config.templateFilePath, to_path: `${fullPath}/${sanitizedData.songTitle}.logicx`, autorename: true })
    });
    result.templateCopySuccess = true;
  } catch (e) {}

  // Upload Summary
  try {
    const summary = createOrderSummary(sanitizedData);
    await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${dropboxAccessToken}`, 'Dropbox-API-Arg': JSON.stringify({ path: `${fullPath}/order_summary.txt`, mode: 'add' }), 'Content-Type': 'application/octet-stream' },
      body: new TextEncoder().encode(summary)
    });
    result.summaryUploadSuccess = true;
  } catch (e) {}

  return result;
}

const EMAIL_SIGNATURE_HTML = `
<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
  <p style="margin: 0; font-weight: bold; color: #F538BC; font-size: 18px;">Daniele Buatti</p>
  <p style="margin: 5px 0 0 0; color: #1C0357; font-size: 14px;">Piano Backings by Daniele</p>
</div>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const defaultSenderEmail = Deno.env.get('GMAIL_USER') || 'pianobackingsbydaniele@gmail.com';
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'daniele.buatti@gmail.com';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let userId = null, userEmail = null, userName = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) { userId = user.id; userEmail = user.email; userName = user.user_metadata?.full_name; }
    }
    
    const { formData } = await req.json();
    const sanitizedData = {
      email: validateEmail(formData.email),
      name: sanitizeString(formData.name, 100),
      songTitle: sanitizeString(formData.songTitle, 255),
      musicalOrArtist: sanitizeString(formData.musicalOrArtist, 255),
      songKey: sanitizeString(formData.songKey, 50),
      trackType: sanitizeString(formData.trackType, 50),
      additionalServices: Array.isArray(formData.additionalServices) ? formData.additionalServices : [],
      specialRequests: sanitizeString(formData.specialRequests, 1000),
    };
    
    const calculatedCost = calculateRequestCost(sanitizedData);
    const dropboxConfig = {
      dropboxAppKey: Deno.env.get('DROPBOX_APP_KEY') || '',
      dropboxAppSecret: Deno.env.get('DROPBOX_APP_SECRET') || '',
      dropboxRefreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN') || '',
      defaultDropboxParentFolder: Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS',
      templateFilePath: Deno.env.get('LOGIC_TEMPLATE_PATH') || '/_Template/X from Y prepared for Z.logicx',
      rapidApiKey: Deno.env.get('RAPIDAPI_KEY') || '',
    };

    const dropboxResult = await handleDropboxAutomation(dropboxConfig, sanitizedData, userName || sanitizedData.name || sanitizedData.email);
    const guestAccessToken = crypto.randomUUID();
    
    const { data: insertedRecords, error: insertError } = await supabaseAdmin
      .from('backing_requests')
      .insert([{
        user_id: userId,
        email: sanitizedData.email,
        name: sanitizedData.name,
        song_title: sanitizedData.songTitle,
        musical_or_artist: sanitizedData.musicalOrArtist,
        song_key: sanitizedData.songKey,
        track_type: sanitizedData.trackType,
        additional_services: sanitizedData.additionalServices,
        special_requests: sanitizedData.specialRequests,
        dropbox_folder_id: dropboxResult.dropboxFolderId,
        guest_access_token: guestAccessToken,
        cost: calculatedCost,
      }])
      .select();

    if (insertError) throw insertError;

    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1C0357;">Request Received!</h2>
        <p>Hi ${userName || 'there'},</p>
        <p>Thanks for your request for <strong>"${sanitizedData.songTitle}"</strong>.</p>
        <p>I'll review your materials and send a quote within 24-48 hours.</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `;
    
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({ to: sanitizedData.email, subject: `Confirmation: Backing Track Request`, html: clientEmailHtml, senderEmail: defaultSenderEmail })
    });

    return new Response(JSON.stringify({ message: 'Success', ...dropboxResult }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
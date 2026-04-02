// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRACK_TYPE_BASE_COSTS: Record<string, number> = {
  'quick': 5.00,
  'one-take': 10.00,
  'full-production': 15.00,
};

const BACKING_TYPE_MODIFIERS: Record<string, number> = {
  'note-bash': 5.00,
  'audition-cut': 10.00,
  'full-song': 15.00,
};

const ADDITIONAL_SERVICE_COSTS: Record<string, number> = {
  'rush-order': 10,
  'complex-songs': 7,
  'additional-edits': 5,
  'exclusive-ownership': 40,
};

function calculateRequestCost(request: any): number {
  let totalCost = 0;
  const trackType = request.trackType || 'full-production'; 
  const baseCost = TRACK_TYPE_BASE_COSTS[trackType] || TRACK_TYPE_BASE_COSTS['full-production'];
  totalCost += baseCost;

  const backingTypes = Array.isArray(request.backingType) ? request.backingType : (request.backingType ? [request.backingType] : []);
  let maxModifier = 0;
  if (backingTypes.length > 0) {
    backingTypes.forEach((type: string) => {
      const modifier = BACKING_TYPE_MODIFIERS[type] || 0;
      if (modifier > maxModifier) maxModifier = modifier;
    });
    totalCost += maxModifier;
  }

  if (request.additionalServices && Array.isArray(request.additionalServices)) {
    request.additionalServices.forEach((service: string) => {
      const cost = ADDITIONAL_SERVICE_COSTS[service] || 0;
      totalCost += cost;
    });
  }
  
  const roundedTotalCost = Math.round(totalCost / 5) * 5;
  return parseFloat(roundedTotalCost.toFixed(2));
}

function sanitizeString(input: string | null | undefined, maxLength: number = 500): string | null {
  if (input === null || input === undefined) return null;
  let sanitized = input.trim().replace(/<[^>]*>?/gm, '');
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : (sanitized.length > 0 ? sanitized : null);
}

function validateEmail(email: string | null | undefined): string {
  const sanitizedEmail = sanitizeString(email, 255);
  if (!sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) throw new Error('Invalid email.');
  return sanitizedEmail;
}

function validateUrl(url: string | null | undefined): string | null {
  const sanitizedUrl = sanitizeString(url, 2048);
  if (!sanitizedUrl) return null;
  try { new URL(sanitizedUrl); return sanitizedUrl; } catch { return null; }
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
}

function createOrderSummary(formData: any): string {
  return `
PIANO BACKING TRACK REQUEST SUMMARY
==================================
Date: ${new Date().toLocaleString()}
Client: ${formData.name || 'N/A'} (${formData.email})
Song: ${formData.songTitle} by ${formData.musicalOrArtist}
Key: ${formData.songKey || 'N/A'} ${formData.differentKey === 'Yes' ? `-> ${formData.keyForTrack}` : ''}
Type: ${formData.trackType} | ${Array.isArray(formData.backingType) ? formData.backingType.join(', ') : formData.backingType}
Due: ${formData.deliveryDate}
Notes: ${formData.specialRequests || 'None'}
`.trim();
}

async function getDropboxAccessToken(config: any): Promise<string> {
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.dropboxRefreshToken, client_id: config.dropboxAppKey, client_secret: config.dropboxAppSecret })
  });
  if (!response.ok) throw new Error('Dropbox token refresh failed');
  return (await response.json()).access_token;
}

async function handleDropboxAutomation(config: any, sanitizedData: any, userName: string): Promise<any> {
  const result: any = { dropboxFolderId: null, templateCopySuccess: false };
  let token;
  try { token = await getDropboxAccessToken(config); } catch (e) { return result; }

  const firstName = userName.split(' ')[0];
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const folderName = `${dateStr} ${sanitizedData.songTitle} prepared for ${firstName}`;
  
  let parentFolder = config.defaultDropboxParentFolder;
  if (sanitizedData.trackType === 'quick' || sanitizedData.trackType === 'one-take') {
    parentFolder += '/00. ROUGH CUTS';
  } else {
    const map: any = { 'full-song': '00. FULL VERSIONS', 'audition-cut': '00. AUDITION CUTS', 'note-bash': '00. NOTE BASH' };
    const primary = Array.isArray(sanitizedData.backingType) ? sanitizedData.backingType[0] : sanitizedData.backingType;
    parentFolder += `/${map[primary] || '00. GENERAL'}`;
  }

  const fullPath = `${parentFolder}/${folderName}`;
  const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: fullPath, autorename: true })
  });
  
  if (res.ok) {
    const data = await res.json();
    result.dropboxFolderId = data.metadata.id;
    // Copy template
    await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_path: config.templateFilePath, to_path: `${fullPath}/${sanitizedData.songTitle}.logicx` })
    });
    result.templateCopySuccess = true;
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) userId = user.id;
    }
    
    const { formData } = await req.json();
    const sanitizedData = {
      ...formData,
      email: validateEmail(formData.email),
      youtubeLink: validateUrl(formData.youtubeLink),
      voiceMemo: validateUrl(formData.voiceMemo),
    };
    
    const cost = calculateRequestCost(sanitizedData);
    const dropboxResult = await handleDropboxAutomation({
      dropboxAppKey: Deno.env.get('DROPBOX_APP_KEY'),
      dropboxAppSecret: Deno.env.get('DROPBOX_APP_SECRET'),
      dropboxRefreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
      defaultDropboxParentFolder: Deno.env.get('DROPBOX_PARENT_FOLDER'),
      templateFilePath: Deno.env.get('LOGIC_TEMPLATE_PATH'),
    }, sanitizedData, sanitizedData.name || sanitizedData.email);
    
    const { data, error } = await supabaseAdmin.from('backing_requests').insert([{
      user_id: userId,
      ...sanitizedData,
      cost,
      dropbox_folder_id: dropboxResult.dropboxFolderId,
      guest_access_token: crypto.randomUUID(),
    }]).select();

    if (error) throw error;
    return new Response(JSON.stringify({ message: 'Success', id: data[0].id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
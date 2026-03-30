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

// --- Pricing Logic ---
const TRACK_TYPE_BASE_COSTS: Record<string, number> = {
  'quick': 5.00,
  'one-take': 10.00,
  'polished': 15.00,
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
  
  const trackType = request.trackType || 'polished'; 
  const baseCost = TRACK_TYPE_BASE_COSTS[trackType] || TRACK_TYPE_BASE_COSTS['polished'];
  totalCost += baseCost;

  const backingTypes = Array.isArray(request.backingType) ? request.backingType : (request.backingType ? [request.backingType] : []);
  
  let maxModifier = 0;

  if (backingTypes.length > 0) {
    backingTypes.forEach((type: string) => {
      const modifier = BACKING_TYPE_MODIFIERS[type] || 0;
      if (modifier > maxModifier) {
        maxModifier = modifier;
      }
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

// --- Sanitization and Validation Helpers ---
function sanitizeString(input: string | null | undefined, maxLength: number = 500): string | null {
  if (input === null || input === undefined) return null;
  
  let sanitized = input.trim();
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.length > 0 ? sanitized : null;
}

function validateEmail(email: string | null | undefined): string {
  const sanitizedEmail = sanitizeString(email, 255);
  if (!sanitizedEmail) throw new Error('Email is required.');
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    throw new Error('Invalid email format.');
  }
  return sanitizedEmail;
}

function validateUrl(url: string | null | undefined): string | null {
  const sanitizedUrl = sanitizeString(url, 2048);
  if (!sanitizedUrl) return null;
  
  try {
    new URL(sanitizedUrl);
    return sanitizedUrl;
  } catch {
    return null;
  }
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getFileExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastDotIndex = pathname.lastIndexOf('.');
    return lastDotIndex !== -1 ? pathname.substring(lastDotIndex + 1) : 'audio';
  } catch (error) {
    return 'audio';
  }
}

function createOrderSummary(formData: any): string {
  const summary = `
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
Phone: ${formData.phone || 'Not provided'}

TRACK INFORMATION
-----------------
Song Title: ${formData.songTitle}
Musical/Artist: ${formData.musicalOrArtist}
Song Key: ${formData.songKey || 'Not specified'}
Different Key Required: ${formData.differentKey || 'No'}
${formData.differentKey === 'Yes' ? `Requested Key: ${formData.keyForTrack || 'Not specified'}` : ''}

REFERENCES
----------
YouTube Link: ${formData.youtubeLink || 'Not provided'}
Voice Memo Link: ${formData.voiceMemo || 'Not provided'}
Additional Links: ${formData.additionalLinks || 'Not provided'}

ORDER DETAILS
-------------
Track Purpose: ${formData.trackPurpose?.replace('-', ' ') || 'Not specified'}
Backing Type(s): ${Array.isArray(formData.backingType) ? formData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') : (formData.backingType?.replace('-', ' ') || 'Not specified')}
Delivery Date: ${formData.deliveryDate || 'Not specified'}
Category: ${formData.category || 'Not specified'}
Track Type: ${formData.trackType || 'Not specified'}

ADDITIONAL SERVICES
------------------
${formData.additionalServices && formData.additionalServices.length > 0 
  ? formData.additionalServices.map((service: string) => `- ${service.replace('-', ' ')}`).join('\n') 
  : 'None requested'}

SPECIAL REQUESTS
----------------
${formData.specialRequests || 'None provided'}

SHEET MUSIC
------------
${formData.sheetMusicUrls && formData.sheetMusicUrls.length > 0 ? `${formData.sheetMusicUrls.length} file(s) uploaded.` : 'No sheet music provided.'}

VOICE MEMO
----------
${formData.voiceMemoUrls && formData.voiceMemoUrls.length > 0 ? `${formData.voiceMemoUrls.length} file(s) uploaded.` : 'No voice memo file provided.'}

---
This summary was automatically generated for Piano Backings by Daniele.
  `.trim();
  
  return summary;
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

interface DropboxResult {
  dropboxFolderId: string | null;
  dropboxError: string | null;
  dropboxFolderPath: string | null;
  templateCopySuccess: boolean;
  templateCopyError: string | null;
  youtubeMp3Success: boolean;
  youtubeMp3Error: string | null;
  pdfUploadSuccess: boolean;
  pdfUploadError: string | null;
  voiceMemoUploadSuccess: boolean;
  voiceMemoUploadError: string | null;
  summaryUploadSuccess: boolean;
  summaryUploadError: string | null;
  parentFolderUsed: string;
  folderNameUsed: string;
  logicFileNameUsed: string;
}

async function getDropboxAccessToken(config: DropboxConfig): Promise<string> {
  if (!config.dropboxAppKey || !config.dropboxAppSecret || !config.dropboxRefreshToken) {
    throw new Error('Dropbox credentials not fully configured in Supabase secrets');
  }
  
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.dropboxRefreshToken,
      client_id: config.dropboxAppKey,
      client_secret: config.dropboxAppSecret
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox token refresh failed: ${response.status} - ${errorText}`);
  }
  
  const tokenData = await response.json();
  return tokenData.access_token;
}

async function createFallbackReferenceFile(dropboxAccessToken: string, dropboxFolderPath: string, youtubeLink: string, mp3FileName: string) {
  try {
    const textContent = `YouTube Reference Link: ${youtubeLink}\n\nThis file was created as a reference for the requested track.\nYou can manually download the audio from the link above if needed.`;
    const textEncoder = new TextEncoder();
    const textBuffer = textEncoder.encode(textContent);
    
    const textUploadPath = `${dropboxFolderPath}/${mp3FileName.replace('.mp3', '_reference.txt')}`;
    
    const dropboxUploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxAccessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: textUploadPath,
          mode: 'add',
          autorename: true,
          mute: false
        }),
        'Content-Type': 'application/octet-stream'
      },
      body: textBuffer
    });
    
    if (!dropboxUploadResponse.ok) {
      const errorText = await dropboxUploadResponse.text();
      throw new Error(`Dropbox reference text upload error: ${dropboxUploadResponse.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error creating fallback reference file:', error);
    throw error;
  }
}

async function handleDropboxAutomation(config: DropboxConfig, sanitizedData: any, userName: string): Promise<DropboxResult> {
  const result: DropboxResult = {
    dropboxFolderId: null,
    dropboxError: null,
    dropboxFolderPath: null,
    templateCopySuccess: false,
    templateCopyError: null,
    youtubeMp3Success: false,
    youtubeMp3Error: null,
    pdfUploadSuccess: false,
    pdfUploadError: null,
    voiceMemoUploadSuccess: false,
    voiceMemoUploadError: null,
    summaryUploadSuccess: false,
    summaryUploadError: null,
    parentFolderUsed: '',
    folderNameUsed: '',
    logicFileNameUsed: '',
  };

  let dropboxAccessToken: string | null = null;
  
  if (!config.dropboxAppKey || !config.dropboxAppSecret || !config.dropboxRefreshToken) {
    result.dropboxError = 'Dropbox credentials not configured';
    return result;
  }

  try {
    dropboxAccessToken = await getDropboxAccessToken(config);
  } catch (error: any) {
    result.dropboxError = `Dropbox token error: ${error.message}`;
    return result;
  }

  const firstName = userName ? userName.split(' ')[0] : 'anonymous';
  const today = new Date();
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
  const folderName = `${dateString} ${sanitizedData.songTitle} from ${sanitizedData.musicalOrArtist} prepared for ${firstName}`;
  const logicFileName = `${sanitizedData.songTitle} from ${sanitizedData.musicalOrArtist} for ${firstName}`;
  
  result.folderNameUsed = folderName;
  result.logicFileNameUsed = logicFileName;

  let parentFolder = config.defaultDropboxParentFolder;
  
  if (sanitizedData.trackType === 'quick' || sanitizedData.trackType === 'one-take') {
    parentFolder = `${config.defaultDropboxParentFolder}/00. ROUGH CUTS`;
  } else {
    const backingTypeMap: Record<string, string> = {
      'full-song': '00. FULL VERSIONS',
      'audition-cut': '00. AUDITION CUTS',
      'note-bash': '00. NOTE BASH'
    };
    
    const primaryBackingType = Array.isArray(sanitizedData.backingType) && sanitizedData.backingType.length > 0 
      ? sanitizedData.backingType[0] 
      : null;

    if (primaryBackingType && backingTypeMap[primaryBackingType]) {
      parentFolder = `${config.defaultDropboxParentFolder}/${backingTypeMap[primaryBackingType]}`;
    } else {
      parentFolder = `${config.defaultDropboxParentFolder}/00. GENERAL`;
    }
  }
  
  result.parentFolderUsed = parentFolder;
  
  const normalizedParentFolder = parentFolder.startsWith('/') 
    ? parentFolder.replace(/\/$/, '') 
    : `/${parentFolder}`.replace(/\/$/, '');
    
  const fullPath = `${normalizedParentFolder}/${folderName}`;
  result.dropboxFolderPath = fullPath;

  // 1. Create Folder
  try {
    const dropboxResponse = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: fullPath,
        autorename: true
      })
    });
    
    if (dropboxResponse.ok) {
      const dropboxData = await dropboxResponse.json();
      result.dropboxFolderId = dropboxData.metadata.id;
    } else {
      const errorText = await dropboxResponse.text();
      result.dropboxError = `Dropbox API error (create folder): ${dropboxResponse.status} - ${errorText}`;
    }
  } catch (error: any) {
    result.dropboxError = `Dropbox folder creation error: ${error.message}`;
    return result;
  }

  if (!result.dropboxFolderId) return result;

  // 2. Copy Logic Pro X template file
  if (config.templateFilePath) {
    try {
      const newFileName = `${logicFileName}.logicx`;
      const copyPath = `${result.dropboxFolderPath}/${newFileName}`;
      
      const copyResponse = await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropboxAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_path: config.templateFilePath,
          to_path: copyPath,
          autorename: true
        })
      });
      
      if (copyResponse.ok) {
        result.templateCopySuccess = true;
      }
    } catch (error: any) {
      result.templateCopyError = `Template copy error: ${error.message}`;
    }
  }

  // 3. YouTube MP3
  if (sanitizedData.youtubeLink) {
    try {
      const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
      const uploadPath = `${result.dropboxFolderPath}/${mp3FileName}`;
      const videoId = extractYouTubeId(sanitizedData.youtubeLink);
      
      if (videoId && config.rapidApiKey) {
        const downloadUrl = `https://cloud-api-youtube-downloader.p.rapidapi.com/youtube/v1/mux?id=${videoId}&audioOnly=true&audioFormat=mp3`;
        const downloadResponse = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'cloud-api-youtube-downloader.p.rapidapi.com',
            'x-rapidapi-key': config.rapidApiKey
          }
        });
        
        if (downloadResponse.ok) {
          const downloadData = await downloadResponse.json();
          if (downloadData.url) {
            const mp3Response = await fetch(downloadData.url);
            if (mp3Response.ok) {
              const mp3Buffer = await mp3Response.arrayBuffer();
              await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${dropboxAccessToken}`,
                  'Dropbox-API-Arg': JSON.stringify({ path: uploadPath, mode: 'add', autorename: true }),
                  'Content-Type': 'application/octet-stream'
                },
                body: mp3Buffer
              });
              result.youtubeMp3Success = true;
            }
          }
        }
      } else {
        await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
        result.youtubeMp3Success = true;
      }
    } catch (apiError: any) {
      console.error('YouTube MP3 error:', apiError);
    }
  }

  // 4. Upload PDFs (Multiple)
  if (sanitizedData.sheetMusicUrls && sanitizedData.sheetMusicUrls.length > 0) {
    try {
      for (const item of sanitizedData.sheetMusicUrls) {
        const pdfResponse = await fetch(item.url);
        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const fileName = item.caption || `sheet_music_${Date.now()}.pdf`;
          const uploadPath = `${result.dropboxFolderPath}/${fileName}`;
          
          await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dropboxAccessToken}`,
              'Dropbox-API-Arg': JSON.stringify({ path: uploadPath, mode: 'add', autorename: true }),
              'Content-Type': 'application/octet-stream'
            },
            body: pdfBuffer
          });
        }
      }
      result.pdfUploadSuccess = true;
    } catch (error: any) {
      result.pdfUploadError = error.message;
    }
  }

  // 5. Upload Voice Memos (Multiple)
  if (sanitizedData.voiceMemoUrls && sanitizedData.voiceMemoUrls.length > 0) {
    try {
      for (const item of sanitizedData.voiceMemoUrls) {
        const vmResponse = await fetch(item.url);
        if (vmResponse.ok) {
          const vmBuffer = await vmResponse.arrayBuffer();
          const fileName = item.caption || `voice_memo_${Date.now()}.mp3`;
          const uploadPath = `${result.dropboxFolderPath}/${fileName}`;
          
          await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dropboxAccessToken}`,
              'Dropbox-API-Arg': JSON.stringify({ path: uploadPath, mode: 'add', autorename: true }),
              'Content-Type': 'application/octet-stream'
            },
            body: vmBuffer
          });
        }
      }
      result.voiceMemoUploadSuccess = true;
    } catch (error: any) {
      result.voiceMemoUploadError = error.message;
    }
  }

  // 6. Order Summary
  try {
    const summaryContent = createOrderSummary(sanitizedData);
    const textEncoder = new TextEncoder();
    const summaryBuffer = textEncoder.encode(summaryContent);
    const summaryFileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_order_summary.txt`;
    const uploadPath = `${result.dropboxFolderPath}/${summaryFileName}`;
    
    await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxAccessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: uploadPath, mode: 'add', autorename: true }),
        'Content-Type': 'application/octet-stream'
      },
      body: summaryBuffer
    });
    result.summaryUploadSuccess = true;
  } catch (error: any) {
    result.summaryUploadError = error.message;
  }

  return result;
}

const EMAIL_SIGNATURE_HTML = `
<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td valign="top" style="padding-right: 20px; width: 150px;">
        <p style="margin: 0; font-weight: bold; color: #F538BC; font-size: 18px;">Daniele Buatti</p>
        <p style="margin: 5px 0 0 0; color: #1C0357; font-size: 14px;">Piano Backings by Daniele</p>
      </td>
      <td valign="top" style="border-left: 2px solid #F538BC; padding-left: 20px;">
        <p style="margin: 0; color: #333;"><strong style="color: #1C0357;">M</strong> 0424 174 067</p>
        <p style="margin: 5px 0; color: #333;"><strong style="color: #1C0357;">E</strong> <a href="mailto:pianobackingsbydaniele@gmail.com" style="color: #007bff; text-decoration: none;">pianobackingsbydaniele@gmail.com</a></p>
        <p style="margin: 10px 0 5px 0; font-weight: bold; color: #1C0357;">Piano Backings By Daniele</p>
        <p style="margin: 0;"><a href="https://www.facebook.com/PianoBackingsbyDaniele/" target="_blank" style="color: #007bff; text-decoration: none;">www.facebook.com/PianoBackingsbyDaniele/</a></p>
      </td>
    </tr>
  </table>
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
    const adminNotificationRecipients = [ADMIN_EMAIL, 'pianobackingsbydaniele@gmail.com'].filter((email, i, arr) => arr.indexOf(email) === i);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let userId = null;
    let userEmail = null;
    let userName = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (!userError && user) {
          userId = user.id;
          userEmail = user.email;
          userName = user.user_metadata?.full_name || null;
        }
      } catch (authError) {
        console.warn('Auth failed:', authError.message);
      }
    }
    
    const { formData } = await req.json();
    if (!formData) throw new Error('Missing formData.');
    
    const sanitizedData = {
      email: validateEmail(formData.email),
      name: sanitizeString(formData.name, 100),
      phone: sanitizeString(formData.phone, 50),
      songTitle: sanitizeString(formData.songTitle, 255),
      musicalOrArtist: sanitizeString(formData.musicalOrArtist, 255),
      songKey: sanitizeString(formData.songKey, 50),
      differentKey: sanitizeString(formData.differentKey, 50),
      keyForTrack: sanitizeString(formData.keyForTrack, 50),
      youtubeLink: validateUrl(formData.youtubeLink),
      voiceMemo: validateUrl(formData.voiceMemo),
      sheetMusicUrls: formData.sheetMusicUrls || [],
      voiceMemoUrls: formData.voiceMemoUrls || [],
      trackPurpose: sanitizeString(formData.trackPurpose, 50),
      backingType: Array.isArray(formData.backingType) ? formData.backingType.map((t: string) => sanitizeString(t, 50)).filter(Boolean) : [],
      deliveryDate: sanitizeString(formData.deliveryDate, 50),
      additionalServices: Array.isArray(formData.additionalServices) ? formData.additionalServices.map((s: string) => sanitizeString(s, 50)).filter(Boolean) : [],
      specialRequests: sanitizeString(formData.specialRequests, 1000),
      category: sanitizeString(formData.category, 50),
      trackType: sanitizeString(formData.trackType, 50),
      additionalLinks: validateUrl(formData.additionalLinks),
    };
    
    userEmail = userEmail || sanitizedData.email;
    userName = userName || sanitizedData.name;
    
    const calculatedCost = calculateRequestCost({
      trackType: sanitizedData.trackType,
      backingType: sanitizedData.backingType,
      additionalServices: sanitizedData.additionalServices,
    });

    const dropboxConfig = {
      dropboxAppKey: Deno.env.get('DROPBOX_APP_KEY') || '',
      dropboxAppSecret: Deno.env.get('DROPBOX_APP_SECRET') || '',
      dropboxRefreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN') || '',
      defaultDropboxParentFolder: Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS',
      templateFilePath: Deno.env.get('LOGIC_TEMPLATE_PATH') || '/_Template/X from Y prepared for Z.logicx',
      rapidApiKey: Deno.env.get('RAPIDAPI_KEY') || '',
    };

    const dropboxResult = await handleDropboxAutomation(dropboxConfig, sanitizedData, userName || sanitizedData.email);
    
    const guestAccessToken = crypto.randomUUID();
    
    const { data: insertedRecords, error: insertError } = await supabaseAdmin
      .from('backing_requests')
      .insert([
        {
          user_id: userId,
          email: sanitizedData.email,
          name: sanitizedData.name,
          phone: sanitizedData.phone,
          song_title: sanitizedData.songTitle,
          musical_or_artist: sanitizedData.musicalOrArtist,
          song_key: sanitizedData.songKey,
          different_key: sanitizedData.differentKey,
          key_for_track: sanitizedData.keyForTrack,
          youtube_link: sanitizedData.youtubeLink,
          voice_memo: sanitizedData.voiceMemo,
          sheet_music_urls: sanitizedData.sheetMusicUrls,
          voice_memo_urls: sanitizedData.voiceMemoUrls,
          track_purpose: sanitizedData.trackPurpose,
          backing_type: sanitizedData.backingType,
          delivery_date: sanitizedData.deliveryDate,
          additional_services: sanitizedData.additionalServices,
          special_requests: sanitizedData.specialRequests,
          dropbox_folder_id: dropboxResult.dropboxFolderId,
          track_type: sanitizedData.trackType,
          additional_links: sanitizedData.additionalLinks,
          guest_access_token: guestAccessToken,
          cost: calculatedCost,
          category: sanitizedData.category,
        }
      ])
      .select();

    if (insertError) throw insertError;

    const newRequestData = insertedRecords[0];
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const clientTrackViewLink = `${siteUrl}/track/${newRequestData.id}?token=${guestAccessToken}`;
    const clientFirstName = userName ? userName.split(' ')[0] : 'there';

    // Client Email
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #1C0357;">Request Submitted Successfully!</h2>
        <p>Hi ${clientFirstName},</p>
        <p>Thank you for submitting your custom piano backing track request for <strong>"${sanitizedData.songTitle}"</strong>.</p>
        <p>We have received your request and will be in touch within <strong>24-48 hours</strong> with a quote.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${clientTrackViewLink}" style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Your Track Details
          </a>
        </p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `;
    
    await fetch(sendEmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({ to: sanitizedData.email, subject: `Confirmation: Backing Track Request for "${sanitizedData.songTitle}"`, html: clientEmailHtml, senderEmail: defaultSenderEmail })
    });

    // Admin Email
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1C0357;">New Backing Track Request</h2>
        <p><strong>Song:</strong> ${sanitizedData.songTitle}<br><strong>Musical/Artist:</strong> ${sanitizedData.musicalOrArtist}<br><strong>Requested by:</strong> ${userName || 'N/A'} (${sanitizedData.email})</p>
        <div style="margin: 20px 0;">
          <a href="${siteUrl}/admin/request/${newRequestData.id}" style="background-color: #1C0357; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Request Details
          </a>
        </div>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `;
    
    await fetch(sendEmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({ to: adminNotificationRecipients, subject: `New Backing Track Request: ${sanitizedData.songTitle}`, html: adminEmailHtml, senderEmail: defaultSenderEmail })
    });

    return new Response(JSON.stringify({ message: 'Request submitted successfully', ...dropboxResult }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
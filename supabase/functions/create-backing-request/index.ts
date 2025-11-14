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

// --- Pricing Logic (inlined from utils.ts) ---
const TRACK_TYPE_BASE_COSTS: Record<string, number> = {
  'quick': 5.00,
  'one-take': 15.00,
  'polished': 25.00,
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

// --- Sanitization and Validation Helpers (inlined from utils.ts) ---
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
${formData.sheetMusicUrl ? 'Sheet music has been uploaded and will be included in this folder.' : 'No sheet music provided.'}

VOICE MEMO
----------
${formData.voiceMemoFileUrl ? 'Voice memo has been uploaded and will be included in this folder.' : 'No voice memo file provided.'}

---
This summary was automatically generated for Piano Backings by Daniele.
  `.trim();
  
  return summary;
}

// --- Dropbox Automation (inlined from dropbox.ts) ---
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
  summaryUploadError: boolean;
  parentFolderUsed: string;
  folderNameUsed: string;
  logicFileNameUsed: string;
}

// Function to get a new access token using the refresh token
async function getDropboxAccessToken(config: DropboxConfig): Promise<string> {
  console.log('Attempting to get Dropbox access token...');
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
  console.log('Dropbox access token obtained.');
  return tokenData.access_token;
}

// Helper function to create a fallback reference file
async function createFallbackReferenceFile(dropboxAccessToken: string, dropboxFolderPath: string, youtubeLink: string, mp3FileName: string) {
  console.log('Creating fallback reference file...');
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
    console.log('Fallback reference file created successfully.');
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
    summaryUploadError: false,
    parentFolderUsed: '',
    folderNameUsed: '',
    logicFileNameUsed: '',
  };

  let dropboxAccessToken: string | null = null;
  
  if (!config.dropboxAppKey || !config.dropboxAppSecret || !config.dropboxRefreshToken) {
    result.dropboxError = 'Dropbox credentials not configured';
    console.error(result.dropboxError);
    return result;
  }

  try {
    dropboxAccessToken = await getDropboxAccessToken(config);
  } catch (error: any) {
    result.dropboxError = `Dropbox token error: ${error.message}`;
    console.error(result.dropboxError);
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
  console.log('Attempting to create Dropbox folder:', fullPath);
  try {
    const parentCheckResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: normalizedParentFolder
      })
    });
    
    if (parentCheckResponse.ok) {
      console.log('Parent folder exists.');
    } else {
      const parentErrorText = await parentCheckResponse.text();
      throw new Error(`Parent folder check failed: ${parentCheckResponse.status} - ${parentErrorText}`);
    }
    
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
      console.log('Dropbox folder created successfully with ID:', result.dropboxFolderId);
    } else {
      const errorText = await dropboxResponse.text();
      // Handle conflict (folder already exists)
      try {
        const errorObj = JSON.parse(errorText);
        if (errorObj.error_summary && errorObj.error_summary.includes('path/conflict')) {
          console.warn('Dropbox folder already exists, attempting to retrieve metadata.');
          const listResponse = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dropboxAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              path: fullPath
            })
          });
          
          if (listResponse.ok) {
            const listData = await listResponse.json();
            result.dropboxFolderId = listData.id;
            console.log('Retrieved existing Dropbox folder ID:', result.dropboxFolderId);
          } else {
            result.dropboxError = `Dropbox API error (conflict, metadata fetch failed): ${listResponse.status} - ${await listResponse.text()}`;
            console.error(result.dropboxError);
          }
        } else {
          result.dropboxError = `Dropbox API error (create folder): ${dropboxResponse.status} - ${errorText}`;
          console.error(result.dropboxError);
        }
      } catch (parseError) {
        result.dropboxError = `Dropbox API error (create folder, parse error): ${dropboxResponse.status} - ${errorText}`;
        console.error(result.dropboxError);
      }
    }
  } catch (error: any) {
    result.dropboxError = `Dropbox folder creation error: ${error.message}`;
    console.error(result.dropboxError);
    return result;
  }

  if (!result.dropboxFolderId) {
    console.error('No Dropbox folder ID available, skipping subsequent Dropbox operations.');
    return result;
  }

  // 2. Copy Logic Pro X template file
  console.log('Attempting to copy Logic Pro X template...');
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
        console.log('Logic Pro X template copied successfully.');
      } else {
        const errorText = await copyResponse.text();
        result.templateCopyError = `Dropbox template copy error: ${copyResponse.status} - ${errorText}`;
        console.error(result.templateCopyError);
      }
    } catch (error: any) {
      result.templateCopyError = `Template copy error: ${error.message}`;
      console.error(result.templateCopyError);
    }
  } else {
    console.log('No templateFilePath configured, skipping template copy.');
  }

  // 3. Download YouTube video as MP3 and upload to Dropbox
  console.log('Attempting YouTube MP3 download and upload...');
  if (sanitizedData.youtubeLink) {
    try {
      const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
      const uploadPath = `${result.dropboxFolderPath}/${mp3FileName}`;
      
      const videoId = extractYouTubeId(sanitizedData.youtubeLink);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      
      if (!config.rapidApiKey) {
        console.warn('RapidAPI key not configured, creating fallback reference text file for YouTube link.');
        await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
        result.youtubeMp3Success = true;
        result.youtubeMp3Error = 'Created reference text file with YouTube link instead of MP3 due to missing API key';
      } else {
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
              
              const dropboxUploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${dropboxAccessToken}`,
                  'Dropbox-API-Arg': JSON.stringify({
                    path: uploadPath,
                    mode: 'add',
                    autorename: true,
                    mute: false
                  }),
                  'Content-Type': 'application/octet-stream'
                },
                body: mp3Buffer
              });
              
              if (dropboxUploadResponse.ok) {
                result.youtubeMp3Success = true;
                console.log('YouTube MP3 uploaded successfully.');
              } else {
                const errorText = await dropboxUploadResponse.text();
                result.youtubeMp3Error = `Dropbox MP3 upload error: ${dropboxUploadResponse.status} - ${errorText}`;
                console.error(result.youtubeMp3Error);
                await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
                result.youtubeMp3Success = true;
                result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
              }
            } else {
              result.youtubeMp3Error = `Failed to download MP3: ${mp3Response.status}`;
              console.error(result.youtubeMp3Error);
              await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
              result.youtubeMp3Success = true;
              result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
            }
          } else {
            result.youtubeMp3Error = 'No download URL found in API response';
            console.error(result.youtubeMp3Error);
            await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
            result.youtubeMp3Success = true;
            result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
          }
        } else {
          const errorText = await downloadResponse.text();
          if (downloadResponse.status === 403) {
            result.youtubeMp3Error = 'RapidAPI subscription error - Please check your API key and subscription to the YouTube Downloader API';
          } else {
            result.youtubeMp3Error = `Download API error: ${downloadResponse.status} - ${errorText}`;
          }
          console.error(result.youtubeMp3Error);
          await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
          result.youtubeMp3Success = true;
          result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
        }
      }
    } catch (apiError: any) {
      result.youtubeMp3Error = `YouTube MP3 processing error: ${apiError.message}`;
      console.error(result.youtubeMp3Error);
      try {
        const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
        await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
        result.youtubeMp3Success = true;
        result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
      } catch (fallbackError: any) {
        console.error('Error creating YouTube fallback reference file:', fallbackError);
      }
    }
  } else {
    console.log('No YouTube link provided, skipping YouTube MP3 download.');
  }

  // 4. Upload PDF to Dropbox folder if provided
  console.log('Attempting PDF upload...');
  if (sanitizedData.sheetMusicUrl) {
    try {
      const pdfResponse = await fetch(sanitizedData.sheetMusicUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF from Supabase: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfFileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_sheet_music.pdf`;
      
      const uploadPath = `${result.dropboxFolderPath}/${pdfFileName}`;
      
      const dropboxUploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropboxAccessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: uploadPath,
            mode: 'add',
            autorename: true,
            mute: false
          }),
          'Content-Type': 'application/octet-stream'
        },
        body: pdfBuffer
      });
      
      if (dropboxUploadResponse.ok) {
        result.pdfUploadSuccess = true;
        console.log('PDF uploaded successfully.');
      } else {
        const errorText = await dropboxUploadResponse.text();
        result.pdfUploadError = `Dropbox PDF upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        console.error(result.pdfUploadError);
      }
    } catch (error: any) {
      result.pdfUploadError = `PDF upload error: ${error.message}`;
      console.error(result.pdfUploadError);
    }
  } else {
    console.log('No sheetMusicUrl provided, skipping PDF upload.');
  }

  // 5. Upload voice memo to Dropbox folder if provided
  console.log('Attempting voice memo upload...');
  if (sanitizedData.voiceMemoFileUrl) {
    try {
      const voiceMemoResponse = await fetch(sanitizedData.voiceMemoFileUrl);
      if (!voiceMemoResponse.ok) {
        throw new Error(`Failed to download voice memo from Supabase: ${voiceMemoResponse.status} ${voiceMemoResponse.statusText}`);
      }
      
      const voiceMemoBuffer = await voiceMemoResponse.arrayBuffer();
      const fileExt = getFileExtensionFromUrl(sanitizedData.voiceMemoFileUrl);
      const voiceMemoFileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_voice_memo.${fileExt}`;
      
      const uploadPath = `${result.dropboxFolderPath}/${voiceMemoFileName}`;
      
      const dropboxUploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropboxAccessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: uploadPath,
            mode: 'add',
            autorename: true,
            mute: false
          }),
          'Content-Type': 'application/octet-stream'
        },
        body: voiceMemoBuffer
      });
      
      if (dropboxUploadResponse.ok) {
        result.voiceMemoUploadSuccess = true;
        console.log('Voice memo uploaded successfully.');
      } else {
        const errorText = await dropboxUploadResponse.text();
        result.voiceMemoUploadError = `Dropbox voice memo upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        console.error(result.voiceMemoUploadError);
      }
    } catch (error: any) {
      result.voiceMemoUploadError = `Voice memo upload error: ${error.message}`;
      console.error(result.voiceMemoUploadError);
    }
  } else {
    console.log('No voiceMemoFileUrl provided, skipping voice memo upload.');
  }

  // 6. Create and upload order summary text file
  console.log('Creating and uploading order summary...');
  try {
    const summaryContent = createOrderSummary(sanitizedData);
    const textEncoder = new TextEncoder();
    const summaryBuffer = textEncoder.encode(summaryContent);
    
    const summaryFileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_order_summary.txt`;
    const uploadPath = `${result.dropboxFolderPath}/${summaryFileName}`;
    
    const dropboxUploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxAccessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: uploadPath,
          mode: 'add',
          autorename: true,
          mute: false
        }),
        'Content-Type': 'application/octet-stream'
      },
      body: summaryBuffer
    });
    
    if (dropboxUploadResponse.ok) {
      result.summaryUploadSuccess = true;
      console.log('Order summary uploaded successfully.');
    } else {
      const errorText = await dropboxUploadResponse.text();
      result.summaryUploadError = `Dropbox order summary upload error: ${dropboxUploadResponse.status} - ${errorText}`;
      console.error(result.summaryError);
    }
  } catch (error: any) {
    result.summaryUploadError = `Order summary upload error: ${error.message}`;
    console.error(result.summaryError);
  }

  return result;
}

// HTML Email signature template (Defined locally for Deno compatibility)
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
        <div style="margin-top: 15px;">
          <a href="https://www.facebook.com/PianoBackingsbyDaniele/" target="_blank" style="display: inline-block; margin-right: 5px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/1200px-2021_Facebook_icon.svg.png" alt="Facebook" width="24" height="24" style="vertical-align: middle;">
          </a>
          <a href="https://www.youtube.com/@pianobackingsbydaniele" target="_blank" style="display: inline-block; margin-right: 5px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1200px-YouTube_full-color_icon_%282017%29.svg.png" alt="YouTube" width="24" height="24" style="vertical-align: middle;">
          </a>
          <a href="https://www.instagram.com/pianobackingsbydaniele/" target="_blank" style="display: inline-block;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/1200px-Instagram_logo_2017%29.svg.png" alt="Instagram" width="24" height="24" style="vertical-align: middle;">
          </a>
        </div>
      </td>
    </tr>
  </table>
</div>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Handle CORS preflight request
    return new Response(null, {
      status: 204, // No Content
      headers: corsHeaders,
    });
  }

  try {
    // --- 0. Setup Environment and Clients ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const defaultSenderEmail = Deno.env.get('GMAIL_USER') || 'pianobackingsbydaniele@gmail.com';
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'daniele.buatti@gmail.com'; // Get ADMIN_EMAIL
    const adminNotificationRecipients = [ADMIN_EMAIL, 'pianobackingsbydaniele@gmail.com'].filter((email, i, arr) => arr.indexOf(email) === i); // Ensure unique emails

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- 1. Authentication and User Info ---
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
        console.warn('Authentication failed for incoming request:', authError.message);
        // Ignore auth errors if the request is anonymous
      }
    }
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError: any) {
      const rawBody = await req.text();
      throw new Error(`Invalid JSON in request body: ${parseError.message}. Raw body: ${rawBody.substring(0, 200)}...`);
    }

    const { formData } = requestBody;
    if (!formData) {
      throw new Error('Missing formData in request body.');
    }
    
    // --- 2. Validate and Sanitize Inputs ---
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
      voiceMemoFileUrl: validateUrl(formData.voiceMemoFileUrl),
      sheetMusicUrl: validateUrl(formData.sheetMusicUrl),
      trackPurpose: sanitizeString(formData.trackPurpose, 50),
      backingType: Array.isArray(formData.backingType) ? formData.backingType.map((t: string) => sanitizeString(t, 50)).filter(Boolean) : [],
      deliveryDate: sanitizeString(formData.deliveryDate, 50),
      additionalServices: Array.isArray(formData.additionalServices) ? formData.additionalServices.map((s: string) => sanitizeString(s, 50)).filter(Boolean) : [],
      specialRequests: sanitizeString(formData.specialRequests, 1000),
      category: sanitizeString(formData.category, 50),
      trackType: sanitizeString(formData.trackType, 50),
      additionalLinks: validateUrl(formData.additionalLinks),
    };
    
    // Use sanitized data for user info if not obtained from auth
    userEmail = userEmail || sanitizedData.email;
    userName = userName || sanitizedData.name;
    
    // --- 3. Calculate Cost ---
    const calculatedCost = calculateRequestCost({
      trackType: sanitizedData.trackType,
      backingType: sanitizedData.backingType,
      additionalServices: sanitizedData.additionalServices,
    });

    // --- 4. Dropbox Automation ---
    const dropboxConfig = {
      dropboxAppKey: Deno.env.get('DROPBOX_APP_KEY') || '',
      dropboxAppSecret: Deno.env.get('DROPBOX_APP_SECRET') || '',
      dropboxRefreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN') || '',
      defaultDropboxParentFolder: Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS',
      templateFilePath: Deno.env.get('LOGIC_TEMPLATE_PATH') || '/_Template/X from Y prepared for Z.logicx',
      rapidApiKey: Deno.env.get('RAPIDAPI_KEY') || '',
    };

    const dropboxResult = await handleDropboxAutomation(dropboxConfig, sanitizedData, userName || sanitizedData.email);
    
    // --- 5. Database Insertion ---
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
          voice_memo: sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl,
          sheet_music_url: sanitizedData.sheetMusicUrl,
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

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw insertError;
    }

    const newRequestData = insertedRecords && insertedRecords.length > 0 ? insertedRecords[0] : null;
    if (!newRequestData) {
        throw new Error('Failed to insert backing request into database: No data returned after insert.');
    }

    // --- 6. Email Notifications ---
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const clientTrackViewLink = `${siteUrl}/track/${newRequestData.id}?token=${guestAccessToken}`;
    const clientFirstName = userName ? userName.split(' ')[0] : 'there';

    // --- Client Confirmation Email ---
    const clientEmailSubject = `Confirmation: Your Backing Track Request for "${sanitizedData.songTitle}"`;
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #1C0357;">Request Submitted Successfully!</h2>
        
        <p>Hi ${clientFirstName},</p>
        <p>Thank you for submitting your custom piano backing track request for <strong>"${sanitizedData.songTitle}"</strong> from <strong>${sanitizedData.musicalOrArtist}</strong>.</p>
        <p>We have received your request and will be in touch within <strong>24-48 hours</strong> with a quote and estimated delivery date.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1C0357;">Your Request Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Song Title:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.songTitle}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Musical/Artist:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.musicalOrArtist}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.category?.replace('-', ' ') || 'N/A'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Track Type:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.trackType?.replace('-', ' ') || 'N/A'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Sheet Music Key:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.songKey || 'N/A'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Different Key Required:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.differentKey || 'No'}</td></tr>
            ${sanitizedData.differentKey === 'Yes' ? `<tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Requested Key:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.keyForTrack || 'N/A'}</td></tr>` : ''}
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Backing Type(s):</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') || 'Not specified'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Delivery Date:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.deliveryDate ? new Date(sanitizedData.deliveryDate).toLocaleDateString() : 'Not specified'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Additional Services:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.additionalServices.map((service: string) => service.replace('-', ' ')).join(', ') || 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">YouTube Link:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.youtubeLink ? `<a href="${sanitizedData.youtubeLink}">${sanitizedData.youtubeLink}</a>` : 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Additional Links:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.additionalLinks ? `<a href="${sanitizedData.additionalLinks}">${sanitizedData.additionalLinks}</a>` : 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Voice Memo Link:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl ? `<a href="${sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl}">${sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl}</a>` : 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Sheet Music:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.sheetMusicUrl ? `<a href="${sanitizedData.sheetMusicUrl}">View Sheet Music</a>` : 'Not provided'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone Number:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: bold;">Special Requests:</td><td style="padding: 5px 0;">${sanitizedData.specialRequests || 'None'}</td></tr>
          </table>
        </div>

        <p style="margin-top: 20px;">You can view the status of your request and any updates on your personal track page:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${clientTrackViewLink}" 
             style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Your Track Details
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">
          This email was automatically generated by Piano Backings by Daniele.
        </p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `;
    
    try {
      console.log('Sending client confirmation email...');
      await fetch(sendEmailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: sanitizedData.email,
          subject: clientEmailSubject,
          html: clientEmailHtml,
          senderEmail: defaultSenderEmail
        })
      });
      console.log('Client confirmation email sent successfully.');
    } catch (emailError: any) {
      console.error('Failed to send client confirmation email:', emailError);
      // Log notification failure to database
      await supabaseAdmin
        .from('notifications')
        .insert([
          {
            recipient: sanitizedData.email,
            sender: defaultSenderEmail,
            subject: clientEmailSubject,
            content: clientEmailHtml,
            status: 'failed',
            type: 'client_confirmation',
            error_message: emailError.message
          }
        ]);
    }

    // --- Admin Notification Email ---
    const adminEmailSubject = `New Backing Track Request: ${sanitizedData.songTitle}`;
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1C0357;">New Backing Track Request</h2>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1C0357;">Request Details</h3>
          
          <div style="margin-bottom: 10px;">
            <strong>Song:</strong> ${sanitizedData.songTitle}<br>
            <strong>Musical/Artist:</strong> ${sanitizedData.musicalOrArtist}<br>
            <strong>Requested by:</strong> ${userName || 'N/A'} (${sanitizedData.email})<br>
            ${sanitizedData.phone ? `<strong>Phone:</strong> ${sanitizedData.phone}<br>` : ''}
            <strong>Submitted:</strong> ${new Date().toLocaleString()}
          </div>
          
          <div style="margin-bottom: 10px;">
            <strong>Backing Type(s):</strong> ${sanitizedData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') || 'Not specified'}<br>
            <strong>Track Purpose:</strong> ${sanitizedData.trackPurpose?.replace('-', ' ') || 'Not specified'}<br>
            ${sanitizedData.deliveryDate ? `<strong>Delivery Date:</strong> ${new Date(sanitizedData.deliveryDate).toLocaleDateString()}<br>` : ''}
          </div>
          
          ${sanitizedData.additionalServices && sanitizedData.additionalServices.length > 0 ? `
            <div style="margin-bottom: 10px;">
              <strong>Additional Services:</strong><br>
              <ul style="margin: 5px 0; padding-left: 20px;">
                ${sanitizedData.additionalServices.map((service: string) => `<li>${service.replace('-', ' ')}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${sanitizedData.specialRequests ? `
            <div style="margin-bottom: 10px;">
              <strong>Special Requests:</strong><br>
              <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 3px;">${sanitizedData.specialRequests}</p>
            </div>
          ` : ''}

          ${sanitizedData.additionalLinks ? `
            <div style="margin-bottom: 10px;">
              <strong>Additional Links:</strong><br>
              <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 3px;"><a href="${sanitizedData.additionalLinks}">${sanitizedData.additionalLinks}</a></p>
            </div>
          ` : ''}
        </div>
        
        <div style="margin: 20px 0;">
          <a href="${siteUrl}/admin/request/${newRequestData.id}" 
             style="background-color: #1C0357; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Request Details
          </a>
        </div>
        
        <p style="font-size: 12px; color: #666;">
          This email was automatically generated by Piano Backings by Daniele.
        </p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `;
    
    try {
      console.log('Sending admin notification email...');
      // Send to all admin notification recipients
      await fetch(sendEmailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: adminNotificationRecipients, // Use the array of admin emails
          subject: adminEmailSubject,
          html: adminEmailHtml,
          senderEmail: defaultSenderEmail
        })
      });
      console.log('Admin notification email sent successfully.');
    } catch (emailError: any) {
      console.error('Failed to send admin notification email:', emailError);
      // Log notification failure to database
      await supabaseAdmin
        .from('notifications')
        .insert([
          {
            recipient: adminNotificationRecipients.join(', '), // Store all recipients
            sender: defaultSenderEmail,
            subject: adminEmailSubject,
            content: adminEmailHtml,
            status: 'failed',
            type: 'admin_notification',
            error_message: emailError.message
          }
        ]);
    }

    // --- 7. Final Response ---
    const responsePayload: any = { 
      message: 'Request submitted successfully',
      insertedRequest: newRequestData,
      guestAccessToken,
      calculatedCost,
      ...dropboxResult,
    };

    return new Response(
      JSON.stringify(responsePayload),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error in create-backing-request function (top level catch):', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});
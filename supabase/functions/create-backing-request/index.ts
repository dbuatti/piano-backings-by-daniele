// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Setup CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Pricing Logic (Duplicated from src/utils/pricing.ts for server-side validation) ---
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

function calculateRequestCost(request: any) {
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
// --- End Pricing Logic ---

// --- Sanitization and Validation Helpers ---
function sanitizeString(input: string | null | undefined, maxLength: number = 500): string | null {
  if (input === null || input === undefined) return null;
  
  // 1. Trim whitespace
  let sanitized = input.trim();
  
  // 2. Strip basic HTML tags (mitigate XSS)
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');
  
  // 3. Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.length > 0 ? sanitized : null;
}

function validateEmail(email: string | null | undefined): string {
  const sanitizedEmail = sanitizeString(email, 255);
  if (!sanitizedEmail) throw new Error('Email is required.');
  
  // Basic email format check (more robust checks should be done client-side/auth)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    throw new Error('Invalid email format.');
  }
  return sanitizedEmail;
}

function validateUrl(url: string | null | undefined): string | null {
  const sanitizedUrl = sanitizeString(url, 2048);
  if (!sanitizedUrl) return null;
  
  // Simple URL validation
  try {
    new URL(sanitizedUrl);
    return sanitizedUrl;
  } catch {
    return null; // Return null if it's not a valid URL
  }
}
// --- End Sanitization and Validation Helpers ---

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

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    // @ts-ignore
    const dropboxAppKey = Deno.env.get('DROPBOX_APP_KEY');
    // @ts-ignore
    const dropboxAppSecret = Deno.env.get('DROPBOX_APP_SECRET');
    // @ts-ignore
    const dropboxRefreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN');
    // @ts-ignore
    const defaultDropboxParentFolder = Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS';
    // @ts-ignore
    const templateFilePath = Deno.env.get('LOGIC_TEMPLATE_PATH') || '/_Template/X from Y prepared for Z.logicx';
    // @ts-ignore
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') || ''; // Use the secret key
    // @ts-ignore
    const defaultSenderEmail = Deno.env.get('GMAIL_USER') || 'pianobackingsbydaniele@gmail.com'; // Default sender email for notifications
    // @ts-ignore
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'; // Get site URL for client links
    
    // Create a Supabase client with service role key (has full permissions)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize user info variables
    let userId = null;
    let userEmail = null;
    let userName = null;

    // Try to get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        
        if (!userError && user) {
          userId = user.id;
          userEmail = user.email;
          userName = user.user_metadata?.full_name || null;
        } else {
          userId = null;
        }
      } catch (authError) {
        userId = null;
      }
    } else {
      userId = null;
    }
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      const rawBody = await req.text();
      throw new Error(`Invalid JSON in request body: ${parseError.message}. Raw body: ${rawBody.substring(0, 200)}...`);
    }

    const { formData } = requestBody;
    if (!formData) {
      throw new Error('Missing formData in request body.');
    }
    
    // 1. Validate and Sanitize Inputs
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
    
    // 2. Calculate Cost Server-Side
    const calculatedCost = calculateRequestCost({
      trackType: sanitizedData.trackType,
      backingType: sanitizedData.backingType,
      additionalServices: sanitizedData.additionalServices,
    });
    
    // Use sanitized data for user info if not obtained from auth
    userEmail = userEmail || sanitizedData.email;
    userName = userName || sanitizedData.name;
    
    const firstName = userName ? userName.split(' ')[0] : 'anonymous';
    
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const folderName = `${dateString} ${sanitizedData.songTitle} from ${sanitizedData.musicalOrArtist} prepared for ${firstName}`;
    
    const logicFileName = `${sanitizedData.songTitle} from ${sanitizedData.musicalOrArtist} for ${firstName}`;
    
    let parentFolder = defaultDropboxParentFolder;
    
    if (sanitizedData.trackType === 'quick' || sanitizedData.trackType === 'one-take') {
      parentFolder = `${defaultDropboxParentFolder}/00. ROUGH CUTS`;
    } else {
      const backingTypeMap: Record<string, string> = {
        'full-song': '00. FULL VERSIONS',
        'audition-cut': '00. AUDITION CUTS',
        'note-bash': '00. NOTE BASH'
      };
      
      const primaryBackingType = sanitizedData.backingType.length > 0 
        ? sanitizedData.backingType[0] 
        : null;

      if (primaryBackingType && backingTypeMap[primaryBackingType]) {
        parentFolder = `${defaultDropboxParentFolder}/${backingTypeMap[primaryBackingType]}`;
      } else {
        parentFolder = `${defaultDropboxParentFolder}/00. GENERAL`;
      }
    }
    
    // Function to get a new access token using the refresh token
    const getDropboxAccessToken = async () => {
      if (!dropboxAppKey || !dropboxAppSecret || !dropboxRefreshToken) {
        throw new Error('Dropbox credentials not fully configured in Supabase secrets');
      }
      
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: dropboxRefreshToken,
          client_id: dropboxAppKey,
          client_secret: dropboxAppSecret
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dropbox token refresh failed: ${response.status} - ${errorText}`);
      }
      
      const tokenData = await response.json();
      return tokenData.access_token;
    };
    
    // Create Dropbox folder
    let dropboxFolderId = null;
    let dropboxError = null;
    let dropboxFolderPath = null;
    let dropboxAccessToken = null;
    let parentFolderCheck = false;
    
    if (!dropboxAppKey || !dropboxAppSecret || !dropboxRefreshToken) {
      dropboxError = 'Dropbox credentials not configured';
    } else {
      try {
        dropboxAccessToken = await getDropboxAccessToken();
        
        const normalizedParentFolder = parentFolder.startsWith('/') 
          ? parentFolder.replace(/\/$/, '') 
          : `/${parentFolder}`.replace(/\/$/, '');
          
        const fullPath = `${normalizedParentFolder}/${folderName}`;
        dropboxFolderPath = fullPath;
        
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
          parentFolderCheck = true;
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
          dropboxFolderId = dropboxData.metadata.id;
        } else {
          const errorText = await dropboxResponse.text();
          try {
            const errorObj = JSON.parse(errorText);
            if (errorObj.error_summary && errorObj.error_summary.includes('path/conflict')) {
              const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
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
                if (listData.entries && listData.entries.length > 0) {
                  dropboxFolderId = listData.entries[0].id;
                }
              } else {
                const listErrorText = await listResponse.text();
                dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
              }
            } else {
              dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
            }
          } catch (parseError) {
            dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
          }
        }
      } catch (error) {
        dropboxError = `Dropbox folder creation error: ${error.message}`;
      }
    }
    
    // Copy Logic Pro X template file to the new folder with custom name
    let templateCopySuccess = false;
    let templateCopyError = null;
    
    if (dropboxFolderId && dropboxAccessToken && templateFilePath) {
      try {
        const fileInfoResponse = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dropboxAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: templateFilePath
          })
        });
        
        if (fileInfoResponse.ok) {
          const newFileName = `${logicFileName}.logicx`;
          const copyPath = `${dropboxFolderPath}/${newFileName}`;
          
          const copyResponse = await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dropboxAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from_path: templateFilePath,
              to_path: copyPath,
              autorename: true
            })
          });
          
          if (copyResponse.ok) {
            templateCopySuccess = true;
          } else {
            const errorText = await copyResponse.text();
            try {
              const errorObj = JSON.parse(errorText);
              if (errorObj.error_summary && errorObj.error_summary.includes('to/conflict')) {
                const copyWithRenameResponse = await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${dropboxAccessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    from_path: templateFilePath,
                    to_path: copyPath,
                    autorename: true
                  })
                });
                
                if (copyWithRenameResponse.ok) {
                  templateCopySuccess = true;
                } else {
                  const renameErrorText = await copyWithRenameResponse.text();
                  templateCopyError = `Dropbox template copy with autorename error: ${copyWithRenameResponse.status} - ${renameErrorText}`;
                }
              } else {
                templateCopyError = `Dropbox template copy error: ${copyResponse.status} - ${errorText}`;
              }
            } catch (parseError) {
              templateCopyError = `Dropbox template copy error: ${copyResponse.status} - ${errorText}`;
            }
          }
        } else {
          const errorText = await fileInfoResponse.text();
          templateCopyError = `Dropbox template file info error: ${fileInfoResponse.status} - ${errorText}`;
        }
      } catch (error) {
        templateCopyError = `Template copy error: ${error.message}`;
      }
    }
    
    // Download YouTube video as MP3 and upload to Dropbox
    let youtubeMp3Success = false;
    let youtubeMp3Error = null;
    
    if (dropboxFolderId && sanitizedData.youtubeLink && dropboxAccessToken) {
      try {
        const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
        const uploadPath = `${dropboxFolderPath}/${mp3FileName}`;
        
        const videoId = extractYouTubeId(sanitizedData.youtubeLink);
        if (!videoId) {
          throw new Error('Invalid YouTube URL');
        }
        
        if (!rapidApiKey) {
          youtubeMp3Error = 'RapidAPI key not configured in Supabase secrets';
          await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
          youtubeMp3Success = true;
          youtubeMp3Error = 'Created reference text file with YouTube link instead of MP3 due to missing API key';
        } else {
          const infoUrl = `https://cloud-api-youtube-downloader.p.rapidapi.com/youtube/v1/info?id=${videoId}`;
          
          const infoResponse = await fetch(infoUrl, {
            method: 'GET',
            headers: {
              'x-rapidapi-host': 'cloud-api-youtube-downloader.p.rapidapi.com',
              'x-rapidapi-key': rapidApiKey
            }
          });
          
          if (infoResponse.ok) {
            const downloadUrl = `https://cloud-api-youtube-downloader.p.rapidapi.com/youtube/v1/mux?id=${videoId}&audioOnly=true&audioFormat=mp3`;
            
            const downloadResponse = await fetch(downloadUrl, {
              method: 'GET',
              headers: {
                'x-rapidapi-host': 'cloud-api-youtube-downloader.p.rapidapi.com',
                'x-rapidapi-key': rapidApiKey
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
                    youtubeMp3Success = true;
                  } else {
                    const errorText = await dropboxUploadResponse.text();
                    youtubeMp3Error = `Dropbox MP3 upload error: ${dropboxUploadResponse.status} - ${errorText}`;
                    await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
                    youtubeMp3Success = true;
                    youtubeMp3Error += ' | Created reference text file with YouTube link instead of MP3 due to missing API key';
                  }
                } else {
                  youtubeMp3Error = `Failed to download MP3: ${mp3Response.status}`;
                  await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
                  youtubeMp3Success = true;
                  youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
                }
              } else {
                youtubeMp3Error = 'No download URL found in API response';
                await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
                youtubeMp3Success = true;
                youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
              }
            } else {
              const errorText = await downloadResponse.text();
              if (downloadResponse.status === 403) {
                youtubeMp3Error = 'RapidAPI subscription error - Please check your API key and subscription to the YouTube Downloader API';
              } else {
                youtubeMp3Error = `Download API error: ${downloadResponse.status} - ${errorText}`;
              }
              await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
              youtubeMp3Success = true;
              youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
            }
          } catch (apiError) {
            youtubeMp3Error = `API error: ${apiError.message}`;
            try {
              const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
              await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
              youtubeMp3Success = true;
              youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
            } catch (fallbackError) {
            }
          }
        }
      } catch (error) {
        youtubeMp3Error = `YouTube MP3 processing error: ${error.message}`;
        try {
          const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
          await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
          youtubeMp3Success = true;
          youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
        } catch (fallbackError) {
        }
      }
    }
    
    // Upload PDF to Dropbox folder if provided
    let pdfUploadSuccess = false;
    let pdfUploadError = null;
    
    if (dropboxFolderId && sanitizedData.sheetMusicUrl && dropboxAccessToken) {
      try {
        const pdfResponse = await fetch(sanitizedData.sheetMusicUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download PDF from Supabase: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfFileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_sheet_music.pdf`;
        
        const uploadPath = `${dropboxFolderPath}/${pdfFileName}`;
        
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
          pdfUploadSuccess = true;
        } else {
          const errorText = await dropboxUploadResponse.text();
          pdfUploadError = `Dropbox PDF upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        }
      } catch (error) {
        pdfUploadError = `PDF upload error: ${error.message}`;
      }
    }
    
    // Upload voice memo to Dropbox folder if provided
    let voiceMemoUploadSuccess = false;
    let voiceMemoUploadError = null;
    
    if (dropboxFolderId && sanitizedData.voiceMemoFileUrl && dropboxAccessToken) {
      try {
        const voiceMemoResponse = await fetch(sanitizedData.voiceMemoFileUrl);
        if (!voiceMemoResponse.ok) {
          throw new Error(`Failed to download voice memo from Supabase: ${voiceMemoResponse.status} ${voiceMemoResponse.statusText}`);
        }
        
        const voiceMemoBuffer = await voiceMemoResponse.arrayBuffer();
        const fileExt = getFileExtensionFromUrl(sanitizedData.voiceMemoFileUrl);
        const voiceMemoFileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_voice_memo.${fileExt}`;
        
        const uploadPath = `${dropboxFolderPath}/${voiceMemoFileName}`;
        
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
          voiceMemoUploadSuccess = true;
        } else {
          const errorText = await dropboxUploadResponse.text();
          voiceMemoUploadError = `Dropbox voice memo upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        }
      } catch (error) {
        voiceMemoUploadError = `Voice memo upload error: ${error.message}`;
      }
    }
    
    // Create and upload order summary text file
    let summaryUploadSuccess = false;
    let summaryUploadError = null;
    
    if (dropboxFolderId && dropboxAccessToken) {
      try {
        const summaryContent = createOrderSummary(sanitizedData);
        const textEncoder = new TextEncoder();
        const summaryBuffer = textEncoder.encode(summaryContent);
        
        const summaryFileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_order_summary.txt`;
        const uploadPath = `${dropboxFolderPath}/${summaryFileName}`;
        
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
          summaryUploadSuccess = true;
        } else {
          const errorText = await dropboxUploadResponse.text();
          summaryUploadError = `Dropbox order summary upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        }
      } catch (error) {
        summaryUploadError = `Order summary upload error: ${error.message}`;
      }
    }

    // Generate a unique guest access token
    const guestAccessToken = crypto.randomUUID();
    
    // Save to the database using the admin client
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
          voice_memo: sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl, // Use file URL if link is null
          sheet_music_url: sanitizedData.sheetMusicUrl,
          track_purpose: sanitizedData.trackPurpose,
          backing_type: sanitizedData.backingType,
          delivery_date: sanitizedData.deliveryDate,
          additional_services: sanitizedData.additionalServices,
          special_requests: sanitizedData.specialRequests,
          dropbox_folder_id: dropboxFolderId,
          track_type: sanitizedData.trackType,
          additional_links: sanitizedData.additionalLinks,
          guest_access_token: guestAccessToken,
          cost: calculatedCost, // Insert calculated cost
        }
      ])
      .select();

    if (insertError) {
      throw insertError;
    }

    const newRequestData = insertedRecords && insertedRecords.length > 0 ? insertedRecords[0] : null;
    if (!newRequestData) {
        throw new Error('Failed to insert backing request into database: No data returned after insert.');
    }

    // --- Send confirmation email to client ---
    try {
      const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
      
      const clientEmailSubject = `Confirmation: Your Backing Track Request for "${sanitizedData.songTitle}"`;
      const clientTrackViewLink = `${siteUrl}/track/${newRequestData.id}?token=${guestAccessToken}`;

      const clientEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h2 style="color: #1C0357;">Request Submitted Successfully!</h2>
          
          <p>Hi ${sanitizedData.name || 'there'},</p>
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
      
      const clientEmailResponse = await fetch(sendEmailUrl, {
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

      if (!clientEmailResponse.ok) {
        const emailErrorText = await clientEmailResponse.text();
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: sanitizedData.email,
              sender: 'system@pianobackings.com',
              subject: clientEmailSubject,
              content: clientEmailHtml,
              status: 'failed',
              type: 'client_confirmation_email',
              error_message: emailErrorText
            }
          ]);
      } else {
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: sanitizedData.email,
              sender: 'system@pianobackings.com',
              subject: clientEmailSubject,
              content: clientEmailHtml,
              status: 'sent',
              type: 'client_confirmation_email'
            }
          ]);
      }
    } catch (emailError) {
      try {
        const emailSubject = `Failed to send client confirmation for: ${sanitizedData.songTitle}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1C0357;">New Backing Track Request</h2>
            <p>A new backing track request has been submitted but email notification failed.</p>
            <p>Please check the system logs for more details.</p>
          </div>
        `;
        
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: sanitizedData.email,
              sender: 'system@pianobackings.com',
              subject: emailSubject,
              content: emailHtml,
              status: 'failed',
              type: 'client_confirmation_email',
              error_message: emailError.message
            }
          ]);
      } catch (dbError) {
      }
    }
    // --- End client confirmation email ---

    // Send email notification to admins
    try {
      const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
      
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
      
      const { data: recipients, error: fetchRecipientsError } = await supabaseAdmin
        .from('notification_recipients')
        .select('email');

      if (fetchRecipientsError) {
        const adminEmails = [defaultSenderEmail];
        for (const email of adminEmails) {
          try {
            const payloadToSend = {
              to: email,
              subject: adminEmailSubject,
              html: adminEmailHtml,
              senderEmail: defaultSenderEmail
            };
            
            const emailResponse = await fetch(sendEmailUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify(payloadToSend)
            });
            
            if (!emailResponse.ok) {
              const emailErrorText = await emailResponse.text();
              await supabaseAdmin
                .from('notifications')
                .insert([
                  {
                    recipient: email,
                    sender: 'system@pianobackings.com',
                    subject: adminEmailSubject,
                    content: adminEmailHtml,
                    status: 'failed',
                    type: 'email',
                    error_message: emailErrorText
                  }
                ]);
            } else {
              await supabaseAdmin
                .from('notifications')
                .insert([
                  {
                    recipient: email,
                    sender: 'system@pianobackings.com',
                    subject: adminEmailSubject,
                    content: adminEmailHtml,
                    status: 'sent',
                    type: 'email'
                  }
                ]);
            }
          } catch (emailError) {
            await supabaseAdmin
              .from('notifications')
              .insert([
                {
                  recipient: email,
                  sender: 'system@pianobackings.com',
                  subject: adminEmailSubject,
                  content: adminEmailHtml,
                  status: 'failed',
                  type: 'email',
                  error_message: emailError.message
                }
              ]);
          }
        }
      }
    } catch (emailError) {
      try {
        const emailSubject = `New Backing Track Request: ${sanitizedData.songTitle}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1C0357;">New Backing Track Request</h2>
            <p>A new backing track request has been submitted but email notification failed.</p>
            <p>Please check the system logs for more details.</p>
          </div>
        `;
        
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: defaultSenderEmail,
              sender: 'system@pianobackings.com',
              subject: emailSubject,
              content: emailHtml,
              status: 'failed',
              type: 'email',
              error_message: emailError.message
            }
          ]);
      } catch (dbError) {
      }
    }
    
    const responsePayload: any = { 
      message: 'Request submitted successfully',
      insertedRequest: newRequestData,
      dropboxFolderId,
      parentFolderUsed: parentFolder,
      folderNameUsed: folderName,
      firstNameUsed: firstName,
      trackTypeUsed: sanitizedData.trackType,
      templateCopySuccess,
      pdfUploadSuccess,
      youtubeMp3Success,
      dropboxFolderPath,
      logicFileNameUsed: logicFileName,
      parentFolderCheck,
      voiceMemoUploadSuccess,
      summaryUploadSuccess,
      guestAccessToken,
      calculatedCost, // Include calculated cost in response
    };
    
    if (dropboxError) {
      responsePayload.dropboxError = dropboxError;
    }
    
    if (templateCopyError) {
      responsePayload.templateCopyError = templateCopyError;
    }
    
    if (pdfUploadError) {
      responsePayload.pdfUploadError = pdfUploadError;
    }
    
    if (youtubeMp3Error) {
      responsePayload.youtubeMp3Error = youtubeMp3Error;
    }
    
    if (voiceMemoUploadError) {
      responsePayload.voiceMemoUploadError = voiceMemoUploadError;
    }
    
    if (summaryUploadError) {
      responsePayload.summaryUploadError = summaryUploadError;
    }

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
  } catch (error) {
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

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper function to create a fallback reference file
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
    throw error;
  }
}

// Helper function to create order summary content
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

// Helper function to get file extension from URL
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
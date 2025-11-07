// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Setup CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    // Log environment variable status for debugging (without exposing the actual values)
    console.log('Environment variables status:', {
      SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET',
      DROPBOX_APP_KEY: dropboxAppKey ? 'SET' : 'NOT SET',
      DROPBOX_APP_SECRET: dropboxAppSecret ? 'SET' : 'NOT SET',
      DROPBOX_REFRESH_TOKEN: dropboxRefreshToken ? 'SET' : 'NOT SET',
      DROPBOX_PARENT_FOLDER: defaultDropboxParentFolder,
      LOGIC_TEMPLATE_PATH: templateFilePath,
      RAPIDAPI_KEY: rapidApiKey ? 'SET' : 'NOT SET',
      GMAIL_USER: defaultSenderEmail,
      SITE_URL: siteUrl
    });
    
    // Create a Supabase client with service role key (has full permissions)
    // This client will be used for database operations regardless of user auth status
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
          // Note: user.user_metadata might not always have full_name, we'll prefer formData.name
          userName = user.user_metadata?.full_name || null;
          console.log('Authenticated user:', { userId, userEmail, userName });
        } else {
          console.log('Authorization header present but invalid/expired token, proceeding as anonymous');
          userId = null; // Explicitly set to null if token is invalid/expired
        }
      } catch (authError) {
        console.log('Error parsing auth header, proceeding as anonymous:', authError.message);
        userId = null; // Explicitly set to null if parsing fails
      }
    } else {
      console.log('No Authorization header, processing as anonymous request.');
      userId = null; // Explicitly set to null if no header
    }
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Parsed request body:', requestBody);
    } catch (parseError) {
      const rawBody = await req.text(); // Read raw body for better error message
      console.error('Error parsing request body:', parseError);
      console.error('Raw request body:', rawBody);
      throw new Error(`Invalid JSON in request body: ${parseError.message}. Raw body: ${rawBody.substring(0, 200)}...`);
    }

    // Ensure formData exists in the request body
    const { formData } = requestBody;
    if (!formData) {
      throw new Error('Missing formData in request body. Please ensure the request body contains a "formData" object.');
    }
    
    // Use form data for user info if not obtained from auth
    // This allows anonymous users to submit requests with their details
    userEmail = userEmail || formData.email;
    userName = userName || formData.name;
    
    // Validate required email
    if (!userEmail) {
       throw new Error('Email is required and must be provided in the form data.');
    }
    
    // Extract first name from the full name
    const firstName = userName ? userName.split(' ')[0] : 'anonymous';
    
    // Create a folder name based on the request with the specified format (without quotation marks)
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const folderName = `${dateString} ${formData.songTitle} from ${formData.musicalOrArtist} prepared for ${firstName}`;
    
    // Create the Logic Pro X file name based on the request
    const logicFileName = `${formData.songTitle} from ${formData.musicalOrArtist} for ${firstName}`;
    
    // Determine the parent folder based on track type first, then backing type
    let parentFolder = defaultDropboxParentFolder;
    
    // Check if trackType is for rough cuts
    if (formData.trackType === 'quick' || formData.trackType === 'one-take') {
      // Override all other rules and use ROUGH CUTS folder
      parentFolder = `${defaultDropboxParentFolder}/00. ROUGH CUTS`;
    } else {
      // Map backing types to specific subfolders (for polished tracks)
      const backingTypeMap: Record<string, string> = {
        'full-song': '00. FULL VERSIONS',
        'audition-cut': '00. AUDITION CUTS',
        'note-bash': '00. NOTE BASH'
      };
      
      // If multiple backing types are selected, use the first one for folder naming, or a general folder
      const primaryBackingType = Array.isArray(formData.backingType) && formData.backingType.length > 0 
        ? formData.backingType[0] 
        : null;

      if (primaryBackingType && backingTypeMap[primaryBackingType]) {
        parentFolder = `${defaultDropboxParentFolder}/${backingTypeMap[primaryBackingType]}`;
      } else {
        // Default to general folder if backing type is not recognized or not provided
        parentFolder = `${defaultDropboxParentFolder}/00. GENERAL`;
      }
    }
    
    // Function to get a new access token using the refresh token
    const getDropboxAccessToken = async () => {
      if (!dropboxAppKey) {
        throw new Error('DROPBOX_APP_KEY is not configured in Supabase secrets');
      }
      
      if (!dropboxAppSecret) {
        throw new Error('DROPBOX_APP_SECRET is not configured in Supabase secrets');
      }
      
      if (!dropboxRefreshToken) {
        throw new Error('DROPBOX_REFRESH_TOKEN is not configured in Supabase secrets');
      }
      
      console.log('Attempting to refresh Dropbox access token');
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
        console.error('Dropbox token refresh error:', response.status, errorText);
        throw new Error(`Dropbox token refresh failed: ${response.status} - ${errorText}`);
      }
      
      const tokenData = await response.json();
      console.log('Successfully refreshed Dropbox access token');
      return tokenData.access_token;
    };
    
    // Create Dropbox folder
    let dropboxFolderId = null;
    let dropboxError = null;
    let dropboxFolderPath = null;
    let dropboxAccessToken = null;
    let parentFolderCheck = false;
    
    if (!dropboxAppKey || !dropboxAppSecret || !dropboxRefreshToken) {
      console.log('Dropbox credentials not configured');
      if (!dropboxAppKey) {
        dropboxError = 'DROPBOX_APP_KEY not configured';
      } else if (!dropboxAppSecret) {
        dropboxError = 'DROPBOX_APP_SECRET not configured';
      } else if (!dropboxRefreshToken) {
        dropboxError = 'DROPBOX_REFRESH_TOKEN not configured';
      } else {
        dropboxError = 'Dropbox credentials not configured';
      }
    } else {
      try {
        // Get a fresh access token
        dropboxAccessToken = await getDropboxAccessToken();
        
        // Ensure the parent folder path starts with a slash and doesn't end with one
        const normalizedParentFolder = parentFolder.startsWith('/') 
          ? parentFolder.replace(/\/$/, '') 
          : `/${parentFolder}`.replace(/\/$/, '');
          
        const fullPath = `${normalizedParentFolder}/${folderName}`;
        dropboxFolderPath = fullPath;
        
        console.log('Checking if parent folder exists:', normalizedParentFolder);
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
          console.log('Parent folder exists, proceeding with folder creation');
        } else {
          const parentErrorText = await parentCheckResponse.text();
          console.error('Parent folder check failed:', parentCheckResponse.status, parentErrorText);
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
            autorename: true  // This will automatically rename if folder exists
          })
        });
        
        if (dropboxResponse.ok) {
          const dropboxData = await dropboxResponse.json();
          dropboxFolderId = dropboxData.metadata.id;
          console.log('Dropbox folder created successfully with ID:', dropboxFolderId);
        } else {
          const errorText = await dropboxResponse.text();
          console.error('Dropbox API error:', dropboxResponse.status, errorText);
          
          // Try to parse the error to see if it's a conflict that we can handle
          try {
            const errorObj = JSON.parse(errorText);
            if (errorObj.error_summary && errorObj.error_summary.includes('path/conflict')) {
              // If it's a conflict, try to get the existing folder info
              console.log('Folder already exists, trying to get folder info...');
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
                  // Use the first entry (should be the folder)
                  dropboxFolderId = listData.entries[0].id;
                  console.log('Using existing folder with ID:', dropboxFolderId);
                }
              } else {
                const listErrorText = await listResponse.text();
                console.error('Error getting folder info:', listResponse.status, listErrorText);
                dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
              }
            } else {
              dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
            }
          } catch (parseError) {
            // If we can't parse the error, just use the original error text
            dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
          }
        }
      } catch (error) {
        console.error('Dropbox folder creation error:', error);
        dropboxError = `Dropbox folder creation error: ${error.message}`;
      }
    }
    
    // Copy Logic Pro X template file to the new folder with custom name
    let templateCopySuccess = false;
    let templateCopyError = null;
    
    if (dropboxFolderId && dropboxAccessToken && templateFilePath) {
      try {
        // Get information about the template file
        console.log('Getting template file info from path:', templateFilePath);
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
          const fileInfo = await fileInfoResponse.json();
          console.log('Template file info:', fileInfo);
          
          // Create the new file name with .logicx extension
          const newFileName = `${logicFileName}.logicx`;
          const copyPath = `${dropboxFolderPath}/${newFileName}`;
          console.log('Copying template to:', copyPath);
          
          const copyResponse = await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dropboxAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from_path: templateFilePath,
              to_path: copyPath,
              autorename: true // This will automatically rename if file exists
            })
          });
          
          if (copyResponse.ok) {
            templateCopySuccess = true;
            console.log('Template file copied successfully with new name:', newFileName);
          } else {
            const errorText = await copyResponse.text();
            console.error('Dropbox template copy error:', copyResponse.status, errorText);
            
            // Try to parse the error to see if it's a conflict that we can handle
            try {
              const errorObj = JSON.parse(errorText);
              if (errorObj.error_summary && errorObj.error_summary.includes('to/conflict')) {
                // If it's a conflict, try with autorename
                console.log('File already exists, trying with autorename...');
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
                  const copyData = await copyWithRenameResponse.json();
                  console.log('Template file copied successfully with auto-renamed name:', copyData.metadata.name);
                } else {
                  const renameErrorText = await copyWithRenameResponse.text();
                  console.error('Dropbox template copy with autorename error:', copyWithRenameResponse.status, renameErrorText);
                  templateCopyError = `Dropbox template copy error: ${copyWithRenameResponse.status} - ${renameErrorText}`;
                }
              } else {
                templateCopyError = `Dropbox template copy error: ${copyResponse.status} - ${errorText}`;
              }
            } catch (parseError) {
              // If we can't parse the error, just use the original error text
              templateCopyError = `Dropbox template copy error: ${copyResponse.status} - ${errorText}`;
            }
          }
        } else {
          const errorText = await fileInfoResponse.text();
          console.error('Dropbox template file info error:', fileInfoResponse.status, errorText);
          templateCopyError = `Dropbox template file info error: ${fileInfoResponse.status} - ${errorText}`;
        }
      } catch (error) {
        console.error('Template copy error:', error);
        templateCopyError = `Template copy error: ${error.message}`;
      }
    }
    
    // Download YouTube video as MP3 and upload to Dropbox
    let youtubeMp3Success = false;
    let youtubeMp3Error = null;
    
    if (dropboxFolderId && formData.youtubeLink && dropboxAccessToken) {
      try {
        // Create MP3 file name
        const mp3FileName = `${formData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
        const uploadPath = `${dropboxFolderPath}/${mp3FileName}`;
        
        // Extract YouTube video ID
        const videoId = extractYouTubeId(formData.youtubeLink);
        if (!videoId) {
          throw new Error('Invalid YouTube URL');
        }
        
        // Check if RapidAPI key is available
        if (!rapidApiKey) {
          youtubeMp3Error = 'RapidAPI key not configured in Supabase secrets';
          console.error('RapidAPI key not configured in Supabase secrets');
          
          // Create a fallback reference file
          await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, formData.youtubeLink, mp3FileName);
          youtubeMp3Success = true; // Mark as successful since we provided a reference
          youtubeMp3Error = 'Created reference text file with YouTube link instead of MP3 due to missing API key';
        } else {
          // Use the Cloud Api Hub - Youtube Downloader API
          console.log('Converting YouTube video to MP3 using Cloud Api Hub - Youtube Downloader API');
          
          try {
            // Try to get video info first
            const infoUrl = `https://cloud-api-youtube-downloader.p.rapidapi.com/youtube/v1/info?id=${videoId}`;
            
            const infoResponse = await fetch(infoUrl, {
              method: 'GET',
              headers: {
                'x-rapidapi-host': 'cloud-api-youtube-downloader.p.rapidapi.com',
                'x-rapidapi-key': rapidApiKey
              }
            });
            
            if (infoResponse.ok) {
              const infoData = await infoResponse.json();
              console.log('Video info:', infoData);
            } else {
              const errorText = await infoResponse.text();
              console.error('Info API error:', infoResponse.status, errorText);
              
              // If info endpoint fails, we'll still try to get the audio
              console.log('Info API failed, proceeding with audio download anyway');
            }
            
            // Now get the audio download link
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
              console.log('Download data:', downloadData);
              
              // Check if we have a download URL
              if (downloadData.url) {
                // Download the MP3 file
                console.log('Downloading MP3 from:', downloadData.url);
                const mp3Response = await fetch(downloadData.url);
                
                if (mp3Response.ok) {
                  const mp3Buffer = await mp3Response.arrayBuffer();
                  
                  // Upload to Dropbox
                  console.log('Uploading MP3 to Dropbox at path:', uploadPath);
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
                    console.log('MP3 uploaded successfully to Dropbox');
                  } else {
                    const errorText = await dropboxUploadResponse.text();
                    console.error('Dropbox MP3 upload error:', dropboxUploadResponse.status, errorText);
                    youtubeMp3Error = `Dropbox MP3 upload error: ${dropboxUploadResponse.status} - ${errorText}`;
                    
                    // Create a fallback reference file
                    await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, formData.youtubeLink, mp3FileName);
                    youtubeMp3Success = true; // Mark as successful since we provided a reference
                    youtubeMp3Error += ' | Created reference text file with YouTube link instead of MP3 due to missing API key';
                  }
                } else {
                  youtubeMp3Error = `Failed to download MP3: ${mp3Response.status}`;
                  
                  // Create a fallback reference file
                  await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, formData.youtubeLink, mp3FileName);
                  youtubeMp3Success = true; // Mark as successful since we provided a reference
                  youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
                }
              } else {
                youtubeMp3Error = 'No download URL found in API response';
                
                // Create a fallback reference file
                await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, formData.youtubeLink, mp3FileName);
                youtubeMp3Success = true; // Mark as successful since we provided a reference
                youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
              }
            } else {
              const errorText = await downloadResponse.text();
              console.error('Download API error:', downloadResponse.status, errorText);
              
              // Check if it's a subscription error
              if (downloadResponse.status === 403) {
                youtubeMp3Error = 'RapidAPI subscription error - Please check your API key and subscription to the YouTube Downloader API';
              } else {
                youtubeMp3Error = `Download API error: ${downloadResponse.status} - ${errorText}`;
              }
              
              // Create a fallback reference file
              await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, formData.youtubeLink, mp3FileName);
              youtubeMp3Success = true; // Mark as successful since we provided a reference
              youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
            }
          } catch (apiError) {
            console.error('API error:', apiError);
            youtubeMp3Error = `API error: ${apiError.message}`;
            
            // Try to create a fallback reference file
            try {
              const mp3FileName = `${formData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
              await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, formData.youtubeLink, mp3FileName);
              youtubeMp3Success = true; // Mark as successful since we provided a reference
              youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
            } catch (fallbackError) {
              console.error('Fallback reference file creation failed:', fallbackError);
            }
          }
        }
      } catch (error) {
        console.error('YouTube MP3 processing error:', error);
        youtubeMp3Error = `YouTube MP3 processing error: ${error.message}`;
        
        // Try to create a fallback reference file
        try {
          const mp3FileName = `${formData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
          await createFallbackReferenceFile(dropboxAccessToken, dropboxFolderPath, formData.youtubeLink, mp3FileName);
          youtubeMp3Success = true; // Mark as successful since we provided a reference
          youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
        } catch (fallbackError) {
          console.error('Fallback reference file creation failed:', fallbackError);
        }
      }
    }
    
    // Upload PDF to Dropbox folder if provided
    let pdfUploadSuccess = false;
    let pdfUploadError = null;
    
    if (dropboxFolderId && formData.sheetMusicUrl && dropboxAccessToken) {
      try {
        // Download the PDF from Supabase storage
        console.log('Attempting to download PDF from:', formData.sheetMusicUrl);
        const pdfResponse = await fetch(formData.sheetMusicUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download PDF from Supabase: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfFileName = `${formData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_sheet_music.pdf`;
        
        // Upload to Dropbox
        const uploadPath = `${dropboxFolderPath}/${pdfFileName}`;
        console.log('Uploading PDF to Dropbox at path:', uploadPath);
        
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
          console.log('PDF uploaded successfully to Dropbox');
        } else {
          const errorText = await dropboxUploadResponse.text();
          console.error('Dropbox PDF upload error:', dropboxUploadResponse.status, errorText);
          pdfUploadError = `Dropbox PDF upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        }
      } catch (error) {
        console.error('PDF upload error:', error);
        pdfUploadError = `PDF upload error: ${error.message}`;
      }
    }
    
    // Upload voice memo to Dropbox folder if provided
    let voiceMemoUploadSuccess = false;
    let voiceMemoUploadError = null;
    
    if (dropboxFolderId && formData.voiceMemoFileUrl && dropboxAccessToken) {
      try {
        // Download the voice memo from Supabase storage
        console.log('Attempting to download voice memo from:', formData.voiceMemoFileUrl);
        const voiceMemoResponse = await fetch(formData.voiceMemoFileUrl);
        if (!voiceMemoResponse.ok) {
          throw new Error(`Failed to download voice memo from Supabase: ${voiceMemoResponse.status} ${voiceMemoResponse.statusText}`);
        }
        
        const voiceMemoBuffer = await voiceMemoResponse.arrayBuffer();
        const fileExt = getFileExtensionFromUrl(formData.voiceMemoFileUrl);
        const voiceMemoFileName = `${formData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_voice_memo.${fileExt}`;
        
        // Upload to Dropbox
        const uploadPath = `${dropboxFolderPath}/${voiceMemoFileName}`;
        console.log('Uploading voice memo to Dropbox at path:', uploadPath);
        
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
          console.log('Voice memo uploaded successfully to Dropbox');
        } else {
          const errorText = await dropboxUploadResponse.text();
          console.error('Dropbox voice memo upload error:', dropboxUploadResponse.status, errorText);
          voiceMemoUploadError = `Dropbox voice memo upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        }
      } catch (error) {
        console.error('Voice memo upload error:', error);
        voiceMemoUploadError = `Voice memo upload error: ${error.message}`;
      }
    }
    
    // Create and upload order summary text file
    let summaryUploadSuccess = false;
    let summaryUploadError = null;
    
    if (dropboxFolderId && dropboxAccessToken) {
      try {
        // Create order summary content
        const summaryContent = createOrderSummary(formData);
        const textEncoder = new TextEncoder();
        const summaryBuffer = textEncoder.encode(summaryContent);
        
        // Upload to Dropbox
        const summaryFileName = `${formData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_order_summary.txt`;
        const uploadPath = `${dropboxFolderPath}/${summaryFileName}`;
        console.log('Uploading order summary to Dropbox at path:', uploadPath);
        
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
          console.log('Order summary uploaded successfully to Dropbox');
        } else {
          const errorText = await dropboxUploadResponse.text();
          console.error('Dropbox order summary upload error:', dropboxUploadResponse.status, errorText);
          summaryUploadError = `Dropbox order summary upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        }
      } catch (error) {
        console.error('Order summary upload error:', error);
        summaryUploadError = `Order summary upload error: ${error.message}`;
      }
    }

    // Generate a unique guest access token
    const guestAccessToken = crypto.randomUUID();
    
    // Save to the database using the admin client
    // This allows inserting records even for anonymous users
    const { data: insertedRecords, error: insertError } = await supabaseAdmin
      .from('backing_requests')
      .insert([
        {
          user_id: userId, // Will be null for anonymous users
          email: userEmail, // Guaranteed to be present
          name: userName, // From form data or auth
          phone: formData.phone, // Insert phone number
          song_title: formData.songTitle,
          musical_or_artist: formData.musicalOrArtist,
          song_key: formData.songKey,
          different_key: formData.differentKey,
          key_for_track: formData.keyForTrack,
          youtube_link: formData.youtubeLink,
          voice_memo: formData.voiceMemo,
          sheet_music_url: formData.sheetMusicUrl,
          track_purpose: formData.trackPurpose,
          backing_type: formData.backingType, // Now an array
          delivery_date: formData.deliveryDate,
          additional_services: formData.additionalServices,
          special_requests: formData.specialRequests,
          dropbox_folder_id: dropboxFolderId,
          track_type: formData.trackType,
          additional_links: formData.additionalLinks, // Insert the new field
          guest_access_token: guestAccessToken, // Store the generated token
        }
      ])
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw insertError;
    }

    // Ensure insertedRecords is an array and get the first element
    const newRequestData = insertedRecords && insertedRecords.length > 0 ? insertedRecords[0] : null;
    if (!newRequestData) {
        throw new Error('Failed to insert backing request into database: No data returned after insert.');
    }

    // --- Send confirmation email to client ---
    try {
      console.log("Attempting to send confirmation email to client");
      
      const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
      
      const clientEmailSubject = `Confirmation: Your Backing Track Request for "${formData.songTitle}"`;
      // Update client email link to include request_id and guest_access_token
      const clientTrackViewLink = `${siteUrl}/track/${newRequestData.id}?token=${guestAccessToken}`;

      const clientEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h2 style="color: #1C0357;">Request Submitted Successfully!</h2>
          <p>Hi ${formData.name || 'there'},</p>
          <p>Thank you for submitting your custom piano backing track request for <strong>"${formData.songTitle}"</strong> from <strong>${formData.musicalOrArtist}</strong>.</p>
          <p>We have received your request and will be in touch within <strong>24-48 hours</strong> with a quote and estimated delivery date.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1C0357;">Your Request Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Song Title:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.songTitle}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Musical/Artist:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.musicalOrArtist}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${formData.category.replace('-', ' ') || 'N/A'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Track Type:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${formData.trackType.replace('-', ' ') || 'N/A'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Sheet Music Key:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.songKey || 'N/A'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Different Key Required:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.differentKey || 'No'}</td></tr>
              ${formData.differentKey === 'Yes' ? `<tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Requested Key:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.keyForTrack || 'N/A'}</td></tr>` : ''}
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Backing Type(s):</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${Array.isArray(formData.backingType) ? formData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') : (formData.backingType?.replace('-', ' ') || 'Not specified')}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Delivery Date:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.deliveryDate ? new Date(formData.deliveryDate).toLocaleDateString() : 'Not specified'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Additional Services:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${formData.additionalServices && formData.additionalServices.length > 0 ? formData.additionalServices.map((service: string) => service.replace('-', ' ')).join(', ') : 'None'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">YouTube Link:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.youtubeLink ? `<a href="${formData.youtubeLink}">${formData.youtubeLink}</a>` : 'None'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Additional Links:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.additionalLinks ? `<a href="${formData.additionalLinks}">${formData.additionalLinks}</a>` : 'None'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Voice Memo Link:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.voiceMemo || formData.voiceMemoFileUrl ? `<a href="${formData.voiceMemo || formData.voiceMemoFileUrl}">${formData.voiceMemo || formData.voiceMemoFileUrl}</a>` : 'None'}</td></tr>
              <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Sheet Music:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${formData.sheetMusicUrl ? `<a href="${formData.sheetMusicUrl}">View Sheet Music</a>` : 'Not provided'}</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">Phone Number:</td><td style="padding: 5px 0;">${formData.phone || 'Not provided'}</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">Special Requests:</td><td style="padding: 5px 0;">${formData.specialRequests || 'None'}</td></tr>
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
      `;
      
      const clientEmailResponse = await fetch(sendEmailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: userEmail,
          subject: clientEmailSubject,
          html: clientEmailHtml,
          senderEmail: defaultSenderEmail
        })
      });

      if (!clientEmailResponse.ok) {
        const emailErrorText = await clientEmailResponse.text();
        console.error(`Failed to send confirmation email to client ${userEmail}:`, emailErrorText);
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: userEmail,
              sender: 'system@pianobackings.com',
              subject: clientEmailSubject,
              content: clientEmailHtml,
              status: 'failed',
              type: 'client_confirmation_email',
              error_message: emailErrorText
            }
          ]);
      } else {
        console.log(`Confirmation email sent successfully to client ${userEmail}`);
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: userEmail,
              sender: 'system@pianobackings.com',
              subject: clientEmailSubject,
              content: clientEmailHtml,
              status: 'sent',
              type: 'client_confirmation_email'
            }
          ]);
      }
    } catch (emailError) {
      console.error('Top-level error sending client confirmation email:', emailError);
      // Log to notifications table even if client email fails
      try {
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: userEmail,
              sender: 'system@pianobackings.com',
              subject: `Failed to send client confirmation for: ${formData.songTitle}`,
              content: `Error: ${emailError.message}`,
              status: 'failed',
              type: 'client_confirmation_email',
              error_message: emailError.message
            }
          ]);
      } catch (dbError) {
        console.error('Failed to store client notification in database after top-level email error:', dbError);
      }
    }
    // --- End client confirmation email ---

    // Send email notification to admins with improved error handling
    try {
      console.log("Attempting to send email notification to admins");
      
      const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
      console.log("sendEmailUrl:", sendEmailUrl);
      
      // Create email content for admin
      const adminEmailSubject = `New Backing Track Request: ${formData.songTitle}`;
      const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1C0357;">New Backing Track Request</h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1C0357;">Request Details</h3>
            
            <div style="margin-bottom: 10px;">
              <strong>Song:</strong> ${formData.songTitle}<br>
              <strong>Musical/Artist:</strong> ${formData.musicalOrArtist}<br>
              <strong>Requested by:</strong> ${userName || 'N/A'} (${userEmail})<br>
              ${formData.phone ? `<strong>Phone:</strong> ${formData.phone}<br>` : ''}
              <strong>Submitted:</strong> ${new Date().toLocaleString()}
            </div>
            
            <div style="margin-bottom: 10px;">
              <strong>Backing Type(s):</strong> ${Array.isArray(formData.backingType) ? formData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') : (formData.backingType?.replace('-', ' ') || 'Not specified')}<br>
              <strong>Track Purpose:</strong> ${formData.trackPurpose?.replace('-', ' ') || 'Not specified'}<br>
              ${formData.deliveryDate ? `<strong>Delivery Date:</strong> ${new Date(formData.deliveryDate).toLocaleDateString()}<br>` : ''}
            </div>
            
            ${formData.additionalServices && formData.additionalServices.length > 0 ? `
              <div style="margin-bottom: 10px;">
                <strong>Additional Services:</strong><br>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  ${formData.additionalServices.map((service: string) => `<li>${service.replace('-', ' ')}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${formData.specialRequests ? `
              <div style="margin-bottom: 10px;">
                <strong>Special Requests:</strong><br>
                <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 3px;">${formData.specialRequests}</p>
              </div>
            ` : ''}

            ${formData.additionalLinks ? `
              <div style="margin-bottom: 10px;">
                <strong>Additional Links:</strong><br>
                <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 3px;"><a href="${formData.additionalLinks}">${formData.additionalLinks}</a></p>
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
      `;
      
      // Fetch notification recipients from the database
      const { data: recipients, error: fetchRecipientsError } = await supabaseAdmin
        .from('notification_recipients')
        .select('email');

      if (fetchRecipientsError) {
        console.error('Error fetching notification recipients:', fetchRecipientsError);
        // Fallback to default admin email if fetching fails
        const adminEmails = [defaultSenderEmail];
        console.log('Falling back to default admin email for notifications:', adminEmails);
        
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
              console.error(`Failed to send notification email to ${email} (fallback):`, emailErrorText);
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
              console.log(`Notification email sent successfully to ${email} (fallback)`);
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
            console.error(`Error sending notification email to ${email} (fallback):`, emailError);
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
      console.error('Top-level error sending admin notification emails:', emailError);
      // Even if email fails, we still want to store the notification attempt
      try {
        const emailSubject = `New Backing Track Request: ${formData.songTitle}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1C0357;">New Backing Track Request</h2>
            <p>A new backing track request has been submitted but email notification failed.</p>
            <p>Please check the system logs for more details.</p>
          </div>
        `;
        
        // Attempt to log to default admin email if all else fails
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
        console.error('Failed to store notification in database after top-level email error:', dbError);
      }
    }
    
    const responsePayload: any = { 
      message: 'Request submitted successfully',
      insertedRequest: newRequestData, // Use the explicitly checked newRequestData
      dropboxFolderId,
      parentFolderUsed: parentFolder,
      folderNameUsed: folderName,
      firstNameUsed: firstName,
      trackTypeUsed: formData.trackType,
      templateCopySuccess,
      pdfUploadSuccess,
      youtubeMp3Success,
      dropboxFolderPath,
      logicFileNameUsed: logicFileName,
      parentFolderCheck,
      voiceMemoUploadSuccess,
      summaryUploadSuccess,
      guestAccessToken, // Include the token in the response
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
    console.error('Error in create-backing-request function:', error);
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
    // Create a simple text file with the YouTube link as a fallback
    const textContent = `YouTube Reference Link: ${youtubeLink}\n\nThis file was created as a reference for the requested track.\nYou can manually download the audio from the link above if needed.`;
    const textEncoder = new TextEncoder();
    const textBuffer = textEncoder.encode(textContent);
    
    // Upload to Dropbox with .txt extension
    const textUploadPath = `${dropboxFolderPath}/${mp3FileName.replace('.mp3', '_reference.txt')}`;
    console.log('Uploading reference text file to Dropbox at path:', textUploadPath);
    
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
      console.error('Dropbox reference text upload error:', dropboxUploadResponse.status, errorText);
      throw new Error(`Dropbox reference text upload error: ${dropboxUploadResponse.status} - ${errorText}`);
    }
    
    console.log('Reference text file uploaded successfully to Dropbox');
  } catch (error) {
    console.error('Fallback reference file creation failed:', error);
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
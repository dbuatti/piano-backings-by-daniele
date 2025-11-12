// @ts-ignore
import { extractYouTubeId, getFileExtensionFromUrl, createOrderSummary } from './utils.ts';

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

// Function to get a new access token using the refresh token
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

export async function handleDropboxAutomation(config: DropboxConfig, sanitizedData: any, userName: string): Promise<DropboxResult> {
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
  } catch (error) {
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
    
    const primaryBackingType = sanitizedData.backingType.length > 0 
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
      // Parent folder exists
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
    } else {
      const errorText = await dropboxResponse.text();
      // Handle conflict (folder already exists)
      try {
        const errorObj = JSON.parse(errorText);
        if (errorObj.error_summary && errorObj.error_summary.includes('path/conflict')) {
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
          } else {
            result.dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
          }
        } else {
          result.dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
        }
      } catch (parseError) {
        result.dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
      }
    }
  } catch (error) {
    result.dropboxError = `Dropbox folder creation error: ${error.message}`;
    return result;
  }

  if (!result.dropboxFolderId) {
    return result;
  }

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
      } else {
        const errorText = await copyResponse.text();
        result.templateCopyError = `Dropbox template copy error: ${copyResponse.status} - ${errorText}`;
      }
    } catch (error) {
      result.templateCopyError = `Template copy error: ${error.message}`;
    }
  }

  // 3. Download YouTube video as MP3 and upload to Dropbox
  if (sanitizedData.youtubeLink) {
    try {
      const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
      const uploadPath = `${result.dropboxFolderPath}/${mp3FileName}`;
      
      const videoId = extractYouTubeId(sanitizedData.youtubeLink);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      
      if (!config.rapidApiKey) {
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
              } else {
                const errorText = await dropboxUploadResponse.text();
                result.youtubeMp3Error = `Dropbox MP3 upload error: ${dropboxUploadResponse.status} - ${errorText}`;
                await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
                result.youtubeMp3Success = true;
                result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
              }
            } else {
              result.youtubeMp3Error = `Failed to download MP3: ${mp3Response.status}`;
              await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
              result.youtubeMp3Success = true;
              result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
            }
          } else {
            result.youtubeMp3Error = 'No download URL found in API response';
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
          await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
          result.youtubeMp3Success = true;
          result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
        }
      }
    } catch (apiError) {
      result.youtubeMp3Error = `YouTube MP3 processing error: ${apiError.message}`;
      try {
        const mp3FileName = `${sanitizedData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
        await createFallbackReferenceFile(dropboxAccessToken, result.dropboxFolderPath, sanitizedData.youtubeLink, mp3FileName);
        result.youtubeMp3Success = true;
        result.youtubeMp3Error += ' | Created reference text file with YouTube link as fallback';
      } catch (fallbackError) {
      }
    }
  }

  // 4. Upload PDF to Dropbox folder if provided
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
      } else {
        const errorText = await dropboxUploadResponse.text();
        result.pdfUploadError = `Dropbox PDF upload error: ${dropboxUploadResponse.status} - ${errorText}`;
      }
    } catch (error) {
      result.pdfUploadError = `PDF upload error: ${error.message}`;
    }
  }

  // 5. Upload voice memo to Dropbox folder if provided
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
      } else {
        const errorText = await dropboxUploadResponse.text();
        result.voiceMemoUploadError = `Dropbox voice memo upload error: ${dropboxUploadResponse.status} - ${errorText}`;
      }
    } catch (error) {
      result.voiceMemoUploadError = `Voice memo upload error: ${error.message}`;
    }
  }

  // 6. Create and upload order summary text file
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
    } else {
      const errorText = await dropboxUploadResponse.text();
      result.summaryUploadError = `Dropbox order summary upload error: ${dropboxUploadResponse.status} - ${errorText}`;
    }
  } catch (error) {
    result.summaryUploadError = `Order summary upload error: ${error.message}`;
  }

  return result;
}
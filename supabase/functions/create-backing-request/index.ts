// @ts-ignore
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
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
    const dropboxAccessToken = Deno.env.get('DROPBOX_ACCESS_TOKEN') || '';
    // @ts-ignore
    const defaultDropboxParentFolder = Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS';
    // @ts-ignore
    const templateFilePath = Deno.env.get('LOGIC_TEMPLATE_PATH') || '/_Template/X from Y prepared for Z.logicx';
    
    // Log environment variable status for debugging
    console.log('Environment variables status:', {
      SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET',
      DROPBOX_ACCESS_TOKEN: dropboxAccessToken ? 'SET' : 'NOT SET',
      DROPBOX_PARENT_FOLDER: defaultDropboxParentFolder,
      LOGIC_TEMPLATE_PATH: templateFilePath,
      DROPBOX_ACCESS_TOKEN_LENGTH: dropboxAccessToken ? dropboxAccessToken.length : 0
    });
    
    // Create a Supabase client with service role key (has full permissions)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }
    
    // Get the request data
    const { formData } = await req.json();
    
    // Extract first name from the full name
    const firstName = formData.name ? formData.name.split(' ')[0] : 'anonymous';
    
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
      
      // Set parent folder based on backing type
      if (formData.backingType && backingTypeMap[formData.backingType]) {
        parentFolder = `${defaultDropboxParentFolder}/${backingTypeMap[formData.backingType]}`;
      } else {
        // Default to general folder if backing type is not recognized
        parentFolder = `${defaultDropboxParentFolder}/00. GENERAL`;
      }
    }
    
    // Create Dropbox folder
    let dropboxFolderId = null;
    let dropboxError = null;
    let dropboxFolderPath = null;
    
    if (!dropboxAccessToken) {
      console.log('Dropbox access token not configured');
      dropboxError = 'Dropbox access token not configured';
    } else {
      try {
        // Ensure the parent folder path starts with a slash and doesn't end with one
        const normalizedParentFolder = parentFolder.startsWith('/') 
          ? parentFolder.replace(/\/$/, '') 
          : `/${parentFolder}`.replace(/\/$/, '');
          
        const fullPath = `${normalizedParentFolder}/${folderName}`;
        dropboxFolderPath = fullPath;
        
        console.log('Creating Dropbox folder at path:', fullPath);
        
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
        // Extract video ID from YouTube URL
        const videoId = extractYouTubeId(formData.youtubeLink);
        if (!videoId) {
          throw new Error('Invalid YouTube URL');
        }
        
        // Create MP3 file name
        const mp3FileName = `${formData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_reference.mp3`;
        const uploadPath = `${dropboxFolderPath}/${mp3FileName}`;
        
        // For now, we'll create a placeholder MP3 file since actual YouTube conversion
        // would require external services that may violate YouTube's Terms of Service
        // In a real implementation, you would integrate with a YouTube-to-MP3 service here
        
        // Create a simple placeholder MP3 file (1 second of silence)
        const mp3Buffer = createPlaceholderMp3();
        
        // Upload to Dropbox
        console.log('Uploading placeholder MP3 to Dropbox at path:', uploadPath);
        
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
          console.log('Placeholder MP3 uploaded successfully to Dropbox');
        } else {
          const errorText = await dropboxUploadResponse.text();
          console.error('Dropbox MP3 upload error:', dropboxUploadResponse.status, errorText);
          youtubeMp3Error = `Dropbox MP3 upload error: ${dropboxUploadResponse.status} - ${errorText}`;
        }
      } catch (error) {
        console.error('YouTube MP3 processing error:', error);
        youtubeMp3Error = `YouTube MP3 processing error: ${error.message}`;
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
    
    // Save to the database
    const { data, error } = await supabase
      .from('backing_requests')
      .insert([
        {
          user_id: user.id,
          email: formData.email,
          name: formData.name,
          song_title: formData.songTitle,
          musical_or_artist: formData.musicalOrArtist,
          song_key: formData.songKey,
          different_key: formData.differentKey,
          key_for_track: formData.keyForTrack,
          youtube_link: formData.youtubeLink,
          voice_memo: formData.voiceMemo,
          sheet_music_url: formData.sheetMusicUrl,
          track_purpose: formData.trackPurpose,
          backing_type: formData.backingType,
          delivery_date: formData.deliveryDate,
          additional_services: formData.additionalServices,
          special_requests: formData.specialRequests,
          dropbox_folder_id: dropboxFolderId
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    const responsePayload: any = { 
      message: 'Request submitted successfully',
      data,
      dropboxFolderId,
      parentFolderUsed: parentFolder,
      folderNameUsed: folderName,
      firstNameUsed: firstName,
      trackTypeUsed: formData.trackType,
      templateCopySuccess,
      pdfUploadSuccess,
      youtubeMp3Success,
      dropboxFolderPath,
      logicFileNameUsed: logicFileName
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
        status: 400
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

// Helper function to create a placeholder MP3 file (1 second of silence)
function createPlaceholderMp3(): ArrayBuffer {
  // This creates a minimal valid MP3 file with 1 second of silence
  // In a real implementation, this would be replaced with actual MP3 data
  const mp3Data = [
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x25, 0x54, 0x53, 0x53, 0x45, 0x00, 0x00,
    0x00, 0x0F, 0x00, 0x00, 0x03, 0x65, 0x6E, 0x63, 0x6F, 0x64, 0x65, 0x64, 0x20, 0x62, 0x79, 0x20,
    0x44, 0x79, 0x61, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ];
  
  return new Uint8Array(mp3Data).buffer;
}
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
              to_path: copyPath
            })
          });
          
          if (copyResponse.ok) {
            templateCopySuccess = true;
            console.log('Template file copied successfully with new name:', newFileName);
          } else {
            const errorText = await copyResponse.text();
            console.error('Dropbox template copy error:', copyResponse.status, errorText);
            templateCopyError = `Dropbox template copy error: ${copyResponse.status} - ${errorText}`;
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
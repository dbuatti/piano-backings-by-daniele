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
    
    // Log environment variable status for debugging
    console.log('Environment variables status:', {
      SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET',
      DROPBOX_ACCESS_TOKEN: dropboxAccessToken ? 'SET' : 'NOT SET',
      DROPBOX_PARENT_FOLDER: defaultDropboxParentFolder,
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
    
    // Create a folder name based on the request
    const folderName = `${formData.name || 'anonymous'}-${Date.now()}`;
    
    // Determine the parent folder based on backing type
    let parentFolder = defaultDropboxParentFolder;
    
    // Map backing types to specific subfolders
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
    
    // Create Dropbox folder
    let dropboxFolderId = null;
    let dropboxError = null;
    
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
        
        console.log('Creating Dropbox folder at path:', fullPath);
        
        const dropboxResponse = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dropboxAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: fullPath,
            autorename: false
          })
        });
        
        if (dropboxResponse.ok) {
          const dropboxData = await dropboxResponse.json();
          dropboxFolderId = dropboxData.metadata.id;
        } else {
          const errorText = await dropboxResponse.text();
          console.error('Dropbox API error:', dropboxResponse.status, errorText);
          dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
        }
      } catch (error) {
        console.error('Dropbox folder creation error:', error);
        dropboxError = `Dropbox folder creation error: ${error.message}`;
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
      parentFolderUsed: parentFolder
    };
    
    if (dropboxError) {
      responsePayload.dropboxError = dropboxError;
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
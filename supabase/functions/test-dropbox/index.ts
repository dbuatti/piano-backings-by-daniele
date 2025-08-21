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
    // Get environment variables
    // @ts-ignore
    const dropboxAppKey = Deno.env.get('DROPBOX_APP_KEY') || '';
    // @ts-ignore
    const dropboxAppSecret = Deno.env.get('DROPBOX_APP_SECRET') || '';
    // @ts-ignore
    const dropboxRefreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN') || '';
    // @ts-ignore
    const defaultDropboxParentFolder = Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS';
    
    // Log environment variable status for debugging (without exposing the actual key)
    console.log('Dropbox environment variables status:', {
      DROPBOX_APP_KEY: dropboxAppKey ? 'SET' : 'NOT SET',
      DROPBOX_APP_SECRET: dropboxAppSecret ? 'SET' : 'NOT SET',
      DROPBOX_REFRESH_TOKEN: dropboxRefreshToken ? 'SET' : 'NOT SET',
      DROPBOX_PARENT_FOLDER: defaultDropboxParentFolder
    });
    
    if (!dropboxRefreshToken || !dropboxAppKey || !dropboxAppSecret) {
      throw new Error('DROPBOX credentials not configured in Supabase secrets');
    }
    
    // Function to get a new access token using the refresh token
    const getDropboxAccessToken = async () => {
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
      return tokenData.access_token;
    };
    
    // Get a fresh access token
    const dropboxAccessToken = await getDropboxAccessToken();
    
    // Create a simple folder name for testing
    const folderName = `test_folder_${Date.now()}`;
    const fullPath = `${defaultDropboxParentFolder}/${folderName}`;
    
    console.log('Creating test folder at path:', fullPath);
    
    // Try to create a folder in Dropbox
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
    
    let dropboxData;
    let dropboxFolderId = null;
    let dropboxError = null;
    
    if (dropboxResponse.ok) {
      dropboxData = await dropboxResponse.json();
      dropboxFolderId = dropboxData.metadata.id;
      console.log('Dropbox folder created successfully with ID:', dropboxFolderId);
      
      // Clean up: Delete the test folder immediately
      try {
        await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dropboxAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: fullPath
          })
        });
        console.log('Test folder cleaned up successfully');
      } catch (cleanupError) {
        console.log('Failed to clean up test folder, but test was successful');
      }
    } else {
      const errorText = await dropboxResponse.text();
      console.error('Dropbox API error:', dropboxResponse.status, errorText);
      dropboxError = `Dropbox API error: ${dropboxResponse.status} - ${errorText}`;
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Test function executed',
        dropboxFolderId,
        dropboxError,
        fullPath,
        dropboxData
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in test function:', error);
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
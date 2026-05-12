// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[test-dropbox] Starting connection test...");
    
    const dropboxAppKey = Deno.env.get('DROPBOX_APP_KEY');
    const dropboxAppSecret = Deno.env.get('DROPBOX_APP_SECRET');
    const dropboxRefreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN');
    const defaultDropboxParentFolder = Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS';
    
    if (!dropboxAppKey || !dropboxAppSecret || !dropboxRefreshToken) {
      throw new Error('Dropbox credentials are not fully configured in Supabase secrets (App Key, Secret, or Refresh Token missing)');
    }
    
    const getDropboxAccessToken = async () => {
      // Corrected endpoint to Dropbox instead of Google
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: dropboxRefreshToken,
          client_id: dropboxAppKey,
          client_secret: dropboxAppSecret
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[test-dropbox] Token refresh failed:", errorText);
        throw new Error(`Dropbox token refresh failed: ${response.status} - ${errorText}`);
      }
      
      const tokenData = await response.json();
      return tokenData.access_token;
    };
    
    const dropboxAccessToken = await getDropboxAccessToken();
    console.log("[test-dropbox] Successfully obtained access token");

    const folderName = `test_folder_${Date.now()}`;
    const fullPath = `${defaultDropboxParentFolder}/${folderName}`;
    
    console.log("[test-dropbox] Attempting to create test folder at:", fullPath);
    
    const dropboxResponse = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: fullPath, autorename: true })
    });
    
    let dropboxFolderId = null;
    let parentFolderCheck = false;
    
    if (dropboxResponse.ok) {
      const dropboxData = await dropboxResponse.json();
      dropboxFolderId = dropboxData.metadata.id;
      console.log("[test-dropbox] Test folder created successfully:", dropboxFolderId);
      
      // Clean up: delete the test folder
      await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropboxAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: fullPath })
      });
      parentFolderCheck = true;
    } else {
      const errorText = await dropboxResponse.text();
      console.warn("[test-dropbox] Folder creation failed, checking parent folder access instead:", errorText);
      
      const parentCheckResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropboxAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: defaultDropboxParentFolder })
      });
      parentFolderCheck = parentCheckResponse.ok;
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Test function executed',
        dropboxFolderId,
        fullPath,
        parentFolderCheck,
        status: dropboxFolderId ? 'success' : (parentFolderCheck ? 'partial' : 'failed')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("[test-dropbox] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
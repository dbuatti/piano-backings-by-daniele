// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIER_PRICES: Record<string, number> = {
  'note-bash': 15.00,
  'audition-ready': 30.00,
  'full-song': 50.00,
};

const ADDITIONAL_SERVICE_COSTS: Record<string, number> = {
  'rush-order': 15.00,
  'complex-songs': 10.00,
  'additional-edits': 5.00,
  'exclusive-ownership': 40.00,
};

function calculateRequestCost(request: any): number {
  let totalCost = 0;
  const tier = request.trackType || 'audition-ready'; 
  totalCost += TIER_PRICES[tier] || TIER_PRICES['audition-ready'];

  if (request.additionalServices && Array.isArray(request.additionalServices)) {
    request.additionalServices.forEach((service: string) => {
      totalCost += ADDITIONAL_SERVICE_COSTS[service] || 0;
    });
  }
  
  return parseFloat((Math.round(totalCost / 5) * 5).toFixed(2));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[create-backing-request] Received request");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Dropbox Config
    const dropboxAppKey = Deno.env.get('DROPBOX_APP_KEY');
    const dropboxAppSecret = Deno.env.get('DROPBOX_APP_SECRET');
    const dropboxRefreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN');
    const dropboxParentFolder = Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS';
    const logicTemplatePath = Deno.env.get('LOGIC_TEMPLATE_PATH') || '/Move over to NAS/PIANO BACKING TRACKS/00. TEMPLATE/X from Y prepared for Z.logicx';

    // Handle optional authentication
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader !== 'Bearer undefined') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (!userError && user) {
          userId = user.id;
        }
      } catch (authErr) {
        console.error("[create-backing-request] Auth error:", authErr.message);
      }
    }
    
    const { formData } = await req.json();
    if (!formData) throw new Error("Missing formData");

    const calculatedCost = calculateRequestCost(formData);
    const guestAccessToken = crypto.randomUUID();
    
    // 1. Create Database Record
    const { data: insertedRecords, error: insertError } = await supabaseAdmin
      .from('backing_requests')
      .insert([{
        user_id: userId,
        email: formData.email,
        name: formData.name,
        song_title: formData.songTitle,
        musical_or_artist: formData.musicalOrArtist,
        song_key: formData.songKey,
        track_type: formData.trackType,
        backing_type: formData.backingType || [formData.trackType],
        additional_services: formData.additionalServices,
        special_requests: formData.specialRequests,
        delivery_date: formData.deliveryDate,
        category: formData.category,
        guest_access_token: guestAccessToken,
        cost: calculatedCost,
        is_paid: formData.is_paid || false,
        sheet_music_urls: formData.sheetMusicUrls || [],
        voice_memo_urls: formData.voiceMemoUrls || [],
        youtube_link: formData.youtubeLink || null,
        voice_memo: formData.voiceMemo || null,
        different_key: formData.differentKey || 'No',
        key_for_track: formData.keyForTrack || null,
        internal_notes: formData.internal_notes || null,
      }])
      .select();

    if (insertError) throw insertError;
    const requestId = insertedRecords[0].id;

    // 2. Dropbox Automation
    let dropboxFolderId = null;
    let templateCopySuccess = false;

    if (dropboxAppKey && dropboxAppSecret && dropboxRefreshToken) {
      try {
        // Refresh Token
        const tokenResponse = await fetch('https://api.dropbox.com/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: dropboxRefreshToken,
            client_id: dropboxAppKey,
            client_secret: dropboxAppSecret
          })
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Determine Subfolder
        let subFolder = '00. FULL VERSIONS';
        if (formData.trackType === 'audition-ready') subFolder = '00. AUDITION CUTS';
        if (formData.trackType === 'note-bash') subFolder = '00. NOTE BASH';
        if (formData.trackType === 'quick' || formData.trackType === 'one-take') subFolder = '00. ROUGH CUTS';

        const firstName = formData.name ? formData.name.split(' ')[0] : 'Client';
        const folderName = `${formData.songTitle} - ${formData.musicalOrArtist} (${firstName})`;
        const fullPath = `${dropboxParentFolder}/${subFolder}/${folderName}`;

        // Create Folder
        const createFolderResponse = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fullPath, autorename: true })
        });
        
        if (createFolderResponse.ok) {
          const folderData = await createFolderResponse.json();
          dropboxFolderId = folderData.metadata.id;
          const actualPath = folderData.metadata.path_display;

          // Update DB with folder ID
          await supabaseAdmin.from('backing_requests').update({ dropbox_folder_id: dropboxFolderId }).eq('id', requestId);

          // Copy Logic Template
          const logicFileName = `${formData.songTitle} from ${formData.musicalOrArtist} prepared for ${firstName}.logicx`;
          const copyResponse = await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from_path: logicTemplatePath,
              to_path: `${actualPath}/${logicFileName}`,
              autorename: true
            })
          });
          templateCopySuccess = copyResponse.ok;
        }
      } catch (dbErr) {
        console.error("[create-backing-request] Dropbox error:", dbErr.message);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Success', 
        requestId,
        dropboxFolderId,
        templateCopySuccess,
        guestAccessToken: userId ? null : guestAccessToken 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("[create-backing-request] Critical error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
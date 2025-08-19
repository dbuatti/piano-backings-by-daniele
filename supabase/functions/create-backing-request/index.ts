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
    
    // Create a Supabase client with service role key (has full permissions)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request data
    const { formData } = await req.json();
    
    // Create a folder name based on the request
    const folderName = `${formData.name || 'anonymous'}-${Date.now()}`;
    
    // TODO: Implement Dropbox API integration here
    // This would require:
    // 1. Adding Dropbox API credentials as secrets in Supabase
    // 2. Using the Dropbox API to create a folder
    // 3. Saving the Dropbox folder information
    
    // For now, we'll just save to the database
    const { data, error } = await supabase
      .from('backing_requests')
      .insert([
        {
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
          // dropbox_folder: dropboxFolderId, // Will add this when we implement Dropbox
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Request submitted successfully',
        data 
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
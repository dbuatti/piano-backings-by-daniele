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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[create-backing-request] Received request");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Handle optional authentication
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader !== 'Bearer undefined') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError) {
          console.warn("[create-backing-request] Auth token provided but invalid:", userError.message);
        } else if (user) {
          userId = user.id;
          console.log("[create-backing-request] Authenticated user:", userId);
        }
      } catch (authErr) {
        console.error("[create-backing-request] Error verifying auth token:", authErr.message);
      }
    }
    
    const { formData } = await req.json();
    if (!formData) throw new Error("Missing formData in request body");

    console.log("[create-backing-request] Processing request for:", formData.email, formData.songTitle);

    const calculatedCost = calculateRequestCost(formData);
    const guestAccessToken = crypto.randomUUID();
    
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
        backing_type: formData.backingType || [formData.trackType], // Ensure backing_type is populated
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
        voice_memo: formData.voiceMemo || null, // Corrected from voiceMemoLink
        different_key: formData.differentKey || 'No',
        key_for_track: formData.keyForTrack || null,
        internal_notes: formData.internal_notes || null,
      }])
      .select();

    if (insertError) {
      console.error("[create-backing-request] Database insert error:", insertError);
      throw insertError;
    }

    console.log("[create-backing-request] Successfully created request:", insertedRecords[0].id);

    return new Response(
      JSON.stringify({ 
        message: 'Success', 
        requestId: insertedRecords[0].id,
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
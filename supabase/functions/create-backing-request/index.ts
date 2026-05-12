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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) userId = user.id;
    }
    
    const { formData } = await req.json();
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
        voice_memo: formData.voiceMemoLink || null,
        different_key: formData.differentKey || 'No',
        key_for_track: formData.keyForTrack || null,
      }])
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: 'Success', requestId: insertedRecords[0].id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
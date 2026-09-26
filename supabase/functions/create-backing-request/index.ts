// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { TIER_PRICES, SERVICE_COSTS } from '../_shared/pricing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calculateRequestCost(request: any): number {
  let totalCost = 0;
  const tier = request.trackType || 'audition-ready'; 
  totalCost += TIER_PRICES[tier] || TIER_PRICES['audition-ready'];

  if (request.additionalServices && Array.isArray(request.additionalServices)) {
    request.additionalServices.forEach((service: string) => {
      totalCost += SERVICE_COSTS[service] || 0;
    });
  }
  
  return parseFloat((Math.round(totalCost / 5) * 5).toFixed(2));
}

// A Season Pack credit covers the track itself; paid add-ons are still charged.
function calculateAddOnCost(request: any): number {
  const services = Array.isArray(request.additionalServices) ? request.additionalServices : [];
  return services.reduce((sum: number, service: string) => sum + (SERVICE_COSTS[service] || 0), 0);
}

async function refundCredit(supabaseAdmin, userId: string, creditType: string) {
  const { data: credit } = await supabaseAdmin
    .from('user_credits')
    .select('id, balance')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (credit) {
    await supabaseAdmin.from('user_credits').update({ balance: credit.balance + 1, updated_at: new Date().toISOString() }).eq('id', credit.id);
  }
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

    // Check if this is a re-trigger for an existing request (admin manual trigger)
    const isRetrigger = !!formData.requestId;
    let requestId: string;
    let guestAccessToken: string | null = null;
    let creditApplied = false;
    let requestCost = 0;
    let requestIsPaid = false;

    if (isRetrigger) {
      // Re-trigger: use existing request, skip DB insert / emails / Notion
      requestId = formData.requestId;
      console.log(`[create-backing-request] Re-triggering Dropbox for existing request: ${requestId}`);
    } else {
      // New request: full flow

      // Guard against duplicate submissions (e.g. a customer resubmitting the form after
      // a failed/abandoned Stripe checkout). If an unpaid request with the same email +
      // song was created in the last 20 minutes, reuse it instead of creating a new DB
      // row and firing a second round of client/admin emails.
      if (formData.email && formData.songTitle) {
        const dedupeWindow = new Date(Date.now() - 20 * 60 * 1000).toISOString();
        let dedupeQuery = supabaseAdmin
          .from('backing_requests')
          .select('id, cost, is_paid')
          .eq('email', formData.email)
          .eq('song_title', formData.songTitle)
          .eq('is_paid', false)
          .gte('created_at', dedupeWindow);
        dedupeQuery = formData.musicalOrArtist
          ? dedupeQuery.eq('musical_or_artist', formData.musicalOrArtist)
          : dedupeQuery.is('musical_or_artist', null);
        const { data: recentDupe } = await dedupeQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentDupe) {
          console.log(`[create-backing-request] Duplicate submission detected, reusing request: ${recentDupe.id}`);
          return new Response(
            JSON.stringify({
              message: 'Success',
              requestId: recentDupe.id,
              dropboxFolderId: null,
              guestAccessToken: null,
              deduped: true,
              creditApplied: false,
              requiresPayment: !recentDupe.is_paid && Number(recentDupe.cost || 0) > 0,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }

      guestAccessToken = crypto.randomUUID();

      // Credits are redeemed here, never trusted from the browser. The payment status
      // and cost are derived server-side too (formData.is_paid is ignored).
      const creditType = formData.trackType || 'audition-ready';
      // Older form versions sent is_paid: true for credit songs instead of useCredit.
      const wantsCredit = formData.useCredit ?? formData.is_paid === true;
      if (wantsCredit && userId) {
        const { data: redeemed, error: redeemError } = await supabaseAdmin.rpc('redeem_credit', {
          p_user_id: userId,
          p_credit_type: creditType,
        });
        if (redeemError) console.error('[create-backing-request] Credit redemption failed:', redeemError.message);
        creditApplied = redeemed === true;
      }
      const addOnCost = calculateAddOnCost(formData);
      requestCost = creditApplied ? addOnCost : calculateRequestCost(formData);
      requestIsPaid = creditApplied && addOnCost === 0;
      const creditNote = creditApplied
        ? (addOnCost > 0 ? `Track paid via Season Pack credit; add-ons ($${addOnCost.toFixed(2)}) charged separately` : 'Paid via Season Pack Credit')
        : null;

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
          cost: requestCost,
          is_paid: requestIsPaid,
          sheet_music_urls: formData.sheetMusicUrls || [],
          voice_memo_urls: formData.voiceMemoUrls || [],
          youtube_link: formData.youtubeLink || null,
          voice_memo: formData.voiceMemo || null,
          different_key: formData.differentKey || 'No',
          key_for_track: formData.keyForTrack || null,
          internal_notes: creditNote,
        }])
        .select();

      if (insertError) {
        if (creditApplied) await refundCredit(supabaseAdmin, userId, creditType);
        throw insertError;
      }
      requestId = insertedRecords[0].id;

      // Sync to Notion (fire-and-forget). Failures are logged inside sync-to-notion, not fatal.
      try {
        const supabaseUrlEnv = Deno.env.get('SUPABASE_URL') || supabaseUrl;
        fetch(`${supabaseUrlEnv}/functions/v1/sync-to-notion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`,
          },
          body: JSON.stringify({ type: 'request', id: requestId }),
        }).catch((e) => console.error('[create-backing-request] Notion sync trigger failed:', e.message));
      } catch (syncErr) {
        console.error('[create-backing-request] Notion sync dispatch error:', syncErr.message);
      }

      // Propagate name to all previous requests with the same email address
      if (formData.name && formData.email) {
        const { error: bulkNameError } = await supabaseAdmin
          .from('backing_requests')
          .update({ name: formData.name })
          .eq('email', formData.email);
        
        if (bulkNameError) {
          console.error("[create-backing-request] Error updating bulk names:", bulkNameError.message);
        }
      }

      // 2. Send "Order Received" Email to Client
      try {
        const firstName = formData.name ? formData.name.split(' ')[0] : 'Client';
        const tierLabel = formData.trackType?.replace('-', ' ').toUpperCase() || 'AUDITION READY';

        // Holiday mode: tell the client when work actually starts.
        let startNote = `I've received your materials and will begin working on your track soon.`;
        const { data: settings } = await supabaseAdmin
          .from('app_settings')
          .select('is_holiday_mode_active, holiday_mode_return_date')
          .limit(1)
          .maybeSingle();
        const returnDate = settings?.holiday_mode_return_date as string | null | undefined;
        if (settings?.is_holiday_mode_active && returnDate && returnDate > new Date().toISOString().slice(0, 10)) {
          const returnLabel = new Date(`${returnDate}T00:00:00Z`).toLocaleDateString('en-AU', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
          });
          startNote = `I've received your materials. I'm away at the moment and will start work on your track from ${returnLabel}.`;
        }
        
        const clientEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <p>Hi ${firstName},</p>
            <p>Thanks for your custom backing track request! ${startNote}</p>
            
            <div style="background-color: #f0ebfb; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1C0357;">Order Summary</h3>
              <p style="margin: 5px 0;"><strong>Song:</strong> ${formData.songTitle}</p>
              <p style="margin: 5px 0;"><strong>Artist/Musical:</strong> ${formData.musicalOrArtist}</p>
              <p style="margin: 5px 0;"><strong>Tier:</strong> ${tierLabel}</p>
              <p style="margin: 5px 0;"><strong>Requested Due Date:</strong> ${formData.deliveryDate || 'Standard (3-5 days)'}</p>
            </div>

            <p>You'll receive another email as soon as your track is ready for download. In the meantime, you can track the status of your order on your personal dashboard.</p>
            <p>Warmly,<br>Daniele Buatti</p>
          </div>
        `;

        await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email,
            subject: `Request Received: "${formData.songTitle}"`,
            html: clientEmailHtml,
            senderEmail: 'pianobackingsbydaniele@gmail.com'
          })
        });
        console.log("[create-backing-request] Client confirmation email sent");
      } catch (emailErr) {
        console.error("[create-backing-request] Client email error:", emailErr.message);
      }

      // 3. Send "New Request Report" Email to Admin
      try {
        const sheetMusicLinks = formData.sheetMusicUrls?.map(f => `<li><a href="${f.url}">${f.caption}</a></li>`).join('') || 'None';
        const voiceMemoLinks = formData.voiceMemoUrls?.map(f => `<li><a href="${f.url}">${f.caption}</a></li>`).join('') || 'None';
        const siteUrl = Deno.env.get('SITE_URL') || 'https://pianobackings.danielebuatti.com';

        const adminEmailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #1C0357; border-bottom: 2px solid #F538BC; padding-bottom: 10px;">New Track Request Report</h2>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1C0357; margin-top: 0;">Client Information</h3>
              <p><strong>Name:</strong> ${formData.name || 'N/A'}</p>
              <p><strong>Email:</strong> ${formData.email}</p>
              <p><strong>User ID:</strong> ${userId || 'Guest'}</p>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1C0357; margin-top: 0;">Song Details</h3>
              <p><strong>Title:</strong> ${formData.songTitle}</p>
              <p><strong>Musical/Artist:</strong> ${formData.musicalOrArtist}</p>
              <p><strong>Tier:</strong> ${formData.trackType?.replace('-', ' ').toUpperCase()}</p>
              <p><strong>Key:</strong> ${formData.songKey || 'N/A'}</p>
              <p><strong>Transposition:</strong> ${formData.differentKey} ${formData.keyForTrack ? `(To: ${formData.keyForTrack})` : ''}</p>
              <p><strong>Due Date:</strong> ${formData.deliveryDate || 'Standard'}</p>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1C0357; margin-top: 0;">Materials & Links</h3>
              <p><strong>Sheet Music:</strong></p>
              <ul>${sheetMusicLinks}</ul>
              <p><strong>Voice Memos:</strong></p>
              <ul>${voiceMemoLinks}</ul>
              <p><strong>YouTube:</strong> ${formData.youtubeLink ? `<a href="${formData.youtubeLink}">${formData.youtubeLink}</a>` : 'None'}</p>
              <p><strong>Additional Links:</strong> ${formData.additionalLinks || 'None'}</p>
            </div>

            <div style="background-color: #fff4fc; padding: 20px; border-radius: 8px; border: 1px solid #F538BC; margin: 20px 0;">
              <h3 style="color: #1C0357; margin-top: 0;">Requirements & Add-ons</h3>
              <p><strong>Services:</strong> ${formData.additionalServices?.join(', ') || 'None'}</p>
              <p><strong>Special Requests:</strong></p>
              <p style="font-style: italic; white-space: pre-wrap;">${formData.specialRequests || 'No special requests.'}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${siteUrl}/admin/request/${requestId}" 
                 style="background-color: #1C0357; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Open in Admin Dashboard
              </a>
            </div>
          </div>
        `;

        await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'pianobackingsbydaniele@gmail.com',
            cc: 'info@danielebuatti.com',
            subject: `NEW REQUEST: ${formData.songTitle} - ${formData.name || formData.email}`,
            html: adminEmailHtml,
            senderEmail: 'pianobackingsbydaniele@gmail.com'
          })
        });
        console.log("[create-backing-request] Admin notification email sent");
      } catch (adminEmailErr) {
        console.error("[create-backing-request] Admin email error:", adminEmailErr.message);
      }
    }

    // Dropbox Automation (runs for both new requests and re-triggers)
    let dropboxFolderId = null;
    let templateCopySuccess = false;

    console.log("[create-backing-request] Dropbox check:", { hasKey: !!dropboxAppKey, hasSecret: !!dropboxAppSecret, hasToken: !!dropboxRefreshToken });

    if (dropboxAppKey && dropboxAppSecret && dropboxRefreshToken) {
      try {
        console.log("[create-backing-request] Refreshing Dropbox token...");
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

        if (!accessToken) {
          console.error("[create-backing-request] Dropbox token refresh failed:", tokenData);
          throw new Error("Failed to get Dropbox access token");
        }
        console.log("[create-backing-request] Dropbox token refreshed OK");

        // Determine Subfolder
        let subFolder = '00. FULL VERSIONS';
        if (formData.trackType === 'audition-ready') subFolder = '00. AUDITION CUTS';
        if (formData.trackType === 'note-bash') subFolder = '00. NOTE BASH';
        if (formData.trackType === 'quick' || formData.trackType === 'one-take') subFolder = '00. ROUGH CUTS';

        const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
        const firstName = formData.name ? formData.name.split(' ')[0] : 'Client';
        
        // New Folder Naming Convention
        const folderName = `${datePrefix} ${formData.songTitle} from ${formData.musicalOrArtist} prepared for ${firstName}`;
        const fullPath = `${dropboxParentFolder}/${subFolder}/${folderName}`;

        console.log("[create-backing-request] Creating Dropbox folder:", fullPath);
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
          console.log("[create-backing-request] Dropbox folder created:", actualPath, dropboxFolderId);

          // Update DB with folder ID
          await supabaseAdmin.from('backing_requests').update({ dropbox_folder_id: dropboxFolderId }).eq('id', requestId);

          // Copy Logic Template
          try {
            const logicFileName = `${formData.songTitle} from ${formData.musicalOrArtist} prepared for ${firstName}.logicx`;
            console.log("[create-backing-request] Copying Logic Pro template from:", logicTemplatePath);
            const logicCopyResponse = await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from_path: logicTemplatePath,
                to_path: `${actualPath}/${logicFileName}`,
                autorename: true
              })
            });
            if (!logicCopyResponse.ok) {
              const logicErr = await logicCopyResponse.text();
              console.error(`[create-backing-request] Logic Pro template copy failed (${logicCopyResponse.status}):`, logicErr);
            } else {
              console.log("[create-backing-request] Logic Pro template copied OK");
            }
          } catch (logicErr) {
            console.error("[create-backing-request] Logic Pro template copy error:", logicErr.message);
          }

          // Copy Sheet Music (PDFs) to Dropbox
          if (formData.sheetMusicUrls && formData.sheetMusicUrls.length > 0) {
            for (const file of formData.sheetMusicUrls) {
              try {
                const fileResponse = await fetch(file.url);
                const fileBlob = await fileResponse.blob();
                const fileBuffer = await fileBlob.arrayBuffer();
                
                await fetch('https://content.dropboxapi.com/2/files/upload', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/octet-stream',
                    'Dropbox-API-Arg': JSON.stringify({
                      path: `${actualPath}/${file.caption}`,
                      mode: 'add',
                      autorename: true,
                      mute: false
                    })
                  },
                  body: fileBuffer
                });
              } catch (copyErr) {
                console.error("[create-backing-request] Error copying sheet music to Dropbox:", copyErr.message);
              }
            }
          }

          // Create Order Summary TXT file
          const summaryContent = `
ORDER SUMMARY
-------------
Request ID: ${requestId}
Date: ${new Date().toLocaleString()}

CLIENT INFORMATION
Name: ${formData.name || 'N/A'}
Email: ${formData.email}

SONG DETAILS
Title: ${formData.songTitle}
Musical/Artist: ${formData.musicalOrArtist}
Tier: ${formData.trackType?.replace('-', ' ').toUpperCase()}
Key: ${formData.songKey || 'N/A'}
Transposition: ${formData.differentKey} ${formData.keyForTrack ? `(To: ${formData.keyForTrack})` : ''}
Due Date: ${formData.deliveryDate || 'Standard'}

REQUIREMENTS & ADD-ONS
Services: ${formData.additionalServices?.join(', ') || 'None'}
YouTube: ${formData.youtubeLink || 'None'}
Additional Links: ${formData.additionalLinks || 'None'}

SPECIAL REQUESTS / NOTES:
${formData.specialRequests || 'No special requests.'}
          `.trim();

          try {
            const summaryResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                  path: `${actualPath}/Order Summary.txt`,
                  mode: 'add',
                  autorename: true,
                  mute: false
                })
              },
              body: new TextEncoder().encode(summaryContent)
            });
            if (!summaryResponse.ok) {
              const summaryErr = await summaryResponse.text();
              console.error(`[create-backing-request] Order Summary upload failed (${summaryResponse.status}):`, summaryErr);
            }
          } catch (summaryErr) {
            console.error("[create-backing-request] Order Summary upload error:", summaryErr.message);
          }
        } else {
          const folderErr = await createFolderResponse.text();
          console.error(`[create-backing-request] Dropbox folder creation failed (${createFolderResponse.status}):`, folderErr);
        }
      } catch (dbErr) {
        console.error("[create-backing-request] Dropbox error:", dbErr.message);
      }
    } else {
      console.log("[create-backing-request] Skipping Dropbox — missing credentials");
    }

    console.log("[create-backing-request] Done. dropboxFolderId:", dropboxFolderId);

    return new Response(
      JSON.stringify({ 
        message: 'Success', 
        requestId,
        dropboxFolderId,
        guestAccessToken: isRetrigger ? null : (userId ? null : guestAccessToken),
        creditApplied,
        requiresPayment: !isRetrigger && !requestIsPaid && requestCost > 0,
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
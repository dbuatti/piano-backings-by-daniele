// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { calculateRequestCost, sanitizeString, validateEmail, validateUrl } from './utils.ts';
// @ts-ignore
import { handleDropboxAutomation } from './dropbox.ts';

// Setup CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML Email signature template (Defined locally for Deno compatibility)
const EMAIL_SIGNATURE_HTML = `
<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td valign="top" style="padding-right: 20px; width: 150px;">
        <p style="margin: 0; font-weight: bold; color: #F538BC; font-size: 18px;">Daniele Buatti</p>
        <p style="margin: 5px 0 0 0; color: #1C0357; font-size: 14px;">Piano Backings by Daniele</p>
      </td>
      <td valign="top" style="border-left: 2px solid #F538BC; padding-left: 20px;">
        <p style="margin: 0; color: #333;"><strong style="color: #1C0357;">M</strong> 0424 174 067</p>
        <p style="margin: 5px 0; color: #333;"><strong style="color: #1C0357;">E</strong> <a href="mailto:pianobackingsbydaniele@gmail.com" style="color: #007bff; text-decoration: none;">pianobackingsbydaniele@gmail.com</a></p>
        <p style="margin: 10px 0 5px 0; font-weight: bold; color: #1C0357;">Piano Backings By Daniele</p>
        <p style="margin: 0;"><a href="https://www.facebook.com/PianoBackingsbyDaniele/" target="_blank" style="color: #007bff; text-decoration: none;">www.facebook.com/PianoBackingsbyDaniele/</a></p>
        <div style="margin-top: 15px;">
          <a href="https://www.facebook.com/PianoBackingsbyDaniele/" target="_blank" style="display: inline-block; margin-right: 5px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/1200px-2021_Facebook_icon.svg.png" alt="Facebook" width="24" height="24" style="vertical-align: middle;">
          </a>
          <a href="https://www.youtube.com/@pianobackingsbydaniele" target="_blank" style="display: inline-block; margin-right: 5px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1200px-YouTube_full-color_icon_%282017%29.svg.png" alt="YouTube" width="24" height="24" style="vertical-align: middle;">
          </a>
          <a href="https://www.instagram.com/pianobackingsbydaniele/" target="_blank" style="display: inline-block;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/1200px-Instagram_logo_2017%29.svg.png" alt="Instagram" width="24" height="24" style="vertical-align: middle;">
          </a>
        </div>
      </td>
    </tr>
  </table>
</div>
`;

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 0. Setup Environment and Clients ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const defaultSenderEmail = Deno.env.get('GMAIL_USER') || 'pianobackingsbydaniele@gmail.com';
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- 1. Authentication and User Info ---
    let userId = null;
    let userEmail = null;
    let userName = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        
        if (!userError && user) {
          userId = user.id;
          userEmail = user.email;
          userName = user.user_metadata?.full_name || null;
        }
      } catch (authError) {
        // Ignore auth errors if the request is anonymous
      }
    }
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      const rawBody = await req.text();
      throw new Error(`Invalid JSON in request body: ${parseError.message}. Raw body: ${rawBody.substring(0, 200)}...`);
    }

    const { formData } = requestBody;
    if (!formData) {
      throw new Error('Missing formData in request body.');
    }
    
    // --- 2. Validate and Sanitize Inputs ---
    const sanitizedData = {
      email: validateEmail(formData.email),
      name: sanitizeString(formData.name, 100),
      phone: sanitizeString(formData.phone, 50),
      songTitle: sanitizeString(formData.songTitle, 255),
      musicalOrArtist: sanitizeString(formData.musicalOrArtist, 255),
      songKey: sanitizeString(formData.songKey, 50),
      differentKey: sanitizeString(formData.differentKey, 50),
      keyForTrack: sanitizeString(formData.keyForTrack, 50),
      youtubeLink: validateUrl(formData.youtubeLink),
      voiceMemo: validateUrl(formData.voiceMemo),
      voiceMemoFileUrl: validateUrl(formData.voiceMemoFileUrl),
      sheetMusicUrl: validateUrl(formData.sheetMusicUrl),
      trackPurpose: sanitizeString(formData.trackPurpose, 50),
      backingType: Array.isArray(formData.backingType) ? formData.backingType.map((t: string) => sanitizeString(t, 50)).filter(Boolean) : [],
      deliveryDate: sanitizeString(formData.deliveryDate, 50),
      additionalServices: Array.isArray(formData.additionalServices) ? formData.additionalServices.map((s: string) => sanitizeString(s, 50)).filter(Boolean) : [],
      specialRequests: sanitizeString(formData.specialRequests, 1000),
      category: sanitizeString(formData.category, 50),
      trackType: sanitizeString(formData.trackType, 50),
      additionalLinks: validateUrl(formData.additionalLinks),
    };
    
    // Use sanitized data for user info if not obtained from auth
    userEmail = userEmail || sanitizedData.email;
    userName = userName || sanitizedData.name;
    
    // --- 3. Calculate Cost ---
    const calculatedCost = calculateRequestCost({
      trackType: sanitizedData.trackType,
      backingType: sanitizedData.backingType,
      additionalServices: sanitizedData.additionalServices,
    });

    // --- 4. Dropbox Automation ---
    const dropboxConfig = {
      dropboxAppKey: Deno.env.get('DROPBOX_APP_KEY') || '',
      dropboxAppSecret: Deno.env.get('DROPBOX_APP_SECRET') || '',
      dropboxRefreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN') || '',
      defaultDropboxParentFolder: Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS',
      templateFilePath: Deno.env.get('LOGIC_TEMPLATE_PATH') || '/_Template/X from Y prepared for Z.logicx',
      rapidApiKey: Deno.env.get('RAPIDAPI_KEY') || '',
    };

    const dropboxResult = await handleDropboxAutomation(dropboxConfig, sanitizedData, userName || sanitizedData.email);
    
    // --- 5. Database Insertion ---
    const guestAccessToken = crypto.randomUUID();
    
    const { data: insertedRecords, error: insertError } = await supabaseAdmin
      .from('backing_requests')
      .insert([
        {
          user_id: userId,
          email: sanitizedData.email,
          name: sanitizedData.name,
          phone: sanitizedData.phone,
          song_title: sanitizedData.songTitle,
          musical_or_artist: sanitizedData.musicalOrArtist,
          song_key: sanitizedData.songKey,
          different_key: sanitizedData.differentKey,
          key_for_track: sanitizedData.keyForTrack,
          youtube_link: sanitizedData.youtubeLink,
          voice_memo: sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl,
          sheet_music_url: sanitizedData.sheetMusicUrl,
          track_purpose: sanitizedData.trackPurpose,
          backing_type: sanitizedData.backingType,
          delivery_date: sanitizedData.deliveryDate,
          additional_services: sanitizedData.additionalServices,
          special_requests: sanitizedData.specialRequests,
          dropbox_folder_id: dropboxResult.dropboxFolderId,
          track_type: sanitizedData.trackType,
          additional_links: sanitizedData.additionalLinks,
          guest_access_token: guestAccessToken,
          cost: calculatedCost,
          category: sanitizedData.category,
        }
      ])
      .select();

    if (insertError) {
      throw insertError;
    }

    const newRequestData = insertedRecords && insertedRecords.length > 0 ? insertedRecords[0] : null;
    if (!newRequestData) {
        throw new Error('Failed to insert backing request into database: No data returned after insert.');
    }

    // --- 6. Email Notifications ---
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const clientTrackViewLink = `${siteUrl}/track/${newRequestData.id}?token=${guestAccessToken}`;
    const firstName = userName ? userName.split(' ')[0] : 'there';

    // --- Client Confirmation Email ---
    const clientEmailSubject = `Confirmation: Your Backing Track Request for "${sanitizedData.songTitle}"`;
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #1C0357;">Request Submitted Successfully!</h2>
        
        <p>Hi ${firstName},</p>
        <p>Thank you for submitting your custom piano backing track request for <strong>"${sanitizedData.songTitle}"</strong> from <strong>${sanitizedData.musicalOrArtist}</strong>.</p>
        <p>We have received your request and will be in touch within <strong>24-48 hours</strong> with a quote and estimated delivery date.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1C0357;">Your Request Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Song Title:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.songTitle}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Musical/Artist:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.musicalOrArtist}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.category?.replace('-', ' ') || 'N/A'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Track Type:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.trackType?.replace('-', ' ') || 'N/A'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Sheet Music Key:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.songKey || 'N/A'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Different Key Required:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.differentKey || 'No'}</td></tr>
            ${sanitizedData.differentKey === 'Yes' ? `<tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Requested Key:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.keyForTrack || 'N/A'}</td></tr>` : ''}
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Backing Type(s):</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') || 'Not specified'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Delivery Date:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.deliveryDate ? new Date(sanitizedData.deliveryDate).toLocaleDateString() : 'Not specified'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Additional Services:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee; text-transform: capitalize;">${sanitizedData.additionalServices.map((service: string) => service.replace('-', ' ')).join(', ') || 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">YouTube Link:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.youtubeLink ? `<a href="${sanitizedData.youtubeLink}">${sanitizedData.youtubeLink}</a>` : 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Additional Links:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.additionalLinks ? `<a href="${sanitizedData.additionalLinks}">${sanitizedData.additionalLinks}</a>` : 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Voice Memo Link:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl ? `<a href="${sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl}">${sanitizedData.voiceMemo || sanitizedData.voiceMemoFileUrl}</a>` : 'None'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Sheet Music:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.sheetMusicUrl ? `<a href="${sanitizedData.sheetMusicUrl}">View Sheet Music</a>` : 'Not provided'}</td></tr>
            <tr><td style="padding: 5px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone Number:</td><td style="padding: 5px 0; border-bottom: 1px solid #eee;">${sanitizedData.phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: bold;">Special Requests:</td><td style="padding: 5px 0;">${sanitizedData.specialRequests || 'None'}</td></tr>
          </table>
        </div>

        <p style="margin-top: 20px;">You can view the status of your request and any updates on your personal track page:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${clientTrackViewLink}" 
             style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Your Track Details
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">
          This email was automatically generated by Piano Backings by Daniele.
        </p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `;
    
    await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        to: sanitizedData.email,
        subject: clientEmailSubject,
        html: clientEmailHtml,
        senderEmail: defaultSenderEmail
      })
    });

    // --- Admin Notification Email ---
    const adminEmailSubject = `New Backing Track Request: ${sanitizedData.songTitle}`;
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1C0357;">New Backing Track Request</h2>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1C0357;">Request Details</h3>
          
          <div style="margin-bottom: 10px;">
            <strong>Song:</strong> ${sanitizedData.songTitle}<br>
            <strong>Musical/Artist:</strong> ${sanitizedData.musicalOrArtist}<br>
            <strong>Requested by:</strong> ${userName || 'N/A'} (${sanitizedData.email})<br>
            ${sanitizedData.phone ? `<strong>Phone:</strong> ${sanitizedData.phone}<br>` : ''}
            <strong>Submitted:</strong> ${new Date().toLocaleString()}
          </div>
          
          <div style="margin-bottom: 10px;">
            <strong>Backing Type(s):</strong> ${sanitizedData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') || 'Not specified'}<br>
            <strong>Track Purpose:</strong> ${sanitizedData.trackPurpose?.replace('-', ' ') || 'Not specified'}<br>
            ${sanitizedData.deliveryDate ? `<strong>Delivery Date:</strong> ${new Date(sanitizedData.deliveryDate).toLocaleDateString()}<br>` : ''}
          </div>
          
          ${sanitizedData.additionalServices && sanitizedData.additionalServices.length > 0 ? `
            <div style="margin-bottom: 10px;">
              <strong>Additional Services:</strong><br>
              <ul style="margin: 5px 0; padding-left: 20px;">
                ${sanitizedData.additionalServices.map((service: string) => `<li>${service.replace('-', ' ')}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${sanitizedData.specialRequests ? `
            <div style="margin-bottom: 10px;">
              <strong>Special Requests:</strong><br>
              <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 3px;">${sanitizedData.specialRequests}</p>
            </div>
          ` : ''}

          ${sanitizedData.additionalLinks ? `
            <div style="margin-bottom: 10px;">
              <strong>Additional Links:</strong><br>
              <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 3px;"><a href="${sanitizedData.additionalLinks}">${sanitizedData.additionalLinks}</a></p>
            </div>
          ` : ''}
        </div>
        
        <div style="margin: 20px 0;">
          <a href="${siteUrl}/admin/request/${newRequestData.id}" 
             style="background-color: #1C0357; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Request Details
          </a>
        </div>
        
        <p style="font-size: 12px; color: #666;">
          This email was automatically generated by Piano Backings by Daniele.
        </p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `;
    
    await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        to: defaultSenderEmail,
        subject: adminEmailSubject,
        html: adminEmailHtml,
        senderEmail: defaultSenderEmail
      })
    });

    // --- 7. Final Response ---
    const responsePayload: any = { 
      message: 'Request submitted successfully',
      insertedRequest: newRequestData,
      guestAccessToken,
      calculatedCost,
      ...dropboxResult,
    };

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
        status: 500
      }
    );
  }
});
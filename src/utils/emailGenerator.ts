import { GoogleGenerativeAI } from "@google/generative-ai"; // Added: Import GoogleGenerativeAI
import { calculateRequestCost } from "./pricing"; // Import the pricing utility

export interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined; // Updated to be more robust
}

export interface BackingRequest {
  id?: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  track_purpose: string;
  backing_type: string[]; // Changed to array
  delivery_date: string;
  special_requests?: string; // Made optional
  song_key: string;
  additional_services: string[];
  track_type: string;
  youtube_link?: string;
  voice_memo?: string;
  additional_links?: string; // Added new field
  track_urls?: TrackInfo[]; // Changed to array of TrackInfo objects
  cost?: number; // Added cost for payment reminders
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled'; // Added status
  created_at?: string; // Added created_at
  is_paid?: boolean; // Added is_paid
  category?: string; // Added category
  user_id?: string | null; // Added user_id
  guest_access_token?: string | null; // Added guest_access_token
  final_price?: number | null; // New field
  estimated_cost_low?: number | null; // New field
  estimated_cost_high?: number | null; // New field
}

// New interface for Product
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_urls?: TrackInfo[] | null; // Changed from track_url to track_urls (array of TrackInfo)
  is_active: boolean;
  vocal_ranges?: string[]; // New field for vocal ranges
  key_signature?: string | null; // Added new field
  sheet_music_url?: string | null; // Added new field
}

// HTML Email signature template (Moved from stripe-webhook)
export const EMAIL_SIGNATURE_HTML = `
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

// Helper function to convert plain text to basic HTML paragraphs (Moved from stripe-webhook)
export const textToHtml = (text: string) => {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">` +
         text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('') +
         `</div>`;
};

// Helper to generate track list HTML
const generateTrackListHtml = (trackUrls?: TrackInfo[]) => {
  if (!trackUrls || trackUrls.length === 0) return '';
  
  const listItems = trackUrls.map(track => `
    <li style="margin-bottom: 5px;">
      <a href="${track.url}" style="color: #007bff; text-decoration: none; font-weight: bold;">
        ${track.caption || 'Download Track'}
      </a>
    </li>
  `).join('');

  return `
    <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #F538BC; border-radius: 4px;">
      <p style="margin-top: 0; font-weight: bold; color: #1C0357;">Your Completed Track(s):</p>
      <ul style="list-style: none; padding: 0; margin-top: 10px;">
        ${listItems}
      </ul>
      <p style="margin-top: 15px; font-size: 0.9em; color: #666;">
        Click on the track name to download.
      </p>
    </div>
  `;
};

// Helper to generate track list HTML for products
const generateProductTrackListHtml = (trackUrls?: TrackInfo[] | null) => {
  if (!trackUrls || trackUrls.length === 0) return '';
  
  const listItems = trackUrls.map(track => `
    <li style="margin-bottom: 5px;">
      <a href="${track.url}" style="color: #007bff; text-decoration: none; font-weight: bold;">
        ${track.caption || 'Download Track'}
      </a>
    </li>
  `).join('');

  return `
    <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #F538BC; border-radius: 4px;">
      <p style="margin-top: 0; font-weight: bold; color: #1C0357;">Your Purchased Track(s):</p>
      <ul style="list-style: none; padding: 0; margin-top: 10px;">
        ${listItems}
      </ul>
      <p style="margin-top: 15px; font-size: 0.9em; color: #666;">
        Click on the track name to download.
      </p>
    </div>
  `;
};

export const generateCompletionEmail = async (request: BackingRequest) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const firstName = request.name.split(' ')[0];
  const siteUrl = window.location.origin;
  let clientPortalLink = `${siteUrl}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${siteUrl}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${siteUrl}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${siteUrl}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }
  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const trackListHtml = generateTrackListHtml(request.track_urls);

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback completion email template");
    return generateFallbackCompletionEmail(request);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional email for a client whose custom backing track is now complete.
    
    Client details:
    - Name: "${request.name}"
    - Email: "${request.email}"
    - Song Title: "${request.song_title}"
    - Musical/Artist: "${request.musical_or_artist}"
    - Track Purpose: "${request.track_purpose}"
    - Backing Type(s): ${request.backing_type.join(', ')}
    - Delivery Date: ${request.delivery_date}
    - Special Requests: ${request.special_requests || 'None'}
    - Client Portal Link: ${clientPortalLink}
    - Feedback Link: ${feedbackLink}
    - Track List HTML: ${trackListHtml}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly states the track is complete.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Confirm the completion of their custom backing track for "${request.song_title}".
    4. Include the "Track List HTML" directly in the email body to list all downloadable tracks.
    5. Encourage them to review the track and offer revisions if needed.
    6. Provide the "Client Portal Link" for them to view details and download the track.
    7. Express gratitude for their business.
    8. Keep the tone professional yet friendly.
    9. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    10. Add a small section asking for feedback on their experience with the new app, providing a link to the homepage with '?openFeedback=true' query parameter.
    
    Format the response as JSON with two fields:
    {
      "subject": "Email subject line",
      "html": "Full HTML email body content"
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const emailData = JSON.parse(text);
      emailData.html += EMAIL_SIGNATURE_HTML;
      return emailData;
    } catch (parseError) {
      console.error('Error parsing Gemini response for completion email:', parseError);
      return generateFallbackCompletionEmail(request);
    }
  } catch (error) {
    console.error('Error generating completion email copy with Gemini:', error);
    return generateFallbackCompletionEmail(request);
  }
};

const generateFallbackCompletionEmail = (request: BackingRequest) => {
  const firstName = request.name.split(' ')[0];
  const siteUrl = window.location.origin;
  let clientPortalLink = `${siteUrl}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${siteUrl}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${siteUrl}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${siteUrl}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }

  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const trackListHtml = generateTrackListHtml(request.track_urls);

  const trackAccessSection = `
    <p style="margin-top: 20px;">Your custom piano backing track for <strong>"${request.song_title}"</strong> is now complete and ready for you!</p>
    ${trackListHtml}
    <p style="margin-top: 20px;">You can view your request and access your track on your dedicated client page:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${clientPortalLink}" 
         style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        View Your Track Details
      </a>
    </p>
  `;

  return {
    subject: `Your "${request.song_title}" backing track is ready!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>I hope this email finds you well!</p>
        ${trackAccessSection}
        <p style="margin-top: 20px;">I've put a lot of care into crafting this track for you. If, after listening, you feel any adjustments are needed—whether it's a slight tempo change, dynamics, or anything else—please don't hesitate to reply to this email. I'm happy to make revisions to ensure it's perfect for your needs.</p>
        <p style="margin-top: 20px;">
          I'm always looking to improve! If you have a moment, I'd love to hear about your experience using the new app. 
          You can share your feedback or report any issues by clicking <a href="${feedbackLink}" style="color: #007bff; text-decoration: none;">here</a>.
        </p>
        <p style="margin-top: 20px;">Warmly,</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `
  };
};

export const generatePaymentReminderEmail = async (request: BackingRequest) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const firstName = request.name.split(' ')[0];
  const siteUrl = window.location.origin;
  let clientPortalLink = `${siteUrl}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${siteUrl}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${siteUrl}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${siteUrl}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }
  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const trackListHtml = request.status === 'completed' ? generateTrackListHtml(request.track_urls) : '';

  let costDisplayHtml = '';
  const calculatedCost = calculateRequestCost(request).totalCost;
  const calculatedLow = (Math.ceil((calculatedCost * 0.5) / 5) * 5).toFixed(2);
  const calculatedHigh = (Math.floor((calculatedCost * 1.5) / 5) * 5).toFixed(2);

  // Determine the suggested cost value
  const suggestedCostValue = (request.final_price !== null && request.final_price !== undefined)
    ? request.final_price
    : calculatedCost; // Fallback to calculated cost if final_price is not set

  const suggestedCostHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                                 <strong>Suggested Cost:</strong> $${suggestedCostValue.toFixed(2)}
                               </p>`;

  let estimatedRangeHtml = '';
  if (request.estimated_cost_low !== null && request.estimated_cost_high !== null &&
      request.estimated_cost_low !== undefined && request.estimated_cost_high !== undefined) {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${request.estimated_cost_low.toFixed(2)} - $${request.estimated_cost_high.toFixed(2)}
                          </p>`;
  } else {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${calculatedLow} - $${calculatedHigh}
                          </p>`;
  }

  // Combine them in the desired order
  costDisplayHtml = `${estimatedRangeHtml}${suggestedCostHtml}`;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback payment reminder email template");
    return generateFallbackPaymentReminderEmail(request);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional payment reminder email for a client.
    
    Client details:
    - Name: "${request.name}"
    - Email: "${request.email}"
    - Song Title: "${request.song_title}"
    - Musical/Artist: "${request.musical_or_artist}"
    - Track Status: "${request.status}"
    - Client Portal Link: ${clientPortalLink}
    - Feedback Link: ${feedbackLink}
    - Track List HTML: ${trackListHtml}
    - Cost Display HTML: ${costDisplayHtml}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly indicates it's a payment reminder for their track.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Remind them about their backing track request for "${request.song_title}".
    4. If the track is 'completed', include the "Track List HTML" and mention it's ready for download.
    5. Include the "Cost Display HTML" to clearly show the estimated and suggested costs.
    6. Provide clear instructions on how to make the payment, including "Buy Me a Coffee" (preferred) and bank transfer details.
    7. Provide the "Client Portal Link" for them to view details and make payment.
    8. Express gratitude for their business.
    9. Keep the tone professional yet friendly.
    10. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    11. Add a small section asking for feedback on their experience with the new app, providing a link to the homepage with '?openFeedback=true' query parameter.
    
    Format the response as JSON with two fields:
    {
      "subject": "Email subject line",
      "html": "Full HTML email body content"
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const emailData = JSON.parse(text);
      emailData.html += EMAIL_SIGNATURE_HTML;
      return emailData;
    } catch (parseError) {
      console.error('Error parsing Gemini response for payment reminder email:', parseError);
      return generateFallbackPaymentReminderEmail(request);
    }
  } catch (error) {
    console.error('Error generating payment reminder email copy with Gemini:', error);
    return generateFallbackPaymentReminderEmail(request);
  }
};

const generateFallbackPaymentReminderEmail = (request: BackingRequest) => {
  const firstName = request.name.split(' ')[0];
  const siteUrl = window.location.origin;
  let clientPortalLink = `${siteUrl}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${siteUrl}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${siteUrl}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${siteUrl}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }

  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const trackListHtml = request.status === 'completed' ? generateTrackListHtml(request.track_urls) : '';

  let costDisplayHtml = '';
  const calculatedCost = calculateRequestCost(request).totalCost;
  const calculatedLow = (Math.ceil((calculatedCost * 0.5) / 5) * 5).toFixed(2);
  const calculatedHigh = (Math.floor((calculatedCost * 1.5) / 5) * 5).toFixed(2);

  // Determine the suggested cost value
  const suggestedCostValue = (request.final_price !== null && request.final_price !== undefined)
    ? request.final_price
    : calculatedCost; // Fallback to calculated cost if final_price is not set

  const suggestedCostHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                                 <strong>Suggested Cost:</strong> $${suggestedCostValue.toFixed(2)}
                               </p>`;

  let estimatedRangeHtml = '';
  if (request.estimated_cost_low !== null && request.estimated_cost_high !== null &&
      request.estimated_cost_low !== undefined && request.estimated_cost_high !== undefined) {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${request.estimated_cost_low.toFixed(2)} - $${request.estimated_cost_high.toFixed(2)}
                          </p>`;
  } else {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${calculatedLow} - $${calculatedHigh}
                          </p>`;
  }

  // Combine them in the desired order
  costDisplayHtml = `${estimatedRangeHtml}${suggestedCostHtml}`;

  return {
    subject: `Payment Reminder: Your Piano Backing Track for "${request.song_title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>I hope you're having a good week!</p>
        <p>This is a friendly reminder regarding your recent piano backing track request for <strong>"${request.song_title}"</strong>.</p>
        ${trackListHtml}
        ${costDisplayHtml}
        <p>You can view the full details of your request and make your payment via the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${clientPortalLink}" 
             style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Request & Make Payment
          </a>
        </p>
        <p style="margin-top: 20px;">
          You can make your payment using one of the following methods:
        </p>
        <ul style="list-style: none; padding: 0; margin-top: 10px;">
          <li style="margin-bottom: 10px;">
            <strong>Buy Me a Coffee (Preferred):</strong> <a href="https://buymeacoffee.com/Danielebuatti" target="_blank" style="color: #007bff; text-decoration: none;">https://buymeacoffee.com/Danielebuatti</a>
          </li>
          <li>
            <strong>Direct Bank Transfer:</strong><br>
            BSB: 923100<br>
            Account: 301110875
          </li>
        </ul>
        <p style="margin-top: 20px;">
          Please let me know if you have any questions or if there's anything else I can assist you with.
        </p>
        <p style="margin-top: 20px;">
          I'm always looking to improve! If you have a moment, I'd love to hear about your experience using the new app. 
          You can share your feedback or report any issues by clicking <a href="${feedbackLink}" style="color: #007bff; text-decoration: none;">here</a>.
        </p>
        <p style="margin-top: 20px;">Warmly,</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `
  };
};

export const generateCompletionAndPaymentEmail = async (request: BackingRequest) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const firstName = request.name.split(' ')[0];
  const siteUrl = window.location.origin;
  let clientPortalLink = `${siteUrl}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${siteUrl}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${siteUrl}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${siteUrl}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }
  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const trackListHtml = generateTrackListHtml(request.track_urls);

  let costDisplayHtml = '';
  const calculatedCost = calculateRequestCost(request).totalCost;
  const calculatedLow = (Math.ceil((calculatedCost * 0.5) / 5) * 5).toFixed(2);
  const calculatedHigh = (Math.floor((calculatedCost * 1.5) / 5) * 5).toFixed(2);

  // Determine the suggested cost value
  const suggestedCostValue = (request.final_price !== null && request.final_price !== undefined)
    ? request.final_price
    : calculatedCost; // Fallback to calculated cost if final_price is not set

  const suggestedCostHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                                 <strong>Suggested Cost:</strong> $${suggestedCostValue.toFixed(2)}
                               </p>`;

  let estimatedRangeHtml = '';
  if (request.estimated_cost_low !== null && request.estimated_cost_high !== null &&
      request.estimated_cost_low !== undefined && request.estimated_cost_high !== undefined) {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${request.estimated_cost_low.toFixed(2)} - $${request.estimated_cost_high.toFixed(2)}
                          </p>`;
  } else {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${calculatedLow} - $${calculatedHigh}
                          </p>`;
  }

  // Combine them in the desired order
  costDisplayHtml = `${estimatedRangeHtml}${suggestedCostHtml}`;

  const trackAccessSection = `
    <p style="margin-top: 20px;">Your custom piano backing track for <strong>"${request.song_title}"</strong> is now complete and ready for you!</p>
    ${trackListHtml}
    <p style="margin-top: 20px;">You can view all your request details, including payment information, and access your track on your dedicated client page:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${clientPortalLink}" 
         style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        View Request & Make Payment
      </a>
    </p>
  `;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback completion and payment email template");
    return generateFallbackCompletionAndPaymentEmail(request);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional email for a client whose custom backing track is now complete and also includes payment information.
    
    Client details:
    - Name: "${request.name}"
    - Email: "${request.email}"
    - Song Title: "${request.song_title}"
    - Musical/Artist: "${request.musical_or_artist}"
    - Track Purpose: "${request.track_purpose}"
    - Backing Type(s): ${request.backing_type.join(', ')}
    - Delivery Date: ${request.delivery_date}
    - Special Requests: ${request.special_requests || 'None'}
    - Client Portal Link: ${clientPortalLink}
    - Feedback Link: ${feedbackLink}
    - Track List HTML: ${trackListHtml}
    - Cost Display HTML: ${costDisplayHtml}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly states the track is complete and includes payment information.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Confirm the completion of their custom backing track for "${request.song_title}".
    4. Include the "Track List HTML" directly in the email body to list all downloadable tracks.
    5. Encourage them to review the track and offer revisions if needed.
    6. Provide the "Client Portal Link" for them to view details, download the track, and make payment.
    7. Include the "Cost Display HTML" to clearly show the estimated and suggested costs.
    8. Provide clear instructions on how to make the payment, including "Buy Me a Coffee" (preferred) and bank transfer details.
    9. Express gratitude for their business.
    10. Keep the tone professional yet friendly.
    11. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    12. Add a small section asking for feedback on their experience with the new app, providing a link to the homepage with '?openFeedback=true' query parameter.
    
    Format the response as JSON with two fields:
    {
      "subject": "Email subject line",
      "html": "Full HTML email body content"
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const emailData = JSON.parse(text);
      emailData.html += EMAIL_SIGNATURE_HTML;
      return emailData;
    } catch (parseError) {
      console.error('Error parsing Gemini response for completion and payment email:', parseError);
      return generateFallbackCompletionAndPaymentEmail(request);
    }
  } catch (error) {
    console.error('Error generating completion and payment email copy with Gemini:', error);
    return generateFallbackCompletionAndPaymentEmail(request);
  }
};

const generateFallbackCompletionAndPaymentEmail = (request: BackingRequest) => {
  const firstName = request.name.split(' ')[0];
  const siteUrl = window.location.origin;
  let clientPortalLink = `${siteUrl}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${siteUrl}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${siteUrl}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${siteUrl}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }

  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const trackListHtml = generateTrackListHtml(request.track_urls);

  let costDisplayHtml = '';
  const calculatedCost = calculateRequestCost(request).totalCost;
  const calculatedLow = (Math.ceil((calculatedCost * 0.5) / 5) * 5).toFixed(2);
  const calculatedHigh = (Math.floor((calculatedCost * 1.5) / 5) * 5).toFixed(2);

  // Determine the suggested cost value
  const suggestedCostValue = (request.final_price !== null && request.final_price !== undefined)
    ? request.final_price
    : calculatedCost; // Fallback to calculated cost if final_price is not set

  const suggestedCostHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                                 <strong>Suggested Cost:</strong> $${suggestedCostValue.toFixed(2)}
                               </p>`;

  let estimatedRangeHtml = '';
  if (request.estimated_cost_low !== null && request.estimated_cost_high !== null &&
      request.estimated_cost_low !== undefined && request.estimated_cost_high !== undefined) {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${request.estimated_cost_low.toFixed(2)} - $${request.estimated_cost_high.toFixed(2)}
                          </p>`;
  } else {
    estimatedRangeHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                            <strong>Estimated Range:</strong> $${calculatedLow} - $${calculatedHigh}
                          </p>`;
  }

  // Combine them in the desired order
  costDisplayHtml = `${estimatedRangeHtml}${suggestedCostHtml}`;

  const trackAccessSection = `
    <p style="margin-top: 20px;">Your custom piano backing track for <strong>"${request.song_title}"</strong> is now complete and ready for you!</p>
    ${trackListHtml}
    <p style="margin-top: 20px;">You can view all your request details, including payment information, and access your track on your dedicated client page:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${clientPortalLink}" 
         style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        View Request & Make Payment
      </a>
    </p>
  `;

  return {
    subject: `Your "${request.song_title}" backing track is ready & Payment Information`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>I hope this email finds you well!</p>
        ${trackAccessSection}
        <p style="margin-top: 20px;">I've put a lot of care into crafting this track for you. If, after listening, you feel any adjustments are needed—whether it's a slight tempo change, dynamics, or anything else—please don't hesitate to reply to this email. I'm happy to make revisions to ensure it's perfect for your needs.</p>
        
        ${costDisplayHtml}
        <p style="margin-top: 20px;">
          You can make your payment using one of the following methods:
        </p>
        <ul style="list-style: none; padding: 0; margin-top: 10px;">
          <li style="margin-bottom: 10px;">
            <strong>Buy Me a Coffee (Preferred):</strong> <a href="https://buymeacoffee.com/Danielebuatti" target="_blank" style="color: #007bff; text-decoration: none;">https://buymeacoffee.com/Danielebuatti</a>
          </li>
          <li>
            <strong>Direct Bank Transfer:</strong><br>
            BSB: 923100<br>
            Account: 301110875
          </li>
        </ul>
        <p style="margin-top: 20px;">
          Please let me know if you have any questions or if there's anything else I can assist you with.
        </p>
        <p style="margin-top: 20px;">
          I'm always looking to improve! If you have a moment, I'd love to hear about your experience using the new app. 
          You can share your feedback or report any issues by clicking <a href="${feedbackLink}" style="color: #007bff; text-decoration: none;">here</a>.
        </p>
        <p style="margin-top: 20px;">Warmly,</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `
  };
};

export const generateProductDeliveryEmail = async (product: Product, customerEmail: string) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const firstName = customerEmail.split('@')[0]; // Use email prefix as a fallback for first name
  const siteUrl = window.location.origin; // Use window.location.origin for client-side
  const shopLink = `${siteUrl}/shop`;
  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const productTrackListHtml = generateProductTrackListHtml(product.track_urls);


  if (!product.track_urls || product.track_urls.length === 0) {
    throw new Error(`Product ${product.title} (ID: ${product.id}) does not have any track_urls for delivery.`);
  }

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") { // Check for placeholder
    console.log("Gemini API key not configured, using fallback product delivery template");
    return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey); // Initialize here with Deno API key
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional email for a customer who has just purchased a digital product from your shop.
    
    Product details:
    - Product Title: "${product.title}"
    - Product Description: ${product.description}
    - Customer Email: ${customerEmail}
    - Shop Link: ${shopLink}
    - Feedback Link: ${feedbackLink}
    - Product Track List HTML: ${productTrackListHtml}
    - Vocal Ranges: ${product.vocal_ranges && product.vocal_ranges.length > 0 ? product.vocal_ranges.join(', ') : 'None specified'}
    - Key Signature: ${product.key_signature || 'None specified'}
    - Sheet Music URL: ${product.sheet_music_url || 'None provided'}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly states the purchase is confirmed and the product is ready for download.
    2. Open with a warm, personalized greeting using the customer's first name (derived from their email if no name is available).
    3. Confirm the purchase of "${product.title}".
    4. Include the "Product Track List HTML" directly in the email body to list all downloadable tracks.
    5. Briefly mention the product description.
    6. If vocal ranges are specified, include them in a clear and concise way.
    7. If a key signature is specified, include it.
    8. If a sheet music URL is provided, include a link to it.
    9. Encourage them to explore other products in the shop with a link to the Shop Link.
    10. Express gratitude for their business.
    11. Keep the tone professional yet friendly.
    12. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    13. Add a small section asking for feedback on their experience with the new app, providing a link to the homepage with '?openFeedback=true' query parameter.
    
    Format the response as JSON with two fields:
    {
      "subject": "Email subject line",
      "html": "Full HTML email body content"
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const emailData = JSON.parse(text);
      emailData.html += EMAIL_SIGNATURE_HTML;
      return emailData;
    } catch (parseError) {
      console.error('Error parsing Gemini response for product delivery email:', parseError);
      return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
    }
  } catch (error) {
    console.error('Error generating product delivery email copy with Gemini:', error);
    return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
  }
};

const generateFallbackProductDeliveryEmail = (product: Product, firstName: string, shopLink: string, feedbackLink: string, productTrackListHtml: string) => {
  const vocalRangesHtml = product.vocal_ranges && product.vocal_ranges.length > 0
    ? `<p style="margin-top: 10px; font-size: 0.9em; color: #555;"><strong>Vocal Ranges:</strong> ${product.vocal_ranges.join(', ')}</p>`
    : '';
  
  const keySignatureHtml = product.key_signature
    ? `<p style="margin-top: 10px; font-size: 0.9em; color: #555;"><strong>Key Signature:</strong> ${product.key_signature}</p>`
    : '';

  const sheetMusicHtml = product.sheet_music_url
    ? `<p style="margin-top: 10px; font-size: 0.9em; color: #555;"><strong>Sheet Music:</strong> <a href="${product.sheet_music_url}" target="_blank" style="color: #007bff; text-decoration: none;">View PDF</a></p>`
    : '';

  return {
    subject: `Your Purchase: "${product.title}" is Ready for Download!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>Thank you for your recent purchase from Piano Backings by Daniele!</p>
        <p>Your digital product, <strong>"${product.title}"</strong>, is now ready for download.</p>
        ${productTrackListHtml}
        <p style="margin-top: 20px;">
          ${product.description}
        </p>
        ${vocalRangesHtml}
        ${keySignatureHtml}
        ${sheetMusicHtml}
        <p style="margin-top: 20px;">
          We hope you enjoy your new track! Feel free to browse our other offerings:
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${shopLink}" 
             style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Visit Our Shop
          </a>
        </p>
        <p style="margin-top: 20px;">
          I'm always looking to improve! If you have a moment, I'd love to hear about your experience using the new app. 
          You can share your feedback or report any issues by clicking <a href="${feedbackLink}" style="color: #007bff; text-decoration: none;">here</a>.
        </p>
        <p style="margin-top: 20px;">Warmly,</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `
  };
};
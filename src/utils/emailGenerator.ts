import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateRequestCost } from "./pricing"; // Import the pricing utility

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

export interface TrackInfo {
  url: string;
  caption: string;
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
  special_requests: string;
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
}

// HTML Email signature template
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

// Helper function to convert plain text to basic HTML paragraphs
const textToHtml = (text: string) => {
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
        ${track.caption}
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
        ${track.caption}
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
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  const feedbackLink = `${window.location.origin}/?openFeedback=true`;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback completion template");
    return generateFallbackCompletionEmail(request);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional email for a client whose backing track is now complete.
    
    Request details:
    - Client name: ${request.name}
    - Song title: "${request.song_title}"
    - Musical/Artist: ${request.musical_or_artist}
    - Track purpose: ${request.track_purpose}
    - Backing type(s): ${request.backing_type.join(', ') || 'N/A'}
    - Special requests: ${request.special_requests || 'None'}
    - Client Portal Link: ${clientPortalLink}
    - Track URLs: ${request.track_urls && request.track_urls.length > 0 ? JSON.stringify(request.track_urls) : 'None'}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that immediately tells the client their track is ready.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Announce that the track is complete and ready.
    4. If 'Track URLs' are provided, include an HTML unordered list of these tracks with their captions as clickable links, clearly indicating they are ready for download. Place this section prominently after the main announcement.
    5. Provide a prominent call-to-action button to "View Your Track Details" linking to the Client Portal Link. Clearly state that the track can be accessed on this page.
    6. Proactively offer adjustments or revisions to ensure satisfaction.
    7. Express gratitude for their business.
    8. Keep the tone professional yet friendly, showing genuine care for their success.
    9. Never use "Break a leg" - end with "Warmly" instead.
    10. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    11. Do NOT include pricing information in this completion email.
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
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  const feedbackLink = `${window.location.origin}/?openFeedback=true`;
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
  // Correctly access totalCost from the object returned by calculateRequestCost
  const trackCost = request.cost !== undefined ? request.cost : calculateRequestCost(request).totalCost;
  const rawMinCost = trackCost * 0.5;
  const rawMaxCost = trackCost * 1.5;
  const minCost = (Math.ceil(rawMinCost / 5) * 5).toFixed(2); // Changed to Math.ceil
  const maxCost = (Math.floor(rawMaxCost / 5) * 5).toFixed(2); // Round down
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  const feedbackLink = `${window.location.origin}/?openFeedback=true`;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback payment reminder template");
    return generateFallbackPaymentReminderEmail(request, trackCost);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional payment reminder email for a client.
    
    Request details:
    - Client name: ${request.name}
    - Song title: "${request.song_title}"
    - Musical/Artist: ${request.musical_or_artist}
    - Estimated cost: $${minCost} - $${maxCost}
    - Client Portal Link: ${clientPortalLink}
    - Track URLs: ${request.track_urls && request.track_urls.length > 0 ? JSON.stringify(request.track_urls) : 'None'}
    - Request Status: ${request.status}
    
    Instructions for crafting the email:
    1. Create a clear subject line indicating it's a payment reminder for their track.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Clearly state that it's a friendly reminder for their backing track request.
    4. If 'Request Status' is 'completed' AND 'Track URLs' are provided, include an HTML unordered list of these tracks with their captions as clickable links, clearly indicating they are ready for download. Place this section prominently.
    5. Prominently display the estimated cost for their track as a range.
    6. Provide a clear call-to-action button to "View Request & Make Payment" linking to the Client Portal Link.
    7. Offer alternative payment methods (Buy Me a Coffee: https://buymeacoffee.com/Danielebuatti, Direct Bank Transfer: BSB: 923100, Account: 301110875).
    8. Offer assistance if they have any questions.
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
      console.error('Error parsing Gemini response for payment reminder email:', parseError);
      return generateFallbackPaymentReminderEmail(request, trackCost);
    }
  } catch (error) {
    console.error('Error generating payment reminder email copy with Gemini:', error);
    return generateFallbackPaymentReminderEmail(request, trackCost);
  }
};

const generateFallbackPaymentReminderEmail = (request: BackingRequest, trackCost: number) => {
  const firstName = request.name.split(' ')[0];
  const rawMinCost = trackCost * 0.5;
  const rawMaxCost = trackCost * 1.5;
  const minCost = (Math.ceil(rawMinCost / 5) * 5).toFixed(2); // Changed to Math.ceil
  const maxCost = (Math.floor(rawMaxCost / 5) * 5).toFixed(2); // Round down
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  const feedbackLink = `${window.location.origin}/?openFeedback=true`;
  const trackListHtml = request.status === 'completed' ? generateTrackListHtml(request.track_urls) : '';

  return {
    subject: `Payment Reminder: Your Piano Backing Track for "${request.song_title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>I hope you're having a good week!</p>
        <p>This is a friendly reminder regarding your recent piano backing track request for <strong>"${request.song_title}"</strong>.</p>
        ${trackListHtml}
        <p style="margin-top: 20px; font-size: 1.1em; font-weight: bold; color: #1C0357;">
          The estimated cost for your track is: $${minCost} - $${maxCost}
        </p>
        <p>You can view the full details of your request and make your payment via the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${clientPortalLink}" 
             style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Request & Make Payment
          </a>
        </p>
        <p style="margin-top: 20px;">
          Alternatively, you can pay directly using one of the methods below:
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
  // Correctly access totalCost from the object returned by calculateRequestCost
  const trackCost = request.cost !== undefined ? request.cost : calculateRequestCost(request).totalCost;
  const rawMinCost = trackCost * 0.5;
  const rawMaxCost = trackCost * 1.5;
  const minCost = (Math.ceil(rawMinCost / 5) * 5).toFixed(2); // Changed to Math.ceil
  const maxCost = (Math.floor(rawMaxCost / 5) * 5).toFixed(2); // Round down
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  const feedbackLink = `${window.location.origin}/?openFeedback=true`;
  const trackListHtml = generateTrackListHtml(request.track_urls);

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback completion and payment reminder template");
    return generateFallbackCompletionAndPaymentEmail(request, trackCost);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional email for a client whose backing track is now complete AND includes payment information.
    
    Request details:
    - Client name: ${request.name}
    - Song title: "${request.song_title}"
    - Musical/Artist: ${request.musical_or_artist}
    - Track purpose: ${request.track_purpose}
    - Backing type(s): ${request.backing_type.join(', ') || 'N/A'}
    - Special requests: ${request.special_requests || 'None'}
    - Estimated cost: $${minCost} - $${maxCost}
    - Client Portal Link: ${clientPortalLink}
    - Track URLs: ${request.track_urls && request.track_urls.length > 0 ? JSON.stringify(request.track_urls) : 'None'}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly states the track is ready and includes payment information.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Announce that the track is complete and ready.
    4. If 'Track URLs' are provided, include an HTML unordered list of these tracks with their captions as clickable links, clearly indicating they are ready for download. Place this section prominently after the main announcement.
    5. Provide a prominent call-to-action button to "View Request & Make Payment" linking to the Client Portal Link. Clearly state that the track can be accessed on this page.
    6. Clearly state the estimated cost for their track as a range.
    7. Offer alternative payment methods (Buy Me a Coffee: https://buymeacoffee.com/Danielebuatti, Direct Bank Transfer: BSB: 923100, Account: 301110875).
    8. Proactively offer adjustments or revisions to ensure satisfaction.
    9. Express gratitude for their business.
    10. Keep the tone professional yet friendly, showing genuine care for their success.
    11. Never use "Break a leg" - end with "Warmly" instead.
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
      console.error('Error parsing Gemini response for completion and payment email:', parseError);
      return generateFallbackCompletionAndPaymentEmail(request, trackCost);
    }
  } catch (error) {
    console.error('Error generating completion and payment email copy with Gemini:', error);
    return generateFallbackCompletionAndPaymentEmail(request, trackCost);
  }
};

const generateFallbackCompletionAndPaymentEmail = (request: BackingRequest, trackCost: number) => {
  const firstName = request.name.split(' ')[0];
  const rawMinCost = trackCost * 0.5;
  const rawMaxCost = trackCost * 1.5;
  const minCost = (Math.ceil(rawMinCost / 5) * 5).toFixed(2); // Changed to Math.ceil
  const maxCost = (Math.floor(rawMaxCost / 5) * 5).toFixed(2); // Round down
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  const feedbackLink = `${window.location.origin}/?openFeedback=true`;
  const trackListHtml = generateTrackListHtml(request.track_urls);

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
        
        <p style="margin-top: 20px; font-size: 1.1em; font-weight: bold; color: #1C0357;">
          The estimated cost for your track is: $${minCost} - $${maxCost}
        </p>
        <p style="margin-top: 20px;">
          Alternatively, you can pay directly using one of the methods below:
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
  // generateProductTrackListHtml is defined in this file and should be accessible.
  const productTrackListHtml = generateProductTrackListHtml(product.track_urls); // Use product.track_urls

  if (!product.track_urls || product.track_urls.length === 0) { // Check for track_urls array
    throw new Error(`Product ${product.title} (ID: ${product.id}) does not have any track_urls for delivery.`);
  }

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback product delivery template");
    return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
  }

  try {
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
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly states the purchase is confirmed and the product is ready for download.
    2. Open with a warm, personalized greeting using the customer's first name (derived from their email if no name is available).
    3. Confirm the purchase of "${product.title}".
    4. Include the "Product Track List HTML" directly in the email body to list all downloadable tracks.
    5. Briefly mention the product description.
    6. Encourage them to explore other products in the shop with a link to the Shop Link.
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
      console.error('Error parsing Gemini response for product delivery email:', parseError);
      return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
    }
  } catch (error) {
    console.error('Error generating product delivery email copy with Gemini:', error);
    return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
  }
};

const generateFallbackProductDeliveryEmail = (product: Product, firstName: string, shopLink: string, feedbackLink: string, productTrackListHtml: string) => {
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
// Removed: import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateRequestCost } from "./pricing"; // Import the pricing utility

// Removed: Initialize Gemini API client
// const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

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

// Removed: Helper function to parse Gemini's markdown JSON response
// const parseGeminiResponse = (text: string) => {
//   const jsonStringMatch = text.match(/```json\n([\s\S]*?)\n```/);
//   if (jsonStringMatch && jsonStringMatch[1]) {
//     return JSON.parse(jsonStringMatch[1]);
//   }
//   // Fallback if not wrapped in markdown, try direct parse
//   return JSON.parse(text);
// };


export const generateCompletionEmail = async (request: BackingRequest) => {
  // Removed: const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Removed: if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") { ... }
  // Removed: try { const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); ... } catch (error) { ... }
  
  // Directly call fallback
  return generateFallbackCompletionEmail(request);
};

const generateFallbackCompletionEmail = (request: BackingRequest) => {
  const firstName = request.name.split(' ')[0];
  
  let clientPortalLink = `${window.location.origin}/track/${request.id}`;
  if (request.user_id) {
    // If linked to a user, no token needed, RLS handles access for logged-in user
    clientPortalLink = `${window.location.origin}/track/${request.id}`;
  } else if (request.guest_access_token) {
    // If unlinked but has a guest token, use the token for secure access
    clientPortalLink = `${window.location.origin}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    // Fallback (should ideally not happen if create-backing-request always generates a token for unlinked requests)
    clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }

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
  // Removed: const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Removed: if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") { ... }
  // Removed: try { const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); ... } catch (error) { ... }

  // Directly call fallback
  return generateFallbackPaymentReminderEmail(request);
};

const generateFallbackPaymentReminderEmail = (request: BackingRequest) => {
  const firstName = request.name.split(' ')[0];
  
  let clientPortalLink = `${window.location.origin}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${window.location.origin}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${window.location.origin}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }

  const feedbackLink = `${window.location.origin}/?openFeedback=true`;
  const trackListHtml = request.status === 'completed' ? generateTrackListHtml(request.track_urls) : '';

  let costDisplayHtml = '';
  const calculatedCost = calculateRequestCost(request).totalCost;
  const calculatedLow = (Math.ceil((calculatedCost * 0.5) / 5) * 5).toFixed(2);
  const calculatedHigh = (Math.floor((calculatedCost * 1.5) / 5) * 5).toFixed(2);

  // Determine the recommended cost value
  const recommendedCostValue = (request.final_price !== null && request.final_price !== undefined)
    ? request.final_price
    : calculatedCost;

  const recommendedCostHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                                 <strong>Recommended Cost:</strong> $${recommendedCostValue.toFixed(2)}
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

  if (request.final_price !== null && request.final_price !== undefined) {
    costDisplayHtml = `<p style="margin-top: 20px; font-size: 1.1em; font-weight: bold; color: #1C0357;">
                         The final agreed cost for your track is: $${request.final_price.toFixed(2)}
                       </p>
                       ${recommendedCostHtml}
                       ${estimatedRangeHtml}`;
  } else {
    costDisplayHtml = `${estimatedRangeHtml}
                       ${recommendedCostHtml}`;
  }

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
  // Removed: const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Removed: if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") { ... }
  // Removed: try { const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); ... } catch (error) { ... }

  // Directly call fallback
  return generateFallbackCompletionAndPaymentEmail(request);
};

const generateFallbackCompletionAndPaymentEmail = (request: BackingRequest) => {
  const firstName = request.name.split(' ')[0];
  
  let clientPortalLink = `${window.location.origin}/track/${request.id}`;
  if (request.user_id) {
    clientPortalLink = `${window.location.origin}/track/${request.id}`;
  } else if (request.guest_access_token) {
    clientPortalLink = `${window.location.origin}/track/${request.id}?token=${request.guest_access_token}`;
  } else {
    clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;
  }

  const feedbackLink = `${window.location.origin}/?openFeedback=true`;
  const trackListHtml = generateTrackListHtml(request.track_urls);

  let costDisplayHtml = '';
  const calculatedCost = calculateRequestCost(request).totalCost;
  const calculatedLow = (Math.ceil((calculatedCost * 0.5) / 5) * 5).toFixed(2);
  const calculatedHigh = (Math.floor((calculatedCost * 1.5) / 5) * 5).toFixed(2);

  // Determine the recommended cost value
  const recommendedCostValue = (request.final_price !== null && request.final_price !== undefined)
    ? request.final_price
    : calculatedCost;

  const recommendedCostHtml = `<p style="margin-top: 10px; font-size: 1.0em; color: #555;">
                                 <strong>Recommended Cost:</strong> $${recommendedCostValue.toFixed(2)}
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

  if (request.final_price !== null && request.final_price !== undefined) {
    costDisplayHtml = `<p style="margin-top: 20px; font-size: 1.1em; font-weight: bold; color: #1C0357;">
                         The final agreed cost for your track is: $${request.final_price.toFixed(2)}
                       </p>
                       ${recommendedCostHtml}
                       ${estimatedRangeHtml}`;
  } else {
    costDisplayHtml = `<p style="margin-top: 20px; font-size: 1.1em; font-weight: bold; color: #1C0357;">
                         ${estimatedRangeHtml}
                         ${recommendedCostHtml}
                       </p>`;
  }

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
  // Removed: const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Removed: if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") { ... }
  // Removed: try { const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); ... } catch (error) { ... }

  // Directly call fallback
  const siteUrl = window.location.origin; // Use window.location.origin for client-side
  const shopLink = `${siteUrl}/shop`;
  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const productTrackListHtml = generateProductTrackListHtml(product.track_urls);
  const firstName = customerEmail.split('@')[0]; // Use email prefix as a fallback for first name

  if (!product.track_urls || product.track_urls.length === 0) {
    throw new Error(`Product ${product.title} (ID: ${product.id}) does not have any track_urls for delivery.`);
  }

  return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
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
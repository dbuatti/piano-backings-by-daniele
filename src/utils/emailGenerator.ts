import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateRequestCost } from "./pricing"; // Import the pricing utility

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

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
  track_url?: string; // Added track_url for completion emails
  cost?: number; // Added cost for payment reminders
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
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/1200px-Instagram_logo_2016.svg.png" alt="Instagram" width="24" height="24" style="vertical-align: middle;">
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

export const generateCompletionEmail = async (request: BackingRequest) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const firstName = request.name.split(' ')[0];
  const trackUrl = request.track_url; // Assuming track_url might be available

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
    - Track URL (if available): ${trackUrl || 'Not yet uploaded'}
    - Client Portal Link: ${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that immediately tells the client their track is ready.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Announce that the track is complete and ready.
    4. If a Track URL is provided, include a prominent call-to-action button to "Download Your Track" linking directly to the URL.
    5. If no Track URL, provide a button to "View Your Track Details" linking to the Client Portal Link.
    6. Proactively offer adjustments or revisions to ensure satisfaction.
    7. Express gratitude for their business.
    8. Keep the tone professional yet friendly, showing genuine care for their success.
    9. Never use "Break a leg" - end with "Warmly" instead.
    10. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    11. Do NOT include pricing information in this completion email.
    
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
  const trackUrl = request.track_url;
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;

  let downloadSection = '';
  if (trackUrl) {
    downloadSection = `
      <p style="margin-top: 20px;">You can download your track directly using the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${trackUrl}" 
           style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Download Your Track
        </a>
      </p>
      <p>Please let me know if you have any trouble accessing it.</p>
    `;
  } else {
    downloadSection = `
      <p style="margin-top: 20px;">Your track details are now available. You can view your request and access your track (once uploaded) using the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${clientPortalLink}" 
           style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          View Your Track Details
        </a>
      </p>
    `;
  }

  return {
    subject: `Your "${request.song_title}" backing track is ready!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>I hope this email finds you well!</p>
        <p>I'm excited to let you know that your custom piano backing track for <strong>"${request.song_title}"</strong> is now complete and ready for you.</p>
        ${downloadSection}
        <p style="margin-top: 20px;">I've put a lot of care into crafting this track for you. If, after listening, you feel any adjustments are needed—whether it's a slight tempo change, dynamics, or anything else—please don't hesitate to reply to this email. I'm happy to make revisions to ensure it's perfect for your needs.</p>
        <p>Thank you so much for choosing Piano Backings by Daniele.</p>
        <p style="margin-top: 20px;">Warmly,</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `
  };
};

export const generatePaymentReminderEmail = async (request: BackingRequest) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const firstName = request.name.split(' ')[0];
  const trackCost = request.cost !== undefined ? request.cost : calculateRequestCost(request);
  const minCost = (trackCost * 0.5).toFixed(2); // 50% of estimated cost
  const maxCost = (trackCost * 1.5).toFixed(2); // 150% of estimated cost
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;

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
    
    Instructions for crafting the email:
    1. Create a clear subject line indicating it's a payment reminder for their track.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Clearly state that it's a friendly reminder for their backing track request.
    4. Prominently display the estimated cost for their track as a range.
    5. Provide a clear call-to-action button to "View Request & Make Payment" linking to the Client Portal Link.
    6. Offer alternative payment methods (Buy Me a Coffee: https://buymeacoffee.com/Danielebuatti, Direct Bank Transfer: BSB: 923100, Account: 301110875).
    7. Offer assistance if they have any questions.
    8. Express gratitude for their business.
    9. Keep the tone professional yet friendly.
    10. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    
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
  const minCost = (trackCost * 0.5).toFixed(2); // 50% of estimated cost
  const maxCost = (trackCost * 1.5).toFixed(2); // 150% of estimated cost
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;

  return {
    subject: `Payment Reminder: Your Piano Backing Track for "${request.song_title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>I hope you're having a good week!</p>
        <p>This is a friendly reminder regarding your recent piano backing track request for <strong>"${request.song_title}"</strong>.</p>
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
        <p style="margin-top: 20px;">Warmly,</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `
  };
};

export const generateCompletionAndPaymentEmail = async (request: BackingRequest) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const firstName = request.name.split(' ')[0];
  const trackUrl = request.track_url;
  const trackCost = request.cost !== undefined ? request.cost : calculateRequestCost(request);
  const minCost = (trackCost * 0.5).toFixed(2); // 50% of estimated cost
  const maxCost = (trackCost * 1.5).toFixed(2); // 150% of estimated cost
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;

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
    - Track URL (if available): ${trackUrl || 'Not yet uploaded'}
    - Estimated cost: $${minCost} - $${maxCost}
    - Client Portal Link: ${clientPortalLink}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly states the track is ready and includes payment information.
    2. Open with a warm, personalized greeting using the client's first name.
    3. Announce that the track is complete and ready.
    4. If a Track URL is provided, include a prominent call-to-action button to "Download Your Track" linking directly to the Track URL. This button should be visually distinct (e.g., use background-color: #F538BC;).
    5. Always include a separate call-to-action button to "View Request & Make Payment" linking to the Client Portal Link. This button should be present whether a Track URL is provided or not (use background-color: #1C0357;).
    6. If no Track URL is provided, the "Download Your Track" button should not appear. Instead, the email should clearly state that the track is complete and direct the client to the "View Request & Make Payment" button to access details and the track once uploaded.
    7. Clearly state the estimated cost for their track as a range.
    8. Offer alternative payment methods (Buy Me a Coffee: https://buymeacoffee.com/Danielebuatti, Direct Bank Transfer: BSB: 923100, Account: 301110875).
    9. Proactively offer adjustments or revisions to ensure satisfaction.
    10. Express gratitude for their business.
    11. Keep the tone professional yet friendly, showing genuine care for their success.
    12. Never use "Break a leg" - end with "Warmly" instead.
    13. Ensure the email body is valid HTML, using <p> tags for paragraphs and <a> tags for links.
    
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
  const trackUrl = request.track_url;
  const minCost = (trackCost * 0.5).toFixed(2); // 50% of estimated cost
  const maxCost = (trackCost * 1.5).toFixed(2); // 150% of estimated cost
  const clientPortalLink = `${window.location.origin}/track/${request.id}?email=${encodeURIComponent(request.email)}`;

  let trackAccessSection = '';
  if (trackUrl) {
    // If track URL is available, provide a direct download button and a separate view details button
    trackAccessSection = `
      <p style="margin-top: 20px;">Your custom piano backing track for <strong>"${request.song_title}"</strong> is now complete and ready for you!</p>
      <p style="margin-top: 20px;">You can download your track directly using the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${trackUrl}" 
           style="background-color: #F538BC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Download Your Track
        </a>
      </p>
      <p style="margin-top: 20px;">You can also view all your request details, including payment information, on your dedicated client page:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${clientPortalLink}" 
           style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          View Request & Make Payment
        </a>
      </p>
    `;
  } else {
    // If no track URL, provide a single button to view details and payment
    trackAccessSection = `
      <p style="margin-top: 20px;">Your custom piano backing track for <strong>"${request.song_title}"</strong> is now complete and ready for you!</p>
      <p style="margin-top: 20px;">The track has been completed, and you can view all your request details, including payment information and access the track once uploaded, on your dedicated client page:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${clientPortalLink}" 
           style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          View Track Details & Make Payment
        </a>
      </p>
    `;
  }

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
        <p style="margin-top: 20px;">Warmly,</p>
      </div>
      ${EMAIL_SIGNATURE_HTML}
    `
  };
};

// Helper functions for pricing (kept for fallback logic)
const getBasePriceForType = (type: string) => {
  switch (type) {
    case 'full-song': return '30';
    case 'audition-cut': return '15';
    case 'note-bash': return '10';
    default: return '20'; // Default if type is unknown
  }
};

const getServicePrice = (service: string) => {
  switch (service) {
    case 'rush-order': return '10';
    case 'complex-songs': return '7';
    case 'additional-edits': return '5';
    case 'exclusive-ownership': return '40';
    default: return '0';
  }
};

const calculateTotal = (backingTypes: string[], additionalServices: string[]) => {
  let total = 0;
  
  // Add base price for each selected backing type
  backingTypes.forEach(type => {
    switch (type) {
      case 'full-song': total += 30; break;
      case 'audition-cut': total += 15; break;
      case 'note-bash': total += 10; break;
      default: total += 20;
    }
  });
  
  // Add additional service costs
  additionalServices.forEach(service => {
    switch (service) {
      case 'rush-order':
        total += 10;
        break;
      case 'complex-songs':
        total += 7;
        break;
      case 'additional-edits':
        total += 5;
        break;
      case 'exclusive-ownership':
        total += 40;
        break;
    }
  });
  
  return total.toFixed(2);
};
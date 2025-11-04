// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.14.1"; // Deno compatible import

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_url?: string | null;
  is_active: boolean;
}

// HTML Email signature template (can be shared or duplicated)
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

// Helper function to convert plain text to basic HTML paragraphs (can be shared or duplicated)
const textToHtml = (text: string) => {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">` +
         text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('') +
         `</div>`;
};

export const generateProductDeliveryEmail = async (product: Product, customerEmail: string) => {
  const apiKey = Deno.env.get('GEMINI_API_KEY'); // Use Deno.env.get for Edge Functions
  const firstName = customerEmail.split('@')[0]; // Use email prefix as a fallback for first name
  const downloadLink = product.track_url;
  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'; // Use SITE_URL from Deno env
  const shopLink = `${siteUrl}/shop`;
  const feedbackLink = `${siteUrl}/?openFeedback=true`;

  if (!downloadLink) {
    throw new Error(`Product ${product.title} (ID: ${product.id}) does not have a track_url for delivery.`);
  }

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") { // Check for placeholder
    console.log("Gemini API key not configured, using fallback product delivery template");
    return generateFallbackProductDeliveryEmail(product, firstName, downloadLink, shopLink, feedbackLink);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey); // Initialize here with Deno API key
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    You are Daniele, a professional piano backing track creator. Generate a personalized, warm, and professional email for a customer who has just purchased a digital product from your shop.
    
    Product details:
    - Product Title: "${product.title}"
    - Product Description: ${product.description}
    - Download Link: ${downloadLink}
    - Customer Email: ${customerEmail}
    - Shop Link: ${shopLink}
    - Feedback Link: ${feedbackLink}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that clearly states the purchase is confirmed and the product is ready for download.
    2. Open with a warm, personalized greeting using the customer's first name (derived from their email if no name is available).
    3. Confirm the purchase of "${product.title}".
    4. Provide a prominent call-to-action button to "Download Your Track" linking directly to the Download Link.
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
      return generateFallbackProductDeliveryEmail(product, firstName, downloadLink, shopLink, feedbackLink);
    }
  } catch (error) {
    console.error('Error generating product delivery email copy with Gemini:', error);
    return generateFallbackProductDeliveryEmail(product, firstName, downloadLink, shopLink, feedbackLink);
  }
};

const generateFallbackProductDeliveryEmail = (product: Product, firstName: string, downloadLink: string, shopLink: string, feedbackLink: string) => {
  return {
    subject: `Your Purchase: "${product.title}" is Ready for Download!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>Thank you for your recent purchase from Piano Backings by Daniele!</p>
        <p>Your digital product, <strong>"${product.title}"</strong>, is now ready for download.</p>
        <p style="margin-top: 20px; text-align: center;">
          <a href="${downloadLink}" 
             style="background-color: #F538BC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Download Your Track
          </a>
        </p>
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
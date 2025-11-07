// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.14.1"; // Deno compatible import

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inlined TrackInfo interface
interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined; // Updated to be more robust
}

// Inlined Product interface
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_urls?: TrackInfo[] | null; // Changed from track_url to track_urls (array of TrackInfo)
  is_active: boolean;
  vocal_ranges?: string[];
  sheet_music_url?: string | null; // New field
  key_signature?: string | null; // New field
  show_sheet_music_url?: boolean; // New field
  show_key_signature?: boolean; // New field
}

// Inlined Cart Line Item structure
interface CartLineItem {
  id: string; // product_id
  quantity: number;
}

// Inlined HTML Email signature template
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

// Inlined Helper function to convert plain text to basic HTML paragraphs
const textToHtml = (text: string) => {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">` +
         text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('') +
         `</div>`;
};

// Inlined Helper to generate track list HTML for products
const generateProductTrackListHtml = (product: Product) => {
  if (!product.track_urls || product.track_urls.length === 0) return '';
  
  const listItems = product.track_urls.map(track => `
    <li style="margin-bottom: 5px;">
      <a href="${track.url}" style="color: #007bff; text-decoration: none; font-weight: bold;">
        ${track.caption || 'Download Track'}
      </a>
    </li>
  `).join('');

  return `
    <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #F538BC; border-radius: 4px;">
      <p style="margin-top: 0; font-weight: bold; color: #1C0357;">${product.title}:</p>
      <ul style="list-style: none; padding: 0; margin-top: 10px;">
        ${listItems}
      </ul>
      <p style="margin-top: 15px; font-size: 0.9em; color: #666;">
        Click on the track name to download.
      </p>
    </div>
  `;
};

// Inlined generateProductDeliveryEmail function
export const generateProductDeliveryEmail = async (product: Product, customerEmail: string) => {
  const apiKey = Deno.env.get('GEMINI_API_KEY'); // Use Deno.env.get for Edge Functions
  const firstName = customerEmail.split('@')[0]; // Use email prefix as a fallback for first name
  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'; // Use SITE_URL from Deno env
  const shopLink = `${siteUrl}/shop`;
  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const productTrackListHtml = generateProductTrackListHtml(product);


  if (!product.track_urls || product.track_urls.length === 0) {
    throw new Error(`Product ${product.title} (ID: ${product.id}) does not have any track_urls for delivery.`);
  }

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") { // Check for placeholder
    console.log("Gemini API key not configured, using fallback product delivery template");
    return generateFallbackProductDeliveryEmail(product, firstName, shopLink, feedbackLink, productTrackListHtml);
  }

  try {
    // @ts-ignore
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


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET'); // New secret for webhook verification
    const defaultSenderEmail = Deno.env.get('GMAIL_USER') || 'pianobackingsbydaniele@gmail.com'; // Default sender email for notifications

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in Supabase secrets.');
    }
    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured in Supabase secrets. Webhook verification will fail.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'No Stripe signature header found.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      // Use the asynchronous version of constructEvent
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received Stripe event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      const paymentIntentId = session.payment_intent as string;
      const userId = session.client_reference_id; // Extract user_id from client_reference_id
      const checkoutSessionId = session.id; // Get the checkout session ID
      
      // Retrieve line items from metadata
      const lineItemsMetadata = session.metadata?.line_items;
      let cartLineItems: CartLineItem[] = [];

      if (lineItemsMetadata) {
        try {
          cartLineItems = JSON.parse(lineItemsMetadata);
        } catch (e) {
          console.error('Failed to parse line_items metadata:', e);
          return new Response(JSON.stringify({ error: 'Invalid line_items metadata format.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Fallback for single item purchase (shouldn't happen with new flow, but good for robustness)
        const productId = session.metadata?.product_id;
        if (productId) {
          cartLineItems = [{ id: productId, quantity: 1 }];
        }
      }

      if (!customerEmail || !checkoutSessionId || cartLineItems.length === 0) {
        console.error('Missing essential data in checkout.session.completed event:', { customerEmail, checkoutSessionId, cartLineItems });
        return new Response(JSON.stringify({ error: 'Missing essential data in checkout session.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Fetch the full line items from Stripe to get accurate price and currency
      const stripeSessionWithLineItems = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ['line_items.data.price.product'],
      });
      
      const stripeLineItems = stripeSessionWithLineItems.line_items?.data || [];
      
      // Map Stripe line items to database inserts
      const ordersToInsert = stripeLineItems.map(item => {
        const product = item.price?.product as Stripe.Product;
        const productId = product?.metadata?.product_id || product?.id; // Use product ID from metadata or Stripe ID
        
        if (!productId) {
          console.error('Product ID missing for line item:', item);
          throw new Error('Product ID missing for one or more line items.');
        }
        
        return {
          product_id: productId,
          customer_email: customerEmail,
          amount: (item.amount_total || 0) / 100, // Convert cents back to dollars
          currency: item.currency?.toUpperCase() || 'AUD',
          status: 'completed',
          payment_intent_id: paymentIntentId,
          user_id: userId,
          checkout_session_id: checkoutSessionId,
          // Store the line item details in the new column
          line_items: {
            product_id: productId,
            quantity: item.quantity,
            unit_amount: (item.amount_total || 0) / (item.quantity || 1) / 100,
            title: product.name,
          }
        };
      });

      // Insert all orders in a single batch
      const { data: insertedOrders, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert(ordersToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting orders into database:', insertError);
        throw new Error(`Failed to insert orders: ${insertError.message}`);
      }

      console.log(`Successfully created ${insertedOrders?.length || 0} orders.`);

      // 3. Handle digital product delivery (send one email containing all purchased products)
      
      // Get unique product IDs from the inserted orders
      const uniqueProductIds = [...new Set(insertedOrders?.map(order => order.product_id).filter(Boolean) || [])];
      
      // Fetch all unique products purchased
      const { data: purchasedProducts, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id, title, description, track_urls, vocal_ranges, sheet_music_url, key_signature')
        .in('id', uniqueProductIds);

      if (productsError) {
        console.error('Error fetching purchased products for email delivery:', productsError);
        // Continue execution even if product fetch fails, but log warning
      }
      
      const productsMap = new Map<string, Product>();
      purchasedProducts?.forEach(p => productsMap.set(p.id, p as Product));

      // Construct a single email body containing all products
      let emailBodyHtml = '';
      let emailSubject = 'Your Piano Backings Purchase Confirmation';
      
      if (purchasedProducts && purchasedProducts.length > 0) {
        emailSubject = `Your ${purchasedProducts.length} Track${purchasedProducts.length > 1 ? 's' : ''} are Ready!`;
        
        emailBodyHtml += `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <p>Hi ${customerEmail.split('@')[0]},</p>
            <p>Thank you for your recent purchase from Piano Backings by Daniele! All your digital tracks are now ready for download.</p>
        `;
        
        purchasedProducts.forEach(product => {
          const productTrackListHtml = generateProductTrackListHtml(product as Product);
          
          emailBodyHtml += `
            <div style="margin-top: 25px; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
              <h3 style="color: #1C0357; margin-top: 0;">Product: ${product.title}</h3>
              <p style="font-size: 0.9em; color: #666;">${product.description}</p>
              ${productTrackListHtml}
              ${product.sheet_music_url ? `<p style="margin-top: 10px; font-size: 0.9em; color: #555;"><strong>Sheet Music:</strong> <a href="${product.sheet_music_url}" target="_blank" style="color: #007bff; text-decoration: none;">View PDF</a></p>` : ''}
            </div>
          `;
        });
        
        emailBodyHtml += `
            <p style="margin-top: 20px;">
              We hope you enjoy your new tracks! Feel free to browse our other offerings:
            </p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SITE_URL')}/shop" 
                 style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Visit Our Shop
              </a>
            </p>
            <p style="margin-top: 20px;">Warmly,</p>
          </div>
          ${EMAIL_SIGNATURE_HTML}
        `;
        
        // Send the combined email
        try {
          const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
          
          const emailResponse = await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              to: customerEmail,
              subject: emailSubject,
              html: emailBodyHtml,
              senderEmail: defaultSenderEmail
            })
          });

          if (!emailResponse.ok) {
            const emailErrorText = await emailResponse.text();
            console.error('Failed to send product delivery email:', emailErrorText);
            // Log notification failure to database
            await supabaseAdmin
              .from('notifications')
              .insert([
                {
                  recipient: customerEmail,
                  sender: defaultSenderEmail,
                  subject: emailSubject,
                  content: emailBodyHtml,
                  status: 'failed',
                  type: 'product_delivery_email',
                  error_message: emailErrorText
                }
              ]);
          } else {
            console.log(`Product delivery email sent successfully to ${customerEmail}`);
            // Log notification success to database
            await supabaseAdmin
              .from('notifications')
              .insert([
                {
                  recipient: customerEmail,
                  sender: defaultSenderEmail,
                  subject: emailSubject,
                  content: emailBodyHtml,
                  status: 'sent',
                  type: 'product_delivery_email'
                }
              ]);
          }
        } catch (emailSendError: any) {
          console.error('Error sending product delivery email:', emailSendError);
          // Log notification failure to database
          await supabaseAdmin
            .from('notifications')
            .insert([
              {
                recipient: customerEmail,
                sender: defaultSenderEmail,
                subject: `Failed to deliver products: ${emailSubject}`,
                content: `Error: ${emailSendError.message}`,
                status: 'failed',
                type: 'product_delivery_email',
                error_message: emailSendError.message
              }
            ]);
        }
      } else {
        console.warn('No products found for delivery email generation.');
      }

    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
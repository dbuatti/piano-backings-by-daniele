// @ts-ignore
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
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

// Inlined Product interface
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

// Inlined generateProductDeliveryEmail function
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
      const productId = session.metadata?.product_id;
      const customerEmail = session.customer_details?.email;
      const amountTotal = session.amount_total;
      const currency = session.currency;
      const paymentIntentId = session.payment_intent as string;
      const userId = session.client_reference_id; // Extract user_id from client_reference_id

      if (!productId || !customerEmail || amountTotal === null || currency === null) {
        console.error('Missing essential data in checkout.session.completed event:', { productId, customerEmail, amountTotal, currency });
        return new Response(JSON.stringify({ error: 'Missing essential data in checkout session.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch product details to ensure it exists and get its price and track_url
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, title, description, price, track_url') // Select track_url
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('Product not found for order creation:', productId, productError);
        return new Response(JSON.stringify({ error: `Product not found for order creation: ${productId}` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create an order record in your Supabase 'orders' table
      const { data: order, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert({
          product_id: productId,
          customer_email: customerEmail,
          amount: amountTotal / 100, // Convert cents back to dollars
          currency: currency.toUpperCase(),
          status: 'completed', // Mark as completed on successful checkout
          payment_intent_id: paymentIntentId,
          user_id: userId, // Store the user_id if available
        })
        .select();

      if (insertError) {
        console.error('Error inserting order into database:', insertError);
        throw new Error(`Failed to insert order: ${insertError.message}`);
      }

      console.log('Order created successfully:', order);

      // Implement digital product delivery here (send download link via email)
      if (product.track_url) {
        try {
          // Invoke the send-email Edge Function
          const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
          
          // Generate email content using the Deno-compatible emailGenerator
          const { subject, html } = await generateProductDeliveryEmail(product as Product, customerEmail); // Cast to Product

          const emailResponse = await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}` // Use service key for Edge Function invocation
            },
            body: JSON.stringify({
              to: customerEmail,
              subject: subject,
              html: html,
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
                  subject: subject,
                  content: html,
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
                  subject: subject,
                  content: html,
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
                subject: `Failed to deliver product: ${product.title}`,
                content: `Error: ${emailSendError.message}`,
                status: 'failed',
                type: 'product_delivery_email',
                error_message: emailSendError.message
              }
            ]);
        }
      } else {
        console.warn(`Product ${product.title} (ID: ${product.id}) has no track_url. No delivery email sent.`);
        // Optionally, log a notification that a product without a track_url was purchased
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: defaultSenderEmail, // Notify admin
              sender: 'system@pianobackings.com',
              subject: `Warning: Product purchased without track_url - ${product.title}`,
              content: `Customer: ${customerEmail} purchased product ID: ${product.id} but no track_url was set for delivery. Manual intervention required.`,
              status: 'warning',
              type: 'system_alert'
            }
          ]);
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
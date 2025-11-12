// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.14.1"; // Deno compatible import
// Removed: import { generateProductDeliveryEmail, EMAIL_SIGNATURE_HTML, textToHtml } from '../../src/utils/emailGenerator.ts'; 

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

// Inlined Helper to generate track list HTML for products
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

// Manual Product Delivery Email Generator (Defined locally for Deno compatibility)
const generateProductDeliveryEmail = (product: Product, customerEmail: string, siteUrl: string) => {
  const firstName = customerEmail.split('@')[0]; // Use email prefix as a fallback for first name
  const shopLink = `${siteUrl}/shop`;
  const feedbackLink = `${siteUrl}/?openFeedback=true`;
  const productTrackListHtml = generateProductTrackListHtml(product.track_urls);


  if (!product.track_urls || product.track_urls.length === 0) {
    throw new Error(`Product ${product.title} (ID: ${product.id}) does not have any track_urls for delivery.`);
  }

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
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'; // Get site URL for client links

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
      const checkoutSessionId = session.id; // Get the checkout session ID

      if (!productId || !customerEmail || amountTotal === null || currency === null || !checkoutSessionId) {
        console.error('Missing essential data in checkout.session.completed event:', { productId, customerEmail, amountTotal, currency, checkoutSessionId });
        return new Response(JSON.stringify({ error: 'Missing essential data in checkout session.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch product details to ensure it exists and get its price and track_urls
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, title, description, price, track_urls, vocal_ranges, sheet_music_url, key_signature') // Added sheet_music_url and key_signature
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
          checkout_session_id: checkoutSessionId, // Store the checkout session ID
        })
        .select();

      if (insertError) {
        console.error('Error inserting order into database:', insertError);
        throw new Error(`Failed to insert order: ${insertError.message}`);
      }

      console.log('Order created successfully:', order);

      // Implement digital product delivery here (send download link via email)
      if (product.track_urls && product.track_urls.length > 0) { // Check for track_urls array
        try {
          // Invoke the send-email Edge Function
          const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
          
          // Generate email content using the local manual generator
          const { subject, html } = generateProductDeliveryEmail(product as Product, customerEmail, siteUrl); // Cast to Product

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
                sender: 'system@pianobackings.com',
                subject: `Failed to deliver product: ${product.title}`,
                content: `Error: ${emailSendError.message}`,
                status: 'failed',
                type: 'product_delivery_email',
                error_message: emailSendError.message
              }
            ]);
        }
      } else {
        console.warn(`Product ${product.title} (ID: ${product.id}) has no track_urls. No delivery email sent.`);
        // Optionally, log a notification that a product without a track_url was purchased
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              recipient: defaultSenderEmail, // Notify admin
              sender: 'system@pianobackings.com',
              subject: `Warning: Product purchased without track_urls - ${product.title}`,
              content: `Customer: ${customerEmail} purchased product ID: ${product.id} but no track_urls was set for delivery. Manual intervention required.`,
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
    }); // <-- FIXED: Added closing parenthesis
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
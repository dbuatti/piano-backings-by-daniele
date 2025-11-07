// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';

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

// Define the expected input structure for line items
interface CartLineItem {
  id: string; // product_id
  quantity: number;
}

// Define the expected structure of product data fetched from Supabase
interface ProductDetails {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  vocal_ranges?: string[] | null;
  sheet_music_url?: string | null;
  key_signature?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const siteUrl = Deno.env.get('SITE_URL');

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in Supabase secrets.');
    }
    if (!siteUrl) {
      throw new Error('SITE_URL is not configured in Supabase secrets.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { lineItems } = await req.json(); // Expecting an array of CartLineItem

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or empty lineItems array.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    // 1. Fetch all product details needed for the line items
    const productIds = lineItems.map((item: CartLineItem) => item.id);
    
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, description, price, currency, image_url, vocal_ranges, sheet_music_url, key_signature')
      .in('id', productIds);

    if (productsError || !productsData || productsData.length === 0) {
      console.error('Error fetching products for checkout:', productsError);
      throw new Error('One or more products in the cart could not be found.');
    }

    // Cast the fetched data to the defined interface to resolve TS errors
    const typedProductsData = productsData as ProductDetails[];
    const productsMap = new Map(typedProductsData.map(p => [p.id, p]));

    // 2. Construct Stripe line items and metadata
    const stripeLineItems = lineItems.map((cartItem: CartLineItem) => {
      const product = productsMap.get(cartItem.id);
      if (!product) {
        throw new Error(`Product with ID ${cartItem.id} not found.`);
      }

      return {
        price_data: {
          currency: product.currency,
          product_data: {
            name: product.title,
            description: product.description,
            images: product.image_url ? [product.image_url] : [],
            metadata: {
              vocal_ranges: product.vocal_ranges ? product.vocal_ranges.join(', ') : 'N/A',
              key_signature: product.key_signature || 'N/A',
              sheet_music_url: product.sheet_music_url || 'N/A',
            },
          },
          unit_amount: Math.round(product.price * 100), // Stripe expects amount in cents
        },
        quantity: cartItem.quantity,
      };
    });
    
    // Store the full list of line items in metadata for the webhook
    const lineItemsMetadata = JSON.stringify(lineItems);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: `${siteUrl}/purchase-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/shop?canceled=true`,
      metadata: {
        line_items: lineItemsMetadata, // Store all line items here
      },
      client_reference_id: userId || undefined,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in create-stripe-checkout function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
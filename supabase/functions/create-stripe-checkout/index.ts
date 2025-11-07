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
      console.error('STRIPE_SECRET_KEY is not configured.');
      throw new Error('STRIPE_SECRET_KEY is not configured in Supabase secrets.');
    }
    if (!siteUrl) {
      console.error('SITE_URL is not configured.');
      throw new Error('SITE_URL is not configured in Supabase secrets.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { product_id } = await req.json();

    if (!product_id) {
      console.error('Product ID is required but missing.');
      return new Response(JSON.stringify({ error: 'Product ID is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    console.log('create-stripe-checkout: Auth header received:', authHeader ? 'Present' : 'Not Present');

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      console.log('create-stripe-checkout: Attempting to get user with token:', token ? 'Token Present' : 'Token Missing');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError) {
        console.error('create-stripe-checkout: Error fetching user:', userError.message);
      } else if (user) {
        userId = user.id;
        console.log('create-stripe-checkout: User ID found for checkout session:', userId);
      } else {
        console.log('create-stripe-checkout: No user found for provided token.');
      }
    } else {
      console.log('create-stripe-checkout: No Authorization header, proceeding without user_id.');
    }

    // Fetch product details from Supabase
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, title, description, price, currency, image_url, vocal_ranges, sheet_music_url, key_signature') // Added sheet_music_url and key_signature
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      console.error('Error fetching product:', productError?.message || 'Product not found');
      throw new Error(`Product not found: ${product_id}`);
    }

    // --- Add validation for product data before creating Stripe session ---
    if (!product.title || product.title.trim() === '') {
      console.error('Product title is missing or empty for product ID:', product_id);
      throw new Error('Product title cannot be empty.');
    }
    if (typeof product.price !== 'number' || product.price <= 0) {
      console.error('Product price is invalid or zero for product ID:', product_id, 'Price:', product.price);
      throw new Error('Product price must be a positive number.');
    }
    if (!product.currency || product.currency.trim() === '') {
      console.error('Product currency is missing or empty for product ID:', product_id);
      throw new Error('Product currency cannot be empty.');
    }
    // --- End validation ---

    console.log('create-stripe-checkout: Fetched product details:', product);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.title,
              description: product.description || undefined, // Stripe allows undefined for description
              images: product.image_url ? [product.image_url] : [],
              metadata: {
                vocal_ranges: product.vocal_ranges ? product.vocal_ranges.join(', ') : 'N/A',
                key_signature: product.key_signature || 'N/A',
                sheet_music_url: product.sheet_music_url || 'N/A',
              },
            },
            unit_amount: Math.round(product.price * 100), // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/purchase-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/shop?canceled=true`,
      metadata: {
            product_id: product.id,
      },
      client_reference_id: userId || undefined,
    });

    console.log('create-stripe-checkout: Stripe session created with client_reference_id:', session.client_reference_id);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in create-stripe-checkout function:', error.message);
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
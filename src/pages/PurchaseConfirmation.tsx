import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { showSuccess, showError } from '@/utils/toast'; // Updated import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail, ShoppingCart, User, MessageSquare, Download, FileText, UserPlus } from 'lucide-react'; // Added UserPlus
import ErrorDisplay from '@/components/ErrorDisplay';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { downloadTrack, TrackInfo } from '@/utils/helpers';

interface Product {
  id: string;
  title: string;
  description: string;
  track_urls?: TrackInfo[];
  vocal_ranges?: string[];
  sheet_music_url?: string | null;
  key_signature?: string | null;
  show_sheet_music_url?: boolean;
  show_key_signature?: boolean;
}

interface Order {
  id: string;
  product_id: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  user_id?: string;
  products?: Product;
  checkout_session_id: string;
}

const PurchaseConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<any>(null);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    const fetchConfirmationDetails = async () => {
      setLoading(true);
      setError(null);
      const sessionId = searchParams.get('session_id');

      // Fetch user session first
      const { data: { session } = {} } = await supabase.auth.getSession();
      setUserSession(session);

      if (!sessionId) {
        setError(new Error('No session ID found in URL.'));
        setLoading(false);
        showError("Error", "Invalid access to confirmation page.");
        return;
      }

      const supabaseWithHeaders = createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          global: {
            fetch: async (input, init) => {
              const headers = new Headers(init?.headers);
              headers.set('x-checkout-session-id', sessionId);
              return fetch(input, { ...init, headers });
            },
          },
        }
      );

      const MAX_RETRIES = 5;
      const RETRY_DELAY_MS = 2000; // 2 seconds

      let orderData: Order | null = null;
      let fetchError: any = null;

      try {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const { data, error } = await supabaseWithHeaders
              .from('orders')
              .select('*')
              .eq('checkout_session_id', sessionId)
              .single();

            if (error) {
              // Supabase returns PGRST116 when .single() finds no rows (Order not found)
              if (error.code === 'PGRST116') {
                console.log(`Attempt ${attempt}: Order not found yet (PGRST116). Retrying in ${RETRY_DELAY_MS}ms...`);
                if (attempt < MAX_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                  continue; // Continue to the next attempt
                } else {
                  throw new Error('Order not found or could not be retrieved after multiple attempts.');
                }
              }
              throw error; // Throw other errors immediately
            }
            
            orderData = data as Order;
            break; // Success, break the loop
          } catch (err: any) {
            fetchError = err;
            
            // Check for the specific "not found" error code or message
            if (fetchError.code === 'PGRST116' || fetchError.message.includes('Order not found')) {
              if (attempt < MAX_RETRIES) {
                console.log(`Attempt ${attempt}: Transient error or not found. Retrying in ${RETRY_DELAY_MS}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                continue;
              }
            }
            throw fetchError; // Throw final error or non-transient error
          }
        }
        
        if (!orderData) {
          throw new Error('Order not found or could not be retrieved.');
        }

        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, title, description, track_urls, vocal_ranges, sheet_music_url, key_signature, show_sheet_music_url, show_key_signature')
          .eq('id', orderData.product_id)
          .single();

        if (productError || !productData) {
          console.error('Error fetching product for order:', productError);
          console.warn(`Product with ID ${orderData.product_id} not found for order ${orderData.id}`);
        }

        const joinedOrder: Order = {
          ...orderData,
          products: productData || undefined,
        };

        setOrder(joinedOrder);
        showSuccess("Purchase Confirmed!", "Thank you for your purchase. Your order details are below.");

      } catch (err: any) {
        console.error('Error in purchase confirmation:', err);
        setError(err);
        showError("Error", `Failed to load purchase details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchConfirmationDetails();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
          <p className="ml-4 text-lg text-gray-600">Loading purchase details...</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 text-center">
          <ErrorDisplay error={error} title="Purchase Confirmation Error" />
          <Button onClick={() => navigate('/shop')} className="mt-6 bg-[#1C0357] hover:bg-[#1C0357]/90 text-white">
            Return to Shop
          </Button>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>No order details found.</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  const product = order.products;
  const hasTracks = product?.track_urls && product.track_urls.length > 0;
  const hasSheetMusic = product?.sheet_music_url && product.show_sheet_music_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#1C0357]">Purchase Confirmed!</h1>
          <p className="text-lg text-[#1C0357]/90">Thank you for your order.</p>
        </div>
        
        <Card className="shadow-lg mb-6 bg-white">
          <CardHeader className="bg-green-100">
            <CardTitle className="text-green-800 flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" /> Order #{order.id.substring(0, 8)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Order Summary
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="font-medium text-[#1C0357]">{product?.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="font-medium text-[#1C0357]">{order.currency} {order.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer Email</p>
                    <p className="font-medium text-[#1C0357]">{order.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Order Date</p>
                    <p className="font-medium text-[#1C0357]">{format(new Date(order.created_at), 'MMMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Access Your Purchase
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Your purchase details and download links have also been sent to your email address: <strong>{order.customer_email}</strong>.
                </p>
                {hasTracks && (
                  <div className="space-y-3 mb-4">
                    <h4 className="font-medium text-md text-[#1C0357]">Downloadable Tracks:</h4>
                    <ul className="space-y-2">
                      {product?.track_urls?.map((track, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                          <span className="font-medium text-sm">{track.caption || `Track ${index + 1}`}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => downloadTrack(track.url, track.caption || `${product.title}.mp3`)}
                          >
                            <Download className="h-4 w-4 mr-2" /> Download
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hasSheetMusic && (
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(product?.sheet_music_url || '#', '_blank')}
                      className="w-full"
                    >
                      <FileText className="mr-2 h-4 w-4" /> View Sheet Music (PDF)
                    </Button>
                  </div>
                )}
                {!hasTracks && !hasSheetMusic && (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    No digital content available for direct download here. Please check your email for instructions.
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-md text-gray-700 mb-4">
                If you have an account, this purchase is linked to your dashboard.
              </p>
              {userSession ? (
                <Link to="/user-dashboard">
                  <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3">
                    <User className="mr-2 h-4 w-4" /> Go to My Tracks
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3">
                    <User className="mr-2 h-4 w-4" /> Login to My Tracks
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default PurchaseConfirmation;
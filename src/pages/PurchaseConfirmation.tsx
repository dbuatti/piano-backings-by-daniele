import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail, ShoppingCart, User, MessageSquare, Download, FileText } from 'lucide-react';
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<any>(null);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    const fetchConfirmationDetails = async () => {
      setLoading(true);
      setError(null);
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setError(new Error('No session ID found in URL.'));
        setLoading(false);
        toast({
          title: "Error",
          description: "Invalid access to confirmation page.",
          variant: "destructive",
        });
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
        toast({
          title: "Purchase Confirmed!",
          description: "Thank you for your purchase. Your order details are below.",
          action: <CheckCircle className="text-green-500" />,
        });

      } catch (err: any) {
        console.error('Error in purchase confirmation:', err);
        setError(err);
        toast({
          title: "Error",
          description: `Failed to load purchase details: ${err.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfirmationDetails();
  }, [searchParams, toast]);

  const handleReportIssue = () => {
    navigate('/?openFeedback=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">
            {order?.status === 'completed' ? 'Purchase Confirmed!' : 'Order Status'}
          </h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">
            {order?.status === 'completed' ? 'Thank you for your order.' : 'Checking your order details...'}
          </p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#D1AAF2] to-[#F1E14F] py-6">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-center">
              {loading ? (
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              ) : error ? (
                <XCircle className="mr-3 h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
              )}
              {loading ? 'Loading Order...' : error ? 'Order Failed' : 'Order Successful!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48">
                <Loader2 className="h-12 w-12 animate-spin text-[#1C0357] mb-4" />
                <p className="text-lg text-gray-600">Retrieving your order details...</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <ErrorDisplay error={error} title="Failed to Load Order" />
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-medium">
                    Your transaction may still be successful. Please check your email for the confirmation and download links.
                  </p>
                </div>
              </div>
            ) : order ? (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-lg text-gray-700 mb-4">
                    Your purchase of <strong>"{order.products?.title || 'Unknown Product'}"</strong> has been successfully processed.
                  </p>
                  <p className="text-md text-gray-600 flex items-center justify-center">
                    <Mail className="mr-2 h-5 w-5 text-blue-500" />
                    A confirmation email with your download link(s) has been sent to <strong>{order.customer_email}</strong>.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please check your spam or junk folder if you don't see it in your inbox within a few minutes.
                  </p>
                </div>

                {order.products?.track_urls && order.products.track_urls.length > 0 && (
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-[#1C0357] flex items-center">
                      <Download className="mr-2 h-5 w-5" />
                      Your Downloadable Tracks
                    </h3>
                    <div className="flex flex-col gap-2">
                      {order.products.track_urls.map((track, index) => (
                        <Button 
                          key={index}
                          size="lg" 
                          className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
                          onClick={() => downloadTrack(track.url, track.caption || `${order.products?.title || 'track'}.mp3`)}
                        >
                          <Download className="w-5 h-5 mr-2" />
                          {track.caption || `Download Track ${index + 1}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {order.products?.sheet_music_url && order.products?.show_sheet_music_url && (
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-[#1C0357] flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Sheet Music
                    </h3>
                    <Button 
                      size="lg" 
                      className="w-full bg-[#D1AAF2]/30 hover:bg-[#D1AAF2]/50 text-[#1C0357]"
                      onClick={() => window.open(order.products?.sheet_music_url || '', '_blank')}
                    >
                      <FileText className="h-5 w-5 mr-2" /> View Sheet Music PDF
                    </Button>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <h3 className="text-xl font-semibold text-[#1C0357] flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Next Steps
                  </h3>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {userSession ? (
                      <Link to="/user-dashboard">
                        <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-6 py-3 w-full sm:w-auto">
                          Go to My Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/login">
                        <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-6 py-3 w-full sm:w-auto">
                          Login / Create Account
                        </Button>
                      </Link>
                    )}
                    <Link to="/shop">
                      <Button variant="outline" className="text-[#1C0357] border-[#1C0357] hover:bg-[#1C0357]/10 text-lg px-6 py-3 w-full sm:w-auto">
                        Continue Shopping
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
                <p className="text-lg text-gray-700">
                  We couldn't find details for your purchase. If you believe this is an error, please contact support.
                </p>
              </div>
            )}
            <div className="mt-8 text-center">
              <Button 
                variant="ghost" 
                onClick={handleReportIssue}
                className="text-gray-600 hover:text-gray-800 flex items-center mx-auto"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Report an Issue or Give Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default PurchaseConfirmation;
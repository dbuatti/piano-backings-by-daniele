import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js'; // Import createClient
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail, ShoppingCart, User, MessageSquare } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';

interface Order {
  id: string;
  product_id: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  user_id?: string;
  products?: {
    title: string;
    description: string;
    track_urls?: { url: string; caption: string }[];
  };
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

      // Create a temporary Supabase client instance with a custom fetch function
      // that injects the 'x-checkout-session-id' header for this specific request.
      const supabaseWithHeaders = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
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

      try {
        // Check user session using the original supabase client (auth doesn't need custom headers for RLS)
        const { data: { session } } = await supabase.auth.getSession();
        setUserSession(session);

        // Fetch order details using the new client with custom headers
        const { data, error: fetchError } = await supabaseWithHeaders
          .from('orders')
          .select('*, product_id!products(title, description, track_urls)') // Explicitly specify product_id for embedding
          .eq('checkout_session_id', sessionId)
          .single();

        if (fetchError || !data) {
          console.error('Error fetching order:', fetchError);
          throw new Error('Order not found or could not be retrieved.');
        }

        setOrder(data as Order);
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
    navigate('/?openFeedback=true'); // Navigate to homepage with query param to open feedback dialog
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
              <ErrorDisplay error={error} title="Failed to Load Order" />
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

                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <h3 className="text-xl font-semibold text-[#1C0357] flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Order Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Product:</p>
                      <p className="font-medium">{order.products?.title || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Amount:</p>
                      <p className="font-medium">{order.currency} {order.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Order ID:</p>
                      <p className="font-medium">{order.id.substring(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date:</p>
                      <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

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
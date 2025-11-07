import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShoppingCart, Trash2, Minus, Plus, DollarSign, ArrowLeft } from 'lucide-react';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useCart, CartItem } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe, Stripe } from '@stripe/stripe-js'; // FIX: Import Stripe type
import Seo from "@/components/Seo";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const Cart: React.FC = () => {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setUserEmail(session.user.email);
      } else {
        setIsLoggedIn(false);
        setUserEmail(null);
      }
    };
    checkAuth();
  }, []);

  const handleCheckout = async () => {
    if (totalItems === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingOut(true);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load.");

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Prepare line items for the Edge Function
      const lineItems = items.map(item => ({
        id: item.id,
        quantity: item.quantity,
      }));

      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({ lineItems }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to create checkout session: ${response.status} ${response.statusText}`);
      }

      if (result.sessionId) {
        // Redirect to Stripe Checkout
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: result.sessionId,
        });

        if (stripeError) throw new Error(stripeError.message);
      } else {
        throw new Error('Stripe checkout session ID not received.');
      }

    } catch (err: any) {
      console.error('Error during checkout:', err);
      toast({
        title: "Checkout Error",
        description: `Failed to initiate checkout: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo 
        title="Shopping Cart - Piano Backings by Daniele"
        description="Review your selected backing tracks and proceed to checkout."
        canonicalUrl={`${window.location.origin}/cart`}
      />
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Your Shopping Cart</h1>
          <p className="text-xl font-light text-[#1C0357]/90">Review your items before purchase</p>
        </div>

        {totalItems === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-2xl font-semibold text-[#1C0357] mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Looks like you haven't added any tracks yet.</p>
              <Link to="/shop">
                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Go to Shop
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-lg">
                <CardHeader className="bg-[#D1AAF2]/20">
                  <CardTitle className="text-xl text-[#1C0357] flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Items ({totalItems})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-[120px] text-center">Quantity</TableHead>
                        <TableHead className="w-[100px] text-right">Price</TableHead>
                        <TableHead className="w-[50px] text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {item.image_url && (
                                <img src={item.image_url} alt={item.title} className="h-10 w-10 object-cover rounded-md mr-3" />
                              )}
                              <div>
                                {item.title}
                                <p className="text-xs text-gray-500">{item.currency} {item.price.toFixed(2)} each</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input 
                                type="number" 
                                value={item.quantity} 
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-10 h-6 text-center p-0"
                                min={1}
                              />
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {(item.price * item.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="p-4 flex justify-between border-t">
                  <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
                  <Link to="/shop">
                    <Button variant="ghost" className="text-[#1C0357] hover:bg-[#D1AAF2]/20">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>

            {/* Summary Card */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="shadow-lg bg-[#1C0357] text-white">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center">
                    <DollarSign className="mr-2 h-6 w-6" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-bold">AUD {totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-white/30 pt-4">
                    <span>Total</span>
                    <span>AUD {totalPrice.toFixed(2)}</span>
                  </div>
                  
                  {isLoggedIn ? (
                    <p className="text-sm text-white/80">Checking out as: {userEmail}</p>
                  ) : (
                    <p className="text-sm text-yellow-300">
                      You are checking out as a guest. <Link to="/login" className="underline font-medium">Login or sign up</Link> to save your purchases to your dashboard.
                    </p>
                  )}

                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut || totalItems === 0}
                    className="w-full bg-[#F538BC] hover:bg-[#F538BC]/90 text-white text-lg py-3 mt-4"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Proceed to Checkout
                        <DollarSign className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Cart;
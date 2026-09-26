"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Download, Music, Package, ArrowRight, AlertCircle, FileText, Clock, ExternalLink } from 'lucide-react';
import Seo from '@/components/Seo';
import { downloadTrack } from '@/utils/helpers';
import { useCart } from '@/hooks/useCart';

interface ShopOrder {
  id: string;
  includes_sheet_music?: boolean | null;
  sheet_music_url?: string | null;
  products: {
    title: string;
    product_type?: string | null;
    track_urls?: { url: string; caption?: string | null }[] | null;
    master_download_link?: string | null;
  } | null;
}

interface OrderData {
  type?: 'shop' | 'custom';
  orders?: ShopOrder[];
  requests?: { song_title: string }[] | null;
}

const PurchaseConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const sessionId = searchParams.get('session_id');
  const { clear: clearCart } = useCart();

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    let cancelled = false;

    // Stripe redirects here the instant checkout completes, but the stripe-webhook
    // function (which marks the request paid) fires asynchronously and can lag by a
    // few seconds. Poll briefly before showing a "couldn't verify" error, otherwise a
    // customer who WAS charged sees a failure page and may re-submit the form,
    // creating a duplicate request.
    const maxAttempts = 10;
    const intervalMs = 2000;

    const checkOnce = async () => {
      // Check for Shop Order(s) first — a cart checkout creates one order per product.
      const { data: orders } = await supabase
        .from('orders')
        .select('*, products(*)')
        .eq('checkout_session_id', sessionId);

      if (orders && orders.length > 0) return { type: 'shop' as const, orders: orders as unknown as ShopOrder[] };

      // Check for Custom Request
      const { data: requests } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('stripe_session_id', sessionId);

      if (requests && requests.length > 0) return { type: 'custom' as const, requests };

      return null;
    };

    const verifyPurchase = async () => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await checkOnce();
          if (cancelled) return;
          if (result) {
            if (result.type === 'shop') clearCart();
            setOrderData(result);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Verification error:", err);
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
      if (!cancelled) {
        setOrderData(null);
        setLoading(false);
      }
    };

    verifyPurchase();
    return () => { cancelled = true; };
  }, [sessionId, navigate, clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
          <p className="mt-4 font-bold text-[#1C0357]">Verifying your purchase...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-[#FDFCF7]">
        <Header />
        <main className="max-w-3xl mx-auto py-16 px-4">
          <Card className="rounded-[40px] border-none shadow-2xl overflow-hidden bg-white">
            <CardContent className="p-12 text-center space-y-6">
              <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={40} className="text-orange-500" />
              </div>
              <h1 className="text-3xl font-black text-[#1C0357]">Couldn't verify your purchase</h1>
              <p className="text-gray-500 font-medium">
                We couldn't find a matching order for this session. If you completed a payment,
                your order is still being processed — check your dashboard shortly or contact us if
                it doesn't appear.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild className="flex-1 h-14 rounded-2xl bg-[#1C0357] font-black">
                  <Link to="/user-dashboard">
                    Go to My Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-black">
                  <Link to="/shop">Continue Shopping</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7]">
      <Seo title="Thank You! | Purchase Confirmed" description="Your purchase has been confirmed." />
      <Header />
      
      <main className="max-w-3xl mx-auto py-16 px-4">
        <Card className="rounded-[40px] border-none shadow-2xl overflow-hidden bg-white">
          <div className="bg-green-500 p-12 text-center text-white">
            <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Order Confirmed!</h1>
            <p className="text-green-50 font-medium mt-2">Thank you for supporting my work.</p>
          </div>

          <CardContent className="p-12">
            {orderData?.type === 'shop' ? (
              <div className="space-y-6">
                {orderData.orders?.map(order => (
                  <div key={order.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-[#1C0357] rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                        <Package size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Purchased Item</p>
                        <h3 className="text-xl font-black text-[#1C0357]">{order.products?.title || 'Product'}</h3>
                      </div>
                    </div>

                    {order.products?.master_download_link ? (
                      <Button asChild className="w-full h-14 bg-[#D1AAF2]/20 hover:bg-[#D1AAF2]/30 text-[#1C0357] border-2 border-[#D1AAF2]/50 rounded-2xl font-black justify-between px-6">
                        <a href={order.products.master_download_link} target="_blank" rel="noopener noreferrer">
                          <span className="flex items-center gap-3"><Music size={20} className="text-[#F538BC]" /> Download your tracks</span>
                          <ExternalLink size={18} />
                        </a>
                      </Button>
                    ) : order.products?.track_urls?.map((track, i) => (
                      <Button 
                        key={i}
                        onClick={() => downloadTrack(track.url, track.caption || 'track.mp3')}
                        className="w-full h-14 bg-[#D1AAF2]/20 hover:bg-[#D1AAF2]/30 text-[#1C0357] border-2 border-[#D1AAF2]/50 rounded-2xl font-black justify-between px-6"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Music size={20} className="text-[#F538BC] flex-shrink-0" />
                          <span className="truncate">{track.caption || `Track ${i + 1}`}</span>
                        </span>
                        <Download size={20} />
                      </Button>
                    ))}

                    {order.includes_sheet_music && (order.sheet_music_url ? (
                      <Button asChild variant="outline" className="w-full h-14 rounded-2xl border-2 font-black justify-between px-6">
                        <a href={order.sheet_music_url} target="_blank" rel="noopener noreferrer">
                          <span className="flex items-center gap-3"><FileText size={20} className="text-[#F538BC]" /> Custom sheet music (PDF)</span>
                          <Download size={20} />
                        </a>
                      </Button>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <Clock size={16} className="text-[#F538BC]" />
                        Your custom sheet music will be emailed within 3–5 business days.
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="p-8 bg-[#1C0357]/5 rounded-[32px] border-2 border-dashed border-[#1C0357]/10">
                  <h3 className="text-2xl font-black text-[#1C0357] mb-2">Request Received</h3>
                  <p className="text-gray-600 font-medium">
                    I've received your custom request for <strong>{orderData?.requests?.map((r) => r.song_title).join(', ')}</strong>.
                  </p>
                  <p className="text-sm text-gray-400 mt-4">
                    You'll receive an email notification as soon as your tracks are ready.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1 h-14 rounded-2xl bg-[#1C0357] font-black">
                <Link to="/user-dashboard">
                  Go to My Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-black">
                <Link to="/shop">Continue Shopping</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PurchaseConfirmation;
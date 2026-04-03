"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Download, Music, Package, ArrowRight } from 'lucide-react';
import Seo from '@/components/Seo';
import { downloadTrack } from '@/utils/helpers';

const PurchaseConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId) {
        navigate('/');
        return;
      }

      try {
        // Check for Shop Order first
        const { data: order } = await supabase
          .from('orders')
          .select('*, products(*)')
          .eq('checkout_session_id', sessionId)
          .single();

        if (order) {
          setOrderData({ type: 'shop', ...order });
        } else {
          // Check for Custom Request
          const { data: requests } = await supabase
            .from('backing_requests')
            .select('*')
            .eq('stripe_session_id', sessionId);

          if (requests && requests.length > 0) {
            setOrderData({ type: 'custom', requests });
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
      } finally {
        setLoading(false);
      }
    };

    verifyPurchase();
  }, [sessionId, navigate]);

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
            <h1 className="text-4xl font-black tracking-tighter">Payment Successful!</h1>
            <p className="text-green-50 font-medium mt-2">Thank you for supporting my work.</p>
          </div>

          <CardContent className="p-12">
            {orderData?.type === 'shop' ? (
              <div className="space-y-8">
                <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="h-12 w-12 bg-[#1C0357] rounded-2xl flex items-center justify-center text-white">
                    <Package size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Purchased Item</p>
                    <h3 className="text-xl font-black text-[#1C0357]">{orderData.products.title}</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-[#1C0357] uppercase tracking-widest text-sm">Your Downloads</h4>
                  {orderData.products.track_urls?.map((track: any, i: number) => (
                    <Button 
                      key={i}
                      onClick={() => downloadTrack(track.url, track.caption || 'track.mp3')}
                      className="w-full h-16 bg-[#D1AAF2]/20 hover:bg-[#D1AAF2]/30 text-[#1C0357] border-2 border-[#D1AAF2]/50 rounded-2xl font-black justify-between px-6"
                    >
                      <span className="flex items-center gap-3">
                        <Music size={20} className="text-[#F538BC]" />
                        {track.caption || `Track ${i + 1}`}
                      </span>
                      <Download size={20} />
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="p-8 bg-[#1C0357]/5 rounded-[32px] border-2 border-dashed border-[#1C0357]/10">
                  <h3 className="text-2xl font-black text-[#1C0357] mb-2">Request Received</h3>
                  <p className="text-gray-600 font-medium">
                    I've received your custom request for <strong>{orderData?.requests?.map((r: any) => r.song_title).join(', ')}</strong>.
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
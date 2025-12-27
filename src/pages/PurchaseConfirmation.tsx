"use client";

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client'; // Corrected import
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import Seo from '@/components/Seo';

// Assuming these types and helpers exist based on the original error message
interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  track_urls: { url: string; label: string }[];
}

const downloadTrack = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch track');
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading track:', error);
    alert('Failed to download track. Please try again.');
  }
};

const PurchaseConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const params = new URLSearchParams(location.search);
      const orderId = params.get('orderId');

      if (!orderId) {
        setError('Order ID not found in URL.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, products(title, artist_name, track_urls)')
          .eq('id', orderId)
          .single();

        if (error) throw error;

        if (data && data.products) {
          setTrackInfo({
            id: data.products.id,
            title: data.products.title,
            artist: data.products.artist_name,
            track_urls: data.products.track_urls || [],
          });
        } else {
          setError('Order or product details not found.');
        }
      } catch (err: any) {
        console.error('Error fetching order details:', err.message);
        setError('Failed to load order details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [location.search]);

  const handleDownload = (url: string, title: string, label: string) => {
    downloadTrack(url, `${title} - ${label}.mp3`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#1C0357]" />
          <p className="mt-4 text-[#1C0357] font-medium">Loading purchase details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
        <Seo 
          title="Purchase Error"
          description="There was an error confirming your purchase."
        />
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Card className="border-2 border-red-100 shadow-xl overflow-hidden rounded-3xl max-w-md w-full">
            <div className="bg-red-500 p-8 text-center text-white">
              <XCircle className="h-16 w-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Purchase Error</h1>
            </div>
            <CardContent className="p-8 text-center">
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                {error}
              </p>
              <Button onClick={() => navigate('/')} size="lg" className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white rounded-full px-10 py-6 text-lg">
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
      <Seo 
        title="Purchase Confirmed!"
        description="Your purchase has been confirmed. Download your tracks now."
      />
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white max-w-2xl w-full">
          <div className="bg-green-500 py-12 text-center text-white">
            <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">Purchase Confirmed!</h1>
            <p className="mt-2 text-green-50 font-medium">Thank you for your order.</p>
          </div>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-[#1C0357] mb-4">
              {trackInfo?.title} by {trackInfo?.artist}
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Your tracks are ready for download.
            </p>
            <div className="space-y-4 mb-8">
              {trackInfo?.track_urls && trackInfo.track_urls.length > 0 ? (
                trackInfo.track_urls.map((track, index) => (
                  <Button
                    key={index}
                    onClick={() => handleDownload(track.url, trackInfo.title, track.label)}
                    className="w-full bg-[#D1AAF2] hover:bg-[#D1AAF2]/90 text-[#1C0357] px-8 py-6 text-lg rounded-full shadow-md"
                  >
                    Download {track.label}
                  </Button>
                ))
              ) : (
                <p className="text-gray-500">No tracks available for download.</p>
              )}
            </div>
            <Button onClick={() => navigate('/shop')} size="lg" variant="outline" className="border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/5 rounded-full px-10 py-6 text-lg">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default PurchaseConfirmation;
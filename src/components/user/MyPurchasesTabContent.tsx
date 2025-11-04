import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, DollarSign, Music, Download, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface TrackInfo {
  url: string;
  caption: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  track_urls?: TrackInfo[];
  is_active: boolean;
}

interface Order {
  id: string;
  created_at: string;
  product_id: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  user_id: string | null;
  products: Product; // Joined product data
}

interface MyPurchasesTabContentProps {
  userId: string;
}

const MyPurchasesTabContent: React.FC<MyPurchasesTabContentProps> = ({ userId }) => {
  const { toast } = useToast();

  const { data: orders, isLoading, isError, error } = useQuery<Order[], Error>({
    queryKey: ['userPurchases', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            id, title, description, price, currency, image_url, track_urls, is_active
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!userId,
  });

  const downloadTrack = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Track Not Available",
        description: "This track is not yet available for download.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
        <p className="ml-4 text-lg text-gray-600">Loading your purchases...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-300 bg-red-50 text-red-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Error Loading Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error?.message || 'Failed to load your purchased products.'}</p>
          <p className="mt-2 text-sm">Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-8">
        <ShoppingCart className="mx-auto h-20 w-20 text-gray-400 mb-4" />
        <h3 className="mt-4 text-2xl font-semibold text-gray-900">No Purchases Yet</h3>
        <p className="mt-2 text-lg text-gray-600">
          It looks like you haven't purchased any products from our shop.
        </p>
        <div className="mt-6">
          <Button onClick={() => window.location.href = '/shop'} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            Browse Our Shop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map(order => (
        <Card key={order.id} className="shadow-lg">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-xl text-[#1C0357] flex items-center justify-between">
              <span className="flex items-center">
                <Music className="mr-2 h-5 w-5" />
                {order.products?.title || 'Unknown Product'}
              </span>
              <Badge variant="default" className="bg-green-500">Purchased</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-medium">{format(new Date(order.created_at), 'MMMM dd, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {order.currency} {order.amount.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Description</p>
              <p className="font-medium">{order.products?.description || 'No description available.'}</p>
            </div>

            {order.products?.track_urls && order.products.track_urls.length > 0 ? (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold text-lg mb-3 text-[#1C0357] flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Your Downloadable Tracks
                </h4>
                <ul className="space-y-2">
                  {order.products.track_urls.map((track, index) => (
                    <li key={index} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <span className="font-medium text-gray-800 flex-1 mr-2">{track.caption}</span>
                      <Button 
                        size="sm" 
                        onClick={() => downloadTrack(track.url)}
                        className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-6 border-t pt-4 text-center text-gray-500">
                <p>No downloadable tracks found for this product.</p>
                <p className="text-sm">Please contact support if you believe this is an error.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyPurchasesTabContent;
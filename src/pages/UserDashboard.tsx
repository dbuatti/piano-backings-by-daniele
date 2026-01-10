"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Loader2, 
  ShoppingBag,
  Package,
  Eye,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateRequestCost } from '@/utils/pricing';
import { getSafeBackingTypes } from '@/utils/helpers';
import Seo from '@/components/Seo';
import { downloadTrack } from '@/utils/helpers';

interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined;
}

interface BackingRequest {
  id: string;
  created_at: string;
  song_title: string;
  musical_or_artist: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: TrackInfo[];
  cost?: number;
  final_price?: number | null;
  estimated_cost_low?: number | null;
  estimated_cost_high?: number | null;
  delivery_date?: string;
  backing_type?: string[] | string;
  track_type?: string;
}

interface Order {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  products: {
    id: string;
    title: string;
    track_urls?: TrackInfo[];
    master_download_link?: string | null;
  };
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch user's backing requests
  const { data: requests, isLoading: isLoadingRequests } = useQuery<BackingRequest[], Error>({
    queryKey: ['userRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[], Error>({
    queryKey: ['userOrders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            id,
            title,
            track_urls,
            master_download_link
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getPaymentBadge = (isPaid: boolean) => {
    return isPaid 
      ? <Badge variant="default" className="bg-green-500"><DollarSign className="w-3 h-3 mr-1" /> Paid</Badge>
      : <Badge variant="secondary" className="bg-gray-400 text-gray-800"><DollarSign className="w-3 h-3 mr-1" /> Unpaid</Badge>;
  };

  const handleDownloadTrack = (url: string, caption: string) => {
    downloadTrack(url, caption || 'track.mp3');
    toast({ title: "Download Started", description: "Your track is downloading." });
  };

  const handleDownloadOrderTrack = (url: string, caption: string) => {
    downloadTrack(url, caption || 'order-track.mp3');
    toast({ title: "Download Started", description: "Your order track is downloading." });
  };

  const handleDownloadMasterLink = (url: string) => {
    window.open(url, '_blank');
    toast({ title: "Opening Master Link", description: "Redirecting to download folder." });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#1C0357]" />
          <p className="mt-4 text-[#1C0357] font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
      <Seo 
        title="User Dashboard"
        description="Manage your custom backing track requests and order history."
      />
      <Header />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[#1C0357] mb-1">
              Your Dashboard
            </h1>
            <p className="text-gray-600 font-medium">
              Manage your requests and view order history
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-[#1C0357]">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
              <span className="text-xs text-gray-500">{user.email}</span>
            </div>
            <Button asChild variant="outline" className="bg-white">
              <Link to="/form-page">
                <Music className="mr-2 h-4 w-4" />
                New Request
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Backing Requests
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Shop Orders
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
            {isLoadingRequests ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
                <p className="mt-4 text-gray-600">Loading your requests...</p>
              </div>
            ) : !requests || requests.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Music className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-[#1C0357] mb-2">No Requests Yet</h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    You haven't submitted any custom backing track requests. Start by creating your first request!
                  </p>
                  <Button asChild className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                    <Link to="/form-page">
                      Create Your First Request
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => {
                  const calculatedCost = calculateRequestCost(request).totalCost;
                  const displayedCost = request.final_price !== null && request.final_price !== undefined 
                    ? request.final_price 
                    : calculatedCost;
                  
                  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

                  return (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Music className="h-5 w-5 text-[#1C0357]" />
                              <h3 className="text-xl font-bold text-[#1C0357]">{request.song_title}</h3>
                              <span className="text-gray-400">by</span>
                              <span className="font-semibold text-gray-700">{request.musical_or_artist}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {getStatusBadge(request.status || 'pending')}
                              {getPaymentBadge(request.is_paid)}
                              {request.track_type && (
                                <Badge variant="outline" className="capitalize">
                                  {request.track_type.replace('-', ' ')}
                                </Badge>
                              )}
                              {normalizedBackingTypes.length > 0 && (
                                <Badge variant="secondary" className="bg-[#D1AAF2] text-[#1C0357]">
                                  {normalizedBackingTypes[0].replace('-', ' ')}
                                  {normalizedBackingTypes.length > 1 && ` +${normalizedBackingTypes.length - 1}`}
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Submitted: {format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
                              </div>
                              {request.delivery_date && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>Due: {format(new Date(request.delivery_date), 'MMM dd, yyyy')}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 font-semibold text-[#1C0357]">
                                <DollarSign className="h-4 w-4" />
                                <span>${displayedCost.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 min-w-[180px]">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/track/${request.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </Button>
                            
                            {request.status === 'completed' && request.track_urls && request.track_urls.length > 0 && (
                              <div className="space-y-1">
                                {request.track_urls.map((track, index) => {
                                  const caption = typeof track.caption === 'string' ? track.caption : undefined;
                                  return (
                                    <Button 
                                      key={track.url} 
                                      variant="secondary" 
                                      size="sm"
                                      className="bg-[#D1AAF2] text-[#1C0357] hover:bg-[#D1AAF2]/80"
                                      onClick={() => handleDownloadTrack(track.url, caption || `${request.song_title}_track_${index + 1}`)}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Track {index + 1}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {isLoadingOrders ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
                <p className="mt-4 text-gray-600">Loading your orders...</p>
              </div>
            ) : !orders || orders.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-[#1C0357] mb-2">No Shop Orders Yet</h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    You haven't purchased any items from the shop. Browse our collection of ready-made backing tracks!
                  </p>
                  <Button asChild className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                    <Link to="/shop">
                      Browse Shop
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-[#1C0357]" />
                            <h3 className="text-xl font-bold text-[#1C0357]">{order.products?.title || 'Product'}</h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" /> Completed
                            </Badge>
                            <Badge variant="secondary" className="bg-[#D1AAF2] text-[#1C0357]">
                              Shop Order
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Purchased: {format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1 font-semibold text-[#1C0357]">
                              <DollarSign className="h-4 w-4" />
                              <span>${order.amount.toFixed(2)} {order.currency}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 min-w-[180px]">
                          {order.products?.master_download_link ? (
                            <Button 
                              variant="secondary" 
                              size="sm"
                              className="bg-[#D1AAF2] text-[#1C0357] hover:bg-[#D1AAF2]/80"
                              onClick={() => handleDownloadMasterLink(order.products.master_download_link!)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download All
                            </Button>
                          ) : order.products?.track_urls && order.products.track_urls.length > 0 ? (
                            order.products.track_urls.map((track, index) => {
                              const caption = typeof track.caption === 'string' ? track.caption : undefined;
                              return (
                                <Button 
                                  key={track.url} 
                                  variant="secondary" 
                                  size="sm"
                                  className="bg-[#D1AAF2] text-[#1C0357] hover:bg-[#D1AAF2]/80"
                                  onClick={() => handleDownloadOrderTrack(track.url, caption || `${order.products?.title}_track_${index + 1}`)}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Track {index + 1}
                                </Button>
                              );
                            })
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MadeWithDyad />
    </div>
  );
};

export default UserDashboard;
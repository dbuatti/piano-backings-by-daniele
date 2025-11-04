import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Download, Play, Share2, Music, User as UserIcon, Calendar, Clock, CheckCircle, Eye, Link as LinkIcon,
  RefreshCw, Loader2, // Removed AlertCircle, Search, UserPlus
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSafeBackingTypes } from '@/utils/helpers';
// import { Input } from '@/components/ui/input'; // Removed as it was unused
// import { Label } from '@/components/ui/label'; // Removed as it was unused
// import ErrorDisplay from '@/components/ErrorDisplay'; // Removed as it was unused
import { Separator } from '@/components/ui/separator'; // Import Separator
import { useQuery } from '@tanstack/react-query';
import { useRequestActions } from '@/hooks/admin/useRequestActions'; // Import the hook
import { useUploadDialogs } from '@/hooks/admin/useUploadDialogs'; // Import the hook

interface TrackInfo {
  url: string;
  caption: string;
}

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  track_purpose: string;
  backing_type: string | string[];
  delivery_date: string;
  special_requests: string;
  song_key: string;
  different_key: string;
  key_for_track: string;
  voice_memo: string;
  voice_memo_file_url?: string;
  sheet_music_url?: string;
  youtube_link?: string;
  additional_links?: string;
  additional_services: string[];
  track_type: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: TrackInfo[];
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number;
  user_id: string | null;
}

// interface UserProfile { // Removed as it was unused
//   id: string;
//   email: string;
//   name: string;
// }

const RequestDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');

  // State for ownership management (removed from here, now in RequestOwnershipTabContent)
  // const [ownershipError, setOwnershipError] = useState<any>(null); // Removed as it was unused

  const fetchRequest = useCallback(async () => {
    if (!id) return null;
    let query = supabase
      .from('backing_requests')
      .select('*')
      .eq('id', id)
      .single();

    // If emailFromUrl is present, it's a guest link, so also filter by email
    if (emailFromUrl) {
      query = query.eq('email', emailFromUrl);
    } else if (user?.id) {
      // If logged in, ensure the request belongs to the user or is an admin
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      if (!adminEmails.includes(user.email!)) { // Added non-null assertion
        query = query.eq('user_id', user.id);
      }
    } else {
      // If not logged in and no email in URL, it's an invalid state for non-admin
      return null;
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }, [id, emailFromUrl, user]);

  const { data: request, isLoading, isError, error, refetch } = useQuery<BackingRequest, Error>({
    queryKey: ['requestDetails', id, user?.id, emailFromUrl],
    queryFn: fetchRequest,
    enabled: !!id && (!!user?.id || !!emailFromUrl), // Only fetch if ID and user/email are available
  });

  // Check user session and admin status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const loggedInUser = session?.user;
      setUser(loggedInUser);

      if (loggedInUser?.email) {
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        if (adminEmails.includes(loggedInUser.email!)) { // Added non-null assertion
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { // Renamed event to _event
      checkUser();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Use the request actions hook
  const { updateStatus, updatePaymentStatus, shareTrack } = useRequestActions(request ? [request] : [], (updatedRequests) => {
    if (updatedRequests.length > 0) {
      refetch(); // Refetch the single request to update its state
    }
  });

  // Use the upload dialogs hook
  const {
    uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen,
    selectedRequestForPlatforms, setSelectedRequestForPlatforms,
    platforms, setPlatforms,
    openUploadPlatformsDialog,
    saveUploadPlatforms,
    updateTrackCaption,
  } = useUploadDialogs(request ? [request] : [], (updatedRequests) => {
    if (updatedRequests.length > 0) {
      refetch(); // Refetch the single request to update its state
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getPaymentBadge = (isPaid: boolean) => {
    return isPaid ? (
      <Badge variant="default" className="bg-blue-500">Paid</Badge>
    ) : (
      <Badge variant="destructive">Unpaid</Badge>
    );
  };

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
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-[#1C0357]" />
        <p className="ml-4 text-xl text-gray-700">Loading request details...</p>
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || "Failed to load request details. It might not exist or you don't have permission to view it."}
              <p className="mt-2">Please ensure you are logged in with the correct account or using the correct guest link.</p>
              <Button onClick={() => navigate('/login')} className="mt-4 bg-red-600 hover:bg-red-700">Go to Login</Button>
            </AlertDescription>
          </Alert>
          <MadeWithDyad />
        </div>
      </div>
    );
  }

  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1C0357]">Request Details</h1>
            <p className="text-lg text-[#1C0357]/90">Information for "{request.song_title}"</p>
          </div>
          <Button onClick={() => navigate(-1)} variant="outline">
            Back
          </Button>
        </div>

        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20 py-3 px-4">
            <CardTitle className="text-xl text-[#1C0357] flex items-center justify-between">
              <span className="flex items-center">
                <Music className="mr-2" />
                {request.song_title} by {request.musical_or_artist}
              </span>
              <div className="flex items-center space-x-2">
                {getStatusBadge(request.status)}
                {getPaymentBadge(request.is_paid)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Requested By</p>
                <p className="font-medium">{request.name} ({request.email})</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Request Date</p>
                <p className="font-medium">{format(new Date(request.created_at), 'MMMM dd, yyyy HH:mm')}</p>
              </div>
            </div>

            <Separator />

            {/* Song Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Original Key</p>
                <p className="font-medium">{request.song_key || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Key for Track</p>
                <p className="font-medium">
                  {request.different_key === 'Yes' ? request.key_for_track : 'Same as original'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Track Purpose</p>
                <p className="font-medium capitalize">{request.track_purpose.replace('-', ' ') || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Backing Type</p>
                <div className="flex flex-wrap gap-1">
                  {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                    <Badge key={index} variant="outline" className="capitalize">
                      {type.replace('-', ' ')}
                    </Badge>
                  )) : <Badge variant="outline">Not specified</Badge>}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Track Type</p>
                <p className="font-medium capitalize">{request.track_type.replace('-', ' ') || 'Not specified'}</p>
              </div>
            </div>

            <Separator />

            {/* Reference Materials */}
            <div>
              <h3 className="text-lg font-semibold text-[#1C0357] mb-3">Reference Materials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Sheet Music</p>
                  {request.sheet_music_url ? (
                    <Button variant="link" className="p-0 h-auto text-[#1C0357]" onClick={() => window.open(request.sheet_music_url, '_blank')}>
                      <LinkIcon className="mr-1 h-4 w-4" /> View Sheet Music
                    </Button>
                  ) : (
                    <p className="text-gray-600">No sheet music provided.</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">YouTube Link</p>
                  {request.youtube_link ? (
                    <Button variant="link" className="p-0 h-auto text-[#1C0357]" onClick={() => window.open(request.youtube_link, '_blank')}>
                      <LinkIcon className="mr-1 h-4 w-4" /> View YouTube Link
                    </Button>
                  ) : (
                    <p className="text-gray-600">No YouTube link provided.</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Voice Memo</p>
                  {request.voice_memo_file_url ? (
                    <Button variant="link" className="p-0 h-auto text-[#1C0357]" onClick={() => window.open(request.voice_memo_file_url, '_blank')}>
                      <LinkIcon className="mr-1 h-4 w-4" /> Listen to Voice Memo
                    </Button>
                  ) : request.voice_memo ? (
                    <p className="font-medium">{request.voice_memo}</p>
                  ) : (
                    <p className="text-gray-600">No voice memo provided.</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Additional Links</p>
                  {request.additional_links ? (
                    <Button variant="link" className="p-0 h-auto text-[#1C0357]" onClick={() => window.open(request.additional_links, '_blank')}>
                      <LinkIcon className="mr-1 h-4 w-4" /> View Additional Links
                    </Button>
                  ) : (
                    <p className="text-gray-600">No additional links provided.</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Special Requests & Additional Services */}
            <div>
              <p className="text-sm text-gray-500">Special Requests</p>
              <p className="font-medium">{request.special_requests || 'None'}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Additional Services</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {request.additional_services && request.additional_services.length > 0 ? (
                  request.additional_services.map((service, index) => (
                    <Badge key={index} variant="secondary" className="capitalize">
                      {service.replace('-', ' ')}
                    </Badge>
                  ))
                ) : (
                  <p className="text-gray-600">None</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Delivery & Tracks */}
            <div>
              <p className="text-sm text-gray-500">Desired Delivery Date</p>
              <p className="font-medium">
                {request.delivery_date ? format(new Date(request.delivery_date), 'MMMM dd, yyyy') : 'Not specified'}
              </p>
            </div>

            {request.track_urls && request.track_urls.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="text-xl font-semibold text-[#1C0357] flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Your Track(s)
                </h4>
                <ul className="space-y-2 mt-3">
                  {request.track_urls.map((track: TrackInfo, index: number) => (
                    <li key={track.url} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
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
            )}

            {/* Admin Actions */}
            {isAdmin && (
              <div className="mt-8 border-t pt-6 space-y-4">
                <h3 className="text-xl font-bold text-red-600 flex items-center">
                  <Shield className="mr-2 h-6 w-6" /> Admin Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Update Status</p>
                    <select
                      value={request.status}
                      onChange={(e) => updateStatus(request.id, e.target.value as BackingRequest['status'])}
                      className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Update Payment Status</p>
                    <select
                      value={request.is_paid ? 'paid' : 'unpaid'}
                      onChange={(e) => updatePaymentStatus(request.id, e.target.value === 'paid')}
                      className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button onClick={() => shareTrack(request.id)} variant="outline">
                    <Share2 className="mr-2 h-4 w-4" /> Share Client Link
                  </Button>
                  <Button onClick={() => openUploadPlatformsDialog(request.id)} variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Manage Upload Platforms
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default RequestDetails;
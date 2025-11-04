import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Download, Play, Music, User as UserIcon, Calendar, Clock, CheckCircle, Link as LinkIcon,
  Headphones, Loader2, // Removed FileText, Folder, Key
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSafeBackingTypes } from '@/utils/helpers';

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

const ClientTrackView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<BackingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) {
        throw new Error("Request ID is missing.");
      }
      if (!emailFromUrl) {
        throw new Error("Email parameter is missing from the URL. This link is invalid.");
      }

      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('id', id)
        .eq('email', emailFromUrl) // Crucial for guest access security
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          throw new Error("Request not found or you do not have permission to view it. Please check the link and email.");
        }
        throw error;
      }
      setRequest(data);
    } catch (err: any) {
      console.error('Error fetching request:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, emailFromUrl, toast]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex items-center justify-center">
        <Header />
        <Loader2 className="h-16 w-16 animate-spin text-[#1C0357]" />
        <p className="ml-4 text-xl text-gray-700">Loading your track details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Failed to load track details. It might not exist or the link is invalid."}
              <p className="mt-2">Please ensure you are using the correct guest link provided in your email.</p>
              <Button onClick={() => navigate('/')} className="mt-4 bg-red-600 hover:bg-red-700">Go to Homepage</Button>
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
            <h1 className="text-3xl font-bold text-[#1C0357]">Your Track Details</h1>
            <p className="text-lg text-[#1C0357]/90">Information for "{request.song_title}"</p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Home
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

            {/* Song Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
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

            {/* Reference Materials */}
            <div className="border-t pt-4">
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

            {/* Special Requests & Additional Services */}
            <div className="border-t pt-4">
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

            {/* Delivery & Tracks */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">Desired Delivery Date</p>
              <p className="font-medium">
                {request.delivery_date ? format(new Date(request.delivery_date), 'MMMM dd, yyyy') : 'Not specified'}
              </p>
            </div>

            {request.status === 'completed' && request.track_urls && request.track_urls.length > 0 ? (
              <div className="mt-6 border-t pt-4">
                <h4 className="text-xl font-semibold text-[#1C0357] flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Your Completed Track(s)
                </h4>
                <ul className="space-y-2 mt-3">
                  {request.track_urls.map((track: TrackInfo) => ( // Removed unused index
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
            ) : request.status === 'completed' && (!request.track_urls || request.track_urls.length === 0) ? (
              <div className="mt-6 border-t pt-4 text-center text-gray-500">
                <p>This request is marked as completed, but no tracks are available for download yet.</p>
                <p className="text-sm">Please contact support if you believe this is an error.</p>
              </div>
            ) : (
              <div className="mt-6 border-t pt-4 text-center text-gray-500">
                <p>Your track is currently {request.status.replace('-', ' ')}. Check back here for updates!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default ClientTrackView;
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { showError } from '@/utils/toast'; // Updated import
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Music, 
  User, 
  Mail, 
  Link as LinkIcon, 
  FileText, 
  Headphones, 
  Target, 
  Key, 
  Folder,
  Download,
  Coffee,
  Banknote,
  Play,
  FileAudio,
  DollarSign, // Added DollarSign icon
  UserPlus, // Added UserPlus icon
  Chrome, // Added Chrome icon for Google sign-in
  Loader2 // Imported Loader2 icon
} from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing'; // Removed getTrackTypeBaseDisplayRange
import { getSafeBackingTypes, downloadTrack, TrackInfo } from '@/utils/helpers'; // Import downloadTrack and TrackInfo
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components
import Seo from "@/components/Seo"; // Import Seo component

// TrackInfo interface is now imported from helpers.ts
// interface TrackInfo {
//   url: string;
//   caption: string | boolean | null | undefined;
// }

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  song_key: string | null;
  different_key: string | null;
  key_for_track: string | null;
  youtube_link: string | null;
  voice_memo: string | null;
  sheet_music_url: string | null;
  track_purpose: string | null;
  backing_type: string[] | string | null;
  delivery_date: string | null;
  additional_services: string[] | null;
  special_requests: string | null;
  category: string | null;
  track_type: string | null;
  additional_links: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: { url: string; caption: string | boolean | null | undefined }[];
  shared_link?: string | null;
  dropbox_folder_id?: string | null;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; } | null;
  cost?: number | null;
  final_price?: number | null; // New field
  estimated_cost_low?: number | null; // New field
  estimated_cost_high?: number | null; // New field
  user_id?: string | null; // Added for access control
  guest_access_token?: string | null; // Added for access control
}

const ClientTrackView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // Removed: const { toast } = useToast();
  const [request, setRequest] = useState<BackingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userSession, setUserSession] = useState<any>(null); // To store the current user session
  const [showLoginPrompt, setShowLoginPrompt] = useState(false); // State for the login prompt
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      setAccessDenied(false);
      
      if (!id) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const guestAccessToken = urlParams.get('token'); // Get the guest access token
      
      // Fetch user session first
      const { data: { session } = {} } = await supabase.auth.getSession(); // Destructure with default empty object
      setUserSession(session);

      try {
        let requestData: BackingRequest | null = null;
        let fetchError: any = null;

        if (guestAccessToken) {
          // Attempt to fetch using the secure token for anonymous users
          const response = await fetch(
            `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/get-guest-request-by-token`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ request_id: id, token: guestAccessToken }),
            }
          );
          const result = await response.json();
          if (!response.ok) {
            fetchError = new Error(result.error || `Failed to fetch guest request: ${response.status} ${response.statusText}`);
          } else {
            requestData = result.request;
          }
        } else {
          // For logged-in users or admins, fetch directly from Supabase with RLS
          const { data, error } = await supabase
            .from('backing_requests')
            .select('*')
            .eq('id', id)
            .single<BackingRequest>();
          requestData = data;
          fetchError = error;
        }
        
        if (fetchError || !requestData) {
          console.error('Error fetching request:', fetchError);
          setAccessDenied(true);
          showError("Error", "Request not found or access denied."); // Updated toast call
          return;
        }

        // Now, determine access based on user_id, email, and admin status
        const loggedInUserId = session?.user?.id;
        const loggedInUserEmail = session?.user?.email;
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        const isAdmin = loggedInUserEmail && adminEmails.includes(loggedInUserEmail);

        let hasAccess = false;

        if (isAdmin) {
          hasAccess = true; // Admins can view any track
        } else if (requestData.user_id) {
          // If the request is linked to a user_id, only the owner can access
          if (loggedInUserId === requestData.user_id) {
            hasAccess = true;
          } else {
            console.warn('Logged-in user is not the owner of this request.');
          }
        } else {
          // If the request is NOT linked to a user_id (guest submission)
          // Access is granted if guestAccessToken matches the stored token
          if (guestAccessToken && requestData.guest_access_token && guestAccessToken === requestData.guest_access_token) {
            hasAccess = true;
          } else {
            console.warn('Guest access denied: Token mismatch or no token provided for unlinked request.');
          }
        }

        if (hasAccess) {
          setRequest(requestData);
          // Show login prompt if no user session and access was granted via guest token
          if (!session && (guestAccessToken || requestData.guest_access_token)) {
            setShowLoginPrompt(true);
          } else {
            setShowLoginPrompt(false);
          }
        } else {
          setAccessDenied(true);
          showError("Access Denied", "You do not have permission to view this track. Please ensure you are logged in with the correct account or using the correct access link."); // Updated toast call
        }

      } catch (error: any) {
        console.error('Error in ClientTrackView fetch logic:', error);
        setAccessDenied(true);
        showError("Error", `Failed to fetch request: ${error.message}`); // Updated toast call
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequest();
  }, [id, navigate]); // Removed toast from dependency array

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

  const handleGoogleSignIn = async () => {
    setIsSigningInWithGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/user-dashboard`, // Redirect to user dashboard after successful sign-in
        },
      });

      if (error) {
        throw error;
      }
      // No need for toast.success here, as the redirect will happen.
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      showError("Sign In Error", `Failed to sign in with Google: ${error.message}`); // Updated toast call
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
          <p className="ml-4 text-lg text-gray-600">Loading track details...</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 text-center">
          <Card className="shadow-lg bg-red-50 border-red-300">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center justify-center">
                <XCircle className="mr-2 h-6 w-6" /> Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-red-700 mb-4">
                You do not have permission to view this track.
              </p>
              <p className="text-md text-gray-700 mb-6">
                Please ensure you are logged in with the correct account or using the correct access link.
              </p>
              <Button onClick={() => navigate('/login')} className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Request not found.</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);
  const calculatedCostBreakdown = calculateRequestCost(request);
  const calculatedTotalCost = calculatedCostBreakdown.totalCost;

  // Determine displayed cost and range
  const displayedFinalPrice = request.final_price !== null ? request.final_price : calculatedTotalCost;
  const displayedEstimatedLow = request.estimated_cost_low !== null ? request.estimated_cost_low : (calculatedTotalCost * 0.5);
  const displayedEstimatedHigh = request.estimated_cost_high !== null ? request.estimated_cost_high : (calculatedTotalCost * 1.5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo
        title={`${request.song_title} - Track Details | Piano Backings by Daniele`}
        description={`Details for your custom piano backing track: ${request.song_title} by ${request.musical_or_artist}. View status, download tracks, and manage payment.`}
        keywords={`piano backing track, ${request.song_title}, ${request.musical_or_artist}, custom music, track status, download track`}
        canonicalUrl={`${window.location.origin}/track/${request.id}`}
      />
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#1C0357]">Your Track Details</h1>
          <p className="text-lg text-[#1C0357]/90">Request for "{request.song_title}"</p>
        </div>

        {showLoginPrompt && (
          <Card className="shadow-lg mb-6 bg-[#1C0357] text-white border-[#1C0357] relative">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold mb-4 flex items-center justify-center">
                <UserPlus className="mr-3 h-6 w-6" />
                Link This Request to Your Account
              </h3>
              <p className="text-lg mb-6 max-w-2xl mx-auto opacity-90">
                You're viewing this request via a temporary link. Sign in or create an account to permanently save this and all your future requests in your dashboard!
              </p>
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSigningInWithGoogle}
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3 mb-4 w-full sm:w-auto"
              >
                {isSigningInWithGoogle ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing In...
                  </>
                ) : (
                  <>
                    <Chrome className="mr-2 h-5 w-5" /> Sign In with Google
                  </>
                )}
              </Button>
              <p className="text-sm text-white/80 mt-2">
                Or <Link to="/login" className="text-white underline hover:text-gray-200">sign in with email</Link>
              </p>
            </CardContent>
          </Card>
        )}
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
              <span>Request Information</span>
              {getStatusBadge(request.status || 'pending')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Client Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <User className="mr-1 h-4 w-4" /> Name
                    </p>
                    <p className="font-medium">{request.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Mail className="mr-1 h-4 w-4" /> Email
                    </p>
                    <p className="font-medium">{request.email}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-5 w-5" />
                  Track Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Music className="mr-1 h-4 w-4" /> Song Title
                    </p>
                    <p className="font-medium">{request.song_title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Target className="mr-1 h-4 w-4" /> Musical/Artist
                    </p>
                    <p className="font-medium">{request.musical_or_artist}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Headphones className="mr-1 h-4 w-4" /> Backing Type
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                        <Badge key={index} className="capitalize">
                          {type.replace('-', ' ')}
                        </Badge>
                      )) : <Badge className="capitalize">Not specified</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> Delivery Date
                    </p>
                    <p className="font-medium">
                      {request.delivery_date 
                        ? format(new Date(request.delivery_date), 'MMMM dd, yyyy') 
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Musical Information & References
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Key Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Song Key</p>
                    <p className="font-medium">{request.song_key || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Different Key Required</p>
                    <p className="font-medium">{request.different_key || 'No'}</p>
                  </div>
                  {request.different_key === 'Yes' && (
                    <div>
                      <p className="text-sm text-gray-500">Requested Key</p>
                      <p className="font-medium">{request.key_for_track || 'Not specified'}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <LinkIcon className="mr-2 h-5 w-5" />
                  References
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <LinkIcon className="mr-1 h-4 w-4" /> YouTube Link
                    </p>
                    {request.youtube_link ? (
                      <a 
                        href={request.youtube_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline text-sm truncate block"
                      >
                        {request.youtube_link}
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Music className="mr-1 h-4 w-4" /> Voice Memo
                    </p>
                    {request.voice_memo ? (
                      <a 
                        href={request.voice_memo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline text-sm truncate block"
                      >
                        {request.voice_memo}
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <FileText className="mr-1 h-4 w-4" /> Sheet Music
                    </p>
                    {request.sheet_music_url ? (
                      <a 
                        href={request.sheet_music_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View Sheet Music
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <LinkIcon className="mr-1 h-4 w-4" /> Additional Links
                    </p>
                    {request.additional_links ? (
                      <a 
                        href={request.additional_links} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline text-sm truncate block"
                      >
                        {request.additional_links}
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Pricing & Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center">
                  <DollarSign className="mr-1 h-4 w-4" /> Final Agreed Price
                </p>
                <p className="text-2xl font-bold text-[#1C0357]">
                  {request.final_price !== null ? `A$${request.final_price.toFixed(2)}` : 'A$0.00'}
                </p>
                {request.final_price === null && (
                  <p className="text-sm text-gray-600 mt-1">
                    (Price to be confirmed by Daniele. Estimated range below.)
                  </p>
                )}
              </div>

              {request.final_price === null && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <DollarSign className="mr-1 h-4 w-4" /> Estimated Cost Range
                  </p>
                  <p className="text-xl font-bold text-[#1C0357]">
                    A${displayedEstimatedLow.toFixed(2)} - A${displayedEstimatedHigh.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    (This is an estimate. The final price will be confirmed.)
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 flex items-center">
                  <CreditCard className="mr-1 h-4 w-4" /> Payment Status
                </p>
                {request.is_paid ? (
                  <Badge variant="default" className="bg-green-500 text-white">
                    <CheckCircle className="w-3 h-3 mr-1" /> Paid
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-500 text-white">
                    <XCircle className="w-3 h-3 mr-1" /> Unpaid
                  </Badge>
                )}
              </div>

              {!request.is_paid && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="font-semibold text-lg text-yellow-800 mb-3">How to Pay</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Once the final price is confirmed, you can make your payment using one of the following methods:
                  </p>
                  <ul className="space-y-3">
                    <li>
                      <a href="https://buymeacoffee.com/Danielebuatti" target="_blank" rel="noopener noreferrer">
                        <Button className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white w-full">
                          <Coffee className="mr-2 h-4 w-4" /> Pay via Buy Me a Coffee
                        </Button>
                      </a>
                    </li>
                    <li>
                      <Button variant="outline" className="w-full">
                        <Banknote className="mr-2 h-4 w-4" /> Direct Bank Transfer
                      </Button>
                      <p className="text-xs text-gray-600 mt-1 text-center">
                        BSB: 923100 | Account: 301110875
                      </p>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <FileAudio className="mr-2 h-5 w-5" />
              Your Tracks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {request.track_urls && request.track_urls.length > 0 ? (
              <ul className="space-y-4">
                {request.track_urls.map((track: TrackInfo, index: number) => (
                  <li key={track.url} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-md bg-gray-50">
                    <div className="flex items-center mb-2 sm:mb-0 sm:mr-4">
                      <Play className="h-5 w-5 mr-2 text-[#1C0357]" />
                      <span className="font-medium text-lg text-[#1C0357]">{track.caption || `Track ${index + 1}`}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <audio controls src={track.url} className="w-full sm:w-auto max-w-[250px] h-8" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => downloadTrack(track.url, track.caption || `${request.song_title}.mp3`)}
                            className="w-full sm:w-auto"
                          >
                            <Download className="h-4 w-4 mr-2" /> Download
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download {track.caption || `Track ${index + 1}`}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Your tracks will appear here once they are uploaded.
              </p>
            )}
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default ClientTrackView;
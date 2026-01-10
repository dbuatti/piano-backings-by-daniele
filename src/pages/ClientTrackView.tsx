import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
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
  DollarSign,
  UserPlus,
  Chrome,
  Loader2
} from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing';
import { getSafeBackingTypes, downloadTrack, TrackInfo } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"; // Added TooltipProvider
import Seo from "@/components/Seo";

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
  final_price?: number | null;
  estimated_cost_low?: number | null;
  estimated_cost_high?: number | null;
  user_id?: string | null;
  guest_access_token?: string | null;
}

const ClientTrackView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<BackingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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
      const guestAccessToken = urlParams.get('token');
      
      const { data: { session } = {} } = await supabase.auth.getSession();
      setUserSession(session);

      try {
        let requestData: BackingRequest | null = null;
        let fetchError: any = null;

        if (guestAccessToken) {
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
          toast({
            title: "Error",
            description: "Request not found or access denied.",
            variant: "destructive",
          });
          return;
        }

        const loggedInUserId = session?.user?.id;
        const loggedInUserEmail = session?.user?.email;
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        const isAdmin = loggedInUserEmail && adminEmails.includes(loggedInUserEmail);

        let hasAccess = false;

        if (isAdmin) {
          hasAccess = true;
        } else if (requestData.user_id) {
          if (loggedInUserId === requestData.user_id) {
            hasAccess = true;
          } else {
            console.warn('Logged-in user is not the owner of this request.');
          }
        } else {
          if (guestAccessToken && requestData.guest_access_token && guestAccessToken === requestData.guest_access_token) {
            hasAccess = true;
          } else {
            console.warn('Guest access denied: Token mismatch or no token provided for unlinked request.');
          }
        }

        if (hasAccess) {
          setRequest(requestData);
          if (!session && (guestAccessToken || requestData.guest_access_token)) {
            setShowLoginPrompt(true);
          } else {
            setShowLoginPrompt(false);
          }
        } else {
          setAccessDenied(true);
          toast({
            title: "Access Denied",
            description: "You do not have permission to view this track. Please ensure you are logged in with the correct account or using the correct access link.",
            variant: "destructive",
          });
        }

      } catch (error: any) {
        console.error('Error in ClientTrackView fetch logic:', error);
        setAccessDenied(true);
        toast({
          title: "Error",
          description: `Failed to fetch request: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequest();
  }, [id, navigate, toast]);

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
          redirectTo: `${window.location.origin}/user-dashboard`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast({
        title: "Sign In Error",
        description: `Failed to sign in with Google: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C0357] mx-auto mb-4"></div>
            <p>Loading your track details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileAudio className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Access Denied or Track Not Found</h3>
            <p className="mt-1 text-gray-500">
              You do not have permission to view this track, or the track does not exist.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/user-dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const costBreakdown = calculateRequestCost(request);
  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

  const calculatedTotalCost = costBreakdown.totalCost;
  const calculatedLow = (Math.ceil((calculatedTotalCost * 0.5) / 5) * 5).toFixed(2);
  const calculatedHigh = (Math.floor((calculatedTotalCost * 1.5) / 5) * 5).toFixed(2);

  const displayedEstimatedLow = request.estimated_cost_low !== null ? request.estimated_cost_low.toFixed(2) : calculatedLow;
  const displayedEstimatedHigh = request.estimated_cost_high !== null ? request.estimated_cost_high.toFixed(2) : calculatedHigh;

  const displayedSuggestedCost = request.final_price !== null ? request.final_price.toFixed(2) : calculatedTotalCost.toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo 
        title={`${request.song_title} - Track Details | Piano Backings by Daniele`}
        description={`View details and download your custom piano backing track for "${request.song_title}" by ${request.musical_or_artist}.`}
        keywords={`piano backing track, ${request.song_title}, ${request.musical_or_artist}, custom track download, audition track, performance track`}
        canonicalUrl={`${window.location.origin}/track/${id}`}
      />
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/user-dashboard')} 
            variant="outline"
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-[#1C0357]">Your Track Order</h1>
          <p className="text-lg text-[#1C0357]/90">Order details and download</p>
        </div>
        
        <Card className="shadow-lg mb-6 border-2 border-[#1C0357]/20">
          <CardHeader className="bg-gradient-to-r from-[#D1AAF2] to-[#F1E14F] py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-6 w-6" />
                  {request.song_title}
                </CardTitle>
                <p className="text-[#1C0357]/90 mt-1">
                  {request.musical_or_artist}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(request.status || 'pending')}
                <Badge variant="outline" className="text-sm">
                  Order #{request.id.substring(0, 8)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Your Information
                </h3>
                <div className="space-y-3">
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
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> Order Date
                    </p>
                    <p className="font-medium">{format(new Date(request.created_at), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Target className="mr-2 h-5 w-5" />
                  Track Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Headphones className="mr-1 h-4 w-4" /> Backing Type(s)
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                        <Badge key={index} className="capitalize">{type.replace('-', ' ')}</Badge>
                      )) : <Badge className="capitalize">Not specified</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Target className="mr-1 h-4 w-4" /> Track Purpose
                    </p>
                    <p className="font-medium capitalize mt-1">
                      {request.track_purpose?.replace('-', ' ') || 'Not specified'}
                    </p>
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
            
            <Card className="border-2 border-dashed border-[#1C0357]/30 bg-[#D1AAF2]/10 mb-8">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-[#1C0357] mb-2 flex items-center justify-center">
                    {request.status === 'completed' ? (
                      <>
                        <Play className="mr-2 h-5 w-5 text-green-600" />
                        Your Track(s) are Ready!
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-5 w-5 text-yellow-600" />
                        Track Preparation in Progress
                      </>
                    )}
                  </h3>
                  
                  {request.status === 'completed' ? (
                    <div className="mt-6 space-y-4">
                      {request.track_urls && request.track_urls.length > 0 ? (
                        request.track_urls.map((track: TrackInfo, index: number) => (
                          <div key={track.url} className="flex flex-col items-center">
                            <Button 
                              onClick={() => downloadTrack(track.url, track.caption || `${request.song_title}.mp3`)}
                              className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3 text-lg w-full md:w-auto"
                              size="lg"
                            >
                              <Download className="mr-2 h-5 w-5" />
                              Download Track {index + 1}
                            </Button>
                            <p className="text-sm text-gray-600 mt-2">
                              {track.caption}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <Clock className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                Your track is marked as completed but no download links are available yet. 
                                Please contact support for assistance.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-yellow-800 bg-yellow-100">
                        <Clock className="mr-2 h-4 w-4" />
                        {request.status === 'in-progress' 
                          ? 'We are currently working on your track' 
                          : 'Your request is being processed'}
                      </div>
                      <p className="mt-3 text-gray-600">
                        You'll receive an email notification when your track is ready for download.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-[#1C0357] to-[#D1AAF2] text-white mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <Banknote className="mr-2 h-5 w-5" />
                  Payment Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-2xl font-bold mb-2 text-white">
                      Estimated Cost: ${displayedEstimatedLow} - ${displayedEstimatedHigh}
                    </div>
                    {request.final_price !== null && (
                      <div className="text-3xl font-bold mb-2 text-white">
                        Suggested Cost: ${displayedSuggestedCost}
                      </div>
                    )}
                    <p className="text-sm opacity-90">
                      The final price may vary slightly based on complexity and additional services.
                    </p>
                  </div>
                  
                  <div>
                    <p className="mb-3 font-medium">Payment Methods:</p>
                    <div className="space-y-3">
                      <a 
                        href="https://buymeacoffee.com/Danielebuatti" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full bg-white text-[#1C0357] hover:bg-gray-100 flex items-center justify-center">
                          <Coffee className="mr-2 h-5 w-5" />
                          Buy Me a Coffee (Preferred)
                        </Button>
                      </a>
                      <div className="bg-white/10 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Direct Bank Transfer</p>
                        <p className="text-xs">BSB: 923100</p>
                        <p className="text-xs">Account: 301110875</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/20">
                  <h4 className="font-semibold text-lg mb-3 flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Cost Breakdown
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {costBreakdown.baseCosts.map((item, index) => (
                      <li key={`base-${index}`} className="flex justify-between items-center">
                        <span className="capitalize">{item.type.replace('-', ' ')}</span>
                        <span>${item.cost.toFixed(2)}</span>
                      </li>
                    ))}
                    {costBreakdown.serviceCosts.map((item, index) => (
                      <li key={`service-${index}`} className="flex justify-between items-center">
                        <span className="capitalize">{item.service.replace('-', ' ')}</span>
                        <span>+${item.cost.toFixed(2)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between items-center font-bold pt-2 border-t border-white/30 mt-2">
                      <span>Total Estimated Cost (Rounded)</span>
                      <span>${costBreakdown.totalCost.toFixed(2)}</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/20">
                  <p className="text-sm">
                    <span className="font-medium">Note:</span> I encourage using Buy Me a Coffee as it helps support my work 
                    and makes it easier for others to discover this service. Payment can be made before or after 
                    track delivery.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-[#1C0357] flex items-center">
                    <Key className="mr-2 h-5 w-5" />
                    Musical Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Song Key</p>
                      <p className="font-medium">{request.song_key || 'Not specified'}</p>
                    </div>
                    {request.different_key === 'Yes' && (
                      <div>
                        <p className="text-sm text-gray-500">Requested Key</p>
                        <p className="font-medium">{request.key_for_track || 'Not specified'}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-[#1C0357] flex items-center">
                    <LinkIcon className="mr-2 h-5 w-5" />
                    References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {request.youtube_link ? (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <LinkIcon className="mr-1 h-4 w-4" /> YouTube Reference
                        </p>
                        <a 
                          href={request.youtube_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline text-sm"
                        >
                          {request.youtube_link}
                        </a>
                      </div>
                    ) : null}
                    
                    {request.voice_memo ? (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <FileAudio className="mr-1 h-4 w-4" /> Voice Memo
                        </p>
                        <a 
                          href={request.voice_memo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline text-sm"
                        >
                          Listen to Voice Memo
                        </a>
                      </div>
                    ) : null}

                    {request.additional_links ? (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <LinkIcon className="mr-1 h-4 w-4" /> Additional Links
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a 
                                href={request.additional_links} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline text-sm block break-all truncate"
                              >
                                {request.additional_links}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p>{request.additional_links}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {showLoginPrompt && !userSession && (
          <Card className="shadow-lg mb-6 bg-[#1C0357] text-white border-[#1C0357] relative">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold mb-4 flex items-center justify-center">
                <UserPlus className="mr-3 h-6 w-6" />
                Secure Your Track!
              </h3>
              <p className="text-lg mb-6 max-w-2xl mx-auto opacity-90">
                You're viewing this track as a guest. Create an account to permanently save this request, 
                track its status, and access all your downloads in one place.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningInWithGoogle}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-base px-6 py-3 flex items-center justify-center"
                >
                  {isSigningInWithGoogle ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                    </>
                  ) : (
                    <>
                      <Chrome className="mr-2 h-4 w-4" /> Sign In with Google
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => navigate('/login')}
                  className="bg-white text-[#1C0357] hover:bg-gray-200 text-base px-6 py-3"
                >
                  Sign In with Email
                </Button>
                <Button 
                  variant="ghost" 
                  className="bg-transparent border border-white text-white hover:bg-white/10 text-base px-6 py-3"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  Continue as Guest
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-end gap-4">
          <Button 
            onClick={() => navigate('/user-dashboard')} 
            variant="outline"
          >
            Back to Dashboard
          </Button>
          <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            Edit Request
          </Button>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default ClientTrackView;
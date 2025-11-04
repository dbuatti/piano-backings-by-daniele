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
  DollarSign // Added DollarSign icon
} from 'lucide-react';
import { calculateRequestCost, getTrackTypeBaseDisplayRange } from '@/utils/pricing'; // Import getTrackTypeBaseDisplayRange
import { getSafeBackingTypes } from '@/utils/helpers'; // Import from new utility
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

interface TrackInfo {
  url: string;
  caption: string;
}

const ClientTrackView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

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
      const emailFromUrl = urlParams.get('email');
      
      try {
        // Always fetch the request by ID first
        const { data: requestData, error: fetchError } = await supabase
          .from('backing_requests')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError || !requestData) {
          console.error('Error fetching request by ID:', fetchError);
          setAccessDenied(true);
          toast({
            title: "Error",
            description: "Request not found or access denied.",
            variant: "destructive",
          });
          return;
        }

        // Now, determine access based on user_id, email, and admin status
        const { data: { session } = {} } = await supabase.auth.getSession(); // Destructure with default empty object
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
          // Allow access if email from URL matches request email
          if (emailFromUrl && requestData.email && emailFromUrl.toLowerCase() === requestData.email.toLowerCase()) {
            hasAccess = true;
          } else if (loggedInUserEmail && requestData.email && loggedInUserEmail.toLowerCase() === requestData.email.toLowerCase()) {
            // If no email in URL, but logged-in user's email matches request email
            hasAccess = true;
          } else {
            console.warn('Guest access denied: Email mismatch or no email provided in URL/session for unlinked request.');
          }
        }

        if (hasAccess) {
          setRequest(requestData);
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

  const downloadTrack = (url: string, filename: string = 'download') => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename); // Force download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
  const baseTotalCost = costBreakdown.totalCost;
  
  // Calculate the range for display, rounding down to the nearest multiple of 5
  const rawMinCost = baseTotalCost * 0.5;
  const rawMaxCost = baseTotalCost * 1.5;
  const minCost = (Math.ceil(rawMinCost / 5) * 5).toFixed(2); // Round UP to nearest 5
  const maxCost = (Math.floor(rawMaxCost / 5) * 5).toFixed(2); // Round DOWN to nearest 5

  const trackTypeDisplayRange = request.track_type ? getTrackTypeBaseDisplayRange(request.track_type) : null;

  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
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
            
            {/* Track Download Section */}
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
                    <div className="mt-6 space-y-4"> {/* Added space-y-4 for column stacking */}
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
            
            {/* Payment Section */}
            <Card className="bg-gradient-to-br from-[#1C0357] to-[#D1AAF2] text-white mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <Banknote className="mr-2 h-5 w-5" />
                  Payment Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="mb-2">Estimated Cost for Your Track:</p>
                    <div className="text-3xl font-bold mb-4">
                      ${minCost} - ${maxCost}
                    </div>
                    {trackTypeDisplayRange && (
                      <p className="text-sm opacity-90 mb-2">
                        Base cost for {request.track_type?.replace('-', ' ')}: {trackTypeDisplayRange}
                      </p>
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

                {/* Cost Breakdown Section */}
                <div className="mt-6 pt-4 border-t border-white/20">
                  <h4 className="font-semibold text-lg mb-3 flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Cost Breakdown
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {costBreakdown.baseCosts.map((item, index) => (
                      <li key={`base-${index}`} className="flex justify-between items-center">
                        <span className="capitalize">{item.type.replace('-', ' ')} Base Track</span>
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
                      <span>Total Estimated Cost</span>
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
            
            {/* Additional Information */}
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
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-600">
          <p>Thank you for choosing Piano Backings by Daniele. If you have any questions, please contact support.</p>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default ClientTrackView;
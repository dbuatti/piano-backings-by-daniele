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
  FileAudio
} from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing';

const ClientTrackView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        // First try to get request by ID
        let { data, error } = await supabase
          .from('backing_requests')
          .select('*')
          .eq('id', id)
          .single();
        
        // If not found by ID, try to get by email (for guest access)
        if (error || !data) {
          const urlParams = new URLSearchParams(window.location.search);
          const email = urlParams.get('email');
          
          if (email) {
            ({ data, error } = await supabase
              .from('backing_requests')
              .select('*')
              .eq('email', email)
              .eq('id', id)
              .single());
          }
        }
        
        if (error) throw error;
        
        setRequest(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to fetch request: ${error.message}`,
          variant: "destructive",
        });
        navigate('/user-dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchRequest();
    }
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

  const downloadTrack = () => {
    if (request?.track_url) {
      window.open(request.track_url, '_blank');
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

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileAudio className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Track not found</h3>
            <p className="mt-1 text-gray-500">
              We couldn't find the track you're looking for.
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

  const estimatedCost = calculateRequestCost(request);
  const minCost = estimatedCost - 2;
  const maxCost = estimatedCost + 5;

  // Normalize backing_type to always be an array of strings
  const normalizedBackingTypes = Array.isArray(request.backing_type)
    ? request.backing_type.filter((type: any) => typeof type === 'string')
    : (typeof request.backing_type === 'string' ? [request.backing_type] : []);

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
                        Your Track is Ready!
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-5 w-5 text-yellow-600" />
                        Track Preparation in Progress
                      </>
                    )}
                  </h3>
                  
                  {request.status === 'completed' ? (
                    <div className="mt-6">
                      {request.track_url ? (
                        <div className="space-y-4">
                          <Button 
                            onClick={downloadTrack}
                            className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3 text-lg"
                            size="lg"
                          >
                            <Download className="mr-2 h-5 w-5" />
                            Download Your Track
                          </Button>
                          <p className="text-sm text-gray-600 mt-2">
                            Click the button above to download your custom backing track
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <Clock className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                Your track is marked as completed but the download link is not available yet. 
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
                        <a 
                          href={request.additional_links} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline text-sm"
                        >
                          {request.additional_links}
                        </a>
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
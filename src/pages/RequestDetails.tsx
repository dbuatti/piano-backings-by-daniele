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
  Folder
} from 'lucide-react';

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      // Check if user is admin (daniele.buatti@gmail.com)
      // First try to get email from user object directly
      if (session.user.email === 'daniele.buatti@gmail.com') {
        setIsAdmin(true);
        fetchRequest();
        return;
      }
      
      // Fallback to checking profiles table
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          // Even if we can't fetch profile, check user email directly
          if (session.user.email === 'daniele.buatti@gmail.com') {
            setIsAdmin(true);
            fetchRequest();
          } else {
            toast({
              title: "Access Denied",
              description: "You don't have permission to access this page.",
              variant: "destructive",
            });
            navigate('/');
          }
          return;
        }
        
        if (profile?.email === 'daniele.buatti@gmail.com') {
          setIsAdmin(true);
          fetchRequest();
        } else {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate('/');
        }
      } catch (error: any) {
        console.error('Error checking admin status:', error);
        // Fallback to checking user email directly
        if (session.user.email === 'daniele.buatti@gmail.com') {
          setIsAdmin(true);
          fetchRequest();
        } else {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate('/');
        }
      }
    };
    
    checkAdminAccess();
  }, [navigate, toast]);

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setRequest(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch request: ${error.message}`,
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Request not found</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/admin')} 
            variant="outline"
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-[#1C0357]">Request Details</h1>
          <p className="text-lg text-[#1C0357]/90">Viewing request #{request.id.substring(0, 8)}</p>
        </div>
        
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
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Folder className="mr-1 h-4 w-4" /> Request ID
                    </p>
                    <p className="font-medium">{request.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> Submitted
                    </p>
                    <p className="font-medium">{format(new Date(request.created_at), 'MMMM dd, yyyy HH:mm')}</p>
                  </div>
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
                      <Folder className="mr-1 h-4 w-4" /> Category
                    </p>
                    <p className="font-medium">{request.category || 'Not specified'}</p>
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
                    <Badge className="capitalize">
                      {request.backing_type?.replace('-', ' ') || 'Not specified'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Target className="mr-1 h-4 w-4" /> Track Purpose
                    </p>
                    <p className="font-medium capitalize">
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
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Musical Information
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
                        className="font-medium text-blue-600 hover:underline"
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
                        className="font-medium text-blue-600 hover:underline"
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Folder className="mr-2 h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Headphones className="mr-2 h-5 w-5" />
                  Additional Services
                </h3>
                {request.additional_services && request.additional_services.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {request.additional_services.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary" className="capitalize">
                        {service.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No additional services requested</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Special Requests
                </h3>
                <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {request.special_requests || 'No special requests provided'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button 
            onClick={() => navigate('/admin')} 
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

export default RequestDetails;
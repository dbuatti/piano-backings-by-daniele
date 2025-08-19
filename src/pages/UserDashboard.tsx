import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Download, Play, Share2, Music, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const UserDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Check if user has requests via email (for non-logged-in users)
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        
        if (email) {
          fetchUserRequestsByEmail(email);
          setShowAccountPrompt(true);
        } else {
          navigate('/login');
        }
        return;
      }
      
      setUser(session.user);
      fetchUserRequests(session.user.id);
    };
    
    checkUser();
  }, [navigate]);

  const fetchUserRequests = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch requests: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRequestsByEmail = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch requests: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
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

  const createAccount = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Your Tracks Dashboard</h1>
          <p className="text-lg text-[#1C0357]/90">Access your backing tracks and request history</p>
        </div>
        
        {showAccountPrompt && (
          <Alert className="mb-6 bg-[#1C0357] text-white border-[#1C0357]">
            <UserPlus className="h-4 w-4" />
            <AlertTitle>Create an Account</AlertTitle>
            <AlertDescription>
              <p className="mb-3">
                You're viewing your tracks as a guest. Create an account to save your requests, 
                access all your tracks in one place, and get notified about updates!
              </p>
              <Button 
                onClick={createAccount}
                className="bg-white text-[#1C0357] hover:bg-gray-100"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Music className="mr-2" />
              Your Backing Track Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p>Loading your requests...</p>
              </div>
            ) : (
              <div className=" rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Song</TableHead>
                      <TableHead>Backing Type</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-center">
                            <Music className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests yet</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Get started by ordering your first backing track.
                            </p>
                            <div className="mt-6">
                              <Link to="/form-page">
                                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                                  Order Your First Track
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {format(new Date(request.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{request.song_title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {request.backing_type?.replace('-', ' ') || 'Not specified'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.delivery_date 
                              ? format(new Date(request.delivery_date), 'MMM dd, yyyy') 
                              : 'Not specified'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(request.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {request.status === 'completed' && request.track_url && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => downloadTrack(request.track_url)}
                                >
                                  <Download className="w-4 h-4 mr-1" /> Download
                                </Button>
                              )}
                              {request.shared_link && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => navigator.clipboard.writeText(request.shared_link)}
                                >
                                  <Share2 className="w-4 h-4 mr-1" /> Copy Link
                                </Button>
                              )}
                              <Link to={`/admin/request/${request.id}`}>
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">
                How to Access Your Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Download className="h-5 w-5 text-[#1C0357] mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-semibold">Download Tracks</h3>
                    <p className="text-sm text-gray-600">Click the Download button next to completed requests to get your backing track.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Share2 className="h-5 w-5 text-[#1C0357] mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-semibold">Shared Links</h3>
                    <p className="text-sm text-gray-600">Use the Copy Link button to share your tracks with others.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <UserPlus className="h-5 w-5 text-[#1C0357] mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-semibold">Create Account</h3>
                    <p className="text-sm text-gray-600">Save all your requests and access them anytime from your dashboard.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Having trouble accessing your tracks? Contact support for assistance.
                </p>
                <Button 
                  className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90"
                  onClick={() => window.location.href = 'mailto:pianobackingsbydaniele@gmail.com'}
                >
                  Contact Support
                </Button>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Quick Links</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/form-page" className="text-[#1C0357] hover:underline flex items-center">
                        <Music className="mr-2 h-4 w-4" /> Order New Track
                      </Link>
                    </li>
                    <li>
                      <Link to="/#pricing" className="text-[#1C0357] hover:underline flex items-center">
                        <span className="mr-2">💰</span> View Pricing
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default UserDashboard;
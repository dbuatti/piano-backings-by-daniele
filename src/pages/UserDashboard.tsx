import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Download, Play, Share2 } from 'lucide-react';

const UserDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
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
    // Implement download logic
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Your Tracks Dashboard</h1>
          <p className="text-lg text-[#1C0357]/90">Access your backing tracks and request history</p>
        </div>
        
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">
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
                          You haven't submitted any requests yet
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
                            <div className="flex space-x-2">
                              {request.status === 'completed' && request.track_url && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => downloadTrack(request.track_url)}
                                >
                                  <Download className="w-4 h-4 mr-1" /> Download
                                </Button>
                              )}
                              <Button size="sm" variant="outline">
                                <Share2 className="w-4 h-4 mr-1" /> Share
                              </Button>
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
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">
              How to Access Your Tracks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                All your completed backing tracks will appear in the table above with a download button.
                You can also access shared links that have been sent to your email.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Download Tracks</h3>
                  <p>Click the Download button next to completed requests to get your backing track.</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Shared Links</h3>
                  <p>Check your email for shared links to access your tracks directly.</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                  <p>Contact support if you're having trouble accessing your tracks.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default UserDashboard;
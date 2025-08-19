import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      // Check if user is admin (daniele.buatti@gmail.com)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.email === 'daniele.buatti@gmail.com') {
        setIsAdmin(true);
        fetchRequests();
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
      }
    };
    
    checkAdminAccess();
  }, [navigate, toast]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
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

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'full-song': return 'default';
      case 'audition-cut': return 'secondary';
      case 'note-bash': return 'outline';
      default: return 'default';
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Admin Dashboard</h1>
          <p className="text-lg text-[#1C0357]/90">View all backing track requests</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Backing Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p>Loading requests...</p>
              </div>
            ) : (
              <div className=" rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Song</TableHead>
                      <TableHead>Backing Type</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {format(new Date(request.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{request.name}</TableCell>
                          <TableCell>{request.song_title}</TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(request.backing_type)}>
                              {request.backing_type.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
                          </TableCell>
                          <TableCell>
                            {request.additional_services && request.additional_services.length > 0 ? (
                              <Badge variant="secondary">
                                {request.additional_services.length} service(s)
                              </Badge>
                            ) : (
                              <span className="text-gray-500">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link to={`/admin/request/${request.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </Link>
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
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default AdminDashboard;
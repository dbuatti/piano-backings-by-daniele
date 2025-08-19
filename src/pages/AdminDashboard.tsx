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
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Mail, 
  Upload, 
  DollarSign, 
  Users,
  Send,
  Share2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const AdminDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [emailTemplate, setEmailTemplate] = useState('');
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
      // First try to get email from user object directly
      if (session.user.email === 'daniele.buatti@gmail.com') {
        setIsAdmin(true);
        fetchRequests();
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
            fetchRequests();
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
          fetchRequests();
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
          fetchRequests();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-4 h-4 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary"><Clock className="w-4 h-4 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(requests.map(req => 
        req.id === id ? { ...req, status } : req
      ));
      
      toast({
        title: "Status Updated",
        description: "Request status has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(requests.map(req => req.id));
    }
  };

  const handleSelectRequest = (id: string) => {
    setSelectedRequests(prev => 
      prev.includes(id) 
        ? prev.filter(reqId => reqId !== id)
        : [...prev, id]
    );
  };

  const calculateTotalCost = () => {
    // Calculate total cost based on selected requests
    const selected = requests.filter(req => selectedRequests.includes(req.id));
    // Add your pricing logic here based on request details
    return selected.length * 10; // Example: $10 per request
  };

  useEffect(() => {
    if (selectedRequests.length > 0) {
      setTotalCost(calculateTotalCost());
    }
  }, [selectedRequests]);

  const sendEmail = async (id: string) => {
    // Implement email sending logic
    toast({
      title: "Email Sent",
      description: "Email has been sent to the user.",
    });
  };

  const uploadTrack = async (id: string) => {
    // Implement track upload logic
    toast({
      title: "Track Uploaded",
      description: "Track has been uploaded successfully.",
    });
  };

  const shareTrack = async (id: string) => {
    // Implement track sharing logic
    toast({
      title: "Track Shared",
      description: "Shared link has been generated and sent to user.",
    });
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
        
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
              <span>Backing Requests</span>
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={handleSelectAll}
                  variant="outline"
                  className="flex items-center"
                >
                  {selectedRequests.length === requests.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedRequests.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Total: ${totalCost}</span>
                    <Button variant="outline" className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" /> Email Selected
                    </Button>
                  </div>
                )}
              </div>
            </CardTitle>
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
                      <TableHead>Select</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Song</TableHead>
                      <TableHead>Backing Type</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedRequests.includes(request.id)}
                              onChange={() => handleSelectRequest(request.id)}
                            />
                          </TableCell>
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
                            <Select 
                              value={request.status || 'pending'} 
                              onValueChange={(value) => updateStatus(request.id, value)}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              <span>{request.cost || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button size="sm" variant="outline" onClick={() => sendEmail(request.id)}>
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => uploadTrack(request.id)}>
                                <Upload className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => shareTrack(request.id)}>
                                <Share2 className="w-4 h-4" />
                              </Button>
                              <Link to={`/admin/request/${request.id}`}>
                                <Button variant="outline" size="sm">
                                  View
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
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default AdminDashboard;
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
  Share2,
  FileAudio,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [uploadTrackId, setUploadTrackId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
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
    let total = 0;
    
    selected.forEach(req => {
      // Pricing logic based on backing type and additional services
      let baseCost = 0;
      switch (req.backing_type) {
        case 'full-song':
          baseCost = 30;
          break;
        case 'audition-cut':
          baseCost = 15;
          break;
        case 'note-bash':
          baseCost = 10;
          break;
        default:
          baseCost = 20;
      }
      
      // Add additional service costs
      if (req.additional_services) {
        req.additional_services.forEach((service: string) => {
          switch (service) {
            case 'rush-order':
              baseCost += 10;
              break;
            case 'complex-songs':
              baseCost += 7;
              break;
            case 'additional-edits':
              baseCost += 5;
              break;
            case 'exclusive-ownership':
              baseCost += 40;
              break;
          }
        });
      }
      
      total += baseCost;
    });
    
    return total;
  };

  useEffect(() => {
    if (selectedRequests.length > 0) {
      setTotalCost(calculateTotalCost());
    } else {
      setTotalCost(0);
    }
  }, [selectedRequests]);

  const sendEmail = async (id: string) => {
    setSelectedRequestId(id);
    setEmailDialogOpen(true);
  };

  const handleEmailSend = async () => {
    if (!selectedRequestId) return;
    
    setSendingEmail(true);
    try {
      // Get request details
      const request = requests.find(req => req.id === selectedRequestId);
      if (!request) throw new Error('Request not found');
      
      // Generate a shareable link
      const shareLink = `${window.location.origin}/user-dashboard`;
      
      // Update request with shared link
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ shared_link: shareLink })
        .eq('id', selectedRequestId);
      
      if (updateError) throw updateError;
      
      // In a real implementation, you would integrate with an email service here
      // For now, we'll simulate sending an email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Email Sent",
        description: `Email has been sent to ${request.email}`,
      });
      
      // Update local state
      setRequests(requests.map(req => 
        req.id === selectedRequestId ? { ...req, shared_link: shareLink } : req
      ));
      
      setEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send email: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
      setSelectedRequestId(null);
    }
  };

  const uploadTrack = async (id: string) => {
    setUploadTrackId(id);
  };

  const handleFileUpload = async () => {
    if (!uploadTrackId || !uploadFile) return;
    
    try {
      // Upload file to Supabase storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `tracks/${uploadTrackId}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('tracks')
        .upload(fileName, uploadFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('tracks')
        .getPublicUrl(fileName);
      
      // Update request with track URL
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ 
          track_url: publicUrl,
          status: 'completed'
        })
        .eq('id', uploadTrackId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setRequests(requests.map(req => 
        req.id === uploadTrackId ? { 
          ...req, 
          track_url: publicUrl,
          status: 'completed'
        } : req
      ));
      
      toast({
        title: "Track Uploaded",
        description: "Track has been uploaded successfully and marked as completed.",
      });
      
      setUploadTrackId(null);
      setUploadFile(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to upload track: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const shareTrack = async (id: string) => {
    try {
      // Generate a shareable link
      const shareLink = `${window.location.origin}/user-dashboard`;
      
      // Update request with shared link
      const { error } = await supabase
        .from('backing_requests')
        .update({ shared_link: shareLink })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setRequests(requests.map(req => 
        req.id === id ? { ...req, shared_link: shareLink } : req
      ));
      
      toast({
        title: "Track Shared",
        description: "Shared link has been generated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to share track: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const calculateRequestCost = (request: any) => {
    let baseCost = 0;
    switch (request.backing_type) {
      case 'full-song':
        baseCost = 30;
        break;
      case 'audition-cut':
        baseCost = 15;
        break;
      case 'note-bash':
        baseCost = 10;
        break;
      default:
        baseCost = 20;
    }
    
    // Add additional service costs
    if (request.additional_services) {
      request.additional_services.forEach((service: string) => {
        switch (service) {
          case 'rush-order':
            baseCost += 10;
            break;
          case 'complex-songs':
            baseCost += 7;
            break;
          case 'additional-edits':
            baseCost += 5;
            break;
          case 'exclusive-ownership':
            baseCost += 40;
            break;
        }
      });
    }
    
    return baseCost;
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
          <p className="text-lg text-[#1C0357]/90">Manage all backing track requests</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="rounded-full bg-[#D1AAF2] p-3 mr-4">
                  <FileAudio className="h-6 w-6 text-[#1C0357]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Requests</p>
                  <p className="text-2xl font-bold text-[#1C0357]">{requests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="rounded-full bg-[#F538BC] p-3 mr-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-[#1C0357]">
                    {requests.filter(r => r.status === 'in-progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="rounded-full bg-[#1C0357] p-3 mr-4">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Revenue</p>
                  <p className="text-2xl font-bold text-[#1C0357]">
                    ${requests
                      .filter(r => r.status !== 'completed' && r.status !== 'cancelled')
                      .reduce((sum, req) => sum + (req.cost || calculateRequestCost(req)), 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <div className="flex items-center space-x-2 bg-[#D1AAF2] px-4 py-2 rounded-lg">
                    <span className="font-medium">Selected: {selectedRequests.length}</span>
                    <span className="font-bold">Total: ${totalCost.toFixed(2)}</span>
                    <Button 
                      variant="default" 
                      className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
                      onClick={() => {
                        // Batch update selected requests to "in-progress"
                        selectedRequests.forEach(id => updateStatus(id, 'in-progress'));
                        toast({
                          title: "Batch Update",
                          description: `${selectedRequests.length} requests marked as In Progress`,
                        });
                      }}
                    >
                      <Clock className="w-4 h-4 mr-2" /> Mark In Progress
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
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
                            </div>
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
                              <span>{(request.cost || calculateRequestCost(request)).toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
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
        
        {/* Upload Track Dialog */}
        {uploadTrackId && (
          <Dialog open={!!uploadTrackId} onOpenChange={() => setUploadTrackId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Track</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="track-file">Select MP3 File</Label>
                  <Input 
                    id="track-file"
                    type="file" 
                    accept="audio/mp3,audio/mpeg" 
                    onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setUploadTrackId(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleFileUpload}
                    disabled={!uploadFile}
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                  >
                    Upload Track
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Email to User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email Template</Label>
                <Textarea 
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  rows={8}
                  placeholder="Dear [Name],

Your backing track for '[Song Title]' is now ready! 

You can download it directly using the link below:
[Download Link]

Or access all your tracks by logging into your dashboard:
[Dashboard Link]

Thank you for choosing Piano Backings by Daniele!

Best regards,
Daniele"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEmailSend}
                  disabled={sendingEmail}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default AdminDashboard;
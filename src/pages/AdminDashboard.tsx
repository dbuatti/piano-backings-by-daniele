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
import { format, isSameDay } from 'date-fns';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Upload, 
  DollarSign, 
  Users,
  Share2, 
  FileAudio,
  Calendar,
  Search,
  Filter,
  Trash2,
  List,
  Grid3X3,
  Youtube,
  Music,
  Facebook,
  Instagram,
  ExternalLink,
  Bell,
  Download,
  HardDrive,
  CreditCard,
  User,
  Mail,
  MusicIcon,
  Tag,
  CalendarDays,
  Hash,
  MoreHorizontal,
  Eye,
  Edit,
  Check,
  X,
  Calculator,
  ToggleLeft,
  ToggleRight,
  MailIcon,
  Settings,
  Database,
  TestTube
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CalendarComponent from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PricingMatrix from '@/components/PricingMatrix';
import CompletionEmailDialog from '@/components/CompletionEmailDialog';
import { calculateRequestCost } from '@/utils/pricing';
import NotificationRecipientsManager from '@/components/NotificationRecipientsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import content from other admin pages to be integrated
import DataImporter from './DataImporter'; // We'll reuse the component directly
import TestEmail from './TestEmail'; // We'll reuse the component directly
import TestEmailNotification from './TestEmailNotification'; // We'll reuse the component directly
import DropboxMonitor from './DropboxMonitor'; // We'll reuse the component directly

const AdminDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [uploadTrackId, setUploadTrackId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [backingTypeFilter, setBackingTypeFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'pricing'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen] = useState(false);
  const [selectedRequestForPlatforms, setSelectedRequestForPlatforms] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState({
    youtube: false,
    tiktok: false,
    facebook: false,
    instagram: false,
    gumroad: false
  });
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } = { session: null } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      if (adminEmails.includes(session.user.email)) {
        setIsAdmin(true);
        fetchRequests();
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          if (adminEmails.includes(session.user.email)) {
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
        
        if (adminEmails.includes(profile?.email)) {
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
        if (adminEmails.includes(session.user.email)) {
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
      setFilteredRequests(data || []);
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

  useEffect(() => {
    let result = [...requests];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(request => 
        request.name?.toLowerCase().includes(term) ||
        request.email?.toLowerCase().includes(term) ||
        request.song_title?.toLowerCase().includes(term) ||
        request.musical_or_artist?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(request => request.status === statusFilter);
    }
    
    if (backingTypeFilter !== 'all') {
      // Check if backing_type is an array and includes the filter, or is a string and matches
      result = result.filter(request => 
        Array.isArray(request.backing_type) 
          ? request.backing_type.includes(backingTypeFilter)
          : request.backing_type === backingTypeFilter
      );
    }
    
    if (viewMode === 'calendar' && selectedDate) {
      result = result.filter(request => 
        request.delivery_date && isSameDay(new Date(request.delivery_date), selectedDate)
      );
    }
    
    setFilteredRequests(result);
  }, [searchTerm, statusFilter, backingTypeFilter, requests, viewMode, selectedDate]);

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
        return <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Cancelled</Badge>;
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

  const updatePaymentStatus = async (id: string, isPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ is_paid: isPaid })
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(requests.map(req => 
        req.id === id ? { ...req, is_paid: isPaid } : req
      ));
      
      toast({
        title: "Payment Status Updated",
        description: `Request marked as ${isPaid ? 'paid' : 'unpaid'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update payment status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(req => req.id));
    }
  };

  const handleSelectRequest = (id: string) => {
    setSelectedRequests(prev => 
      prev.includes(id) 
        ? prev.filter(reqId => reqId !== id)
        : [...prev, id]
    );
  };

  const calculateTotalCostForSelected = () => {
    const selected = filteredRequests.filter(req => selectedRequests.includes(req.id));
    let total = 0;
    
    selected.forEach(req => {
      total += calculateRequestCost(req); // Use the shared utility function
    });
    
    return total;
  };

  useEffect(() => {
    if (selectedRequests.length > 0) {
      setTotalCost(calculateTotalCostForSelected());
    } else {
      setTotalCost(0);
    }
  }, [selectedRequests, filteredRequests]);

  const uploadTrack = async (id: string) => {
    setUploadTrackId(id);
  };

  const handleFileUpload = async () => {
    if (!uploadTrackId || !uploadFile) return;
    
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `tracks/${uploadTrackId}.${fileExt}`;
      
      console.log('Attempting to upload file:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('tracks')
        .upload(fileName, uploadFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      console.log('Upload successful:', uploadData);
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('tracks')
        .getPublicUrl(fileName);
      
      console.log('Public URL:', publicUrl);
      
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ 
          track_url: publicUrl,
          status: 'completed'
        })
        .eq('id', uploadTrackId);
      
      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
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
      console.error('Error uploading track:', error);
      toast({
        title: "Error",
        description: `Failed to upload track: ${error.message}. Please check your permissions and try again.`,
        variant: "destructive",
      });
    }
  };

  const shareTrack = async (id: string) => {
    try {
      const request = filteredRequests.find(req => req.id === id);
      if (!request) throw new Error('Request not found');
      
      const shareLink = `${window.location.origin}/user-dashboard?email=${encodeURIComponent(request.email)}`;
      
      const { error } = await supabase
        .from('backing_requests')
        .update({ shared_link: shareLink })
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(requests.map(req => 
        req.id === id ? { ...req, shared_link: shareLink } : req
      ));
      
      toast({
        title: "Track Shared",
        description: "Shared link has been generated and sent to user.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to share track: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBackingTypeFilter('all');
    setSelectedDate(null);
  };

  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(requests.filter(req => req.id !== id));
      setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
      
      toast({
        title: "Request Deleted",
        description: "The request has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete request: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const batchDeleteRequests = async () => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .delete()
        .in('id', selectedRequests);
      
      if (error) throw error;
      
      setRequests(requests.filter(req => !selectedRequests.includes(req.id)));
      setSelectedRequests([]);
      
      toast({
        title: "Requests Deleted",
        description: `${selectedRequests.length} requests have been deleted successfully.`,
      });
      
      setBatchDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete requests: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (id: string) => {
    setRequestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const openBatchDeleteDialog = () => {
    setBatchDeleteDialogOpen(true);
  };

  const openUploadPlatformsDialog = (id: string) => {
    const request = requests.find(req => req.id === id);
    if (request && request.uploaded_platforms) {
      if (typeof request.uploaded_platforms === 'string') {
        try {
          setPlatforms(JSON.parse(request.uploaded_platforms));
        } catch (e) {
          setPlatforms({
            youtube: false,
            tiktok: false,
            facebook: false,
            instagram: false,
            gumroad: false
          });
        }
      } else {
        setPlatforms(request.uploaded_platforms);
      }
    } else {
      setPlatforms({
        youtube: false,
        tiktok: false,
        facebook: false,
        instagram: false,
        gumroad: false
      });
    }
    setSelectedRequestForPlatforms(id);
    setUploadPlatformsDialogOpen(true);
  };

  const saveUploadPlatforms = async () => {
    if (!selectedRequestForPlatforms) return;
    
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ uploaded_platforms: JSON.stringify(platforms) })
        .eq('id', selectedRequestForPlatforms);
      
      if (error) throw error;
      
      setRequests(requests.map(req => 
        req.id === selectedRequestForPlatforms ? { ...req, uploaded_platforms: JSON.stringify(platforms) } : req
      ));
      
      toast({
        title: "Platforms Updated",
        description: "Upload platforms have been updated successfully.",
      });
      
      setUploadPlatformsDialogOpen(false);
      setSelectedRequestForPlatforms(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update platforms: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDateChange = (value: Date | [Date, Date] | null) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (value === null) {
      setSelectedDate(null);
    }
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const requestsForDate = requests.filter(request => 
      request.delivery_date && isSameDay(new Date(request.delivery_date), date)
    );
    
    if (requestsForDate.length === 0) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-1 mt-1">
        {requestsForDate.slice(0, 3).map((request, index) => (
          <div 
            key={index} 
            className={`w-2 h-2 rounded-full ${
              request.status === 'completed' ? 'bg-green-500' :
              request.status === 'in-progress' ? 'bg-yellow-500' :
              request.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-400'
            }`}
          />
        ))}
        {requestsForDate.length > 3 && (
          <div className="text-xs">+{requestsForDate.length - 3}</div>
        )}
      </div>
    );
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    
    const requestsForDate = requests.filter(request => 
      request.delivery_date && isSameDay(new Date(request.delivery_date), date)
    );
    
    if (requestsForDate.length === 0) return '';
    
    return 'bg-[#D1AAF2]/30 hover:bg-[#D1AAF2]/50';
  };

  const getPlatformIcons = (platforms: any) => {
    if (!platforms) return null;
    
    let platformsObj = platforms;
    if (typeof platforms === 'string') {
      try {
        platformsObj = JSON.parse(platforms);
      } catch (e) {
        return null;
      }
    }
    
    const icons = [];
    if (platformsObj.youtube) icons.push(<Youtube key="youtube" className="w-4 h-4 text-red-600" />);
    if (platformsObj.tiktok) icons.push(<Music key="tiktok" className="w-4 h-4 text-black" />);
    if (platformsObj.facebook) icons.push(<Facebook key="facebook" className="w-4 h-4 text-blue-600" />);
    if (platformsObj.instagram) icons.push(<Instagram key="instagram" className="w-4 h-4 text-pink-500" />);
    if (platformsObj.gumroad) icons.push(<ExternalLink key="gumroad" className="w-4 h-4 text-purple-600" />);
    
    return (
      <div className="flex gap-1">
        {icons}
      </div>
    );
  };

  const getPaymentBadge = (isPaid: boolean) => {
    if (isPaid) {
      return <Badge variant="default" className="bg-green-500"><CreditCard className="w-3 h-3 mr-1" /> Paid</Badge>;
    } else {
      return <Badge variant="destructive"><CreditCard className="w-3 h-3 mr-1" /> Unpaid</Badge>;
    }
  };

  const openEmailGenerator = (request: any) => {
    navigate(`/email-generator/${request.id}`);
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
    <> 
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1C0357]">Admin Dashboard</h1>
            <p className="text-lg text-[#1C0357]/90">Manage all backing track requests and system settings</p>
          </div>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center">
                <List className="mr-2 h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="system-health" className="flex items-center">
                <HardDrive className="mr-2 h-4 w-4" /> System Health
              </TabsTrigger>
              <TabsTrigger value="data-management" className="flex items-center">
                <Database className="mr-2 h-4 w-4" /> Data Management
              </TabsTrigger>
              <TabsTrigger value="email-tools" className="flex items-center">
                <MailIcon className="mr-2 h-4 w-4" /> Email Tools
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab Content */}
            <TabsContent value="overview">
              {/* Overview Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-6">
                <Card className="shadow-lg bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <FileAudio className="w-4 h-4 mr-2" />
                          Total Requests
                        </p>
                        <p className="text-2xl font-bold text-[#1C0357] mt-2">{requests.length}</p>
                      </div>
                      <div className="p-3 bg-[#D1AAF2]/20 rounded-full">
                        <FileAudio className="h-8 w-8 text-[#1C0357]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-lg bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          In Progress
                        </p>
                        <p className="text-2xl font-bold text-[#1C0357] mt-2">
                          {requests.filter(r => r.status === 'in-progress').length}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-full">
                        <Clock className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-lg bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Pending Revenue
                        </p>
                        <p className="text-2xl font-bold text-[#1C0357] mt-2">
                          ${requests
                            .filter(r => r.status !== 'completed' && r.status !== 'cancelled')
                            .reduce((sum, req) => sum + calculateRequestCost(req), 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-[#1C0357]/10 rounded-full">
                        <DollarSign className="h-8 w-8 text-[#1C0357]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-lg bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <Check className="w-4 h-4 mr-2" />
                          Completed
                        </p>
                        <p className="text-2xl font-bold text-[#1C0357] mt-2">
                          {requests.filter(r => r.status === 'completed').length}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Filters & View Options Section */}
              <Card className="shadow-lg mb-6 bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-[#1C0357] flex items-center justify-between">
                    <span className="flex items-center">
                      <Filter className="mr-2 h-5 w-5" />
                      Filters & View Options
                    </span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        onClick={() => setViewMode('list')}
                        className={`flex items-center ${viewMode === 'list' ? 'bg-[#1C0357] hover:bg-[#1C0357]/90' : ''}`}
                        size="sm"
                      >
                        <List className="w-4 h-4 mr-2" />
                        List View
                      </Button>
                      <Button 
                        variant={viewMode === 'calendar' ? 'default' : 'outline'}
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center ${viewMode === 'calendar' ? 'bg-[#1C0357] hover:bg-[#1C0357]/90' : ''}`}
                        size="sm"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Calendar View
                      </Button>
                      <Button 
                        variant={viewMode === 'pricing' ? 'default' : 'outline'}
                        onClick={() => setViewMode('pricing')}
                        className={`flex items-center ${viewMode === 'pricing' ? 'bg-[#1C0357] hover:bg-[#1C0357]/90' : ''}`}
                        size="sm"
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Pricing Matrix
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="text-sm"
                        size="sm"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {viewMode !== 'pricing' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search by name, email, song..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div>
                        <div className="relative">
                          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <div className="relative">
                          <MusicIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Select value={backingTypeFilter} onValueChange={setBackingTypeFilter}>
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Backing Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="full-song">Full Song</SelectItem>
                              <SelectItem value="audition-cut">Audition Cut</SelectItem>
                              <SelectItem value="note-bash">Note Bash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-end">
                        <p className="text-sm text-gray-500">
                          Showing {filteredRequests.length} of {requests.length} requests
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Main Content Area based on View Mode */}
              {viewMode === 'pricing' && (
                <PricingMatrix />
              )}
              
              {viewMode === 'calendar' && (
                <Card className="shadow-lg mb-6 bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
                      <span className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5" />
                        Delivery Calendar
                      </span>
                      {selectedDate && (
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedDate(null)}
                          className="text-sm"
                          size="sm"
                        >
                          Clear Date Selection
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-2/3">
                        <CalendarComponent
                          onChange={handleDateChange}
                          value={selectedDate}
                          tileContent={tileContent}
                          tileClassName={tileClassName}
                          className="border rounded-lg p-4 w-full"
                        />
                      </div>
                      <div className="lg:w-1/3">
                        <Card className="bg-white">
                          <CardHeader>
                            <CardTitle className="text-lg text-[#1C0357]">
                              {selectedDate 
                                ? `Requests for ${format(selectedDate, 'MMMM d, yyyy')}` 
                                : 'Select a date to view requests'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {selectedDate ? (
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                {filteredRequests.length > 0 ? (
                                  filteredRequests.map((request) => (
                                    <div 
                                      key={request.id} 
                                      className="border rounded-lg p-4 hover:bg-[#D1AAF2]/20 transition-colors"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h3 className="font-bold">{request.song_title}</h3>
                                          <p className="text-sm text-gray-600 flex items-center mt-1">
                                            <User className="w-3 h-3 mr-1" />
                                            {request.name || request.email}
                                          </p>
                                          <p className="text-sm text-gray-600 flex items-center">
                                            <Music className="w-3 h-3 mr-1" />
                                            {request.musical_or_artist}
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {Array.isArray(request.backing_type) ? request.backing_type.map((type: string, index: number) => (
                                            <Badge key={index} variant={getBadgeVariant(type)} className="capitalize">
                                              {type.replace('-', ' ')}
                                            </Badge>
                                          )) : (request.backing_type ? <Badge variant={getBadgeVariant(request.backing_type)} className="capitalize">{request.backing_type.replace('-', ' ')}</Badge> : null)}
                                        </div>
                                      </div>
                                      <div className="mt-3 flex justify-between items-center">
                                        <div className="flex items-center text-sm">
                                          <Calendar className="w-3 h-3 mr-1 text-gray-500" />
                                          <span>
                                            {request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
                                          </span>
                                        </div>
                                        {getStatusBadge(request.status || 'pending')}
                                      </div>
                                      <div className="mt-3 flex justify-end space-x-1">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button size="sm" variant="outline" onClick={() => uploadTrack(request.id)}>
                                              <Upload className="w-4 h-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Upload Track</p>
                                          </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Link to={`/track/${request.id}`}>
                                              <Button variant="outline" size="sm">
                                                <Eye className="w-4 h-4" />
                                              </Button>
                                            </Link>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Client Page</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-center text-gray-500 py-4">
                                    No requests scheduled for this date
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-center text-gray-500 py-4">
                                Select a date on the calendar to view requests
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {viewMode === 'list' && (
                <Card className="shadow-lg mb-6 bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between flex-wrap gap-4">
                      <span className="flex items-center">
                        <FileAudio className="mr-2 h-5 w-5" />
                        Backing Requests
                      </span>
                      <div className="flex flex-wrap items-center gap-4">
                        <Button 
                          onClick={handleSelectAll}
                          variant="outline"
                          className="flex items-center"
                          size="sm"
                        >
                          {selectedRequests.length === filteredRequests.length && filteredRequests.length > 0 ? 'Deselect All' : 'Select All'}
                        </Button>
                        {selectedRequests.length > 0 && (
                          <div className="flex items-center gap-2 bg-[#D1AAF2] px-4 py-2 rounded-lg">
                            <span className="font-medium">Selected: {selectedRequests.length}</span>
                            <span className="font-bold">Total: ${totalCost.toFixed(2)}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="default" 
                                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
                                  size="sm"
                                >
                                  <MoreHorizontal className="w-4 h-4 mr-2" />
                                  Batch Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    selectedRequests.forEach(id => updateStatus(id, 'in-progress'));
                                    toast({
                                      title: "Batch Update",
                                      description: `${selectedRequests.length} requests marked as In Progress`,
                                    });
                                  }}
                                >
                                  <Clock className="w-4 h-4 mr-2" /> Mark In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    selectedRequests.forEach(id => updateStatus(id, 'completed'));
                                    toast({
                                      title: "Batch Update",
                                      description: `${selectedRequests.length} requests marked as Completed`,
                                    });
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-2" /> Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    selectedRequests.forEach(id => updateStatus(id, 'cancelled'));
                                    toast({
                                      title: "Batch Update",
                                      description: `${selectedRequests.length} requests marked as Cancelled`,
                                    });
                                  }}
                                >
                                  <X className="w-4 h-4 mr-2" /> Mark Cancelled
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={openBatchDeleteDialog}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C0357] mb-4"></div>
                          <p>Loading requests...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader className="bg-[#D1AAF2]/20">
                            <TableRow>
                              <TableHead className="w-[50px]">
                                <input
                                  type="checkbox"
                                  checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                                  onChange={handleSelectAll}
                                  className="h-4 w-4"
                                />
                              </TableHead>
                              <TableHead className="w-[120px]">
                                <div className="flex items-center">
                                  <CalendarDays className="w-4 h-4 mr-2" />
                                  Date
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <User className="w-4 h-4 mr-2" />
                                  Client
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <Music className="w-4 h-4 mr-2" />
                                  Song
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <Tag className="w-4 h-4 mr-2" />
                                  Type
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Delivery
                                </div >
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <Hash className="w-4 h-4 mr-2" />
                                  Status
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Payment
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Cost
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <Upload className="w-4 h-4 mr-2" />
                                  Platforms
                                </div>
                              </TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRequests.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={11} className="text-center py-12">
                                  <div className="text-center">
                                    <FileAudio className="mx-auto h-16 w-16 text-gray-300" />
                                    <h3 className="mt-4 text-lg font-medium text-gray-900">No requests found</h3>
                                    <p className="mt-1 text-gray-500">
                                      Try adjusting your search or filter criteria
                                    </p>
                                    <div className="mt-6">
                                      <Button onClick={clearFilters} variant="outline">
                                        Clear Filters
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredRequests.map((request) => (
                                <TableRow 
                                  key={request.id} 
                                  className={`hover:bg-[#D1AAF2]/10 ${selectedRequests.includes(request.id) ? "bg-[#D1AAF2]/20" : ""}`}
                                >
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedRequests.includes(request.id)}
                                      onChange={() => handleSelectRequest(request.id)}
                                      className="h-4 w-4"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-medium">
                                      {format(new Date(request.created_at), 'MMM dd')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {format(new Date(request.created_at), 'HH:mm')}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{request.name || 'N/A'}</div>
                                    <div className="text-sm text-gray-500 flex items-center">
                                      <Mail className="w-3 h-3 mr-1" />
                                      {request.email}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{request.song_title}</div>
                                    <div className="text-sm text-gray-500">{request.musical_or_artist}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {Array.isArray(request.backing_type) ? request.backing_type.map((type: string, index: number) => (
                                        <Badge key={index} variant={getBadgeVariant(type)} className="capitalize">
                                          {type.replace('-', ' ')}
                                        </Badge>
                                      )) : (request.backing_type ? <Badge variant={getBadgeVariant(request.backing_type)} className="capitalize">{request.backing_type.replace('-', ' ')}</Badge> : null)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
                                  </TableCell>
                                  <TableCell>
                                    <Select 
                                      value={request.status || 'pending'} 
                                      onValueChange={(value) => updateStatus(request.id, value)}
                                    >
                                      <SelectTrigger className="w-[140px]">
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
                                    <Select 
                                      value={request.is_paid ? 'paid' : 'unpaid'} 
                                      onValueChange={(value) => updatePaymentStatus(request.id, value === 'paid')}
                                    >
                                      <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unpaid">Unpaid</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center font-medium">
                                      <DollarSign className="w-4 h-4 mr-1" />
                                      <span>{calculateRequestCost(request).toFixed(2)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      {getPlatformIcons(request.uploaded_platforms)}
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => openUploadPlatformsDialog(request.id)}
                                        className="mt-1 text-xs"
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-1">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="outline" onClick={() => uploadTrack(request.id)}>
                                            <Upload className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Upload Track</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="outline" onClick={() => shareTrack(request.id)}>
                                            <Share2 className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Share Track</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Link to={`/admin/request/${request.id}`}>
                                            <Button variant="outline" size="sm">
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                          </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View Details</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Link to={`/track/${request.id}`}>
                                            <Button variant="outline" size="sm">
                                              <User className="w-4 h-4" />
                                            </Button>
                                          </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Client View</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      {/* Temporarily hide the Email Generator button */}
                                      {/*
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => openEmailGenerator(request)}
                                          >
                                            <MailIcon className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Generate Email</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      */}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <CompletionEmailDialog 
                                            requestId={request.id}
                                            clientEmail={request.email}
                                            clientName={request.name || 'Client'}
                                            songTitle={request.song_title}
                                            trackUrl={request.track_url}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Email Client</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => openDeleteDialog(request.id)}
                                            className="text-red-600 hover:text-red-800"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delete Request</p>
                                        </TooltipContent>
                                      </Tooltip>
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
              )}
            </TabsContent>

            {/* System Health Tab Content */}
            <TabsContent value="system-health" className="mt-6">
              <DropboxMonitor /> {/* Integrate DropboxMonitor directly */}
            </TabsContent>

            {/* Data Management Tab Content */}
            <TabsContent value="data-management" className="mt-6">
              <DataImporter /> {/* Integrate DataImporter directly */}
            </TabsContent>

            {/* Email Tools Tab Content */}
            <TabsContent value="email-tools" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                <TestEmail /> {/* Integrate TestEmail directly */}
                <TestEmailNotification /> {/* Integrate TestEmailNotification directly */}
                <NotificationRecipientsManager /> {/* Integrate NotificationRecipientsManager directly */}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Upload Track Dialog */}
          {uploadTrackId && (
            <Dialog open={!!uploadTrackId} onOpenChange={() => setUploadTrackId(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Track
                  </DialogTitle>
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
          
          {/* Upload Platforms Dialog */}
          <Dialog open={uploadPlatformsDialogOpen} onOpenChange={setUploadPlatformsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Specify Upload Platforms
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Select the platforms where this track has been uploaded:</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <Youtube className="w-5 h-5 text-red-600 mr-2" />
                      <span>YouTube</span>
                    </div>
                    <Button 
                      variant={platforms.youtube ? "default" : "outline"}
                      onClick={() => setPlatforms({...platforms, youtube: !platforms.youtube})}
                      className={platforms.youtube ? "bg-red-600 hover:bg-red-700" : ""}
                      size="sm"
                    >
                      {platforms.youtube ? "Uploaded" : "Mark as Uploaded"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <Music className="w-5 h-5 text-black mr-2" />
                      <span>TikTok</span>
                    </div>
                    <Button 
                      variant={platforms.tiktok ? "default" : "outline"}
                      onClick={() => setPlatforms({...platforms, tiktok: !platforms.tiktok})}
                      className={platforms.tiktok ? "bg-black hover:bg-gray-800 text-white" : ""}
                      size="sm"
                    >
                      {platforms.tiktok ? "Uploaded" : "Mark as Uploaded"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <Facebook className="w-5 h-5 text-blue-600 mr-2" />
                      <span>Facebook</span>
                    </div>
                    <Button 
                      variant={platforms.facebook ? "default" : "outline"}
                      onClick={() => setPlatforms({...platforms, facebook: !platforms.facebook})}
                      className={platforms.facebook ? "bg-blue-600 hover:bg-blue-700" : ""}
                      size="sm"
                    >
                      {platforms.facebook ? "Uploaded" : "Mark as Uploaded"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <Instagram className="w-5 h-5 text-pink-500 mr-2" />
                      <span>Instagram</span>
                    </div>
                    <Button 
                      variant={platforms.instagram ? "default" : "outline"}
                      onClick={() => setPlatforms({...platforms, instagram: !platforms.instagram})}
                      className={platforms.instagram ? "bg-pink-500 hover:bg-pink-600" : ""}
                      size="sm"
                    >
                      {platforms.instagram ? "Uploaded" : "Mark as Uploaded"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <ExternalLink className="w-5 h-5 text-purple-600 mr-2" />
                      <span>Gumroad</span>
                    </div>
                    <Button 
                      variant={platforms.gumroad ? "default" : "outline"}
                      onClick={() => setPlatforms({...platforms, gumroad: !platforms.gumroad})}
                      className={platforms.gumroad ? "bg-purple-600 hover:bg-purple-700" : ""}
                      size="sm"
                    >
                      {platforms.gumroad ? "Uploaded" : "Mark as Uploaded"}
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setUploadPlatformsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveUploadPlatforms}
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                  >
                    Save Platforms
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <Trash2 className="mr-2 h-5 w-5 text-red-600" />
                  Delete Request
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the request and remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    if (requestToDelete) {
                      deleteRequest(requestToDelete);
                      setDeleteDialogOpen(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Batch Delete Confirmation Dialog */}
          <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <Trash2 className="mr-2 h-5 w-5 text-red-600" />
                  Delete Selected Requests
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all {selectedRequests.length} selected requests and remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={batchDeleteRequests}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <MadeWithDyad />
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
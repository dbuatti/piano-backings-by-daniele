import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PricingMatrix from '@/components/PricingMatrix';

// Admin Components
import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import AdminFiltersAndViews from '@/components/admin/AdminFiltersAndViews';
import RequestsTable from '@/components/admin/RequestsTable';
import RequestsCalendar from '@/components/admin/RequestsCalendar';
import UploadTrackDialog from '@/components/admin/UploadTrackDialog';
import UploadPlatformsDialog from '@/components/admin/UploadPlatformsDialog';
import DeleteConfirmationDialogs from '@/components/admin/DeleteConfirmationDialogs';

// Integrated Admin Pages/Tools
import DataImporter from './DataImporter';
import TestEmail from './TestEmail';
import TestEmailNotification from './TestEmailNotification';
import DropboxMonitor from './DropboxMonitor';
import NotificationRecipientsManager from '@/components/NotificationRecipientsManager';
import RequestOwnershipManager from '@/components/RequestOwnershipManager';

import { 
  HardDrive,
  Database,
  MailIcon,
  List
} from 'lucide-react';

const AdminDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  
  // Dialog states
  const [uploadTrackId, setUploadTrackId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen] = useState(false);
  const [selectedRequestForPlatforms, setSelectedRequestForPlatforms] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState({
    youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [backingTypeFilter, setBackingTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'pricing'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
      // Use the safe backing types for filtering
      result = result.filter(request => 
        (Array.isArray(request.backing_type) ? request.backing_type : [request.backing_type]).includes(backingTypeFilter)
      );
    }
    
    if (viewMode === 'calendar' && selectedDate) {
      result = result.filter(request => 
        request.delivery_date && new Date(request.delivery_date).toDateString() === selectedDate.toDateString()
      );
    }
    
    setFilteredRequests(result);
  }, [searchTerm, statusFilter, backingTypeFilter, requests, viewMode, selectedDate]);

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
    if (selectedRequests.length === filteredRequests.length && filteredRequests.length > 0) {
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
      total += req.cost || 0; // Assuming cost is already calculated and stored
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

  const handleUploadTrack = (id: string) => {
    setUploadTrackId(id);
  };

  const handleFileChange = (file: File | null) => {
    setUploadFile(file);
  };

  const handleFileUpload = async () => {
    if (!uploadTrackId || !uploadFile) return;
    
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `tracks/${uploadTrackId}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('tracks')
        .upload(fileName, uploadFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('tracks')
        .getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ 
          track_url: publicUrl,
          status: 'completed'
        })
        .eq('id', uploadTrackId);
      
      if (updateError) {
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
      toast({
        title: "Error",
        description: `Failed to upload track: ${error.message}. Please check your permissions and try again.`,
        variant: "destructive",
      });
    }
  };

  const shareTrack = async (id: string) => {
    try {
      const request = requests.find(req => req.id === id);
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
            youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false
          });
        }
      } else {
        setPlatforms(request.uploaded_platforms);
      }
    } else {
      setPlatforms({
        youtube: false, tiktok: false, facebook: false, instagram: false, gumroad: false
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
          <AdminDashboardHeader 
            title="Admin Dashboard" 
            description="Manage all backing track requests and system settings" 
          />
          
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
              <AdminStatsCards requests={requests} />
              
              <AdminFiltersAndViews
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                backingTypeFilter={backingTypeFilter}
                setBackingTypeFilter={setBackingTypeFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                clearFilters={clearFilters}
                totalRequests={requests.length}
                filteredRequestsCount={filteredRequests.length}
              />
              
              {viewMode === 'pricing' && (
                <PricingMatrix />
              )}
              
              {viewMode === 'calendar' && (
                <RequestsCalendar
                  requests={requests} // Pass all requests for tile content logic
                  filteredRequests={filteredRequests} // Pass filtered for display
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  uploadTrack={handleUploadTrack}
                />
              )}
              
              {viewMode === 'list' && (
                <RequestsTable
                  filteredRequests={filteredRequests}
                  loading={loading}
                  selectedRequests={selectedRequests}
                  handleSelectAll={handleSelectAll}
                  handleSelectRequest={handleSelectRequest}
                  totalCost={totalCost}
                  updateStatus={updateStatus}
                  updatePaymentStatus={updatePaymentStatus}
                  uploadTrack={handleUploadTrack}
                  shareTrack={shareTrack}
                  openEmailGenerator={openEmailGenerator}
                  openDeleteDialog={openDeleteDialog}
                  openBatchDeleteDialog={openBatchDeleteDialog}
                  openUploadPlatformsDialog={openUploadPlatformsDialog}
                />
              )}
            </TabsContent>

            {/* System Health Tab Content */}
            <TabsContent value="system-health" className="mt-6">
              <DropboxMonitor />
            </TabsContent>

            {/* Data Management Tab Content */}
            <TabsContent value="data-management" className="mt-6 space-y-6">
              <DataImporter />
              <RequestOwnershipManager />
            </TabsContent>

            {/* Email Tools Tab Content */}
            <TabsContent value="email-tools" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                <TestEmail />
                <TestEmailNotification />
                <NotificationRecipientsManager />
              </div>
            </TabsContent>
          </Tabs>
          
          <UploadTrackDialog
            isOpen={!!uploadTrackId}
            onOpenChange={() => { setUploadTrackId(null); setUploadFile(null); }}
            uploadTrackId={uploadTrackId}
            uploadFile={uploadFile}
            onFileChange={handleFileChange}
            onFileUpload={handleFileUpload}
          />
          
          <UploadPlatformsDialog
            isOpen={uploadPlatformsDialogOpen}
            onOpenChange={setUploadPlatformsDialogOpen}
            platforms={platforms}
            setPlatforms={setPlatforms}
            onSavePlatforms={saveUploadPlatforms}
          />
          
          <DeleteConfirmationDialogs
            deleteDialogOpen={deleteDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            requestToDelete={requestToDelete}
            onDeleteRequest={deleteRequest}
            batchDeleteDialogOpen={batchDeleteDialogOpen}
            setBatchDeleteDialogOpen={setBatchDeleteDialogOpen}
            selectedRequestsCount={selectedRequests.length}
            onBatchDeleteRequests={batchDeleteRequests}
          />
          
          <MadeWithDyad />
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
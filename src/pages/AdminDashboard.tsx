import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from '@tanstack/react-query';

// New Tab Content Components
import DashboardTabContent from '@/components/admin/DashboardTabContent';
import UsersAndDataTabContent from '@/components/admin/UsersAndDataTabContent';
import SystemAndConfigTabContent from '@/components/admin/SystemAndConfigTabContent';
import DevelopmentAndTestingTabContent from '@/components/admin/DevelopmentAndTestingTabContent';
import RepurposeTrackToShop from '@/components/admin/RepurposeTrackToShop'; // Import the repurpose component
import CreateNewProduct from '@/components/admin/CreateNewProduct'; // Import the new component
import ProductManager from '@/components/admin/ProductManager'; // Import ProductManager

// Admin Components (now mostly consumed by new tab content components)
import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';
import UploadTrackDialog from '@/components/admin/UploadTrackDialog'; // Added import
import UploadPlatformsDialog from '@/components/admin/UploadPlatformsDialog'; // Added import
import DeleteConfirmationDialogs from '@/components/admin/DeleteConfirmationDialogs'; // Added import

import { 
  LayoutDashboard, // Icon for Dashboard
  Users, // Icon for Users & Data
  Settings, // Icon for System & Configuration
  Wrench, // Icon for Development & Testing
  ShoppingCart, // Icon for Shop Management
  PlusCircle, // Added for Create New Product toggle
  RefreshCw // Added for Repurpose Tracks toggle
} from 'lucide-react';

// Custom Hooks (still used by DashboardTabContent)
import { useAdminRequests } from '@/hooks/admin/useAdminRequests';
import { useRequestFilters } from '@/hooks/admin/useRequestFilters';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { useUploadDialogs } from '@/hooks/admin/useUploadDialogs';
import { useDeleteDialogs
 } from '@/hooks/admin/useDeleteDialogs';
import { useBatchSelection } from '@/hooks/admin/useBatchSelection';

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Default to 'dashboard' for the new structure
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  // New state for managing the view within the Shop Management tab
  const [shopViewMode, setShopViewMode] = useState<'create' | 'repurpose'>('create');

  // Custom Hooks for state and logic (props for DashboardTabContent)
  const { requests, setRequests, loading, fetchRequests } = useAdminRequests();
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    backingTypeFilter, setBackingTypeFilter,
    paymentStatusFilter, setPaymentStatusFilter, // Destructure new filter state and setter
    viewMode, setViewMode,
    selectedDate, setSelectedDate,
    filteredRequests,
    clearFilters,
  } = useRequestFilters(requests);
  const { 
    updateStatus, updatePaymentStatus, shareTrack, 
    deleteRequest: performDeleteRequest, batchDeleteRequests: performBatchDeleteRequests,
    updateCost, // Destructure updateCost
  } = useRequestActions(requests, setRequests);
  const {
    uploadTrackId, setUploadTrackId,
    uploadFile, handleFileChange,
    uploadCaption, setUploadCaption, // Destructure new props
    uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen,
    selectedRequestForPlatforms, setSelectedRequestForPlatforms,
    platforms, setPlatforms,
    handleUploadTrack,
    handleFileUpload,
    handleDirectFileUpload,
    openUploadPlatformsDialog,
    saveUploadPlatforms,
    updateTrackCaption, // Destructure the new function
    isUploading, // Destructure isUploading from useUploadDialogs
  } = useUploadDialogs(requests, setRequests);
  const {
    selectedRequests, setSelectedRequests,
    totalCost,
    handleSelectAll,
    handleSelectRequest,
  } = useBatchSelection(filteredRequests);
  const {
    deleteDialogOpen, setDeleteDialogOpen,
    requestToDelete, setRequestToDelete,
    batchDeleteDialogOpen, setBatchDeleteDialogOpen,
    openDeleteDialog, confirmDeleteRequest,
    openBatchDeleteDialog, confirmBatchDeleteRequests,
  } = useDeleteDialogs(requests, setRequests, selectedRequests);

  const { data: totalIssueReports = 0, isLoading: isLoadingTotalIssues } = useQuery<number, Error>({
    queryKey: ['totalIssueReports'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin && authChecked,
    staleTime: 5 * 60 * 1000,
  });

  const { data: unreadIssueReports = 0, isLoading: isLoadingUnreadIssues } = useQuery<number, Error>({
    queryKey: ['unreadIssueReportsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin && authChecked,
    refetchInterval: 30000,
    staleTime: 10000,
  });


  const checkAdminAccess = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setIsAdmin(false);
      setAdminEmail(undefined);
      setAuthChecked(true);
      navigate('/login');
      return;
    }
    
    const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

    if (adminEmails.includes(session.user.email)) {
      setIsAdmin(true);
      setAdminEmail(session.user.email);
      setAuthChecked(true);
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
        if (adminEmails.includes(session.user.email)) {
          setIsAdmin(true);
          setAdminEmail(session.user.email);
          setAuthChecked(true);
          fetchRequests();
        } else {
          setIsAdmin(false);
          setAdminEmail(undefined);
          setAuthChecked(true);
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
        setAdminEmail(profile?.email);
        setAuthChecked(true);
        fetchRequests();
      } else {
        setIsAdmin(false);
        setAdminEmail(undefined);
        setAuthChecked(true);
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
      }
    } catch (error: any) {
      if (adminEmails.includes(session.user.email)) {
        setIsAdmin(true);
        setAdminEmail(session.user.email);
        setAuthChecked(true);
        fetchRequests();
      } else {
        setIsAdmin(false);
        setAdminEmail(undefined);
        setAuthChecked(true);
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
      }
    } finally {
      setAuthChecked(true);
    }
  }, [navigate, toast, fetchRequests]);

  useEffect(() => {
    checkAdminAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      checkAdminAccess();
    });

    return () => {
      subscription.unsubscribe();
    };

  }, [checkAdminAccess]);

  const openEmailGenerator = (request: any) => {
    navigate(`/email-generator/${request.id}`);
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Get existing track URLs for the currently selected request in the dialog
  const currentRequestForUpload = requests.find(req => req.id === uploadTrackId);
  const existingTrackUrls = currentRequestForUpload?.track_urls || [];

  const handleRemoveTrack = async (urlToRemove: string) => {
    if (!uploadTrackId) return;

    try {
      // Filter by the 'url' property of the TrackInfo object
      const updatedTrackUrls = existingTrackUrls.filter(track => track.url !== urlToRemove);
      
      const { error } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', uploadTrackId);
      
      if (error) throw error;

      setRequests(prev => prev.map(req => 
        req.id === uploadTrackId ? { ...req, track_urls: updatedTrackUrls } : req
      ));

      toast({
        title: "Track Removed",
        description: "The selected track has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to remove track: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Access Denied</p>
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
            adminEmail={adminEmail}
          />
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="shop-management" className="flex items-center">
                <ShoppingCart className="mr-2 h-4 w-4" /> Shop Management
              </TabsTrigger>
              <TabsTrigger value="users-data" className="flex items-center">
                <Users className="mr-2 h-4 w-4" /> Users & Data
              </TabsTrigger>
              <TabsTrigger value="system-config" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" /> System & Config
              </TabsTrigger>
              <TabsTrigger value="dev-testing" className="flex items-center">
                <Wrench className="mr-2 h-4 w-4" /> Dev & Testing
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab Content */}
            <TabsContent value="dashboard">
              <DashboardTabContent
                requests={requests}
                loading={loading}
                totalIssueReports={totalIssueReports}
                unreadIssueReports={unreadIssueReports}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                backingTypeFilter={backingTypeFilter}
                setBackingTypeFilter={setBackingTypeFilter}
                paymentStatusFilter={paymentStatusFilter}
                setPaymentStatusFilter={setPaymentStatusFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                filteredRequests={filteredRequests}
                clearFilters={clearFilters}
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
                openBatchDeleteDialog={confirmBatchDeleteRequests}
                openUploadPlatformsDialog={openUploadPlatformsDialog}
                onDirectFileUpload={handleDirectFileUpload}
                updateTrackCaption={updateTrackCaption}
                updateCost={updateCost}
              />
            </TabsContent>

            {/* New Shop Management Tab Content */}
            <TabsContent value="shop-management" className="mt-6 space-y-8">
              <Tabs value={shopViewMode} onValueChange={(value) => setShopViewMode(value as 'create' | 'repurpose')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create" className="flex items-center">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Product
                  </TabsTrigger>
                  <TabsTrigger value="repurpose" className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4" /> Repurpose Requests
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="create" className="mt-4">
                  <CreateNewProduct />
                </TabsContent>
                <TabsContent value="repurpose" className="mt-4">
                  <RepurposeTrackToShop />
                </TabsContent>
              </Tabs>
              <ProductManager />
            </TabsContent>

            {/* Users & Data Tab Content */}
            <TabsContent value="users-data" className="mt-6">
              <UsersAndDataTabContent />
            </TabsContent>

            {/* System & Configuration Tab Content */}
            <TabsContent value="system-config" className="mt-6">
              <SystemAndConfigTabContent />
            </TabsContent>

            {/* Development & Testing Tab Content */}
            <TabsContent value="dev-testing" className="mt-6">
              <DevelopmentAndTestingTabContent />
            </TabsContent>
          </Tabs>
          
          <UploadTrackDialog
            isOpen={!!uploadTrackId}
            onOpenChange={() => { setUploadTrackId(null); handleFileChange(null); }}
            requestId={uploadTrackId}
            uploadFile={uploadFile}
            onFileChange={handleFileChange}
            uploadCaption={uploadCaption}
            setUploadCaption={setUploadCaption}
            onFileUpload={handleFileUpload}
            existingTrackUrls={existingTrackUrls}
            onRemoveTrack={handleRemoveTrack}
            onUpdateTrackCaption={updateTrackCaption}
            isUploading={isUploading}
          />
          
          <UploadPlatformsDialog
            isOpen={uploadPlatformsDialogOpen}
            onOpenChange={() => setUploadPlatformsDialogOpen(false)}
            requestId={selectedRequestForPlatforms}
            platforms={platforms}
            setPlatforms={setPlatforms}
            onSavePlatforms={saveUploadPlatforms}
          />
          
          <DeleteConfirmationDialogs
            deleteDialogOpen={deleteDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            requestToDelete={requestToDelete}
            onDeleteRequest={confirmDeleteRequest}
            batchDeleteDialogOpen={batchDeleteDialogOpen}
            setBatchDeleteDialogOpen={setBatchDeleteDialogOpen}
            selectedRequestsCount={selectedRequests.length}
            onBatchDeleteRequests={confirmBatchDeleteRequests}
          />
          
          <MadeWithDyad />
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PricingMatrix from '@/components/PricingMatrix';
import { useQuery } from '@tanstack/react-query';

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
import AdminIssueReportsPage from './AdminIssueReportsPage'; // Import the new AdminIssueReportsPage

import { 
  HardDrive,
  Database,
  MailIcon,
  List,
  AlertCircle // New icon for Issue Reports tab
} from 'lucide-react';

// Custom Hooks
import { useAdminRequests } from '@/hooks/admin/useAdminRequests';
import { useRequestFilters } from '@/hooks/admin/useRequestFilters';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { useUploadDialogs } from '@/hooks/admin/useUploadDialogs';
import { useDeleteDialogs } from '@/hooks/admin/useDeleteDialogs';
import { useBatchSelection } from '@/hooks/admin/useBatchSelection';

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Custom Hooks for state and logic
  const { requests, setRequests, loading, fetchRequests } = useAdminRequests();
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    backingTypeFilter, setBackingTypeFilter,
    viewMode, setViewMode,
    selectedDate, setSelectedDate,
    filteredRequests,
    clearFilters,
  } = useRequestFilters(requests);
  const { 
    updateStatus, updatePaymentStatus, shareTrack, 
    deleteRequest: performDeleteRequest, batchDeleteRequests: performBatchDeleteRequests 
  } = useRequestActions(requests, setRequests);
  const {
    uploadTrackId, setUploadTrackId,
    uploadFile, handleFileChange,
    uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen,
    selectedRequestForPlatforms, setSelectedRequestForPlatforms,
    platforms, setPlatforms,
    handleUploadTrack,
    handleFileUpload,
    handleDirectFileUpload, // Get the new direct upload handler
    openUploadPlatformsDialog,
    saveUploadPlatforms,
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

  // Fetch total issue reports count
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch unread issue reports count
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
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });


  const checkAdminAccess = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setIsAdmin(false);
      setAuthChecked(true); // Mark auth checked even if no session, to stop loading state
      navigate('/login');
      return;
    }
    
    const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

    if (adminEmails.includes(session.user.email)) {
      setIsAdmin(true);
      setAuthChecked(true);
      fetchRequests(); // Fetch requests only if admin
      return;
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        // Fallback check if profile fetch fails but session email is admin
        if (adminEmails.includes(session.user.email)) {
          setIsAdmin(true);
          setAuthChecked(true);
          fetchRequests();
        } else {
          setIsAdmin(false);
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
        setAuthChecked(true);
        fetchRequests();
      } else {
        setIsAdmin(false);
        setAuthChecked(true);
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
      }
    } catch (error: any) {
      // Fallback check if any error occurs during profile fetch but session email is admin
      if (adminEmails.includes(session.user.email)) {
        setIsAdmin(true);
        setAuthChecked(true);
        fetchRequests();
      } else {
        setIsAdmin(false);
        setAuthChecked(true);
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
      }
    } finally {
      setAuthChecked(true); // Ensure authChecked is set to true regardless of outcome
    }
  }, [navigate, toast, fetchRequests]);

  useEffect(() => {
    checkAdminAccess();

    // Listen for auth state changes to re-run the check if needed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      checkAdminAccess(); // Let checkAdminAccess handle all state updates, including setting authChecked to true
    });

    return () => {
      subscription.unsubscribe();
    };

  }, [checkAdminAccess]);

  const openEmailGenerator = (request: any) => {
    navigate(`/email-generator/${request.id}`);
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
              <AdminStatsCards 
                requests={requests} 
                totalIssueReports={totalIssueReports}
                unreadIssueReports={unreadIssueReports}
              />
              
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
                  onDirectFileUpload={handleDirectFileUpload} // Pass the new handler
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
              <AdminIssueReportsPage /> {/* Render the Issue Reports page here */}
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
            onOpenChange={() => { setUploadTrackId(null); handleFileChange(null); }}
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
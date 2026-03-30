import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from '@tanstack/react-query';

import DashboardTabContent from '@/components/admin/DashboardTabContent';
import OperationsTabContent from '@/components/admin/OperationsTabContent';
import SystemTabContent from '@/components/admin/SystemTabContent';
import IssueReportsTabContent from '@/components/admin/IssueReportsTabContent';
import RepurposeTrackToShop from '@/components/admin/RepurposeTrackToShop';
import CreateNewProduct from '@/components/admin/CreateNewProduct';
import ProductManager from '@/components/admin/ProductManager';

import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';
import UploadTrackDialog from '@/components/admin/UploadTrackDialog';
import UploadPlatformsDialog from '@/components/admin/UploadPlatformsDialog';
import DeleteConfirmationDialogs from '@/components/admin/DeleteConfirmationDialogs';

import { 
  LayoutDashboard, 
  Settings, 
  Wrench, 
  ShoppingCart, 
  PlusCircle, 
  RefreshCw,
  MessageSquare,
  Activity
} from 'lucide-react';

import { useAdminRequests } from '@/hooks/admin/useAdminRequests';
import { useRequestFilters } from '@/hooks/admin/useRequestFilters';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { useUploadDialogs } from '@/hooks/admin/useUploadDialogs';
import { useDeleteDialogs } from '@/hooks/admin/useDeleteDialogs';
import { useBatchSelection } from '@/hooks/admin/useBatchSelection';

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'requests';
  const [shopViewMode, setShopViewMode] = useState<'create' | 'repurpose'>('create');

  const { requests, setRequests, loading, fetchRequests } = useAdminRequests();
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    backingTypeFilter, setBackingTypeFilter,
    paymentStatusFilter, setPaymentStatusFilter,
    viewMode, setViewMode,
    selectedDate, setSelectedDate,
    filteredRequests,
    clearFilters,
  } = useRequestFilters(requests);
  
  const { 
    updateStatus, updatePaymentStatus, shareTrack, 
    deleteRequest: performDeleteRequest, batchDeleteRequests: performBatchDeleteRequests,
    updateCost, updateInternalNotes
  } = useRequestActions(requests, setRequests);

  const {
    uploadTrackId, setUploadTrackId,
    uploadFile, handleFileChange,
    uploadCaption, setUploadCaption,
    uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen,
    selectedRequestForPlatforms, setSelectedRequestForPlatforms,
    platforms, setPlatforms,
    handleUploadTrack,
    handleFileUpload,
    handleDirectFileUpload,
    openUploadPlatformsDialog,
    saveUploadPlatforms,
    updateTrackCaption,
    isUploading,
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

  const { data: totalIssueReports = 0 } = useQuery<number, Error>({
    queryKey: ['totalIssueReports'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin && authChecked,
  });

  const { data: unreadIssueReports = 0 } = useQuery<number, Error>({
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
  });

  const checkAdminAccess = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
    if (adminEmails.includes(session.user.email)) {
      setIsAdmin(true);
      setAdminEmail(session.user.email);
      setAuthChecked(true);
      fetchRequests();
    } else {
      navigate('/');
    }
  }, [navigate, fetchRequests]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const currentRequestForUpload = requests.find(req => req.id === uploadTrackId);
  const existingTrackUrls = currentRequestForUpload?.track_urls || [];

  const handleRemoveTrack = async (urlToRemove: string) => {
    if (!uploadTrackId) return;
    try {
      const updatedTrackUrls = existingTrackUrls.filter(track => track.url !== urlToRemove);
      const { error } = await supabase.from('backing_requests').update({ track_urls: updatedTrackUrls }).eq('id', uploadTrackId);
      if (error) throw error;
      setRequests(prev => prev.map(req => req.id === uploadTrackId ? { ...req, track_urls: updatedTrackUrls } : req));
      toast({ title: "Track Removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (!authChecked) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <AdminDashboardHeader 
          title="Admin Dashboard" 
          description="Manage your studio operations and client requests." 
          adminEmail={adminEmail}
        />
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white p-1 rounded-2xl shadow-sm border h-14">
            <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-[#1C0357] data-[state=active]:text-white font-bold">
              <LayoutDashboard className="mr-2 h-4 w-4" /> Requests
            </TabsTrigger>
            <TabsTrigger value="shop" className="rounded-xl data-[state=active]:bg-[#1C0357] data-[state=active]:text-white font-bold">
              <ShoppingCart className="mr-2 h-4 w-4" /> Shop
            </TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-xl data-[state=active]:bg-[#1C0357] data-[state=active]:text-white font-bold relative">
              <MessageSquare className="mr-2 h-4 w-4" /> Feedback
              {unreadIssueReports > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadIssueReports}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="operations" className="rounded-xl data-[state=active]:bg-[#1C0357] data-[state=active]:text-white font-bold">
              <Settings className="mr-2 h-4 w-4" /> Operations
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl data-[state=active]:bg-[#1C0357] data-[state=active]:text-white font-bold">
              <Activity className="mr-2 h-4 w-4" /> System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
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
              updateInternalNotes={updateInternalNotes}
              uploadTrack={handleUploadTrack}
              shareTrack={shareTrack}
              openEmailGenerator={(req) => navigate(`/email-generator/${req.id}`)}
              openDeleteDialog={openDeleteDialog}
              openBatchDeleteDialog={openBatchDeleteDialog}
              openUploadPlatformsDialog={openUploadPlatformsDialog}
              onDirectFileUpload={handleDirectFileUpload}
              updateTrackCaption={updateTrackCaption}
              updateCost={updateCost}
            />
          </TabsContent>

          <TabsContent value="shop" className="mt-6 space-y-8">
            <Tabs value={shopViewMode} onValueChange={(v) => setShopViewMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 p-1 rounded-xl">
                <TabsTrigger value="create" className="rounded-lg font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Create Product</TabsTrigger>
                <TabsTrigger value="repurpose" className="rounded-lg font-bold"><RefreshCw className="mr-2 h-4 w-4" /> Repurpose Request</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="mt-4"><CreateNewProduct /></TabsContent>
              <TabsContent value="repurpose" className="mt-4"><RepurposeTrackToShop /></TabsContent>
            </Tabs>
            <ProductManager />
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <IssueReportsTabContent />
          </TabsContent>

          <TabsContent value="operations" className="mt-6">
            <OperationsTabContent />
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <SystemTabContent />
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
  );
};

export default AdminDashboard;
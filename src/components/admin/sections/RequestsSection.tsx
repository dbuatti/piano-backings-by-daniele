import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCcw, Loader2, FileAudio } from 'lucide-react';

import { useAdminRequests } from '@/hooks/admin/useAdminRequests';
import { useRequestFilters } from '@/hooks/admin/useRequestFilters';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { useUploadDialogs } from '@/hooks/admin/useUploadDialogs';
import { useDeleteDialogs } from '@/hooks/admin/useDeleteDialogs';
import { useBatchSelection } from '@/hooks/admin/useBatchSelection';

import AdminStatsCards from '@/components/admin/AdminStatsCards';
import AdminFiltersAndViews from '@/components/admin/AdminFiltersAndViews';
import RequestsTable from '@/components/admin/RequestsTable';
import RequestsCalendar from '@/components/admin/RequestsCalendar';
import PricingMatrix from '@/components/PricingMatrix';
import RequestEditorPane, { type EditorMode } from '@/components/admin/request/RequestEditorPane';
import UploadTrackDialog from '@/components/admin/UploadTrackDialog';
import UploadPlatformsDialog from '@/components/admin/UploadPlatformsDialog';
import DeleteConfirmationDialogs from '@/components/admin/DeleteConfirmationDialogs';
import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';

interface RequestsSectionProps {
  selectedRequestId: string | null;
  mode: EditorMode;
}

const RequestsSection: React.FC<RequestsSectionProps> = ({ selectedRequestId, mode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setSearchParams] = useSearchParams();

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
    updateStatus, shareTrack,
    deleteRequest: performDeleteRequest, batchDeleteRequests: performBatchDeleteRequests,
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
    refetchInterval: 30000,
  });

  const handleManualRefresh = async () => {
    await fetchRequests();
    queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    queryClient.invalidateQueries({ queryKey: ['totalIssueReports'] });
    toast({
      title: "Data Refreshed",
      description: "The latest requests and reports have been loaded.",
    });
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

  // Navigation into a request's editor pane
  const selectRequestView = (id: string) => navigate(`/admin/request/${id}`);
  const selectRequestEmail = (id: string) => navigate(`/admin/request/${id}?mode=email`);

  const handleModeChange = (next: EditorMode) => {
    if (!selectedRequestId) return;
    const sp = new URLSearchParams(window.location.search);
    if (next === 'view') sp.delete('mode'); else sp.set('mode', next);
    setSearchParams(sp, { replace: false });
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <AdminDashboardHeader
          title="Requests"
          description="Manage backing track requests, uploads, pricing, and client emails."
        />
        <Button
          onClick={handleManualRefresh}
          variant="outline"
          className="bg-white border-gray-200 text-[#1C0357] hover:bg-gray-50 font-bold rounded-xl shadow-sm"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh Data
        </Button>
      </div>

      <AdminStatsCards
        requests={requests}
        totalIssueReports={totalIssueReports as number}
        unreadIssueReports={unreadIssueReports as number}
      />

      <Card className="shadow-lg mb-6 bg-white rounded-2xl">
        <CardContent className="p-6">
          <AdminFiltersAndViews
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            backingTypeFilter={backingTypeFilter}
            setBackingTypeFilter={setBackingTypeFilter}
            paymentStatusFilter={paymentStatusFilter}
            setPaymentStatusFilter={setPaymentStatusFilter}
            clearFilters={clearFilters}
            totalRequests={requests.length}
            filteredRequestsCount={filteredRequests.length}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end mb-4 space-x-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          onClick={() => setViewMode('list')}
          className={cn("rounded-full px-6", viewMode === 'list' ? 'bg-[#1C0357]' : '')}
        >
          List View
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          onClick={() => setViewMode('calendar')}
          className={cn("rounded-full px-6", viewMode === 'calendar' ? 'bg-[#1C0357]' : '')}
        >
          Calendar
        </Button>
        <Button
          variant={viewMode === 'pricing' ? 'default' : 'outline'}
          onClick={() => setViewMode('pricing')}
          className={cn("rounded-full px-6", viewMode === 'pricing' ? 'bg-[#1C0357]' : '')}
        >
          Pricing
        </Button>
      </div>

      {/* Master–detail split */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 items-start">
        {/* Master list */}
        <div className="min-w-0">
          {viewMode === 'list' && (
            <RequestsTable
              filteredRequests={filteredRequests}
              loading={loading}
              selectedRequests={selectedRequests}
              handleSelectAll={handleSelectAll}
              handleSelectRequest={handleSelectRequest}
              totalCost={totalCost}
              updateStatus={updateStatus}
              uploadTrack={(id) => setUploadTrackId(id)}
              shareTrack={shareTrack}
              openEmailGenerator={(req) => selectRequestEmail(req.id)}
              openDeleteDialog={openDeleteDialog}
              openBatchDeleteDialog={openBatchDeleteDialog}
              openUploadPlatformsDialog={openUploadPlatformsDialog}
              onDirectFileUpload={handleDirectFileUpload}
              onSelectRequest={selectRequestView}
              clearFilters={clearFilters}
              selectedRequestId={selectedRequestId}
            />
          )}

          {viewMode === 'calendar' && (
            <RequestsCalendar
              requests={requests}
              filteredRequests={filteredRequests}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              uploadTrack={(id) => setUploadTrackId(id)}
            />
          )}

          {viewMode === 'pricing' && <PricingMatrix />}
        </div>

        {/* Detail / editor pane */}
        <div className="min-w-0">
          {selectedRequestId ? (
            <RequestEditorPane
              requestId={selectedRequestId}
              mode={mode}
              onModeChange={handleModeChange}
            />
          ) : (
            <Card className="shadow-lg bg-white rounded-2xl">
              <CardContent className="p-12 text-center text-gray-500">
                <FileAudio className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="font-bold text-[#1C0357]">Select a request</p>
                <p className="text-sm mt-1">Choose a request from the list to view, edit, upload tracks, or email the client.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default RequestsSection;
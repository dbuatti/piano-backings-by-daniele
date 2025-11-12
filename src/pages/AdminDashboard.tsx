import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { showSuccess, showError } from '@/utils/toast'; // Updated import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Loader2, Bell } from 'lucide-react';
import Header from '@/components/Header';
import { useAdminRequests } from '@/hooks/admin/useAdminRequests';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { useUploadDialogs } from '@/hooks/admin/useUploadDialogs';
import { useDeleteDialogs } from '@/hooks/admin/useDeleteDialogs';
import RequestsTable from '@/components/admin/RequestsTable';
import DashboardTabContent from '@/components/admin/DashboardTabContent';
import IssueReportsTable from '@/components/admin/IssueReportsTable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUnreadIssueReportsCount } from '@/utils/admin-helpers';
import { BackingRequest } from '@/utils/helpers';
import RepurposeTrackToShop from '@/components/admin/RepurposeTrackToShop';
import { CreateNewProduct } from '@/components/admin/CreateNewProduct'; // Changed to named import
import ProductManager from '@/components/admin/ProductManager';
import UploadTrackDialog from '@/components/admin/UploadTrackDialog';
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

const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const { requests, isLoading: loading, isError, error } = useAdminRequests(searchTerm);
  const {
    updateStatus, updatePaymentStatus, shareTrack,
    deleteRequest: performDeleteRequest, batchDeleteRequests: performBatchDeleteRequests, // Corrected destructuring
    updateCost, uploadTrack,
  } = useRequestActions(); // No arguments
  const {
    uploadTrackDialogOpen, uploadTrackId, closeUploadTrackDialog, openUploadTrackDialog,
  } = useUploadDialogs(); // No longer passing file state
  const {
    deleteDialogOpen, setDeleteDialogOpen, requestIdToDelete, openDeleteDialog, confirmDelete, isDeletingRequest,
    bulkDeleteDialogOpen, setBulkDeleteDialogOpen, requestsToDelete, openBulkDeleteDialog, confirmBulkDelete, isBatchDeletingRequests,
  } = useDeleteDialogs();

  const { data: unreadCount } = useQuery<number | undefined>({
    queryKey: ['unreadIssueReportsCount'],
    queryFn: fetchUnreadIssueReportsCount,
    refetchInterval: 30000,
  });

  const { data: issueReports, isLoading: loadingIssueReports } = useQuery<any[], Error>({
    queryKey: ['allIssueReports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const toggleIssueReportReadStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('issue_reports')
      .update({ is_read: !currentStatus })
      .eq('id', id);

    if (error) {
      showError(`Failed to update status: ${error.message}`);
    } else {
      showSuccess(`Issue report marked as ${!currentStatus ? 'read' : 'unread'}.`);
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    }
  };

  const deleteIssueReport = async (id: string) => {
    const { error } = await supabase
      .from('issue_reports')
      .delete()
      .eq('id', id);

    if (error) {
      showError(`Failed to delete report: ${error.message}`);
    } else {
      showSuccess("Issue report deleted permanently.");
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    }
  };

  const handleTrackUploaded = (url: string, caption: string) => {
    // This function is called by UploadTrackDialog when a track is successfully uploaded.
    // It should trigger a re-fetch of the request details to show the new track.
    queryClient.invalidateQueries({ queryKey: ['requestDetails', uploadTrackId] });
    queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
    showSuccess(`Track "${caption}" uploaded and linked to request.`);
    closeUploadTrackDialog();
  };

  const handleSelectRequest = (id: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedRequests(prev => [...prev, id]);
    } else {
      setSelectedRequests(prev => prev.filter(requestId => requestId !== id));
    }
  };

  const handleSelectAllRequests = (checked: boolean | 'indeterminate') => {
    if (checked && requests) {
      setSelectedRequests(requests.map(request => request.id));
    } else {
      setSelectedRequests([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <div className="flex-grow container mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-[#1C0357] mb-8 text-center">Admin Dashboard</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="issues">
              Issue Reports
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="shop">Shop Management</TabsTrigger>
            <TabsTrigger value="new-product">New Product</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardTabContent /> {/* Removed requests and loading props */}
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search requests by title, artist, or email..."
                  className="pl-9 pr-4 py-2 border rounded-md w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {selectedRequests.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => openBulkDeleteDialog(selectedRequests)}
                  disabled={isBatchDeletingRequests}
                >
                  {isBatchDeletingRequests ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    `Delete Selected (${selectedRequests.length})`
                  )}
                </Button>
              )}
            </div>
            <RequestsTable
              requests={requests || []}
              loading={loading}
              error={error}
              updateStatus={updateStatus}
              updatePaymentStatus={updatePaymentStatus}
              updateCost={updateCost}
              openUploadTrackDialog={openUploadTrackDialog}
              shareTrack={shareTrack}
              openDeleteDialog={openDeleteDialog}
              selectedRequests={selectedRequests}
              onSelectRequest={handleSelectRequest}
              onSelectAllRequests={handleSelectAllRequests}
            />
          </TabsContent>

          <TabsContent value="issues" className="mt-6">
            <IssueReportsTable
              reports={issueReports || []}
              isLoading={loadingIssueReports}
              toggleReadStatus={toggleIssueReportReadStatus}
              openDeleteDialog={openDeleteDialog} // Reusing the general delete dialog for single report delete
              deleteDialogOpen={deleteDialogOpen}
              setDeleteDialogOpen={setDeleteDialogOpen}
              confirmDelete={() => {
                if (requestIdToDelete) {
                  deleteIssueReport(requestIdToDelete);
                  setDeleteDialogOpen(false);
                  setRequestIdToDelete(null);
                }
              }}
              isTogglingReadStatus={false} // Placeholder, actual state management for this would be more complex
              isDeletingReport={isDeletingRequest} // Reusing general delete state
            />
          </TabsContent>

          <TabsContent value="shop" className="mt-6">
            <ProductManager />
          </TabsContent>

          <TabsContent value="new-product" className="mt-6">
            <CreateNewProduct />
          </TabsContent>
        </Tabs>
      </div>

      <MadeWithDyad />

      {/* General Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-red-600" /> {/* Using Bell icon as a placeholder for general delete */}
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingRequest}
            >
              {isDeletingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-red-600" />
              Confirm Bulk Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {requestsToDelete.length} selected items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isBatchDeletingRequests}
            >
              {isBatchDeletingRequests ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Track Dialog */}
      {uploadTrackId && (
        <AlertDialog open={uploadTrackDialogOpen} onOpenChange={closeUploadTrackDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Upload Track for Request {uploadTrackId.substring(0, 8)}...</AlertDialogTitle>
              <AlertDialogDescription>
                Upload an audio file for this request. It will be made available to the client.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <UploadTrackDialog
              requestId={uploadTrackId}
              isOpen={uploadTrackDialogOpen}
              onOpenChange={closeUploadTrackDialog}
              onTrackUploaded={handleTrackUploaded}
              existingTracks={requests?.find(req => req.id === uploadTrackId)?.track_urls || []}
            />
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default AdminDashboard;
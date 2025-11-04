import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, PlusCircle, Trash2, Mail, Upload, Share2 } from 'lucide-react';
import AdminStatsCards from './AdminStatsCards';
import RequestsTable from './RequestsTable';
import IssueReportsTable from './IssueReportsTable';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { calculateRequestCost } from '@/utils/pricing';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmailGenerator from './EmailGenerator';
import UploadTrackDialog from './UploadTrackDialog';
import UploadPlatformsDialog from './UploadPlatformsDialog';
import { uploadFileToSupabase } from '@/utils/supabase-client';

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string | string[];
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_url?: string;
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number | null;
}

interface IssueReport {
  id: string;
  created_at: string;
  request_id: string;
  user_email: string;
  issue_type: string;
  description: string;
  status: 'open' | 'resolved';
  is_read: boolean;
}

const DashboardTabContent: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BackingRequest[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isEmailGeneratorOpen, setIsEmailGeneratorOpen] = useState(false);
  const [emailRecipientRequest, setEmailRecipientRequest] = useState<BackingRequest | null>(null);
  const [isUploadTrackDialogOpen, setIsUploadTrackDialogOpen] = useState(false);
  const [requestToUploadTrack, setRequestToUploadTrack] = useState<string | null>(null);
  const [isUploadPlatformsDialogOpen, setIsUploadPlatformsDialogOpen] = useState(false);
  const [requestToUploadPlatforms, setRequestToUploadPlatforms] = useState<string | null>(null);

  const { updateStatus, updatePaymentStatus, updateCost, shareTrack, deleteRequest, batchDeleteRequests } = useRequestActions(requests, setRequests);

  useEffect(() => {
    fetchRequests();
    fetchIssueReports();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('backing_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: `Failed to fetch requests: ${error.message}`,
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const fetchIssueReports = async () => {
    const { data, error } = await supabase
      .from('issue_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: `Failed to fetch issue reports: ${error.message}`,
        variant: "destructive",
      });
    } else {
      setIssueReports(data || []);
    }
  };

  const handleSelectRequest = (id: string) => {
    setSelectedRequests(prev =>
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(req => req.id));
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = searchTerm === '' ||
        request.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.song_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.musical_or_artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' ||
        (paymentFilter === 'paid' && request.is_paid) ||
        (paymentFilter === 'unpaid' && !request.is_paid);

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [requests, searchTerm, statusFilter, paymentFilter]);

  const totalSelectedCost = useMemo(() => {
    return selectedRequests.reduce((sum, id) => {
      const request = requests.find(req => req.id === id);
      return sum + (request ? (request.cost !== null ? request.cost : calculateRequestCost(request).totalCost) : 0);
    }, 0);
  }, [selectedRequests, requests]);

  const openDeleteDialog = (id: string) => {
    setRequestToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (requestToDelete) {
      await deleteRequest(requestToDelete);
      setIsDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const openBatchDeleteDialog = () => {
    setIsBatchDeleteDialogOpen(true);
  };

  const confirmBatchDelete = async () => {
    await batchDeleteRequests(selectedRequests);
    setSelectedRequests([]);
    setIsBatchDeleteDialogOpen(false);
  };

  const openEmailGenerator = (request: BackingRequest) => {
    setEmailRecipientRequest(request);
    setIsEmailGeneratorOpen(true);
  };

  const openUploadTrackDialog = (id: string) => {
    setRequestToUploadTrack(id);
    setIsUploadTrackDialogOpen(true);
  };

  const openUploadPlatformsDialog = (id: string) => {
    setRequestToUploadPlatforms(id);
    setIsUploadPlatformsDialogOpen(true);
  };

  const handleDirectFileUpload = async (requestId: string, file: File) => {
    toast({
      title: "Uploading Track",
      description: `Uploading ${file.name} for request ${requestId}...`,
    });
    try {
      const { data: uploadData, error: uploadError } = await uploadFileToSupabase(file, `tracks/${requestId}/`);
      if (uploadError) throw uploadError;

      const newTrackUrl = uploadData?.path;
      if (!newTrackUrl) throw new Error("Failed to get uploaded file path.");

      const { data: existingRequest, error: fetchError } = await supabase
        .from('backing_requests')
        .select('track_urls')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const currentTrackUrls = existingRequest?.track_urls || [];
      const updatedTrackUrls = [...currentTrackUrls, { url: newTrackUrl, caption: file.name }];

      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', requestId);

      if (updateError) throw updateError;

      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, track_urls: updatedTrackUrls } : req
      ));

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded and linked to request ${requestId}.`,
      });
    } catch (error: any) {
      console.error("Direct file upload error:", error);
      toast({
        title: "Upload Failed",
        description: `Could not upload ${file.name}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const totalIssueReports = issueReports.length;
  const unreadIssueReports = issueReports.filter(report => !report.is_read).length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-extrabold text-[#1C0357] mb-8">Admin Dashboard</h1>

      <AdminStatsCards 
        requests={requests} 
        totalIssueReports={totalIssueReports}
        unreadIssueReports={unreadIssueReports}
      />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mx-auto mb-6 bg-[#D1AAF2]/20">
          <TabsTrigger value="list">Backing Requests</TabsTrigger>
          <TabsTrigger value="issues">Issue Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] md:w-[150px]">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px] md:w-[150px]">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Filter by Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <RequestsTable
            filteredRequests={filteredRequests}
            loading={loading}
            selectedRequests={selectedRequests}
            handleSelectAll={handleSelectAll}
            handleSelectRequest={handleSelectRequest}
            totalCost={totalSelectedCost}
            updateStatus={updateStatus}
            updatePaymentStatus={updatePaymentStatus}
            updateCost={updateCost}
            uploadTrack={openUploadTrackDialog}
            shareTrack={shareTrack}
            openEmailGenerator={openEmailGenerator}
            openDeleteDialog={openDeleteDialog}
            openBatchDeleteDialog={openBatchDeleteDialog}
            openUploadPlatformsDialog={openUploadPlatformsDialog}
            onDirectFileUpload={handleDirectFileUpload}
          />
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <IssueReportsTable 
            issueReports={issueReports} 
            setIssueReports={setIssueReports} 
            loading={loading} 
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Batch Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRequests.length} selected requests? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmBatchDelete}>Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Generator Dialog */}
      <Dialog open={isEmailGeneratorOpen} onOpenChange={setIsEmailGeneratorOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Generate Email</DialogTitle>
            <DialogDescription>
              Compose an email to the client for request #{emailRecipientRequest?.id?.substring(0, 8)}.
            </DialogDescription>
          </DialogHeader>
          {emailRecipientRequest && (
            <EmailGenerator 
              request={emailRecipientRequest} 
              onClose={() => setIsEmailGeneratorOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Track Dialog */}
      <Dialog open={isUploadTrackDialogOpen} onOpenChange={setIsUploadTrackDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Track</DialogTitle>
            <DialogDescription>
              Upload a track for request #{requestToUploadTrack?.substring(0, 8)}.
            </DialogDescription>
          </DialogHeader>
          {requestToUploadTrack && (
            <UploadTrackDialog 
              requestId={requestToUploadTrack} 
              isOpen={isUploadTrackDialogOpen} // Pass isOpen
              onOpenChange={(isOpen) => { // Pass onOpenChange
                setIsUploadTrackDialogOpen(isOpen);
                if (!isOpen) fetchRequests(); // Refresh requests when dialog closes
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Platforms Dialog */}
      <Dialog open={isUploadPlatformsDialogOpen} onOpenChange={setIsUploadPlatformsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Update Upload Platforms</DialogTitle>
            <DialogDescription>
              Select platforms where the track for request #{requestToUploadPlatforms?.substring(0, 8)} has been uploaded.
            </DialogDescription>
          </DialogHeader>
          {requestToUploadPlatforms && (
            <UploadPlatformsDialog 
              requestId={requestToUploadPlatforms} 
              isOpen={isUploadPlatformsDialogOpen} // Pass isOpen
              onOpenChange={(isOpen) => { // Pass onOpenChange
                setIsUploadPlatformsDialogOpen(isOpen);
                if (!isOpen) fetchRequests(); // Refresh requests when dialog closes
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardTabContent;
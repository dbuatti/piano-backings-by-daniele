import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Music,
  Shield,
  User as UserIcon,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Trash2,
  Upload,
  ShoppingCart,
  MessageSquare,
  DollarSign,
  Eye,
  PlusCircle,
  MinusCircle,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RequestsTable from '@/components/admin/RequestsTable';
import RequestsCalendar from '@/components/admin/RequestsCalendar';
import ProductManager from '@/components/admin/ProductManager';
import AppSettingsManager from '@/components/admin/AppSettingsManager';
import RequestOwnershipTabContent from '@/components/admin/RequestOwnershipTabContent';
import RepurposeTrackToShop from '@/components/admin/RepurposeTrackToShop';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { useSelectionAndCost } from '@/hooks/admin/useSelectionAndCost';
import { useUploadDialogs } from '@/hooks/admin/useUploadDialogs';
import { useDeleteDialogs } from '@/hooks/admin/useDeleteDialogs';
import { useQuery } from '@tanstack/react-query';
import IssueReportsTable from '@/components/admin/IssueReportsTable';

interface UserProfileForAdmin {
  id: string;
  email: string;
  name: string;
}

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
  track_urls?: { url: string; caption: string }[];
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number;
  sheet_music_url?: string;
  voice_memo_url?: string;
  youtube_link?: string;
  additional_links?: string;
}

const AdminDashboard = () => {
  const [requests, setRequests] = useState<BackingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsersForAdmin, setAllUsersForAdmin] = useState<UserProfileForAdmin[]>([]);
  const allUsersForAdminRef = useRef<UserProfileForAdmin[]>([]);
  const [loadingAllUsersForAdmin, setLoadingAllUsersForAdmin] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'requests';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update the ref whenever allUsersForAdmin state changes
  useEffect(() => {
    allUsersForAdminRef.current = allUsersForAdmin;
  }, [allUsersForAdmin]);

  const fetchRequests = useCallback(async (targetUserId: string | null = null) => {
    setLoading(true);
    try {
      let query = supabase.from('backing_requests').select('*').order('created_at', { ascending: false });
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }
      const { data, error } = await query;
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
  }, [toast]);

  const { updateStatus, updatePaymentStatus, shareTrack } = useRequestActions(requests, setRequests); // Removed unused deleteRequest, batchDeleteRequests

  const {
    uploadTrackId, setUploadTrackId,
    uploadFile, handleFileChange,
    uploadPlatformsDialogOpen, setUploadPlatformsDialogOpen,
    selectedRequestForPlatforms: selectedRequestForPlatformsState, setSelectedRequestForPlatforms: setSelectedRequestForPlatformsState, // Renamed to avoid conflict
    platforms, setPlatforms,
    handleUploadTrack,
    handleFileUpload,
    handleDirectFileUpload,
    openUploadPlatformsDialog,
    saveUploadPlatforms,
    updateTrackCaption,
  } = useUploadDialogs(requests, setRequests);

  const {
    selectedRequests, toggleSelectRequest, toggleSelectAll, allSelected, totalCost,
  } = useSelectionAndCost(requests); // Removed setSelectedRequests

  const {
    deleteDialogOpen, setDeleteDialogOpen,
    requestToDelete, setRequestToDelete, // Removed setRequestToDelete
    batchDeleteDialogOpen, setBatchDeleteDialogOpen,
    openDeleteDialog, confirmDeleteRequest,
    openBatchDeleteDialog, confirmBatchDeleteRequests, // Removed openBatchDeleteDialog
  } = useDeleteDialogs(requests, setRequests, selectedRequests);

  const { data: totalIssueReports = 0 } = useQuery<number, Error>({ // Removed isLoadingTotalIssues
    queryKey: ['totalIssueReports'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count;
    },
  });

  const { data: unreadIssueReports = 0 } = useQuery<number, Error>({ // Removed isLoadingUnreadIssues
    queryKey: ['unreadIssueReportsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count;
    },
  });

  const [repurposeDialogOpen, setRepurposeDialogOpen] = useState(false);
  const [repurposeRequestId, setRepurposeRequestId] = useState<string | null>(null);

  const handleOpenRepurposeDialog = (id: string) => {
    setRepurposeRequestId(id);
    setRepurposeDialogOpen(true);
  };

  const handleCloseRepurposeDialog = () => {
    setRepurposeDialogOpen(false);
    setRepurposeRequestId(null);
  };

  const checkAdminAccess = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const loggedInUser = session?.user;
    setUser(loggedInUser);

    let currentIsAdmin = false;
    if (loggedInUser?.email) {
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      if (adminEmails.includes(loggedInUser.email!)) { // Added non-null assertion
        currentIsAdmin = true;
      }
    }
    setIsAdmin(currentIsAdmin);

    if (!currentIsAdmin) {
      toast({
        title: "Unauthorized Access",
        description: "You do not have administrative privileges to view this page.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    // Fetch all users for admin dropdown
    setLoadingAllUsersForAdmin(true);
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (!adminSession) throw new Error('No active session for admin user.');

      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/list-all-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminSession.access_token}`
          },
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to load all users: ${response.status}`);
      }
      setAllUsersForAdmin(result.users || []);
    } catch (error: any) {
      console.error('Error fetching all users for admin:', error);
      toast({ title: "Error", description: `Failed to load users for admin view: ${error.message}`, variant: "destructive" });
      setAllUsersForAdmin([]);
    } finally {
      setLoadingAllUsersForAdmin(false);
    }

    // Determine which requests to fetch based on selectedUserForView or loggedInUser
    let targetUserIdToFetch: string | null = null;
    if (selectedUserForView) {
      const selectedProfile = allUsersForAdminRef.current.find(u => u.id === selectedUserForView);
      if (selectedProfile) {
        targetUserIdToFetch = selectedProfile.id;
      }
    } else if (loggedInUser) {
      targetUserIdToFetch = loggedInUser.id;
    }

    fetchRequests(targetUserIdToFetch);
  }, [navigate, toast, selectedUserForView, fetchRequests]);

  useEffect(() => {
    checkAdminAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { // Renamed event to _event
      checkAdminAccess();
    });
    return () => subscription.unsubscribe();
  }, [checkAdminAccess]);

  useEffect(() => {
    if (isAdmin && user && !selectedUserForView) {
      fetchRequests(user.id); // Default to fetching admin's own requests if admin and no user selected
    } else if (isAdmin && selectedUserForView) {
      fetchRequests(selectedUserForView);
    }
  }, [isAdmin, user, selectedUserForView, fetchRequests]);

  const handleSelectRequestFromCalendar = (requestId: string) => {
    navigate(`/track/${requestId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-[#1C0357]" />
        <p className="ml-4 text-xl text-gray-700">Loading admin dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Should be redirected by checkAdminAccess
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1C0357]">Admin Dashboard</h1>
            <p className="text-lg text-[#1C0357]/90">Manage backing track requests, products, and app settings</p>
          </div>
          <div className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5 text-[#1C0357]" />
            <Select
              value={selectedUserForView || 'admin-self'}
              onValueChange={(value) => setSelectedUserForView(value === 'admin-self' ? null : value)}
              disabled={loadingAllUsersForAdmin}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={loadingAllUsersForAdmin ? "Loading users..." : "View as user..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin-self">View My Own Requests</SelectItem>
                {allUsersForAdmin.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Requests</p>
                  <p className="text-2xl font-bold text-[#1C0357]">{requests.length}</p>
                </div>
                <Music className="h-10 w-10 text-[#D1AAF2]" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending/In Progress</p>
                  <p className="text-2xl font-bold text-[#1C0357]">
                    {requests.filter(r => r.status === 'pending' || r.status === 'in-progress').length}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Unread Issue Reports</p>
                  <p className="text-2xl font-bold text-[#1C0357]">{unreadIssueReports}</p>
                </div>
                <MessageSquare className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="requests" className="flex items-center">
              <Music className="mr-2 h-4 w-4" /> Requests
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center">
              <ShoppingCart className="mr-2 h-4 w-4" /> Products
            </TabsTrigger>
            <TabsTrigger value="ownership" className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4" /> Ownership
            </TabsTrigger>
            <TabsTrigger value="issue-reports" className="flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" /> Issue Reports ({unreadIssueReports})
            </TabsTrigger>
            <TabsTrigger value="app-settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" /> App Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-6">
            <div className="flex justify-end mb-4 space-x-2">
              {selectedRequests.size > 0 && (
                <>
                  <Button
                    variant="destructive"
                    onClick={openBatchDeleteDialog}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedRequests.size})
                  </Button>
                  <Button
                    onClick={() => toast({ title: "Batch Action", description: "Implement batch payment/status update here." })}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <DollarSign className="mr-2 h-4 w-4" /> Batch Pay ({totalCost.toFixed(2)})
                  </Button>
                </>
              )}
            </div>
            <RequestsTable
              requests={requests}
              loading={loading}
              updateStatus={updateStatus}
              updatePaymentStatus={updatePaymentStatus}
              shareTrack={shareTrack}
              deleteRequest={confirmDeleteRequest}
              openUploadPlatformsDialog={openUploadPlatformsDialog}
              updateTrackCaption={updateTrackCaption}
              handleDirectFileUpload={handleDirectFileUpload}
              selectedRequests={selectedRequests}
              toggleSelectRequest={toggleSelectRequest}
              toggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
              totalCost={totalCost}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <RequestsCalendar onSelectRequest={handleSelectRequestFromCalendar} />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductManager />
          </TabsContent>

          <TabsContent value="ownership" className="mt-6">
            <RequestOwnershipTabContent />
          </TabsContent>

          <TabsContent value="issue-reports" className="mt-6">
            <IssueReportsTable />
          </TabsContent>

          <TabsContent value="app-settings" className="mt-6">
            <AppSettingsManager />
          </TabsContent>
        </Tabs>

        {/* Upload Track Dialog */}
        <Dialog open={!!uploadTrackId} onOpenChange={() => setUploadTrackId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Track</DialogTitle>
              <DialogDescription>Upload an audio file for request ID: {uploadTrackId}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="track-file">Audio File</Label>
              <Input
                id="track-file"
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadTrackId(null)}>Cancel</Button>
              <Button onClick={handleFileUpload} disabled={!uploadFile}>Upload</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Platforms Dialog */}
        <Dialog open={uploadPlatformsDialogOpen} onOpenChange={setUploadPlatformsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Upload Platforms</DialogTitle>
              <DialogDescription>
                Mark where the track for request ID {selectedRequestForPlatformsState} has been uploaded.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="youtube"
                  checked={platforms.youtube}
                  onCheckedChange={(checked) => setPlatforms(prev => ({ ...prev, youtube: checked as boolean }))}
                />
                <Label htmlFor="youtube">YouTube</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tiktok"
                  checked={platforms.tiktok}
                  onCheckedChange={(checked) => setPlatforms(prev => ({ ...prev, tiktok: checked as boolean }))}
                />
                <Label htmlFor="tiktok">TikTok</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="facebook"
                  checked={platforms.facebook}
                  onCheckedChange={(checked) => setPlatforms(prev => ({ ...prev, facebook: checked as boolean }))}
                />
                <Label htmlFor="facebook">Facebook</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="instagram"
                  checked={platforms.instagram}
                  onCheckedChange={(checked) => setPlatforms(prev => ({ ...prev, instagram: checked as boolean }))}
                />
                <Label htmlFor="instagram">Instagram</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gumroad"
                  checked={platforms.gumroad}
                  onCheckedChange={(checked) => setPlatforms(prev => ({ ...prev, gumroad: checked as boolean }))}
                />
                <Label htmlFor="gumroad">Gumroad</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadPlatformsDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveUploadPlatforms}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Request Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the request for "{requestToDelete?.song_title}" by {requestToDelete?.musical_or_artist}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteRequest}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Delete Requests Confirmation Dialog */}
        <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Batch Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedRequests.size} selected requests? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmBatchDeleteRequests}>Delete All Selected</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Repurpose Track to Shop Dialog */}
        {repurposeDialogOpen && repurposeRequestId && (
          <RepurposeTrackToShop
            requestId={repurposeRequestId}
            onClose={handleCloseRepurposeDialog}
          />
        )}

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default AdminDashboard;
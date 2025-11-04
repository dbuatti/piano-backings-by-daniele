import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Download, Play, Share2, Music, UserPlus, Calendar, Clock, CheckCircle, Eye, User as UserIcon, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSafeBackingTypes } from '@/utils/helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfileForAdmin {
  id: string;
  email: string;
  name: string;
}

const UserDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // The currently logged-in user
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsersForAdmin, setAllUsersForAdmin] = useState<UserProfileForAdmin[]>([]);
  const [loadingAllUsersForAdmin, setLoadingAllUsersForAdmin] = useState(false); // New loading state
  const [selectedUserForView, setSelectedUserForView] = useState<string | null>(null); // ID of the user whose dashboard is being viewed

  const fetchRequestsForTarget = useCallback(async (targetUserId: string | null, targetUserEmail: string | null) => {
    setLoading(true);
    try {
      let query = supabase.from('backing_requests').select('*').order('created_at', { ascending: false });

      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else if (targetUserEmail) {
        query = query.ilike('email', targetUserEmail);
      } else {
        // This case should ideally not be reached if logic is correct
        throw new Error('No target user ID or email provided for fetching requests.');
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

  const fetchGuestRequestsByEmail = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/get-guest-requests-by-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch guest requests: ${response.status} ${response.statusText}`);
      }
      
      setRequests(result.requests || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch guest requests: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Main function to check user and determine which data to fetch
  const checkUserAndDetermineTarget = useCallback(async () => {
    setLoading(true); // Start loading for the main data fetch
    const { data: { session } } = await supabase.auth.getSession();
    const loggedInUser = session?.user;
    setUser(loggedInUser); // Update the logged-in user state

    let currentIsAdmin = false;
    if (loggedInUser?.email) {
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      currentIsAdmin = adminEmails.includes(loggedInUser.email);
      setIsAdmin(currentIsAdmin);
    } else {
      setIsAdmin(false);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');

    // Determine which user's data to fetch
    let targetUserId: string | null = null;
    let targetUserEmail: string | null = null;

    if (selectedUserForView) { // Admin has selected a user from the dropdown
      const selectedProfile = allUsersForAdmin.find(u => u.id === selectedUserForView);
      if (selectedProfile) {
        targetUserId = selectedProfile.id;
        targetUserEmail = selectedProfile.email;
      }
      setShowAccountPrompt(false); // No prompt when admin is viewing a specific user
    } else if (loggedInUser) { // Regular logged-in user or admin viewing their own dashboard
      targetUserId = loggedInUser.id;
      targetUserEmail = loggedInUser.email;
      setShowAccountPrompt(false);
    } else if (emailFromUrl) { // Guest viewing via email link
      fetchGuestRequestsByEmail(emailFromUrl);
      setShowAccountPrompt(true);
      // setLoading(false); // Handled by fetchGuestRequestsByEmail
      return; // Exit early as guest requests are handled
    } else { // Not logged in, no email in URL
      navigate('/login');
      // setLoading(false); // Handled by navigation
      return; // Exit early as navigation happens
    }

    if (targetUserId || targetUserEmail) {
      fetchRequestsForTarget(targetUserId, targetUserEmail);
    } else {
      setRequests([]); // No requests to show if no target user
      setLoading(false);
    }
  }, [navigate, selectedUserForView, allUsersForAdmin, user, fetchRequestsForTarget, fetchGuestRequestsByEmail, toast]);

  // Effect for initial load and auth state changes
  useEffect(() => {
    checkUserAndDetermineTarget();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserAndDetermineTarget(); // Re-run on auth state change
    });
    return () => subscription.unsubscribe();
  }, [checkUserAndDetermineTarget]);

  // NEW: Effect for fetching all users for admin dropdown, decoupled from main auth check
  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!isAdmin || !user) { // Only fetch if admin and user object is available
        setAllUsersForAdmin([]);
        return;
      }
      setLoadingAllUsersForAdmin(true);
      try {
        const { data: { session } } = await supabase.auth.getSession(); // Get fresh session for token
        if (!session) throw new Error('No active session for admin user.');

        const response = await fetch(
          `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/list-all-users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}` // Admin token
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
        setAllUsersForAdmin([]); // Clear users on error
      } finally {
        setLoadingAllUsersForAdmin(false);
      }
    };

    fetchAllUsers();
  }, [isAdmin, user, toast]); // Dependencies: isAdmin and user (to ensure token is available)


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><CheckCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const downloadTrack = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Track Not Available",
        description: "This track is not yet available for download.",
        variant: "destructive",
      });
    }
  };

  const createAccount = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1C0357]">Your Tracks Dashboard</h1>
            <p className="text-lg text-[#1C0357]/90">Access your backing tracks and request history</p>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-[#1C0357]" />
              <Select
                value={selectedUserForView || ''}
                onValueChange={(value) => setSelectedUserForView(value === 'admin-self' ? null : value)}
                disabled={loadingAllUsersForAdmin} // Disable select while loading users
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={loadingAllUsersForAdmin ? "Loading users..." : "View as user..."} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin-self">View My Own Dashboard</SelectItem>
                  {allUsersForAdmin.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {showAccountPrompt && (
          <Alert className="mb-6 bg-[#1C0357] text-white border-[#1C0357]">
            <UserPlus className="h-4 w-4" />
            <AlertTitle>Create an Account</AlertTitle>
            <AlertDescription>
              <p className="mb-3">
                You're viewing your tracks as a guest. Create an account to save your requests, 
                access all your tracks in one place, and get notified about updates!
              </p>
              <Button 
                onClick={createAccount}
                className="bg-white text-[#1C0357] hover:bg-gray-100"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
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
                  <p className="text-sm font-medium text-gray-500">Completed Tracks</p>
                  <p className="text-2xl font-bold text-[#1C0357]">
                    {requests.filter(r => r.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-[#1C0357]">
                    {requests.filter(r => r.status === 'in-progress').length}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
              <span className="flex items-center">
                <Music className="mr-2" />
                Your Backing Track Requests
              </span>
              <Link to="/form-page">
                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                  Order New Track
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p>Loading your requests...</p>
              </div>
            ) : (
              <div className=" rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Song</TableHead>
                      <TableHead>Backing Type</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-center">
                            <Music className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests yet</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Get started by ordering your first backing track.
                            </p>
                            <div className="mt-6">
                              <Link to="/form-page">
                                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                                  Order Your First Track
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => {
                        const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="font-medium">{format(new Date(request.created_at), 'MMM dd, yyyy')}</div>
                              <div className="text-sm text-gray-500">{format(new Date(request.created_at), 'HH:mm')}</div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>{request.song_title}</div>
                              <div className="text-sm text-gray-500">{request.musical_or_artist}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                                  <Badge key={index} variant="outline" className="capitalize">
                                    {type.replace('-', ' ')}
                                  </Badge>
                                )) : <Badge variant="outline">Not specified</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                                {request.delivery_date 
                                  ? format(new Date(request.delivery_date), 'MMM dd, yyyy') 
                                  : 'Not specified'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {request.status === 'completed' && request.track_urls && request.track_urls.length > 0 && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => downloadTrack(request.track_urls[0].url)} // Assuming first track_url for download
                                  >
                                    <Download className="w-4 h-4 mr-1" /> Download
                                  </Button>
                                )}
                                <Link to={`/track/${request.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-1" /> View Details
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">
                How to Access Your Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Download className="h-5 w-5 text-[#1C0357] mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-semibold">Download Tracks</h3>
                    <p className="text-sm text-gray-600">Click the Download button next to completed requests to get your backing track.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Eye className="h-5 w-5 text-[#1C0357] mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-semibold">View Track Details</h3>
                    <p className="text-sm text-gray-600">Click "View Details" to see your order information, payment options, and download your track when ready.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <UserPlus className="h-5 w-5 text-[#1C0357] mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-semibold">Create Account</h3>
                    <p className="text-sm text-gray-600">Save all your requests and access them anytime from your dashboard.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Having trouble accessing your tracks? Contact support for assistance.
                </p>
                <Button 
                  className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90"
                  onClick={() => window.location.href = 'mailto:pianobackingsbydaniele@gmail.com'}
                >
                  Contact Support
                </Button>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Quick Links</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/form-page" className="text-[#1C0357] hover:underline flex items-center">
                        <Music className="mr-2 h-4 w-4" /> Order New Track
                      </Link>
                    </li>
                    <li>
                      <Link to="/#pricing" className="text-[#1C0357] hover:underline flex items-center">
                        <span className="mr-2">💰</span> View Pricing
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default UserDashboard;
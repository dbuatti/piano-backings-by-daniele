import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showError } from '@/utils/toast'; // Updated import
import { format } from 'date-fns';
import { Download, Play, Share2, Music, UserPlus, Calendar, Clock, CheckCircle, Eye, User as UserIcon, ChevronDown, ShoppingCart } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSafeBackingTypes, downloadTrack, TrackInfo } from '@/utils/helpers'; // Import downloadTrack and TrackInfo
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

// TrackInfo interface is now imported from helpers.ts
// interface TrackInfo {
//   url: string;
//   caption: string | boolean | null | undefined;
// }

interface Product {
  id: string; // Add id to Product interface for joining
  title: string;
  description: string;
  track_urls?: TrackInfo[];
}

interface Order {
  id: string;
  product_id: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  user_id?: string;
  products?: Product; // Joined product details
  checkout_session_id: string;
}

const UserDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<Order[]>([]); // New state for purchases
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true); // New loading state for purchases
  const [user, setUser] = useState<any>(null); // The currently logged-in user
  const [showAccountPrompt, setShowAccountPrompt] = useState(false); // State to control visibility of the new card
  const navigate = useNavigate();
  // Removed: const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsersForAdmin, setAllUsersForAdmin] = useState<UserProfileForAdmin[]>([]);
  const allUsersForAdminRef = useRef<UserProfileForAdmin[]>([]); // Create a ref for allUsersForAdmin
  const [loadingAllUsersForAdmin, setLoadingAllUsersForAdmin] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState<string | null>(null);

  // Update the ref whenever allUsersForAdmin state changes
  useEffect(() => {
    allUsersForAdminRef.current = allUsersForAdmin;
  }, [allUsersForAdmin]);

  const fetchRequestsForTarget = useCallback(async (targetUserId: string | null, targetUserEmail: string | null, guestRequestId: string | null, guestAccessToken: string | null) => {
    setLoading(true);
    try {
      let fetchedRequests: any[] = [];

      if (targetUserId) {
        // Authenticated user
        const { data, error } = await supabase.from('backing_requests').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false });
        if (error) throw error;
        fetchedRequests = data || [];
      } else if (guestRequestId && guestAccessToken) {
        // Anonymous user with secure token
        const response = await fetch(
          `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/get-guest-request-by-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ request_id: guestRequestId, token: guestAccessToken }),
          }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || `Failed to fetch guest request: ${response.status} ${response.statusText}`);
        }
        fetchedRequests = result.request ? [result.request] : [];
      } else if (targetUserEmail) {
        // Fallback for guest access by email (less secure, but might be needed for older links)
        // This path should ideally be deprecated in favor of token-based access
        const { data, error } = await supabase.from('backing_requests').select('*').ilike('email', targetUserEmail).order('created_at', { ascending: false });
        if (error) throw error;
        fetchedRequests = data || [];
      } else {
        throw new Error('No valid identifier provided for fetching requests.');
      }

      setRequests(fetchedRequests);
    } catch (error: any) {
      showError("Error", `Failed to fetch backing requests: ${error.message}`); // Updated toast call
    } finally {
      setLoading(false);
    }
  }, []); // Removed toast from dependency array

  const fetchPurchasesForTarget = useCallback(async (targetUserId: string | null, targetUserEmail: string | null) => {
    setLoadingPurchases(true);
    try {
      // 1. Fetch orders without embedding
      let ordersQuery = supabase.from('orders').select('*').order('created_at', { ascending: false });

      if (targetUserId) {
        ordersQuery = ordersQuery.eq('user_id', targetUserId);
      } else if (targetUserEmail) {
        ordersQuery = ordersQuery.ilike('customer_email', targetUserEmail);
      } else {
        throw new Error('No target user ID or email provided for fetching purchases.');
      }

      const { data: ordersData, error: ordersError } = await ordersQuery; // Fixed: Await the query

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setPurchases([]);
        setLoadingPurchases(false);
        return;
      }

      // 2. Extract unique product_ids
      const productIds = [...new Set(ordersData.map(order => order.product_id))];

      // 3. Fetch products separately
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, title, description, track_urls');

      if (productsError) throw productsError;

      const productsMap = new Map<string, Product>();
      productsData?.forEach(product => productsMap.set(product.id, product));

      // 4. Manually join products into orders
      const joinedPurchases: Order[] = ordersData.map(order => ({
        ...order,
        products: productsMap.get(order.product_id) || undefined,
      }));
      
      setPurchases(joinedPurchases);
    } catch (error: any) {
      showError("Error", `Failed to fetch purchases: ${error.message}`); // Updated toast call
    } finally {
      setLoadingPurchases(false);
    }
  }, []); // Removed toast from dependency array

  // Main function to check user and determine which data to fetch
  const checkUserAndDetermineTarget = useCallback(async () => {
    setLoading(true);
    setLoadingPurchases(true);

    const { data: { session } } = await supabase.auth.getSession();
    const loggedInUser = session?.user;
    setUser(loggedInUser);

    let currentIsAdmin = false;
    if (loggedInUser?.email) {
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      currentIsAdmin = adminEmails.includes(loggedInUser.email);
      setIsAdmin(currentIsAdmin);
    } else {
      setIsAdmin(false);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const guestRequestId = urlParams.get('request_id');
    const guestAccessToken = urlParams.get('token');
    const emailFromUrl = urlParams.get('email'); // Keep for purchases and potential fallback

    let targetUserId: string | null = null;
    let targetUserEmail: string | null = null;

    if (selectedUserForView) {
      // Admin viewing another user
      const selectedProfile = allUsersForAdminRef.current.find(u => u.id === selectedUserForView);
      if (selectedProfile) {
        targetUserId = selectedProfile.id;
        targetUserEmail = selectedProfile.email;
      }
      setShowAccountPrompt(false);
    } else if (loggedInUser) {
      // Logged-in user viewing their own dashboard
      targetUserId = loggedInUser.id;
      targetUserEmail = loggedInUser.email;
      setShowAccountPrompt(false);
    } else if (guestRequestId && guestAccessToken) {
      // Anonymous user accessing via secure token link
      fetchRequestsForTarget(null, null, guestRequestId, guestAccessToken);
      // For purchases, we still rely on email for now as orders don't have guest_access_token
      fetchPurchasesForTarget(null, emailFromUrl); 
      setShowAccountPrompt(true);
      return;
    } else if (emailFromUrl) {
      // Fallback for older guest links that only use email (less secure)
      fetchRequestsForTarget(null, emailFromUrl, null, null);
      fetchPurchasesForTarget(null, emailFromUrl);
      setShowAccountPrompt(true);
      return;
    } else {
      // Not logged in, no secure token, no email in URL
      navigate('/login');
      return;
    }

    if (targetUserId || targetUserEmail) {
      fetchRequestsForTarget(targetUserId, targetUserEmail, null, null);
      fetchPurchasesForTarget(targetUserId, targetUserEmail);
    } else {
      setRequests([]);
      setPurchases([]);
      setLoading(false);
      setLoadingPurchases(false);
    }
  }, [navigate, selectedUserForView, fetchRequestsForTarget, fetchPurchasesForTarget, setUser, setIsAdmin, setShowAccountPrompt]); // Removed toast from dependency array

  // Effect for initial load and auth state changes
  useEffect(() => {
    checkUserAndDetermineTarget();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserAndDetermineTarget();
    });
    return () => subscription.unsubscribe();
  }, [checkUserAndDetermineTarget]);

  // Effect for fetching all users for admin dropdown, decoupled from main auth check
  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!isAdmin || !user) {
        setAllUsersForAdmin([]);
        return;
      }
      setLoadingAllUsersForAdmin(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session for admin user.');

        const response = await fetch(
          `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/list-all-users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
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
        showError("Error", `Failed to load users for admin view: ${error.message}`); // Updated toast call
        setAllUsersForAdmin([]);
      } finally {
        setLoadingAllUsersForAdmin(false);
      }
    };

    fetchAllUsers();
  }, [isAdmin, user]); // Removed toast from dependency array


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

  // downloadTrack function is now imported from helpers.ts
  // const downloadTrack = (url: string, filenameSuggestion: string | boolean | null | undefined = 'download') => { ... };

  const createAccount = () => {
    navigate('/login');
  };
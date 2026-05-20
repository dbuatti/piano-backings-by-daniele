import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Shield, 
  CreditCard, 
  ShoppingBag, 
  Music, 
  Search, 
  Loader2, 
  Plus, 
  Minus, 
  History, 
  Eye, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Mail, 
  Phone, 
  ExternalLink, 
  UserCheck, 
  UserMinus,
  ArrowUpDown,
  Filter,
  RefreshCw
} from 'lucide-react';
import { ADMIN_EMAILS } from '@/utils/helpers';
import { setImpersonatedUser } from '@/utils/impersonation';

interface UserItem {
  id: string;
  email: string;
  name: string;
}

interface ProfileItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

interface CreditItem {
  id: string;
  user_id: string;
  credit_type: string;
  balance: number;
  updated_at: string;
  expires_at: string | null;
}

interface OrderItem {
  id: string;
  user_id: string | null;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  products?: {
    title: string;
  } | null;
}

interface BackingRequestItem {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  song_title: string;
  musical_or_artist: string;
  status: string;
  track_type: string | null;
  is_paid: boolean | null;
  internal_notes: string | null;
  created_at: string;
}

interface CombinedUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isRegistered: boolean;
  isAdmin: boolean;
  credits: {
    auditionReady: number;
    polished: number;
  };
  requestsCount: number;
  ordersCount: number;
  totalSpent: number;
}

export const UsersTabContent: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Raw data states
  const [authUsers, setAuthUsers] = useState<UserItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [requests, setRequests] = useState<BackingRequestItem[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [creditFilter, setCreditFilter] = useState<'all' | 'has_credits' | 'no_credits'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'has_requests' | 'has_orders' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'requests' | 'orders' | 'credits'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Combined users list
  const [combinedUsers, setCombinedUsers] = useState<CombinedUser[]>([]);

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<CombinedUser | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [adjustCreditsDialogOpen, setAdjustCreditsDialogOpen] = useState(false);

  // Edit profile form states
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Adjust credits form states
  const [adjustCreditType, setAdjustCreditType] = useState<'audition-ready' | 'polished'>('audition-ready');
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustingCredits, setAdjustingCredits] = useState(false);

  // Manual grant states (quick grant)
  const [quickGrantUserId, setQuickGrantUserId] = useState<string>('');
  const [quickGrantType, setQuickGrantType] = useState<'audition-ready' | 'polished'>('audition-ready');
  const [quickGrantAmount, setQuickGrantAmount] = useState<number>(3);
  const [quickGranting, setQuickGranting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // 1. Fetch auth users from edge function
      let fetchedAuthUsers: UserItem[] = [];
      try {
        const usersResponse = await fetch('https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/list-all-users', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          fetchedAuthUsers = usersData.users || [];
          setAuthUsers(fetchedAuthUsers);
        }
      } catch (e) {
        console.error("Failed to fetch auth users:", e);
      }

      // 2. Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // 3. Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*');
      if (creditsError) throw creditsError;
      setCredits(creditsData || []);

      // 4. Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          customer_email,
          amount,
          currency,
          status,
          created_at,
          products (
            title
          )
        `);
      if (ordersError) throw ordersError;
      setOrders((ordersData as any) || []);

      // 5. Fetch backing requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('backing_requests')
        .select('id, user_id, email, name, song_title, musical_or_artist, status, track_type, is_paid, internal_notes, created_at')
        .order('created_at', { ascending: false });
      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

    } catch (error: any) {
      console.error("Error fetching users data:", error);
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process and combine data whenever raw data changes
  useEffect(() => {
    // Create a map of all unique users by email and ID
    const userMap = new Map<string, CombinedUser>();

    // Helper to get or create user entry
    const getOrCreateUser = (email: string, id: string, isRegistered: boolean): CombinedUser => {
      const key = email.toLowerCase();
      if (userMap.has(key)) {
        const existing = userMap.get(key)!;
        if (isRegistered && !existing.isRegistered) {
          existing.isRegistered = true;
          existing.id = id;
        }
        return existing;
      }

      const newUser: CombinedUser = {
        id,
        email: key,
        name: email.split('@')[0],
        firstName: '',
        lastName: '',
        avatarUrl: null,
        isRegistered,
        isAdmin: ADMIN_EMAILS.includes(key),
        credits: { auditionReady: 0, polished: 0 },
        requestsCount: 0,
        ordersCount: 0,
        totalSpent: 0
      };
      userMap.set(key, newUser);
      return newUser;
    };

    // 1. Add registered auth users
    authUsers.forEach(u => {
      const entry = getOrCreateUser(u.email, u.id, true);
      entry.name = u.name;
    });

    // 2. Add profiles data
    profiles.forEach(p => {
      // Find auth user to get email
      const authUser = authUsers.find(au => au.id === p.id);
      const email = authUser?.email || requests.find(r => r.user_id === p.id)?.email || orders.find(o => o.user_id === p.id)?.customer_email;
      
      if (email) {
        const entry = getOrCreateUser(email, p.id, true);
        entry.firstName = p.first_name || '';
        entry.lastName = p.last_name || '';
        entry.avatarUrl = p.avatar_url;
        if (p.first_name || p.last_name) {
          entry.name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        }
      }
    });

    // 3. Add credits data
    credits.forEach(c => {
      const authUser = authUsers.find(au => au.id === c.user_id);
      const email = authUser?.email || requests.find(r => r.user_id === c.user_id)?.email || orders.find(o => o.user_id === c.user_id)?.customer_email;
      
      if (email) {
        const entry = getOrCreateUser(email, c.user_id, true);
        if (c.credit_type === 'audition-ready' || c.credit_type === 'audition') {
          entry.credits.auditionReady = c.balance;
        } else {
          entry.credits.polished = c.balance;
        }
      }
    });

    // 4. Add backing requests data (including guest users)
    requests.forEach(r => {
      const entry = getOrCreateUser(r.email, r.user_id || r.email, !!r.user_id);
      entry.requestsCount += 1;
      if (!entry.name || entry.name === r.email.split('@')[0]) {
        if (r.name) entry.name = r.name;
      }
    });

    // 5. Add orders data (including guest users)
    orders.forEach(o => {
      const entry = getOrCreateUser(o.customer_email, o.user_id || o.customer_email, !!o.user_id);
      entry.ordersCount += 1;
      if (o.status === 'completed' || o.status === 'paid') {
        entry.totalSpent += Number(o.amount) || 0;
      }
    });

    setCombinedUsers(Array.from(userMap.values()));
  }, [authUsers, profiles, credits, orders, requests]);

  // Filter and sort combined users
  const filteredUsers = combinedUsers.filter(user => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.id.toLowerCase().includes(searchLower);

    // Role filter
    const matchesRole = 
      roleFilter === 'all' ||
      (roleFilter === 'admin' && user.isAdmin) ||
      (roleFilter === 'user' && !user.isAdmin);

    // Credits filter
    const matchesCredits = 
      creditFilter === 'all' ||
      (creditFilter === 'has_credits' && (user.credits.auditionReady > 0 || user.credits.polished > 0)) ||
      (creditFilter === 'no_credits' && user.credits.auditionReady === 0 && user.credits.polished === 0);

    // Activity filter
    const matchesActivity = 
      activityFilter === 'all' ||
      (activityFilter === 'has_requests' && user.requestsCount > 0) ||
      (activityFilter === 'has_orders' && user.ordersCount > 0) ||
      (activityFilter === 'inactive' && user.requestsCount === 0 && user.ordersCount === 0);

    return matchesSearch && matchesRole && matchesCredits && matchesActivity;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'email') {
      comparison = a.email.localeCompare(b.email);
    } else if (sortBy === 'requests') {
      comparison = a.requestsCount - b.requestsCount;
    } else if (sortBy === 'orders') {
      comparison = a.ordersCount - b.ordersCount;
    } else if (sortBy === 'credits') {
      const totalA = a.credits.auditionReady + a.credits.polished;
      const totalB = b.credits.auditionReady + b.credits.polished;
      comparison = totalA - totalB;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Impersonate user
  const handleImpersonate = (user: CombinedUser) => {
    setImpersonatedUser({
      id: user.id,
      email: user.email,
      name: user.name
    });
    toast({
      title: "Impersonation Active",
      description: `You are now viewing the app as ${user.name}.`,
    });
    navigate('/user-dashboard');
  };

  // Open edit profile dialog
  const handleOpenEditProfile = (user: CombinedUser) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditProfileDialogOpen(true);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSavingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: selectedUser.id,
          first_name: editFirstName,
          last_name: editLastName,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: `Successfully updated profile for ${selectedUser.email}.`,
      });

      setEditProfileDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Open adjust credits dialog
  const handleOpenAdjustCredits = (user: CombinedUser) => {
    setSelectedUser(user);
    setAdjustCreditType('audition-ready');
    setAdjustAmount(1);
    setAdjustType('add');
    setAdjustCreditsDialogOpen(true);
  };

  // Save credit adjustment
  const handleAdjustCredits = async () => {
    if (!selectedUser) return;
    setAdjustingCredits(true);

    const dbCreditType = adjustCreditType === 'audition-ready' ? 'audition-ready' : 'polished';
    const change = adjustType === 'add' ? adjustAmount : -adjustAmount;
    
    // Find existing credit balance
    const existingCredit = credits.find(c => c.user_id === selectedUser.id && c.credit_type === dbCreditType);
    const currentBalance = existingCredit ? existingCredit.balance : 0;
    const newBalance = Math.max(0, currentBalance + change);

    try {
      if (existingCredit) {
        const { error } = await supabase
          .from('user_credits')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCredit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_credits')
          .insert({
            user_id: selectedUser.id,
            credit_type: dbCreditType,
            balance: newBalance,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      toast({
        title: "Credits Adjusted",
        description: `Successfully updated balance to ${newBalance} credits.`,
      });

      setAdjustCreditsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error adjusting credits",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAdjustingCredits(false);
    }
  };

  // Quick grant credits
  const handleQuickGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGrantUserId) {
      toast({
        title: "Validation Error",
        description: "Please select a user to grant credits to.",
        variant: "destructive"
      });
      return;
    }

    setQuickGranting(true);
    const dbCreditType = quickGrantType === 'audition-ready' ? 'audition-ready' : 'polished';

    try {
      const existingCredit = credits.find(c => c.user_id === quickGrantUserId && c.credit_type === dbCreditType);

      if (existingCredit) {
        const { error } = await supabase
          .from('user_credits')
          .update({
            balance: existingCredit.balance + quickGrantAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCredit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_credits')
          .insert({
            user_id: quickGrantUserId,
            credit_type: dbCreditType,
            balance: quickGrantAmount,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      const targetUser = combinedUsers.find(u => u.id === quickGrantUserId);
      toast({
        title: "Credits Granted",
        description: `Granted ${quickGrantAmount} ${quickGrantType} credits to ${targetUser?.name || 'user'}.`,
      });

      setQuickGrantUserId('');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error granting credits",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setQuickGranting(false);
    }
  };

  // Get user's requests
  const getUserRequests = (userId: string, email: string) => {
    return requests.filter(r => r.user_id === userId || r.email.toLowerCase() === email.toLowerCase());
  };

  // Get user's orders
  const getUserOrders = (userId: string, email: string) => {
    return orders.filter(o => o.user_id === userId || o.customer_email.toLowerCase() === email.toLowerCase());
  };

  return (
    <div className="space-y-8 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Users</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">{combinedUsers.length}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {combinedUsers.filter(u => u.isRegistered).length} registered, {combinedUsers.filter(u => !u.isRegistered).length} guests
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Outstanding Credits</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">
                {credits.reduce((acc, curr) => acc + curr.balance, 0)}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {credits.filter(c => c.credit_type === 'audition-ready' || c.credit_type === 'audition').reduce((acc, curr) => acc + curr.balance, 0)} Audition, {credits.filter(c => c.credit_type !== 'audition-ready' && c.credit_type !== 'audition').reduce((acc, curr) => acc + curr.balance, 0)} Polished
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Shop Orders</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">{orders.length}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Total Revenue: ${orders.filter(o => o.status === 'completed' || o.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Music className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Backing Requests</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">{requests.length}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {requests.filter(r => r.status === 'completed').length} completed, {requests.filter(r => r.status === 'in_progress' || r.status === 'in-progress').length} in progress
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Users Directory */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-[#1C0357]">User Directory</CardTitle>
                  <CardDescription>Manage registered clients, guest accounts, credits, and view activity.</CardDescription>
                </div>
                <Button 
                  onClick={fetchData} 
                  variant="outline" 
                  size="sm" 
                  className="self-start md:self-auto rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
                </Button>
              </div>

              {/* Filters and Search */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                <div className="relative col-span-1 md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-xl border-gray-200"
                  />
                </div>

                <div>
                  <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-gray-400" />
                        <SelectValue placeholder="Role" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="user">Regular Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={creditFilter} onValueChange={(v: any) => setCreditFilter(v)}>
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                        <SelectValue placeholder="Credits" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Credits</SelectItem>
                      <SelectItem value="has_credits">Has Credits</SelectItem>
                      <SelectItem value="no_credits">No Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1C0357] mb-2" />
                  <p className="text-sm text-gray-500">Loading user directory...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No users found matching your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-100">
                        <TableHead className="font-bold text-gray-600 cursor-pointer" onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-1">
                            User <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="font-bold text-gray-600 text-center cursor-pointer" onClick={() => handleSort('credits')}>
                          <div className="flex items-center justify-center gap-1">
                            Credits <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="font-bold text-gray-600 text-center cursor-pointer" onClick={() => handleSort('requests')}>
                          <div className="flex items-center justify-center gap-1">
                            Requests <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="font-bold text-gray-600 text-center cursor-pointer" onClick={() => handleSort('orders')}>
                          <div className="flex items-center justify-center gap-1">
                            Orders <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="font-bold text-gray-600 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-gray-100 hover:bg-gray-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-gray-100">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback className="bg-purple-50 text-purple-700 font-bold text-xs">
                                  {user.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900 text-sm">{user.name}</span>
                                  {user.isAdmin && (
                                    <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50 text-[10px] px-1.5 py-0">
                                      Admin
                                    </Badge>
                                  )}
                                  {!user.isRegistered && (
                                    <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 text-[10px] px-1.5 py-0">
                                      Guest
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-50 text-[10px] px-1.5 py-0">
                                  A: {user.credits.auditionReady}
                                </Badge>
                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 text-[10px] px-1.5 py-0">
                                  P: {user.credits.polished}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-bold text-gray-700">{user.requestsCount}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-bold text-gray-700">{user.ordersCount}</span>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                              title="View Details"
                              onClick={() => {
                                setSelectedUser(user);
                                setDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user.isRegistered && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg text-purple-600 hover:text-purple-900 hover:bg-purple-50"
                                  title="Impersonate User"
                                  onClick={() => handleImpersonate(user)}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                                  title="Adjust Credits"
                                  onClick={() => handleOpenAdjustCredits(user)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Grant & Help */}
        <div className="space-y-6">
          {/* Quick Grant Form */}
          <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#1C0357] flex items-center">
                <Plus className="mr-2 h-5 w-5 text-green-600" />
                Quick Grant Credits
              </CardTitle>
              <CardDescription>
                Directly grant credits to any registered user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuickGrant} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quick-grant-user" className="font-bold text-gray-700">Select User</Label>
                  <Select value={quickGrantUserId} onValueChange={setQuickGrantUserId}>
                    <SelectTrigger id="quick-grant-user" className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {combinedUsers.filter(u => u.isRegistered).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-grant-type" className="font-bold text-gray-700">Credit Type</Label>
                  <Select value={quickGrantType} onValueChange={(v: any) => setQuickGrantType(v)}>
                    <SelectTrigger id="quick-grant-type" className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Select credit type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audition-ready">Audition Ready (Season Pack)</SelectItem>
                      <SelectItem value="polished">Polished Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-grant-amount" className="font-bold text-gray-700">Amount of Credits</Label>
                  <Input
                    id="quick-grant-amount"
                    type="number"
                    min="1"
                    max="50"
                    value={quickGrantAmount}
                    onChange={(e) => setQuickGrantAmount(parseInt(e.target.value) || 1)}
                    className="rounded-xl border-gray-200"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={quickGranting || !quickGrantUserId}
                  className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold rounded-xl py-6 shadow-sm mt-2"
                >
                  {quickGranting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Grant Credits
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Impersonation Help */}
          <Card className="bg-gradient-to-br from-[#1C0357] to-[#2D0B7C] text-white border-none shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h4 className="font-bold text-lg text-[#F1E14F] flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Impersonation Mode
              </h4>
              <p className="text-sm text-white/90 leading-relaxed">
                Impersonation allows you to log in as any registered client to view their dashboard, check their tracks, and troubleshoot issues exactly as they see them.
              </p>
              <div className="text-xs bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                <p className="font-bold text-white">How to use:</p>
                <ol className="list-decimal pl-4 space-y-1 text-white/80">
                  <li>Click the <UserCheck className="inline h-3.5 w-3.5 mx-0.5" /> icon next to any user.</li>
                  <li>You will be redirected to their dashboard.</li>
                  <li>A banner will appear at the top of the screen.</li>
                  <li>Click "Stop Impersonating" to return to admin mode.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="rounded-2xl max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-gray-100">
                    <AvatarImage src={selectedUser.avatarUrl || undefined} />
                    <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-lg">
                      {selectedUser.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-[#1C0357] flex items-center gap-2">
                      {selectedUser.name}
                      {selectedUser.isAdmin && (
                        <Badge className="bg-red-50 text-red-700 border-red-100">Admin</Badge>
                      )}
                      {!selectedUser.isRegistered && (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200">Guest Account</Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                      <Mail className="h-3.5 w-3.5" /> {selectedUser.email}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100/50 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg font-bold">Overview</TabsTrigger>
                  <TabsTrigger value="requests" className="rounded-lg font-bold">Requests ({selectedUser.requestsCount})</TabsTrigger>
                  <TabsTrigger value="orders" className="rounded-lg font-bold">Orders ({selectedUser.ordersCount})</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 mt-4">
                  {/* Credit Balances */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Audition Ready Credits</p>
                        <p className="text-3xl font-black text-purple-900 mt-1">{selectedUser.credits.auditionReady}</p>
                      </div>
                      {selectedUser.isRegistered && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-100"
                          onClick={() => {
                            setAdjustCreditType('audition-ready');
                            setAdjustAmount(1);
                            setAdjustType('add');
                            setAdjustCreditsDialogOpen(true);
                          }}
                        >
                          Adjust
                        </Button>
                      )}
                    </div>

                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Polished Track Credits</p>
                        <p className="text-3xl font-black text-blue-900 mt-1">{selectedUser.credits.polished}</p>
                      </div>
                      {selectedUser.isRegistered && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-100"
                          onClick={() => {
                            setAdjustCreditType('polished');
                            setAdjustAmount(1);
                            setAdjustType('add');
                            setAdjustCreditsDialogOpen(true);
                          }}
                        >
                          Adjust
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* User Metadata */}
                  <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                    <h4 className="font-bold text-gray-800 text-sm">Account Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block">User ID</span>
                        <span className="font-mono text-xs text-gray-700 break-all">{selectedUser.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Account Type</span>
                        <span className="font-bold text-gray-700">
                          {selectedUser.isRegistered ? 'Registered Client' : 'Guest / Anonymous'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">First Name</span>
                        <span className="font-bold text-gray-700">{selectedUser.firstName || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Last Name</span>
                        <span className="font-bold text-gray-700">{selectedUser.lastName || 'Not set'}</span>
                      </div>
                    </div>

                    {selectedUser.isRegistered && (
                      <div className="pt-2 border-t border-gray-200 flex justify-end">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-100"
                          onClick={() => handleOpenEditProfile(selectedUser)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    {selectedUser.isRegistered && (
                      <Button 
                        className="flex-1 bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold rounded-xl py-5"
                        onClick={() => handleImpersonate(selectedUser)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" /> Impersonate User
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* Requests Tab */}
                <TabsContent value="requests" className="mt-4">
                  {getUserRequests(selectedUser.id, selectedUser.email).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No backing requests found for this user.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                      {getUserRequests(selectedUser.id, selectedUser.email).map((req) => (
                        <div key={req.id} className="p-4 rounded-xl border border-gray-100 bg-white flex justify-between items-center">
                          <div>
                            <h5 className="font-bold text-gray-900 text-sm">{req.song_title}</h5>
                            <p className="text-xs text-gray-500">{req.musical_or_artist}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Requested on {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              req.status === 'completed' 
                                ? "bg-green-50 text-green-700 border-green-200"
                                : req.status === 'in_progress' || req.status === 'in-progress'
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }>
                              {req.status}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900"
                              onClick={() => {
                                setDetailsDialogOpen(false);
                                navigate(`/admin/request/${req.id}`);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="mt-4">
                  {getUserOrders(selectedUser.id, selectedUser.email).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No shop orders found for this user.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                      {getUserOrders(selectedUser.id, selectedUser.email).map((order) => (
                        <div key={order.id} className="p-4 rounded-xl border border-gray-100 bg-white flex justify-between items-center">
                          <div>
                            <h5 className="font-bold text-gray-900 text-sm">
                              {order.products?.title || 'Shop Product'}
                            </h5>
                            <p className="text-xs text-gray-500">
                              Order ID: <span className="font-mono text-[10px]">{order.id.substring(0, 8)}...</span>
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Placed on {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-gray-900 text-sm block">
                              ${Number(order.amount).toFixed(2)}
                            </span>
                            <Badge className={
                              order.status === 'completed' || order.status === 'paid'
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="border-t pt-4 mt-6">
                <Button
                  onClick={() => setDetailsDialogOpen(false)}
                  className="rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold w-full md:w-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C0357]">Edit User Profile</DialogTitle>
            <DialogDescription>
              Update profile details for {selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name" className="font-bold text-gray-700">First Name</Label>
              <Input
                id="edit-first-name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="rounded-xl border-gray-200"
                placeholder="First name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-last-name" className="font-bold text-gray-700">Last Name</Label>
              <Input
                id="edit-last-name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="rounded-xl border-gray-200"
                placeholder="Last name"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditProfileDialogOpen(false)}
              className="rounded-xl border-gray-200 font-bold"
              disabled={savingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              className="rounded-xl bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold"
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Credits Dialog */}
      <Dialog open={adjustCreditsDialogOpen} onOpenChange={setAdjustCreditsDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C0357]">Adjust Credits</DialogTitle>
            <DialogDescription>
              Modify credit balance for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Credit Type</Label>
              <Select value={adjustCreditType} onValueChange={(v: any) => setAdjustCreditType(v)}>
                <SelectTrigger className="rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audition-ready">Audition Ready (Season Pack)</SelectItem>
                  <SelectItem value="polished">Polished Track</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="font-bold text-gray-700">Adjustment Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={adjustType === 'add' ? 'default' : 'outline'}
                  onClick={() => setAdjustType('add')}
                  className={`rounded-xl font-bold py-5 ${adjustType === 'add' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-gray-200 text-gray-700'}`}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Credits
                </Button>
                <Button
                  type="button"
                  variant={adjustType === 'subtract' ? 'default' : 'outline'}
                  onClick={() => setAdjustType('subtract')}
                  className={`rounded-xl font-bold py-5 ${adjustType === 'subtract' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-gray-200 text-gray-700'}`}
                >
                  <Minus className="mr-2 h-4 w-4" /> Subtract Credits
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-amount" className="font-bold text-gray-700">Amount</Label>
              <Input
                id="adjust-amount"
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 1)}
                className="rounded-xl border-gray-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAdjustCreditsDialogOpen(false)}
              className="rounded-xl border-gray-200 font-bold"
              disabled={adjustingCredits}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustCredits}
              className="rounded-xl bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold"
              disabled={adjustingCredits}
            >
              {adjustingCredits ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

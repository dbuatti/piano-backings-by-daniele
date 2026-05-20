import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { 
  CreditCard, 
  User, 
  Plus, 
  Minus, 
  History, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Music
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  name: string;
}

interface CreditItem {
  id: string;
  user_id: string;
  credit_type: string;
  balance: number;
  updated_at: string;
  expires_at: string | null;
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

export const CreditsTabContent: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [requests, setRequests] = useState<BackingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  
  // Manual grant states
  const [grantUserId, setGrantUserId] = useState<string>('');
  const [grantCreditType, setGrantCreditType] = useState<string>('audition-ready');
  const [grantAmount, setGrantAmount] = useState<number>(3);
  const [granting, setGranting] = useState(false);

  // Track view states
  const [tracksDialogOpen, setTracksDialogOpen] = useState(false);
  const [selectedUserForTracks, setSelectedUserForTracks] = useState<UserItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // 1. Fetch all users from edge function
      const usersResponse = await fetch('https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/list-all-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      let fetchedUsers: UserItem[] = [];
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        fetchedUsers = usersData.users || [];
        setUsers(fetchedUsers);
      } else {
        console.error("Failed to fetch users from edge function");
      }

      // 2. Fetch all credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (creditsError) throw creditsError;
      setCredits(creditsData || []);

      // 3. Fetch backing requests to see track usage
      const { data: requestsData, error: requestsError } = await supabase
        .from('backing_requests')
        .select('id, user_id, email, name, song_title, musical_or_artist, status, track_type, is_paid, internal_notes, created_at')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

    } catch (error: any) {
      console.error("Error fetching credits data:", error);
      toast({
        title: "Error loading credits",
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

  // Helper to get user details
  const getUserDetails = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) return user;
    
    // Fallback if user not in list-all-users (e.g. deleted or edge case)
    // Try to find from requests or orders
    const requestWithUser = requests.find(r => r.user_id === userId);
    return {
      id: userId,
      email: requestWithUser?.email || 'Unknown Email',
      name: requestWithUser?.name || 'Unknown User'
    };
  };

  // Handle manual credit grant
  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId) {
      toast({
        title: "Validation Error",
        description: "Please select a user to grant credits to.",
        variant: "destructive"
      });
      return;
    }

    setGranting(true);
    try {
      // Check if user already has credits of this type
      const { data: existingCredit, error: checkError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', grantUserId)
        .eq('credit_type', grantCreditType)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCredit) {
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({
            balance: existingCredit.balance + grantAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCredit.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_credits')
          .insert({
            user_id: grantUserId,
            credit_type: grantCreditType,
            balance: grantAmount,
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Credits Granted Successfully",
        description: `Granted ${grantAmount} ${grantCreditType} credits to ${getUserDetails(grantUserId).name}.`,
      });

      setGrantUserId('');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error granting credits",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGranting(false);
    }
  };

  // Handle credit adjustment
  const handleAdjustCredits = async () => {
    if (!selectedCredit) return;

    const change = adjustType === 'add' ? adjustAmount : -adjustAmount;
    const newBalance = Math.max(0, selectedCredit.balance + change);

    try {
      const { error } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCredit.id);

      if (error) throw error;

      toast({
        title: "Balance Adjusted",
        description: `Successfully updated balance to ${newBalance} credits.`,
      });

      setAdjustDialogOpen(false);
      setSelectedCredit(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error adjusting balance",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Filtered credits list
  const filteredCredits = credits.filter(credit => {
    const userDetail = getUserDetails(credit.user_id);
    const searchLower = searchTerm.toLowerCase();
    return (
      userDetail.name.toLowerCase().includes(searchLower) ||
      userDetail.email.toLowerCase().includes(searchLower) ||
      credit.credit_type.toLowerCase().includes(searchLower)
    );
  });

  // Get tracks associated with a user
  const getUserTracks = (userId: string) => {
    return requests.filter(r => r.user_id === userId);
  };

  // Get tracks paid with credits
  const creditPaidRequests = requests.filter(r => 
    r.is_paid && 
    (r.internal_notes?.toLowerCase().includes('credit') || 
     r.internal_notes?.toLowerCase().includes('season pack'))
  );

  return (
    <div className="space-y-8 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Active Credits</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">
                {credits.reduce((acc, curr) => acc + curr.balance, 0)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Users with Credits</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">
                {new Set(credits.filter(c => c.balance > 0).map(c => c.user_id)).size}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-xl">
              <History className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Tracks Redeemed via Credits</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">
                {creditPaidRequests.length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Credits Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-[#1C0357]">User Credits Balance</CardTitle>
                  <CardDescription>View and manage remaining audition pack and polished track credits.</CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search user or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-xl border-gray-200"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1C0357] mb-2" />
                  <p className="text-sm text-gray-500">Loading credits data...</p>
                </div>
              ) : filteredCredits.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No credits found matching your search.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-100">
                        <TableHead className="font-bold text-gray-600">User</TableHead>
                        <TableHead className="font-bold text-gray-600">Credit Type</TableHead>
                        <TableHead className="font-bold text-gray-600 text-center">Remaining Balance</TableHead>
                        <TableHead className="font-bold text-gray-600">Last Updated</TableHead>
                        <TableHead className="font-bold text-gray-600 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCredits.map((credit) => {
                        const userDetail = getUserDetails(credit.user_id);
                        const userTracks = getUserTracks(credit.user_id);
                        const creditTracks = userTracks.filter(t => 
                          t.is_paid && 
                          (t.internal_notes?.toLowerCase().includes('credit') || 
                           t.internal_notes?.toLowerCase().includes('season pack'))
                        );

                        return (
                          <TableRow key={credit.id} className="border-gray-100 hover:bg-gray-50/50">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{userDetail.name}</span>
                                <span className="text-xs text-gray-500">{userDetail.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                credit.credit_type === 'audition-ready' || credit.credit_type === 'audition'
                                  ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50"
                                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                              }>
                                {credit.credit_type === 'audition-ready' || credit.credit_type === 'audition' 
                                  ? 'Audition Ready' 
                                  : 'Polished Track'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-lg font-black ${credit.balance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {credit.balance}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {new Date(credit.updated_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg text-xs font-bold border-gray-200 text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                  setSelectedUserForTracks(userDetail);
                                  setTracksDialogOpen(true);
                                }}
                              >
                                <Music className="h-3.5 w-3.5 mr-1" />
                                Tracks ({creditTracks.length})
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg text-xs font-bold bg-[#1C0357] text-white hover:bg-[#1C0357]/90 border-none"
                                onClick={() => {
                                  setSelectedCredit(credit);
                                  setAdjustAmount(1);
                                  setAdjustType('add');
                                  setAdjustDialogOpen(true);
                                }}
                              >
                                Adjust
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credit Usage History */}
          <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#1C0357] flex items-center">
                <History className="mr-2 h-5 w-5 text-purple-600" />
                Credit Redemption History
              </CardTitle>
              <CardDescription>
                Tracks that have been requested and paid for using Season Pack / Audition credits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1C0357]" />
                </div>
              ) : creditPaidRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No tracks have been redeemed using credits yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-100">
                        <TableHead className="font-bold text-gray-600">Date</TableHead>
                        <TableHead className="font-bold text-gray-600">Client</TableHead>
                        <TableHead className="font-bold text-gray-600">Song Title</TableHead>
                        <TableHead className="font-bold text-gray-600">Artist/Musical</TableHead>
                        <TableHead className="font-bold text-gray-600">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditPaidRequests.map((req) => (
                        <TableRow key={req.id} className="border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="text-xs text-gray-500">
                            {new Date(req.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-sm">{req.name || 'Unknown'}</span>
                              <span className="text-[10px] text-gray-500">{req.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900 text-sm">{req.song_title}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{req.musical_or_artist}</TableCell>
                          <TableCell>
                            <Badge className={
                              req.status === 'completed' 
                                ? "bg-green-50 text-green-700 border-green-200"
                                : req.status === 'in_progress'
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }>
                              {req.status}
                            </Badge>
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

        {/* Right Column: Manual Grant Form */}
        <div className="space-y-6">
          <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#1C0357] flex items-center">
                <Plus className="mr-2 h-5 w-5 text-green-600" />
                Grant Manual Credits
              </CardTitle>
              <CardDescription>
                Manually add credits to a user's account (e.g., after bank transfer or cash payment).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGrantCredits} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grant-user" className="font-bold text-gray-700">Select User</Label>
                  <Select value={grantUserId} onValueChange={setGrantUserId}>
                    <SelectTrigger id="grant-user" className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grant-type" className="font-bold text-gray-700">Credit Type</Label>
                  <Select value={grantCreditType} onValueChange={setGrantCreditType}>
                    <SelectTrigger id="grant-type" className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Select credit type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audition-ready">Audition Ready (Season Pack)</SelectItem>
                      <SelectItem value="polished">Polished Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grant-amount" className="font-bold text-gray-700">Amount of Credits</Label>
                  <Input
                    id="grant-amount"
                    type="number"
                    min="1"
                    max="50"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(parseInt(e.target.value) || 1)}
                    className="rounded-xl border-gray-200"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={granting || !grantUserId}
                  className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold rounded-xl py-6 shadow-sm mt-2"
                >
                  {granting ? (
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

          {/* Quick Help Card */}
          <Card className="bg-gradient-to-br from-[#1C0357] to-[#2D0B7C] text-white border-none shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h4 className="font-bold text-lg text-[#F1E14F]">How Credits Work</h4>
              <ul className="space-y-2 text-sm text-white/90 list-disc pl-4">
                <li>When a client purchases a <strong>Season Pack</strong>, they receive 3 Audition Ready credits.</li>
                <li>Credits are automatically deducted when they submit a request with the "Use Credit" toggle active.</li>
                <li>You can manually adjust balances here if they need extra credits or if a refund is required.</li>
                <li>Tracks redeemed via credits will show up in the redemption history below.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adjust Balance Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C0357]">Adjust Credit Balance</DialogTitle>
            <DialogDescription>
              Modify the credit balance for {selectedCredit && getUserDetails(selectedCredit.user_id).name}.
            </DialogDescription>
          </DialogHeader>

          {selectedCredit && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Current Balance</p>
                  <p className="text-sm font-bold text-gray-700">
                    {selectedCredit.credit_type === 'audition-ready' || selectedCredit.credit_type === 'audition' 
                      ? 'Audition Ready' 
                      : 'Polished Track'}
                  </p>
                </div>
                <span className="text-3xl font-black text-[#1C0357]">{selectedCredit.balance}</span>
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
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              className="rounded-xl border-gray-200 font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustCredits}
              className="rounded-xl bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tracks Dialog */}
      <Dialog open={tracksDialogOpen} onOpenChange={setTracksDialogOpen}>
        <DialogContent className="rounded-2xl max-w-2xl bg-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C0357] flex items-center">
              <Music className="mr-2 h-5 w-5 text-purple-600" />
              Tracks for {selectedUserForTracks?.name}
            </DialogTitle>
            <DialogDescription>
              All backing requests submitted by {selectedUserForTracks?.email}.
            </DialogDescription>
          </DialogHeader>

          {selectedUserForTracks && (
            <div className="py-4 space-y-4">
              {getUserTracks(selectedUserForTracks.id).length === 0 ? (
                <p className="text-center py-6 text-gray-500 text-sm">No tracks requested by this user yet.</p>
              ) : (
                <div className="space-y-3">
                  {getUserTracks(selectedUserForTracks.id).map((track) => {
                    const isCreditPaid = track.is_paid && (
                      track.internal_notes?.toLowerCase().includes('credit') || 
                      track.internal_notes?.toLowerCase().includes('season pack')
                    );

                    return (
                      <div 
                        key={track.id} 
                        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                          isCreditPaid ? 'border-purple-200 bg-purple-50/30' : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-gray-900">{track.song_title}</h5>
                            {isCreditPaid && (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-[10px]">
                                Paid via Credit
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{track.musical_or_artist}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Requested on {new Date(track.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={
                            track.status === 'completed' 
                              ? "bg-green-50 text-green-700 border-green-200"
                              : track.status === 'in_progress'
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }>
                            {track.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setTracksDialogOpen(false)}
              className="rounded-xl bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold w-full md:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

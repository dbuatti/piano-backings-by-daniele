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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ShoppingBag, 
  Search, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  User, 
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface OrderItem {
  id: string;
  created_at: string;
  user_id: string | null;
  product_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_intent_id: string | null;
  customer_email: string;
  checkout_session_id: string | null;
  products?: {
    title: string;
    product_type: string;
    price: number;
  } | null;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface UserGroupedOrders {
  email: string;
  userId: string | null;
  name: string;
  totalSpent: number;
  ordersCount: number;
  orders: OrderItem[];
}

export const OrdersTabContent: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all');
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'email'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all orders with product details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          user_id,
          product_id,
          amount,
          currency,
          status,
          payment_intent_id,
          customer_email,
          checkout_session_id,
          products (
            title,
            product_type,
            price
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders((ordersData as any) || []);

      // 2. Fetch profiles to map names
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error loading orders",
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

  // Helper to get user name from profile or email
  const getUserName = (userId: string | null, email: string) => {
    if (userId) {
      const profile = profiles.find(p => p.id === userId);
      if (profile && (profile.first_name || profile.last_name)) {
        return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      }
    }
    return email.split('@')[0];
  };

  // Filtered orders
  const filteredOrders = orders.filter(order => {
    const name = getUserName(order.user_id, order.customer_email);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.customer_email.toLowerCase().includes(searchLower) ||
      name.toLowerCase().includes(searchLower) ||
      (order.products?.title || '').toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower);

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'paid' && (order.status === 'completed' || order.status === 'paid')) ||
      (statusFilter === 'pending' && order.status === 'pending') ||
      (statusFilter === 'failed' && (order.status === 'failed' || order.status === 'cancelled'));

    return matchesSearch && matchesStatus;
  });

  // Sorted orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'amount') {
      comparison = Number(a.amount) - Number(b.amount);
    } else if (sortBy === 'email') {
      comparison = a.customer_email.localeCompare(b.customer_email);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Grouped orders by user
  const groupedOrders: UserGroupedOrders[] = React.useMemo(() => {
    const groups = new Map<string, UserGroupedOrders>();

    filteredOrders.forEach(order => {
      const emailKey = order.customer_email.toLowerCase();
      const name = getUserName(order.user_id, order.customer_email);

      if (!groups.has(emailKey)) {
        groups.set(emailKey, {
          email: order.customer_email,
          userId: order.user_id,
          name,
          totalSpent: 0,
          ordersCount: 0,
          orders: []
        });
      }

      const group = groups.get(emailKey)!;
      group.orders.push(order);
      group.ordersCount += 1;
      if (order.status === 'completed' || order.status === 'paid') {
        group.totalSpent += Number(order.amount);
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredOrders, profiles]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleExpandUser = (email: string) => {
    setExpandedUsers(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // Stats calculations
  const totalRevenue = orders
    .filter(o => o.status === 'completed' || o.status === 'paid')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.filter(o => o.status === 'completed' || o.status === 'paid').length : 0;

  return (
    <div className="space-y-8 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">${totalRevenue.toFixed(2)}</h3>
              <p className="text-xs text-gray-400 mt-0.5">From paid orders</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">{orders.length}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {orders.filter(o => o.status === 'completed' || o.status === 'paid').length} paid, {orders.filter(o => o.status === 'pending').length} pending
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
              <ArrowUpDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Average Order Value</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">${averageOrderValue.toFixed(2)}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Per paid transaction</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Unique Customers</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">
                {new Set(orders.map(o => o.customer_email.toLowerCase())).size}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">With at least 1 order</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-[#1C0357]">Order History</CardTitle>
              <CardDescription>View what each user ordered, how much they paid, and transaction details.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setViewMode(viewMode === 'all' ? 'grouped' : 'all')} 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-bold"
              >
                {viewMode === 'all' ? 'Group by User' : 'Show All Orders'}
              </Button>
              <Button 
                onClick={fetchData} 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search email, name, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-gray-200"
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="rounded-xl border-gray-200">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid / Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed / Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1C0357] mb-2" />
              <p className="text-sm text-gray-500">Loading order history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No orders found in the database.</p>
            </div>
          ) : viewMode === 'all' ? (
            /* All Orders View */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="font-bold text-gray-600 cursor-pointer" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1">
                        Date <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 cursor-pointer" onClick={() => handleSort('email')}>
                      <div className="flex items-center gap-1">
                        Customer <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600">Product Ordered</TableHead>
                    <TableHead className="font-bold text-gray-600 cursor-pointer text-right" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-end gap-1">
                        Amount <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">Status</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">Stripe Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => {
                    const name = getUserName(order.user_id, order.customer_email);
                    const isPaid = order.status === 'completed' || order.status === 'paid';

                    return (
                      <TableRow key={order.id} className="border-gray-100 hover:bg-gray-50/50">
                        <TableCell className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border border-gray-100">
                              <AvatarFallback className="bg-purple-50 text-purple-700 font-bold text-[10px]">
                                {name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-xs">{name}</span>
                              <span className="text-[10px] text-gray-500">{order.customer_email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-xs">
                              {order.products?.title || 'Shop Product'}
                            </span>
                            <span className="text-[10px] text-gray-400 capitalize">
                              {order.products?.product_type || 'Track'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-gray-900 text-xs">
                          ${Number(order.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={
                            isPaid 
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-50"
                              : order.status === 'pending'
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                              : "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-[10px] text-gray-400 font-mono">
                          {order.payment_intent_id ? (
                            <span title={order.payment_intent_id}>
                              pi_{order.payment_intent_id.substring(3, 12)}...
                            </span>
                          ) : order.checkout_session_id ? (
                            <span title={order.checkout_session_id}>
                              cs_{order.checkout_session_id.substring(3, 12)}...
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Grouped by User View */
            <div className="space-y-4">
              {groupedOrders.map((group) => {
                const isExpanded = expandedUsers.includes(group.email);

                return (
                  <div key={group.email} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {/* Group Header */}
                    <div 
                      onClick={() => toggleExpandUser(group.email)}
                      className="p-4 bg-gray-50/50 hover:bg-gray-50 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-gray-100">
                          <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-xs">
                            {group.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{group.name}</h4>
                          <p className="text-xs text-gray-500">{group.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-end md:self-auto">
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">Total Spent</span>
                          <span className="font-black text-green-600 text-sm">${group.totalSpent.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">Orders</span>
                          <span className="font-bold text-gray-700 text-sm">{group.ordersCount}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                      </div>
                    </div>

                    {/* Group Orders List */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-gray-100">
                              <TableHead className="font-bold text-gray-600 text-xs">Date</TableHead>
                              <TableHead className="font-bold text-gray-600 text-xs">Product Ordered</TableHead>
                              <TableHead className="font-bold text-gray-600 text-xs text-right">Amount</TableHead>
                              <TableHead className="font-bold text-gray-600 text-xs text-center">Status</TableHead>
                              <TableHead className="font-bold text-gray-600 text-xs text-right">Order ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.orders.map((order) => (
                              <TableRow key={order.id} className="border-gray-100 hover:bg-gray-50/30">
                                <TableCell className="text-xs text-gray-500">
                                  {new Date(order.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 text-xs">
                                      {order.products?.title || 'Shop Product'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 capitalize">
                                      {order.products?.product_type || 'Track'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-gray-900 text-xs">
                                  ${Number(order.amount).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={
                                    order.status === 'completed' || order.status === 'paid'
                                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-[10px]"
                                      : order.status === 'pending'
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 text-[10px]"
                                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px]"
                                  }>
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-[10px] text-gray-400 font-mono">
                                  {order.id.substring(0, 8)}...
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

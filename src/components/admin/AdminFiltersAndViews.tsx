import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MusicIcon, DollarSign, XCircle } from 'lucide-react'; // Added XCircle icon
import { cn } from '@/lib/utils';

interface AdminFiltersAndViewsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  backingTypeFilter: string;
  setBackingTypeFilter: (type: string) => void;
  paymentStatusFilter: string; // New prop
  setPaymentStatusFilter: (status: string) => void; // New prop
  clearFilters: () => void;
  totalRequests: number;
  filteredRequestsCount: number;
}

const AdminFiltersAndViews: React.FC<AdminFiltersAndViewsProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  backingTypeFilter,
  setBackingTypeFilter,
  paymentStatusFilter, // Destructure new prop
  setPaymentStatusFilter, // Destructure new prop
  clearFilters,
  totalRequests,
  filteredRequestsCount,
}) => {
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || backingTypeFilter !== 'all' || paymentStatusFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, email, song..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <div className="relative">
            <MusicIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Select value={backingTypeFilter} onValueChange={setBackingTypeFilter}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Backing Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full-song">Full Song</SelectItem>
                <SelectItem value="audition-cut">Audition Cut</SelectItem>
                <SelectItem value="note-bash">Note Bash</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Payment Status Filter */}
        <div>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <p className="text-sm text-gray-500">
          Showing {filteredRequestsCount} of {totalRequests} requests
        </p>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            onClick={clearFilters}
            className="text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
            size="sm"
          >
            <XCircle className="mr-1 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdminFiltersAndViews;
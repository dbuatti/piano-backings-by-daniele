import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminFiltersAndViewsProps {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  backingTypeFilter: string;
  setBackingTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  paymentStatusFilter: string;
  setPaymentStatusFilter: React.Dispatch<React.SetStateAction<string>>;
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
  paymentStatusFilter,
  setPaymentStatusFilter,
  clearFilters,
  totalRequests,
  filteredRequestsCount,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all'); // Reset to 'all'
    setBackingTypeFilter('all'); // Reset to 'all'
    setPaymentStatusFilter('all'); // Reset to 'all'
    clearFilters();
  };

  const isFilterActive = searchTerm || statusFilter !== 'all' || backingTypeFilter !== 'all' || paymentStatusFilter !== 'all';

  const FilterControls = (
    <>
      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full md:w-[150px] h-9 text-sm">
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

      {/* Backing Type Filter */}
      <Select value={backingTypeFilter} onValueChange={setBackingTypeFilter}>
        <SelectTrigger className="w-full md:w-[150px] h-9 text-sm">
          <SelectValue placeholder="Backing Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="full-song">Full Song</SelectItem>
          <SelectItem value="audition-cut">Audition Cut</SelectItem>
          <SelectItem value="note-bash">Note Bash</SelectItem>
        </SelectContent>
      </Select>

      {/* Payment Status Filter */}
      <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
        <SelectTrigger className="w-full md:w-[150px] h-9 text-sm">
          <SelectValue placeholder="Payment Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payments</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
        </SelectContent>
      </Select>

      {isFilterActive && (
        <Button 
          onClick={handleClearFilters} 
          variant="outline" 
          size="sm"
          className="w-full md:w-auto h-9 text-sm flex items-center"
        >
          <X className="w-4 h-4 mr-1" />
          Clear Filters
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle (Always visible) */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        {/* Search Input */}
        <div className="relative w-full sm:w-1/2 lg:w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search client, song, or artist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Filter Controls (Desktop/Tablet) */}
        <div className="hidden md:flex items-center gap-3">
          {FilterControls}
        </div>

        {/* Mobile Filter Toggle */}
        <Button 
          variant="outline" 
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="md:hidden w-full sm:w-auto h-9 text-sm flex items-center justify-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          {filtersOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      {/* Filter Controls (Mobile/Collapsed) */}
      <div className={cn(
        "md:hidden transition-all duration-300 overflow-hidden",
        filtersOpen ? "max-h-96 opacity-100 pt-2" : "max-h-0 opacity-0"
      )}>
        <div className="flex flex-col gap-3">
          {FilterControls}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 pt-2">
        Showing <span className="font-semibold text-[#1C0357]">{filteredRequestsCount}</span> of <span className="font-semibold text-[#1C0357]">{totalRequests}</span> requests.
        {isFilterActive && (
          <span className="ml-2 text-xs text-red-500">(Filters Active)</span>
        )}
      </div>
    </div>
  );
};

export default AdminFiltersAndViews;
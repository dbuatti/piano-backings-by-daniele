import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MusicIcon } from 'lucide-react'; // Removed List, Calendar, Calculator icons

interface AdminFiltersAndViewsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  backingTypeFilter: string;
  setBackingTypeFilter: (type: string) => void;
  // Removed viewMode and setViewMode props
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
  // Removed viewMode, setViewMode
  clearFilters,
  totalRequests,
  filteredRequestsCount,
}) => {
  return (
    <Card className="shadow-lg mb-6 bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-[#1C0357] flex items-center justify-between">
          <span className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters & View Options
          </span>
          <div className="flex items-center gap-2">
            {/* Removed view mode buttons */}
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="text-sm"
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* The pricing view mode check is no longer needed here as view mode is handled by parent */}
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
          
          <div className="flex items-end">
            <p className="text-sm text-gray-500">
              Showing {filteredRequestsCount} of {totalRequests} requests
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminFiltersAndViews;
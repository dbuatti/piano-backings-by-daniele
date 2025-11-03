import React from 'react';
import AdminStatsCards from './AdminStatsCards';
import AdminFiltersAndViews from './AdminFiltersAndViews';
import RequestsTable from './RequestsTable';
import RequestsCalendar from './RequestsCalendar';
import PricingMatrix from '../PricingMatrix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { List, Calendar, Calculator } from 'lucide-react'; // Import icons for tabs

interface DashboardTabContentProps {
  requests: any[];
  loading: boolean;
  totalIssueReports: number;
  unreadIssueReports: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  backingTypeFilter: string;
  setBackingTypeFilter: (type: string) => void;
  paymentStatusFilter: string; // New prop
  setPaymentStatusFilter: (status: string) => void; // New prop
  viewMode: 'list' | 'calendar' | 'pricing';
  setViewMode: (mode: 'list' | 'calendar' | 'pricing') => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  filteredRequests: any[];
  clearFilters: () => void;
  selectedRequests: string[];
  handleSelectAll: () => void;
  handleSelectRequest: (id: string) => void;
  totalCost: number;
  updateStatus: (id: string, status: string) => void;
  updatePaymentStatus: (id: string, isPaid: boolean) => void;
  uploadTrack: (id: string) => void;
  shareTrack: (id: string) => void;
  openEmailGenerator: (request: any) => void;
  openDeleteDialog: (id: string) => void;
  openBatchDeleteDialog: () => void;
  openUploadPlatformsDialog: (id: string) => void;
  onDirectFileUpload: (id: string, file: File) => void;
}

const DashboardTabContent: React.FC<DashboardTabContentProps> = ({
  requests,
  loading,
  totalIssueReports,
  unreadIssueReports,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  backingTypeFilter,
  setBackingTypeFilter,
  paymentStatusFilter, // Destructure new prop
  setPaymentStatusFilter, // Destructure new prop
  viewMode,
  setViewMode,
  selectedDate,
  setSelectedDate,
  filteredRequests,
  clearFilters,
  selectedRequests,
  handleSelectAll,
  handleSelectRequest,
  totalCost,
  updateStatus,
  updatePaymentStatus,
  uploadTrack,
  shareTrack,
  openEmailGenerator,
  openDeleteDialog,
  openBatchDeleteDialog,
  openUploadPlatformsDialog,
  onDirectFileUpload,
}) => {
  return (
    <>
      <AdminStatsCards 
        requests={requests} 
        totalIssueReports={totalIssueReports}
        unreadIssueReports={unreadIssueReports}
      />
      
      <AdminFiltersAndViews
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        backingTypeFilter={backingTypeFilter}
        setBackingTypeFilter={setBackingTypeFilter}
        paymentStatusFilter={paymentStatusFilter} // Pass new prop
        setPaymentStatusFilter={setPaymentStatusFilter} // Pass new prop
        clearFilters={clearFilters}
        totalRequests={requests.length}
        filteredRequestsCount={filteredRequests.length}
      />
      
      {/* Segmented Control for View Modes */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'calendar' | 'pricing')} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center">
            <List className="mr-2 h-4 w-4" /> List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" /> Calendar View
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center">
            <Calculator className="mr-2 h-4 w-4" /> Pricing Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <RequestsTable
            filteredRequests={filteredRequests}
            loading={loading}
            selectedRequests={selectedRequests}
            handleSelectAll={handleSelectAll}
            handleSelectRequest={handleSelectRequest}
            totalCost={totalCost}
            updateStatus={updateStatus}
            updatePaymentStatus={updatePaymentStatus}
            uploadTrack={uploadTrack}
            shareTrack={shareTrack}
            openEmailGenerator={openEmailGenerator}
            openDeleteDialog={openDeleteDialog}
            openBatchDeleteDialog={openBatchDeleteDialog}
            openUploadPlatformsDialog={openUploadPlatformsDialog}
            onDirectFileUpload={onDirectFileUpload}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <RequestsCalendar
            requests={requests}
            filteredRequests={filteredRequests}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            uploadTrack={uploadTrack}
          />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <PricingMatrix />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default DashboardTabContent;
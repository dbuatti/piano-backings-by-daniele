import React from 'react';
import AdminStatsCards from './AdminStatsCards';
import AdminFiltersAndViews from './AdminFiltersAndViews';
import RequestsTable from './RequestsTable';
import RequestsCalendar from './RequestsCalendar';
import PricingMatrix from '../PricingMatrix';

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
        viewMode={viewMode}
        setViewMode={setViewMode}
        clearFilters={clearFilters}
        totalRequests={requests.length}
        filteredRequestsCount={filteredRequests.length}
      />
      
      {viewMode === 'pricing' && (
        <PricingMatrix />
      )}
      
      {viewMode === 'calendar' && (
        <RequestsCalendar
          requests={requests}
          filteredRequests={filteredRequests}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          uploadTrack={uploadTrack}
        />
      )}
      
      {viewMode === 'list' && (
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
      )}
    </>
  );
};

export default DashboardTabContent;
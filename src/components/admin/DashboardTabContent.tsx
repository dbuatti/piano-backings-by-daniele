import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminStatsCards from './AdminStatsCards';
import RequestsTable from './RequestsTable';
import AdminFiltersAndViews from './AdminFiltersAndViews';
import RequestsCalendar from './RequestsCalendar';
import PricingMatrix from '../PricingMatrix';
import { cn } from '@/lib/utils';

interface DashboardTabContentProps {
  requests: any[];
  loading: boolean;
  totalIssueReports: number;
  unreadIssueReports: number;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  backingTypeFilter: string;
  setBackingTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  paymentStatusFilter: string;
  setPaymentStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  viewMode: 'list' | 'calendar' | 'pricing';
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'calendar' | 'pricing'>>;
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  filteredRequests: any[];
  clearFilters: () => void;
  selectedRequests: string[];
  handleSelectAll: () => void;
  handleSelectRequest: (id: string) => void;
  totalCost: number;
  updateStatus: (id: string, status: any) => void;
  updatePaymentStatus: (id: string, isPaid: boolean) => void;
  updateInternalNotes: (id: string, notes: string) => void;
  uploadTrack: (id: string) => void;
  shareTrack: (id: string) => void;
  openEmailGenerator: (request: any) => void;
  openDeleteDialog: (id: string) => void;
  openBatchDeleteDialog: () => void;
  openUploadPlatformsDialog: (id: string) => void;
  onDirectFileUpload: (id: string, file: File) => void;
  updateTrackCaption: (requestId: string, trackUrl: string, newCaption: string) => Promise<boolean>;
  updateCost: (id: string, newCost: number | null) => Promise<void>;
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
  paymentStatusFilter,
  setPaymentStatusFilter,
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
  updateInternalNotes,
  uploadTrack,
  shareTrack,
  openEmailGenerator,
  openDeleteDialog,
  openBatchDeleteDialog,
  openUploadPlatformsDialog,
  onDirectFileUpload,
  updateCost,
}) => {
  return (
    <div className="w-full py-8">
      <AdminStatsCards 
        requests={requests} 
        totalIssueReports={totalIssueReports}
        unreadIssueReports={unreadIssueReports}
      />

      <Card className="shadow-lg mb-6 bg-white border-none rounded-[32px]">
        <CardContent className="p-6">
          <AdminFiltersAndViews
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            backingTypeFilter={backingTypeFilter}
            setBackingTypeFilter={setBackingTypeFilter}
            paymentStatusFilter={paymentStatusFilter}
            setPaymentStatusFilter={setPaymentStatusFilter}
            clearFilters={clearFilters}
            totalRequests={requests.length}
            filteredRequestsCount={filteredRequests.length}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end mb-6 space-x-2">
        <Button 
          variant={viewMode === 'list' ? 'default' : 'outline'} 
          onClick={() => setViewMode('list')}
          className={cn("rounded-full px-6", viewMode === 'list' ? 'bg-[#1C0357]' : '')}
        >
          List View
        </Button>
        <Button 
          variant={viewMode === 'calendar' ? 'default' : 'outline'} 
          onClick={() => setViewMode('calendar')}
          className={cn("rounded-full px-6", viewMode === 'calendar' ? 'bg-[#1C0357]' : '')}
        >
          Calendar
        </Button>
        <Button 
          variant={viewMode === 'pricing' ? 'default' : 'outline'} 
          onClick={() => setViewMode('pricing')}
          className={cn("rounded-full px-6", viewMode === 'pricing' ? 'bg-[#1C0357]' : '')}
        >
          Pricing
        </Button>
      </div>

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
          updateCost={updateCost}
          updateInternalNotes={updateInternalNotes}
          uploadTrack={uploadTrack}
          shareTrack={shareTrack}
          openEmailGenerator={openEmailGenerator}
          openDeleteDialog={openDeleteDialog}
          openBatchDeleteDialog={openBatchDeleteDialog}
          openUploadPlatformsDialog={openUploadPlatformsDialog}
          onDirectFileUpload={onDirectFileUpload}
          clearFilters={clearFilters}
        />
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

      {viewMode === 'pricing' && (
        <PricingMatrix />
      )}
    </div>
  );
};

export default DashboardTabContent;
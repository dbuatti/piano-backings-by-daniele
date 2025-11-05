import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, PlusCircle, Trash2, Mail, Upload, Share2 } from 'lucide-react';
import AdminStatsCards from './AdminStatsCards';
import RequestsTable from './RequestsTable';
import IssueReportsTable from './IssueReportsTable';
import { useRequestActions } from '@/hooks/admin/useRequestActions';
import { calculateRequestCost } from '@/utils/pricing';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmailGenerator from './EmailGenerator';
import UploadTrackDialog from './UploadTrackDialog';
import UploadPlatformsDialog from './UploadPlatformsDialog';
import { uploadFileToSupabase } from '@/utils/supabase-client';
import AdminFiltersAndViews from './AdminFiltersAndViews'; // Import AdminFiltersAndViews
import RequestsCalendar from './RequestsCalendar'; // Import RequestsCalendar
import PricingMatrix from '../PricingMatrix'; // Import PricingMatrix
import { Card, CardContent } from '@/components/ui/card'; // Import Card components

interface TrackInfo {
  url: string;
  caption: string;
}

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string | string[];
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: TrackInfo[];
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number | null;
}

interface DashboardTabContentProps {
  requests: BackingRequest[];
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
  filteredRequests: BackingRequest[];
  clearFilters: () => void;
  selectedRequests: string[];
  handleSelectAll: () => void;
  handleSelectRequest: (id: string) => void;
  totalCost: number;
  updateStatus: (id: string, status: BackingRequest['status']) => void;
  updatePaymentStatus: (id: string, isPaid: boolean) => void;
  uploadTrack: (id: string) => void;
  shareTrack: (id: string) => void;
  openEmailGenerator: (request: BackingRequest) => void;
  openDeleteDialog: (id: string) => void;
  openBatchDeleteDialog: () => void;
  openUploadPlatformsDialog: (id: string) => void;
  onDirectFileUpload: (id: string, file: File) => void;
  updateTrackCaption: (requestId: string, trackUrl: string, newCaption: string) => Promise<boolean>;
  updateCost: (id: string, newCost: number | null) => Promise<void>; // Added updateCost
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
  uploadTrack,
  shareTrack,
  openEmailGenerator,
  openDeleteDialog,
  openBatchDeleteDialog,
  openUploadPlatformsDialog,
  onDirectFileUpload,
  updateTrackCaption,
  updateCost, // Destructure updateCost
}) => {
  return (
    <div className="container mx-auto py-8">
      <AdminStatsCards 
        requests={requests} 
        totalIssueReports={totalIssueReports}
        unreadIssueReports={unreadIssueReports}
      />

      <Card className="shadow-lg mb-6 bg-white">
        <CardContent className="p-4">
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

      <div className="flex justify-end mb-4 space-x-2">
        <Button 
          variant={viewMode === 'list' ? 'default' : 'outline'} 
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'bg-[#1C0357] hover:bg-[#1C0357]/90 text-white' : ''}
        >
          List View
        </Button>
        <Button 
          variant={viewMode === 'calendar' ? 'default' : 'outline'} 
          onClick={() => setViewMode('calendar')}
          className={viewMode === 'calendar' ? 'bg-[#1C0357] hover:bg-[#1C0357]/90 text-white' : ''}
        >
          Calendar View
        </Button>
        <Button 
          variant={viewMode === 'pricing' ? 'default' : 'outline'} 
          onClick={() => setViewMode('pricing')}
          className={viewMode === 'pricing' ? 'bg-[#1C0357] hover:bg-[#1C0357]/90 text-white' : ''}
        >
          Pricing Matrix
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
          updateCost={updateCost} // Pass updateCost
          uploadTrack={uploadTrack}
          shareTrack={shareTrack}
          openEmailGenerator={openEmailGenerator}
          openDeleteDialog={openDeleteDialog}
          openBatchDeleteDialog={openBatchDeleteDialog}
          openUploadPlatformsDialog={openUploadPlatformsDialog}
          onDirectFileUpload={onDirectFileUpload}
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
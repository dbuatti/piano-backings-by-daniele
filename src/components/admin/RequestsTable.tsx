import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  ArrowUpDown,
  Music,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  X,
} from 'lucide-react'; // Removed many unused icons
import RequestTableRow from './RequestTableRow'; // Import the new component

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
  cost?: number;
  sheet_music_url?: string;
  voice_memo_url?: string;
  youtube_link?: string;
  additional_links?: string;
}

interface RequestsTableProps {
  requests: BackingRequest[];
  loading: boolean;
  updateStatus: (id: string, status: BackingRequest['status']) => Promise<void>; // Corrected type
  updatePaymentStatus: (id: string, isPaid: boolean) => Promise<void>;
  shareTrack: (id: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  openUploadPlatformsDialog: (id: string) => void;
  updateTrackCaption: (requestId: string, trackUrl: string, newCaption: string) => Promise<boolean>;
  handleDirectFileUpload: (id: string, file: File) => Promise<void>;
  selectedRequests: Set<string>;
  toggleSelectRequest: (id: string) => void;
  toggleSelectAll: () => void;
  allSelected: boolean;
  totalCost: number;
}

const RequestsTable: React.FC<RequestsTableProps> = ({
  requests,
  loading,
  updateStatus,
  updatePaymentStatus,
  shareTrack,
  deleteRequest,
  openUploadPlatformsDialog,
  updateTrackCaption,
  handleDirectFileUpload,
  selectedRequests,
  toggleSelectRequest,
  toggleSelectAll,
  allSelected,
  totalCost,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading requests...</p>
      </div>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
          <span className="flex items-center">
            <Music className="mr-2" />
            All Backing Track Requests
          </span>
          <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            New Request
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="form-checkbox h-4 w-4 text-[#1C0357] rounded"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Song</TableHead>
                <TableHead>Backing Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Tracks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-center">
                      <Music className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No requests yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by ordering your first backing track.
                      </p>
                      <div className="mt-6">
                        <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                          Order Your First Track
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <React.Fragment key={request.id}>
                    <RequestTableRow
                      request={request}
                      updateStatus={updateStatus}
                      updatePaymentStatus={updatePaymentStatus}
                      shareTrack={shareTrack}
                      deleteRequest={deleteRequest}
                      openUploadPlatformsDialog={openUploadPlatformsDialog}
                      updateTrackCaption={updateTrackCaption}
                      handleDirectFileUpload={handleDirectFileUpload}
                    />
                    {/* Checkbox for individual selection */}
                    <TableCell className="absolute left-0 top-0 h-full flex items-center justify-center bg-white z-10">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.id)}
                        onChange={() => toggleSelectRequest(request.id)}
                        className="form-checkbox h-4 w-4 text-[#1C0357] rounded"
                      />
                    </TableCell>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestsTable;
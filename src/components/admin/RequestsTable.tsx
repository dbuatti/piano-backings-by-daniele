import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { 
  Calendar, 
  CalendarDays, 
  Check, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Eye, 
  ExternalLink, 
  Facebook, 
  FileAudio, 
  Hash, 
  Instagram, 
  Mail, 
  MoreHorizontal, 
  Music, 
  Share2, 
  Tag, 
  Trash2, 
  Upload, 
  User, 
  X, 
  Youtube 
} from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing';
import { getSafeBackingTypes } from '@/utils/helpers';
import RequestTableRow from './RequestTableRow'; // Import the new component

interface RequestsTableProps {
  filteredRequests: any[];
  loading: boolean;
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
  onDirectFileUpload: (id: string, file: File) => void; // New prop for direct upload
}

const RequestsTable: React.FC<RequestsTableProps> = ({
  filteredRequests,
  loading,
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
  onDirectFileUpload, // Pass this down
}) => {

  return (
    <Card className="shadow-lg mb-6 bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between flex-wrap gap-4">
          <span className="flex items-center">
            <FileAudio className="mr-2 h-5 w-5" />
            Backing Requests
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              onClick={handleSelectAll}
              variant="outline"
              className="flex items-center"
              size="sm"
            >
              {selectedRequests.length === filteredRequests.length && filteredRequests.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
            {selectedRequests.length > 0 && (
              <div className="flex items-center gap-2 bg-[#D1AAF2] px-4 py-2 rounded-lg">
                <span className="font-medium">Selected: {selectedRequests.length}</span>
                <span className="font-bold">Total: ${totalCost.toFixed(2)}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="default" 
                      className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
                      size="sm"
                    >
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      Batch Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        selectedRequests.forEach(id => updateStatus(id, 'in-progress'));
                      }}
                    >
                      <Clock className="w-4 h-4 mr-2" /> Mark In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        selectedRequests.forEach(id => updateStatus(id, 'completed'));
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" /> Mark Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        selectedRequests.forEach(id => updateStatus(id, 'cancelled'));
                      }}
                    >
                      <X className="w-4 h-4 mr-2" /> Mark Cancelled
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={openBatchDeleteDialog}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C0357] mb-4"></div>
              <p>Loading requests...</p>
            </div>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-[#D1AAF2]/20">
                <TableRow><TableHead className="w-[50px]"><input type="checkbox" checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0} onChange={handleSelectAll} className="h-4 w-4"/></TableHead><TableHead className="w-[120px]"><div className="flex items-center"><CalendarDays className="w-4 h-4 mr-2" />Date</div></TableHead><TableHead><div className="flex items-center"><User className="w-4 h-4 mr-2" />Client</div></TableHead><TableHead><div className="flex items-center"><Music className="w-4 h-4 mr-2" />Song</div></TableHead><TableHead><div className="flex items-center"><Tag className="w-4 h-4 mr-2" />Type</div></TableHead><TableHead><div className="flex items-center"><Calendar className="w-4 h-4 mr-2" />Delivery</div></TableHead><TableHead><div className="flex items-center"><Hash className="w-4 h-4 mr-2" />Status</div></TableHead><TableHead><div className="flex items-center"><CreditCard className="w-4 h-4 mr-2" />Payment</div></TableHead><TableHead><div className="flex items-center"><DollarSign className="w-4 h-4 mr-2" />Cost</div></TableHead><TableHead><div className="flex items-center"><Upload className="w-4 h-4 mr-2" />Platforms</div></TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="text-center">
                        <FileAudio className="mx-auto h-16 w-16 text-gray-300" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No requests found</h3>
                        <p className="mt-1 text-gray-500">
                          Try adjusting your search or filter criteria
                        </p>
                        <div className="mt-6">
                          <Button onClick={() => { /* clear filters logic */ }} variant="outline">
                            Clear Filters
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <RequestTableRow
                      key={request.id}
                      request={request}
                      selectedRequests={selectedRequests}
                      handleSelectRequest={handleSelectRequest}
                      updateStatus={updateStatus}
                      updatePaymentStatus={updatePaymentStatus}
                      uploadTrack={uploadTrack}
                      shareTrack={shareTrack}
                      openEmailGenerator={openEmailGenerator}
                      openDeleteDialog={openDeleteDialog}
                      openUploadPlatformsDialog={openUploadPlatformsDialog}
                      onDirectFileUpload={onDirectFileUpload}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestsTable;
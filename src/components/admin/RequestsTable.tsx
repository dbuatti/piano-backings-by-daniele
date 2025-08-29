import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  openEmailGenerator: (request: any) => void; // Keep this prop for now, but it will navigate
  openDeleteDialog: (id: string) => void;
  openBatchDeleteDialog: () => void;
  openUploadPlatformsDialog: (id: string) => void;
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
  openEmailGenerator, // This prop will now be used for navigation
  openDeleteDialog,
  openBatchDeleteDialog,
  openUploadPlatformsDialog,
}) => {

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'full-song': return 'default';
      case 'audition-cut': return 'secondary';
      case 'note-bash': return 'outline';
      default: return 'default';
    }
  };

  const getPlatformIcons = (platforms: any) => {
    if (!platforms) return null;
    
    let platformsObj = platforms;
    if (typeof platforms === 'string') {
      try {
        platformsObj = JSON.parse(platforms);
      } catch (e) {
        return null;
      }
    }
    
    const icons = [];
    if (platformsObj.youtube) icons.push(<Youtube key="youtube" className="w-4 h-4 text-red-600" />);
    if (platformsObj.tiktok) icons.push(<Music key="tiktok" className="w-4 h-4 text-black" />);
    if (platformsObj.facebook) icons.push(<Facebook key="facebook" className="w-4 h-4 text-blue-600" />);
    if (platformsObj.instagram) icons.push(<Instagram key="instagram" className="w-4 h-4 text-pink-500" />);
    if (platformsObj.gumroad) icons.push(<ExternalLink key="gumroad" className="w-4 h-4 text-purple-600" />);
    
    return (
      <div className="flex gap-1">
        {icons}
      </div>
    );
  };

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
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4"
                    />
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center">
                      <CalendarDays className="w-4 h-4 mr-2" />
                      Date
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Client
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <Music className="w-4 h-4 mr-2" />
                      Song
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 mr-2" />
                      Type
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Delivery
                    </div >
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 mr-2" />
                      Status
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payment
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Cost
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Platforms
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
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
                  filteredRequests.map((request) => {
                    const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

                    return (
                      <TableRow 
                        key={request.id} 
                        className={`hover:bg-[#D1AAF2]/10 ${selectedRequests.includes(request.id) ? "bg-[#D1AAF2]/20" : ""}`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRequests.includes(request.id)}
                            onChange={() => handleSelectRequest(request.id)}
                            className="h-4 w-4"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {format(new Date(request.created_at), 'MMM dd')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(request.created_at), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{request.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {request.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{request.song_title}</div>
                          <div className="text-sm text-gray-500">{request.musical_or_artist}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                              <Badge key={index} variant={getBadgeVariant(type)} className="capitalize">
                                {type.replace('-', ' ')}
                              </Badge>
                            )) : <Badge variant="outline">Not specified</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={request.status || 'pending'} 
                            onValueChange={(value) => updateStatus(request.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={request.is_paid ? 'paid' : 'unpaid'} 
                            onValueChange={(value) => updatePaymentStatus(request.id, value === 'paid')}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center font-medium">
                            <DollarSign className="w-4 h-4 mr-1" />
                            <span>{calculateRequestCost(request).toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getPlatformIcons(request.uploaded_platforms)}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openUploadPlatformsDialog(request.id)}
                              className="mt-1 text-xs"
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => uploadTrack(request.id)}>
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Upload Track</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => shareTrack(request.id)}>
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Share Track</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/admin/request/${request.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Details</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/track/${request.id}`}>
                                  <Button variant="outline" size="sm">
                                    <User className="w-4 h-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Client View</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => openEmailGenerator(request)} // Now navigates to EmailGenerator
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Email Client</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => openDeleteDialog(request.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Request</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
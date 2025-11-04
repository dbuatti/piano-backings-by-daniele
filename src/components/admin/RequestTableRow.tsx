import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Added Button import
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
import { cn } from '@/lib/utils'; // Import cn for conditional classNames
import { useToast } from '@/hooks/use-toast'; // Import useToast for error messages

interface RequestTableRowProps {
  request: any;
  selectedRequests: string[];
  handleSelectRequest: (id: string) => void;
  updateStatus: (id: string, status: string) => void;
  updatePaymentStatus: (id: string, isPaid: boolean) => void;
  uploadTrack: (id: string) => void;
  shareTrack: (id: string) => void;
  openEmailGenerator: (request: any) => void;
  openDeleteDialog: (id: string) => void;
  openUploadPlatformsDialog: (id: string) => void;
  onDirectFileUpload: (id: string, file: File) => void; // New prop for direct upload
}

const RequestTableRow: React.FC<RequestTableRowProps> = ({
  request,
  selectedRequests,
  handleSelectRequest,
  updateStatus,
  updatePaymentStatus,
  uploadTrack,
  shareTrack,
  openEmailGenerator,
  openDeleteDialog,
  openUploadPlatformsDialog,
  onDirectFileUpload,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

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

  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) { // Only accept audio files
        onDirectFileUpload(request.id, file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Only audio files (e.g., MP3) can be uploaded here.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <TableRow 
      key={request.id} 
      className={cn(
        `hover:bg-[#D1AAF2]/10 ${selectedRequests.includes(request.id) ? "bg-[#D1AAF2]/20" : ""}`,
        isDragging ? "bg-[#F538BC]/10 border-2 border-[#F538BC]" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
          <span>
            {(() => {
              const calculatedCost = calculateRequestCost(request);
              if (calculatedCost && typeof calculatedCost.totalCost === 'number') {
                return calculatedCost.totalCost.toFixed(2);
              }
              return 'N/A';
            })()}
          </span>
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
                onClick={() => openEmailGenerator(request)}
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
};

export default RequestTableRow;
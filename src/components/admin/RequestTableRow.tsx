import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { 
  Calendar, 
  CalendarDays, 
  Check, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Edit, 
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
  Youtube,
  Copy,
  StickyNote
} from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing';
import { getSafeBackingTypes } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RequestTableRowProps {
  request: any;
  selectedRequests: string[];
  handleSelectRequest: (id: string) => void;
  uploadTrack: (id: string) => void;
  openEmailGenerator: (request: any) => void;
  openDeleteDialog: (id: string) => void;
  openUploadPlatformsDialog: (id: string) => void;
  onDirectFileUpload: (id: string, file: File) => void;
  onSelectRequest: (id: string) => void;
  selectedRequestId: string | null;
}

const RequestTableRow: React.FC<RequestTableRowProps> = ({
  request,
  selectedRequests,
  handleSelectRequest,
  uploadTrack,
  openEmailGenerator,
  openDeleteDialog,
  openUploadPlatformsDialog,
  onDirectFileUpload,
  onSelectRequest,
  selectedRequestId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const { toast } = useToast();

  const displayCost = request.cost !== null && request.cost !== undefined
    ? `$${request.cost.toFixed(2)}`
    : `$${calculateRequestCost(request).totalCost.toFixed(2)}`;

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

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-500 text-white">In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        setIsDirectUploading(true);
        try {
          await onDirectFileUpload(request.id, file);
        } catch (e) {
        } finally {
          setIsDirectUploading(false);
        }
      } else {
        toast({
          title: "Invalid File Type",
          description: "Only audio files (e.g., MP3) can be uploaded here.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyDetails = () => {
    const details = `🎵 Song: ${request.song_title} by ${request.musical_or_artist}
👤 Client: ${request.name || 'N/A'} (${request.email})
🔑 Key: ${request.song_key || 'N/A'}${request.different_key === 'Yes' ? ` -> ${request.key_for_track}` : ''}
📅 Due: ${request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
🎼 Type: ${request.track_type || 'N/A'} | ${normalizedBackingTypes.join(', ')}
📝 Special Requests: ${request.special_requests || 'None'}
🔗 Admin Link: ${window.location.origin}/admin/request/${request.id}`;

    navigator.clipboard.writeText(details);
    toast({ title: "Copied!", description: "Request details copied to clipboard." });
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if the click is on an interactive element
    const interactiveEl = target.closest('button, input, select, textarea, a, [role="menuitem"], [role="combobox"], [role="option"]');
    if (interactiveEl) {
      return;
    }
    
    // Also check if we clicked the first cell (which contains the checkbox)
    if (target.closest('td')?.cellIndex === 0) {
      return;
    }

    onSelectRequest(request.id);
  };

  return (
    <TableRow 
      key={request.id} 
      onClick={handleRowClick}
      className={cn(
        "cursor-pointer hover:bg-[#D1AAF2]/10",
        selectedRequests.includes(request.id) ? "bg-[#D1AAF2]/20" : "",
        request.id === selectedRequestId ? "bg-[#1C0357]/5 ring-1 ring-inset ring-[#1C0357]/40" : "",
        isDragging ? "bg-[#F538BC]/10 border-2 border-[#F538BC]" : "",
        isDirectUploading && "bg-green-50/50 animate-pulse"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TableCell className="py-3">
        <input
          type="checkbox"
          checked={selectedRequests.includes(request.id)}
          onChange={() => handleSelectRequest(request.id)}
          className="h-4 w-4"
        />
      </TableCell>
      <TableCell className="py-3">
        <div className="text-sm font-medium text-[#1C0357]">
          {format(new Date(request.created_at), 'MMM dd')}
        </div>
        <div className="text-xs text-gray-500">
          {format(new Date(request.created_at), 'HH:mm')}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="font-medium text-[#1C0357]">{request.name || 'N/A'}</div>
        <div className="text-xs text-gray-500 flex items-center">
          <Mail className="w-3 h-3 mr-1" />
          {request.email}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 ml-1 text-gray-400 hover:text-[#1C0357]"
                  onClick={() => {
                    navigator.clipboard.writeText(request.email);
                    toast({ title: "Copied!", description: "Email address copied." });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy Email</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="font-semibold text-[#1C0357]">{request.song_title}</div>
        <div className="text-sm text-gray-600">{request.musical_or_artist}</div>
      </TableCell>
      <TableCell className="hidden lg:table-cell py-3">
        <div className="flex flex-wrap gap-1">
          {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
            <Badge key={index} variant={getBadgeVariant(type)} className="capitalize text-xs">
              {type.replace('-', ' ')}
            </Badge>
          )) : <Badge variant="outline" className="text-xs">Not specified</Badge>}
        </div>
      </TableCell>
      <TableCell className="text-sm text-[#1C0357] hidden sm:table-cell py-3">
        {request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
      </TableCell>
      <TableCell className="py-3">
        {getStatusBadge(request.status)}
      </TableCell>
      <TableCell className="hidden lg:table-cell py-3">
        {request.is_paid ? (
          <Badge className="bg-green-500 text-white">Paid</Badge>
        ) : (
          <Badge variant="secondary">Unpaid</Badge>
        )}
      </TableCell>
      <TableCell className="py-3">
        <span className="text-sm font-medium text-[#1C0357]">{displayCost}</span>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8", request.internal_notes ? "text-[#F538BC]" : "text-gray-400")}
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium leading-none text-[#1C0357]">Internal Notes</h4>
                <p className="text-xs text-gray-500">Private notes for your reference only.</p>
                <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {request.internal_notes || 'No notes yet.'}
                </p>
              </div>
            </PopoverContent>
          </Popover>
          <div className="hidden lg:block">
            {request.uploaded_platforms && getPlatformIcons(request.uploaded_platforms)}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right py-3">
        <div className="flex justify-end space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/admin/request/${request.id}`}>
                  <Eye className="w-4 h-4 mr-2" /> View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/admin/request/${request.id}?mode=edit`}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Request
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyDetails}>
                <Copy className="w-4 h-4 mr-2" /> Copy Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => uploadTrack(request.id)}>
                <Upload className="w-4 h-4 mr-2" /> Upload Track
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEmailGenerator(request)}>
                <Mail className="w-4 h-4 mr-2" /> Email Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openUploadPlatformsDialog(request.id)}>
                <Tag className="w-4 h-4 mr-2" /> Edit Platforms
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => openDeleteDialog(request.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default RequestTableRow;
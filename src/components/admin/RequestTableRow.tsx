import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2,
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
  updateStatus: (id: string, status: string) => void;
  updatePaymentStatus: (id: string, isPaid: boolean) => void;
  updateCost: (id: string, newCost: number | null) => void;
  updateInternalNotes: (id: string, notes: string) => void;
  uploadTrack: (id: string) => void;
  shareTrack: (id: string) => void;
  openEmailGenerator: (request: any) => void;
  openDeleteDialog: (id: string) => void;
  openUploadPlatformsDialog: (id: string) => void;
  onDirectFileUpload: (id: string, file: File) => void;
}

const RequestTableRow: React.FC<RequestTableRowProps> = ({
  request,
  selectedRequests,
  handleSelectRequest,
  updateStatus,
  updatePaymentStatus,
  updateCost,
  updateInternalNotes,
  uploadTrack,
  shareTrack,
  openEmailGenerator,
  openDeleteDialog,
  openUploadPlatformsDialog,
  onDirectFileUpload,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [currentCost, setCurrentCost] = useState<string>(
    request.cost !== null ? request.cost.toFixed(2) : calculateRequestCost(request).totalCost.toFixed(2)
  );
  const [isUpdatingCost, setIsUpdatingCost] = useState(false);
  const [notes, setNotes] = useState(request.internal_notes || '');
  const { toast } = useToast();

  React.useEffect(() => {
    setCurrentCost(
      request.cost !== null ? request.cost.toFixed(2) : calculateRequestCost(request).totalCost.toFixed(2)
    );
    setNotes(request.internal_notes || '');
  }, [request.cost, request.internal_notes, request]);

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

  const handleCostBlur = async () => {
    setEditingCost(false);
    const parsedCost = parseFloat(currentCost);
    const newCost = isNaN(parsedCost) ? null : parsedCost;

    const originalCost = request.cost !== null ? request.cost : calculateRequestCost(request).totalCost;
    if (newCost !== originalCost) {
      setIsUpdatingCost(true);
      await updateCost(request.id, newCost);
      setIsUpdatingCost(false);
    }
  };

  const handleSaveNotes = () => {
    updateInternalNotes(request.id, notes);
  };

  return (
    <TableRow 
      key={request.id} 
      className={cn(
        `hover:bg-[#D1AAF2]/10 ${selectedRequests.includes(request.id) ? "bg-[#D1AAF2]/20" : ""}`,
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
        <Select 
          value={request.status || 'pending'} 
          onValueChange={(value) => updateStatus(request.id, value)}
        >
          <SelectTrigger className="w-[140px] h-8 text-sm">
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
      <TableCell className="hidden lg:table-cell py-3">
        <Select 
          value={request.is_paid ? 'paid' : 'unpaid'} 
          onValueChange={(value) => updatePaymentStatus(request.id, value === 'paid')}
        >
          <SelectTrigger className="w-[120px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center font-medium relative">
          <span className="text-sm text-gray-500 mr-0.5">$</span>
          <Input
            type="number"
            step="0.01"
            value={currentCost}
            onChange={(e) => setCurrentCost(e.target.value)}
            onFocus={() => setEditingCost(true)}
            onBlur={handleCostBlur}
            className={cn(
              "w-20 h-8 p-1 text-sm border-none focus:ring-0 focus:outline-none",
              editingCost ? "bg-white border border-blue-300" : "bg-transparent"
            )}
          />
          {isUpdatingCost && (
            <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>
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
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about progress, client preferences, etc..."
                  className="min-h-[100px] text-sm"
                />
                <Button size="sm" className="w-full bg-[#1C0357]" onClick={handleSaveNotes}>
                  Save Notes
                </Button>
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
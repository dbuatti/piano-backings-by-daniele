import React, { useState } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
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
// Removed unused Dialog imports
import { Input } from "@/components/ui/input";
// Removed unused Label import
import { format } from 'date-fns';
import {
  ArrowUpDown,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  Link as LinkIcon,
  Share2,
  Trash2,
  Upload,
  X,
  Calendar as CalendarIcon, // Re-imported CalendarIcon
} from 'lucide-react'; // Removed Music, useUploadDialogs
import { getSafeBackingTypes } from '@/utils/helpers';
import { useToast } from '@/hooks/use-toast';
// Removed useUploadDialogs import
import { Link } from 'react-router-dom'; // Import Link for navigation
import { cn } from '@/lib/utils'; // Re-imported cn

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
  track_urls?: TrackInfo[]; // Changed to array of TrackInfo objects
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number;
  sheet_music_url?: string; // Added sheet music URL
  voice_memo_url?: string; // Added voice memo URL
  youtube_link?: string; // Added youtube link
  additional_links?: string; // Added additional links
}

interface RequestTableRowProps {
  request: BackingRequest;
  updateStatus: (id: string, status: BackingRequest['status']) => Promise<void>;
  updatePaymentStatus: (id: string, isPaid: boolean) => Promise<void>;
  shareTrack: (id: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  openUploadPlatformsDialog: (id: string) => void;
  updateTrackCaption: (requestId: string, trackUrl: string, newCaption: string) => Promise<boolean>;
  handleDirectFileUpload: (id: string, file: File) => Promise<void>;
}

const RequestTableRow: React.FC<RequestTableRowProps> = ({
  request,
  updateStatus,
  updatePaymentStatus,
  shareTrack,
  deleteRequest,
  openUploadPlatformsDialog,
  updateTrackCaption,
  handleDirectFileUpload,
}) => {
  const { toast } = useToast();
  const [isEditingCaption, setIsEditingCaption] = useState<string | null>(null); // Stores track URL being edited
  const [newCaption, setNewCaption] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getPaymentBadge = (isPaid: boolean) => {
    return isPaid ? (
      <Badge variant="default" className="bg-blue-500">Paid</Badge>
    ) : (
      <Badge variant="destructive">Unpaid</Badge>
    );
  };

  const handleCaptionEdit = (trackUrl: string, currentCaption: string) => {
    setIsEditingCaption(trackUrl);
    setNewCaption(currentCaption);
  };

  const saveCaption = async (trackUrl: string) => {
    const success = await updateTrackCaption(request.id, trackUrl, newCaption);
    if (success) {
      setIsEditingCaption(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/')) {
        await handleDirectFileUpload(request.id, file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Only audio files can be dropped here.",
          variant: "destructive",
        });
      }
    }
  };

  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

  return (
    <TableRow key={request.id} className={isDragging ? 'bg-blue-50' : ''}>
      <TableCell>
        <div className="font-medium">{format(new Date(request.created_at), 'MMM dd, yyyy')}</div>
        <div className="text-sm text-gray-500">{format(new Date(request.created_at), 'HH:mm')}</div>
      </TableCell>
      <TableCell className="font-medium">
        <div>{request.song_title}</div>
        <div className="text-sm text-gray-500">{request.musical_or_artist}</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
            <Badge key={index} variant="outline" className="capitalize">
              {type.replace('-', ' ')}
            </Badge>
          )) : <Badge variant="outline">Not specified</Badge>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          <CalendarIcon className="w-4 h-4 mr-1 text-gray-500" />
          {request.delivery_date
            ? format(new Date(request.delivery_date), 'MMM dd, yyyy')
            : 'Not specified'}
        </div>
      </TableCell>
      <TableCell>
        {getStatusBadge(request.status)}
        <Select
          value={request.status}
          onValueChange={(value: BackingRequest['status']) => updateStatus(request.id, value)}
        >
          <SelectTrigger className="w-[120px] h-8 mt-1">
            <SelectValue placeholder="Update Status" />
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
        {getPaymentBadge(request.is_paid)}
        <Select
          value={request.is_paid ? 'paid' : 'unpaid'}
          onValueChange={(value) => updatePaymentStatus(request.id, value === 'paid')}
        >
          <SelectTrigger className="w-[120px] h-8 mt-1">
            <SelectValue placeholder="Update Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell
        className={cn(
          "relative p-2 border-2 border-dashed rounded-md transition-all duration-200",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {request.track_urls && request.track_urls.length > 0 ? (
          <div className="space-y-1">
            {request.track_urls.map((track, trackIndex) => (
              <div key={trackIndex} className="flex items-center justify-between text-sm">
                {isEditingCaption === track.url ? (
                  <Input
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    onBlur={() => saveCaption(track.url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveCaption(track.url);
                      }
                    }}
                    className="h-7 text-xs flex-grow mr-2"
                  />
                ) : (
                  <span className="flex-grow mr-2 truncate">{track.caption}</span>
                )}
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(track.url, '_blank')}
                    title="Download Track"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleCaptionEdit(track.url, track.caption)}
                    title="Edit Caption"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center">Drag & drop audio here or use actions</p>
        )}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-100 bg-opacity-75 text-blue-800 font-bold text-sm pointer-events-none">
            Drop audio file here
          </div>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to={`/track/${request.id}`}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </Link>
            </DropdownMenuItem>
            {request.sheet_music_url && (
              <DropdownMenuItem onClick={() => window.open(request.sheet_music_url, '_blank')}>
                <LinkIcon className="mr-2 h-4 w-4" /> View Sheet Music
              </DropdownMenuItem>
            )}
            {request.voice_memo_url && (
              <DropdownMenuItem onClick={() => window.open(request.voice_memo_url, '_blank')}>
                <LinkIcon className="mr-2 h-4 w-4" /> View Voice Memo
              </DropdownMenuItem>
            )}
            {request.youtube_link && (
              <DropdownMenuItem onClick={() => window.open(request.youtube_link, '_blank')}>
                <LinkIcon className="mr-2 h-4 w-4" /> View YouTube Link
              </DropdownMenuItem>
            )}
            {request.additional_links && (
              <DropdownMenuItem onClick={() => window.open(request.additional_links, '_blank')}>
                <LinkIcon className="mr-2 h-4 w-4" /> View Additional Links
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => shareTrack(request.id)}>
              <Share2 className="mr-2 h-4 w-4" /> Share Client Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openUploadPlatformsDialog(request.id)}>
              <Upload className="mr-2 h-4 w-4" /> Upload Platforms
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => deleteRequest(request.id)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Request
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default RequestTableRow;
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Music, 
  User, 
  Mail, 
  Link as LinkIcon, 
  FileText, 
  Headphones, 
  Target, 
  Key, 
  Folder,
  RefreshCw,
  AlertCircle,
  Loader2,
  Download,
  Edit,
  DollarSign,
  Eye,
  Share2,
  CreditCard,
  Save,
  Copy,
  Files,
  Mic,
  Youtube,
  Zap,
  StickyNote,
  Trash2,
  UploadCloud,
  Play,
  Pause,
  FileAudio,
  Phone,
  Layers,
  Compass,
  ExternalLink
} from 'lucide-react';
import { getSafeBackingTypes, downloadTrack } from '@/utils/helpers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import ErrorDisplay from '@/components/ErrorDisplay';
import { Separator } from '@/components/ui/separator';
import { calculateRequestCost } from '@/utils/pricing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';
import { BackingRequest, TrackInfo } from '@/types/backing-request';
import { uploadFileToSupabase } from '@/utils/supabase-client';
import FileInput from '@/components/FileInput';

const keyOptions = [
  { value: 'C Major (0)', label: 'C Major (0)' },
  { value: 'G Major (1♯)', label: 'G Major (1♯)' },
  { value: 'D Major (2♯)', label: 'D Major (2♯)' },
  { value: 'A Major (3♯)', label: 'A Major (3♯)' },
  { value: 'E Major (4♯)', label: 'E Major (4♯)' },
  { value: 'B Major (5♯)', label: 'B Major (5♯)' },
  { value: 'F♯ Major (6♯)', label: 'F♯ Major (6♯)' },
  { value: 'C♯ Major (7♯)', label: 'C♯ Major (7♯)' },
  { value: 'F Major (1♭)', label: 'F Major (1♭)' },
  { value: 'B♭ Major (2♭)', label: 'B♭ Major (2♭)' },
  { value: 'E♭ Major (3♭)', label: 'E♭ Major (3♭)' },
  { value: 'A♭ Major (4♭)', label: 'A♭ Major (4♭)' },
  { value: 'D♭ Major (5♭)', label: 'D♭ Major (5♭)' },
  { value: 'G♭ Major (6♭)', label: 'G♭ Major (6♭)' },
  { value: 'C♭ Major (7♭)', label: 'C♭ Major (7♭)' },
];

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: isAuthLoading } = useAdmin();
  const [request, setRequest] = useState<BackingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTriggeringDropbox, setIsTriggeringDropbox] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [editableFinalPrice, setEditableFinalPrice] = useState<string>('');
  const [isUpdatingFinalPrice, setIsUpdatingFinalPrice] = useState(false);

  // Track Upload & Management States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState<string | null>(null);
  const [currentEditCaption, setCurrentEditCaption] = useState<string>('');
  const [isUpdatingCaption, setIsUpdatingCaption] = useState(false);
  const [playingTrackUrl, setPlayingTrackUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAdmin) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate('/');
      } else {
        fetchRequest();
      }
    }
  }, [isAdmin, isAuthLoading, navigate, id]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('id', id)
        .single<BackingRequest>();
      
      if (error) throw error;
      setRequest(data);

      const calculatedCost = calculateRequestCost(data).totalCost;
      setEditableFinalPrice(data.final_price !== null && data.final_price !== undefined ? data.final_price.toFixed(2) : calculatedCost.toFixed(2));

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (field: keyof BackingRequest, value: any) => {
    if (!request) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase.from('backing_requests').update({ [field]: value }).eq('id', request.id);
      if (error) throw error;
      setRequest(prev => prev ? { ...prev, [field]: value } : null);
      toast({ title: "Update Successful" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFinalPriceBlur = async () => {
    const parsedPrice = editableFinalPrice.trim() === '' ? null : parseFloat(editableFinalPrice);
    if (parsedPrice !== request?.final_price) {
      setIsUpdatingFinalPrice(true);
      try {
        const { error } = await supabase.from('backing_requests').update({ final_price: parsedPrice }).eq('id', request!.id);
        if (error) throw error;
        setRequest(prev => prev ? { ...prev, final_price: parsedPrice } : null);
        toast({ title: "Price Updated" });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsUpdatingFinalPrice(false);
      }
    }
  };

  const triggerDropboxAutomation = async () => {
    if (!request) return;
    setIsTriggeringDropbox(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ formData: request })
      });
      if (response.ok) {
        toast({ title: "Success", description: "Dropbox automation triggered." });
        fetchRequest();
      } else {
        throw new Error('Failed to trigger Dropbox automation');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsTriggeringDropbox(false);
    }
  };

  const handleCopyRequestDetails = () => {
    if (!request) return;
    
    const tierLabel = request.track_type?.replace('-', ' ').toUpperCase() || 'NOT SPECIFIED';
    
    const details = `🎵 Song: ${request.song_title} by ${request.musical_or_artist}
👤 Client: ${request.name || 'N/A'} (${request.email})
🔑 Key: ${request.song_key || 'N/A'}${request.different_key === 'Yes' ? ` -> ${request.key_for_track}` : ''}
📅 Due: ${request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
🎼 Tier: ${tierLabel}
📝 Special Requests: ${request.special_requests || 'None'}
🔗 Admin Link: ${window.location.origin}/admin/request/${request.id}`;

    navigator.clipboard.writeText(details);
    toast({ title: "Copied!", description: "Request details copied to clipboard." });
  };

  // Unified Track Upload Function
  const uploadTrackFile = async (file: File, caption: string) => {
    if (!request) return;
    setIsUploading(true);
    try {
      const folderPath = `tracks/${request.id}/`;
      const { data: uploadData, error: uploadError } = await uploadFileToSupabase(file, folderPath);
      if (uploadError) throw uploadError;

      const relativePath = uploadData?.path;
      if (!relativePath) throw new Error("Failed to get uploaded file path.");

      const { data: { publicUrl } } = supabase.storage.from('tracks').getPublicUrl(relativePath);

      const currentTrackUrls = request.track_urls || [];
      const updatedTrackUrls = [...currentTrackUrls, { url: publicUrl, caption: caption || file.name }];

      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', request.id);

      if (updateError) throw updateError;

      setRequest(prev => prev ? { ...prev, track_urls: updatedTrackUrls } : null);
      toast({ title: "Track Uploaded Successfully" });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadTrack = async () => {
    if (!uploadFile) return;
    await uploadTrackFile(uploadFile, uploadCaption);
    setUploadFile(null);
    setUploadCaption('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        const caption = file.name.replace(/\.[^/.]+$/, "");
        await uploadTrackFile(file, caption);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Only audio files (e.g., MP3) can be uploaded here.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveTrack = async (urlToRemove: string) => {
    if (!request) return;
    if (!confirm("Are you sure you want to delete this track?")) return;

    try {
      const currentTrackUrls = request.track_urls || [];
      const updatedTrackUrls = currentTrackUrls.filter(track => track.url !== urlToRemove);

      const { error } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', request.id);

      if (error) throw error;

      setRequest(prev => prev ? { ...prev, track_urls: updatedTrackUrls } : null);
      toast({ title: "Track Deleted Successfully" });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleEditCaptionClick = (track: TrackInfo) => {
    setIsEditingCaption(track.url);
    setCurrentEditCaption(String(track.caption || ''));
  };

  const handleSaveCaption = async (trackUrl: string) => {
    if (!request) return;
    setIsUpdatingCaption(true);
    try {
      const currentTrackUrls = request.track_urls || [];
      const updatedTrackUrls = currentTrackUrls.map(track => 
        track.url === trackUrl ? { ...track, caption: currentEditCaption } : track
      );

      const { error } = await supabase
        .from('backing_requests')
        .update({ track_urls: updatedTrackUrls })
        .eq('id', request.id);

      if (error) throw error;

      setRequest(prev => prev ? { ...prev, track_urls: updatedTrackUrls } : null);
      setIsEditingCaption(null);
      toast({ title: "Caption Updated Successfully" });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingCaption(false);
    }
  };

  const handlePlayPause = (url: string) => {
    if (playingTrackUrl === url) {
      audioElement?.pause();
      setPlayingTrackUrl(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(url);
      audio.play();
      setAudioElement(audio);
      setPlayingTrackUrl(url);
      audio.onended = () => setPlayingTrackUrl(null);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  if (isAuthLoading || loading || !request) return <div className="p-8 text-center">Loading...</div>;

  const costBreakdown = calculateRequestCost(request);
  const guestLink = request.guest_access_token 
    ? `${window.location.origin}/track/${request.id}?token=${request.guest_access_token}`
    : '';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <Button onClick={() => navigate('/admin')} variant="outline">← Back to Dashboard</Button>
            <h1 className="text-3xl font-bold text-[#1C0357]">Request Details</h1>
            <span className="text-lg text-[#1C0357]/90">#{request.id.substring(0, 8)}</span>
          </div>

          {/* Action Bar */}
          <Card className="shadow-lg mb-6 border-2 border-[#F538BC]">
            <CardContent className="p-4 flex flex-wrap gap-3 justify-between items-center">
              <div className="flex flex-wrap gap-3">
                <Link to={`/admin/request/${id}/edit`}><Button className="bg-[#1C0357] hover:bg-[#1C0357]/90"><Edit className="mr-2 h-4 w-4" /> Edit Request</Button></Link>
                <Link to={`/track/${id}`}><Button variant="outline"><Eye className="w-4 h-4 mr-2" /> Client View</Button></Link>
                <Button onClick={() => navigate(`/email-generator/${id}`)} variant="outline"><Mail className="mr-2 h-4 w-4" /> Email Client</Button>
                <Button onClick={handleCopyRequestDetails} variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy Details</Button>
              </div>
              <div className="flex gap-3">
                <Button onClick={triggerDropboxAutomation} disabled={isTriggeringDropbox || !!request.dropbox_folder_id} variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">
                  {isTriggeringDropbox ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Status and Payment Update */}
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-[#D1AAF2]/20">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center"><CreditCard className="mr-2 h-5 w-5" /> Quick Status Update</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div>
                  <Label className="text-sm mb-1">Request Status</Label>
                  <Select value={request.status || 'pending'} onValueChange={(v) => handleUpdateField('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1">Payment Status</Label>
                  <Select value={request.is_paid ? 'paid' : 'unpaid'} onValueChange={(v) => handleUpdateField('is_paid', v === 'paid')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Label className="text-sm mb-1 flex items-center"><DollarSign className="mr-1 h-4 w-4" /> Final Price (AUD)</Label>
                  <Input type="number" step="0.01" value={editableFinalPrice} onChange={(e) => setEditableFinalPrice(e.target.value)} onBlur={handleFinalPriceBlur} className="font-bold" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Tracks & Uploads Section */}
          <Card 
            className={cn(
              "shadow-lg mb-6 border-2 transition-all duration-200 relative overflow-hidden",
              isDragging ? "border-[#F538BC] bg-[#F538BC]/5" : "border-[#1C0357]/20"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-[#1C0357]/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50 pointer-events-none">
                <UploadCloud className="h-16 w-16 animate-bounce mb-4 text-[#F538BC]" />
                <p className="text-2xl font-black">Drop to Upload Track</p>
                <p className="text-sm text-white/70 mt-1">Instantly upload and link this audio file</p>
              </div>
            )}

            <CardHeader className="bg-[#1C0357]/5">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <FileAudio className="mr-2 h-5 w-5 text-[#F538BC]" /> Completed Tracks & Uploads
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Existing Tracks List */}
              <div>
                <h3 className="font-semibold text-sm mb-3 text-gray-700">Current Tracks:</h3>
                {request.track_urls && request.track_urls.length > 0 ? (
                  <ul className="space-y-3">
                    {request.track_urls.map((track, index) => (
                      <li key={track.url} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl bg-white shadow-sm gap-3">
                        <div className="flex-1 flex items-center min-w-0 gap-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePlayPause(track.url)}
                            className={cn(
                              "h-10 w-10 rounded-full flex-shrink-0",
                              playingTrackUrl === track.url ? "bg-red-50 text-red-600" : "bg-purple-50 text-[#1C0357]"
                            )}
                          >
                            {playingTrackUrl === track.url ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                          </Button>
                          
                          {isEditingCaption === track.url ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={currentEditCaption}
                                onChange={(e) => setCurrentEditCaption(e.target.value)}
                                className="h-9"
                                disabled={isUpdatingCaption}
                              />
                              <Button size="sm" onClick={() => handleSaveCaption(track.url)} disabled={isUpdatingCaption}>
                                {isUpdatingCaption ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setIsEditingCaption(null)} disabled={isUpdatingCaption}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-[#1C0357] truncate">{track.caption || `Track ${index + 1}`}</p>
                              <p className="text-xs text-gray-400 truncate">{track.url}</p>
                            </div>
                          )}
                        </div>

                        {isEditingCaption !== track.url && (
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Button size="sm" variant="ghost" onClick={() => handleEditCaptionClick(track)}>
                              <Edit className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleRemoveTrack(track.url)} className="hover:bg-red-50">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => downloadTrack(track.url, typeof track.caption === 'string' ? track.caption : 'track.mp3')}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No tracks uploaded yet for this request.</p>
                )}
              </div>

              <Separator />

              {/* Upload New Track Form */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <h3 className="font-bold text-sm text-[#1C0357] flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-[#F538BC]" /> Upload New Track
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FileInput
                      id="track-file-input"
                      label="Select Audio File"
                      icon={FileAudio}
                      accept="audio/*"
                      onChange={(files) => setUploadFile(files ? files[0] : null)}
                      disabled={isUploading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="track-caption" className="text-xs font-bold text-gray-500 uppercase">Track Caption / Label</Label>
                    <Input 
                      id="track-caption" 
                      value={uploadCaption} 
                      onChange={(e) => setUploadCaption(e.target.value)} 
                      placeholder="e.g., Final Mix, Version 2, Melody Guide" 
                      disabled={isUploading}
                      className="bg-white h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleUploadTrack} 
                    disabled={!uploadFile || isUploading}
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" /> Upload Track
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card className="shadow-lg mb-6 bg-[#1C0357] text-white">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><DollarSign className="mr-2 h-5 w-5" /> Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {costBreakdown.baseCosts.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="font-medium">{item.type}</span>
                    <span className="font-bold">${item.cost.toFixed(2)}</span>
                  </div>
                ))}
                {costBreakdown.serviceCosts.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-white/80">
                    <span>+ {item.service}</span>
                    <span>${item.cost.toFixed(2)}</span>
                  </div>
                ))}
                <Separator className="bg-white/20 my-4" />
                <div className="flex justify-between items-center text-2xl font-black">
                  <span>Total Estimated</span>
                  <span className="text-[#F538BC]">${costBreakdown.totalCost.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials Card */}
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-[#D1AAF2]/20">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center"><Files className="mr-2 h-5 w-5" /> Client Materials</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center"><FileText className="mr-2 h-5 w-5" /> Sheet Music</h3>
                  <div className="space-y-2">
                    {request.sheet_music_urls && request.sheet_music_urls.length > 0 ? (
                      request.sheet_music_urls.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                          <span className="text-sm font-medium truncate flex-1 mr-2">{file.caption || `PDF ${i+1}`}</span>
                          <Button size="sm" variant="outline" onClick={() => window.open(file.url, '_blank')}><Download className="h-4 w-4" /></Button>
                        </div>
                      ))
                    ) : request.sheet_music_url ? (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <span className="text-sm font-medium truncate flex-1 mr-2">Legacy Sheet Music</span>
                        <Button size="sm" variant="outline" onClick={() => window.open(request.sheet_music_url!, '_blank')}><Download className="h-4 w-4" /></Button>
                      </div>
                    ) : <p className="text-sm text-gray-500">No sheet music provided.</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center"><Mic className="mr-2 h-5 w-5" /> Voice Memos</h3>
                  <div className="space-y-2">
                    {request.voice_memo_urls && request.voice_memo_urls.length > 0 ? (
                      request.voice_memo_urls.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                          <span className="text-sm font-medium truncate flex-1 mr-2">{file.caption || `Memo ${i+1}`}</span>
                          <Button size="sm" variant="outline" onClick={() => window.open(file.url, '_blank')}><Download className="h-4 w-4" /></Button>
                        </div>
                      ))
                    ) : request.voice_memo ? (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <span className="text-sm font-medium truncate flex-1 mr-2">Legacy Voice Memo</span>
                        <Button size="sm" variant="outline" onClick={() => window.open(request.voice_memo!, '_blank')}><Download className="h-4 w-4" /></Button>
                      </div>
                    ) : <p className="text-sm text-gray-500">No voice memos provided.</p>}
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 flex items-center"><Youtube className="mr-1 h-4 w-4" /> YouTube Reference</p>
                  {request.youtube_link ? <a href={request.youtube_link} target="_blank" className="text-blue-600 hover:underline text-sm truncate block">{request.youtube_link}</a> : <p className="text-sm">None</p>}
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center"><LinkIcon className="mr-1 h-4 w-4" /> Additional Links</p>
                  {request.additional_links ? <a href={request.additional_links} target="_blank" className="text-blue-600 hover:underline text-sm truncate block">{request.additional_links}</a> : <p className="text-sm">None</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card className="shadow-lg mb-6 border-2 border-yellow-200 bg-yellow-50/30">
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-[#1C0357]"><StickyNote className="mr-2 h-5 w-5 text-yellow-600" /> Internal Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea 
                value={request.internal_notes || ''} 
                onChange={(e) => setRequest(prev => prev ? { ...prev, internal_notes: e.target.value } : null)}
                onBlur={() => handleUpdateField('internal_notes', request.internal_notes)}
                placeholder="Add private notes (e.g., Season Pack usage)..."
                className="bg-white min-h-[100px]"
              />
              <p className="text-[10px] text-gray-400 mt-2 italic">Notes are saved automatically when you click away.</p>
            </CardContent>
          </Card>

          {/* Request Information Card */}
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-[#D1AAF2]/20">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <Music className="mr-2 h-5 w-5" /> Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Client Details */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} /> Client Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-semibold text-[#1C0357]">{request.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email Address</p>
                      <p className="font-semibold text-[#1C0357]">{request.email}</p>
                    </div>
                    {request.phone && (
                      <div>
                        <p className="text-xs text-gray-500">Phone Number</p>
                        <p className="font-semibold text-[#1C0357]">{request.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Linked User ID</p>
                      <p className="font-mono text-xs text-gray-600">{request.user_id || 'Guest (Not Linked)'}</p>
                    </div>
                  </div>
                </div>

                {/* Song Details */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Music size={14} /> Song Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Song Title</p>
                      <p className="font-semibold text-[#1C0357]">{request.song_title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Musical or Artist</p>
                      <p className="font-semibold text-[#1C0357]">{request.musical_or_artist}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Key Signature</p>
                      <p className="font-semibold text-[#1C0357]">{request.song_key || 'N/A'}</p>
                    </div>
                    {request.different_key === 'Yes' && (
                      <div>
                        <p className="text-xs text-gray-500">Requested Transposition Key</p>
                        <Badge className="bg-[#F538BC] text-white font-bold mt-0.5">
                          {request.key_for_track || 'N/A'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline & Tier */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} /> Timeline & Tier
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Pricing Tier</p>
                      <Badge className="capitalize bg-[#1C0357] mt-0.5">{request.track_type?.replace('-', ' ')}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Track Purpose</p>
                      <p className="font-semibold text-[#1C0357] capitalize">{request.track_purpose?.replace('-', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="font-semibold text-[#1C0357]">{request.category || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Delivery Date</p>
                      <p className="font-semibold text-[#1C0357]">
                        {request.delivery_date ? format(new Date(request.delivery_date), 'MMMM dd, yyyy') : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Add-ons & Services */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={14} /> Add-ons & Services
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Additional Services</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {request.additional_services && request.additional_services.length > 0 ? (
                          request.additional_services.map((s, i) => (
                            <Badge key={i} variant="outline" className="capitalize border-purple-200 text-purple-700 bg-purple-50/50">
                              {s.replace('-', ' ')}
                            </Badge>
                          ))
                        ) : <span className="text-gray-500">None</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Special Requests / Instructions</p>
                      <p className="text-gray-700 whitespace-pre-wrap text-xs mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {request.special_requests || 'No special requests provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System & Payment Metadata */}
          <Card className="shadow-lg mb-6 border border-gray-200">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg text-[#1C0357] flex items-center">
                <Folder className="mr-2 h-5 w-5 text-gray-500" /> System & Payment Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Dropbox Folder ID</p>
                    <p className="font-mono text-xs text-gray-700 bg-gray-100 p-2 rounded mt-1 truncate">
                      {request.dropbox_folder_id || 'Not Created'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Stripe Session ID</p>
                    <p className="font-mono text-xs text-gray-700 bg-gray-100 p-2 rounded mt-1 truncate">
                      {request.stripe_session_id || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Guest Access Token</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-xs text-gray-700 bg-gray-100 p-2 rounded truncate flex-1">
                        {request.guest_access_token || 'N/A'}
                      </p>
                      {request.guest_access_token && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleCopyText(guestLink, "Guest Link")}
                          className="h-8"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Link
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created At</p>
                    <p className="font-semibold text-gray-700 mt-1">
                      {request.created_at ? format(new Date(request.created_at), 'MMMM dd, yyyy HH:mm:ss') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-4">
            <Button onClick={() => navigate('/admin')} variant="outline">Back to Dashboard</Button>
            <Link to={`/admin/request/${id}/edit`}><Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">Edit Request</Button></Link>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RequestDetails;
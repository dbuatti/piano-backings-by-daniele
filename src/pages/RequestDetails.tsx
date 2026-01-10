import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
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
  Copy // Added Copy icon
} from 'lucide-react';
import { getSafeBackingTypes, downloadTrack } from '@/utils/helpers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Separator } from '@/components/ui/separator';
import { calculateRequestCost } from '@/utils/pricing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined;
}

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  song_key: string | null;
  different_key: string | null;
  key_for_track: string | null;
  youtube_link: string | null;
  voice_memo: string | null;
  sheet_music_url: string | null;
  track_purpose: string | null;
  backing_type: string[] | string | null;
  delivery_date: string | null;
  additional_services: string[] | null;
  special_requests: string | null;
  category: string | null;
  track_type: string | null;
  additional_links: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: { url: string; caption: string | boolean | null | undefined }[];
  shared_link?: string | null;
  dropbox_folder_id?: string | null;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; } | null;
  cost?: number | null;
  final_price?: number | null;
  estimated_cost_low?: number | null;
  estimated_cost_high?: number | null;
  user_id?: string | null;
  guest_access_token?: string | null;
}

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

const categoryOptions = [
  { value: 'Practice Tracks', label: 'Practice Tracks' },
  { value: 'Audition Tracks', label: 'Audition Tracks' },
  { value: 'Melody Bash Tracks', label: 'Melody Bash Tracks' },
  { value: 'Performance Tracks', label: 'Performance Tracks' },
  { value: 'General', label: 'General' }
];

const trackTypeOptions = [
  { value: 'quick', label: 'Quick Reference' },
  { value: 'one-take', label: 'One-Take Recording' },
  { value: 'polished', label: 'Polished Backing' }
];

const backingTypeOptions = [
  { value: 'full-song', label: 'Full Song Backing' },
  { value: 'audition-cut', label: 'Audition Cut Backing' },
  { value: 'note-bash', label: 'Note/Melody Bash' }
];

const additionalServiceOptions = [
  { value: 'rush-order', label: 'Rush Order' },
  { value: 'complex-songs', label: 'Complex Songs' },
  { value: 'additional-edits', label: 'Additional Edits' },
  { value: 'exclusive-ownership', label: 'Exclusive Ownership' }
];

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<BackingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTriggeringDropbox, setIsTriggeringDropbox] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPricing, setIsUpdatingPricing] = useState(false); // New state for pricing update

  // States for editable pricing fields
  const [editableFinalPrice, setEditableFinalPrice] = useState<string>(''); // Renamed from finalPriceInput
  const [isUpdatingFinalPrice, setIsUpdatingFinalPrice] = useState(false); // New state for final price update
  const [estimatedLowInput, setEstimatedLowInput] = useState<string>('');
  const [estimatedHighInput, setEstimatedHighInput] = useState<string>('');

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      if (adminEmails.includes(session.user.email)) {
        setIsAdmin(true);
        fetchRequest();
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
      }
    };
    
    checkAdminAccess();
  }, [navigate, toast, id]);

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

      // Initialize pricing input fields
      const calculatedCost = calculateRequestCost(data).totalCost;
      const calculatedLow = (calculatedCost * 0.5);
      const calculatedHigh = (calculatedCost * 1.5);

      setEditableFinalPrice(data.final_price !== null ? data.final_price.toFixed(2) : calculatedCost.toFixed(2)); // Use calculated cost as default
      setEstimatedLowInput(data.estimated_cost_low !== null ? data.estimated_cost_low.toFixed(2) : calculatedLow.toFixed(2));
      setEstimatedHighInput(data.estimated_cost_high !== null ? data.estimated_cost_high.toFixed(2) : calculatedHigh.toFixed(2));

    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch request: ${error.message}`,
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (field: keyof BackingRequest, value: any) => {
    if (!request) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ [field]: value })
        .eq('id', request.id);

      if (error) throw error;

      setRequest(prev => prev ? { ...prev, [field]: value } : null);
      toast({
        title: "Update Successful",
        description: `${field.replace('_', ' ')} updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update ${field}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFinalPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableFinalPrice(e.target.value);
  };

  const handleFinalPriceBlur = async () => {
    const parsedPrice = editableFinalPrice.trim() === '' ? null : parseFloat(editableFinalPrice);
    const currentFinalPrice = request?.final_price; // Use the actual stored final_price

    // Only update if the parsed price is different from the stored price
    if (parsedPrice !== currentFinalPrice) {
      await handleUpdateFinalPrice(parsedPrice);
    } else {
      // If the value is the same, just ensure the input displays the formatted value
      setEditableFinalPrice(currentFinalPrice !== null ? currentFinalPrice.toFixed(2) : '');
    }
  };

  const handleFinalPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleUpdateFinalPrice = async (newPrice: number | null) => {
    if (!request) return;
    setIsUpdatingFinalPrice(true);
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ final_price: newPrice })
        .eq('id', request.id);

      if (error) throw error;

      setRequest(prev => prev ? { ...prev, final_price: newPrice } : null);
      toast({
        title: "Price Updated",
        description: "Final agreed price saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update final price: ${error.message}`,
        variant: "destructive",
      });
      // Revert input to original value on error
      setEditableFinalPrice(request.final_price !== null ? request.final_price.toFixed(2) : calculateRequestCost(request!).totalCost.toFixed(2));
    } finally {
      setIsUpdatingFinalPrice(false);
    }
  };

  const handleUpdatePricing = async () => {
    if (!request) return;
    setIsUpdatingPricing(true);

    const updates: Partial<BackingRequest> = {};

    // Parse and validate estimated low
    const parsedEstimatedLow = estimatedLowInput.trim() === '' ? null : parseFloat(estimatedLowInput);
    if (estimatedLowInput.trim() !== '' && isNaN(parsedEstimatedLow!)) {
      toast({ title: "Validation Error", description: "Estimated Low must be a valid number.", variant: "destructive" });
      setIsUpdatingPricing(false);
      return;
    }
    updates.estimated_cost_low = parsedEstimatedLow;

    // Parse and validate estimated high
    const parsedEstimatedHigh = estimatedHighInput.trim() === '' ? null : parseFloat(estimatedHighInput);
    if (estimatedHighInput.trim() !== '' && isNaN(parsedEstimatedHigh!)) {
      toast({ title: "Validation Error", description: "Estimated High must be a valid number.", variant: "destructive" });
      setIsUpdatingPricing(false);
      return;
    }
    updates.estimated_cost_high = parsedEstimatedHigh;

    try {
      const { error } = await supabase
        .from('backing_requests')
        .update(updates)
        .eq('id', request.id);

      if (error) throw error;

      setRequest(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Pricing Updated",
        description: "Manual pricing fields saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update pricing: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPricing(false);
    }
  };

  const triggerDropboxAutomation = async () => {
    if (!request) return;
    setIsTriggeringDropbox(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to trigger this function');
      }
      
      // Reconstruct formData from the current request state
      const formData = {
        email: request.email,
        name: request.name,
        songTitle: request.song_title,
        musicalOrArtist: request.musical_or_artist,
        songKey: request.song_key,
        differentKey: request.different_key,
        keyForTrack: request.key_for_track,
        youtubeLink: request.youtube_link,
        additionalLinks: request.additional_links,
        voiceMemo: request.voice_memo,
        sheetMusicUrl: request.sheet_music_url,
        trackPurpose: request.track_purpose,
        backingType: request.backing_type,
        deliveryDate: request.delivery_date,
        additionalServices: request.additional_services,
        specialRequests: request.special_requests,
        category: request.category,
        trackType: request.track_type
      };
      
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ formData })
        }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Dropbox automation triggered successfully.",
        });
        
        // Update the request state with the new folder ID if successful
        if (result.dropboxFolderId) {
          setRequest(prev => prev ? { ...prev, dropbox_folder_id: result.dropboxFolderId } : null);
        }
        fetchRequest(); // Re-fetch to ensure all fields are updated
      } else {
        throw new Error(result.error || 'Failed to trigger Dropbox automation');
      }
    } catch (error: any) {
      console.error('Error triggering Dropbox automation:', error);
      toast({
        title: "Error",
        description: `Failed to trigger Dropbox automation: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTriggeringDropbox(false);
    }
  };

  const handleCopyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: message,
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
          <p className="ml-4 text-lg text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Request not found.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);
  const calculatedCostBreakdown = calculateRequestCost(request);
  const calculatedTotalCost = calculatedCostBreakdown.totalCost;

  // Determine displayed cost and range
  const displayedEstimatedLow = request.estimated_cost_low !== null ? request.estimated_cost_low : (calculatedTotalCost * 0.5);
  const displayedEstimatedHigh = request.estimated_cost_high !== null ? request.estimated_cost_high : (calculatedTotalCost * 1.5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Button 
            onClick={() => navigate('/admin')} 
            variant="outline"
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-[#1C0357]">Request Details</h1>
          <span className="text-lg text-[#1C0357]/90">#{request.id.substring(0, 8)}</span>
        </div>

        {/* Action Bar */}
        <Card className="shadow-lg mb-6 border-2 border-[#F538BC]">
          <CardContent className="p-4 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex flex-wrap gap-3">
              <Link to={`/admin/request/${id}/edit`}>
                <Button 
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit Request
                </Button>
              </Link>
              <Link to={`/track/${id}`}>
                <Button variant="outline" className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" /> Client View
                </Button>
              </Link>
              <Button 
                onClick={() => navigate(`/email-generator/${id}`)}
                variant="outline" 
                className="flex items-center"
              >
                <Mail className="w-4 h-4 mr-2" /> Email Client
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={triggerDropboxAutomation}
                    disabled={isTriggeringDropbox || !!request.dropbox_folder_id}
                    variant="secondary"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isTriggeringDropbox ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {request.dropbox_folder_id ? 'Dropbox Folder Exists' : 'Trigger Dropbox Automation'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => navigate('/email-generator', { state: { request } })}
                    variant="secondary"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share Track Link</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Share Track Link
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Quick Status and Payment Update */}
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Quick Status Update
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <Label htmlFor="status-update" className="text-sm mb-1">Request Status</Label>
                <Select 
                  value={request.status || 'pending'} 
                  onValueChange={(value) => handleUpdateField('status', value as BackingRequest['status'])}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger id="status-update">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="payment-status-update" className="text-sm mb-1">Payment Status</Label>
                <Select 
                  value={request.is_paid ? 'paid' : 'unpaid'} 
                  onValueChange={(value) => handleUpdateField('is_paid', value === 'paid')}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger id="payment-status-update">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Label htmlFor="final-price-input-quick" className="text-sm mb-1 flex items-center">
                  <DollarSign className="mr-1 h-4 w-4" /> Final Agreed Price (AUD)
                </Label>
                <Input
                  id="final-price-input-quick"
                  type="number"
                  step="0.01"
                  value={editableFinalPrice}
                  onChange={handleFinalPriceInputChange}
                  onBlur={handleFinalPriceBlur}
                  onKeyDown={handleFinalPriceKeyDown}
                  placeholder={calculatedTotalCost.toFixed(2)} // Show calculated as placeholder
                  className={cn(
                    "w-full h-10 p-2 text-lg font-bold border-none focus:ring-0 focus:outline-none",
                    isUpdatingFinalPrice ? "opacity-70" : ""
                  )}
                  disabled={isUpdatingFinalPrice}
                />
                {isUpdatingFinalPrice && (
                  <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
                )}
                {request.final_price !== null && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600">(Manual)</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Management Card */}
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Estimated Pricing Range
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Manually set the estimated cost range for this request.
              These values will override the automatic calculation in client views and emails until a "Final Agreed Price" is set.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated-low-input" className="text-sm mb-1">Estimated Cost Lower Bound (AUD)</Label>
                  <Input
                    id="estimated-low-input"
                    type="number"
                    step="0.01"
                    value={estimatedLowInput}
                    onChange={(e) => setEstimatedLowInput(e.target.value)}
                    placeholder={displayedEstimatedLow.toFixed(2)}
                    disabled={isUpdatingPricing}
                  />
                  <p className="text-xs text-gray-500 mt-1">Overrides calculated lower bound.</p>
                </div>
                <div>
                  <Label htmlFor="estimated-high-input" className="text-sm mb-1">Estimated Cost Upper Bound (AUD)</Label>
                  <Input
                    id="estimated-high-input"
                    type="number"
                    step="0.01"
                    value={estimatedHighInput}
                    onChange={(e) => setEstimatedHighInput(e.target.value)}
                    placeholder={displayedEstimatedHigh.toFixed(2)}
                    disabled={isUpdatingPricing}
                  />
                  <p className="text-xs text-gray-500 mt-1">Overrides calculated upper bound.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdatePricing} 
                  disabled={isUpdatingPricing}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                >
                  {isUpdatingPricing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Range...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Estimated Range
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
              <span>Request Information</span>
              {getStatusBadge(request.status || 'pending')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Folder className="mr-1 h-4 w-4" /> Request ID
                    </p>
                    <p className="font-medium">{request.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> Submitted
                    </p>
                    <p className="font-medium">{format(new Date(request.created_at), 'MMMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <User className="mr-1 h-4 w-4" /> Name
                    </p>
                    <p className="font-medium">{request.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Mail className="mr-1 h-4 w-4" /> Email
                    </p>
                    <p className="font-medium">{request.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Folder className="mr-1 h-4 w-4" /> Category
                    </p>
                    <p className="font-medium">{request.category || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-5 w-5" />
                  Track Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Music className="mr-1 h-4 w-4" /> Song Title
                    </p>
                    <p className="font-medium">{request.song_title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Target className="mr-1 h-4 w-4" /> Musical/Artist
                    </p>
                    <p className="font-medium">{request.musical_or_artist}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Headphones className="mr-1 h-4 w-4" /> Backing Type
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                        <Badge key={index} className="capitalize">
                          {type.replace('-', ' ')}
                        </Badge>
                      )) : <Badge className="capitalize">Not specified</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Target className="mr-1 h-4 w-4" /> Track Purpose
                    </p>
                    <p className="font-medium capitalize">
                      {request.track_purpose?.replace('-', ' ') || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> Delivery Date
                    </p>
                    <p className="font-medium">
                      {request.delivery_date 
                        ? format(new Date(request.delivery_date), 'MMMM dd, yyyy') 
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Musical Information & References
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Key Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Song Key</p>
                    <p className="font-medium">{request.song_key || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Different Key Required</p>
                    <p className="font-medium">{request.different_key || 'No'}</p>
                  </div>
                  {request.different_key === 'Yes' && (
                    <div>
                      <p className="text-sm text-gray-500">Requested Key</p>
                      <p className="font-medium">{request.key_for_track || 'Not specified'}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <LinkIcon className="mr-2 h-5 w-5" />
                  References
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <LinkIcon className="mr-1 h-4 w-4" /> YouTube Link
                    </p>
                    {request.youtube_link ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={request.youtube_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline text-sm truncate block flex-1"
                        >
                          {request.youtube_link}
                        </a>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-[#1C0357]"
                                onClick={() => handleCopyToClipboard(request.youtube_link!, "YouTube link copied to clipboard")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy Link</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Music className="mr-1 h-4 w-4" /> Voice Memo
                    </p>
                    {request.voice_memo ? (
                      <a 
                        href={request.voice_memo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline text-sm truncate block"
                      >
                        {request.voice_memo}
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <FileText className="mr-1 h-4 w-4" /> Sheet Music
                    </p>
                    {request.sheet_music_url ? (
                      <a 
                        href={request.sheet_music_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View Sheet Music
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <LinkIcon className="mr-1 h-4 w-4" /> Additional Links
                    </p>
                    {request.additional_links ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={request.additional_links} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline text-sm truncate block flex-1"
                        >
                          {request.additional_links}
                        </a>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-[#1C0357]"
                                onClick={() => handleCopyToClipboard(request.additional_links!, "Additional link copied to clipboard")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy Link</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Folder className="mr-2 h-5 w-5" />
              Admin & Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Uploaded Tracks
                </h3>
                {request.track_urls && request.track_urls.length > 0 ? (
                  <ul className="space-y-2">
                    {request.track_urls.map((track: any, index: number) => (
                      <li key={track.url} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a href={track.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline truncate flex-1 mr-2">
                              {track.caption || `Track ${index + 1}`}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p>{track.url}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => downloadTrack(track.url, track.caption || `${request.song_title}.mp3`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No tracks uploaded yet.</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Dropbox & Sharing
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Dropbox Folder ID</p>
                    {request.dropbox_folder_id ? (
                      <div className="flex items-center gap-2">
                        <p className="font-medium break-all">{request.dropbox_folder_id}</p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-[#1C0357]"
                                onClick={() => handleCopyToClipboard(request.dropbox_folder_id!, "Dropbox Folder ID copied to clipboard")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy ID</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <p className="font-medium">Not created</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Shared Link</p>
                    {request.shared_link ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={request.shared_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline text-sm break-all flex-1"
                        >
                          {request.shared_link}
                        </a>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-[#1C0357]"
                                onClick={() => handleCopyToClipboard(request.shared_link!, "Shared link copied to clipboard")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy Link</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <p className="font-medium">Not shared</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Special Requests & Services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Headphones className="mr-2 h-5 w-5" />
                  Additional Services
                </h3>
                {request.additional_services && request.additional_services.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getSafeBackingTypes(request.additional_services).map((service: string, index: number) => (
                      <Badge key={index} variant="secondary" className="capitalize">
                        {service.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No additional services requested</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Special Requests
                </h3>
                <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {request.special_requests || 'No special requests provided'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button 
            onClick={() => navigate('/admin')} 
            variant="outline"
          >
            Back to Dashboard
          </Button>
          <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            Edit Request
          </Button>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default RequestDetails;
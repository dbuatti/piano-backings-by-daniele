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
  Copy,
  Files,
  Mic
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
  sheet_music_urls?: TrackInfo[]; // Added
  voice_memo_urls?: TrackInfo[];  // Added
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
  track_urls?: TrackInfo[];
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

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<BackingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTriggeringDropbox, setIsTriggeringDropbox] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPricing, setIsUpdatingPricing] = useState(false);

  const [editableFinalPrice, setEditableFinalPrice] = useState<string>('');
  const [isUpdatingFinalPrice, setIsUpdatingFinalPrice] = useState(false);
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
        toast({ title: "Access Denied", variant: "destructive" });
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

      const calculatedCost = calculateRequestCost(data).totalCost;
      setEditableFinalPrice(data.final_price !== null ? data.final_price.toFixed(2) : calculatedCost.toFixed(2));
      setEstimatedLowInput(data.estimated_cost_low !== null ? data.estimated_cost_low.toFixed(2) : (calculatedCost * 0.5).toFixed(2));
      setEstimatedHighInput(data.estimated_cost_high !== null ? data.estimated_cost_high.toFixed(2) : (calculatedCost * 1.5).toFixed(2));

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

  const handleCopyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: message });
  };

  if (loading || !request) return <div className="p-8 text-center">Loading...</div>;

  const costBreakdown = calculateRequestCost(request);
  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

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
                <Button onClick={() => navigate(`/email-generator/${id}`)} variant="outline"><Mail className="w-4 h-4 mr-2" /> Email Client</Button>
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

          {/* Materials Card - UPDATED FOR MULTIPLE FILES */}
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-[#D1AAF2]/20">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center"><Files className="mr-2 h-5 w-5" /> Client Materials</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center"><FileText className="mr-2 h-5 w-5" /> Sheet Music (PDFs)</h3>
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

          {/* Basic Info Card */}
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-[#D1AAF2]/20">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between"><span>Request Information</span></CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><p className="text-sm text-gray-500">Client</p><p className="font-medium">{request.name || 'N/A'} ({request.email})</p></div>
                  <div><p className="text-sm text-gray-500">Song</p><p className="font-medium">{request.song_title} by {request.musical_or_artist}</p></div>
                </div>
                <div className="space-y-4">
                  <div><p className="text-sm text-gray-500">Backing Type</p><div className="flex flex-wrap gap-1">{normalizedBackingTypes.map((t, i) => <Badge key={i}>{t.replace('-', ' ')}</Badge>)}</div></div>
                  <div><p className="text-sm text-gray-500">Delivery Date</p><p className="font-medium">{request.delivery_date ? format(new Date(request.delivery_date), 'MMMM dd, yyyy') : 'Not specified'}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-4">
            <Button onClick={() => navigate('/admin')} variant="outline">Back to Dashboard</Button>
            <Link to={`/admin/request/${id}/edit`}><Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">Edit Request</Button></Link>
          </div>
          <MadeWithDyad />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RequestDetails;
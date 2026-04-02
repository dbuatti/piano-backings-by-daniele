"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Music, 
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Mic,
  Headphones,
  Sparkles,
  Package,
  Ticket,
  User as UserIcon,
  CreditCard
} from 'lucide-react';
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useAppSettings } from '@/hooks/useAppSettings';
import Seo from "@/components/Seo";
import AuthOverlay from "@/components/AuthOverlay";
import SongRequestItem, { SongData } from '@/components/form/SongRequestItem';
import { calculateRequestCost } from '@/utils/pricing';

const createNewSong = (initialData: Partial<SongData> = {}): SongData => ({
  id: Math.random().toString(36).substring(7),
  songTitle: '',
  musicalOrArtist: '',
  songKey: '',
  differentKey: 'No',
  keyForTrack: '',
  youtubeLink: '',
  voiceMemoLink: '',
  sheetMusicFiles: [],
  voiceMemoFiles: [],
  ...initialData
});

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<any[]>([]);
  const [useCredit, setUseCredit] = useState(false);

  const { isHolidayModeActive, isServiceClosed, closureReason } = useAppSettings();
  const [songs, setSongs] = useState<SongData[]>(() => [createNewSong()]);

  const [globalData, setGlobalData] = useState({
    email: '',
    confirmEmail: '',
    name: '',
    category: 'Audition Tracks',
    trackType: 'audition-ready',
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
  });

  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setGlobalData(prev => ({
          ...prev,
          email: session.user.email || '',
          confirmEmail: session.user.email || '',
          name: session.user.user_metadata?.full_name || ''
        }));
        
        const { data: credits } = await supabase.from('user_credits').select('*').eq('user_id', session.user.id);
        setUserCredits(credits || []);
      } else {
        setTimeout(() => setShowAuthOverlay(true), 1500);
      }
    };
    checkUser();
  }, []);

  const currentTierCredits = useMemo(() => {
    return userCredits.find(c => c.credit_type === globalData.trackType)?.balance || 0;
  }, [userCredits, globalData.trackType]);

  const priceBreakdown = useMemo(() => {
    const mockRequest = { track_type: globalData.trackType, additional_services: globalData.additionalServices };
    const perSong = calculateRequestCost(mockRequest);
    return { total: useCredit ? 0 : perSong.totalCost * songs.length };
  }, [globalData.trackType, globalData.additionalServices, songs.length, useCredit]);

  const handleGlobalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGlobalData(prev => ({ ...prev, [name]: value }));
  };

  const handleSongChange = useCallback((id: string, field: string, value: any) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayModeActive || isServiceClosed) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const createdRequestIds: string[] = [];

      for (const song of songs) {
        const sheetMusicUrls = [];
        for (const file of song.sheetMusicFiles) {
          const { data: uploadData } = await supabase.storage.from('sheet-music').upload(`${Date.now()}-${file.name}`, file);
          const { data: { publicUrl } } = supabase.storage.from('sheet-music').getPublicUrl(uploadData!.path);
          sheetMusicUrls.push({ url: publicUrl, caption: file.name });
        }
        
        const submissionData = {
          formData: {
            ...globalData,
            ...song,
            sheetMusicUrls,
            is_paid: useCredit,
            internal_notes: useCredit ? "Paid via Season Pack Credit" : ""
          }
        };
        
        const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify(submissionData),
        });
        
        const result = await response.json();
        if (result.requestId) createdRequestIds.push(result.requestId);
      }

      if (useCredit && session) {
        await supabase.from('user_credits').update({ balance: currentTierCredits - songs.length }).eq('user_id', session.user.id).eq('credit_type', globalData.trackType);
        setIsSubmittedSuccessfully(true);
      } else if (priceBreakdown.total > 0) {
        // Redirect to Stripe
        const stripeResponse = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            request_ids: createdRequestIds,
            amount: priceBreakdown.total,
            customer_email: globalData.email,
            description: `Custom Backing Tracks: ${songs.map(s => s.songTitle).join(', ')}`
          }),
        });
        const stripeResult = await stripeResponse.json();
        if (stripeResult.url) window.location.href = stripeResult.url;
      } else {
        setIsSubmittedSuccessfully(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isServiceClosed) {
    return (
      <div className="min-h-screen bg-[#FDFCF7]">
        <Header />
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Requests Temporarily Closed</h1>
          <p className="mb-8">{closureReason}</p>
          <Button asChild className="bg-[#1C0357] rounded-full px-10 py-6 text-lg">
            <Link to="/shop">Browse the Shop Instead</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7]">
      <Seo title="Custom Piano Backing Request" description="Submit your custom piano backing track request." />
      <Header />
      
      <AuthOverlay isOpen={showAuthOverlay} onClose={() => setShowAuthOverlay(false)} redirectPath={location.pathname} />

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-3 tracking-tighter">
            Custom Backing <span className="text-[#F538BC]">Request</span>
          </h1>
        </header>

        {isSubmittedSuccessfully ? (
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white p-12 text-center">
            <CheckCircle className="h-20 w-20 mx-auto mb-6 text-green-500" />
            <h2 className="text-3xl font-bold mb-4">Submission Successful!</h2>
            <p className="text-gray-600 mb-8">Daniele will review your materials and start recording soon.</p>
            <Button onClick={() => navigate('/user-dashboard')} className="rounded-full bg-[#1C0357]">View My Requests</Button>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card className="rounded-3xl p-8">
              <h2 className="text-xl font-bold text-[#1C0357] mb-6 flex items-center gap-2">
                <UserIcon size={20} /> Contact Details
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input name="name" value={globalData.name} onChange={handleGlobalInputChange} disabled={!!user} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" value={globalData.email} onChange={handleGlobalInputChange} disabled={!!user} />
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              {songs.map((song, index) => (
                <SongRequestItem key={song.id} index={index} data={song} onChange={handleSongChange} onRemove={(id) => setSongs(s => s.filter(x => x.id !== id))} isOnlySong={songs.length === 1} />
              ))}
              <Button type="button" onClick={() => setSongs(s => [...s, createNewSong()])} className="w-full h-16 rounded-2xl border-2 border-dashed border-[#1C0357]/20 bg-gray-50/50 text-[#1C0357] font-black">
                <Plus className="mr-2" /> Add Another Song
              </Button>
            </div>

            <Card className="rounded-3xl p-8">
              <h2 className="text-xl font-bold text-[#1C0357] mb-6 flex items-center gap-2">
                <Sparkles size={20} /> Choose Your Tier
              </h2>
              <RadioGroup value={globalData.trackType} onValueChange={(v) => setGlobalData(p => ({ ...p, trackType: v }))} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'note-bash', icon: Mic, label: 'Note Bash', price: '$15' },
                  { id: 'audition-ready', icon: Headphones, label: 'Audition Ready', price: '$30' },
                  { id: 'full-song', icon: Sparkles, label: 'Full Song', price: '$50' }
                ].map((item) => (
                  <Label key={item.id} htmlFor={item.id} className={cn("cursor-pointer p-6 rounded-3xl border-2 text-center transition-all", globalData.trackType === item.id ? "border-[#1C0357] bg-[#1C0357]/5" : "border-gray-100")}>
                    <RadioGroupItem id={item.id} value={item.id} className="sr-only" />
                    <item.icon className="h-6 w-6 mx-auto mb-2 text-[#F538BC]" />
                    <span className="font-black block">{item.label}</span>
                    <span className="text-xs font-bold text-[#F538BC]">{item.price}</span>
                  </Label>
                ))}
              </RadioGroup>

              {currentTierCredits > 0 && (
                <div className="bg-[#D1AAF2]/20 p-6 rounded-2xl border-2 border-[#1C0357] flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Ticket className="text-[#1C0357]" />
                    <div>
                      <p className="font-black text-[#1C0357]">You have {currentTierCredits} Season Pack credits!</p>
                      <p className="text-xs text-gray-600">Apply a credit to this request?</p>
                    </div>
                  </div>
                  <Switch checked={useCredit} onCheckedChange={setUseCredit} />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" name="deliveryDate" value={globalData.deliveryDate} onChange={handleGlobalInputChange} min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
            </Card>

            <div className="bg-[#1C0357] text-white rounded-3xl p-8 text-center shadow-xl">
              <p className="text-xs font-black text-[#F538BC] uppercase tracking-widest mb-2">Total Amount Due</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-6xl font-black">${priceBreakdown.total.toFixed(2)}</span>
                <span className="text-sm font-bold opacity-40 ml-2">AUD</span>
              </div>
              {useCredit && <p className="text-green-400 font-bold mt-2">Season Pack Credit Applied!</p>}
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <Checkbox id="consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(v as boolean)} />
                <Label htmlFor="consent" className="text-sm font-bold text-gray-600">I understand the terms of service. *</Label>
              </div>
              <Button type="submit" disabled={isSubmitting || !consentChecked} className="h-20 rounded-full bg-[#1C0357] px-16 text-xl font-black w-full md:w-auto">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (
                  <span className="flex items-center gap-2">
                    {useCredit ? "Submit Request" : <><CreditCard /> Pay & Submit</>}
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (v: boolean) => void }) => (
  <button 
    type="button"
    onClick={() => onCheckedChange(!checked)}
    className={cn("w-12 h-6 rounded-full transition-colors relative", checked ? "bg-[#1C0357]" : "bg-gray-300")}
  >
    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", checked ? "left-7" : "left-1")} />
  </button>
);

export default FormPage;
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle,
  Loader2,
  Plus,
  Ticket,
  CreditCard,
  Music,
  ChevronRight,
  ArrowLeft
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
import ContactDetailsForm from '@/components/form/ContactDetailsForm';
import TierSelection from '@/components/form/TierSelection';
import AdditionalServices from '@/components/form/AdditionalServices';
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
    const mockRequest = { 
      track_type: globalData.trackType, 
      additional_services: globalData.additionalServices 
    };
    const perSong = calculateRequestCost(mockRequest);
    return { 
      total: useCredit ? 0 : perSong.totalCost * songs.length,
      perSong: perSong.totalCost
    };
  }, [globalData.trackType, globalData.additionalServices, songs.length, useCredit]);

  const handleGlobalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGlobalData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setGlobalData(prev => {
      const services = prev.additionalServices.includes(serviceId)
        ? prev.additionalServices.filter(id => id !== serviceId)
        : [...prev.additionalServices, serviceId];
      return { ...prev, additionalServices: services };
    });
  };

  const handleSongChange = useCallback((id: string, field: string, value: any) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayModeActive || isServiceClosed) return;

    if (globalData.email !== globalData.confirmEmail) {
      toast({ title: "Email Mismatch", description: "Please ensure your email addresses match.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const createdRequestIds: string[] = [];

      for (const song of songs) {
        // 1. Upload Sheet Music
        const sheetMusicUrls = [];
        for (const file of song.sheetMusicFiles) {
          const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('sheet-music').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('sheet-music').getPublicUrl(uploadData!.path);
          sheetMusicUrls.push({ url: publicUrl, caption: file.name });
        }

        // 2. Upload Voice Memos (if any)
        const voiceMemoUrls = [];
        for (const file of song.voiceMemoFiles) {
          const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(uploadData!.path);
          voiceMemoUrls.push({ url: publicUrl, caption: file.name });
        }
        
        const submissionData = {
          formData: {
            ...globalData,
            ...song,
            sheetMusicUrls,
            voiceMemoUrls,
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
        if (!response.ok) throw new Error(result.error || "Failed to create request");
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
      console.error("Submission error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isServiceClosed) {
    return (
      <div className="min-h-screen bg-[#FDFCF7]">
        <Header />
        <div className="max-w-3xl mx-auto py-32 px-4 text-center">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500">
            <XCircle size={40} />
          </div>
          <h1 className="text-4xl font-black text-[#1C0357] mb-6 tracking-tighter">Requests Temporarily Closed</h1>
          <p className="text-xl text-gray-600 font-medium mb-12 leading-relaxed">{closureReason}</p>
          <Button asChild className="bg-[#1C0357] hover:bg-[#2D0B8C] rounded-2xl px-12 py-8 text-xl font-black shadow-xl">
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

      <div className="max-w-4xl mx-auto py-24 px-4 sm:px-6">
        <header className="text-center mb-16">
          <Link to="/" className="inline-flex items-center text-sm font-black text-[#1C0357]/40 hover:text-[#1C0357] mb-8 transition-colors uppercase tracking-widest">
            <ArrowLeft size={14} className="mr-2" /> Back to Home
          </Link>
          <h1 className="text-5xl md:text-7xl font-black text-[#1C0357] mb-4 tracking-tighter">
            Custom Backing <span className="text-[#F538BC]">Request</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium">Professional accompaniment tailored to your voice.</p>
        </header>

        {isSubmittedSuccessfully ? (
          <Card className="border-none shadow-2xl rounded-[48px] overflow-hidden bg-white p-16 text-center">
            <div className="h-24 w-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-4xl font-black text-[#1C0357] mb-4 tracking-tighter">Submission Successful!</h2>
            <p className="text-xl text-gray-600 mb-12 font-medium">Daniele will review your materials and start recording soon.</p>
            <Button onClick={() => navigate('/user-dashboard')} className="rounded-2xl bg-[#1C0357] px-12 py-7 text-lg font-black shadow-xl">
              View My Requests <ChevronRight className="ml-2" />
            </Button>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-12">
            <ContactDetailsForm 
              name={globalData.name}
              email={globalData.email}
              confirmEmail={globalData.confirmEmail}
              onChange={handleGlobalInputChange}
              isUserLoggedIn={!!user}
            />

            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black text-[#1C0357] tracking-tight flex items-center gap-3">
                  <Music className="text-[#F538BC]" /> Your Songs
                </h2>
                <Badge variant="secondary" className="bg-[#D1AAF2]/20 text-[#1C0357] font-black">
                  {songs.length} {songs.length === 1 ? 'Song' : 'Songs'}
                </Badge>
              </div>
              
              <div className="space-y-6">
                {songs.map((song, index) => (
                  <SongRequestItem 
                    key={song.id} 
                    index={index} 
                    data={song} 
                    onChange={handleSongChange} 
                    onRemove={(id) => setSongs(s => s.filter(x => x.id !== id))} 
                    isOnlySong={songs.length === 1} 
                  />
                ))}
                <Button 
                  type="button" 
                  onClick={() => setSongs(s => [...s, createNewSong()])} 
                  className="w-full h-20 rounded-3xl border-2 border-dashed border-[#1C0357]/20 bg-white text-[#1C0357] font-black text-lg hover:bg-[#1C0357]/5 hover:border-[#1C0357]/40 transition-all"
                >
                  <Plus className="mr-2" /> Add Another Song
                </Button>
              </div>
            </div>

            <Card className="rounded-[40px] p-10 md:p-16 space-y-16 shadow-xl border-none bg-white">
              <TierSelection 
                value={globalData.trackType}
                onValueChange={(v) => setGlobalData(p => ({ ...p, trackType: v }))}
              />

              {currentTierCredits > 0 && (
                <div className="bg-[#D1AAF2]/10 p-8 rounded-3xl border-2 border-[#1C0357] flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[#1C0357] rounded-2xl flex items-center justify-center text-white">
                      <Ticket />
                    </div>
                    <div>
                      <p className="font-black text-xl text-[#1C0357]">You have {currentTierCredits} Season Pack credits!</p>
                      <p className="text-sm text-gray-600 font-medium">Apply a credit to this request?</p>
                    </div>
                  </div>
                  <Switch checked={useCredit} onCheckedChange={setUseCredit} />
                </div>
              )}

              <AdditionalServices 
                selectedServices={globalData.additionalServices}
                onToggleService={handleServiceToggle}
              />

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <Label htmlFor="deliveryDate" className="text-sm font-black uppercase tracking-widest text-gray-400">Requested Due Date</Label>
                  <Input 
                    id="deliveryDate"
                    type="date" 
                    name="deliveryDate" 
                    value={globalData.deliveryDate} 
                    onChange={handleGlobalInputChange} 
                    min={new Date().toISOString().split('T')[0]} 
                    className="h-14 rounded-2xl border-gray-200 font-bold"
                  />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Standard delivery is 3-5 business days.</p>
                </div>
              </div>
            </Card>

            <div className="bg-[#1C0357] text-white rounded-[40px] p-12 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F538BC]/10 blur-[80px] rounded-full" />
              <p className="text-xs font-black text-[#F538BC] uppercase tracking-[0.2em] mb-4 relative z-10">Total Amount Due</p>
              <div className="flex items-baseline justify-center gap-2 relative z-10">
                <span className="text-7xl md:text-8xl font-black tracking-tighter">${priceBreakdown.total.toFixed(2)}</span>
                <span className="text-lg font-bold opacity-40 uppercase tracking-widest">AUD</span>
              </div>
              {useCredit && <p className="text-green-400 font-black text-lg mt-4 relative z-10">Season Pack Credit Applied!</p>}
              {!useCredit && songs.length > 1 && (
                <p className="text-white/50 text-sm mt-6 font-bold uppercase tracking-widest relative z-10">
                  ({songs.length} songs @ ${priceBreakdown.perSong.toFixed(2)} each)
                </p>
              )}
            </div>

            <div className="flex flex-col items-center gap-8">
              <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-full shadow-sm border border-gray-100">
                <Checkbox 
                  id="consent" 
                  checked={consentChecked} 
                  onCheckedChange={(v) => setConsentChecked(v as boolean)} 
                  className="h-5 w-5 rounded-md border-2"
                />
                <Label htmlFor="consent" className="text-sm font-bold text-gray-600 cursor-pointer">I understand the terms of service. *</Label>
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting || !consentChecked} 
                className="h-24 rounded-[32px] bg-[#1C0357] hover:bg-[#2D0B8C] px-20 text-2xl font-black w-full md:w-auto shadow-2xl hover:shadow-[#1C0357]/30 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin h-8 w-8" /> : (
                  <span className="flex items-center gap-4">
                    {useCredit ? "Submit Request" : <><CreditCard size={28} /> Pay & Submit</>}
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
    className={cn(
      "w-16 h-8 rounded-full transition-all duration-300 relative shadow-inner", 
      checked ? "bg-[#F538BC]" : "bg-gray-200"
    )}
  >
    <div className={cn(
      "absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md", 
      checked ? "left-9" : "left-1"
    )} />
  </button>
);

const XCircle = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
  </svg>
);

const LayoutDashboard = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

export default FormPage;
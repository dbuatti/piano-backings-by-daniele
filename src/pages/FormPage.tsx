"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle,
  Loader2,
  Plus,
  Ticket,
  CreditCard,
  Music,
  ChevronRight,
  ArrowLeft,
  UploadCloud,
  Bug,
  Trash2,
  Sparkles,
  XCircle,
  MessageSquare,
  Tag
} from 'lucide-react';
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAdmin } from '@/hooks/useAdmin';
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
  specialRequests: '',
  ...initialData
});

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<any[]>([]);
  const [useCredit, setUseCredit] = useState(false);

  const { isHolidayModeActive, isServiceClosed, closureReason } = useAppSettings();
  const [songs, setSongs] = useState<SongData[]>(() => [createNewSong()]);

  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

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
    let timer: NodeJS.Timeout;
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        
        // Try to get name from metadata first
        let detectedName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          '';
        
        // If metadata is empty, try fetching from profiles table
        if (!detectedName) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            detectedName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
          }
        }

        setGlobalData(prev => ({
          ...prev,
          email: session.user.email || '',
          confirmEmail: session.user.email || '',
          name: detectedName
        }));
        
        const { data: credits } = await supabase.from('user_credits').select('*').eq('user_id', session.user.id);
        setUserCredits(credits || []);
      } else {
        timer = setTimeout(() => setShowAuthOverlay(true), 1500);
      }
    };
    checkUser();
    return () => {
      if (timer) clearTimeout(timer);
    };
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
    const creditsApplied = useCredit ? Math.min(currentTierCredits, songs.length) : 0;
    const cashSongs = songs.length - creditsApplied;
    return {
      total: cashSongs * perSong.totalCost,
      perSong: perSong.totalCost,
      creditsApplied,
      cashSongs
    };
  }, [globalData.trackType, globalData.additionalServices, songs.length, useCredit, currentTierCredits]);

  const handleGlobalInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGlobalData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleTrackTypeChange = useCallback((v: string) => {
    setGlobalData(prev => ({ ...prev, trackType: v }));
  }, []);

  const handleServiceToggle = useCallback((serviceId: string) => {
    setGlobalData(prev => {
      const services = prev.additionalServices.includes(serviceId)
        ? prev.additionalServices.filter(id => id !== serviceId)
        : [...prev.additionalServices, serviceId];
      return { ...prev, additionalServices: services };
    });
  }, []);

  const handleSongChange = useCallback((id: string, field: string, value: any) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const handleRemoveSong = useCallback((id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleAddSong = useCallback(() => {
    setSongs(prev => [...prev, createNewSong()]);
  }, []);

  const handleDebugPrefill = useCallback((type: 'single' | 'multiple') => {
    const testEmail = user?.email || 'pianobackingsbydaniele@gmail.com';
    const testName = user?.user_metadata?.full_name || 'Admin Debugger';
    
    setGlobalData({
      email: testEmail,
      confirmEmail: testEmail,
      name: testName,
      category: 'Audition Tracks',
      trackType: 'audition-ready',
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      additionalServices: ['rush-order'],
      specialRequests: `DEBUG: Testing ${type} song submission flow.`,
    });

    if (type === 'single') {
      setSongs([
        createNewSong({
          songTitle: 'Defying Gravity',
          musicalOrArtist: 'Wicked',
          songKey: 'C Major (0)',
          differentKey: 'No',
          youtubeLink: 'https://www.youtube.com/watch?v=MslDnWvH0p8',
          specialRequests: 'DEBUG: Song-specific note here.'
        })
      ]);
    } else {
      setSongs([
        createNewSong({
          songTitle: 'I\'ll Know',
          musicalOrArtist: 'Guys and Dolls',
          songKey: 'C Major (0)',
          differentKey: 'Yes',
          keyForTrack: 'D Major (2♯)',
          youtubeLink: 'https://www.youtube.com/watch?v=RbvVTG9pxCc',
          specialRequests: 'DEBUG: Note for song 1.'
        }),
        createNewSong({
          songTitle: 'On My Own',
          musicalOrArtist: 'Les Misérables',
          songKey: 'F Major (1♭)',
          differentKey: 'No',
          youtubeLink: 'https://www.youtube.com/watch?v=Vj920_S6-7E',
          specialRequests: 'DEBUG: Note for song 2.'
        })
      ]);
    }
    setConsentChecked(true);
    toast({ title: "Form Prefilled", description: `Loaded ${type} song test data.` });
  }, [user, toast]);

  const handleClearForm = useCallback(() => {
    setGlobalData({
      email: user?.email || '',
      confirmEmail: user?.email || '',
      name: user?.user_metadata?.full_name || '',
      category: 'Audition Tracks',
      trackType: 'audition-ready',
      deliveryDate: '',
      additionalServices: [],
      specialRequests: '',
    });
    setSongs([createNewSong()]);
    setConsentChecked(false);
    setUseCredit(false);
    setPromoCode('');
    setPromoDiscount(0);
    toast({ title: "Form Cleared" });
  }, [user, toast]);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setPromoDiscount(0);
      return;
    }

    setIsValidatingPromo(true);
    const amount = priceBreakdown.total;

    try {
      const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/validate-promo-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, amount }),
      });

      const result = await response.json();

      if (result.valid) {
        setPromoDiscount(result.discountAmount);
        toast({ title: "Promo Applied!", description: `You save $${result.discountAmount.toFixed(2)}!` });
      } else {
        setPromoDiscount(0);
        toast({ title: "Invalid Code", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      setPromoDiscount(0);
      toast({ title: "Validation Error", description: err.message, variant: "destructive" });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayModeActive || isServiceClosed) return;

    if (globalData.email !== globalData.confirmEmail) {
      toast({ title: "Email Mismatch", description: "Please ensure your email addresses match.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep('Preparing your request...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const createdRequestIds: string[] = [];
      const creditsApplied = useCredit ? Math.min(currentTierCredits, songs.length) : 0;

      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const songLabel = songs.length > 1 ? ` (Song ${i + 1})` : '';
        
        setSubmissionStep(`Uploading materials${songLabel}...`);
        
        const sheetMusicUploadPromises = song.sheetMusicFiles.map(async (file) => {
          const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('sheet-music').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('sheet-music').getPublicUrl(uploadData!.path);
          return { url: publicUrl, caption: file.name };
        });

        const voiceMemoUploadPromises = song.voiceMemoFiles.map(async (file) => {
          const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(uploadData!.path);
          return { url: publicUrl, caption: file.name };
        });

        const [sheetMusicUrls, voiceMemoUrls] = await Promise.all([
          Promise.all(sheetMusicUploadPromises),
          Promise.all(voiceMemoUploadPromises)
        ]);
        
        setSubmissionStep(`Saving request details${songLabel}...`);
        
        const { sheetMusicFiles, voiceMemoFiles, voiceMemoLink, specialRequests: songSpecificNotes, ...songDataToSubmit } = song;
        
        const combinedNotes = [
          songSpecificNotes.trim(),
          globalData.specialRequests.trim()
        ].filter(Boolean).join('\n\n--- GENERAL ORDER NOTES ---\n');

        // Determine if this specific song is paid via credit
        const isSongPaidViaCredit = useCredit && (i < creditsApplied);

        const submissionData = {
          formData: {
            ...globalData,
            ...songDataToSubmit,
            voiceMemo: voiceMemoLink,
            sheetMusicUrls,
            voiceMemoUrls,
            backingType: [globalData.trackType],
            specialRequests: combinedNotes,
            is_paid: isSongPaidViaCredit,
            internal_notes: isSongPaidViaCredit ? "Paid via Season Pack Credit" : ""
          }
        };
        
        const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify(submissionData),
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to create request");
        if (result.requestId) {
          if (!isSongPaidViaCredit) {
            createdRequestIds.push(result.requestId);
          }
        }
      }

      if (creditsApplied > 0 && session) {
        setSubmissionStep('Applying credits...');
        const { error: creditError } = await supabase
          .from('user_credits')
          .update({
            balance: currentTierCredits - creditsApplied,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', session.user.id)
          .eq('credit_type', globalData.trackType);
        
        if (creditError) throw creditError;
      }

      if (createdRequestIds.length > 0) {
        setSubmissionStep('Redirecting to secure payment...');
        const checkoutBody: Record<string, unknown> = {
          request_ids: createdRequestIds,
          amount: priceBreakdown.total,
          customer_email: globalData.email,
          description: `Custom Backing Tracks: ${songs.filter((_, idx) => !useCredit || idx >= creditsApplied).map(s => s.songTitle).join(', ')}`
        };
        if (promoDiscount > 0 && promoCode.trim()) {
          checkoutBody.promo_code = promoCode.trim();
        }
        const stripeResponse = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify(checkoutBody),
        });
        
        const stripeResult = await stripeResponse.json();
        if (!stripeResponse.ok) throw new Error(stripeResult.error || "Failed to generate payment link");
        if (stripeResult.url) window.location.href = stripeResult.url;
      } else {
        setIsSubmittedSuccessfully(true);
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setSubmissionStep('');
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

        {isAdmin && (
          <Card className="mb-12 border-2 border-orange-200 bg-orange-50/30 rounded-[32px] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-orange-700 font-black uppercase tracking-widest text-xs">
                  <Bug size={16} /> Admin Debug Tools
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearForm} className="text-orange-600 hover:bg-orange-100">
                  <Trash2 size={14} className="mr-2" /> Clear Form
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleDebugPrefill('single')}
                  variant="outline" 
                  className="h-12 border-orange-200 bg-white text-orange-700 hover:bg-orange-50 font-bold rounded-xl"
                >
                  <Sparkles size={16} className="mr-2" /> Prefill Single Song
                </Button>
                <Button 
                  onClick={() => handleDebugPrefill('multiple')}
                  variant="outline" 
                  className="h-12 border-orange-200 bg-white text-orange-700 hover:bg-orange-50 font-bold rounded-xl"
                >
                  <Plus size={16} className="mr-2" /> Prefill Multiple Songs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                    onRemove={handleRemoveSong} 
                    isOnlySong={songs.length === 1} 
                  />
                ))}
                <Button 
                  type="button" 
                  onClick={handleAddSong} 
                  className="w-full h-20 rounded-3xl border-2 border-dashed border-[#1C0357]/20 bg-white text-[#1C0357] font-black text-lg hover:bg-[#1C0357]/5 hover:border-[#1C0357]/40 transition-all"
                >
                  <Plus className="mr-2" /> Add Another Song
                </Button>
              </div>
            </div>

            <Card className="rounded-[40px] p-10 md:p-16 space-y-16 shadow-xl border-none bg-white">
              <TierSelection 
                value={globalData.trackType}
                onValueChange={handleTrackTypeChange}
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
                
                <div className="space-y-3">
                  <Label htmlFor="specialRequests" className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <MessageSquare size={14} /> General Order Notes
                  </Label>
                  <Textarea 
                    id="specialRequests"
                    name="specialRequests"
                    value={globalData.specialRequests} 
                    onChange={handleGlobalInputChange} 
                    placeholder="Any general notes for the entire order? (e.g. 'I'm in a rush for all of these', 'Please use my Season Pack credits')"
                    className="min-h-[120px] rounded-2xl border-gray-200 font-medium"
                  />
                </div>
              </div>
            </Card>

            <div className="bg-[#1C0357] text-white rounded-[40px] p-12 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F538BC]/10 blur-[80px] rounded-full" />
              <p className="text-xs font-black text-[#F538BC] uppercase tracking-[0.2em] mb-4 relative z-10">Total Amount Due</p>
              <div className="flex items-baseline justify-center gap-2 relative z-10">
                {promoDiscount > 0 && (
                  <span className="text-3xl md:text-4xl text-white/50 line-through font-black">${priceBreakdown.total.toFixed(2)}</span>
                )}
                <span className="text-7xl md:text-8xl font-black tracking-tighter">
                  ${Math.max(0, priceBreakdown.total - promoDiscount).toFixed(2)}
                </span>
                <span className="text-lg font-bold opacity-40 uppercase tracking-widest">AUD</span>
              </div>
              {promoDiscount > 0 && (
                <p className="text-green-400 font-black text-lg mt-2 relative z-10">
                  Promo discount: -${promoDiscount.toFixed(2)}
                </p>
              )}
              {useCredit && priceBreakdown.creditsApplied > 0 && (
                <div className="mt-4 relative z-10 space-y-1">
                  <p className="text-green-400 font-black text-lg">
                    Applied {priceBreakdown.creditsApplied} Season Pack {priceBreakdown.creditsApplied === 1 ? 'Credit' : 'Credits'}!
                  </p>
                  {priceBreakdown.cashSongs > 0 && (
                    <p className="text-white/70 text-sm font-bold uppercase tracking-widest">
                      ({priceBreakdown.cashSongs} remaining {priceBreakdown.cashSongs === 1 ? 'song' : 'songs'} to be paid at ${priceBreakdown.perSong.toFixed(2)} each)
                    </p>
                  )}
                </div>
              )}
              {!useCredit && songs.length > 1 && (
                <p className="text-white/50 text-sm mt-6 font-bold uppercase tracking-widest relative z-10">
                  ({songs.length} songs @ ${priceBreakdown.perSong.toFixed(2)} each)
                </p>
              )}

              <div className="mt-8 relative z-10 flex items-center justify-center gap-2">
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoDiscount(0); }}
                    placeholder="Promo code"
                    className="pl-9 h-12 w-44 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 font-mono text-sm font-bold uppercase"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleValidatePromo}
                  disabled={!promoCode.trim() || isValidatingPromo}
                  className="h-12 rounded-xl border-white/20 text-white hover:bg-white/10 hover:text-white font-bold"
                >
                  {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
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
              
              <div className="w-full flex flex-col items-center gap-4">
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
                
                {isSubmitting && (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[#1C0357] font-black text-lg flex items-center gap-2">
                      <UploadCloud className="animate-bounce" /> {submissionStep}
                    </p>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                      Please keep this window open
                    </p>
                  </div>
                )}
              </div>
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

export default FormPage;
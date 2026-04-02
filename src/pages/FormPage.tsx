"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Music, 
  Plane,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  UploadCloud,
  Layers,
  Check,
  Mic,
  Headphones,
  Sparkles,
  Package
} from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAppSettings } from '@/hooks/useAppSettings';
import { format } from 'date-fns';
import Seo from "@/components/Seo";
import AuthOverlay from "@/components/AuthOverlay";
import SongRequestItem, { SongData } from '@/components/form/SongRequestItem';
import BulkUploadDialog from '@/components/form/BulkUploadDialog';
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

const categoryDescriptions: Record<string, string> = {
  "Practice Tracks": "For practice in your own time.",
  "Audition Tracks": "Tracks intended for professional self-tapes.",
  "Melody Bash Tracks": "Designed to help you learn new repertoire quickly.",
  "Performance Tracks": "High-quality tracks suitable for live use."
};

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDraggingBulk, setIsDraggingBulk] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [pendingBulkFiles, setPendingBulkFiles] = useState<File[]>([]);

  const { 
    isHolidayModeActive, 
    holidayReturnDate, 
    isServiceClosed, 
    closureReason, 
    isLoading: isLoadingAppSettings 
  } = useAppSettings();

  const [songs, setSongs] = useState<SongData[]>(() => [createNewSong()]);

  const [globalData, setGlobalData] = useState({
    email: '',
    confirmEmail: '',
    name: '',
    phone: '',
    category: '',
    trackType: 'audition-ready', // Default to most popular
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
    backingType: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, any>>({});
  const [consentChecked, setConsentChecked] = useState(false);

  const sectionStatus = useMemo(() => ({
    contact: !!globalData.email && globalData.email === globalData.confirmEmail && !!globalData.name,
    songs: songs.length > 0 && songs.every(s => !!s.songTitle && !!s.musicalOrArtist && !!s.songKey && s.sheetMusicFiles.length > 0),
    quality: !!globalData.trackType && !!globalData.category && !!globalData.deliveryDate,
    final: consentChecked
  }), [globalData.email, globalData.confirmEmail, globalData.name, globalData.trackType, globalData.category, globalData.deliveryDate, songs, consentChecked]);

  const progress = useMemo(() => {
    const completedCount = Object.values(sectionStatus).filter(Boolean).length;
    return (completedCount / Object.keys(sectionStatus).length) * 100;
  }, [sectionStatus]);

  const priceBreakdown = useMemo(() => {
    const mockRequest = {
      track_type: globalData.trackType,
      additional_services: globalData.additionalServices
    };
    const perSong = calculateRequestCost(mockRequest);
    return {
      perSong: perSong.totalCost,
      total: perSong.totalCost * songs.length,
      baseCosts: perSong.baseCosts,
      serviceCosts: perSong.serviceCosts
    };
  }, [globalData.trackType, globalData.additionalServices, songs.length]);

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
      } else {
        setTimeout(() => setShowAuthOverlay(true), 1500);
      }
    };
    checkUser();
  }, []);

  const handleGlobalInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGlobalData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleGlobalSelectChange = useCallback((name: string, value: string) => {
    setGlobalData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSongChange = useCallback((id: string, field: string, value: any) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const addSong = useCallback(() => {
    setSongs(prev => [...prev, createNewSong()]);
    toast({ title: "Song Added" });
  }, [toast]);

  const removeSong = useCallback((id: string) => {
    setSongs(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev);
  }, []);

  const handleBulkPdfUpload = useCallback((files: File[] | null) => {
    if (!files || files.length === 0) return;
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;
    setPendingBulkFiles(pdfFiles);
    setBulkUploadDialogOpen(true);
  }, []);

  const handleConfirmDifferentSongs = useCallback(() => {
    const newSongs = pendingBulkFiles.map(file => createNewSong({ 
      sheetMusicFiles: [file],
      songTitle: file.name.replace(/\.[^/.]+$/, "")
    }));
    setSongs(prev => (prev.length === 1 && prev[0].songTitle === '') ? newSongs : [...prev, ...newSongs]);
    setBulkUploadDialogOpen(false);
  }, [pendingBulkFiles]);

  const handleConfirmSameSong = useCallback(() => {
    setSongs(prev => prev.map((s, i) => i === 0 ? { ...s, sheetMusicFiles: [...s.sheetMusicFiles, ...pendingBulkFiles] } : s));
    setBulkUploadDialogOpen(false);
  }, [pendingBulkFiles]);

  const handleServiceToggle = useCallback((service: string, checked: boolean) => {
    setGlobalData(prev => ({
      ...prev,
      additionalServices: checked 
        ? [...prev.additionalServices, service]
        : prev.additionalServices.filter(s => s !== service)
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayModeActive || isServiceClosed) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      for (const song of songs) {
        const sheetMusicUrls = [];
        for (const file of song.sheetMusicFiles) {
          const { data: uploadData, error: uploadError } = await supabase.storage.from('sheet-music').upload(`${Date.now()}-${file.name}`, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('sheet-music').getPublicUrl(uploadData.path);
          sheetMusicUrls.push({ url: publicUrl, caption: file.name });
        }
        
        const submissionData = {
          formData: {
            ...globalData,
            ...song,
            sheetMusicUrls,
            sheetMusicUrl: sheetMusicUrls[0]?.url || null,
          }
        };
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
        
        await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`, {
          method: 'POST',
          headers,
          body: JSON.stringify(submissionData),
        });
      }
      setIsSubmittedSuccessfully(true);
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
        <div className="max-w-3xl mx-auto py-16 px-4">
          <Card className="border-2 border-red-100 shadow-xl overflow-hidden rounded-3xl">
            <div className="bg-red-500 p-8 text-center text-white">
              <XCircle className="h-16 w-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Requests Temporarily Closed</h1>
            </div>
            <CardContent className="p-8 text-center">
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">{closureReason}</p>
              <Button asChild size="lg" className="bg-[#1C0357] rounded-full px-10 py-6 text-lg">
                <Link to="/shop">Browse the Shop Instead</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7]">
      <Seo title="Custom Piano Backing Request" description="Submit your custom piano backing track request." />
      <div className="sticky top-0 z-[60] w-full">
        <Header />
        {!isSubmittedSuccessfully && (
          <div className="w-full h-1.5 bg-gray-100 overflow-hidden">
            <div className="h-full bg-[#F538BC] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      
      <AuthOverlay isOpen={showAuthOverlay} onClose={() => setShowAuthOverlay(false)} redirectPath={location.pathname} />
      <BulkUploadDialog isOpen={bulkUploadDialogOpen} onClose={() => setBulkUploadDialogOpen(false)} fileCount={pendingBulkFiles.length} onConfirmDifferent={handleConfirmDifferentSongs} onConfirmSame={handleConfirmSameSong} />

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-3 tracking-tighter">
            Custom Backing <span className="text-[#F538BC]">Request</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 font-medium">Bring your sheet music to life with professional accompaniment.</p>
        </header>

        {isSubmittedSuccessfully ? (
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-green-500 py-12 text-center text-white">
              <CheckCircle className="h-20 w-20 mx-auto mb-6" />
              <h2 className="text-3xl font-bold">Submission Successful!</h2>
            </div>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 mb-8 text-lg">Daniele will review your materials and send a quote within 24-48 hours.</p>
              <Button onClick={() => navigate('/user-dashboard')} size="lg" className="rounded-full bg-[#1C0357]">View My Requests</Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="animate-in fade-in duration-500">
            {/* Contact Section */}
            <div className={cn("bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all", sectionStatus.contact ? "border-green-100" : "border-gray-100")}>
              <div className="flex items-center gap-3 mb-6">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white", sectionStatus.contact ? "bg-green-500" : "bg-[#1C0357]")}>
                  {sectionStatus.contact ? <Check size={16} strokeWidth={3} /> : 1}
                </span>
                <h2 className="text-xl font-bold text-[#1C0357]">Contact Details</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                  <Input name="name" value={globalData.name} onChange={handleGlobalInputChange} className="h-12 rounded-xl" disabled={!!user} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Email</Label>
                  <Input name="email" type="email" value={globalData.email} onChange={handleGlobalInputChange} className="h-12 rounded-xl" disabled={!!user} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Confirm Email</Label>
                  <Input name="confirmEmail" type="email" value={globalData.confirmEmail} onChange={handleGlobalInputChange} className="h-12 rounded-xl" disabled={!!user} />
                </div>
              </div>
            </div>

            {/* Song Details Section */}
            <div className={cn("bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all", sectionStatus.songs ? "border-green-100" : "border-gray-100")}>
              <div className="flex items-center gap-3 mb-6">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white", sectionStatus.songs ? "bg-green-500" : "bg-[#1C0357]")}>
                  {sectionStatus.songs ? <Check size={16} strokeWidth={3} /> : 2}
                </span>
                <h2 className="text-xl font-bold text-[#1C0357]">Song Details</h2>
              </div>
              <div className="space-y-4">
                {songs.map((song, index) => (
                  <SongRequestItem key={song.id} index={index} data={song} onChange={handleSongChange} onRemove={removeSong} isOnlySong={songs.length === 1} />
                ))}
              </div>
              <Button type="button" onClick={addSong} className="w-full h-16 mt-4 rounded-2xl border-2 border-dashed border-[#1C0357]/20 bg-gray-50/50 text-[#1C0357] font-black text-lg">
                <Plus size={24} className="inline mr-2" /> Add Another Song
              </Button>
            </div>

            {/* Tier Selection Section */}
            <div className={cn("bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all", sectionStatus.quality ? "border-green-100" : "border-gray-100")}>
              <div className="flex items-center gap-3 mb-6">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white", sectionStatus.quality ? "bg-green-500" : "bg-[#1C0357]")}>
                  {sectionStatus.quality ? <Check size={16} strokeWidth={3} /> : 3}
                </span>
                <h2 className="text-xl font-bold text-[#1C0357]">Choose Your Tier</h2>
              </div>
              <RadioGroup value={globalData.trackType} onValueChange={(v) => handleGlobalSelectChange('trackType', v)} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'note-bash', icon: Mic, label: 'Note Bash', price: '$15', desc: 'Functional recording for learning.' },
                  { id: 'audition-ready', icon: Headphones, label: 'Audition Ready', price: '$30', desc: 'Performance quality cut.' },
                  { id: 'full-song', icon: Sparkles, label: 'Full Song', price: '$50', desc: 'Concert-level complete piece.' }
                ].map((item) => (
                  <Label key={item.id} htmlFor={item.id} className="cursor-pointer">
                    <div className={cn("relative flex flex-col p-6 rounded-3xl border-2 transition-all text-center h-full", globalData.trackType === item.id ? "border-[#1C0357] bg-[#1C0357]/5" : "border-gray-100 bg-white")}>
                      <RadioGroupItem id={item.id} value={item.id} className="sr-only" />
                      <item.icon className="h-6 w-6 mx-auto mb-4 text-[#F538BC]" />
                      <span className="font-black text-[#1C0357]">{item.label}</span>
                      <span className="text-xs font-black text-[#F538BC] mt-1">{item.price}</span>
                      <p className="text-[10px] text-gray-500 mt-2 leading-tight">{item.desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Category</Label>
                  <Select onValueChange={(v) => handleGlobalSelectChange('category', v)} value={globalData.category}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{Object.keys(categoryDescriptions).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Due Date</Label>
                  <Input type="date" name="deliveryDate" value={globalData.deliveryDate} onChange={handleGlobalInputChange} min={new Date().toISOString().split('T')[0]} className="h-12 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Add-ons Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
              <h2 className="text-xl font-bold text-[#1C0357] mb-6">Optional Add-ons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'rush-order', label: 'Rush Order (24h)', price: '+$15' },
                  { id: 'complex-songs', label: 'Complex Score (Sondheim, etc.)', price: '+$10' },
                  { id: 'exclusive-ownership', label: 'Exclusive Ownership', price: '+$40' }
                ].map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <Checkbox id={service.id} checked={globalData.additionalServices.includes(service.id)} onCheckedChange={(v) => handleServiceToggle(service.id, v as boolean)} />
                      <Label htmlFor={service.id} className="font-bold text-[#1C0357]">{service.label}</Label>
                    </div>
                    <span className="text-[#F538BC] font-black text-sm">{service.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Season Pack Promo */}
            <div className="bg-[#D1AAF2]/20 rounded-3xl p-6 mb-8 border-2 border-dashed border-[#D1AAF2] flex items-center gap-4">
              <div className="h-12 w-12 bg-[#1C0357] rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Package size={24} />
              </div>
              <div>
                <h3 className="font-black text-[#1C0357]">Season Pack — $95</h3>
                <p className="text-sm text-gray-600">Get 3 Audition Ready tracks and save $15. Mention this in special requests to redeem!</p>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-[#1C0357] text-white rounded-3xl p-8 shadow-xl text-center mb-8">
              <p className="text-xs font-black text-[#F538BC] uppercase tracking-[0.3em] mb-2">Total Estimated Cost</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-white/60">$</span>
                <span className="text-6xl font-black tracking-tighter text-white">{priceBreakdown.total.toFixed(2)}</span>
                <span className="text-sm font-bold text-white/40 ml-2">AUD</span>
              </div>
              <p className="text-[10px] text-white/40 mt-4 font-bold uppercase tracking-widest">Final price confirmed via email after review</p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <Checkbox id="consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(v as boolean)} />
                <Label htmlFor="consent" className="text-sm font-bold text-gray-600">I understand the terms of service. <span className="text-red-500">*</span></Label>
              </div>
              <Button type="submit" disabled={isSubmitting || !consentChecked} className="h-20 rounded-full bg-[#1C0357] px-16 text-xl font-black shadow-2xl w-full md:w-auto">
                {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "Send My Request"}
              </Button>
            </div>
          </form>
        )}
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default FormPage;
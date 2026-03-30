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
  Sparkles
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
  "Practice Tracks": "For practice in your own time. Not intended for self-tapes; track quality is not the primary focus.",
  "Audition Tracks": "Tracks intended for use in professional self-tapes and recordings.",
  "Melody Bash Tracks": "Melody note tracks designed to help you learn new repertoire quickly, typically for auditions.",
  "Performance Tracks": "High-quality tracks suitable for live use in concerts or public performances."
};

const backingTypeOptions = [
  { id: 'full-song', label: 'Full Song', desc: 'The complete song as written.' },
  { id: 'audition-cut', label: 'Audition Cut', desc: 'A specific 16/32 bar cut or selection.' },
  { id: 'note-bash', label: 'Melody Note Bash', desc: 'Plonked melody notes to help you learn.' }
];

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
    trackType: '',
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
    quality: !!globalData.trackType && !!globalData.category,
    backing: globalData.backingType.length > 0,
    final: consentChecked
  }), [globalData.email, globalData.confirmEmail, globalData.name, globalData.trackType, globalData.category, globalData.backingType, songs, consentChecked]);

  const progress = useMemo(() => {
    const completedCount = Object.values(sectionStatus).filter(Boolean).length;
    return (completedCount / Object.keys(sectionStatus).length) * 100;
  }, [sectionStatus]);

  const priceBreakdown = useMemo(() => {
    const mockRequest = {
      track_type: globalData.trackType,
      backing_type: globalData.backingType,
      additional_services: globalData.additionalServices
    };
    const perSong = calculateRequestCost(mockRequest);
    return {
      perSong: perSong.totalCost,
      total: perSong.totalCost * songs.length,
      baseCosts: perSong.baseCosts,
      serviceCosts: perSong.serviceCosts
    };
  }, [globalData.trackType, globalData.backingType, globalData.additionalServices, songs.length]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
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
        setShowAuthOverlay(false);
      } else {
        timer = setTimeout(() => setShowAuthOverlay(true), 1500);
      }
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        setUser(session.user);
        setGlobalData(prev => ({
          ...prev,
          email: session.user.email || '',
          confirmEmail: session.user.email || '',
          name: session.user.user_metadata?.full_name || ''
        }));
        setShowAuthOverlay(false);
        if (timer) clearTimeout(timer);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleGlobalInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGlobalData(prev => {
      if (prev[name as keyof typeof prev] === value) return prev;
      return { ...prev, [name]: value };
    });
    setErrors(prev => {
      if (!prev[name]) return prev;
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  const handleGlobalSelectChange = useCallback((name: string, value: string) => {
    setGlobalData(prev => {
      if (prev[name as keyof typeof prev] === value) return prev;
      return { ...prev, [name]: value };
    });
    setErrors(prev => {
      if (!prev[name]) return prev;
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  const handleSongChange = useCallback((id: string, field: string, value: any) => {
    setSongs(prev => {
      const song = prev.find(s => s.id === id);
      if (song && song[field as keyof SongData] === value) return prev;
      return prev.map(s => s.id === id ? { ...s, [field]: value } : s);
    });
    
    setErrors(prev => {
      if (!prev.songs?.[id]?.[field]) return prev;
      const newSongsErrors = { ...prev.songs };
      const newSongErrors = { ...newSongsErrors[id] };
      delete newSongErrors[field];
      if (Object.keys(newSongErrors).length === 0) {
        delete newSongsErrors[id];
      } else {
        newSongsErrors[id] = newSongErrors;
      }
      return { ...prev, songs: newSongsErrors };
    });
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
    if (pdfFiles.length === 0) {
      toast({ title: "Invalid Files", description: "Please upload PDF files only.", variant: "destructive" });
      return;
    }
    if (pdfFiles.length === 1) {
      const firstSong = songs[0];
      if (firstSong && firstSong.sheetMusicFiles.length === 0 && firstSong.songTitle === '') {
        handleSongChange(firstSong.id, 'sheetMusicFiles', [pdfFiles[0]]);
        handleSongChange(firstSong.id, 'songTitle', pdfFiles[0].name.replace(/\.[^/.]+$/, ""));
      } else {
        setSongs(prev => [...prev, createNewSong({ 
          sheetMusicFiles: [pdfFiles[0]],
          songTitle: pdfFiles[0].name.replace(/\.[^/.]+$/, "")
        })]);
      }
      return;
    }
    setPendingBulkFiles(pdfFiles);
    setBulkUploadDialogOpen(true);
  }, [songs, handleSongChange, toast]);

  const handleConfirmDifferentSongs = useCallback(() => {
    const newSongs = pendingBulkFiles.map(file => createNewSong({ 
      sheetMusicFiles: [file],
      songTitle: file.name.replace(/\.[^/.]+$/, "")
    }));
    if (songs.length === 1 && songs[0].songTitle === '' && songs[0].sheetMusicFiles.length === 0) {
      setSongs(newSongs);
    } else {
      setSongs(prev => [...prev, ...newSongs]);
    }
    setBulkUploadDialogOpen(false);
    setPendingBulkFiles([]);
  }, [pendingBulkFiles, songs]);

  const handleConfirmSameSong = useCallback(() => {
    const firstSong = songs[0];
    if (firstSong) {
      handleSongChange(firstSong.id, 'sheetMusicFiles', [...firstSong.sheetMusicFiles, ...pendingBulkFiles]);
    }
    setBulkUploadDialogOpen(false);
    setPendingBulkFiles([]);
  }, [pendingBulkFiles, songs, handleSongChange]);

  const handleBackingTypeChange = useCallback((type: string, checked: boolean | 'indeterminate') => {
    setGlobalData(prev => {
      const isChecked = checked === true || checked === 'indeterminate';
      const currentBackingTypes = Array.isArray(prev.backingType) ? prev.backingType : [];
      const newBackingTypes = isChecked
        ? [...currentBackingTypes, type]
        : currentBackingTypes.filter(t => t !== type);
      const uniqueBackingTypes = [...new Set(newBackingTypes)];
      
      if (currentBackingTypes.length === uniqueBackingTypes.length && 
          currentBackingTypes.every(t => uniqueBackingTypes.includes(t))) {
        return prev;
      }
      
      return { ...prev, backingType: uniqueBackingTypes };
    });
  }, []);

  const closeAuthOverlay = useCallback(() => setShowAuthOverlay(false), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayModeActive || isServiceClosed) return;

    setIsSubmitting(true);
    const newErrors: any = { songs: {} };
    let hasErrors = false;

    if (!globalData.email) { newErrors.email = 'Required'; hasErrors = true; }
    if (globalData.email !== globalData.confirmEmail) { newErrors.confirmEmail = 'Mismatch'; hasErrors = true; }
    if (!globalData.name) { newErrors.name = 'Required'; hasErrors = true; }
    if (!globalData.category) { newErrors.category = 'Required'; hasErrors = true; }
    if (!globalData.trackType) { newErrors.trackType = 'Required'; hasErrors = true; }
    if (globalData.backingType.length === 0) { newErrors.backingType = 'Required'; hasErrors = true; }
    if (!consentChecked) { newErrors.consent = 'Required'; hasErrors = true; }

    songs.forEach(song => {
      const songErrors: any = {};
      if (!song.songTitle) songErrors.songTitle = 'Required';
      if (!song.musicalOrArtist) songErrors.musicalOrArtist = 'Required';
      if (!song.songKey) songErrors.songKey = 'Required';
      if (song.sheetMusicFiles.length === 0) songErrors.sheetMusicFiles = 'Required';
      if (Object.keys(songErrors).length > 0) {
        newErrors.songs[song.id] = songErrors;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      setIsSubmitting(false);
      toast({ title: "Missing Information", variant: "destructive" });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      for (const song of songs) {
        const sheetMusicUrls = [];
        for (const file of song.sheetMusicFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `sheet-music-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('sheet-music').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('sheet-music').getPublicUrl(uploadData.path);
          sheetMusicUrls.push({ url: publicUrl, caption: file.name });
        }
        
        const voiceMemoUrls = [];
        for (const file of song.voiceMemoFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `voice-memo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, file);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(uploadData.path);
            voiceMemoUrls.push({ url: publicUrl, caption: file.name });
          }
        }
        
        const submissionData = {
          formData: {
            ...globalData,
            ...song,
            sheetMusicUrls,
            voiceMemoUrls,
            sheetMusicUrl: sheetMusicUrls[0]?.url || null,
            voiceMemoFileUrl: voiceMemoUrls[0]?.url || null
          }
        };
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
        
        const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`, {
          method: 'POST',
          headers,
          body: JSON.stringify(submissionData),
        });
        if (!response.ok) throw new Error(`Failed to submit song: ${song.songTitle}`);
      }
      setIsSubmittedSuccessfully(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAppSettings) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#1C0357]" />
          <p className="mt-4 text-[#1C0357] font-medium">Preparing your request form...</p>
        </div>
      </div>
    );
  }

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
            <div 
              className="h-full bg-[#F538BC] transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        )}
      </div>
      
      <AuthOverlay isOpen={showAuthOverlay} onClose={closeAuthOverlay} redirectPath={location.pathname} />
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/user-dashboard')} size="lg" className="rounded-full bg-[#1C0357]">View My Requests</Button>
                <Button onClick={() => setIsSubmittedSuccessfully(false)} variant="outline" size="lg" className="rounded-full">New Submission</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="animate-in fade-in duration-500">
            {isHolidayModeActive && (
              <Alert className="mb-8 border-none bg-[#F538BC]/10 text-[#F538BC] rounded-2xl py-4">
                <Plane className="h-5 w-5" />
                <AlertTitle className="font-bold">Holiday Mode Active</AlertTitle>
                <AlertDescription>{holidayReturnDate ? `Returning ${format(holidayReturnDate, 'MMMM d')}.` : "Currently on holiday."}</AlertDescription>
              </Alert>
            )}

            <div className={cn(
              "bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all duration-300",
              sectionStatus.contact ? "border-green-100 shadow-green-50/50" : "border-gray-100 hover:shadow-md"
            )}>
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-colors duration-300",
                    sectionStatus.contact ? "bg-green-500" : "bg-[#1C0357]"
                  )}>
                    {sectionStatus.contact ? <Check size={16} strokeWidth={3} /> : 1}
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-[#1C0357] tracking-tight">Contact Details</h2>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                  <Input name="name" value={globalData.name} onChange={handleGlobalInputChange} className="h-12 rounded-xl" disabled={isSubmitting || !!user} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Phone (Optional)</Label>
                  <Input name="phone" value={globalData.phone} onChange={handleGlobalInputChange} className="h-12 rounded-xl" disabled={isSubmitting} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Email</Label>
                  <Input name="email" type="email" value={globalData.email} onChange={handleGlobalInputChange} className="h-12 rounded-xl" disabled={isSubmitting || !!user} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Confirm Email</Label>
                  <Input name="confirmEmail" type="email" value={globalData.confirmEmail} onChange={handleGlobalInputChange} className="h-12 rounded-xl" disabled={isSubmitting || !!user} />
                </div>
              </div>
            </div>

            <div className={cn(
              "bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all duration-300",
              sectionStatus.songs ? "border-green-100 shadow-green-50/50" : "border-gray-100 hover:shadow-md"
            )}>
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-colors duration-300",
                    sectionStatus.songs ? "bg-green-500" : "bg-[#1C0357]"
                  )}>
                    {sectionStatus.songs ? <Check size={16} strokeWidth={3} /> : 2}
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-[#1C0357] tracking-tight">Song Details</h2>
                  </div>
                </div>
              </div>
              <div 
                className={cn("mb-8 p-6 rounded-[32px] border-2 border-dashed transition-all", isDraggingBulk ? "bg-[#F538BC]/10 border-[#F538BC]" : "bg-[#D1AAF2]/10 border-[#D1AAF2]/30")}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingBulk(true); }}
                onDragLeave={() => setIsDraggingBulk(false)}
                onDrop={(e) => { e.preventDefault(); setIsDraggingBulk(false); handleBulkPdfUpload(Array.from(e.dataTransfer.files)); }}
              >
                <div className="flex flex-col items-center text-center">
                  <UploadCloud className="h-10 w-10 mb-3 text-[#1C0357]" />
                  <p className="text-sm text-gray-500 font-medium mb-4">Drag multiple PDFs here to create song slots.</p>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => document.getElementById('bulk-pdf')?.click()}>Select PDFs</Button>
                  <Input type="file" accept=".pdf" multiple className="hidden" id="bulk-pdf" onChange={(e) => handleBulkPdfUpload(Array.from(e.target.files || []))} />
                </div>
              </div>
              <div className="space-y-4">
                {songs.map((song, index) => (
                  <SongRequestItem key={song.id} index={index} data={song} onChange={handleSongChange} onRemove={removeSong} isOnlySong={songs.length === 1} errors={errors.songs?.[song.id]} />
                ))}
              </div>
              <Button type="button" onClick={addSong} className="w-full h-16 mt-4 rounded-2xl border-2 border-dashed border-[#1C0357]/20 bg-gray-50/50 text-[#1C0357] font-black text-lg flex items-center justify-center gap-2">
                <Plus size={24} /> Add Another Song
              </Button>
            </div>

            <div className={cn(
              "bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all duration-300",
              sectionStatus.quality ? "border-green-100 shadow-green-50/50" : "border-gray-100 hover:shadow-md"
            )}>
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-colors duration-300",
                    sectionStatus.quality ? "bg-green-500" : "bg-[#1C0357]"
                  )}>
                    {sectionStatus.quality ? <Check size={16} strokeWidth={3} /> : 3}
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-[#1C0357] tracking-tight">Order Quality</h2>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Category</Label>
                  <Select onValueChange={(v) => handleGlobalSelectChange('category', v)} value={globalData.category || ""}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>{Object.keys(categoryDescriptions).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Track Quality</Label>
                  <RadioGroup value={globalData.trackType || ""} onValueChange={(v) => handleGlobalSelectChange('trackType', v)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'quick', icon: Mic, label: 'Quick Ref', price: '$5-10' },
                      { id: 'one-take', icon: Headphones, label: 'One-Take', price: '$10-20' },
                      { id: 'polished', icon: Sparkles, label: 'Polished', price: '$15-35' }
                    ].map((item) => (
                      <Label key={item.id} htmlFor={item.id} className="cursor-pointer">
                        <div className={cn("relative flex flex-col p-6 rounded-3xl border-2 transition-all text-center h-full", globalData.trackType === item.id ? "border-[#1C0357] bg-[#1C0357]/5" : "border-gray-100 bg-white")}>
                          <RadioGroupItem id={item.id} value={item.id} className="sr-only" />
                          <item.icon className="h-6 w-6 mx-auto mb-4" />
                          <span className="font-black text-[#1C0357]">{item.label}</span>
                          <span className="text-xs font-black text-[#F538BC] mt-1">{item.price}</span>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>

            <div className={cn(
              "bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all duration-300",
              sectionStatus.backing ? "border-green-100 shadow-green-50/50" : "border-gray-100 hover:shadow-md"
            )}>
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-colors duration-300",
                    sectionStatus.backing ? "bg-green-500" : "bg-[#1C0357]"
                  )}>
                    {sectionStatus.backing ? <Check size={16} strokeWidth={3} /> : 4}
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-[#1C0357] tracking-tight">Backing Type</h2>
                    <p className="text-sm text-gray-500 font-medium">What exactly do you need recorded?</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {backingTypeOptions.map((option) => (
                  <div 
                    key={option.id}
                    className={cn(
                      "relative p-6 rounded-3xl border-2 transition-all cursor-pointer group",
                      globalData.backingType.includes(option.id) ? "border-[#1C0357] bg-[#1C0357]/5" : "border-gray-100 bg-white hover:border-[#D1AAF2]"
                    )}
                    onClick={() => handleBackingTypeChange(option.id, !globalData.backingType.includes(option.id))}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        globalData.backingType.includes(option.id) ? "bg-[#1C0357] text-white" : "bg-gray-50 text-gray-400 group-hover:bg-[#D1AAF2]/20 group-hover:text-[#1C0357]"
                      )}>
                        <Layers size={20} />
                      </div>
                      <Checkbox 
                        id={`backing-${option.id}`} 
                        checked={globalData.backingType.includes(option.id)}
                        onCheckedChange={(v) => handleBackingTypeChange(option.id, v)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-full border-gray-300 data-[state=checked]:bg-[#1C0357]"
                      />
                    </div>
                    <h3 className="font-black text-[#1C0357] mb-1">{option.label}</h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{option.desc}</p>
                  </div>
                ))}
              </div>
              {errors.backingType && <p className="text-red-500 text-xs font-bold mt-4 uppercase tracking-widest">Please select at least one backing type.</p>}
            </div>

            <div className={cn(
              "bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all duration-300",
              progress > 80 ? "border-green-100 shadow-green-50/50" : "border-gray-100 hover:shadow-md"
            )}>
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-colors duration-300",
                    progress > 80 ? "bg-green-500" : "bg-[#1C0357]"
                  )}>
                    {progress > 80 ? <Check size={16} strokeWidth={3} /> : 5}
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-[#1C0357] tracking-tight">Price Summary</h2>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C0357] text-white rounded-3xl p-8 shadow-xl text-center">
                <p className="text-xs font-black text-[#F538BC] uppercase tracking-[0.3em] mb-2">Total Estimated Cost</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-black text-white/60">$</span>
                  <span className="text-6xl font-black tracking-tighter text-white">{priceBreakdown.total.toFixed(2)}</span>
                  <span className="text-sm font-bold text-white/40 ml-2">AUD</span>
                </div>
                <p className="text-[10px] text-white/40 mt-4 font-bold uppercase tracking-widest">Final price confirmed via email after review</p>
              </div>
            </div>

            <div className={cn(
              "bg-white rounded-3xl p-6 md:p-8 shadow-sm border mb-8 transition-all duration-300",
              sectionStatus.final ? "border-green-100 shadow-green-50/50" : "border-gray-100 hover:shadow-md"
            )}>
              <div className={cn("p-6 rounded-3xl border-2 flex gap-4 transition-colors duration-300", consentChecked ? "border-green-100 bg-green-50/30" : "border-gray-100 bg-white")}>
                <Checkbox id="consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(v as boolean)} />
                <Label htmlFor="consent" className="text-sm text-gray-600 font-bold">I understand that unless I purchase Exclusive Ownership, Piano Backings by Daniele retains rights to sell or share these tracks.</Label>
              </div>
              <div className="mt-12 flex flex-col items-center gap-8">
                <Button type="submit" disabled={isSubmitting || isHolidayModeActive || !consentChecked} className="h-20 rounded-full bg-[#1C0357] px-16 text-xl font-black shadow-2xl">
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "Send My Request"}
                </Button>
              </div>
            </div>
          </form>
        )}
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default FormPage;
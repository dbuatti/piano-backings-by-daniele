"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Music, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  User as UserIcon,
  Youtube,
  Mail,
  Mic,
  Headphones,
  Sparkles,
  Plane,
  CheckCircle,
  Phone,
  XCircle,
  Loader2,
  ChevronRight,
  HelpCircle,
  DollarSign,
  Check,
  Plus,
  Files,
  UploadCloud,
  Calculator
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
import VisuallyHidden from '@/components/VisuallyHidden';
import SongRequestItem, { SongData } from '@/components/form/SongRequestItem';
import BulkUploadDialog from '@/components/form/BulkUploadDialog';
import { calculateRequestCost } from '@/utils/pricing';

const SectionHeader = ({ num, title, subtitle, required, isComplete }: { num: number, title: string, subtitle?: string, required?: boolean, isComplete?: boolean }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3">
      <motion.span 
        initial={false}
        animate={{ 
          backgroundColor: isComplete ? "#22c55e" : "#1C0357",
          scale: isComplete ? [1, 1.2, 1] : 1
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-colors duration-300"
      >
        {isComplete ? <Check size={16} strokeWidth={3} /> : num}
      </motion.span>
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-[#1C0357] tracking-tight flex items-center">
          {title} 
          {required && !isComplete && <span className="text-red-500 ml-1 text-xs font-normal">(Required)</span>}
        </h2>
        {subtitle && <p className="text-sm text-gray-500 font-medium">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const SectionWrapper = React.forwardRef<HTMLDivElement, { children: React.ReactNode, isComplete?: boolean }>(({ children, isComplete }, ref) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
    ref={ref}
    className={cn(
      "bg-white rounded-3xl p-6 md:p-8 shadow-sm border transition-all duration-300 mb-8",
      isComplete ? "border-green-100 shadow-green-50/50" : "border-gray-100 hover:shadow-md"
    )}
  >
    {children}
  </motion.div>
));

SectionWrapper.displayName = "SectionWrapper";

const categoryDescriptions: Record<string, string> = {
  "Practice Tracks": "For practice in your own time. Not intended for self-tapes; track quality is not the primary focus.",
  "Audition Tracks": "Tracks intended for use in professional self-tapes and recordings.",
  "Melody Bash Tracks": "Melody note tracks designed to help you learn new repertoire quickly, typically for auditions.",
  "Performance Tracks": "High-quality tracks suitable for live use in concerts or public performances."
};

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [incompleteTracksCount, setIncompleteTracksCount] = useState<number | null>(null);
  const [loadingTrackCount, setLoadingTrackCount] = useState(true);
  const [isDraggingBulk, setIsDraggingBulk] = useState(false);
  
  // Bulk upload dialog state
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [pendingBulkFiles, setPendingBulkFiles] = useState<File[]>([]);

  const { 
    isHolidayModeActive, 
    holidayReturnDate, 
    isServiceClosed, 
    closureReason, 
    isLoading: isLoadingAppSettings 
  } = useAppSettings();

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

  const [songs, setSongs] = useState<SongData[]>([createNewSong()]);
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

  // Section completion logic
  const sectionStatus = useMemo(() => ({
    contact: !!globalData.email && globalData.email === globalData.confirmEmail && !!globalData.name,
    songs: songs.every(s => !!s.songTitle && !!s.musicalOrArtist && !!s.songKey && s.sheetMusicFiles.length > 0),
    quality: !!globalData.trackType && !!globalData.category,
    services: globalData.backingType.length > 0,
    final: consentChecked
  }), [globalData, songs, consentChecked]);

  const progress = useMemo(() => {
    const completedCount = Object.values(sectionStatus).filter(Boolean).length;
    return (completedCount / Object.keys(sectionStatus).length) * 100;
  }, [sectionStatus]);

  // Price calculation logic
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

  const contactRef = useRef<HTMLDivElement>(null);
  const songsRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);

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
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        setIsAdmin(adminEmails.includes(session.user.email));
        setShowAuthOverlay(false);
      } else {
        setIsAdmin(false);
        setTimeout(() => setShowAuthOverlay(true), 1000);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    const fetchIncompleteTracks = async () => {
      setLoadingTrackCount(true);
      try {
        const { count, error } = await supabase
          .from('backing_requests')
          .select('id', { count: 'exact' })
          .in('status', ['pending', 'in-progress']);

        if (error) throw error;
        setIncompleteTracksCount(count);
      } catch (error: any) {
        console.error('Error fetching incomplete track count:', error);
        setIncompleteTracksCount(0);
      } finally {
        setLoadingTrackCount(false);
      }
    };

    fetchIncompleteTracks();
  }, []);

  const handleGlobalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGlobalData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleGlobalSelectChange = (name: string, value: string) => {
    setGlobalData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSongChange = (id: string, field: string, value: any) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    setErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.songs?.[id]) {
        delete newErrors.songs[id][field];
      }
      return newErrors;
    });
  };

  const addSong = () => {
    setSongs(prev => [...prev, createNewSong()]);
    toast({ title: "Song Added", description: "A new song slot has been added to your order." });
  };

  const removeSong = (id: string) => {
    if (songs.length > 1) {
      setSongs(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleBulkPdfUpload = (files: File[] | null) => {
    if (!files || files.length === 0) return;

    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      toast({ title: "Invalid Files", description: "Please upload PDF files only.", variant: "destructive" });
      return;
    }

    if (pdfFiles.length === 1) {
      const firstSong = songs[0];
      if (firstSong.sheetMusicFiles.length === 0 && firstSong.songTitle === '') {
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

    // For multiple files, open the custom dialog
    setPendingBulkFiles(pdfFiles);
    setBulkUploadDialogOpen(true);
  };

  const handleConfirmDifferentSongs = () => {
    const newSongs = pendingBulkFiles.map(file => createNewSong({ 
      sheetMusicFiles: [file],
      songTitle: file.name.replace(/\.[^/.]+$/, "")
    }));
    
    if (songs.length === 1 && songs[0].songTitle === '' && songs[0].sheetMusicFiles.length === 0) {
      setSongs(newSongs);
    } else {
      setSongs(prev => [...prev, ...newSongs]);
    }
    
    toast({ title: "Songs Created", description: `Created ${pendingBulkFiles.length} song slots from your PDFs.` });
    setBulkUploadDialogOpen(false);
    setPendingBulkFiles([]);
  };

  const handleConfirmSameSong = () => {
    const firstSong = songs[0];
    handleSongChange(firstSong.id, 'sheetMusicFiles', [...firstSong.sheetMusicFiles, ...pendingBulkFiles]);
    
    toast({ title: "Files Attached", description: `Attached ${pendingBulkFiles.length} files to the first song.` });
    setBulkUploadDialogOpen(false);
    setPendingBulkFiles([]);
  };

  const handleDragOverBulk = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBulk(true);
  };

  const handleDragLeaveBulk = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBulk(false);
  };

  const handleDropBulk = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBulk(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleBulkPdfUpload(files);
  };

  const handleBackingTypeChange = (type: string, checked: boolean | 'indeterminate') => {
    setGlobalData(prev => {
      const newBackingTypes = checked
        ? [...prev.backingType, type]
        : prev.backingType.filter(t => t !== type);
      return { ...prev, backingType: newBackingTypes };
    });
  };

  const handleAdditionalServiceChange = (service: string, checked: boolean | 'indeterminate') => {
    setGlobalData(prev => {
      const newServices = checked
        ? [...prev.additionalServices, service]
        : prev.additionalServices.filter(s => s !== service);
      return { ...prev, additionalServices: newServices };
    });
  };

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
      toast({ title: "Missing Information", description: "Please complete all required fields.", variant: "destructive" });
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
        else headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
        
        const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`, {
          method: 'POST',
          headers,
          body: JSON.stringify(submissionData),
        });
        
        if (!response.ok) throw new Error(`Failed to submit song: ${song.songTitle}`);
      }
      
      setIsSubmittedSuccessfully(true);
      if (!session) setShowAuthOverlay(false);
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
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                {closureReason || "We are currently reaching capacity and cannot accept new custom requests. Please check back soon!"}
              </p>
              <Button asChild size="lg" className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white rounded-full px-10 py-6 text-lg">
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
      <Seo 
        title="Custom Piano Backing Request"
        description="Submit your custom piano backing track request for auditions, practice, or performances."
      />
      <div className="sticky top-0 z-[60] w-full">
        <Header />
        {!isSubmittedSuccessfully && (
          <div className="w-full h-1.5 bg-gray-100 overflow-hidden">
            <motion.div 
              className="h-full bg-[#F538BC]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
          </div>
        )}
      </div>
      
      <AuthOverlay 
        isOpen={showAuthOverlay} 
        onClose={() => setShowAuthOverlay(false)} 
        redirectPath={location.pathname}
      />

      <BulkUploadDialog 
        isOpen={bulkUploadDialogOpen}
        onClose={() => { setBulkUploadDialogOpen(false); setPendingBulkFiles([]); }}
        fileCount={pendingBulkFiles.length}
        onConfirmDifferent={handleConfirmDifferentSongs}
        onConfirmSame={handleConfirmSameSong}
      />

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-3 tracking-tighter">
              Custom Backing <span className="text-[#F538BC]">Request</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-medium">Bring your sheet music to life with professional accompaniment.</p>
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          {isSubmittedSuccessfully ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key="success"
            >
              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
                <div className="bg-green-500 py-12 text-center text-white">
                  <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10" />
                  </div>
                  <h2 className="text-3xl font-bold">Submission Successful!</h2>
                  <p className="mt-2 text-green-50 font-medium">We've received your request, {globalData.name || 'friend'}.</p>
                </div>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600 mb-8 text-lg">
                    Check your inbox for a confirmation email. Daniele will review your materials and send a quote within 24-48 hours.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => navigate('/user-dashboard')} size="lg" className="rounded-full bg-[#1C0357] hover:bg-[#1C0357]/90 px-8">
                      View My Requests
                    </Button>
                    <Button onClick={() => setIsSubmittedSuccessfully(false)} variant="outline" size="lg" className="rounded-full border-[#1C0357] text-[#1C0357] px-8">
                      New Submission
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="form">
              {isHolidayModeActive && (
                <Alert className="mb-8 border-none bg-[#F538BC]/10 text-[#F538BC] rounded-2xl py-4 shadow-sm">
                  <Plane className="h-5 w-5" />
                  <AlertTitle className="font-bold">Holiday Mode Active</AlertTitle>
                  <AlertDescription className="font-medium">
                    {holidayReturnDate ? `Returning ${format(holidayReturnDate, 'MMMM d')}. Requests will be processed then.` : "Currently on holiday."}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="relative">
                {/* Section 1: Contact */}
                <SectionWrapper ref={contactRef} isComplete={sectionStatus.contact}>
                  <SectionHeader num={1} title="Contact Details" subtitle="Where should we send your quote and track?" isComplete={sectionStatus.contact} />
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                      <div className="relative group">
                        <Input 
                          id="name" name="name" value={globalData.name} onChange={handleGlobalInputChange}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:ring-[#D1AAF2] font-medium"
                          disabled={isSubmitting || !!user}
                          autoComplete="name"
                        />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-gray-400">Phone Number (Optional)</Label>
                      <div className="relative group">
                        <Input 
                          id="phone" name="phone" value={globalData.phone} onChange={handleGlobalInputChange}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:ring-[#D1AAF2] font-medium"
                          disabled={isSubmitting}
                          autoComplete="tel"
                        />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="form-email" className="text-xs font-black uppercase tracking-widest text-gray-400">Email Address</Label>
                      <div className="relative group">
                        <Input 
                          id="form-email" name="email" type="email" value={globalData.email} onChange={handleGlobalInputChange}
                          className={cn("pl-10 h-12 rounded-xl border-gray-200 font-medium", errors.email && "border-red-300 bg-red-50")}
                          disabled={isSubmitting || !!user}
                          autoComplete="email"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                      {errors.email && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="form-confirmEmail" className="text-xs font-black uppercase tracking-widest text-gray-400">Confirm Email</Label>
                      <div className="relative group">
                        <Input 
                          id="form-confirmEmail" name="confirmEmail" type="email" value={globalData.confirmEmail} onChange={handleGlobalInputChange}
                          className={cn("pl-10 h-12 rounded-xl border-gray-200 font-medium", errors.confirmEmail && "border-red-300 bg-red-50")}
                          disabled={isSubmitting || !!user}
                          autoComplete="email"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                      {errors.confirmEmail && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.confirmEmail}</p>}
                    </div>
                  </div>
                </SectionWrapper>

                {/* Section 2: Songs */}
                <SectionWrapper ref={songsRef} isComplete={sectionStatus.songs}>
                  <SectionHeader num={2} title="Song Details" subtitle="Add one or more songs to your order." isComplete={sectionStatus.songs} />
                  
                  <div 
                    className={cn(
                      "mb-8 p-6 rounded-[32px] border-2 border-dashed transition-all duration-300",
                      isDraggingBulk ? "bg-[#F538BC]/10 border-[#F538BC] scale-[1.02]" : "bg-[#D1AAF2]/10 border-[#D1AAF2]/30"
                    )}
                    onDragOver={handleDragOverBulk}
                    onDragLeave={handleDragLeaveBulk}
                    onDrop={handleDropBulk}
                  >
                    <div className="flex flex-col items-center text-center pointer-events-none">
                      <UploadCloud className={cn("h-10 w-10 mb-3 transition-colors", isDraggingBulk ? "text-[#F538BC]" : "text-[#1C0357]")} />
                      <h3 className="text-lg font-black text-[#1C0357] mb-1">Quick Upload</h3>
                      <p className="text-sm text-gray-500 font-medium mb-4">Drag multiple PDFs here to automatically create song slots.</p>
                      <Input 
                        type="file" 
                        accept=".pdf" 
                        multiple 
                        className="hidden" 
                        id="bulk-pdf" 
                        onChange={(e) => handleBulkPdfUpload(Array.from(e.target.files || []))}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="rounded-full border-[#1C0357] text-[#1C0357] font-bold pointer-events-auto"
                        onClick={() => document.getElementById('bulk-pdf')?.click()}
                      >
                        Select Multiple PDFs
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence initial={false}>
                      {songs.map((song, index) => (
                        <SongRequestItem
                          key={song.id}
                          index={index}
                          data={song}
                          onChange={handleSongChange}
                          onRemove={removeSong}
                          isOnlySong={songs.length === 1}
                          errors={errors.songs?.[song.id]}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  <Button
                    type="button"
                    onClick={addSong}
                    className="w-full h-16 mt-4 rounded-2xl border-2 border-dashed border-[#1C0357]/20 bg-gray-50/50 text-[#1C0357] hover:bg-[#D1AAF2]/10 hover:border-[#1C0357]/40 transition-all font-black text-lg flex items-center justify-center gap-2"
                  >
                    <Plus size={24} />
                    Add Another Song
                  </Button>
                </SectionWrapper>

                {/* Section 3: Global Quality */}
                <SectionWrapper ref={qualityRef} isComplete={sectionStatus.quality}>
                  <SectionHeader num={3} title="Order Quality" subtitle="These settings apply to all songs in this order." required isComplete={sectionStatus.quality} />
                  
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Category</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-[#1C0357] h-6 w-6">
                                <HelpCircle size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-4 rounded-2xl bg-[#1C0357] text-white border-none shadow-2xl">
                              <div className="space-y-3">
                                {Object.entries(categoryDescriptions).map(([title, desc]) => (
                                  <div key={title}>
                                    <p className="font-black text-[10px] uppercase tracking-widest text-[#F538BC] mb-1">{title}</p>
                                    <p className="text-xs leading-relaxed opacity-90">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select onValueChange={(v) => handleGlobalSelectChange('category', v)} value={globalData.category}>
                        <SelectTrigger className={cn("h-12 rounded-xl border-gray-200 font-medium", errors.category && "border-red-300")}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(categoryDescriptions).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Track Quality</Label>
                      <RadioGroup 
                        value={globalData.trackType} 
                        onValueChange={(v) => handleGlobalSelectChange('trackType', v)}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        {[
                          { id: 'quick', icon: Mic, label: 'Quick Ref', price: '$5-10', desc: 'Fast voice memo' },
                          { id: 'one-take', icon: Headphones, label: 'One-Take', price: '$10-20', desc: 'Clean DAW recording' },
                          { id: 'polished', icon: Sparkles, label: 'Polished', price: '$15-35', desc: 'Audition-ready track' }
                        ].map((item) => (
                          <Label key={item.id} htmlFor={item.id} className="cursor-pointer group">
                            <div className={cn(
                              "relative flex flex-col p-6 rounded-3xl border-2 transition-all duration-500 text-center h-full",
                              globalData.trackType === item.id 
                                ? "border-[#1C0357] bg-[#1C0357]/5 shadow-lg shadow-[#1C0357]/5 scale-[1.02]" 
                                : "border-gray-100 hover:border-[#D1AAF2] bg-white"
                            )}>
                              <RadioGroupItem id={item.id} value={item.id} className="sr-only" />
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-500",
                                globalData.trackType === item.id ? "bg-[#1C0357] text-white" : "bg-gray-50 text-gray-400"
                              )}>
                                <item.icon className="h-6 w-6" />
                              </div>
                              <span className="font-black text-[#1C0357] tracking-tight">{item.label}</span>
                              <span className="text-xs font-black text-[#F538BC] mt-1">{item.price}</span>
                              <p className="text-[11px] text-gray-500 mt-3 leading-relaxed font-medium">{item.desc}</p>
                              {globalData.trackType === item.id && (
                                <div className="absolute top-3 right-3 h-5 w-5 bg-[#1C0357] rounded-full flex items-center justify-center shadow-sm">
                                  <Check className="text-white h-3 w-3" strokeWidth={4} />
                                </div>
                              )}
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </SectionWrapper>

                {/* Section 4: Services */}
                <SectionWrapper ref={servicesRef} isComplete={sectionStatus.services}>
                  <SectionHeader num={4} title="Services & Timeline" subtitle="Finalize your requirements." isComplete={sectionStatus.services} />
                  <div className="space-y-10">
                    <div>
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-4">Backing Type Needed</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: 'full-song', label: 'Full Song', desc: 'Complete arrangement' },
                          { id: 'audition-cut', label: 'Audition Cut', desc: 'Shortened version' },
                          { id: 'note-bash', label: 'Melody Bash', desc: 'Notes only' }
                        ].map(type => (
                          <div key={type.id} className={cn(
                            "flex items-start gap-3 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                            globalData.backingType.includes(type.id) ? "border-[#1C0357] bg-[#1C0357]/5 shadow-sm" : "border-gray-100 hover:border-[#D1AAF2] bg-white"
                          )} onClick={() => handleBackingTypeChange(type.id, !globalData.backingType.includes(type.id))}>
                            <Checkbox 
                              id={`backing_type-${type.id}`}
                              checked={globalData.backingType.includes(type.id)} 
                              onCheckedChange={(checked) => handleBackingTypeChange(type.id, checked)}
                              className="mt-1" 
                            />
                            <Label htmlFor={`backing_type-${type.id}`} className="flex flex-col cursor-pointer">
                              <span className="font-black text-sm text-[#1C0357] tracking-tight">{type.label}</span>
                              <span className="text-[10px] text-gray-500 font-bold mt-0.5">{type.desc}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-400" htmlFor="deliveryDate">Delivery Deadline</Label>
                        <div className="relative group">
                          <Input 
                            id="deliveryDate" name="deliveryDate" type="date" value={globalData.deliveryDate} onChange={handleGlobalInputChange}
                            className="pl-10 h-12 rounded-xl border-gray-200 font-medium"
                          />
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-400 block">Add-ons</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'rush-order', label: 'Rush Order', price: '+$10', desc: '24hr turnaround' },
                            { id: 'complex-songs', label: 'Complex Piece', price: '+$7', desc: 'Sondheim, JRB, etc.' },
                            { id: 'exclusive-ownership', label: 'Exclusive Ownership', price: '+$40', desc: 'Prevent online sharing' },
                            { id: 'additional-edits', label: 'Additional Edits', price: '+$5', desc: 'After completion' }
                          ].map(service => (
                            <div key={service.id} className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                              globalData.additionalServices.includes(service.id) ? "border-[#F538BC] bg-[#F538BC]/5 shadow-sm" : "border-gray-50 bg-white"
                            )} onClick={() => handleAdditionalServiceChange(service.id, !globalData.additionalServices.includes(service.id))}>
                              <div className="flex items-center gap-3">
                                <Checkbox 
                                  id={`additional_services-${service.id}`}
                                  checked={globalData.additionalServices.includes(service.id)} 
                                  onCheckedChange={(checked) => handleAdditionalServiceChange(service.id, checked)}
                                />
                                <Label htmlFor={`additional_services-${service.id}`} className="flex flex-col cursor-pointer">
                                  <span className="font-black text-sm text-[#1C0357] tracking-tight">{service.label}</span>
                                  <span className="text-[10px] text-gray-500 font-bold">{service.desc}</span>
                                </Label>
                              </div>
                              <span className="text-xs font-black text-[#F538BC]">{service.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400" htmlFor="specialRequests">Special Notes (Global)</Label>
                      <Textarea 
                        id="specialRequests" name="specialRequests" value={globalData.specialRequests} onChange={handleGlobalInputChange}
                        placeholder="Any general notes for the entire order..."
                        className="rounded-2xl border-gray-200 min-h-[120px] font-medium p-4"
                      />
                    </div>
                  </div>
                </SectionWrapper>

                {/* Price Summary Section */}
                <SectionWrapper isComplete={progress > 80}>
                  <SectionHeader num={5} title="Price Summary" subtitle="Estimated cost for your request." isComplete={progress > 80} />
                  <div className="bg-[#1C0357] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#F538BC]/10 blur-3xl rounded-full" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <Calculator className="text-[#F1E14F]" size={20} />
                        </div>
                        <h3 className="text-xl font-black tracking-tight">Estimated Total</h3>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white/60 uppercase tracking-widest">Cost Per Song</span>
                            <span className="text-xs text-white/40 font-medium">Based on quality & services</span>
                          </div>
                          <span className="text-2xl font-black text-[#F1E14F]">${priceBreakdown.perSong.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white/60 uppercase tracking-widest">Number of Songs</span>
                            <span className="text-xs text-white/40 font-medium">Slots added above</span>
                          </div>
                          <span className="text-2xl font-black text-white">× {songs.length}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <p className="text-xs font-black text-[#F538BC] uppercase tracking-[0.3em] mb-2">Total Estimated Cost</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white/60">$</span>
                          <span className="text-6xl font-black tracking-tighter text-white">{priceBreakdown.total.toFixed(2)}</span>
                          <span className="text-sm font-bold text-white/40 ml-2">AUD</span>
                        </div>
                        <p className="text-[10px] text-white/40 mt-6 font-medium max-w-xs">
                          *Final price may vary slightly based on song complexity. You will receive a confirmed quote within 24-48 hours.
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionWrapper>

                {/* Section 6: Final Step */}
                <SectionWrapper ref={finalRef} isComplete={sectionStatus.final}>
                  <div className={cn(
                    "p-6 rounded-3xl border-2 transition-all duration-500 flex gap-4",
                    consentChecked ? "border-green-100 bg-green-50/30" : "border-gray-100 bg-white",
                    errors.consent && "border-red-200 bg-red-50"
                  )}>
                    <Checkbox 
                      id="consent" 
                      checked={consentChecked} 
                      onCheckedChange={(v) => setConsentChecked(v as boolean)} 
                      className="mt-1" 
                    />
                    <Label htmlFor="consent" className="text-sm text-gray-600 leading-relaxed cursor-pointer font-bold">
                      I understand that unless I purchase <span className="text-[#1C0357] font-black">Exclusive Ownership</span>, Piano Backings by Daniele retains rights to sell or share these tracks publicly.
                    </Label>
                  </div>

                  <div className="mt-12 flex flex-col items-center gap-8">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || isHolidayModeActive || !consentChecked}
                      className="group h-20 rounded-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-16 text-xl font-black shadow-2xl shadow-[#1C0357]/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="animate-spin h-6 w-6" />
                          <span>Processing {songs.length} Songs...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span>Send My Request</span>
                          <ChevronRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                        </div>
                      )}
                    </Button>
                    
                    {!user && (
                      <p className="text-xs text-gray-400 font-black tracking-widest uppercase">
                        TIP: <Link to="/login" className="text-[#1C0357] hover:underline">Sign In</Link> to track your order status.
                      </p>
                    )}
                  </div>
                </SectionWrapper>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-20">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default FormPage;
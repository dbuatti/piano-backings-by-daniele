"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  LinkIcon, 
  MicIcon, 
  FileTextIcon, 
  MusicIcon, 
  KeyIcon, 
  CalendarIcon, 
  AlertCircle, 
  User as UserIcon,
  Folder,
  Youtube,
  Mail,
  Mic,
  Headphones,
  Sparkles,
  MessageSquare,
  Plane,
  CheckCircle,
  Phone,
  XCircle,
  Loader2,
  ChevronRight,
  Info,
  HelpCircle,
  Link as LinkIconLucide
} from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import FileInput from "@/components/FileInput";
import { useAppSettings } from '@/hooks/useAppSettings';
import { format } from 'date-fns';
import Seo from "@/components/Seo";
import AuthOverlay from "@/components/AuthOverlay";

const SectionHeader = ({ num, title, subtitle, required }: { num: number, title: string, subtitle?: string, required?: boolean }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C0357] text-sm font-bold text-white shadow-sm">
        {num}
      </span>
      <h2 className="text-xl font-bold text-[#1C0357] tracking-tight">
        {title} {required && <span className="text-red-500 ml-1">*</span>}
      </h2>
    </div>
    {subtitle && <p className="mt-1 ml-11 text-sm text-gray-500 font-medium">{subtitle}</p>}
  </div>
);

const SectionWrapper = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
    ref={ref}
    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow mb-8"
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
  
  const { 
    isHolidayModeActive, 
    holidayReturnDate, 
    isServiceClosed, 
    closureReason, 
    isLoading: isLoadingAppSettings 
  } = useAppSettings();

  const [formData, setFormData] = useState({
    email: '',
    confirmEmail: '',
    name: '',
    phone: '',
    songTitle: '',
    musicalOrArtist: '',
    songKey: '',
    differentKey: 'No',
    keyForTrack: '',
    voiceMemo: '',
    voiceMemoFile: null as File | null,
    sheetMusic: null as File | null,
    youtubeLink: '',
    additionalLinks: '',
    backingType: [] as string[],
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
    category: '',
    trackType: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentChecked, setConsentChecked] = useState(false);

  const progress = useMemo(() => {
    const requiredFields = [
      formData.email,
      formData.confirmEmail === formData.email && formData.confirmEmail !== '',
      formData.songTitle,
      formData.musicalOrArtist,
      formData.category,
      formData.trackType,
      formData.songKey,
      formData.backingType.length > 0,
      formData.sheetMusic,
      consentChecked
    ];
    
    const completedCount = requiredFields.filter(Boolean).length;
    return (completedCount / requiredFields.length) * 100;
  }, [formData, consentChecked]);

  const emailRef = useRef<HTMLDivElement>(null);
  const confirmEmailRef = useRef<HTMLDivElement>(null);
  const songTitleRef = useRef<HTMLDivElement>(null);
  const musicalOrArtistRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const trackTypeRef = useRef<HTMLDivElement>(null);
  const songKeyRef = useRef<HTMLDivElement>(null);
  const backingTypeRef = useRef<HTMLDivElement>(null);
  const sheetMusicRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setFormData(prev => ({
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
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

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

  const getWaitTimeMessage = () => {
    if (incompleteTracksCount === null || loadingTrackCount) return null;
    if (incompleteTracksCount === 0) return null;
    if (incompleteTracksCount >= 7) return "3 week wait";
    if (incompleteTracksCount >= 4) return "2 weeks wait";
    if (incompleteTracksCount >= 1) return "1 week wait";
    return null;
  };

  const waitTimeMessage = getWaitTimeMessage();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileInputChange = (file: File | null, fieldName: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: file }));
    setErrors(prev => ({ ...prev, [fieldName]: '' }));
  };

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => {
      const newServices = prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service];
      return { ...prev, additionalServices: newServices };
    });
  };

  const handleBackingTypeChange = (type: string, checked: boolean | 'indeterminate') => {
    setFormData(prev => {
      const newBackingTypes = checked
        ? [...prev.backingType, type]
        : prev.backingType.filter(t => t !== type);
      return { ...prev, backingType: newBackingTypes };
    });
    setErrors(prev => ({ ...prev, backingType: '' }));
  };

  const fillDummyData = () => {
    setFormData({
      email: user?.email || 'test@example.com',
      confirmEmail: user?.email || 'test@example.com',
      name: user?.user_metadata?.full_name || 'Test User',
      phone: '0412345678',
      songTitle: 'Defying Gravity',
      musicalOrArtist: 'Wicked',
      songKey: 'C Major (0)',
      differentKey: 'No',
      keyForTrack: '',
      voiceMemo: '',
      voiceMemoFile: null,
      sheetMusic: null,
      youtubeLink: 'https://www.youtube.com/watch?v=bIZNxHMDpjY',
      additionalLinks: 'https://example.com/extra-reference',
      backingType: ['full-song', 'audition-cut'],
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      additionalServices: ['rush-order'],
      specialRequests: 'Please make sure the tempo matches the reference exactly.',
      category: 'Practice Tracks',
      trackType: 'polished'
    });
    setErrors({});
    setConsentChecked(true);
    toast({ title: "Sample Data Filled", description: "The form has been pre-filled." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayModeActive || isServiceClosed) return;

    setIsSubmitting(true);
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email is required.';
    if (formData.email !== formData.confirmEmail) newErrors.confirmEmail = 'Emails do not match.';
    if (!formData.songTitle) newErrors.songTitle = 'Song Title is required.';
    if (!formData.musicalOrArtist) newErrors.musicalOrArtist = 'Musical or Artist is required.';
    if (!formData.category) newErrors.category = 'Category is required.';
    if (!formData.trackType) newErrors.trackType = 'Track Type is required.';
    if (!formData.songKey) newErrors.songKey = 'Sheet music key is required.';
    if (formData.backingType.length === 0) newErrors.backingType = 'At least one backing type is required.';
    if (!formData.sheetMusic) newErrors.sheetMusic = 'Sheet music is required.';
    if (!consentChecked) newErrors.consent = 'You must agree to the terms.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      
      if (newErrors.email) emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (newErrors.songTitle) songTitleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (newErrors.trackType) trackTypeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      toast({ title: "Validation Error", description: "Please check the required fields.", variant: "destructive" });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let sheetMusicUrl = null;
      if (formData.sheetMusic) {
        const fileExt = formData.sheetMusic.name.split('.').pop();
        const fileName = `sheet-music-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('sheet-music').upload(fileName, formData.sheetMusic);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('sheet-music').getPublicUrl(uploadData.path);
        sheetMusicUrl = publicUrl;
      }
      
      let voiceMemoFileUrl = null;
      if (formData.voiceMemoFile) {
        const fileExt = formData.voiceMemoFile.name.split('.').pop();
        const fileName = `voice-memo-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, formData.voiceMemoFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(uploadData.path);
          voiceMemoFileUrl = publicUrl;
        }
      }
      
      const submissionData = {
        formData: {
          ...formData,
          voiceMemoFileUrl,
          sheetMusicUrl
        }
      };
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      else headers['Authorization'] = `Bearer ${SUPABASE_PUBLISHABLE_KEY}`;
      
      const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`, {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionData),
      });
      
      if (!response.ok) throw new Error('Failed to submit request');
      
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
          <div className="w-full h-1 bg-gray-100 overflow-hidden">
            <motion.div 
              className="h-full bg-[#1C0357]"
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
      />

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-black text-[#1C0357] mb-3 tracking-tighter">
              Custom Backing <span className="text-[#F538BC]">Request</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium">Bring your sheet music to life with professional accompaniment.</p>
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
                  <p className="mt-2 text-green-50 font-medium">We've received your request, {formData.name || 'friend'}.</p>
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
                <Alert className="mb-8 border-none bg-[#F538BC]/10 text-[#F538BC] rounded-2xl py-4">
                  <Plane className="h-5 w-5" />
                  <AlertTitle className="font-bold">Holiday Mode Active</AlertTitle>
                  <AlertDescription className="font-medium">
                    {holidayReturnDate ? `Returning ${format(holidayReturnDate, 'MMMM d')}. Requests will be processed then.` : "Currently on holiday."}
                  </AlertDescription>
                </Alert>
              )}

              {waitTimeMessage && !isHolidayModeActive && (
                <Alert className="mb-8 border-none bg-[#F1E14F]/20 text-yellow-800 rounded-2xl py-4">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle className="font-bold">Current Queue Notice</AlertTitle>
                  <AlertDescription className="font-medium">
                    Estimated <strong>{waitTimeMessage}</strong> due to high demand. Rush options available below.
                  </AlertDescription>
                </Alert>
              )}

              <SectionWrapper>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 bg-[#D1AAF2]/20 rounded-xl flex items-center justify-center text-[#1C0357]">
                    <Info size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-[#1C0357]">Preparation Checklist</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Sheet music in PDF format (Required)",
                    "YouTube link for tempo (Recommended)",
                    "Correct key for the track (Essential)",
                    "Voice memo of your phrasing (Helpful)"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <CheckCircle size={16} className="text-[#F538BC]" />
                      <span className="text-sm font-medium text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
                {isAdmin && (
                  <Button variant="ghost" onClick={fillDummyData} className="mt-6 text-xs text-[#1C0357] font-bold hover:bg-gray-100">
                    ⚡ Fill Sample Data (Admin)
                  </Button>
                )}
              </SectionWrapper>

              <form onSubmit={handleSubmit} className="relative">
                {/* Section 1: Contact */}
                <SectionWrapper ref={emailRef}>
                  <SectionHeader num={1} title="Contact Details" subtitle="Where should we send your quote and track?" />
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</Label>
                      <div className="relative group">
                        <Input 
                          id="name" name="name" value={formData.name} onChange={handleInputChange}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:ring-[#D1AAF2]"
                          disabled={isSubmitting || !!user}
                        />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone Number (Optional)</Label>
                      <div className="relative group">
                        <Input 
                          id="phone" name="phone" value={formData.phone} onChange={handleInputChange}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:ring-[#D1AAF2]"
                          disabled={isSubmitting}
                        />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</Label>
                      <div className="relative group">
                        <Input 
                          id="email" name="email" type="email" value={formData.email} onChange={handleInputChange}
                          className={cn("pl-10 h-12 rounded-xl border-gray-200", errors.email && "border-red-300 bg-red-50")}
                          disabled={isSubmitting || !!user}
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                      {errors.email && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.email}</p>}
                    </div>
                    <div className="space-y-2" ref={confirmEmailRef}>
                      <Label htmlFor="confirmEmail" className="text-xs font-bold uppercase tracking-wider text-gray-500">Confirm Email</Label>
                      <div className="relative group">
                        <Input 
                          id="confirmEmail" name="confirmEmail" type="email" value={formData.confirmEmail} onChange={handleInputChange}
                          className={cn("pl-10 h-12 rounded-xl border-gray-200", errors.confirmEmail && "border-red-300 bg-red-50")}
                          disabled={isSubmitting || !!user}
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                      </div>
                      {errors.confirmEmail && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.confirmEmail}</p>}
                    </div>
                  </div>
                </SectionWrapper>

                {/* Section 2: Song Info */}
                <SectionWrapper ref={songTitleRef}>
                  <SectionHeader num={2} title="Song Information" subtitle="Tell us about the piece." />
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="songTitle" className="text-xs font-bold uppercase tracking-wider text-gray-500">Song Title</Label>
                      <Input 
                        id="songTitle" name="songTitle" value={formData.songTitle} onChange={handleInputChange}
                        className={cn("h-12 rounded-xl border-gray-200", errors.songTitle && "border-red-300")}
                      />
                    </div>
                    <div className="space-y-2" ref={musicalOrArtistRef}>
                      <Label htmlFor="musicalOrArtist" className="text-xs font-bold uppercase tracking-wider text-gray-500">Musical or Artist</Label>
                      <Input 
                        id="musicalOrArtist" name="musicalOrArtist" value={formData.musicalOrArtist} onChange={handleInputChange}
                        className={cn("h-12 rounded-xl border-gray-200", errors.musicalOrArtist && "border-red-300")}
                      />
                    </div>
                  </div>
                  <div className="mt-6 space-y-2" ref={categoryRef}>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-gray-500">Category</Label>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-gray-400 hover:text-[#1C0357] transition-colors">
                              <HelpCircle size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs p-4 rounded-xl bg-[#1C0357] text-white border-none shadow-xl">
                            <div className="space-y-3">
                              {Object.entries(categoryDescriptions).map(([title, desc]) => (
                                <div key={title}>
                                  <p className="font-bold text-xs uppercase tracking-wider text-[#F538BC]">{title}</p>
                                  <p className="text-[11px] leading-relaxed opacity-90">{desc}</p>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select onValueChange={(v) => handleSelectChange('category', v)} value={formData.category}>
                      <SelectTrigger className={cn("h-12 rounded-xl border-gray-200", errors.category && "border-red-300")}>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(categoryDescriptions).map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </SectionWrapper>

                {/* Section 3: Track Quality */}
                <SectionWrapper ref={trackTypeRef}>
                  <SectionHeader num={3} title="Track Quality" subtitle="Choose the level of production you need." required />
                  <RadioGroup 
                    value={formData.trackType} 
                    onValueChange={(v) => handleSelectChange('trackType', v)}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {[
                      { id: 'quick', icon: Mic, label: 'Quick Ref', price: '$5-10', desc: 'Fast voice memo' },
                      { id: 'one-take', icon: Headphones, label: 'One-Take', price: '$10-20', desc: 'Clean DAW recording' },
                      { id: 'polished', icon: Sparkles, label: 'Polished', price: '$15-35', desc: 'Audition-ready track' }
                    ].map((item) => (
                      <Label key={item.id} className="cursor-pointer group">
                        <div className={cn(
                          "relative flex flex-col p-5 rounded-2xl border-2 transition-all duration-300 text-center h-full",
                          formData.trackType === item.id 
                            ? "border-[#1C0357] bg-[#1C0357]/5 shadow-sm" 
                            : "border-gray-100 hover:border-[#D1AAF2] bg-white"
                        )}>
                          <RadioGroupItem value={item.id} className="sr-only" />
                          <item.icon className={cn("h-8 w-8 mx-auto mb-3", formData.trackType === item.id ? "text-[#1C0357]" : "text-gray-400")} />
                          <span className="font-bold text-[#1C0357]">{item.label}</span>
                          <span className="text-xs font-black text-[#F538BC] mt-1">{item.price}</span>
                          <p className="text-[11px] text-gray-500 mt-2 leading-tight">{item.desc}</p>
                          {formData.trackType === item.id && (
                            <div className="absolute top-2 right-2 h-4 w-4 bg-[#1C0357] rounded-full flex items-center justify-center">
                              <CheckCircle className="text-white h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                  {errors.trackType && <p className="mt-3 text-red-500 text-[10px] font-bold uppercase">{errors.trackType}</p>}
                </SectionWrapper>

                {/* Section 4: Musical Details */}
                <SectionWrapper ref={songKeyRef}>
                  <SectionHeader num={4} title="Musical Details" subtitle="Keys and Transpositions." />
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Sheet Music Key</Label>
                      <Select onValueChange={(v) => handleSelectChange('songKey', v)} value={formData.songKey}>
                        <SelectTrigger className={cn("h-12 rounded-xl border-gray-200", errors.songKey && "border-red-300")}>
                          <SelectValue placeholder="What key is the sheet music in?" />
                        </SelectTrigger>
                        <SelectContent>
                          {["C Major (0)", "G Major (1♯)", "D Major (2♯)", "A Major (3♯)", "E Major (4♯)", "B Major (5♯)", "F♯ Major (6♯)", "C♯ Major (7♯)", "F Major (1♭)", "B♭ Major (2♭)", "E♭ Major (3♭)", "A♭ Major (4♭)", "D♭ Major (5♭)", "G♭ Major (6♭)", "C♭ Major (7♭)"].map(k => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Final Track Key</Label>
                      <Select onValueChange={(v) => handleSelectChange('differentKey', v)} value={formData.differentKey}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200">
                          <SelectValue placeholder="Does the track need a different key?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">Keep original key</SelectItem>
                          <SelectItem value="Yes">I need a different key</SelectItem>
                          <SelectItem value="Maybe">I'm not sure yet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.differentKey === 'Yes' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Requested Key</Label>
                        <Select onValueChange={(v) => handleSelectChange('keyForTrack', v)} value={formData.keyForTrack}>
                          <SelectTrigger className="h-12 rounded-xl border-gray-200">
                            <SelectValue placeholder="Select target key" />
                          </SelectTrigger>
                          <SelectContent>
                            {["C Major (0)", "G Major (1♯)", "D Major (2♯)", "A Major (3♯)", "E Major (4♯)", "B Major (5♯)", "F♯ Major (6♯)", "C♯ Major (7♯)", "F Major (1♭)", "B♭ Major (2♭)", "E♭ Major (3♭)", "A♭ Major (4♭)", "D♭ Major (5♭)", "G♭ Major (6♭)", "C♭ Major (7♭)"].map(k => (
                              <SelectItem key={k} value={k}>{k}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </div>
                </SectionWrapper>

                {/* Section 5: Materials */}
                <SectionWrapper ref={sheetMusicRef}>
                  <SectionHeader num={5} title="Materials" subtitle="Upload your sheet music and references." />
                  <div className="space-y-6">
                    <FileInput
                      id="sheetMusic"
                      label="Sheet Music (PDF)"
                      icon={FileTextIcon}
                      accept=".pdf"
                      onChange={(file) => handleFileInputChange(file, 'sheetMusic')}
                      required
                      error={errors.sheetMusic}
                    />
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">YouTube Reference (Tempo)</Label>
                        <div className="relative group">
                          <Input 
                            id="youtubeLink" name="youtubeLink" value={formData.youtubeLink} onChange={handleInputChange}
                            className="pl-10 h-12 rounded-xl border-gray-200"
                            placeholder="https://youtube.com/..."
                          />
                          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Additional Reference Links (Optional)</Label>
                        <div className="relative group">
                          <Input 
                            id="additionalLinks" name="additionalLinks" value={formData.additionalLinks} onChange={handleInputChange}
                            className="pl-10 h-12 rounded-xl border-gray-200"
                            placeholder="Spotify, Dropbox, etc..."
                          />
                          <LinkIconLucide className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Voice Memo (Optional)</Label>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">Option 1: Provide a Link</Label>
                          <div className="relative group">
                            <Input 
                              id="voiceMemo" name="voiceMemo" value={formData.voiceMemo} onChange={handleInputChange}
                              className="pl-10 h-12 rounded-xl border-gray-200 bg-white"
                              placeholder="Voice memo link..."
                            />
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">Option 2: Upload Audio</Label>
                          <FileInput
                            id="voiceMemoFile"
                            label="Upload File"
                            icon={MicIcon}
                            accept="audio/*"
                            onChange={(file) => handleFileInputChange(file, 'voiceMemoFile')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionWrapper>

                {/* Section 6: Backing Type */}
                <SectionWrapper ref={backingTypeRef}>
                  <SectionHeader num={6} title="Services & Timeline" subtitle="Finalize your requirements." />
                  <div className="space-y-8">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-4">Backing Type Needed</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: 'full-song', label: 'Full Song', desc: 'Complete arrangement' },
                          { id: 'audition-cut', label: 'Audition Cut', desc: 'Shortened version' },
                          { id: 'note-bash', label: 'Melody Bash', desc: 'Notes only' }
                        ].map(type => (
                          <div key={type.id} className={cn(
                            "flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                            formData.backingType.includes(type.id) ? "border-[#1C0357] bg-[#1C0357]/5" : "border-gray-100 bg-white hover:border-[#D1AAF2]"
                          )} onClick={() => handleBackingTypeChange(type.id, !formData.backingType.includes(type.id))}>
                            <Checkbox checked={formData.backingType.includes(type.id)} className="mt-1" />
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-[#1C0357]">{type.label}</span>
                              <span className="text-[10px] text-gray-500 font-medium">{type.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {errors.backingType && <p className="mt-2 text-red-500 text-[10px] font-bold uppercase">{errors.backingType}</p>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Delivery Deadline</Label>
                        <div className="relative group">
                          <Input 
                            id="deliveryDate" name="deliveryDate" type="date" value={formData.deliveryDate} onChange={handleInputChange}
                            className="pl-10 h-12 rounded-xl border-gray-200"
                          />
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C0357] transition-colors" size={18} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Add-ons</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'rush-order', label: 'Rush Order', price: '+$10', desc: '24hr turnaround' },
                            { id: 'complex-songs', label: 'Complex Piece', price: '+$7', desc: 'Sondheim, JRB, etc.' },
                            { id: 'exclusive-ownership', label: 'Exclusive Ownership', price: '+$40', desc: 'Prevent online sharing' },
                            { id: 'additional-edits', label: 'Additional Edits', price: '+$5', desc: 'After completion' }
                          ].map(service => (
                            <div key={service.id} className={cn(
                              "flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer",
                              formData.additionalServices.includes(service.id) ? "border-[#F538BC] bg-[#F538BC]/5" : "border-gray-50 bg-white"
                            )} onClick={() => handleCheckboxChange(service.id)}>
                              <div className="flex items-center gap-3">
                                <Checkbox checked={formData.additionalServices.includes(service.id)} />
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-[#1C0357]">{service.label}</span>
                                  <span className="text-[10px] text-gray-500">{service.desc}</span>
                                </div>
                              </div>
                              <span className="text-xs font-black text-[#F538BC]">{service.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Special Notes</Label>
                      <Textarea 
                        id="specialRequests" name="specialRequests" value={formData.specialRequests} onChange={handleInputChange}
                        placeholder="Any rubato sections, specific cuts, or phrasing notes..."
                        className="rounded-xl border-gray-200 min-h-[100px]"
                      />
                    </div>
                  </div>
                </SectionWrapper>

                {/* Section 7: Final Step */}
                <SectionWrapper ref={consentRef}>
                  <div className={cn(
                    "p-5 rounded-2xl border-2 transition-all flex gap-4",
                    consentChecked ? "border-green-100 bg-green-50/30" : "border-gray-100 bg-white",
                    errors.consent && "border-red-200 bg-red-50"
                  )}>
                    <Checkbox id="consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(v as boolean)} className="mt-1" />
                    <Label htmlFor="consent" className="text-sm text-gray-600 leading-relaxed cursor-pointer font-medium">
                      I understand that unless I purchase <span className="text-[#1C0357] font-bold">Exclusive Ownership</span>, Piano Backings by Daniele retains rights to sell or share this track publicly.
                    </Label>
                  </div>
                  {errors.consent && <p className="mt-3 text-red-500 text-[10px] font-bold uppercase">{errors.consent}</p>}

                  <div className="mt-10 flex flex-col items-center gap-6">
                    <div className="text-center max-w-md mx-auto">
                      <p className="text-xs font-bold text-[#1C0357]/60 mb-2 uppercase tracking-widest">Quote Policy</p>
                      <p className="text-sm text-gray-500 font-medium">
                        Submission sends your details for review. You'll receive a quote and secure payment link before work begins.
                      </p>
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || isHolidayModeActive || !consentChecked}
                      className="group h-16 rounded-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-12 text-lg font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-5 w-5" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Send My Request</span>
                          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>
                    
                    {!user && (
                      <p className="text-xs text-gray-400 font-bold">
                        TIP: <Link to="/auth" className="text-[#1C0357] hover:underline">Sign In</Link> to track your order status.
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
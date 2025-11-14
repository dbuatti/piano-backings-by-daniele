import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
  Target,
  Mail,
  Mic, // Added Mic icon
  Headphones, // Added Headphones icon
  Sparkles, // Added Sparkles icon
  MessageSquare, // New icon for special requests
  Plane, // Added Plane icon for holiday mode
  CheckCircle, // Added CheckCircle for success message
  Phone // Added Phone icon
} from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // Import Link
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils"; // Import cn for conditional classNames
import FileInput from "@/components/FileInput"; // Import the new FileInput component
import AccountPromptCard from '@/components/AccountPromptCard'; // Import the new AccountPromptCard
import { useHolidayMode } from '@/hooks/useHolidayMode'; // Import useHolidayMode
import { format } from 'date-fns';
import Seo from "@/components/Seo"; // Import Seo component

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false); // New state for success message
  const [showAccountPrompt, setShowAccountPrompt] = useState(false); // State to control visibility of the new card
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false); // New state for admin status
  const [incompleteTracksCount, setIncompleteTracksCount] = useState<number | null>(null);
  const [loadingTrackCount, setLoadingTrackCount] = useState(true);
  const { isHolidayModeActive, holidayReturnDate, isLoading: isLoadingHolidayMode } = useHolidayMode(); // Use the hook

  const [formData, setFormData] = useState({
    email: '',
    confirmEmail: '', // New field for email confirmation
    name: '',
    phone: '', // New field for phone number
    songTitle: '',
    musicalOrArtist: '',
    songKey: '',
    differentKey: 'No',
    keyForTrack: '',
    voiceMemo: '',
    voiceMemoFile: null as File | null,
    sheetMusic: null as File | null,
    youtubeLink: '',
    additionalLinks: '', // New field for additional links
    backingType: [] as string[], // Changed to array for multi-select
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
    category: '',
    trackType: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({}); // State for validation errors
  const [consentChecked, setConsentChecked] = useState(false); // New state for consent checkbox

  // Refs for scrolling to errors
  const formRefs = {
    email: React.useRef<HTMLInputElement>(null),
    confirmEmail: React.useRef<HTMLInputElement>(null),
    songTitle: React.useRef<HTMLInputElement>(null),
    musicalOrArtist: React.useRef<HTMLInputElement>(null),
    category: React.useRef<HTMLDivElement>(null), // Select component
    trackType: React.useRef<HTMLDivElement>(null), // RadioGroup component
    songKey: React.useRef<HTMLDivElement>(null), // Select component
    backingType: React.useRef<HTMLDivElement>(null), // Checkbox group
    sheetMusic: React.useRef<HTMLDivElement>(null), // FileInput component
    consent: React.useRef<HTMLDivElement>(null), // Checkbox div
  };

  // Check user session on component mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          confirmEmail: session.user.email || '', // Pre-fill confirm email too
          name: session.user.user_metadata?.full_name || ''
        }));
        // Check if user is admin
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        setIsAdmin(adminEmails.includes(session.user.email));
        setShowAccountPrompt(false); // Hide prompt if logged in
      } else {
        setIsAdmin(false); // Ensure isAdmin is false if no session
        setShowAccountPrompt(true); // Show prompt if not logged in
      }
    };
    checkUser();
  }, []);

  // Scroll to element if hash is present in the URL
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Use a small timeout to ensure the element is rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  // Fetch incomplete track count
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
        setIncompleteTracksCount(0); // Default to 0 on error
        toast({
          title: "Error",
          description: `Failed to load current track queue: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoadingTrackCount(false);
      }
    };

    fetchIncompleteTracks();
  }, [toast]);

  const getWaitTimeMessage = () => {
    if (incompleteTracksCount === null || loadingTrackCount) {
      return null; // Or a loading indicator
    }

    if (incompleteTracksCount === 0) {
      return null; // No notice if 0 pending tracks
    } else if (incompleteTracksCount >= 7) {
      return "3 week wait";
    } else if (incompleteTracksCount >= 4) {
      return "2 weeks wait";
    } else if (incompleteTracksCount >= 1) {
      return "1 week wait";
    }
    return null;
  };

  const waitTimeMessage = getWaitTimeMessage();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change
  };

  // Updated handler for the new FileInput component
  const handleFileInputChange = (file: File | null, fieldName: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: file }));
    setErrors(prev => ({ ...prev, [fieldName]: '' })); // Clear error on change
  };

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => {
      const newServices = prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service];
      return { ...prev, additionalServices: newServices };
    });
  };

  // New handler for multi-select backing types
  const handleBackingTypeChange = (type: string, checked: boolean | 'indeterminate') => {
    setFormData(prev => {
      const newBackingTypes = checked
        ? [...prev.backingType, type]
        : prev.backingType.filter(t => t !== type);
      return { ...prev, backingType: newBackingTypes };
    });
    setErrors(prev => ({ ...prev, backingType: '' })); // Fix: Correctly clear error on change
  };

  const fillDummyData = () => {
    setFormData({
      email: user?.email || 'test@example.com',
      confirmEmail: user?.email || 'test@example.com', // Fill confirm email too
      name: user?.user_metadata?.full_name || 'Test User',
      phone: '0412345678', // Dummy phone number
      songTitle: 'Defying Gravity',
      musicalOrArtist: 'Wicked',
      songKey: 'C Major (0)',
      differentKey: 'No',
      keyForTrack: '',
      voiceMemo: '',
      voiceMemoFile: null,
      sheetMusic: null,
      youtubeLink: 'https://www.youtube.com/watch?v=bIZNxHMDpjY', // Added a dummy YouTube link
      additionalLinks: 'https://example.com/extra-reference', // Dummy additional link
      backingType: ['full-song', 'audition-cut'], // Dummy multi-select
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      additionalServices: ['rush-order'],
      specialRequests: 'Please make sure the tempo matches the reference exactly.',
      category: 'Practice Tracks',
      trackType: 'polished'
    });
    setErrors({}); // Clear any existing errors
    setConsentChecked(true); // Also check consent for dummy data
    
    toast({
      title: "Sample Data Filled",
      description: "The form has been pre-filled with sample data.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit initiated.');

    if (isHolidayModeActive) {
      toast({
        title: "Holiday Mode Active",
        description: "New requests cannot be submitted while on holiday. Please check back later.",
        variant: "destructive",
      });
      console.log('Submission prevented: Holiday Mode Active.');
      return;
    }

    setIsSubmitting(true);
    const newErrors: Record<string, string> = {};

    // Client-side validation
    if (!formData.email) newErrors.email = 'Email is required.';
    if (formData.email !== formData.confirmEmail) newErrors.confirmEmail = 'Emails do not match.'; // New validation
    if (!formData.songTitle) newErrors.songTitle = 'Song Title is required.';
    if (!formData.musicalOrArtist) newErrors.musicalOrArtist = 'Musical or Artist is required.';
    if (!formData.category) newErrors.category = 'Category is required.';
    if (!formData.trackType) newErrors.trackType = 'Track Type is required.';
    if (!formData.songKey) newErrors.songKey = 'Sheet music key is required.'; // NEW: Make sheet music key required
    if (formData.backingType.length === 0) newErrors.backingType = 'At least one backing type is required.';
    if (!formData.sheetMusic) newErrors.sheetMusic = 'Sheet music is required. Please upload a PDF file.';
    if (!consentChecked) newErrors.consent = 'You must agree to the terms to submit your request.'; // New consent validation

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      
      // Scroll to the first error
      const firstErrorField = Object.keys(newErrors)[0] as keyof typeof formRefs;
      if (formRefs[firstErrorField] && formRefs[firstErrorField].current) {
        formRefs[firstErrorField].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and agree to the terms.",
        variant: "destructive",
      });
      console.log('Submission prevented: Client-side validation failed.', newErrors);
      return;
    }

    try {
      console.log('Validation passed. Attempting to get Supabase session.');
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Supabase session:', session);
      
      // Upload sheet music if provided
      let sheetMusicUrl = null;
      if (formData.sheetMusic) {
        console.log('Attempting to upload sheet music.');
        try {
          const fileExt = formData.sheetMusic.name.split('.').pop();
          const fileName = `sheet-music-${Date.now()}.${fileExt}`;
          
          // Upload to Supabase storage
          const { error: uploadError } = await supabase
            .storage
            .from('sheet-music')
            .upload(fileName, formData.sheetMusic, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Storage upload error (sheet music):', uploadError);
            throw new Error(`File upload error: ${uploadError.message}`);
          }
          
          // Get public URL for the uploaded file
          const { data: { publicUrl } } = supabase
            .storage
            .from('sheet-music')
            .getPublicUrl(fileName);
          
          sheetMusicUrl = publicUrl;
          console.log('Sheet music uploaded successfully:', sheetMusicUrl);
        } catch (uploadError: any) {
          console.error('File upload error (sheet music):', uploadError);
          toast({
            title: "Warning",
            description: `Sheet music upload failed: ${uploadError.message}. Request will still be submitted.`,
            variant: "destructive",
          });
          // Do NOT re-throw here, allow the form submission to continue without the sheet music URL
        }
      }
      
      // Upload voice memo file if provided
      let voiceMemoFileUrl = null;
      if (formData.voiceMemoFile) {
        console.log('Attempting to upload voice memo file.');
        try {
          const fileExt = formData.voiceMemoFile.name.split('.').pop();
          const fileName = `voice-memo-${Date.now()}.${fileExt}`;
          
          // Upload to Supabase storage
          const { error: uploadError } = await supabase
            .storage
            .from('voice-memos')
            .upload(fileName, formData.voiceMemoFile, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Voice memo upload error:', uploadError);
            // Show a more user-friendly error message
            if (uploadError.message.includes('Bucket not found')) {
              toast({
                title: "Warning",
                description: "Voice memo upload failed: Storage bucket not configured. Request will still be submitted.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Warning",
                description: `Voice memo upload failed: ${uploadError.message}. Request will still be submitted.`,
                variant: "destructive",
              });
            }
          } else {
            // Get public URL for the uploaded file
            const { data: { publicUrl } } = supabase
              .storage
              .from('voice-memos')
              .getPublicUrl(fileName);
            
            voiceMemoFileUrl = publicUrl;
            console.log('Voice memo uploaded successfully:', voiceMemoFileUrl);
          }
        } catch (uploadError: any) {
          console.error('Voice memo upload error:', uploadError);
          toast({
            title: "Warning",
            description: `Voice memo upload failed: ${uploadError.message}. Request will still be submitted.`,
            variant: "destructive",
          });
          // Do NOT re-throw here, allow the form submission to continue without the voice memo URL
        }
      }
      
      // Prepare form data for submission
      const submissionData = {
        formData: {
          email: formData.email,
          name: formData.name,
          phone: formData.phone, // Include phone number
          songTitle: formData.songTitle,
          musicalOrArtist: formData.musicalOrArtist,
          songKey: formData.songKey,
          differentKey: formData.differentKey,
          keyForTrack: formData.keyForTrack,
          youtubeLink: formData.youtubeLink,
          additionalLinks: formData.additionalLinks, // Include the new field
          voiceMemo: formData.voiceMemo,
          voiceMemoFileUrl: voiceMemoFileUrl,
          sheetMusicUrl: sheetMusicUrl,
          backingType: formData.backingType, // Now an array
          deliveryDate: formData.deliveryDate,
          additionalServices: formData.additionalServices,
          specialRequests: formData.specialRequests,
          category: formData.category,
          trackType: formData.trackType
        }
      };
      console.log('Submission data prepared:', submissionData);
      
      // Prepare headers - Include Authorization header with anon key for public Edge Functions
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // If a user is logged in, use their access token. Otherwise, use the anon key.
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('Using authenticated session token for Edge Function call.');
      } else {
        headers['Authorization'] = `Bearer ${SUPABASE_PUBLISHABLE_KEY}`;
        console.log('Using anon key for Edge Function call (no active session).');
      }
      
      console.log('Attempting to call create-backing-request Edge Function.');
      // Submit to Supabase function
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(submissionData),
        }
      );
      console.log('Received response from Edge Function.');
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed response:', result);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Invalid response from server: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error('Edge Function response not OK:', result.error || `Status: ${response.status} ${response.statusText}`);
        throw new Error(result.error || `Failed to submit form: ${response.status} ${response.statusText}`);
      }
      
      // Set success state to true
      setIsSubmittedSuccessfully(true);
      console.log('Form submitted successfully. Setting success state.');
      
      // Clear form
      setFormData({
        email: user?.email || '',
        confirmEmail: user?.email || '',
        name: user?.user_metadata?.full_name || '',
        phone: '',
        songTitle: '',
        musicalOrArtist: '',
        songKey: '',
        differentKey: 'No',
        keyForTrack: '',
        voiceMemo: '',
        voiceMemoFile: null,
        sheetMusic: null,
        youtubeLink: '',
        additionalLinks: '', // Clear the new field
        backingType: [], // Clear as array
        deliveryDate: '',
        additionalServices: [],
        specialRequests: '',
        category: '',
        trackType: ''
      });
      setErrors({}); // Clear any existing errors
      setConsentChecked(false); // Clear consent checkbox
      
      // Show account prompt if user is not logged in
      if (!session) {
        setShowAccountPrompt(true);
        console.log('No session, showing account prompt.');
      } else {
        // No redirect here, the success message will handle navigation
        console.log('Session active, not showing account prompt.');
      }
    } catch (error: any) {
      console.error('Error submitting form (caught by main try/catch):', error);
      toast({
        title: "Error",
        description: `There was a problem submitting your request: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log('handleSubmit finished. isSubmitting set to false.');
    }
  };

  const handleDismissAccountPrompt = () => {
    setShowAccountPrompt(false);
  };

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

  const holidayMessage = holidayReturnDate
    ? `We're on holiday until ${format(holidayReturnDate, 'MMMM d, yyyy')}. New orders will be processed upon our return.`
    : `We're currently on holiday. New orders will be processed upon our return.`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo 
        title="Order Custom Piano Backing Track - Piano Backings by Daniele"
        description="Submit your custom piano backing track request for auditions, practice, or performances. Provide sheet music, YouTube links, and special requests."
        keywords="order custom backing track, piano backing track request, musical theatre backing, audition track order, personalized piano accompaniment"
        canonicalUrl={`${window.location.origin}/form-page`}
      />
      <Header />

      <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Piano Backings Request</h1>
          <p className="text-base md:text-xl font-light text-[#1C0357]/90">Submit Your Custom Track Request</p>
        </div>

        {isLoadingHolidayMode ? (
          <Alert className="mb-4 bg-blue-100 border-blue-500 text-blue-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Loading Status</AlertTitle>
            <AlertDescription>
              Checking app status...
            </AlertDescription>
          </Alert>
        ) : isHolidayModeActive ? (
          <Alert className="mb-4 bg-red-100 border-red-500 text-red-800">
            <Plane className="h-4 w-4" />
            <AlertTitle>Holiday Mode Active!</AlertTitle>
            <AlertDescription>
              {holidayMessage}
            </AlertDescription>
          </Alert>
        ) : waitTimeMessage && (
          <Alert className="mb-4 bg-yellow-100 border-yellow-500 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important Notice</AlertTitle>
            <AlertDescription>
              There is currently a <strong>{waitTimeMessage}</strong> on backing tracks. A rush fee option is available for faster delivery.
            </AlertDescription>
          </Alert>
        )}

        {!user && showAccountPrompt && (
          <AccountPromptCard 
            onDismiss={handleDismissAccountPrompt} 
            isHolidayModeActive={isHolidayModeActive}
            isLoadingHolidayMode={isLoadingHolidayMode}
          />
        )}

        <Card className="shadow-lg mb-6">
          <CardHeader id="request-guidelines" className="bg-[#D1AAF2]/20 py-3 px-4"> {/* Added id here */}
            <CardTitle className="text-lg md:text-xl text-[#1C0357] flex items-center">
              <MusicIcon className="mr-2" size={16} />
              Before You Start: Preparation Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-start mb-3">
              <MusicIcon className="text-[#1C0357] mr-2 mt-0.5" size={16} />
              <p className="text-sm">
                I provide custom piano backing tracks for musical theatre and pop.
              </p>
            </div>
            
            <div className="border-l-2 border-[#F538BC] pl-3 py-2 my-3">
              <p className="font-bold text-[#1C0357] text-sm">
                ✅ <span className="font-bold">Important: Your sheet music must be clear, correctly cut, and in the right key.</span>
              </p>
            </div>
            
            <p className="mt-2 font-medium text-sm">Before submitting, please make sure to include:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-sm">
              <li>✔️ Your sheet music in PDF format (required)</li>
              <li>✔️ A YouTube link to the song (optional but recommended)</li>
              <li>✔️ A voice memo of you singing the song with accurate rests/beats (optional but helpful)</li>
              <li>✔️ Any additional reference links (optional)</li>
            </ul>
            
            {isAdmin && ( // Conditionally render the button
              <div className="mt-4">
                <Button 
                  type="button" 
                  onClick={fillDummyData}
                  className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white text-sm w-full"
                  size="sm"
                >
                  Fill with Sample Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isSubmittedSuccessfully ? (
          <Card className="shadow-lg mb-6 bg-green-50 border-green-500">
            <CardHeader className="bg-green-100 py-3 px-4">
              <CardTitle className="text-xl text-green-800 flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                Request Submitted Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-center">
              <p className="text-lg text-green-700 mb-4">
                Thank you, {formData.name || user?.user_metadata?.full_name || 'client'}. Your custom track request has been received.
              </p>
              <p className="text-md text-gray-700 mb-6">
                You will receive a copy of your submission via email shortly, and we'll be in touch within 24-48 hours with a quote and estimated delivery date.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  onClick={() => navigate('/user-dashboard')}
                  className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-3"
                >
                  View Your Request Status
                </Button>
                <Button 
                  onClick={() => setIsSubmittedSuccessfully(false)}
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-100 text-lg px-8 py-3"
                >
                  Submit Another Request
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardHeader id="request-form" className="bg-[#1C0357] text-white py-3 px-4"> {/* Retained id for 'Request Form' in case it's needed elsewhere */}
              <CardTitle className="text-lg md:text-xl">Request Form</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Basic Information */}
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                    <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">1</span>
                    Basic Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm mb-1">Name</Label>
                      <div className="relative">
                        <Input 
                          id="name" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleInputChange} 
                          placeholder="Your full name"
                          className="pl-8 py-2 text-sm"
                          disabled={isSubmitting || isHolidayModeActive || !!user} // Disable if logged in
                        />
                        <UserIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      {user && <p className="text-xs text-gray-500 mt-1">(Pre-filled from your account. To change, please update your profile settings.)</p>}
                    </div>
                    <div>
                      <Label htmlFor="email" className="flex items-center text-sm mb-1">
                        Email <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative" ref={formRefs.email}>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={formData.email} 
                          onChange={handleInputChange} 
                          required 
                          placeholder="your.email@example.com (Required for tracking, or sign in to pre-fill)" // Updated placeholder
                          className={cn("pl-8 py-2 text-sm", errors.email && "border-red-500")}
                          disabled={isSubmitting || isHolidayModeActive || !!user} // Disable if logged in
                        />
                        <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    {/* New: Confirm Email Field */}
                    <div>
                      <Label htmlFor="confirmEmail" className="flex items-center text-sm mb-1">
                        Confirm Email <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative" ref={formRefs.confirmEmail}>
                        <Input 
                          id="confirmEmail" 
                          name="confirmEmail" 
                          type="email" 
                          value={formData.confirmEmail} 
                          onChange={handleInputChange} 
                          required 
                          placeholder="Confirm your email address"
                          className={cn("pl-8 py-2 text-sm", errors.confirmEmail && "border-red-500")}
                          disabled={isSubmitting || isHolidayModeActive || !!user} // Disable if logged in
                        />
                        <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      {errors.confirmEmail && <p className="text-red-500 text-xs mt-1">{errors.confirmEmail}</p>}
                    </div>
                    {/* New: Phone Number Field */}
                    <div>
                      <Label htmlFor="phone" className="flex items-center text-sm mb-1">
                        <Phone className="mr-1" size={14} />
                        Phone Number (optional, for critical updates)
                      </Label>
                      <div className="relative">
                        <Input 
                          id="phone" 
                          name="phone" 
                          type="tel" 
                          value={formData.phone} 
                          onChange={handleInputChange} 
                          placeholder="e.g., 0412 345 678"
                          className="pl-8 py-2 text-sm"
                          disabled={isSubmitting || isHolidayModeActive}
                        />
                        <Phone className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="songTitle" className="flex items-center text-sm mb-1">
                        Song Title <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative" ref={formRefs.songTitle}>
                        <Input 
                          id="songTitle" 
                          name="songTitle" 
                          value={formData.songTitle} 
                          onChange={handleInputChange} 
                          required 
                          placeholder="e.g., Defying Gravity"
                          className={cn("pl-8 py-2 text-sm", errors.songTitle && "border-red-500")}
                          disabled={isSubmitting || isHolidayModeActive}
                        />
                        <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      {errors.songTitle && <p className="text-red-500 text-xs mt-1">{errors.songTitle}</p>}
                    </div>
                    <div>
                      <Label htmlFor="musicalOrArtist" className="flex items-center text-sm mb-1">
                        Musical or Artist <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative" ref={formRefs.musicalOrArtist}>
                        <Input 
                          id="musicalOrArtist" 
                          name="musicalOrArtist" 
                          value={formData.musicalOrArtist} 
                          onChange={handleInputChange} 
                          required 
                          placeholder="e.g., Wicked"
                          className={cn("pl-8 py-2 text-sm", errors.musicalOrArtist && "border-red-500")}
                          disabled={isSubmitting || isHolidayModeActive}
                        />
                        <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      {errors.musicalOrArtist && <p className="text-red-500 text-xs mt-1">{errors.musicalOrArtist}</p>}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="category" className="flex items-center text-sm mb-1">
                      Category <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative" ref={formRefs.category}>
                      <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category} disabled={isSubmitting || isHolidayModeActive}>
                        <SelectTrigger className={cn("pl-8 py-2 text-sm", errors.category && "border-red-500")}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category.value} value={category.value} className="text-sm">
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Folder className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  </div>
                </div>

                {/* Section 2: Track Type */}
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                    <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">2</span>
                    Track Type <span className="text-red-500 ml-1">*</span>
                  </h2>
                  
                  <RadioGroup 
                    value={formData.trackType} 
                    onValueChange={(value) => handleSelectChange('trackType', value)}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4" // Changed to grid layout
                    disabled={isSubmitting || isHolidayModeActive}
                    ref={formRefs.trackType}
                  >
                    <Label htmlFor="quick" className="flex flex-col items-center justify-center cursor-pointer">
                      <Card className={cn(
                        "w-full h-full p-4 flex flex-col items-center text-center transition-all duration-200",
                        "hover:border-[#F538BC] hover:shadow-md",
                        formData.trackType === 'quick' ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white",
                        errors.trackType && "border-red-500"
                      )}>
                        <RadioGroupItem value="quick" id="quick" className="sr-only" /> {/* Hidden radio button */}
                        <Mic className={cn("h-8 w-8 mb-2", formData.trackType === 'quick' ? "text-[#F538BC]" : "text-gray-500")} />
                        <span className="font-bold text-sm text-[#1C0357]">Quick Reference</span>
                        <span className="text-[#1C0357] font-bold mt-1 text-xs">$5 - $10</span> {/* BOLDED */}
                        <span className="text-xs mt-1 text-gray-600">Fast voice memo for quick learning</span>
                      </Card>
                    </Label>
                    
                    <Label htmlFor="one-take" className="flex flex-col items-center justify-center cursor-pointer">
                      <Card className={cn(
                        "w-full h-full p-4 flex flex-col items-center text-center transition-all duration-200",
                        "hover:border-[#F538BC] hover:shadow-md",
                        formData.trackType === 'one-take' ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white",
                        errors.trackType && "border-red-500"
                      )}>
                        <RadioGroupItem value="one-take" id="one-take" className="sr-only" />
                        <Headphones className={cn("h-8 w-8 mb-2", formData.trackType === 'one-take' ? "text-[#F538BC]" : "text-gray-500")} />
                        <span className="font-bold text-sm text-[#1C0357]">One-Take Recording</span>
                        <span className="text-[#1C0357] font-bold mt-1 text-xs">$10 - $20</span> {/* BOLDED */}
                        <span className="text-xs mt-1 text-gray-600">Single-pass DAW recording</span>
                      </Card>
                    </Label>
                    
                    <Label htmlFor="polished" className="flex flex-col items-center justify-center cursor-pointer">
                      <Card className={cn(
                        "w-full h-full p-4 flex flex-col items-center text-center transition-all duration-200",
                        "hover:border-[#F538BC] hover:shadow-md",
                        formData.trackType === 'polished' ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white",
                        errors.trackType && "border-red-500"
                      )}>
                        <RadioGroupItem value="polished" id="polished" className="sr-only" />
                        <Sparkles className={cn("h-8 w-8 mb-2", formData.trackType === 'polished' ? "text-[#F538BC]" : "text-gray-500")} />
                        <span className="font-bold text-sm text-[#1C0357]">Polished Backing</span>
                        <span className="text-[#1C0357] font-bold mt-1 text-xs">$15 - $35</span> {/* BOLDED */}
                        <span className="text-xs mt-1 text-gray-600">Refined track for auditions</span>
                      </Card>
                    </Label>
                  </RadioGroup>
                  {errors.trackType && <p className="text-red-500 text-xs mt-1">{errors.trackType}</p>}
                </div>

                {/* Section 3: Musical Details */}
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                    <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">3</span>
                    Musical Details
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="songKey" className="flex items-center text-sm mb-1">
                        What key is the <span className="font-bold ml-1">sheet music you are uploading</span> in? <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative" ref={formRefs.songKey}>
                        <Select onValueChange={(value) => handleSelectChange('songKey', value)} value={formData.songKey} disabled={isSubmitting || isHolidayModeActive}>
                          <SelectTrigger className={cn("pl-8 py-2 text-sm", errors.songKey && "border-red-500")}>
                            <SelectValue placeholder="Select key" />
                          </SelectTrigger>
                          <SelectContent>
                            {keyOptions.map((key) => (
                              <SelectItem key={key.value} value={key.value} className="text-sm">
                                {key.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <KeyIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      {errors.songKey && <p className="text-red-500 text-xs mt-1">{errors.songKey}</p>}
                    </div>
                    
                    <div>
                      <Label htmlFor="differentKey" className="flex items-center text-sm mb-1">
                        Do you require the <span className="font-bold ml-1">final backing track</span> to be in a different key?
                      </Label>
                      <div className="relative">
                        <Select onValueChange={(value) => handleSelectChange('differentKey', value)} value={formData.differentKey} disabled={isSubmitting || isHolidayModeActive}>
                          <SelectTrigger className="pl-8 py-2 text-sm">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No" className="text-sm">No</SelectItem>
                            <SelectItem value="Yes" className="text-sm">Yes</SelectItem>
                            <SelectItem value="Maybe" className="text-sm">Maybe</SelectItem>
                          </SelectContent>
                        </Select>
                        <KeyIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                  </div>
                  
                  {formData.differentKey === 'Yes' && (
                    <div className="mt-4">
                      <Label htmlFor="keyForTrack" className="text-sm mb-1">Which key do you require?</Label>
                      <div className="relative">
                        <Select onValueChange={(value) => handleSelectChange('keyForTrack', value)} value={formData.keyForTrack} disabled={isSubmitting || isHolidayModeActive}>
                          <SelectTrigger className="pl-8 py-2 text-sm">
                            <SelectValue placeholder="Select key" />
                        </SelectTrigger>
                          <SelectContent>
                            {keyOptions.map((key) => (
                              <SelectItem key={key.value} value={key.value} className="text-sm">
                                {key.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <KeyIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 4: Materials */}
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                    <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">4</span>
                    Materials
                  </h2>
                  
                  <div className="space-y-4">
                    {/* Using the new FileInput component */}
                    <div ref={formRefs.sheetMusic}>
                      <FileInput
                        id="sheetMusic"
                        label="Please upload your sheet music as a PDF"
                        icon={FileTextIcon}
                        accept=".pdf"
                        onChange={(file) => handleFileInputChange(file, 'sheetMusic')}
                        required // This 'required' prop is for visual indication, actual validation is in handleSubmit
                        note="Make sure it's clear and in the right key"
                        error={errors.sheetMusic} // Pass error prop
                        disabled={isSubmitting || isHolidayModeActive}
                      />
                    </div>
                    {errors.sheetMusic && <p className="text-red-500 text-xs mt-1">{errors.sheetMusic}</p>}

                    <div>
                      <Label htmlFor="youtubeLink" className="flex items-center text-sm mb-1">
                        <LinkIcon className="mr-1" size={14} />
                        YouTube URL for tempo reference (optional)
                      </Label>
                      <div className="relative">
                        <Input 
                          id="youtubeLink" 
                          name="youtubeLink" 
                          value={formData.youtubeLink} 
                          onChange={handleInputChange} 
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="pl-8 py-2 text-sm"
                          disabled={isSubmitting || isHolidayModeActive}
                        />
                        <Youtube className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="additionalLinks" className="flex items-center text-sm mb-1">
                        <LinkIcon className="mr-1" size={14} />
                        Additional Reference Links (optional)
                      </Label>
                      <div className="relative">
                        <Input 
                          id="additionalLinks" 
                          name="additionalLinks" 
                          value={formData.additionalLinks} 
                          onChange={handleInputChange} 
                          placeholder="e.g., Dropbox link, Spotify link"
                          className="pl-8 py-2 text-sm"
                          disabled={isSubmitting || isHolidayModeActive}
                        />
                        <LinkIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Provide any other relevant links here (e.g., Dropbox, Spotify, etc.)</p>
                    </div>

                    {/* Grouped Voice Memo Options */}
                    <div className="space-y-3 border p-3 rounded-md bg-gray-50">
                      <Label className="flex items-center text-sm mb-1">
                        <MicIcon className="mr-1" size={14} />
                        Voice Memo (Optional - Please Choose One)
                      </Label>
                      <div>
                        <Label htmlFor="voiceMemo" className="text-xs text-gray-600 mb-1">Link to voice memo</Label>
                        <div className="relative">
                          <Input 
                            id="voiceMemo" 
                            name="voiceMemo" 
                            value={formData.voiceMemo} 
                            onChange={handleInputChange} 
                            placeholder="https://example.com/voice-memo.mp3"
                            className="pl-8 py-2 text-sm"
                            disabled={isSubmitting || isHolidayModeActive || !!formData.voiceMemoFile} // Disable if file is selected
                          />
                          <LinkIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                        </div>
                      </div>
                      <p className="text-center text-xs text-gray-500">OR</p>
                      <FileInput
                        id="voiceMemoFile"
                        label="Upload voice memo file"
                        icon={MicIcon}
                        accept="audio/*"
                        onChange={(file) => handleFileInputChange(file, 'voiceMemoFile')}
                        note="Note: Voice memo uploads may not be available at this time"
                        disabled={isSubmitting || isHolidayModeActive || !!formData.voiceMemo} // Disable if link is provided
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Purpose (Now only Backing Type checkboxes) */}
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                    <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">5</span>
                    Backing Type <span className="text-red-500 ml-1">*</span>
                  </h2>
                  
                  <div className="space-y-4" ref={formRefs.backingType}>
                    {/* Multi-select for Backing Type */}
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center text-sm">
                        <MusicIcon className="mr-1" size={14} />
                        What do you need?
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Label htmlFor="backing-full-song" className="flex flex-col items-center justify-center cursor-pointer w-full">
                          <Card className={cn(
                            "w-full h-full p-4 flex items-start transition-all duration-200 rounded-lg",
                            "hover:border-[#F538BC] hover:shadow-md",
                            formData.backingType.includes('full-song') ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white",
                            errors.backingType && "border-red-500"
                          )}>
                            <Checkbox
                              id="backing-full-song"
                              checked={formData.backingType.includes('full-song')}
                              onCheckedChange={(checked) => handleBackingTypeChange('full-song', checked)}
                              className="mt-1 mr-3"
                              disabled={isSubmitting || isHolidayModeActive}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="font-bold text-sm text-[#1C0357]">Full Song Backing</span>
                              <p className="text-xs text-gray-600 mt-1">Complete song accompaniment</p>
                            </div>
                          </Card>
                        </Label>
                        
                        <Label htmlFor="backing-audition-cut" className="flex flex-col items-center justify-center cursor-pointer w-full">
                          <Card className={cn(
                            "w-full h-full p-4 flex items-start transition-all duration-200 rounded-lg",
                            "hover:border-[#F538BC] hover:shadow-md",
                            formData.backingType.includes('audition-cut') ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white",
                            errors.backingType && "border-red-500"
                          )}>
                            <Checkbox
                              id="backing-audition-cut"
                              checked={formData.backingType.includes('audition-cut')}
                              onCheckedChange={(checked) => handleBackingTypeChange('audition-cut', checked)}
                              className="mt-1 mr-3"
                              disabled={isSubmitting || isHolidayModeActive}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="font-bold text-sm text-[#1C0357]">Audition Cut Backing</span>
                              <p className="text-xs text-gray-600 mt-1">Shortened version for auditions</p>
                            </div>
                          </Card>
                        </Label>
                        
                        <Label htmlFor="backing-note-bash" className="flex flex-col items-center justify-center cursor-pointer w-full">
                          <Card className={cn(
                            "w-full h-full p-4 flex items-start transition-all duration-200 rounded-lg",
                            "hover:border-[#F538BC] hover:shadow-md",
                            formData.backingType.includes('note-bash') ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white",
                            errors.backingType && "border-red-500"
                          )}>
                            <Checkbox
                              id="backing-note-bash"
                              checked={formData.backingType.includes('note-bash')}
                              onCheckedChange={(checked) => handleBackingTypeChange('note-bash', checked)}
                              className="mt-1 mr-3"
                              disabled={isSubmitting || isHolidayModeActive}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="font-bold text-sm text-[#1C0357]">Note/Melody Bash</span>
                              <p className="text-xs text-gray-600 mt-1">Focus on specific melodic lines</p>
                            </div>
                          </Card>
                        </Label>
                      </div>
                      {errors.backingType && <p className="text-red-500 text-xs mt-1">{errors.backingType}</p>}
                    </div>
                  </div>
                </div>

                {/* Section 6: Additional Services & Timeline */}
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                    <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">6</span>
                    Additional Services & Timeline
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="deliveryDate" className="flex items-center text-sm mb-1">
                        <CalendarIcon className="mr-1" size={14} />
                        When do you need your track by?
                      </Label>
                      <div className="relative">
                        <Input 
                          id="deliveryDate" 
                          name="deliveryDate" 
                          type="date" 
                          value={formData.deliveryDate} 
                          onChange={handleInputChange} 
                          className="pl-8 py-2 text-sm w-full"
                          disabled={isSubmitting || isHolidayModeActive}
                        />
                        <CalendarIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center text-sm">
                        <MusicIcon className="mr-1" size={14} />
                        Additional Services
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Added grid layout */}
                        <Label htmlFor="rush-order" className="flex flex-col items-center justify-center cursor-pointer w-full">
                          <div className={cn(
                            "w-full p-4 flex items-start transition-all duration-200 rounded-lg",
                            "hover:border-[#F538BC] hover:shadow-md",
                            formData.additionalServices.includes('rush-order') ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white"
                          )}>
                            <Checkbox
                              id="rush-order"
                              checked={formData.additionalServices.includes('rush-order')}
                              onCheckedChange={(checked) => handleCheckboxChange('rush-order')}
                              className="mt-1 mr-3"
                              disabled={isSubmitting || isHolidayModeActive}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="font-bold text-sm text-[#1C0357]">Rush Order</span>
                              <span className="text-xs text-[#1C0357] font-medium">+$10</span>
                              <p className="text-xs text-gray-600 mt-1">24-hour turnaround</p>
                            </div>
                          </div>
                        </Label>
                        
                        <Label htmlFor="complex-songs" className="flex flex-col items-center justify-center cursor-pointer w-full">
                          <div className={cn(
                            "w-full p-4 flex items-start transition-all duration-200 rounded-lg",
                            "hover:border-[#F538BC] hover:shadow-md",
                            formData.additionalServices.includes('complex-songs') ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white"
                          )}>
                            <Checkbox
                              id="complex-songs"
                              checked={formData.additionalServices.includes('complex-songs')}
                              onCheckedChange={(checked) => handleCheckboxChange('complex-songs')}
                              className="mt-1 mr-3"
                              disabled={isSubmitting || isHolidayModeActive}
                            />
                            <div className="flex flex-col flex-1">
                              <Label htmlFor="complex-songs" className="font-bold text-sm text-[#1C0357] cursor-pointer">
                                Complex Songs
                              </Label>
                              <span className="text-xs text-[#1C0357] font-medium">+$7</span>
                              <p className="text-xs text-gray-600 mt-1">Sondheim, JRB, Guettel</p>
                            </div>
                          </div>
                        </Label>
                        
                        <Label htmlFor="additional-edits" className="flex flex-col items-center justify-center cursor-pointer w-full">
                          <div className={cn(
                            "w-full p-4 flex items-start transition-all duration-200 rounded-lg",
                            "hover:border-[#F538BC] hover:shadow-md",
                            formData.additionalServices.includes('additional-edits') ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white"
                          )}>
                            <Checkbox
                              id="additional-edits"
                              checked={formData.additionalServices.includes('additional-edits')}
                              onCheckedChange={(checked) => handleCheckboxChange('additional-edits')}
                              className="mt-1 mr-3"
                              disabled={isSubmitting || isHolidayModeActive}
                            />
                            <div className="flex flex-col flex-1">
                              <Label htmlFor="additional-edits" className="font-bold text-sm text-[#1C0357] cursor-pointer">
                                Additional Edits
                              </Label>
                              <span className="text-xs text-[#1C0357] font-medium">+$5</span>
                              <p className="text-xs text-gray-600 mt-1">After completion</p>
                            </div>
                          </div>
                        </Label>
                        
                        <Label htmlFor="exclusive-ownership" className="flex flex-col items-center justify-center cursor-pointer w-full">
                          <div className={cn(
                            "w-full p-4 flex items-start transition-all duration-200 rounded-lg",
                            "hover:border-[#F538BC] hover:shadow-md",
                            formData.additionalServices.includes('exclusive-ownership') ? "border-2 border-[#F538BC] shadow-lg bg-[#F538BC]/10" : "border border-gray-200 bg-white"
                          )}>
                            <Checkbox
                              id="exclusive-ownership"
                              checked={formData.additionalServices.includes('exclusive-ownership')}
                              onCheckedChange={(checked) => handleCheckboxChange('exclusive-ownership')}
                              className="mt-1 mr-3"
                              disabled={isSubmitting || isHolidayModeActive}
                            />
                            <div className="flex flex-col flex-1">
                              <Label htmlFor="exclusive-ownership" className="font-bold text-sm text-[#1C0357] cursor-pointer">
                                Exclusive Ownership
                              </Label>
                              <span className="text-xs text-[#1C0357] font-medium">+$40</span>
                              <p className="text-xs text-gray-600 mt-1">Prevent online sharing</p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="specialRequests" className="text-sm mb-1 flex items-center">
                        <MessageSquare className="mr-1" size={14} />
                        Special Requests / Notes
                      </Label>
                      <Textarea
                        id="specialRequests"
                        name="specialRequests"
                        value={formData.specialRequests}
                        onChange={handleInputChange}
                        placeholder="Any special requests or notes..."
                        className="mt-1"
                        disabled={isSubmitting || isHolidayModeActive}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 7: Consent */}
                <div className="pb-4">
                  <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                    <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">7</span>
                    Consent
                  </h2>
                  <div className={cn(
                    "flex items-start space-x-2 p-4 border rounded-md bg-gray-50",
                    errors.consent && "border-red-500 bg-red-50"
                  )} ref={formRefs.consent}>
                    <Checkbox
                      id="consent-checkbox"
                      checked={consentChecked}
                      onCheckedChange={(checked) => {
                        setConsentChecked(checked as boolean);
                        setErrors(prev => ({ ...prev, consent: '' })); // Clear error on change
                      }}
                      className="mt-1"
                      disabled={isSubmitting || isHolidayModeActive}
                    />
                    <Label htmlFor="consent-checkbox" className="text-sm leading-relaxed cursor-pointer">
                      I understand that to keep costs low and tracks accessible, Piano Backings by Daniele may sell this track to other artists and/or upload it to public platforms like YouTube, <span className="font-bold">unless I purchase the 'Exclusive Ownership' option in Section 6.</span>
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                  </div>
                  {errors.consent && <p className="text-red-500 text-xs mt-1">{errors.consent}</p>}
                </div>

                {/* Quote/Payment Explanation */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800 mb-6">
                  <p className="font-semibold mb-2">Important: Request for Quote</p>
                  <p>
                    Submitting this form sends your details to Daniele to generate an accurate quote. 
                    You will be contacted via email with the final price and a secure link to make your payment before any work begins.
                  </p>
                </div>

                {/* Tip above submit button */}
                {!user && (
                  <p className="text-sm text-gray-600 mb-4 text-center">
                    <span className="font-semibold">Tip:</span> Submitting while logged in allows you to track this order's status and download links permanently in your <Link to="/user-dashboard" className="text-[#1C0357] hover:underline font-bold">My Tracks</Link> dashboard.
                  </p>
                )}

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || isHolidayModeActive || !consentChecked || (!user && showAccountPrompt)} // Disable if prompt is visible and not logged in
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90 px-8"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default FormPage;
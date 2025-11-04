import { useState, useEffect } from 'react';
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
  Music as MusicIcon, // Renamed to avoid conflict with Music in lucide-react
  Key as KeyIcon, // Renamed to avoid conflict with Key in lucide-react
  Calendar as CalendarIcon, // Renamed to avoid conflict with Calendar in lucide-react
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
  Plane // Added Plane icon for holiday mode
} from "lucide-react"; // Removed MicIcon, FileTextIcon
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils"; // Import cn for conditional classNames
import FileInput from "@/components/FileInput"; // Import the new FileInput component
import AccountPromptCard from '@/components/AccountPromptCard'; // Import the new AccountPromptCard
import { useHolidayMode } from '@/hooks/useHolidayMode'; // Import useHolidayMode
import { format } from 'date-fns';

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false); // State to control visibility of the new card
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false); // New state for admin status
  const [incompleteTracksCount, setIncompleteTracksCount] = useState<number | null>(null);
  const [loadingTrackCount, setLoadingTrackCount] = useState(true);
  const { isHolidayModeActive, holidayReturnDate, isLoading: isLoadingHolidayMode } = useHolidayMode(); // Use the hook

  const [formData, setFormData] = useState({
    email: '',
    name: '',
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
    trackPurpose: '',
    backingType: [] as string[], // Changed to array for multi-select
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
    category: '',
    trackType: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({}); // State for validation errors

  // Check user session on component mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || ''
        }));
        // Check if user is admin
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        setIsAdmin(adminEmails.includes(session.user!.email!)); // Added non-null assertion
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

  const handleCheckboxChange = (_checked: boolean | 'indeterminate', service: string) => { // Adjusted type for _checked
    setFormData(prev => {
      const newServices = prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service];
      return { ...prev, additionalServices: newServices };
    });
  };

  // New handler for multi-select backing types
  const handleBackingTypeChange = (type: string, _checked: boolean | 'indeterminate') => { // Renamed 'checked' to '_checked'
    setFormData(prev => {
      const newBackingTypes = _checked
        ? [...prev.backingType, type]
        : prev.backingType.filter(t => t !== type);
      setErrors(prevErrors => ({ ...prevErrors, backingType: '' })); // Clear error on change
      return { ...prev, backingType: newBackingTypes };
    });
  };

  const fillDummyData = () => {
    setFormData({
      email: user?.email || 'test@example.com',
      name: user?.user_metadata?.full_name || 'Test User',
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
      trackPurpose: 'personal-practise',
      backingType: ['full-song', 'audition-cut'], // Dummy multi-select
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      additionalServices: ['rush-order'],
      specialRequests: 'Please make sure the tempo matches the reference exactly.',
      category: 'Practice Tracks',
      trackType: 'polished'
    });
    setErrors({}); // Clear any existing errors
    
    toast({
      title: "Sample Data Filled",
      description: "The form has been pre-filled with sample data.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isHolidayModeActive) {
      toast({
        title: "Holiday Mode Active",
        description: "New requests cannot be submitted while on holiday. Please check back later.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const newErrors: Record<string, string> = {};

    // Client-side validation
    if (!formData.email) newErrors.email = 'Email is required.';
    if (!formData.songTitle) newErrors.songTitle = 'Song Title is required.';
    if (!formData.musicalOrArtist) newErrors.musicalOrArtist = 'Musical or Artist is required.';
    if (!formData.category) newErrors.category = 'Category is required.';
    if (!formData.trackType) newErrors.trackType = 'Track Type is required.';
    if (formData.backingType.length === 0) newErrors.backingType = 'At least one backing type is required.';
    if (!formData.sheetMusic) newErrors.sheetMusic = 'Sheet music is required. Please upload a PDF file.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Upload sheet music if provided
      let sheetMusicUrl = null;
      if (formData.sheetMusic) {
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
            console.error('Storage upload error:', uploadError);
            throw new Error(`File upload error: ${uploadError.message}`);
          }
          
          // Get public URL for the uploaded file
          const { data: { publicUrl } } = supabase
            .storage
            .from('sheet-music')
            .getPublicUrl(fileName);
          
          sheetMusicUrl = publicUrl;
        } catch (uploadError: any) {
          console.error('File upload error:', uploadError);
          toast({
            title: "Warning",
            description: `Sheet music upload failed: ${uploadError.message}. Request will still be submitted.`,
            variant: "destructive",
          });
        }
      }
      
      // Upload voice memo file if provided
      let voiceMemoFileUrl = null;
      if (formData.voiceMemoFile) {
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
          }
        } catch (uploadError: any) {
          console.error('Voice memo upload error:', uploadError);
          toast({
            title: "Warning",
            description: `Voice memo upload failed: ${uploadError.message}. Request will still be submitted.`,
            variant: "destructive",
          });
        }
      }
      
      // Prepare form data for submission
      const submissionData = {
        formData: {
          email: formData.email,
          name: formData.name,
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
          trackPurpose: formData.trackPurpose,
          backingType: formData.backingType, // Now an array
          deliveryDate: formData.deliveryDate,
          additionalServices: formData.additionalServices,
          specialRequests: formData.specialRequests,
          category: formData.category,
          trackType: formData.trackType
        }
      };
      
      // Prepare headers - Include Authorization header with anon key for public Edge Functions
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // If a user is logged in, use their access token. Otherwise, use the anon key.
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${SUPABASE_PUBLISHABLE_KEY}`;
      }
      
      // Submit to Supabase function
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(submissionData),
        }
      );
      
      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Invalid response from server: ${responseText}`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to submit form: ${response.status} ${response.statusText}`);
      }
      
      toast({
        title: "Request Submitted!",
        description: "Your backing track request has been submitted successfully.",
      });
      
      // Clear form
      setFormData({
        email: user?.email || '',
        name: user?.user_metadata?.full_name || '',
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
        trackPurpose: '',
        backingType: [], // Clear as array
        deliveryDate: '',
        additionalServices: [],
        specialRequests: '',
        category: '',
        trackType: ''
      });
      setErrors({}); // Clear any existing errors
      
      // Show account prompt if user is not logged in
      if (!session) {
        setShowAccountPrompt(true);
      } else {
        // Redirect to user dashboard
        navigate('/user-dashboard');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: `There was a problem submitting your request: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
          <AccountPromptCard onDismiss={handleDismissAccountPrompt} />
        )}

        <Card className="shadow-lg mb-6">
          <CardHeader id="request-guidelines" className="bg-[#D1AAF2]/20 py-3 px-4"> {/* Added id here */}
            <CardTitle className="text-lg md:text-xl text-[#1C0357] flex items-center">
              <MusicIcon className="mr-2" size={16} />
              Request Guidelines
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
                ✅ Important: Your sheet music must be clear, correctly cut, and in the right key.
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
                        disabled={isHolidayModeActive}
                      />
                      <UserIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="flex items-center text-sm mb-1">
                      Email <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="your.email@example.com"
                        className={cn("pl-8 py-2 text-sm", errors.email && "border-red-500")}
                        disabled={isHolidayModeActive}
                      />
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="songTitle" className="flex items-center text-sm mb-1">
                      Song Title <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input 
                        id="songTitle" 
                        name="songTitle" 
                        value={formData.songTitle} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="e.g., Defying Gravity"
                        className={cn("pl-8 py-2 text-sm", errors.songTitle && "border-red-500")}
                        disabled={isHolidayModeActive}
                      />
                      <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                    {errors.songTitle && <p className="text-red-500 text-xs mt-1">{errors.songTitle}</p>}
                  </div>
                  <div>
                    <Label htmlFor="musicalOrArtist" className="flex items-center text-sm mb-1">
                      Musical or Artist <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input 
                        id="musicalOrArtist" 
                        name="musicalOrArtist" 
                        value={formData.musicalOrArtist} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="e.g., Wicked"
                        className={cn("pl-8 py-2 text-sm", errors.musicalOrArtist && "border-red-500")}
                        disabled={isHolidayModeActive}
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
                  <div className="relative">
                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category} disabled={isHolidayModeActive}>
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
                  disabled={isHolidayModeActive}
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
                      <span className="text-[#1C0357] font-medium mt-1 text-xs">$5 - $10</span>
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
                      <span className="text-[#1C0357] font-medium mt-1 text-xs">$10 - $20</span>
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
                      <span className="text-[#1C0357] font-medium mt-1 text-xs">$20 - $40</span>
                      <span className="text-xs mt-1 text-gray-600">Refined, accurate track for performance</span>
                    </Card>
                  </Label>
                </RadioGroup>
                {errors.trackType && <p className="text-red-500 text-xs mt-1">{errors.trackType}</p>}
              </div>

              {/* Section 3: Song Details */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">3</span>
                  Song Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="songKey" className="text-sm mb-1">Original Song Key</Label>
                    <div className="relative">
                      <Select onValueChange={(value) => handleSelectChange('songKey', value)} value={formData.songKey} disabled={isHolidayModeActive}>
                        <SelectTrigger className="pl-8 py-2 text-sm">
                          <SelectValue placeholder="Select original key" />
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
                  
                  <div>
                    <Label htmlFor="differentKey" className="text-sm mb-1">Do you need the track in a different key?</Label>
                    <RadioGroup 
                      value={formData.differentKey} 
                      onValueChange={(value) => handleSelectChange('differentKey', value)}
                      className="flex space-x-4 mt-2"
                      disabled={isHolidayModeActive}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Yes" id="diff-key-yes" />
                        <Label htmlFor="diff-key-yes" className="text-sm">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="No" id="diff-key-no" />
                        <Label htmlFor="diff-key-no" className="text-sm">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {formData.differentKey === 'Yes' && (
                    <div>
                      <Label htmlFor="keyForTrack" className="text-sm mb-1">Key for Track</Label>
                      <div className="relative">
                        <Select onValueChange={(value) => handleSelectChange('keyForTrack', value)} value={formData.keyForTrack} disabled={isHolidayModeActive}>
                          <SelectTrigger className="pl-8 py-2 text-sm">
                            <SelectValue placeholder="Select desired key" />
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
              </div>

              {/* Section 4: Reference Materials */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">4</span>
                  Reference Materials
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sheetMusic" className="flex items-center text-sm mb-1">
                      Sheet Music (PDF) <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <FileInput 
                      id="sheetMusic"
                      // name="sheetMusic" // Removed name prop as it's not part of FileInputProps
                      accept=".pdf"
                      onFileChange={(file: File | null) => handleFileInputChange(file, 'sheetMusic')} // Explicitly typed file
                      currentFile={formData.sheetMusic}
                      disabled={isHolidayModeActive}
                      error={errors.sheetMusic}
                    />
                    {errors.sheetMusic && <p className="text-red-500 text-xs mt-1">{errors.sheetMusic}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="youtubeLink" className="text-sm mb-1">YouTube Link (Optional)</Label>
                    <div className="relative">
                      <Input 
                        id="youtubeLink" 
                        name="youtubeLink" 
                        value={formData.youtubeLink} 
                        onChange={handleInputChange} 
                        placeholder="e.g., https://www.youtube.com/watch?v=..."
                        className="pl-8 py-2 text-sm"
                        disabled={isHolidayModeActive}
                      />
                      <Youtube className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="voiceMemoFile" className="text-sm mb-1">Voice Memo (Optional)</Label>
                    <FileInput 
                      id="voiceMemoFile"
                      // name="voiceMemoFile" // Removed name prop as it's not part of FileInputProps
                      accept="audio/*"
                      onFileChange={(file: File | null) => handleFileInputChange(file, 'voiceMemoFile')} // Explicitly typed file
                      currentFile={formData.voiceMemoFile}
                      disabled={isHolidayModeActive}
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload a voice memo of you singing the song with accurate rests/beats.</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="additionalLinks" className="text-sm mb-1">Additional Reference Links (Optional)</Label>
                    <div className="relative">
                      <Input 
                        id="additionalLinks" 
                        name="additionalLinks" 
                        value={formData.additionalLinks} 
                        onChange={handleInputChange} 
                        placeholder="e.g., Spotify link, another YouTube video"
                        className="pl-8 py-2 text-sm"
                        disabled={isHolidayModeActive}
                      />
                      <LinkIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Track Purpose & Backing Type */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">5</span>
                  Track Purpose & Backing Type <span className="text-red-500 ml-1">*</span>
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="trackPurpose" className="text-sm mb-1">What is the track for?</Label>
                    <div className="relative">
                      <Select onValueChange={(value) => handleSelectChange('trackPurpose', value)} value={formData.trackPurpose} disabled={isHolidayModeActive}>
                        <SelectTrigger className="pl-8 py-2 text-sm">
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="audition" className="text-sm">Audition</SelectItem>
                          <SelectItem value="performance" className="text-sm">Performance</SelectItem>
                          <SelectItem value="personal-practise" className="text-sm">Personal Practise</SelectItem>
                          <SelectItem value="other" className="text-sm">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Target className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center text-sm mb-1">
                      Backing Type <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", errors.backingType && "border-red-500 p-2 rounded-md border")}>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="full-song" 
                          checked={formData.backingType.includes('full-song')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleBackingTypeChange('full-song', _checked)} // Explicitly typed _checked
                          disabled={isHolidayModeActive}
                        />
                        <Label htmlFor="full-song" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Full Song
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="16-bar-cut" 
                          checked={formData.backingType.includes('16-bar-cut')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleBackingTypeChange('16-bar-cut', _checked)} // Explicitly typed _checked
                          disabled={isHolidayModeActive}
                        />
                        <Label htmlFor="16-bar-cut" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          16 Bar Cut
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="32-bar-cut" 
                          checked={formData.backingType.includes('32-bar-cut')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleBackingTypeChange('32-bar-cut', _checked)} // Explicitly typed _checked
                          disabled={isHolidayModeActive}
                        />
                        <Label htmlFor="32-bar-cut" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          32 Bar Cut
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="audition-cut" 
                          checked={formData.backingType.includes('audition-cut')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleBackingTypeChange('audition-cut', _checked)} // Explicitly typed _checked
                          disabled={isHolidayModeActive}
                        />
                        <Label htmlFor="audition-cut" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Audition Cut (specify in special requests)
                        </Label>
                      </div>
                    </div>
                    {errors.backingType && <p className="text-red-500 text-xs mt-1">{errors.backingType}</p>}
                  </div>
                </div>
              </div>

              {/* Section 6: Delivery & Additional Services */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">6</span>
                  Delivery & Additional Services
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deliveryDate" className="text-sm mb-1">Desired Delivery Date (Optional)</Label>
                    <div className="relative">
                      <Input 
                        id="deliveryDate" 
                        name="deliveryDate" 
                        type="date" 
                        value={formData.deliveryDate} 
                        onChange={handleInputChange} 
                        className="pl-8 py-2 text-sm"
                        disabled={isHolidayModeActive}
                      />
                      <CalendarIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm mb-1">Additional Services (Optional)</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="rush-order" 
                          checked={formData.additionalServices.includes('rush-order')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleCheckboxChange(_checked, 'rush-order')}
                          className="mt-1 mr-3"
                          disabled={isHolidayModeActive}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="rush-order" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Rush Order (+$10)
                          </Label>
                          <p className="text-sm text-gray-500">
                            Guaranteed delivery within 48 hours.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="complex-songs" 
                          checked={formData.additionalServices.includes('complex-songs')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleCheckboxChange(_checked, 'complex-songs')}
                          className="mt-1 mr-3"
                          disabled={isHolidayModeActive}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="complex-songs" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Complex Songs (+$5)
                          </Label>
                          <p className="text-sm text-gray-500">
                            For songs by Stephen Sondheim, Jason Robert Brown, Adam Guettel, etc.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="additional-edits" 
                          checked={formData.additionalServices.includes('additional-edits')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleCheckboxChange(_checked, 'additional-edits')}
                          className="mt-1 mr-3"
                          disabled={isHolidayModeActive}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="additional-edits" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Additional Edits (+$5 per edit)
                          </Label>
                          <p className="text-sm text-gray-500">
                            Beyond initial revisions (e.g., key changes after completion).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="exclusive-ownership" 
                          checked={formData.additionalServices.includes('exclusive-ownership')}
                          onCheckedChange={(_checked: boolean | 'indeterminate') => handleCheckboxChange(_checked, 'exclusive-ownership')}
                          className="mt-1 mr-3"
                          disabled={isHolidayModeActive}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="exclusive-ownership" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Exclusive Ownership (+$20)
                          </Label>
                          <p className="text-sm text-gray-500">
                            I will not use your track for my own promotional purposes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 7: Special Requests */}
              <div>
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">7</span>
                  Special Requests (Optional)
                </h2>
                <div className="relative">
                  <Textarea 
                    id="specialRequests" 
                    name="specialRequests" 
                    value={formData.specialRequests} 
                    onChange={handleInputChange} 
                    placeholder="Any specific instructions, tempo, dynamics, or cuts for your track?"
                    rows={4}
                    className="pl-8 py-2 text-sm"
                    disabled={isHolidayModeActive}
                  />
                  <MessageSquare className="absolute left-2 top-3 text-gray-400" size={14} />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg py-3"
                disabled={isSubmitting || isHolidayModeActive}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default FormPage;
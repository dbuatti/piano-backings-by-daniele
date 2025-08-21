import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Chrome
} from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    trackPurpose: '',
    backingType: '',
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
    category: '',
    trackType: ''
  });

  // Check user session on component mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || ''
        }));
      } else {
        setShowAccountPrompt(true);
      }
    };
    checkUser();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, [fieldName]: e.target.files![0] }));
    }
  };

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => {
      const newServices = prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service];
      return { ...prev, additionalServices: newServices };
    });
  };

  const fillDummyData = () => {
    setFormData({
      email: user?.email || 'test@example.com',
      name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Test User',
      songTitle: 'Defying Gravity',
      musicalOrArtist: 'Wicked',
      songKey: 'C Major (0)',
      differentKey: 'No',
      keyForTrack: '',
      voiceMemo: '',
      voiceMemoFile: null,
      sheetMusic: null,
      youtubeLink: 'https://www.youtube.com/watch?v=bIZNxHMDpjY',
      trackPurpose: 'personal-practise',
      backingType: 'full-song',
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      additionalServices: ['rush-order'],
      specialRequests: 'Please make sure the tempo matches the YouTube reference exactly.',
      category: 'Practice Tracks',
      trackType: 'polished'
    });
    
    toast({
      title: "Sample Data Filled",
      description: "The form has been pre-filled with sample data.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
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
            throw new Error(`Voice memo upload error: ${uploadError.message}`);
          }
          
          // Get public URL for the uploaded file
          const { data: { publicUrl } } = supabase
            .storage
            .from('voice-memos')
            .getPublicUrl(fileName);
          
          voiceMemoFileUrl = publicUrl;
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
          voiceMemo: formData.voiceMemo,
          voiceMemoFileUrl: voiceMemoFileUrl,
          sheetMusicUrl: sheetMusicUrl,
          trackPurpose: formData.trackPurpose,
          backingType: formData.backingType,
          deliveryDate: formData.deliveryDate,
          additionalServices: formData.additionalServices,
          specialRequests: formData.specialRequests,
          category: formData.category,
          trackType: formData.trackType
        }
      };
      
      console.log('Submitting form data:', submissionData);
      
      // Submit to Supabase function
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify(submissionData),
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
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
      
      console.log('Form submission result:', result);
      
      toast({
        title: "Request Submitted!",
        description: "Your backing track request has been submitted successfully.",
      });
      
      // Clear form
      setFormData({
        email: user?.email || '',
        name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        songTitle: '',
        musicalOrArtist: '',
        songKey: '',
        differentKey: 'No',
        keyForTrack: '',
        voiceMemo: '',
        voiceMemoFile: null,
        sheetMusic: null,
        youtubeLink: '',
        trackPurpose: '',
        backingType: '',
        deliveryDate: '',
        additionalServices: [],
        specialRequests: '',
        category: '',
        trackType: ''
      });
      
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

  const createAccount = () => {
    navigate('/login');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />

      <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Piano Backings Request</h1>
          <p className="text-base md:text-xl font-light text-[#1C0357]/90">Submit Your Custom Track Request</p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 rounded">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
            <div>
              <p className="font-bold text-[#1C0357] text-sm">
                ⚠️ Important: 2-3 week wait on backing tracks. Rush fee available.
              </p>
            </div>
          </div>
        </div>

        {showAccountPrompt && (
          <Card className="shadow-lg mb-4 bg-[#1C0357] text-white border-[#1C0357]">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-between gap-3">
                <div className="text-center">
                  <h3 className="text-lg font-bold flex items-center justify-center">
                    <UserIcon className="mr-2" size={16} /> Create an Account
                  </h3>
                  <p className="mt-1 text-sm">
                    Save your request and access all your tracks in one place!
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2">
                  <Button 
                    onClick={createAccount}
                    className="bg-white text-[#1C0357] hover:bg-gray-100 text-sm w-full flex items-center justify-center"
                    size="sm"
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Sign in with Google
                  </Button>
                  <p className="text-xs text-center">or</p>
                  <Button 
                    onClick={createAccount}
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 text-sm w-full"
                    size="sm"
                  >
                    Sign in with Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20 py-3 px-4">
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
              <li>✔️ A YouTube link to the song (for tempo reference) (required)</li>
              <li>✔️ A voice memo of you singing the song with accurate rests/beats (optional but helpful)</li>
            </ul>
            
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
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-[#1C0357] text-white py-3 px-4">
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
                    <Label htmlFor="email" className="flex items-center text-sm">
                      Email <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="your.email@example.com"
                        className="pl-8 py-2 text-sm"
                      />
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-sm">Name</Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        placeholder="Your full name"
                        className="pl-8 py-2 text-sm"
                      />
                      <UserIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="songTitle" className="flex items-center text-sm">
                      Song Title <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="songTitle" 
                        name="songTitle" 
                        value={formData.songTitle} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="e.g., Defying Gravity"
                        className="pl-8 py-2 text-sm"
                      />
                      <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="musicalOrArtist" className="flex items-center text-sm">
                      Musical or Artist <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="musicalOrArtist" 
                        name="musicalOrArtist" 
                        value={formData.musicalOrArtist} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="e.g., Wicked"
                        className="pl-8 py-2 text-sm"
                      />
                      <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="category" className="flex items-center text-sm">
                    Category <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="mt-1 relative">
                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                      <SelectTrigger className="pl-8 py-2 text-sm">
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
                </div>
              </div>

              {/* Section 2: Track Type */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">2</span>
                  Track Type
                </h2>
                
                <div className="space-y-3">
                  <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="quick-reference"
                        name="trackType"
                        value="quick"
                        className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'quick'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="quick-reference" className="flex flex-col">
                        <span className="font-bold text-sm">Quick Reference (Voice Memo)</span>
                        <span className="text-[#1C0357] font-medium mt-1 text-xs">$5 - $10</span>
                        <span className="text-xs mt-1 text-gray-600">Fast voice memo for quick learning</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="one-take"
                        name="trackType"
                        value="one-take"
                        className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'one-take'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="one-take" className="flex flex-col">
                        <span className="font-bold text-sm">One-Take Recording</span>
                        <span className="text-[#1C0357] font-medium mt-1 text-xs">$10 - $20</span>
                        <span className="text-xs mt-1 text-gray-600">Single-pass DAW recording</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="polished"
                        name="trackType"
                        value="polished"
                        className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'polished'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="polished" className="flex flex-col">
                        <span className="font-bold text-sm">Polished & Accurate Backing</span>
                        <span className="text-[#1C0357] font-medium mt-1 text-xs">$15 - $35</span>
                        <span className="text-xs mt-1 text-gray-600">Refined track for auditions</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Musical Details */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">3</span>
                  Musical Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="songKey" className="text-sm">What key is your song in?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('songKey', value)} value={formData.songKey}>
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
                  
                  <div>
                    <Label htmlFor="differentKey" className="text-sm">Do you require it in a different key?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('differentKey', value)} value={formData.differentKey}>
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
                    <Label htmlFor="keyForTrack" className="text-sm">Which key?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('keyForTrack', value)} value={formData.keyForTrack}>
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

              {/* Section 4: Track Details */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">4</span>
                  Track Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="youtubeLink" className="flex items-center text-sm">
                      <LinkIcon className="mr-1" size={14} />
                      YouTube URL for tempo reference <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="youtubeLink" 
                        name="youtubeLink" 
                        value={formData.youtubeLink} 
                        onChange={handleInputChange} 
                        placeholder="https://www.youtube.com/watch?v=..."
                        required
                        className="pl-8 py-2 text-sm"
                      />
                      <Youtube className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center text-sm">
                      <MicIcon className="mr-1" size={14} />
                      Voice Memo (optional)
                    </Label>
                    <div className="space-y-3 mt-1">
                      <div>
                        <Label htmlFor="voiceMemo" className="text-xs text-gray-600">Link to voice memo</Label>
                        <div className="mt-1 relative">
                          <Input 
                            id="voiceMemo" 
                            name="voiceMemo" 
                            value={formData.voiceMemo} 
                            onChange={handleInputChange} 
                            placeholder="https://example.com/voice-memo.mp3"
                            className="pl-8 py-2 text-sm"
                          />
                          <LinkIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="voiceMemoFile" className="text-xs text-gray-600">Upload voice memo file</Label>
                        <div className="mt-1">
                          <Input 
                            id="voiceMemoFile" 
                            name="voiceMemoFile" 
                            type="file" 
                            accept="audio/*" 
                            onChange={(e) => handleFileChange(e, 'voiceMemoFile')} 
                            className="py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">You can provide either a link or upload a file</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="sheetMusic" className="flex items-center text-sm">
                      <FileTextIcon className="mr-1" size={14} />
                      Please upload your sheet music as a PDF <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="sheetMusic" 
                        name="sheetMusic" 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => handleFileChange(e, 'sheetMusic')} 
                        required 
                        className="pl-8 py-1 text-sm"
                      />
                      <FileTextIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Make sure it's clear and in the right key</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="trackPurpose" className="text-sm">This track is for...</Label>
                      <div className="mt-1 relative">
                        <Select onValueChange={(value) => handleSelectChange('trackPurpose', value)} value={formData.trackPurpose}>
                          <SelectTrigger className="pl-8 py-2 text-sm">
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personal-practise" className="text-sm">Personal Practise</SelectItem>
                            <SelectItem value="audition-backing" className="text-sm">Audition Backing Track</SelectItem>
                            <SelectItem value="melody-bash" className="text-sm">Note/melody bash</SelectItem>
                          </SelectContent>
                        </Select>
                        <Target className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="backingType" className="text-sm">What do you need?</Label>
                      <div className="mt-1 relative">
                        <Select onValueChange={(value) => handleSelectChange('backingType', value)} value={formData.backingType}>
                          <SelectTrigger className="pl-8 py-2 text-sm">
                            <SelectValue placeholder="Select backing type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-song" className="text-sm">Full song backing</SelectItem>
                            <SelectItem value="audition-cut" className="text-sm">Audition cut backing</SelectItem>
                            <SelectItem value="note-bash" className="text-sm">Note/melody bash</SelectItem>
                          </SelectContent>
                        </Select>
                        <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Additional Services */}
              <div className="border-b border-gray-2<|im_start|>
<|im_start|>
I'll continue implementing Google login capabilities for users. Let me complete the remaining changes.

<dyad-write path="src/pages/FormPage.tsx" description="Completing FormPage with Google login support">
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Chrome
} from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const FormPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    trackPurpose: '',
    backingType: '',
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
    category: '',
    trackType: ''
  });

  // Check user session on component mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || ''
        }));
      } else {
        setShowAccountPrompt(true);
      }
    };
    checkUser();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, [fieldName]: e.target.files![0] }));
    }
  };

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => {
      const newServices = prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service];
      return { ...prev, additionalServices: newServices };
    });
  };

  const fillDummyData = () => {
    setFormData({
      email: user?.email || 'test@example.com',
      name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Test User',
      songTitle: 'Defying Gravity',
      musicalOrArtist: 'Wicked',
      songKey: 'C Major (0)',
      differentKey: 'No',
      keyForTrack: '',
      voiceMemo: '',
      voiceMemoFile: null,
      sheetMusic: null,
      youtubeLink: 'https://www.youtube.com/watch?v=bIZNxHMDpjY',
      trackPurpose: 'personal-practise',
      backingType: 'full-song',
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      additionalServices: ['rush-order'],
      specialRequests: 'Please make sure the tempo matches the YouTube reference exactly.',
      category: 'Practice Tracks',
      trackType: 'polished'
    });
    
    toast({
      title: "Sample Data Filled",
      description: "The form has been pre-filled with sample data.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
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
            throw new Error(`Voice memo upload error: ${uploadError.message}`);
          }
          
          // Get public URL for the uploaded file
          const { data: { publicUrl } } = supabase
            .storage
            .from('voice-memos')
            .getPublicUrl(fileName);
          
          voiceMemoFileUrl = publicUrl;
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
          voiceMemo: formData.voiceMemo,
          voiceMemoFileUrl: voiceMemoFileUrl,
          sheetMusicUrl: sheetMusicUrl,
          trackPurpose: formData.trackPurpose,
          backingType: formData.backingType,
          deliveryDate: formData.deliveryDate,
          additionalServices: formData.additionalServices,
          specialRequests: formData.specialRequests,
          category: formData.category,
          trackType: formData.trackType
        }
      };
      
      console.log('Submitting form data:', submissionData);
      
      // Submit to Supabase function
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify(submissionData),
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
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
      
      console.log('Form submission result:', result);
      
      toast({
        title: "Request Submitted!",
        description: "Your backing track request has been submitted successfully.",
      });
      
      // Clear form
      setFormData({
        email: user?.email || '',
        name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        songTitle: '',
        musicalOrArtist: '',
        songKey: '',
        differentKey: 'No',
        keyForTrack: '',
        voiceMemo: '',
        voiceMemoFile: null,
        sheetMusic: null,
        youtubeLink: '',
        trackPurpose: '',
        backingType: '',
        deliveryDate: '',
        additionalServices: [],
        specialRequests: '',
        category: '',
        trackType: ''
      });
      
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

  const createAccount = () => {
    navigate('/login');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />

      <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Piano Backings Request</h1>
          <p className="text-base md:text-xl font-light text-[#1C0357]/90">Submit Your Custom Track Request</p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 rounded">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
            <div>
              <p className="font-bold text-[#1C0357] text-sm">
                ⚠️ Important: 2-3 week wait on backing tracks. Rush fee available.
              </p>
            </div>
          </div>
        </div>

        {showAccountPrompt && (
          <Card className="shadow-lg mb-4 bg-[#1C0357] text-white border-[#1C0357]">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-between gap-3">
                <div className="text-center">
                  <h3 className="text-lg font-bold flex items-center justify-center">
                    <UserIcon className="mr-2" size={16} /> Create an Account
                  </h3>
                  <p className="mt-1 text-sm">
                    Save your request and access all your tracks in one place!
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2">
                  <Button 
                    onClick={() => {
                      // Handle Google sign in
                      supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: `${window.location.origin}/form-page`,
                        },
                      });
                    }}
                    className="bg-white text-[#1C0357] hover:bg-gray-100 text-sm w-full flex items-center justify-center"
                    size="sm"
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Sign in with Google
                  </Button>
                  <p className="text-xs text-center">or</p>
                  <Button 
                    onClick={createAccount}
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 text-sm w-full"
                    size="sm"
                  >
                    Sign in with Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20 py-3 px-4">
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
              <li>✔️ A YouTube link to the song (for tempo reference) (required)</li>
              <li>✔️ A voice memo of you singing the song with accurate rests/beats (optional but helpful)</li>
            </ul>
            
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
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-[#1C0357] text-white py-3 px-4">
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
                    <Label htmlFor="email" className="flex items-center text-sm">
                      Email <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="your.email@example.com"
                        className="pl-8 py-2 text-sm"
                      />
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-sm">Name</Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        placeholder="Your full name"
                        className="pl-8 py-2 text-sm"
                      />
                      <UserIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="songTitle" className="flex items-center text-sm">
                      Song Title <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="songTitle" 
                        name="songTitle" 
                        value={formData.songTitle} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="e.g., Defying Gravity"
                        className="pl-8 py-2 text-sm"
                      />
                      <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="musicalOrArtist" className="flex items-center text-sm">
                      Musical or Artist <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="musicalOrArtist" 
                        name="musicalOrArtist" 
                        value={formData.musicalOrArtist} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="e.g., Wicked"
                        className="pl-8 py-2 text-sm"
                      />
                      <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="category" className="flex items-center text-sm">
                    Category <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="mt-1 relative">
                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                      <SelectTrigger className="pl-8 py-2 text-sm">
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
                </div>
              </div>

              {/* Section 2: Track Type */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">2</span>
                  Track Type
                </h2>
                
                <div className="space-y-3">
                  <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="quick-reference"
                        name="trackType"
                        value="quick"
                        className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'quick'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="quick-reference" className="flex flex-col">
                        <span className="font-bold text-sm">Quick Reference (Voice Memo)</span>
                        <span className="text-[#1C0357] font-medium mt-1 text-xs">$5 - $10</span>
                        <span className="text-xs mt-1 text-gray-600">Fast voice memo for quick learning</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="one-take"
                        name="trackType"
                        value="one-take"
                        className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'one-take'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="one-take" className="flex flex-col">
                        <span className="font-bold text-sm">One-Take Recording</span>
                        <span className="text-[#1C0357] font-medium mt-1 text-xs">$10 - $20</span>
                        <span className="text-xs mt-1 text-gray-600">Single-pass DAW recording</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="polished"
                        name="trackType"
                        value="polished"
                        className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'polished'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="polished" className="flex flex-col">
                        <span className="font-bold text-sm">Polished & Accurate Backing</span>
                        <span className="text-[#1C0357] font-medium mt-1 text-xs">$15 - $35</span>
                        <span className="text-xs mt-1 text-gray-600">Refined track for auditions</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Musical Details */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">3</span>
                  Musical Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="songKey" className="text-sm">What key is your song in?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('songKey', value)} value={formData.songKey}>
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
                  
                  <div>
                    <Label htmlFor="differentKey" className="text-sm">Do you require it in a different key?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('differentKey', value)} value={formData.differentKey}>
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
                    <Label htmlFor="keyForTrack" className="text-sm">Which key?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('keyForTrack', value)} value={formData.keyForTrack}>
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

              {/* Section 4: Track Details */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">4</span>
                  Track Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="youtubeLink" className="flex items-center text-sm">
                      <LinkIcon className="mr-1" size={14} />
                      YouTube URL for tempo reference <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="youtubeLink" 
                        name="youtubeLink" 
                        value={formData.youtubeLink} 
                        onChange={handleInputChange} 
                        placeholder="https://www.youtube.com/watch?v=..."
                        required
                        className="pl-8 py-2 text-sm"
                      />
                      <Youtube className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center text-sm">
                      <MicIcon className="mr-1" size={14} />
                      Voice Memo (optional)
                    </Label>
                    <div className="space-y-3 mt-1">
                      <div>
                        <Label htmlFor="voiceMemo" className="text-xs text-gray-600">Link to voice memo</Label>
                        <div className="mt-1 relative">
                          <Input 
                            id="voiceMemo" 
                            name="voiceMemo" 
                            value={formData.voiceMemo} 
                            onChange={handleInputChange} 
                            placeholder="https://example.com/voice-memo.mp3"
                            className="pl-8 py-2 text-sm"
                          />
                          <LinkIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="voiceMemoFile" className="text-xs text-gray-600">Upload voice memo file</Label>
                        <div className="mt-1">
                          <Input 
                            id="voiceMemoFile" 
                            name="voiceMemoFile" 
                            type="file" 
                            accept="audio/*" 
                            onChange={(e) => handleFileChange(e, 'voiceMemoFile')} 
                            className="py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">You can provide either a link or upload a file</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="sheetMusic" className="flex items-center text-sm">
                      <FileTextIcon className="mr-1" size={14} />
                      Please upload your sheet music as a PDF <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="sheetMusic" 
                        name="sheetMusic" 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => handleFileChange(e, 'sheetMusic')} 
                        required 
                        className="pl-8 py-1 text-sm"
                      />
                      <FileTextIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Make sure it's clear and in the right key</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="trackPurpose" className="text-sm">This track is for...</Label>
                      <div className="mt-1 relative">
                        <Select onValueChange={(value) => handleSelectChange('trackPurpose', value)} value={formData.trackPurpose}>
                          <SelectTrigger className="pl-8 py-2 text-sm">
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personal-practise" className="text-sm">Personal Practise</SelectItem>
                            <SelectItem value="audition-backing" className="text-sm">Audition Backing Track</SelectItem>
                            <SelectItem value="melody-bash" className="text-sm">Note/melody bash</SelectItem>
                          </SelectContent>
                        </Select>
                        <Target className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="backingType" className="text-sm">What do you need?</Label>
                      <div className="mt-1 relative">
                        <Select onValueChange={(value) => handleSelectChange('backingType', value)} value={formData.backingType}>
                          <SelectTrigger className="pl-8 py-2 text-sm">
                            <SelectValue placeholder="Select backing type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-song" className="text-sm">Full song backing</SelectItem>
                            <SelectItem value="audition-cut" className="text-sm">Audition cut backing</SelectItem>
                            <SelectItem value="note-bash" className="text-sm">Note/melody bash</SelectItem>
                          </SelectContent>
                        </Select>
                        <MusicIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Additional Services */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">5</span>
                  Additional Services
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deliveryDate" className="flex items-center text-sm">
                      <CalendarIcon className="mr-1" size={14} />
                      When do you need your track for?
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="deliveryDate" 
                        name="deliveryDate" 
                        type="date" 
                        value={formData.deliveryDate} 
                        onChange={handleInputChange} 
                        className="pl-8 py-2 text-sm w-full"
                      />
                      <CalendarIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center text-sm">
                      <MusicIcon className="mr-1" size={14} />
                      Additional Services
                    </h3>
                    <div className="space-y-2">
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="rush-order"
                            className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('rush-order')}
                            onChange={() => handleCheckboxChange('rush-order')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="rush-order" className="font-medium text-sm">
                              Rush Order
                            </Label>
                            <span className="text-xs text-[#1C0357] font-medium">+$10</span>
                            <p className="text-xs text-gray-600 mt-1">24-hour turnaround</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="complex-songs"
                            className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('complex-songs')}
                            onChange={() => handleCheckboxChange('complex-songs')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="complex-songs" className="font-medium text-sm">
                              Complex Songs
                            </Label>
                            <span className="text-xs text-[#1C0357] font-medium">+$7</span>
                            <p className="text-xs text-gray-600 mt-1">Sondheim, JRB, Guettel</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="additional-edits"
                            className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('additional-edits')}
                            onChange={() => handleCheckboxChange('additional-edits')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="additional-edits" className="font-medium text-sm">
                              Additional Edits
                            </Label>
                            <span className="text-xs text-[#1C0357] font-medium">+$5</span>
                            <p className="text-xs text-gray-600 mt-1">After completion</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="exclusive-ownership"
                            className="mt-1 mr-2 h-4 w-4 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('exclusive-ownership')}
                            onChange={() => handleCheckboxChange('exclusive-ownership')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="exclusive-ownership" className="font-medium text-sm">
                              Exclusive Ownership
                            </Label>
                            <span className="text-xs text-[#1C0357] font-medium">+$40</span>
                            <p className="text-xs text-gray-600 mt-1">Prevent online sharing</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="specialRequests" className="text-sm">Special Requests</Label>
                    <Textarea
                      id="specialRequests"
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleInputChange}
                      placeholder="Any special requests or notes..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 px-8"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default FormPage;
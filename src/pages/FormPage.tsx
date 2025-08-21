import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkIcon, MicIcon, FileTextIcon, MusicIcon, KeyIcon, CalendarIcon, AlertCircle, Clock, Headphones, FileAudio, UserPlus, Upload, CheckCircle } from "lucide-react";
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
          name: session.user.user_metadata?.full_name || ''
        }));
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
      name: user?.user_metadata?.full_name || 'Test User',
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
                    <UserPlus className="mr-2" size={16} /> Create an Account
                  </h3>
                  <p className="mt-1 text-sm">
                    Save your request and access all your tracks in one place!
                  </p>
                </div>
                <Button 
                  onClick={createAccount}
                  className="bg-white text-[#1C0357] hover:bg-gray-100 text-sm w-full"
                  size="sm"
                >
                  Create Account
                </Button>
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
                      <MailIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                      <TheaterIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                    <FolderIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                      <KeyRoundIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                      <KeySquareIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                    <div className="mt-1 relative<|im_start|><|im_start|>
Human: how can i test this<dyad-problem-report summary="555 problems">
<problem file="src/pages/FormPage.tsx" line="330" column="6" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="333" column="8" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="415" column="10" code="17008">JSX element 'Card' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="419" column="12" code="17008">JSX element 'CardContent' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="420" column="14" code="17008">JSX element 'form' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="779" column="16" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="785" column="18" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="804" column="20" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="809" column="22" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="829" column="24" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="830" column="26" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="832" column="29" code="1003">Identifier expected.</problem>
<problem file="src/pages/FormPage.tsx" line="832" column="178" code="1002">Unterminated string literal.</problem>
<problem file="src/pages/FormPage.tsx" line="834" column="2" code="17008">JSX element 'dyad-write' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="842" column="32" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="844" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="846" column="20" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/FormPage.tsx" line="848" column="3" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="849" column="5" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="849" column="40" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="849" column="54" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="850" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="854" column="5" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="874" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="883" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="891" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="892" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="895" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="895" column="46" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="898" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="899" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="921" column="68" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="922" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="924" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="924" column="42" code="1003">Identifier expected.</problem>
<problem file="src/pages/FormPage.tsx" line="924" column="50" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/FormPage.tsx" line="925" column="20" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="928" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="932" column="95" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="933" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="935" column="67" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="936" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="937" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="940" column="45" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/FormPage.tsx" line="941" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="942" column="9" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="943" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="946" column="9" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="947" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="950" column="9" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="951" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="955" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="957" column="25" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="958" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="960" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="964" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="965" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="968" column="9" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="971" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="976" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="986" column="56" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="988" column="56" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="989" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="990" column="59" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="991" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="992" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="993" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="994" column="60" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="995" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="996" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="997" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="999" column="59" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1014" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1016" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1018" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1020" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1021" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1022" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1025" column="35" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1027" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1028" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1031" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1034" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1036" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1038" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1040" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1042" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1043" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1046" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1049" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1050" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1055" column="13" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1058" column="81" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1060" column="23" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1062" column="34" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1064" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1066" column="23" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1067" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1068" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1071" column="17" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1072" column="65" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1074" column="59" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1076" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1077" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1078" column="17" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1081" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1082" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1083" column="91" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1084" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1085" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1087" column="89" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1088" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1089" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1090" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1091" column="63" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1093" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1094" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1101" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1103" column="79" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1105" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1107" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1109" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1111" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1112" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1113" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1116" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1125" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1127" column="30" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1129" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1131" column="24" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1134" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1135" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1138" column="39" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1140" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1141" column="13" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1146" column="15" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1149" column="78" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1151" column="25" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1153" column="36" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1155" column="19" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1157" column="30" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1160" column="19" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1161" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1164" column="45" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1167" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1168" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1171" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1172" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1173" column="105" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1174" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1175" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1177" column="103" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1178" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1179" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1180" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1181" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1184" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1185" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1186" column="53" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1188" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1189" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1196" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1198" column="9" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1204" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1205" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1209" column="78" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1216" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1218" column="102" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1222" column="13" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1225" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1227" column="34" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1229" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1230" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1233" column="15" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1235" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1236" column="15" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1241" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1247" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1249" column="34" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1251" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1252" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1255" column="15" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1261" column="71" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1265" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1270" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1272" column="38" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1274" column="29" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1278" column="23" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1280" column="21" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1282" column="19" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1285" column="45" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1287" column="19" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1288" column="21" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1296" column="19" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1297" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1298" column="84" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1304" column="17" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1305" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1306" column="74" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1312" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1313" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1314" column="15" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1319" column="139" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1320" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1321" column="98" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1322" column="15" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1328" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1329" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1330" column="50" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1337" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1338" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1339" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1340" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1345" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1349" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1350" column="83" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1351" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1352" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1353" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1360" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1362" column="80" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1365" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1366" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1376" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1378" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1380" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1384" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1386" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1388" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1391" column="34" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1393" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1394" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1397" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1398" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1399" column="50" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1401" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1402" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1409" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1411" column="90" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1414" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1415" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1426" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1428" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1430" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1434" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1436" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1438" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1441" column="40" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1443" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1444" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1447" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1448" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1449" column="57" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1451" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1452" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1459" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1461" column="9" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1471" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1473" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1475" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1479" column="13" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1481" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1483" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1486" column="38" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1488" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1489" column="11" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1492" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1493" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1494" column="60" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1496" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1497" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1504" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1521" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1526" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1527" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1532" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1534" column="10" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="1537" column="12" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="1540" column="14" code="17008">JSX element 'div' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="1541" column="60" code="17008">JSX element 'br' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="1545" column="15" code="17002">Expected corresponding JSX closing tag for 'br'.</problem>
<problem file="src/pages/FormPage.tsx" line="1548" column="108" code="17008">JSX element 'br' has no corresponding closing tag.</problem>
<problem file="src/pages/FormPage.tsx" line="1551" column="15" code="17002">Expected corresponding JSX closing tag for 'br'.</problem>
<problem file="src/pages/FormPage.tsx" line="1580" column="11" code="17002">Expected corresponding JSX closing tag for 'br'.</problem>
<problem file="src/pages/FormPage.tsx" line="1587" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1589" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1591" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1593" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1596" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1597" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1601" column="9" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1603" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1604" column="60" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1605" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1606" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1607" column="69" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1608" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1611" column="14" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1626" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1629" column="50" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1630" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1633" column="60" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1634" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1637" column="54" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1638" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1641" column="56" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1642" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1645" column="66" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1646" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1649" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1650" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1655" column="16" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1657" column="25" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1658" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1660" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1662" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1663" column="5" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1665" column="14" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1666" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1668" column="16" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1670" column="25" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1671" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1673" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1675" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1676" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1680" column="3" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1683" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1687" column="3" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1689" column="5" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1698" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1700" column="24" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1702" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1706" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1708" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1710" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1713" column="7" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1716" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1719" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1720" column="69" code="1005">'}' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1722" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1723" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1727" column="3" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1785" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1789" column="3" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1790" column="5" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1794" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1795" column="5" code="1109">Expression expected.</problem>
<problem file="src/pages/FormPage.tsx" line="1796" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1797" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/FormPage.tsx" line="1797" column="2" code="1005">'&lt;/' expected.</problem>
<problem file="src/pages/FormPage.tsx" line="444" column="24" code="2552">Cannot find name 'MailIcon'. Did you mean 'MicIcon'?</problem>
<problem file="src/pages/FormPage.tsx" line="458" column="24" code="2304">Cannot find name 'UserIcon'.</problem>
<problem file="src/pages/FormPage.tsx" line="495" column="24" code="2304">Cannot find name 'TheaterIcon'.</problem>
<problem file="src/pages/FormPage.tsx" line="517" column="22" code="2304">Cannot find name 'FolderIcon'.</problem>
<problem file="src/pages/FormPage.tsx" line="629" column="24" code="2304">Cannot find name 'KeyRoundIcon'.</problem>
<problem file="src/pages/FormPage.tsx" line="650" column="24" code="2304">Cannot find name 'KeySquareIcon'.</problem>
<problem file="src/pages/FormPage.tsx" line="679" column="24" code="2304">Cannot find name 'YoutubeIcon'.</problem>
<problem file="src/pages/FormPage.tsx" line="754" column="26" code="2304">Cannot find name 'TargetIcon'.</problem>
<problem file="src/pages/FormPage.tsx" line="771" column="26" code="2552">Cannot find name 'HeadphonesIcon'. Did you mean 'Headphones'?</problem>
<problem file="src/pages/FormPage.tsx" line="832" column="28" code="2322">Type '{ I: true; }' is not assignable to type 'DetailedHTMLProps&lt;InputHTMLAttributes&lt;HTMLInputElement&gt;, HTMLInputElement&gt;'.
  Property 'I' does not exist on type 'DetailedHTMLProps&lt;InputHTMLAttributes&lt;HTMLInputElement&gt;, HTMLInputElement&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="834" column="1" code="2339">Property 'dyad-write' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/FormPage.tsx" line="836" column="10" code="2304">Cannot find name 'serve'.</problem>
<problem file="src/pages/FormPage.tsx" line="838" column="10" code="2304">Cannot find name 'createClient'.</problem>
<problem file="src/pages/FormPage.tsx" line="849" column="33" code="2304">Cannot find name 'headers'.</problem>
<problem file="src/pages/FormPage.tsx" line="874" column="7" code="2304">Cannot find name 'SUPABASE_URL'.</problem>
<problem file="src/pages/FormPage.tsx" line="895" column="13" code="2304">Cannot find name 'data'.</problem>
<problem file="src/pages/FormPage.tsx" line="910" column="27" code="2304">Cannot find name 'dateString'.</problem>
<problem file="src/pages/FormPage.tsx" line="910" column="109" code="2304">Cannot find name 'firstName'.</problem>
<problem file="src/pages/FormPage.tsx" line="913" column="89" code="2304">Cannot find name 'firstName'.</problem>
<problem file="src/pages/FormPage.tsx" line="921" column="7" code="2304">Cannot find name 'parentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="921" column="25" code="2304">Cannot find name 'defaultDropboxParentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="924" column="35" code="2339">Property 'string' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/FormPage.tsx" line="932" column="9" code="2304">Cannot find name 'parentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="932" column="27" code="2304">Cannot find name 'defaultDropboxParentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="932" column="57" code="2304">Cannot find name 'backingTypeMap'.</problem>
<problem file="src/pages/FormPage.tsx" line="935" column="9" code="2304">Cannot find name 'parentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="935" column="27" code="2304">Cannot find name 'defaultDropboxParentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="955" column="9" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="960" column="11" code="2304">Cannot find name 'grant_type'.</problem>
<problem file="src/pages/FormPage.tsx" line="970" column="58" code="2304">Cannot find name 'response'.</problem>
<problem file="src/pages/FormPage.tsx" line="970" column="79" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="988" column="9" code="2304">Cannot find name 'dropboxError'.</problem>
<problem file="src/pages/FormPage.tsx" line="990" column="9" code="2304">Cannot find name 'dropboxError'.</problem>
<problem file="src/pages/FormPage.tsx" line="992" column="9" code="2304">Cannot find name 'dropboxError'.</problem>
<problem file="src/pages/FormPage.tsx" line="994" column="9" code="2304">Cannot find name 'dropboxError'.</problem>
<problem file="src/pages/FormPage.tsx" line="999" column="9" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="999" column="36" code="2304">Cannot find name 'getDropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1004" column="17" code="2304">Cannot find name 'parentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="1006" column="29" code="2304">Cannot find name 'normalizedParentFolder'.</problem>
<problem file="src/pages/FormPage.tsx" line="1006" column="55" code="2304">Cannot find name 'folderName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1014" column="11" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1016" column="40" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1020" column="13" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1025" column="11" code="2304">Cannot find name 'parentFolderCheck'.</problem>
<problem file="src/pages/FormPage.tsx" line="1030" column="58" code="2304">Cannot find name 'parentCheckResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1030" column="90" code="2304">Cannot find name 'parentErrorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1034" column="11" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1036" column="40" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1040" column="13" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1060" column="17" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1062" column="46" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1066" column="19" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1074" column="19" code="2304">Cannot find name 'dropboxFolderId'.</problem>
<problem file="src/pages/FormPage.tsx" line="1074" column="37" code="2304">Cannot find name 'listData'.</problem>
<problem file="src/pages/FormPage.tsx" line="1080" column="54" code="2304">Cannot find name 'dropboxResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1080" column="82" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1083" column="15" code="2304">Cannot find name 'dropboxError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1083" column="52" code="2304">Cannot find name 'dropboxResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1083" column="80" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1087" column="13" code="2304">Cannot find name 'dropboxError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1087" column="50" code="2304">Cannot find name 'dropboxResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1087" column="78" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1091" column="57" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1092" column="58" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1103" column="62" code="2304">Cannot find name 'templateFilePath'.</problem>
<problem file="src/pages/FormPage.tsx" line="1105" column="11" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1107" column="40" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1111" column="13" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1120" column="34" code="2304">Cannot find name 'logicFileName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1121" column="31" code="2304">Cannot find name 'dropboxFolderPath'.</problem>
<problem file="src/pages/FormPage.tsx" line="1121" column="52" code="2304">Cannot find name 'newFileName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1125" column="13" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1127" column="42" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1131" column="15" code="2304">Cannot find name 'from_path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1138" column="13" code="2304">Cannot find name 'templateCopySuccess'.</problem>
<problem file="src/pages/FormPage.tsx" line="1151" column="19" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1153" column="48" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1157" column="21" code="2304">Cannot find name 'from_path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1164" column="19" code="2304">Cannot find name 'templateCopySuccess'.</problem>
<problem file="src/pages/FormPage.tsx" line="1170" column="71" code="2304">Cannot find name 'copyWithRenameResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1170" column="106" code="2304">Cannot find name 'renameErrorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1173" column="17" code="2304">Cannot find name 'templateCopyError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1173" column="69" code="2304">Cannot find name 'copyResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1173" column="94" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1177" column="15" code="2304">Cannot find name 'templateCopyError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1177" column="67" code="2304">Cannot find name 'copyResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1177" column="92" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1183" column="68" code="2304">Cannot find name 'fileInfoResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1183" column="97" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1186" column="47" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1187" column="53" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1199" column="31" code="2304">Cannot find name 'dropboxFolderPath'.</problem>
<problem file="src/pages/FormPage.tsx" line="1199" column="52" code="2304">Cannot find name 'mp3FileName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1209" column="11" code="2304">Cannot find name 'youtubeMp3Error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1222" column="103" code="2304">Cannot find name 'videoId'.</problem>
<problem file="src/pages/FormPage.tsx" line="1225" column="15" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1244" column="106" code="2304">Cannot find name 'videoId'.</problem>
<problem file="src/pages/FormPage.tsx" line="1247" column="15" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1261" column="54" code="2304">Cannot find name 'downloadData'.</problem>
<problem file="src/pages/FormPage.tsx" line="1270" column="21" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1272" column="50" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1274" column="25" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1285" column="21" code="2304">Cannot find name 'youtubeMp3Success'.</problem>
<problem file="src/pages/FormPage.tsx" line="1290" column="68" code="2304">Cannot find name 'dropboxUploadResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1290" column="102" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1298" column="19" code="2304">Cannot find name 'youtubeMp3Error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1298" column="64" code="2304">Cannot find name 'mp3Response'.</problem>
<problem file="src/pages/FormPage.tsx" line="1306" column="17" code="2304">Cannot find name 'youtubeMp3Error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1319" column="17" code="2304">Cannot find name 'youtubeMp3Error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1321" column="17" code="2304">Cannot find name 'youtubeMp3Error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1321" column="58" code="2304">Cannot find name 'downloadResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1321" column="87" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1330" column="41" code="2304">Cannot find name 'apiError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1331" column="45" code="2304">Cannot find name 'apiError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1340" column="56" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1341" column="60" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1350" column="69" code="2304">Cannot find name 'fallbackError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1362" column="66" code="2551">Property 'sheetMusicUrl' does not exist on type '{ email: string; name: string; songTitle: string; musicalOrArtist: string; songKey: string; differentKey: string; keyForTrack: string; voiceMemo: string; voiceMemoFile: File; sheetMusic: File; ... 7 more ...; trackType: string; }'. Did you mean 'sheetMusic'?</problem>
<problem file="src/pages/FormPage.tsx" line="1365" column="68" code="2304">Cannot find name 'pdfResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1365" column="90" code="2304">Cannot find name 'pdfResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1372" column="31" code="2304">Cannot find name 'dropboxFolderPath'.</problem>
<problem file="src/pages/FormPage.tsx" line="1372" column="52" code="2304">Cannot find name 'pdfFileName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1376" column="11" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1378" column="40" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1380" column="15" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1391" column="11" code="2304">Cannot find name 'pdfUploadSuccess'.</problem>
<problem file="src/pages/FormPage.tsx" line="1396" column="57" code="2304">Cannot find name 'dropboxUploadResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1396" column="91" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1399" column="44" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1400" column="47" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1411" column="73" code="2551">Property 'voiceMemoFileUrl' does not exist on type '{ email: string; name: string; songTitle: string; musicalOrArtist: string; songKey: string; differentKey: string; keyForTrack: string; voiceMemo: string; voiceMemoFile: File; sheetMusic: File; ... 7 more ...; trackType: string; }'. Did you mean 'voiceMemoFile'?</problem>
<problem file="src/pages/FormPage.tsx" line="1414" column="75" code="2304">Cannot find name 'voiceMemoResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1414" column="103" code="2304">Cannot find name 'voiceMemoResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1419" column="101" code="2304">Cannot find name 'fileExt'.</problem>
<problem file="src/pages/FormPage.tsx" line="1422" column="31" code="2304">Cannot find name 'dropboxFolderPath'.</problem>
<problem file="src/pages/FormPage.tsx" line="1422" column="52" code="2304">Cannot find name 'voiceMemoFileName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1426" column="11" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1428" column="40" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1430" column="15" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1441" column="11" code="2304">Cannot find name 'voiceMemoUploadSuccess'.</problem>
<problem file="src/pages/FormPage.tsx" line="1446" column="70" code="2304">Cannot find name 'dropboxUploadResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1446" column="104" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1449" column="51" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1450" column="60" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1467" column="31" code="2304">Cannot find name 'dropboxFolderPath'.</problem>
<problem file="src/pages/FormPage.tsx" line="1467" column="52" code="2304">Cannot find name 'summaryFileName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1471" column="11" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1473" column="40" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1475" column="15" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1486" column="11" code="2304">Cannot find name 'summaryUploadSuccess'.</problem>
<problem file="src/pages/FormPage.tsx" line="1491" column="71" code="2304">Cannot find name 'dropboxUploadResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1491" column="105" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1494" column="54" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1495" column="61" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1500" column="13" code="2304">Cannot find name 'data'.</problem>
<problem file="src/pages/FormPage.tsx" line="1500" column="13" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/FormPage.tsx" line="1500" column="19" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1504" column="11" code="2304">Cannot find name 'user_id'.</problem>
<problem file="src/pages/FormPage.tsx" line="1534" column="14" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1535" column="15" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1537" column="16" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1538" column="17" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1540" column="18" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1547" column="18" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1570" column="16" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1572" column="16" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1577" column="14" code="2559">Type 'string' has no properties in common with type 'Properties&lt;string | number, string &amp; {}&gt;'.</problem>
<problem file="src/pages/FormPage.tsx" line="1587" column="11" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1590" column="40" code="2304">Cannot find name 'supabaseServiceKey'.</problem>
<problem file="src/pages/FormPage.tsx" line="1593" column="13" code="2304">Cannot find name 'to'.</problem>
<problem file="src/pages/FormPage.tsx" line="1607" column="58" code="2304">Cannot find name 'emailError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1611" column="7" code="2304">Cannot find name 'message'.</problem>
<problem file="src/pages/FormPage.tsx" line="1629" column="7" code="2304">Cannot find name 'responsePayload'.</problem>
<problem file="src/pages/FormPage.tsx" line="1629" column="38" code="2304">Cannot find name 'dropboxError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1633" column="7" code="2304">Cannot find name 'responsePayload'.</problem>
<problem file="src/pages/FormPage.tsx" line="1633" column="43" code="2304">Cannot find name 'templateCopyError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1637" column="7" code="2304">Cannot find name 'responsePayload'.</problem>
<problem file="src/pages/FormPage.tsx" line="1637" column="40" code="2304">Cannot find name 'pdfUploadError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1641" column="7" code="2304">Cannot find name 'responsePayload'.</problem>
<problem file="src/pages/FormPage.tsx" line="1641" column="41" code="2304">Cannot find name 'youtubeMp3Error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1645" column="7" code="2304">Cannot find name 'responsePayload'.</problem>
<problem file="src/pages/FormPage.tsx" line="1645" column="46" code="2304">Cannot find name 'voiceMemoUploadError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1649" column="7" code="2304">Cannot find name 'responsePayload'.</problem>
<problem file="src/pages/FormPage.tsx" line="1649" column="44" code="2304">Cannot find name 'summaryUploadError'.</problem>
<problem file="src/pages/FormPage.tsx" line="1655" column="9" code="2304">Cannot find name 'headers'.</problem>
<problem file="src/pages/FormPage.tsx" line="1655" column="18" code="2609">JSX spread child must be an array type.</problem>
<problem file="src/pages/FormPage.tsx" line="1656" column="14" code="2304">Cannot find name 'corsHeaders'.</problem>
<problem file="src/pages/FormPage.tsx" line="1656" column="14" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/FormPage.tsx" line="1665" column="9" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1668" column="9" code="2304">Cannot find name 'headers'.</problem>
<problem file="src/pages/FormPage.tsx" line="1668" column="18" code="2609">JSX spread child must be an array type.</problem>
<problem file="src/pages/FormPage.tsx" line="1669" column="14" code="2304">Cannot find name 'corsHeaders'.</problem>
<problem file="src/pages/FormPage.tsx" line="1669" column="14" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/FormPage.tsx" line="1689" column="52" code="2304">Cannot find name 'youtubeLink'.</problem>
<problem file="src/pages/FormPage.tsx" line="1694" column="31" code="2304">Cannot find name 'dropboxFolderPath'.</problem>
<problem file="src/pages/FormPage.tsx" line="1694" column="52" code="2304">Cannot find name 'mp3FileName'.</problem>
<problem file="src/pages/FormPage.tsx" line="1698" column="7" code="2304">Cannot find name 'method'.</problem>
<problem file="src/pages/FormPage.tsx" line="1700" column="36" code="2304">Cannot find name 'dropboxAccessToken'.</problem>
<problem file="src/pages/FormPage.tsx" line="1702" column="11" code="2304">Cannot find name 'path'.</problem>
<problem file="src/pages/FormPage.tsx" line="1715" column="63" code="2304">Cannot find name 'dropboxUploadResponse'.</problem>
<problem file="src/pages/FormPage.tsx" line="1715" column="97" code="2304">Cannot find name 'errorText'.</problem>
<problem file="src/pages/FormPage.tsx" line="1720" column="63" code="2304">Cannot find name 'error'.</problem>
<problem file="src/pages/FormPage.tsx" line="1774" column="12" code="2551">Property 'sheetMusicUrl' does not exist on type '{ email: string; name: string; songTitle: string; musicalOrArtist: string; songKey: string; differentKey: string; keyForTrack: string; voiceMemo: string; voiceMemoFile: File; sheetMusic: File; ... 7 more ...; trackType: string; }'. Did you mean 'sheetMusic'?</problem>
<problem file="src/pages/FormPage.tsx" line="1778" column="12" code="2551">Property 'voiceMemoFileUrl' does not exist on type '{ email: string; name: string; songTitle: string; musicalOrArtist: string; songKey: string; differentKey: string; keyForTrack: string; voiceMemo: string; voiceMemoFile: File; sheetMusic: File; ... 7 more ...; trackType: string; }'. Did you mean 'voiceMemoFile'?</problem>
<problem file="src/App.tsx" line="7" column="8" code="1192">Module '&quot;/Users/danielebuatti/dyad-apps/swift-binturong-play/src/pages/FormPage&quot;' has no default export.</problem>
</dyad-problem-report>I'll fix these TypeScript errors by addressing the main issues:

<dyad-write path="src/pages/FormPage.tsx" description="Fixing TypeScript errors in FormPage">
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkIcon, MicIcon, FileTextIcon, MusicIcon, KeyIcon, CalendarIcon, AlertCircle, Clock, Headphones, FileAudio, UserPlus, Upload, CheckCircle, FolderIcon, TheaterIcon, YoutubeIcon, TargetIcon } from "lucide-react";
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
          name: session.user.user_metadata?.full_name || ''
        }));
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
      name: user?.user_metadata?.full_name || 'Test User',
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
                    <UserPlus className="mr-2" size={16} /> Create an Account
                  </h3>
                  <p className="mt-1 text-sm">
                    Save your request and access all your tracks in one place!
                  </p>
                </div>
                <Button 
                  onClick={createAccount}
                  className="bg-white text-[#1C0357] hover:bg-gray-100 text-sm w-full"
                  size="sm"
                >
                  Create Account
                </Button>
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
                      <MailIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                      <UserPlus className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                      <TheaterIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                    <FolderIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                      <YoutubeIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                        <TargetIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                        <Headphones className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
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
                      <Headphones className="mr-1" size={14} />
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
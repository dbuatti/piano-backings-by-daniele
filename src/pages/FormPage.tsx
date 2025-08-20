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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit form: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
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

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Piano Backings Request Form</h1>
          <p className="text-lg md:text-xl font-light text-[#1C0357]/90">Submit Your Custom Track Request</p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-bold text-[#1C0357]">
                ⚠️ Important Notice: Due to high demand, there is a 2-3 week wait on backing tracks. 
                If you need a faster turnaround, consider the Rush Fee option below. Thank you for your patience!
              </p>
            </div>
          </div>
        </div>

        {showAccountPrompt && (
          <Card className="shadow-lg mb-6 bg-[#1C0357] text-white border-[#1C0357]">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-xl font-bold flex items-center">
                    <UserPlus className="mr-2" /> Create an Account
                  </h3>
                  <p className="mt-1">
                    Save your request and access all your tracks in one place!
                  </p>
                </div>
                <Button 
                  onClick={createAccount}
                  className="bg-white text-[#1C0357] hover:bg-gray-100"
                >
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <MusicIcon className="mr-2" />
              Request Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-start mb-4">
              <MusicIcon className="text-[#1C0357] mr-3 mt-1" />
              <p className="text-base">
                I provide custom piano backing tracks for musical theatre and pop. Whether you need a quick reference or a polished audition track, 
                I offer flexible options to suit your needs.
              </p>
            </div>
            
            <div className="border-l-4 border-[#F538BC] pl-4 py-2 my-4">
              <p className="font-bold text-[#1C0357]">
                ✅ Important: Your sheet music must be clear, correctly cut, and in the right key.
              </p>
            </div>
            
            <p className="mt-3 font-medium">Before submitting, please make sure to include:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>✔️ Your sheet music in PDF format (required)</li>
              <li>✔️ A YouTube link to the song (for tempo reference) (required)</li>
              <li>✔️ A voice memo of you singing the song with accurate rests/beats (optional but helpful)</li>
            </ul>
            
            <div className="mt-6">
              <Button 
                type="button" 
                onClick={fillDummyData}
                className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white"
                variant="outline"
              >
                Fill with Sample Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-[#1C0357] text-white">
            <CardTitle className="text-2xl">Request Form</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Basic Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>
                  Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email" className="flex items-center">
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
                        className="pl-10"
                      />
                      <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        placeholder="Your full name"
                        className="pl-10"
                      />
                      <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <Label htmlFor="songTitle" className="flex items-center">
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
                        className="pl-10"
                      />
                      <MusicIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="musicalOrArtist" className="flex items-center">
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
                        className="pl-10"
                      />
                      <TheaterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="category" className="flex items-center">
                    Category <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="mt-1 relative">
                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FolderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
              </div>

              {/* Section 2: Track Type */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>
                  Track Type
                </h2>
                
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="quick-reference"
                        name="trackType"
                        value="quick"
                        className="mt-1 mr-3 h-5 w-5 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'quick'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="quick-reference" className="flex flex-col">
                        <span className="font-bold text-lg">Quick Reference (Voice Memo)</span>
                        <span className="text-[#1C0357] font-medium mt-1">$5 - $10</span>
                        <span className="text-sm mt-2 text-gray-600">A fast and rough voice memo ideal for quick learning or audition notes, not suited for professional use.</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="one-take"
                        name="trackType"
                        value="one-take"
                        className="mt-1 mr-3 h-5 w-5 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'one-take'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="one-take" className="flex flex-col">
                        <span className="font-bold text-lg">One-Take Recording</span>
                        <span className="text-[#1C0357] font-medium mt-1">$10 - $15 (Audition Cut) / $15 - $20 (Full Song)</span>
                        <span className="text-sm mt-2 text-gray-600">A single-pass, good-quality DAW recording with potential minor errors, suitable for self-tapes and quick references.</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="polished"
                        name="trackType"
                        value="polished"
                        className="mt-1 mr-3 h-5 w-5 text-[#1C0357] focus:ring-[#1C0357]"
                        checked={formData.trackType === 'polished'}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                      />
                      <Label htmlFor="polished" className="flex flex-col">
                        <span className="font-bold text-lg">Polished & Accurate Backing</span>
                        <span className="text-[#1C0357] font-medium mt-1">$15 - $20 (Audition Cut) / $30 - $35 (Full Song)</span>
                        <span className="text-sm mt-2 text-gray-600">A refined, accurate track with correct notes and rhythm, ideal for auditions, performances, and dedicated practice.</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Musical Details */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>
                  Musical Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="songKey">What key is your song in? (Don't worry if you're unsure)</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('songKey', value)} value={formData.songKey}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select key" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyOptions.map((key) => (
                            <SelectItem key={key.value} value={key.value}>
                              {key.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="differentKey">Do you require it in a different key?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('differentKey', value)} value={formData.differentKey}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="Maybe">Maybe</SelectItem>
                        </SelectContent>
                      </Select>
                      <KeyRoundIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                </div>
                
                {formData.differentKey === 'Yes' && (
                  <div className="mt-4">
                    <Label htmlFor="keyForTrack">Which key?</Label>
                    <div className="mt-1 relative">
                      <Select onValueChange={(value) => handleSelectChange('keyForTrack', value)} value={formData.keyForTrack}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select key" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyOptions.map((key) => (
                            <SelectItem key={key.value} value={key.value}>
                              {key.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <KeySquareIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Track Details */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-8 h-8 flex items-center justify-center mr-3">4</span>
                  Track Details
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="youtubeLink" className="flex items-center">
                      <LinkIcon className="mr-2" size={16} />
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
                        className="pl-10"
                      />
                      <YoutubeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center">
                      <MicIcon className="mr-2" size={16} />
                      Voice Memo (optional)
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                      <div>
                        <Label htmlFor="voiceMemo" className="text-sm text-gray-600">Link to voice memo</Label>
                        <div className="mt-1 relative">
                          <Input 
                            id="voiceMemo" 
                            name="voiceMemo" 
                            value={formData.voiceMemo} 
                            onChange={handleInputChange} 
                            placeholder="https://example.com/voice-memo.mp3"
                            className="pl-10"
                          />
                          <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="voiceMemoFile" className="text-sm text-gray-600">Upload voice memo file</Label>
                        <div className="mt-1">
                          <Input 
                            id="voiceMemoFile" 
                            name="voiceMemoFile" 
                            type="file" 
                            accept="audio/*" 
                            onChange={(e) => handleFileChange(e, 'voiceMemoFile')} 
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">You can provide either a link or upload a file (or both)</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="sheetMusic" className="flex items-center">
                      <FileTextIcon className="mr-2" size={16} />
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
                        className="pl-10"
                      />
                      <FileTextIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Make sure it's clear, correctly cut, and in the right key</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="trackPurpose">This track is for...</Label>
                      <div className="mt-1 relative">
                        <Select onValueChange={(value) => handleSelectChange('trackPurpose', value)} value={formData.trackPurpose}>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personal-practise">Personal Practise</SelectItem>
                            <SelectItem value="audition-backing">Audition Backing Track (selftape)</SelectItem>
                            <SelectItem value="melody-bash">Melody/note bash (no formal backing required)</SelectItem>
                          </SelectContent>
                        </Select>
                        <TargetIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="backingType">What do you need?</Label>
                      <div className="mt-1 relative">
                        <Select onValueChange={(value) => handleSelectChange('backingType', value)} value={formData.backingType}>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select backing type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-song">Full song backing</SelectItem>
                            <SelectItem value="audition-cut">Audition cut backing</SelectItem>
                            <SelectItem value="note-bash">Note/melody bash</SelectItem>
                          </SelectContent>
                        </Select>
                        <HeadphonesIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Additional Services */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-8 h-8 flex items-center justify-center mr-3">5</span>
                  Additional Services
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="deliveryDate" className="flex items-center">
                      <CalendarIcon className="mr-2" size={16} />
                      When do you need your track for?
                    </Label>
                    <div className="mt-1 relative">
                      <Input 
                        id="deliveryDate" 
                        name="deliveryDate" 
                        type="date" 
                        value={formData.deliveryDate} 
                        onChange={handleInputChange} 
                        className="pl-10 w-full md:w-1/2"
                      />
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Headphones className="mr-2" size={16} />
                      Additional Services
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="rush-order"
                            className="mt-1 mr-3 h-5 w-5 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('rush-order')}
                            onChange={() => handleCheckboxChange('rush-order')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="rush-order" className="font-medium">
                              Rush Order
                            </Label>
                            <span className="text-sm text-[#1C0357] font-medium">+$10</span>
                            <p className="text-sm text-gray-600 mt-1">24-hour turnaround</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="complex-songs"
                            className="mt-1 mr-3 h-5 w-5 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('complex-songs')}
                            onChange={() => handleCheckboxChange('complex-songs')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="complex-songs" className="font-medium">
                              Complex Songs
                            </Label>
                            <span className="text-sm text-[#1C0357] font-medium">+$5–$10</span>
                            <p className="text-sm text-gray-600 mt-1">Sondheim, JRB, Guettel</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="additional-edits"
                            className="mt-1 mr-3 h-5 w-5 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('additional-edits')}
                            onChange={() => handleCheckboxChange('additional-edits')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="additional-edits" className="font-medium">
                              Additional Edits
                            </Label>
                            <span className="text-sm text-[#1C0357] font-medium">+$5 per request</span>
                            <p className="text-sm text-gray-600 mt-1">Post-completion revisions</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="exclusive-ownership"
                            className="mt-1 mr-3 h-5 w-5 text-[#1C0357] focus:ring-[#1C0357] rounded"
                            checked={formData.additionalServices.includes('exclusive-ownership')}
                            onChange={() => handleCheckboxChange('exclusive-ownership')}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="exclusive-ownership" className="font-medium">
                              Exclusive Ownership
                            </Label>
                            <span className="text-sm text-[#1C0357] font-medium">$40</span>
                            <p className="text-sm text-gray-600 mt-1">Not uploaded/shared online</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="specialRequests" className="flex items-center">
                      <FileAudio className="mr-2" size={16} />
                      Is there anything else you'd like to add?
                    </Label>
                    <div className="mt-1 relative">
                      <Textarea 
                        id="specialRequests" 
                        name="specialRequests" 
                        value={formData.specialRequests} 
                        onChange={handleInputChange} 
                        placeholder="Any special requests or additional information..."
                        rows={4}
                        className="pl-10"
                      />
                      <FileAudio className="absolute left-3 top-3 text-gray-400" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <Button 
                  type="submit" 
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3 text-lg flex items-center justify-center mx-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" size={20} />
                      Submit Request
                    </>
                  )}
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

// Additional icon components with proper TypeScript definitions
const MailIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const UserIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const TheaterIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 10s3-3 3-8"/>
    <path d="M22 10s-3-3-3-8"/>
    <path d="M8 10v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8"/>
    <path d="M10 10h4"/>
    <path d="M2 10h20"/>
  </svg>
);

const FolderIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
  </svg>
);

const KeyRoundIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/>
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>
  </svg>
);

const KeySquareIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 12v.1"/>
    <path d="M13.1 10.1a3 3 0 1 0 3.9 3.9"/>
    <path d="m14 10-4.5 4.5"/>
    <path d="M14 10c.1.4.1.9 0 1.3l-1.5 1.5c-.4.4-1 .4-1.3 0l-1-1c-.4-.4-.4-1 0-1.3L12 9c.4-.4 1-.4 1.3 0l.5.5c.4.4.4 1 0 1.3l-1 1c-.4.4-1 .4-1.3 0"/>
    <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/>
  </svg>
);

const YoutubeIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
    <path d="m10 15 5-3-5-3z"/>
  </svg>
);

const TargetIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

const HeadphonesIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
  </svg>
);

export default FormPage;
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkIcon, MicIcon, FileTextIcon, MusicIcon, KeyIcon, DollarSign } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

const FormPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    songTitle: '',
    musicalOrArtist: '',
    songKey: '',
    differentKey: 'No',
    keyForTrack: '',
    voiceMemo: '',
    sheetMusic: null as File | null,
    youtubeLink: '',
    trackPurpose: '',
    backingType: '',
    deliveryDate: '',
    additionalServices: [] as string[],
    specialRequests: '',
    category: '', // New category field
    trackType: '' // New track type field
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, sheetMusic: e.target.files![0] }));
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
      email: 'test@example.com',
      name: 'Test User',
      songTitle: 'Test Song',
      musicalOrArtist: 'Test Musical',
      songKey: 'C Major (0)',
      differentKey: 'No',
      keyForTrack: '',
      voiceMemo: 'https://example.com/voice-memo.mp3',
      sheetMusic: null,
      youtubeLink: 'https://www.youtube.com/watch?v=test',
      trackPurpose: 'personal-practise',
      backingType: 'full-song',
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      additionalServices: ['rush-order'],
      specialRequests: 'This is a test request',
      category: 'Practice Tracks', // Default category for dummy data
      trackType: 'polished' // Default track type for dummy data
    });
    
    toast({
      title: "Dummy Data Filled",
      description: "The form has been pre-filled with sample data.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get the session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      // For now, we'll send the data to our backend function
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || 'no-token'}`
          },
          body: JSON.stringify({
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
              trackPurpose: formData.trackPurpose,
              backingType: formData.backingType,
              deliveryDate: formData.deliveryDate,
              additionalServices: formData.additionalServices,
              specialRequests: formData.specialRequests,
              category: formData.category, // Include category in the data sent to the function
              trackType: formData.trackType // Include track type in the data sent to the function
            }
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }
      
      const result = await response.json();
      
      toast({
        title: "Success!",
        description: "Your request has been submitted successfully.",
      });
      
      // Reset form
      setFormData({
        email: '',
        name: '',
        songTitle: '',
        musicalOrArtist: '',
        songKey: '',
        differentKey: 'No',
        keyForTrack: '',
        voiceMemo: '',
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

  // Key options for the dropdown
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

  // Category options for the dropdown
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

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Piano Backings Form</h1>
            <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Submit Your Custom Track Request</p>
        </div>

        <div className="bg-[#F538BC]/10 border-l-4 border-[#F538BC] p-4 mb-6 rounded">
          <p className="font-bold text-[#1C0357]">
            ⚠️ Important Notice: Due to high demand, there is a 2-3 week wait on backing tracks. 
            If you need a faster turnaround, consider the Rush Fee option below. Thank you for your patience!
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start mb-4">
                <MusicIcon className="text-[#1C0357] mr-3 mt-1" />
                <p className="text-lg">
                  I provide custom piano backing tracks for musical theatre and pop. Whether you need a quick reference or a polished audition track, 
                  I offer flexible options to suit your needs.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Form Section */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Request Form</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#D1AAF2] p-4 rounded-lg mb-6">
                <h3 className="font-bold text-lg mb-2">Request Form Guidelines</h3>
                <p className="mb-3">
                  This form is designed to capture details about your piano backing request.
                </p>
                <div className="border-l-4 border-[#F538BC] pl-4">
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
                
                <div className="mt-4">
                  <Button 
                    type="button" 
                    onClick={fillDummyData}
                    className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white"
                  >
                    Fill with Dummy Data
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1 */}
                <div className="border-b pb-6">
                  <h3 className="text-xl font-semibold mb-4 text-[#1C0357]">Section 1: Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <Label htmlFor="songTitle">Song Title *</Label>
                      <Input 
                        id="songTitle" 
                        name="songTitle" 
                        value={formData.songTitle} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="musicalOrArtist">Musical or Artist *</Label>
                      <Input 
                        id="musicalOrArtist" 
                        name="musicalOrArtist" 
                        value={formData.musicalOrArtist} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="category">Category *</Label>
                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                      <SelectTrigger>
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
                  </div>
                  
                  <div className="mt-6">
                    <Label className="text-lg font-semibold text-[#1C0357] mb-3 block">
                      Which type of backing track do you need?
                    </Label>
                    <div className="space-y-4 pl-2">
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="quick-reference"
                          name="trackType"
                          value="quick"
                          className="mt-1 mr-3"
                          checked={formData.trackType === 'quick'}
                          onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                        />
                        <Label htmlFor="quick-reference" className="flex flex-col">
                          <span className="font-bold">Quick Reference (Voice Memo)</span>
                          <span className="text-[#1C0357]">$5 - $10</span>
                          <span className="text-sm mt-1">A fast and rough voice memo ideal for quick learning or audition notes, not suited for professional use.</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="one-take"
                          name="trackType"
                          value="one-take"
                          className="mt-1 mr-3"
                          checked={formData.trackType === 'one-take'}
                          onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                        />
                        <Label htmlFor="one-take" className="flex flex-col">
                          <span className="font-bold">One-Take Recording</span>
                          <span className="text-[#1C0357]">$10 - $15 (Audition Cut) / $15 - $20 (Full Song)</span>
                          <span className="text-sm mt-1">A single-pass, good-quality DAW recording with potential minor errors, suitable for self-tapes and quick references.</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="polished"
                          name="trackType"
                          value="polished"
                          className="mt-1 mr-3"
                          checked={formData.trackType === 'polished'}
                          onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                        />
                        <Label htmlFor="polished" className="flex flex-col">
                          <span className="font-bold">Polished & Accurate Backing</span>
                          <span className="text-[#1C0357]">$15 - $20 (Audition Cut) / $30 - $35 (Full Song)</span>
                          <span className="text-sm mt-1">A refined, accurate track with correct notes and rhythm, ideal for auditions, performances, and dedicated practice.</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="songKey">What key is your song in? (Don't worry if you're unsure)</Label>
                    <Select onValueChange={(value) => handleSelectChange('songKey', value)} value={formData.songKey}>
                      <SelectTrigger>
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
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="differentKey">Do you require it in a different key?</Label>
                    <Select onValueChange={(value) => handleSelectChange('differentKey', value)} value={formData.differentKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="Maybe">Maybe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="keyForTrack">Which key?</Label>
                    <Select onValueChange={(value) => handleSelectChange('keyForTrack', value)} value={formData.keyForTrack}>
                      <SelectTrigger>
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
                  </div>
                </div>

                {/* Section 2 */}
                <div className="border-b pb-6">
                  <h3 className="text-xl font-semibold mb-4 text-[#1C0357]">Section 2: Track Details</h3>
                  
                  <div className="mt-4">
                    <Label htmlFor="youtubeLink" className="flex items-center">
                      <LinkIcon className="mr-2" size={16} />
                      YouTube URL for tempo reference *
                    </Label>
                    <Input 
                      id="youtubeLink" 
                      name="youtubeLink" 
                      value={formData.youtubeLink} 
                      onChange={handleInputChange} 
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="voiceMemo" className="flex items-center">
                      <MicIcon className="mr-2" size={16} />
                      Voice Memo (optional)
                    </Label>
                    <Input 
                      id="voiceMemo" 
                      name="voiceMemo" 
                      value={formData.voiceMemo} 
                      onChange={handleInputChange} 
                      placeholder="Upload a voice memo or provide a link"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="sheetMusic" className="flex items-center">
                      <FileTextIcon className="mr-2" size={16} />
                      Please upload your sheet music as a PDF *
                    </Label>
                    <Input 
                      id="sheetMusic" 
                      name="sheetMusic" 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileChange} 
                      required 
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="trackPurpose">This track is for...</Label>
                    <Select onValueChange={(value) => handleSelectChange('trackPurpose', value)} value={formData.trackPurpose}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal-practise">Personal Practise</SelectItem>
                        <SelectItem value="audition-backing">Audition Backing Track (selftape)</SelectItem>
                        <SelectItem value="melody-bash">Melody/note bash (no formal backing required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="backingType">What do you need?</Label>
                    <Select onValueChange={(value) => handleSelectChange('backingType', value)} value={formData.backingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select backing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-song">Full song backing</SelectItem>
                        <SelectItem value="audition-cut">Audition cut backing</SelectItem>
                        <SelectItem value="note-bash">Note/melody bash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="border-b pb-6">
                  <h3 className="text-xl font-semibold mb-4 text-[#1C0357]">Section 3: Additional Services</h3>
                  
                  <div className="mt-4">
                    <Label htmlFor="deliveryDate" className="flex items-center">
                      <KeyIcon className="mr-2" size={16} />
                      When do you need your track for?
                    </Label>
                    <Input 
                      id="deliveryDate" 
                      name="deliveryDate" 
                      type="date" 
                      value={formData.deliveryDate} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Additional Services</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="rush-order"
                          className="mr-2"
                          checked={formData.additionalServices.includes('rush-order')}
                          onChange={() => handleCheckboxChange('rush-order')}
                        />
                        <Label htmlFor="rush-order" className="flex items-center">
                          <span className="font-medium">Rush Order (24-hour turnaround) +$10</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="complex-songs"
                          className="mr-2"
                          checked={formData.additionalServices.includes('complex-songs')}
                          onChange={() => handleCheckboxChange('complex-songs')}
                        />
                        <Label htmlFor="complex-songs" className="flex items-center">
                          <span className="font-medium">Complex Songs (e.g., Sondheim, JRB, Guettel) +$5–$10</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="additional-edits"
                          className="mr-2"
                          checked={formData.additionalServices.includes('additional-edits')}
                          onChange={() => handleCheckboxChange('additional-edits')}
                        />
                        <Label htmlFor="additional-edits" className="flex items-center">
                          <span className="font-medium">Additional Edits/Revisions +$5 per request</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="exclusive-ownership"
                          className="mr-2"
                          checked={formData.additionalServices.includes('exclusive-ownership')}
                          onChange={() => handleCheckboxChange('exclusive-ownership')}
                        />
                        <Label htmlFor="exclusive-ownership" className="flex items-center">
                          <span className="font-medium">Exclusive Ownership (not uploaded/shared online) $40</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Label htmlFor="specialRequests">Is there anything else you'd like to add?</Label>
                    <Textarea 
                      id="specialRequests" 
                      name="specialRequests" 
                      value={formData.specialRequests} 
                      onChange={handleInputChange} 
                      placeholder="Any special requests or additional information..."
                    />
                  </div>
                </div>

                <div className="text-center">
                  <Button 
                    type="submit" 
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default FormPage;
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { generateEmailCopy, BackingRequest } from "@/utils/emailGenerator";
import { supabase } from '@/integrations/supabase/client';
import { useParams, useLocation, Link } from 'react-router-dom';

const EmailGenerator = () => {
  const { toast } = useToast();
  const { id } = useParams();
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', body: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    song_title: '',
    musical_or_artist: '',
    track_purpose: 'personal-practise',
    backing_type: 'full-song',
    delivery_date: '',
    special_requests: '',
    song_key: 'C Major (0)',
    additional_services: [] as string[],
    track_type: 'polished',
    youtube_link: '',
    voice_memo: ''
  });

  // Prefill form data from request ID or passed state
  useEffect(() => {
    const fetchRequestDetails = async () => {
      // If we have an ID in the URL, fetch the request details
      if (id) {
        try {
          const { data, error } = await supabase
            .from('backing_requests')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          
          setFormData({
            name: data.name || '',
            email: data.email || '',
            song_title: data.song_title || '',
            musical_or_artist: data.musical_or_artist || '',
            track_purpose: data.track_purpose || 'personal-practise',
            backing_type: data.backing_type || 'full-song',
            delivery_date: data.delivery_date || '',
            special_requests: data.special_requests || '',
            song_key: data.song_key || 'C Major (0)',
            additional_services: data.additional_services || [],
            track_type: data.track_type || 'polished',
            youtube_link: data.youtube_link || '',
            voice_memo: data.voice_memo || ''
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: `Failed to fetch request details: ${error.message}`,
            variant: "destructive",
          });
        }
      } 
      // Otherwise, check if we have state passed from navigation
      else if (location.state?.request) {
        const request = location.state.request;
        setFormData({
          name: request.name || '',
          email: request.email || '',
          song_title: request.song_title || '',
          musical_or_artist: request.musical_or_artist || '',
          track_purpose: request.track_purpose || 'personal-practise',
          backing_type: request.backing_type || 'full-song',
          delivery_date: request.delivery_date || '',
          special_requests: request.special_requests || '',
          song_key: request.song_key || 'C Major (0)',
          additional_services: request.additional_services || [],
          track_type: request.track_type || 'polished',
          youtube_link: request.youtube_link || '',
          voice_memo: request.voice_memo || ''
        });
      }
    };
    
    fetchRequestDetails();
  }, [id, location.state, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => {
      const newServices = prev.additional_services.includes(service)
        ? prev.additional_services.filter(s => s !== service)
        : [...prev.additional_services, service];
      return { ...prev, additional_services: newServices };
    });
  };

  const generateEmail = async () => {
    setIsGenerating(true);
    try {
      const request: BackingRequest = {
        name: formData.name,
        email: formData.email,
        song_title: formData.song_title,
        musical_or_artist: formData.musical_or_artist,
        track_purpose: formData.track_purpose,
        backing_type: formData.backing_type,
        delivery_date: formData.delivery_date,
        special_requests: formData.special_requests,
        song_key: formData.song_key,
        additional_services: formData.additional_services,
        track_type: formData.track_type,
        youtube_link: formData.youtube_link,
        voice_memo: formData.voice_memo
      };

      const result = await generateEmailCopy(request);
      setEmailData(result);
      
      toast({
        title: "Email Generated",
        description: "Your email copy has been generated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to generate email: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Text copied to clipboard successfully.",
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Email Generator</h1>
          <p className="text-lg text-[#1C0357]/90">Generate professional email copy for completed backing tracks</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Client Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Izzi Buckler"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Client Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g., izzy@example.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="song_title">Song Title</Label>
                    <Input
                      id="song_title"
                      name="song_title"
                      value={formData.song_title}
                      onChange={handleInputChange}
                      placeholder="e.g., Worth the Breath"
                    />
                  </div>
                  <div>
                    <Label htmlFor="musical_or_artist">Musical/Artist</Label>
                    <Input
                      id="musical_or_artist"
                      name="musical_or_artist"
                      value={formData.musical_or_artist}
                      onChange={handleInputChange}
                      placeholder="e.g., Ben Nicholson and Nick Hedger"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="track_purpose">Track Purpose</Label>
                    <Select onValueChange={(value) => handleSelectChange('track_purpose', value)} value={formData.track_purpose}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal-practise">Personal Practise</SelectItem>
                        <SelectItem value="audition-backing">Audition Backing Track</SelectItem>
                        <SelectItem value="melody-bash">Note/melody bash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="backing_type">Backing Type</Label>
                    <Select onValueChange={(value) => handleSelectChange('backing_type', value)} value={formData.backing_type}>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="track_type">Track Type</Label>
                    <Select onValueChange={(value) => handleSelectChange('track_type', value)} value={formData.track_type}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select track type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick">Quick Reference (Voice Memo)</SelectItem>
                        <SelectItem value="one-take">One-Take Recording</SelectItem>
                        <SelectItem value="polished">Polished & Accurate Backing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="song_key">Song Key</Label>
                    <Select onValueChange={(value) => handleSelectChange('song_key', value)} value={formData.song_key}>
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
                
                <div>
                  <Label htmlFor="delivery_date">Delivery Date</Label>
                  <Input
                    id="delivery_date"
                    name="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label>Additional Services</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="rush-order"
                        className="mr-2"
                        checked={formData.additional_services.includes('rush-order')}
                        onChange={() => handleCheckboxChange('rush-order')}
                      />
                      <Label htmlFor="rush-order">Rush Order (+$10)</Label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="complex-songs"
                        className="mr-2"
                        checked={formData.additional_services.includes('complex-songs')}
                        onChange={() => handleCheckboxChange('complex-songs')}
                      />
                      <Label htmlFor="complex-songs">Complex Songs (+$7)</Label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="additional-edits"
                        className="mr-2"
                        checked={formData.additional_services.includes('additional-edits')}
                        onChange={() => handleCheckboxChange('additional-edits')}
                      />
                      <Label htmlFor="additional-edits">Additional Edits (+$5)</Label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="exclusive-ownership"
                        className="mr-2"
                        checked={formData.additional_services.includes('exclusive-ownership')}
                        onChange={() => handleCheckboxChange('exclusive-ownership')}
                      />
                      <Label htmlFor="exclusive-ownership">Exclusive Ownership (+$40)</Label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="special_requests">Special Requests</Label>
                  <Textarea
                    id="special_requests"
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={handleInputChange}
                    placeholder="Any special requests or notes..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="youtube_link">YouTube Link</Label>
                    <Input
                      id="youtube_link"
                      name="youtube_link"
                      value={formData.youtube_link}
                      onChange={handleInputChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="voice_memo">Voice Memo Link</Label>
                    <Input
                      id="voice_memo"
                      name="voice_memo"
                      value={formData.voice_memo}
                      onChange={handleInputChange}
                      placeholder="https://example.com/voice-memo.mp3"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={(e) => { e.preventDefault(); generateEmail(); }}
                    disabled={isGenerating}
                    className="flex-1 bg-[#1C0357] hover:bg-[#1C0357]/90"
                  >
                    {isGenerating ? 'Generating Email...' : 'Generate Email Copy'}
                  </Button>
                  <Link to="/admin">
                    <Button variant="outline">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Generated Email</CardTitle>
            </CardHeader>
            <CardContent>
              {emailData.subject || emailData.body ? (
                <div className="space-y-6">
                  <div>
                    <Label>Subject</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{emailData.subject}</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => copyToClipboard(emailData.subject)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Email Body</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-gray-500">Preview</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => copyToClipboard(emailData.body)}
                        >
                          Copy
                        </Button>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {emailData.body}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    Fill in the request details and click "Generate Email Copy" to create professional email content.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default EmailGenerator;
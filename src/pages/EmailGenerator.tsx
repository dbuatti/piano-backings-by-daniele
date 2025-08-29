import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { generateCompletionEmail, generatePaymentReminderEmail, generateCompletionAndPaymentEmail, BackingRequest } from "@/utils/emailGenerator";
import { supabase } from '@/integrations/supabase/client';
import { useParams, useLocation, Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Mail, Send, Eye, RefreshCw, Loader2, DollarSign, CheckCircle, Copy } from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing'; // Import pricing utility
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Imported Dialog components

const EmailGenerator = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', html: '' }); // Changed body to html
  const [recipientEmails, setRecipientEmails] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templateType, setTemplateType] = useState<'completion' | 'payment-reminder' | 'completion-payment' | 'custom'>('completion-payment'); // Set 'completion-payment' as default
  const [currentRequest, setCurrentRequest] = useState<BackingRequest | null>(null); // Store the fetched request

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    song_title: '',
    musical_or_artist: '',
    track_purpose: 'personal-practise',
    backing_type: [] as string[],
    delivery_date: '',
    special_requests: '',
    song_key: 'C Major (0)',
    additional_services: [] as string[],
    track_type: 'polished',
    youtube_link: '',
    voice_memo: '',
    additional_links: '',
    track_url: '' // Added track_url to formData
  });

  // Prefill form data from request ID or passed state
  useEffect(() => {
    const fetchRequestDetails = async () => {
      let requestData: any = null;

      if (id) {
        try {
          const { data, error } = await supabase
            .from('backing_requests')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          requestData = data;
        } catch (error: any) {
          toast({
            title: "Error",
            description: `Failed to fetch request details: ${error.message}`,
            variant: "destructive",
          });
        }
      } else if (location.state?.request) {
        requestData = location.state.request;
      }

      if (requestData) {
        setCurrentRequest(requestData); // Store the fetched request
        setFormData({
          id: requestData.id || '',
          name: requestData.name || '',
          email: requestData.email || '',
          song_title: requestData.song_title || '',
          musical_or_artist: requestData.musical_or_artist || '',
          track_purpose: requestData.track_purpose || 'personal-practise',
          backing_type: Array.isArray(requestData.backing_type) ? requestData.backing_type : (requestData.backing_type ? [requestData.backing_type] : []),
          delivery_date: requestData.delivery_date || '',
          special_requests: requestData.special_requests || '',
          song_key: requestData.song_key || 'C Major (0)',
          additional_services: requestData.additional_services || [],
          track_type: requestData.track_type || 'polished',
          youtube_link: requestData.youtube_link || '',
          voice_memo: requestData.voice_memo || '',
          additional_links: requestData.additional_links || '',
          track_url: requestData.track_url || '' // Set track_url
        });
        setRecipientEmails(requestData.email || ''); // Set initial recipient email
      }
    };
    
    fetchRequestDetails();
  }, [id, location.state, toast]);

  // Generate email content whenever templateType or currentRequest changes
  useEffect(() => {
    if (currentRequest) {
      handleGenerateEmail(templateType);
    }
  }, [templateType, currentRequest]); // Regenerate when template or request changes

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

  const handleBackingTypeChange = (type: string, checked: boolean | 'indeterminate') => {
    setFormData(prev => {
      const newBackingTypes = checked
        ? [...prev.backing_type, type]
        : prev.backing_type.filter(t => t !== type);
      return { ...prev, backing_type: newBackingTypes };
    });
  };

  const handleGenerateEmail = async (selectedTemplateType: 'completion' | 'payment-reminder' | 'completion-payment' | 'custom') => {
    if (!currentRequest) {
      toast({
        title: "Error",
        description: "No request data available to generate email.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      let result;
      const requestWithCost: BackingRequest = {
        ...currentRequest,
        cost: calculateRequestCost(currentRequest) // Ensure cost is calculated
      };

      if (selectedTemplateType === 'completion') {
        result = await generateCompletionEmail(requestWithCost);
      } else if (selectedTemplateType === 'payment-reminder') {
        result = await generatePaymentReminderEmail(requestWithCost);
      } else if (selectedTemplateType === 'completion-payment') {
        result = await generateCompletionAndPaymentEmail(requestWithCost);
      } else {
        // For 'custom', we might want to clear or keep current content
        setEmailData({ subject: '', html: '' });
        toast({
          title: "Custom Template Selected",
          description: "You can now write your custom email.",
        });
        setIsGenerating(false);
        return;
      }
      
      setEmailData({ subject: result.subject, html: result.html });
      
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

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to send emails');
      }

      if (!recipientEmails.trim()) {
        throw new Error('Recipient email address(es) cannot be empty.');
      }
      if (!emailData.subject.trim()) {
        throw new Error('Email subject cannot be empty.');
      }
      if (!emailData.html.trim()) {
        throw new Error('Email body cannot be empty.');
      }

      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            to: recipientEmails,
            subject: emailData.subject,
            html: emailData.html,
            senderEmail: 'pianobackingsbydaniele@gmail.com'
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to send email: ${response.status} ${response.statusText}`);
      }
      
      toast({
        title: "Email Sent",
        description: `Email sent to ${recipientEmails}`,
      });
      
      // Optionally clear email fields or navigate away
      setEmailData({ subject: '', html: '' });
      setRecipientEmails('');
      setShowPreview(false);
      setTemplateType('completion-payment'); // Reset to default template type
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast({
        title: "Error",
        description: `Failed to send email: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
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
          <p className="text-lg text-[#1C0357]/90">Generate and send emails for backing track requests</p>
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
                      disabled // Disable editing if loaded from request
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
                      disabled // Disable editing if loaded from request
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
                      disabled // Disable editing if loaded from request
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
                      disabled // Disable editing if loaded from request
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="track_purpose">Track Purpose</Label>
                    <Select onValueChange={(value) => handleSelectChange('track_purpose', value)} value={formData.track_purpose} disabled>
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
                    <Label>Backing Type(s)</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="backing-full-song"
                          checked={formData.backing_type.includes('full-song')}
                          onCheckedChange={(checked) => handleBackingTypeChange('full-song', checked)}
                          className="mr-2"
                          disabled // Disable editing if loaded from request
                        />
                        <Label htmlFor="backing-full-song">Full Song Backing</Label>
                      </div>
                      <div className="flex items-center">
                        <Checkbox
                          id="backing-audition-cut"
                          checked={formData.backing_type.includes('audition-cut')}
                          onCheckedChange={(checked) => handleBackingTypeChange('audition-cut', checked)}
                          className="mr-2"
                          disabled // Disable editing if loaded from request
                        />
                        <Label htmlFor="backing-audition-cut">Audition Cut Backing</Label>
                      </div>
                      <div className="flex items-center">
                        <Checkbox
                          id="backing-note-bash"
                          checked={formData.backing_type.includes('note-bash')}
                          onCheckedChange={(checked) => handleBackingTypeChange('note-bash', checked)}
                          className="mr-2"
                          disabled // Disable editing if loaded from request
                        />
                        <Label htmlFor="backing-note-bash">Note/Melody Bash</Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="track_type">Track Type</Label>
                    <Select onValueChange={(value) => handleSelectChange('track_type', value)} value={formData.track_type} disabled>
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
                    <Select onValueChange={(value) => handleSelectChange('song_key', value)} value={formData.song_key} disabled>
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
                    disabled // Disable editing if loaded from request
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
                        disabled // Disable editing if loaded from request
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
                        disabled // Disable editing if loaded from request
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
                        disabled // Disable editing if loaded from request
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
                        disabled // Disable editing if loaded from request
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
                    disabled // Disable editing if loaded from request
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
                      disabled // Disable editing if loaded from request
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
                      disabled // Disable editing if loaded from request
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="additional_links">Additional Links</Label>
                  <Input
                    id="additional_links"
                    name="additional_links"
                    value={formData.additional_links}
                    onChange={handleInputChange}
                    placeholder="e.g., Dropbox link, Spotify link"
                    disabled // Disable editing if loaded from request
                  />
                </div>
                
                <div className="flex gap-4">
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
              <div className="space-y-6">
                <div>
                  <Label htmlFor="template-type">Select Template</Label>
                  <Select onValueChange={(value: 'completion' | 'payment-reminder' | 'completion-payment' | 'custom') => setTemplateType(value)} value={templateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an email template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completion">Completion Email</SelectItem>
                      <SelectItem value="payment-reminder">Payment Reminder</SelectItem>
                      <SelectItem value="completion-payment">Completion & Payment Reminder</SelectItem>
                      <SelectItem value="custom">Custom Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recipient-emails">Recipient Email(s)</Label>
                  <Textarea
                    id="recipient-emails"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    placeholder="client@example.com, another@example.com"
                    rows={2}
                    className="w-full p-2 border rounded-md mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter multiple emails separated by commas.</p>
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <div className="mt-1 relative">
                    <Input
                      id="subject"
                      value={emailData.subject}
                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email Subject"
                      className="pr-10"
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(emailData.subject)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="html-content">Email Body (HTML)</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleGenerateEmail(templateType)} // Regenerate current template
                        disabled={isGenerating || templateType === 'custom'}
                        className="flex items-center"
                      >
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Generate
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPreview(true)}
                        className="flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="html-content"
                    value={emailData.html}
                    onChange={(e) => setEmailData(prev => ({ ...prev, html: e.target.value }))}
                    placeholder="Enter your HTML email content here..."
                    rows={12}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    onClick={handleSendEmail}
                    disabled={isSending || !recipientEmails.trim() || !emailData.subject.trim() || !emailData.html.trim()}
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Email Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Email Preview
              </DialogTitle>
            </DialogHeader>
            <div className="border rounded-md p-4 bg-gray-50 min-h-[200px]">
              <h3 className="font-semibold mb-2">Subject: {emailData.subject}</h3>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: emailData.html }} 
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowPreview(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default EmailGenerator;
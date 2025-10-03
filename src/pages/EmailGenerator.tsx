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
import { 
  Mail, Send, Eye, RefreshCw, Loader2, DollarSign, CheckCircle, Copy, Music, User, Calendar, Headphones, Target, Key, Link as LinkIcon, FileText,
  Clock, XCircle // Imported missing icons
} from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getSafeBackingTypes } from '@/utils/helpers'; // Import getSafeBackingTypes

const EmailGenerator = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', html: '' });
  const [recipientEmails, setRecipientEmails] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templateType, setTemplateType] = useState<'completion' | 'payment-reminder' | 'completion-payment' | 'custom'>('completion-payment');
  const [currentRequest, setCurrentRequest] = useState<BackingRequest | null>(null);

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
        setCurrentRequest(requestData);
        setRecipientEmails(requestData.email || '');
      }
    };
    
    fetchRequestDetails();
  }, [id, location.state, toast]);

  // Generate email content whenever templateType or currentRequest changes
  useEffect(() => {
    if (currentRequest) {
      handleGenerateEmail(templateType);
    }
  }, [templateType, currentRequest]);

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
        cost: calculateRequestCost(currentRequest).totalCost
      };

      if (selectedTemplateType === 'completion') {
        result = await generateCompletionEmail(requestWithCost);
      } else if (selectedTemplateType === 'payment-reminder') {
        result = await generatePaymentReminderEmail(requestWithCost);
      } else if (selectedTemplateType === 'completion-payment') {
        result = await generateCompletionAndPaymentEmail(requestWithCost);
      } else {
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
      
      setEmailData({ subject: '', html: '' });
      setRecipientEmails('');
      setShowPreview(false);
      setTemplateType('completion-payment');
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

  const getStatusBadge = (status: string | undefined) => { // status can be undefined
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

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
              {currentRequest ? (
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium flex items-center">
                      <Music className="mr-2 h-4 w-4 text-gray-600" />
                      Song: <span className="ml-1 font-bold">{currentRequest.song_title}</span>
                    </div>
                    {getStatusBadge(currentRequest.status)}
                  </div>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-gray-600" />
                    Client: <span className="ml-1 font-medium">{currentRequest.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-gray-600" />
                    Email: <span className="ml-1 font-medium">{currentRequest.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-600" />
                    Submitted: <span className="ml-1 font-medium">{currentRequest.created_at ? format(new Date(currentRequest.created_at), 'MMM dd, yyyy') : 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <Headphones className="mr-2 h-4 w-4 text-gray-600" />
                    Type: <span className="ml-1 font-medium capitalize">
                      {getSafeBackingTypes(currentRequest.backing_type).map(t => t.replace('-', ' ')).join(', ') || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Key className="mr-2 h-4 w-4 text-gray-600" />
                    Key: <span className="ml-1 font-medium">{currentRequest.song_key || 'N/A'}</span>
                  </div>
                  {currentRequest.youtube_link && (
                    <div className="flex items-center">
                      <LinkIcon className="mr-2 h-4 w-4 text-gray-600" />
                      YouTube: <a href={currentRequest.youtube_link} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline truncate">{currentRequest.youtube_link}</a>
                    </div>
                  )}
                  {currentRequest.special_requests && (
                    <div>
                      <div className="font-medium flex items-center mb-1">
                        <FileText className="mr-2 h-4 w-4 text-gray-600" />
                        Special Requests:
                      </div>
                      <p className="ml-6 text-gray-700 whitespace-pre-wrap">{currentRequest.special_requests}</p>
                    </div>
                  )}
                  <div className="pt-4">
                    <Link to={`/admin/request/${currentRequest.id}`}>
                      <Button variant="outline" className="w-full">
                        <Eye className="mr-2 h-4 w-4" /> View Full Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No request selected. Please navigate from the Admin Dashboard.</p>
              )}
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
                  <Input
                    id="recipient-emails"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    placeholder="client@example.com, another@example.com"
                    className="mt-1"
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
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox"; // Removed as it was unused
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import {
  Mail, Send, Eye, RefreshCw, Loader2, DollarSign, CheckCircle, Copy, Music, User, Calendar, Headphones, Key, Link as LinkIcon, FileText, // Removed Target
  Clock, XCircle, List, Image // Removed Search
} from 'lucide-react';
import { format } from 'date-fns';
import { generateCompletionEmail, generatePaymentReminderEmail, generateCompletionAndPaymentEmail } from '@/utils/emailGenerator';
import GmailOAuthButton from '@/components/GmailOAuthButton';
import { useQuery } from '@tanstack/react-query';

interface TrackInfo {
  url: string;
  caption: string;
}

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string | string[];
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: TrackInfo[];
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number;
  track_purpose: string;
  special_requests: string;
  song_key: string;
  different_key: string;
  key_for_track: string;
  voice_memo: string;
  voice_memo_file_url?: string;
  sheet_music_url?: string;
  youtube_link?: string;
  additional_links?: string;
  additional_services: string[];
  track_type: string;
}

const EmailGenerator = () => {
  const [requestId, setRequestId] = useState('');
  const [emailType, setEmailType] = useState<'completion' | 'payment-reminder' | 'completion-and-payment'>('completion');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const fetchRequest = useCallback(async () => {
    if (!requestId) return null;
    const { data, error } = await supabase
      .from('backing_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (error) throw error;
    return data;
  }, [requestId]);

  const { data: request, isLoading: isLoadingRequest, error: requestError, refetch } = useQuery<BackingRequest, Error>({
    queryKey: ['emailGeneratorRequest', requestId],
    queryFn: fetchRequest,
    enabled: !!requestId,
  });

  const generateEmailContent = useCallback(async () => {
    if (!request) {
      setGeneratedSubject('');
      setGeneratedHtml('');
      return;
    }

    setLoadingEmail(true);
    try {
      let emailContent;
      if (emailType === 'completion') {
        emailContent = await generateCompletionEmail(request);
      } else if (emailType === 'payment-reminder') {
        emailContent = await generatePaymentReminderEmail(request);
      } else if (emailType === 'completion-and-payment') {
        emailContent = await generateCompletionAndPaymentEmail(request);
      }

      setGeneratedSubject(emailContent?.subject || 'Generated Email');
      setGeneratedHtml(emailContent?.html || 'Failed to generate email content.');
      toast({
        title: "Email Generated",
        description: "Email content has been successfully generated.",
      });
    } catch (err: any) {
      console.error('Error generating email content:', err);
      toast({
        title: "Error",
        description: `Failed to generate email: ${err.message}`,
        variant: "destructive",
      });
      setGeneratedSubject('Error Generating Email');
      setGeneratedHtml(`<p style="color: red;">Failed to generate email content: ${err.message}</p>`);
    } finally {
      setLoadingEmail(false);
    }
  }, [request, emailType, toast]);

  useEffect(() => {
    generateEmailContent();
  }, [generateEmailContent]);

  const sendEmail = async () => {
    if (!request || !generatedSubject || !generatedHtml) {
      toast({
        title: "Error",
        description: "No email content to send or request details missing.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: request.email,
          subject: generatedSubject,
          html: generatedHtml,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Email Sent",
        description: `Email successfully sent to ${request.email}.`,
      });
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast({
        title: "Error Sending Email",
        description: `Failed to send email: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: message,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardHeader className="bg-[#1C0357] text-white">
            <CardTitle className="text-2xl flex items-center">
              <Mail className="mr-2" />
              Email Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="requestId" className="flex items-center text-sm mb-1">
                  Request ID
                </Label>
                <div className="relative">
                  <Input
                    id="requestId"
                    type="text"
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                    placeholder="Enter Request ID"
                    className="pl-8 py-2 text-sm"
                  />
                  <Music className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                </div>
                {isLoadingRequest && <p className="text-sm text-gray-500 mt-1">Loading request...</p>}
                {requestError && <p className="text-sm text-red-500 mt-1">Error: {requestError.message}</p>}
                {request && (
                  <div className="mt-2 p-3 border rounded-md bg-blue-50">
                    <p className="font-medium text-[#1C0357]">{request.song_title} by {request.musical_or_artist}</p>
                    <p className="text-sm text-gray-600">To: {request.name} ({request.email})</p>
                    <p className="text-sm text-gray-600">Status: {request.status} | Paid: {request.is_paid ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="emailType" className="flex items-center text-sm mb-1">
                  Email Type
                </Label>
                <div className="relative">
                  <Select onValueChange={(value: 'completion' | 'payment-reminder' | 'completion-and-payment') => setEmailType(value)} value={emailType}>
                    <SelectTrigger className="pl-8 py-2 text-sm">
                      <SelectValue placeholder="Select email type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completion">Completion Email</SelectItem>
                      <SelectItem value="payment-reminder">Payment Reminder</SelectItem>
                      <SelectItem value="completion-and-payment">Completion & Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <List className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                </div>
              </div>
            </div>

            <Button onClick={generateEmailContent} disabled={!requestId || isLoadingRequest || loadingEmail} className="w-full bg-[#F538BC] hover:bg-[#F538BC]/90">
              {loadingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Generate Email
                </>
              )}
            </Button>

            {generatedSubject && (
              <div className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="subject" className="flex items-center text-sm mb-1">
                    Subject
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedSubject, "Subject copied to clipboard!")} className="ml-2 h-6 w-6 p-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </Label>
                  <Input id="subject" value={generatedSubject} readOnly className="py-2 text-sm" />
                </div>

                <div>
                  <Label htmlFor="htmlContent" className="flex items-center text-sm mb-1">
                    HTML Content
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedHtml, "HTML content copied to clipboard!")} className="ml-2 h-6 w-6 p-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </Label>
                  <Textarea
                    id="htmlContent"
                    value={generatedHtml}
                    readOnly
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={sendEmail} disabled={isSending || !request} className="w-full sm:w-auto bg-[#1C0357] hover:bg-[#1C0357]/90">
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Send Email
                      </>
                    )}
                  </Button>
                  <GmailOAuthButton className="w-full sm:w-auto" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default EmailGenerator;
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';

const TestEmail = () => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: 'Test Email from Piano Backings',
    template: `Dear {{name}},

This is a test email from Piano Backings by Daniele.

Your backing track for "{{songTitle}}" is ready for download.

Best regards,
Daniele Buatti
Piano Backings by Daniele`
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to send emails');
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
            to: emailData.to,
            subject: emailData.subject,
            template: emailData.template,
            requestData: {
              name: 'Test User',
              songTitle: 'Test Song'
            }
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      
      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send email: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Test Email Function</h1>
          <p className="text-lg text-[#1C0357]/90">Test the email sending functionality</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Send Test Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="to">Recipient Email</Label>
                <Input
                  id="to"
                  name="to"
                  type="email"
                  value={emailData.to}
                  onChange={handleInputChange}
                  placeholder="recipient@example.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={emailData.subject}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="template">Email Template</Label>
                <Textarea
                  id="template"
                  name="template"
                  value={emailData.template}
                  onChange={handleInputChange}
                  rows={10}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleSendEmail}
                  disabled={isSending || !emailData.to}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                >
                  {isSending ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-bold text-[#1C0357] mb-4">How to Test</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Make sure you have set your `RESEND_API_KEY` secret in Supabase.</li>
            <li>Enter a recipient email address (you can use your own email for testing).</li>
            <li>Optionally customize the subject and email template.</li>
            <li>Click "Send Test Email".</li>
            <li>Check the recipient's inbox for the email. It will be sent from `onboarding@resend.dev` (Resend's default for free tier).</li>
          </ol>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TestEmail;
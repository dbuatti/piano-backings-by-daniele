import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send } from 'lucide-react';
import GmailOAuthButton from '@/components/GmailOAuthButton';
import ErrorDisplay from '@/components/ErrorDisplay';

const TestEmail = () => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<any>(null);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: 'Test Email from Piano Backings',
    html: `<p>Dear {{name}},</p>

<p>This is a test email from Piano Backings by Daniele.</p>

<p>Your backing track for "{{songTitle}}" is ready for download.</p>

<p>Best regards,<br>
Daniele Buatti<br>
Piano Backings by Daniele</p>`
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setError(null);
    
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to send emails');
      }

      // Replace placeholders in the HTML content
      let finalHtmlContent = emailData.html;
      finalHtmlContent = finalHtmlContent.replace(/\{\{name\}\}/g, 'Test User');
      finalHtmlContent = finalHtmlContent.replace(/\{\{songTitle\}\}/g, 'Test Song');
      
      // Define the sender email (this should be the email that has been OAuth'd)
      const senderEmail = 'pianobackingsbydaniele@gmail.com';
      
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
            html: finalHtmlContent,
            senderEmail: senderEmail // Explicitly pass the senderEmail
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to send email: ${response.status} ${response.statusText}`);
      }
      
      toast({
        title: "Success",
        description: result.message,
      });
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err);
      toast({
        title: "Error",
        description: `Failed to send email: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="py-4"> {/* Adjusted padding for embedding */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Test Email Function</h1>
        <p className="text-lg md:text-xl font-light text-[#1C0357]/90">Test the email sending functionality</p>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Send Test Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h2 className="text-lg font-bold text-[#1C0357] mb-2">Step 1: Connect Gmail</h2>
            <p className="mb-3">
              Before sending emails, you need to connect your Gmail account. 
              <strong> Important:</strong> You must use the pianobackingsbydaniele@gmail.com account for OAuth to send emails from that address.
            </p>
            <GmailOAuthButton />
          </div>

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
              <Label htmlFor="html">Email Template (HTML)</Label>
              <Textarea
                id="html"
                name="html"
                value={emailData.html}
                onChange={handleInputChange}
                rows={10}
                className="mt-1 font-mono text-sm"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !emailData.to}
                className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSending ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="mt-6">
              <ErrorDisplay error={error} title="Email Sending Error" />
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-bold text-[#1C0357] mb-4">How to Test</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Click the "Connect Gmail Account" button above and log in with pianobackingsbydaniele@gmail.com</li>
          <li>Enter a recipient email address (you can use your own email for testing).</li>
          <li>Optionally customize the subject and email template (use HTML).</li>
          <li>Click "Send Test Email".</li>
          <li>Check the recipient's inbox for the email.</li>
        </ol>
        
        <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
          <h3 className="font-bold text-[#1C0357] mb-2">Troubleshooting Tips</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Make sure you've completed the Gmail OAuth flow with pianobackingsbydaniele@gmail.com</li>
            <li>Check that all required environment variables are set in Supabase</li>
            <li>Ensure your Google Cloud project is properly configured</li>
            <li>Verify that the Gmail API is enabled in your Google Cloud project</li>
          </ul>
        </div>
        
        <div className="mt-6 p-4 bg-red-100 rounded-lg border border-red-300">
          <h3 className="font-bold text-red-800 mb-2">Important: Enable Gmail API</h3>
          <p className="mb-3">
            If you're getting a "Gmail API has not been used in project" error, you need to enable the Gmail API in your Google Cloud project:
          </p>
          <ol className="list-decimal pl-5 space-y-1 mb-3">
            <li>Go to the <a href="https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=138848645565" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Gmail API page in Google Cloud Console</a></li>
            <li>Click "Enable" if the API is not already enabled</li>
            <li>Wait 5-10 minutes for the changes to propagate</li>
            <li>Try sending the test email again</li>
          </ol>
          <p className="text-sm text-red-700">
            <strong>Note:</strong> After enabling the API, you may need to re-authenticate by clicking "Connect Gmail Account" again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestEmail;
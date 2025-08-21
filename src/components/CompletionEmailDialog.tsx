import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Eye } from 'lucide-react';

interface CompletionEmailDialogProps {
  requestId: string;
  clientEmail: string;
  clientName: string;
  songTitle: string;
  trackUrl?: string;
}

const CompletionEmailDialog = ({ 
  requestId, 
  clientEmail, 
  clientName, 
  songTitle,
  trackUrl
}: CompletionEmailDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Your "${songTitle}" backing track is ready!`);
  const [showPreview, setShowPreview] = useState(false);

  // Generate the default email content
  const generateDefaultEmailContent = () => {
    return `Hi ${clientName},

Great news! Your custom piano backing track for "${songTitle}" is now complete and ready for your use.

${trackUrl ? `You can download your track here: ${trackUrl}` : 'You can access your track through your dashboard.'}

If you have any questions or need any adjustments, please don't hesitate to reach out.

Thank you for choosing Piano Backings by Daniele!`;
  };

  // Generate the email signature
  const emailSignature = `
Warmly,

Daniele Buatti
Piano Backings by Daniele
https://pianobackings.com
`;

  // Set default content when dialog opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const defaultContent = generateDefaultEmailContent();
      setEmailContent(defaultContent);
      setShowPreview(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to send emails');
      }

      // Combine content with signature
      const finalEmailContent = `${emailContent}\n\n${emailSignature}`;

      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            to: clientEmail,
            subject: emailSubject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Hi ${clientName},</p>

  <p>Great news! Your custom piano backing track for <strong>"${songTitle}"</strong> is now complete and ready for your use.</p>

  ${trackUrl ? 
    `<p>You can download your track using the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${trackUrl}" 
         style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Download Your Track
      </a>
    </p>` : 
    '<p>You can access your track through your dashboard.</p>'}

  <p>If you have any questions or need any adjustments, please don't hesitate to reach out.</p>

  <p>Thank you for choosing Piano Backings by Daniele!</p>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="margin: 0;"><strong>Warmly,</strong></p>
    <p style="margin: 0;"><strong>Daniele Buatti</strong></p>
    <p style="margin: 5px 0 0 0; color: #1C0357;"><strong>Piano Backings by Daniele</strong></p>
    <p style="margin: 5px 0 0 0;">
      <a href="https://pianobackings.com" style="color: #1C0357; text-decoration: none;">pianobackings.com</a>
    </p>
  </div>
</div>`,
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
        description: `Completion email sent to ${clientEmail}`,
      });
      
      setIsOpen(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          Email Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Send Completion Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <input
              id="subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full p-2 border rounded-md mt-1"
            />
          </div>
          
          {!showPreview ? (
            <>
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="content">Email Content</Label>
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
                <Textarea
                  id="content"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Enter your message here..."
                  rows={12}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              
              <div className="text-sm text-gray-500">
                <p><strong>To:</strong> {clientEmail}</p>
                <p><strong>Client:</strong> {clientName}</p>
                <p><strong>Song:</strong> {songTitle}</p>
                {trackUrl && <p><strong>Track URL:</strong> {trackUrl}</p>}
              </div>
            </>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Email Preview</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPreview(false)}
                >
                  Edit
                </Button>
              </div>
              <div className="border rounded-md p-4 bg-gray-50 min-h-[200px]">
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Hi ${clientName},</p>

  <p>Great news! Your custom piano backing track for <strong>"${songTitle}"</strong> is now complete and ready for your use.</p>

  ${trackUrl ? 
    `<p>You can download your track using the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${trackUrl}" 
         style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Download Your Track
      </a>
    </p>` : 
    '<p>You can access your track through your dashboard.</p>'}

  <p>If you have any questions or need any adjustments, please don't hesitate to reach out.</p>

  <p>Thank you for choosing Piano Backings by Daniele!</p>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="margin: 0;"><strong>Warmly,</strong></p>
    <p style="margin: 0;"><strong>Daniele Buatti</strong></p>
    <p style="margin: 5px 0 0 0; color: #1C0357;"><strong>Piano Backings by Daniele</strong></p>
    <p style="margin: 5px 0 0 0;">
      <a href="https://pianobackings.com" style="color: #1C0357; text-decoration: none;">pianobackings.com</a>
    </p>
  </div>
</div>` 
                  }} 
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={isSending}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionEmailDialog;
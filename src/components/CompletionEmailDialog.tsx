import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Eye, RefreshCw } from 'lucide-react';

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

  // Generate the default email content as full HTML
  const generateDefaultEmailHtml = (name: string, title: string, url?: string) => {
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
  <p>Hi ${name},</p>

  <p>I hope this email finds you well!</p>

  <p>I'm excited to let you know that your custom piano backing track for <strong>"${title}"</strong> is now complete and ready for you.</p>

  ${url ? 
    `<p style="margin-top: 20px;">You can download your track directly using the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${url}" 
         style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Download Your Track
      </a>
    </p>
    <p>Please let me know if you have any trouble accessing it.</p>` : 
    `<p style="margin-top: 20px;">Your track details are now available. You can view your request and access your track (once uploaded) using the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${window.location.origin}/track/${requestId}?email=${encodeURIComponent(clientEmail)}" 
         style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        View Your Track Details
      </a>
    </p>`}

  <p style="margin-top: 20px;">I've put a lot of care into crafting this track for you. If, after listening, you feel any adjustments are needed—whether it's a slight tempo change, dynamics, or anything else—please don't hesitate to reply to this email. I'm happy to make revisions to ensure it's perfect for your needs.</p>

  <p>Thank you so much for choosing Piano Backings by Daniele.</p>

  <p style="margin-top: 20px;">Warmly,</p>
  <p style="margin: 0; font-weight: bold;">Daniele Buatti</p>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td valign="top" style="padding-right: 20px; width: 150px;">
          <p style="margin: 0; font-weight: bold; color: #F538BC; font-size: 18px;">Daniele Buatti</p>
          <p style="margin: 5px 0 0 0; color: #1C0357; font-size: 14px;">Piano Backings by Daniele</p>
        </td>
        <td valign="top" style="border-left: 2px solid #F538BC; padding-left: 20px;">
          <p style="margin: 0; color: #333;"><strong style="color: #1C0357;">M</strong> 0424 174 067</p>
          <p style="margin: 5px 0; color: #333;"><strong style="color: #1C0357;">E</strong> <a href="mailto:pianobackingsbydaniele@gmail.com" style="color: #007bff; text-decoration: none;">pianobackingsbydaniele@gmail.com</a></p>
          <p style="margin: 10px 0 5px 0; font-weight: bold; color: #1C0357;">Piano Backings By Daniele</p>
          <p style="margin: 0;"><a href="https://www.facebook.com/PianoBackingsbyDaniele/" style="color: #007bff; text-decoration: none;">www.facebook.com/PianoBackingsbyDaniele/</a></p>
          <div style="margin-top: 15px;">
            <a href="https://www.facebook.com/PianoBackingsbyDaniele/" target="_blank" style="display: inline-block; margin-right: 5px;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/1200px-2021_Facebook_icon.svg.png" alt="Facebook" width="24" height="24" style="vertical-align: middle;">
            </a>
            <a href="https://www.youtube.com/@pianobackingsbydaniele" target="_blank" style="display: inline-block; margin-right: 5px;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1200px-YouTube_full-color_icon_%282017%29.svg.png" alt="YouTube" width="24" height="24" style="vertical-align: middle;">
            </a>
            <a href="https://www.instagram.com/pianobackingsbydaniele/" target="_blank" style="display: inline-block;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/1200px-Instagram_logo_2016.svg.png" alt="Instagram" width="24" height="24" style="vertical-align: middle;">
            </a>
          </div>
        </td>
      </tr>
    </table>
  </div>
</div>`;
  };

  // Set default content when dialog opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setEmailContent(generateDefaultEmailHtml(clientName, songTitle, trackUrl));
      setShowPreview(false);
    }
  };

  const handleResetContent = () => {
    setEmailContent(generateDefaultEmailHtml(clientName, songTitle, trackUrl));
    toast({
      title: "Content Reset",
      description: "Email content has been reset to default.",
    });
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
            to: clientEmail,
            subject: emailSubject,
            html: emailContent, // Use the edited HTML content directly
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
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="content">Email Content (HTML)</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResetContent}
                      className="flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
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
                  dangerouslySetInnerHTML={{ __html: emailContent }} 
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
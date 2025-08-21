import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send } from 'lucide-react';

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

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to send emails');
      }

      // Create email content with track URL if available
      const finalEmailContent = emailContent || `
Hi ${clientName},

Great news! Your custom piano backing track for "${songTitle}" is now complete and ready for your use.

${trackUrl ? `You can download your track here: ${trackUrl}` : 'You can access your track through your dashboard.'}

If you have any questions or need any adjustments, please don't hesitate to reach out.

Thank you for choosing Piano Backings by Daniele!

Warmly,
Daniele Buatti
Piano Backings by Daniele
`;

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
            html: `<p>${finalEmailContent.replace(/\n/g, '</p><p>')}</p>`,
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          Email Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
          
          <div>
            <Label htmlFor="content">Email Content</Label>
            <Textarea
              id="content"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Enter your message here..."
              rows={8}
              className="mt-1"
            />
          </div>
          
          <div className="text-sm text-gray-500">
            <p><strong>To:</strong> {clientEmail}</p>
            <p><strong>Client:</strong> {clientName}</p>
            <p><strong>Song:</strong> {songTitle}</p>
          </div>
          
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
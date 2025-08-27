"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Eye, RefreshCw, DollarSign } from 'lucide-react';

interface PaymentReminderEmailDialogProps {
  requestId: string;
  clientEmail: string;
  clientName: string;
  songTitle: string;
  cost: number; // Pass the calculated cost
}

const PaymentReminderEmailDialog = ({ 
  requestId, 
  clientEmail, 
  clientName, 
  songTitle,
  cost
}: PaymentReminderEmailDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Payment Reminder: Your Piano Backing Track for "${songTitle}"`);
  const [recipientEmails, setRecipientEmails] = useState(clientEmail);
  const [showPreview, setShowPreview] = useState(false);

  const generateDefaultEmailHtml = (name: string, title: string, trackCost: number) => {
    const firstName = name.split(' ')[0];
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
  <p>Hi ${firstName},</p>

  <p>I hope you're having a good week!</p>

  <p>This is a friendly reminder regarding your recent piano backing track request for <strong>"${title}"</strong>.</p>

  <p style="margin-top: 20px; font-size: 1.1em; font-weight: bold; color: #1C0357;">
    The estimated cost for your track is: $${trackCost.toFixed(2)}
  </p>

  <p>You can view the full details of your request and make your payment via the link below:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${window.location.origin}/track/${requestId}?email=${encodeURIComponent(clientEmail)}" 
       style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
      View Request & Make Payment
    </a>
  </p>

  <p style="margin-top: 20px;">
    Alternatively, you can pay directly using one of the methods below:
  </p>
  <ul style="list-style: none; padding: 0; margin-top: 10px;">
    <li style="margin-bottom: 10px;">
      <strong>Buy Me a Coffee (Preferred):</strong> <a href="https://buymeacoffee.com/Danielebuatti" target="_blank" style="color: #007bff; text-decoration: none;">https://buymeacoffee.com/Danielebuatti</a>
    </li>
    <li>
      <strong>Direct Bank Transfer:</strong><br>
      BSB: 923100<br>
      Account: 301110875
    </li>
  </ul>

  <p style="margin-top: 20px;">
    Please let me know if you have any questions or if there's anything else I can assist you with.
  </p>

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
          <p style="margin: 0;"><a href="https://www.facebook.com/PianoBackingsbyDaniele/" target="_blank" style="color: #007bff; text-decoration: none;">www.facebook.com/PianoBackingsbyDaniele/</a></p>
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setEmailContent(generateDefaultEmailHtml(clientName, songTitle, cost));
      setRecipientEmails(clientEmail);
      setShowPreview(false);
    }
  };

  const handleResetContent = () => {
    setEmailContent(generateDefaultEmailHtml(clientName, songTitle, cost));
    toast({
      title: "Content Reset",
      description: "Email content has been reset to default.",
    });
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
            subject: emailSubject,
            html: emailContent,
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
        description: `Payment reminder email sent to ${recipientEmails}`,
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
        <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50">
          <DollarSign className="w-4 h-4 mr-2" />
          Payment Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Send Payment Reminder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
                <p><strong>Client:</strong> {clientName}</p>
                <p><strong>Song:</strong> {songTitle}</p>
                <p><strong>Estimated Cost:</strong> ${cost.toFixed(2)}</p>
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
              disabled={isSending || !recipientEmails.trim()}
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

export default PaymentReminderEmailDialog;
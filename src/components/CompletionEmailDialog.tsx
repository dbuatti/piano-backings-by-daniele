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
  musicalOrArtist: string; // Added musicalOrArtist
  trackUrl?: string;
  sharedLink?: string; // Added sharedLink for client view
  backingType: string; // Added backingType for pricing
  additionalServices: string[]; // Added additionalServices for pricing
  cost: number; // Added cost for pricing
}

const CompletionEmailDialog = ({ 
  requestId, 
  clientEmail, 
  clientName, 
  songTitle,
  musicalOrArtist,
  trackUrl,
  sharedLink,
  backingType,
  additionalServices,
  cost
}: CompletionEmailDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Your "${songTitle}" backing track is ready!`);
  const [showPreview, setShowPreview] = useState(false);

  // Helper function to get service display names and prices
  const getServiceDetails = (serviceId: string) => {
    switch (serviceId) {
      case 'rush-order': return { name: 'Rush Order', price: 10 };
      case 'complex-songs': return { name: 'Complex Songs', price: 7 };
      case 'additional-edits': return { name: 'Additional Edits', price: 5 };
      case 'exclusive-ownership': return { name: 'Exclusive Ownership', price: 40 };
      default: return { name: serviceId, price: 0 };
    }
  };

  // Generate the default email content
  const generateDefaultEmailContent = () => {
    let basePrice = 0;
    let backingTypeName = '';
    switch (backingType) {
      case 'full-song':
        basePrice = 30;
        backingTypeName = 'Full Song Backing';
        break;
      case 'audition-cut':
        basePrice = 15;
        backingTypeName = 'Audition Cut Backing';
        break;
      case 'note-bash':
        basePrice = 10;
        backingTypeName = 'Note/Melody Bash';
        break;
      default:
        basePrice = 0;
        backingTypeName = 'Backing Track';
    }

    const servicesList = additionalServices.map(serviceId => {
      const detail = getServiceDetails(serviceId);
      return `• ${detail.name}: $${detail.price}`;
    }).join('\n');

    return `Hi ${clientName},

Great news! Your custom piano backing track for "${songTitle}" from ${musicalOrArtist} is now complete and ready for your use.

Here's a breakdown of the work completed:
• ${backingTypeName}: $${basePrice}
${servicesList ? servicesList + '\n' : ''}
Total amount: $${cost.toFixed(2)}

You can download your track here:
${trackUrl || 'Track download link not available yet.'}

You can also view all your request details and tracks on your personal dashboard:
${sharedLink || 'Dashboard link not available.'}

If you have any questions or need any adjustments—tempo, dynamics, or anything else—just reply to this email, and I'll happily adjust it for you.

Thank you so much for choosing Piano Backings by Daniele. I'm genuinely excited to hear how your audition/performance goes!`;
  };

  // Generate the email signature
  const emailSignature = `
Warmly,

Daniele Buatti
Piano Backings by Daniele
https://pianobackings.com
https://www.youtube.com/@pianobackingsbydaniele
https://www.instagram.com/pianobackingsbydaniele/
https://www.facebook.com/PianoBackingsbyDaniele
`;

  // Set default content when dialog opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const defaultContent = generateDefaultEmailContent();
      setEmailContent(defaultContent);
      setEmailSubject(`Your "${songTitle}" backing track is ready!`);
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

      // Generate HTML for the email body
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <p>Hi ${clientName},</p>

          <p>Great news! Your custom piano backing track for <strong>"${songTitle}"</strong> from <strong>${musicalOrArtist}</strong> is now complete and ready for your use.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1C0357;">Pricing Breakdown</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li><strong>${backingType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</strong> $${backingType === 'full-song' ? 30 : backingType === 'audition-cut' ? 15 : backingType === 'note-bash' ? 10 : 0}</li>
              ${additionalServices.map(serviceId => {
                const detail = getServiceDetails(serviceId);
                return `<li><strong>${detail.name}:</strong> $${detail.price}</li>`;
              }).join('')}
              <li style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;"><strong>Total Amount:</strong> $${cost.toFixed(2)}</li>
            </ul>
          </div>

          ${trackUrl ? 
            `<p>You can download your track using the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${trackUrl}" 
                 style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Download Your Track
              </a>
            </p>` : 
            '<p>Your track is ready! Please contact Daniele if you do not see a download link.</p>'}

          ${sharedLink ? 
            `<p>You can also view all your request details and tracks on your personal dashboard here:</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${sharedLink}" 
                 style="background-color: #F538BC; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View My Dashboard
              </a>
            </p>` : ''}

          <p>If you have any questions or need any adjustments—tempo, dynamics, or anything else—just reply to this email, and I'll happily adjust it for you.</p>

          <p>Thank you so much for choosing Piano Backings by Daniele. I'm genuinely excited to hear how your audition/performance goes!</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0;"><strong>Warmly,</strong></p>
            <p style="margin: 0;"><strong>Daniele Buatti</strong></p>
            <p style="margin: 5px 0 0 0; color: #1C0357;"><strong>Piano Backings by Daniele</strong></p>
            <p style="margin: 5px 0 0 0;">
              <a href="https://pianobackings.com" style="color: #1C0357; text-decoration: none;">pianobackings.com</a>
            </p>
            <p style="margin: 5px 0 0 0;">
              <a href="https://www.youtube.com/@pianobackingsbydaniele" style="color: #1C0357; text-decoration: none;">YouTube</a> | 
              <a href="https://www.instagram.com/pianobackingsbydaniele/" style="color: #1C0357; text-decoration: none;">Instagram</a> | 
              <a href="https://www.facebook.com/PianoBackingsbyDaniele" style="color: #1C0357; text-decoration: none;">Facebook</a>
            </p>
          </div>
        </div>`;

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
            html: emailHtml,
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
                  <Label htmlFor="content">Email Content (Plain Text for Editing)</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowPreview(true)}
                    className="flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview HTML
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
                <p><strong>Song:</strong> {songTitle} from {musicalOrArtist}</p>
                <p><strong>Backing Type:</strong> {backingType}</p>
                <p><strong>Additional Services:</strong> {additionalServices.join(', ') || 'None'}</p>
                <p><strong>Calculated Cost:</strong> ${cost.toFixed(2)}</p>
                {trackUrl && <p><strong>Track URL:</strong> {trackUrl}</p>}
                {sharedLink && <p><strong>Client View Link:</strong> {sharedLink}</p>}
              </div>
            </>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Email Preview (HTML)</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPreview(false)}
                >
                  Edit Plain Text
                </Button>
              </div>
              <div className="border rounded-md p-4 bg-gray-50 min-h-[200px]">
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <p>Hi ${clientName},</p>

          <p>Great news! Your custom piano backing track for <strong>"${songTitle}"</strong> from <strong>${musicalOrArtist}</strong> is now complete and ready for your use.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1C0357;">Pricing Breakdown</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li><strong>${backingType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</strong> $${backingType === 'full-song' ? 30 : backingType === 'audition-cut' ? 15 : backingType === 'note-bash' ? 10 : 0}</li>
              ${additionalServices.map(serviceId => {
                const detail = getServiceDetails(serviceId);
                return `<li><strong>${detail.name}:</strong> $${detail.price}</li>`;
              }).join('')}
              <li style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;"><strong>Total Amount:</strong> $${cost.toFixed(2)}</li>
            </ul>
          </div>

          ${trackUrl ? 
            `<p>You can download your track using the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${trackUrl}" 
                 style="background-color: #1C0357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Download Your Track
              </a>
            </p>` : 
            '<p>Your track is ready! Please contact Daniele if you do not see a download link.</p>'}

          ${sharedLink ? 
            `<p>You can also view all your request details and tracks on your personal dashboard here:</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${sharedLink}" 
                 style="background-color: #F538BC; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View My Dashboard
              </a>
            </p>` : ''}

          <p>If you have any questions or need any adjustments—tempo, dynamics, or anything else—just reply to this email, and I'll happily adjust it for you.</p>

          <p>Thank you so much for choosing Piano Backings by Daniele. I'm genuinely excited to hear how your audition/performance goes!</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0;"><strong>Warmly,</strong></p>
            <p style="margin: 0;"><strong>Daniele Buatti</strong></p>
            <p style="margin: 5px 0 0 0; color: #1C0357;"><strong>Piano Backings by Daniele</strong></p>
            <p style="margin: 5px 0 0 0;">
              <a href="https://pianobackings.com" style="color: #1C0357; text-decoration: none;">pianobackings.com</a>
            </p>
            <p style="margin: 5px 0 0 0;">
              <a href="https://www.youtube.com/@pianobackingsbydaniele" style="color: #1C0357; text-decoration: none;">YouTube</a> | 
              <a href="https://www.instagram.com/pianobackingsbydaniele/" style="color: #1C0357; text-decoration: none;">Instagram</a> | 
              <a href="https://www.facebook.com/PianoBackingsbyDaniele" style="color: #1C0357; text-decoration: none;">Facebook</a>
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
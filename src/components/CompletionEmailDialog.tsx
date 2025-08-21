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

  // Helper function to get base price range for backing types
  const getDisplayPriceRange = (type: string) => {
    switch (type) {
      case 'full-song': return '$30 - $40';
      case 'audition-cut': return '$15 - $25';
      case 'note-bash': return '$10 - $15';
      default: return 'Price Varies';
    }
  };

  // Generate the default email content
  const generateDefaultEmailContent = () => {
    const displayPriceRange = getDisplayPriceRange(backingType);
    const backingTypeName = backingType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const servicesList = additionalServices.map(serviceId => {
      const detail = getServiceDetails(serviceId);
      return `• ${detail.name}: $${detail.price}`;
    }).join('\n');

    return `Hi ${clientName},

Great news! Your custom piano backing track for "${songTitle}" from ${musicalOrArtist} is now complete and ready for your use.

Here's a breakdown of the work completed:
• ${backingTypeName}: ${displayPriceRange}
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
      
      // Define variables for HTML template
      const backingTypeName = backingType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      const displayPriceRange = getDisplayPriceRange(backingType);

      // Generate HTML for the email body
      const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://kyfofikkswxtwgtqutdu.supabase.co/storage/v1/object/public/assets/logo.jpeg" alt="Piano Backings by Daniele Logo" style="height: 80px; border-radius: 8px; border: 2px solid #FF00B3;">
          </div>
          <h2 style="color: #1C0357; text-align: center; margin-bottom: 25px; font-size: 24px;">Your Backing Track is Ready!</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi ${clientName},</p>

          <p style="font-size: 16px; line-height: 1.6; color: #333;">Great news! Your custom piano backing track for <strong>"${songTitle}"</strong> from <strong>${musicalOrArtist}</strong> is now complete and ready for your use.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #eee;">
            <h3 style="margin-top: 0; color: #1C0357; font-size: 18px; margin-bottom: 15px;">Pricing Breakdown</h3>
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px; color: #555;">
              <li style="margin-bottom: 8px;"><strong>${backingTypeName}:</strong> ${displayPriceRange}</li>
              ${additionalServices.map(serviceId => {
                const detail = getServiceDetails(serviceId);
                return `<li style="margin-bottom: 8px;"><strong>${detail.name}:</strong> $${detail.price}</li>`;
              }).join('')}
              <li style="border-top: 1px solid #ddd; padding-top: 12px; margin-top: 12px; font-size: 18px; font-weight: bold; color: #1C0357;"><strong>Total Amount:</strong> $${cost.toFixed(2)}</li>
            </ul>
          </div>

          ${trackUrl ? 
            `<p style="font-size: 16px; line-height: 1.6; color: #333; text-align: center; margin-top: 30px;">You can download your track using the button below:</p>
            <p style="text-align: center; margin: 25px 0;">
              <a href="${trackUrl}" 
                 style="background-color: #1C0357; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                Download Your Track
              </a>
            </p>` : 
            '<p style="font-size: 16px; line-height: 1.6; color: #333; text-align: center; margin-top: 30px;">Your track is ready! Please contact Daniele if you do not see a download link.</p>'}

          ${sharedLink ? 
            `<p style="font-size: 16px; line-height: 1.6; color: #333; text-align: center; margin-top: 20px;">You can also view all your request details and tracks on your personal dashboard here:</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${sharedLink}" 
                 style="background-color: #F538BC; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 15px;">
                View My Dashboard
              </a>
            </p>` : ''}

          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">If you have any questions or need any adjustments—tempo, dynamics, or anything else—just reply to this email, and I'll happily adjust it for you.</p>

          <p style="font-size: 16px; line-height: 1.6; color: #333;">Thank you so much for choosing Piano Backings by Daniele. I'm genuinely excited to hear how your audition/performance goes!</p>

          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #1C0357;"><strong>Warmly,</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 18px; color: #1C0357;"><strong>Daniele Buatti</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 15px; color: #555;">Piano Backings by Daniele</p>
            <p style="margin: 15px 0 0 0; font-size: 14px;">
              <a href="https://pianobackings.com" style="color: #1C0357; text-decoration: none; margin: 0 8px;">pianobackings.com</a> | 
              <a href="https://www.youtube.com/@pianobackingsbydaniele" style="color: #1C0357; text-decoration: none; margin: 0 8px;">YouTube</a> | 
              <a href="https://www.instagram.com/pianobackingsbydaniele/" style="color: #1C0357; text-decoration: none; margin: 0 8px;">Instagram</a> | 
              <a href="https://www.facebook.com/PianoBackingsbyDaniele" style="color: #1C0357; text-decoration: none; margin: 0 8px;">Facebook</a>
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
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Assuming supabase client is available

interface EmailVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | undefined;
  onVerified: (tempAccessToken: string) => void; // Callback on successful verification
}

const EmailVerificationDialog: React.FC<EmailVerificationDialogProps> = ({ isOpen, onClose, requestId, onVerified }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendCode = async () => {
    setLoading(true);
    try {
      if (!email || !requestId) {
        throw new Error("Email and Request ID are required.");
      }

      // Call Edge Function to send code
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-verification-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, requestId }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to send verification code: ${response.statusText}`);
      }

      setEmailSent(true);
      setStep('code');
      toast({ title: "Code Sent", description: `A verification code has been sent to ${email}.` });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast({ title: "Error", description: `Failed to send code: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      if (!email || !requestId || !verificationCode) {
        throw new Error("Email, Request ID, and Verification Code are required.");
      }

      // Call Edge Function to verify code
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/verify-access-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, requestId, code: verificationCode }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to verify code: ${response.statusText}`);
      }

      const { tempAccessToken } = result;
      if (tempAccessToken) {
        onVerified(tempAccessToken); // Notify parent component
        toast({ title: "Access Granted", description: "Email verified successfully. You now have temporary access." });
        onClose(); // Close dialog on success
      } else {
        throw new Error("Verification successful, but no temporary access token received.");
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({ title: "Verification Failed", description: `Failed to verify code: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setVerificationCode('');
    setStep('email');
    setEmailSent(false);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" /> Verify Track Access
          </DialogTitle>
          <DialogDescription>
            {step === 'email'
              ? "Enter the email address associated with this track request to receive a verification code."
              : `A code has been sent to ${email}. Enter it below to access your track.`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {step === 'email' && (
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleSendCode} disabled={loading || !email.trim()}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Code
              </Button>
            </div>
          )}
          {step === 'code' && (
            <div className="grid gap-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleVerifyCode} disabled={loading || !verificationCode.trim()}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Verify Code
              </Button>
              <Button variant="link" onClick={() => setStep('email')} disabled={loading}>
                Resend Code / Change Email
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationDialog;
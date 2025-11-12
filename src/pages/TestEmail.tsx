import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Loader2, Send } from 'lucide-react';

const TestEmail: React.FC = () => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: JSON.stringify({ to, subject, body }),
      });

      if (error) throw error;

      showSuccess("Email sent successfully!");
      console.log('Email function response:', data);
    } catch (error: any) {
      console.error('Error sending email:', error);
      showError(`Failed to send email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-[#1C0357] mb-6 text-center">Test Email Function</h1>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Test Subject" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Email body content..." rows={6} />
            </div>
            <Button onClick={handleSendEmail} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEmail;
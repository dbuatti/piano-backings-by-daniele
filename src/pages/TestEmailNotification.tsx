import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Loader2, Bell } from 'lucide-react';

const TestEmailNotification: React.FC = () => {
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendNotification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: JSON.stringify({ requestId }),
      });

      if (error) throw error;

      showSuccess("Notification email sent successfully!");
      console.log('Notification email function response:', data);
    } catch (error: any) {
      console.error('Error sending notification email:', error);
      showError(`Failed to send notification email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-[#1C0357] mb-6 text-center">Test Notification Email</h1>
          <p className="text-gray-700 mb-4 text-center">
            This will trigger a notification email to all configured recipients for a specific request ID.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requestId">Request ID</Label>
              <Input id="requestId" type="text" value={requestId} onChange={(e) => setRequestId(e.target.value)} placeholder="Enter request ID (e.g., a7b1c2d3-e4f5-6789-abcd-ef1234567890)" />
            </div>
            <Button onClick={handleSendNotification} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white" disabled={loading || !requestId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEmailNotification;
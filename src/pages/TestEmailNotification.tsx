import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Mail, Send } from 'lucide-react';

const TestEmailNotification = () => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    name: 'Test User',
    songTitle: 'Test Song',
    musicalOrArtist: 'Test Musical',
    backingType: 'full-song',
    trackPurpose: 'personal-practise',
    deliveryDate: new Date().toISOString().split('T')[0],
    specialRequests: 'This is a test notification',
    songKey: 'C Major (0)',
    additionalServices: ['rush-order'],
    trackType: 'polished',
    youtubeLink: 'https://www.youtube.com/watch?v=test123',
    voiceMemo: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestNotification = async () => {
    setIsSending(true);
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to test notifications');
      }

      // Prepare form data for submission
      const submissionData = {
        formData: {
          email: formData.email,
          name: formData.name,
          songTitle: formData.songTitle,
          musicalOrArtist: formData.musicalOrArtist,
          songKey: formData.songKey,
          differentKey: 'No',
          keyForTrack: '',
          youtubeLink: formData.youtubeLink,
          voiceMemo: formData.voiceMemo,
          voiceMemoFileUrl: null,
          sheetMusicUrl: null,
          trackPurpose: formData.trackPurpose,
          backingType: formData.backingType,
          deliveryDate: formData.deliveryDate,
          additionalServices: formData.additionalServices,
          specialRequests: formData.specialRequests,
          category: 'Test Category',
          trackType: formData.trackType
        }
      };
      
      // Submit to Supabase function (this will trigger the notification)
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(submissionData),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to submit test request: ${response.status} ${response.statusText}`);
      }
      
      toast({
        title: "Test Notification Sent",
        description: "Check your email for the notification. The test request was submitted successfully.",
      });
      
    } catch (error: any) {
      console.error('Error testing notification:', error);
      toast({
        title: "Error",
        description: `Failed to send test notification: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Test Email Notifications</h1>
          <p className="text-lg text-[#1C0357]/90">Test the email notifications you receive when clients submit requests</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Send Test Notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-gray-700">
                This page will simulate a client submitting a backing track request, which will trigger 
                the same email notification you receive in production. Fill in the form details below 
                and click "Send Test Notification" to receive the email.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Client Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="name">Client Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="songTitle">Song Title</Label>
                  <Input
                    id="songTitle"
                    name="songTitle"
                    value={formData.songTitle}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="musicalOrArtist">Musical/Artist</Label>
                  <Input
                    id="musicalOrArtist"
                    name="musicalOrArtist"
                    value={formData.musicalOrArtist}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="backingType">Backing Type</Label>
                  <select
                    id="backingType"
                    name="backingType"
                    value={formData.backingType}
                    onChange={(e) => setFormData(prev => ({ ...prev, backingType: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="full-song">Full Song</option>
                    <option value="audition-cut">Audition Cut</option>
                    <option value="note-bash">Note Bash</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="trackPurpose">Track Purpose</Label>
                  <select
                    id="trackPurpose"
                    name="trackPurpose"
                    value={formData.trackPurpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, trackPurpose: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="personal-practise">Personal Practice</option>
                    <option value="audition-backing">Audition Backing</option>
                    <option value="melody-bash">Melody Bash</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="deliveryDate">Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    name="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="trackType">Track Type</Label>
                  <select
                    id="trackType"
                    name="trackType"
                    value={formData.trackType}
                    onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="quick">Quick Reference</option>
                    <option value="one-take">One-Take Recording</option>
                    <option value="polished">Polished Backing</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleTestNotification}
                  disabled={isSending}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? 'Sending Test...' : 'Send Test Notification'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-bold text-[#1C0357] mb-4">How to Test Email Notifications</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Make sure you're logged in as an admin (daniele.buatti@gmail.com)</li>
            <li>Fill in the form with test data or use the pre-filled defaults</li>
            <li>Click "Send Test Notification"</li>
            <li>Check your email inbox for the notification</li>
            <li>Verify that all information is displayed correctly</li>
            <li>Test different combinations of services and special requests</li>
          </ol>
          <p className="mt-4 font-medium">
            Note: This will create a real entry in your database, but it will be clearly marked as a test.
          </p>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TestEmailNotification;
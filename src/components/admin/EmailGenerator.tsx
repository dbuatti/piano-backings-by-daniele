import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmailGeneratorProps {
  request: {
    id: string;
    email: string;
    name: string;
    song_title: string;
    musical_or_artist: string;
    // Add other relevant request fields as needed for email content
  };
  onClose: () => void;
}

const EmailGenerator: React.FC<EmailGeneratorProps> = ({ request, onClose }) => {
  const [subject, setSubject] = React.useState(`Update on your backing request for "${request.song_title}"`);
  const [body, setBody] = React.useState(`Dear ${request.name},\n\nRegarding your request for "${request.song_title}" by ${request.musical_or_artist} (Request ID: ${request.id.substring(0, 8)}),\n\n[Your message here]\n\nBest regards,\nDaniele`);

  const handleSendEmail = () => {
    // In a real application, you would integrate with an email service here.
    // For now, we'll just log the email content.
    console.log("Sending email:");
    console.log("To:", request.email);
    console.log("Subject:", subject);
    console.log("Body:", body);
    alert("Email content logged to console. (Actual sending not implemented)");
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="recipient-email" className="text-sm">Recipient Email</Label>
        <Input id="recipient-email" value={request.email} readOnly className="bg-gray-100" />
      </div>
      <div>
        <Label htmlFor="subject" className="text-sm">Subject</Label>
        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="body" className="text-sm">Body</Label>
        <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSendEmail}>Send Email</Button>
      </div>
    </div>
  );
};

export default EmailGenerator;
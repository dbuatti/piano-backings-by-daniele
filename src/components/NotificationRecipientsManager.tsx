import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast"; // Updated import
import { supabase } from '@/integrations/supabase/client';
import { Mail, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';

interface Recipient {
  id: string;
  email: string;
  created_at: string;
}

const NotificationRecipientsManager: React.FC = () => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('notification_recipients')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRecipients(data || []);
    } catch (err: any) {
      console.error('Error fetching recipients:', err);
      setError(err);
      showError(`Failed to fetch notification recipients: ${err.message}`); // Updated toast call
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showError("Please enter a valid email address."); // Updated toast call
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('notification_recipients')
        .insert([{ email: newEmail }])
        .select();

      if (error) throw error;

      setRecipients([...recipients, data[0]]);
      setNewEmail('');
      showSuccess(`${newEmail} has been added to notification list.`); // Updated toast call
    } catch (err: any) {
      console.error('Error adding recipient:', err);
      setError(err);
      showError(`Failed to add recipient: ${err.message}`); // Updated toast call
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRecipient = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the notification list?`)) {
      return;
    }
    setError(null);
    try {
      const { error } = await supabase
        .from('notification_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecipients(recipients.filter(r => r.id !== id));
      showSuccess(`${email} has been removed from notification list.`); // Updated toast call
    } catch (err: any) {
      console.error('Error deleting recipient:', err);
      setError(err);
      showError(`Failed to remove recipient: ${err.message}`); // Updated toast call
    }
  };

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-[#1C0357] flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          Notification Recipients
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Manage which email addresses receive notifications for new backing track requests.
        </p>

        {error && (
          <div className="mb-4">
            <ErrorDisplay error={error} title="Recipient Management Error" />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="new-email">Add New Recipient Email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="new-email"
                type="email"
                placeholder="new.recipient@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
                disabled={adding}
              />
              <Button onClick={handleAddRecipient} disabled={adding}>
                {adding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>

          <h3 className="font-semibold text-md text-[#1C0357] mt-6">Current Recipients:</h3>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-[#1C0357]" />
              <p className="ml-2 text-gray-600">Loading recipients...</p>
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-gray-500 text-sm">No notification recipients added yet.</p>
          ) : (
            <ul className="space-y-2">
              {recipients.map((recipient) => (
                <li key={recipient.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <span className="font-medium text-sm">{recipient.email}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRecipient(recipient.id, recipient.email)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationRecipientsManager;
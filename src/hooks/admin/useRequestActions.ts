import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string | string[];
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_url?: string;
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number;
}

export const useRequestActions = (requests: BackingRequest[], setRequests: React.Dispatch<React.SetStateAction<BackingRequest[]>>) => {
  const { toast } = useToast();

  const updateStatus = async (id: string, status: BackingRequest['status']) => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status } : req
      ));
      
      toast({
        title: "Status Updated",
        description: "Request status has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = async (id: string, isPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .update({ is_paid: isPaid })
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, is_paid: isPaid } : req
      ));
      
      toast({
        title: "Payment Status Updated",
        description: `Request marked as ${isPaid ? 'paid' : 'unpaid'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update payment status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const shareTrack = async (id: string) => {
    try {
      const request = requests.find(req => req.id === id);
      if (!request) throw new Error('Request not found');
      
      const shareLink = `${window.location.origin}/user-dashboard?email=${encodeURIComponent(request.email)}`;
      
      const { error } = await supabase
        .from('backing_requests')
        .update({ shared_link: shareLink })
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, shared_link: shareLink } : req
      ));
      
      toast({
        title: "Track Shared",
        description: "Shared link has been generated and sent to user.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to share track: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setRequests(prev => prev.filter(req => req.id !== id));
      
      toast({
        title: "Request Deleted",
        description: "The request has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete request: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const batchDeleteRequests = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('backing_requests')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      
      setRequests(prev => prev.filter(req => !ids.includes(req.id)));
      
      toast({
        title: "Requests Deleted",
        description: `${ids.length} requests have been deleted successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete requests: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return {
    updateStatus,
    updatePaymentStatus,
    shareTrack,
    deleteRequest,
    batchDeleteRequests,
  };
};
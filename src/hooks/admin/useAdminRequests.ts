import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from "@/lib/utils";
import type { BackingRequest } from '@/types/backing-request';



export const useAdminRequests = () => {
  const [requests, setRequests] = useState<BackingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRequests(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: `Failed to fetch requests: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // `toast` is a stable reference from `useToast`

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]); // `fetchRequests` is now stable due to useCallback

  return { requests, setRequests, loading, fetchRequests };
};
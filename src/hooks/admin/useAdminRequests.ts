import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BackingRequest } from '@/utils/helpers'; // Assuming BackingRequest is defined here or globally

export const useAdminRequests = (searchTerm: string) => {
  const { data: requests, isLoading, isError, error } = useQuery<BackingRequest[], Error>({
    queryKey: ['adminRequests', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('backing_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`song_title.ilike.%${searchTerm}%,musical_or_artist.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { requests, isLoading, isError, error };
};
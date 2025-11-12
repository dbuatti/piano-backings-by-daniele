import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast'; // Updated import
import { uploadFileToSupabase } from '@/utils/supabase-client';

export const useRequestActions = () => {
  const queryClient = useQueryClient();

  const invalidateRequestQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
    queryClient.invalidateQueries({ queryKey: ['requestDetails'] });
    queryClient.invalidateQueries({ queryKey: ['userRequests'] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('backing_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Request status updated."); // Updated toast call
      invalidateRequestQueries();
    },
    onError: (error: any) => {
      showError(`Failed to update status: ${error.message}`); // Updated toast call
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { error } = await supabase
        .from('backing_requests')
        .update({ is_paid: isPaid })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Payment status updated."); // Updated toast call
      invalidateRequestQueries();
    },
    onError: (error: any) => {
      showError(`Failed to update payment status: ${error.message}`); // Updated toast call
    },
  });

  const updateCostMutation = useMutation({
    mutationFn: async ({ id, newCost }: { id: string; newCost: number | null }) => {
      const { error } = await supabase
        .from('backing_requests')
        .update({ cost: newCost })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Request cost updated."); // Updated toast call
      invalidateRequestQueries();
    },
    onError: (error: any) => {
      showError(`Failed to update request cost: ${error.message}`); // Updated toast call
    },
  });

  const uploadTrackMutation = useMutation({
    mutationFn: async ({ requestId, file }: { requestId: string; file: File }) => {
      const publicUrl = await uploadFileToSupabase(file, 'backing-tracks', `requests/${requestId}`);
      const { error } = await supabase
        .from('backing_requests')
        .update({ track_urls: [{ url: publicUrl, caption: file.name }] }) // Store as an array of objects
        .eq('id', requestId);
      if (error) throw error;
      return publicUrl;
    },
    onSuccess: () => {
      showSuccess("Track uploaded successfully!", "The client can now view it."); // Updated toast call
      invalidateRequestQueries();
    },
    onError: (error: any) => {
      showError(`Failed to upload track: ${error.message}`); // Updated toast call
    },
  });

  const shareTrackMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const clientViewUrl = `${window.location.origin}/track/${requestId}`;
      await navigator.clipboard.writeText(clientViewUrl);
      return clientViewUrl;
    },
    onSuccess: () => {
      showSuccess("Link copied!", "The client view link has been copied to your clipboard."); // Updated toast call
    },
    onError: () => {
      showError("Failed to copy link: Please try again."); // Updated toast call
    },
  });

  const updatePlatformsMutation = useMutation({
    mutationFn: async ({ requestId, platforms }: { requestId: string; platforms: any }) => {
      const { error } = await supabase
        .from('backing_requests')
        .update({ uploaded_platforms: platforms })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Platforms updated successfully."); // Updated toast call
      invalidateRequestQueries();
    },
    onError: (error: any) => {
      showError(`Failed to update platforms: ${error.message}`); // Updated toast call
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('backing_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Request deleted.", "The request has been permanently removed."); // Updated toast call
      invalidateRequestQueries();
    },
    onError: (error: any) => {
      showError(`Failed to delete request: ${error.message}`); // Updated toast call
    },
  });

  return {
    updateStatus: updateStatusMutation.mutate,
    updatePaymentStatus: updatePaymentStatusMutation.mutate,
    updateCost: updateCostMutation.mutate,
    uploadTrack: uploadTrackMutation.mutate,
    shareTrack: shareTrackMutation.mutate,
    updatePlatforms: updatePlatformsMutation.mutate,
    deleteRequest: deleteRequestMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingPaymentStatus: updatePaymentStatusMutation.isPending,
    isUpdatingCost: updateCostMutation.isPending,
    isUploadingTrack: uploadTrackMutation.isPending,
    isSharingTrack: shareTrackMutation.isPending,
    isUpdatingPlatforms: updatePlatformsMutation.isPending,
    isDeletingRequest: deleteRequestMutation.isPending,
  };
};
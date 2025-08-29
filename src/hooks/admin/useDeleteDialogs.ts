import { useState } from 'react';
import { useRequestActions } from './useRequestActions'; // Assuming this hook is available

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

export const useDeleteDialogs = (
  requests: BackingRequest[],
  setRequests: React.Dispatch<React.SetStateAction<BackingRequest[]>>,
  selectedRequests: string[]
) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const { deleteRequest, batchDeleteRequests } = useRequestActions(requests, setRequests);

  const openDeleteDialog = (id: string) => {
    setRequestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRequest = () => {
    if (requestToDelete) {
      deleteRequest(requestToDelete);
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const openBatchDeleteDialog = () => {
    setBatchDeleteDialogOpen(true);
  };

  const confirmBatchDeleteRequests = () => {
    batchDeleteRequests(selectedRequests);
    setBatchDeleteDialogOpen(false);
  };

  return {
    deleteDialogOpen, setDeleteDialogOpen,
    requestToDelete, setRequestToDelete,
    batchDeleteDialogOpen, setBatchDeleteDialogOpen,
    openDeleteDialog, confirmDeleteRequest,
    openBatchDeleteDialog, confirmBatchDeleteRequests,
  };
};
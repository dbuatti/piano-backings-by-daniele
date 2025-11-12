import { useState } from 'react';
import { useRequestActions } from './useRequestActions';
import { showSuccess, showError } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

export const useDeleteDialogs = () => {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestIdToDelete, setRequestIdToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [requestsToDelete, setRequestsToDelete] = useState<string[]>([]);

  const { deleteRequest, batchDeleteRequests, isDeletingRequest, isBatchDeletingRequests } = useRequestActions(); // No arguments

  const openDeleteDialog = (id: string) => {
    setRequestIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (requestIdToDelete) {
      deleteRequest(requestIdToDelete);
      setDeleteDialogOpen(false);
      setRequestIdToDelete(null);
    }
  };

  const openBulkDeleteDialog = (ids: string[]) => {
    setRequestsToDelete(ids);
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    if (requestsToDelete.length > 0) {
      batchDeleteRequests(requestsToDelete); // Corrected call
      setBulkDeleteDialogOpen(false);
      setRequestsToDelete([]);
    }
  };

  return {
    deleteDialogOpen,
    setDeleteDialogOpen,
    requestIdToDelete,
    openDeleteDialog,
    confirmDelete,
    isDeletingRequest,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    requestsToDelete,
    openBulkDeleteDialog,
    confirmBulkDelete,
    isBatchDeletingRequests,
  };
};
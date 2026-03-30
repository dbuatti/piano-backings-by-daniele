"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Trash2, Loader2 } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import IssueReportsTable from './IssueReportsTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface IssueReport {
  id: string;
  user_id: string | null;
  email: string;
  issue_description: string;
  page_url: string | null;
  created_at: string;
  is_read: boolean;
  status?: string;
}

const IssueReportsTabContent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const { data: reports, isLoading, isError, error: fetchError } = useQuery<IssueReport[], Error>({
    queryKey: ['allIssueReports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('issue_reports')
        .update({ status, is_read: true }) // Mark as read when status changes
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status Updated" });
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('issue_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report Deleted" });
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    },
  });

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteReportMutation.mutate(reportToDelete);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      {isError && <ErrorDisplay error={fetchError} title="Failed to Load Reports" />}

      <Card className="shadow-lg border-none rounded-[40px] overflow-hidden">
        <CardHeader className="bg-[#1C0357] text-white p-8">
          <CardTitle className="text-3xl font-black flex items-center">
            <MessageSquare className="mr-3 h-8 w-8 text-[#F538BC]" />
            Client Feedback & Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <IssueReportsTable
            reports={reports || []}
            isLoading={isLoading}
            updateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
            openDeleteDialog={(id) => { setReportToDelete(id); setDeleteDialogOpen(true); }}
            isUpdating={updateStatusMutation.isPending}
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue Report?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this feedback from your records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IssueReportsTabContent;
"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import IssueReportsTable from './IssueReportsTable'; // Import the new table component

interface IssueReport {
  id: string;
  user_id: string | null;
  email: string;
  issue_description: string;
  page_url: string | null;
  created_at: string;
  is_read: boolean;
}

const IssueReportsTabContent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);

  // Fetch all issue reports
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation to mark reports as read (used on page load)
  const markAllAsReadMutation = useMutation({
    mutationFn: async (reportIds: string[]) => {
      if (reportIds.length === 0) return;
      const { error } = await supabase
        .from('issue_reports')
        .update({ is_read: true })
        .in('id', reportIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
    },
    onError: (err: any) => {
      console.error('Failed to mark reports as read:', err);
    }
  });

  // Mark all unread reports as read when the page loads
  useEffect(() => {
    if (reports && reports.length > 0) {
      const unreadReportIds = reports.filter(report => !report.is_read).map(report => report.id);
      if (unreadReportIds.length > 0) {
        markAllAsReadMutation.mutate(unreadReportIds);
      }
    }
  }, [reports, markAllAsReadMutation]); // Only run when reports data changes

  // Mutation to toggle read status for a single report
  const toggleReadStatusMutation = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from('issue_reports')
        .update({ is_read: !is_read })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Report read status toggled." });
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: `Failed to update status: ${err.message}`, variant: "destructive" });
    }
  });

  // Mutation to delete a report
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('issue_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report Deleted", description: "Issue report has been permanently removed." });
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: `Failed to delete report: ${err.message}`, variant: "destructive" });
    }
  });

  const openDeleteDialog = (id: string) => {
    setReportToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteReportMutation.mutate(reportToDelete);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  if (isError) {
    setError(fetchError);
  }

  return (
    <div className="container mx-auto py-8">
      {error && (
        <div className="mb-6">
          <ErrorDisplay error={error} title="Failed to Load Reports" />
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            All Submitted Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IssueReportsTable
            reports={reports || []}
            isLoading={isLoading}
            toggleReadStatus={toggleReadStatusMutation.mutate}
            openDeleteDialog={openDeleteDialog}
            deleteDialogOpen={deleteDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            confirmDelete={confirmDelete}
            isTogglingReadStatus={toggleReadStatusMutation.isPending}
            isDeletingReport={deleteReportMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default IssueReportsTabContent;
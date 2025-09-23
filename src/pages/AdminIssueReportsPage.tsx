"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { format } from 'date-fns';
import { MessageSquare, CheckCircle, XCircle, Trash2, Loader2, AlertCircle, Eye } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { cn } => '@/lib/utils';

interface IssueReport {
  id: string;
  user_id: string | null;
  email: string;
  issue_description: string;
  page_url: string | null;
  created_at: string;
  is_read: boolean;
}

const AdminIssueReportsPage: React.FC = () => {
  const navigate = useNavigate();
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
  }, [reports]); // Only run when reports data changes

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
      {/* Removed h1 and p tags here */}

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
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
              <p className="ml-4 text-lg text-gray-600">Loading reports...</p>
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-[#D1AAF2]/20">
                  <TableRow>
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead className="w-[200px]">Reporter Email</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[200px]">Page URL</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className={cn(!report.is_read && "bg-yellow-50 hover:bg-yellow-100")}>
                      <TableCell>
                        <div className="font-medium">{format(new Date(report.created_at), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-gray-500">{format(new Date(report.created_at), 'HH:mm')}</div>
                      </TableCell>
                      <TableCell className="font-medium">{report.email}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block max-w-[300px] truncate cursor-help">
                              {report.issue_description}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p>{report.issue_description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {report.page_url ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a 
                                href={report.page_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline flex items-center text-sm max-w-[180px] truncate"
                              >
                                <Eye className="h-3 w-3 mr-1 flex-shrink-0" />
                                {report.page_url}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p>{report.page_url}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-gray-500 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.is_read ? "secondary" : "default"} className={cn(!report.is_read && "bg-red-500 text-white")}>
                          {report.is_read ? (
                            <span className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Read</span>
                          ) : (
                            <span className="flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Unread</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleReadStatusMutation.mutate({ id: report.id, is_read: report.is_read })}
                            disabled={toggleReadStatusMutation.isPending}
                          >
                            {toggleReadStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : report.is_read ? (
                              <>
                                <XCircle className="h-4 w-4 mr-1" /> Mark Unread
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" /> Mark Read
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteDialog(report.id)}
                            disabled={deleteReportMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Issue Reports</h3>
              <p className="mt-1 text-gray-500">
                No issues have been reported yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Trash2 className="mr-2 h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the issue report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminIssueReportsPage;
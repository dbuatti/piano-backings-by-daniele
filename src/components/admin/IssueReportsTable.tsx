"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"; // Added Label import
import { format } from 'date-fns';
import { Eye, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface IssueReport {
  id: string;
  user_id: string | null;
  email: string;
  issue_description: string;
  page_url: string | null;
  created_at: string;
  is_read: boolean;
}

interface IssueReportsTableProps {
  reports: IssueReport[];
  isLoading: boolean;
  toggleReadStatus: (id: string, is_read: boolean) => void;
  openDeleteDialog: (id: string) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  confirmDelete: () => void;
  isTogglingReadStatus: boolean;
  isDeletingReport: boolean;
}

const IssueReportsTable: React.FC<IssueReportsTableProps> = ({
  reports,
  isLoading,
  toggleReadStatus,
  openDeleteDialog,
  deleteDialogOpen,
  setDeleteDialogOpen,
  confirmDelete,
  isTogglingReadStatus,
  isDeletingReport,
}) => {
  const queryClient = useQueryClient();
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedReports(reports.map(report => report.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleSelectReport = (id: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedReports(prev => [...prev, id]);
    } else {
      setSelectedReports(prev => prev.filter(reportId => reportId !== id));
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('issue_reports')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess(`${selectedReports.length} issue reports have been permanently removed.`);
      setSelectedReports([]);
      setBulkDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] });
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] });
    },
    onError: (err: any) => {
      showError(`Failed to delete reports: ${err.message}`);
    }
  });

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedReports);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
        <p className="ml-3 text-gray-600">Loading issue reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No issue reports found.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedReports.length === reports.length && reports.length > 0}
            onCheckedChange={handleSelectAll}
            disabled={reports.length === 0}
          />
          <Label htmlFor="select-all" className="text-sm font-medium">
            Select All ({selectedReports.length})
          </Label>
        </div>
        {selectedReports.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteDialogOpen(true)}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </>
            )}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[180px]">Reporter</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[150px]">Page URL</TableHead>
              <TableHead className="w-[100px] text-center">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id} className={!report.is_read ? 'bg-blue-50/50 hover:bg-blue-100/50' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={(checked) => handleSelectReport(report.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-[#1C0357]">
                    {format(new Date(report.created_at), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(report.created_at), 'HH:mm')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-[#1C0357]">{report.email}</div>
                  {report.user_id && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-gray-500 cursor-help">({report.user_id.substring(0, 8)}...)</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>User ID: {report.user_id}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell className="max-w-[300px] truncate text-sm text-gray-700">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{report.issue_description}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <p>{report.issue_description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={report.page_url || '#'} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {report.page_url ? new URL(report.page_url).pathname : 'N/A'}
                      </a>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <p>{report.page_url || 'No URL provided'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReadStatus(report.id, report.is_read)}
                    disabled={isTogglingReadStatus}
                    className="h-8 w-8 p-0"
                  >
                    {report.is_read ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mark as Unread</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <XCircle className="h-5 w-5 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mark as Read</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(report.id)}
                    disabled={isDeletingReport}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Trash2 className="mr-2 h-5 w-5 text-red-600" />
              Delete Selected Issue Reports
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedReports.length} selected issue reports? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IssueReportsTable;
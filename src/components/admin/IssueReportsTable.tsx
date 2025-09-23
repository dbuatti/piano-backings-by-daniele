"use client";

import React from 'react';
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
import { cn } from '@/lib/utils';

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
  return (
    <>
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
                        onClick={() => toggleReadStatus(report.id, report.is_read)}
                        disabled={isTogglingReadStatus}
                      >
                        {isTogglingReadStatus ? (
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
                        disabled={isDeletingReport}
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
    </>
  );
};

export default IssueReportsTable;
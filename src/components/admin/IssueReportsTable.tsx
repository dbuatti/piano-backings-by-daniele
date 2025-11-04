import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { CheckCircle, XCircle, Eye, MessageSquare, Trash2 } from 'lucide-react'; // Added Trash2
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IssueReport {
  id: string;
  created_at: string;
  user_id: string | null; // Added user_id
  email: string; // Changed from user_email
  issue_description: string; // Changed from description
  page_url: string | null; // Added page_url
  is_read: boolean;
}

interface IssueReportsTableProps {
  reports: IssueReport[]; // Changed from issueReports to reports
  isLoading: boolean; // Changed from loading to isLoading
  toggleReadStatus: (id: string, is_read: boolean) => void;
  openDeleteDialog: (id: string) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
  const { toast } = useToast();

  // The toggleReadStatus and toggleResolveStatus functions were previously defined here
  // but are now expected to be passed as props from IssueReportsTabContent.
  // The original IssueReportsTable component in the codebase did not have these functions.
  // The current implementation in IssueReportsTabContent already uses mutations for these actions.

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader className="bg-[#D1AAF2]/20">
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>User Email</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[150px]">Page URL</TableHead>
            <TableHead className="w-[80px]">Read</TableHead>
            <TableHead className="text-right w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">Loading issue reports...</TableCell>
            </TableRow>
          ) : reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">No issue reports found.</TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow key={report.id} className={report.is_read ? '' : 'bg-blue-50 font-semibold'}>
                <TableCell>{report.id.substring(0, 8)}</TableCell>
                <TableCell>{format(new Date(report.created_at), 'MMM dd, HH:mm')}</TableCell>
                <TableCell>{report.email}</TableCell>
                <TableCell className="max-w-[200px] truncate">{report.issue_description}</TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {report.page_url ? (
                    <a href={report.page_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {report.page_url}
                    </a>
                  ) : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleReadStatus(report.id, report.is_read)}
                    className={report.is_read ? 'text-green-600' : 'text-red-600'}
                    disabled={isTogglingReadStatus}
                  >
                    {report.is_read ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="mr-2">
                    <Eye className="w-4 h-4" /> View
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => openDeleteDialog(report.id)}
                    disabled={isDeletingReport}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default IssueReportsTable;
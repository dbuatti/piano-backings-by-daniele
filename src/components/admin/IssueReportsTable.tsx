import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { CheckCircle, XCircle, Eye, Trash2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssueReport {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string;
  issue_description: string;
  page_url: string | null;
  is_read: boolean;
  status?: string; // Added status
}

interface IssueReportsTableProps {
  reports: IssueReport[];
  isLoading: boolean;
  updateStatus: (id: string, status: string) => void;
  openDeleteDialog: (id: string) => void;
  isUpdating: boolean;
}

const IssueReportsTable: React.FC<IssueReportsTableProps> = ({ 
  reports, 
  isLoading, 
  updateStatus,
  openDeleteDialog,
  isUpdating,
}) => {
  
  const getStatusBadge = (status: string = 'open') => {
    switch (status) {
      case 'resolved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Open</Badge>;
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <Table>
        <TableHeader className="bg-[#1C0357] text-white">
          <TableRow className="hover:bg-[#1C0357]">
            <TableHead className="text-white w-[120px]">Date</TableHead>
            <TableHead className="text-white">User Email</TableHead>
            <TableHead className="text-white">Description</TableHead>
            <TableHead className="text-white">Page</TableHead>
            <TableHead className="text-white w-[150px]">Status</TableHead>
            <TableHead className="text-right text-white w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#1C0357]" />
              </TableCell>
            </TableRow>
          ) : reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-gray-500">No issue reports found.</TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow key={report.id} className={cn(!report.is_read && "bg-blue-50/50")}>
                <TableCell className="text-xs font-medium">
                  {format(new Date(report.created_at), 'MMM dd, HH:mm')}
                </TableCell>
                <TableCell className="font-bold text-[#1C0357]">{report.email}</TableCell>
                <TableCell className="max-w-[300px]">
                  <p className="text-sm line-clamp-2">{report.issue_description}</p>
                </TableCell>
                <TableCell>
                  <code className="text-[10px] bg-gray-100 p-1 rounded truncate block max-w-[100px]">
                    {report.page_url || 'N/A'}
                  </code>
                </TableCell>
                <TableCell>
                  <Select 
                    value={report.status || 'open'} 
                    onValueChange={(v) => updateStatus(report.id, v)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => openDeleteDialog(report.id)}
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

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default IssueReportsTable;
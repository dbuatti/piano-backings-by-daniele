import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IssueReport {
  id: string;
  created_at: string;
  request_id: string;
  user_email: string;
  issue_type: string;
  description: string;
  status: 'open' | 'resolved';
  is_read: boolean;
}

interface IssueReportsTableProps {
  issueReports: IssueReport[];
  setIssueReports: React.Dispatch<React.SetStateAction<IssueReport[]>>;
  loading: boolean;
}

const IssueReportsTable: React.FC<IssueReportsTableProps> = ({ issueReports, setIssueReports, loading }) => {
  const { toast } = useToast();

  const toggleReadStatus = async (reportId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('issue_reports')
        .update({ is_read: !currentStatus })
        .eq('id', reportId);

      if (error) throw error;

      setIssueReports(prev => prev.map(report =>
        report.id === reportId ? { ...report, is_read: !currentStatus } : report
      ));

      toast({
        title: "Issue Report Updated",
        description: `Report marked as ${!currentStatus ? 'read' : 'unread'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update report status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const toggleResolveStatus = async (reportId: string, currentStatus: 'open' | 'resolved') => {
    try {
      const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
      const { error } = await supabase
        .from('issue_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      setIssueReports(prev => prev.map(report =>
        report.id === reportId ? { ...report, status: newStatus } : report
      ));

      toast({
        title: "Issue Report Updated",
        description: `Report marked as ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update report status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader className="bg-[#D1AAF2]/20">
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead className="w-[150px]">Request ID</TableHead>
            <TableHead>User Email</TableHead>
            <TableHead>Issue Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[80px]">Read</TableHead>
            <TableHead className="text-right w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12">Loading issue reports...</TableCell>
            </TableRow>
          ) : issueReports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12">No issue reports found.</TableCell>
            </TableRow>
          ) : (
            issueReports.map((report) => (
              <TableRow key={report.id} className={report.is_read ? '' : 'bg-blue-50 font-semibold'}>
                <TableCell>{report.id.substring(0, 8)}</TableCell>
                <TableCell>{format(new Date(report.created_at), 'MMM dd, HH:mm')}</TableCell>
                <TableCell>{report.request_id.substring(0, 8)}</TableCell>
                <TableCell>{report.user_email}</TableCell>
                <TableCell>{report.issue_type}</TableCell>
                <TableCell className="max-w-[200px] truncate">{report.description}</TableCell>
                <TableCell>
                  <Badge variant={report.status === 'open' ? 'destructive' : 'default'}>
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleReadStatus(report.id, report.is_read)}
                    className={report.is_read ? 'text-green-600' : 'text-red-600'}
                  >
                    {report.is_read ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="mr-2">
                    <Eye className="w-4 h-4" /> View
                  </Button>
                  <Button 
                    variant={report.status === 'open' ? 'default' : 'secondary'} 
                    size="sm" 
                    onClick={() => toggleResolveStatus(report.id, report.status)}
                  >
                    {report.status === 'open' ? 'Resolve' : 'Reopen'}
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
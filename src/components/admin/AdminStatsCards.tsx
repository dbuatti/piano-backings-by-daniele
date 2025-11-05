import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileAudio, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface BackingRequest {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

interface AdminStatsCardsProps {
  requests: BackingRequest[];
  totalIssueReports: number;
  unreadIssueReports: number;
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({
  requests,
  totalIssueReports,
  unreadIssueReports,
}) => {
  const totalRequests = requests.length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const inProgressRequests = requests.filter(r => r.status === 'in-progress').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Requests Card */}
      <Card className="shadow-lg border-l-4 border-[#1C0357]">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Requests</p>
            <p className="text-3xl font-bold text-[#1C0357] mt-1">{totalRequests}</p>
          </div>
          <FileAudio className="h-8 w-8 text-[#1C0357]/50" />
        </CardContent>
      </Card>

      {/* Completed Requests Card */}
      <Card className="shadow-lg border-l-4 border-green-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{completedRequests}</p>
          </div>
          <CheckCircle className="h-8 w-8 text-green-500/50" />
        </CardContent>
      </Card>

      {/* In Progress Requests Card */}
      <Card className="shadow-lg border-l-4 border-yellow-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">In Progress</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{inProgressRequests}</p>
          </div>
          <Clock className="h-8 w-8 text-yellow-500/50" />
        </CardContent>
      </Card>

      {/* Issue Reports Card */}
      <Card className="shadow-lg border-l-4 border-red-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Issue Reports</p>
            <p className="text-3xl font-bold text-red-600 mt-1">
              {unreadIssueReports}
              {unreadIssueReports > 0 && <span className="text-base font-normal text-gray-500 ml-1">/{totalIssueReports} unread</span>}
            </p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-500/50" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;